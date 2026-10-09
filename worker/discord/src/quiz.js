/* /quiz: a multiple-choice vocabulary quiz on one of the site's word sets.
   Nothing is stored: every button carries the quiz in its custom_id
   ("qa:<ui>:<set>:<seed>:<i>:<score>:<n>:<owner>:<pick>"), and question i is rebuilt
   from the seed — the same word order, the same wrong options — on each press.
   ui is the visitor's bot language (i18n.js); owner is the user id on a public quiz
   (only they may answer), 0 on a private one. */

import { STUDY_LANGS, setsFor, setInfo, loadSet, card, shortMeaning, rng, shuffle, newSeed } from './sets.js';
import { t, isUiLang } from './i18n.js';
import { COLOR, SITE_URL, button, linkButton, row } from './ui.js';

export const QUIZ_MIN = 5, QUIZ_MAX = 30, QUIZ_DEFAULT = 10;

/* question i of a quiz: {c (card), ask ('reading' | 'meaning'), options [4 strings], correct (index)}.
   As on the site, a Japanese word written in kanji asks for its reading (its Chinese
   meaning is often the kanji itself: 一 → 一) and a kana word for its meaning. */
function question(set, seed, i, ui) {
    const cards = set.words.map(r => card(set.kind, r, ui)).filter(c => c.word && c.answer);
    const order = shuffle(cards.map((_, k) => k), rng(seed));
    const c = cards[order[i % order.length]];
    const ask = set.kind === 'ja' && c.reading ? 'reading' : 'meaning';
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

const title = (ui, info, i, n) => '📖 ' + t(ui, 'q_title', { set: info.name, i: i + 1, n });
const extraLine = (ui, extra) => (!extra ? '' : typeof extra === 'string' ? extra : t(ui, extra.key, extra));
const gone = (ui, key, params) => ({ content: t(ui, key, params), embeds: [], components: [] });

/* /quiz language:<ja…> set:<id> count:<n> public:<bool> */
export async function startQuiz(env, opts, userId, ui) {
    const lang = STUDY_LANGS.includes(opts.language) ? opts.language : 'ja';
    const sets = setsFor(lang, ui);
    const id = opts.set && sets.some(s => s.id === opts.set) ? opts.set : sets[0].id;
    const n = Math.min(QUIZ_MAX, Math.max(QUIZ_MIN, Number(opts.count) || QUIZ_DEFAULT));
    return askQuestion(env, ui, id, newSeed(), 0, 0, n, opts.public ? userId : '0');
}

async function askQuestion(env, ui, id, seed, i, score, n, owner) {
    const info = setInfo(id, ui);
    const set = info && await loadSet(env, id);
    if (!set) return gone(ui, 'not_live', { set: info ? info.name : id });
    const q = question(set, seed, i, ui);
    const base = `${ui}:${id}:${seed.toString(36)}:${i}:${score}:${n}:${owner}`;
    return {
        content: '',
        embeds: [{
            color: COLOR, title: title(ui, info, i, n),
            description: `# ${q.c.word}`,
            footer: { text: `${t(ui, q.ask === 'reading' ? 'q_reading' : 'q_meaning')}　｜　${t(ui, 'q_score', { n: score })}` }
        }],
        components: [row(q.options.map((o, k) => button(`qa:${base}:${k}`, o))),
            row([button(`qe:${base}`, t(ui, 'q_end'), 2)])]
    };
}

async function answer(env, ui, id, seed, i, score, n, owner, pick) {
    const info = setInfo(id, ui);
    const set = await loadSet(env, id);
    if (!set) return gone(ui, 'load_failed');
    const q = question(set, seed, i, ui);
    const ok = pick === q.correct;
    const now = score + (ok ? 1 : 0);
    const lines = [`# ${q.c.word}`];
    if (q.c.reading) lines.push(q.c.reading);
    lines.push('', ok ? t(ui, 'right') : t(ui, 'wrong', { a: q.options[q.correct] }));
    if (q.ask === 'reading') lines.push(t(ui, 'meaning', { m: q.c.answer }));
    const extra = extraLine(ui, q.c.extra);
    if (extra) lines.push(`-# ${extra}`);
    const base = `${ui}:${id}:${seed.toString(36)}`;
    const last = i + 1 >= n;
    const after = `${base}:${i + 1}:${now}:${n}:${owner}`;
    return {
        content: '',
        embeds: [{ color: ok ? 0x3A8F5C : COLOR, title: title(ui, info, i, n), description: lines.join('\n'),
            footer: { text: t(ui, 'q_tally', { s: now, n: i + 1 }) } }],
        components: [
            row(q.options.map((o, k) => button(`x:${k}`, o, k === q.correct ? 3 : k === pick ? 4 : 2, true))),
            row(last ? [button(`qe:${after}`, t(ui, 'q_results'), 1)]
                : [button(`qn:${after}`, t(ui, 'q_next'), 1), button(`qe:${after}`, t(ui, 'q_end'), 2)])
        ]
    };
}

function results(ui, id, score, asked) {
    const info = setInfo(id, ui);
    const pct = asked ? Math.round(score / asked * 100) : 0;
    const say = t(ui, !asked ? 'r_none' : pct === 100 ? 'r_100' : pct >= 80 ? 'r_80' : pct >= 60 ? 'r_60' : 'r_low');
    return {
        content: '',
        embeds: [{ color: COLOR, title: t(ui, 'r_title', { set: info ? info.name : id }),
            description: asked ? `# ${score} / ${asked}\n${t(ui, 'r_accuracy', { p: pct })}\n\n${say}` : say,
            footer: { text: t(ui, 'r_footer') } }],
        components: [row([linkButton(SITE_URL, t(ui, 'practice_site'))])]
    };
}

/* the owner field of a quiz button */
export const quizOwner = parts => parts[7];

/* a quiz button: [kind, ui, set, seed36, i, score, n, owner, pick?] (already split on ":") */
export async function quizButton(env, parts) {
    const [kind, ui, id, seed36, i, score, n, owner, pick] = parts;
    if (!isUiLang(ui) || !setInfo(id, ui)) return null;
    const seed = parseInt(seed36, 36) >>> 0;
    const nums = [i, score, n].map(Number);
    if (nums.some(x => !Number.isInteger(x) || x < 0 || x > 100)) return null;
    if (kind === 'qa') return answer(env, ui, id, seed, nums[0], nums[1], nums[2], owner, Number(pick));
    if (kind === 'qn') return askQuestion(env, ui, id, seed, nums[0], nums[1], nums[2], owner);
    if (kind === 'qe') return results(ui, id, nums[1], nums[0]);
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
