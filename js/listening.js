/* ===================== 聽解 Listening (#page-listening) =====================
   JLPT-style listening sets built by tools/build_listening.py from the hand-written
   tools/listening/<id>.json (data/listening/index.json lists the levels). A set
   ("回") mixes the four item types like the exam: task (課題理解: what will they
   do), point (ポイント理解: the question is on screen first), utterance (発話表現:
   a scene, then three spoken options) and response (即時応答: one line, three
   spoken replies). Every spoken line carries its own recording (data/audio/
   listening/<lang>/<a>.mp3, one voice per speaker), played in a chain.
   Exam mode (listening_exam): two plays per item, no slow speed, no peeking; else
   unlimited replays, 🐢 slow and a peek at the transcript. After answering: the
   explanation, the transcript with furigana and translation, 🔊 per line.
   Results: score per type, time, plays; a glossary review graded into the mistake
   book and spaced repetition (lessonEntryFor, filed under LISTENING_WORD_SET),
   and "retry the wrong ones". Progress: localStorage listening_progress =
   { "<level>:<set>": { best, of, at } } (synced; READING-like). */

const LISTENING_PASS = 2 / 3;
const LISTENING_EXAM_PLAYS = 2;
const LISTENING_GAP_MS = 450;        // between lines
const LISTENING_OPTIONS_GAP_MS = 900; // before the spoken options
const LISTENING_TTS = { ja: 'ja-JP', ko: 'ko-KR', en: 'en-US', zh: 'zh-TW', fr: 'fr-FR', ru: 'ru-RU', de: 'de-DE', es: 'es-ES' };
const LISTENING_WORD_SET = { ja_n5: 'jlpt_n5', ja_n4: 'jlpt_n4' };
const LISTENING_TYPES = ['task', 'point', 'utterance', 'response'];
const LISTENING_TYPE_NO = { task: 1, point: 2, utterance: 3, response: 4 };

let listeningIndex = null;
const listeningLevels = {};
let listeningLevelId = '';
let listeningView = 'list';          // 'list' | 'quiz' | 'result' | 'review'
let listeningSession = null;         // { setNo, order: [item indexes], qi, picks, plays, peek, start, secs }
let listeningReview = null;          // { items, i, picked, right }
let listeningRun = 0;                // bumps on every playback, so an older chain stops
let listeningPlaying = -1;           // index of the line playing (for the 🔊 marks), -1 = none

function listeningPref(key, fallback) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch { return fallback; }
}
function listeningSetPref(key, value) {
    try { localStorage.setItem(key, value); } catch {}
}
function listeningExam() { return listeningPref('listening_exam', '0') === '1'; }
function listeningSlow() { return !listeningExam() && listeningPref('listening_slow', '0') === '1'; }

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
    if (listeningView === 'quiz' && listeningSession) { box.innerHTML = listeningQuizHtml(lv); listeningPlayerUi(); }
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

/* stops the chain and whatever is sounding (switchPage calls it too) */
function listeningStop() {
    listeningRun++;
    listeningPlaying = -1;
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
    return t({ N: 'listening_who_n', F: 'listening_who_f', M: 'listening_who_m' }[who] || 'listening_who_n');
}

/* ----- list ----- */

function listeningListHtml(lv) {
    const langs = [...new Set(listeningIndex.map(l => l.lang))];
    const levels = listeningIndex.filter(l => l.lang === lv.lang);
    const prog = listeningProgress();
    const done = lv.sets.filter(s => listeningDone(lv.id, s.id)).length;
    const pct = Math.round(done / lv.sets.length * 100);
    const exam = listeningExam();
    return `<h3>${escHtml(t('listening_title'))}</h3>
        <p class="grammar-intro">${escHtml(t('listening_intro'))}</p>
        <div class="grammar-chips" role="group">
            ${langs.map(l => `<button type="button" class="mode-btn grammar-chip${l === lv.lang ? ' mode-btn-active' : ''}" onclick="listeningPickLevel('${listeningIndex.find(x => x.lang === l).id}')">${escHtml(t('dict_lang_' + l))}</button>`).join('')}
            ${levels.map(l => `<button type="button" class="mode-btn grammar-chip${l.id === lv.id ? ' mode-btn-active' : ''}" onclick="listeningPickLevel('${l.id}')">${escHtml(l.level)}</button>`).join('')}
        </div>
        <p class="grammar-soon">${escHtml(t('listening_soon'))}</p>
        <label class="ls-exam">
            <input type="checkbox" ${exam ? 'checked' : ''} onchange="listeningSetPref('listening_exam', this.checked ? '1' : '0'); renderListening()">
            <span><b>${escHtml(t('listening_exam'))}</b>　${escHtml(t('listening_exam_hint', { n: LISTENING_EXAM_PLAYS }))}</span>
        </label>
        <div class="grammar-progress">
            <span>${escHtml(t('listening_done_n', { n: done, m: lv.sets.length }))}</span>
            <span class="grammar-bar" aria-hidden="true"><i style="width:${pct}%"></i></span>
        </div>
        <ol class="grammar-list">
            ${lv.sets.map((s, i) => {
                const count = {};
                s.items.forEach(it => { count[it.type] = (count[it.type] || 0) + 1; });
                const best = prog[lv.id + ':' + s.id];
                const ok = listeningDone(lv.id, s.id);
                const mins = Math.max(1, Math.round(s.items.length * 0.7));
                return `<li><button type="button" class="grammar-item${ok ? ' learned' : ''}" onclick="listeningStart(${i})">
                    <span class="grammar-num">${i + 1}</span>
                    <span class="grammar-item-text">
                        <span class="grammar-pattern">${escHtml(t('listening_set', { n: i + 1 }))}</span>
                        <span class="ls-types">${LISTENING_TYPES.filter(ty => count[ty]).map(ty => `<span class="ls-type">${escHtml(t('listening_type_' + ty))} ${count[ty]}</span>`).join('')}</span>
                        <span class="rd-meta">${escHtml(t('listening_meta', { n: s.items.length, m: mins }))}</span>
                    </span>
                    <span class="grammar-state">${best ? (ok ? '✓ ' : '') + best.best + '/' + best.of : '›'}</span>
                </button></li>`;
            }).join('')}
        </ol>
        <p class="grammar-credit">${escHtml(t('listening_credit'))}</p>`;
}

/* ----- a session: one set, or just the items missed last time ----- */

function listeningStart(setNo, only) {
    const lv = listeningLevels[listeningLevelId];
    const n = lv.sets[setNo].items.length;
    const order = only && only.length ? only : [...Array(n).keys()];
    listeningSession = { setNo, order, qi: 0, picks: new Array(order.length).fill(-1),
                         plays: new Array(order.length).fill(0), peek: false, start: Date.now(), secs: 0, retry: !!only };
    listeningGo('quiz');
}

function listeningItem(lv) {
    const z = listeningSession;
    return lv.sets[z.setNo].items[z.order[z.qi]];
}

/* everything played for an item, in order: the lines, then (utterance / response)
   the three spoken options */
function listeningPlaylist(it) {
    const list = it.lines.map((l, i) => ({ line: l, idx: i }));
    if (it.type === 'utterance' || it.type === 'response') {
        it.options.forEach((o, i) => list.push({ line: o, idx: it.lines.length + i, gap: i === 0 ? LISTENING_OPTIONS_GAP_MS : 0 }));
    }
    return list;
}

function listeningPlaysLeft() {
    const z = listeningSession;
    return listeningExam() && z.picks[z.qi] < 0 ? Math.max(0, LISTENING_EXAM_PLAYS - z.plays[z.qi]) : Infinity;
}

/* ▶ — plays the whole item; pressing again while it plays stops it */
function listeningPlay() {
    const lv = listeningLevels[listeningLevelId];
    const z = listeningSession;
    if (listeningPlaying >= 0) { listeningStop(); listeningPlayerUi(); return; }
    if (listeningPlaysLeft() <= 0) return;
    z.plays[z.qi]++;
    const list = listeningPlaylist(listeningItem(lv));
    const run = ++listeningRun;
    let i = 0;
    const next = () => {
        if (run !== listeningRun) return;
        if (i >= list.length) { listeningPlaying = -1; listeningMarkPlaying(); listeningPlayerUi(); return; }
        const step = list[i++];
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
    const it = listeningItem(lv);
    const line = idx < it.lines.length ? it.lines[idx] : it.options[idx - it.lines.length];
    listeningStop();
    const run = listeningRun;
    listeningPlaying = idx;
    listeningMarkPlaying();
    listeningSay(lv, line, () => { if (run === listeningRun) { listeningPlaying = -1; listeningMarkPlaying(); } });
}

function listeningMarkPlaying() {
    document.querySelectorAll('#listening-card .ls-line').forEach(el =>
        el.classList.toggle('playing', +el.dataset.i === listeningPlaying));
}

/* the player's button, bar and counter without re-rendering the item */
function listeningPlayerUi(frac) {
    const b = document.getElementById('ls-play');
    if (!b) return;
    const playing = listeningPlaying >= 0;
    b.classList.toggle('playing', playing);
    b.innerHTML = playing ? '■' : '▶';
    b.setAttribute('aria-label', t(playing ? 'listening_stop' : 'listening_play'));
    const left = listeningPlaysLeft();
    b.disabled = !playing && left <= 0;
    if (typeof frac === 'number') {
        const bar = document.getElementById('ls-bar');
        if (bar) bar.style.width = Math.round(frac * 100) + '%';
    }
    if (!playing) { const bar = document.getElementById('ls-bar'); if (bar && frac === undefined) bar.style.width = '0%'; }
    const c = document.getElementById('ls-plays');
    const z = listeningSession;
    if (c) c.textContent = left === Infinity ? t('listening_plays', { n: z.plays[z.qi] })
                                            : t('listening_plays_left', { n: left });
}

function listeningQuizHtml(lv) {
    const z = listeningSession;
    const it = listeningItem(lv);
    const picked = z.picks[z.qi];
    const answered = picked >= 0;
    const exam = listeningExam();
    const spokenOpts = it.type === 'utterance' || it.type === 'response';
    const showTx = answered || (z.peek && !exam);
    const question = it.type === 'point' ? it.lines[it.lines.length - 1] : null;
    const dots = z.order.map((_, i) => {
        const p = z.picks[i];
        const item = lv.sets[z.setNo].items[z.order[i]];
        return `<span class="ls-dot ${i === z.qi ? 'now' : p < 0 ? '' : p === item.answer ? 'ok' : 'no'}"></span>`;
    }).join('');
    const opts = it.options.map((o, i) => {
        let cls = '';
        if (answered && i === it.answer) cls = ' correct-choice';
        else if (answered && i === picked) cls = ' wrong-choice';
        const label = spokenOpts
            ? `<span class="ls-n">${i + 1}</span>${answered ? `<span lang="${lv.lang}">${listeningSegsHtml(o.t, false)}</span>` : ''}`
            : `<span class="ls-n">${i + 1}</span>${o.emoji ? `<span class="ls-emoji" aria-hidden="true">${o.emoji}</span>` : ''}<span lang="${lv.lang}">${listeningSegsHtml(o.t, false)}</span>`;
        return `<button type="button" class="btn option-btn${cls}" onclick="listeningAnswer(${i})"${answered ? ' disabled' : ''}>${label}</button>`;
    }).join('');
    const playlist = listeningPlaylist(it);
    const tx = showTx ? `<details class="ls-tx" open>
            <summary>📄 ${escHtml(t('listening_transcript'))}</summary>
            ${playlist.map(({ line, idx }) => {
                const isOpt = idx >= it.lines.length;
                return `<div class="ls-line" data-i="${idx}">
                    <span class="ls-who">${isOpt ? escHtml(String(idx - it.lines.length + 1)) : escHtml(listeningWho(line.who))}</span>
                    <div><div class="ls-ja" lang="${lv.lang}">${listeningSegsHtml(line.t, true)}</div>
                        <div class="ls-zh">${escHtml(gText(line))}</div></div>
                    <button type="button" class="ls-say" onclick="listeningSayLine(${idx})" aria-label="🔊">🔊</button>
                </div>`;
            }).join('')}
            ${it.words && it.words.length ? `<div class="ls-words">📘 ${it.words.map(w => `<span><b lang="${lv.lang}">${escHtml(w.w)}</b>${w.r && w.r !== w.w ? `（${escHtml(w.r)}）` : ''} ${escHtml(gText(w))}</span>`).join('')}</div>` : ''}
        </details>` : '';
    const last = z.qi >= z.order.length - 1;
    return `<div class="grammar-top">
            <button type="button" class="btn back-btn grammar-back" onclick="listeningGo('list')">${escHtml(t('listening_back_list'))}</button>
            <span class="ls-dots" aria-hidden="true">${dots}</span>
            <span class="grammar-count">${escHtml(t('grammar_q_n', { n: z.qi + 1, m: z.order.length }))}</span>
        </div>
        <div class="ls-kind">${escHtml(t('listening_mondai', { n: LISTENING_TYPE_NO[it.type] }))}　${escHtml(t('listening_type_' + it.type))}</div>
        <div class="ls-how">${escHtml(t('listening_how_' + it.type))}</div>
        ${it.scene ? `<div class="ls-scene"><span class="ls-scene-emoji" aria-hidden="true">${it.scene.emoji || ''}</span>${escHtml(gText(it.scene))}</div>` : ''}
        ${question ? `<div class="ls-scene ls-question" lang="${lv.lang}">${listeningSegsHtml(question.t, false)}<div class="ls-zh">${escHtml(gText(question))}</div></div>` : ''}
        <div class="ls-player">
            <button type="button" class="ls-play" id="ls-play" onclick="listeningPlay()">▶</button>
            <div class="ls-bar" aria-hidden="true"><i id="ls-bar"></i></div>
            <div class="ls-row">
                <span id="ls-plays"></span>
                ${exam ? `<span class="ls-exam-tag">${escHtml(t('listening_exam'))}</span>` : `
                <button type="button" class="mode-btn ls-small${listeningSlow() ? ' mode-btn-active' : ''}" aria-pressed="${listeningSlow()}" onclick="listeningSetPref('listening_slow', listeningSlow() ? '0' : '1'); listeningRerender()">🐢 ${escHtml(t('listening_slow'))}</button>
                ${answered ? '' : `<button type="button" class="mode-btn ls-small${z.peek ? ' mode-btn-active' : ''}" onclick="listeningSession.peek = !listeningSession.peek; listeningRerender()">👀 ${escHtml(t('listening_peek'))}</button>`}`}
            </div>
        </div>
        <div class="ls-opts${spokenOpts ? ' three' : ''}">${opts}</div>
        ${answered ? `<p class="grammar-feedback ${picked === it.answer ? 'ok' : 'no'}">${escHtml(picked === it.answer ? t('correct') : t('listening_wrong', { n: it.answer + 1 }))}</p>
            <div class="ls-why">${escHtml(gText(it.explain))}</div>` : ''}
        ${tx}
        <div class="grammar-nav">
            <button type="button" class="btn back-btn" onclick="listeningMove(-1)"${z.qi === 0 ? ' disabled' : ''}>${escHtml(t('listening_prev_q'))}</button>
            <button type="button" class="btn next-btn" onclick="${last ? 'listeningFinish()' : 'listeningMove(1)'}"${answered ? '' : ' disabled'}>${escHtml(t(last ? 'grammar_see_result' : 'grammar_next_q'))}</button>
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

function listeningAnswer(i) {
    const lv = listeningLevels[listeningLevelId];
    const z = listeningSession;
    if (z.picks[z.qi] >= 0) return;
    z.picks[z.qi] = i;
    const it = listeningItem(lv);
    if (typeof logDailyActivity === 'function') logDailyActivity();
    if (i !== it.answer && typeof railReact === 'function') railReact('wrong');
    listeningRerender();
}

function listeningScore(lv) {
    const z = listeningSession;
    return z.picks.reduce((n, p, i) => n + (p === lv.sets[z.setNo].items[z.order[i]].answer ? 1 : 0), 0);
}

function listeningFinish() {
    const lv = listeningLevels[listeningLevelId];
    const z = listeningSession;
    z.secs = Math.round((Date.now() - z.start) / 1000);
    const right = listeningScore(lv);
    // a full set only (a retry of the missed items doesn't count as the set's score)
    if (!z.retry) {
        const key = lv.id + ':' + lv.sets[z.setNo].id;
        const prog = listeningProgress();
        const old = prog[key];
        if (!old || right / z.order.length >= old.best / (old.of || 1)) {
            prog[key] = { best: right, of: z.order.length, at: Date.now() };
        }
        if (typeof storeSet === 'function') storeSet('listening_progress', JSON.stringify(prog));
        else listeningSetPref('listening_progress', JSON.stringify(prog));
    }
    if (typeof railReact === 'function') railReact('result', Math.round(right / z.order.length * 100));
    listeningGo('result');
}

function listeningResultHtml(lv) {
    const z = listeningSession;
    const set = lv.sets[z.setNo];
    const right = listeningScore(lv);
    const total = z.order.length;
    const pass = right / total >= LISTENING_PASS;
    const byType = {};
    z.order.forEach((k, i) => {
        const it = set.items[k];
        const b = byType[it.type] || (byType[it.type] = { ok: 0, of: 0 });
        b.of++;
        if (z.picks[i] === it.answer) b.ok++;
    });
    const wrong = z.order.filter((k, i) => z.picks[i] !== set.items[k].answer);
    const words = listeningSetWords(set);
    const plays = z.plays.reduce((a, b) => a + b, 0) / total;
    setTimeout(() => {
        const m = document.querySelector('#listening-card .grammar-result-mascot');
        if (pass && m && typeof mascotHop === 'function') mascotHop(m);
    }, 300);
    return `<div class="rd-result">
            <div class="grammar-result-mascot">${typeof mascotHtml === 'function' ? mascotHtml('bust') : ''}</div>
            <p class="grammar-score">${escHtml(t('grammar_result', { n: right, m: total }))}</p>
            <p class="grammar-verdict ${pass ? 'ok' : 'no'}">${escHtml(t(z.retry ? 'listening_retry_done' : pass ? 'listening_pass' : 'listening_fail'))}</p>
            <div class="ls-types-result">${LISTENING_TYPES.filter(ty => byType[ty]).map(ty =>
                `<div class="ls-type-box"><span>${escHtml(t('listening_mondai', { n: LISTENING_TYPE_NO[ty] }))} ${escHtml(t('listening_type_' + ty))}</span><b>${byType[ty].ok} / ${byType[ty].of}</b></div>`).join('')}</div>
            <p class="rd-speed">⏱ ${escHtml(t('listening_time', { t: Math.floor(z.secs / 60) + ':' + String(z.secs % 60).padStart(2, '0') }))}　·　${escHtml(t('listening_avg_plays', { n: plays.toFixed(1) }))}</p>
            <div class="grammar-result-btns">
                ${words.length ? `<button type="button" class="btn next-btn" onclick="listeningStartReview()">📘 ${escHtml(t('reading_review_btn', { n: words.length }))}</button>` : ''}
                ${wrong.length ? `<button type="button" class="btn back-btn" onclick="listeningStart(${z.setNo}, [${wrong.join(',')}])">${escHtml(t('listening_retry_wrong', { n: wrong.length }))}</button>` : ''}
                ${z.setNo < lv.sets.length - 1 ? `<button type="button" class="btn ${pass ? 'next-btn' : 'back-btn'}" onclick="listeningStart(${z.setNo + 1})">${escHtml(t('listening_next_set'))}</button>` : ''}
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
