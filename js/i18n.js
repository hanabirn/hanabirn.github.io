/* ===== i18n =====
   Language dictionaries live in i18n/<lang>.js (one file per language).
   Each does `I18N.xx = {...}`, so those <script> tags must load AFTER
   this file declares I18N, and BEFORE any code below calls t()/applyLang(). ===== */
const I18N = {};

let siteLang = localStorage.getItem('site_lang') || 'zh';

function applyLang(lang) {
    siteLang = lang;
    localStorage.setItem('site_lang', lang);
    document.documentElement.lang = lang;
    const t = I18N[lang] || I18N.zh;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.innerHTML = t[key];
    });
    if (typeof playTitleEntrance === 'function') playTitleEntrance();
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (t[key]) el.placeholder = t[key];
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (t[key]) el.title = t[key];
    });
    document.querySelectorAll('.lang-pill').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
    // Header button shows the active language's flag chip — mirror the
    // matching pill's data-flag code (same as the osu! site).
    const currentPill = document.querySelector(`.lang-pill[data-lang="${lang}"]`);
    const currentLabel = document.getElementById('lang-globe-current');
    if (currentPill && currentLabel) {
        const code = currentPill.dataset.flag;
        if (/^[a-z]{2}$/.test(code || '')) currentLabel.innerHTML = `<span class="flag flag--${code}"></span>`;
    }
    if (t.title) document.title = t.title;
    if (typeof refreshDynamicContent === 'function') refreshDynamicContent();
}


function setSiteLang(lang) {
    applyLang(lang);
}

/* ===== i18n helpers for dynamic content ===== */
function t(key, params) {
    const str = (I18N[siteLang] || I18N.zh)[key] || (I18N.zh)[key] || key;
    if (!params) return str;
    return Object.entries(params).reduce((s, [k, v]) => s.replace(`{${k}}`, v), str);
}
