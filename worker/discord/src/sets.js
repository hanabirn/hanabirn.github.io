/* The site's word sets, as the bot offers them. The lists themselves are the
   site's own JSON (data/vocab/<id>.json on env.SITE), built by tools/build_vocab.py;
   the ids and names here mirror WORD_SET_FAMILIES / wordSetName() in js/quiz.js. */

export const LANGS = { ja: '日文', ko: '韓文', en: '英文', zh: '中文', fr: '法文', ru: '俄文', es: '西班牙文', de: '德文' };

const TOPICS = [['greetings', '打招呼'], ['food', '吃飯'], ['home', '居家生活'], ['shopping', '購物'], ['transport', '交通'],
    ['travel', '旅行'], ['weather', '天氣與季節'], ['school', '學校'], ['work', '工作'], ['health', '身體與看病']];
const CEFR = ['a1', 'a2', 'b1', 'b2', 'c1'];

const GRADED = {
    ja: ['n5', 'n4', 'n3', 'n2', 'n1'].map(l => ['jlpt_' + l, 'JLPT ' + l.toUpperCase()]),
    ko: [1, 2, 3, 4].map(l => ['topik_' + l, 'TOPIK ' + l]),
    en: [['en_jh', '國中單字'], ['en_sh', '高中單字'], ['en_toeic', '多益 TOEIC'], ['en_toefl', '托福 TOEFL']],
    zh: [1, 2, 3, 4, 5, 6, 7].map(l => ['hsk_' + l, l === 7 ? 'HSK 7–9' : 'HSK ' + l]),
    fr: CEFR.map(l => ['fr_' + l, l.toUpperCase()]),
    ru: CEFR.map(l => ['ru_' + l, l.toUpperCase()]),
    es: CEFR.map(l => ['es_' + l, l.toUpperCase()]),
    de: CEFR.map(l => ['de_' + l, l.toUpperCase()])
};

/* [{id, name}] for a language: the graded lists, then the 10 topics */
export function setsFor(lang) {
    if (!GRADED[lang]) return [];
    return GRADED[lang].map(([id, name]) => ({ id, name }))
        .concat(TOPICS.map(([tp, name]) => ({ id: `tp_${lang}_${tp}`, name: '主題・' + name })));
}

/* {id, lang, name: "日文 JLPT N5"} for a known set id, else null — ids that come back
   from Discord (options, button ids) are only ever used after this check */
export function setInfo(id) {
    for (const lang of Object.keys(LANGS)) {
        const s = setsFor(lang).find(x => x.id === id);
        if (s) return { id, lang, name: `${LANGS[lang]} ${s.name}` };
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

/* A row as a card: the word, its reading, the meaning asked for (Chinese; English for
   the Chinese lists) and an English gloss. Row shapes come from build_vocab.py. */
export function card(kind, row) {
    if (kind === 'zh') {   // [traditional, simplified, bopomofo, pinyin, english]
        return { word: row[0], reading: [row[3], row[2]].filter(Boolean).join('　'), answer: row[4], extra: row[1] !== row[0] ? '簡體：' + row[1] : '' };
    }
    if (kind === 'en') {   // [word, '', 'prep. 的；屬於', '']
        return { word: row[0], reading: '', answer: row[2], extra: '' };
    }
    // ja: [word, kana, zh, en]; ko / fr / ru / es / de: [word, reading or gender, zh, en]
    const reading = row[1] && row[1] !== row[0] ? row[1] : '';
    return { word: row[0], reading, answer: row[2], extra: row[3] || '' };
}

/* The first two senses, short enough for a button (80 characters at most) */
export function shortMeaning(text) {
    const parts = String(text || '').split(/[；;]/).map(s => s.trim()).filter(Boolean);
    const out = parts.slice(0, 2).join('；') || String(text || '');
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
