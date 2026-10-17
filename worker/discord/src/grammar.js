/* /grammar: the site's grammar levels (data/grammar/<id>.json, built by
   tools/build_grammar.py), in two modes (owner's request, 2026-10-15):

   study — the level's points in order: first the point's explanation and example (a
           card of its own since 2026-10-17, owner's pick), then its practice questions; where a visitor got to is kept in KV PREFS
           ("g:<user>:<lang>" = {level, at: {<level>: point index}}) and /grammar study
           picks up there next time.
   quiz  — n questions drawn at random from the whole level; at the end the missed
           ones are listed with why the picked option doesn't fit and the answer does.

   Nothing else is stored: a button's custom_id carries the state (the options picked
   so far as digits), and questions are rebuilt from it on each press:
     study  sp:<ui>:<owner>:<level>:<point>                 the point's explanation
            sq:<ui>:<owner>:<level>:<point>:<picks>         its next question (picks '' = the first)
            sa:<ui>:<owner>:<level>:<point>:<picks>:<k>     an answer
     quiz   tq:<ui>:<owner>:<level>:<seed36>:<n>:<picks>       the next question
            ta:<ui>:<owner>:<level>:<seed36>:<n>:<picks>:<k>   an answer
            tr:<ui>:<owner>:<level>:<seed36>:<n>:<picks>:<page> the results
            tm:<ui>:<owner>:<level>:<seed36>:<n>:<picks>       a round of the missed ones
            tg:<ui>:<owner>:<level>:<n>                        the level again, a new seed
            (seed36 = "M" + an id: a missed round, its questions in KV "gm:<id>" for 3 days)
     both   ge:<ui>:<owner>                                 finish
   Texts come in the visitor's language: Chinese, English, and since 2026-10-15
   ja / ko / ru / fr / es / de (tools/content_i18n.py) — never the lesson's own
   language, which reads the English. q.why = one line per option (tools/grammar_why.py). */

import { studyName, rng, shuffle, newSeed } from './sets.js';
import { t, siteT, isUiLang } from './i18n.js';
import { toSimplified } from './zhconv.js';
import { COLOR, NEUTRAL, GREEN, RED, SITE_URL, button, linkButton, row, cut, progressBar, LETTERS, needLetters } from './ui.js';

const BLANK = /（[\s　_＿]*）|\([\s_]*\)/;
const MISSED_TTL = 3 * 24 * 3600;
export const GQ_MIN = 5, GQ_MAX = 30, GQ_DEFAULT = 10;
const WRONG_PER_PAGE = 4;

async function fetchJson(env, path) {
    const res = await fetch(`${env.SITE}/data/grammar/${path}`, { cf: { cacheTtl: 3600, cacheEverything: true } });
    return res.ok ? res.json() : null;
}

/* [{id, lang, level, count, name: "日文 N5"}] in the site's order */
export async function grammarLevels(env, ui) {
    const index = await fetchJson(env, 'index.json');
    return (index || []).map(l => ({ ...l, name: `${studyName(ui, l.lang)} ${levelName(ui, l.level)}` }));
}

/* Korean "1급" … "6급" as the site shows them ("1 級", "Level 1" …) */
function levelName(ui, level) {
    const m = /^(\d)급$/.exec(level || '');
    return m ? siteT(ui, 'learn_level_n').replace('{n}', m[1]) : level;
}

/* autocomplete for the level option: the chosen language's levels */
export async function levelChoices(env, lang, typed, ui) {
    const q = String(typed || '').toLowerCase();
    return (await grammarLevels(env, ui))
        .filter(l => (!lang || l.lang === lang) && (!q || l.name.toLowerCase().includes(q) || l.id.includes(q)))
        .slice(0, 25)
        .map(l => ({ name: t(ui, 'g_levels', { name: l.name, n: l.count }), value: l.id }));
}

/* a lesson text ({zh, en, zh-Hans, ja, ko, …}) in the visitor's language */
function gText(obj, ui) {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    if (ui === 'zhs') return obj['zh-Hans'] || toSimplified(obj.zh || '') || obj.en || '';
    if (ui === 'zh') return obj.zh || obj.en || '';
    return obj[ui] || obj.en || obj.zh || '';
}

/* the translation of a question or example: English for the Chinese lessons in a Chinese
   reply (a Chinese one would repeat the sentence), else in the visitor's language */
const translation = (lessonLang, obj, ui) =>
    (lessonLang === 'zh' && (ui === 'zh' || ui === 'zhs') ? obj.en || '' : gText(obj, ui));

/* Chinese lesson sentences are written in Traditional: Simplified for zhs visitors */
const zhText = (lessonLang, text, ui) => (lessonLang === 'zh' && ui === 'zhs' ? toSimplified(text) : text);

/* The point's heading lines. Many French / Russian / Korean patterns carry Chinese
   ("imparfait（未完成過去式）"): Simplified for zhs; for other readers a Chinese note in
   brackets is dropped, and a pattern still in Chinese after that gives way to the
   title. Japanese / Chinese patterns are the language itself and stay. */
export function heading(lessonLang, p, ui) {
    const title = gText(p.title, ui);
    let pattern = p.pattern;
    if (lessonLang === 'ja' || lessonLang === 'zh') pattern = zhText(lessonLang, pattern, ui);
    else if (ui === 'zhs') pattern = toSimplified(pattern);
    else if (ui !== 'zh') {
        pattern = pattern.replace(/（[^）]*[一-鿿][^）]*）/g, '').trim();
        if (/[一-鿿]/.test(pattern)) pattern = '';
    }
    return pattern ? [`## ${pattern}`, `**${title}**`] : [`## ${title}`];
}

function exampleLines(lessonLang, ex, ui) {
    if (!ex) return [];
    const text = lessonLang === 'ja' ? ex.ja : zhText(lessonLang, ex.text, ui);
    const reading = lessonLang === 'ja' ? (ex.kana !== ex.ja ? ex.kana : '') : ex.reading;
    const tr = translation(lessonLang, ex, ui);
    return [`> ${text}`, ...(reading ? [`> -# ${reading}`] : []), ...(tr ? [`> ${tr}`] : [])];
}

/* The sentence with the answer in the blank. French / Russian (and other
   space-separated) sentences need the spaces the source leaves out ("en
   train（　）cuisiner") — but none after an elision (à l'école) or before a hyphen.
   Korean keeps the brackets: its blank is a particle in some sentences and a word in
   others, which the text alone doesn't tell apart. */
function fillBlank(lang, sentence, answer) {
    return sentence.replace(BLANK, (m, at, s) => {
        if (lang === 'ko') return `（**${answer}**）`;
        if (!['fr', 'ru', 'es', 'de', 'en'].includes(lang)) return `**${answer}**`;
        const before = s[at - 1] || '', after = s[at + m.length] || '';
        const left = /[\p{L}\p{N},]/u.test(before) ? ' ' : '';
        const right = /[\p{L}\p{N}]/u.test(after) && !/['’]$/.test(answer) ? ' ' : '';
        return `${left}**${answer}**${right}`;
    });
}

/* The finished sentence: the blank filled, or for a sentence-ordering question
   (q.type 'order', tools/build_grammar.py) the parts in order with the ★ part bold. */
function fullSentence(lessonLang, q, ui) {
    if (q.type === 'order')
        return zhText(lessonLang, q.before + q.parts.map((x, k) => (k === q.star ? `**${x}**` : x))
            .join(lessonLang === 'ja' || lessonLang === 'zh' ? '' : ' ') + q.after, ui);   // Korean: spaced
    return fillBlank(lessonLang, zhText(lessonLang, q.q, ui), zhText(lessonLang, q.options[q.answer], ui));
}

// why an option is right / wrong: one line per option (fill-ins), one line for the order (ordering)
const whyPerOption = q => q.type !== 'order' && q.why && q.why.length === q.options.length;
const whyOfOrder = q => q.type === 'order' && q.why && q.why.length === 1;
// the heading of a question: "what fills the blank" or "which part goes on ★"
const questionHead = (ui, q, i, n) => t(ui, q.type === 'order' ? 'g_q_n_order' : 'g_q_n', { i, n });

function optionLabel(lessonLang, q, k, ui) {
    const text = zhText(lessonLang, q.options[k], ui);
    const r = q.options_reading && q.options_reading[k];
    return r ? `${text}（${r}）` : text;
}

/* the answer buttons (and, for long options, the A–D lines for the card); after an answer
   the right one green and the picked one red, all disabled */
function optionParts(lessonLang, q, order, ui, idFor, answered) {
    const labels = order.map(k => optionLabel(lessonLang, q, k, ui));
    const letters = needLetters(labels);
    const mark = k => (k === q.answer ? '✅' : k === answered.chosen ? '❌' : '▫️');
    const lines = letters ? order.map((k, j) => `${answered.done ? mark(k) + ' ' : ''}**${LETTERS[j]}**　${labels[j]}`) : [];
    const buttons = order.map((k, j) => answered.done
        ? button(`x:${j}`, letters ? LETTERS[j] : cut(labels[j], 80), k === q.answer ? 3 : k === answered.chosen ? 4 : 2, true)
        : button(idFor(k), letters ? LETTERS[j] : cut(labels[j], 80)));
    return { lines, buttons };
}

async function load(env, levelId, ui) {
    const levels = await grammarLevels(env, ui);
    const info = levels.find(l => l.id === levelId);
    return info ? { info, level: await fetchJson(env, levelId + '.json') } : null;
}

const gone = (ui, key) => ({ content: t(ui, key), embeds: [], components: [] });
const endButton = (ui, owner) => button(`ge:${ui}:${owner}`, t(ui, 'g_end'), 2);
const picksOk = s => /^[0-9]{0,30}$/.test(s || '');

/* the option order of a question, fixed by where it is (the same on every press). Small
   neighbouring seeds give mulberry32 alike first numbers — the answer kept landing on the
   same button — so the place is spread with a multiply first. */
function optionOrder(q, salt) {
    return shuffle(q.options.map((_, k) => k), rng(Math.imul(salt, 0x9E3779B1) >>> 0));
}

function idHash(id) {
    let h = 0x811C9DC5;
    for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return h >>> 0;
}

/* question lines: the sentence, its reading and its translation (as a hint) */
function questionLines(lessonLang, q, ui) {
    const lines = [`### ${zhText(lessonLang, q.q, ui)}`];
    if (q.q_reading) lines.push(`-# ${q.q_reading}`);
    const hint = translation(lessonLang, q, ui);
    if (hint) lines.push(`-# ${hint}`);
    return lines;
}

/* after an answer: right / wrong, the full sentence, and why — the picked option's line
   when it was wrong, then the answer's (q.why); without them, the point's first common
   mistake as before */
function feedbackLines(lessonLang, p, q, chosen, ui) {
    const ok = chosen === q.answer;
    const full = fullSentence(lessonLang, q, ui);
    const lines = [ok ? t(ui, 'right') : t(ui, 'wrong', { a: optionLabel(lessonLang, q, q.answer, ui) }), '', `### ${full}`];
    if (q.full_reading) lines.push(`-# ${q.full_reading}`);
    const tr = translation(lessonLang, q, ui);
    if (tr) lines.push(`-# ${tr}`);
    if (whyPerOption(q)) {
        lines.push('', `**${t(ui, 'g_why')}**`);
        if (!ok) lines.push(`❌ **${optionLabel(lessonLang, q, chosen, ui)}** — ${gText(q.why[chosen], ui)}`);
        lines.push(`✅ **${optionLabel(lessonLang, q, q.answer, ui)}** — ${gText(q.why[q.answer], ui)}`);
    } else if (whyOfOrder(q)) {
        lines.push('', `**${t(ui, 'g_why')}**`, gText(q.why[0], ui));
    } else if (!ok) {
        const mistake = (p.mistakes || [])[0];
        if (mistake) {
            lines.push('', `**${t(ui, 'g_mistake')}**`, `~~${zhText(lessonLang, mistake.wrong, ui)}~~ → ${zhText(lessonLang, mistake.right, ui)}`);
            const why = gText(mistake, ui);
            if (why) lines.push(`-# ${why}`);
        }
    }
    return lines;
}

/* ===================== study ===================== */

/* the visitor's place, per study language: {level, at: {<level id>: point index}} */
async function readPlace(env, user, lang) {
    if (!env.PREFS || !user || user === '0') return null;
    try { return JSON.parse(await env.PREFS.get(`g:${user}:${lang}`)) || null; } catch { return null; }
}

async function savePlace(env, user, lang, levelId, point) {
    if (!env.PREFS || !user || user === '0') return;
    try {
        const place = (await readPlace(env, user, lang)) || { at: {} };
        place.level = levelId;
        place.at = { ...(place.at || {}), [levelId]: point };
        await env.PREFS.put(`g:${user}:${lang}`, JSON.stringify(place));
    } catch (err) {
        console.log('grammar place save failed', err);
    }
}

/* /grammar study language:<…> level:<id?> — the level given, else the last one studied
   in that language, else its easiest; from where the visitor left it */
export async function startStudy(env, opts, user, ui) {
    const levels = (await grammarLevels(env, ui)).filter(l => !opts.language || l.lang === opts.language);
    if (!levels.length) return gone(ui, 'g_no_lang');
    const place = await readPlace(env, user, levels[0].lang);
    const id = levels.some(l => l.id === opts.level) ? opts.level
        : place && levels.some(l => l.id === place.level) ? place.level : levels[0].id;
    const at = (place && place.at && place.at[id]) || 0;
    return showLesson(env, ui, opts.public ? user : '0', id, at, at > 0);
}

/* point `pi`'s explanation and example, with 開始練習 / 跳過這個 */
async function showLesson(env, ui, owner, levelId, pi, resumed) {
    const got = levelId && await load(env, levelId, ui);
    if (!got || !got.level) return gone(ui, 'g_no_level');
    const { info, level } = got;
    if (pi >= level.points.length) pi = 0;
    const p = level.points[pi];
    const lines = [...heading(info.lang, p, ui)];
    if (resumed) lines.push(`-# ${t(ui, 'g_resumed')}`);
    lines.push('', t(ui, 'g_form', { f: gText(p.form, ui) }), '', cut(gText(p.explain, ui), 1200));
    const ex = (p.examples || [])[0];
    if (ex) lines.push('', `**${t(ui, 'g_example')}**`, ...exampleLines(info.lang, ex, ui));
    const next = pi + 1 < level.points.length ? pi + 1 : 0;
    return {
        content: '',
        embeds: [{ color: NEUTRAL, title: t(ui, 'gs_title', { level: info.name, i: pi + 1, n: level.points.length }),
            description: cut(lines.join('\n'), 4000), footer: { text: t(ui, 'g_learn_foot', { n: p.quiz.length }) } }],
        components: [row([button(`sq:${ui}:${owner}:${levelId}:${pi}:`, t(ui, 'g_start'), 1),
            button(`sp:${ui}:${owner}:${levelId}:${next}`, t(ui, 'g_skip'), 2), endButton(ui, owner)])]
    };
}

// right / wrong for each question of the point answered so far
const pointMarks = (p, picks) => [...picks].map((c, k) => Number(c) === p.quiz[k].answer);

/* question picks.length + 1 of point `pi`: a short card — the pattern, the question */
async function showQuestion(env, ui, owner, levelId, pi, picks) {
    const got = levelId && await load(env, levelId, ui);
    if (!got || !got.level || !got.level.points[pi]) return gone(ui, 'g_no_level');
    const { info, level } = got;
    const p = level.points[pi], qi = picks.length, q = p.quiz[qi];
    if (!q) return gone(ui, 'g_no_level');
    const order = optionOrder(q, (pi * 31 + qi + 7) ^ idHash(levelId));
    const base = `${ui}:${owner}:${levelId}:${pi}:${picks}`;
    const opts = optionParts(info.lang, q, order, ui, k => `sa:${base}:${k}`, {});
    const lines = [`-# ${heading(info.lang, p, ui).map(x => x.replace(/^#+ |\*\*/g, '')).join('・')}`,
        `**${questionHead(ui, q, qi + 1, p.quiz.length)}**`, ...questionLines(info.lang, q, ui),
        ...(opts.lines.length ? ['', ...opts.lines] : [])];
    return {
        content: '',
        embeds: [{ color: NEUTRAL, title: t(ui, 'gs_title', { level: info.name, i: pi + 1, n: level.points.length }),
            description: cut(lines.join('\n'), 4000),
            footer: { text: `${progressBar(pointMarks(p, picks), p.quiz.length)}　${qi + 1} / ${p.quiz.length}` } }],
        components: [row(opts.buttons),
            row([button(`sp:${ui}:${owner}:${levelId}:${pi}`, t(ui, 'g_reread'), 2), endButton(ui, owner)])]
    };
}

async function studyAnswer(env, ui, owner, user, levelId, pi, picks, chosen) {
    const got = await load(env, levelId, ui);
    if (!got || !got.level || !got.level.points[pi]) return gone(ui, 'g_load_failed');
    const { info, level } = got;
    const p = level.points[pi], qi = picks.length, q = p.quiz[qi];
    if (!q || !(chosen >= 0 && chosen < q.options.length)) return null;
    const order = optionOrder(q, (pi * 31 + qi + 7) ^ idHash(levelId));
    const all = picks + chosen;
    const opts = optionParts(info.lang, q, order, ui, null, { done: true, chosen });
    const lines = [`-# ${heading(info.lang, p, ui).map(x => x.replace(/^#+ |\*\*/g, '')).join('・')}`,
        `**${questionHead(ui, q, qi + 1, p.quiz.length)}**`, ...(opts.lines.length ? ['', ...opts.lines] : []), '',
        ...feedbackLines(info.lang, p, q, chosen, ui)];
    const last = qi + 1 >= p.quiz.length;
    let buttons;
    if (!last) {
        buttons = [button(`sq:${ui}:${owner}:${levelId}:${pi}:${all}`, t(ui, 'g_next_q'), 1), endButton(ui, owner)];
    } else {
        // the point is done: its score, and the place moves on to the next point
        const right = [...all].filter((c, k) => Number(c) === p.quiz[k].answer).length;
        lines.push('', `**${t(ui, 'g_point_score', { s: right, n: p.quiz.length })}** ${right * 3 >= p.quiz.length * 2 ? t(ui, 'g_point_ok') : t(ui, 'g_point_again')}`);
        const next = pi + 1 < level.points.length ? pi + 1 : 0;
        await savePlace(env, user, info.lang, levelId, next);
        if (next === 0) lines.push('', t(ui, 'g_level_done'));
        buttons = [button(`sp:${ui}:${owner}:${levelId}:${next}`, t(ui, 'g_next'), 1),
            button(`sq:${ui}:${owner}:${levelId}:${pi}:`, t(ui, 'g_retry'), 2), endButton(ui, owner)];
    }
    return {
        content: '',
        embeds: [{ color: Number(chosen) === q.answer ? GREEN : RED,
            title: t(ui, 'gs_title', { level: info.name, i: pi + 1, n: level.points.length }),
            description: cut(lines.join('\n'), 4000),
            footer: { text: `${progressBar(pointMarks(p, all), p.quiz.length)}　${qi + 1} / ${p.quiz.length}\n${t(ui, last ? 'g_saved' : 'g_footer')}` } }],
        components: [
            row(opts.buttons),
            row(last ? [...buttons, linkButton(SITE_URL, t(ui, 'g_site'))] : buttons)
        ]
    };
}

/* ===================== quiz ===================== */

/* The order a quiz asks the level's questions in, as [point, question] pairs: the seed's
   shuffle, or a missed round's own list (KV); null when that round expired. */
async function quizDeck(env, level, seedField) {
    if (seedField.startsWith('M')) {
        let saved = null;
        try { saved = env.PREFS && JSON.parse(await env.PREFS.get('gm:' + seedField.slice(1))); } catch {}
        const items = saved && Array.isArray(saved.items) ? saved.items.filter(([pi, qi]) => level.points[pi] && level.points[pi].quiz[qi]) : [];
        return items.length ? { items, seed: idHash(seedField) } : null;
    }
    const seed = parseInt(seedField, 36) >>> 0;
    const all = [];
    level.points.forEach((p, pi) => (p.quiz || []).forEach((q, qi) => all.push([pi, qi])));
    return { items: shuffle(all.map((_, k) => k), rng(seed)).map(k => all[k]), seed };
}

/* question i of a quiz */
function quizQuestion(level, d, i) {
    const [pi, qi] = d.items[i % d.items.length];
    const p = level.points[pi], q = p.quiz[qi];
    return { p, q, pi, qi, order: optionOrder(q, (d.seed ^ Math.imul(i + 1, 0x9E3779B1)) >>> 0) };
}

const quizMarks = (level, d, picks) => [...picks].map((c, i) => Number(c) === quizQuestion(level, d, i).q.answer);
const quizProgress = (ui, level, d, picks, n) => {
    const marks = quizMarks(level, d, picks);
    return progressBar(marks, n) + (picks.length ? `　${t(ui, 'q_tally', { s: marks.filter(Boolean).length, n: picks.length })}` : '');
};

/* /grammar quiz language:<…> level:<id?> count:<n> */
export async function startQuiz(env, opts, user, ui) {
    const levels = (await grammarLevels(env, ui)).filter(l => !opts.language || l.lang === opts.language);
    if (!levels.length) return gone(ui, 'g_no_lang');
    const id = levels.some(l => l.id === opts.level) ? opts.level : levels[0].id;
    const n = Math.min(GQ_MAX, Math.max(GQ_MIN, Number(opts.count) || GQ_DEFAULT));
    return quizAsk(env, ui, opts.public ? user : '0', id, newSeed().toString(36), n, '');
}

async function quizAsk(env, ui, owner, levelId, seedField, n, picks) {
    const got = await load(env, levelId, ui);
    if (!got || !got.level) return gone(ui, 'g_no_level');
    const { info, level } = got;
    const d = await quizDeck(env, level, seedField);
    if (!d) return gone(ui, 'expired_round');
    const i = picks.length;
    const { p, q, order } = quizQuestion(level, d, i);
    const base = `${ui}:${owner}:${levelId}:${seedField}:${n}:${picks}`;
    const opts = optionParts(info.lang, q, order, ui, k => `ta:${base}:${k}`, {});
    const lines = [...heading(info.lang, p, ui), '', ...questionLines(info.lang, q, ui), ...(opts.lines.length ? ['', ...opts.lines] : [])];
    return {
        content: '',
        embeds: [{ color: NEUTRAL, title: t(ui, 'gq_title', { level: info.name, i: i + 1, n }), description: cut(lines.join('\n'), 4000),
            footer: { text: quizProgress(ui, level, d, picks, n) } }],
        components: [row(opts.buttons), row([button(`tr:${base}:0`, t(ui, 'q_end'), 2)])]
    };
}

async function quizAnswer(env, ui, owner, levelId, seedField, n, picks, chosen) {
    const got = await load(env, levelId, ui);
    if (!got || !got.level) return gone(ui, 'g_load_failed');
    const { info, level } = got;
    const d = await quizDeck(env, level, seedField);
    if (!d) return gone(ui, 'expired_round');
    const i = picks.length;
    const { p, q, order } = quizQuestion(level, d, i);
    if (!(chosen >= 0 && chosen < q.options.length)) return null;
    const all = picks + chosen;
    const base = `${ui}:${owner}:${levelId}:${seedField}:${n}:${all}`;
    const last = i + 1 >= n;
    const opts = optionParts(info.lang, q, order, ui, null, { done: true, chosen });
    const lines = [...heading(info.lang, p, ui), ...(opts.lines.length ? ['', ...opts.lines] : []), '', ...feedbackLines(info.lang, p, q, chosen, ui)];
    return {
        content: '',
        embeds: [{ color: chosen === q.answer ? GREEN : RED, title: t(ui, 'gq_title', { level: info.name, i: i + 1, n }),
            description: cut(lines.join('\n'), 4000), footer: { text: quizProgress(ui, level, d, all, n) } }],
        components: [
            row(opts.buttons),
            row(last ? [button(`tr:${base}:0`, t(ui, 'q_results'), 1)]
                : [button(`tq:${base}`, t(ui, 'q_next'), 1), button(`tr:${base}:0`, t(ui, 'q_end'), 2)])
        ]
    };
}

/* the result: score, then the missed questions with why, WRONG_PER_PAGE a page; then a
   round of the missed ones, the level again, or the site */
async function quizResults(env, ui, owner, levelId, seedField, n, picks, page) {
    const got = await load(env, levelId, ui);
    if (!got || !got.level) return gone(ui, 'g_load_failed');
    const { info, level } = got;
    const d = await quizDeck(env, level, seedField);
    if (!d) return gone(ui, 'expired_round');
    const asked = picks.length;
    const missed = [];
    [...picks].forEach((c, i) => {
        const { p, q } = quizQuestion(level, d, i);
        if (Number(c) !== q.answer) missed.push({ p, q, chosen: Number(c), i });
    });
    const score = asked - missed.length;
    const pct = asked ? Math.round(score / asked * 100) : 0;
    const say = t(ui, !asked ? 'r_none' : pct === 100 ? 'r_100' : pct >= 80 ? 'r_80' : pct >= 60 ? 'r_60' : 'r_low');
    const pages = Math.max(1, Math.ceil(missed.length / WRONG_PER_PAGE));
    page = Math.min(Math.max(0, page), pages - 1);
    const lines = asked ? [`# ${score} / ${asked}`, `${t(ui, 'r_accuracy', { p: pct })}　${progressBar(quizMarks(level, d, picks), asked)}`, '', say] : [say];
    if (missed.length) {
        lines.push('', `**${t(ui, 'gq_missed')}**`);
        for (const { p, q, chosen, i } of missed.slice(page * WRONG_PER_PAGE, (page + 1) * WRONG_PER_PAGE)) {
            const full = fullSentence(info.lang, q, ui);
            lines.push('', `**${i + 1}.** ${full}`, `-# ${heading(info.lang, p, ui).map(s => s.replace(/^#+ |\*\*/g, '')).join('・')}`);
            const why = whyPerOption(q);
            lines.push(`❌ ${optionLabel(info.lang, q, chosen, ui)}${why ? ' — ' + gText(q.why[chosen], ui) : ''}`);
            lines.push(`✅ ${optionLabel(info.lang, q, q.answer, ui)}${why ? ' — ' + gText(q.why[q.answer], ui) : ''}`);
            if (whyOfOrder(q)) lines.push(`-# ${gText(q.why[0], ui)}`);
        }
    } else if (asked) {
        lines.push('', t(ui, 'gq_all_right'));
    }
    const base = `${ui}:${owner}:${levelId}:${seedField}:${n}:${picks}`;
    const nav = pages > 1 ? [
        button(`tr:${base}:${page - 1}`, t(ui, 'p_prev'), 2, page === 0),
        button(`tr:${base}:${page + 1}`, t(ui, 'p_next'), 2, page >= pages - 1)] : [];
    const next = [
        ...(missed.length ? [button(`tm:${base}`, t(ui, 'gq_retry_missed', { n: missed.length }), 1)] : []),
        button(`tg:${ui}:${owner}:${levelId}:${Math.max(GQ_MIN, n)}`, t(ui, 'r_again'), missed.length ? 2 : 1),
        linkButton(SITE_URL, t(ui, 'g_site'))];
    const footer = [pages > 1 ? t(ui, 'p_page', { p: page + 1, m: pages }) : '', t(ui, 'g_footer')].filter(Boolean).join(' · ');
    return {
        content: '',
        embeds: [{ color: COLOR, title: t(ui, 'gq_results', { level: info.name }), description: cut(lines.join('\n'), 4000),
            footer: { text: footer } }],
        components: [...(nav.length ? [row(nav)] : []), row(next)]
    };
}

/* a round of the questions just missed: their places go to KV under a short id */
async function quizMissedRound(env, ui, owner, levelId, seedField, n, picks) {
    const got = await load(env, levelId, ui);
    if (!got || !got.level) return gone(ui, 'g_load_failed');
    const d = await quizDeck(env, got.level, seedField);
    if (!d || !env.PREFS) return gone(ui, 'expired_round');
    const items = [...picks].map((c, i) => quizQuestion(got.level, d, i)).filter((x, i) => Number(picks[i]) !== x.q.answer).map(x => [x.pi, x.qi]);
    if (!items.length) return quizResults(env, ui, owner, levelId, seedField, n, picks, 0);
    const rid = newSeed().toString(36).padStart(7, '0').slice(0, 8);
    await env.PREFS.put('gm:' + rid, JSON.stringify({ level: levelId, items }), { expirationTtl: MISSED_TTL });
    return quizAsk(env, ui, owner, levelId, 'M' + rid, items.length, '');
}

/* ===================== buttons ===================== */

function ended(ui) {
    return {
        content: '',
        embeds: [{ color: COLOR, description: t(ui, 'g_ended') }],
        components: [row([linkButton(SITE_URL, t(ui, 'g_site'))])]
    };
}

export const GRAMMAR_KINDS = ['sp', 'sq', 'sa', 'tq', 'ta', 'tr', 'tm', 'tg', 'ge'];

/* a grammar button, split on ":" (see the top of this file); user = who pressed it */
export async function grammarButton(env, parts, user) {
    const [kind, ui, owner, levelId] = parts;
    if (!isUiLang(ui)) return null;
    if (kind === 'ge') return ended(ui);
    if (!/^[a-z]{2}_[a-z0-9]+$/.test(levelId || '')) return null;
    if (kind === 'sp' || kind === 'sq' || kind === 'sa') {
        const pi = Number(parts[4]), picks = kind === 'sp' ? '' : parts[5];
        if (!Number.isInteger(pi) || pi < 0 || pi > 500 || !picksOk(picks)) return null;
        if (kind === 'sa') return studyAnswer(env, ui, owner, user, levelId, pi, picks, Number(parts[6]));
        if (kind === 'sq') return showQuestion(env, ui, owner, levelId, pi, picks);
        return showLesson(env, ui, owner, levelId, pi, false);
    }
    if (kind === 'tg') {
        const n = Number(parts[4]);
        if (!Number.isInteger(n) || n < GQ_MIN || n > GQ_MAX) return null;
        return quizAsk(env, ui, owner, levelId, newSeed().toString(36), n, '');
    }
    const seedField = parts[4], n = Number(parts[5]), picks = parts[6];
    if (!/^M?[0-9a-z]{1,8}$/.test(seedField || '') || !Number.isInteger(n) || n < 1 || n > GQ_MAX || !picksOk(picks) || picks.length > n) return null;
    if (kind === 'tq') return quizAsk(env, ui, owner, levelId, seedField, n, picks);
    if (kind === 'ta') return picks.length < n ? quizAnswer(env, ui, owner, levelId, seedField, n, picks, Number(parts[7])) : null;
    if (kind === 'tr') return quizResults(env, ui, owner, levelId, seedField, n, picks, Number(parts[7]) || 0);
    if (kind === 'tm') return quizMissedRound(env, ui, owner, levelId, seedField, n, picks);
    return null;
}
