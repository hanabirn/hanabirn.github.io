/* ===================== First-visit tour (replaces the old 教學手冊 page) =====================
   小花火 walks a new visitor through the site one step at a time, like a game
   tutorial: a spotlight cuts a hole in a dimmed screen around the feature and a
   speech card explains it. Each step names the elements it can point at, best
   first — the desktop nav, else the phone tab bar or its "More" button — and
   falls back to a centred card when none is visible (e.g. hidden in settings).

   It starts by itself only for a first visit (no tour_done and no practice data,
   so existing visitors aren't interrupted) and can be replayed from the
   settings panel or the phone "More" sheet (startTour). */

const TOUR_STEPS = [
    { key: 'welcome' },
    { key: 'goal', targets: ['#page-home .home-goal'] },
    { key: 'start', targets: ['#home-continue'] },
    { key: 'quiz', targets: ['.main-nav .nav-btn[data-tab="quiz"]', '.tabbar .nav-btn[data-tab="quiz"]'] },
    { key: 'exam', targets: ['.main-nav .nav-btn[data-tab="examquiz"]', '.tabbar .nav-btn[data-tab="examquiz"]'] },
    { key: 'review', targets: ['#home-srs-card'] },
    { key: 'dict', targets: ['.main-nav .nav-btn[data-tab="dict"]', '#tabbar-more'] },
    { key: 'alphabet', targets: ['.main-nav .nav-btn[data-tab="alphabet"]', '#tabbar-more'] },
    { key: 'notes', targets: ['.main-nav .nav-btn[data-tab="notes"]', '.tabbar .nav-btn[data-tab="notes"]'] },
    { key: 'settings', targets: ['#tab-settings-btn', '#tabbar-more'] },
    { key: 'lang', targets: ['#lang-globe-btn'] },
    { key: 'done' }
];

let tourIdx = 0;
let tourEl = null;
let tourTarget = null;
let tourFrame = 0;

function tourVisible(el) {
    if (!el || !el.getClientRects().length) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none';
}

function tourFindTarget(step) {
    for (const sel of step.targets || []) {
        const el = document.querySelector(sel);
        if (tourVisible(el)) return el;
    }
    return null;
}

function tourBuild() {
    const el = document.createElement('div');
    el.className = 'tour';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'tour-title');
    el.innerHTML = `
        <div class="tour-shade"></div>
        <div class="tour-spot" aria-hidden="true"></div>
        <div class="tour-card">
            <div class="tour-mascot" aria-hidden="true"></div>
            <div class="tour-count" id="tour-count"></div>
            <h3 class="tour-title" id="tour-title"></h3>
            <p class="tour-text" id="tour-text"></p>
            <div class="tour-dots" aria-hidden="true">${TOUR_STEPS.map(() => '<i></i>').join('')}</div>
            <div class="tour-actions">
                <button type="button" class="tour-skip" onclick="endTour()"></button>
                <button type="button" class="back-btn tour-prev" onclick="tourGo(-1)"></button>
                <button type="button" class="next-btn tour-next" onclick="tourGo(1)"></button>
            </div>
            <div class="tour-burst" aria-hidden="true"></div>
        </div>`;
    if (typeof mascotHtml === 'function') el.querySelector('.tour-mascot').innerHTML = mascotHtml('bust');
    document.body.appendChild(el);
    return el;
}

function tourRender() {
    const step = TOUR_STEPS[tourIdx];
    const last = tourIdx === TOUR_STEPS.length - 1;
    tourTarget = tourFindTarget(step);
    const inMore = tourTarget && tourTarget.id === 'tabbar-more';

    tourEl.querySelector('#tour-count').textContent = t('tour_step', { n: tourIdx + 1, m: TOUR_STEPS.length });
    tourEl.querySelector('#tour-title').textContent = t('tour_' + step.key + '_title');
    tourEl.querySelector('#tour-text').textContent = t('tour_' + step.key + '_text') + (inMore ? ' ' + t('tour_in_more') : '');
    tourEl.querySelectorAll('.tour-dots i').forEach((d, i) => {
        d.classList.toggle('on', i === tourIdx);
        d.classList.toggle('past', i < tourIdx);
    });
    const skip = tourEl.querySelector('.tour-skip');
    const prev = tourEl.querySelector('.tour-prev');
    const next = tourEl.querySelector('.tour-next');
    skip.textContent = t('tour_skip');
    skip.hidden = last;
    prev.textContent = t('tour_prev');
    prev.hidden = tourIdx === 0;
    next.textContent = last ? t('tour_done') : tourIdx === 0 ? t('tour_go') : t('tour_next');
    tourEl.classList.toggle('has-target', !!tourTarget);
    tourEl.classList.toggle('finale', last);

    // replay the pop-in for every step
    const card = tourEl.querySelector('.tour-card');
    card.classList.remove('pop');
    void card.offsetWidth;
    card.classList.add('pop');

    if (tourTarget && tourTarget.closest('main')) tourTarget.scrollIntoView({ block: 'center' });
    tourPlace();
    next.focus({ preventScroll: true });
    if (typeof mascotTalk === 'function') mascotTalk(tourEl.querySelector('.tour-mascot'), 900);
}

/* The spotlight hugs the target; the card goes below it, or above when there
   isn't room (the phone tab bar), or in the middle without a target. */
function tourPlace() {
    if (!tourEl) return;
    const spot = tourEl.querySelector('.tour-spot');
    const card = tourEl.querySelector('.tour-card');
    const vw = window.innerWidth, vh = window.innerHeight, m = 12, gap = 16;
    const cw = card.offsetWidth, ch = card.offsetHeight;
    if (!tourTarget || !tourVisible(tourTarget)) {
        card.style.left = Math.max(m, (vw - cw) / 2) + 'px';
        card.style.top = Math.max(m, (vh - ch) / 2) + 'px';
        return;
    }
    const r = tourTarget.getBoundingClientRect();
    const pad = 6;
    spot.style.left = (r.left - pad) + 'px';
    spot.style.top = (r.top - pad) + 'px';
    spot.style.width = (r.width + pad * 2) + 'px';
    spot.style.height = (r.height + pad * 2) + 'px';
    let top;
    if (r.bottom + pad + gap + ch <= vh - m) top = r.bottom + pad + gap;
    else if (r.top - pad - gap - ch >= m) top = r.top - pad - gap - ch;
    else top = Math.max(m, vh - ch - m);
    const left = Math.min(Math.max(m, r.left + r.width / 2 - cw / 2), vw - cw - m);
    card.style.left = left + 'px';
    card.style.top = top + 'px';
}

function tourOnMove() {
    cancelAnimationFrame(tourFrame);
    tourFrame = requestAnimationFrame(tourPlace);
}

function tourOnKey(e) {
    if (!tourEl) return;
    if (e.key === 'Escape') endTour();
    else if (e.key === 'ArrowRight') tourGo(1);
    else if (e.key === 'ArrowLeft' && tourIdx > 0) tourGo(-1);
}

function tourGo(dir) {
    if (dir > 0 && tourIdx === TOUR_STEPS.length - 1) return endTour();
    tourIdx = Math.max(0, Math.min(TOUR_STEPS.length - 1, tourIdx + dir));
    tourRender();
}

function startTour() {
    if (tourEl) return;
    // the tour points at the home dashboard and the nav, so start from home
    if (document.body.dataset.page !== 'home' && typeof switchPage === 'function') switchPage('home', null);
    if (typeof closeMoreSheet === 'function') closeMoreSheet();
    tourIdx = 0;
    setTimeout(() => {
        tourEl = tourBuild();
        window.addEventListener('resize', tourOnMove);
        window.addEventListener('scroll', tourOnMove, true);
        document.addEventListener('keydown', tourOnKey);
        tourRender();
        requestAnimationFrame(() => tourEl.classList.add('show'));
    }, 200);
}

function endTour() {
    try { localStorage.setItem('tour_done', '1'); } catch {}
    if (!tourEl) return;
    window.removeEventListener('resize', tourOnMove);
    window.removeEventListener('scroll', tourOnMove, true);
    document.removeEventListener('keydown', tourOnKey);
    const el = tourEl;
    tourEl = null;
    tourTarget = null;
    el.classList.remove('show');
    setTimeout(() => el.remove(), 250);
    window.scrollTo(0, 0);
}

// a first visit: never toured and nothing practised yet
function tourIsFirstVisit() {
    try {
        if (localStorage.getItem('tour_done')) return false;
        return !['daily_activity', 'quiz_records', 'quiz_mistakes', 'path_progress_v2', 'srs_quiz']
            .some(k => localStorage.getItem(k));
    } catch { return false; }
}

document.addEventListener('DOMContentLoaded', () => {
    // after the splash screen (gone at ~800 ms)
    if (tourIsFirstVisit()) setTimeout(startTour, 1000);
});
