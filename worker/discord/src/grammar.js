/* /grammar: a random point from one of the site's grammar levels (data/grammar/<id>.json,
   built by tools/build_grammar.py), with one of its practice questions. Like the quiz,
   nothing is stored: "ga:<ui>:<level>:<seed>:<owner>:<pick>" rebuilds the point, the
   question and the option order from the seed. The lessons are written in Chinese
   (Traditional + Simplified) and English; other bot languages read the English. */

import { studyName, rng, shuffle, newSeed } from './sets.js';
import { t, contentLang, isUiLang } from './i18n.js';
import { toSimplified } from './zhconv.js';
import { COLOR, SITE_URL, button, linkButton, row, cut } from './ui.js';

const BLANK = /（[\s　_＿]*）|\([\s_]*\)/;

async function fetchJson(env, path) {
    const res = await fetch(`${env.SITE}/data/grammar/${path}`, { cf: { cacheTtl: 3600, cacheEverything: true } });
    return res.ok ? res.json() : null;
}

/* [{id, lang, level, count, name: "日文 N5"}] in the site's order */
export async function grammarLevels(env, ui) {
    const index = await fetchJson(env, 'index.json');
    return (index || []).map(l => ({ ...l, name: `${studyName(ui, l.lang)} ${l.level}` }));
}

export async function levelChoices(env, typed, ui) {
    const q = String(typed || '').toLowerCase();
    return (await grammarLevels(env, ui))
        .filter(l => !q || l.name.toLowerCase().includes(q) || l.id.includes(q))
        .slice(0, 25)
        .map(l => ({ name: t(ui, 'g_levels', { name: l.name, n: l.count }), value: l.id }));
}

/* the point, question and shuffled options a seed stands for */
function pick(level, seed) {
    const rand = rng(seed);
    const points = level.points.filter(p => p.quiz && p.quiz.length);
    const p = points[Math.floor(rand() * points.length)];
    const q = p.quiz[Math.floor(rand() * p.quiz.length)];
    const order = shuffle(q.options.map((_, k) => k), rand);
    return { p, q, order };
}

/* a lesson text ({zh, en, zh-Hans}) in the visitor's language */
function gText(obj, ui) {
    if (!obj) return '';
    const c = contentLang(ui);
    if (c === 'zhs') return obj['zh-Hans'] || toSimplified(obj.zh || '') || obj.en || '';
    if (c === 'zh') return obj.zh || obj.en || '';
    return obj.en || obj.zh || '';
}

/* the translation of a question or example: English for the Chinese lessons (a Chinese
   one would just repeat the sentence), else in the visitor's language */
const translation = (lessonLang, obj, ui) => (lessonLang === 'zh' ? obj.en || '' : gText(obj, ui));

/* Chinese lesson sentences are written in Traditional: Simplified for zhs visitors */
const zhText = (lessonLang, text, ui) => (lessonLang === 'zh' && ui === 'zhs' ? toSimplified(text) : text);

/* The point's heading lines. Many French / Russian / Korean patterns carry Chinese
   ("imparfait（未完成過去式）", "屬格（родительный падеж）"): Simplified for zhs; for
   English readers a Chinese note in brackets is dropped, and a pattern still in Chinese
   after that gives way to the (English) title. Japanese / Chinese patterns are the
   language itself and stay. */
export function heading(lessonLang, p, ui) {
    const title = gText(p.title, ui);
    let pattern = p.pattern;
    if (lessonLang === 'ja' || lessonLang === 'zh') pattern = zhText(lessonLang, pattern, ui);
    else if (contentLang(ui) === 'zhs') pattern = toSimplified(pattern);
    else if (contentLang(ui) === 'en') {
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

/* The sentence with the answer in the blank. The site draws the blank as a box; in
   text, French / Russian (and other space-separated) sentences need the spaces the
   source leaves out ("en train（　）cuisiner") — but none after an elision (à l'école)
   or before a hyphen (Pouvez-vous). Japanese and Chinese have no spaces. Korean keeps
   the brackets: its blank is a particle or ending in some sentences (저는 학생) and a
   whole word in others (학교에 안 가요), which the text alone doesn't tell apart. */
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

export async function startGrammar(env, opts, userId, ui) {
    const levels = await grammarLevels(env, ui);
    const id = levels.some(l => l.id === opts.level) ? opts.level : (levels[0] && levels[0].id);
    return showPoint(env, ui, id, newSeed(), opts.public ? userId : '0');
}

async function showPoint(env, ui, levelId, seed, owner) {
    const got = levelId && await load(env, levelId, ui);
    if (!got || !got.level) return gone(ui, 'g_no_level');
    const { info, level } = got;
    const { p, q, order } = pick(level, seed);
    const hint = translation(info.lang, q, ui);
    const lines = [...heading(info.lang, p, ui), t(ui, 'g_form', { f: gText(p.form, ui) }), '',
        cut(gText(p.explain, ui), 700), '', `**${t(ui, 'g_quiz')}**`, `### ${zhText(info.lang, q.q, ui)}`];
    if (q.q_reading) lines.push(`-# ${q.q_reading}`);
    if (hint) lines.push(`-# ${hint}`);
    const base = `${ui}:${levelId}:${seed.toString(36)}:${owner}`;
    return {
        content: '',
        embeds: [{ color: COLOR, title: t(ui, 'g_title', { level: info.name }), description: cut(lines.join('\n'), 4000) }],
        components: [row(order.map(k => button(`ga:${base}:${k}`, optionLabel(info.lang, q, k, ui)))), row([endButton(ui, owner)])]
    };
}

async function grammarAnswer(env, ui, levelId, seed, owner, chosen) {
    const got = await load(env, levelId, ui);
    if (!got || !got.level) return gone(ui, 'g_load_failed');
    const { info, level } = got;
    const { p, q, order } = pick(level, seed);
    const ok = chosen === q.answer;
    const full = fillBlank(info.lang, zhText(info.lang, q.q, ui), zhText(info.lang, q.options[q.answer], ui));
    const lines = [...heading(info.lang, p, ui), '',
        ok ? t(ui, 'right') : t(ui, 'wrong', { a: optionLabel(info.lang, q, q.answer, ui) }), '', `### ${full}`];
    if (q.full_reading) lines.push(`-# ${q.full_reading}`);
    const tr = translation(info.lang, q, ui);
    if (tr) lines.push(`-# ${tr}`);
    const mistake = (p.mistakes || [])[0];
    if (mistake) {
        lines.push('', `**${t(ui, 'g_mistake')}**`, `~~${zhText(info.lang, mistake.wrong, ui)}~~ → ${zhText(info.lang, mistake.right, ui)}`);
        const why = gText(mistake, ui);
        if (why) lines.push(`-# ${why}`);
    }
    const ex = (p.examples || [])[0];
    if (ex) lines.push('', `**${t(ui, 'g_example')}**`, ...exampleLines(info.lang, ex, ui));
    return {
        content: '',
        embeds: [{ color: ok ? 0x3A8F5C : COLOR, title: t(ui, 'g_title', { level: info.name }), description: cut(lines.join('\n'), 4000),
            footer: { text: t(ui, 'g_footer') } }],
        components: [
            row(order.map(k => button(`x:${k}`, optionLabel(info.lang, q, k, ui), k === q.answer ? 3 : k === chosen ? 4 : 2, true))),
            row([button(`gn:${ui}:${levelId}:${owner}`, t(ui, 'g_next'), 1), endButton(ui, owner), linkButton(SITE_URL, t(ui, 'g_site'))])
        ]
    };
}

function ended(ui) {
    return {
        content: '',
        embeds: [{ color: COLOR, description: t(ui, 'g_ended') }],
        components: [row([linkButton(SITE_URL, t(ui, 'g_site'))])]
    };
}

/* the owner field of a grammar button */
export const grammarOwner = parts => (parts[0] === 'ga' ? parts[4] : parts[0] === 'gn' ? parts[3] : parts[2]);

/* a grammar button, split on ":" — ga:<ui>:<level>:<seed36>:<owner>:<pick>,
   gn:<ui>:<level>:<owner> (next point) or ge:<ui>:<owner> (finish) */
export async function grammarButton(env, parts) {
    const ui = parts[1];
    if (!isUiLang(ui)) return null;
    if (parts[0] === 'ga') return grammarAnswer(env, ui, parts[2], parseInt(parts[3], 36) >>> 0, parts[4], Number(parts[5]));
    if (parts[0] === 'gn') return showPoint(env, ui, parts[2], newSeed(), parts[3]);
    if (parts[0] === 'ge') return ended(ui);
    return null;
}
