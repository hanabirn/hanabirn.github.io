/* ===== Home dashboard (#page-home) =====
   Everything here is derived from what js/quiz.js already stores locally:
   daily_activity (words practised per day) and calcStreak() for the goal ring,
   week dots and streak; last_quiz_set for "continue"; srs_quiz and
   quiz_mistakes for the review cards; quiz_records for "recent practice".
   The only new key is daily_goal. renderHome() runs on load, whenever the
   home page is opened, and on every language switch (refreshDynamicContent). */

const DAILY_GOAL_CHOICES = [10, 20, 30, 50];
const DAILY_GOAL_DEFAULT = 20;

function getDailyGoal() {
    const n = parseInt(localStorage.getItem('daily_goal'), 10);
    return DAILY_GOAL_CHOICES.includes(n) ? n : DAILY_GOAL_DEFAULT;
}

function cycleDailyGoal() {
    const i = DAILY_GOAL_CHOICES.indexOf(getDailyGoal());
    const next = DAILY_GOAL_CHOICES[(i + 1) % DAILY_GOAL_CHOICES.length];
    try { localStorage.setItem('daily_goal', String(next)); } catch {}
    renderHome();
}

function homeTodayCount() {
    return getDailyActivity()[activityDayKey(Date.now())] || 0;
}

/* SRS cards are created by answering quiz questions (quiz.js gradeSrsQuizCard). */
function homeSrsDueCount() {
    return srsQuizDueCount();
}

function homeGreetingKey() {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'home_greet_morning';
    if (h >= 12 && h < 18) return 'home_greet_afternoon';
    return 'home_greet_evening';
}

/* Last 7 days ending today, oldest first, with the weekday initial in the
   site language (Intl falls back to the browser's own locale names). */
function homeWeekHtml() {
    const act = getDailyActivity();
    const recDays = new Set(getQuizRecords().map(r => activityDayKey(r.date)));
    let fmt;
    try { fmt = new Intl.DateTimeFormat(siteLang, { weekday: 'narrow' }); }
    catch { fmt = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' }); }
    let html = '';
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setHours(12, 0, 0, 0);
        d.setDate(d.getDate() - i);
        const key = activityDayKey(d.getTime());
        const done = (act[key] || 0) > 0 || recDays.has(key);
        const cls = (done ? 'on' : '') + (i === 0 ? ' today' : '');
        html += `<i class="${cls.trim()}">${escHtml(fmt.format(d))}</i>`;
    }
    return html;
}

/* Up to 3 distinct word sets, most recent first, with that set's last score.
   The set last opened (last_quiz_set) leads even before any quiz on it was
   finished; it has no score yet, so pct is null and no bar is drawn. */
function homeRecentSets() {
    const seen = new Set();
    const out = [];
    const last = localStorage.getItem('last_quiz_set');
    const recs = getQuizRecords().slice().sort((a, b) => b.date - a.date);
    if (QUIZ_LANG_ORDER.includes(last)) {
        const lastRec = recs.find(r => r && r.lang === last);
        out.push(lastRec || { lang: last, pct: null });
        seen.add(last);
    }
    for (const r of recs) {
        if (!r || !QUIZ_LANG_ORDER.includes(r.lang) || seen.has(r.lang)) continue;
        seen.add(r.lang);
        out.push(r);
        if (out.length === 3) break;
    }
    return out;
}

function homeSetBadge(id) {
    if (isJapaneseQuizLang(id)) return '日';
    if (isKoreanQuizLang(id)) return '韓';
    if (isChineseQuizLang(id)) return '中';
    if (isFrenchQuizLang(id)) return 'Fr';
    if (isRussianQuizLang(id)) return 'Ru';
    if (isSpanishQuizLang(id)) return 'Es';
    if (isGermanQuizLang(id)) return 'De';
    if (isEnglishQuizLang(id)) return 'En';
    return '・';
}

function renderHome() {
    const page = document.getElementById('page-home');
    if (!page) return;

    const goal = getDailyGoal();
    const today = homeTodayCount();
    const left = Math.max(goal - today, 0);
    const streak = calcStreak(getQuizRecords());
    const everPractised = today > 0 || streak > 0 || getQuizRecords().length > 0
        || Object.keys(getDailyActivity()).length > 0;

    // mascot speech bubble
    document.getElementById('home-greet').textContent = t(homeGreetingKey());
    let msg;
    if (!everPractised) msg = t('home_msg_first');
    else if (left === 0) msg = t('home_msg_done');
    else if (today === 0 && streak > 0) msg = t('home_msg_keep', { n: streak });
    else msg = t('home_msg_left', { n: left });
    document.getElementById('home-msg').textContent = msg;

    // streak chip
    document.getElementById('home-streak-n').textContent = streak;
    document.getElementById('home-streak').classList.toggle('cold', streak === 0);

    // 今天: the ring, the steps and one button to the first one not done
    const ring = document.getElementById('home-ring');
    ring.style.setProperty('--p', Math.min(100, Math.round(today / goal * 100)));
    ring.classList.toggle('done', left === 0);
    document.getElementById('home-goal-done').textContent = today;
    document.getElementById('home-goal-total').textContent = '/' + goal;
    document.getElementById('home-week').innerHTML = homeWeekHtml();
    const steps = homeTodaySteps(goal, today);
    const open = steps.filter(x => !x.done);
    document.getElementById('home-today-left').textContent =
        open.length ? t('home_today_left', { n: open.length }) : t('home_today_done');
    document.getElementById('home-steps').innerHTML = steps.map((x, i) => `
        <li class="home-step${x.done ? ' done' : x === open[0] ? ' next' : ''}">
            <span class="home-step-ck" aria-hidden="true">${x.done ? '✓' : i + 1}</span>
            <span class="home-step-text">${escHtml(x.title)}${x.sub ? `<small>${escHtml(x.sub)}</small>` : ''}</span>
        </li>`).join('');
    const cont = document.getElementById('home-continue');
    homeNextStep = open[0] || null;
    const last = localStorage.getItem('last_quiz_set');
    cont.textContent = '▶ ' + (homeNextStep ? homeNextStep.title
        : QUIZ_LANG_ORDER.includes(last) ? t('home_more', { name: wordSetName(last) }) : t('home_start'));

    // 繼續上次的: recent word sets, then where the 學習 pages were left in the learning language
    const recent = homeRecentSets();
    const recentEl = document.getElementById('home-recent');
    const sets = recent.map(r => {
        /* path progress when the set's word count is known (cached), else the last score */
        const path = pathSummary(r.lang);
        const fill = path ? Math.round(path.done / path.levels * 100) : r.pct;
        const note = path ? t('home_path_progress', { n: path.done, m: path.levels })
            : typeof r.pct === 'number' ? r.pct + '%' : '';
        return homeCourseHtml(`homeOpenSet('${r.lang}')`, homeSetBadge(r.lang), wordSetName(r.lang), fill, note);
    });
    recentEl.innerHTML = sets.concat(homeLearnChips()).join('') || `<p class="home-empty">${escHtml(t('home_recent_empty'))}</p>`;
    document.getElementById('home-beginner').hidden = everPractised;
}

function homeCourseHtml(onclick, badge, name, fill, note) {
    return `
            <button class="lang-btn home-course" onclick="${onclick}">
                <span class="home-course-badge">${badge}</span>
                <span class="home-course-name">${escHtml(name)}</span>
                ${typeof fill === 'number' ? `
                <span class="home-course-bar"><i style="width:${Math.max(0, Math.min(100, fill))}%"></i></span>` : ''}
                ${note ? `<small>${escHtml(note)}</small>` : ''}
            </button>`;
}

/* ----- 今天 (proposal B, 2026-10-17) -----
   In order: the cards due now (a batch of SRS_REVIEW_LIMIT), the daily goal, and the
   open mistakes when there are any. A step is done when nothing is left of it; the
   button goes to the first one that isn't. */
let homeNextStep = null;

function homeTodaySteps(goal, today) {
    const steps = [];
    const due = homeSrsDueCount();
    if (Object.keys(getSrsQuizCards()).length > 0) {
        const k = Math.min(due, SRS_REVIEW_LIMIT);
        steps.push(due > 0
            ? { title: t('home_step_review', { n: k }), sub: due > k ? t('home_step_review_sub', { n: due }) : '', go: homeOpenSrs }
            : { title: t('home_step_review_done'), done: true });
    }
    const last = localStorage.getItem('last_quiz_set');
    const left = Math.max(goal - today, 0);
    steps.push(left > 0
        ? { title: t('home_step_goal', { n: goal }), sub: t('home_step_goal_sub', { n: left }) + (QUIZ_LANG_ORDER.includes(last) ? ' · ' + wordSetName(last) : ''), go: homeContinue }
        : { title: t('home_step_goal_done'), done: true });
    const mistakes = getActiveMistakes().length;   // repaired ones don't count
    if (mistakes > 0) steps.push({ title: t('home_step_mistakes'), sub: t('home_step_mistakes_sub', { n: mistakes }), go: homeOpenMistakes });
    // starred notes due for another look (js/notes.js)
    const notes = typeof notesDueCount === 'function' ? notesDueCount() : 0;
    if (notes > 0) steps.push({ title: t('home_step_notes', { n: notes }), sub: t('home_step_notes_sub'), go: () => { switchPage('notes'); notesStartReview(); } });
    return steps;
}

function homeTodayGo() {
    if (homeNextStep && homeNextStep.go) homeNextStep.go();
    else homeContinue();
}

/* Where the 文法 / 閱讀 / 聽解 pages were left in the learning language: the level used
   last there (learn_last_levels) with how much of it is done. The pages' index files
   are small; the first render fetches the ones not loaded yet and draws again. */
const HOME_LEARN_PAGES = [
    { page: 'grammar', name: 'nav_grammar', badge: '文', url: 'data/grammar/index.json',
      index: () => grammarIndex, set: v => { grammarIndex = v; }, prog: () => grammarProgress(), pass: () => GRAMMAR_PASS },
    { page: 'reading', name: 'nav_reading', badge: '讀', url: 'data/reading/index.json',
      index: () => readingIndex, set: v => { readingIndex = v; }, prog: () => readingProgress(), pass: () => READING_PASS },
    { page: 'listening', name: 'nav_listening', badge: '聽', url: 'data/listening/index.json',
      index: () => listeningIndex, set: v => { listeningIndex = v; }, prog: () => listeningProgress(), pass: () => LISTENING_PASS },
];
let homeLearnFetching = false;

function homeLearnChips() {
    const lang = typeof learnLang === 'function' ? learnLang() : '';
    if (!lang) return [];
    const last = learnLastLevels();
    const used = HOME_LEARN_PAGES.filter(p => last[p.page + ':' + lang]);   // pages opened in this language
    const missing = used.filter(p => !p.index());
    if (missing.length && !homeLearnFetching) {
        homeLearnFetching = true;
        Promise.all(missing.map(p => fetch(p.url).then(r => r.json()).then(v => { if (!p.index()) p.set(v); }).catch(() => {})))
            .then(() => { homeLearnFetching = false; renderHome(); });
    }
    return used.map(p => {
        const index = p.index();
        const set = index && index.find(s => s.id === last[p.page + ':' + lang]);
        if (!set) return '';
        const n = learnDoneCount(p.prog(), set.id, p.pass()), m = set.count || 0;
        return homeCourseHtml(`switchPage('${p.page}', null)`, p.badge, t(p.name) + ' ' + learnLevelName(set.level),
            m ? Math.round(n / m * 100) : null, m ? n + ' / ' + m : '');
    });

}

/* ----- navigation out of the dashboard ----- */

/* Reset #page-quiz to its language card (backToLanguage() hides whatever
   card a previous session left open), then open it. currentLang is cleared
   first so backToLanguage() doesn't bounce to the exam picker. */
function homeResetQuizPage() {
    currentLang = '';
    reviewMode = false; // so backToLanguage() doesn't route an unfinished SRS review home
    currentListeningMode = false; // ... nor a listening round to its setup page
    backToLanguage();
    switchPage('quiz', null);
}

function homeOpenSet(id) {
    if (!QUIZ_LANG_ORDER.includes(id)) return;
    homeResetQuizPage();
    selectWordSet(id);
}

function homeContinue() {
    const last = localStorage.getItem('last_quiz_set');
    if (QUIZ_LANG_ORDER.includes(last)) homeOpenSet(last);
    else homeResetQuizPage();
}

function homeOpenSrs() {
    if (srsQuizDueCount() === 0) {
        showShareToast(t('srs_all_done'));
        return;
    }
    homeResetQuizPage();
    startSrsQuizReview();
}

function homeOpenMistakes() {
    homeResetQuizPage();
    showMistakeBook();
}

document.addEventListener('DOMContentLoaded', renderHome);
