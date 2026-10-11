/* ===================== 聽解 Listening (#page-listening) =====================
   JLPT-style listening sets built by tools/build_listening.py from the hand-written
   tools/listening/<id>.json (data/listening/index.json lists the levels). A level
   lists its item types in exam order (lv.types, the 問題 number is the position):
   task (課題理解: what will they do), point (ポイント理解: the question is on screen
   first, then time to read the options), outline (概要理解: nothing shown first —
   the question and four options are spoken at the end), utterance (発話表現: a
   scene, then three spoken options), response (即時応答: one line, three spoken
   replies) and integrated (統合理解: longer, several speakers, and the last one
   asks two questions about one recording). Every item has questions[] — usually
   one — each {q (a spoken question, or null when it is the last line), spoken
   (options read aloud) | printed options, answer, explain}. Every spoken line
   carries its own recording (data/audio/listening/<lang>/<a>.mp3, one voice per
   speaker), played in a chain.
   Practice sets: unlimited replays, 🐢 slow, a peek at the transcript, the answer
   right away; exam mode (listening_exam) allows LISTENING_EXAM_PLAYS plays and no
   slow / peek. A mock exam (set.mock, the official mix and count) runs like the
   real test: each item plays by itself once (lv.mock_plays), then an answer
   countdown moves on by itself, and the answers come at the end, where every item
   can be reviewed with its transcript.
   Results: score per type (counted in questions), time, plays; a glossary review
   graded into the mistake book and spaced repetition (lessonEntryFor, filed under
   LISTENING_WORD_SET), and "retry the wrong ones". Progress: localStorage
   listening_progress = { "<level>:<set>": { best, of, at } } (synced). */

const LISTENING_PASS = 2 / 3;
const LISTENING_EXAM_PLAYS = 2;
const LISTENING_GAP_MS = 450;        // between lines
const LISTENING_OPTIONS_GAP_MS = 900; // before the spoken options / a spoken question
const LISTENING_READ_SECS = 10;      // ポイント理解: time to read the options (lv.read_secs)
// mock exam: seconds to answer once the recording has ended, per question
const LISTENING_ANSWER_SECS = { task: 12, point: 12, outline: 12, integrated: 15, utterance: 8, response: 8 };
const LISTENING_TTS = { ja: 'ja-JP', ko: 'ko-KR', en: 'en-US', zh: 'zh-TW', fr: 'fr-FR', ru: 'ru-RU', de: 'de-DE', es: 'es-ES' };
const LISTENING_WORD_SET = { ja_n5: 'jlpt_n5', ja_n4: 'jlpt_n4', ja_n3: 'jlpt_n3', ja_n2: 'jlpt_n2', ja_n1: 'jlpt_n1' };
const LISTENING_DEFAULT_TYPES = ['task', 'point', 'utterance', 'response'];

let listeningIndex = null;
const listeningLevels = {};
let listeningLevelId = '';
let listeningView = 'list';          // 'list' | 'quiz' | 'result' | 'review'
// { setNo, order: [item indexes], qi, picks: [[per question]], plays, peek, start, secs,
//   retry, mock, reviewing }
let listeningSession = null;
let listeningReview = null;          // { items, i, picked, right }
let listeningRun = 0;                // bumps on every playback, so an older chain stops
let listeningPlaying = -1;           // index of the line playing (for the 🔊 marks), -1 = none
let listeningClock = null;           // { kind: 'read' | 'answer', left, timer }

function listeningPref(key, fallback) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch { return fallback; }
}
function listeningSetPref(key, value) {
    try { localStorage.setItem(key, value); } catch {}
}
function listeningMock() { return !!(listeningSession && listeningSession.mock); }
function listeningExam() { return listeningMock() || listeningPref('listening_exam', '0') === '1'; }
function listeningSlow() { return !listeningExam() && listeningPref('listening_slow', '0') === '1'; }
function listeningTypes(lv) { return lv.types || LISTENING_DEFAULT_TYPES; }
function listeningTypeNo(lv, type) { return listeningTypes(lv).indexOf(type) + 1; }

function listeningProgress() {
    try { return JSON.parse(localStorage.getItem('listening_progress')) || {}; } catch { return {}; }
}
function listeningDone(levelId, setId) {
    const p = listeningProgress()[levelId + ':' + setId];
    return !!p && p.of > 0 && p.best / p.of >= LISTENING_PASS;
}

async function listeningLoad() {
    if (!listeningIndex) {
        try { listeningIndex = await fetch('data/listening/index.json').then(r => r.json()); }
        catch { listeningIndex = null; return false; }
    }
    if (!listeningLevelId && listeningIndex.length) {
        const saved = listeningPref('listening_level', '');
        listeningLevelId = listeningIndex.some(l => l.id === saved) ? saved : listeningIndex[0].id;
    }
    if (listeningLevelId && !listeningLevels[listeningLevelId]) {
        try { listeningLevels[listeningLevelId] = await fetch('data/listening/' + listeningLevelId + '.json').then(r => r.json()); }
        catch { return false; }
    }
    return true;
}

/* switchPage() and refreshDynamicContent() call this. */
async function renderListening() {
    const box = document.getElementById('listening-card');
    if (!box) return;
    if (!listeningLevels[listeningLevelId]) box.innerHTML = `<p class="grammar-loading">${escHtml(t('grammar_loading'))}</p>`;
    if (!await listeningLoad()) {
        box.innerHTML = `<p class="grammar-loading">${escHtml(t('grammar_error'))}</p>`;
        return;
    }
    const lv = listeningLevels[listeningLevelId];
    if (listeningView === 'quiz' && listeningSession) { box.innerHTML = listeningQuizHtml(lv); listeningPlayerUi(); listeningAutoPlay(); }
    else if (listeningView === 'result' && listeningSession) box.innerHTML = listeningResultHtml(lv);
    else if (listeningView === 'review' && listeningReview) box.innerHTML = listeningReviewHtml(lv);
    else { listeningView = 'list'; box.innerHTML = listeningListHtml(lv); }
}

function listeningGo(view) {
    listeningStop();
    listeningView = view;
    renderListening();
    window.scrollTo({ top: 0 });
}

/* stops the chain, the countdown and whatever is sounding (switchPage calls it too) */
function listeningStop() {
    listeningRun++;
    listeningPlaying = -1;
    listeningClockStop();
    if (typeof stopSpeech === 'function') stopSpeech();
    listeningMarkPlaying();
}

function listeningPickLevel(id) {
    listeningLevelId = id;
    listeningSetPref('listening_level', id);
    listeningSession = null;
    listeningGo('list');
}

/* ----- text helpers ----- */

function listeningSegsHtml(segs, withGloss) {
    let html = '', open = null;
    for (const [text, ruby, g] of segs) {
        const gi = withGloss && g !== null && g !== undefined ? g : null;
        if (open !== null && gi !== open) { html += '</span>'; open = null; }
        if (gi !== null && open === null) { html += '<span class="rd-w">'; open = gi; }
        html += ruby ? `<ruby>${escHtml(text)}<rt>${escHtml(ruby)}</rt></ruby>` : escHtml(text);
    }
    if (open !== null) html += '</span>';
    return html;
}

function listeningWho(who) {
    return t({ N: 'listening_who_n', F: 'listening_who_f', M: 'listening_who_m', F2: 'listening_who_f', M2: 'listening_who_m' }[who] || 'listening_who_n');
}

function listeningClockText(secs) {
    return Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
}

/* ----- list ----- */

function listeningSetCard(lv, s, i, prog) {
    const count = {};
    s.items.forEach(it => { count[it.type] = (count[it.type] || 0) + it.questions.length; });
    const nq = s.items.reduce((n, it) => n + it.questions.length, 0);
    const best = prog[lv.id + ':' + s.id];
    const ok = listeningDone(lv.id, s.id);
    const mins = Math.max(1, Math.round(s.items.length * (s.mock ? 1.1 : 0.7)));
    const title = s.mock ? t('listening_mock_n', { n: lv.sets.filter(x => x.mock).indexOf(s) + 1 }) : t('listening_set', { n: lv.sets.filter(x => !x.mock).indexOf(s) + 1 });
    return `<li><button type="button" class="grammar-item${ok ? ' learned' : ''}${s.mock ? ' ls-mock-item' : ''}" onclick="listeningStart(${i})">
        <span class="grammar-num">${s.mock ? '📝' : lv.sets.filter(x => !x.mock).indexOf(s) + 1}</span>
        <span class="grammar-item-text">
            <span class="grammar-pattern">${escHtml(title)}</span>
            <span class="ls-types">${listeningTypes(lv).filter(ty => count[ty]).map(ty => `<span class="ls-type">${escHtml(t('listening_type_' + ty))} ${count[ty]}</span>`).join('')}</span>
            <span class="rd-meta">${escHtml(t('listening_meta', { n: nq, m: mins }))}</span>
        </span>
        <span class="grammar-state">${best ? (ok ? '✓ ' : '') + best.best + '/' + best.of : '›'}</span>
    </button></li>`;
}

function listeningListHtml(lv) {
    const langs = [...new Set(listeningIndex.map(l => l.lang))];
    const levels = listeningIndex.filter(l => l.lang === lv.lang);
    const prog = listeningProgress();
    const practice = lv.sets.filter(s => !s.mock);
    const mocks = lv.sets.filter(s => s.mock);
    const done = practice.filter(s => listeningDone(lv.id, s.id)).length;
    const pct = practice.length ? Math.round(done / practice.length * 100) : 0;
    const exam = listeningPref('listening_exam', '0') === '1';
    const mockQ = mocks.length ? mocks[0].items.reduce((n, it) => n + it.questions.length, 0) : 0;
    return `<h3>${escHtml(t('listening_title'))}</h3>
        <p class="grammar-intro">${escHtml(t('listening_intro'))}</p>
        <div class="grammar-chips" role="group">
            ${langs.map(l => `<button type="button" class="mode-btn grammar-chip${l === lv.lang ? ' mode-btn-active' : ''}" onclick="listeningPickLevel('${listeningIndex.find(x => x.lang === l).id}')">${escHtml(t('dict_lang_' + l))}</button>`).join('')}
            ${levels.map(l => `<button type="button" class="mode-btn grammar-chip${l.id === lv.id ? ' mode-btn-active' : ''}" onclick="listeningPickLevel('${l.id}')">${escHtml(l.level)}</button>`).join('')}
        </div>
        <p class="grammar-soon">${escHtml(t('listening_soon'))}</p>
        ${mocks.length ? `<div class="ls-mock">
            <div class="ls-mock-head">📝 <b>${escHtml(t('listening_mock'))}</b></div>
            <p class="ls-mock-hint">${escHtml(t('listening_mock_hint', { n: mockQ, p: lv.mock_plays || 1 }))}</p>
            <ol class="grammar-list">${mocks.map(s => listeningSetCard(lv, s, lv.sets.indexOf(s), prog)).join('')}</ol>
        </div>` : ''}
        <label class="ls-exam">
            <input type="checkbox" ${exam ? 'checked' : ''} onchange="listeningSetPref('listening_exam', this.checked ? '1' : '0'); renderListening()">
            <span><b>${escHtml(t('listening_exam'))}</b>　${escHtml(t('listening_exam_hint', { n: LISTENING_EXAM_PLAYS }))}</span>
        </label>
        <div class="grammar-progress">
            <span>${escHtml(t('listening_done_n', { n: done, m: practice.length }))}</span>
            <span class="grammar-bar" aria-hidden="true"><i style="width:${pct}%"></i></span>
        </div>
        <ol class="grammar-list">${practice.map(s => listeningSetCard(lv, s, lv.sets.indexOf(s), prog)).join('')}</ol>
        <p class="grammar-credit">${escHtml(t('listening_credit'))}</p>`;
}

/* ----- a session: one set, or just the items missed last time ----- */

function listeningStart(setNo, only) {
    const lv = listeningLevels[listeningLevelId];
    const set = lv.sets[setNo];
    const order = only && only.length ? only : [...Array(set.items.length).keys()];
    listeningSession = { setNo, order, qi: 0,
                         picks: order.map(k => set.items[k].questions.map(() => -1)),
                         plays: new Array(order.length).fill(0), peek: false, start: Date.now(), secs: 0,
                         retry: !!only, mock: !!set.mock && !only, reviewing: false };
    listeningGo('quiz');
}

function listeningItem(lv) {
    const z = listeningSession;
    return lv.sets[z.setNo].items[z.order[z.qi]];
}

/* answered = every question has a pick (-2 = time ran out in a mock exam) */
function listeningAnswered(i) {
    const z = listeningSession;
    return z.picks[i === undefined ? z.qi : i].every(p => p !== -1);
}
/* the answers show while practising, or when reviewing a finished mock exam */
function listeningShowAnswers() {
    const z = listeningSession;
    return listeningAnswered() && (!z.mock || z.reviewing);
}

/* every spoken line of an item, numbered for the 🔊 marks: the lines, then per
   question its spoken question and spoken options */
function listeningLinesOf(it) {
    const out = it.lines.map(line => ({ line }));
    it.questions.forEach((q, qn) => {
        if (q.q) out.push({ line: q.q, qn, isQ: true });
        if (q.spoken) q.options.forEach((o, i) => out.push({ line: o, qn, opt: i }));
    });
    return out.map((x, idx) => Object.assign(x, { idx }));
}

/* what one ▶ plays: the lines (with the reading pause after the first one for a
   point item), then the questions and spoken options */
function listeningPlaylist(it) {
    const all = listeningLinesOf(it);
    const list = [];
    all.forEach((x, k) => {
        const gap = k > 0 && (x.isQ || x.opt === 0) ? LISTENING_OPTIONS_GAP_MS : 0;
        list.push({ line: x.line, idx: x.idx, gap });
        if (k === 0 && it.read) list.push({ pause: it.read });
    });
    return list;
}

function listeningPlaysAllowed(lv) {
    const z = listeningSession;
    if (z.mock && !z.reviewing) return lv.mock_plays || 1;
    return listeningExam() && !z.reviewing ? LISTENING_EXAM_PLAYS : Infinity;
}

function listeningPlaysLeft() {
    const lv = listeningLevels[listeningLevelId];
    const z = listeningSession;
    if (listeningShowAnswers()) return Infinity;
    return Math.max(0, listeningPlaysAllowed(lv) - z.plays[z.qi]);
}

/* a mock exam plays each item by itself when it opens */
function listeningAutoPlay() {
    const z = listeningSession;
    if (!z || !z.mock || z.reviewing || z.plays[z.qi] > 0) return;
    const run = listeningRun;
    setTimeout(() => { if (run === listeningRun && listeningView === 'quiz') listeningPlay(); }, 900);
}

/* ▶ — plays the whole item; pressing again while it plays stops it (not in a mock exam) */
function listeningPlay() {
    const lv = listeningLevels[listeningLevelId];
    const z = listeningSession;
    if (listeningPlaying >= 0 || (listeningClock && listeningClock.kind === 'read')) {
        if (z.mock && !z.reviewing) return;
        listeningStop(); listeningPlayerUi(); return;
    }
    if (listeningPlaysLeft() <= 0) return;
    listeningClockStop();
    z.plays[z.qi]++;
    const list = listeningPlaylist(listeningItem(lv));
    const run = ++listeningRun;
    let i = 0;
    const next = () => {
        if (run !== listeningRun) return;
        if (i >= list.length) {
            listeningPlaying = -1; listeningMarkPlaying(); listeningPlayerUi();
            listeningPlayEnded();
            return;
        }
        const step = list[i++];
        if (step.pause) {
            listeningPlaying = -1; listeningMarkPlaying();
            listeningClockStart('read', step.pause, next);
            listeningPlayerUi(i / list.length);
            return;
        }
        setTimeout(() => {
            if (run !== listeningRun) return;
            listeningPlaying = step.idx;
            listeningMarkPlaying();
            listeningPlayerUi(i / list.length);
            listeningSay(lv, step.line, () => setTimeout(next, LISTENING_GAP_MS));
        }, step.gap || 0);
    };
    listeningPlaying = 0;
    listeningPlayerUi(0);
    next();
}

/* after the recording: a mock exam gives a fixed time to answer (also when a pick
   was made early — the pace is the exam's), then moves on */
function listeningPlayEnded() {
    const z = listeningSession;
    if (!z.mock || z.reviewing || listeningPlaysLeft() > 0) return;
    const lv = listeningLevels[listeningLevelId];
    const it = listeningItem(lv);
    listeningClockStart('answer', (LISTENING_ANSWER_SECS[it.type] || 12) * it.questions.length, () => {
        z.picks[z.qi] = z.picks[z.qi].map(p => p === -1 ? -2 : p);
        listeningNextOrFinish();
    });
}

/* the reading-time / answer-time countdown shown in the player */
function listeningClockStart(kind, secs, done) {
    listeningClockStop();
    const run = listeningRun;
    listeningClock = { kind, left: secs, done, timer: setInterval(() => {
        if (run !== listeningRun) { listeningClockStop(); return; }
        listeningClock.left--;
        if (listeningClock.left <= 0) { const d = listeningClock.done; listeningClockStop(); listeningPlayerUi(); d(); }
        else listeningPlayerUi();
    }, 1000) };
    listeningPlayerUi();
}
function listeningClockStop() {
    if (listeningClock) clearInterval(listeningClock.timer);
    listeningClock = null;
}
/* "skip" on the reading pause (practice only) */
function listeningSkipRead() {
    if (!listeningClock || listeningClock.kind !== 'read') return;
    const d = listeningClock.done;
    listeningClockStop();
    d();
}

/* one line: its recording, or the browser voice when it is missing */
function listeningSay(lv, line, done) {
    if (typeof stopSpeech === 'function') stopSpeech();
    const a = new Audio('data/audio/listening/' + lv.lang + '/' + line.a + '.mp3');
    a.playbackRate = listeningSlow() ? 0.8 : 1;
    let finished = false;
    const end = () => { if (!finished) { finished = true; if (done) done(); } };
    a.addEventListener('ended', end);
    audioPlaying = a;                        // so stopSpeech() (js/speech.js) stops it too
    a.play().catch(() => {
        speakText(line.plain, LISTENING_TTS[lv.lang] || lv.lang,
                  Object.assign({ slow: listeningSlow(), onend: end }, line.kana && line.kana !== line.plain ? { reading: line.kana } : {}));
    });
}

/* 🔊 beside a transcript line (only once the item is answered or peeked at) */
function listeningSayLine(idx) {
    const lv = listeningLevels[listeningLevelId];
    const x = listeningLinesOf(listeningItem(lv))[idx];
    if (!x) return;
    listeningStop();
    const run = listeningRun;
    listeningPlaying = idx;
    listeningMarkPlaying();
    listeningSay(lv, x.line, () => { if (run === listeningRun) { listeningPlaying = -1; listeningMarkPlaying(); } });
    listeningPlayerUi();
}

function listeningMarkPlaying() {
    document.querySelectorAll('#listening-card .ls-line').forEach(el =>
        el.classList.toggle('playing', +el.dataset.i === listeningPlaying));
}

/* the player's button, bar, counter and countdown without re-rendering the item */
function listeningPlayerUi(frac) {
    const b = document.getElementById('ls-play');
    if (!b) return;
    const z = listeningSession;
    const lockedMock = z.mock && !z.reviewing;
    const playing = listeningPlaying >= 0 || (listeningClock && listeningClock.kind === 'read');
    b.classList.toggle('playing', playing);
    b.innerHTML = playing ? (lockedMock ? '♪' : '■') : '▶';
    b.setAttribute('aria-label', t(playing ? 'listening_stop' : 'listening_play'));
    const left = listeningPlaysLeft();
    b.disabled = (playing && lockedMock) || (!playing && left <= 0);
    const bar = document.getElementById('ls-bar');
    if (bar) {
        if (typeof frac === 'number') bar.style.width = Math.round(frac * 100) + '%';
        else if (!playing) bar.style.width = '0%';
    }
    const c = document.getElementById('ls-plays');
    if (c) c.textContent = left === Infinity ? t('listening_plays', { n: z.plays[z.qi] })
                                            : t('listening_plays_left', { n: left });
    const clock = document.getElementById('ls-clock');
    if (clock) {
        const k = listeningClock && listeningClock.kind;
        clock.hidden = !k;
        clock.className = 'ls-clock' + (k === 'answer' && listeningClock.left <= 5 ? ' urgent' : '');
        clock.innerHTML = !k ? '' : escHtml(t(k === 'read' ? 'listening_read_time' : 'listening_answer_time', { n: listeningClock.left }))
            + (k === 'read' && !lockedMock ? ` <button type="button" class="ls-skip" onclick="listeningSkipRead()">${escHtml(t('listening_skip'))}</button>` : '');
    }
}

function listeningOptionsHtml(lv, it, q, qn, show) {
    const z = listeningSession;
    const picked = z.picks[z.qi][qn];
    const done = picked !== -1;
    return q.options.map((o, i) => {
        let cls = '';
        if (show && i === q.answer) cls = ' correct-choice';
        else if (show && i === picked) cls = ' wrong-choice';
        else if (!show && i === picked) cls = ' ls-picked';
        const label = q.spoken
            ? `<span class="ls-n">${i + 1}</span>${show ? `<span lang="${lv.lang}">${listeningSegsHtml(o.t, false)}</span>` : ''}`
            : `<span class="ls-n">${i + 1}</span>${o.emoji ? `<span class="ls-emoji" aria-hidden="true">${o.emoji}</span>` : ''}<span lang="${lv.lang}">${listeningSegsHtml(o.t, false)}</span>`;
        return `<button type="button" class="btn option-btn${cls}" onclick="listeningAnswer(${qn}, ${i})"${done && (show || z.mock === false) ? ' disabled' : ''}>${label}</button>`;
    }).join('');
}

function listeningQuizHtml(lv) {
    const z = listeningSession;
    const it = listeningItem(lv);
    const show = listeningShowAnswers();
    const exam = listeningExam();
    const lockedMock = z.mock && !z.reviewing;
    const showTx = show || (z.peek && !exam);
    const multi = it.questions.length > 1;
    // ポイント理解: the question is on screen before listening
    const pointQ = it.type === 'point' ? (it.questions[0].q || it.lines[it.lines.length - 1]) : null;
    const dots = z.order.map((k, i) => {
        const item = lv.sets[z.setNo].items[k];
        const p = z.picks[i];
        const state = i === z.qi ? 'now' : p.some(x => x === -1) ? '' : !z.mock || z.reviewing
            ? (item.questions.every((q, qn) => p[qn] === q.answer) ? 'ok' : 'no') : 'done';
        return `<span class="ls-dot ${state}"></span>`;
    }).join('');
    const questionsHtml = it.questions.map((q, qn) => {
        const picked = z.picks[z.qi][qn];
        const qText = q.q && (show || !q.spoken && !multi) ? `<div class="ls-qtext" lang="${lv.lang}">${listeningSegsHtml(q.q.t, false)}<div class="ls-zh">${escHtml(gText(q.q))}</div></div>` : '';
        return `<div class="ls-q" data-qn="${qn}">
            ${multi ? `<div class="ls-qlabel">${escHtml(t('listening_q_n', { n: qn + 1 }))}</div>` : ''}
            ${multi ? qText : ''}
            <div class="ls-opts${q.spoken && q.options.length === 3 ? ' three' : ''}">${listeningOptionsHtml(lv, it, q, qn, show)}</div>
            ${show ? `<p class="grammar-feedback ${picked === q.answer ? 'ok' : 'no'}">${escHtml(picked === -2 ? t('listening_timeout', { n: q.answer + 1 }) : picked === q.answer ? t('correct') : t('listening_wrong', { n: q.answer + 1 }))}</p>
                <div class="ls-why">${escHtml(gText(q.explain))}</div>` : ''}
        </div>`;
    }).join('');
    const all = listeningLinesOf(it);
    const tx = showTx ? `<details class="ls-tx" open>
            <summary>📄 ${escHtml(t('listening_transcript'))}</summary>
            ${all.map(x => `<div class="ls-line${x.isQ ? ' ls-line-q' : ''}" data-i="${x.idx}">
                    <span class="ls-who">${x.opt !== undefined ? escHtml((multi ? 'Q' + (x.qn + 1) + '-' : '') + (x.opt + 1)) : x.isQ ? escHtml(multi ? 'Q' + (x.qn + 1) : listeningWho(x.line.who)) : escHtml(listeningWho(x.line.who))}</span>
                    <div><div class="ls-ja" lang="${lv.lang}">${listeningSegsHtml(x.line.t, true)}</div>
                        <div class="ls-zh">${escHtml(gText(x.line))}</div></div>
                    <button type="button" class="ls-say" onclick="listeningSayLine(${x.idx})" aria-label="🔊">🔊</button>
                </div>`).join('')}
            ${it.words && it.words.length ? `<div class="ls-words">📘 ${it.words.map(w => `<span><b lang="${lv.lang}">${escHtml(w.w)}</b>${w.r && w.r !== w.w ? `（${escHtml(w.r)}）` : ''} ${escHtml(gText(w))}</span>`).join('')}</div>` : ''}
        </details>` : '';
    const last = z.qi >= z.order.length - 1;
    const canNext = listeningAnswered();
    const nextLabel = z.reviewing ? (last ? 'listening_back_result' : 'grammar_next_q') : (last ? 'grammar_see_result' : 'grammar_next_q');
    const nextCall = z.reviewing ? (last ? "listeningGo('result')" : 'listeningMove(1)') : (last ? 'listeningFinish()' : 'listeningMove(1)');
    return `<div class="grammar-top">
            <button type="button" class="btn back-btn grammar-back" onclick="${z.reviewing ? "listeningGo('result')" : "listeningGo('list')"}">${escHtml(t(z.reviewing ? 'listening_back_result' : 'listening_back_list'))}</button>
            <span class="ls-dots" aria-hidden="true">${dots}</span>
            <span class="grammar-count">${escHtml(t('grammar_q_n', { n: z.qi + 1, m: z.order.length }))}</span>
        </div>
        ${z.mock ? `<div class="ls-mock-tag">📝 ${escHtml(t(z.reviewing ? 'listening_mock_review' : 'listening_mock'))}</div>` : ''}
        <div class="ls-kind">${escHtml(t('listening_mondai', { n: listeningTypeNo(lv, it.type) }))}　${escHtml(t('listening_type_' + it.type))}</div>
        <div class="ls-how">${escHtml(t('listening_how_' + it.type + (it.type === 'integrated' && multi ? '_multi' : '')))}</div>
        ${it.scene ? `<div class="ls-scene"><span class="ls-scene-emoji" aria-hidden="true">${it.scene.emoji || ''}</span>${escHtml(gText(it.scene))}</div>` : ''}
        ${pointQ ? `<div class="ls-scene ls-question" lang="${lv.lang}">${listeningSegsHtml(pointQ.t, false)}<div class="ls-zh">${escHtml(gText(pointQ))}</div></div>` : ''}
        <div class="ls-player">
            <button type="button" class="ls-play" id="ls-play" onclick="listeningPlay()">▶</button>
            <div class="ls-bar" aria-hidden="true"><i id="ls-bar"></i></div>
            <div class="ls-clock" id="ls-clock" hidden></div>
            <div class="ls-row">
                <span id="ls-plays"></span>
                ${exam && !z.reviewing ? `<span class="ls-exam-tag">${escHtml(t(z.mock ? 'listening_mock' : 'listening_exam'))}</span>` : `
                <button type="button" class="mode-btn ls-small${listeningSlow() ? ' mode-btn-active' : ''}" aria-pressed="${listeningSlow()}" onclick="listeningSetPref('listening_slow', listeningSlow() ? '0' : '1'); listeningRerender()">🐢 ${escHtml(t('listening_slow'))}</button>
                ${show ? '' : `<button type="button" class="mode-btn ls-small${z.peek ? ' mode-btn-active' : ''}" onclick="listeningSession.peek = !listeningSession.peek; listeningRerender()">👀 ${escHtml(t('listening_peek'))}</button>`}`}
            </div>
        </div>
        ${questionsHtml}
        ${tx}
        <div class="grammar-nav">
            <button type="button" class="btn back-btn" onclick="listeningMove(-1)"${z.qi === 0 || lockedMock ? ' disabled' : ''}>${escHtml(t('listening_prev_q'))}</button>
            <button type="button" class="btn next-btn" onclick="${nextCall}"${canNext ? '' : ' disabled'}>${escHtml(t(nextLabel))}</button>
        </div>`;
}

function listeningRerender() {
    const y = window.scrollY;
    listeningStop();
    renderListening().then(() => window.scrollTo({ top: y }));
}

function listeningMove(d) {
    const z = listeningSession;
    z.qi = Math.max(0, Math.min(z.order.length - 1, z.qi + d));
    z.peek = false;
    listeningGo('quiz');
}

function listeningNextOrFinish() {
    const z = listeningSession;
    if (z.qi >= z.order.length - 1) listeningFinish();
    else listeningMove(1);
}

function listeningAnswer(qn, i) {
    const lv = listeningLevels[listeningLevelId];
    const z = listeningSession;
    if (z.reviewing) return;
    const it = listeningItem(lv);
    if (z.mock) {
        // a mock exam: the pick can change until the item is left; no answer shown
        z.picks[z.qi][qn] = i;
        document.querySelectorAll(`#listening-card .ls-q[data-qn="${qn}"] .option-btn`).forEach((b, k) => b.classList.toggle('ls-picked', k === i));
        const next = document.querySelector('#listening-card .grammar-nav .next-btn');
        if (next) next.disabled = !listeningAnswered();
        return;
    }
    if (z.picks[z.qi][qn] !== -1) return;
    z.picks[z.qi][qn] = i;
    if (typeof logDailyActivity === 'function') logDailyActivity();
    if (i !== it.questions[qn].answer && typeof railReact === 'function') railReact('wrong');
    // with several questions, wait until all are answered before showing them
    if (listeningAnswered()) listeningRerender();
    else document.querySelectorAll(`#listening-card .ls-q[data-qn="${qn}"] .option-btn`).forEach((b, k) => {
        b.classList.toggle('ls-picked', k === i);
        b.disabled = true;
    });
}

function listeningTally(lv) {
    const z = listeningSession;
    const set = lv.sets[z.setNo];
    let right = 0, total = 0;
    const byType = {};
    z.order.forEach((k, i) => {
        const it = set.items[k];
        const b = byType[it.type] || (byType[it.type] = { ok: 0, of: 0 });
        it.questions.forEach((q, qn) => {
            total++; b.of++;
            if (z.picks[i][qn] === q.answer) { right++; b.ok++; }
        });
    });
    return { right, total, byType };
}

function listeningFinish() {
    const lv = listeningLevels[listeningLevelId];
    const z = listeningSession;
    z.secs = Math.round((Date.now() - z.start) / 1000);
    const { right, total } = listeningTally(lv);
    if (z.mock) {
        // the answers count toward the day's practice once the exam is over
        if (typeof logDailyActivity === 'function') z.picks.forEach(p => p.forEach(x => { if (x >= 0) logDailyActivity(); }));
    }
    // a full set only (a retry of the missed items doesn't count as the set's score)
    if (!z.retry) {
        const key = lv.id + ':' + lv.sets[z.setNo].id;
        const prog = listeningProgress();
        const old = prog[key];
        if (!old || right / total >= old.best / (old.of || 1)) {
            prog[key] = { best: right, of: total, at: Date.now() };
        }
        if (typeof storeSet === 'function') storeSet('listening_progress', JSON.stringify(prog));
        else listeningSetPref('listening_progress', JSON.stringify(prog));
    }
    if (typeof railReact === 'function') railReact('result', Math.round(right / total * 100));
    listeningGo('result');
}

/* a finished mock exam: walk through the items with their answers */
function listeningReviewMock(i) {
    const z = listeningSession;
    z.reviewing = true;
    z.qi = i || 0;
    listeningGo('quiz');
}

function listeningResultHtml(lv) {
    const z = listeningSession;
    const set = lv.sets[z.setNo];
    const { right, total, byType } = listeningTally(lv);
    const pass = right / total >= LISTENING_PASS;
    const wrong = z.order.filter((k, i) => set.items[k].questions.some((q, qn) => z.picks[i][qn] !== q.answer));
    const words = listeningSetWords(set);
    const plays = z.plays.reduce((a, b) => a + b, 0) / z.order.length;
    setTimeout(() => {
        const m = document.querySelector('#listening-card .grammar-result-mascot');
        if (pass && m && typeof mascotHop === 'function') mascotHop(m);
    }, 300);
    const nextSet = lv.sets.findIndex((s, i) => i > z.setNo && !!s.mock === !!set.mock);
    const sheet = z.mock ? `<div class="ls-sheet">${z.order.map((k, i) => {
            const it = set.items[k];
            const ok = it.questions.every((q, qn) => z.picks[i][qn] === q.answer);
            return `<button type="button" class="ls-sheet-cell ${ok ? 'ok' : 'no'}" onclick="listeningReviewMock(${i})" title="${escHtml(t('listening_type_' + it.type))}">${i + 1}<i>${ok ? '○' : '×'}</i></button>`;
        }).join('')}</div>` : '';
    return `<div class="rd-result">
            <div class="grammar-result-mascot">${typeof mascotHtml === 'function' ? mascotHtml('bust') : ''}</div>
            <p class="grammar-score">${escHtml(t('grammar_result', { n: right, m: total }))}</p>
            <p class="grammar-verdict ${pass ? 'ok' : 'no'}">${escHtml(t(z.retry ? 'listening_retry_done' : z.mock ? (pass ? 'listening_mock_pass' : 'listening_mock_fail') : pass ? 'listening_pass' : 'listening_fail'))}</p>
            <div class="ls-types-result">${listeningTypes(lv).filter(ty => byType[ty]).map(ty =>
                `<div class="ls-type-box"><span>${escHtml(t('listening_mondai', { n: listeningTypeNo(lv, ty) }))} ${escHtml(t('listening_type_' + ty))}</span><b>${byType[ty].ok} / ${byType[ty].of}</b></div>`).join('')}</div>
            <p class="rd-speed">⏱ ${escHtml(t('listening_time', { t: listeningClockText(z.secs) }))}${z.mock ? '' : `　·　${escHtml(t('listening_avg_plays', { n: plays.toFixed(1) }))}`}</p>
            ${z.mock ? `<p class="rd-help">${escHtml(t('listening_mock_sheet'))}</p>${sheet}` : ''}
            <div class="grammar-result-btns">
                ${z.mock ? `<button type="button" class="btn next-btn" onclick="listeningReviewMock(0)">${escHtml(t('listening_mock_review_btn'))}</button>` : ''}
                ${words.length ? `<button type="button" class="btn ${z.mock ? 'back-btn' : 'next-btn'}" onclick="listeningStartReview()">📘 ${escHtml(t('reading_review_btn', { n: words.length }))}</button>` : ''}
                ${wrong.length ? `<button type="button" class="btn back-btn" onclick="listeningStart(${z.setNo}, [${wrong.join(',')}])">${escHtml(t('listening_retry_wrong', { n: wrong.length }))}</button>` : ''}
                ${nextSet >= 0 ? `<button type="button" class="btn ${pass ? 'next-btn' : 'back-btn'}" onclick="listeningStart(${nextSet})">${escHtml(t(set.mock ? 'listening_next_mock' : 'listening_next_set'))}</button>` : ''}
                <button type="button" class="btn back-btn" onclick="listeningGo('list')">${escHtml(t('listening_back_list'))}</button>
            </div>
        </div>`;
}

/* ----- glossary review: each word of the set once, like the 閱讀 page ----- */

function listeningSetWords(set) {
    const seen = new Set();
    const out = [];
    set.items.forEach(it => (it.words || []).forEach(w => {
        if (!seen.has(w.w)) { seen.add(w.w); out.push(w); }
    }));
    return out;
}

function listeningEntry(lv, w) {
    if (typeof lessonEntryFor !== 'function') return null;
    const setId = LISTENING_WORD_SET[lv.id] || lv.id;
    return lessonEntryFor(setId, { word: w.w, kana: w.r && w.r !== w.w ? w.r : '', meaning: w.zh, english: w.en });
}

function listeningStartReview() {
    const lv = listeningLevels[listeningLevelId];
    const set = lv.sets[listeningSession.setNo];
    const pool = {};
    lv.sets.forEach(s => listeningSetWords(s).forEach(w => {
        const e = listeningEntry(lv, w);
        if (e) (pool[e.group] = pool[e.group] || new Set()).add(e.answer);
    }));
    const items = grammarShuffle(listeningSetWords(set)).map(w => {
        const entry = listeningEntry(lv, w);
        if (!entry) return null;
        const others = grammarShuffle([...(pool[entry.group] || [])].filter(a => a !== entry.answer)).slice(0, 3);
        const options = grammarShuffle([entry.answer, ...others]);
        return { entry, w, options, answer: options.indexOf(entry.answer) };
    }).filter(Boolean);
    listeningReview = { items, i: 0, picked: -1, right: 0 };
    listeningGo('review');
}

function listeningReviewHtml(lv) {
    const z = listeningReview;
    if (z.i >= z.items.length) {
        return `<div class="rd-result">
                <div class="grammar-result-mascot">${typeof mascotHtml === 'function' ? mascotHtml('bust') : ''}</div>
                <p class="grammar-score">${escHtml(t('grammar_result', { n: z.right, m: z.items.length }))}</p>
                <p class="rd-help">${escHtml(t('reading_review_done'))}</p>
                <div class="grammar-result-btns">
                    <button type="button" class="btn back-btn" onclick="listeningGo('list')">${escHtml(t('listening_back_list'))}</button>
                </div>
            </div>`;
    }
    const it = z.items[z.i];
    const answered = z.picked >= 0;
    const askReading = it.entry.group === 'reading';
    return `<div class="grammar-top">
            <button type="button" class="btn back-btn grammar-back" onclick="listeningGo('result')">${escHtml(t('listening_back_result'))}</button>
            <span class="grammar-count">${escHtml(t('grammar_q_n', { n: z.i + 1, m: z.items.length }))}</span>
        </div>
        <div class="grammar-q">
            <div class="grammar-q-pattern">📘 ${escHtml(t('reading_review_title'))}</div>
            <div class="rd-review-word" lang="${lv.lang}">${escHtml(it.w.w)}</div>
            <div class="grammar-q-hint">${escHtml(t(askReading ? 'reading_q_reading' : 'reading_q_meaning'))}</div>
        </div>
        <div class="grammar-options">
            ${it.options.map((o, i) => {
                let cls = '';
                if (answered && i === it.answer) cls = ' correct-choice';
                else if (answered && i === z.picked) cls = ' wrong-choice';
                return `<button type="button" class="btn option-btn${cls}"${askReading ? ` lang="${lv.lang}"` : ''} onclick="listeningReviewAnswer(${i})"${answered ? ' disabled' : ''}>${escHtml(o)}</button>`;
            }).join('')}
        </div>
        ${answered ? `<p class="grammar-feedback ${z.picked === it.answer ? 'ok' : 'no'}">${escHtml(t(z.picked === it.answer ? 'correct' : 'grammar_wrong', { a: it.options[it.answer] }))}</p>
        <button type="button" class="btn next-btn grammar-start" onclick="listeningReview.i++; listeningReview.picked = -1; renderListening()">${escHtml(t(z.i + 1 < z.items.length ? 'grammar_next_q' : 'grammar_see_result'))}</button>` : ''}`;
}

function listeningReviewAnswer(i) {
    const lv = listeningLevels[listeningLevelId];
    const z = listeningReview;
    if (!z || z.picked >= 0) return;
    z.picked = i;
    const it = z.items[z.i];
    const good = i === it.answer;
    if (good) z.right++;
    if (typeof gradeSrsQuizCard === 'function') gradeSrsQuizCard(it.entry, good);
    if (good) { if (typeof noteMistakeCorrect === 'function') noteMistakeCorrect(it.entry.id); }
    else if (typeof addMistakeEntry === 'function') addMistakeEntry(it.entry);
    if (typeof logDailyActivity === 'function') logDailyActivity();
    if (good) speakText(it.w.w, LISTENING_TTS[lv.lang] || lv.lang, it.w.r && it.w.r !== it.w.w ? { reading: it.w.r } : undefined);
    renderListening();
}
