/* ===================== 文法 Grammar (#page-grammar) =====================
   Lessons built by tools/build_grammar.py from the hand-written tools/grammar/<id>.json
   (data/grammar/index.json lists them; Japanese N5 first, more levels / languages later).
   A point = pattern, meaning, how it attaches (form), explanation, notes (注意事項),
   common mistakes (✗ wrong / ✓ right / why), examples with audio, then a few
   questions — the easy ones first, then the hard ones (q.hard, tagged 進階; 2026-10-16),
   each a fill-in or a sentence to put in order (q.type 'order': picking the ★ part, or
   arranging all four parts when the question's style, else the level's order_style, is
   'arrange'); Japanese texts may
   carry furigana segments (q_furi …, see tools/build_grammar.py). Getting GRAMMAR_PASS of
   them right marks it learned. Content texts come as { zh, 'zh-Hans', en }: other UI languages read
   the English. Progress: localStorage grammar_progress = { "<set>:<point>": { best, of, at } }
   (synced, js/account.js). Answers count toward the daily goal (logDailyActivity). */

const GRAMMAR_PASS = 2 / 3;
const GRAMMAR_LANG_TTS = { ja: 'ja-JP', ko: 'ko-KR', en: 'en-US', zh: 'zh-TW', fr: 'fr-FR', ru: 'ru-RU', de: 'de-DE', es: 'es-ES' };

let grammarIndex = null;        // [{ id, lang, level, count }]
const grammarSets = {};         // id -> loaded set
let grammarSetId = '';
let grammarView = 'list';       // 'list' | 'point' | 'quiz' | 'result'
let grammarPoint = 0;
let grammarQuiz = null;         // { items: [{ q, order, options (shuffled), answer, arrange, built }], i, right, picked }
const GRAMMAR_PER_PAGE = 5;     // points per page of the list
let grammarPage = 0;

/* A point's title under its pattern — left out when it only repeats the pattern
   (the Chinese lessons' "A 是 B" titled "A 是 B" in a Chinese UI). */
function grammarTitle(p) {
    const bare = s => String(s || '').replace(/\s+/g, '');
    if ((siteLang === 'zh' || siteLang === 'zh-Hans') && p.title && bare(p.title.zh) === bare(p.pattern)) return '';
    return gText(p.title);
}

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

/* ----- the 學習 pages' level picker -----
   The language comes from the header's 我在學 pill (js/learnlang.js, 2026-10-17; this
   used to have its own language menu); this draws that language's levels, each with how
   much of it is done. Shared by the 文法, 閱讀 and 聽解 lists: index = the page's
   index.json, pick = the name of the global function that opens a level, done(id) =
   items passed in that level. */
const LEARN_FLAGS = { ja: ['jp'], ko: ['kr'], zh: ['tw', 'cn'], en: ['gb'], fr: ['fr'], ru: ['ru'], es: ['es'], de: ['de'] };

function learnFlags(lang) {
    return (LEARN_FLAGS[lang] || []).map(f => `<span class="flag flag--${f}" aria-hidden="true"></span>`).join('');
}

/* Before a mock exam (閱讀 and 聽解, owner's request 2026-10-22): it is taken in one go and
   its place is never kept, so say so first. lines = what this exam is like. */
function mockNoteHtml(title, lines, startCall, backCall) {
    return `<div class="grammar-top">
            <button type="button" class="btn back-btn grammar-back" onclick="${backCall}">${escHtml(t('listening_back_list'))}</button>
        </div>
        <div class="mock-note">
            <div class="mock-note-icon" aria-hidden="true">📝</div>
            <h3>${escHtml(title)}</h3>
            ${lines.map(l => `<p>${escHtml(l)}</p>`).join('')}
            <p class="mock-note-warn">${uiIcon('warning')} ${escHtml(t('mock_note_warn'))}</p>
            <button type="button" class="btn next-btn" onclick="${startCall}">${escHtml(t('mock_note_ok'))}</button>
        </div>`;
}

function learnPickerHtml(index, curId, pick, done) {
    const cur = index.find(s => s.id === curId) || index[0];
    const levels = index.filter(s => s.lang === cur.lang);
    if (levels.length < 2) return '';   // one level (Spanish A1): nothing to pick
    const chips = levels.map(s => {
        const n = done(s.id), m = s.count || 0;
        return `<button type="button" class="mode-btn grammar-chip learn-level${s.id === cur.id ? ' mode-btn-active' : ''}" aria-pressed="${s.id === cur.id}" onclick="${pick}('${s.id}')">
            <b>${escHtml(learnLevelName(s.level))}</b><span class="learn-level-meta"><span class="learn-bar" aria-hidden="true"><i style="width:${m ? Math.round(n / m * 100) : 0}%"></i></span><small>${n}/${m}</small></span>
        </button>`;
    }).join('');
    // equal columns: up to 5 levels in one row, more in two even rows (6 → 3 + 3)
    const cols = levels.length <= 5 ? levels.length : Math.ceil(levels.length / 2);
    return `<div class="learn-levels" role="group" aria-label="${escHtml(t('learn_levels'))}"><div class="learn-level-grid" style="--cols:${cols}">${chips}</div></div>`;
}

// items passed in a level, from a progress store keyed "<level>:<item>" ({best, of})
function learnDoneCount(prog, levelId, pass) {
    return Object.entries(prog).filter(([k, p]) => k.startsWith(levelId + ':') && p && p.of > 0 && p.best / p.of >= pass).length;
}

function grammarProgress() {
    try { return JSON.parse(localStorage.getItem('grammar_progress')) || {}; } catch { return {}; }
}

/* 2026-10-16: Korean went from "TOPIK I" / "TOPIK II" (ko_topik1 / ko_topik2) to the
   standard curriculum's levels 1급–4급 (ko_1 … ko_4). Progress kept under the old ids is
   moved to the point's new level, keeping the better score; account.js runs this on the
   synced copy too, so the cloud loses the old keys. Points not listed were ko_topik1's → 1급. */
const GRAMMAR_KO_MOVED = {
    2: 'aseo-seq aseo-reason eumyeon adj-mod neun-mod eun-past-mod eul-ttae aya-hada eunikka gi-jeone eun-hue ado-doeda eumyeon-andoeda neunde eumyeonseo geona neun-dongan euryeogo geot-gatda gunyo a-itda ge-doeda a-jida eun-jeok giro-hada eul-jul-alda ge-adverb eun-ji gi-ttaemune',
    3: 'daga atdaga jamaja dorok gi-wihaeseo euryeomyeon neurago a-boida na-boda eul-jido-moreuda eul-tende dago-hada indirect-others daeyo deon deoragoyo janayo geodeunyo eulgeoryo a-beorida a-nota eul-ppeonhada ji-aneumyeon-an-doeda eul-manhada gineun-hada neun-pyeonida a-yagetda passive ado daesine e-bihae ppunman-anira e-ttara',
    4: 'eun-gime neun-barame deokbune-tase neun-moyangida eul-subakke-eopda causative eulsurok deorado eun-dedaga jocha neun-daero',
};

function grammarMoveKo(prog) {
    const old = Object.keys(prog || {}).filter(k => k.startsWith('ko_topik'));
    if (!old.length) return prog;
    const level = {};
    Object.entries(GRAMMAR_KO_MOVED).forEach(([n, ids]) => ids.split(' ').forEach(id => { level[id] = n; }));
    const rate = p => (p && p.of ? p.best / p.of : -1);
    old.forEach(k => {
        const pid = k.slice(k.indexOf(':') + 1);
        const nk = 'ko_' + (level[pid] || 1) + ':' + pid;
        if (rate(prog[k]) > rate(prog[nk])) prog[nk] = prog[k];
        delete prog[k];
    });
    return prog;
}

(function grammarMigrateKo() {
    try {
        const raw = localStorage.getItem('grammar_progress');
        if (raw && raw.includes('ko_topik')) {
            const prog = JSON.stringify(grammarMoveKo(JSON.parse(raw)));
            if (typeof storeSet === 'function') storeSet('grammar_progress', prog);
            else localStorage.setItem('grammar_progress', prog);
        }
        const set = localStorage.getItem('grammar_set');
        if (set === 'ko_topik1' || set === 'ko_topik2') localStorage.setItem('grammar_set', set === 'ko_topik1' ? 'ko_1' : 'ko_3');
    } catch {}
})();

/* a level's name on the chips: Korean "1급" … "6급" in the visitor's language */
function learnLevelName(level) {
    const m = /^(\d)급$/.exec(level || '');
    return m ? t('learn_level_n', { n: m[1] }) : level;
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
    // the level in the header's learning language (js/learnlang.js); '' = nothing in it yet
    let saved = '';
    if (!grammarSetId) try { saved = localStorage.getItem('grammar_set') || ''; } catch {}
    const want = learnSetId(grammarIndex, grammarSetId || saved, 'grammar');
    if (want !== grammarSetId) { grammarSetId = want; grammarView = 'list'; grammarPoint = 0; grammarPage = 0; }
    learnRememberLevel('grammar', grammarIndex.find(s => s.id === want));   // the home page's 繼續上次的
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
    if (!grammarSetId) {
        document.body.classList.remove('grammar-wide');
        box.innerHTML = `<h3>${escHtml(t('grammar_title'))}</h3>${learnEmptyHtml(grammarIndex, 'nav_grammar')}`;
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
    learnRememberLevel('grammar', (grammarIndex || []).find(s => s.id === id));
    grammarGo('list');
}

function grammarListHtml(set) {
    const done = set.points.filter(p => grammarLearned(set.id, p.id)).length;
    const pct = Math.round(done / set.points.length * 100);
    return `<h3>${escHtml(t('grammar_title'))}${introInfoBtn('grammar_intro')}</h3>
        ${introHtml('grammar_intro')}
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
                        ${grammarTitle(p) ? `<span class="grammar-item-title">${escHtml(grammarTitle(p))}</span>` : ''}
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
            <button type="button" class="note-add" onclick="grammarNote()" title="${escHtml(t('notes_add'))}" aria-label="${escHtml(t('notes_add'))}">${uiIcon('plus')}<span>${escHtml(t('notes_add_short'))}</span></button>
        </div>
        <div class="grammar-head">
            <div class="grammar-big" lang="${set.lang}">${escHtml(p.pattern)}</div>
            <div class="grammar-head-title">${escHtml(grammarTitle(p))}${grammarLearned(set.id, p.id) ? ` <span class="grammar-badge">✓ ${escHtml(t('grammar_done_badge'))}</span>` : ''}</div>
        </div>
        <div class="grammar-cols">
        <div class="grammar-col-main">
        <div class="grammar-form"><b>${escHtml(t('grammar_form'))}</b><span lang="${set.lang}">${escHtml(gText(p.form))}</span></div>
        <p class="grammar-explain">${escHtml(gText(p.explain))}</p>
        ${(p.notes || []).length ? `<div class="grammar-notes">
            <h4 class="grammar-sub">${uiIcon('warning')} ${escHtml(t('grammar_notes'))}</h4>
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
            ${set.lang === 'zh' ? `<div class="grammar-ex-tools">
                <div class="grammar-tool"><span class="grammar-tool-label">${escHtml(t('grammar_rd_label'))}</span>${grammarReadingSwitch()}</div>
                <div class="grammar-tool"><span class="grammar-tool-label">${uiIcon('speaker')} ${escHtml(t('zh_accent'))}</span>${grammarAccentSwitch()}</div>
            </div>` : ''}
        </div>
        <ul class="grammar-examples">
            ${p.examples.map((ex, i) => `<li>
                <div class="grammar-ex-line">
                    <span class="grammar-ex-ja" lang="${set.lang}">${escHtml(exText(ex))}</span>
                    <button type="button" class="speak-btn" onclick="grammarSay(${i})" title="${escHtml(t('tts_try'))}" aria-label="${escHtml(t('tts_try'))}">${uiIcon('speaker')}</button>
                    <button type="button" class="note-add" onclick="grammarNote(${i})" title="${escHtml(t('notes_add'))}" aria-label="${escHtml(t('notes_add'))}">${uiIcon('plus')}<span>${escHtml(t('notes_add_short'))}</span></button>
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

/* ＋筆記 (js/notes.js): the point — meaning, form, examples — or one more example
   into the note saved from this point */
function grammarNote(exIdx) {
    const set = grammarSets[grammarSetId];
    const p = set && set.points[grammarPoint];
    if (!p || typeof notesAddFrom !== 'function') return;
    const exLine = ex => '- ' + exText(ex) + (gHint(set, ex) ? '（' + gHint(set, ex) + '）' : '');
    const lines = [gText(p.title), '# ' + t('grammar_form'), gText(p.form), '# ' + t('grammar_examples')]
        .concat((exIdx == null ? p.examples : [p.examples[exIdx]]).map(exLine));
    notesAddFrom({
        kind: 'grammar', ref: set.id + '|' + p.id, lang: set.lang, title: p.pattern,
        label: t('nav_grammar') + ' ' + learnLevelName(set.level) + '・' + p.pattern, text: lines.filter(Boolean).join('\n')
    });
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
    return `<div class="grammar-rd" role="group" aria-label="${escHtml(t('zh_accent'))}">
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
    const set = grammarSets[grammarSetId];
    const p = set.points[grammarPoint];
    // the easy questions first, then the hard ones, each group shuffled
    const qs = grammarShuffle(p.quiz.filter(q => !q.hard)).concat(grammarShuffle(p.quiz.filter(q => q.hard)));
    grammarQuiz = {
        items: qs.map(q => {
            const order = grammarShuffle(q.options.map((_, i) => i));
            // a question's own style wins over the level's (Korean 3급+ ask both kinds)
            const arrange = q.type === 'order' && (q.style || set.order_style) === 'arrange';
            return { q, order, options: order.map(i => q.options[i]), answer: order.indexOf(q.answer), arrange, built: [] };
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
    const ok = z.picked === it.answer;
    const sentence = grammarFuri(it.q.q, it.q.q_furi).replace('（　）', `<span class="grammar-blank${answered ? (ok ? ' ok' : ' no') : ''}">${answered ? grammarFuri(it.options[it.answer], grammarOptFuri(it, it.answer)) : '　　'}</span>`);
    const tags = (it.q.hard ? `<span class="grammar-tag hard">${escHtml(t('grammar_hard'))}</span>` : '')
        + (it.q.type === 'order' ? `<span class="grammar-tag">${escHtml(t('grammar_order'))}</span>` : '');
    const top = `<div class="grammar-top">
            <button type="button" class="btn back-btn grammar-back" onclick="grammarGo('point')">${escHtml(t('grammar_back_point'))}</button>
            <span class="grammar-count">${escHtml(t('grammar_q_n', { n: z.i + 1, m: z.items.length }))}${tags}</span>
        </div>`;
    if (it.q.type === 'order') return top + grammarOrderHtml(set, it, answered, ok);
    return top + `
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
                return `<button type="button" class="btn option-btn${cls}" lang="${set.lang}" onclick="grammarAnswer(${i})"${answered ? ' disabled' : ''}>${grammarFuri(o, grammarOptFuri(it, i))}${zhReadingHtml(set, optRd('options_reading', i), optRd('options_zhuyin', i), 'grammar-opt-rd')}</button>`;
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
    if (it.q.type === 'order') {
        // the whole sentence, the ★ part marked, its translation and why it goes that way
        const parts = it.q.parts.map((x, k) => {
            const h = grammarFuri(x, (it.q.parts_furi || [])[k]);
            return k === it.q.star && !it.arrange ? `<b class="grammar-star-part">${h}</b>` : h;
        }).join(set.lang === 'ja' || set.lang === 'zh' ? '' : ' ');   // Korean puts a space between the parts
        return `<div class="grammar-why-box">
            <p class="grammar-why-line ok grammar-order-full" lang="${set.lang}">${grammarFuri(it.q.before, it.q.before_furi)}${parts}${grammarFuri(it.q.after, it.q.after_furi)}</p>
            <p class="grammar-why-line">${escHtml(gText(it.q))}</p>
            ${why && why.length === 1 ? `<p class="grammar-why-line">${escHtml(gText(why[0]))}</p>` : ''}
        </div>`;
    }
    if (!why || why.length !== it.q.options.length) return '';
    const line = (i, ok) => `<p class="grammar-why-line ${ok ? 'ok' : 'no'}"><b lang="${set.lang}">${ok ? '✓' : '✗'} ${escHtml(it.options[i])}</b> ${escHtml(gText(why[it.order[i]]))}</p>`;
    return `<div class="grammar-why-box">${picked !== it.answer ? line(picked, false) : ''}${line(it.answer, true)}</div>`;
}

/* Japanese text with furigana segments [[text, reading], …] (tools/build_grammar.py) */
function grammarFuri(text, segs) {
    if (!segs) return escHtml(text || '');
    return segs.map(([s, r]) => r ? `<ruby>${escHtml(s)}<rt>${escHtml(r)}</rt></ruby>` : escHtml(s)).join('');
}

// the furigana of a shown option (it.order maps it back to the source order)
function grammarOptFuri(it, i) {
    const f = it.q.type === 'order' ? it.q.parts_furi : it.q.options_furi;
    return f ? f[it.order[i]] : null;
}

/* A sentence to put in order: four blanks between the text before and after. 'star'
   (the JLPT way): pick the part that goes on ★; 'arrange' (N5–N4): tap the parts in
   order into the row, tap a placed one to take it back, then 確定. */
function grammarOrderHtml(set, it, answered, ok) {
    const lang = set.lang;
    const head = `<div class="grammar-q">
            <div class="grammar-q-pattern" lang="${lang}">${escHtml(set.points[grammarPoint].pattern)}</div>`;
    const after = answered ? `<p class="grammar-feedback ${ok ? 'ok' : 'no'}">${escHtml(ok ? t('correct')
            : it.arrange ? t('grammar_order_right') : t('grammar_star_is', { a: it.q.parts[it.q.star] }))}</p>
        ${grammarWhyHtml(set, it, grammarQuiz.picked)}
        <button type="button" class="btn next-btn grammar-start" onclick="grammarNextQ()">${escHtml(t(grammarQuiz.i + 1 < grammarQuiz.items.length ? 'grammar_next_q' : 'grammar_see_result'))}</button>` : '';
    if (it.arrange) {
        const chips = it.built.map((k, n) => `<button type="button" class="grammar-chip" lang="${lang}" onclick="grammarArrangeUndo(${n})"${answered ? ' disabled' : ''}>${grammarFuri(it.q.parts[k], (it.q.parts_furi || [])[k])}</button>`).join('');
        const pool = it.order.filter(k => !it.built.includes(k)).map(k =>
            `<button type="button" class="btn option-btn" lang="${lang}" onclick="grammarArrangePick(${k})">${grammarFuri(it.q.parts[k], (it.q.parts_furi || [])[k])}</button>`).join('');
        return head + `
            <div class="grammar-q-hint">${escHtml(gHint(set, it.q))}</div>
        </div>
        <div class="grammar-arrange${answered ? (ok ? ' ok' : ' no') : ''}" lang="${lang}">
            ${grammarFuri(it.q.before, it.q.before_furi)}${chips || `<span class="grammar-arrange-empty">${escHtml(t('grammar_arrange_hint'))}</span>`}${grammarFuri(it.q.after, it.q.after_furi)}
        </div>
        ${answered ? '' : `<div class="grammar-pool">${pool}</div>
        ${it.built.length === 4 ? `<button type="button" class="btn next-btn grammar-start" onclick="grammarArrangeCheck()">${escHtml(t('grammar_order_check'))}</button>` : ''}`}
        ${after}`;
    }
    const slots = [0, 1, 2, 3].map(k => k === it.q.star
        ? `<span class="grammar-slot star${answered ? (ok ? ' ok' : ' no') : ''}"><span class="grammar-slot-mark">★</span>${answered ? grammarFuri(it.q.parts[k], (it.q.parts_furi || [])[k]) : '　'}</span>`
        : `<span class="grammar-slot"><span class="grammar-slot-mark">&nbsp;</span>　</span>`).join('');
    return head + `
            <div class="grammar-q-text" lang="${lang}">${grammarFuri(it.q.before, it.q.before_furi)}${slots}${grammarFuri(it.q.after, it.q.after_furi)}</div>
            <div class="grammar-q-hint">${escHtml(t('grammar_star_hint'))}</div>
            <div class="grammar-q-hint">${escHtml(gHint(set, it.q))}</div>
        </div>
        <div class="grammar-options">
            ${it.options.map((o, i) => {
                let cls = '';
                if (answered && i === it.answer) cls = ' correct-choice';
                else if (answered && i === grammarQuiz.picked) cls = ' wrong-choice';
                return `<button type="button" class="btn option-btn${cls}" lang="${lang}" onclick="grammarAnswer(${i})"${answered ? ' disabled' : ''}>${grammarFuri(o, grammarOptFuri(it, i))}</button>`;
            }).join('')}
        </div>
        ${after}`;
}

function grammarArrangePick(k) {
    const it = grammarQuiz && grammarQuiz.items[grammarQuiz.i];
    if (!it || grammarQuiz.picked >= 0 || it.built.includes(k) || it.built.length >= 4) return;
    it.built.push(k);
    renderGrammar();
}

function grammarArrangeUndo(n) {
    const it = grammarQuiz && grammarQuiz.items[grammarQuiz.i];
    if (!it || grammarQuiz.picked >= 0) return;
    it.built.splice(n, 1);
    renderGrammar();
}

// right = the parts in the source order, or one of the other right orders (q.alts)
function grammarArrangeCheck() {
    const it = grammarQuiz && grammarQuiz.items[grammarQuiz.i];
    if (!it || it.built.length !== 4) return;
    const same = a => a.every((k, n) => k === it.built[n]);
    grammarAnswer(same([0, 1, 2, 3]) || (it.q.alts || []).some(same) ? it.answer : (it.answer + 1) % 4);
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
