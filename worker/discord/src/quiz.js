/* /quiz: a multiple-choice vocabulary quiz on one of the site's word sets.
   Nothing is stored for a quiz itself: every button carries it in its custom_id, and
   question i is rebuilt from the seed — the same word order, the same wrong options —
   on each press:
     va:<ui>:<owner>:<set>:<seed>:<n>:<picks>:<k>     an answer
     vn:<ui>:<owner>:<set>:<seed>:<n>:<picks>         the next question
     vr:<ui>:<owner>:<set>:<seed>:<n>:<picks>:<page>  the results, a page of the words
     vm:<ui>:<owner>:<set>:<seed>:<n>:<picks>         a round of the words just missed
     vg:<ui>:<owner>:<set>:<n>                        the same set again, a new seed
     vs:<ui>:<owner>:<n>  (a drop-down; the set is its value)  another set
   seed = base 36, or "M" + the id of a missed-words round, whose card list is kept in
   KV PREFS ("vm:<id>", 3 days) since it won't fit in a custom_id (100 characters).
   picks = the option picked for each question so far (one digit each), which gives the
   score and, at the end, the list of words right and wrong (owner's request,
   2026-10-15). ui is the visitor's bot language (i18n.js); owner is the user id on a
   public quiz (only they may answer), 0 on a private one. The set used last is kept per
   user ("q:<user>") so a bare /quiz carries on with it (2026-10-17). The old qa / qn / qe
   buttons (score in place of picks) only say the quiz has expired. */

import { STUDY_LANGS, setsFor, setInfo, loadSet, card, shortMeaning, rng, shuffle, newSeed } from './sets.js';
import { t, isUiLang } from './i18n.js';
import { COLOR, NEUTRAL, GREEN, RED, SITE_URL, button, linkButton, select, row, cut, progressBar, LETTERS, needLetters } from './ui.js';

export const QUIZ_MIN = 5, QUIZ_MAX = 30, QUIZ_DEFAULT = 10;
const WORDS_PER_PAGE = 10;
const MISSED_TTL = 3 * 24 * 3600;

/* the set used last, per user (a private quiz is still that user's) */
async function lastSet(env, user) {
    if (!env.PREFS || !user || user === '0') return '';
    try { return (await env.PREFS.get('q:' + user)) || ''; } catch { return ''; }
}

async function rememberSet(env, user, id) {
    if (!env.PREFS || !user || user === '0') return;
    try { await env.PREFS.put('q:' + user, id); } catch (err) { console.log('quiz set save failed', err); }
}

function seedHash(text) {
    let h = 0x811C9DC5;
    for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return h >>> 0;
}

/* The set as cards, and the order the quiz asks them in: the seed's shuffle, or a
   missed-words round's own list — built once per button press (a Worker request gets
   little CPU, and the results rebuild every question). null when that round expired. */
async function deck(env, set, seedField, ui) {
    const cards = set.words.map(r => card(set.kind, r, ui)).filter(c => c.word && c.answer);
    if (seedField.startsWith('M')) {
        let saved = null;
        try { saved = env.PREFS && JSON.parse(await env.PREFS.get('vm:' + seedField.slice(1))); } catch {}
        if (!saved || !Array.isArray(saved.idx) || !saved.idx.length) return null;
        return { cards, kind: set.kind, order: saved.idx.filter(k => k < cards.length), seed: seedHash(seedField) };
    }
    const seed = parseInt(seedField, 36) >>> 0;
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

const results = (d, picks) => [...picks].map((p, i) => Number(p) === question(d, i).correct);
const score = (d, picks) => results(d, picks).filter(Boolean).length;

const title = (ui, info, i, n) => '📖 ' + t(ui, 'q_title', { set: info.name, i: i + 1, n });
const extraLine = (ui, extra) => (!extra ? '' : typeof extra === 'string' ? extra : t(ui, extra.key, extra));
const gone = (ui, key, params) => ({ content: t(ui, key, params), embeds: [], components: [] });
// the progress under a question: 🟩🟥⬜… and the tally
const progress = (ui, d, picks, n) => progressBar(results(d, picks), n) + (picks.length ? `　${t(ui, 'q_tally', { s: score(d, picks), n: picks.length })}` : '');

/* /quiz language:<ja…>? set:<id>? count:<n> public:<bool> — no set: the one used last
   (in that language, when one is given), else the language's first */
export async function startQuiz(env, opts, userId, ui) {
    const lang = STUDY_LANGS.includes(opts.language) ? opts.language : '';
    let id = opts.set && setInfo(opts.set, ui) && (!lang || setInfo(opts.set, ui).lang === lang) ? opts.set : '';
    let resumed = false;
    if (!id) {
        const last = await lastSet(env, userId);
        const info = last && setInfo(last, ui);
        if (info && (!lang || info.lang === lang)) { id = last; resumed = true; }
    }
    if (!id) id = setsFor(lang || 'ja', ui)[0].id;
    await rememberSet(env, userId, id);
    const n = Math.min(QUIZ_MAX, Math.max(QUIZ_MIN, Number(opts.count) || QUIZ_DEFAULT));
    return askQuestion(env, ui, opts.public ? userId : '0', id, newSeed().toString(36), n, '', resumed);
}

async function askQuestion(env, ui, owner, id, seedField, n, picks, resumed) {
    const info = setInfo(id, ui);
    const set = info && await loadSet(env, id);
    if (!set) return gone(ui, 'not_live', { set: info ? info.name : id });
    const d = await deck(env, set, seedField, ui);
    if (!d) return gone(ui, 'expired_round');
    const i = picks.length;
    const q = question(d, i);
    const base = `${ui}:${owner}:${id}:${seedField}:${n}:${picks}`;
    const letters = needLetters(q.options);
    const lines = [];
    if (resumed) lines.push(`-# ${t(ui, 'q_resumed')}`);
    lines.push(`# ${q.c.word}`);
    if (letters) lines.push('', ...q.options.map((o, k) => `**${LETTERS[k]}**　${o}`));
    const rows = [row(q.options.map((o, k) => button(`va:${base}:${k}`, letters ? LETTERS[k] : o)))];
    // the first question can switch to another set of the same language
    if (i === 0 && !seedField.startsWith('M')) {
        rows.push(row([select(`vs:${ui}:${owner}:${n}`, t(ui, 'q_change_set'),
            setsFor(info.lang, ui).map(s => ({ label: s.short, value: s.id, default: s.id === id })))]));
    }
    rows.push(row([button(`vr:${base}:0`, t(ui, 'q_end'), 2)]));
    return {
        content: '',
        embeds: [{
            color: NEUTRAL, title: title(ui, info, i, n),
            description: lines.join('\n'),
            footer: { text: `${t(ui, q.ask === 'reading' ? 'q_reading' : 'q_meaning')}\n${progress(ui, d, picks, n)}` }
        }],
        components: rows
    };
}

async function answer(env, ui, owner, id, seedField, n, picks, pick) {
    const info = setInfo(id, ui);
    const set = await loadSet(env, id);
    if (!set) return gone(ui, 'load_failed');
    const d = await deck(env, set, seedField, ui);
    if (!d) return gone(ui, 'expired_round');
    const i = picks.length;
    const q = question(d, i);
    if (!(pick >= 0 && pick < q.options.length)) return null;
    const all = picks + pick;
    const ok = pick === q.correct;
    const letters = needLetters(q.options);
    const lines = [`# ${q.c.word}`];
    if (q.c.reading) lines.push(q.c.reading);
    if (letters) lines.push('', ...q.options.map((o, k) => `${k === q.correct ? '✅' : k === pick ? '❌' : '▫️'} **${LETTERS[k]}**　${o}`));
    lines.push('', ok ? t(ui, 'right') : t(ui, 'wrong', { a: q.options[q.correct] }));
    if (q.ask === 'reading') lines.push(t(ui, 'meaning', { m: q.c.answer }));
    const extra = extraLine(ui, q.c.extra);
    if (extra) lines.push(`-# ${extra}`);
    const base = `${ui}:${owner}:${id}:${seedField}:${n}:${all}`;
    const last = i + 1 >= n;
    return {
        content: '',
        embeds: [{ color: ok ? GREEN : RED, title: title(ui, info, i, n), description: lines.join('\n'),
            footer: { text: progress(ui, d, all, n) } }],
        components: [
            row(q.options.map((o, k) => button(`x:${k}`, letters ? LETTERS[k] : o, k === q.correct ? 3 : k === pick ? 4 : 2, true))),
            row(last ? [button(`vr:${base}:0`, t(ui, 'q_results'), 1)]
                : [button(`vn:${base}`, t(ui, 'q_next'), 1), button(`vr:${base}:0`, t(ui, 'q_end'), 2)])
        ]
    };
}

/* the score, then every word asked — ✅ / ❌, its reading and meaning — WORDS_PER_PAGE a
   page; then a round of the missed ones, the same set again, or the site */
async function resultsCard(env, ui, owner, id, seedField, n, picks, page) {
    const info = setInfo(id, ui);
    const set = await loadSet(env, id);
    if (!set) return gone(ui, 'load_failed');
    const d = await deck(env, set, seedField, ui);
    if (!d) return gone(ui, 'expired_round');
    const asked = picks.length;
    const marks = results(d, picks);
    const words = marks.map((ok, i) => ({ c: question(d, i).c, ok }));
    const right = marks.filter(Boolean).length;
    const pct = asked ? Math.round(right / asked * 100) : 0;
    const say = t(ui, !asked ? 'r_none' : pct === 100 ? 'r_100' : pct >= 80 ? 'r_80' : pct >= 60 ? 'r_60' : 'r_low');
    const pages = Math.max(1, Math.ceil(words.length / WORDS_PER_PAGE));
    page = Math.min(Math.max(0, page), pages - 1);
    const lines = asked ? [`# ${right} / ${asked}`, `${t(ui, 'r_accuracy', { p: pct })}　${progressBar(marks, asked)}`, '', say] : [say];
    if (asked) {
        lines.push('', `**${t(ui, 'r_words', { r: right, w: asked - right })}**`);
        words.slice(page * WORDS_PER_PAGE, (page + 1) * WORDS_PER_PAGE).forEach((w, k) => {
            const reading = w.c.reading ? `（${w.c.reading}）` : '';
            lines.push(`${w.ok ? '✅' : '❌'} ${page * WORDS_PER_PAGE + k + 1}. **${w.c.word}**${reading} — ${shortMeaning(w.c.answer)}`);
        });
    }
    const base = `${ui}:${owner}:${id}:${seedField}:${n}:${picks}`;
    const missed = asked - right;
    const next = [
        ...(missed ? [button(`vm:${base}`, t(ui, 'r_retry_missed', { n: missed }), 1)] : []),
        button(`vg:${ui}:${owner}:${id}:${Math.max(QUIZ_MIN, n)}`, t(ui, 'r_again'), missed ? 2 : 1),   // a missed round can be shorter
        linkButton(SITE_URL, t(ui, 'practice_site'))];
    const nav = pages > 1 ? [
        button(`vr:${base}:${page - 1}`, t(ui, 'p_prev'), 2, page === 0),
        button(`vr:${base}:${page + 1}`, t(ui, 'p_next'), 2, page >= pages - 1)] : [];
    const footer = [pages > 1 ? t(ui, 'p_page', { p: page + 1, m: pages }) : '', t(ui, 'r_footer')].filter(Boolean).join(' · ');
    return {
        content: '',
        embeds: [{ color: COLOR, title: t(ui, 'r_title', { set: info ? info.name : id }),
            description: cut(lines.join('\n'), 4000), footer: { text: footer } }],
        components: [...(nav.length ? [row(nav)] : []), row(next)]
    };
}

/* a round of the words just missed: their cards go to KV under a short id */
async function missedRound(env, ui, owner, id, seedField, n, picks) {
    const set = await loadSet(env, id);
    if (!set) return gone(ui, 'load_failed');
    const d = await deck(env, set, seedField, ui);
    if (!d || !env.PREFS) return gone(ui, 'expired_round');
    const idx = [...picks].map((p, i) => (Number(p) === question(d, i).correct ? -1 : d.order[i % d.order.length])).filter(k => k >= 0);
    if (!idx.length) return resultsCard(env, ui, owner, id, seedField, n, picks, 0);
    const rid = newSeed().toString(36).padStart(7, '0').slice(0, 8);
    await env.PREFS.put('vm:' + rid, JSON.stringify({ set: id, idx }), { expirationTtl: MISSED_TTL });
    return askQuestion(env, ui, owner, id, 'M' + rid, idx.length, '');
}

export const QUIZ_KINDS = ['va', 'vn', 'vr', 'vm', 'vg', 'vs'];

// "M" can't start a base-36 seed (toString(36) is lower case)
const seedOk = s => /^(M?[0-9a-z]{1,8})$/.test(s || '');

/* a quiz button or the set drop-down, split on ":" (see the top of this file);
   value = the drop-down's choice, user = who pressed */
export async function quizButton(env, parts, value, user) {
    const [kind, ui, owner] = parts;
    if (!isUiLang(ui)) return null;
    if (kind === 'vs' || kind === 'vg') {
        const id = kind === 'vs' ? value : parts[3];
        const n = Number(kind === 'vs' ? parts[3] : parts[4]);
        if (!setInfo(id, ui) || !Number.isInteger(n) || n < QUIZ_MIN || n > QUIZ_MAX) return null;
        if (kind === 'vs') await rememberSet(env, user, id);
        return askQuestion(env, ui, owner, id, newSeed().toString(36), n, '');
    }
    const [, , , id, seedField, nText, picks] = parts;
    if (!setInfo(id, ui) || !seedOk(seedField)) return null;
    const n = Number(nText);
    if (!Number.isInteger(n) || n < 1 || n > QUIZ_MAX || !/^[0-9]{0,30}$/.test(picks || '') || picks.length > n) return null;
    if (kind === 'va') return picks.length < n ? answer(env, ui, owner, id, seedField, n, picks, Number(parts[7])) : null;
    if (kind === 'vn') return askQuestion(env, ui, owner, id, seedField, n, picks);
    if (kind === 'vr') return resultsCard(env, ui, owner, id, seedField, n, picks, Number(parts[7]) || 0);
    if (kind === 'vm') return missedRound(env, ui, owner, id, seedField, n, picks);
    return null;
}

/* autocomplete for the set option: the sets of the chosen language (all of them before
   one is chosen) matching what was typed */
export function setChoices(lang, typed, ui) {
    const q = String(typed || '').toLowerCase();
    const sets = STUDY_LANGS.includes(lang) ? setsFor(lang, ui) : STUDY_LANGS.flatMap(l => setsFor(l, ui).map(s => ({ ...s, short: s.full })));
    return sets
        .filter(s => !q || s.short.toLowerCase().includes(q) || s.full.toLowerCase().includes(q) || s.id.includes(q))
        .slice(0, 25)
        .map(s => ({ name: s.short, value: s.id }));
}
