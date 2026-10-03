/* ===================== Alphabet chart (#page-alphabet) =====================
   Letters for beginners, one tab per writing system; the data is in
   js/alphabet-data.js. Every letter and every example word can be read aloud
   with the browser's speech synthesis. */

const ALPHA_TABS = ['en', 'hira', 'kata', 'ko', 'zh', 'ru', 'fr', 'de', 'es'];
// language of each tab: the page's lang attribute (picks the right CJK glyph
// forms) and the UI language whose own meaning would just repeat the word
const ALPHA_LANG = { en: 'en', hira: 'ja', kata: 'ja', ko: 'ko', zh: 'zh-TW', ru: 'ru', fr: 'fr', de: 'de', es: 'es' };
let alphaTab = 'en';

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
    const letterBtn = `<button type="button" class="speak-btn alpha-speak" data-text="${escHtml(speak)}" onclick="alphaSay(this)" aria-label="${escHtml(t('alpha_play_letter'))}" title="${escHtml(t('alpha_play_letter'))}">🔊</button>`;
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
            <button type="button" class="speak-btn alpha-speak" data-text="${escHtml(word)}" onclick="alphaSay(this)" aria-label="${escHtml(t('alpha_play_word'))}" title="${escHtml(t('alpha_play_word'))}">🔊</button>
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

function renderAlphabet() {
    const tabs = document.getElementById('alpha-tabs');
    const body = document.getElementById('alpha-body');
    if (!tabs || !body) return;
    tabs.innerHTML = ALPHA_TABS.map(id =>
        `<button type="button" class="mode-btn alpha-tab ${id === alphaTab ? 'mode-btn-active' : ''}" onclick="setAlphaTab('${id}')" ${id === alphaTab ? 'aria-pressed="true"' : 'aria-pressed="false"'}>${escHtml(t('alpha_tab_' + id))}</button>`
    ).join('');
    body.setAttribute('lang', ALPHA_LANG[alphaTab]);
    audioWarm(ALPHABETS[alphaTab].tts);
    body.innerHTML = ALPHABETS[alphaTab].sections.map(sec => {
        // the basic kana as a 5-column 五十音 chart on desktop (CSS shows the gaps)
        const gojuon = sec.title === 'alpha_sec_seion';
        const cards = sec.items.map(item => alphaCardHtml(item) +
            (gojuon ? ALPHA_GOJUON_GAPS[item[0]] || '' : '')).join('');
        return (sec.title ? `<h4 class="alpha-sec-title">${escHtml(t(sec.title))}</h4>` : '') +
            `<div class="alpha-grid${gojuon ? ' alpha-gojuon' : ''}">${cards}</div>`;
    }).join('');
}

function setAlphaTab(id) {
    if (!ALPHA_TABS.includes(id)) return;
    alphaTab = id;
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
