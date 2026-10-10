/* ===================== 閱讀 Reading (#page-reading) =====================
   Graded passages built by tools/build_reading.py from the hand-written
   tools/reading/<id>.json (data/reading/index.json lists the levels; Japanese N5
   first). A passage: title, paragraphs of sentences, a glossary, MCQ + true/false
   questions. A sentence comes as segments [text, furigana, glossary index]; tapping
   it plays its recording (keyed "plain|kana", tools/build_audio.py), tapping an
   underlined word opens its card. The reader has a furigana / translation toggle,
   a timer and a font size; the quiz is one page (multiple choice, then ○ / ×), and
   READING_PASS of it right marks the passage read. Afterwards a short glossary
   review grades the words into the mistake book and spaced repetition (entries
   from lessonEntryFor(), filed under the level's word set). Content texts come as
   { zh, 'zh-Hans', en } (gText in js/grammar.js); Chinese passages are translated
   into English only (readingTx). A Chinese sentence comes one segment per
   character, [char, pinyin, glossary index, zhuyin, simplified], shown in the
   script (reading_zh_script) and with the readings (reading_zh_rd) the visitor
   picks. Progress: localStorage
   reading_progress = { "<set>:<passage>": { best, of, at, secs } } (synced). */

const READING_PASS = 2 / 3;
const READING_TTS = { ja: 'ja-JP', ko: 'ko-KR', en: 'en-US', zh: 'zh-TW', fr: 'fr-FR', ru: 'ru-RU', de: 'de-DE', es: 'es-ES' };
// the word set a level's glossary words are filed under (mistake book, spaced repetition)
const READING_WORD_SET = { ja_n5: 'jlpt_n5', ja_n4: 'jlpt_n4', ko_topik1: 'topik_1', zh_hsk12: 'hsk_1' };
const READING_ZH_RD = ['pinyin', 'zhuyin', 'both', 'off'];   // readings above Chinese characters
const READING_FONTS = [0.95, 1.1, 1.25, 1.45];     // rem, the reader's A− / A+
// a passage's length is counted in characters here, in words elsewhere (tools/build_reading.py)
const READING_CHAR_LANGS = ['ja', 'ko', 'zh'];
const READING_TOPIC_EMOJI = { greetings: '👋', food: '🍜', home: '🏠', shopping: '🛒', transport: '🚃',
    travel: '✈️', weather: '🌤️', school: '🏫', work: '💼', health: '🩺' };

let readingIndex = null;          // [{ id, lang, level, count }]
const readingSets = {};           // id -> loaded set
let readingSetId = '';
let readingView = 'list';         // 'list' | 'read' | 'quiz' | 'review'
let readingNo = 0;                // passage index in the set
let readingQuiz = null;           // { picks: [mcq…, tf…], done }
let readingReview = null;         // { items: [{ entry, word, options, answer }], i, picked, right }
let readingTimer = { start: 0, secs: 0, tick: null };

function readingProgress() {
    try { return JSON.parse(localStorage.getItem('reading_progress')) || {}; } catch { return {}; }
}

function readingRead(setId, pid) {
    const p = readingProgress()[setId + ':' + pid];
    return !!p && p.of > 0 && p.best / p.of >= READING_PASS;
}

function readingPref(key, fallback) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch { return fallback; }
}

function readingSetPref(key, value) {
    try { localStorage.setItem(key, value); } catch {}
}

async function readingLoad() {
    if (!readingIndex) {
        try { readingIndex = await fetch('data/reading/index.json').then(r => r.json()); }
        catch { readingIndex = null; return false; }
    }
    if (!readingSetId && readingIndex.length) {
        const saved = readingPref('reading_set', '');
        readingSetId = readingIndex.some(s => s.id === saved) ? saved : readingIndex[0].id;
    }
    if (readingSetId && !readingSets[readingSetId]) {
        try { readingSets[readingSetId] = await fetch('data/reading/' + readingSetId + '.json').then(r => r.json()); }
        catch { return false; }
    }
    return true;
}

/* switchPage() and refreshDynamicContent() call this. */
async function renderReading() {
    const box = document.getElementById('reading-card');
    if (!box) return;
    if (!readingSets[readingSetId]) box.innerHTML = `<p class="grammar-loading">${escHtml(t('grammar_loading'))}</p>`;
    if (!await readingLoad()) {
        box.innerHTML = `<p class="grammar-loading">${escHtml(t('grammar_error'))}</p>`;
        return;
    }
    const set = readingSets[readingSetId];
    box.dataset.zhrd = readingZhRd();           // which Chinese readings show (css/reading.css)
    // the reader uses two columns on wide screens (css/reading.css, css/base.css)
    document.body.classList.toggle('reading-wide', readingView === 'read');
    if (typeof railPlace === 'function') railPlace();
    if (readingView === 'read') box.innerHTML = readingReaderHtml(set);
    else if (readingView === 'quiz') box.innerHTML = readingQuizHtml(set);
    else if (readingView === 'review') box.innerHTML = readingReviewHtml(set);
    else box.innerHTML = readingListHtml(set);
    readingClosePop();
}

function readingGo(view, no) {
    if (readingView === 'read' && view !== 'read') readingStopTimer();
    readingView = view;
    if (typeof no === 'number') readingNo = no;
    if (view === 'read') readingStartTimer();
    readingAllRun++;                                   // ends a read-all chain
    if (typeof stopSpeech === 'function') stopSpeech();  // a recording or the browser voice
    renderReading();
    window.scrollTo({ top: 0 });
}

function readingPickSet(id) {
    readingSetId = id;
    readingNo = 0;
    readingSetPref('reading_set', id);
    readingGo('list');
}

/* ----- segments -> HTML ----- */

/* A sentence's segments as HTML: furigana as <ruby>, glossary words underlined
   (consecutive segments of one word share one underline). */
function readingSegsHtml(segs, withGloss) {
    if (segs.length && segs[0].length > 3) return readingZhHtml(segs, withGloss);
    let html = '', open = null;
    for (const [text, ruby, g] of segs) {
        const gi = withGloss && g !== null && g !== undefined ? g : null;
        if (open !== null && gi !== open) { html += '</span>'; open = null; }
        if (gi !== null && open === null) {
            html += `<span class="rd-w" role="button" tabindex="0" onclick="readingWord(event, ${gi})" onkeydown="if(event.key==='Enter')readingWord(event, ${gi})">`;
            open = gi;
        }
        html += ruby ? `<ruby>${escHtml(text)}<rt>${escHtml(ruby)}</rt></ruby>` : escHtml(text);
    }
    if (open !== null) html += '</span>';
    return html;
}

/* Chinese segments [char, pinyin, glossary, zhuyin, simplified]: each character a
   column, pinyin above and zhuyin below (empty rows keep the lines even). Punctuation
   rides in its neighbour's column — after the character before it, or, for an
   opening bracket, before the one after it — so no line starts with 。 or ends with 「. */
const READING_ZH_OPEN = /[「『（(“‘《〈【]+$/;   // opening brackets at the end of a run
function readingZhHtml(segs, withGloss) {
    const simp = readingZhScript() === 'simp';
    const units = [];
    let lead = '';
    for (const seg of segs) {
        const text = simp ? seg[4] : seg[0];
        if (seg[1]) {
            units.push({ pre: lead, ch: text, py: seg[1], zy: seg[3] || '', post: '', g: seg[2] });
            lead = '';
            continue;
        }
        // punctuation (or anything else without a reading)
        const rest = text;
        const m = rest.match(READING_ZH_OPEN);
        const tail = m ? rest.slice(0, rest.length - m[0].length) : rest;
        if (m && m[0].length === rest.length) { lead += rest; continue; }
        if (units.length && !lead) units[units.length - 1].post += tail;
        else units.push({ pre: lead, ch: tail, py: '', zy: '', post: '', g: null });
        lead = m ? m[0] : '';
    }
    if (lead) units.push({ pre: lead, ch: '', py: '', zy: '', post: '', g: null });
    let html = '', open = null;
    for (const u of units) {
        const gi = withGloss && u.g !== null && u.g !== undefined ? u.g : null;
        if (open !== null && gi !== open) { html += '</span>'; open = null; }
        if (gi !== null && open === null) {
            html += `<span class="rd-w" role="button" tabindex="0" onclick="readingWord(event, ${gi})" onkeydown="if(event.key==='Enter')readingWord(event, ${gi})">`;
            open = gi;
        }
        html += `<span class="zc">${u.pre ? `<span class="pu pre">${escHtml(u.pre)}</span>` : ''}<span class="py">${escHtml(u.py)}</span><span class="ch">${escHtml(u.ch)}</span><span class="zy">${escHtml(u.zy)}</span>${u.post ? `<span class="pu">${escHtml(u.post)}</span>` : ''}</span>`;
    }
    if (open !== null) html += '</span>';
    return html;
}

/* sentences follow each other with a space, except in Japanese and Chinese */
function readingSep(set) {
    return set.lang === 'ja' || set.lang === 'zh' ? '' : ' ';
}

function readingPlain(segs) {
    const simp = readingZhScript() === 'simp';
    return segs.map(s => simp && s.length > 4 ? s[4] : s[0]).join('');
}

/* Chinese: Traditional or Simplified characters, and which readings to show */
function readingZhScript() {
    const v = readingPref('reading_zh_script', '');
    return v === 'trad' || v === 'simp' ? v : (siteLang === 'zh-Hans' ? 'simp' : 'trad');
}

function readingZhRd() {
    const v = readingPref('reading_zh_rd', 'pinyin');
    return READING_ZH_RD.includes(v) ? v : 'pinyin';
}

function readingSetZh(key, v) {
    readingSetPref(key, v);
    renderReading();
}

/* a translation: Chinese passages only have English ones */
function readingTx(set, o) {
    return set.lang === 'zh' ? (o.en || '') : gText(o);
}

/* a glossary word as shown: Simplified when picked */
function readingGw(set, g) {
    return set.lang === 'zh' && readingZhScript() === 'simp' && g.simp ? g.simp : g.w;
}

/* ----- list ----- */

function readingListHtml(set) {
    const langs = [...new Set(readingIndex.map(s => s.lang))];
    const levels = readingIndex.filter(s => s.lang === set.lang);
    const read = set.passages.filter(p => readingRead(set.id, p.id)).length;
    const pct = Math.round(read / set.passages.length * 100);
    const prog = readingProgress();
    return `<h3>${escHtml(t('reading_title'))}</h3>
        <p class="grammar-intro">${escHtml(t('reading_intro'))}</p>
        <div class="grammar-chips" role="group">
            ${langs.map(l => `<button type="button" class="mode-btn grammar-chip${l === set.lang ? ' mode-btn-active' : ''}" onclick="readingPickSet('${readingIndex.find(s => s.lang === l).id}')">${escHtml(t('dict_lang_' + l))}</button>`).join('')}
            ${levels.map(s => `<button type="button" class="mode-btn grammar-chip${s.id === set.id ? ' mode-btn-active' : ''}" onclick="readingPickSet('${s.id}')">${escHtml(s.level)}</button>`).join('')}
        </div>
        <p class="grammar-soon">${escHtml(t('reading_soon'))}</p>
        <div class="grammar-progress">
            <span>${escHtml(t('reading_read_n', { n: read, m: set.passages.length }))}</span>
            <span class="grammar-bar" aria-hidden="true"><i style="width:${pct}%"></i></span>
        </div>
        <ol class="grammar-list">
            ${set.passages.map((p, i) => {
                const done = readingRead(set.id, p.id);
                const best = prog[set.id + ':' + p.id];
                const qs = p.mcq.length + p.tf.length;
                const topic = p.topic && READING_TOPIC_EMOJI[p.topic] ? `<span class="rd-topic">${READING_TOPIC_EMOJI[p.topic]} ${escHtml(t('topic_' + p.topic))}</span>` : '';
                return `<li><button type="button" class="grammar-item${done ? ' learned' : ''}" onclick="readingGo('read', ${i})">
                    <span class="grammar-num">${i + 1}</span>
                    <span class="grammar-item-text">
                        <span class="grammar-pattern" lang="${set.lang}">${readingPlain(p.title.t)}</span>
                        <span class="grammar-item-title">${topic}${escHtml(readingTx(set, p.title))}
                            <span class="rd-meta">${escHtml(t(READING_CHAR_LANGS.includes(set.lang) ? 'reading_meta' : 'reading_meta_words', { n: p.length, q: qs }))}</span></span>
                    </span>
                    <span class="grammar-state">${best ? (done ? '✓ ' : '') + best.best + '/' + best.of : '›'}</span>
                </button></li>`;
            }).join('')}
        </ol>
        <p class="grammar-credit">${escHtml(t('reading_credit'))}</p>`;
}

/* ----- reader ----- */

function readingFuri() { return readingPref('reading_furi', '1') === '1'; }
function readingTr() { return readingPref('reading_tr', '0') === '1'; }
function readingFont() {
    const i = parseInt(readingPref('reading_font', '2'), 10);
    return Number.isInteger(i) && i >= 0 && i < READING_FONTS.length ? i : 2;
}

function readingToggle(key) {
    const on = readingPref(key, key === 'reading_furi' ? '1' : '0') === '1';
    readingSetPref(key, on ? '0' : '1');
    renderReading();
}

function readingFontStep(d) {
    readingSetPref('reading_font', String(Math.max(0, Math.min(READING_FONTS.length - 1, readingFont() + d))));
    renderReading();
}

/* the reader's Chinese switches: 繁 / 简 and pinyin / zhuyin / both / none */
function readingZhTools() {
    const sc = readingZhScript(), rd = readingZhRd();
    const btn = (key, v, label, on) => `<button type="button" class="mode-btn${on ? ' mode-btn-active' : ''}" aria-pressed="${on}" onclick="readingSetZh('${key}', '${v}')">${escHtml(label)}</button>`;
    return `<span class="rd-seg" role="group">${btn('reading_zh_script', 'trad', t('reading_trad'), sc === 'trad')}${btn('reading_zh_script', 'simp', t('reading_simp'), sc === 'simp')}</span>
        <span class="rd-seg" role="group" aria-label="${escHtml(t('grammar_rd_label'))}">${READING_ZH_RD.map(v => btn('reading_zh_rd', v, t(v === 'off' ? 'reading_rd_off' : 'grammar_rd_' + v), rd === v)).join('')}</span>`;
}

function readingReaderHtml(set) {
    const p = set.passages[readingNo];
    const n = set.passages.length;
    const furi = readingFuri(), tr = readingTr();
    let si = 0;
    const paras = p.paragraphs.map(para => `<div class="rd-para">
            <p lang="${set.lang}">${para.s.map(s => `<span class="rd-s" data-i="${si++}" onclick="readingSay(this)">${readingSegsHtml(s.t, true)}</span>`).join(readingSep(set))}</p>
            ${tr ? `<p class="rd-tr">${escHtml(readingTx(set, para))}</p>` : ''}
        </div>`).join('');
    return `<div class="grammar-top">
            <button type="button" class="btn back-btn grammar-back" onclick="readingGo('list')">${escHtml(t('reading_back_list'))}</button>
            <span class="grammar-count">${escHtml(t('reading_no', { n: readingNo + 1, m: n }))}</span>
        </div>
        <div class="rd-head">
            <div class="rd-title" lang="${set.lang}">${readingSegsHtml(p.title.t, false)}</div>
            <div class="rd-sub">${escHtml(readingTx(set, p.title))}${readingRead(set.id, p.id) ? ` <span class="grammar-badge">✓ ${escHtml(t('reading_done_badge'))}</span>` : ''}</div>
        </div>
        <div class="rd-tools" role="group">
            ${set.lang === 'ja' ? `<button type="button" class="mode-btn${furi ? ' mode-btn-active' : ''}" aria-pressed="${furi}" onclick="readingToggle('reading_furi')">${escHtml(t('reading_furi'))}</button>` : ''}
            ${set.lang === 'zh' ? readingZhTools() : ''}
            <button type="button" class="mode-btn${tr ? ' mode-btn-active' : ''}" aria-pressed="${tr}" onclick="readingToggle('reading_tr')">${escHtml(t('reading_tr'))}</button>
            <button type="button" class="mode-btn" onclick="readingSayAll()">🔊 ${escHtml(t('reading_all'))}</button>
            <span class="rd-font" role="group" aria-label="${escHtml(t('reading_font'))}">
                <button type="button" class="mode-btn" onclick="readingFontStep(-1)"${readingFont() === 0 ? ' disabled' : ''} aria-label="${escHtml(t('reading_font'))} −">A−</button>
                <button type="button" class="mode-btn" onclick="readingFontStep(1)"${readingFont() === READING_FONTS.length - 1 ? ' disabled' : ''} aria-label="${escHtml(t('reading_font'))} +">A+</button>
            </span>
            <span class="rd-timer" id="rd-timer" title="${escHtml(t('reading_timer'))}">⏱ ${readingClock(readingElapsed())}</span>
        </div>
        <div class="rd-cols">
            <div class="rd-col-main">
                <div class="rd-text${furi ? '' : ' no-furi'}" style="font-size:${READING_FONTS[readingFont()]}rem">${paras}</div>
                <p class="rd-help">${escHtml(t('reading_help'))}</p>
            </div>
            <div class="rd-col-side">
                <div class="rd-gloss">
                    <h4 class="grammar-sub">📘 ${escHtml(t('reading_glossary'))}</h4>
                    <ul>${p.glossary.map((g, i) => `<li><button type="button" class="rd-gloss-item" onclick="readingWord(event, ${i})"><b lang="${set.lang}">${escHtml(readingGw(set, g))}</b> <span>${g.r && g.r !== g.w ? escHtml(g.r) + '・' : ''}${escHtml(readingTx(set, g))}</span></button></li>`).join('')}</ul>
                </div>
                <button type="button" class="btn next-btn grammar-start" onclick="readingStartQuiz()">${escHtml(t('reading_start_quiz', { n: p.mcq.length + p.tf.length }))}</button>
            </div>
        </div>
        <div class="grammar-nav">
            <button type="button" class="btn back-btn" onclick="readingGo('read', ${readingNo - 1})"${readingNo === 0 ? ' disabled' : ''}>${escHtml(t('reading_prev'))}</button>
            <button type="button" class="btn back-btn" onclick="readingGo('read', ${readingNo + 1})"${readingNo >= n - 1 ? ' disabled' : ''}>${escHtml(t('reading_next'))}</button>
        </div>`;
}

function readingSentences() {
    const p = readingSets[readingSetId].passages[readingNo];
    return p.paragraphs.flatMap(para => para.s);
}

/* recordings are keyed "plain|kana" (tools/build_audio.py) and spoken from the kana */
function readingSpeak(s, done) {
    const set = readingSets[readingSetId];
    speakText(s.plain, READING_TTS[set.lang] || set.lang, Object.assign(s.kana && s.kana !== s.plain ? { reading: s.kana } : {}, done ? { onend: done } : {}));
}

function readingMark(i) {
    document.querySelectorAll('#reading-card .rd-s').forEach(el => el.classList.toggle('playing', +el.dataset.i === i));
}

function readingSay(el) {
    const i = +el.dataset.i;
    const s = readingSentences()[i];
    if (!s) return;
    readingAllRun = 0;
    readingMark(i);
    readingSpeak(s, () => readingMark(-1));
}

let readingAllRun = 0;   // bumps on every new playback, so an older chain stops
function readingSayAll() {
    const list = readingSentences();
    const run = ++readingAllRun;
    const step = i => {
        if (run !== readingAllRun || readingView !== 'read') return;
        if (i >= list.length) { readingMark(-1); return; }
        readingMark(i);
        readingSpeak(list[i], () => step(i + 1));
    };
    step(0);
}

/* ----- word card ----- */

function readingWord(ev, gi) {
    if (ev) ev.stopPropagation();
    const set = readingSets[readingSetId];
    const g = set.passages[readingNo].glossary[gi];
    if (!g) return;
    let pop = document.getElementById('rd-pop');
    if (!pop) {
        pop = document.createElement('div');
        pop.id = 'rd-pop';
        pop.className = 'rd-pop';
        pop.setAttribute('role', 'dialog');
        document.body.appendChild(pop);
    }
    const zh = set.lang === 'zh';
    // Chinese: both scripts when they differ, pinyin and zhuyin, the English meaning
    const head = zh
        ? `<b lang="zh-TW">${escHtml(g.w)}</b>${g.simp && g.simp !== g.w ? `<span class="rd-pop-r" lang="zh-CN">${escHtml(g.simp)}</span>` : ''}<span class="rd-pop-r">${escHtml(g.r)}</span><span class="rd-pop-r" lang="zh-TW">${escHtml(g.zy || '')}</span>`
        : `<b lang="${set.lang}">${escHtml(g.w)}</b>${g.r && g.r !== g.w ? `<span class="rd-pop-r" lang="${set.lang}">${escHtml(g.r)}</span>` : ''}`;
    const meaning = zh ? escHtml(g.en)
        : escHtml(gText(g)) + (siteLang === 'zh' || siteLang === 'zh-Hans' ? `<span class="rd-pop-en">${escHtml(g.en)}</span>` : '');
    pop.innerHTML = `<div class="rd-pop-head">${head}</div>
        <div class="rd-pop-m">${meaning}</div>
        <div class="rd-pop-acts">
            <button type="button" class="btn back-btn" onclick="readingSayWord(${gi})" aria-label="🔊">🔊</button>
            <button type="button" class="btn back-btn" onclick="readingAddReview(${gi})">＋ ${escHtml(t('reading_add_review'))}</button>
        </div>`;
    const r = (ev && ev.currentTarget && ev.currentTarget.getBoundingClientRect) ? ev.currentTarget.getBoundingClientRect() : { left: 20, bottom: 120 };
    pop.style.display = 'block';
    const w = Math.min(280, window.innerWidth - 24);
    pop.style.width = w + 'px';
    pop.style.left = Math.min(window.innerWidth - w - 12, Math.max(12, r.left)) + 'px';
    const below = r.bottom + 8;
    pop.style.top = (below + 170 > window.innerHeight ? Math.max(12, r.top - 178) : below) + 'px';
}

function readingClosePop() {
    const pop = document.getElementById('rd-pop');
    if (pop) pop.style.display = 'none';
}

document.addEventListener('click', e => {
    if (!e.target.closest('#rd-pop') && !e.target.closest('.rd-w') && !e.target.closest('.rd-gloss-item')) readingClosePop();
});
window.addEventListener('scroll', readingClosePop, { passive: true });

function readingSayWord(gi) {
    const set = readingSets[readingSetId];
    const g = set.passages[readingNo].glossary[gi];
    // a word with kanji is recorded as "word|kana" (the word lists' recordings)
    speakText(g.w, READING_TTS[set.lang] || set.lang, set.lang === 'ja' && g.r && g.r !== g.w ? { reading: g.r } : undefined);
}

/* a glossary word as a quiz entry, filed under the level's word set */
function readingEntry(set, g) {
    const setId = READING_WORD_SET[set.id] || set.id;
    if (typeof lessonEntryFor !== 'function') return null;
    if (set.lang === 'zh') {
        // like an HSK word: the English meaning, pinyin as the hint
        return lessonEntryFor(setId, { word: g.w, trad: g.w, simp: g.simp || g.w, roman: g.r, meaning: g.en, kana: '', english: '' });
    }
    return lessonEntryFor(setId, { word: g.w, kana: g.r && g.r !== g.w ? g.r : '', meaning: g.zh, english: g.en });
}

function readingAddReview(gi) {
    const set = readingSets[readingSetId];
    const entry = readingEntry(set, set.passages[readingNo].glossary[gi]);
    // a fresh spaced-repetition card (box 1, due soon), like a word just missed
    if (entry && typeof gradeSrsQuizCard === 'function') gradeSrsQuizCard(entry, false);
    if (typeof showShareToast === 'function') showShareToast(t('reading_added'));
    readingClosePop();
}

/* ----- timer ----- */

function readingElapsed() {
    return readingTimer.secs + (readingTimer.start ? Math.floor((Date.now() - readingTimer.start) / 1000) : 0);
}

function readingClock(s) {
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function readingStartTimer() {
    readingStopTimer();
    readingTimer = { start: Date.now(), secs: 0, tick: null };
    readingTimer.tick = setInterval(() => {
        const el = document.getElementById('rd-timer');
        if (!el || readingView !== 'read') return;
        el.textContent = '⏱ ' + readingClock(readingElapsed());
    }, 1000);
}

function readingStopTimer() {
    if (readingTimer.tick) clearInterval(readingTimer.tick);
    readingTimer.secs = readingElapsed();
    readingTimer.start = 0;
    readingTimer.tick = null;
}

/* ----- quiz: multiple choice, then ○ / × on one page ----- */

function readingStartQuiz() {
    readingStopTimer();
    const p = readingSets[readingSetId].passages[readingNo];
    readingQuiz = { picks: new Array(p.mcq.length + p.tf.length).fill(-1), done: false };
    readingGo('quiz');
}

function readingQuizHtml(set) {
    const p = set.passages[readingNo];
    const z = readingQuiz;
    const nm = p.mcq.length;
    const why = q => `<p class="rd-why">${escHtml(gText(q))}</p>`;
    const mcq = p.mcq.map((q, k) => {
        const picked = z.picks[k];
        return `<div class="rd-q${picked >= 0 ? ' done' : ''}">
            <h4 lang="${set.lang}"><span class="rd-qn">${k + 1}.</span> ${readingSegsHtml(q.q, false)}</h4>
            <div class="rd-opts">${q.options.map((o, i) => {
                let cls = '';
                if (picked >= 0 && i === q.answer) cls = ' correct-choice';
                else if (picked >= 0 && i === picked) cls = ' wrong-choice';
                return `<button type="button" class="btn option-btn${cls}" lang="${set.lang}" onclick="readingAnswer(${k}, ${i})"${picked >= 0 ? ' disabled' : ''}>${readingSegsHtml(o, false)}</button>`;
            }).join('')}</div>
            ${picked >= 0 ? why(q) : ''}
        </div>`;
    }).join('');
    const tf = p.tf.map((q, k) => {
        const idx = nm + k;
        const picked = z.picks[idx];
        const btn = (val, label) => {
            const i = val ? 1 : 0;
            let cls = '';
            if (picked >= 0 && val === q.answer) cls = ' correct-choice';
            else if (picked === i) cls = ' wrong-choice';
            return `<button type="button" class="btn option-btn rd-tf-btn${cls}" onclick="readingAnswer(${idx}, ${i})"${picked >= 0 ? ' disabled' : ''} aria-label="${escHtml(t(val ? 'reading_true' : 'reading_false'))}">${label}</button>`;
        };
        return `<div class="rd-q${picked >= 0 ? ' done' : ''}">
            <h4 lang="${set.lang}"><span class="rd-qn">${nm + k + 1}.</span> ${readingSegsHtml(q.s, false)}</h4>
            <div class="rd-tf">${btn(true, '○')}${btn(false, '×')}</div>
            ${picked >= 0 ? why(q) : ''}
        </div>`;
    }).join('');
    const answered = z.picks.filter(x => x >= 0).length;
    const total = z.picks.length;
    return `<div class="grammar-top">
            <button type="button" class="btn back-btn grammar-back" onclick="readingGo('read')">${escHtml(t('reading_back_text'))}</button>
            <span class="grammar-count">${escHtml(t('reading_answered', { n: answered, m: total }))}</span>
        </div>
        <div class="rd-head">
            <div class="rd-title rd-title-sm" lang="${set.lang}">${readingSegsHtml(p.title.t, false)}</div>
            <div class="rd-sub">${escHtml(t('reading_quiz_hint'))}</div>
        </div>
        <details class="rd-peek"><summary>📄 ${escHtml(t('reading_peek'))}</summary>
            <div class="rd-text${readingFuri() ? '' : ' no-furi'}" lang="${set.lang}">${p.paragraphs.map(para => `<p>${para.s.map(s => readingSegsHtml(s.t, false)).join(readingSep(set))}</p>`).join('')}</div>
        </details>
        <h4 class="grammar-sub rd-part">${escHtml(t('reading_part_mcq'))}</h4>
        <div class="rd-qs ${readingFuri() ? '' : 'no-furi'}">${mcq}</div>
        <h4 class="grammar-sub rd-part">${escHtml(t('reading_part_tf'))}</h4>
        <div class="rd-qs ${readingFuri() ? '' : 'no-furi'}">${tf}</div>
        ${z.done ? readingResultHtml(set) : ''}`;
}

function readingAnswer(k, i) {
    const z = readingQuiz;
    if (!z || z.picks[k] >= 0) return;
    z.picks[k] = i;
    const set = readingSets[readingSetId];
    const p = set.passages[readingNo];
    const right = readingIsRight(p, k);
    if (typeof logDailyActivity === 'function') logDailyActivity();
    if (!right && typeof railReact === 'function') railReact('wrong');
    if (z.picks.every(x => x >= 0)) readingFinish();
    const y = window.scrollY;
    renderReading();
    window.scrollTo({ top: y });
    if (z.done) {
        const res = document.querySelector('#reading-card .rd-result');
        if (res) res.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function readingIsRight(p, k) {
    const z = readingQuiz;
    const nm = p.mcq.length;
    return k < nm ? z.picks[k] === p.mcq[k].answer : (z.picks[k] === 1) === p.tf[k - nm].answer;
}

function readingScore(p) {
    return readingQuiz.picks.reduce((n, _, k) => n + (readingIsRight(p, k) ? 1 : 0), 0);
}

function readingFinish() {
    const z = readingQuiz;
    z.done = true;
    const set = readingSets[readingSetId];
    const p = set.passages[readingNo];
    const right = readingScore(p);
    const key = set.id + ':' + p.id;
    const prog = readingProgress();
    const old = prog[key];
    if (!old || right / z.picks.length >= old.best / (old.of || 1)) {
        prog[key] = { best: right, of: z.picks.length, at: Date.now(), secs: readingTimer.secs };
    }
    if (typeof storeSet === 'function') storeSet('reading_progress', JSON.stringify(prog));
    else readingSetPref('reading_progress', JSON.stringify(prog));
    if (typeof railReact === 'function') railReact('result', Math.round(right / z.picks.length * 100));
}

function readingResultHtml(set) {
    const p = set.passages[readingNo];
    const total = readingQuiz.picks.length;
    const right = readingScore(p);
    const pass = right / total >= READING_PASS;
    const last = readingNo >= set.passages.length - 1;
    const secs = readingTimer.secs;
    const speed = secs >= 5 ? Math.round(p.length * 60 / secs) : 0;
    setTimeout(() => {
        const m = document.querySelector('#reading-card .rd-result .grammar-result-mascot');
        if (pass && m && typeof mascotHop === 'function') mascotHop(m);
    }, 300);
    return `<div class="rd-result">
            <div class="grammar-result-mascot">${typeof mascotHtml === 'function' ? mascotHtml('bust') : ''}</div>
            <p class="grammar-score">${escHtml(t('grammar_result', { n: right, m: total }))}</p>
            <p class="grammar-verdict ${pass ? 'ok' : 'no'}">${escHtml(t(pass ? 'reading_pass' : 'reading_fail'))}</p>
            ${secs >= 5 ? `<p class="rd-speed">⏱ ${escHtml(t('reading_time', { t: readingClock(secs) }))}${speed ? '　·　' + escHtml(t(READING_CHAR_LANGS.includes(set.lang) ? 'reading_speed' : 'reading_speed_words', { n: speed })) : ''}</p>` : ''}
            <div class="grammar-result-btns">
                <button type="button" class="btn next-btn" onclick="readingStartReview()">📘 ${escHtml(t('reading_review_btn', { n: p.glossary.length }))}</button>
                ${!last ? `<button type="button" class="btn ${pass ? 'next-btn' : 'back-btn'}" onclick="readingGo('read', ${readingNo + 1})">${escHtml(t('reading_next_passage'))}</button>` : ''}
                <button type="button" class="btn back-btn" onclick="${pass ? "readingGo('list')" : "readingGo('read')"}">${escHtml(t(pass ? 'reading_back_list' : 'reading_reread'))}</button>
            </div>
        </div>`;
}

/* ----- glossary review: each word once, four options; graded into the mistake
   book and spaced repetition like any other quiz answer ----- */

function readingStartReview() {
    const set = readingSets[readingSetId];
    const p = set.passages[readingNo];
    // wrong options: the other answers of the same kind across the whole level
    const pool = {};
    set.passages.forEach(ps => ps.glossary.forEach(g => {
        const e = readingEntry(set, g);
        if (e) (pool[e.group] = pool[e.group] || new Set()).add(e.answer);
    }));
    const items = grammarShuffle(p.glossary).map(g => {
        const entry = readingEntry(set, g);
        if (!entry) return null;
        const others = grammarShuffle([...(pool[entry.group] || [])].filter(a => a !== entry.answer)).slice(0, 3);
        const options = grammarShuffle([entry.answer, ...others]);
        return { entry, g, options, answer: options.indexOf(entry.answer) };
    }).filter(Boolean);
    readingReview = { items, i: 0, picked: -1, right: 0 };
    readingGo('review');
}

function readingReviewHtml(set) {
    const z = readingReview;
    if (z.i >= z.items.length) {
        return `<div class="rd-result">
                <div class="grammar-result-mascot">${typeof mascotHtml === 'function' ? mascotHtml('bust') : ''}</div>
                <p class="grammar-score">${escHtml(t('grammar_result', { n: z.right, m: z.items.length }))}</p>
                <p class="rd-help">${escHtml(t('reading_review_done'))}</p>
                <div class="grammar-result-btns">
                    ${readingNo < set.passages.length - 1 ? `<button type="button" class="btn next-btn" onclick="readingGo('read', ${readingNo + 1})">${escHtml(t('reading_next_passage'))}</button>` : ''}
                    <button type="button" class="btn back-btn" onclick="readingGo('list')">${escHtml(t('reading_back_list'))}</button>
                </div>
            </div>`;
    }
    const it = z.items[z.i];
    const answered = z.picked >= 0;
    const askReading = it.entry.group === 'reading';
    return `<div class="grammar-top">
            <button type="button" class="btn back-btn grammar-back" onclick="readingGo('read')">${escHtml(t('reading_back_text'))}</button>
            <span class="grammar-count">${escHtml(t('grammar_q_n', { n: z.i + 1, m: z.items.length }))}</span>
        </div>
        <div class="grammar-q">
            <div class="grammar-q-pattern">📘 ${escHtml(t('reading_review_title'))}</div>
            <div class="rd-review-word" lang="${set.lang}">${escHtml(readingGw(set, it.g))}</div>
            ${set.lang === 'zh' && answered ? `<div class="grammar-q-hint" lang="zh-TW">${escHtml(it.g.r)}　${escHtml(it.g.zy || '')}</div>` : ''}
            <div class="grammar-q-hint">${escHtml(t(askReading ? 'reading_q_reading' : 'reading_q_meaning'))}</div>
        </div>
        <div class="grammar-options">
            ${it.options.map((o, i) => {
                let cls = '';
                if (answered && i === it.answer) cls = ' correct-choice';
                else if (answered && i === z.picked) cls = ' wrong-choice';
                return `<button type="button" class="btn option-btn${cls}"${askReading ? ` lang="${set.lang}"` : ''} onclick="readingReviewAnswer(${i})"${answered ? ' disabled' : ''}>${escHtml(o)}</button>`;
            }).join('')}
        </div>
        ${answered ? `<p class="grammar-feedback ${z.picked === it.answer ? 'ok' : 'no'}">${escHtml(t(z.picked === it.answer ? 'correct' : 'grammar_wrong', { a: it.options[it.answer] }))}</p>
        <button type="button" class="btn next-btn grammar-start" onclick="readingReviewNext()">${escHtml(t(z.i + 1 < z.items.length ? 'grammar_next_q' : 'grammar_see_result'))}</button>` : ''}`;
}

function readingReviewAnswer(i) {
    const z = readingReview;
    if (!z || z.picked >= 0) return;
    z.picked = i;
    const it = z.items[z.i];
    const good = i === it.answer;
    if (good) z.right++;
    if (typeof gradeSrsQuizCard === 'function') gradeSrsQuizCard(it.entry, good);
    if (good) { if (typeof noteMistakeCorrect === 'function') noteMistakeCorrect(it.entry.id); }
    else if (typeof addMistakeEntry === 'function') addMistakeEntry(it.entry);
    if (typeof logDailyActivity === 'function') logDailyActivity();
    // a right answer: hear the word once more
    if (good) readingSayWord(readingSets[readingSetId].passages[readingNo].glossary.indexOf(it.g));
    renderReading();
}

function readingReviewNext() {
    readingReview.i++;
    readingReview.picked = -1;
    renderReading();
}
