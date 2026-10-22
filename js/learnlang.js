/* ===================== 我在學的語言 (the learning language) =====================
   One choice for the whole site (proposal A, owner's go 2026-10-17): the header pill
   (#learn-pill) says which language the visitor studies, and the 學習 pages (文法 /
   閱讀 / 聽解), the alphabet chart, the dictionary and the word of the day open in it
   instead of each asking again. Stored in localStorage.learn_lang (synced, js/account.js);
   before a first choice it is guessed from what this device practised last, and with
   nothing to go on the pages ask (learnChooseHtml). learn_lang_recent keeps the last two,
   so someone studying two languages finds the other one at the top of the menu.
   Codes are the dict_lang_* ones; LEARN_QUIZ_CODE gives the 單字 page's (jp, kr …). */

const LEARN_LANGS = ['ja', 'ko', 'zh', 'en', 'fr', 'ru', 'es', 'de'];
const LEARN_QUIZ_CODE = { ja: 'jp', ko: 'kr', zh: 'zh', en: 'en', fr: 'fr', ru: 'ru', es: 'es', de: 'de' };
// LEARN_FLAGS (js/grammar.js) draws them; Chinese gets both flags

function learnStoreGet(key) {
    try { return localStorage.getItem(key) || ''; } catch { return ''; }
}

function learnStoreSet(key, value) {
    if (typeof storeSet === 'function') storeSet(key, value);
    else try { localStorage.setItem(key, value); } catch {}
}

function learnLang() {
    const v = learnStoreGet('learn_lang');
    return LEARN_LANGS.includes(v) ? v : learnLangGuess();
}

// a visitor from before the pill existed: the language of the last word set or grammar level
function learnLangGuess() {
    const last = learnStoreGet('last_quiz_set');
    if (typeof BUNDLED_SETS !== 'undefined' && LEARN_LANGS.includes(BUNDLED_SETS[last])) return BUNDLED_SETS[last];
    const g = learnStoreGet('grammar_set').split('_')[0];
    return LEARN_LANGS.includes(g) ? g : '';
}

function learnLangRecent() {
    try {
        const r = JSON.parse(learnStoreGet('learn_lang_recent') || '[]');
        return Array.isArray(r) ? r.filter(l => LEARN_LANGS.includes(l)) : [];
    } catch { return []; }
}

function setLearnLang(lang) {
    if (!LEARN_LANGS.includes(lang)) return;
    toggleLearnLangMenu(false);
    const was = learnLang();
    learnStoreSet('learn_lang', lang);
    learnStoreSet('learn_lang_recent', JSON.stringify([lang].concat(learnLangRecent().filter(l => l !== lang)).slice(0, 2)));
    renderLearnPill();
    if (was === lang) return;
    learnLangChanged();
}

/* Pages that were showing something in the old language go back to their list in the
   new one; refreshDynamicContent() redraws whatever is on screen. */
function learnLangChanged() {
    if (typeof grammarSetId !== 'undefined') { grammarView = 'list'; grammarPoint = 0; }
    if (typeof readingSetId !== 'undefined') { if (readingView === 'read') { readingSaveResume(); readingStopTimer(); } readingView = 'list'; readingNo = 0; }
    if (typeof listeningLevelId !== 'undefined') { listeningSaveResume(); listeningStop(); listeningView = 'list'; listeningSession = null; }
    if (typeof alphaFollowLearnLang === 'function') alphaFollowLearnLang();
    if (typeof dictFollowLearnLang === 'function') dictFollowLearnLang();
    if (typeof refreshDynamicContent === 'function') refreshDynamicContent();
}

/* ----- the level a 學習 page shows -----
   The current one if it is in the learning language, else the one used last in that
   language (learn_last_levels, per page), else its first; '' when the page has nothing
   in that language yet (the page then shows learnEmptyHtml). */
function learnSetId(index, current, page) {
    const lang = learnLang();
    const mine = (index || []).filter(s => s.lang === lang);
    if (!mine.length) return '';
    if (mine.some(s => s.id === current)) return current;
    const last = learnLastLevels()[page + ':' + lang];
    return mine.some(s => s.id === last) ? last : mine[0].id;
}

function learnLastLevels() {
    try { return JSON.parse(learnStoreGet('learn_last_levels') || '{}') || {}; } catch { return {}; }
}

function learnRememberLevel(page, set) {
    if (!set || !set.lang) return;
    const all = learnLastLevels();
    all[page + ':' + set.lang] = set.id;
    try { localStorage.setItem('learn_last_levels', JSON.stringify(all)); } catch {}
}

function learnLangName(lang) {
    return t('dict_lang_' + lang);
}

/* ----- the header pill and its menu ----- */
function renderLearnPill() {
    const btn = document.getElementById('learn-pill');
    if (!btn) return;
    const lang = learnLang();
    btn.innerHTML = lang
        ? `${learnFlags(lang)}<span class="learn-pill-name">${escHtml(learnLangName(lang))}</span><span class="learn-pill-caret" aria-hidden="true">▾</span>`
        : `<span class="learn-pill-name">${escHtml(t('learn_pill_none'))}</span><span class="learn-pill-caret" aria-hidden="true">▾</span>`;
    btn.setAttribute('aria-label', t('learn_pill_title') + (lang ? ': ' + learnLangName(lang) : ''));
    btn.classList.toggle('empty', !lang);
    const menu = document.getElementById('learn-pill-menu');
    if (menu) menu.innerHTML = learnLangMenuHtml();
}

function learnLangMenuHtml() {
    const cur = learnLang();
    const item = l => `<button type="button" class="learn-menu-item${l === cur ? ' on' : ''}" role="menuitemradio" aria-checked="${l === cur}" onclick="setLearnLang('${l}')">${learnFlags(l)}<span>${escHtml(learnLangName(l))}</span></button>`;
    const other = learnLangRecent().filter(l => l !== cur);
    const recent = other.length && cur ? `<div class="learn-menu-group">${escHtml(t('learn_recent'))}</div>
        <div class="learn-menu-list">${item(cur)}${item(other[0])}</div>` : '';
    const regions = typeof LANG_REGIONS !== 'undefined' ? LANG_REGIONS : [{ id: '', icon: '', langs: LEARN_LANGS }];
    return `<div class="learn-menu-title">${escHtml(t('learn_pill_title'))}</div>${recent}${regions.map(r => `
        ${r.id ? `<div class="learn-menu-group">${uiIcon('globe')} ${escHtml(t('region_' + r.id))}</div>` : ''}
        <div class="learn-menu-list">${r.langs.map(item).join('')}</div>`).join('')}
        <button type="button" class="learn-menu-ui" onclick="event.stopPropagation(); openUiLangMenu()">
            <span aria-hidden="true">🌐</span>${escHtml(t('learn_ui_lang'))}<b>${escHtml(uiLangName())}</b>
        </button>`;
}

// the site language's own name, as the globe menu writes it (English, 日本語 …)
function uiLangName() {
    const pill = document.querySelector(`.lang-pill[data-lang="${siteLang}"]`);
    return pill ? pill.textContent.trim() : siteLang;
}

function toggleLearnLangMenu(open) {
    const wrap = document.getElementById('learn-pill-wrap');
    const btn = document.getElementById('learn-pill');
    if (!wrap || !btn) return;
    const show = typeof open === 'boolean' ? open : !wrap.classList.contains('open');
    // only the menu is redrawn: replacing the button under the click would make the
    // outside-click check below see a detached target and close it again
    const menu = document.getElementById('learn-pill-menu');
    if (show && menu) menu.innerHTML = learnLangMenuHtml();
    wrap.classList.toggle('open', show);
    btn.setAttribute('aria-expanded', String(show));
}

/* The site's own language: on phones its globe is gone from the header (the pill took
   its place), so the pill menu and the More sheet open the same list from here. */
function openUiLangMenu() {
    toggleLearnLangMenu(false);
    if (typeof closeMoreSheet === 'function') closeMoreSheet();
    if (typeof toggleLangMenu === 'function') toggleLangMenu(true);
}

document.addEventListener('click', e => {
    if (!e.target.closest('#learn-pill-wrap')) toggleLearnLangMenu(false);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') toggleLearnLangMenu(false); });

/* ----- a page with nothing to show -----
   No language chosen yet: the languages to pick from. A language this page has no
   content in yet: says so, with the languages it does have. */
function learnChooseHtml() {
    return `<div class="learn-choose">
        <h4>${escHtml(t('learn_choose_title'))}</h4>
        <p>${escHtml(t('learn_choose_text'))}</p>
        <div class="learn-menu-list learn-choose-list">${LEARN_LANGS.map(l =>
            `<button type="button" class="learn-menu-item" onclick="setLearnLang('${l}')">${learnFlags(l)}<span>${escHtml(learnLangName(l))}</span></button>`).join('')}</div>
    </div>`;
}

function learnEmptyHtml(index, pageNameKey) {
    const lang = learnLang();
    if (!lang) return learnChooseHtml();
    const have = LEARN_LANGS.filter(l => (index || []).some(s => s.lang === l));
    return `<div class="learn-choose">
        <h4>${escHtml(t('learn_empty', { lang: learnLangName(lang), page: t(pageNameKey) }))}</h4>
        <p>${escHtml(t('learn_empty_other'))}</p>
        <div class="learn-menu-list learn-choose-list">${have.map(l =>
            `<button type="button" class="learn-menu-item" onclick="setLearnLang('${l}')">${learnFlags(l)}<span>${escHtml(learnLangName(l))}</span></button>`).join('')}</div>
    </div>`;
}

document.addEventListener('DOMContentLoaded', renderLearnPill);
