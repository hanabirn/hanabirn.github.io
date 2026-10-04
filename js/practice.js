/* ===== Practice tools (the quiz page's 練習中心) =====
   The screens around the quiz engine in js/quiz.js, redesigned 2026-10:
   - renderPracticeHub()  the tool grid under the language buttons (#quiz-tools), each
                          tile with what is waiting (due SRS cards, open mistakes) and a
                          小花火 suggestion for the most urgent one
   - the mistake book     a ruled notebook (#mistake-card); a word leaves it after
                          MISTAKE_FIX_STREAK right answers in a row (quiz.js keeps the data)
   - the stats page       how much is learned (SRS stages per word set), a 16-week
                          practice calendar, this week vs last week (#stats-card)
   - 間隔複習              a page before the review: due count, next batch, 7-day
                          forecast, cards per stage (#srs-card)
   - flashcards           a deck list (#flashcard-setup-card) and a swipe card
                          (#flashcard-card): right = 會了, left = 還不熟
   - the result screen    celebration, daily goal, "tomorrow N cards" (resultHeroHtml…)
   Everything reads what quiz.js / home.js already store; the only new keys are
   flashcard_prefs here and listening_prefs in quiz.js. */

const FC_SESSION_SIZE = 20;
const FC_SWIPE_PX = 90;          // drag further than this to rate a card
const MISTAKE_REPAIR_SIZE = 10;
const MISTAKE_ROWS_STEP = 20;
const STATS_WEEKS = 16;
const DAY_MS = 24 * 60 * 60 * 1000;

/* SRS boxes 1–6 shown as four stages (stats page and 間隔複習 page). */
const SRS_STAGES = [
    { key: 'srs_stage_new', boxes: [1], cls: 'st-new' },
    { key: 'srs_stage_learning', boxes: [2, 3], cls: 'st-learning' },
    { key: 'srs_stage_familiar', boxes: [4], cls: 'st-familiar' },
    { key: 'srs_stage_mastered', boxes: [5, 6], cls: 'st-mastered' }
];

function srsStageIndex(box) {
    const i = SRS_STAGES.findIndex(s => s.boxes.includes(box));
    return i < 0 ? 0 : i;
}

/* ----- small shared pieces ----- */

/* 小花火 (js/mascot.js): the head in a circle, or 'full' for the whole figure */
function practiceMascot(kind) {
    return typeof mascotHtml === 'function' ? mascotHtml(kind || 'bust') : '';
}

function practiceHead(titleKey, backCall, right) {
    return `<div class="pc-head">
        <button type="button" class="back-btn pc-back" onclick="${backCall}" aria-label="${escHtml(t('tool_back'))}">←</button>
        <h3>${escHtml(t(titleKey))}</h3>
        ${right ? `<span class="pc-head-right">${right}</span>` : ''}
    </div>`;
}

function practiceSetName(id) {
    const s = wordSetName(id);
    return s === 'quiz_' + id ? id : s;
}

function pad2(n) { return String(n).padStart(2, '0'); }

/* "21:05" today, "明天 08:00", or "10/5" further away. */
function practiceWhen(ts) {
    const d = new Date(ts);
    const time = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const day = new Date(ts); day.setHours(0, 0, 0, 0);
    const diff = Math.round((day - today) / DAY_MS);
    if (diff <= 0) return time;
    if (diff === 1) return t('when_tomorrow', { time });
    return (d.getMonth() + 1) + '/' + d.getDate();
}

function weekdayFormatter() {
    try { return new Intl.DateTimeFormat(siteLang, { weekday: 'narrow' }); }
    catch { return new Intl.DateTimeFormat(undefined, { weekday: 'narrow' }); }
}

function wordsInLastDays(days) {
    const act = getDailyActivity();
    let n = 0;
    for (let i = 0; i < days; i++) n += act[activityDayKey(Date.now() - i * DAY_MS)] || 0;
    return n;
}

/* ===================== 練習中心 (tool grid) ===================== */

function renderPracticeHub() {
    const box = document.getElementById('quiz-tools');
    if (!box) return;
    const now = Date.now();
    const cards = Object.values(getSrsQuizCards());
    const due = cards.filter(c => c && c.due <= now).length;
    const nextDue = cards.filter(c => c && c.due > now).reduce((m, c) => Math.min(m, c.due), Infinity);
    const all = getMistakes();
    const open = all.filter(isMistakeActive).length;
    const fixedWeek = all.filter(m => m.fixedAt && m.fixedAt > now - 7 * DAY_MS).length;
    const known = getFlashcardKnown().length;
    const lastListen = getQuizRecords().filter(r => r && r.kind === 'listening').pop();

    let suggest = '';
    if (due > 0) {
        suggest = `<button type="button" class="hub-tile hub-suggest hot" onclick="showSrsDashboard()">
            <span class="hub-mascot">${practiceMascot()}</span>
            <span class="hub-text"><b>${escHtml(t('hub_suggest_srs', { n: due }))}</b><small>${escHtml(t('hub_suggest_srs_sub'))}</small></span>
        </button>`;
    } else if (open > 0) {
        suggest = `<button type="button" class="hub-tile hub-suggest hot" onclick="showMistakeBook()">
            <span class="hub-mascot">${practiceMascot()}</span>
            <span class="hub-text"><b>${escHtml(t('hub_suggest_mistakes', { n: open }))}</b><small>${escHtml(t('hub_suggest_mistakes_sub'))}</small></span>
        </button>`;
    }

    const tile = (icon, titleKey, sub, onclick, badge, hot, wide) => `
        <button type="button" class="hub-tile${hot ? ' hot' : ''}${wide ? ' wide' : ''}" onclick="${onclick}">
            ${badge ? `<span class="hub-badge">${badge}</span>` : ''}
            <span class="hub-icon" aria-hidden="true">${icon}</span>
            <span class="hub-text"><b>${escHtml(t(titleKey))}</b><small>${escHtml(sub)}</small></span>
        </button>`;
    const srsSub = due > 0 ? t('hub_srs_due', { n: due })
        : nextDue < Infinity ? t('hub_srs_next', { when: practiceWhen(nextDue) })
        : t('hub_srs_empty');
    const mistakeSub = open > 0 ? t('hub_mistakes_open', { n: open })
        : fixedWeek > 0 ? t('hub_mistakes_fixed_week', { n: fixedWeek })
        : t('hub_mistakes_none');
    const fcSub = known > 0 ? t('hub_fc_known', { n: known }) : t('hub_fc_intro');
    const listenSub = lastListen ? t('hub_listen_last', { c: lastListen.correct, n: lastListen.total }) : t('hub_listen_intro');

    box.innerHTML = `<h3 class="hub-title">${escHtml(t('hub_title'))}</h3>
        <div class="hub-grid">
            ${suggest}
            ${tile('🔁', 'tool_srs', srsSub, 'showSrsDashboard()', due || '', due > 0)}
            ${tile('📕', 'tool_mistakes', mistakeSub, 'showMistakeBook()', open || '', false)}
            ${tile('🃏', 'tool_flashcard', fcSub, 'showFlashcard()', '', false)}
            ${tile('🎧', 'tool_listening', listenSub, 'startListeningQuiz()', '', false)}
            ${tile('📊', 'tool_stats', t('hub_stats_week', { n: wordsInLastDays(7) }), 'showQuizStats()', '', false, true)}
        </div>`;
}

/* ===================== 錯題本 (mistake notebook) ===================== */

let mbFilter = 'all';
let mbSort = 'count';     // 'count' | 'recent' | 'fixed'
let mbShown = MISTAKE_ROWS_STEP;
let mbRows = [];          // the rows on screen, for the ✕ buttons

function showMistakeBook() {
    endReviewState();
    mbShown = MISTAKE_ROWS_STEP;
    showOnlyQuizCard('mistake-card');
    renderMistakeBook();
    window.scrollTo(0, 0);
}

function mbSetFilter(v) { mbFilter = v; mbShown = MISTAKE_ROWS_STEP; renderMistakeBook(); }
function mbSetSort(v) { mbSort = v; mbShown = MISTAKE_ROWS_STEP; renderMistakeBook(); }
function mbMore() { mbShown += MISTAKE_ROWS_STEP; renderMistakeBook(); }

function mbDelete(i) {
    const m = mbRows[i];
    if (!m) return;
    removeMistakeById(m.id);
    renderMistakeBook();
}

function mbClearFilter() {
    const name = mbFilter === 'all' ? t('mistake_all') : practiceSetName(mbFilter);
    if (!confirm(t('mistake_clear_confirm', { name }))) return;
    saveMistakes(getMistakes().filter(m => mbFilter !== 'all' && m.lang !== mbFilter));
    mbFilter = 'all';
    renderMistakeBook();
}

/* the word, its small second line (reading / pinyin) and the answer line */
function mistakeRowParts(m) {
    const p = m.group === 'reading' ? { sub: m.answer, line: m.hint || '' } : { sub: m.hint || '', line: m.answer };
    if (p.sub === m.word) p.sub = '';   // a kana word's "reading" is the word itself
    return p;
}

function renderMistakeBook() {
    const box = document.getElementById('mistake-content');
    if (!box) return;
    const all = getMistakes();
    const now = Date.now();
    const openAll = all.filter(isMistakeActive);
    const fixedAll = all.filter(m => !isMistakeActive(m));
    const head = practiceHead('tool_mistakes', 'closeQuizTools()', openAll.length ? escHtml(t('mistake_open_n', { n: openAll.length })) : '');

    if (all.length === 0) {
        box.innerHTML = head + `<div class="pc-empty"><span class="pc-empty-mascot">${practiceMascot('full')}</span><p>${escHtml(t('mistake_empty'))}</p></div>`;
        return;
    }

    const sets = QUIZ_LANG_ORDER.concat(LEGACY_SET_IDS).filter(id => all.some(m => m.lang === id));
    if (mbFilter !== 'all' && !sets.includes(mbFilter)) mbFilter = 'all';
    const inFilter = m => mbFilter === 'all' || m.lang === mbFilter;
    const open = openAll.filter(inFilter);
    const fixed = fixedAll.filter(inFilter);

    const total = openAll.length + fixedAll.length;
    const pct = total ? Math.round(fixedAll.length / total * 100) : 0;
    let html = head + `
        <div class="mb-summary">
            <div class="pc-ring" style="--p:${pct}"><div><b>${fixedAll.length}</b><small>/ ${total}</small></div></div>
            <div class="pc-bubble">${escHtml(t('mistake_bubble', { n: MISTAKE_FIX_STREAK }))}</div>
        </div>`;
    const repairN = Math.min(MISTAKE_REPAIR_SIZE, open.length);
    html += repairN > 0
        ? `<button type="button" class="next-btn pc-wide" onclick="startMistakeRepair()">🔧 ${escHtml(t('mistake_repair_btn', { n: repairN }))}</button>`
        : `<p class="pc-note">${escHtml(t('mistake_all_fixed'))}</p>`;

    const chip = (on, call, label) => `<button type="button" class="pc-chip${on ? ' on' : ''}" onclick="${call}" aria-pressed="${on}">${escHtml(label)}</button>`;
    html += `<div class="pc-chips">${chip(mbFilter === 'all', "mbSetFilter('all')", t('mistake_all') + ' ' + openAll.length)}${
        sets.map(id => chip(mbFilter === id, `mbSetFilter('${id}')`, practiceSetName(id) + ' ' + openAll.filter(m => m.lang === id).length)).join('')}</div>`;
    html += `<div class="pc-chips">${chip(mbSort === 'count', "mbSetSort('count')", t('mistake_sort_count'))}${
        chip(mbSort === 'recent', "mbSetSort('recent')", t('mistake_sort_recent'))}${
        chip(mbSort === 'fixed', "mbSetSort('fixed')", t('mistake_sort_fixed') + ' ' + fixed.length)}</div>`;

    let rows;
    if (mbSort === 'fixed') rows = fixed.slice().sort((a, b) => b.fixedAt - a.fixedAt);
    else if (mbSort === 'recent') rows = open.slice().sort((a, b) => b.last - a.last);
    else rows = open.slice().sort((a, b) => (b.count - a.count) || (b.last - a.last));
    mbRows = rows.slice(0, mbShown);

    if (mbRows.length === 0) {
        html += `<p class="pc-note">${escHtml(t(mbSort === 'fixed' ? 'mistake_none_fixed' : 'mistake_none_here'))}</p>`;
    } else {
        html += '<ol class="mb-notebook">' + mbRows.map((m, i) => {
            const p = mistakeRowParts(m);
            const fixedRow = !isMistakeActive(m);
            const dots = '<i></i>'.repeat(Math.min(m.count || 1, 5)) + (m.count > 5 ? `<em>×${m.count}</em>` : '');
            const slots = Array.from({ length: MISTAKE_FIX_STREAK }, (_, k) => `<i class="${k < (m.fix || 0) ? 'on' : ''}"></i>`).join('');
            return `<li class="mb-row${fixedRow ? ' fixed' : ''}">
                <span class="mb-n">${i + 1}</span>
                <div class="mb-word">
                    <div><b>${escHtml(m.word)}</b>${p.sub ? `<span>${escHtml(p.sub)}</span>` : ''}</div>
                    <div class="mb-line">${escHtml(p.line)}</div>
                </div>
                ${fixedRow
                    ? `<span class="mb-stamp">${escHtml(t('mistake_fixed_stamp'))}</span>`
                    : `<div class="mb-state" title="${escHtml(t('mistake_state_title', { n: m.count || 1, f: m.fix || 0, m: MISTAKE_FIX_STREAK }))}">
                        <span class="mb-dots">${dots}</span><span class="mb-slots">${slots}</span>
                    </div>`}
                <button type="button" class="mb-del" onclick="mbDelete(${i})" aria-label="${escHtml(t('mistake_delete'))}">✕</button>
            </li>`;
        }).join('') + '</ol>';
        if (rows.length > mbShown) html += `<button type="button" class="back-btn pc-wide pc-more" onclick="mbMore()">${escHtml(t('mistake_more', { n: rows.length - mbShown }))}</button>`;
    }

    const fixedWeek = fixedAll.filter(m => m.fixedAt > now - 7 * DAY_MS).length;
    html += `<div class="mb-foot">
        <span>${fixedWeek > 0 ? '✓ ' + escHtml(t('mistake_fixed_week', { n: fixedWeek })) : ''}</span>
        <button type="button" class="mb-clear" onclick="mbClearFilter()">${escHtml(t(mbFilter === 'all' ? 'mistake_clear_all' : 'mistake_clear_set'))}</button>
    </div>`;
    box.innerHTML = html;
}

/* A repair round: the most-missed open mistakes (of the chosen word set), asked on the
   review engine; each right answer is re-asked once more later in the round
   (requeueForRepair in quiz.js), so the round can repair a word completely. */
function startMistakeRepair(entries) {
    let list = entries;
    if (!list) {
        list = getActiveMistakes()
            .filter(m => mbFilter === 'all' || m.lang === mbFilter)
            .sort((a, b) => (b.count - a.count) || (b.last - a.last))
            .slice(0, MISTAKE_REPAIR_SIZE);
    }
    if (!list.length) {
        showShareToast(t('mistake_all_fixed'));
        showMistakeBook();
        return;
    }
    stopTimer();
    quizTimerSec = 0;
    currentListeningMode = false;
    reviewMode = true;
    reviewSource = 'mistakes';
    // wrong options: every mistake and SRS card (then the set's cached words, see nextQuestion)
    reviewPool = getMistakes().concat(Object.values(getSrsQuizCards()));
    reviewList = shuffleArray(list);
    reviewIdx = 0;
    currentLang = reviewList[0].lang;
    score = 0;
    questionNum = 0;
    quizHistory = [];
    totalQuestions = reviewList.length;
    showOnlyQuizCard('quiz-card');
    document.getElementById('quiz-mode-label').innerText = '🔧 ' + t('mistake_repair_label');
    document.getElementById('total-words').innerText = t('quiz_words', { n: reviewList.length });
    setQuizBackLabels('mistakes');
    setResultAgainLabel('quiz_again');
    nextQuestion();
}

/* "再練錯的字" on the result screen: the words just missed, as a repair round. */
function retryWrongWords() {
    const seen = new Set();
    const entries = quizHistory.filter(h => !h.isCorrect && h.entry && h.entry.answer)
        .map(h => h.entry)
        .filter(e => !seen.has(e.id) && seen.add(e.id));
    if (!entries.length) return;
    endReviewState();
    startMistakeRepair(entries);
}

/* ===================== 測驗統計 ===================== */

function showQuizStats() {
    showOnlyQuizCard('stats-card');
    renderQuizStats();
    window.scrollTo(0, 0);
}

function practiceDays() {
    const act = getDailyActivity();
    const days = {};
    Object.entries(act).forEach(([k, n]) => { if (n > 0) days[k] = n; });
    getQuizRecords().forEach(r => { const k = activityDayKey(r.date); if (!days[k]) days[k] = 1; });
    return days;
}

function longestStreak(days) {
    const keys = Object.keys(days).map(k => new Date(k.replace(/-/g, '/')).getTime()).sort((a, b) => a - b);
    let best = 0, run = 0, prev = null;
    keys.forEach(ts => {
        run = prev !== null && Math.round((ts - prev) / DAY_MS) === 1 ? run + 1 : 1;
        best = Math.max(best, run);
        prev = ts;
    });
    return best;
}

/* Unique words per word set with the best SRS stage each has reached. */
function srsWordsBySet() {
    const bySet = {};
    Object.values(getSrsQuizCards()).forEach(c => {
        if (!c || !c.lang) return;
        const set = bySet[c.lang] = bySet[c.lang] || {};
        set[c.word] = Math.max(set[c.word] || 0, c.box || 1);
    });
    return bySet;
}

function heatLevel(n) {
    return n <= 0 ? 0 : n < 10 ? 1 : n < 20 ? 2 : n < 40 ? 3 : 4;
}

function renderQuizStats() {
    const box = document.getElementById('stats-content');
    if (!box) return;
    const recs = getQuizRecords();
    const days = practiceDays();
    const streak = calcStreak(recs);
    const avg = recs.length ? Math.round(recs.reduce((s, r) => s + r.pct, 0) / recs.length) + '%' : '—';

    let html = practiceHead('tool_stats', 'closeQuizTools()') + `
        <div class="pc-tiles">
            <div class="pc-tile"><b>🔥 ${streak}</b><span>${escHtml(t('stats_streak'))}</span></div>
            <div class="pc-tile"><b>${longestStreak(days)}</b><span>${escHtml(t('stats_longest'))}</span></div>
            <div class="pc-tile"><b>${avg}</b><span>${escHtml(t('stats_avg'))}</span></div>
        </div>`;

    // ----- how much is learned -----
    const bySet = srsWordsBySet();
    const setIds = Object.keys(bySet).sort((a, b) => Object.keys(bySet[b]).length - Object.keys(bySet[a]).length);
    const stageTotals = [0, 0, 0, 0];
    setIds.forEach(id => Object.values(bySet[id]).forEach(b => stageTotals[srsStageIndex(b)]++));
    html += `<section class="pc-section"><h4>${escHtml(t('stats_mastery_title'))}</h4>`;
    if (!setIds.length) {
        html += `<p class="pc-note">${escHtml(t('stats_mastery_empty'))}</p>`;
    } else {
        html += `<div class="st-hero"><small>${escHtml(t('stats_mastered_words'))}</small><b>${stageTotals[3]}</b><span>${escHtml(t('stats_familiar_n', { n: stageTotals[2] }))}</span></div>
            <div class="st-legend">${SRS_STAGES.map(s => `<span><i class="${s.cls}"></i>${escHtml(t(s.key))}</span>`).join('')}</div>`;
        setIds.slice(0, 8).forEach(id => {
            const words = bySet[id];
            const seen = Object.keys(words).length;
            const cache = getVocabCache(id);
            const total = cache && cache.vocabularyList ? cache.vocabularyList.length : 0;
            const base = Math.max(total, seen, 1);
            const counts = [0, 0, 0, 0];
            Object.values(words).forEach(b => counts[srsStageIndex(b)]++);
            // mastered first, from the left
            const bars = [3, 2, 1, 0].map(i => counts[i] ? `<i class="${SRS_STAGES[i].cls}" style="width:${(counts[i] / base * 100).toFixed(2)}%"></i>` : '').join('');
            html += `<div class="st-set">
                <div class="st-set-head"><b>${escHtml(practiceSetName(id))}</b><span>${escHtml(total ? t('stats_seen_of', { n: seen, m: total }) : t('stats_seen', { n: seen }))}</span></div>
                <div class="pc-bar st-bar">${bars}</div>
            </div>`;
        });
        html += `<p class="pc-tip">${escHtml(t('stats_mastery_tip'))}</p>`;
    }
    html += '</section>';

    // ----- practice calendar -----
    const today = new Date(); today.setHours(12, 0, 0, 0);
    const mondayIdx = (today.getDay() + 6) % 7;           // 0 = Monday
    const start = new Date(today); start.setDate(today.getDate() - mondayIdx - (STATS_WEEKS - 1) * 7);
    let cells = '', sum = 0;
    for (let i = 0; i < STATS_WEEKS * 7; i++) {
        const d = new Date(start); d.setDate(start.getDate() + i);
        const future = d > today;
        const n = future ? 0 : (days[activityDayKey(d.getTime())] || 0);
        sum += n;
        cells += `<i class="h${heatLevel(n)}${future ? ' future' : ''}"${future ? '' : ` title="${d.getMonth() + 1}/${d.getDate()}：${escHtml(t('stats_day_words', { n }))}"`}></i>`;
    }
    html += `<section class="pc-section">
        <div class="pc-section-head"><h4>${escHtml(t('stats_calendar_title', { n: STATS_WEEKS }))}</h4><span>${escHtml(t('stats_calendar_total', { n: sum }))}</span></div>
        <div class="st-heat" style="--weeks:${STATS_WEEKS}">${cells}</div>
        <div class="st-heat-legend">${escHtml(t('stats_less'))}<i class="h0"></i><i class="h1"></i><i class="h2"></i><i class="h3"></i><i class="h4"></i>${escHtml(t('stats_more'))}</div>
    </section>`;

    // ----- this week vs last week (Monday to Sunday) -----
    const fmt = weekdayFormatter();
    const thisMon = new Date(today); thisMon.setDate(today.getDate() - mondayIdx);
    const act = getDailyActivity();
    const dayN = (base, i) => { const d = new Date(base); d.setDate(base.getDate() + i); return d > today ? null : (act[activityDayKey(d.getTime())] || 0); };
    const lastMon = new Date(thisMon); lastMon.setDate(thisMon.getDate() - 7);
    const thisW = [], lastW = [];
    for (let i = 0; i < 7; i++) { thisW.push(dayN(thisMon, i)); lastW.push(dayN(lastMon, i)); }
    const sumThis = thisW.reduce((s, n) => s + (n || 0), 0);
    const sumLast = lastW.reduce((s, n) => s + (n || 0), 0);
    const max = Math.max(1, ...thisW.map(n => n || 0), ...lastW);
    let change = '';
    if (sumLast > 0) {
        const p = Math.round((sumThis - sumLast) / sumLast * 100);
        change = `<span class="${p >= 0 ? 'st-up' : 'st-down'}">${p >= 0 ? '▲' : '▼'} ${Math.abs(p)}%</span>`;
    } else if (sumThis > 0) change = '<span class="st-up">▲</span>';
    html += `<section class="pc-section">
        <div class="pc-section-head"><h4>${escHtml(t('stats_week_vs'))}</h4>${change}</div>
        <div class="st-week">${thisW.map((n, i) => {
            const d = new Date(thisMon); d.setDate(thisMon.getDate() + i);
            return `<div><span class="st-week-bars"><i class="prev" style="height:${lastW[i] / max * 100}%" title="${escHtml(t('stats_last_week'))}: ${lastW[i]}"></i><i style="height:${(n || 0) / max * 100}%" title="${escHtml(t('stats_this_week'))}: ${n === null ? '—' : n}"></i></span><small>${escHtml(fmt.format(d))}</small></div>`;
        }).join('')}</div>
        <div class="st-week-legend"><span><i class="prev"></i>${escHtml(t('stats_last_week'))} ${sumLast}</span><span><i></i>${escHtml(t('stats_this_week'))} ${sumThis}</span></div>
    </section>`;

    // ----- achievements + recent quizzes -----
    html += `<section class="pc-section">${renderAchievementsHTML()}</section>`;
    if (recs.length) {
        const rows = recs.slice(-10).reverse().map(r => {
            const d = new Date(r.date);
            const when = `${d.getMonth() + 1}/${d.getDate()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
            const name = r.lang === 'srs' ? t('tool_srs') : practiceSetName(r.lang);
            const kind = r.kind === 'listening' ? ' 🎧' : r.review ? ' 🔁' : '';
            return `<tr class="${r.pct >= 60 ? 'result-correct' : 'result-wrong'}"><td>${when}</td><td>${escHtml(name)}${kind}</td><td>${r.pct}%（${r.correct}/${r.total}）</td></tr>`;
        }).join('');
        html += `<details class="pc-details"><summary>${escHtml(t('stats_recent'))}</summary>
            <table class="result-table stats-table"><thead><tr><th>${escHtml(t('stats_date'))}</th><th>${escHtml(t('stats_lang'))}</th><th>${escHtml(t('stats_accuracy'))}</th></tr></thead><tbody>${rows}</tbody></table>
        </details>`;
    }
    box.innerHTML = html;
}

/* ===================== 間隔複習 page ===================== */

function showSrsDashboard() {
    endReviewState();
    showOnlyQuizCard('srs-card');
    renderSrsDashboard();
    window.scrollTo(0, 0);
}

function renderSrsDashboard() {
    const box = document.getElementById('srs-content');
    if (!box) return;
    const now = Date.now();
    const cards = Object.values(getSrsQuizCards()).filter(c => c && c.due);
    const due = cards.filter(c => c.due <= now).length;
    const later = cards.filter(c => c.due > now).sort((a, b) => a.due - b.due);

    let msg;
    if (due > 0) msg = t('srs_bubble_due', { n: due });
    else if (later.length) msg = t('srs_bubble_clear', { when: practiceWhen(later[0].due) });
    else msg = t('srs_bubble_empty');

    const startN = Math.min(due, SRS_REVIEW_LIMIT);
    let html = practiceHead('tool_srs', 'closeQuizTools()') + `
        <div class="srs-talk"><span class="srs-mascot">${practiceMascot()}</span><div class="pc-bubble">${escHtml(msg)}</div></div>
        <div class="srs-due${due ? '' : ' none'}"><b>${due}</b><small>${escHtml(t('srs_due_label'))}</small></div>
        <button type="button" class="next-btn pc-wide" onclick="startSrsQuizReview('tool')"${due ? '' : ' disabled'}>${escHtml(due > SRS_REVIEW_LIMIT ? t('srs_start_some', { n: startN }) : t('srs_start_n', { n: startN }))}</button>`;

    if (cards.length) {
        // upcoming: the next batch, then today / tomorrow
        const endToday = new Date(); endToday.setHours(23, 59, 59, 999);
        const laterToday = later.filter(c => c.due <= endToday.getTime()).length;
        const tomorrow = later.filter(c => c.due > endToday.getTime() && c.due <= endToday.getTime() + DAY_MS).length;
        html += `<div class="pc-list">
            ${later.length ? `<div><span>${escHtml(t('srs_next_batch', { when: practiceWhen(later[0].due) }))}</span><b>${later.filter(c => c.due - later[0].due < 60 * 60 * 1000).length}</b></div>` : ''}
            <div><span>${escHtml(t('srs_later_today'))}</span><b>+${laterToday}</b></div>
            <div><span>${escHtml(t('srs_tomorrow'))}</span><b>+${tomorrow}</b></div>
        </div>`;

        // 7-day forecast: day 0 also holds everything already due
        const fmt = weekdayFormatter();
        const counts = [0, 0, 0, 0, 0, 0, 0];
        const day0 = new Date(); day0.setHours(0, 0, 0, 0);
        cards.forEach(c => {
            const d = Math.max(0, Math.floor((c.due - day0.getTime()) / DAY_MS));
            if (d < 7) counts[d]++;
        });
        const max = Math.max(1, ...counts);
        html += `<section class="pc-section"><h4>${escHtml(t('srs_forecast'))}</h4><div class="srs-forecast">${counts.map((n, i) => {
            const d = new Date(day0); d.setDate(day0.getDate() + i);
            return `<div class="${i === 0 ? 'today' : ''}"><span class="srs-fc-n">${n || ''}</span><i style="height:${n / max * 100}%"></i><small>${escHtml(i === 0 ? t('srs_today') : fmt.format(d))}</small></div>`;
        }).join('')}</div></section>`;

        const stageN = [0, 0, 0, 0];
        cards.forEach(c => stageN[srsStageIndex(c.box || 1)]++);
        html += `<section class="pc-section"><h4>${escHtml(t('srs_stages'))}</h4>
            <div class="srs-stages">${SRS_STAGES.map((s, i) => `<div class="${s.cls}"><b>${stageN[i]}</b><small>${escHtml(t(s.key))}</small></div>`).join('')}</div>
            <p class="pc-tip">${escHtml(t('srs_stage_tip'))}</p>
        </section>`;
    }
    box.innerHTML = html;
}

/* ===================== 單字閃卡 ===================== */

const FC_LANGS = ['jp', 'kr', 'en', 'zh', 'fr', 'ru'];
const FC_MODES = {
    jp: [{ id: 'zh-meaning', key: 'fc_show_zh' }, { id: 'en-meaning', key: 'fc_show_en' }],
    kr: [{ id: 'zh-meaning', key: 'fc_show_zh' }, { id: 'en-meaning', key: 'fc_show_en' }],
    fr: [{ id: 'zh-meaning', key: 'fc_show_zh' }, { id: 'en-meaning', key: 'fc_show_en' }],
    ru: [{ id: 'zh-meaning', key: 'fc_show_zh' }, { id: 'en-meaning', key: 'fc_show_en' }],
    en: [{ id: 'zh-meaning', key: 'fc_show_zh' }],
    zh: [{ id: 'trad-bopomofo', key: 'fc_show_trad' }, { id: 'simp-roman', key: 'fc_show_simp' }]
};

let flashcardSetId = '';
let fcReverse = false;          // front shows the meaning, back the word
let fcSession = { known: 0, unknown: 0, unknownReview: false };
let fcBusy = false;             // a card is flying out
let fcListWords = [];           // rows of the known / unknown list cards

function getFlashcardPrefs() {
    try { return JSON.parse(localStorage.getItem('flashcard_prefs')) || {}; } catch { return {}; }
}

function saveFlashcardPrefs() {
    const p = getFlashcardPrefs();
    p.lang = flashcardLang;
    p.modes = Object.assign({}, p.modes, { [flashcardLang]: flashcardMode });
    p.reverse = fcReverse;
    if (flashcardSetId) p.set = flashcardSetId;
    try { localStorage.setItem('flashcard_prefs', JSON.stringify(p)); } catch {}
}

function fcWordOf(w) { return w.trad || w.word; }
function fcKey(w) { return flashcardLang + '|' + flashcardMode + '|' + fcWordOf(w); }
function fcPrefix() { return flashcardLang + '|' + flashcardMode + '|'; }

function showFlashcard() {
    const p = getFlashcardPrefs();
    flashcardLang = FC_LANGS.includes(p.lang) ? p.lang : 'jp';
    const modes = FC_MODES[flashcardLang].map(m => m.id);
    const saved = p.modes && p.modes[flashcardLang];
    flashcardMode = modes.includes(saved) ? saved : modes[0];
    fcReverse = !!p.reverse;
    // the whole store (all languages), so saving doesn't drop the other languages' marks
    flashcardKnownSet = new Set(getFlashcardKnown());
    flashcardUnknownSet = new Set(getFlashcardUnknown());
    showOnlyQuizCard('flashcard-setup-card');
    renderFlashcardDecks();
    window.scrollTo(0, 0);
}

function fcPickLang(lang) {
    flashcardLang = lang;
    const p = getFlashcardPrefs();
    const modes = FC_MODES[lang].map(m => m.id);
    const saved = p.modes && p.modes[lang];
    flashcardMode = modes.includes(saved) ? saved : modes[0];
    saveFlashcardPrefs();
    renderFlashcardDecks();
}

function fcPickMode(mode) { flashcardMode = mode; saveFlashcardPrefs(); renderFlashcardDecks(); }
function fcPickFront(reverse) { fcReverse = reverse; saveFlashcardPrefs(); renderFlashcardDecks(); }

function fcDeckBadge(id) {
    const tp = topicOf(id);
    if (tp) return TOPIC_EMOJI[tp.topic];
    if (/^(fr|ru)_/.test(id)) return id.slice(3).toUpperCase();
    if (id.startsWith('jlpt_')) return id.slice(5).toUpperCase();
    if (id.startsWith('topik_')) return 'T' + id.slice(6);
    if (id.startsWith('hsk_')) return 'H' + id.slice(4);
    return { en_jh: 'JH', en_sh: 'SH', en_toeic: 'TC', en_toefl: 'TF', fr: 'Fr' }[id] || '・';
}

function renderFlashcardDecks() {
    const box = document.getElementById('fc-setup');
    if (!box) return;
    const chip = (on, call, label) => `<button type="button" class="pc-chip${on ? ' on' : ''}" onclick="${call}" aria-pressed="${on}">${escHtml(label)}</button>`;
    let html = practiceHead('tool_flashcard', 'closeFlashcardSetup()');
    html += `<div class="pc-chips">${FC_LANGS.map(l => chip(l === flashcardLang, `fcPickLang('${l}')`, t(PRACTICE_LANG_NAME_KEYS[l]))).join('')}</div>`;
    const modes = FC_MODES[flashcardLang];
    html += '<div class="fc-opts">';
    if (modes.length > 1) {
        html += `<span class="pc-label">${escHtml(t(flashcardLang === 'zh' ? 'fc_field_script' : 'fc_field_back'))}</span>`
            + modes.map(m => chip(m.id === flashcardMode, `fcPickMode('${m.id}')`, t(m.key))).join('');
    }
    html += `<span class="pc-label">${escHtml(t('fc_field_front'))}</span>`
        + chip(!fcReverse, 'fcPickFront(false)', t('fc_front_word')) + chip(fcReverse, 'fcPickFront(true)', t('fc_front_meaning'));
    html += '</div>';

    const last = getFlashcardPrefs().set;
    const prefix = fcPrefix();
    (WORD_SET_FAMILIES[flashcardLang] || []).forEach(id => {
        const cache = getVocabCache(id);
        const words = cache && cache.vocabularyList ? cache.vocabularyList : null;
        let bar = '', note;
        if (words && words.length) {
            const keyOf = w => prefix + fcWordOf(w);
            const k = words.filter(w => flashcardKnownSet.has(keyOf(w))).length;
            const u = words.filter(w => flashcardUnknownSet.has(keyOf(w))).length;
            bar = `<span class="pc-bar fc-deck-bar"><i class="st-mastered" style="width:${k / words.length * 100}%"></i><i class="st-new" style="width:${u / words.length * 100}%"></i></span>`;
            note = k || u ? t('fc_deck_counts', { k, u, n: words.length }) : t('fc_deck_words', { n: words.length });
        } else {
            note = t('fc_deck_new');
        }
        html += `<button type="button" class="fc-deck${id === last ? ' last' : ''}" onclick="fcStartDeck('${id}')">
            <span class="fc-deck-badge">${escHtml(fcDeckBadge(id))}</span>
            <span class="fc-deck-text"><b>${escHtml(practiceSetName(id))}${id === last ? ` <em>${escHtml(t('fc_deck_last'))}</em>` : ''}</b>${bar}<small>${escHtml(note)}</small></span>
            <span class="fc-deck-go" aria-hidden="true">▶</span>
        </button>`;
    });

    const nUnknown = [...flashcardUnknownSet].filter(k => k.startsWith(prefix)).length;
    const nKnown = [...flashcardKnownSet].filter(k => k.startsWith(prefix)).length;
    html += `<div class="pc-two">
        <button type="button" class="back-btn" onclick="reviewUnknownWords()"${nUnknown ? '' : ' disabled'}>${escHtml(t('fc_only_unknown', { n: nUnknown }))}</button>
        <button type="button" class="back-btn" onclick="showMasteredList()">${escHtml(t('fc_known_list', { n: nKnown }))}</button>
    </div>`;
    if (nUnknown) html += `<p class="pc-tip"><button type="button" class="pc-link" onclick="showUnknownList()">${escHtml(t('fc_unknown_list', { n: nUnknown }))}</button></p>`;
    box.innerHTML = html;
}

/* A deck session: this set's 還不熟 words first, then words not seen yet in list order
   (easy first), topped up with known ones for a quick re-check; shuffled. */
function fcStartDeck(id) {
    flashcardSetId = id;
    saveFlashcardPrefs();
    showOnlyQuizCard('flashcard-card');
    document.getElementById('fc-session').innerHTML = `<p class="pc-note">${escHtml(t('load_loading'))}</p>`;
    loadWordSet(id)
        .then(n => { if (n >= 4) saveVocabCache(id); })
        .catch(() => { if (!restoreVocabCache(id)) throw new Error('no words'); })
        .then(() => {
            if (flashcardSetId !== id) return;
            const words = vocabularyList.slice();
            const unknown = words.filter(w => flashcardUnknownSet.has(fcKey(w)));
            const fresh = words.filter(w => !flashcardUnknownSet.has(fcKey(w)) && !flashcardKnownSet.has(fcKey(w)));
            let queue = unknown.slice(0, FC_SESSION_SIZE).concat(fresh.slice(0, FC_SESSION_SIZE)).slice(0, FC_SESSION_SIZE);
            if (queue.length < FC_SESSION_SIZE) {
                const known = shuffleArray(words.filter(w => flashcardKnownSet.has(fcKey(w))));
                queue = queue.concat(known.slice(0, FC_SESSION_SIZE - queue.length));
            }
            fcBeginSession(shuffleArray(queue), false);
        })
        .catch(() => {
            showShareToast(t('load_fail_no_cache'));
            showFlashcard();
        });
}

function fcBeginSession(list, unknownReview) {
    flashcardList = list;
    flashcardIdx = 0;
    fcSession = { known: 0, unknown: 0, unknownReview };
    fcBusy = false;
    sessionStartedAt = Date.now();
    if (!list.length) { showFlashcard(); return; }
    showOnlyQuizCard('flashcard-card');
    renderFlashcard();
}

/* 還不熟 words of this language (marks are kept per language, not per level), looked
   up level by level. */
function reviewUnknownWords() {
    const prefix = fcPrefix();
    const unknownWords = new Set([...flashcardUnknownSet].filter(k => k.startsWith(prefix)).map(k => k.slice(prefix.length)));
    if (!unknownWords.size) return;
    showOnlyQuizCard('flashcard-card');
    document.getElementById('fc-session').innerHTML = `<p class="pc-note">${escHtml(t('load_loading'))}</p>`;
    const found = [];
    (WORD_SET_FAMILIES[flashcardLang] || []).reduce((chain, id) => chain
        .then(() => loadWordSet(id).catch(() => restoreVocabCache(id)))
        .then(() => {
            vocabularyList.forEach(w => {
                const word = fcWordOf(w);
                if (unknownWords.has(word) && !found.some(f => fcWordOf(f) === word)) found.push(Object.assign({ _set: id }, w));
            });
        }), Promise.resolve())
        .then(() => fcBeginSession(shuffleArray(found).slice(0, FC_SESSION_SIZE), true));
}

/* the word side and the meaning side of a card */
function fcFaces(w) {
    const m = flashcardMode;
    const div = (cls, s) => s ? `<div class="${cls}">${escHtml(s)}</div>` : '';
    let word, meaning;
    if (m === 'trad-bopomofo') {
        word = div('fc-big', w.trad || w.word) + div('fc-sub', w.bopomofo);
        meaning = div('fc-big fc-mean', w.meaning) + div('fc-sub', w.english);
    } else if (m === 'simp-roman') {
        word = div('fc-big', w.simp || w.word) + div('fc-sub', w.roman);
        meaning = div('fc-big fc-mean', w.meaning) + div('fc-sub', w.english);
    } else {
        word = div('fc-big', w.word) + div('fc-sub', w.kana);
        meaning = div('fc-big fc-mean', m === 'en-meaning' ? (w.english || w.meaning) : w.meaning);
    }
    return fcReverse ? { front: meaning, back: word } : { front: word, back: meaning };
}

function renderFlashcard() {
    const box = document.getElementById('fc-session');
    if (!box || !flashcardList.length) return;
    const w = flashcardList[flashcardIdx];
    if (!w) return;
    const n = flashcardList.length;
    const faces = fcFaces(w);
    const speak = `<button type="button" class="fc-speak" onclick="event.stopPropagation(); fcSpeak()" aria-label="${escHtml(t('lc_play'))}">🔊</button>`;
    const state = flashcardKnownSet.has(fcKey(w)) ? `<span class="fc-was yes">${escHtml(t('fc_was_known'))}</span>`
        : flashcardUnknownSet.has(fcKey(w)) ? `<span class="fc-was no">${escHtml(t('fc_was_unknown'))}</span>` : '';
    box.innerHTML = `
        <div class="pc-top">
            <button type="button" class="back-btn pc-back" onclick="closeFlashcard()" aria-label="${escHtml(t('tool_back'))}">✕</button>
            <span class="pc-bar pc-progress"><i style="width:${flashcardIdx / n * 100}%"></i></span>
            <span class="pc-count">${flashcardIdx + 1} / ${n}</span>
        </div>
        <div class="fc-counts"><span class="fc-cnt no">← ${escHtml(t('fc_unknown_short'))} ${fcSession.unknown}</span><span class="fc-cnt yes">${escHtml(t('fc_known_short'))} ${fcSession.known} →</span></div>
        <div class="fc-scene">
            <div class="fc-stack" aria-hidden="true"></div>
            <div class="fc-card" id="fc-card" tabindex="0" role="button" aria-label="${escHtml(t('fc_flip'))}">
                <div class="fc-face fc-front">${speak}${state}${faces.front}<span class="fc-tap">${escHtml(t('fc_tap_hint'))}</span></div>
                <div class="fc-face fc-back">${speak}${faces.back}<span class="fc-tap">${escHtml(t('fc_swipe_hint'))}</span></div>
                <span class="fc-tag yes" aria-hidden="true">${escHtml(t('fc_known_short'))}</span>
                <span class="fc-tag no" aria-hidden="true">${escHtml(t('fc_unknown_short'))}</span>
            </div>
        </div>
        <div class="pc-two fc-rate">
            <button type="button" class="back-btn fc-no" onclick="flashcardRate(false)">✕ ${escHtml(t('fc_unknown_short'))}</button>
            <button type="button" class="back-btn fc-yes" onclick="flashcardRate(true)">✓ ${escHtml(t('fc_known_short'))}</button>
        </div>
        <p class="pc-tip fc-keys">${escHtml(t('fc_keys_hint'))}</p>`;
    fcBindSwipe(document.getElementById('fc-card'));
    // the word side on the front: say it (not when the front is the meaning — that would answer it)
    if (autoSpeak && !fcReverse) setTimeout(() => { if (flashcardList[flashcardIdx] === w) fcSpeak(); }, 300);
}

function fcSpeak() {
    const w = flashcardList[flashcardIdx];
    if (!w) return;
    const setId = w._set || flashcardSetId;
    currentLang = setId;
    if (isChineseQuizLang(setId)) zhCharType = flashcardMode === 'simp-roman' ? 'simp' : 'trad';
    currentWord = Object.assign({}, w, { word: isChineseQuizLang(setId) ? (zhCharType === 'simp' ? (w.simp || w.word) : (w.trad || w.word)) : w.word });
    speakWord();
}

function flipCard() {
    const card = document.getElementById('fc-card');
    if (card && !fcBusy) card.classList.toggle('flipped');
}

/* Drag the card sideways to rate it; a short tap flips it. */
function fcBindSwipe(card) {
    if (!card) return;
    let x0 = null, y0 = 0, dx = 0, id = null;
    const reset = () => { card.style.transform = ''; card.style.setProperty('--yes', 0); card.style.setProperty('--no', 0); card.classList.remove('dragging'); };
    card.addEventListener('pointerdown', e => {
        if (fcBusy || e.button > 0 || e.target.closest('.fc-speak')) return;
        x0 = e.clientX; y0 = e.clientY; dx = 0; id = e.pointerId;
    });
    card.addEventListener('pointermove', e => {
        if (x0 === null || e.pointerId !== id) return;
        dx = e.clientX - x0;
        if (Math.abs(dx) > 8 && !card.classList.contains('dragging')) {
            if (Math.abs(e.clientY - y0) > Math.abs(dx)) { x0 = null; return; }   // a scroll, not a swipe
            card.classList.add('dragging');
            try { card.setPointerCapture(id); } catch {}
        }
        if (!card.classList.contains('dragging')) return;
        const flipped = card.classList.contains('flipped') ? ' rotateY(180deg)' : '';
        card.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)${flipped}`;
        card.style.setProperty('--yes', Math.max(0, Math.min(1, dx / FC_SWIPE_PX)));
        card.style.setProperty('--no', Math.max(0, Math.min(1, -dx / FC_SWIPE_PX)));
    });
    const end = e => {
        if (x0 === null || e.pointerId !== id) return;
        const dragged = card.classList.contains('dragging');
        x0 = null;
        if (dragged && Math.abs(dx) >= FC_SWIPE_PX) { flashcardRate(dx > 0); return; }
        reset();
        if (!dragged && e.type === 'pointerup') flipCard();
    };
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', end);
}

function flashcardRate(known) {
    const w = flashcardList[flashcardIdx];
    if (!w || fcBusy) return;
    fcBusy = true;
    logDailyActivity();
    const key = fcKey(w);
    if (known) { flashcardKnownSet.add(key); flashcardUnknownSet.delete(key); fcSession.known++; }
    else { flashcardKnownSet.delete(key); flashcardUnknownSet.add(key); fcSession.unknown++; }
    saveFlashcardKnown();
    saveFlashcardUnknown();
    checkAchievements();

    // fly out to the side it was rated (inline, since a drag left an inline transform)
    const card = document.getElementById('fc-card');
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (card && !reduce) {
        const flipped = card.classList.contains('flipped') ? ' rotateY(180deg)' : '';
        card.classList.remove('dragging');
        card.classList.add('flying');
        card.style.transform = `translateX(${known ? '' : '-'}130%) rotate(${known ? 16 : -16}deg)${flipped}`;
        card.style.opacity = '0';
    }
    setTimeout(() => {
        fcBusy = false;
        flashcardIdx++;
        if (flashcardIdx >= flashcardList.length) fcFinish();
        else renderFlashcard();
    }, card && !reduce ? 260 : 0);
}

function fcFinish() {
    const box = document.getElementById('fc-session');
    const total = fcSession.known + fcSession.unknown;
    const pct = total ? Math.round(fcSession.known / total * 100) : 0;
    const again = fcSession.unknownReview ? 'reviewUnknownWords()' : `fcStartDeck('${flashcardSetId}')`;
    box.innerHTML = resultHeroHtml(pct, [
        { n: fcSession.known, label: t('fc_known_short'), cls: 'good' },
        { n: fcSession.unknown, label: t('fc_unknown_short'), cls: 'bad' },
        { n: practiceDuration(), label: t('result_time'), cls: 'time' }
    ]) + resultGoalHtml() + resultHookHtml(false) + `
        <div class="action-buttons rs-actions">
            <button type="button" class="next-btn" onclick="${again}">${escHtml(t('fc_next_round'))}</button>
            <button type="button" class="back-btn" onclick="showFlashcard()">${escHtml(t('fc_back_decks'))}</button>
        </div>`;
    window.scrollTo(0, 0);
    if (pct >= 60 && typeof mascotHop === 'function') setTimeout(() => mascotHop(box.querySelector('.rs-mascot')), 350);
}

function closeFlashcard() { showFlashcard(); }

function closeFlashcardSetup() { showOnlyQuizCard('lang-card'); renderPracticeHub(); }

/* keyboard on the card: space / Enter flips, → 會了, ← 還不熟 */
document.addEventListener('keydown', e => {
    const card = document.getElementById('flashcard-card');
    if (!card || card.style.display === 'none' || !document.getElementById('fc-card')) return;
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
    if ((e.key === ' ' || e.key === 'Enter') && !(e.target.closest && e.target.closest('button'))) { e.preventDefault(); flipCard(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); flashcardRate(true); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); flashcardRate(false); }
});

/* ----- the known / unknown word lists ----- */

function fcRenderList(cardId, contentId, set, cls) {
    const prefix = fcPrefix();
    fcListWords = [...set].filter(k => k.startsWith(prefix)).map(k => k.slice(prefix.length));
    const box = document.getElementById(contentId);
    box.innerHTML = fcListWords.length
        ? '<ul class="fc-list">' + fcListWords.map((w, i) => `<li class="${cls}"><span>${escHtml(w)}</span><button type="button" class="mb-del" onclick="fcRemoveFromList('${cardId}', ${i})" aria-label="${escHtml(t('mistake_delete'))}">✕</button></li>`).join('') + '</ul>'
        : `<p class="pc-note">${escHtml(t(cardId === 'mastered-list-card' ? 'fc_mastered_empty' : 'fc_unknown_empty'))}</p>`;
    showOnlyQuizCard(cardId);
}

function showMasteredList() { fcRenderList('mastered-list-card', 'mastered-list-content', flashcardKnownSet, 'yes'); }
function showUnknownList() { fcRenderList('unknown-list-card', 'unknown-list-content', flashcardUnknownSet, 'no'); }

function fcRemoveFromList(cardId, i) {
    const word = fcListWords[i];
    if (word === undefined) return;
    const key = fcPrefix() + word;
    if (cardId === 'mastered-list-card') { flashcardKnownSet.delete(key); saveFlashcardKnown(); showMasteredList(); }
    else { flashcardUnknownSet.delete(key); saveFlashcardUnknown(); showUnknownList(); }
}

function closeMasteredList() { showOnlyQuizCard('flashcard-setup-card'); renderFlashcardDecks(); }
function closeUnknownList() { closeMasteredList(); }

/* ===================== Result screen (shared) ===================== */

function practiceDuration() {
    if (!sessionStartedAt) return '—';
    const s = Math.max(0, Math.round((Date.now() - sessionStartedAt) / 1000));
    return Math.floor(s / 60) + ':' + pad2(s % 60);
}

function resultHeroHtml(pct, tiles) {
    const title = pct >= 90 ? 'result_great' : pct >= 60 ? 'result_good' : 'result_keep';
    let confetti = '';
    if (pct >= 60) {
        const cols = ['var(--primary)', 'var(--gold)', '#e8a4a0', 'var(--success)'];
        for (let i = 0; i < 22; i++) {
            confetti += `<i style="left:${(i * 37 + 11) % 100}%;top:${(i * 23) % 16}%;background:${cols[i % 4]};--r:${(i * 47) % 180}deg;animation-delay:${(i % 6) * 60}ms"></i>`;
        }
    }
    return `<div class="rs-hero">
        ${confetti ? `<div class="rs-confetti" aria-hidden="true">${confetti}</div>` : ''}
        <span class="rs-mascot">${practiceMascot('full')}</span>
        <h3 class="rs-title">${escHtml(t(title))}</h3>
    </div>
    <div class="pc-tiles rs-tiles">${tiles.map(x => `<div class="pc-tile ${x.cls || ''}"><b>${escHtml(String(x.n))}</b><span>${escHtml(x.label)}</span></div>`).join('')}</div>`;
}

function resultGoalHtml() {
    if (typeof getDailyGoal !== 'function') return '';
    const goal = getDailyGoal();
    const today = homeTodayCount();
    const left = Math.max(goal - today, 0);
    const streak = calcStreak(getQuizRecords());
    return `<div class="rs-goal${left === 0 ? ' done' : ''}">
        <span class="pc-ring rs-ring" style="--p:${Math.min(100, Math.round(today / goal * 100))}"><span>${today}/${goal}</span></span>
        <div><b>${escHtml(left === 0 ? t('result_goal_done') : t('result_goal_left', { n: left }))}</b><small>🔥 ${escHtml(t('result_streak', { n: streak }))}</small></div>
    </div>`;
}

/* the reason to come back: cards due now, tomorrow, or the next batch */
function resultHookHtml(afterSrs) {
    const now = Date.now();
    const cards = Object.values(getSrsQuizCards()).filter(c => c && c.due);
    const dueNow = cards.filter(c => c.due <= now).length;
    if (dueNow > 0 && !afterSrs) {
        return `<button type="button" class="rs-hook" onclick="showSrsDashboard()">🔁 <span>${escHtml(t('result_hook_now', { n: dueNow }))}</span></button>`;
    }
    const tomorrow = cards.filter(c => c.due > now && c.due <= now + DAY_MS).length;
    if (tomorrow > 0) return `<div class="rs-hook">🔔 <span>${escHtml(t('result_hook_tomorrow', { n: tomorrow }))}</span></div>`;
    const next = cards.filter(c => c.due > now).reduce((m, c) => Math.min(m, c.due), Infinity);
    if (next < Infinity) return `<div class="rs-hook">🔔 <span>${escHtml(t('result_hook_next', { when: practiceWhen(next) }))}</span></div>`;
    return '';
}

document.addEventListener('DOMContentLoaded', renderPracticeHub);
