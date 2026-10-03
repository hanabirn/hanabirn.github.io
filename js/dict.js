/* ===== Dictionary (#page-dict) =====
   Three free, keyless services, all called straight from the browser (CORS):
   - MyMemory   translation into the site language (≈5,000 chars/day per visitor IP).
                It is a translation memory and picks poor matches for lone words
                (食べる → 美食, 사랑 → 我爱你), so the headline translation is the first
                Wiktionary gloss translated from English (to eat → 吃); the word itself
                is only sent to MyMemory when Wiktionary has no entry.
   - Wiktionary part of speech + definitions (English) + the odd example, CC BY-SA
   - Tatoeba    example sentences with a translation, CC BY 2.0 FR (endpoint is "unstable")
   Each section loads and fails on its own, so one service being down never blanks
   the page. A newer search aborts the requests of the previous one. */

const DICT_LANGS = [
    { id: 'ja', wk: 'ja', mm: 'ja',    tt: 'jpn', tts: 'ja-JP' },
    { id: 'ko', wk: 'ko', mm: 'ko',    tt: 'kor', tts: 'ko-KR' },
    { id: 'en', wk: 'en', mm: 'en',    tt: 'eng', tts: 'en-US' },
    { id: 'fr', wk: 'fr', mm: 'fr',    tt: 'fra', tts: 'fr-FR' },
    { id: 'es', wk: 'es', mm: 'es',    tt: 'spa', tts: 'es-ES' },
    { id: 'de', wk: 'de', mm: 'de',    tt: 'deu', tts: 'de-DE' },
    { id: 'ru', wk: 'ru', mm: 'ru',    tt: 'rus', tts: 'ru-RU' },
    { id: 'zh', wk: 'zh', mm: 'zh-TW', tt: 'cmn', tts: 'zh-TW' }
];

/* site language -> what to translate into (MyMemory code, Tatoeba code) */
const DICT_TARGET = {
    'zh': { mm: 'zh-TW', tt: 'cmn', id: 'zh' }, 'zh-Hans': { mm: 'zh-CN', tt: 'cmn', id: 'zh' },
    'en': { mm: 'en', tt: 'eng', id: 'en' }, 'ja': { mm: 'ja', tt: 'jpn', id: 'ja' },
    'ko': { mm: 'ko', tt: 'kor', id: 'ko' }, 'ru': { mm: 'ru', tt: 'rus', id: 'ru' },
    'fr': { mm: 'fr', tt: 'fra', id: 'fr' }, 'es': { mm: 'es', tt: 'spa', id: 'es' },
    'de': { mm: 'de', tt: 'deu', id: 'de' }
};

const DICT_HISTORY_MAX = 8;
const DICT_DEFS_MAX = 8;
let dictLang = 'en';
let dictAbort = null;

function dictLangById(id) {
    return DICT_LANGS.find(l => l.id === id) || DICT_LANGS[2];
}

/* What to translate into: the site language, or English when the word is already
   in the site language (or Chinese when both are English). */
function dictTarget(srcId) {
    const tg = DICT_TARGET[siteLang] || DICT_TARGET.zh;
    if (tg.id !== srcId) return tg;
    return srcId === 'en' ? DICT_TARGET.zh : DICT_TARGET.en;
}

function dictStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function dictLoad(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v === null ? fallback : v; }
    catch { return fallback; }
}

/* ----- language chips ----- */

function renderDictLangs() {
    const el = document.getElementById('dict-langs');
    if (!el) return;
    el.innerHTML = DICT_LANGS.map(l =>
        `<button type="button" class="mode-btn dict-lang ${l.id === dictLang ? 'mode-btn-active' : ''}" onclick="setDictLang('${l.id}')">${escHtml(t('dict_lang_' + l.id))}</button>`
    ).join('');
}

function setDictLang(id) {
    dictLang = dictLangById(id).id;
    dictStore('dict_lang', dictLang);
    renderDictLangs();
}

/* Script-based guess while typing: kana -> Japanese, hangul -> Korean, Cyrillic ->
   Russian. Han-only or Latin text is ambiguous, so it keeps the current choice
   (falling back to Chinese / English when the current choice can't be right). */
function dictGuessLang(text) {
    const s = (text || '').trim();
    if (!s) return;
    let guess = null;
    if (/[぀-ヿ]/.test(s)) guess = 'ja';
    else if (/[가-힯ᄀ-ᇿ]/.test(s)) guess = 'ko';
    else if (/[Ѐ-ӿ]/.test(s)) guess = 'ru';
    else if (/[一-鿿]/.test(s)) guess = (dictLang === 'ja' || dictLang === 'zh') ? dictLang : 'zh';
    else if (/[a-zà-ÿß]/i.test(s)) guess = ['en', 'fr', 'es', 'de'].includes(dictLang) ? dictLang : 'en';
    if (guess && guess !== dictLang) setDictLang(guess);
}

/* ----- history ----- */

function renderDictRecent() {
    const el = document.getElementById('dict-recent');
    if (!el) return;
    const hist = dictLoad('dict_history', []);
    if (!hist.length) { el.innerHTML = ''; return; }
    el.innerHTML = `<span class="dict-recent-label">${escHtml(t('dict_recent'))}</span>` +
        hist.map((h, i) => `<button type="button" class="dict-chip" onclick="dictFromHistory(${i})">${escHtml(h.w)}</button>`).join('');
}

function dictFromHistory(i) {
    const h = dictLoad('dict_history', [])[i];
    if (!h) return;
    document.getElementById('dict-input').value = h.w;
    setDictLang(h.l);
    dictSearch(h.w, h.l);
}

function dictRemember(word, lang) {
    const hist = dictLoad('dict_history', []).filter(h => !(h.w === word && h.l === lang));
    hist.unshift({ w: word, l: lang });
    dictStore('dict_history', hist.slice(0, DICT_HISTORY_MAX));
}

/* ----- search ----- */

function dictSubmit(e) {
    e.preventDefault();
    const word = document.getElementById('dict-input').value.trim();
    if (word) dictSearch(word, dictLang);
    return false;
}

function dictSection(id, titleKey, noteKey) {
    return `<section class="home-card dict-section" id="${id}">
        <div class="dict-section-head">
            <h4 class="dict-section-title" data-i18n="${titleKey}">${escHtml(t(titleKey))}</h4>
            ${noteKey ? `<span class="dict-note" data-i18n="${noteKey}">${escHtml(t(noteKey))}</span>` : ''}
        </div>
        <div class="dict-body"><p class="dict-status">${escHtml(t('dict_loading'))}</p></div>
    </section>`;
}

function dictSetBody(id, html) {
    const el = document.querySelector('#' + id + ' .dict-body');
    if (el) el.innerHTML = html;
}

function dictStatus(key) {
    return `<p class="dict-status">${escHtml(t(key))}</p>`;
}

function dictSearch(word, langId) {
    const lang = dictLangById(langId);
    if (dictAbort) dictAbort.abort();
    dictAbort = new AbortController();
    const signal = dictAbort.signal;

    dictRemember(word, lang.id);
    renderDictRecent();

    document.getElementById('dict-results').innerHTML =
        `<div class="dict-word">
            <span class="dict-word-text">${escHtml(word)}</span>
            <span class="dict-word-lang" data-i18n="dict_lang_${lang.id}">${escHtml(t('dict_lang_' + lang.id))}</span>
            <button class="speak-btn" onclick="dictSpeak(this.dataset.text, '${lang.id}')" data-text="${escHtml(word)}" aria-label="🔊">🔊</button>
        </div>` +
        dictSection('dict-tr', 'dict_translation', 'dict_mt_note') +
        dictSection('dict-def', 'dict_definitions', 'dict_definitions_note') +
        dictSection('dict-ex', 'dict_examples', null);

    const target = dictTarget(lang.id);
    const gloss = dictDefinitions(word, lang, signal);
    dictTranslate(word, lang, target, gloss, signal);
    dictExamples(word, lang, target, signal);
}

function dictErrorKey(err) {
    return err && err.name === 'AbortError' ? null : 'dict_error';
}

/* MyMemory: one request, 500-byte cap per query */
async function myMemory(text, fromCode, toCode, signal) {
    const url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text.slice(0, 450)) +
        '&langpair=' + encodeURIComponent(fromCode + '|' + toCode);
    const res = await fetch(url, { signal });
    const data = await res.json();
    if (data.quotaFinished || res.status === 429 || data.responseStatus === 429) {
        const e = new Error('quota'); e.name = 'Quota'; throw e;
    }
    const out = data.responseData && data.responseData.translatedText;
    if (!out || data.responseStatus >= 400) throw new Error('mymemory ' + data.responseStatus);
    // it sometimes echoes the term in brackets: 愛[愛]
    return out.replace(/\[[^\]]*\]/g, '').trim() || out;
}

/* `gloss` resolves to the first Wiktionary definition (English) or null. */
async function dictTranslate(word, lang, target, gloss, signal) {
    try {
        const en = await gloss;
        let out;
        if (en) out = target.mm === 'en' ? en : await myMemory(en, 'en', target.mm, signal);
        else out = await myMemory(word, lang.mm, target.mm, signal);
        dictSetBody('dict-tr', `<p class="dict-translation">${escHtml(out)}</p>`);
    } catch (err) {
        if (err.name === 'AbortError') return;
        dictSetBody('dict-tr', dictStatus(err.name === 'Quota' ? 'dict_quota' : 'dict_error'));
    }
}

/* Wiktionary definitions come as HTML; only their text is kept (parsed, never inserted).
   Some carry inline <style> blocks (.mw-parser-output .defdate {...}) whose CSS would
   otherwise end up in the text. */
function wkText(html) {
    const doc = new DOMParser().parseFromString('<body>' + (html || '') + '</body>', 'text/html');
    doc.body.querySelectorAll('style, script, link').forEach(n => n.remove());
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

function posLabel(pos) {
    const key = 'pos_' + String(pos || '').toLowerCase().replace(/\s+/g, '_');
    const label = t(key);
    return label === key ? pos : label;
}

/* Wiktionary titles are case-sensitive (English "house" vs proper noun "House",
   German nouns are capitalised), so try the word as typed, then lower/Capitalised. */
async function fetchWiktionary(word, lang, signal) {
    const variants = [word];
    const lower = word.toLowerCase();
    const cap = lower.charAt(0).toUpperCase() + lower.slice(1);
    [lower, cap].forEach(v => { if (!variants.includes(v)) variants.push(v); });
    for (const v of variants) {
        const res = await fetch('https://en.wiktionary.org/api/rest_v1/page/definition/' + encodeURIComponent(v),
            { signal, headers: { 'Api-User-Agent': 'hanabirn.xyz dictionary (https://hanabirn.xyz/)' } });
        if (res.status === 404) continue;
        if (!res.ok) throw new Error('wiktionary ' + res.status);
        const data = await res.json();
        const entries = data[lang.wk];
        if (entries && entries.length) return { title: v, entries };
    }
    return null;
}

/* Renders the definitions section and resolves to the first gloss (or null). */
async function dictDefinitions(word, lang, signal) {
    let firstGloss = null;
    try {
        const found = await fetchWiktionary(word, lang, signal);
        if (!found) { dictSetBody('dict-def', dictStatus('dict_none')); return null; }
        let shown = 0;
        let html = '';
        for (const entry of found.entries) {
            if (shown >= DICT_DEFS_MAX) break;
            const defs = (entry.definitions || [])
                .map(d => ({ text: wkText(d.definition), ex: (d.examples || []).map(wkText).filter(Boolean)[0] || '' }))
                .filter(d => d.text)
                .slice(0, DICT_DEFS_MAX - shown);
            if (!defs.length) continue;
            if (!firstGloss) firstGloss = defs[0].text;
            shown += defs.length;
            html += `<div class="dict-pos-group">
                <span class="dict-pos">${escHtml(posLabel(entry.partOfSpeech))}</span>
                <ol class="dict-defs">${defs.map(d => `<li><span class="dict-def">${escHtml(d.text)}</span>${d.ex ? `<span class="dict-def-ex">${escHtml(d.ex)}</span>` : ''}</li>`).join('')}</ol>
            </div>`;
        }
        if (!html) { dictSetBody('dict-def', dictStatus('dict_none')); return null; }
        const target = dictTarget('en');
        html += target.id !== 'en'
            ? `<button class="back-btn dict-def-translate" onclick="dictTranslateDefs(this)">${escHtml(t('dict_translate_defs'))}</button>`
            : '';
        html += `<a class="dict-more" href="https://en.wiktionary.org/wiki/${encodeURIComponent(found.title)}" target="_blank" rel="noopener noreferrer">Wiktionary ↗</a>`;
        dictSetBody('dict-def', html);
        return firstGloss;
    } catch (err) {
        const key = dictErrorKey(err);
        if (key) dictSetBody('dict-def', dictStatus(key));
        if (err && err.name === 'AbortError') throw err;
        return null;
    }
}

/* Translate the (English) definitions shown into the site language, one request each. */
async function dictTranslateDefs(btn) {
    const target = dictTarget('en');
    btn.disabled = true;
    const items = [...document.querySelectorAll('#dict-def .dict-def')];
    try {
        for (const el of items) {
            if (el.nextElementSibling && el.nextElementSibling.classList.contains('dict-def-tr')) continue;
            const out = await myMemory(el.textContent, 'en', target.mm);
            el.insertAdjacentHTML('afterend', `<span class="dict-def-tr">${escHtml(out)}</span>`);
        }
        btn.remove();
    } catch (err) {
        btn.disabled = false;
        btn.textContent = t(err.name === 'Quota' ? 'dict_quota' : 'dict_error');
    }
}

function highlightWord(sentence, word) {
    const safe = escHtml(sentence);
    const w = escHtml(word);
    if (!w) return safe;
    const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return safe.replace(re, m => `<mark>${m}</mark>`);
}

function tatoebaTranslation(s, tt) {
    for (const group of (s.translations || [])) {
        for (const tr of (Array.isArray(group) ? group : [group])) {
            if (tr && tr.lang === tt && tr.text) return tr.text;
        }
    }
    return '';
}

async function dictExamples(word, lang, target, signal) {
    const base = 'https://api.tatoeba.org/unstable/sentences?lang=' + lang.tt +
        '&q=' + encodeURIComponent(word) + '&sort=relevance&limit=5';
    try {
        let res = await fetch(base + '&trans:lang=' + target.tt, { signal });
        let data = res.ok ? await res.json() : { data: [] };
        // no sentence with a translation into the site language: show untranslated ones
        if (!data.data || !data.data.length) {
            res = await fetch(base, { signal });
            data = res.ok ? await res.json() : { data: [] };
        }
        const list = (data.data || []).slice(0, 5);
        if (!list.length) { dictSetBody('dict-ex', dictStatus('dict_none')); return; }
        dictSetBody('dict-ex', `<ul class="dict-examples">${list.map(s => {
            const tr = tatoebaTranslation(s, target.tt);
            return `<li>
                <div class="dict-ex-text">${highlightWord(s.text, word)}</div>
                ${tr ? `<div class="dict-ex-tr">${escHtml(tr)}</div>` : ''}
                <button class="speak-btn dict-ex-speak" onclick="dictSpeak(this.dataset.text, '${lang.id}')" data-text="${escHtml(s.text)}" aria-label="🔊">🔊</button>
            </li>`;
        }).join('')}</ul>
        <a class="dict-more" href="https://tatoeba.org/${lang.tt === 'cmn' ? 'zh-tw' : 'en'}/sentences/search?query=${encodeURIComponent(word)}&from=${lang.tt}" target="_blank" rel="noopener noreferrer">Tatoeba ↗</a>`);
    } catch (err) {
        const key = dictErrorKey(err);
        if (key) dictSetBody('dict-ex', dictStatus(key));
    }
}

function dictSpeak(text, langId) {
    if (!text || !window.speechSynthesis) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = dictLangById(langId).tts;
    speechSynthesis.speak(u);
}

/* ----- page lifecycle ----- */

function renderDictPage() {
    renderDictLangs();
    renderDictRecent();
}

document.addEventListener('DOMContentLoaded', () => {
    dictLang = dictLangById(dictLoad('dict_lang', 'en')).id;
    renderDictPage();
});
