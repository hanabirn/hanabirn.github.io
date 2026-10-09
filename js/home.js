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

    // daily goal ring + week
    const ring = document.getElementById('home-ring');
    ring.style.setProperty('--p', Math.min(100, Math.round(today / goal * 100)));
    ring.classList.toggle('done', left === 0);
    document.getElementById('home-goal-done').textContent = today;
    document.getElementById('home-goal-total').textContent = '/' + goal;
    document.getElementById('home-goal-left').textContent =
        left === 0 ? t('home_goal_done') : t('home_goal_left', { n: left });
    document.getElementById('home-week').innerHTML = homeWeekHtml();

    // continue button
    const last = localStorage.getItem('last_quiz_set');
    const cont = document.getElementById('home-continue');
    cont.textContent = QUIZ_LANG_ORDER.includes(last)
        ? '▶ ' + t('home_continue', { name: wordSetName(last) })
        : '▶ ' + t('home_start');

    // spaced review
    const due = homeSrsDueCount();
    document.getElementById('home-srs-count').textContent = due > 0 ? t('home_srs_count', { n: due }) : t('home_srs_none');
    document.getElementById('home-srs-hint').style.display = due > 0 ? '' : 'none';
    document.getElementById('home-srs-card').classList.toggle('quiet', due === 0);

    // mistakes
    const mistakes = getActiveMistakes().length;   // repaired ones don't count
    document.getElementById('home-mistakes-count').textContent =
        mistakes > 0 ? t('home_mistakes_count', { n: mistakes }) : t('home_mistakes_none');
    document.getElementById('home-mistakes-card').classList.toggle('quiet', mistakes === 0);

    // recent practice
    const recent = homeRecentSets();
    const recentEl = document.getElementById('home-recent');
    if (recent.length === 0) {
        recentEl.innerHTML = `<p class="home-empty">${escHtml(t('home_recent_empty'))}</p>`;
    } else {
        /* path progress when the set's word count is known (cached), else the last score */
        recentEl.innerHTML = recent.map(r => {
            const path = pathSummary(r.lang);
            const fill = path ? Math.round(path.done / path.levels * 100) : r.pct;
            const note = path ? t('home_path_progress', { n: path.done, m: path.levels })
                : typeof r.pct === 'number' ? r.pct + '%' : '';
            return `
            <button class="lang-btn home-course" onclick="homeOpenSet('${r.lang}')">
                <span class="home-course-badge">${homeSetBadge(r.lang)}</span>
                <span class="home-course-name">${escHtml(wordSetName(r.lang))}</span>
                ${typeof fill === 'number' ? `
                <span class="home-course-bar"><i style="width:${Math.max(0, Math.min(100, fill))}%"></i></span>` : ''}
                ${note ? `<small>${escHtml(note)}</small>` : ''}
            </button>`;
        }).join('');
    }
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

/* show*Levels() only hide the exam picker, so a level card left open from an
   earlier visit (say TOPIK) would stay up next to the one asked for. */
function homeOpenExam(kind) {
    switchPage('examquiz', null);
    hideExamLevelCards();
    if (kind === 'jlpt') showJlptLevels();
    else if (kind === 'topik') showTopikLevels();
    else if (kind === 'hsk') showHskLevels();
    else if (kind === 'english') showEnglishExamLevels();
}

document.addEventListener('DOMContentLoaded', renderHome);
