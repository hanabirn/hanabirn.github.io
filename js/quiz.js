applyLang(siteLang);

/* localStorage.setItem for learning progress. When the ~5 MB quota is full, the
   word-list caches (quiz_cache_*: offline copies that can be fetched again) are
   dropped, biggest first, keeping the set in use, until the write fits — so a full
   storage never loses progress or throws in the middle of a result screen.
   Returns whether the value was stored. */
function storeSet(key, value) {
    try { localStorage.setItem(key, value); return true; } catch {}
    try {
        const keep = 'quiz_cache_' + currentLang;
        const caches = Object.keys(localStorage)
            .filter(k => k.startsWith('quiz_cache_') && k !== key && k !== keep)
            .sort((a, b) => localStorage.getItem(b).length - localStorage.getItem(a).length);
        for (const k of caches) {
            localStorage.removeItem(k);
            try { localStorage.setItem(key, value); return true; } catch {}
        }
    } catch {}
    return false;
}

/* ----- a page's intro line (proposal E, 2026-10-17) -----
   Shown under the title the first times a page is opened, with 知道了; after that it
   folds into an ⓘ beside the title that brings it back. Which ones were folded is kept
   per device (intro_seen), not synced. key = the intro's i18n key. */
function introSeen(key) {
    try { return (JSON.parse(localStorage.getItem('intro_seen')) || []).includes(key); } catch { return false; }
}

function introHtml(key, force) {
    if (introSeen(key) && !force) return '';
    return `<div class="page-intro" data-intro="${key}"><span>${escHtml(t(key))}</span>`
        + `<button type="button" class="page-intro-ok" onclick="introDismiss('${key}')">${escHtml(t('intro_ok'))}</button></div>`;
}

function introInfoBtn(key) {
    if (!introSeen(key)) return '';
    return `<button type="button" class="intro-info" onclick="introShow('${key}', this)" aria-label="${escHtml(t('intro_info'))}" title="${escHtml(t('intro_info'))}">i</button>`;
}

function introDismiss(key) {
    let seen = [];
    try { seen = JSON.parse(localStorage.getItem('intro_seen')) || []; } catch {}
    if (!seen.includes(key)) seen.push(key);
    try { localStorage.setItem('intro_seen', JSON.stringify(seen)); } catch {}
    document.querySelectorAll(`.page-intro[data-intro="${key}"]`).forEach(el => el.remove());
    refreshDynamicContent();
}

// the ⓘ: the intro again, right under the title, until 知道了
function introShow(key, btn) {
    const head = btn.closest('h3');
    if (!head || document.querySelector(`.page-intro[data-intro="${key}"]`)) return;
    head.insertAdjacentHTML('afterend', introHtml(key, true));
}

/* ----- interface icons (proposal D, 2026-10-17) -----
   Line icons in the navigation's style for controls, instead of emoji (🔊 ⚠ 📄 📕 🌏);
   emoji stay in content (topic tiles, the alphabet's example words). */
const UI_ICONS = {
    speaker: 'M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z',
    warning: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z',
    document: 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z',
    book: 'M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25',
    globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3M3.6 9h16.8M3.6 15h16.8',
    // the notepad (js/notes.js)
    plus: 'M12 4.5v15m7.5-7.5h-15',
    search: 'm21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z',
    star: 'M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z',
    pin: 'M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z',
    trash: 'm14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0',
    folder: 'M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z',
    tag: 'M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3ZM6 6h.008v.008H6V6Z',
    dots: 'M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z',
    back: 'M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18',
    pencil: 'm16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10',
    clip: 'm18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13',
    photo: 'm2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z',
    cloud: 'M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z',
    cards: 'M6 6.878V6a2.25 2.25 0 0 1 2.25-2.25h7.5A2.25 2.25 0 0 1 18 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 0 0 4.5 9v.878m13.5-3A2.25 2.25 0 0 1 19.5 9v.878m0 0a2.246 2.246 0 0 0-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0 1 21 12v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6c0-.98.626-1.813 1.5-2.122',
    uturn: 'M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3',
    download: 'M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3',
    upload: 'M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5',
    grid: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z'
};

function uiIcon(name) {
    return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${UI_ICONS[name]}"/></svg>`;
}

/* Pages reached from the phone tab bar's 學習 / 更多 sheets rather than a tab of their own. */
const LEARN_TABS = ['grammar', 'reading', 'listening'];
const MORE_TABS = ['dict', 'alphabet', 'notes', 'guestbook', 'feedback', 'about'];

/* `el` is kept for the existing onclick="switchPage('x', this)" call sites, but the
   active state is set by data-tab, because each page has a button in the desktop
   nav AND in the phone tab bar / More sheet and both must stay in sync. */
let pageTarget = 'home';   // the page being opened (body[data-page] follows 120 ms later)

function switchPage(page, el) {
    // the 檢定 page became the 單字 page's 檢定等級 tab (2026-10-17)
    if (page === 'examquiz') { openWords('levels'); return; }
    pageTarget = page;
    document.querySelectorAll('.nav-btn').forEach(b => {
        const on = b.dataset.tab === page;
        b.classList.toggle('active', on);
        if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    const more = document.getElementById('tabbar-more');
    if (more) more.classList.toggle('active', MORE_TABS.includes(page));
    const learn = document.getElementById('tabbar-learn');
    if (learn) learn.classList.toggle('active', LEARN_TABS.includes(page));
    // a desktop dropdown (學習 ▾ / 工具 ▾ / ☰) lights up when one of its pages is open
    document.querySelectorAll('.nav-group, .site-menu').forEach(g =>
        g.classList.toggle('has-active', !!g.querySelector(`.nav-btn[data-tab="${page}"]`)));
    if (typeof closeNavMenus === 'function') closeNavMenus();
    if (typeof closeMoreSheet === 'function') closeMoreSheet();
    if (page === 'quiz') {
        // 單字 in the navigation while 複習 is on screen: back to the word sets
        if (el && el.dataset && el.dataset.tab === 'quiz' && quizReviewShown()) {
            stopTimer();
            endReviewState();
            currentLang = '';
            showOnlyQuizCard('lang-card');
        }
        quizNavMark();
    }

    // a page change silences whatever is playing (a 聽解 item, read-all on 閱讀)
    if (typeof listeningStop === 'function') listeningStop();
    else if (typeof stopSpeech === 'function') stopSpeech();

    const pages = ['home', 'about', 'quiz', 'grammar', 'reading', 'listening', 'dict', 'alphabet', 'notes', 'guestbook', 'feedback'];
    const main = document.querySelector('main');
    main.style.transition = 'opacity 120ms ease-out';
    main.style.opacity = '0';

    setTimeout(() => {
        // '' rather than 'block' so a page's own CSS can lay it out (the
        // dictionary is a grid on desktop); body[data-page] lets CSS widen pages
        pages.forEach(p => {
            const el = document.getElementById('page-' + p);
            if (el) el.style.display = p === page ? '' : 'none';
        });
        document.body.dataset.page = page;
        main.style.opacity = '1';
        window.scrollTo(0, 0);
        if (page === 'home' && typeof renderHome === 'function') renderHome();
        if (page === 'guestbook') loadGuestbookMessages();
        if (page === 'notes') renderNotes();
        if (page === 'grammar' && typeof renderGrammar === 'function') renderGrammar();
        if (page === 'reading' && typeof renderReading === 'function') renderReading();
        if (page === 'listening' && typeof renderListening === 'function') renderListening();
        if (typeof railsOnPage === 'function') railsOnPage(page);
    }, 120);
}

/* ===================== Tab Visibility Settings ===================== */

const ALL_TABS = ['home', 'quiz', 'review', 'grammar', 'reading', 'listening', 'dict', 'alphabet', 'notes', 'about', 'guestbook', 'feedback'];
const LOCKED_TABS = ['home'];

function getTabVisibility() {
    const v = {};
    ALL_TABS.forEach(k => v[k] = true);
    try {
        const saved = JSON.parse(localStorage.getItem('nav_tab_visibility'));
        if (saved && typeof saved === 'object') {
            ALL_TABS.forEach(k => { if (saved[k] === false) v[k] = false; });
        }
    } catch {}
    LOCKED_TABS.forEach(k => v[k] = true);
    return v;
}

function saveTabVisibility(v) {
    storeSet('nav_tab_visibility', JSON.stringify(v));
}

function applyTabVisibility() {
    const v = getTabVisibility();

    ALL_TABS.forEach(key => {
        document.querySelectorAll(`.nav-btn[data-tab="${key}"]`).forEach(btn => {
            btn.style.display = v[key] ? '' : 'none';
        });
    });
    // a dropdown / the 學習 tab with every page hidden goes too
    document.querySelectorAll('.nav-group').forEach(g => {
        g.style.display = [...g.querySelectorAll('.nav-btn[data-tab]')].some(b => v[b.dataset.tab]) ? '' : 'none';
    });
    const learnTab = document.getElementById('tabbar-learn');
    if (learnTab) learnTab.style.display = LEARN_TABS.some(k => v[k]) ? '' : 'none';

    const activeBtn = document.querySelector('.nav-btn.active');
    const activeKey = activeBtn && activeBtn.dataset.tab;
    if (activeKey && !v[activeKey]) {
        const firstVisible = ALL_TABS.find(k => v[k]);
        const btn = document.querySelector(`.nav-btn[data-tab="${firstVisible}"]`);
        if (btn) switchPage(firstVisible, btn);
    }
}

function renderTabSettingsList() {
    const v = getTabVisibility();
    const container = document.getElementById('tab-settings-list');
    if (!container) return;
    container.innerHTML = ALL_TABS.map(key => {
        const label = t('nav_' + key) || key;
        if (LOCKED_TABS.includes(key)) {
            return `<label class="tab-settings-item locked" title="${t('tab_settings_locked')}">
                <input type="checkbox" checked disabled>
                <span>${label}</span>
                <span class="tab-settings-lock">&#x1F512;</span>
            </label>`;
        }
        return `<label class="tab-settings-item">
            <input type="checkbox" data-tab-key="${key}" ${v[key] ? 'checked' : ''} onchange="onTabSettingChange(this)">
            <span>${label}</span>
        </label>`;
    }).join('');
}

function onTabSettingChange(input) {
    const key = input.dataset.tabKey;
    const v = getTabVisibility();
    v[key] = input.checked;
    saveTabVisibility(v);
    applyTabVisibility();
}

function toggleTabSettings() {
    const overlay = document.getElementById('tab-settings-overlay');
    if (!overlay) return;
    const show = !overlay.classList.contains('show');
    if (show) {
        renderTabSettingsList();
        if (typeof renderTtsSettings === 'function') renderTtsSettings();
    }
    overlay.classList.toggle('show', show);
}

function resetTabSettings() {
    const v = {};
    ALL_TABS.forEach(k => v[k] = true);
    saveTabVisibility(v);
    applyTabVisibility();
    renderTabSettingsList();
}

function copyTabSettingsLink() {
    const v = getTabVisibility();
    const visible = ALL_TABS.filter(k => v[k]);
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('tabs', visible.join(','));
    const link = url.toString();
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link)
            .then(() => showShareToast(t('tab_settings_copied')))
            .catch(() => prompt(t('tab_settings_copy'), link));
    } else {
        prompt(t('tab_settings_copy'), link);
    }
}

function initTabVisibility() {
    const params = new URLSearchParams(location.search);
    const tabsParam = params.get('tabs');
    if (tabsParam !== null) {
        const requested = tabsParam.split(',').map(s => s.trim()).filter(k => ALL_TABS.includes(k));
        const v = {};
        ALL_TABS.forEach(k => v[k] = requested.includes(k));
        LOCKED_TABS.forEach(k => v[k] = true);
        saveTabVisibility(v);
        params.delete('tabs');
        const cleanUrl = location.pathname + (params.toString() ? '?' + params.toString() : '') + location.hash;
        history.replaceState(null, '', cleanUrl);
    }
    applyTabVisibility();
}

const SHEETS = {
    jp: 'https://docs.google.com/spreadsheets/d/134jLu-WAoCx7VK7aTsnEYbWJPQPA56Su2Vsez3jFRPw/export?format=csv&gid=0',
    kr: 'https://docs.google.com/spreadsheets/d/1BsO7tpzFgO39AyBo2SV1RZFDWfPECB-LzWBGA87nbQA/export?format=csv&gid=0',
    fr: 'https://docs.google.com/spreadsheets/d/1Ki0fuTZb1netmpSOBd8uJbZnYhgtD17aEtGQb3Ehb3Y/export?format=csv&gid=0',
    en: 'https://docs.google.com/spreadsheets/d/1Uof80EqNrC3SrtAcce0OgQDr_MRpqcxCQCb2oQS4I0s/export?format=csv&gid=0',
    zh: 'https://docs.google.com/spreadsheets/d/1dHIWN5lOINUzeLvTD7zsnpORSBLdlgsF_T8VMX8pTFA/export?format=csv&gid=0'
};

const JLPT_SHEETS = {
    jlpt_n5: 'https://docs.google.com/spreadsheets/d/12B2ZV8eGUO7d1-YcWNLTlqDptkNrhsQvijyjed6Y_TE/export?format=csv&gid=0',
    jlpt_n4: 'https://docs.google.com/spreadsheets/d/1unwngsmxA4_HoNMO9l0-mN4dkhrQF7vYbbHgdSDY4SQ/export?format=csv&gid=0',
    jlpt_n3: 'https://docs.google.com/spreadsheets/d/1Tw8Ll29yjH-AkYlVWjTlWSY1Kh33Jxj_gqxWWcVs4NQ/export?format=csv&gid=0',
    jlpt_n2: 'https://docs.google.com/spreadsheets/d/1GKE8uKb8mH8PSHYELErZbzrYAgU19u1eBLTJsy67S-4/export?format=csv&gid=0',
    jlpt_n1: 'https://docs.google.com/spreadsheets/d/1zHezXxlkiSKsIzFCyUMBCLRNOxQV0zwvAgYnMFqnQ38/export?format=csv&gid=0'
};

const TOPIK_SHEETS = {
    topik_1: 'https://docs.google.com/spreadsheets/d/1XJTpFBly3hRNBBBnZoAzJneOXwJajbC4KqniSRfSPUg/export?format=csv&gid=0',
    topik_2: 'https://docs.google.com/spreadsheets/d/1FBjH5ObsgShVevgMcXXJDmsmh0JQBzk6DDsJAyi6kaE/export?format=csv&gid=0',
    topik_3: 'https://docs.google.com/spreadsheets/d/1pVOTCK3e2OgAhdktgVb29j4vUlKpmIULk2OnkiPeNA0/export?format=csv&gid=0',
    topik_4: 'https://docs.google.com/spreadsheets/d/1UZJ29Jxl8pjM4eZREWKed8YRkPpjRIKkSfzfYFaAlig/export?format=csv&gid=0'
};

/* HSK sheets use the same wide, multi-block column layout as the general
   Chinese SHEETS.zh sheet (trad/simp/bopomofo/roman/meaning columns repeated
   every 7 columns) — see parseChinese()/addZhWord() — not the simple
   one-word-per-row layout JLPT_SHEETS/TOPIK_SHEETS use. */
const HSK_SHEETS = {
    hsk_1: 'https://docs.google.com/spreadsheets/d/1yGET_yX2M98C5mKyqkje9Jm-NXwUhhMMRrhiIOaL3XA/export?format=csv&gid=1793944762'
};

/* ===== Bundled word sets =====
   data/vocab/<id>.json, built by tools/build_vocab.py from graded lists and ordered
   easy-first (most frequent words first). kind 'ja' | 'ko' | 'en' rows are
   [word, reading, meaning, english]; kind 'zh' rows are [trad, simp, bopomofo,
   pinyin, meaning]. Only French still comes from a Google Sheet (SHEETS.fr); the
   other SHEETS / JLPT_SHEETS / TOPIK_SHEETS / HSK_SHEETS entries are kept for the
   build script and pasted custom sheets, not loaded by the site any more. */
const BUNDLED_SETS = {
    en_jh: 'en', en_sh: 'en', en_toeic: 'en', en_toefl: 'en',
    jlpt_n5: 'ja', jlpt_n4: 'ja', jlpt_n3: 'ja', jlpt_n2: 'ja', jlpt_n1: 'ja',
    topik_1: 'ko', topik_2: 'ko', topik_3: 'ko', topik_4: 'ko',
    hsk_1: 'zh', hsk_2: 'zh', hsk_3: 'zh', hsk_4: 'zh', hsk_5: 'zh', hsk_6: 'zh', hsk_7: 'zh'
};

/* 單字 page topics: one 40-word set per language and topic, tp_<ja|ko|en|zh|fr|ru|es|de>_<topic>,
   built from the hand-written tools/topics/<lang>.tsv (the 檢定 page keeps the
   graded lists). TOPIC_FILE_LANG maps a quiz-page language to the file prefix. */
const TOPIC_IDS = ['greetings', 'food', 'home', 'shopping', 'transport', 'travel', 'weather', 'school', 'work', 'health'];
const TOPIC_EMOJI = { greetings: '👋', food: '🍜', home: '🏠', shopping: '🛒', transport: '🚃',
    travel: '✈️', weather: '🌤️', school: '🏫', work: '💼', health: '🩺' };
const TOPIC_FILE_LANG = { jp: 'ja', kr: 'ko', en: 'en', zh: 'zh', fr: 'fr', ru: 'ru', es: 'es', de: 'de' };
const topicSetIds = fileLang => TOPIC_IDS.map(tp => 'tp_' + fileLang + '_' + tp);
Object.values(TOPIC_FILE_LANG).forEach(l => topicSetIds(l).forEach(id => { BUNDLED_SETS[id] = l; }));

/* French (FLELex), Russian (Kelly), Spanish (ELELex) and German (DAFlex) by CEFR level, fr_a1 … de_c1 (tools/build_vocab.py);
   they replaced the owner's French sheet ('fr', now a legacy id). */
const CEFR_LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1'];
const CEFR_LANGS = ['fr', 'ru', 'es', 'de'];
const cefrSetIds = lang => CEFR_LEVELS.map(lv => lang + '_' + lv);
CEFR_LANGS.forEach(l => cefrSetIds(l).forEach(id => { BUNDLED_SETS[id] = l; }));

/* "tp_ja_food" -> { lang: 'ja', topic: 'food' }, anything else -> null */
function topicOf(id) {
    const m = /^tp_(ja|ko|en|zh|fr|ru|es|de)_([a-z]+)$/.exec(id || '');
    return m ? { lang: m[1], topic: m[2] } : null;
}

/* A word set's display name: "日文・吃飯" / "Korean · Food" for a topic, else its
   quiz_<id> text. */
function wordSetName(id) {
    // the notepad's word cards (js/notes.js): "筆記・日文"
    const note = /^note_([a-z]+)$/.exec(id || '');
    if (note) return t('notes_set_name', { l: note[1] === 'xx' ? t('notes_lang_none') : t('dict_lang_' + note[1]) });
    const cefr = /^(fr|ru|es|de)_([abc][12])$/.exec(id || '');
    if (cefr) return t('dict_lang_' + cefr[1]) + ' ' + cefr[2].toUpperCase();
    const tp = topicOf(id);
    if (!tp) return t('quiz_' + id);
    const sep = ['zh', 'zh-Hans', 'ja'].includes(siteLang) ? '・' : ' · ';
    return t('dict_lang_' + tp.lang) + sep + t('topic_' + tp.topic);
}

/* Word sets by language, in picker order (the flashcard / listening tools pick a
   language, then one of these). */
const WORD_SET_FAMILIES = {
    en: ['en_jh', 'en_sh', 'en_toeic', 'en_toefl'].concat(topicSetIds('en')),
    jp: ['jlpt_n5', 'jlpt_n4', 'jlpt_n3', 'jlpt_n2', 'jlpt_n1'].concat(topicSetIds('ja')),
    kr: ['topik_1', 'topik_2', 'topik_3', 'topik_4'].concat(topicSetIds('ko')),
    zh: ['hsk_1', 'hsk_2', 'hsk_3', 'hsk_4', 'hsk_5', 'hsk_6', 'hsk_7'].concat(topicSetIds('zh')),
    fr: cefrSetIds('fr').concat(topicSetIds('fr')),
    ru: cefrSetIds('ru').concat(topicSetIds('ru')),
    es: cefrSetIds('es').concat(topicSetIds('es')),
    de: cefrSetIds('de').concat(topicSetIds('de'))
};

let currentSetMeta = null; // { source, license } of the loaded bundled set

function resetWordLists() {
    vocabularyList = [];
    readingList = [];
    meaningList = [];
}

/* Fills vocabularyList / readingList / meaningList with a word set and resolves to
   its word count. Bundled sets come from data/vocab/; French from its sheet. */
function loadWordSet(id) {
    resetWordLists();
    currentSetMeta = null;
    if (BUNDLED_SETS[id]) {
        return fetch('data/vocab/' + id + '.json')
            .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(data => {
                resetWordLists();
                (data.words || []).forEach(row => {
                    if (data.kind === 'zh') addZhWord(row[0], row[1], row[2], row[3], row[4]);
                    else addWord(row[0], row[1], row[2], row[3]);
                });
                currentSetMeta = { source: data.source || '', license: data.license || '' };
                const audioLang = isJapaneseQuizLang(id) ? 'ja-JP' : isKoreanQuizLang(id) ? 'ko-KR'
                    : isChineseQuizLang(id) ? zhAccent(zhUiScript()) : '';
                if (audioLang) audioWarm(audioLang);
                return vocabularyList.length;
            });
    }
    if (SHEETS[id]) {
        return new Promise((resolve, reject) => Papa.parse(SHEETS[id], {
            download: true,
            header: false,
            complete: results => {
                resetWordLists();
                if (id === 'fr') parseFrench(results.data);
                resolve(vocabularyList.length);
            },
            error: reject
        }));
    }
    return Promise.reject(new Error('unknown word set ' + id));
}

/* Offline fallback: the copy saveVocabCache() kept. meaningList isn't stored, so it is
   rebuilt the way addWord() fills it (words without kanji; Chinese entries never). */
function restoreVocabCache(id) {
    const cached = getVocabCache(id);
    if (!cached || !cached.vocabularyList || cached.vocabularyList.length < 4) return false;
    vocabularyList = cached.vocabularyList;
    readingList = cached.readingList || [];
    meaningList = vocabularyList.filter(w => !w.trad && !hasKanji(w.word));
    return true;
}

let currentLang = '';
let vocabularyList = [];
let readingList = [];
let meaningList = [];
let currentWord = null;
let currentMode = 'meaning';
let score = 0;   // +10 right, -3 wrong, never below 0 (a beginner shouldn't see -4)
let questionNum = 0;
let answered = false;
let totalQuestions = 0;
let quizHistory = [];
let needAnswerLang = false;
let shuffledVocab = [];
let shuffledReading = [];
let shuffledMeaning = [];
let vocabIdx = 0;
let readingIdx = 0;
let meaningIdx = 0;
let zhCharType = '';   // 'trad' | 'simp'
let zhTestType = '';   // 'bopomofo' | 'roman' | 'meaning'

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/* Distractors for kanji reading questions (every Japanese reading question: the quiz,
   path lessons, reviews, the listening tool): the slips JLPT reading questions are made
   of, applied to the right kana — a long vowel added, dropped or moved (どうろ → どうろう,
   どろ, どろう), っ added or dropped, a dakuten toggled, ゃゅょ written big or swapped.
   worker/discord/src/kana.js is a copy of this for the Discord bot; keep them alike. */
const KANA_DAKUTEN_MAP = (() => {
    const pairs = [
        ['か','が'], ['き','ぎ'], ['く','ぐ'], ['け','げ'], ['こ','ご'],
        ['さ','ざ'], ['し','じ'], ['す','ず'], ['せ','ぜ'], ['そ','ぞ'],
        ['た','だ'], ['ち','ぢ'], ['つ','づ'], ['て','で'], ['と','ど'],
        ['は','ば'], ['ひ','び'], ['ふ','ぶ'], ['へ','べ'], ['ほ','ぼ'],
        ['は','ぱ'], ['ひ','ぴ'], ['ふ','ぷ'], ['へ','ぺ'], ['ほ','ぽ']
    ];
    const map = {};
    pairs.forEach(([base, voiced]) => {
        (map[base] = map[base] || []).push(voiced);
        (map[voiced] = map[voiced] || []).push(base);
    });
    return map;
})();
const KANA_VOWEL = (() => {
    const rows = {
        a: 'あかさたなはまやらわがざだばぱぁゃ', i: 'いきしちにひみりぎじぢびぴぃ',
        u: 'うくすつぬふむゆるぐずづぶぷぅゅ', e: 'えけせてねへめれげぜでべぺぇ',
        o: 'おこそとのほもよろをごぞどぼぽぉょ'
    };
    const map = {};
    Object.entries(rows).forEach(([v, chars]) => [...chars].forEach(c => { map[c] = v; }));
    return map;
})();
const KANA_SMALL_Y = { 'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ' };
const KANA_ROWS = ['あいうえお', 'かきくけこ', 'がぎぐげご', 'さしすせそ', 'ざじずぜぞ', 'たちつてと', 'だぢづでど',
    'なにぬねの', 'はひふへほ', 'ばびぶべぼ', 'ぱぴぷぺぽ', 'まみむめも', 'やゆよ', 'らりるれろ'];
const KANA_SOKUON_NEXT = 'かきくけこさしすせそたちつてとぱぴぷぺぽ';
// slips that are another right reading of the same word (日本: にっぽん), never offered
const KANA_ALSO_RIGHT = { 'にほん': ['にっぽん'], 'にっぽん': ['にほん'] };

/* every one-slip variant of a reading (hiragana; katakana is converted and back) */
function kanaSlips(str) {
    const kata = /[ァ-ヶ]/.test(str) && !/[ぁ-ゖ]/.test(str);
    const c = [...(kata ? str.replace(/[ァ-ヶ]/g, x => String.fromCharCode(x.charCodeAt(0) - 0x60)) : str)];
    const n = c.length;
    const out = [];
    const put = (i, del, ins) => out.push(c.slice(0, i).concat(ins, c.slice(i + del)).join(''));
    for (let i = 0; i < n; i++) {
        const ch = c[i];
        const prev = i > 0 ? KANA_VOWEL[c[i - 1]] : null;
        (KANA_DAKUTEN_MAP[ch] || []).forEach(r => put(i, 1, [r]));
        if (KANA_SMALL_Y[ch]) {
            put(i, 1, [KANA_SMALL_Y[ch]]);
            put(i, 1, [ch === 'ょ' ? 'ゅ' : 'ょ']);
        }
        if (ch === 'っ' || ch === 'ー') put(i, 1, []);
        if (!kata && ((ch === 'う' && (prev === 'o' || prev === 'u')) || (ch === 'い' && prev === 'e'))) put(i, 1, []);
    }
    // a long vowel or っ goes after a kana that isn't itself a long vowel
    const longAt = i => i > 0 && ((c[i] === 'う' && 'ou'.includes(KANA_VOWEL[c[i - 1]] || '-')) || (c[i] === 'い' && KANA_VOWEL[c[i - 1]] === 'e'));
    for (let i = 1; i <= n; i++) {
        const v = KANA_VOWEL[c[i - 1]];
        const next = c[i];
        if (!v || longAt(i - 1) || KANA_SMALL_Y[next] || next === 'ー') continue;
        if (next !== 'ん' && next !== 'っ') {
            if (kata) put(i, 0, ['ー']);
            else if ((v === 'o' || v === 'u') && next !== 'う') put(i, 0, ['う']);
            else if (v === 'e' && next !== 'い') put(i, 0, ['い']);
        }
        if (i < n && KANA_SOKUON_NEXT.includes(next)) put(i, 0, ['っ']);
    }
    const ok = r => r && !/^[ぁぃぅぇぉゃゅょっんー]/.test(r) && !/[っー]$/.test(r) && !/っ[あいうえおっんー]|っっ|ーー/.test(r);
    const res = [...new Set(out.filter(ok))];
    return kata ? res.map(r => r.replace(/[ぁ-ゖ]/g, x => String.fromCharCode(x.charCodeAt(0) + 0x60))) : res;
}

/* the same kana with one vowel changed (あめ → あま, あみ…): for short words with few slips */
function kanaVowelSwaps(str) {
    const c = [...str];
    const out = [];
    c.forEach((ch, i) => {
        if (KANA_SMALL_Y[c[i + 1]]) return;
        const row = KANA_ROWS.find(r => r.includes(ch));
        if (row) [...row].forEach(x => { if (x !== ch) out.push(c.slice(0, i).concat(x, c.slice(i + 1)).join('')); });
    });
    return out;
}

/* count wrong readings: one-slip variants first (at most two), then two-slip ones
   (どうろ → どろう moves the long vowel; at most one kana longer or shorter), then
   a changed vowel; shuffled with rand (Math.random by default) */
function generateSimilarReadings(correct, count, rand = Math.random) {
    const pick = list => list.length ? list.splice(Math.floor(rand() * list.length), 1)[0] : null;
    const len = [...correct].length;
    const singles = kanaSlips(correct).filter(r => r !== correct);
    const results = [];
    const also = KANA_ALSO_RIGHT[correct] || [];
    const add = r => { if (r && r !== correct && !also.includes(r) && !results.includes(r)) results.push(r); };
    const ones = singles.slice();
    while (results.length < Math.min(2, count) && ones.length) add(pick(ones));
    const twos = new Set();
    singles.forEach(s => kanaSlips(s).forEach(r => {
        if (r !== correct && !singles.includes(r) && Math.abs([...r].length - len) <= 1) twos.add(r);
    }));
    const twoList = [...twos];
    while (results.length < count && twoList.length) add(pick(twoList));
    while (results.length < count && ones.length) add(pick(ones));
    const swaps = /[ァ-ヶ]/.test(correct) ? [] : kanaVowelSwaps(correct);
    while (results.length < count && swaps.length) add(pick(swaps));
    return results;
}

function playSound(correct) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        if (correct) {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523, ctx.currentTime);
            osc.frequency.setValueAtTime(659, ctx.currentTime + 0.08);
            osc.frequency.setValueAtTime(784, ctx.currentTime + 0.16);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.4);
        } else {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, ctx.currentTime);
            osc.frequency.setValueAtTime(180, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.35);
        }
    } catch(e) {}
}

/* JLPT levels (jlpt_n5, jlpt_n4, ...) are all Japanese vocab, so treat them
   the same as 'jp' anywhere quiz.js branches on currentLang for language
   (not sheet-loading) purposes — see isJapaneseQuizLang() call sites. */
function isJapaneseQuizLang(lang) {
    return lang === 'jp' || lang === 'note_ja' || lang.startsWith('jlpt_') || lang.startsWith('tp_ja_');
}

/* TOPIK levels (topik_1, topik_2, ...) are all Korean vocab, so treat them
   the same as 'kr' anywhere quiz.js branches on currentLang for language
   (not sheet-loading) purposes — see isKoreanQuizLang() call sites. */
function isKoreanQuizLang(lang) {
    return lang === 'kr' || lang === 'note_ko' || lang.startsWith('topik_') || lang.startsWith('tp_ko_');
}

/* HSK levels (hsk_1, ...) are all Chinese vocab, so treat them
   the same as 'zh' anywhere quiz.js branches on currentLang for language
   (not sheet-loading) purposes — see isChineseQuizLang() call sites. */
/* English word sets (en_jh, en_toeic, ..., the tp_en_ topics) and the old general 'en' sheet */
function isEnglishQuizLang(lang) {
    return lang === 'en' || lang === 'note_en' || String(lang).startsWith('en_') || String(lang).startsWith('tp_en_');
}

/* the CEFR sets (fr_a1 …) and the retired French sheet 'fr' */
function isFrenchQuizLang(lang) {
    return lang === 'fr' || lang === 'note_fr' || String(lang).startsWith('fr_') || String(lang).startsWith('tp_fr_');
}

/* the CEFR sets (es_a1 …) and the 單字 page topics (tp_es_*) */
function isSpanishQuizLang(lang) {
    return lang === 'note_es' || String(lang).startsWith('es_') || String(lang).startsWith('tp_es_');
}

/* the CEFR sets (de_a1 …) and the 單字 page topics (tp_de_*) */
function isGermanQuizLang(lang) {
    return lang === 'note_de' || String(lang).startsWith('de_') || String(lang).startsWith('tp_de_');
}

function isRussianQuizLang(lang) {
    return lang === 'note_ru' || String(lang).startsWith('ru_') || String(lang).startsWith('tp_ru_');
}

/* the mode picker's "word → meaning" button text for the current set */
function quizMeaningModeKey() {
    return isEnglishQuizLang(currentLang) ? 'mode_en_meaning' : isJapaneseQuizLang(currentLang) ? 'mode_jp_meaning'
        : isFrenchQuizLang(currentLang) ? 'mode_fr_meaning' : isRussianQuizLang(currentLang) ? 'mode_ru_meaning' : isSpanishQuizLang(currentLang) ? 'mode_es_meaning' : isGermanQuizLang(currentLang) ? 'mode_de_meaning' : 'mode_kr_meaning';
}

function isChineseQuizLang(lang) {
    return lang === 'zh' || lang === 'note_zh' || lang.startsWith('hsk_') || lang.startsWith('tp_zh_');
}

function speakWord(slow) {
    if (!currentWord || !currentWord.word) return;
    const text = currentWord.word.includes(' / ') ? pickOneVariant(currentWord.word) : currentWord.word;
    const lang = isJapaneseQuizLang(currentLang) ? 'ja-JP' : isFrenchQuizLang(currentLang) ? 'fr-FR' : isRussianQuizLang(currentLang) ? 'ru-RU' : isSpanishQuizLang(currentLang) ? 'es-ES' : isGermanQuizLang(currentLang) ? 'de-DE' : isEnglishQuizLang(currentLang) ? 'en-US' : isChineseQuizLang(currentLang) ? zhAccent(zhCharType) : 'ko-KR';
    // the kana tells a recording of 一日 (ついたち) from 一日 (いちにち); a
    // review question only has it as the answer of a reading question
    const reading = currentWord.kana
        || (reviewMode && currentReviewEntry && currentReviewEntry.group === 'reading' ? currentReviewEntry.answer : '');
    speakText(text, lang, { reading, slow: slow === true });
}

let autoSpeak = true;
let quizAnswerLang = 'zh';

function toggleAutoSpeak() {
    autoSpeak = !autoSpeak;
    const btn = document.getElementById('autoSpeakBtn');
    if (btn) btn.classList.toggle('speak-active', autoSpeak);
}

function extractSheetId(url) {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : url;
}

function isValidWord(word, meaning) {
    if (!word || !meaning) return false;
    const w = word.trim();
    const m = meaning.trim();
    if (w.includes('動畫') || w.includes('動画') || w.includes('동영상') || w.includes('註') || w.includes('★') || w.includes('單字')) return false;
    if (m.includes('動畫') || m.includes('動画') || m.includes('意思') || m.includes('註')) return false;
    if (/^\d+$/.test(w)) return false;
    if (w.length === 0 || m.length === 0) return false;
    return true;
}

/* Every card of #page-quiz; showOnlyQuizCard() shows one of them and hides the rest. */
const QUIZ_PAGE_CARDS = ['lang-card', 'setup-card', 'mode-card', 'quiz-card', 'result-card',
    'mistake-card', 'stats-card', 'srs-card', 'flashcard-card', 'flashcard-setup-card', 'listening-setup-card',
    'mastered-list-card', 'unknown-list-card', 'path-card', 'lesson-card'];

function showOnlyQuizCard(id) {
    QUIZ_PAGE_CARDS.forEach(c => {
        const el = document.getElementById(c);
        if (el) el.style.display = c === id ? 'block' : 'none';
    });
    if (id === 'lang-card') renderWords();
    quizNavMark();
}

/* Starting a new word set ends any review that was left on screen; otherwise
   showModeSelection() (still seeing reviewMode) would open the mistake book. */
function endReviewState() {
    reviewMode = false;
    reviewSource = '';
    setQuizBackLabels(false);
    setResultAgainLabel('quiz_again');
}

/* The quiz/result "返回選擇語言" buttons don't lead to the language list during an SRS
   review (→ home) or a lesson (→ the path), so they say so. Swapping data-i18n (not just
   the text) keeps a language switch consistent. kind: false | 'srs' | 'mistakes' | 'listening' | 'lesson'. */
function setQuizBackLabels(kind) {
    const key = kind === 'srs' || kind === 'mistakes' || kind === 'listening' ? 'tool_back' : kind === 'lesson' ? 'lesson_back_path' : 'quiz_back';
    document.querySelectorAll('#quiz-card .back-btn, #result-card .back-btn').forEach(b => {
        b.setAttribute('data-i18n', key);
        b.innerHTML = t(key);
    });
}

/* The result card's "再來一次" (quizAgain) becomes "下一關" / "再試一次" after a lesson. */
function setResultAgainLabel(key) {
    const b = document.getElementById('quiz-again-btn');
    if (!b) return;
    b.setAttribute('data-i18n', key);
    b.innerHTML = t(key);
}

/* ----- Languages by region -----
   The header's 我在學 menu (js/learnlang.js) groups the languages this way. A new
   language goes into its region here. Codes are the dict_lang_* ones. */
const LANG_REGIONS = [
    { id: 'asia', icon: '🌏', langs: ['ja', 'ko', 'zh'] },
    { id: 'europe', icon: '🌍', langs: ['en', 'fr', 'ru', 'es', 'de'] },
];

/* ----- 單字 page (proposal C, 2026-10-17) -----
   One page for the learning language's word sets, in two tabs: 主題 (the topic sets,
   tp_<lang>_<topic>) and 檢定等級 (the graded lists: JLPT, TOPIK, HSK, the English
   school / TOEIC / TOEFL lists, CEFR). It replaced the separate 單字 (topics) and
   檢定 (levels) pages and their region → language pickers; the 檢定 slot in the
   navigation is 複習 now (openReview). */
let wordsTab = (() => { try { return localStorage.getItem('words_tab') === 'levels' ? 'levels' : 'topics'; } catch { return 'topics'; } })();

function setWordsTab(tab) {
    wordsTab = tab === 'levels' ? 'levels' : 'topics';
    try { localStorage.setItem('words_tab', wordsTab); } catch {}
    renderWords();
}

// the 單字 page's own code for the learning language (jp, kr …), '' before one is chosen
function wordsLang() {
    return typeof learnLang === 'function' ? (LEARN_QUIZ_CODE[learnLang()] || '') : '';
}

function wordsLevelIds(code) {
    return (WORD_SET_FAMILIES[code] || []).filter(id => !topicOf(id));
}

function renderWords() {
    const tabs = document.getElementById('words-tabs');
    const body = document.getElementById('words-body');
    if (!tabs || !body) return;
    document.getElementById('words-title').innerHTML = escHtml(t('words_title')) + introInfoBtn('words_intro');
    document.getElementById('words-intro').innerHTML = introHtml('words_intro');
    const code = wordsLang();
    if (!code) {
        tabs.innerHTML = '';
        body.innerHTML = learnChooseHtml();
        return;
    }
    tabs.innerHTML = [['topics', 'words_tab_topics'], ['levels', 'words_tab_levels']].map(([id, key]) =>
        `<button type="button" role="tab" class="words-tab${wordsTab === id ? ' on' : ''}" aria-selected="${wordsTab === id}" onclick="setWordsTab('${id}')">${escHtml(t(key))}</button>`).join('');
    if (wordsTab === 'levels') {
        body.innerHTML = `<div class="words-levels">${wordsLevelIds(code).map(id => {
                const sum = pathSummary(id);
                const done = sum ? sum.done : getSetProgress(id).done;
                const finished = sum && done >= sum.levels;
                return `<button type="button" class="words-level${finished ? ' done' : ''}" onclick="selectWordSet('${id}')">
                    <span class="words-level-name">${escHtml(wordSetName(id))}</span>
                    <span class="words-level-state">${sum ? (finished ? '✓ ' + escHtml(t('topic_done')) : escHtml(t('topic_levels', { n: done, m: sum.levels }))) : ''}</span>
                    ${sum ? `<span class="topic-bar" aria-hidden="true"><i style="width:${Math.round(done / sum.levels * 100)}%"></i></span>` : ''}
                    <span class="words-level-go" aria-hidden="true">›</span>
                </button>`;
            }).join('')}</div>`;
        return;
    }
    // one tile per topic with its path progress (4 levels of 10 words; the real count
    // once the set has been loaded on this device)
    body.innerHTML = `<div class="topic-grid">${topicSetIds(TOPIC_FILE_LANG[code]).map(id => {
            const topic = topicOf(id).topic;
            const sum = pathSummary(id);
            const levels = sum ? sum.levels : 4;
            const done = Math.min(getSetProgress(id).done, levels);
            const finished = done >= levels;
            return `<button type="button" class="topic-tile${finished ? ' done' : ''}" onclick="selectWordSet('${id}')">
                <span class="topic-emoji" aria-hidden="true">${TOPIC_EMOJI[topic]}</span>
                <span class="topic-name">${escHtml(t('topic_' + topic))}</span>
                <span class="topic-bar" aria-hidden="true"><i style="width:${Math.round(done / levels * 100)}%"></i></span>
                <span class="topic-state">${finished ? '✓ ' + escHtml(t('topic_done')) : escHtml(t('topic_levels', { n: done, m: levels }))}</span>
            </button>`;
        }).join('')}</div>`;
}

/* Opens the 單字 page on a tab (the home page's exam shortcuts, old 檢定 links). */
function openWords(tab) {
    if (tab) { wordsTab = tab === 'levels' ? 'levels' : 'topics'; try { localStorage.setItem('words_tab', wordsTab); } catch {} }
    currentLang = '';
    reviewMode = false;
    currentListeningMode = false;
    backToLanguage();
    switchPage('quiz', null);
}

/* 複習 (the navigation slot 檢定 had): the 間隔複習 page, which also leads to the
   mistake book. The tab lights up while a review or the mistake book is on screen
   (quizNavMark). */
function openReview() {
    switchPage('quiz', null);
    showSrsDashboard();
}

// the 間隔複習 page, the mistake book, or a review / repair round running on the quiz cards
function quizReviewShown() {
    const card = QUIZ_PAGE_CARDS.find(c => { const el = document.getElementById(c); return el && el.style.display !== 'none'; });
    return card === 'srs-card' || card === 'mistake-card'
        || ((card === 'quiz-card' || card === 'result-card') && reviewMode && (reviewSource === 'srs' || reviewSource === 'mistakes'));
}

// which of 單字 / 複習 the navigation marks while the 單字 page is open
function quizNavMark() {
    if (pageTarget !== 'quiz') return;
    const review = quizReviewShown();
    document.querySelectorAll('.nav-btn[data-tab="quiz"], .nav-btn[data-tab="review"]').forEach(b => {
        const on = b.dataset.tab === (review ? 'review' : 'quiz');
        b.classList.toggle('active', on);
        if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
}

document.addEventListener('DOMContentLoaded', () => { renderWords(); updateReviewBadge(); });

// the 複習 tab's badge: cards due now
function updateReviewBadge() {
    const n = typeof srsQuizDueCount === 'function' ? srsQuizDueCount() : 0;
    document.querySelectorAll('.review-badge').forEach(b => {
        b.hidden = !n;
        b.textContent = n > 99 ? '99+' : String(n);
    });
}

function parseExamVocab(rows) {
    rows.forEach((row, idx) => {
        if (idx === 0) return; // header row: word,kana,meaning,english
        if (row.length < 4) return;
        addWord(row[0], row[1], row[2], row[3]);
    });
}

/* TOPIK sheets have no reading column (Korean is already written in hangul,
   no furigana-like reading needed) — word,meaning,english. */
function parseTopikVocab(rows) {
    rows.forEach((row, idx) => {
        if (idx === 0) return; // header row: 韓文單字,繁體中文翻譯,English
        if (row.length < 3) return;
        addWord(row[0], '', row[1], row[2]);
    });
}

function selectExamSet(examId) {
    selectWordSet(examId);
}

/* Loads a word set onto the quiz page and opens it (its path, see showSetStart). A
   reply that arrives after the visitor picked another set is ignored. */
function selectWordSet(id) {
    endReviewState();
    currentLang = id;
    resetWordLists();
    switchPage('quiz', null);
    showOnlyQuizCard('setup-card');
    const statusMsg = document.getElementById('status-msg');
    statusMsg.innerText = t('load_loading');
    statusMsg.style.color = 'var(--text-secondary)';

    loadWordSet(id).then(n => {
        if (currentLang !== id) return;
        if (n >= 4) {
            saveVocabCache(id);
            statusMsg.innerText = t('load_success', {n: n}) + (readingList.length > 0 ? t('load_with_reading', {n: readingList.length}) : '');
            statusMsg.style.color = 'var(--accent-green)';
            showSetStart();
        } else {
            statusMsg.innerText = t('load_fail_no_cache');
            statusMsg.style.color = 'var(--accent-red)';
        }
    }).catch(() => {
        if (currentLang !== id) return;
        if (restoreVocabCache(id)) {
            statusMsg.innerText = t('load_offline_cache', {n: vocabularyList.length});
            statusMsg.style.color = 'var(--accent-yellow)';
            showSetStart();
        } else {
            statusMsg.innerText = t('load_fail_no_cache');
            statusMsg.style.color = 'var(--accent-red)';
        }
    });
}

function saveVocabCache(lang) {
    try {
        storeSet('quiz_cache_' + lang, JSON.stringify({ vocabularyList, readingList }));
    } catch (e) {}
}

function getVocabCache(lang) {
    try { return JSON.parse(localStorage.getItem('quiz_cache_' + lang)); }
    catch { return null; }
}

function loadSheetData(url) {
    const statusMsg = document.getElementById('status-msg');
    const setupCard = document.getElementById('setup-card');
    setupCard.style.display = 'block';
    document.getElementById('mistake-card').style.display = 'none';
    document.getElementById('stats-card').style.display = 'none';

    const sheetId = extractSheetId(url);
    if (!sheetId) {
            alert(t('invalid_url'));
        return;
    }

    statusMsg.innerText = '正在讀取 Google 試算表單字庫...';
    statusMsg.style.color = 'var(--text-secondary)';

    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;

    function finalizeLoad() {
        if (vocabularyList.length >= 4) {
            saveVocabCache(currentLang);
            statusMsg.innerText = t('load_success', {n: vocabularyList.length}) + (readingList.length > 0 ? t('load_with_reading', {n: readingList.length}) : '');
            statusMsg.style.color = 'var(--accent-green)';
            showSetStart();
        } else {
            statusMsg.innerText = `讀取到的單字不足（僅 ${vocabularyList.length} 個），無法出題！`;
            statusMsg.style.color = 'var(--accent-red)';
        }
    }

    Papa.parse(csvUrl, {
        download: true,
        header: false,
        complete: function(results) {
            const rows = results.data;
            vocabularyList = [];
            readingList = [];
            meaningList = [];

            if (currentLang === 'jp') {
                parseJapanese(rows);
                const csvUrl2 = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=1244107386`;
                Papa.parse(csvUrl2, {
                    download: true,
                    header: false,
                    complete: function(r2) { parseJapanese2(r2.data); finalizeLoad(); },
                    error: function() { finalizeLoad(); }
                });
            } else if (currentLang === 'fr') {
                parseFrench(rows);
                finalizeLoad();
            } else if (currentLang === 'en') {
                parseEnglish(rows);
                finalizeLoad();
            } else if (currentLang === 'zh') {
                parseChinese(rows);
                finalizeLoad();
            } else {
                parseKorean(rows);
                finalizeLoad();
            }
        },
        error: function() {
            const cached = getVocabCache(currentLang);
            if (cached && cached.vocabularyList && cached.vocabularyList.length >= 4) {
                vocabularyList = cached.vocabularyList;
                readingList = cached.readingList || [];
                statusMsg.innerText = t('load_offline_cache', {n: vocabularyList.length});
                statusMsg.style.color = 'var(--accent-yellow)';
                showSetStart();
            } else {
                statusMsg.innerText = t('load_fail_no_cache');
                statusMsg.style.color = 'var(--accent-red)';
            }
        }
    });
}

function parseJapanese(rows) {
    rows.forEach((row) => {
        if (row.length < 6) return;
        addWord(row[2], row[3], row[4], row[5]);
        if (row.length > 8)  addWord(row[8], row[9], row[10], row[11]);
        if (row.length > 14) addWord(row[14], row[15], row[16], row[17]);
        if (row.length > 20) addWord(row[20], row[21], row[22], row[23]);
    });
}

function parseJapanese2(rows) {
    rows.forEach((row) => {
        if (row.length < 5) return;
        addWord(row[2], row[3], row[4], row[5]);
        if (row.length > 9)  addWord(row[7], row[8], row[9], row[10]);
        if (row.length > 14) addWord(row[12], row[13], row[14], row[15]);
        if (row.length > 19) addWord(row[17], row[18], row[19], row[20]);
    });
}

function parseKorean(rows) {
    rows.forEach((row) => {
        if (row.length < 5) return;
        addWord(row[2], '', row[3], row[4]);
        if (row.length > 9)  addWord(row[7], '', row[8], row[9]);
        if (row.length > 14) addWord(row[12], '', row[13], row[14]);
        if (row.length > 19) addWord(row[17], '', row[18], row[19]);
    });
}

function parseFrench(rows) {
    rows.forEach((row) => {
        if (row.length < 5) return;
        addWord(row[2], '', row[3], row[4]);
        if (row.length > 9)  addWord(row[7], '', row[8], row[9]);
        if (row.length > 14) addWord(row[12], '', row[13], row[14]);
        if (row.length > 19) addWord(row[17], '', row[18], row[19]);
    });
}

function parseEnglish(rows) {
    rows.forEach((row, idx) => {
        if (row.length < 4) return;
        const w = row[2] ? row[2].trim() : '';
        const m = row[3] ? row[3].trim() : '';
        if (!w || !m || /^\d+$/.test(w)) return;
        if (w.includes('單字') || w.includes('意思') || w.includes('Video') || w.includes('註')) return;
        vocabularyList.push({ word: w, kana: '', meaning: m, english: '' });
        if (row.length > 6 && row[6] && row[7]) {
            const w2 = row[6].trim(), m2 = row[7].trim();
            if (w2 && m2 && !/^\d+$/.test(w2) && !w2.includes('單字')) vocabularyList.push({ word: w2, kana: '', meaning: m2, english: '' });
        }
        if (row.length > 10 && row[10] && row[11]) {
            const w3 = row[10].trim(), m3 = row[11].trim();
            if (w3 && m3 && !/^\d+$/.test(w3) && !w3.includes('單字')) vocabularyList.push({ word: w3, kana: '', meaning: m3, english: '' });
        }
        if (row.length > 14 && row[14] && row[15]) {
            const w4 = row[14].trim(), m4 = row[15].trim();
            if (w4 && m4 && !/^\d+$/.test(w4) && !w4.includes('單字')) vocabularyList.push({ word: w4, kana: '', meaning: m4, english: '' });
        }
        if (row.length > 18 && row[18] && row[19]) {
            const w5 = row[18].trim(), m5 = row[19].trim();
            if (w5 && m5 && !/^\d+$/.test(w5) && !w5.includes('單字')) vocabularyList.push({ word: w5, kana: '', meaning: m5, english: '' });
        }
    });
}

function parseChinese(rows) {
    rows.forEach((row) => {
        [2, 9, 16, 23, 30].forEach(c => {
            if (row.length <= c + 5) return;
            addZhWord(row[c + 1], row[c + 2], row[c + 3], row[c + 4], row[c + 5]);
        });
    });
}

function addZhWord(trad, simp, bopomofo, roman, meaning) {
    const tr = trad ? trad.trim() : '';
    const si = simp ? simp.trim() : '';
    const bo = bopomofo ? bopomofo.trim() : '';
    const ro = roman ? roman.trim() : '';
    const me = meaning ? meaning.trim() : '';
    if (!tr || !si || !me) return;
    if (/^\d+$/.test(tr)) return;
    if (tr.includes('單字') || tr.includes('单字') || tr.includes('註') || me === 'Meaning') return;
    vocabularyList.push({ word: tr, trad: tr, simp: si, bopomofo: bo, roman: ro, meaning: me, kana: '', english: '' });
}

/* Japanese/JLPT vocab splits into two disjoint quiz pools so no word can
   leak its own answer: kanji words (hasKanji) only ever get asked as
   "reading" questions (readingList), kana-only words only ever get asked
   as "meaning" questions (meaningList). For non-Japanese languages
   hasKanji() is always false, so meaningList just mirrors vocabularyList. */
function addWord(word, kana, meaning, englishMeaning) {
    const w = word.trim();
    const k = kana ? kana.trim() : '';
    const m = meaning.trim();
    const e = englishMeaning ? englishMeaning.trim() : '';
    if (!isValidWord(w, m)) return;
    const entry = { word: w, kana: k, meaning: m, english: e };
    vocabularyList.push(entry);
    if (hasKanji(w)) {
        if (k.length > 0) readingList.push(entry);
    } else {
        meaningList.push(entry);
    }
}

function refreshDynamicContent() {
    if (typeof renderHome === 'function') renderHome();
    if (typeof renderLearnPill === 'function' && document.readyState !== 'loading') renderLearnPill();
    const isVisible = (id) => {
        const el = document.getElementById(id);
        return el && el.style.display !== 'none';
    };
    // applyLang() runs this while quiz.js is still loading; the page is drawn on DOMContentLoaded then
    if (document.readyState !== 'loading') renderWords();
    if (typeof renderLessonPath === 'function' && isVisible('path-card')) renderLessonPath();
    if (typeof renderLessonPreview === 'function' && isVisible('lesson-card')) renderLessonPreview();
    if (typeof renderDictPage === 'function') renderDictPage();
    if (typeof renderAlphabet === 'function') renderAlphabet();
    if (typeof renderGrammar === 'function' && isVisible('page-grammar')) renderGrammar();
    if (typeof renderReading === 'function' && isVisible('page-reading')) renderReading();
    if (typeof renderListening === 'function' && isVisible('page-listening')) renderListening();
    // the notepad, unless a note is open (a redraw would drop what is being typed)
    if (typeof renderNotes === 'function' && isVisible('page-notes') && notesOpenId == null) renderNotes();
    if (typeof renderUpdates === 'function') renderUpdates();
    if (typeof renderAssistant === 'function') renderAssistant();
    if (typeof renderRails === 'function') renderRails();
    if (isVisible('mode-card') && !isVisible('quiz-card')) {
        if (isChineseQuizLang(currentLang) && selectedQuizMode === 'zh') {
            showChineseSelection();
        } else if (currentLang) {
            showModeSelection();
        }
        if (isVisible('timer-buttons')) showTimerOptions();
    }
    if (isVisible('flashcard-setup-card') && typeof renderFlashcardDecks === 'function') renderFlashcardDecks();
    if (isVisible('flashcard-card') && typeof renderFlashcard === 'function') renderFlashcard();
    if (isVisible('listening-setup-card')) renderListeningSetup();
    if (isVisible('mistake-card') && typeof renderMistakeBook === 'function') renderMistakeBook();
    if (isVisible('stats-card') && typeof renderQuizStats === 'function') renderQuizStats();
    if (isVisible('srs-card') && typeof renderSrsDashboard === 'function') renderSrsDashboard();
    if (typeof renderPracticeHub === 'function') renderPracticeHub();
    if (typeof renderAccount === 'function') renderAccount();
    if (typeof renderGuestbookGate === 'function') renderGuestbookGate();
}

function setModeCardTitle(id, key) {
    const el = document.getElementById(id);
    if (!el) return;
    el.setAttribute('data-i18n', key);
    el.innerText = t(key);
}

function showModeSelection() {
    if (reviewMode) { reviewMode = false; showMistakeBook(); return; }
    hidePathCards();
    document.getElementById('setup-card').style.display = 'none';
    document.getElementById('mode-card').style.display = 'block';
    document.getElementById('quiz-card').style.display = 'none';
    document.getElementById('result-card').style.display = 'none';
    document.getElementById('flashcard-card').style.display = 'none';
    document.getElementById('mistake-card').style.display = 'none';
    document.getElementById('stats-card').style.display = 'none';
    quizTimerSec = 0;
    stopTimer();

    setModeCardTitle('mode-title', 'mode_title');
    setModeCardTitle('answer-lang-title', 'answer_lang_title');

    const container = document.getElementById('mode-buttons');
    container.innerHTML = '';

    const skipModeSelection = isKoreanQuizLang(currentLang) || isFrenchQuizLang(currentLang) || isRussianQuizLang(currentLang) || isSpanishQuizLang(currentLang) || isGermanQuizLang(currentLang) || isEnglishQuizLang(currentLang);

    const btnMeaning = document.createElement('button');
    btnMeaning.className = 'mode-btn';
    const meaningKey = quizMeaningModeKey();
    btnMeaning.setAttribute('data-i18n', meaningKey);
    btnMeaning.innerText = t(meaningKey);
    btnMeaning.onclick = function() { selectMode('meaning', this); };
    if (!isJapaneseQuizLang(currentLang) || meaningList.length >= 4) {
        container.appendChild(btnMeaning);
    }

    if (readingList.length >= 4 && !isFrenchQuizLang(currentLang) && !isRussianQuizLang(currentLang) && !isSpanishQuizLang(currentLang) && !isGermanQuizLang(currentLang) && currentLang !== 'en') {
        const btnReading = document.createElement('button');
        btnReading.className = 'mode-btn';
        btnReading.setAttribute('data-i18n', 'mode_jp_reading');
        btnReading.innerText = t('mode_jp_reading');
        btnReading.onclick = function() { selectMode('reading', this); };
        container.appendChild(btnReading);
    }

    if (!skipModeSelection) {
        const btnBoth = document.createElement('button');
        btnBoth.className = 'mode-btn';
        btnBoth.setAttribute('data-i18n', 'mode_both');
        btnBoth.innerText = t('mode_both');
        btnBoth.onclick = function() { selectMode('both', this); };
        container.appendChild(btnBoth);
    }

    document.getElementById('mode-title').style.display = skipModeSelection ? 'none' : '';
    container.style.display = skipModeSelection ? 'none' : '';

    needAnswerLang = vocabularyList.some(w => w.english && w.english.length > 0);
    document.getElementById('answer-lang-title').style.display = 'none';
    document.getElementById('answer-lang-buttons').style.display = 'none';
    document.getElementById('quiz-count-title').style.display = 'none';
    document.getElementById('quiz-count-buttons').style.display = 'none';
    document.getElementById('timer-title').style.display = 'none';
    document.getElementById('timer-buttons').style.display = 'none';

    const answerContainer = document.getElementById('answer-lang-buttons');
    answerContainer.innerHTML = '';
    const btnZh = document.createElement('button');
    btnZh.className = 'mode-btn';
    btnZh.setAttribute('data-i18n', 'answer_lang_zh');
    btnZh.innerText = t('answer_lang_zh');
    btnZh.onclick = function() { selectAnswerLang('zh', this); };
    answerContainer.appendChild(btnZh);
    const btnEn = document.createElement('button');
    btnEn.className = 'mode-btn';
    btnEn.setAttribute('data-i18n', 'answer_lang_en');
    btnEn.innerText = t('answer_lang_en');
    btnEn.onclick = function() { selectAnswerLang('en', this); };
    answerContainer.appendChild(btnEn);

    const countContainer = document.getElementById('quiz-count-buttons');
    countContainer.innerHTML = '';
    const counts = [{n: 10, key: 'quiz_count_10'}, {n: 20, key: 'quiz_count_20'}, {n: 30, key: 'quiz_count_30'}, {n: 0, key: 'quiz_count_all'}];
    counts.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'mode-btn count-btn';
        btn.setAttribute('data-i18n', c.key);
        btn.innerText = t(c.key);
        btn.onclick = function() { selectCount(c.n, this); };
        countContainer.appendChild(btn);
    });

    if (skipModeSelection) {
        selectMode('meaning', btnMeaning);
    }
}

let selectedQuizMode = 'meaning';

function showChineseSelection() {
    hidePathCards();
    document.getElementById('setup-card').style.display = 'none';
    document.getElementById('mode-card').style.display = 'block';
    document.getElementById('quiz-card').style.display = 'none';
    document.getElementById('result-card').style.display = 'none';
    document.getElementById('mistake-card').style.display = 'none';
    document.getElementById('stats-card').style.display = 'none';

    zhCharType = '';
    zhTestType = '';
    selectedQuizMode = 'zh';
    needAnswerLang = true;

    setModeCardTitle('mode-title', 'zh_char_title');
    setModeCardTitle('answer-lang-title', 'zh_test_title');

    const container = document.getElementById('mode-buttons');
    container.innerHTML = '';
    const btnTrad = document.createElement('button');
    btnTrad.className = 'mode-btn';
    btnTrad.setAttribute('data-i18n', 'zh_char_trad');
    btnTrad.innerText = t('zh_char_trad');
    btnTrad.onclick = function() { selectZhCharType('trad', this); };
    container.appendChild(btnTrad);
    const btnSimp = document.createElement('button');
    btnSimp.className = 'mode-btn';
    btnSimp.setAttribute('data-i18n', 'zh_char_simp');
    btnSimp.innerText = t('zh_char_simp');
    btnSimp.onclick = function() { selectZhCharType('simp', this); };
    container.appendChild(btnSimp);

    document.getElementById('answer-lang-title').style.display = 'none';
    document.getElementById('answer-lang-buttons').style.display = 'none';
    document.getElementById('answer-lang-buttons').innerHTML = '';
    document.getElementById('quiz-count-title').style.display = 'none';
    document.getElementById('quiz-count-buttons').style.display = 'none';
    document.getElementById('timer-title').style.display = 'none';
    document.getElementById('timer-buttons').style.display = 'none';

    const countContainer = document.getElementById('quiz-count-buttons');
    countContainer.innerHTML = '';
    const counts = [{n: 10, key: 'quiz_count_10'}, {n: 20, key: 'quiz_count_20'}, {n: 30, key: 'quiz_count_30'}, {n: 0, key: 'quiz_count_all'}];
    counts.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'mode-btn count-btn';
        btn.setAttribute('data-i18n', c.key);
        btn.innerText = t(c.key);
        btn.onclick = function() { selectCount(c.n, this); };
        countContainer.appendChild(btn);
    });
}

function selectZhCharType(type, el) {
    zhCharType = type;
    zhTestType = '';
    document.querySelectorAll('#mode-buttons .mode-btn').forEach(b => b.classList.remove('mode-btn-active'));
    el.classList.add('mode-btn-active');

    const answerContainer = document.getElementById('answer-lang-buttons');
    answerContainer.innerHTML = '';
    const btnPron = document.createElement('button');
    btnPron.className = 'mode-btn';
    const pronKey = type === 'trad' ? 'zh_test_bopomofo' : 'zh_test_roman';
    btnPron.setAttribute('data-i18n', pronKey);
    btnPron.innerText = t(pronKey);
    btnPron.onclick = function() { selectZhTestType(type === 'trad' ? 'bopomofo' : 'roman', this); };
    answerContainer.appendChild(btnPron);
    const btnMean = document.createElement('button');
    btnMean.className = 'mode-btn';
    btnMean.setAttribute('data-i18n', 'zh_test_meaning');
    btnMean.innerText = t('zh_test_meaning');
    btnMean.onclick = function() { selectZhTestType('meaning', this); };
    answerContainer.appendChild(btnMean);

    document.getElementById('answer-lang-title').style.display = '';
    answerContainer.style.display = '';
    document.getElementById('quiz-count-title').style.display = 'none';
    document.getElementById('quiz-count-buttons').style.display = 'none';
    document.querySelectorAll('#quiz-count-buttons .mode-btn').forEach(b => b.classList.remove('mode-btn-active'));
}

function selectZhTestType(type, el) {
    zhTestType = type;
    document.querySelectorAll('#answer-lang-buttons .mode-btn').forEach(b => b.classList.remove('mode-btn-active'));
    el.classList.add('mode-btn-active');
    document.getElementById('quiz-count-title').style.display = '';
    document.getElementById('quiz-count-buttons').style.display = '';
}

function selectMode(mode, el) {
    selectedQuizMode = mode;
    document.querySelectorAll('#mode-buttons .mode-btn').forEach(b => b.classList.remove('mode-btn-active'));
    el.classList.add('mode-btn-active');
    document.getElementById('timer-title').style.display = 'none';
    document.getElementById('timer-buttons').style.display = 'none';
    if (needAnswerLang) {
        document.getElementById('answer-lang-title').style.display = '';
        document.getElementById('answer-lang-buttons').style.display = '';
    } else {
        document.getElementById('quiz-count-title').style.display = '';
        document.getElementById('quiz-count-buttons').style.display = '';
    }
    checkStartQuiz();
}

function selectAnswerLang(lang, el) {
    quizAnswerLang = lang;
    document.querySelectorAll('#answer-lang-buttons .mode-btn').forEach(b => b.classList.remove('mode-btn-active'));
    el.classList.add('mode-btn-active');
    document.getElementById('quiz-count-title').style.display = '';
    document.getElementById('quiz-count-buttons').style.display = '';
    checkStartQuiz();
}

function selectCount(n, el) {
    totalQuestions = n;
    document.querySelectorAll('#quiz-count-buttons .mode-btn').forEach(b => b.classList.remove('mode-btn-active'));
    el.classList.add('mode-btn-active');
    showTimerOptions();
}

function checkStartQuiz() {
    const modePicked = document.querySelector('#mode-buttons .mode-btn-active');
    const countPicked = document.querySelector('#quiz-count-buttons .mode-btn-active');
    const answerPicked = !needAnswerLang || document.querySelector('#answer-lang-buttons .mode-btn-active');
    if (modePicked && countPicked && answerPicked) {
        startQuiz(selectedQuizMode);
    }
}

function startQuiz(mode) {
    if (QUIZ_LANG_ORDER.includes(currentLang)) {
        try { localStorage.setItem('last_quiz_set', currentLang); } catch {}
    }
    currentMode = mode;
    score = 0;
    questionNum = 0;
    quizHistory = [];
    shuffledVocab = shuffleArray(vocabularyList);
    shuffledReading = shuffleArray(readingList);
    shuffledMeaning = shuffleArray(meaningList);
    vocabIdx = 0;
    readingIdx = 0;
    meaningIdx = 0;
    currentListeningMode = false;

    document.getElementById('mode-card').style.display = 'none';
    document.getElementById('quiz-card').style.display = 'block';
    document.getElementById('result-card').style.display = 'none';

    // the picked mode, worded like its button (the same key logic as showModeSelection);
    // otherwise (Chinese, custom sheets) the set's name
    const meaningKey = quizMeaningModeKey();
    const modeKey = { meaning: meaningKey, reading: 'mode_jp_reading', both: 'mode_both' }[mode];
    const setName = wordSetName(currentLang);
    document.getElementById('quiz-mode-label').innerText = modeKey ? t(modeKey)
        : setName !== 'quiz_' + currentLang ? setName : t('mode_title_label');
    document.getElementById('total-words').innerText = t('quiz_words', {n: vocabularyList.length});
    nextQuestion();
}

function pickQuestionType() {
    if (currentMode === 'meaning') return 'meaning';
    if (currentMode === 'reading') return 'reading';
    return Math.random() < 0.5 ? 'meaning' : 'reading';
}

function nextQuestion() {
    answered = false;
    questionNum++;
    if (questionNum === 1) startSessionStats();
    document.getElementById('question-count').innerText = t('quiz_question', {n: questionNum});
    document.getElementById('score-count').innerText = t('quiz_score', {n: score});
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('feedback').innerText = '';
    document.getElementById('feedback').className = 'feedback';

    setListeningStage(false);

    if (quizTimerSec > 0 && !currentListeningMode) {
        startTimer();
    } else {
        document.getElementById('timer-display').style.display = 'none';
        document.getElementById('timer-bar-container').style.display = 'none';
    }

    if (reviewMode) {
        currentReviewEntry = reviewList[reviewIdx++];
        currentLang = currentReviewEntry.lang; // an SRS review mixes word sets
        currentWord = { word: currentReviewEntry.word, kana: '', meaning: currentReviewEntry.answer, english: '' };
        if (isChineseQuizLang(currentReviewEntry.lang) && currentReviewEntry.zct) zhCharType = currentReviewEntry.zct;

        document.getElementById('word-question').innerText = currentReviewEntry.word;
        document.getElementById('word-hint').innerText = currentReviewEntry.hint || '';

        /* Wrong options, best first: other cards of the same word set and question type;
           the same set's cached word list (a new learner has only a few cards); near-miss
           kana for readings; the same type from other sets (an SRS review mixes sets);
           and only then answers of another type. */
        const e = currentReviewEntry;
        const notThis = m => m.answer && m.answer !== e.answer;
        const sameSet = reviewPool.filter(m => notThis(m) && m.group === e.group && m.lang === e.lang);
        const sameGroup = reviewPool.filter(m => notThis(m) && m.group === e.group && m.lang !== e.lang);
        const others = reviewPool.filter(m => notThis(m) && m.group !== e.group);
        let options = [e.answer];
        const take = list => {
            for (const p of list) {
                if (options.length >= 4) break;
                if (!options.includes(p.answer)) options.push(p.answer);
            }
        };
        // Japanese readings: look-alike kana, as in the JLPT (どうろ: どうろう, どろ, どろう)
        if (e.group === 'reading' && isJapaneseQuizLang(e.lang)) {
            generateSimilarReadings(e.answer, 3).forEach(r => { if (options.length < 4 && !options.includes(r)) options.push(r); });
        }
        take(shuffleArray(sameSet));
        if (options.length < 4) {
            const cache = getVocabCache(e.lang);
            const words = cache ? (cache.vocabularyList || []).concat(cache.readingList || []) : [];
            const answerOf = e.group === 'reading' ? w => w.kana
                : e.group.startsWith('zh-') ? w => w[e.group.slice(3)]
                : e.group === 'meaning-en' ? w => (w.english || w.meaning)
                : w => w.meaning;
            take(shuffleArray(words.map(w => ({ answer: answerOf(w) })).filter(notThis)));
        }
        if (options.length < 4 && e.group === 'reading') {
            for (const r of generateSimilarReadings(e.answer, 4 - options.length)) {
                if (options.length >= 4) break;
                if (!options.includes(r)) options.push(r);
            }
        }
        take(shuffleArray(sameGroup));
        take(shuffleArray(others));
        options.sort(() => Math.random() - 0.5);
        renderOptions(options, 'review');

        if (autoSpeak && currentWord.word && !isJapaneseQuizLang(currentLang)) setTimeout(() => speakWord(), 300);
        return;
    }

    if (isChineseQuizLang(currentLang)) {
        if (vocabIdx >= shuffledVocab.length) { shuffledVocab = shuffleArray(vocabularyList); vocabIdx = 0; }
        currentWord = shuffledVocab[vocabIdx++];
        const display = zhCharType === 'simp' ? currentWord.simp : currentWord.trad;
        currentWord.word = display;

        document.getElementById('word-question').innerText = display;
        document.getElementById('word-hint').innerText = '';

        const field = zhTestType;
        const pool = shuffledVocab.filter(w => w[field] && w[field].length > 0);
        const correctAnswer = currentWord[field];
        let options = [correctAnswer];
        let attempts = 0;
        while (options.length < 4 && pool.length >= 4 && attempts < 300) {
            attempts++;
            const pick = pool[Math.floor(Math.random() * pool.length)][field];
            if (!options.includes(pick)) options.push(pick);
        }
        options.sort(() => Math.random() - 0.5);
        renderOptions(options, 'zh');

        if (autoSpeak && currentWord.word) {
            setTimeout(() => speakWord(), 300);
        }
        return;
    }

    let questionType = pickQuestionType();
    const useEn = quizAnswerLang === 'en';
    /* For Japanese/JLPT, kanji words only ever get asked via "reading" and
       kana-only words only ever get asked via "meaning" (see addWord()) —
       so the meaning-question pool must be meaningList, not the full
       vocabularyList, otherwise a kanji word's meaning question would show
       its own pronunciation-revealing kanji with no reading test at all. */
    const jpSplit = isJapaneseQuizLang(currentLang);
    if (jpSplit && questionType === 'meaning' && shuffledMeaning.length < 4 && shuffledReading.length >= 4) {
        questionType = 'reading';
    }

    if (questionType === 'reading' && shuffledReading.length >= 4) {
        if (readingIdx >= shuffledReading.length) shuffledReading = shuffleArray(readingList);
        currentWord = shuffledReading[readingIdx++];

        document.getElementById('word-question').innerText = currentWord.word;
        document.getElementById('word-hint').innerText = useEn
            ? currentWord.english || currentWord.meaning
            : currentWord.meaning;

        let options = [currentWord.kana, ...generateSimilarReadings(currentWord.kana, 3)];
        while (options.length < 4) {
            const pick = shuffledReading[Math.floor(Math.random() * shuffledReading.length)].kana;
            if (!options.includes(pick)) options.push(pick);
        }
        options.sort(() => Math.random() - 0.5);
        renderOptions(options, 'reading');
    } else if (jpSplit && shuffledMeaning.length < 4) {
        renderOptions([], 'meaning');
        return;
    } else {
        const pool = jpSplit ? shuffledMeaning : shuffledVocab;
        if (jpSplit) {
            if (meaningIdx >= shuffledMeaning.length) shuffledMeaning = shuffleArray(meaningList);
            currentWord = shuffledMeaning[meaningIdx++];
        } else {
            if (vocabIdx >= shuffledVocab.length) shuffledVocab = shuffleArray(vocabularyList);
            currentWord = shuffledVocab[vocabIdx++];
        }

        document.getElementById('word-question').innerText = currentWord.word;
        document.getElementById('word-hint').innerText = currentWord.kana ? `讀法：${currentWord.kana}` : '';

        const answerPool = useEn
            ? pool.filter(w => w.english && w.english.length > 0)
            : pool;
        if (answerPool.length < 4) { renderOptions([], 'meaning'); return; }

        const correctAnswer = useEn ? (currentWord.english || currentWord.meaning) : currentWord.meaning;
        let options = [correctAnswer];
        while (options.length < 4) {
            const pick = answerPool[Math.floor(Math.random() * answerPool.length)];
            const val = useEn ? (pick.english || pick.meaning) : pick.meaning;
            if (!options.includes(val)) options.push(val);
        }
        options.sort(() => Math.random() - 0.5);
        renderOptions(options, 'meaning');
    }

    /* Japanese/JLPT: never auto-speak when a question first appears (that
       would hand over the reading to anyone who recognizes 50-on sounds) —
       pronunciation only plays automatically after a wrong answer, in
       selectOption(). Other languages keep the original entry auto-speak. */
    if (autoSpeak && currentWord && currentWord.word && !jpSplit) {
        setTimeout(() => speakWord(), 300);
    }
}

/* The type of the question on screen ('meaning' | 'reading' | 'zh' | 'review'); the
   timer needs it because in mixed modes each question picks its own type. */
let currentQType = '';

function correctAnswerFor(type) {
    const useEn = quizAnswerLang === 'en';
    return type === 'reading' ? currentWord.kana
        : type === 'zh' ? currentWord[zhTestType]
        : type === 'review' ? currentReviewEntry.answer
        : (useEn ? (currentWord.english || currentWord.meaning) : currentWord.meaning);
}

function renderOptions(options, type) {
    currentQType = type;
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    options.forEach((optText) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = optText;
        btn.onclick = () => selectOption(btn, optText, type);
        container.appendChild(btn);
    });
}

/* ----- per-session extras: answer streak ("連對"), time taken, repair re-asks -----
   Reset when a session asks its first question (questionNum === 1), so every way of
   starting a quiz / review / lesson / listening round gets them without its own code. */
const COMBO_SHOW_FROM = 3;   // "連對 N 題" appears from the 3rd right answer in a row
let comboNow = 0;
let comboBest = 0;
let sessionStartedAt = 0;
let repairRequeued = new Set();

function startSessionStats() {
    comboNow = 0;
    comboBest = 0;
    sessionStartedAt = Date.now();
    repairRequeued = new Set();
}

function noteCombo(correct) {
    comboNow = correct ? comboNow + 1 : 0;
    comboBest = Math.max(comboBest, comboNow);
    if (typeof railReact === 'function') railReact(correct ? 'combo' : 'wrong', comboNow);
}

function correctFeedbackText(repaired) {
    let s = t('correct');
    if (comboNow >= COMBO_SHOW_FROM) s += '  🔥 ' + t('combo_n', { n: comboNow });
    if (repaired) s += '  🔧 ' + t('mistake_repaired', { w: repaired.word });
    return s;
}

/* A mistake-repair session asks a word answered right once more, a few questions
   later, so one session can take it the whole MISTAKE_FIX_STREAK. */
function requeueForRepair(entry) {
    if (!entry || repairRequeued.has(entry.id)) return;
    repairRequeued.add(entry.id);
    const at = Math.min(reviewIdx + 3, reviewList.length);
    reviewList.splice(at, 0, entry);
    totalQuestions = reviewList.length;
}

function selectOption(selectedBtn, selectedText, type) {
    if (answered) return;
    answered = true;
    logDailyActivity();
    stopTimer();

    const allBtns = document.querySelectorAll('.option-btn');
    allBtns.forEach(btn => btn.disabled = true);

    const feedback = document.getElementById('feedback');
    const correctAnswer = correctAnswerFor(type);
    const isCorrect = selectedText === correctAnswer;

    /* Every answer grades the word's SRS card; a miss goes to the mistake book, and a
       right answer is a step towards repairing it there (noteMistakeCorrect). */
    const entry = type === 'review' ? currentReviewEntry : quizEntryFor(type, correctAnswer);
    gradeSrsQuizCard(entry, isCorrect);
    let repaired = null;
    if (isCorrect) {
        const m = entry && noteMistakeCorrect(entry.id);
        if (m && m.fixedAt) repaired = m;
        else if (m && reviewMode && reviewSource === 'mistakes') requeueForRepair(entry);
    } else {
        addMistakeEntry(entry);
    }
    noteCombo(isCorrect);

    quizHistory.push({
        question: currentWord.word,
        yourAnswer: selectedText,
        correctAnswer: correctAnswer,
        isCorrect: isCorrect,
        type: type,
        entry: entry
    });

    if (isCorrect) {
        score += 10;
        selectedBtn.classList.add('correct-choice');
        feedback.innerText = correctFeedbackText(repaired);
        feedback.className = 'feedback correct';
        playSound(true);
    } else {
        score = Math.max(0, score - 3);
        selectedBtn.classList.add('wrong-choice');
        allBtns.forEach(btn => {
            if (btn.innerText === correctAnswer) {
                btn.classList.add('correct-choice');
            }
        });
        feedback.innerText = t('wrong') + correctAnswer;
        feedback.className = 'feedback wrong';
        playSound(false);
        /* Japanese/JLPT only auto-speaks after a wrong answer (never on
           question entry, see nextQuestion()) so the pronunciation serves
           as a learning aid instead of a giveaway. */
        if (autoSpeak && isJapaneseQuizLang(currentLang) && currentWord && currentWord.word) {
            setTimeout(() => speakWord(), 300);
        }
    }

    document.getElementById('score-count').innerText = `${t('quiz_score', {n: score})}`;

    if (totalQuestions > 0 && questionNum >= totalQuestions) {
        document.getElementById('nextBtn').innerText = t('quiz_next');
        document.getElementById('nextBtn').onclick = () => showResults();
    } else {
        document.getElementById('nextBtn').innerText = t('quiz_next');
        document.getElementById('nextBtn').onclick = () => nextQuestion();
    }
    document.getElementById('nextBtn').style.display = 'inline-block';
}

function showResults() {
    stopTimer();
    const quizCard = document.getElementById('quiz-card');
    const resultCard = document.getElementById('result-card');
    quizCard.style.transition = 'opacity 150ms ease-out';
    quizCard.style.opacity = '0';
    setTimeout(() => {
        quizCard.style.display = 'none';
        quizCard.style.opacity = '';
        quizCard.style.transition = '';
        resultCard.style.display = 'block';
        resultCard.classList.remove('result-card-enter');
        void resultCard.offsetWidth;
        resultCard.classList.add('result-card-enter');
        window.scrollTo(0, 0);
        if (percentage >= 60 && typeof mascotHop === 'function') setTimeout(() => mascotHop(resultCard.querySelector('.rs-mascot')), 350);
    }, 150);

    const correctCount = quizHistory.filter(h => h.isCorrect).length;
    const wrongCount = quizHistory.filter(h => !h.isCorrect).length;
    const total = quizHistory.length;
    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    if (total > 0) {
        const rec = {
            date: Date.now(),
            lang: reviewMode && reviewSource === 'srs' ? 'srs' : currentLang,
            review: reviewMode,
            total: total,
            correct: correctCount,
            wrong: wrongCount,
            score: score,
            pct: percentage
        };
        if (currentListeningMode) rec.kind = 'listening';
        saveQuizRecord(rec);
        checkAchievements();
    }
    if (total > 0 && typeof railReact === 'function') railReact('result', percentage);

    /* celebration, the three numbers, today's goal and the reason to come back
       (resultHeroHtml & co. in js/practice.js) */
    document.getElementById('result-summary').innerHTML =
        resultHeroHtml(percentage, [
            { n: percentage + '%', label: t('result_accuracy'), cls: 'good' },
            { n: comboBest, label: t('result_best_combo'), cls: 'gold' },
            { n: practiceDuration(), label: t('result_time'), cls: 'time' }
        ]) +
        (reviewMode && reviewSource === 'lesson' ? lessonResultHtml(percentage) : '') +
        `<p class="rs-score">${escHtml(t('result_line', { c: correctCount, n: total, s: score }))}</p>` +
        resultGoalHtml() +
        resultHookHtml(reviewMode && reviewSource === 'srs');

    let detailHTML = `<details class="pc-details"><summary>${escHtml(t('result_each', { n: total }))}</summary><table class="result-table"><thead><tr>`;
    detailHTML += `<th>${t('result_col_question')}</th>`;
    detailHTML += `<th>${t('result_your_answer')}</th>`;
    detailHTML += `<th>${t('result_correct_answer')}</th></tr></thead><tbody>`;

    quizHistory.forEach((h, i) => {
        const cls = h.isCorrect ? 'result-correct' : 'result-wrong';
        detailHTML += `<tr class="${cls}">
            <td>${i + 1}. ${escHtml(h.question)}</td>
            <td>${escHtml(h.yourAnswer)}</td>
            <td>${escHtml(h.correctAnswer)}</td>
        </tr>`;
    });
    detailHTML += '</tbody></table></details>';
    document.getElementById('result-detail').innerHTML = detailHTML;

    // "再練錯的字": the words just missed, when the engine can ask them again
    const wrongEntries = new Set(quizHistory.filter(h => !h.isCorrect && h.entry && h.entry.answer).map(h => h.entry.id));
    const retry = document.getElementById('retry-wrong-btn');
    if (retry) {
        retry.style.display = wrongEntries.size ? '' : 'none';
        retry.textContent = t('result_retry_wrong', { n: wrongEntries.size });
    }
}

function backToLanguage() {
    if (reviewMode && reviewSource === 'lesson') {
        lessonBack();
        return;
    }
    const wasMistakeRepair = reviewMode && reviewSource === 'mistakes';
    const wasListening = currentListeningMode;
    const wasSrsReview = reviewMode && reviewSource === 'srs';
    // a set's "返回" lands on the 單字 tab it was chosen from
    if (currentLang && QUIZ_LANG_ORDER.includes(currentLang)) wordsTab = topicOf(currentLang) ? 'topics' : 'levels';
    currentLang = '';
    vocabularyList = [];
    readingList = [];
    meaningList = [];
    reviewMode = false;
    reviewSource = '';
    setQuizBackLabels(false);
    currentListeningMode = false;
    stopTimer();
    quizTimerSec = 0;
    showOnlyQuizCard('lang-card');
    updateMistakeBadge();
    updateStreakBadge();

    /* a review mixes word sets, so "返回" goes back to where it was started from:
       the mistake book, the 間隔複習 page or the home dashboard */
    if (wasMistakeRepair) {
        showMistakeBook();
        return;
    }
    if (wasListening) {
        startListeningQuiz();
        return;
    }
    if (wasSrsReview) {
        if (srsReviewOrigin === 'tool') showSrsDashboard();
        else if (srsReviewOrigin === 'notes') switchPage('notes', null);
        else switchPage('home', null);
        return;
    }
}

/* ===================== 錯題本 Mistake Notebook ===================== */

let reviewMode = false;
let reviewList = [];
let reviewIdx = 0;
let reviewPool = [];
let currentReviewEntry = null;

const QUIZ_LANG_FLAGS = {
    srs: '🔁', jp: '🇯🇵', kr: '🇰🇷', fr: '🇫🇷', en: '🇺🇸', zh: '🇨🇳',
    fr_a1: '📖', fr_a2: '📖', fr_b1: '📖', fr_b2: '📖', fr_c1: '📖',
    es_a1: '📖', es_a2: '📖', es_b1: '📖', es_b2: '📖', es_c1: '📖',
    de_a1: '📖', de_a2: '📖', de_b1: '📖', de_b2: '📖', de_c1: '📖',
    ru_a1: '📖', ru_a2: '📖', ru_b1: '📖', ru_b2: '📖', ru_c1: '📖',
    en_jh: '📘', en_sh: '📘', en_toeic: '📘', en_toefl: '📘',
    jlpt_n5: '📖', jlpt_n4: '📖', jlpt_n3: '📖', jlpt_n2: '📖', jlpt_n1: '📖',
    topik_1: '📖', topik_2: '📖', topik_3: '📖', topik_4: '📖',
    hsk_1: '📖', hsk_2: '📖', hsk_3: '📖', hsk_4: '📖', hsk_5: '📖', hsk_6: '📖', hsk_7: '📖'
};
Object.keys(BUNDLED_SETS).forEach(id => { const tp = topicOf(id); if (tp) QUIZ_LANG_FLAGS[id] = TOPIC_EMOJI[tp.topic]; });
/* The sets a visitor can pick (paths, "continue", recent sets). */
const QUIZ_LANG_ORDER = [].concat(WORD_SET_FAMILIES.en, WORD_SET_FAMILIES.jp, WORD_SET_FAMILIES.kr, WORD_SET_FAMILIES.zh, WORD_SET_FAMILIES.fr, WORD_SET_FAMILIES.ru, WORD_SET_FAMILIES.es, WORD_SET_FAMILIES.de);
/* Retired general sheets; their mistake-book entries and SRS cards still exist. */
const LEGACY_SET_IDS = ['jp', 'kr', 'en', 'zh', 'fr'];

function escQ(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getMistakes() {
    try { return JSON.parse(localStorage.getItem('quiz_mistakes')) || []; }
    catch { return []; }
}

/* A mistake is "repaired" by answering it right MISTAKE_FIX_STREAK times in a row
   (entry.fix counts them; a miss resets it). A repaired entry keeps its row, struck
   through with a 「已修正」 stamp and fixedAt set, until it is MISTAKE_FIXED_KEEP_DAYS
   old; missing it again puts it back on the list. */
const MISTAKE_FIX_STREAK = 2;
const MISTAKE_FIXED_KEEP_DAYS = 30;

function isMistakeActive(m) {
    return !m.fixedAt;
}

function getActiveMistakes() {
    return getMistakes().filter(isMistakeActive);
}

function saveMistakes(list) {
    const cutoff = Date.now() - MISTAKE_FIXED_KEEP_DAYS * 24 * 60 * 60 * 1000;
    list = list.filter(m => !m.fixedAt || m.fixedAt > cutoff);
    if (list.length > 300) {
        // drop repaired rows before the ones still to fix, oldest first
        list = list.sort((a, b) => (!!a.fixedAt - !!b.fixedAt) || (b.last - a.last)).slice(0, 300);
    }
    storeSet('quiz_mistakes', JSON.stringify(list));
    updateMistakeBadge();
}

/* A right answer to a word in the mistake book: one step towards repairing it.
   Returns the entry after the step (null when the word isn't an open mistake). */
function noteMistakeCorrect(id) {
    if (!id) return null;
    const list = getMistakes();
    const m = list.find(x => x.id === id);
    if (!m || m.fixedAt) return null;
    m.fix = (m.fix || 0) + 1;
    if (m.fix >= MISTAKE_FIX_STREAK) m.fixedAt = Date.now();
    saveMistakes(list);
    return m;
}

/* A timed-out answer: not a new mistake, but it does break a repair streak. */
function breakMistakeStreak(id) {
    const list = getMistakes();
    const m = list.find(x => x.id === id);
    if (!m || m.fixedAt || !m.fix) return;
    m.fix = 0;
    saveMistakes(list);
}

/* The question on screen as a self-contained entry; mistake-book entries and SRS
   cards share this shape (and id), so either can be replayed by the review engine. */
function quizEntryFor(type, correctAnswer) {
    if (!currentWord || !currentWord.word) return null;
    const group = type === 'zh' ? 'zh-' + zhTestType
        : type === 'reading' ? 'reading'
        : 'meaning-' + (quizAnswerLang || 'zh');
    const hint = type === 'reading' ? (currentWord.meaning || '')
        : (currentWord.kana || '');
    return {
        id: currentLang + '|' + currentWord.word + '|' + group,
        lang: currentLang,
        word: currentWord.word,
        answer: correctAnswer,
        hint: hint,
        group: group,
        zct: isChineseQuizLang(currentLang) ? zhCharType : undefined
    };
}

function addMistakeEntry(entry) {
    if (!entry) return;
    const list = getMistakes();
    const existing = list.find(m => m.id === entry.id);
    if (existing) {
        existing.count++;
        existing.last = Date.now();
        existing.answer = entry.answer;
        existing.fix = 0;
        delete existing.fixedAt;   // missed again: back on the list
    } else {
        list.push({
            id: entry.id,
            lang: entry.lang,
            word: entry.word,
            answer: entry.answer,
            hint: entry.hint,
            group: entry.group,
            zct: entry.zct,
            count: 1,
            fix: 0,
            last: Date.now()
        });
    }
    saveMistakes(list);
}

function recordMistake(type, correctAnswer) {
    addMistakeEntry(quizEntryFor(type, correctAnswer));
}

function removeMistakeById(id) {
    saveMistakes(getMistakes().filter(m => m.id !== id));
}

/* The quiz page's tool hub shows the open mistakes (js/practice.js draws it). */
function updateMistakeBadge() {
    if (typeof renderPracticeHub === 'function') renderPracticeHub();
    updateReviewBadge();
}

/* The mistake book itself (#mistake-card) is drawn by js/practice.js. */

/* ===================== 測驗統計 Quiz Stats ===================== */

function getQuizRecords() {
    try { return JSON.parse(localStorage.getItem('quiz_records')) || []; }
    catch { return []; }
}

function saveQuizRecord(rec) {
    const list = getQuizRecords();
    list.push(rec);
    if (list.length > 200) list.splice(0, list.length - 200);
    storeSet('quiz_records', JSON.stringify(list));
}

/* ===== Daily activity (home dashboard: daily goal + streak) =====
   localStorage.daily_activity = { 'Y-M-D': words practised that day }, bumped
   once per answered quiz / listening question and per rated flashcard. */
function activityDayKey(ts) {
    const d = new Date(ts);
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

function getDailyActivity() {
    try { return JSON.parse(localStorage.getItem('daily_activity')) || {}; }
    catch { return {}; }
}

const DAILY_ACTIVITY_KEEP_DAYS = 120;

function logDailyActivity() {
    const act = getDailyActivity();
    const today = activityDayKey(Date.now());
    act[today] = (act[today] || 0) + 1;
    const keys = Object.keys(act);
    if (keys.length > DAILY_ACTIVITY_KEEP_DAYS) {
        const toTime = k => new Date(k.replace(/-/g, '/')).getTime();
        keys.sort((a, b) => toTime(a) - toTime(b))
            .slice(0, keys.length - DAILY_ACTIVITY_KEEP_DAYS)
            .forEach(k => delete act[k]);
    }
    storeSet('daily_activity', JSON.stringify(act));
}

/* A day counts toward the streak if a quiz was finished OR any word was
   practised (daily_activity), so answering a few questions keeps it alive. */
function calcStreak(recs) {
    const dayKey = activityDayKey;
    const days = new Set((recs || []).map(r => dayKey(r.date)));
    Object.entries(getDailyActivity()).forEach(([k, n]) => { if (n > 0) days.add(k); });
    if (days.size === 0) return 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    if (!days.has(dayKey(cursor.getTime()))) {
        cursor.setDate(cursor.getDate() - 1);
    }
    let streak = 0;
    while (days.has(dayKey(cursor.getTime()))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
}

function updateStreakBadge() {
    const wrap = document.getElementById('streak-display');
    const countEl = document.getElementById('streak-count');
    if (!wrap || !countEl) return;
    const streak = calcStreak(getQuizRecords());
    countEl.textContent = streak;
    wrap.style.display = streak > 0 ? '' : 'none';
}

/* The stats page (#stats-card) is drawn by js/practice.js. */

/* ===================== 成就系統 Achievements ===================== */

const ACHIEVEMENTS = [
    { id: 'first_quiz', icon: '🎉', titleKey: 'ach_first_quiz', descKey: 'ach_first_quiz_desc', check: d => d.total >= 1 },
    { id: 'quiz_10', icon: '📚', titleKey: 'ach_quiz_10', descKey: 'ach_quiz_10_desc', check: d => d.total >= 10 },
    { id: 'streak_3', icon: '🔥', titleKey: 'ach_streak_3', descKey: 'ach_streak_3_desc', check: d => d.streak >= 3 },
    { id: 'streak_7', icon: '⚡', titleKey: 'ach_streak_7', descKey: 'ach_streak_7_desc', check: d => d.streak >= 7 },
    { id: 'perfect', icon: '💯', titleKey: 'ach_perfect', descKey: 'ach_perfect_desc', check: d => d.hasPerfect },
    { id: 'mastered_50', icon: '🏆', titleKey: 'ach_mastered_50', descKey: 'ach_mastered_50_desc', check: d => d.mastered >= 50 },
];

function getUnlockedAchievements() {
    try { return JSON.parse(localStorage.getItem('quiz_achievements')) || []; }
    catch { return []; }
}

function computeAchievementData() {
    const recs = getQuizRecords();
    return {
        total: recs.length,
        streak: calcStreak(recs),
        hasPerfect: recs.some(r => r.pct === 100),
        mastered: getFlashcardKnown().length
    };
}

function checkAchievements() {
    const data = computeAchievementData();
    const unlocked = new Set(getUnlockedAchievements());
    const newly = [];
    ACHIEVEMENTS.forEach(a => {
        if (!unlocked.has(a.id) && a.check(data)) {
            unlocked.add(a.id);
            newly.push(a);
        }
    });
    if (newly.length) {
        storeSet('quiz_achievements', JSON.stringify([...unlocked]));
        newly.forEach((a, i) => {
            setTimeout(() => showShareToast(`${a.icon} ${t('ach_unlocked')}: ${t(a.titleKey)}`), i * 1200);
        });
    }
    return unlocked;
}

function renderAchievementsHTML() {
    const unlocked = checkAchievements();
    const items = ACHIEVEMENTS.map(a => {
        const isUnlocked = unlocked.has(a.id);
        return `<div class="achievement-badge${isUnlocked ? '' : ' locked'}">
            <div class="achievement-icon">${a.icon}</div>
            <div class="achievement-title">${t(a.titleKey)}</div>
            <div class="achievement-desc">${t(a.descKey)}</div>
        </div>`;
    }).join('');
    return `<div class="stats-chart-title">${t('achievements_title')}</div>
    <div class="achievement-grid">${items}</div>`;
}

function closeQuizTools() {
    backToLanguage();
}

/* ===================== Share Score Card ===================== */

function shareScoreCard() {
    const correctCount = quizHistory.filter(h => h.isCorrect).length;
    const wrongCount = quizHistory.filter(h => !h.isCorrect).length;
    const total = quizHistory.length;
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    const W = 600, H = 320;
    const cvs = document.createElement('canvas');
    cvs.width = W * 2; cvs.height = H * 2;
    const ctx = cvs.getContext('2d');
    ctx.scale(2, 2);

    /* An exported image, so it always uses the light 和紙 palette
       (canvas can't read the page's CSS variables anyway). */
    ctx.fillStyle = '#f6f1e6';
    roundRect(ctx, 0, 0, W, H, 20);
    ctx.fill();

    ctx.fillStyle = '#c8432b';
    ctx.fillRect(12, 28, 4, 34);

    ctx.strokeStyle = '#d9cfbc';
    ctx.lineWidth = 1;
    roundRect(ctx, 12, 12, W - 24, H - 24, 16);
    ctx.stroke();

    /* an SRS review mixes word sets (currentLang is just the last question's set) */
    const srsReview = reviewMode && reviewSource === 'srs';
    const flag = QUIZ_LANG_FLAGS[currentLang] || '';
    const langLabel = srsReview ? t('srs_title') : flag + ' ' + (wordSetName(currentLang) || currentLang);
    ctx.font = '700 18px "Noto Serif TC", "Noto Sans TC", "Noto Sans JP", serif';
    ctx.fillStyle = '#2b2724';
    ctx.textAlign = 'left';
    ctx.fillText(langLabel, 36, 50);

    if (reviewMode && !srsReview) {
        ctx.font = '14px "Noto Sans TC", sans-serif';
        ctx.fillStyle = '#93301d';
        ctx.fillText(t('review_label') || '📖 Review', 36, 74); // the label already starts with 📖
    }

    ctx.textAlign = 'right';
    ctx.font = '13px "Noto Sans TC", "Noto Sans JP", sans-serif';
    ctx.fillStyle = 'rgba(43,39,36,0.45)';
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()}`;
    ctx.fillText(dateStr, W - 36, 40);

    ctx.textAlign = 'center';

    const pctColor = pct >= 80 ? '#5b6b4e' : pct >= 60 ? '#b8862b' : '#c8432b';
    ctx.font = '900 72px "Noto Serif TC", "Noto Sans TC", serif';
    ctx.fillStyle = pctColor;
    ctx.fillText(pct + '%', W / 2, 145);

    ctx.font = '15px "Noto Sans TC", "Noto Sans JP", sans-serif';
    ctx.fillStyle = 'rgba(43,39,36,0.6)';
    const pctLabel = (t('result_correct') || 'Correct') + ' ' + correctCount + ' / ' + total;
    ctx.fillText(pctLabel, W / 2, 172);

    const bx = 36, bw = (W - 72 - 24) / 3;
    const by = 195, bh = 70;
    const statsData = [
        { label: t('result_correct') || 'Correct', value: correctCount, color: '#5b6b4e' },
        { label: t('result_wrong') || 'Wrong', value: wrongCount, color: '#c8432b' },
        { label: t('result_score') || 'Score', value: score, color: '#93301d' }
    ];
    statsData.forEach((s, i) => {
        const x = bx + i * (bw + 12);
        ctx.fillStyle = '#cbbfa8';            // chunky bottom edge
        roundRect(ctx, x, by + 4, bw, bh, 12);
        ctx.fill();
        ctx.fillStyle = '#fbf7ef';
        roundRect(ctx, x, by, bw, bh, 12);
        ctx.fill();
        ctx.strokeStyle = '#d9cfbc';
        ctx.lineWidth = 1.5;
        roundRect(ctx, x, by, bw, bh, 12);
        ctx.stroke();
        ctx.fillStyle = s.color;
        ctx.font = 'bold 28px "Noto Sans TC", "Noto Sans JP", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(s.value), x + bw / 2, by + 35);
        ctx.fillStyle = 'rgba(43,39,36,0.6)';
        ctx.font = '13px "Noto Sans TC", "Noto Sans JP", sans-serif';
        ctx.fillText(s.label, x + bw / 2, by + 56);
    });

    ctx.textAlign = 'right';
    ctx.font = '13px "Noto Sans TC", "Noto Sans JP", sans-serif';
    ctx.fillStyle = 'rgba(43,39,36,0.4)';
    ctx.fillText('Hanabiの小天地 ✦', W - 36, H - 24);

    cvs.toBlob(function(blob) {
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], 'score.png', { type: 'image/png' })] })) {
            const file = new File([blob], 'score.png', { type: 'image/png' });
            navigator.share({ files: [file] }).catch(function() {});
        } else if (navigator.clipboard && navigator.clipboard.write) {
            const item = new ClipboardItem({ 'image/png': blob });
            navigator.clipboard.write([item]).then(function() {
                showShareToast(t('share_copied') || '已複製到剪貼簿！');
            }).catch(function() {
                downloadBlob(blob);
            });
        } else {
            downloadBlob(blob);
        }
    }, 'image/png');

    function downloadBlob(b) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = 'hanabi-score.png';
        a.click();
        URL.revokeObjectURL(a.href);
        showShareToast(t('share_downloaded') || '已下載圖片！');
    }
}

function showShareToast(msg) {
    let toast = document.getElementById('share-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'share-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className = 'share-toast show';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function() { toast.className = 'share-toast'; }, 2500);
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

/* ===================== Timer Mode ===================== */

let quizTimerSec = 0;
let timerInterval = null;
let timeLeft = 0;

function selectTimer(sec, el) {
    quizTimerSec = sec;
    document.querySelectorAll('#timer-buttons .mode-btn').forEach(b => b.classList.remove('mode-btn-active'));
    el.classList.add('mode-btn-active');
    checkStartQuizWithTimer();
}

function checkStartQuizWithTimer() {
    const modePicked = document.querySelector('#mode-buttons .mode-btn-active');
    const countPicked = document.querySelector('#quiz-count-buttons .mode-btn-active');
    const answerPicked = !needAnswerLang || document.querySelector('#answer-lang-buttons .mode-btn-active');
    const timerPicked = document.querySelector('#timer-buttons .mode-btn-active');
    if (modePicked && countPicked && answerPicked && timerPicked) {
        startQuiz(selectedQuizMode);
    }
}

function showTimerOptions() {
    const title = document.getElementById('timer-title');
    const container = document.getElementById('timer-buttons');
    title.style.display = '';
    container.style.display = '';
    container.innerHTML = '';
    const opts = [
        { sec: 0, key: 'timer_none' },
        { sec: 15, key: 'timer_15' },
        { sec: 30, key: 'timer_30' }
    ];
    opts.forEach(o => {
        const btn = document.createElement('button');
        btn.className = 'mode-btn count-btn';
        btn.setAttribute('data-i18n', o.key);
        btn.innerText = t(o.key);
        btn.onclick = function() { selectTimer(o.sec, this); };
        container.appendChild(btn);
    });
}

function startTimer() {
    if (quizTimerSec <= 0) {
        document.getElementById('timer-display').style.display = 'none';
        document.getElementById('timer-bar-container').style.display = 'none';
        return;
    }
    timeLeft = quizTimerSec;
    const display = document.getElementById('timer-display');
    const barContainer = document.getElementById('timer-bar-container');
    const bar = document.getElementById('timer-bar');
    display.style.display = '';
    barContainer.style.display = '';
    display.textContent = '\u23F1 ' + timeLeft;
    bar.style.width = '100%';
    bar.style.transition = 'none';
    bar.style.background = '';
    void bar.offsetWidth;
    bar.style.transition = 'width ' + quizTimerSec + 's linear, background 0.3s';
    bar.style.width = '0%';
    if (timeLeft <= 5) bar.style.background = 'var(--accent-red)';
    else if (timeLeft <= 10) bar.style.background = 'var(--accent-yellow)';
    else bar.style.background = 'var(--success)';

    clearInterval(timerInterval);
    timerInterval = setInterval(function() {
        timeLeft--;
        display.textContent = '\u23F1 ' + timeLeft;
        if (timeLeft <= 5) bar.style.background = 'var(--accent-red)';
        else if (timeLeft <= 10) bar.style.background = 'var(--accent-yellow)';
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            onTimerExpired();
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        const bar = document.getElementById('timer-bar');
        if (bar) {
            const computed = getComputedStyle(bar);
            bar.style.transition = 'none';
            bar.style.width = computed.width;
        }
    }
}

function onTimerExpired() {
    if (answered) return;
    answered = true;
    const feedback = document.getElementById('feedback');
    const allBtns = document.querySelectorAll('.option-btn');
    allBtns.forEach(btn => btn.disabled = true);

    let correctAnswer = '';
    let entry = null;
    if (currentListeningMode) {
        correctAnswer = listeningDisplayAnswer();
    } else {
        /* currentQType is the type this question was actually asked as (mixed modes
           decide per question); the mode-based guess is only a fallback. */
        const type = currentQType || (currentMode === 'reading' ? 'reading' : isChineseQuizLang(currentLang) ? 'zh' : 'meaning');
        correctAnswer = correctAnswerFor(type);
        entry = type === 'review' ? currentReviewEntry : quizEntryFor(type, correctAnswer);
        gradeSrsQuizCard(entry, false);
        if (entry) breakMistakeStreak(entry.id);
    }
    noteCombo(false);

    score = Math.max(0, score - 3);
    feedback.innerText = t('timer_expired') + correctAnswer;
    feedback.className = 'feedback wrong';
    playSound(false);

    if (!currentListeningMode) {
        allBtns.forEach(btn => {
            if (btn.innerText === correctAnswer) btn.classList.add('correct-choice');
        });
    }

    quizHistory.push({
        question: currentWord.word,
        yourAnswer: '⏱ ' + (t('timer_expired_short') || '超時'),
        correctAnswer: correctAnswer,
        isCorrect: false,
        type: currentListeningMode ? 'listening' : 'timed',
        entry: entry
    });

    document.getElementById('score-count').innerText = t('quiz_score', {n: score});
    document.getElementById('nextBtn').innerText = t('quiz_next');
    if (totalQuestions > 0 && questionNum >= totalQuestions) {
        document.getElementById('nextBtn').onclick = () => showResults();
    } else {
        document.getElementById('nextBtn').onclick = () => nextQuestion();
    }
    document.getElementById('nextBtn').style.display = 'inline-block';

    if (currentListeningMode) {
        const input = document.getElementById('listening-input');
        if (input) { input.disabled = true; }
        const submitBtn = document.getElementById('listening-submit');
        if (submitBtn) submitBtn.style.display = 'none';
    }
}

/* ===================== Flashcard Mode ===================== */

let flashcardList = [];
let flashcardIdx = 0;
let flashcardKnownSet = new Set();
let flashcardUnknownSet = new Set();
let flashcardLang = '';
let flashcardMode = '';

function getFlashcardKnown() {
    try { return JSON.parse(localStorage.getItem('flashcard_known')) || []; } catch { return []; }
}

function saveFlashcardKnown() {
    storeSet('flashcard_known', JSON.stringify([...flashcardKnownSet]));
}

function getFlashcardUnknown() {
    try { return JSON.parse(localStorage.getItem('flashcard_unknown')) || []; } catch { return []; }
}

function saveFlashcardUnknown() {
    storeSet('flashcard_unknown', JSON.stringify([...flashcardUnknownSet]));
}

/* ===================== Spaced Repetition (quiz words, Leitner boxes) =====================
   Every word answered in a normal quiz (and every mistake-review answer) becomes a card
   in localStorage.srs_quiz, keyed and shaped exactly like a mistake-book entry
   ({id, lang, word, answer, hint, group, zct}) plus Leitner state {box, due, seen}. That
   shape lets the review session reuse the mistake-review question engine (reviewMode in
   nextQuestion()). A correct answer moves a card up a box (longer wait); a miss drops it
   to box 1 and brings it back in 10 minutes.
   This replaced the older flashcard-only SRS (srs_cards), whose cards kept only the word,
   not its answer, so they couldn't be carried over. */
const SRS_INTERVAL_DAYS = [0, 1, 3, 7, 14, 30]; // index 0 = box 1
const SRS_AGAIN_DELAY_MS = 10 * 60 * 1000; // so a missed card doesn't instantly reappear
const SRS_REVIEW_LIMIT = 20;
const SRS_QUIZ_MAX_CARDS = 4000;
let reviewSource = ''; // 'mistakes' | 'srs' while reviewMode is on

function getSrsQuizCards() {
    try { return JSON.parse(localStorage.getItem('srs_quiz')) || {}; } catch { return {}; }
}

function saveSrsQuizCards(cards) {
    const ids = Object.keys(cards);
    if (ids.length > SRS_QUIZ_MAX_CARDS) {
        // keep the store bounded: drop the best-known cards first (highest box, latest due)
        ids.sort((a, b) => (cards[b].box - cards[a].box) || (cards[b].due - cards[a].due))
            .slice(0, ids.length - SRS_QUIZ_MAX_CARDS)
            .forEach(id => delete cards[id]);
    }
    storeSet('srs_quiz', JSON.stringify(cards));
}

function gradeSrsQuizCard(entry, good) {
    if (!entry || !entry.id || !entry.answer) return;
    const cards = getSrsQuizCards();
    const prev = cards[entry.id];
    const now = Date.now();
    let box = prev ? prev.box : 1;
    let due;
    if (good) {
        box = Math.min(box + 1, SRS_INTERVAL_DAYS.length);
        due = now + SRS_INTERVAL_DAYS[box - 1] * 24 * 60 * 60 * 1000;
    } else {
        box = 1;
        due = now + SRS_AGAIN_DELAY_MS;
    }
    cards[entry.id] = {
        id: entry.id, lang: entry.lang, word: entry.word, answer: entry.answer,
        hint: entry.hint || '', group: entry.group, zct: entry.zct,
        box: box, due: due, seen: now
    };
    saveSrsQuizCards(cards);
}

function getDueSrsQuizCards() {
    const now = Date.now();
    return Object.values(getSrsQuizCards())
        .filter(c => c && c.due <= now)
        .sort((a, b) => a.due - b.due);
}

function srsQuizDueCount() {
    return getDueSrsQuizCards().length;
}

/* The quiz page's "間隔複習" tool and the home dashboard both start here: one mixed
   session of the (at most SRS_REVIEW_LIMIT) longest-overdue cards across all word sets. */
function showSrsReview() {
    showSrsDashboard();
}

/* where "返回" leads after an SRS review: 'tool' = the 間隔複習 page, else home */
let srsReviewOrigin = 'home';

let srsReviewCustom = null;   // the cards of a review started from a note (js/notes.js), for 再來一次

function startSrsQuizReview(origin, cards) {
    srsReviewOrigin = origin === 'tool' || origin === 'notes' ? origin : 'home';
    srsReviewCustom = cards && cards.length ? cards : null;
    const due = srsReviewCustom ? srsReviewCustom.slice(0, SRS_REVIEW_LIMIT) : getDueSrsQuizCards().slice(0, SRS_REVIEW_LIMIT);
    if (due.length === 0) {
        showShareToast(t('srs_all_done'));
        return;
    }
    stopTimer();
    quizTimerSec = 0;
    currentListeningMode = false;
    reviewMode = true;
    reviewSource = 'srs';
    reviewPool = Object.values(getSrsQuizCards());
    reviewList = shuffleArray(due);
    reviewIdx = 0;
    currentLang = reviewList[0].lang;
    score = 0;
    questionNum = 0;
    quizHistory = [];
    totalQuestions = reviewList.length;

    showOnlyQuizCard('quiz-card');
    document.getElementById('quiz-mode-label').innerText = t('srs_title');
    document.getElementById('total-words').innerText = t('quiz_words', {n: reviewList.length});
    setQuizBackLabels('srs');
    nextQuestion();
}

/* "再來一次" on the result card: another round of whatever is due after an SRS review,
   the usual mode picker otherwise. */
function quizAgain() {
    if (currentListeningMode) {
        startListeningWithConfig();
        return;
    }
    if (reviewMode && reviewSource === 'srs') {
        startSrsQuizReview(srsReviewOrigin, srsReviewCustom);
        return;
    }
    if (reviewMode && reviewSource === 'lesson') {
        lessonAgain();
        return;
    }
    if (reviewMode && reviewSource === 'mistakes') {
        startMistakeRepair();
        return;
    }
    showModeSelection();
}

/* The flashcard decks and cards (#flashcard-setup-card, #flashcard-card) are drawn by
   js/practice.js; the known / unknown marks above stay here for the achievements. */

/* Also escapes " so the result is safe inside double-quoted attributes (data-*, aria-*).
   ' is left alone: two onclick handlers escape it themselves for their JS strings. */
function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ===================== Listening Quiz =====================
   One setup page (#listening-setup-card): language, word set, how to answer, which
   meaning to show and how many questions, all on one screen and remembered in
   localStorage.listening_prefs, so a returning visitor just presses start.
   Answering is either 'choice' (tap the word you heard among four look-alikes) or
   typing (the older modes: kana, romaji, hangul, spelling, zhuyin, pinyin). */

let currentListeningMode = false;
let listeningLang = '';
let listeningSetId = '';
let listeningMode = '';
let listeningCount = 10;
let listeningMeaningLang = 'zh';
let listeningHintsUsed = 0;   // letters revealed on the current typing question

const LISTENING_LANGS = ['jp', 'kr', 'en', 'zh', 'fr', 'ru', 'es', 'de'];
const LISTENING_MODES = {
    jp: ['choice', 'hiragana', 'katakana', 'roman'],
    kr: ['choice', 'korean'],
    en: ['choice', 'english'],
    fr: ['choice', 'french'],
    ru: ['choice', 'russian'],
    es: ['choice', 'spanish'],
    de: ['choice', 'german'],
    zh: ['choice-trad', 'choice-simp', 'bopomofo', 'pinyin']
};
const LISTENING_MODE_KEYS = {
    choice: 'lc_mode_choice', 'choice-trad': 'lc_mode_choice_trad', 'choice-simp': 'lc_mode_choice_simp',
    hiragana: 'lc_mode_jp_hiragana', katakana: 'lc_mode_jp_katakana', roman: 'lc_mode_jp_roman',
    korean: 'lc_mode_kr_korean', english: 'lc_mode_en_english', french: 'lc_mode_fr_french', russian: 'lc_mode_ru_russian', spanish: 'lc_mode_es_spanish', german: 'lc_mode_de_german',
    bopomofo: 'lc_mode_zh_bopomofo', pinyin: 'lc_mode_zh_pinyin'
};
const LISTENING_COUNTS = [10, 20, 30, 0];
/* the language names in the pickers (shared with the flashcard decks) */
const PRACTICE_LANG_NAME_KEYS = { jp: 'dict_lang_ja', kr: 'dict_lang_ko', en: 'dict_lang_en', zh: 'dict_lang_zh', fr: 'dict_lang_fr', ru: 'dict_lang_ru', es: 'dict_lang_es', de: 'dict_lang_de' };

function isListeningChoice() {
    return listeningMode.startsWith('choice');
}

/* Japanese / Korean / French hints can be the Chinese or the English meaning;
   English words always show Chinese, Chinese words their English gloss. */
function listeningHasMeaningChoice(lang) {
    return lang !== 'en' && lang !== 'zh';
}

function getListeningPrefs() {
    try { return JSON.parse(localStorage.getItem('listening_prefs')) || {}; } catch { return {}; }
}

function saveListeningPrefs() {
    try {
        localStorage.setItem('listening_prefs', JSON.stringify({
            lang: listeningLang, set: listeningSetId, mode: listeningMode,
            meaning: listeningMeaningLang, count: listeningCount
        }));
    } catch {}
}

/* Fills in whatever the saved choice doesn't settle (or no longer allows). */
function normalizeListeningChoice() {
    if (!LISTENING_LANGS.includes(listeningLang)) listeningLang = 'jp';
    const sets = WORD_SET_FAMILIES[listeningLang] || [];
    if (!sets.includes(listeningSetId)) listeningSetId = sets[0] || '';
    const modes = LISTENING_MODES[listeningLang];
    if (!modes.includes(listeningMode)) listeningMode = modes[0];
    if (!listeningHasMeaningChoice(listeningLang)) listeningMeaningLang = listeningLang === 'en' ? 'zh' : 'en';
    else if (listeningMeaningLang !== 'en') listeningMeaningLang = 'zh';
    if (!LISTENING_COUNTS.includes(listeningCount)) listeningCount = 10;
}

function startListeningQuiz() {
    const p = getListeningPrefs();
    listeningLang = p.lang || '';
    listeningSetId = p.set || '';
    listeningMode = p.mode || '';
    listeningMeaningLang = p.meaning || 'zh';
    listeningCount = typeof p.count === 'number' ? p.count : 10;
    normalizeListeningChoice();
    showOnlyQuizCard('listening-setup-card');
    renderListeningSetup();
    window.scrollTo(0, 0);
}

function lcPick(field, value) {
    if (field === 'lang' && value !== listeningLang) {
        listeningLang = value;
        listeningSetId = '';
        listeningMode = '';
    }
    if (field === 'set') listeningSetId = value;
    if (field === 'mode') listeningMode = value;
    if (field === 'meaning') listeningMeaningLang = value;
    if (field === 'count') listeningCount = value;
    normalizeListeningChoice();
    renderListeningSetup();
}

function renderListeningSetup() {
    const box = document.getElementById('lc-setup');
    if (!box) return;
    const chip = (field, value, label, on) =>
        `<button type="button" class="pc-chip${on ? ' on' : ''}" onclick="lcPick('${field}', ${typeof value === 'number' ? value : `'${value}'`})"${on ? ' aria-pressed="true"' : ' aria-pressed="false"'}>${escHtml(label)}</button>`;
    const row = (titleKey, chips) => `<div class="pc-field"><div class="pc-label">${escHtml(t(titleKey))}</div><div class="pc-chips">${chips}</div></div>`;

    let html = row('lc_field_lang', LISTENING_LANGS.map(l => chip('lang', l, t(PRACTICE_LANG_NAME_KEYS[l]), l === listeningLang)).join(''));
    const sets = WORD_SET_FAMILIES[listeningLang] || [];
    if (sets.length > 1) {
        html += row('lc_field_set', sets.map(s => chip('set', s, wordSetName(s), s === listeningSetId)).join(''));
    }
    html += row('lc_field_mode', LISTENING_MODES[listeningLang].map(m =>
        chip('mode', m, (m.startsWith('choice') ? '👆 ' : '⌨️ ') + t(LISTENING_MODE_KEYS[m]), m === listeningMode)).join(''));
    if (listeningHasMeaningChoice(listeningLang)) {
        html += row('lc_field_meaning', chip('meaning', 'zh', t('lc_meaning_zh'), listeningMeaningLang === 'zh')
            + chip('meaning', 'en', t('lc_meaning_en'), listeningMeaningLang === 'en'));
    }
    html += row('quiz_count_title', LISTENING_COUNTS.map(n =>
        chip('count', n, n ? String(n) : t('lc_count_all'), n === listeningCount)).join(''));
    box.innerHTML = html;

    const start = document.getElementById('lc-start');
    if (start) start.textContent = '▶ ' + t('lc_start');
}

function startListeningWithConfig() {
    normalizeListeningChoice();
    if (!listeningSetId) return;
    saveListeningPrefs();

    currentListeningMode = true;
    currentLang = listeningSetId;
    // the simplified modes must be read by the mainland voice, the rest by the Taiwan one
    if (listeningLang === 'zh') zhCharType = (listeningMode === 'pinyin' || listeningMode === 'choice-simp') ? 'simp' : 'trad';
    score = 0;
    questionNum = 0;
    totalQuestions = listeningCount;
    quizHistory = [];

    const startBtn = document.getElementById('lc-start');
    if (startBtn) startBtn.disabled = true;
    loadWordSet(listeningSetId)
        .then(n => { if (n >= 4) saveVocabCache(listeningSetId); })
        .catch(() => { if (!restoreVocabCache(listeningSetId)) throw new Error('no words'); })
        .then(() => {
            if (startBtn) startBtn.disabled = false;
            if (!currentListeningMode || vocabularyList.length < 4) throw new Error('no words');
            shuffledVocab = shuffleArray(vocabularyList);
            vocabIdx = 0;
            totalQuestions = listeningCount || vocabularyList.length;   // 全部 = every word once
            showOnlyQuizCard('quiz-card');
            document.getElementById('quiz-mode-label').innerText = t('tool_listening');
            setQuizBackLabels('listening');
            document.getElementById('total-words').innerText = t('quiz_words', {n: vocabularyList.length});
            document.getElementById('timer-display').style.display = 'none';
            document.getElementById('timer-bar-container').style.display = 'none';
            nextListeningQuestion();
        })
        .catch(() => {
            // offline with nothing cached: stay on the setup page
            if (startBtn) startBtn.disabled = false;
            currentListeningMode = false;
            showShareToast(t('load_fail_no_cache'));
        });
}

function closeListeningSetup() {
    showOnlyQuizCard('lang-card');
    renderPracticeHub();
}

function pinyinToToneNumber(str) {
    const toneMap = {
        'ā': 'a1', 'á': 'a2', 'ǎ': 'a3', 'à': 'a4',
        'ē': 'e1', 'é': 'e2', 'ě': 'e3', 'è': 'e4',
        'ī': 'i1', 'í': 'i2', 'ǐ': 'i3', 'ì': 'i4',
        'ō': 'o1', 'ó': 'o2', 'ǒ': 'o3', 'ò': 'o4',
        'ū': 'u1', 'ú': 'u2', 'ǔ': 'u3', 'ù': 'u4',
        'ǖ': 'v1', 'ǘ': 'v2', 'ǚ': 'v3', 'ǜ': 'v4',
        'ü': 'v'
    };
    let result = '';
    for (const ch of str) {
        result += toneMap[ch] || ch;
    }
    return result;
}

function normalizePinyin(str) {
    return pinyinToToneNumber(str).toLowerCase().replace(/\s+/g, '').replace(/ü/g, 'v');
}

function hiraganaToKatakana(h) {
    let r = '';
    for (let i = 0; i < h.length; i++) {
        const c = h.charCodeAt(i);
        if (c >= 0x3041 && c <= 0x3096) r += String.fromCharCode(c + 0x60);
        else r += h[i];
    }
    return r;
}

function katakanaToHiragana(s) {
    let r = '';
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        if (c >= 0x30A1 && c <= 0x30F6) r += String.fromCharCode(c - 0x60);
        else r += s[i];
    }
    return r;
}

function isKatakana(s) {
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        if (c >= 0x30A0 && c <= 0x30FF) return true;
    }
    return false;
}

function hasKanji(s) {
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        if (c >= 0x4E00 && c <= 0x9FAF) return true;
    }
    return false;
}

function getJapaneseReading(w) {
    if (w.kana) return w.kana;
    if (w.word && isKatakana(w.word)) return katakanaToHiragana(w.word);
    return w.word || '';
}

function hiraganaToRomaji(h) {
    const map = {
        '\u3042':'a','\u3044':'i','\u3046':'u','\u3048':'e','\u304A':'o',
        '\u3041':'a','\u3043':'i','\u3045':'u','\u3047':'e','\u3049':'o',
        '\u304B':'ka','\u304D':'ki','\u304F':'ku','\u3051':'ke','\u3053':'ko',
        '\u304C':'ga','\u304E':'gi','\u3050':'gu','\u3052':'ge','\u3054':'go',
        '\u3055':'sa','\u3057':'shi','\u3059':'su','\u305B':'se','\u305D':'so',
        '\u3056':'za','\u3058':'ji','\u305A':'zu','\u305C':'ze','\u305E':'zo',
        '\u305F':'ta','\u3061':'chi','\u3064':'tsu','\u3066':'te','\u3068':'to',
        '\u3060':'da','\u3062':'ji','\u3065':'zu','\u3067':'de','\u3069':'do',
        '\u306A':'na','\u306B':'ni','\u306C':'nu','\u306D':'ne','\u306E':'no',
        '\u306F':'ha','\u3072':'hi','\u3075':'fu','\u3078':'he','\u307B':'ho',
        '\u3070':'ba','\u3073':'bi','\u3076':'bu','\u3079':'be','\u307C':'bo',
        '\u3071':'pa','\u3074':'pi','\u3077':'pu','\u307A':'pe','\u307D':'po',
        '\u307E':'ma','\u307F':'mi','\u3080':'mu','\u3081':'me','\u3082':'mo',
        '\u3084':'ya','\u3086':'yu','\u3088':'yo',
        '\u3083':'ya','\u3085':'yu','\u3087':'yo',
        '\u3089':'ra','\u308A':'ri','\u308B':'ru','\u308C':'re','\u308D':'ro',
        '\u308F':'wa','\u3090':'wi','\u3091':'we','\u3092':'wo',
        '\u3093':'n',
        '\u3040':'a','\u3095':'vu','\u3096':'ka','\u3097':'ke'
    };
    const comboMap = {
        '\u304D\u3083':'kya','\u304D\u3085':'kyu','\u304D\u3087':'kyo',
        '\u304E\u3083':'gya','\u304E\u3085':'gyu','\u304E\u3087':'gyo',
        '\u3057\u3083':'sha','\u3057\u3085':'shu','\u3057\u3087':'sho',
        '\u3058\u3083':'ja','\u3058\u3085':'ju','\u3058\u3087':'jo',
        '\u3061\u3083':'cha','\u3061\u3085':'chu','\u3061\u3087':'cho',
        '\u3062\u3083':'ja','\u3062\u3085':'ju','\u3062\u3087':'jo',
        '\u306B\u3083':'nya','\u306B\u3085':'nyu','\u306B\u3087':'nyo',
        '\u3072\u3083':'hya','\u3072\u3085':'hyu','\u3072\u3087':'hyo',
        '\u3073\u3083':'bya','\u3073\u3085':'byu','\u3073\u3087':'byo',
        '\u3074\u3083':'pya','\u3074\u3085':'pyu','\u3074\u3087':'pyo',
        '\u307F\u3083':'mya','\u307F\u3085':'myu','\u307F\u3087':'myo',
        '\u308A\u3083':'rya','\u308A\u3085':'ryu','\u308A\u3087':'ryo'
    };
    const consonantOf = function(roma) {
        if (!roma) return '';
        if (roma === 'a'||roma==='i'||roma==='u'||roma==='e'||roma==='o') return '';
        if (roma.startsWith('sh') || roma.startsWith('ch') || roma.startsWith('ts')) return roma.substring(0, 2);
        return roma[0] === 'n' ? 'n' : roma[0];
    };
    let r = '';
    let i = 0;
    while (i < h.length) {
        const ch = h[i];
        const cp = h.charCodeAt(i);
        if (cp === 0x3063) {
            if (i + 1 < h.length) {
                let next;
                if (i + 2 < h.length && comboMap[h[i+1]+h[i+2]]) {
                    next = comboMap[h[i+1]+h[i+2]];
                    r += consonantOf(next);
                    r += next;
                    i += 3; continue;
                }
                next = map[h[i+1]] || h[i+1];
                r += consonantOf(next);
                r += next;
                i += 2; continue;
            }
            i++; continue;
        }
        if (cp === 0x30FC) {
            if (r.length > 0) {
                const last = r[r.length - 1];
                if ('aiueo'.includes(last)) r += last;
            }
            i++; continue;
        }
        if (i + 1 < h.length) {
            const combo = h[i] + h[i + 1];
            if (comboMap[combo]) { r += comboMap[combo]; i += 2; continue; }
        }
        r += map[ch] || ch;
        i++;
    }
    return r;
}

function pickOneVariant(s) {
    if (!s) return '';
    const parts = s.split(' / ');
    return parts[Math.floor(Math.random() * parts.length)].trim();
}

function normalizeBopomofo(s) {
    return s.replace(/\s+/g, '');
}

/* The answers a typing question accepts, normalised the way the visitor's input is
   (a word can list variants as "a / b"; any of them counts). */
function listeningAcceptedAnswers() {
    const w = currentWord;
    const variants = s => String(s || '').split(' / ').map(v => v.trim()).filter(Boolean);
    const mode = listeningMode;
    if (mode === 'bopomofo') return variants(w.bopomofo).map(normalizeBopomofo);
    if (mode === 'pinyin') return variants(w.roman).map(normalizePinyin);
    const jpReading = getJapaneseReading(w);
    if (mode === 'roman') return [hiraganaToRomaji(jpReading)];
    if (mode === 'hiragana') return [jpReading];
    if (mode === 'katakana') return [hiraganaToKatakana(jpReading)];
    if (mode === 'english') return variants(w.english || w.word).map(v => v.toLowerCase());
    // a French noun is shown with its article: the bare noun counts too
    if (mode === 'french') return variants(w.word).flatMap(v => [v.toLowerCase(), v.toLowerCase().replace(/^(le |la |l')/, '')]);
    // a Spanish noun is shown with its article (el gato, el/la estudiante, los fideos): the bare noun counts too
    if (mode === 'spanish') return variants(w.word).flatMap(v => [v.toLowerCase(), v.toLowerCase().replace(/^(el\/la |el |la |los |las )/, '')]);
    // a German noun is shown with der / die / das: the bare noun counts too, in any case (Hund, hund)
    if (mode === 'german') return variants(w.word).flatMap(v => [v.toLowerCase(), v.toLowerCase().replace(/^(der |die |das )/, '')]);
    // Russian is often typed without ё
    if (mode === 'russian') return variants(w.word).map(v => v.toLowerCase().replace(/ё/g, 'е'));
    return variants(w.word).map(v => v.toLowerCase());
}

/* The answer as shown to the visitor (feedback, letter boxes, results). */
function listeningDisplayAnswer() {
    const w = currentWord;
    if (!w) return '';
    const first = s => String(s || '').split(' / ')[0].trim();
    const mode = listeningMode;
    if (mode === 'bopomofo') return first(w.bopomofo);
    if (mode === 'pinyin') return first(w.roman);
    if (mode === 'choice-trad' || mode === 'choice-simp') return w.word;
    if (mode === 'choice' && isJapaneseQuizLang(listeningSetId)) return getJapaneseReading(w);
    const jpReading = getJapaneseReading(w);
    if (mode === 'roman') return hiraganaToRomaji(jpReading);
    if (mode === 'hiragana') return jpReading;
    if (mode === 'katakana') return hiraganaToKatakana(jpReading);
    if (mode === 'english') return first(w.english || w.word);
    return first(w.word);
}

function listeningMeaning() {
    const w = currentWord;
    return listeningMeaningLang === 'en' ? (w.english || w.meaning || '') : (w.meaning || w.english || '');
}

/* Three look-alike wrong options for the 'choice' modes: near-miss kana for Japanese
   (the reading generator the reading quiz uses), otherwise other words of the set that
   look most like the right one (same first letter, similar length). */
function listeningChoiceOptions() {
    const right = listeningDisplayAnswer();
    const options = [right];
    const add = s => { if (s && !options.includes(s) && options.length < 4) options.push(s); };
    if (isJapaneseQuizLang(listeningSetId)) {
        generateSimilarReadings(right, 3).forEach(add);
        shuffleArray(vocabularyList).forEach(w => add(getJapaneseReading(w)));
    } else {
        const shown = w => listeningMode === 'choice-simp' ? (w.simp || w.word) : listeningMode === 'choice-trad' ? (w.trad || w.word) : String(w.word).split(' / ')[0].trim();
        const len = [...right].length;
        const scored = vocabularyList.map(w => {
            const s = shown(w);
            const n = [...s].length;
            return { s, score: (s[0] === right[0] ? 2 : 0) + (Math.abs(n - len) <= 1 ? 1 : 0) + Math.random() };
        }).filter(x => x.s !== right).sort((a, b) => b.score - a.score);
        scored.slice(0, 12).sort(() => Math.random() - 0.5).forEach(x => add(x.s));
        scored.forEach(x => add(x.s));
    }
    return shuffleArray(options);
}

/* The entry this word is reviewed as in the mistake book / SRS (the same one a lesson
   asks), so a word missed by ear comes back as a normal question. */
function listeningEntry() {
    if (!currentWord || typeof lessonEntryFor !== 'function') return null;
    const e = lessonEntryFor(listeningSetId, currentWord);
    return e && e.answer ? e : null;
}

function nextListeningQuestion() {
    answered = false;
    questionNum++;
    if (questionNum === 1) startSessionStats();
    listeningHintsUsed = 0;
    document.getElementById('question-count').innerText = t('quiz_question', {n: questionNum});
    document.getElementById('score-count').innerText = t('quiz_score', {n: score});
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('feedback').innerText = '';
    document.getElementById('feedback').className = 'feedback';

    if (vocabIdx >= shuffledVocab.length) { shuffledVocab = shuffleArray(vocabularyList); vocabIdx = 0; }
    const w = shuffledVocab[vocabIdx++];
    // Chinese: the characters (and voice) of the picked script
    currentWord = isChineseQuizLang(listeningSetId)
        ? Object.assign({}, w, { word: (zhCharType === 'simp' ? w.simp : w.trad) || w.word })
        : w;

    const choice = isListeningChoice();
    setListeningStage(true, choice);
    document.getElementById('word-hint').innerText = choice ? '' : listeningMeaning();

    const container = document.getElementById('options-container');
    container.innerHTML = '';
    if (choice) {
        listeningChoiceOptions().forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn listening-option';
            btn.innerText = opt;
            btn.onclick = () => submitListeningAnswer(opt, btn);
            container.appendChild(btn);
        });
    } else {
        container.appendChild(buildListeningTyping());
    }

    setTimeout(() => speakWord(), 300);
    if (!choice) setTimeout(() => { const i = document.getElementById('listening-input'); if (i) i.focus(); }, 500);
}

/* The big play button (and 🐢 slow / 💡 meaning) replaces the word in the question box. */
function setListeningStage(on, choice) {
    const stage = document.getElementById('listening-stage');
    const row = document.querySelector('#quiz-card .question-row');
    document.getElementById('quiz-card').classList.toggle('listening-on', !!on);
    if (row) row.style.display = on ? 'none' : '';
    if (!stage) return;
    stage.style.display = on ? '' : 'none';
    if (!on) return;
    stage.innerHTML = `
        <p class="ls-prompt">${escHtml(t(choice ? 'lc_prompt_choice' : 'lc_prompt_type'))}</p>
        <button type="button" class="ls-play" onclick="speakWord()" aria-label="${escHtml(t('lc_play'))}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
        </button>
        <div class="ls-tools">
            <button type="button" class="back-btn ls-tool" onclick="speakWord(true)">🐢 ${escHtml(t('lc_slow'))}</button>
            ${choice ? `<button type="button" class="back-btn ls-tool" id="ls-meaning-btn" onclick="revealListeningMeaning()">💡 ${escHtml(t('lc_show_meaning'))}</button>` : ''}
        </div>`;
}

function revealListeningMeaning() {
    document.getElementById('word-hint').innerText = listeningMeaning();
    const b = document.getElementById('ls-meaning-btn');
    if (b) b.remove();
}

/* Typing: letter boxes (as many as the answer has characters), the input, a hint that
   reveals the next character for HINT_COST points, and for kana a row of the small /
   long-sound characters that are awkward to type. */
const LISTENING_HINT_COST = 2;
const LISTENING_BOXES_MAX = 14;   // longer answers (phrases) get no boxes

function buildListeningTyping() {
    const wrap = document.createElement('div');
    wrap.className = 'listening-typing';
    const answer = [...listeningDisplayAnswer()];
    const boxes = answer.length <= LISTENING_BOXES_MAX
        ? `<div class="ls-boxes" id="ls-boxes" aria-hidden="true">${answer.map(ch => ch === ' ' ? '<i class="gap"></i>' : '<i></i>').join('')}</div>`
        : '';
    const keys = listeningMode === 'hiragana' ? ['ー', 'っ', 'ゃ', 'ゅ', 'ょ', 'ん']
        : listeningMode === 'katakana' ? ['ー', 'ッ', 'ャ', 'ュ', 'ョ', 'ン'] : [];
    wrap.innerHTML = `${boxes}
        <div class="listening-input-group">
            <input type="text" id="listening-input" class="listening-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${escHtml(t('listening_placeholder'))}">
        </div>
        ${keys.length ? `<div class="ls-keys">${keys.map(k => `<button type="button" class="back-btn ls-key" onclick="listeningInsert('${k}')">${k}</button>`).join('')}</div>` : ''}
        <div class="ls-actions">
            <button type="button" class="back-btn" id="listening-hint" onclick="listeningHint()">💡 ${escHtml(t('lc_hint', { n: LISTENING_HINT_COST }))}</button>
            <button type="button" class="next-btn" id="listening-submit" onclick="submitListeningAnswer()">${escHtml(t('listening_submit'))}</button>
        </div>`;
    const input = wrap.querySelector('#listening-input');
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !answered) submitListeningAnswer(); });
    input.addEventListener('input', fillListeningBoxes);
    return wrap;
}

function fillListeningBoxes() {
    const boxes = document.querySelectorAll('#ls-boxes i:not(.gap)');
    const input = document.getElementById('listening-input');
    if (!boxes.length || !input) return;
    const typed = [...input.value.replace(/\s+/g, '')];
    boxes.forEach((b, i) => {
        b.textContent = typed[i] || '';
        b.classList.toggle('hinted', i < listeningHintsUsed);
    });
}

function listeningInsert(ch) {
    const input = document.getElementById('listening-input');
    if (!input || answered) return;
    const s = input.selectionStart ?? input.value.length, e = input.selectionEnd ?? input.value.length;
    input.value = input.value.slice(0, s) + ch + input.value.slice(e);
    input.focus();
    input.setSelectionRange(s + ch.length, s + ch.length);
    fillListeningBoxes();
}

function listeningHint() {
    if (answered) return;
    const answer = [...listeningDisplayAnswer()];
    const input = document.getElementById('listening-input');
    if (!input || listeningHintsUsed >= answer.length - 1) return;   // never give the whole word away
    listeningHintsUsed++;
    input.value = answer.slice(0, listeningHintsUsed).join('');
    score = Math.max(0, score - LISTENING_HINT_COST);
    document.getElementById('score-count').innerText = t('quiz_score', {n: score});
    fillListeningBoxes();
    input.focus();
    if (listeningHintsUsed >= answer.length - 1) {
        const b = document.getElementById('listening-hint');
        if (b) b.disabled = true;
    }
}

/* choiceText/btn: a tapped option ('choice' modes); without them, the typed answer. */
function submitListeningAnswer(choiceText, btn) {
    if (answered) return;
    const choice = isListeningChoice();
    let userAnswer, isCorrect;
    if (choice) {
        userAnswer = choiceText;
        isCorrect = choiceText === listeningDisplayAnswer();
    } else {
        const input = document.getElementById('listening-input');
        if (!input) return;
        userAnswer = input.value.trim();
        if (!userAnswer) return;
        const norm = listeningMode === 'pinyin' ? normalizePinyin(userAnswer)
            : listeningMode === 'bopomofo' ? normalizeBopomofo(userAnswer)
            : listeningMode === 'russian' ? userAnswer.toLowerCase().replace(/ё/g, 'е')
            : userAnswer.toLowerCase();
        isCorrect = listeningAcceptedAnswers().includes(norm);
        input.disabled = true;
        input.classList.add(isCorrect ? 'is-right' : 'is-wrong');
        const hint = document.getElementById('listening-hint');
        if (hint) hint.disabled = true;
        const submit = document.getElementById('listening-submit');
        if (submit) submit.style.display = 'none';
    }

    answered = true;
    logDailyActivity();
    const correctAnswer = listeningDisplayAnswer();
    const entry = listeningEntry();
    let repaired = null;
    if (isCorrect) {
        const m = entry && noteMistakeCorrect(entry.id);
        if (m && m.fixedAt) repaired = m;
    } else if (entry) {
        addMistakeEntry(entry);
    }
    noteCombo(isCorrect);

    if (choice) {
        document.querySelectorAll('#options-container .option-btn').forEach(b => {
            b.disabled = true;
            if (b.innerText === correctAnswer) b.classList.add('correct-choice');
        });
        if (!isCorrect && btn) btn.classList.add('wrong-choice');
    }
    const meaningBtn = document.getElementById('ls-meaning-btn');
    if (meaningBtn) meaningBtn.remove();
    // show the word itself (and its meaning) once answered
    document.getElementById('word-hint').innerText = currentWord.word + (currentWord.kana && currentWord.kana !== currentWord.word ? '（' + currentWord.kana + '）' : '') + '　' + listeningMeaning();

    quizHistory.push({
        question: currentWord.word,
        yourAnswer: userAnswer,
        correctAnswer: correctAnswer,
        isCorrect: isCorrect,
        type: 'listening',
        entry: entry
    });

    const feedback = document.getElementById('feedback');
    if (isCorrect) {
        score += 10;
        feedback.innerText = correctFeedbackText(repaired);
        feedback.className = 'feedback correct';
        playSound(true);
    } else {
        score = Math.max(0, score - 3);
        feedback.innerText = t('wrong') + correctAnswer;
        feedback.className = 'feedback wrong';
        playSound(false);
        setTimeout(() => speakWord(), 400);   // hear it again, now knowing the word
    }

    document.getElementById('score-count').innerText = t('quiz_score', {n: score});
    const nextBtn = document.getElementById('nextBtn');
    nextBtn.innerText = t('quiz_next');
    nextBtn.onclick = totalQuestions > 0 && questionNum >= totalQuestions ? () => showResults() : () => nextListeningQuestion();
    nextBtn.style.display = 'inline-block';
}

document.addEventListener('DOMContentLoaded', updateMistakeBadge);
document.addEventListener('DOMContentLoaded', updateStreakBadge);
document.addEventListener('DOMContentLoaded', checkAchievements);
document.addEventListener('DOMContentLoaded', initTabVisibility);
