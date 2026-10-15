/* ===================== 文法 Grammar (#page-grammar) =====================
   Lessons built by tools/build_grammar.py from the hand-written tools/grammar/<id>.json
   (data/grammar/index.json lists them; Japanese N5 first, more levels / languages later).
   A point = pattern, meaning, how it attaches (form), explanation, notes (注意事項),
   common mistakes (✗ wrong / ✓ right / why), examples with audio, then a few
   fill-in questions; getting GRAMMAR_PASS of them right marks it
   learned. Content texts come as { zh, 'zh-Hans', en }: other UI languages read
   the English. Progress: localStorage grammar_progress = { "<set>:<point>": { best, of, at } }
   (synced, js/account.js). Answers count toward the daily goal (logDailyActivity). */

const GRAMMAR_PASS = 2 / 3;
const GRAMMAR_LANG_TTS = { ja: 'ja-JP', ko: 'ko-KR', en: 'en-US', zh: 'zh-TW', fr: 'fr-FR', ru: 'ru-RU', de: 'de-DE', es: 'es-ES' };

let grammarIndex = null;        // [{ id, lang, level, count }]
const grammarSets = {};         // id -> loaded set
let grammarSetId = '';
let grammarView = 'list';       // 'list' | 'point' | 'quiz' | 'result'
let grammarPoint = 0;
let grammarQuiz = null;         // { items: [{ q, options (shuffled), answer }], i, right, picked }
const GRAMMAR_PER_PAGE = 5;     // points per page of the list
let grammarPage = 0;

function gText(obj) {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    if (siteLang === 'zh') return obj.zh || obj.en || '';
    if (siteLang === 'zh-Hans') return obj['zh-Hans'] || obj.zh || obj.en || '';
    // ja ko ru fr es de: machine-translated by tools/content_i18n.py (never into the
    // lesson's own language, which reads the English)
    return obj[siteLang] || obj.en || obj.zh || '';
}

/* Translations of examples and quiz hints: for the Chinese lessons a Chinese
   interface would just repeat the sentence (and give the answer away), so it
   shows the English instead. */
function gHint(set, obj) {
    if (set && set.lang === 'zh' && (siteLang === 'zh' || siteLang === 'zh-Hans')) return obj.en || gText(obj);
    return gText(obj);
}

/* ----- the 學習 pages' language + level picker (owner's pick, 2026-10-15) -----
   A language button opening a menu grouped by region (LANG_REGIONS in js/quiz.js;
   languages this page has nothing for yet are greyed out), and below it only the
   chosen language's levels, each with how much of it is done. Shared by the 文法,
   閱讀 and 聽解 lists: index = the page's index.json, pick = the name of the global
   function that opens a level, done(id) = items passed in that level. */
const LEARN_FLAGS = { ja: ['jp'], ko: ['kr'], zh: ['tw', 'cn'], en: ['gb'], fr: ['fr'], ru: ['ru'], es: ['es'], de: ['de'] };

function learnFlags(lang) {
    return (LEARN_FLAGS[lang] || []).map(f => `<span class="flag flag--${f}" aria-hidden="true"></span>`).join('');
}

function learnPickerHtml(index, curId, pick, done) {
    const cur = index.find(s => s.id === curId) || index[0];
    const levelsOf = l => index.filter(s => s.lang === l);
    const sep = ['zh', 'zh-Hans', 'ja'].includes(siteLang) ? '・' : ' · ';
    const menu = LANG_REGIONS.map(r => `<div class="learn-menu-group">${r.icon} ${escHtml(t('region_' + r.id))}</div>
        <div class="learn-menu-list">${r.langs.map(l => {
            const lv = levelsOf(l);
            if (!lv.length) {
                return `<button type="button" class="learn-menu-item soon" disabled>${learnFlags(l)}<span>${escHtml(t('dict_lang_' + l))}<small>${escHtml(t('learn_soon'))}</small></span></button>`;
            }
            return `<button type="button" class="learn-menu-item${l === cur.lang ? ' on' : ''}" onclick="${pick}('${lv[0].id}')">${learnFlags(l)}<span>${escHtml(t('dict_lang_' + l))}<small>${escHtml(lv.map(s => s.level).join(sep))}</small></span></button>`;
        }).join('')}</div>`).join('');
    const chips = levelsOf(cur.lang).map(s => {
        const n = done(s.id), m = s.count || 0;
        return `<button type="button" class="mode-btn grammar-chip learn-level${s.id === cur.id ? ' mode-btn-active' : ''}" aria-pressed="${s.id === cur.id}" onclick="${pick}('${s.id}')">
            ${escHtml(s.level)}<span class="learn-bar" aria-hidden="true"><i style="width:${m ? Math.round(n / m * 100) : 0}%"></i></span><small>${n}/${m}</small>
        </button>`;
    }).join('');
    return `<div class="learn-picker">
        <div class="learn-lang">
            <button type="button" class="learn-lang-btn" aria-haspopup="true" aria-label="${escHtml(t('learn_lang_menu'))}" onclick="learnMenuToggle(event, this)">${learnFlags(cur.lang)}${escHtml(t('dict_lang_' + cur.lang))}<span class="learn-caret" aria-hidden="true">▾</span></button>
            <div class="learn-menu" role="menu">${menu}</div>
        </div>
        <div class="learn-levels" role="group" aria-label="${escHtml(t('learn_levels'))}"><span class="learn-levels-label">${escHtml(t('learn_levels'))}</span>${chips}</div>
    </div>`;
}

function learnMenuToggle(e, btn) {
    e.stopPropagation();
    const box = btn.parentElement;
    const open = !box.classList.contains('open');
    learnMenuClose();
    box.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
}

function learnMenuClose() {
    document.querySelectorAll('.learn-lang.open').forEach(el => {
        el.classList.remove('open');
        const b = el.querySelector('.learn-lang-btn');
        if (b) b.setAttribute('aria-expanded', 'false');
    });
}

document.addEventListener('click', e => { if (!e.target.closest('.learn-menu')) learnMenuClose(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') learnMenuClose(); });

// items passed in a level, from a progress store keyed "<level>:<item>" ({best, of})
function learnDoneCount(prog, levelId, pass) {
    return Object.entries(prog).filter(([k, p]) => k.startsWith(levelId + ':') && p && p.of > 0 && p.best / p.of >= pass).length;
}

function grammarProgress() {
    try { return JSON.parse(localStorage.getItem('grammar_progress')) || {}; } catch { return {}; }
}

function grammarLearned(setId, pointId) {
    const p = grammarProgress()[setId + ':' + pointId];
    return !!p && p.of > 0 && p.best / p.of >= GRAMMAR_PASS;
}

async function grammarLoad() {
    if (!grammarIndex) {
        try {
            grammarIndex = await fetch('data/grammar/index.json').then(r => r.json());
        } catch {
            grammarIndex = null;
            return false;
        }
    }
    if (!grammarSetId && grammarIndex.length) {
        let saved = '';
        try { saved = localStorage.getItem('grammar_set') || ''; } catch {}
        grammarSetId = grammarIndex.some(s => s.id === saved) ? saved : grammarIndex[0].id;
    }
    if (grammarSetId && !grammarSets[grammarSetId]) {
        try {
            grammarSets[grammarSetId] = await fetch('data/grammar/' + grammarSetId + '.json').then(r => r.json());
        } catch {
            return false;
        }
    }
    return true;
}

/* switchPage() and refreshDynamicContent() call this. */
async function renderGrammar() {
    const box = document.getElementById('grammar-card');
    if (!box) return;
    if (!grammarSets[grammarSetId]) box.innerHTML = `<p class="grammar-loading">${escHtml(t('grammar_loading'))}</p>`;
    if (!await grammarLoad()) {
        box.innerHTML = `<p class="grammar-loading">${escHtml(t('grammar_error'))}</p>`;
        return;
    }
    const set = grammarSets[grammarSetId];
    // the point view uses two columns on wide screens (css/grammar.css, css/base.css)
    document.body.classList.toggle('grammar-wide', grammarView === 'point');
    if (typeof railPlace === 'function') railPlace();
    if (grammarView === 'point') box.innerHTML = grammarPointHtml(set);
    else if (grammarView === 'quiz') box.innerHTML = grammarQuizHtml(set);
    else if (grammarView === 'result') box.innerHTML = grammarResultHtml(set);
    else box.innerHTML = grammarListHtml(set);
}

function grammarGo(view, point) {
    grammarView = view;
    if (typeof point === 'number') grammarPoint = point;
    if (view === 'list') grammarPage = Math.floor(grammarPoint / GRAMMAR_PER_PAGE);
    renderGrammar();
    const page = document.getElementById('page-grammar');
    if (page) window.scrollTo({ top: 0 });
}

function grammarPickSet(id) {
    grammarSetId = id;
    grammarPoint = 0;
    try { localStorage.setItem('grammar_set', id); } catch {}
    grammarGo('list');
}

function grammarListHtml(set) {
    const done = set.points.filter(p => grammarLearned(set.id, p.id)).length;
    const pct = Math.round(done / set.points.length * 100);
    return `<h3>${escHtml(t('grammar_title'))}</h3>
        <p class="grammar-intro">${escHtml(t('grammar_intro'))}</p>
        ${learnPickerHtml(grammarIndex, set.id, 'grammarPickSet', id => learnDoneCount(grammarProgress(), id, GRAMMAR_PASS))}
        <div class="grammar-progress">
            <span>${escHtml(t('grammar_learned_n', { n: done, m: set.points.length }))}</span>
            <span class="grammar-bar" aria-hidden="true"><i style="width:${pct}%"></i></span>
        </div>
        <ol class="grammar-list" start="${grammarPage * GRAMMAR_PER_PAGE + 1}">
            ${set.points.slice(grammarPage * GRAMMAR_PER_PAGE, (grammarPage + 1) * GRAMMAR_PER_PAGE).map((p, k) => {
                const i = grammarPage * GRAMMAR_PER_PAGE + k;
                const learned = grammarLearned(set.id, p.id);
                return `<li><button type="button" class="grammar-item${learned ? ' learned' : ''}" onclick="grammarGo('point', ${i})">
                    <span class="grammar-num">${i + 1}</span>
                    <span class="grammar-item-text">
                        <span class="grammar-pattern" lang="${set.lang}">${escHtml(p.pattern)}</span>
                        <span class="grammar-item-title">${escHtml(gText(p.title))}</span>
                    </span>
                    <span class="grammar-state">${learned ? '✓ ' + escHtml(t('grammar_done_badge')) : '›'}</span>
                </button></li>`;
            }).join('')}
        </ol>
        ${grammarPagerHtml(set)}
        <p class="grammar-credit">${escHtml(t('grammar_credit'))}</p>`;
}

/* 上一頁 / 下一頁 under the list (the 更新內容 popup's texts) */
function grammarPagerHtml(set) {
    const pages = Math.ceil(set.points.length / GRAMMAR_PER_PAGE);
    if (pages <= 1) return '';
    return `<div class="grammar-pager">
        <button type="button" class="btn back-btn" onclick="grammarTurn(-1)"${grammarPage === 0 ? ' disabled' : ''}>← ${escHtml(t('updates_prev'))}</button>
        <span class="grammar-count">${escHtml(t('updates_page', { n: grammarPage + 1, m: pages }))}</span>
        <button type="button" class="btn back-btn" onclick="grammarTurn(1)"${grammarPage >= pages - 1 ? ' disabled' : ''}>${escHtml(t('updates_next'))} →</button>
    </div>`;
}

function grammarTurn(d) {
    const set = grammarSets[grammarSetId];
    if (!set) return;
    grammarPage = Math.max(0, Math.min(Math.ceil(set.points.length / GRAMMAR_PER_PAGE) - 1, grammarPage + d));
    renderGrammar();
    const box = document.getElementById('grammar-card');
    if (box) box.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

function grammarPointHtml(set) {
    const p = set.points[grammarPoint];
    const n = set.points.length;
    return `<div class="grammar-top">
            <button type="button" class="btn back-btn grammar-back" onclick="grammarGo('list')">${escHtml(t('grammar_back_list'))}</button>
            <span class="grammar-count">${escHtml(t('grammar_point_n', { n: grammarPoint + 1, m: n }))}</span>
        </div>
        <div class="grammar-head">
            <div class="grammar-big" lang="${set.lang}">${escHtml(p.pattern)}</div>
            <div class="grammar-head-title">${escHtml(gText(p.title))}${grammarLearned(set.id, p.id) ? ` <span class="grammar-badge">✓ ${escHtml(t('grammar_done_badge'))}</span>` : ''}</div>
        </div>
        <div class="grammar-cols">
        <div class="grammar-col-main">
        <div class="grammar-form"><b>${escHtml(t('grammar_form'))}</b><span lang="${set.lang}">${escHtml(gText(p.form))}</span></div>
        <p class="grammar-explain">${escHtml(gText(p.explain))}</p>
        ${(p.notes || []).length ? `<div class="grammar-notes">
            <h4 class="grammar-sub">⚠️ ${escHtml(t('grammar_notes'))}</h4>
            <ul>${p.notes.map(n => `<li>${escHtml(gText(n))}</li>`).join('')}</ul>
        </div>` : ''}
        ${(p.mistakes || []).length ? `<h4 class="grammar-sub">${escHtml(t('grammar_mistakes'))}</h4>
        <ul class="grammar-mistakes">
            ${p.mistakes.map(m => `<li>
                <div class="grammar-wrong" lang="${set.lang}"><span aria-hidden="true">✗</span> <s>${escHtml(m.wrong)}</s></div>
                ${zhReadingHtml(set, m.wrong_reading, m.wrong_zhuyin, 'grammar-m-rd')}
                <div class="grammar-right" lang="${set.lang}"><span aria-hidden="true">✓</span> ${escHtml(m.right)}</div>
                ${zhReadingHtml(set, m.right_reading, m.right_zhuyin, 'grammar-m-rd')}
                <div class="grammar-why">${escHtml(gText(m))}</div>
            </li>`).join('')}
        </ul>` : ''}
        </div>
        <div class="grammar-col-side">
        <div class="grammar-ex-head">
            <h4 class="grammar-sub">${escHtml(t('grammar_examples'))}</h4>
            ${set.lang === 'zh' ? `<div class="grammar-ex-tools">${grammarReadingSwitch()}${grammarAccentSwitch()}</div>` : ''}
        </div>
        <ul class="grammar-examples">
            ${p.examples.map((ex, i) => `<li>
                <div class="grammar-ex-line">
                    <span class="grammar-ex-ja" lang="${set.lang}">${escHtml(exText(ex))}</span>
                    <button type="button" class="speak-btn" onclick="grammarSay(${i})" title="${escHtml(t('tts_try'))}" aria-label="${escHtml(t('tts_try'))}">🔊</button>
                </div>
                ${exReadingHtml(set, ex)}
                <div class="grammar-ex-tr">${escHtml(gHint(set, ex))}</div>
            </li>`).join('')}
        </ul>
        <button type="button" class="btn next-btn grammar-start" onclick="grammarStartQuiz()">${escHtml(t('grammar_practice', { n: p.quiz.length }))}</button>
        </div>
        </div>
        <div class="grammar-nav">
            <button type="button" class="btn back-btn" onclick="grammarGo('point', ${grammarPoint - 1})"${grammarPoint === 0 ? ' disabled' : ''}>${escHtml(t('grammar_prev'))}</button>
            <button type="button" class="btn back-btn" onclick="grammarGo('point', ${grammarPoint + 1})"${grammarPoint >= n - 1 ? ' disabled' : ''}>${escHtml(t('grammar_next'))}</button>
        </div>`;
}

/* An example's sentence and reading: Japanese files use ja / kana, other
   languages text and (optionally) reading. */
function exText(ex) { return ex.text || ex.ja || ''; }
function exReading(ex) { return ex.reading || ex.kana || ''; }

/* Chinese examples carry pinyin (reading) and zhuyin (made from it by
   tools/build_grammar.py); the visitor picks which to see. */
const GRAMMAR_ZH_READINGS = ['pinyin', 'zhuyin', 'both'];

function grammarZhReading() {
    let v = '';
    try { v = localStorage.getItem('grammar_zh_reading') || ''; } catch {}
    return GRAMMAR_ZH_READINGS.includes(v) ? v : 'pinyin';
}

function grammarSetZhReading(v) {
    try { localStorage.setItem('grammar_zh_reading', v); } catch {}
    renderGrammar();
}

function grammarReadingSwitch() {
    const cur = grammarZhReading();
    return `<div class="grammar-rd" role="group" aria-label="${escHtml(t('grammar_rd_label'))}">
        ${GRAMMAR_ZH_READINGS.map(v => `<button type="button" class="grammar-rd-btn${v === cur ? ' on' : ''}" aria-pressed="${v === cur}" onclick="grammarSetZhReading('${v}')">${escHtml(t('grammar_rd_' + v))}</button>`).join('')}
    </div>`;
}

/* Taiwan / Mainland accent of the examples' 🔊 (js/speech.js). The page shows
   Traditional only, so without a choice the accent follows the site's script. */
function grammarAccentSwitch() {
    const cur = zhAccent(zhUiScript());
    return `<div class="grammar-rd" role="group" aria-label="${escHtml(t('zh_accent'))}" title="${escHtml(t('zh_accent'))}">
        <span class="grammar-rd-label" aria-hidden="true">🔊</span>
        ${[['zh-TW', 'zh_accent_tw'], ['zh-CN', 'zh_accent_cn']].map(([v, k]) => `<button type="button" class="grammar-rd-btn${v === cur ? ' on' : ''}" aria-pressed="${v === cur}" onclick="grammarSetAccent('${v}')">${escHtml(t(k))}</button>`).join('')}
    </div>`;
}

function grammarSetAccent(v) {
    setZhAccent(v);
    renderGrammar();
}

/* Pinyin and / or zhuyin lines for a Chinese sentence, as the switch says.
   The quiz sentences, options and common mistakes get theirs from
   tools/build_grammar.py too (q_reading / options_reading / wrong_reading…). */
function zhReadingHtml(set, pinyin, zhuyin, cls) {
    if (set.lang !== 'zh') return '';
    const mode = grammarZhReading();
    let html = '';
    if (mode !== 'zhuyin' && pinyin) html += `<div class="grammar-ex-kana ${cls || ''}">${escHtml(pinyin)}</div>`;
    if (mode !== 'pinyin' && zhuyin) html += `<div class="grammar-ex-kana grammar-ex-zhuyin ${cls || ''}" lang="zh-TW">${escHtml(zhuyin)}</div>`;
    return html;
}

function exReadingHtml(set, ex) {
    if (set.lang === 'zh') return zhReadingHtml(set, ex.reading, ex.zhuyin);
    const r = exReading(ex);
    return r && r.replace(/\s/g, '') !== exText(ex).replace(/\s/g, '') ? `<div class="grammar-ex-kana" lang="${set.lang}">${escHtml(r)}</div>` : '';
}

function grammarSay(i) {
    const set = grammarSets[grammarSetId];
    const ex = set && set.points[grammarPoint].examples[i];
    if (!ex) return;
    // Chinese: both accents' recordings are keyed by the Traditional sentence
    if (set.lang === 'zh') return speakChinese(exText(ex), exText(ex), zhUiScript());
    // recordings of examples are keyed "sentence|kana" (tools/build_audio.py)
    speakText(exText(ex), GRAMMAR_LANG_TTS[set.lang] || set.lang, exReading(ex) ? { reading: exReading(ex) } : undefined);
}

function grammarShuffle(a) {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
}

function grammarStartQuiz() {
    const p = grammarSets[grammarSetId].points[grammarPoint];
    grammarQuiz = {
        items: grammarShuffle(p.quiz).map(q => {
            const order = grammarShuffle(q.options.map((_, i) => i));
            return { q, order, options: order.map(i => q.options[i]), answer: order.indexOf(q.answer) };
        }),
        i: 0, right: 0, picked: -1
    };
    grammarGo('quiz');
}

function grammarQuizHtml(set) {
    const z = grammarQuiz;
    const it = z.items[z.i];
    const answered = z.picked >= 0;
    // the blank （　） becomes a box, filled in once answered
    // Chinese: the reading of the sentence; once answered, of the sentence with the answer in it
    const optRd = (key, i) => ((it.q[key] || [])[it.order[i]]) || '';
    const qPinyin = answered && it.q.full_reading ? it.q.full_reading : it.q.q_reading;
    const qZhuyin = answered && it.q.full_zhuyin ? it.q.full_zhuyin : it.q.q_zhuyin;
    const sentence = escHtml(it.q.q).replace('（　）', `<span class="grammar-blank${answered ? (z.picked === it.answer ? ' ok' : ' no') : ''}">${answered ? escHtml(it.options[it.answer]) : '　　'}</span>`);
    return `<div class="grammar-top">
            <button type="button" class="btn back-btn grammar-back" onclick="grammarGo('point')">${escHtml(t('grammar_back_point'))}</button>
            <span class="grammar-count">${escHtml(t('grammar_q_n', { n: z.i + 1, m: z.items.length }))}</span>
        </div>
        ${set.lang === 'zh' ? `<div class="grammar-q-rdswitch">${grammarReadingSwitch()}</div>` : ''}
        <div class="grammar-q">
            <div class="grammar-q-pattern" lang="${set.lang}">${escHtml(set.points[grammarPoint].pattern)}</div>
            ${it.q.q ? `<div class="grammar-q-text" lang="${set.lang}">${sentence}</div>${zhReadingHtml(set, qPinyin, qZhuyin, 'grammar-q-rd')}` : ''}
            <div class="grammar-q-hint">${escHtml(gHint(set, it.q))}</div>
        </div>
        <div class="grammar-options">
            ${it.options.map((o, i) => {
                let cls = '';
                if (answered && i === it.answer) cls = ' correct-choice';
                else if (answered && i === z.picked) cls = ' wrong-choice';
                return `<button type="button" class="btn option-btn${cls}" lang="${set.lang}" onclick="grammarAnswer(${i})"${answered ? ' disabled' : ''}>${escHtml(o)}${zhReadingHtml(set, optRd('options_reading', i), optRd('options_zhuyin', i), 'grammar-opt-rd')}</button>`;
            }).join('')}
        </div>
        ${answered ? `<p class="grammar-feedback ${z.picked === it.answer ? 'ok' : 'no'}">${escHtml(t(z.picked === it.answer ? 'correct' : 'grammar_wrong', { a: it.options[it.answer] }))}</p>
        ${grammarWhyHtml(set, it, z.picked)}
        <button type="button" class="btn next-btn grammar-start" onclick="grammarNextQ()">${escHtml(t(z.i + 1 < z.items.length ? 'grammar_next_q' : 'grammar_see_result'))}</button>` : ''}`;
}

/* After an answer: why the picked option doesn't fit (when wrong) and why the answer
   does — q.why holds one line per option in the source order (tools/grammar_why.py),
   it.order maps a shown option back to it. */
function grammarWhyHtml(set, it, picked) {
    const why = it.q.why;
    if (!why || why.length !== it.q.options.length) return '';
    const line = (i, ok) => `<p class="grammar-why-line ${ok ? 'ok' : 'no'}"><b lang="${set.lang}">${ok ? '✓' : '✗'} ${escHtml(it.options[i])}</b> ${escHtml(gText(why[it.order[i]]))}</p>`;
    return `<div class="grammar-why-box">${picked !== it.answer ? line(picked, false) : ''}${line(it.answer, true)}</div>`;
}

function grammarAnswer(i) {
    const z = grammarQuiz;
    if (!z || z.picked >= 0) return;
    z.picked = i;
    if (i === z.items[z.i].answer) z.right++;
    if (typeof logDailyActivity === 'function') logDailyActivity();
    if (i !== z.items[z.i].answer && typeof railReact === 'function') railReact('wrong');
    renderGrammar();
}

function grammarNextQ() {
    const z = grammarQuiz;
    if (z.i + 1 < z.items.length) {
        z.i++;
        z.picked = -1;
        renderGrammar();
        return;
    }
    // keep the best score of this point
    const set = grammarSets[grammarSetId];
    const key = set.id + ':' + set.points[grammarPoint].id;
    const prog = grammarProgress();
    const old = prog[key];
    if (!old || z.right / z.items.length >= old.best / (old.of || 1)) prog[key] = { best: z.right, of: z.items.length, at: Date.now() };
    if (typeof storeSet === 'function') storeSet('grammar_progress', JSON.stringify(prog));
    else try { localStorage.setItem('grammar_progress', JSON.stringify(prog)); } catch {}
    if (typeof railReact === 'function') railReact('result', Math.round(z.right / z.items.length * 100));
    grammarGo('result');
}

function grammarResultHtml(set) {
    const z = grammarQuiz;
    const pass = z.right / z.items.length >= GRAMMAR_PASS;
    const last = grammarPoint >= set.points.length - 1;
    setTimeout(() => {
        const m = document.querySelector('#grammar-card .grammar-result-mascot');
        if (pass && m && typeof mascotHop === 'function') mascotHop(m);
    }, 300);
    return `<div class="grammar-result">
            <div class="grammar-result-mascot">${typeof mascotHtml === 'function' ? mascotHtml('bust') : ''}</div>
            <div class="grammar-big" lang="${set.lang}">${escHtml(set.points[grammarPoint].pattern)}</div>
            <p class="grammar-score">${escHtml(t('grammar_result', { n: z.right, m: z.items.length }))}</p>
            <p class="grammar-verdict ${pass ? 'ok' : 'no'}">${escHtml(t(pass ? 'grammar_pass' : 'grammar_fail'))}</p>
        </div>
        <div class="grammar-result-btns">
            ${pass && !last ? `<button type="button" class="btn next-btn" onclick="grammarGo('point', ${grammarPoint + 1})">${escHtml(t('grammar_next_point'))}</button>` : ''}
            <button type="button" class="btn ${pass && !last ? 'back-btn' : 'next-btn'}" onclick="${pass ? 'grammarStartQuiz()' : "grammarGo('point')"}">${escHtml(t(pass ? 'grammar_again' : 'grammar_reread'))}</button>
            <button type="button" class="btn back-btn" onclick="grammarGo('list')">${escHtml(t('grammar_back_list'))}</button>
        </div>`;
}
