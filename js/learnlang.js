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
/* The Chinese HSK rounds come in two editions (owner, 2026-10-30): 大陸版 (Simplified, Mainland wording and
   readings) and 台灣版 (Traditional, Taiwan wording, pinyin / zhuyin). An index entry's "edition" ('tw') says
   which; the 8 Taiwan passages (level 'TW HSK 1–2') show in both. Only an index that holds both editions is
   split, so the switch appears once a Taiwan level is published. */
function learnEdition() {
    let v = null;
    try { v = localStorage.getItem('zh_edition'); } catch {}
    if (v === 'tw' || v === 'cn') return v;
    // not chosen yet: a Traditional Chinese interface starts on 台灣版 (owner, 2026-10-31)
    return siteLang === 'zh' ? 'tw' : 'cn';
}

/* levels published before their recordings and translations (owner, 2026-10-31): the HSK Taiwan edition
   and the European exams (their A1 exam rounds sit in the A1 files beside the older passages; English A1
   has passages only). A note under the level picker of 閱讀 and 聽解 says what is still coming — drop
   an id here once its level is recorded and translated. */
// (the en / fr / ru / de / es rounds were recorded 2026-11-01; the Taiwan-edition HSK listening
// still waits for its Gemini recording)
const LEARN_PREP = /^zh_tw\d+$/;
function learnPrepHtml(id) {
    return LEARN_PREP.test(id || '') ? `<p class="ls-soon">🎙️ ${escHtml(t('learn_prep_note'))}</p>` : '';
}

function learnHasEditions(index, lang) {
    return lang === 'zh' && (index || []).some(s => s.lang === 'zh' && s.edition === 'tw');
}

function learnInEdition(s) {
    const ed = s.edition || (/^TW /.test(s.level || '') ? 'both' : 'cn');
    return ed === 'both' || ed === learnEdition();
}

// the levels of one language that the page offers (only the chosen edition's, for Chinese)
function learnLevelsOf(index, lang) {
    const all = (index || []).filter(s => s.lang === lang);
    return learnHasEditions(index, lang) ? all.filter(learnInEdition) : all;
}

function setLearnEdition(ed) {
    try { localStorage.setItem('zh_edition', ed); } catch {}
    if (typeof refreshDynamicContent === 'function') refreshDynamicContent();
}

function learnEditionHtml(index, lang) {
    if (!learnHasEditions(index, lang)) return '';
    const ed = learnEdition();
    const btn = v => `<button type="button" class="mode-btn${ed === v ? ' mode-btn-active' : ''}" aria-pressed="${ed === v}" onclick="setLearnEdition('${v}')">${escHtml(t('learn_edition_' + v))}</button>`;
    return `<div class="learn-edition rd-seg" role="group" aria-label="${escHtml(t('learn_edition_label'))}">${btn('cn')}${btn('tw')}</div>`;
}

function learnSetId(index, current, page) {
    const lang = learnLang();
    const mine = learnLevelsOf(index, lang);
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

/* ----- Shareable links (2026-11-13, site review item 5) -----
   ?g=<level>/<point id> a grammar point, ?r=<level>/<passage id> a reading passage, ?l=<level>/<set id> a
   listening round. The address bar follows what is on screen (learnSetUrl, from the three pages' renders;
   switchPage clears it), so it can be copied and shared; learnOpenFromUrl() opens such a link on load —
   it also switches the learning language (and the Chinese edition) to the link's. The static pages under
   learn/ (tools/build_learn_pages.py) link here. */
const LEARN_URL_KEYS = { grammar: 'g', reading: 'r', listening: 'l' };

function learnSetUrl(page, value) {
    if (!window.history || !history.replaceState) return;
    const p = new URLSearchParams(location.search);
    Object.values(LEARN_URL_KEYS).forEach(k => p.delete(k));
    if (page && value && LEARN_URL_KEYS[page]) p.set(LEARN_URL_KEYS[page], value);
    const q = p.toString().replace(/%2F/g, '/');
    const url = location.pathname + (q ? '?' + q : '') + location.hash;
    if (url !== location.pathname + location.search + location.hash) history.replaceState(null, '', url);
}

const LEARN_URL_PAGES = {
    grammar: { index: () => grammarIndex, setIndex: v => { grammarIndex = v; }, sets: () => grammarSets },
    reading: { index: () => readingIndex, setIndex: v => { readingIndex = v; }, sets: () => readingSets },
    listening: { index: () => listeningIndex, setIndex: v => { listeningIndex = v; }, sets: () => listeningLevels },
};

async function learnOpenFromUrl() {
    const p = new URLSearchParams(location.search);
    const page = Object.keys(LEARN_URL_KEYS).find(k => p.get(LEARN_URL_KEYS[k]));
    if (!page) return;
    const [levelId, itemId] = (p.get(LEARN_URL_KEYS[page]) || '').split('/');
    const P = LEARN_URL_PAGES[page];
    if (!P.index()) {
        try { P.setIndex(await fetch('data/' + page + '/index.json').then(r => r.json())); } catch { return; }
    }
    const level = (P.index() || []).find(s => s.id === levelId);
    if (!level) { learnSetUrl(); return; }
    if (level.lang === 'zh' && learnHasEditions(P.index(), 'zh')) { try { localStorage.setItem('zh_edition', level.edition === 'tw' ? 'tw' : 'cn'); } catch {} }
    setLearnLang(level.lang);
    learnRememberLevel(page, level);
    switchPage(page, null);
    for (let i = 0; i < 50 && !P.sets()[levelId]; i++) await new Promise(r => setTimeout(r, 100));
    const set = P.sets()[levelId];
    if (!set) return;
    if (page === 'grammar') {
        if (grammarSetId !== levelId) grammarPickSet(levelId);
        const i = (set.points || []).findIndex(x => x.id === itemId);
        if (i >= 0) grammarGo('point', i);
    } else if (page === 'reading') {
        if (readingSetId !== levelId) readingPickSet(levelId);
        const i = (set.passages || []).findIndex(x => x.id === itemId);
        if (i >= 0) readingGo('read', i);
    } else {
        if (listeningLevelId !== levelId) listeningPickLevel(levelId);
        const i = (set.sets || []).findIndex(x => x.id === itemId);
        if (i >= 0 && !set.sets[i].mock) listeningStart(i, null, 'fresh');
    }
}

document.addEventListener('DOMContentLoaded', () => setTimeout(learnOpenFromUrl, 300));
