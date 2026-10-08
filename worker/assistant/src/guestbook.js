/* The guestbook (留言板), served by the same Worker as 小花火.
 *
 * Messages live in the KV namespace GUESTBOOK, which only this Worker can write:
 *   'list'      [{ id, name, message, time, uid? }]  newest first (uid never sent out)
 *   'u:<uid>'   the id of that account's message — one message per account
 *
 *   GET    /guestbook                -> { messages, mine? }   (mine: with a valid ID token)
 *   POST   /guestbook  { name, message }  + Authorization: Bearer <Firebase ID token>
 *          -> { ok, item } | { error: 'signin' | 'verify_email' | 'already' | 'blocked'
 *                                    | 'moderation_busy' | 'bad_request' | 'busy' }
 *   DELETE /guestbook/<id>  + Authorization: Bearer <ADMIN_TOKEN>   (the owner removes one)
 *
 * Posting needs a site account (Firebase Auth; email accounts must have verified their
 * address, so one person can't post again with throw-away addresses). Before saving,
 * Gemini checks the text: violence or threats, political content, sexual content, hate
 * or harassment, spam / ads and personal data are refused. If no model can check it
 * the post is refused too (fail closed) — the visitor is asked to try later.
 */

const NAME_MAX = 30;
const MESSAGE_MAX = 300;
const LIST_MAX = 1000;

function clean(s, max) {
    return String(s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/* Firebase ID token -> { uid, verified } or null, asked of the Identity Toolkit
   (it checks signature and expiry for us). */
async function firebaseUser(token, env) {
    if (!token) return null;
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token })
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    const u = data.users && data.users[0];
    if (!u || !u.localId) return null;
    const google = (u.providerUserInfo || []).some(p => p.providerId === 'google.com');
    return { uid: u.localId, verified: google || u.emailVerified === true };
}

function bearer(request) {
    const m = /^Bearer\s+(.+)$/i.exec(request.headers.get('Authorization') || '');
    return m ? m[1].trim() : '';
}

const MODERATION_PROMPT = `You moderate a public guestbook on a small, family-friendly language-learning website.
Decide whether this message (and its nickname) may be shown publicly.
Refuse ("allowed": false) anything with:
- violence: threats, glorifying violence, self-harm, gore
- politics: political opinions, parties, politicians, elections, territorial or independence disputes, protests, propaganda
- sexual: sexual or suggestive content, nudity, adult services
- hate: insults, harassment, slurs, discrimination
- spam: ads, links, contact handles (LINE, Telegram…), selling, gambling, crypto
- personal_info: phone numbers, addresses, emails or other private data
Allow normal greetings, thanks, feedback about the site, learning talk and small talk in any language.
Naming a country, city or people in a friendly, everyday way (cheering for one's country or a team, travel, food, culture, "Taiwan 加油", "I love Japan") is NOT politics — only opinions about governments, parties, politicians, elections or sovereignty are.
Answer only with JSON.`;

export async function moderate(name, message, env) {
    const models = (env.MODELS || '').split(',').map(s => s.trim()).filter(Boolean);
    // the lite model has by far the largest free quota: ask it first
    models.sort((a, b) => (b.includes('lite') ? 1 : 0) - (a.includes('lite') ? 1 : 0));
    const body = {
        systemInstruction: { parts: [{ text: MODERATION_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: `Nickname: ${name}\nMessage: ${message}` }] }],
        generationConfig: {
            temperature: 0,
            maxOutputTokens: 60,
            responseMimeType: 'application/json',
            responseSchema: {
                type: 'OBJECT',
                properties: {
                    allowed: { type: 'BOOLEAN' },
                    category: { type: 'STRING', enum: ['ok', 'violence', 'politics', 'sexual', 'hate', 'spam', 'personal_info', 'other'] }
                },
                required: ['allowed', 'category']
            }
        }
    };
    for (const model of models) {
        const b = JSON.parse(JSON.stringify(body));
        if (!model.includes('lite')) b.generationConfig.thinkingConfig = { thinkingBudget: 0 };
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
                body: JSON.stringify(b),
                signal: AbortSignal.timeout(8000)
            });
            if (!res.ok) { console.log('moderation error', model, res.status); continue; }
            const data = await res.json();
            const cand = data.candidates && data.candidates[0];
            // Gemini's own safety filter stopping the answer is a refusal as well
            if (data.promptFeedback && data.promptFeedback.blockReason) return { allowed: false, category: 'other' };
            if (cand && cand.finishReason === 'SAFETY') return { allowed: false, category: 'other' };
            const text = ((cand && cand.content && cand.content.parts) || []).map(p => p.text || '').join('');
            const verdict = JSON.parse(text);
            if (typeof verdict.allowed === 'boolean') return verdict;
        } catch (e) {
            console.log('moderation failed', model, String(e));
        }
    }
    return null;
}

async function readList(env) {
    return (await env.GUESTBOOK.get('list', 'json')) || [];
}

function publicItem(m) {
    return { id: m.id, name: m.name, message: m.message, time: m.time };
}

export async function guestbook(request, env, url, json, headers) {
    if (!env.GUESTBOOK) return json({ error: 'not_configured' }, 500, headers);

    if (request.method === 'GET') {
        const list = await readList(env);
        const out = { messages: list.map(publicItem) };
        const token = bearer(request);
        if (token) {
            const user = await firebaseUser(token, env);
            if (user) out.mine = !!(await env.GUESTBOOK.get('u:' + user.uid));
        }
        return json(out, 200, headers);
    }

    if (request.method === 'DELETE') {
        const id = url.pathname.split('/')[2] || '';
        if (!env.ADMIN_TOKEN || bearer(request) !== env.ADMIN_TOKEN) return json({ error: 'forbidden' }, 403, headers);
        const list = await readList(env);
        const gone = list.find(m => m.id === id);
        if (!gone) return json({ error: 'not_found' }, 404, headers);
        await env.GUESTBOOK.put('list', JSON.stringify(list.filter(m => m !== gone)));
        // the account keeps its "already posted" mark: one message, even if removed
        return json({ ok: true }, 200, headers);
    }

    if (request.method !== 'POST') return json({ error: 'not_found' }, 404, headers);

    if (env.LIMITER) {
        const { success } = await env.LIMITER.limit({ key: 'gb:' + (request.headers.get('CF-Connecting-IP') || 'unknown') });
        if (!success) return json({ error: 'busy' }, 429, headers);
    }
    const user = await firebaseUser(bearer(request), env);
    if (!user) return json({ error: 'signin' }, 401, headers);
    if (!user.verified) return json({ error: 'verify_email' }, 403, headers);
    if (await env.GUESTBOOK.get('u:' + user.uid)) return json({ error: 'already' }, 409, headers);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'bad_request' }, 400, headers); }
    const name = clean(body && body.name, NAME_MAX);
    const message = clean(body && body.message, MESSAGE_MAX);
    if (!name || !message) return json({ error: 'bad_request' }, 400, headers);
    if (/https?:\/\/|www\.[a-z0-9-]+\.[a-z]{2,}/i.test(name + ' ' + message)) return json({ error: 'blocked', category: 'spam' }, 422, headers);

    const verdict = await moderate(name, message, env);
    if (!verdict) return json({ error: 'moderation_busy' }, 503, headers);
    if (!verdict.allowed) return json({ error: 'blocked', category: verdict.category }, 422, headers);

    const item = { id: crypto.randomUUID().slice(0, 12), name, message, time: new Date().toISOString(), uid: user.uid };
    const list = await readList(env);
    list.unshift(item);
    await env.GUESTBOOK.put('list', JSON.stringify(list.slice(0, LIST_MAX)));
    await env.GUESTBOOK.put('u:' + user.uid, item.id);
    return json({ ok: true, item: publicItem(item) }, 200, headers);
}
