/* /grammar: a random point from one of the site's grammar levels (data/grammar/<id>.json,
   built by tools/build_grammar.py), with one of its practice questions. Like the quiz,
   nothing is stored: "ga:<level>:<seed>:<owner>:<pick>" rebuilds the point, the question
   and the option order from the seed. */

import { LANGS, rng, shuffle, newSeed } from './sets.js';
import { COLOR, SITE_URL, button, linkButton, row, cut } from './ui.js';

const BLANK = /（[\s　_＿]*）|\([\s_]*\)/;

async function fetchJson(env, path) {
    const res = await fetch(`${env.SITE}/data/grammar/${path}`, { cf: { cacheTtl: 3600, cacheEverything: true } });
    return res.ok ? res.json() : null;
}

/* [{id, lang, level, name: "日文 N5"}] in the site's order */
export async function grammarLevels(env) {
    const index = await fetchJson(env, 'index.json');
    return (index || []).map(l => ({ ...l, name: `${LANGS[l.lang] || l.lang} ${l.level}` }));
}

export async function levelChoices(env, typed) {
    const q = String(typed || '').toLowerCase();
    return (await grammarLevels(env))
        .filter(l => !q || l.name.toLowerCase().includes(q) || l.id.includes(q))
        .slice(0, 25)
        .map(l => ({ name: `${l.name}（${l.count} 個文法）`, value: l.id }));
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

const zh = t => (t && (t.zh || t.en)) || '';

function exampleLines(lang, ex) {
    if (!ex) return [];
    const text = lang === 'ja' ? ex.ja : ex.text;
    const reading = lang === 'ja' ? (ex.kana !== ex.ja ? ex.kana : '') : ex.reading;
    return [`> ${text}`, ...(reading ? [`> -# ${reading}`] : []), `> ${lang === 'zh' ? ex.en : ex.zh}`];
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

function optionLabel(q, k) {
    const r = q.options_reading && q.options_reading[k];
    return r ? `${q.options[k]}（${r}）` : q.options[k];
}

async function load(env, levelId) {
    const levels = await grammarLevels(env);
    const info = levels.find(l => l.id === levelId);
    return info ? { info, level: await fetchJson(env, levelId + '.json') } : null;
}

export async function startGrammar(env, opts, userId) {
    const levels = await grammarLevels(env);
    const id = levels.some(l => l.id === opts.level) ? opts.level : (levels[0] && levels[0].id);
    return showPoint(env, id, newSeed(), opts.public ? userId : '0');
}

async function showPoint(env, levelId, seed, owner) {
    const got = levelId && await load(env, levelId);
    if (!got || !got.level) return { content: '找不到這個文法等級，換一個試試看。', embeds: [], components: [] };
    const { info, level } = got;
    const { p, q, order } = pick(level, seed);
    const hint = info.lang === 'zh' ? q.en : q.zh;
    const lines = [`## ${p.pattern}`, `**${zh(p.title)}**`, `接續：${zh(p.form)}`, '', cut(zh(p.explain), 700), '',
        '**📝 小測驗：選出填進空格的答案**', `### ${q.q}`];
    if (q.q_reading) lines.push(`-# ${q.q_reading}`);
    if (hint) lines.push(`-# ${hint}`);
    const base = `${levelId}:${seed.toString(36)}:${owner}`;
    return {
        content: '',
        embeds: [{ color: COLOR, title: `📚 ${info.name} 文法`, description: lines.join('\n') }],
        components: [row(order.map(k => button(`ga:${base}:${k}`, optionLabel(q, k))))]
    };
}

async function grammarAnswer(env, levelId, seed, owner, chosen) {
    const got = await load(env, levelId);
    if (!got || !got.level) return { content: '這個文法等級暫時讀不到，稍後再試。', embeds: [], components: [] };
    const { info, level } = got;
    const { p, q, order } = pick(level, seed);
    const ok = chosen === q.answer;
    const full = fillBlank(info.lang, q.q, q.options[q.answer]);
    const lines = [`## ${p.pattern}`, `**${zh(p.title)}**`, '',
        ok ? '✅ **答對了！**' : `❌ 答錯了，正確答案是：**${optionLabel(q, q.answer)}**`, '', `### ${full}`];
    if (q.full_reading) lines.push(`-# ${q.full_reading}`);
    lines.push(`-# ${info.lang === 'zh' ? q.en : q.zh}`);
    const mistake = (p.mistakes || [])[0];
    if (mistake) lines.push('', '**⚠️ 常見錯誤**', `~~${mistake.wrong}~~ → ${mistake.right}`, `-# ${zh(mistake)}`);
    const ex = (p.examples || [])[0];
    if (ex) lines.push('', '**💬 例句**', ...exampleLines(info.lang, ex));
    return {
        content: '',
        embeds: [{ color: ok ? 0x3A8F5C : COLOR, title: `📚 ${info.name} 文法`, description: cut(lines.join('\n'), 4000),
            footer: { text: '完整說明、注意事項和有發音的例句都在網站的「文法」頁' } }],
        components: [
            row(order.map(k => button(`x:${k}`, optionLabel(q, k), k === q.answer ? 3 : k === chosen ? 4 : 2, true))),
            row([button(`gn:${levelId}:${owner}`, '下一個文法 ➡️', 1), linkButton(SITE_URL, '到網站看完整說明')])
        ]
    };
}

/* a grammar button, split on ":" — ga:<level>:<seed36>:<owner>:<pick> or gn:<level>:<owner> */
export async function grammarButton(env, parts) {
    if (parts[0] === 'ga') return grammarAnswer(env, parts[1], parseInt(parts[2], 36) >>> 0, parts[3], Number(parts[4]));
    if (parts[0] === 'gn') return showPoint(env, parts[1], newSeed(), parts[2]);
    return null;
}
