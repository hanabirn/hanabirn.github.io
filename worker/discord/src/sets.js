/* The site's word sets, as the bot offers them. The lists themselves are the
   site's own JSON (data/vocab/<id>.json on env.SITE), built by tools/build_vocab.py;
   the ids mirror WORD_SET_FAMILIES in js/quiz.js and the names come from the site's
   i18n (site-strings.js), in the visitor's language (ui = a bot language, i18n.js). */

import { siteT, contentLang } from './i18n.js';
import { toSimplified } from './zhconv.js';

/* the languages one can study */
export const STUDY_LANGS = ['ja', 'ko', 'en', 'zh', 'fr', 'ru', 'es', 'de'];
export const studyName = (ui, lang) => siteT(ui, 'dict_lang_' + lang);

const TOPICS = ['greetings', 'food', 'home', 'shopping', 'transport', 'travel', 'weather', 'school', 'work', 'health'];
const TOPIC_EMOJI = { greetings: '👋', food: '🍜', home: '🏠', shopping: '🛒', transport: '🚃',
    travel: '✈️', weather: '🌤️', school: '🏫', work: '💼', health: '🩺' };
const CEFR = ['a1', 'a2', 'b1', 'b2', 'c1'];

/* [id, label(ui), label includes the language?] */
const GRADED = {
    ja: ['n5', 'n4', 'n3', 'n2', 'n1'].map(l => ['jlpt_' + l, ui => siteT(ui, 'quiz_jlpt_' + l)]),
    ko: [1, 2, 3, 4].map(l => ['topik_' + l, ui => siteT(ui, 'quiz_topik_' + l)]),
    en: ['jh', 'sh', 'toeic', 'toefl'].map(l => ['en_' + l, ui => siteT(ui, 'quiz_en_' + l), true]),
    zh: [1, 2, 3, 4, 5, 6, 7].map(l => ['hsk_' + l, ui => siteT(ui, 'quiz_hsk_' + l)]),
    fr: CEFR.map(l => ['fr_' + l, () => l.toUpperCase()]),
    ru: CEFR.map(l => ['ru_' + l, () => l.toUpperCase()]),
    es: CEFR.map(l => ['es_' + l, () => l.toUpperCase()]),
    de: CEFR.map(l => ['de_' + l, () => l.toUpperCase()])
};

const dot = ui => (ui === 'zh' || ui === 'zhs' || ui === 'ja' ? '・' : ' · ');

/* [{id, short (for the picker), full ("日文 JLPT N5", "日文・吃飯")}] for a language */
export function setsFor(lang, ui) {
    if (!GRADED[lang]) return [];
    const name = studyName(ui, lang);
    return GRADED[lang].map(([id, label, named]) => ({ id, short: label(ui), full: named ? label(ui) : `${name} ${label(ui)}` }))
        .concat(TOPICS.map(tp => {
            const topic = siteT(ui, 'topic_' + tp);
            return { id: `tp_${lang}_${tp}`, short: `${TOPIC_EMOJI[tp]} ${topic}`, full: `${name}${dot(ui)}${topic}` };
        }));
}

/* {id, lang, name} for a known set id, else null — ids that come back from Discord
   (options, button ids) are only ever used after this check */
export function setInfo(id, ui) {
    for (const lang of STUDY_LANGS) {
        const s = setsFor(lang, ui).find(x => x.id === id);
        if (s) return { id, lang, name: s.full };
    }
    return null;
}

/* The set's JSON ({kind, words: [...]}) or null when the site doesn't have it (yet).
   Cached at Cloudflare's edge, so a quiz doesn't hit the site on every button. */
export async function loadSet(env, id) {
    const res = await fetch(`${env.SITE}/data/vocab/${id}.json`, { cf: { cacheTtl: 3600, cacheEverything: true } });
    if (!res.ok) return null;
    return res.json();
}

/* A row as a card for a visitor whose bot language is `ui`: the word, its reading, the
   meaning asked for and an extra line shown after answering. Row shapes come from
   build_vocab.py. Meanings exist in Chinese (Traditional) and English only: Simplified
   is converted, other languages get the English one. */
export function card(kind, row, ui) {
    const content = contentLang(ui);
    const zh = text => (content === 'zhs' ? toSimplified(text) : text);
    if (kind === 'zh') {   // [traditional, simplified, bopomofo, pinyin, english]: the meaning is English
        const simp = ui === 'zhs';
        return { word: simp ? row[1] : row[0], reading: [row[3], simp ? '' : row[2]].filter(Boolean).join('　'), answer: row[4],
            extra: !simp && row[1] !== row[0] ? { key: 'simplified', w: row[1] } : '' };
    }
    if (kind === 'en') {   // [word, '', 'prep. 的；屬於', '']: Chinese meanings only
        return { word: row[0], reading: '', answer: zh(row[2]), extra: '' };
    }
    // ja: [word, kana, zh, en]; ko / fr / ru / es / de: [word, reading or gender, zh, en]
    const reading = row[1] && row[1] !== row[0] ? row[1] : '';
    if (content === 'en' && row[3]) return { word: row[0], reading, answer: row[3], extra: '' };
    return { word: row[0], reading, answer: zh(row[2]), extra: row[3] || '' };
}

/* The first two senses, short enough for a button (80 characters at most); Chinese
   ones joined with "；", English ones with "; " */
export function shortMeaning(text) {
    const parts = String(text || '').split(/[；;]/).map(s => s.trim()).filter(Boolean);
    const sep = /[　-鿿＀-￯]/.test(String(text || '')) ? '；' : '; ';
    const out = parts.slice(0, 2).join(sep) || String(text || '');
    return out.length > 78 ? out.slice(0, 77) + '…' : out;
}

/* deterministic random numbers (mulberry32): a quiz is rebuilt from its seed on every
   button press instead of being stored anywhere */
export function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function shuffle(list, rand) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function newSeed() {
    return crypto.getRandomValues(new Uint32Array(1))[0];
}
