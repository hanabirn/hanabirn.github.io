/* ===================== Wide-screen side rails (#rail-left / #rail-right) =====================
   Desktop only — css/rails.css shows them where the margins beside the main column
   are wide enough (left ≥ 1280px, right ≥ 1480px so it clears the fixed buttons on
   the right edge; more on the pages widened to 1180px).

   Left: 小花火 standing, who reacts to a poke — head → happy, face → shy (redder
   cheeks), body → startled, POKE_ANGRY_AT pokes in POKE_WINDOW_MS → cross for a
   moment — and says a line (poke_* keys: one string per kind, lines split on "|").
   Opening a page makes her say a line about it once per visit (ctx_* keys).

   Right: 每日一字, a word a day from the topic sets (tp_*) in the language the
   visitor studies (last_quiz_set, or picked on the card; rail_word_lang). On the
   home page also the last two weeks of daily_activity and 今日任務 (daily goal,
   due SRS cards, listening to the word of the day: rail_word_heard). */

const POKE_ANGRY_AT = 5;
const POKE_WINDOW_MS = 2500;
const POKE_FACE_MS = 1600;
const POKE_ANGRY_MS = 1800;
const POKE_EXTRA_CHANCE = 0.3;   // how often a poke on the head or body gets a line about the visitor's day
const RAIL_WORD_LANGS = ['jp', 'kr', 'en', 'zh'];
const RAIL_TTS = { jp: 'ja-JP', kr: 'ko-KR', en: 'en-US' };
const RAIL_CTX = { home: 'ctx_home', quiz: 'ctx_quiz', examquiz: 'ctx_exam', dict: 'ctx_dict',
    alphabet: 'ctx_alphabet', notes: 'ctx_notes' };

let pokeTimes = [];
let pokeCalmAt = 0;          // no reactions before this (after being cross)
let pokeFaceTimer = 0;
let pokeBubbleTimer = 0;
let pokeLastLine = '';
let pokeAlpha = null;        // body.webp's pixels: clicks on empty space don't count
let pokeAudio = null;
let railPage = 'home';
const railSeenPages = new Set();
const railSetCache = {};

function railVisible(id) {
    const el = document.getElementById(id);
    return !!el && getComputedStyle(el).display !== 'none';
}

function railStore(key, value) {
    try { localStorage.setItem(key, value); } catch {}
}

function railLoad(key) {
    try { return localStorage.getItem(key); } catch { return null; }
}

/* ---------- left: 小花火 ---------- */

// t() fills only the first {n}, and every line of the key has its own
function pokeLines(key, params) {
    return t(key).split('|')
        .map(s => Object.entries(params || {}).reduce((x, [k, v]) => x.split('{' + k + '}').join(v), s).trim())
        .filter(Boolean);
}

function pokeSay(key, params) {
    const bubble = document.getElementById('poke-bubble');
    if (!bubble) return;
    const lines = pokeLines(key, params);
    if (!lines.length) return;
    let line = lines[Math.floor(Math.random() * lines.length)];
    if (line === pokeLastLine && lines.length > 1) line = lines[(lines.indexOf(line) + 1) % lines.length];
    pokeLastLine = line;
    bubble.textContent = line;
    bubble.hidden = false;
    bubble.classList.remove('show');
    void bubble.offsetWidth;
    bubble.classList.add('show');
    mascotTalk(document.getElementById('poke-btn'), Math.min(400 + line.length * 90, 2600));
    clearTimeout(pokeBubbleTimer);
    pokeBubbleTimer = setTimeout(() => { bubble.classList.remove('show'); bubble.hidden = true; }, Math.max(2600, line.length * 130));
}

function pokeLoadAlpha() {
    const img = new Image();
    img.onload = () => {
        try {
            const c = document.createElement('canvas');
            c.width = img.naturalWidth;
            c.height = img.naturalHeight;
            const g = c.getContext('2d');
            g.drawImage(img, 0, 0);
            pokeAlpha = g.getImageData(0, 0, c.width, c.height);
        } catch {}
    };
    img.src = 'images/mascot/body.webp';
}

/* fx, fy: where in the figure (0–1) the click landed */
function pokeOnFigure(fx, fy) {
    if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return false;
    if (!pokeAlpha) return true;
    const x = Math.min(pokeAlpha.width - 1, Math.floor(fx * pokeAlpha.width));
    const y = Math.min(pokeAlpha.height - 1, Math.floor(fy * pokeAlpha.height));
    return pokeAlpha.data[(y * pokeAlpha.width + x) * 4 + 3] > 20;
}

function pokeZone(fx, fy) {
    if (fy >= 0.47) return 'body';
    return fx >= 0.25 && fx <= 0.78 && fy >= 0.24 ? 'face' : 'head';
}

function pokePop(cross) {
    try {
        pokeAudio = pokeAudio || new (window.AudioContext || window.webkitAudioContext)();
        const now = pokeAudio.currentTime;
        const osc = pokeAudio.createOscillator();
        const gain = pokeAudio.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(cross ? 260 : 620, now);
        osc.frequency.exponentialRampToValueAtTime(cross ? 170 : 940, now + 0.08);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
        osc.connect(gain).connect(pokeAudio.destination);
        osc.start(now);
        osc.stop(now + 0.14);
    } catch {}
}

/* a few symbols floating up beside her head */
function pokeFx(symbols, cls) {
    const box = document.getElementById('poke-fx');
    if (!box) return;
    symbols.forEach((s, i) => {
        const span = document.createElement('span');
        span.className = 'poke-fx-item' + (cls ? ' ' + cls : '');
        span.textContent = s;
        span.style.left = (58 + i * 14) + '%';
        span.style.animationDelay = (i * 90) + 'ms';
        // a timer, not animationend: that never fires without the animation
        // (reduced motion, a background tab)
        setTimeout(() => span.remove(), 1000 + i * 90);
        box.appendChild(span);
    });
}

function pokeFace(mascot, face, ms) {
    mascot.classList.remove('mc-happy', 'mc-shy', 'mc-angry');
    if (face) mascot.classList.add(face);
    clearTimeout(pokeFaceTimer);
    pokeFaceTimer = setTimeout(() => mascot.classList.remove('mc-happy', 'mc-shy', 'mc-angry'), ms);
}

function pokeReact(zone) {
    const now = Date.now();
    if (now < pokeCalmAt) return;
    const mascot = mascotOf(document.getElementById('poke-btn'));
    if (!mascot) return;
    pokeTimes = pokeTimes.filter(ts => now - ts < POKE_WINDOW_MS).concat(now);
    if (pokeTimes.length >= POKE_ANGRY_AT) {
        pokeTimes = [];
        pokeCalmAt = now + POKE_ANGRY_MS;
        pokeFace(mascot, 'mc-angry', POKE_ANGRY_MS);
        pokeFx(['💢'], 'cross');
        pokePop(true);
        pokeSay('poke_angry');
        return;
    }
    pokePop(false);
    const extra = Math.random() < POKE_EXTRA_CHANCE ? pokeSituation() : null;
    if (zone === 'head') {
        pokeFace(mascot, 'mc-happy', POKE_FACE_MS);
        pokeFx(['♪', '💕']);
        extra ? pokeSay(extra[0], extra[1]) : pokeSay('poke_head');
    } else if (zone === 'face') {
        pokeFace(mascot, 'mc-shy', POKE_FACE_MS);
        pokeFx(['///'], 'shy');
        pokeSay('poke_face');
    } else {
        pokeFace(mascot, '', 0);
        mascotHop(mascot);
        pokeFx(['!'], 'startle');
        extra ? pokeSay(extra[0], extra[1]) : pokeSay('poke_body');
    }
}

/* Now and then a poke gets a line about the visitor's day instead: the time,
   their streak, cards waiting for review. [i18n key, params] or null. */
function pokeSituation() {
    const options = [];
    const h = new Date().getHours();
    if (h >= 5 && h < 11) options.push(['poke_morning']);
    else if (h >= 22 || h < 5) options.push(['poke_night']);
    try {
        const streak = calcStreak(getQuizRecords());
        if (streak >= 2) options.push(['poke_streak', { n: streak }]);
        const due = srsQuizDueCount();
        if (due > 0) options.push(['poke_due', { n: due }]);
    } catch {}
    return options.length ? options[Math.floor(Math.random() * options.length)] : null;
}

/* The quiz engine tells her how it's going (js/quiz.js: noteCombo, showResults):
   she cheers every 5 right in a row, now and then comforts a miss, and comments
   on the result. Only while she is on screen. */
let railReactQuietUntil = 0;

function railReact(event, n) {
    if (!railVisible('rail-left')) return;
    const mascot = mascotOf(document.getElementById('poke-btn'));
    if (!mascot) return;
    const now = Date.now();
    if (event === 'combo') {
        if (n < 5 || n % 5) return;
        pokeFace(mascot, 'mc-happy', POKE_FACE_MS);
        mascotHop(mascot);
        pokeFx(['🔥', '✨']);
        pokeSay('react_combo', { n });
    } else if (event === 'wrong') {
        if (now < railReactQuietUntil || Math.random() > 0.35) return;
        railReactQuietUntil = now + 15000;
        pokeSay('react_wrong');
    } else if (event === 'result') {
        if (n >= 100) {
            pokeFace(mascot, 'mc-happy', POKE_FACE_MS * 2);
            pokeFx(['🎉', '💯']);
            pokeSay('react_perfect');
        } else if (n >= 60) {
            pokeFace(mascot, 'mc-happy', POKE_FACE_MS);
            pokeSay('react_good');
        } else {
            pokeSay('react_low');
        }
    }
}

function pokeClick(e) {
    const btn = document.getElementById('poke-btn');
    const fig = btn && btn.querySelector('.mc-fig');
    if (!fig) return;
    // a keyboard "click" has no position: pat her head
    if (e.detail === 0) { pokeReact('head'); return; }
    const r = fig.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width;
    const fy = (e.clientY - r.top) / r.height;
    if (!pokeOnFigure(fx, fy)) return;
    pokeReact(pokeZone(fx, fy));
}

/* ---------- right: 每日一字, calendar, tasks ---------- */

function railDayKey(d) {
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

// whole days since 2026-01-01 in local time, so the word changes at midnight
function railDayNumber() {
    const now = new Date();
    return Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(2026, 0, 1)) / 86400000);
}

function railHash(n) {
    let h = (n ^ 0x9e3779b9) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
    return (h ^ (h >>> 16)) >>> 0;
}

function railWordLang() {
    const saved = railLoad('rail_word_lang');
    if (RAIL_WORD_LANGS.includes(saved)) return saved;
    const last = railLoad('last_quiz_set') || '';
    if (isKoreanQuizLang(last)) return 'kr';
    if (isEnglishQuizLang(last)) return 'en';
    if (isChineseQuizLang(last)) return 'zh';
    return 'jp';
}

function railPickLang(lang) {
    if (!RAIL_WORD_LANGS.includes(lang)) return;
    railStore('rail_word_lang', lang);
    renderRailWord();
}

function railLoadSet(id) {
    if (!railSetCache[id]) {
        railSetCache[id] = fetch('data/vocab/' + id + '.json')
            .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .catch(e => { delete railSetCache[id]; throw e; });
    }
    return railSetCache[id];
}

/* Today's word for a language: the topic and the word both follow from the date. */
function railTodayWord(lang) {
    const day = railDayNumber();
    const salt = RAIL_WORD_LANGS.indexOf(lang) + 1;
    const topic = TOPIC_IDS[railHash(day * 31 + salt) % TOPIC_IDS.length];
    const id = 'tp_' + TOPIC_FILE_LANG[lang] + '_' + topic;
    return railLoadSet(id).then(data => {
        const words = data.words || [];
        return { id, topic, row: words[railHash(day * 7919 + salt * 101) % words.length] };
    });
}

/* word / reading / meaning / what to say, as shown on the card */
function railWordView(lang, row) {
    const uiZh = siteLang === 'zh' || siteLang === 'zh-Hans';
    if (lang === 'zh') {
        const simp = siteLang === 'zh-Hans';
        return { word: simp ? row[1] : row[0], reading: simp ? row[3] : row[2] + ' · ' + row[3], meaning: row[4],
                 speak: simp ? row[1] : row[0], tts: simp ? 'zh-CN' : 'zh-TW', htmlLang: simp ? 'zh-Hans' : 'zh-Hant' };
    }
    const reading = lang === 'jp' && row[1] && row[1] !== row[0] ? row[1] : '';
    return { word: row[0], reading, meaning: uiZh || !row[3] ? row[2] : row[3],
             speak: row[0], kana: lang === 'jp' && hasKanji(row[0]) ? row[1] : '', tts: RAIL_TTS[lang],
             htmlLang: { jp: 'ja', kr: 'ko', en: 'en' }[lang] };
}

let railWordNow = null;    // { lang, id, topic, view } of the card on screen

function renderRailWord() {
    const box = document.getElementById('rail-word');
    if (!box || !railVisible('rail-right')) return;
    const lang = railWordLang();
    const short = t('rail_lang_short').split('|');
    const chips = RAIL_WORD_LANGS.map((l, i) =>
        `<button type="button" class="rail-chip${l === lang ? ' on' : ''}" onclick="railPickLang('${l}')" aria-pressed="${l === lang}" title="${escHtml(t('dict_lang_' + TOPIC_FILE_LANG[l]))}">${escHtml(short[i] || l)}</button>`).join('');
    const now = new Date();
    const head = `<div class="rail-head"><h4 class="rail-title">${escHtml(t('rail_word_title'))}</h4><span class="rail-date">${now.getMonth() + 1}/${now.getDate()}</span></div>
        <div class="rail-chips">${chips}</div>`;
    railTodayWord(lang).then(({ id, topic, row }) => {
        if (railWordLang() !== lang || !row) return;
        const v = railWordView(lang, row);
        railWordNow = { lang, id, topic, view: v };
        box.innerHTML = head + `
            <div class="rail-word" lang="${v.htmlLang}">${escHtml(v.word)}</div>
            ${v.reading ? `<div class="rail-reading" lang="${v.htmlLang}">${escHtml(v.reading)}</div>` : ''}
            <div class="rail-meaning">${escHtml(v.meaning)}</div>
            <div class="rail-word-foot">
                <button type="button" class="speak-btn rail-speak" onclick="railSpeak()" aria-label="${escHtml(t('alpha_play_word'))}" title="${escHtml(t('alpha_play_word'))}">🔊</button>
                <button type="button" class="pc-link rail-topic" onclick="railOpenTopic()">${TOPIC_EMOJI[topic]} ${escHtml(t('rail_word_go', { topic: t('topic_' + topic) }))}</button>
            </div>`;
    }).catch(() => {
        box.innerHTML = head + `<p class="rail-note">${escHtml(t('load_fail_no_cache'))}</p>`;
    });
}

function railSpeak() {
    if (!railWordNow) return;
    const v = railWordNow.view;
    speakText(v.speak, v.tts, v.kana ? { reading: v.kana } : undefined);
    if (railLoad('rail_word_heard') !== railDayKey(new Date())) {
        railStore('rail_word_heard', railDayKey(new Date()));
        renderRailTasks();
    }
}

function railOpenTopic() {
    if (railWordNow) homeOpenSet(railWordNow.id);
}

/* the last 14 days, oldest first, shaded by words practised against the daily goal */
function renderRailCalendar() {
    const box = document.getElementById('rail-cal');
    if (!box) return;
    const act = getDailyActivity();
    const goal = getDailyGoal();
    const fmt = d => { try { return d.toLocaleDateString(siteLang === 'zh' ? 'zh-TW' : siteLang === 'zh-Hans' ? 'zh-CN' : siteLang, { month: 'numeric', day: 'numeric', weekday: 'short' }); } catch { return railDayKey(d); } };
    const today = new Date();
    let cells = '';
    let days = 0;
    for (let i = 13; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
        const n = act[railDayKey(d)] || 0;
        if (n > 0) days++;
        const level = n === 0 ? '' : n >= goal ? ' full' : ' some';
        cells += `<span class="rail-day${level}${i === 0 ? ' today' : ''}" title="${escHtml(fmt(d) + ' · ' + n)}">${d.getDate()}</span>`;
    }
    box.innerHTML = `<div class="rail-head"><h4 class="rail-title">${escHtml(t('rail_cal_title'))}</h4><span class="rail-date">${escHtml(t('rail_cal_days', { n: days }))}</span></div>
        <div class="rail-cal">${cells}</div>`;
}

function renderRailTasks() {
    const box = document.getElementById('rail-tasks');
    if (!box || railPage !== 'home') return;
    const today = homeTodayCount();
    const goal = getDailyGoal();
    const due = srsQuizDueCount();
    const tasks = [
        { done: today >= goal, text: t('rail_task_goal', { n: Math.min(today, goal), m: goal }), call: 'homeContinue()' },
        { done: due === 0, text: due === 0 ? t('rail_task_srs_done') : t('rail_task_srs', { n: due }), call: 'homeOpenSrs()' },
        { done: railLoad('rail_word_heard') === railDayKey(new Date()), text: t('rail_task_word'), call: 'railSpeak()' }
    ];
    const n = tasks.filter(x => x.done).length;
    box.innerHTML = `<div class="rail-head"><h4 class="rail-title">${escHtml(t('rail_tasks_title'))}</h4><span class="rail-date">${n}/${tasks.length}</span></div>
        <ul class="rail-tasks">${tasks.map(x => `<li><button type="button" class="rail-task${x.done ? ' done' : ''}" onclick="${x.call}">
            <span class="rail-check" aria-hidden="true">${x.done ? '✓' : ''}</span><span>${escHtml(x.text)}</span></button></li>`).join('')}</ul>`;
}

/* The rails start below the header, whose height changes with the language and
   the window; the bubble goes beside 小花火 when there is room on her left. */
function railPlace() {
    const header = document.querySelector('header');
    if (header) document.documentElement.style.setProperty('--rail-top', (header.offsetTop + header.offsetHeight + 16) + 'px');
    const left = document.getElementById('rail-left');
    if (left && railVisible('rail-left')) left.classList.toggle('bubble-side', left.getBoundingClientRect().left >= 250);
}

function renderRails() {
    railPlace();
    const left = document.getElementById('rail-left');
    const right = document.getElementById('rail-right');
    if (left) left.setAttribute('aria-label', t('rail_poke'));
    if (right) right.setAttribute('aria-label', t('rail_word_title'));
    document.body.classList.toggle('rail-home', railPage === 'home');
    if (!railVisible('rail-right')) return;
    renderRailWord();
    if (railPage === 'home') {
        renderRailCalendar();
        renderRailTasks();
    }
}

/* switchPage() calls this once the page is shown. */
function railsOnPage(page) {
    railPage = page;
    renderRails();
    if (railSeenPages.has(page) || !railVisible('rail-left')) return;
    railSeenPages.add(page);
    setTimeout(() => { if (railPage === page) pokeSay(RAIL_CTX[page] || 'ctx_other'); }, 500);
}

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('poke-btn');
    if (!btn) return;
    btn.addEventListener('click', pokeClick);
    pokeLoadAlpha();
    railPage = document.body.dataset.page || 'home';
    railSeenPages.add(railPage);
    renderRails();
    // web fonts can change the header's height after load
    window.addEventListener('load', railPlace);
    // on the quiz page only the path is 1180px wide; the other cards keep 680px,
    // so the rails move in next to them (body.quiz-wide, css/rails.css)
    const path = document.getElementById('path-card');
    if (path) {
        const sync = () => {
            document.body.classList.toggle('quiz-wide', path.style.display !== 'none');
            railPlace();
        };
        new MutationObserver(sync).observe(path, { attributes: true, attributeFilter: ['style'] });
        sync();
    }
    // the rails appear when the window gets wide enough: fill them in then
    window.addEventListener('resize', () => {
        clearTimeout(window._railResize);
        window._railResize = setTimeout(renderRails, 200);
    });
});
