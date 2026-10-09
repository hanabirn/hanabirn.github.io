/* /quiz: a multiple-choice vocabulary quiz on one of the site's word sets.
   Nothing is stored: every button carries the quiz in its custom_id
   ("qa:<set>:<seed>:<i>:<score>:<n>:<owner>:<pick>"), and question i is rebuilt
   from the seed — the same word order, the same wrong options — on each press.
   owner is the user id on a public quiz (only they may answer), 0 on a private one. */

import { LANGS, setsFor, setInfo, loadSet, card, shortMeaning, rng, shuffle, newSeed } from './sets.js';
import { COLOR, SITE_URL, button, linkButton, row } from './ui.js';

export const QUIZ_MIN = 5, QUIZ_MAX = 30, QUIZ_DEFAULT = 10;

/* question i of a quiz: {c (card), ask ('reading' | 'meaning'), options [4 strings], correct (index)}.
   As on the site, a Japanese word written in kanji asks for its reading (its Chinese
   meaning is often the kanji itself: 一 → 一) and a kana word for its meaning. */
function question(set, seed, i) {
    const cards = set.words.map(r => card(set.kind, r)).filter(c => c.word && c.answer);
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

function prompt(info, q) {
    return q.ask === 'reading' ? '選出正確的讀音' : info.lang === 'zh' ? '選出正確的英文意思' : '選出正確的中文意思';
}

function title(info, i, n) {
    return `📖 ${info.name}・第 ${i + 1} / ${n} 題`;
}

/* /quiz language:<ja…> set:<id> count:<n> public:<bool> */
export async function startQuiz(env, opts, userId) {
    const lang = LANGS[opts.language] ? opts.language : 'ja';
    const sets = setsFor(lang);
    const id = opts.set && sets.some(s => s.id === opts.set) ? opts.set : sets[0].id;
    const n = Math.min(QUIZ_MAX, Math.max(QUIZ_MIN, Number(opts.count) || QUIZ_DEFAULT));
    const owner = opts.public ? userId : '0';
    return askQuestion(env, id, newSeed(), 0, 0, n, owner);
}

async function askQuestion(env, id, seed, i, score, n, owner) {
    const info = setInfo(id);
    const set = info && await loadSet(env, id);
    if (!set) return { content: `「${info ? info.name : id}」還沒有上線，換一個試試看。`, embeds: [], components: [] };
    const q = question(set, seed, i);
    const base = `${id}:${seed.toString(36)}:${i}:${score}:${n}:${owner}`;
    return {
        content: '',
        embeds: [{
            color: COLOR, title: title(info, i, n),
            description: `# ${q.c.word}`,
            footer: { text: `${prompt(info, q)}　｜　目前 ${score} 分` }
        }],
        components: [row(q.options.map((o, k) => button(`qa:${base}:${k}`, o))),
            row([button(`qe:${base}`, '結束測驗', 2)])]
    };
}

async function answer(env, id, seed, i, score, n, owner, pick) {
    const info = setInfo(id);
    const set = await loadSet(env, id);
    if (!set) return { content: '這個單字庫暫時讀不到，稍後再試。', embeds: [], components: [] };
    const q = question(set, seed, i);
    const ok = pick === q.correct;
    const now = score + (ok ? 1 : 0);
    const lines = [`# ${q.c.word}`];
    if (q.c.reading) lines.push(q.c.reading);
    lines.push('', ok ? '✅ **答對了！**' : `❌ 答錯了，正確答案是：**${q.options[q.correct]}**`);
    if (q.ask === 'reading') lines.push(`意思：${q.c.answer}`);
    if (q.c.extra) lines.push(`-# ${q.c.extra}`);
    const base = `${id}:${seed.toString(36)}`;
    const last = i + 1 >= n;
    return {
        content: '',
        embeds: [{ color: ok ? 0x3A8F5C : COLOR, title: title(info, i, n), description: lines.join('\n'),
            footer: { text: `${now} / ${i + 1} 題答對` } }],
        components: [
            row(q.options.map((o, k) => button(`x:${k}`, o, k === q.correct ? 3 : k === pick ? 4 : 2, true))),
            row([last ? button(`qe:${base}:${i + 1}:${now}:${n}:${owner}`, '看結果 🎉', 1)
                : button(`qn:${base}:${i + 1}:${now}:${n}:${owner}`, '下一題 ➡️', 1),
            ...(last ? [] : [button(`qe:${base}:${i + 1}:${now}:${n}:${owner}`, '結束測驗', 2)])])
        ]
    };
}

function results(id, score, asked) {
    const info = setInfo(id);
    const pct = asked ? Math.round(score / asked * 100) : 0;
    const say = !asked ? '下次再來挑戰吧！' : pct === 100 ? '全對！太厲害了 🎆' : pct >= 80 ? '很棒，繼續保持！' : pct >= 60 ? '不錯喔，再多練幾次！' : '別灰心，多練習就會進步的！';
    return {
        content: '',
        embeds: [{ color: COLOR, title: `🎯 ${info ? info.name : id}・測驗結果`,
            description: asked ? `# ${score} / ${asked}\n答對率 **${pct}%**\n\n${say}` : say,
            footer: { text: '想照關卡一步步學、看錯題本，就到網站練習吧' } }],
        components: [row([linkButton(SITE_URL, '到 Hanabiの小天地 練習')])]
    };
}

/* a quiz button: [kind, set, seed36, i, score, n, owner, pick?] (already split on ":") */
export async function quizButton(env, parts) {
    const [kind, id, seed36, i, score, n, , pick] = parts;
    const owner = parts[6];
    if (!setInfo(id)) return null;
    const seed = parseInt(seed36, 36) >>> 0;
    const nums = [i, score, n].map(Number);
    if (nums.some(x => !Number.isInteger(x) || x < 0 || x > 100)) return null;
    if (kind === 'qa') return answer(env, id, seed, nums[0], nums[1], nums[2], owner, Number(pick));
    if (kind === 'qn') return askQuestion(env, id, seed, nums[0], nums[1], nums[2], owner);
    if (kind === 'qe') return results(id, nums[1], nums[0]);
    return null;
}

/* autocomplete for the set option: the sets of the chosen language matching what was typed */
export function setChoices(lang, typed) {
    const q = String(typed || '').toLowerCase();
    return setsFor(LANGS[lang] ? lang : 'ja')
        .filter(s => !q || s.name.toLowerCase().includes(q) || s.id.includes(q))
        .slice(0, 25)
        .map(s => ({ name: s.name, value: s.id }));
}
