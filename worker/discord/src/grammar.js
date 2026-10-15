/* /grammar: the site's grammar levels (data/grammar/<id>.json, built by
   tools/build_grammar.py), in two modes (owner's request, 2026-10-15):

   study — the level's points in order, each with its explanation and all three of its
           practice questions; where a visitor got to is kept in KV PREFS
           ("g:<user>:<lang>" = {level, at: {<level>: point index}}) and /grammar study
           picks up there next time.
   quiz  — n questions drawn at random from the whole level; at the end the missed
           ones are listed with why the picked option doesn't fit and the answer does.

   Nothing else is stored: a button's custom_id carries the state (the options picked
   so far as digits), and questions are rebuilt from it on each press:
     study  sp:<ui>:<owner>:<level>:<point>                 the point and its question 1
            sq:<ui>:<owner>:<level>:<point>:<picks>         its next question
            sa:<ui>:<owner>:<level>:<point>:<picks>:<k>     an answer
     quiz   tq:<ui>:<owner>:<level>:<seed36>:<n>:<picks>       the next question
            ta:<ui>:<owner>:<level>:<seed36>:<n>:<picks>:<k>   an answer
            tr:<ui>:<owner>:<level>:<seed36>:<n>:<picks>:<page> the results
     both   ge:<ui>:<owner>                                 finish
   Texts come in the visitor's language: Chinese, English, and since 2026-10-15
   ja / ko / ru / fr / es / de (tools/content_i18n.py) — never the lesson's own
   language, which reads the English. q.why = one line per option (tools/grammar_why.py). */

import { studyName, rng, shuffle, newSeed } from './sets.js';
import { t, isUiLang } from './i18n.js';
import { toSimplified } from './zhconv.js';
import { COLOR, SITE_URL, button, linkButton, row, cut } from './ui.js';

const BLANK = /（[\s　_＿]*）|\([\s_]*\)/;
const GREEN = 0x3A8F5C;
export const GQ_MIN = 5, GQ_MAX = 30, GQ_DEFAULT = 10;
const WRONG_PER_PAGE = 4;

async function fetchJson(env, path) {
    const res = await fetch(`${env.SITE}/data/grammar/${path}`, { cf: { cacheTtl: 3600, cacheEverything: true } });
    return res.ok ? res.json() : null;
}

/* [{id, lang, level, count, name: "日文 N5"}] in the site's order */
export async function grammarLevels(env, ui) {
    const index = await fetchJson(env, 'index.json');
    return (index || []).map(l => ({ ...l, name: `${studyName(ui, l.lang)} ${l.level}` }));
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

function optionLabel(lessonLang, q, k, ui) {
    const text = zhText(lessonLang, q.options[k], ui);
    const r = q.options_reading && q.options_reading[k];
    return r ? `${text}（${r}）` : text;
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
    const full = fillBlank(lessonLang, zhText(lessonLang, q.q, ui), zhText(lessonLang, q.options[q.answer], ui));
    const lines = [ok ? t(ui, 'right') : t(ui, 'wrong', { a: optionLabel(lessonLang, q, q.answer, ui) }), '', `### ${full}`];
    if (q.full_reading) lines.push(`-# ${q.full_reading}`);
    const tr = translation(lessonLang, q, ui);
    if (tr) lines.push(`-# ${tr}`);
    if (q.why && q.why.length === q.options.length) {
        lines.push('', `**${t(ui, 'g_why')}**`);
        if (!ok) lines.push(`❌ **${optionLabel(lessonLang, q, chosen, ui)}** — ${gText(q.why[chosen], ui)}`);
        lines.push(`✅ **${optionLabel(lessonLang, q, q.answer, ui)}** — ${gText(q.why[q.answer], ui)}`);
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
    return showPoint(env, ui, opts.public ? user : '0', id, at, '', at > 0);
}

/* point `pi` and its question picks.length + 1 (all on one card for the first) */
async function showPoint(env, ui, owner, levelId, pi, picks, resumed) {
    const got = levelId && await load(env, levelId, ui);
    if (!got || !got.level) return gone(ui, 'g_no_level');
    const { info, level } = got;
    if (pi >= level.points.length) pi = 0;
    const p = level.points[pi], qi = picks.length, q = p.quiz[qi];
    if (!q) return gone(ui, 'g_no_level');
    const order = optionOrder(q, (pi * 31 + qi + 7) ^ idHash(levelId));
    const lines = [...heading(info.lang, p, ui)];
    if (qi === 0) {
        if (resumed) lines.push(`-# ${t(ui, 'g_resumed')}`);
        lines.push(t(ui, 'g_form', { f: gText(p.form, ui) }), '', cut(gText(p.explain, ui), 900));
        const ex = (p.examples || [])[0];
        if (ex) lines.push('', `**${t(ui, 'g_example')}**`, ...exampleLines(info.lang, ex, ui));
        lines.push('');
    }
    lines.push(`**${t(ui, 'g_q_n', { i: qi + 1, n: p.quiz.length })}**`, ...questionLines(info.lang, q, ui));
    const base = `${ui}:${owner}:${levelId}:${pi}:${picks}`;
    return {
        content: '',
        embeds: [{ color: COLOR, title: t(ui, 'gs_title', { level: info.name, i: pi + 1, n: level.points.length }),
            description: cut(lines.join('\n'), 4000) }],
        components: [row(order.map(k => button(`sa:${base}:${k}`, cut(optionLabel(info.lang, q, k, ui), 80)))), row([endButton(ui, owner)])]
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
    const lines = [...heading(info.lang, p, ui), `**${t(ui, 'g_q_n', { i: qi + 1, n: p.quiz.length })}**`, '',
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
            button(`sp:${ui}:${owner}:${levelId}:${pi}`, t(ui, 'g_retry'), 2), endButton(ui, owner)];
    }
    return {
        content: '',
        embeds: [{ color: Number(chosen) === q.answer ? GREEN : COLOR,
            title: t(ui, 'gs_title', { level: info.name, i: pi + 1, n: level.points.length }),
            description: cut(lines.join('\n'), 4000), footer: { text: t(ui, last ? 'g_saved' : 'g_footer') } }],
        components: [
            row(order.map(k => button(`x:${k}`, cut(optionLabel(info.lang, q, k, ui), 80), k === q.answer ? 3 : k === chosen ? 4 : 2, true))),
            row(last ? [...buttons, linkButton(SITE_URL, t(ui, 'g_site'))] : buttons)
        ]
    };
}

/* ===================== quiz ===================== */

/* question i of a quiz: the level's questions in the order the seed shuffles them */
function quizQuestion(level, seed, i) {
    const all = [];
    level.points.forEach((p, pi) => (p.quiz || []).forEach((q, qi) => all.push([pi, qi])));
    const order = shuffle(all.map((_, k) => k), rng(seed));
    const [pi, qi] = all[order[i % order.length]];
    const p = level.points[pi], q = p.quiz[qi];
    return { p, q, order: optionOrder(q, (seed ^ Math.imul(i + 1, 0x9E3779B1)) >>> 0) };
}

/* /grammar quiz language:<…> level:<id?> count:<n> */
export async function startQuiz(env, opts, user, ui) {
    const levels = (await grammarLevels(env, ui)).filter(l => !opts.language || l.lang === opts.language);
    if (!levels.length) return gone(ui, 'g_no_lang');
    const id = levels.some(l => l.id === opts.level) ? opts.level : levels[0].id;
    const n = Math.min(GQ_MAX, Math.max(GQ_MIN, Number(opts.count) || GQ_DEFAULT));
    return quizAsk(env, ui, opts.public ? user : '0', id, newSeed(), n, '');
}

async function quizAsk(env, ui, owner, levelId, seed, n, picks) {
    const got = await load(env, levelId, ui);
    if (!got || !got.level) return gone(ui, 'g_no_level');
    const { info, level } = got;
    const i = picks.length;
    const { p, q, order } = quizQuestion(level, seed, i);
    const base = `${ui}:${owner}:${levelId}:${seed.toString(36)}:${n}:${picks}`;
    const lines = [...heading(info.lang, p, ui), '', ...questionLines(info.lang, q, ui)];
    return {
        content: '',
        embeds: [{ color: COLOR, title: t(ui, 'gq_title', { level: info.name, i: i + 1, n }), description: cut(lines.join('\n'), 4000),
            footer: { text: t(ui, 'q_tally', { s: quizScore(level, seed, picks), n: i }) } }],
        components: [row(order.map(k => button(`ta:${base}:${k}`, cut(optionLabel(info.lang, q, k, ui), 80)))),
            row([button(`tr:${base}:0`, t(ui, 'q_end'), 2)])]
    };
}

function quizScore(level, seed, picks) {
    return [...picks].filter((c, i) => Number(c) === quizQuestion(level, seed, i).q.answer).length;
}

async function quizAnswer(env, ui, owner, levelId, seed, n, picks, chosen) {
    const got = await load(env, levelId, ui);
    if (!got || !got.level) return gone(ui, 'g_load_failed');
    const { info, level } = got;
    const i = picks.length;
    const { p, q, order } = quizQuestion(level, seed, i);
    if (!(chosen >= 0 && chosen < q.options.length)) return null;
    const all = picks + chosen;
    const base = `${ui}:${owner}:${levelId}:${seed.toString(36)}:${n}:${all}`;
    const last = i + 1 >= n;
    const lines = [...heading(info.lang, p, ui), '', ...feedbackLines(info.lang, p, q, chosen, ui)];
    return {
        content: '',
        embeds: [{ color: chosen === q.answer ? GREEN : COLOR, title: t(ui, 'gq_title', { level: info.name, i: i + 1, n }),
            description: cut(lines.join('\n'), 4000), footer: { text: t(ui, 'q_tally', { s: quizScore(level, seed, all), n: i + 1 }) } }],
        components: [
            row(order.map(k => button(`x:${k}`, cut(optionLabel(info.lang, q, k, ui), 80), k === q.answer ? 3 : k === chosen ? 4 : 2, true))),
            row(last ? [button(`tr:${base}:0`, t(ui, 'q_results'), 1)]
                : [button(`tq:${base}`, t(ui, 'q_next'), 1), button(`tr:${base}:0`, t(ui, 'q_end'), 2)])
        ]
    };
}

/* the result: score, then the missed questions with why, WRONG_PER_PAGE a page */
async function quizResults(env, ui, owner, levelId, seed, n, picks, page) {
    const got = await load(env, levelId, ui);
    if (!got || !got.level) return gone(ui, 'g_load_failed');
    const { info, level } = got;
    const asked = picks.length;
    const missed = [];
    [...picks].forEach((c, i) => {
        const { p, q } = quizQuestion(level, seed, i);
        if (Number(c) !== q.answer) missed.push({ p, q, chosen: Number(c), i });
    });
    const score = asked - missed.length;
    const pct = asked ? Math.round(score / asked * 100) : 0;
    const say = t(ui, !asked ? 'r_none' : pct === 100 ? 'r_100' : pct >= 80 ? 'r_80' : pct >= 60 ? 'r_60' : 'r_low');
    const pages = Math.max(1, Math.ceil(missed.length / WRONG_PER_PAGE));
    page = Math.min(Math.max(0, page), pages - 1);
    const lines = asked ? [`# ${score} / ${asked}`, t(ui, 'r_accuracy', { p: pct }), '', say] : [say];
    if (missed.length) {
        lines.push('', `**${t(ui, 'gq_missed')}**`);
        for (const { p, q, chosen, i } of missed.slice(page * WRONG_PER_PAGE, (page + 1) * WRONG_PER_PAGE)) {
            const full = fillBlank(info.lang, zhText(info.lang, q.q, ui), zhText(info.lang, q.options[q.answer], ui));
            lines.push('', `**${i + 1}.** ${full}`, `-# ${heading(info.lang, p, ui).map(s => s.replace(/^#+ |\*\*/g, '')).join('・')}`);
            const why = q.why && q.why.length === q.options.length;
            lines.push(`❌ ${optionLabel(info.lang, q, chosen, ui)}${why ? ' — ' + gText(q.why[chosen], ui) : ''}`);
            lines.push(`✅ ${optionLabel(info.lang, q, q.answer, ui)}${why ? ' — ' + gText(q.why[q.answer], ui) : ''}`);
        }
    } else if (asked) {
        lines.push('', t(ui, 'gq_all_right'));
    }
    const base = `${ui}:${owner}:${levelId}:${seed.toString(36)}:${n}:${picks}`;
    const nav = pages > 1 ? [
        button(`tr:${base}:${page - 1}`, t(ui, 'p_prev'), 2, page === 0),
        button(`x:page`, t(ui, 'p_page', { p: page + 1, m: pages }), 2, true),
        button(`tr:${base}:${page + 1}`, t(ui, 'p_next'), 2, page >= pages - 1)] : [];
    return {
        content: '',
        embeds: [{ color: COLOR, title: t(ui, 'gq_results', { level: info.name }), description: cut(lines.join('\n'), 4000),
            footer: { text: t(ui, 'g_footer') } }],
        components: [...(nav.length ? [row(nav)] : []), row([linkButton(SITE_URL, t(ui, 'g_site'))])]
    };
}

/* ===================== buttons ===================== */

function ended(ui) {
    return {
        content: '',
        embeds: [{ color: COLOR, description: t(ui, 'g_ended') }],
        components: [row([linkButton(SITE_URL, t(ui, 'g_site'))])]
    };
}

export const GRAMMAR_KINDS = ['sp', 'sq', 'sa', 'tq', 'ta', 'tr', 'ge'];

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
        return showPoint(env, ui, owner, levelId, pi, picks, false);
    }
    const seed = parseInt(parts[4], 36) >>> 0, n = Number(parts[5]), picks = parts[6];
    if (!Number.isInteger(n) || n < 1 || n > GQ_MAX || !picksOk(picks) || picks.length > n) return null;
    if (kind === 'tq') return quizAsk(env, ui, owner, levelId, seed, n, picks);
    if (kind === 'ta') return picks.length < n ? quizAnswer(env, ui, owner, levelId, seed, n, picks, Number(parts[7])) : null;
    if (kind === 'tr') return quizResults(env, ui, owner, levelId, seed, n, picks, Number(parts[7]) || 0);
    return null;
}
