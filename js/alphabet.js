/* ===================== Alphabet chart (#page-alphabet) =====================
   Letters for beginners, one tab per writing system; the data is in
   js/alphabet-data.js. Every letter and every example word can be read aloud
   with the browser's speech synthesis. */

const ALPHA_TABS = ['en', 'hira', 'kata', 'ko', 'zh', 'ru', 'fr', 'de', 'es'];
// language of each tab: the page's lang attribute (picks the right CJK glyph
// forms) and the UI language whose own meaning would just repeat the word
const ALPHA_LANG = { en: 'en', hira: 'ja', kata: 'ja', ko: 'ko', zh: 'zh-TW', ru: 'ru', fr: 'fr', de: 'de', es: 'es' };
let alphaTab = 'en';
let alphaPage = 0;        // the small tab (page) of alphaTab on screen

/* Small tabs (big check 2026-10-24, owner's pick): a chart is cut into pages of at most
   ALPHA_PAGE_ROWS rows, so each fits one 1080p screen. A row is one 行 of the 五十音 chart
   or ALPHA_ROW cards elsewhere (both 5 columns on computers). Whole sections share a
   page when they fit; a longer one is cut by rows and its last part may share with the next. */
const ALPHA_PAGE_ROWS = 3;
const ALPHA_ROW = 5;
const ALPHA_GOJUON_SECS = ['alpha_sec_seion', 'alpha_sec_dakuon', 'alpha_sec_handakuon'];
// first kana of each 行 (hiragana and katakana)
const ALPHA_ROW_HEADS = new Set([...'あかさたなはまやらわんがざだばぱアカサタナハマヤラワンガザダバパ']);

// empty cells after these kana keep the chart's columns: や _ ゆ _ よ, わ _ _ _ を
const ALPHA_BLANK = '<div class="alpha-blank" aria-hidden="true"></div>';
const ALPHA_GOJUON_GAPS = {
    'や': ALPHA_BLANK, 'ゆ': ALPHA_BLANK, 'わ': ALPHA_BLANK.repeat(3),
    'ヤ': ALPHA_BLANK, 'ユ': ALPHA_BLANK, 'ワ': ALPHA_BLANK.repeat(3)
};

function alphaStore(v) {
    try { localStorage.setItem('alpha_tab', v); } catch {}
}

function alphaSaved() {
    try {
        const v = localStorage.getItem('alpha_tab');
        return ALPHA_TABS.includes(v) ? v : null;
    } catch { return null; }
}

/* Meaning in the UI language: zh / zh-Hans have their own, everything else
   gets English. Hidden when it would only repeat the word (English meaning on
   the English tab, the Chinese tab for zh readers…). */
function alphaMeaning(item) {
    if (siteLang === 'zh') return item[6];
    if (siteLang === 'zh-Hans') return item[7];
    if (ALPHA_LANG[alphaTab] === siteLang) return '';
    return item[8];
}

/* Marks where the letter appears in the example word. Tries an exact match
   first (so が isn't matched by か), then one that ignores accents (î for i). */
function alphaHighlight(word, glyph) {
    const key = glyph.split(' ').pop().toLowerCase();
    const chars = [...word];
    const plain = c => c.normalize('NFD')[0].toLowerCase();
    let at = chars.findIndex(c => c.toLowerCase() === key);
    if (at < 0) at = chars.findIndex(c => plain(c) === plain(key));
    if (at < 0) return escHtml(word);
    return escHtml(chars.slice(0, at).join('')) + '<mark>' + escHtml(chars[at]) + '</mark>' + escHtml(chars.slice(at + 1).join(''));
}

function alphaCardHtml(item) {
    const [glyph, reading, speak, word, wordReading, emoji] = item;
    const letterBtn = `<button type="button" class="speak-btn alpha-speak" data-text="${escHtml(speak)}" onclick="alphaSay(this)" aria-label="${escHtml(t('alpha_play_letter'))}" title="${escHtml(t('alpha_play_letter'))}">${uiIcon('speaker')}</button>`;
    let ex;
    if (!word) {
        ex = `<div class="alpha-ex alpha-ex-none">${escHtml(t('alpha_rare'))}</div>`;
    } else {
        const meaning = alphaMeaning(item);
        ex = `<div class="alpha-ex">
            <span class="alpha-emoji" aria-hidden="true">${emoji}</span>
            <div class="alpha-ex-text">
                <div class="alpha-word">${alphaHighlight(word, glyph)}</div>
                ${wordReading ? `<div class="alpha-word-reading">${escHtml(wordReading)}</div>` : ''}
                ${meaning ? `<div class="alpha-meaning" lang="${siteLang}">${escHtml(meaning)}</div>` : ''}
            </div>
            <button type="button" class="speak-btn alpha-speak" data-text="${escHtml(word)}" onclick="alphaSay(this)" aria-label="${escHtml(t('alpha_play_word'))}" title="${escHtml(t('alpha_play_word'))}">${uiIcon('speaker')}</button>
        </div>`;
    }
    return `<div class="alpha-card">
        <div class="alpha-head">
            <button type="button" class="alpha-glyph" data-text="${escHtml(speak)}" onclick="alphaSay(this)" title="${escHtml(t('alpha_play_letter'))}">${escHtml(glyph)}</button>
            <div class="alpha-reading">${escHtml(reading)}</div>
            ${letterBtn}
        </div>
        ${ex}
    </div>`;
}

function alphaRows(sec) {
    const rows = [];
    if (ALPHA_GOJUON_SECS.includes(sec.title)) {
        sec.items.forEach(item => {
            if (!rows.length || ALPHA_ROW_HEADS.has(item[0])) rows.push([]);
            rows[rows.length - 1].push(item);
        });
    } else {
        for (let i = 0; i < sec.items.length; i += ALPHA_ROW) rows.push(sec.items.slice(i, i + ALPHA_ROW));
    }
    return rows;
}

/* [{ parts: [{ title, rows, whole }] }] for a tab */
function alphaPages(tab) {
    const pages = [];
    let cur = [];
    const used = () => cur.reduce((n, p) => n + p.rows.length, 0);
    const flush = () => { if (cur.length) pages.push({ parts: cur }); cur = []; };
    ALPHABETS[tab].sections.forEach(sec => {
        const rows = alphaRows(sec);
        if (rows.length <= ALPHA_PAGE_ROWS - used()) { cur.push({ title: sec.title, rows, whole: true }); return; }
        flush();
        if (rows.length <= ALPHA_PAGE_ROWS) { cur.push({ title: sec.title, rows, whole: true }); return; }
        for (let i = 0; i < rows.length; i += ALPHA_PAGE_ROWS) {
            cur.push({ title: sec.title, rows: rows.slice(i, i + ALPHA_PAGE_ROWS), whole: false });
            if (i + ALPHA_PAGE_ROWS < rows.length) flush();
        }
    });
    flush();
    return pages;
}

/* a page's name: its sections, and the first–last letter of a section cut in parts (A–M, 清音 あ–そ) */
function alphaPageName(page) {
    return page.parts.map(p => {
        const name = p.title ? t(p.title) : '';
        if (p.whole) return name;
        const items = p.rows.flat();
        const glyph = it => it[0].split(' ')[0];
        return (name ? name + ' ' : '') + glyph(items[0]) + '–' + glyph(items[items.length - 1]);
    }).join('・');
}

/* Only the tabs of the header's learning language (js/learnlang.js): hiragana and
   katakana for Japanese, one tab for the others; every tab before a language is chosen. */
function alphaTabsShown() {
    const lang = typeof learnLang === 'function' ? learnLang() : '';
    const mine = ALPHA_TABS.filter(id => ALPHA_LANG[id].split('-')[0] === lang);
    return mine.length ? mine : ALPHA_TABS;
}

function alphaFollowLearnLang() {
    const shown = alphaTabsShown();
    if (!shown.includes(alphaTab)) alphaTab = shown[0];
}

function renderAlphabet() {
    const tabs = document.getElementById('alpha-tabs');
    const body = document.getElementById('alpha-body');
    if (!tabs || !body) return;
    alphaFollowLearnLang();
    document.getElementById('alpha-title').innerHTML = escHtml(t('alpha_title')) + introInfoBtn('alpha_hint');
    document.getElementById('alpha-intro').innerHTML = introHtml('alpha_hint');
    const shown = alphaTabsShown();
    tabs.hidden = shown.length < 2;
    tabs.innerHTML = shown.map(id =>
        `<button type="button" class="mode-btn alpha-tab ${id === alphaTab ? 'mode-btn-active' : ''}" onclick="setAlphaTab('${id}')" ${id === alphaTab ? 'aria-pressed="true"' : 'aria-pressed="false"'}>${escHtml(t('alpha_tab_' + id))}</button>`
    ).join('');
    const pages = alphaPages(alphaTab);
    alphaPage = Math.min(alphaPage, pages.length - 1);
    const pageBox = document.getElementById('alpha-pages');
    pageBox.innerHTML = pages.length < 2 ? '' : pages.map((pg, i) =>
        `<button type="button" role="tab" class="alpha-page${i === alphaPage ? ' on' : ''}" aria-selected="${i === alphaPage}" onclick="setAlphaPage(${i})" lang="${ALPHA_LANG[alphaTab]}">${escHtml(alphaPageName(pg))}</button>`).join('');
    body.setAttribute('lang', ALPHA_LANG[alphaTab]);
    audioWarm(ALPHABETS[alphaTab].tts);
    const parts = pages[alphaPage].parts;
    body.innerHTML = parts.map(p => {
        // kana as a 5-column 五十音 chart on desktop (CSS shows the gaps)
        const gojuon = ALPHA_GOJUON_SECS.includes(p.title);
        const cards = p.rows.flat().map(item => alphaCardHtml(item) +
            (gojuon ? ALPHA_GOJUON_GAPS[item[0]] || '' : '')).join('');
        // a section's title only when two share the page (the small tab names a lone one)
        return (parts.length > 1 && p.title ? `<h4 class="alpha-sec-title">${escHtml(t(p.title))}</h4>` : '') +
            `<div class="alpha-grid${gojuon ? ' alpha-gojuon' : ''}">${cards}</div>`;
    }).join('');
}

function setAlphaPage(i) {
    alphaPage = i;
    renderAlphabet();
}

function setAlphaTab(id) {
    if (!ALPHA_TABS.includes(id)) return;
    alphaTab = id;
    alphaPage = 0;
    alphaStore(id);
    renderAlphabet();
}

function alphaSay(btn) {
    speakText(btn.dataset.text, ALPHABETS[alphaTab].tts);
}

document.addEventListener('DOMContentLoaded', () => {
    alphaTab = alphaSaved() || 'en';
    renderAlphabet();
});
