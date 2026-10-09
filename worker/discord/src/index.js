/* hanabi-discord: the site's Discord bot, answering Discord's HTTP interactions
   (no gateway connection, nothing runs between commands). Discord POSTs every
   slash command, autocomplete and button press here; the request is checked
   against the app's public key, answered with "thinking…" at once (Discord allows
   3 s), and the real message is then written with the interaction's webhook. */

import { startQuiz, quizButton, setChoices } from './quiz.js';
import { startGrammar, grammarButton, levelChoices } from './grammar.js';
import { lookUp } from './dictionary.js';

const EPHEMERAL = 64;

function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

const hex = s => new Uint8Array((s.match(/../g) || []).map(h => parseInt(h, 16)));

async function verified(request, body, env) {
    const sig = request.headers.get('X-Signature-Ed25519');
    const time = request.headers.get('X-Signature-Timestamp');
    if (!sig || !time || !env.DISCORD_PUBLIC_KEY) return false;
    try {
        const key = await crypto.subtle.importKey('raw', hex(env.DISCORD_PUBLIC_KEY), { name: 'Ed25519' }, false, ['verify']);
        return await crypto.subtle.verify({ name: 'Ed25519' }, key, hex(sig), new TextEncoder().encode(time + body));
    } catch {
        return false;
    }
}

/* replace the deferred reply ("thinking…") with the real message */
async function edit(env, it, message) {
    const api = env.DISCORD_API || 'https://discord.com/api/v10';
    const res = await fetch(`${api}/webhooks/${it.application_id}/${it.token}/messages/@original`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowed_mentions: { parse: [] }, ...message })
    });
    if (!res.ok) console.log('edit failed', res.status, await res.text());
}

async function run(env, it, work) {
    let message;
    try {
        message = await work();
    } catch (err) {
        console.log('handler error', err && err.stack || err);
    }
    await edit(env, it, message || { content: '出了點問題，請再試一次 🙏', embeds: [], components: [] });
}

function options(data) {
    const out = {};
    for (const o of (data && data.options) || []) out[o.name] = o.value;
    return out;
}

const userOf = it => (it.member && it.member.user && it.member.user.id) || (it.user && it.user.id) || '0';

/* which user may press a button: the owner field of the custom_id (0 = anyone who can see it) */
function ownerOf(parts) {
    if (parts[0] === 'qa' || parts[0] === 'qn' || parts[0] === 'qe') return parts[6];
    if (parts[0] === 'ga') return parts[3];
    if (parts[0] === 'gn') return parts[2];
    return '0';
}

export default {
    async fetch(request, env, ctx) {
        if (request.method !== 'POST') return new Response('Hanabiの小天地 Discord bot', { status: 200 });
        const body = await request.text();
        if (!await verified(request, body, env)) return new Response('invalid request signature', { status: 401 });
        const it = JSON.parse(body);

        if (it.type === 1) return json({ type: 1 });                          // PING

        if (it.type === 4) {                                                 // autocomplete
            const opts = options(it.data);
            const focused = ((it.data && it.data.options) || []).find(o => o.focused) || {};
            const choices = it.data.name === 'grammar' ? await levelChoices(env, focused.value)
                : setChoices(opts.language, focused.value);
            return json({ type: 8, data: { choices } });
        }

        if (it.type === 2) {                                                 // slash command
            const opts = options(it.data);
            const user = userOf(it);
            const work = it.data.name === 'quiz' ? () => startQuiz(env, opts, user)
                : it.data.name === 'grammar' ? () => startGrammar(env, opts, user)
                : it.data.name === 'dictionary' ? () => lookUp(env, opts)
                : null;
            if (!work) return json({ type: 4, data: { content: '不認得這個指令。', flags: EPHEMERAL } });
            ctx.waitUntil(run(env, it, work));
            return json({ type: 5, data: { flags: opts.public ? 0 : EPHEMERAL } });
        }

        if (it.type === 3) {                                                 // button
            const parts = String(it.data.custom_id || '').split(':');
            const owner = ownerOf(parts);
            if (owner !== '0' && owner !== userOf(it)) {
                return json({ type: 4, data: { content: '這是別人的題目喔！用 `/quiz` 或 `/grammar` 開一個你自己的 😊', flags: EPHEMERAL } });
            }
            const work = parts[0][0] === 'q' ? () => quizButton(env, parts)
                : parts[0][0] === 'g' ? () => grammarButton(env, parts) : null;
            if (!work) return json({ type: 6 });
            ctx.waitUntil(run(env, it, work));
            return json({ type: 6 });                                        // "updating this message…"
        }

        return json({ error: 'unknown interaction' }, 400);
    }
};
