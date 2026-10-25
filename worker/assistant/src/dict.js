/* 字典 for the site (js/dict.js), added 2026-10-22 (owner's picks A1 + B + C1 + D + E).
 *
 *   POST /dict  { word, lang, ui }
 *     -> { word, lang, ui, reading, kind, tr: { <lang>: text }, senses: [{ pos, defs: [{ t, en, ex, ex_tr }] }], note, src }
 *     or { error: 'busy' | 'bad_request' | 'upstream' }
 *   POST /dict/zh  { to: 'zh' | 'zh-Hans', lines: [text] }
 *     -> { lines: [text] }   the page's Tatoeba example lines (Chinese ones are often Simplified,
 *        mainland wording) in Traditional Chinese with Taiwan wording, or Simplified (big check
 *        2026-10-24); a line Gemini can't do comes back unchanged
 *
 * The word's English definitions come from Wiktionary (CC BY-SA, fetched here); Gemini
 * translates them into the visitor's interface language (`ui`), writes the word in every
 * other site language (`tr`), and for an idiom or proverb a plain explanation with its
 * origin (`note`). Without a Wiktionary entry (many Chinese words) Gemini writes the
 * definitions itself (src: 'gemini').
 *
 * Cost: the free key (GEMINI_API_KEY, its project has no billing) is tried first with
 * lite models 小花火's chat doesn't use, so they don't share its quota; only when those are
 * spent for the day does the paid key (GEMINI_PAID_KEY, the prepaid hanabi-tts project)
 * answer, at most DICT_PAID_PER_DAY times per isolate. Every answer is kept in KV (DICT,
 * DICT_TTL) and shared by all visitors, so a word is paid for once; KV allows ~1,000 new
 * keys a day on the free plan — past that an answer is just not stored.
 */

const LANGS = ['ja', 'ko', 'en', 'fr', 'es', 'de', 'ru', 'zh'];
const UI = ['zh', 'zh-Hans', 'en', 'ja', 'ko', 'ru', 'fr', 'es', 'de'];
const NAMES = {
    zh: 'Traditional Chinese (Taiwan)', 'zh-Hans': 'Simplified Chinese (Mainland)', en: 'English', ja: 'Japanese',
    ko: 'Korean', ru: 'Russian', fr: 'French', es: 'Spanish', de: 'German'
};
const FREE_MODELS = ['gemini-3.1-flash-lite', 'gemini-2.5-flash-lite'];
const PAID_MODELS = ['gemini-3.1-flash-lite'];
const DICT_PAID_PER_DAY = 300;
const DICT_TTL = 180 * 24 * 60 * 60;       // seconds a stored answer lives
const VERSION = 'v1';                      // bump to drop every stored answer
const MAX_DEFS = 8;

let paidDay = '';
let paidUsed = 0;
const spentUntil = new Map();               // "key|model" -> ms; a model out of quota for today

/* ----- Wiktionary (English definitions) ----- */
function text(html) {
    return String(html || '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ').trim();
}

async function wiktionary(word, lang) {
    const lower = word.toLowerCase();
    const variants = [...new Set([word, lower, lower.charAt(0).toUpperCase() + lower.slice(1)])];
    for (const v of variants) {
        const res = await fetch('https://en.wiktionary.org/api/rest_v1/page/definition/' + encodeURIComponent(v),
            // Wikimedia refuses a request without a User-Agent (403); a browser sends one, a Worker doesn't
            { headers: { 'User-Agent': 'hanabirn.xyz dictionary (https://hanabirn.xyz/)', 'Api-User-Agent': 'hanabirn.xyz dictionary (https://hanabirn.xyz/)' } });
        if (res.status === 404) continue;
        if (!res.ok) return null;
        const data = await res.json();
        const entries = data[lang === 'zh' ? 'zh' : lang];
        if (!entries || !entries.length) continue;
        const senses = [];
        let n = 0;
        for (const e of entries) {
            const defs = (e.definitions || []).map(d => ({ en: text(d.definition), ex: text((d.examples || [])[0] || '') }))
                .filter(d => d.en).slice(0, MAX_DEFS - n);
            if (!defs.length) continue;
            senses.push({ pos: e.partOfSpeech || '', defs });
            n += defs.length;
            if (n >= MAX_DEFS) break;
        }
        if (senses.length) return { title: v, senses };
    }
    return null;
}

/* ----- Gemini ----- */
function schema(targets, withDefs) {
    const str = { type: 'STRING' };
    return {
        type: 'OBJECT',
        properties: {
            reading: str,
            kind: { type: 'STRING', enum: ['word', 'phrase', 'idiom', 'proverb'] },
            translations: { type: 'OBJECT', properties: Object.fromEntries(targets.map(t => [t, str])), required: targets },
            senses: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
                pos: str,
                defs: { type: 'ARRAY', items: { type: 'OBJECT', properties: { t: str, ex_tr: str }, required: ['t'] } }
            }, required: ['pos', 'defs'] } },
            note: str
        },
        required: ['reading', 'kind', 'translations', 'senses', 'note']
    };
}

function prompt(word, lang, ui, wk, targets) {
    const readingRule = {
        ja: 'the word in hiragana (empty if it is already all kana)',
        zh: 'its pinyin with tone marks, then " ・ " and its zhuyin (Taiwan)',
        ru: 'the word with a stress mark (U+0301) on the stressed vowel',
        ko: 'empty', en: 'its IPA between slashes', fr: 'its IPA between slashes', es: 'its IPA between slashes', de: 'its IPA between slashes'
    }[lang];
    const parts = [
        `You are a careful bilingual dictionary editor. The word or expression is: «${word}» (${NAMES[lang === 'zh' ? 'zh' : lang] || lang}).`,
        `Write for a learner whose interface language is ${NAMES[ui]}.`,
        `- reading: ${readingRule}.`,
        `- kind: word, phrase, idiom (成語 / 四字熟語 / set expression) or proverb.`,
        `- translations: the most natural equivalent in each of these languages: ${targets.map(t => `${t} = ${NAMES[t]}`).join('; ')}. For an idiom give the closest idiom or a short natural paraphrase. Chinese in zh must use Taiwan wording and Traditional characters; zh-Hans Mainland wording and Simplified. Keep each one short (a word or a few words; two alternatives at most, separated by " / ").`,
    ];
    if (wk) {
        parts.push(`- senses: translate these Wiktionary senses into ${NAMES[ui]}, one entry per sense in the same order and the same number of definitions, faithfully and concisely; pos = the part of speech in ${NAMES[ui]}; ex_tr = a translation of the example into ${NAMES[ui]} (empty when there is none):`);
        parts.push(JSON.stringify(wk.senses.map(s => ({ pos: s.pos, defs: s.defs.map(d => ({ definition: d.en, example: d.ex })) }))));
        if (ui === 'en') parts.push('The interface is English: keep the definitions in English, lightly tidied.');
    } else {
        parts.push(`- senses: there is no dictionary entry to translate, so write the senses yourself in ${NAMES[ui]}: at most 4 definitions, grouped by part of speech; ex_tr empty.`);
    }
    parts.push(`- note: for an idiom or proverb, in ${NAMES[ui]}: its plain meaning, then its origin in one sentence if well known, then one example sentence in the original language with a translation — three short lines. For an ordinary word: an empty string.`);
    parts.push('If you are not sure about something, leave it out rather than guess. Never add commentary outside the JSON.');
    return parts.join('\n');
}

async function gemini(key, model, body) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.status === 429) return { quota: true };
    if (!res.ok) return { error: res.status };
    const data = await res.json();
    const out = ((data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [])
        .map(p => p.text || '').join('');
    try { return { value: JSON.parse(out) }; } catch { return { error: 'json' }; }
}

/* The free key's models first, then (capped) the paid key's. */
async function ask(env, body) {
    const today = new Date().toISOString().slice(0, 10);
    if (paidDay !== today) { paidDay = today; paidUsed = 0; }
    const tries = FREE_MODELS.map(m => ['free', env.GEMINI_API_KEY, m])
        .concat(PAID_MODELS.map(m => ['paid', env.GEMINI_PAID_KEY, m]));
    for (const [who, key, model] of tries) {
        if (!key) continue;
        if ((spentUntil.get(who + '|' + model) || 0) > Date.now()) continue;
        if (who === 'paid' && paidUsed >= DICT_PAID_PER_DAY) continue;
        if (who === 'paid') paidUsed++;
        const r = await gemini(key, model, body);
        if (r.value) return r.value;
        if (r.quota) spentUntil.set(who + '|' + model, Date.now() + 60 * 60 * 1000);
    }
    return null;
}

/* ----- Tatoeba lines in the interface's Chinese script ----- */
async function sha1(str) {
    const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(str));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function dictZh(request, env, json, headers) {
    if (request.method !== 'POST') return json({ error: 'not_found' }, 404, headers);
    let q;
    try { q = await request.json(); } catch { return json({ error: 'bad_request' }, 400, headers); }
    const to = q && q.to === 'zh-Hans' ? 'zh-Hans' : 'zh';
    const lines = (Array.isArray(q && q.lines) ? q.lines : []).slice(0, 12).map(l => String(l || '').slice(0, 300));
    if (!lines.length) return json({ error: 'bad_request' }, 400, headers);
    const cacheKey = `zh:${VERSION}:${to}:${await sha1(lines.join('\n'))}`;
    if (env.DICT) {
        const hit = await env.DICT.get(cacheKey, 'json');
        if (hit) return json(hit, 200, headers);
    }
    if (env.DICT_LIMITER) {
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        const { success } = await env.DICT_LIMITER.limit({ key: ip });
        if (!success) return json({ error: 'busy' }, 429, headers);
    }
    const rule = to === 'zh'
        ? 'Rewrite each line in Traditional Chinese as written in Taiwan: Traditional characters and Taiwan vocabulary (e.g. 吸尘器 → 吸塵器, 软件 → 軟體, 出租车 → 計程車, 土豆 → 馬鈴薯, 视频 → 影片).'
        : 'Rewrite each line in Simplified Chinese as written in Mainland China: Simplified characters and Mainland vocabulary (e.g. 軟體 → 软件, 計程車 → 出租车, 影片 → 视频).';
    const body = {
        contents: [{ role: 'user', parts: [{ text: `${rule} Keep the meaning, the tone and the punctuation (full-width); do not translate, explain or add anything. A line that is already right stays as it is. Lines:\n${JSON.stringify(lines)}` }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0,
            responseSchema: { type: 'OBJECT', properties: { lines: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['lines'] } }
    };
    const g = await ask(env, body);
    const got = g && Array.isArray(g.lines) && g.lines.length === lines.length ? g.lines.map(String) : null;
    if (!got) return json({ lines }, 200, headers);
    const out = { lines: got };
    if (env.DICT) {
        try { await env.DICT.put(cacheKey, JSON.stringify(out), { expirationTtl: DICT_TTL }); } catch {}
    }
    return json(out, 200, headers);
}

export async function dict(request, env, json, headers) {
    if (request.method !== 'POST') return json({ error: 'not_found' }, 404, headers);
    if (env.DICT_LIMITER) {
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        const { success } = await env.DICT_LIMITER.limit({ key: ip });
        if (!success) return json({ error: 'busy' }, 429, headers);
    }
    let q;
    try { q = await request.json(); } catch { return json({ error: 'bad_request' }, 400, headers); }
    const word = String((q && q.word) || '').trim().slice(0, 60);
    const lang = LANGS.includes(q && q.lang) ? q.lang : '';
    const ui = UI.includes(q && q.ui) ? q.ui : 'zh';
    if (!word || !lang) return json({ error: 'bad_request' }, 400, headers);

    const cacheKey = `dict:${VERSION}:${lang}:${ui}:${word.normalize('NFC')}`;
    if (env.DICT) {
        const hit = await env.DICT.get(cacheKey, 'json');
        if (hit) return json(hit, 200, headers);
    }

    const wk = await wiktionary(word, lang).catch(() => null);
    const targets = UI.filter(t => !(lang === 'zh' ? t.startsWith('zh') : t === lang));
    const body = {
        contents: [{ role: 'user', parts: [{ text: prompt(word, lang, ui, wk, targets) }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: schema(targets, !!wk), temperature: 0.2 }
    };
    const g = await ask(env, body);
    if (!g) return json({ error: 'busy' }, 503, headers);

    // the Wiktionary English kept beside each translated definition (the 看英文原文 switch)
    const senses = (g.senses || []).map((s, i) => ({
        pos: String(s.pos || ''),
        defs: (s.defs || []).slice(0, MAX_DEFS).map((d, k) => {
            const src = wk && wk.senses[i] && wk.senses[i].defs[k];
            return { t: String(d.t || ''), en: src ? src.en : '', ex: src ? src.ex : '', ex_tr: String(d.ex_tr || '') };
        }).filter(d => d.t)
    })).filter(s => s.defs.length);
    const out = {
        word, lang, ui, title: wk ? wk.title : word,
        reading: String(g.reading || ''), kind: g.kind || 'word',
        tr: Object.fromEntries(targets.map(t => [t, String((g.translations || {})[t] || '')]).filter(([, v]) => v)),
        senses, note: String(g.note || ''), src: wk ? 'wiktionary' : 'gemini'
    };
    if (env.DICT && senses.length) {
        try { await env.DICT.put(cacheKey, JSON.stringify(out), { expirationTtl: DICT_TTL }); } catch {}   // past the day's KV writes: not stored
    }
    return json(out, 200, headers);
}
