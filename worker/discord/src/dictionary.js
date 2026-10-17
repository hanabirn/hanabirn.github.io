/* /dictionary: the same keyless sources as the site's 字典 page (js/dict.js) —
   Wiktionary definitions (English) and Tatoeba examples with a translation into the
   visitor's language — plus the site's own word lists, which give a checked meaning
   (Chinese / English) when the word is in one of them. MyMemory is left out: from Cloudflare's shared IPs its per-IP daily
   quota is usually spent. Each source fails on its own. */

import { STUDY_LANGS, studyName, setsFor, setInfo, loadSet, card } from './sets.js';
import { t } from './i18n.js';
import { toSimplified, toTraditional } from './zhconv.js';
import { COLOR, linkButton, row, cut } from './ui.js';

const WK = { ja: 'ja', ko: 'ko', en: 'en', zh: 'zh', fr: 'fr', ru: 'ru', es: 'es', de: 'de' };
const TT = { ja: 'jpn', ko: 'kor', en: 'eng', zh: 'cmn', fr: 'fra', ru: 'rus', es: 'spa', de: 'deu' };
/* the Tatoeba language a bot language's translations come in */
const UI_TT = { zh: 'cmn', zhs: 'cmn', en: 'eng', ja: 'jpn', ko: 'kor', ru: 'rus', fr: 'fra', es: 'spa', de: 'deu' };
const UA = { 'Api-User-Agent': 'hanabirn.xyz Discord bot (https://hanabirn.xyz/)', 'User-Agent': 'hanabirn.xyz Discord bot (https://hanabirn.xyz/)' };

/* the language when none was picked: by script, Latin defaulting to English (as the site) */
export function guessLang(word) {
    if (/[぀-ヿ]/.test(word)) return 'ja';
    if (/[가-힯ᄀ-ᇿ]/.test(word)) return 'ko';
    if (/[Ѐ-ӿ]/.test(word)) return 'ru';
    if (/[一-鿿]/.test(word)) return 'zh';
    return 'en';
}

/* Wiktionary HTML -> text: no DOMParser in a Worker, and the text is only shown, never
   inserted as HTML, so dropping tags and decoding the common entities is enough */
function htmlText(html) {
    return String(html || '')
        .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ').trim();
}

const FORM_NOTE = /^(inflection|plural|feminine|masculine|(first|second|third)-person|(simple )?past|present|past participle|gerund|imperative|(alternative|obsolete|archaic) (form|spelling)) .*?\bof\b|^(first|second|third)-person (singular|plural)|^(singular|plural) (present|past|imperative)/i;

const bare = w => w.toLowerCase().replace(/^(le |la |l'|les |el\/la |el |la |los |las |der |die |das )/, '');

/* ----- the site's recordings (2026-10-17) -----
   A word in the site's lists has an MP3 under data/audio/<dir>/, named by audioId() of
   its text — the same hash as js/speech.js and tools/build_audio.py (keep the three
   identical). index.json lists the files ("f") and aliases ("a": a Japanese kanji word's
   plain spelling, a Simplified spelling → the file). Sent as an attachment, so Discord
   plays it in the reply. English words aren't recorded yet. */
const AUDIO_DIRS = { ja: 'ja', ko: 'ko', fr: 'fr', ru: 'ru', es: 'es', de: 'de' };

function audioId(text) {
    const str = text.normalize('NFC').trim();
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

async function audioIndex(env, dir) {
    const res = await fetch(`${env.SITE}/data/audio/${dir}/index.json`, { cf: { cacheTtl: 3600, cacheEverything: true } });
    if (!res.ok) return null;
    const j = await res.json();
    const files = new Set(j.f || []);
    return id => (files.has(id) ? id : (j.a || {})[id] || '');
}

/* the first site match's recording as {name, data}, or null */
async function pronunciation(env, matches, ui) {
    const m = matches.find(x => x.kind !== 'en');
    if (!m) return null;
    const r = m.row;
    // what the recording was made from: a Japanese kanji word with its kana, a Chinese word
    // in the accent of the reply's script (Taiwan for Traditional, Mainland for Simplified)
    const dir = m.kind === 'zh' ? (ui === 'zhs' ? 'zh-CN' : 'zh-TW') : AUDIO_DIRS[m.kind];
    const keys = m.kind === 'ja' ? [r[0] + '|' + r[1], r[0]] : m.kind === 'zh' ? (ui === 'zhs' ? [r[1], r[0]] : [r[0], r[1]]) : [r[0]];
    if (!dir) return null;
    const find = await audioIndex(env, dir).catch(() => null);
    const id = find && keys.map(k => k && find(audioId(k))).find(Boolean);
    if (!id) return null;
    const res = await fetch(`${env.SITE}/data/audio/${dir}/${id}.mp3`, { cf: { cacheTtl: 86400, cacheEverything: true } });
    if (!res.ok) return null;
    const name = String(m.c.word).replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40) || 'word';
    return { name: name + '.mp3', type: 'audio/mpeg', data: await res.arrayBuffer() };
}

/* rows of the site's lists for this word: [{set name, card, kind, row}] */
async function siteMatches(env, word, lang, ui) {
    const want = word.toLowerCase();
    const sets = await Promise.all(setsFor(lang, ui).map(async s => ({ s, data: await loadSet(env, s.id).catch(() => null) })));
    const out = [], seen = new Set();
    for (const { s, data } of sets) {
        if (!data) continue;
        for (const r of data.words) {
            const forms = [r[0], data.kind === 'zh' || data.kind === 'ja' ? r[1] : ''].filter(Boolean);
            if (!forms.some(f => f.toLowerCase() === want || bare(f) === want)) continue;
            const c = card(data.kind, r, ui);
            const key = c.word + '|' + c.answer;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ name: setInfo(s.id, ui).name, c, kind: data.kind, row: r });
            if (out.length >= 4) return out;
        }
    }
    return out;
}

async function wiktionary(word, lang) {
    const lower = word.toLowerCase();
    const variants = [...new Set([word, lower, lower.charAt(0).toUpperCase() + lower.slice(1)])];
    for (const v of variants) {
        const res = await fetch('https://en.wiktionary.org/api/rest_v1/page/definition/' + encodeURIComponent(v), { headers: UA });
        if (res.status === 404) continue;
        if (!res.ok) throw new Error('wiktionary ' + res.status);
        const entries = (await res.json())[WK[lang]];
        if (entries && entries.length) return { title: v, entries };
    }
    return null;
}

/* Translations in the visitor's language; when that is the word's own language, in
   English (or Chinese for an English word), as on the site. Tatoeba's Chinese mixes
   both scripts: shown in the visitor's. */
async function tatoeba(word, lang, ui) {
    const base = `https://api.tatoeba.org/unstable/sentences?lang=${TT[lang]}&q=${encodeURIComponent(word)}&sort=relevance&limit=3`;
    let target = UI_TT[ui] || 'eng';
    if (target === TT[lang]) target = lang === 'en' ? 'cmn' : 'eng';
    const script = text => (target !== 'cmn' ? text : ui === 'zhs' ? toSimplified(text) : toTraditional(text));
    let res = await fetch(base + '&trans:lang=' + target, { headers: UA });
    let data = res.ok ? await res.json() : { data: [] };
    if (!data.data || !data.data.length) {
        res = await fetch(base, { headers: UA });
        data = res.ok ? await res.json() : { data: [] };
    }
    return (data.data || []).slice(0, 3).map(s => {
        let tr = '';
        for (const group of s.translations || []) {
            for (const t of Array.isArray(group) ? group : [group]) if (!tr && t && t.lang === target && t.text) tr = t.text;
        }
        return { text: s.text, tr: script(tr) };
    });
}

export async function lookUp(env, opts, ui) {
    const word = String(opts.word || '').trim().slice(0, 60);
    if (!word) return { content: t(ui, 'd_enter') };
    const lang = STUDY_LANGS.includes(opts.language) ? opts.language : guessLang(word);
    const [site, wk, ex] = await Promise.allSettled([siteMatches(env, word, lang, ui), wiktionary(word, lang), tatoeba(word, lang, ui)]);
    const fields = [];

    if (site.status === 'fulfilled' && site.value.length) {
        const extra = e => (!e ? '' : '　' + (typeof e === 'string' ? e : t(ui, e.key, e)));
        fields.push({ name: t(ui, 'd_site'), value: cut(site.value.map(({ name, c }) =>
            `**${c.word}**${c.reading ? `（${c.reading}）` : ''}　${c.answer}\n-# ${name}${extra(c.extra)}`).join('\n'), 1024) });
    }

    let wkTitle = word;
    if (wk.status === 'fulfilled' && wk.value) {
        wkTitle = wk.value.title;
        const groups = [];
        for (const entry of wk.value.entries) {
            // "inflection of aguar: third-person singular…" is grammar, not a meaning
            const defs = (entry.definitions || []).map(d => htmlText(d.definition))
                .filter(d => d && !FORM_NOTE.test(d)).slice(0, 3);
            if (defs.length) groups.push(`*${entry.partOfSpeech}*\n` + defs.map((d, k) => `${k + 1}. ${cut(d, 160)}`).join('\n'));
            if (groups.length >= 3) break;
        }
        if (groups.length) fields.push({ name: t(ui, 'd_wk'), value: cut(groups.join('\n'), 1024) });
    } else if (wk.status === 'rejected') {
        fields.push({ name: t(ui, 'd_wk'), value: t(ui, 'd_wk_down') });
    }

    if (ex.status === 'fulfilled' && ex.value.length) {
        // one quote per example, a blank line between them
        fields.push({ name: t(ui, 'd_ex'), value: cut(ex.value.map(s => `> ${s.text}${s.tr ? `\n> ${s.tr}` : ''}`).join('\n\n'), 1024) });
    }

    if (!fields.length) fields.push({ name: t(ui, 'd_none_title'), value: t(ui, 'd_none', { w: word, lang: studyName(ui, lang) }) });
    const audio = site.status === 'fulfilled' && site.value.length ? await pronunciation(env, site.value, ui).catch(() => null) : null;
    return {
        ...(audio ? { files: [audio] } : {}),
        content: '',
        embeds: [{ color: COLOR, title: `🔎 ${word}`, description: `-# ${studyName(ui, lang)}`, fields,
            footer: { text: 'Wiktionary (CC BY-SA) · Tatoeba (CC BY 2.0 FR) · Hanabiの小天地' } }],
        components: [row([
            linkButton(`https://en.wiktionary.org/wiki/${encodeURIComponent(wkTitle)}`, 'Wiktionary'),
            linkButton(`https://tatoeba.org/zh-tw/sentences/search?query=${encodeURIComponent(word)}&from=${TT[lang]}`, 'Tatoeba')
        ])]
    };
}
