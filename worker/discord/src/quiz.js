/* /quiz: a multiple-choice vocabulary quiz on one of the site's word sets.
   Nothing is stored: every button carries the quiz in its custom_id, and question i is
   rebuilt from the seed — the same word order, the same wrong options — on each press:
     va:<ui>:<owner>:<set>:<seed36>:<n>:<picks>:<k>     an answer
     vn:<ui>:<owner>:<set>:<seed36>:<n>:<picks>         the next question
     vr:<ui>:<owner>:<set>:<seed36>:<n>:<picks>:<page>  the results, a page of the words
   picks = the option picked for each question so far (one digit each), which gives the
   score and, at the end, the list of words right and wrong (owner's request,
   2026-10-15). ui is the visitor's bot language (i18n.js); owner is the user id on a
   public quiz (only they may answer), 0 on a private one. The old qa / qn / qe buttons
   (score in place of picks) only say the quiz has expired. */

import { STUDY_LANGS, setsFor, setInfo, loadSet, card, shortMeaning, rng, shuffle, newSeed } from './sets.js';
import { t, isUiLang } from './i18n.js';
import { COLOR, SITE_URL, button, linkButton, row, cut } from './ui.js';

export const QUIZ_MIN = 5, QUIZ_MAX = 30, QUIZ_DEFAULT = 10;
const WORDS_PER_PAGE = 10;
const GREEN = 0x3A8F5C;

/* the set as cards, and the order the seed asks them in — built once per button press
   (a Worker request gets little CPU, and the results rebuild every question) */
function deck(set, seed, ui) {
    const cards = set.words.map(r => card(set.kind, r, ui)).filter(c => c.word && c.answer);
    return { cards, kind: set.kind, order: shuffle(cards.map((_, k) => k), rng(seed)), seed };
}

/* question i: {c (card), ask ('reading' | 'meaning'), options [4 strings], correct (index)}.
   As on the site, a Japanese word written in kanji asks for its reading (its Chinese
   meaning is often the kanji itself: 一 → 一) and a kana word for its meaning. */
function question(d, i) {
    const { cards, order, seed } = d;
    const c = cards[order[i % order.length]];
    const ask = d.kind === 'ja' && c.reading ? 'reading' : 'meaning';
    const value = x => ask === 'reading' ? x.reading : shortMeaning(x.answer);
    const right = value(c);
    // wrong readings of about the same length look alike; meanings come from anywhere
    const pool = ask === 'reading' ? cards.filter(x => x.reading && Math.abs(x.reading.length - right.length) <= 1) : cards;
    const rand = rng((seed ^ Math.imul(i + 1, 0x9E3779B1)) >>> 0);
    const wrong = [];
    for (let tries = 0; wrong.length < 3 && tries < 300; tries++) {
        const from = tries < 200 && pool.length > 10 ? pool : cards.filter(x => ask !== 'reading' || x.reading);
        const m = value(from[Math.floor(rand() * from.length)]);
        if (m && m !== right && !wrong.includes(m)) wrong.push(m);
    }
    const options = shuffle([right, ...wrong], rand);
    return { c, ask, options, correct: options.indexOf(right) };
}

const score = (d, picks) => [...picks].filter((p, i) => Number(p) === question(d, i).correct).length;

const title = (ui, info, i, n) => '📖 ' + t(ui, 'q_title', { set: info.name, i: i + 1, n });
const extraLine = (ui, extra) => (!extra ? '' : typeof extra === 'string' ? extra : t(ui, extra.key, extra));
const gone = (ui, key, params) => ({ content: t(ui, key, params), embeds: [], components: [] });

/* /quiz language:<ja…> set:<id> count:<n> public:<bool> */
export async function startQuiz(env, opts, userId, ui) {
    const lang = STUDY_LANGS.includes(opts.language) ? opts.language : 'ja';
    const sets = setsFor(lang, ui);
    const id = opts.set && sets.some(s => s.id === opts.set) ? opts.set : sets[0].id;
    const n = Math.min(QUIZ_MAX, Math.max(QUIZ_MIN, Number(opts.count) || QUIZ_DEFAULT));
    return askQuestion(env, ui, opts.public ? userId : '0', id, newSeed(), n, '');
}

async function askQuestion(env, ui, owner, id, seed, n, picks) {
    const info = setInfo(id, ui);
    const set = info && await loadSet(env, id);
    if (!set) return gone(ui, 'not_live', { set: info ? info.name : id });
    const d = deck(set, seed, ui);
    const i = picks.length;
    const q = question(d, i);
    const base = `${ui}:${owner}:${id}:${seed.toString(36)}:${n}:${picks}`;
    return {
        content: '',
        embeds: [{
            color: COLOR, title: title(ui, info, i, n),
            description: `# ${q.c.word}`,
            footer: { text: `${t(ui, q.ask === 'reading' ? 'q_reading' : 'q_meaning')}　｜　${t(ui, 'q_score', { n: score(d, picks) })}` }
        }],
        components: [row(q.options.map((o, k) => button(`va:${base}:${k}`, o))),
            row([button(`vr:${base}:0`, t(ui, 'q_end'), 2)])]
    };
}

async function answer(env, ui, owner, id, seed, n, picks, pick) {
    const info = setInfo(id, ui);
    const set = await loadSet(env, id);
    if (!set) return gone(ui, 'load_failed');
    const d = deck(set, seed, ui);
    const i = picks.length;
    const q = question(d, i);
    if (!(pick >= 0 && pick < q.options.length)) return null;
    const all = picks + pick;
    const ok = pick === q.correct;
    const lines = [`# ${q.c.word}`];
    if (q.c.reading) lines.push(q.c.reading);
    lines.push('', ok ? t(ui, 'right') : t(ui, 'wrong', { a: q.options[q.correct] }));
    if (q.ask === 'reading') lines.push(t(ui, 'meaning', { m: q.c.answer }));
    const extra = extraLine(ui, q.c.extra);
    if (extra) lines.push(`-# ${extra}`);
    const base = `${ui}:${owner}:${id}:${seed.toString(36)}:${n}:${all}`;
    const last = i + 1 >= n;
    return {
        content: '',
        embeds: [{ color: ok ? GREEN : COLOR, title: title(ui, info, i, n), description: lines.join('\n'),
            footer: { text: t(ui, 'q_tally', { s: score(d, all), n: i + 1 }) } }],
        components: [
            row(q.options.map((o, k) => button(`x:${k}`, o, k === q.correct ? 3 : k === pick ? 4 : 2, true))),
            row(last ? [button(`vr:${base}:0`, t(ui, 'q_results'), 1)]
                : [button(`vn:${base}`, t(ui, 'q_next'), 1), button(`vr:${base}:0`, t(ui, 'q_end'), 2)])
        ]
    };
}

/* the score, then every word asked — ✅ / ❌, its reading and meaning — WORDS_PER_PAGE a page */
async function results(env, ui, owner, id, seed, n, picks, page) {
    const info = setInfo(id, ui);
    const set = await loadSet(env, id);
    if (!set) return gone(ui, 'load_failed');
    const d = deck(set, seed, ui);
    const asked = picks.length;
    const words = [...picks].map((p, i) => {
        const q = question(d, i);
        return { c: q.c, ok: Number(p) === q.correct };
    });
    const right = words.filter(w => w.ok).length;
    const pct = asked ? Math.round(right / asked * 100) : 0;
    const say = t(ui, !asked ? 'r_none' : pct === 100 ? 'r_100' : pct >= 80 ? 'r_80' : pct >= 60 ? 'r_60' : 'r_low');
    const pages = Math.max(1, Math.ceil(words.length / WORDS_PER_PAGE));
    page = Math.min(Math.max(0, page), pages - 1);
    const lines = asked ? [`# ${right} / ${asked}`, t(ui, 'r_accuracy', { p: pct }), '', say] : [say];
    if (asked) {
        lines.push('', `**${t(ui, 'r_words', { r: right, w: asked - right })}**`);
        words.slice(page * WORDS_PER_PAGE, (page + 1) * WORDS_PER_PAGE).forEach((w, k) => {
            const reading = w.c.reading ? `（${w.c.reading}）` : '';
            lines.push(`${w.ok ? '✅' : '❌'} ${page * WORDS_PER_PAGE + k + 1}. **${w.c.word}**${reading} — ${shortMeaning(w.c.answer)}`);
        });
    }
    const base = `${ui}:${owner}:${id}:${seed.toString(36)}:${n}:${picks}`;
    const nav = pages > 1 ? [
        button(`vr:${base}:${page - 1}`, t(ui, 'p_prev'), 2, page === 0),
        button('x:page', t(ui, 'p_page', { p: page + 1, m: pages }), 2, true),
        button(`vr:${base}:${page + 1}`, t(ui, 'p_next'), 2, page >= pages - 1)] : [];
    return {
        content: '',
        embeds: [{ color: COLOR, title: t(ui, 'r_title', { set: info ? info.name : id }),
            description: cut(lines.join('\n'), 4000), footer: { text: t(ui, 'r_footer') } }],
        components: [...(nav.length ? [row(nav)] : []), row([linkButton(SITE_URL, t(ui, 'practice_site'))])]
    };
}

export const QUIZ_KINDS = ['va', 'vn', 'vr'];

/* a quiz button, split on ":" (see the top of this file) */
export async function quizButton(env, parts) {
    const [kind, ui, owner, id, seed36, nText, picks] = parts;
    if (!isUiLang(ui) || !setInfo(id, ui)) return null;
    const seed = parseInt(seed36, 36) >>> 0, n = Number(nText);
    if (!Number.isInteger(n) || n < 1 || n > QUIZ_MAX || !/^[0-9]{0,30}$/.test(picks || '') || picks.length > n) return null;
    if (kind === 'va') return picks.length < n ? answer(env, ui, owner, id, seed, n, picks, Number(parts[7])) : null;
    if (kind === 'vn') return askQuestion(env, ui, owner, id, seed, n, picks);
    if (kind === 'vr') return results(env, ui, owner, id, seed, n, picks, Number(parts[7]) || 0);
    return null;
}

/* autocomplete for the set option: the sets of the chosen language matching what was typed */
export function setChoices(lang, typed, ui) {
    const q = String(typed || '').toLowerCase();
    return setsFor(STUDY_LANGS.includes(lang) ? lang : 'ja', ui)
        .filter(s => !q || s.short.toLowerCase().includes(q) || s.full.toLowerCase().includes(q) || s.id.includes(q))
        .slice(0, 25)
        .map(s => ({ name: s.short, value: s.id }));
}
