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
   the page. A newer search aborts the requests of the previous one.
   Since 2026-10-22 the translations and definitions come from the 小花火 Worker (below);
   MyMemory and the English-only Wiktionary view are the fallback when it can't answer. */

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

/* the word's language: a pill in front of the search box opening a menu grouped by
   region like the header's 我在學 (2026-10-22: the row of 8 buttons only grew) */
function renderDictLangs() {
    const el = document.getElementById('dict-pick');
    if (!el) return;
    const open = el.classList.contains('open');
    const flags = id => (typeof learnFlags === 'function' ? learnFlags(id) : '');
    const regions = typeof LANG_REGIONS !== 'undefined' ? LANG_REGIONS : [{ id: '', langs: DICT_LANGS.map(l => l.id) }];
    el.innerHTML = `<button type="button" class="dict-pill" onclick="toggleDictPick()" aria-haspopup="true" aria-expanded="${open}">${flags(dictLang)}<span>${escHtml(t('dict_lang_' + dictLang))}</span><span class="dict-pill-caret" aria-hidden="true">▾</span></button>
        <div class="dict-pick-menu" role="menu">${regions.map(r => `
            ${r.id ? `<div class="dict-pick-group">${escHtml(t('region_' + r.id))}</div>` : ''}
            <div class="dict-pick-opts">${r.langs.filter(id => DICT_LANGS.some(l => l.id === id)).map(id =>
                `<button type="button" role="menuitem" class="${id === dictLang ? 'on' : ''}" onclick="setDictLang('${id}'); toggleDictPick(false)">${flags(id)}<span>${escHtml(t('dict_lang_' + id))}</span></button>`).join('')}</div>`).join('')}
            <p class="dict-pick-tip">${escHtml(t('dict_pick_tip'))}</p>
        </div>`;
}

function toggleDictPick(open) {
    const el = document.getElementById('dict-pick');
    if (!el) return;
    const on = typeof open === 'boolean' ? open : !el.classList.contains('open');
    el.classList.toggle('open', on);
    const b = el.querySelector('.dict-pill');
    if (b) b.setAttribute('aria-expanded', String(on));
}

document.addEventListener('click', e => {
    const el = document.getElementById('dict-pick');
    if (el && el.classList.contains('open') && !el.contains(e.target)) toggleDictPick(false);
});

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
            <span class="dict-word-reading"></span>
            <span class="dict-word-lang" data-i18n="dict_lang_${lang.id}">${escHtml(t('dict_lang_' + lang.id))}</span>
            <button class="speak-btn" onclick="dictSpeak(this.dataset.text, '${lang.id}')" data-text="${escHtml(word)}" aria-label="🔊">${uiIcon('speaker')}</button>
            <button type="button" class="note-add" data-text="${escHtml(word)}" onclick="dictNote(this.dataset.text, '${lang.id}')" title="${escHtml(t('notes_add'))}" aria-label="${escHtml(t('notes_add'))}">${uiIcon('plus')}<span>${escHtml(t('notes_add_short'))}</span></button>
        </div>` +
        dictSection('dict-tr', 'dict_translation', 'dict_mt_note') +
        dictSection('dict-def', 'dict_definitions', 'dict_definitions_note') +
        dictSection('dict-ex', 'dict_examples', null);

    const target = dictTarget(lang.id);
    dictLast = null;
    dictAsk(word, lang, signal)
        .then(r => { if (!signal.aborted) dictRenderAsk(r, lang); })
        .catch(err => {
            if (err && err.name === 'AbortError') return;
            // the Worker can't answer: the old way (English definitions, MyMemory)
            const gloss = dictDefinitions(word, lang, signal);
            dictTranslate(word, lang, target, gloss, signal);
        });
    dictExamples(word, lang, target, signal);
}

/* ＋筆記 (js/notes.js): the word and its translation, as a word card in the language's note */
function dictNote(word, langId) {
    if (typeof notesAddFrom !== 'function') return;
    const tr = document.querySelector('#dict-tr .dict-translation');
    const name = t('dict_lang_' + langId);
    const mine = dictLast && dictLast.word === word
        ? (dictLast.tr[siteLang] || (dictLast.senses[0] && dictLast.senses[0].defs[0] && dictLast.senses[0].defs[0].t) || '') : '';
    notesAddFrom({
        kind: 'dict', ref: langId, lang: langId, label: t('nav_dict'),
        title: t('notes_src_dict_title', { l: name }), text: notesWordLine(word, dictLast && dictLast.word === word ? dictLast.reading : '', mine || (tr ? tr.textContent : ''))
    });
}

function dictErrorKey(err) {
    return err && err.name === 'AbortError' ? null : 'dict_error';
}

/* ----- the dictionary Worker (2026-10-22, owner's picks A1 + B + C1 + D + E) -----
   /dict on the 小花火 Worker (worker/assistant/src/dict.js) gives, in one answer, the word
   in every other site language (tr), its Wiktionary senses translated into the interface
   language (with the English kept for 看英文原文), a reading and, for an idiom or proverb,
   a plain explanation (note). Answers are kept per device in dict_cache (DICT_CACHE_MAX),
   and shared by all visitors on the Worker. Without the Worker (offline, busy) the page
   falls back to the old way: Wiktionary in English and MyMemory. */
const DICT_CACHE_MAX = 60;
const DICT_TR_ORDER = ['zh', 'zh-Hans', 'en', 'ja', 'ko', 'fr', 'ru', 'es', 'de'];
const DICT_TR_FLAGS = { zh: ['tw'], 'zh-Hans': ['cn'], en: ['gb'], ja: ['jp'], ko: ['kr'], fr: ['fr'], ru: ['ru'], es: ['es'], de: ['de'] };
const DICT_TR_TTS = { zh: 'zh-TW', 'zh-Hans': 'zh-CN', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', fr: 'fr-FR', ru: 'ru-RU', es: 'es-ES', de: 'de-DE' };
let dictLast = null;      // the Worker's answer on screen (＋筆記 uses it)

function dictApi() {
    return (typeof ASSISTANT_API === 'string' ? ASSISTANT_API : 'https://hanabi-assistant.osu-collection-hanabi.workers.dev/chat').replace(/\/chat$/, '/dict');
}

async function dictAsk(word, lang, signal) {
    const key = lang.id + '|' + siteLang + '|' + word;
    const cache = dictLoad('dict_cache', {});
    if (cache[key] && cache[key].r) return cache[key].r;
    const res = await fetch(dictApi(), {
        method: 'POST', signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, lang: lang.id, ui: siteLang })
    });
    const r = await res.json().catch(() => ({ error: 'upstream' }));
    if (!res.ok || r.error) { const e = new Error(r.error || 'dict ' + res.status); e.name = r.error === 'busy' ? 'Busy' : 'Error'; throw e; }
    cache[key] = { r, at: Date.now() };
    const keys = Object.keys(cache).sort((a, b) => (cache[b].at || 0) - (cache[a].at || 0));
    keys.slice(DICT_CACHE_MAX).forEach(k => delete cache[k]);
    dictStore('dict_cache', cache);
    return r;
}

/* Which translations show first (owner's pick 2026-10-23): the interface language and
   the 我在學 language (js/learnlang.js); the rest wait behind 其他語言. When the word is
   in the interface language itself, English stands in for it. */
function dictTrFirst(r) {
    const zhKey = siteLang === 'zh-Hans' ? 'zh-Hans' : 'zh';
    const learn = typeof learnLang === 'function' ? learnLang() : '';
    // the interface language, or English standing in when the word is in it already
    const ui = r.tr && r.tr[siteLang] ? siteLang : 'en';
    const want = [ui, learn === 'zh' ? zhKey : learn].filter(Boolean);
    let first = [...new Set(want)].filter(c => r.tr && r.tr[c]);
    if (!first.length) first = ['en', zhKey].filter(c => r.tr && r.tr[c]).slice(0, 1);
    if (!first.length) first = DICT_TR_ORDER.filter(c => r.tr && r.tr[c]).slice(0, 1);
    return first;
}

function dictTrItem(r, c, main) {
    return `<div class="dict-tr-item${main ? ' main' : ''}">
            <span class="dict-tr-lang">${(DICT_TR_FLAGS[c] || []).map(f => `<span class="flag flag--${f}" aria-hidden="true"></span>`).join('')}${escHtml(dictTrLabel(c))}</span>
            <span class="dict-tr-text" lang="${c}">${escHtml(r.tr[c])}</span>
            <button type="button" class="speak-btn dict-tr-speak" onclick="speakText(this.dataset.text, '${DICT_TR_TTS[c]}')" data-text="${escHtml(r.tr[c].split(' / ')[0].replace(/\s*\(.*?\)\s*/g, ' ').trim())}" aria-label="🔊">${uiIcon('speaker')}</button>
        </div>`;
}

function dictTrMore(btn) {
    const box = document.getElementById('dict-tr-rest');
    if (!box) return;
    box.hidden = !box.hidden;
    btn.setAttribute('aria-expanded', String(!box.hidden));
    btn.textContent = box.hidden ? t('dict_tr_more', { n: box.children.length }) : t('dict_tr_less');
}

function dictTrLabel(code) {
    if (code === 'zh') return t('dict_tr_zh');
    if (code === 'zh-Hans') return t('dict_tr_zhs');
    return t('dict_lang_' + code);
}

/* the Worker's answer on the page: the reading and kind in the head, the word in every
   other language, the senses in the interface language, the plain explanation */
function dictRenderAsk(r, lang) {
    dictLast = r;
    const head = document.querySelector('#dict-results .dict-word');
    if (head) {
        const rd = head.querySelector('.dict-word-reading');
        if (rd && r.reading && r.reading !== r.word) rd.textContent = r.reading;
        if (r.kind && r.kind !== 'word') head.querySelector('.dict-word-lang').insertAdjacentHTML('afterend', `<span class="dict-kind">${escHtml(t('dict_kind_' + r.kind))}</span>`);
    }
    const codes = DICT_TR_ORDER.filter(c => r.tr && r.tr[c]);
    const first = dictTrFirst(r);
    const rest = codes.filter(c => !first.includes(c));
    dictSetBody('dict-tr', codes.length ? `<div class="dict-tr-grid dict-tr-first">${first.map((c, i) => dictTrItem(r, c, i === 0)).join('')}</div>
        ${rest.length ? `<button type="button" class="dict-tr-more" onclick="dictTrMore(this)" aria-expanded="false" aria-controls="dict-tr-rest">${escHtml(t('dict_tr_more', { n: rest.length }))}</button>
        <div class="dict-tr-grid" id="dict-tr-rest" hidden>${rest.map(c => dictTrItem(r, c, false)).join('')}</div>` : ''}` : dictStatus('dict_none'));

    const hasEn = r.senses.some(s => s.defs.some(d => d.en));
    let html = r.senses.length ? r.senses.map(s => `<div class="dict-pos-group">
            <span class="dict-pos">${escHtml(s.pos)}</span>
            <ol class="dict-defs">${s.defs.map(d => `<li>
                <span class="dict-def">${escHtml(d.t)}</span>
                ${d.en ? `<span class="dict-def-en" lang="en" hidden>${escHtml(d.en)}</span>` : ''}
                ${d.ex ? `<span class="dict-def-ex" lang="${lang.id}">${escHtml(d.ex)}${d.ex_tr ? `<span class="dict-def-ex-tr">${escHtml(d.ex_tr)}</span>` : ''}</span>` : ''}
            </li>`).join('')}</ol>
        </div>`).join('') : dictStatus('dict_none');
    if (r.note) html += `<div class="dict-plain"><b>${escHtml(t('dict_plain'))}</b>${escHtml(r.note).replace(/\n/g, '<br>')}</div>`;
    if (r.src === 'wiktionary') html += `<a class="dict-more" href="https://en.wiktionary.org/wiki/${encodeURIComponent(r.title || r.word)}" target="_blank" rel="noopener noreferrer">Wiktionary ↗</a>`;
    dictSetBody('dict-def', html);
    const note = document.querySelector('#dict-def .dict-note');
    if (note) note.innerHTML = hasEn && siteLang !== 'en'
        ? `<button type="button" class="dict-en-toggle" onclick="dictToggleEn(this)" aria-pressed="false">${escHtml(t('dict_show_en'))}</button>`
        : escHtml(t(r.src === 'wiktionary' ? 'dict_definitions_note' : 'dict_def_ai_note'));
}

/* 看英文原文 / 看翻譯: the Wiktionary English under (instead of) each translated definition */
function dictToggleEn(btn) {
    const on = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(on));
    btn.textContent = t(on ? 'dict_show_tr' : 'dict_show_en');
    document.querySelectorAll('#dict-def .dict-def-en').forEach(el => { el.hidden = !on; });
    document.querySelectorAll('#dict-def .dict-def').forEach(el => el.classList.toggle('dict-def-dim', on));
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

/* Tatoeba's Chinese is mixed, mostly Simplified with mainland wording. Common characters
   that exist only in one script tell whether a line needs /dict/zh (the Worker rewrites it
   in Taiwan Traditional or Mainland Simplified, big check 2026-10-24). */
const DICT_SIMP_ONLY = '们这个说时来对会为学么吗还过没样现发经门东车书长开关见听话语读写电脑买卖钱问间边头欢爱气难点热饭馆鱼鸡鸟马龙国园图场认识让给红绿蓝黄汉岁业从两进远运动员华体师阳阴机杂条桥楼灯烟猫猪实宝当总节乐丢伞尘屉视觉讨厌办桌诉亲爷孙这样谁请谢该虽应试题错练习课词须觉时间钟药医种约饮饺鸭汤盐糖货价单张网络脸钥铅笔湾广';
const DICT_TRAD_ONLY = '們這個說時來對會為學麼嗎還過沒樣現發經門東車書長開關見聽話語讀寫電腦買賣錢問間邊頭歡愛氣難點熱飯館魚雞鳥馬龍國園圖場認識讓給紅綠藍黃漢歲業從兩進遠運動員華體師陽陰機雜條橋樓燈煙貓豬實寶當總節樂丟傘塵屜視覺討厭辦訴親爺孫誰請謝該雖應試題錯練習課詞須鐘藥醫種約飲餃鴨湯鹽貨價單張網絡臉鑰鉛筆灣廣';
function dictZhTarget() { return siteLang === 'zh-Hans' ? 'zh-Hans' : siteLang === 'zh' ? 'zh' : ''; }
function dictZhWrong(line, to) {
    const other = to === 'zh-Hans' ? DICT_TRAD_ONLY : DICT_SIMP_ONLY;
    return [...line].some(c => other.includes(c));
}

function tatoebaTranslation(s, tt) {
    const all = [];
    for (const group of (s.translations || [])) {
        for (const tr of (Array.isArray(group) ? group : [group])) {
            if (tr && tr.lang === tt && tr.text) all.push(tr.text);
        }
    }
    // Chinese: rather a translation already in the interface's script
    const to = tt === 'cmn' && dictZhTarget();
    return (to && all.find(l => !dictZhWrong(l, to))) || all[0] || '';
}

/* The example lines (data-zh) not yet in the interface's script, rewritten by the Worker;
   the page shows Tatoeba's text first and swaps each line in when the answer comes. */
async function dictZhFix(box, signal) {
    const to = dictZhTarget();
    if (!to || !box) return;
    const els = [...box.querySelectorAll('[data-zh]')].filter(el => dictZhWrong(el.textContent, to));
    if (!els.length) return;
    try {
        const res = await fetch(dictApi() + '/zh', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, lines: els.map(el => el.textContent) }), signal });
        if (!res.ok) return;
        const data = await res.json();
        if (!data.lines || data.lines.length !== els.length) return;
        els.forEach((el, i) => {
            const line = String(data.lines[i] || '');
            if (!line) return;
            const speak = el.closest('li') && el.closest('li').querySelector('.dict-ex-speak');
            if (speak && el.classList.contains('dict-ex-text')) speak.dataset.text = line;
            el.innerHTML = el.classList.contains('dict-ex-text') ? highlightWord(line, el.dataset.zh) : escHtml(line);
        });
    } catch {}
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
            // data-zh marks a Chinese line dictZhFix may rewrite (on the sentence: the word to mark)
            return `<li>
                <div class="dict-ex-text"${lang.tt === 'cmn' ? ` data-zh="${escHtml(word)}"` : ''}>${highlightWord(s.text, word)}</div>
                ${tr ? `<div class="dict-ex-tr"${target.tt === 'cmn' ? ' data-zh=""' : ''}>${escHtml(tr)}</div>` : ''}
                <button class="speak-btn dict-ex-speak" onclick="dictSpeak(this.dataset.text, '${lang.id}')" data-text="${escHtml(s.text)}" aria-label="🔊">${uiIcon('speaker')}</button>
            </li>`;
        }).join('')}</ul>
        <a class="dict-more" href="https://tatoeba.org/${lang.tt === 'cmn' ? 'zh-tw' : 'en'}/sentences/search?query=${encodeURIComponent(word)}&from=${lang.tt}" target="_blank" rel="noopener noreferrer">Tatoeba ↗</a>`);
        dictZhFix(document.getElementById('dict-ex'), signal);
    } catch (err) {
        const key = dictErrorKey(err);
        if (key) dictSetBody('dict-ex', dictStatus(key));
    }
}

function dictSpeak(text, langId) {
    const tts = dictLangById(langId).tts;
    // Chinese in the visitor's accent (js/speech.js)
    speakText(text, tts.startsWith('zh') ? zhAccent(zhUiScript()) : tts);
}

/* ----- page lifecycle ----- */

function renderDictPage() {
    renderDictLangs();
    renderDictRecent();
}

/* The dictionary starts in the header's learning language (js/learnlang.js); its own
   language buttons stay, for looking up a word in another one. */
function dictFollowLearnLang() {
    const lang = typeof learnLang === 'function' ? learnLang() : '';
    if (lang && dictLangById(lang).id === lang) dictLang = lang;
}

document.addEventListener('DOMContentLoaded', () => {
    dictLang = dictLangById(dictLoad('dict_lang', 'en')).id;
    dictFollowLearnLang();
    renderDictPage();
});
