/* ===== Learning path (#path-card / #lesson-card, both inside #page-quiz) =====
   Every built-in word set (QUIZ_LANG_ORDER) is cut, in sheet order, into levels of
   LESSON_SIZE words, grouped into units of LEVELS_PER_UNIT. A level is a preview of
   its words followed by a quiz that asks each of them once; LESSON_PASS_PCT unlocks
   the next level. Progress is localStorage.path_progress_v2 = { setId: { done, best } }
   where `done` = how many levels in a row are passed (so level index `done` is the
   one to play next) and best[i] = best % on level i.

   Levels follow the sheet's row order, so inserting rows in the middle of a sheet
   shifts later words to other levels; progress (a count) stays put.

   The quiz part reuses the review engine in js/quiz.js (reviewMode with
   reviewSource = 'lesson'): each word becomes an entry shaped like an SRS card /
   mistake (lessonEntryFor), so lesson answers also grade SRS cards and wrong ones
   go to the mistake book. quiz.js calls back into lessonResultHtml(),
   lessonAgain() and lessonBack(). */

const LESSON_SIZE = 10;
const LESSON_PASS_PCT = 80;
const LEVELS_PER_UNIT = 10;
const PATH_NODE_OFFSETS = [0, 44, 66, 44, 0, -44, -66, -44]; // zigzag, px

let lessonSetId = '';
let lessonLevel = 0;
let lessonPassed = false;

/* v2 since the word sets moved to data/vocab/ (2026-10): the old sheet-order levels
   held different words, so their progress is not carried over. SRS cards and the
   mistake book are keyed by word and are unaffected. */
const PATH_PROGRESS_KEY = 'path_progress_v2';

function getPathProgress() {
    try { return JSON.parse(localStorage.getItem(PATH_PROGRESS_KEY)) || {}; } catch { return {}; }
}

function getSetProgress(setId) {
    const p = getPathProgress()[setId];
    return { done: (p && p.done) || 0, best: (p && p.best) || {} };
}

function saveSetProgress(setId, prog) {
    const all = getPathProgress();
    all[setId] = prog;
    try { localStorage.setItem(PATH_PROGRESS_KEY, JSON.stringify(all)); } catch {}
}

function levelCountFor(wordCount) {
    return Math.ceil(wordCount / LESSON_SIZE);
}

function levelWords(level) {
    return vocabularyList.slice(level * LESSON_SIZE, (level + 1) * LESSON_SIZE);
}

/* One word as a question entry, with the same id/shape quizEntryFor() gives the
   regular quiz: Japanese kanji words are asked for their reading, Chinese words for
   their (English) meaning with pinyin as the hint, everything else for its meaning —
   in English when the site isn't in Chinese and the sheet has an English column. */
function lessonEntryFor(setId, w) {
    const uiChinese = siteLang === 'zh' || siteLang === 'zh-Hans';
    if (isChineseQuizLang(setId)) {
        const zct = siteLang === 'zh-Hans' ? 'simp' : 'trad';
        const shown = (zct === 'simp' ? w.simp : w.trad) || w.word;
        return { id: setId + '|' + shown + '|zh-meaning', lang: setId, word: shown,
                 answer: w.meaning, hint: w.roman || '', group: 'zh-meaning', zct: zct };
    }
    const useEn = !uiChinese && !!w.english;
    if (isJapaneseQuizLang(setId) && hasKanji(w.word) && w.kana) {
        return { id: setId + '|' + w.word + '|reading', lang: setId, word: w.word,
                 answer: w.kana, hint: useEn ? w.english : w.meaning, group: 'reading' };
    }
    const group = useEn ? 'meaning-en' : 'meaning-zh';
    return { id: setId + '|' + w.word + '|' + group, lang: setId, word: w.word,
             answer: useEn ? w.english : w.meaning, hint: w.kana || '', group: group };
}

function hidePathCards() {
    ['path-card', 'lesson-card'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

/* What a word set opens on once it's loaded: its path, or (a pasted custom sheet
   has no path) the regular mode picker. */
function showSetStart() {
    if (QUIZ_LANG_ORDER.includes(currentLang)) showLessonPath();
    else showFreePractice();
}

function showFreePractice() {
    hidePathCards();
    if (isChineseQuizLang(currentLang)) showChineseSelection();
    else showModeSelection();
}

/* The mode picker's "返回" returns to the path when there is one. */
function modeCardBack() {
    if (QUIZ_LANG_ORDER.includes(currentLang) && vocabularyList.length > 0) {
        document.getElementById('mode-card').style.display = 'none';
        showLessonPath();
    } else {
        backToLanguage();
    }
}

function showLessonPath() {
    showOnlyQuizCard('path-card');
    renderLessonPath();
    const current = document.querySelector('#path-units .path-node.current');
    if (current) setTimeout(() => current.scrollIntoView({ block: 'center', behavior: 'smooth' }), 150);
}

let pathViewUnit = 0;
let pathViewSet = '';

function renderLessonPath(keepView) {
    const card = document.getElementById('path-card');
    if (!card || !currentLang) return;
    const levels = levelCountFor(vocabularyList.length);
    const prog = getSetProgress(currentLang);
    const done = Math.min(prog.done, levels);

    document.getElementById('path-title').textContent = wordSetName(currentLang);
    document.getElementById('path-sub').textContent = done >= levels
        ? t('path_all_done')
        : t('path_progress', { n: done, m: levels });
    document.getElementById('path-bar-fill').style.width = (levels ? Math.round(done / levels * 100) : 0) + '%';
    // credit the list's source (CC BY / BY-SA need it); unknown for a cached or sheet set
    const src = document.getElementById('path-source');
    if (src) {
        src.textContent = currentSetMeta && currentSetMeta.source
            ? t('path_source', { s: currentSetMeta.source, l: currentSetMeta.license })
            : '';
    }

    const currentUnit = Math.floor(Math.min(done, levels - 1) / LEVELS_PER_UNIT);
    const units = Math.ceil(levels / LEVELS_PER_UNIT);
    // the unit shown on the desktop stage: the one in progress, unless picked
    if (!keepView || pathViewSet !== currentLang || pathViewUnit >= units) {
        pathViewUnit = currentUnit;
        pathViewSet = currentLang;
    }
    const unitInfo = u => {
        const first = u * LEVELS_PER_UNIT;
        const last = Math.min(first + LEVELS_PER_UNIT, levels) - 1;
        const unitDone = done > last;
        const unitLocked = done < first;
        return { first, last, unitDone, unitLocked, state: unitDone ? 'done' : unitLocked ? 'locked' : 'current' };
    };
    const unitHead = (u, info) => `
        <span class="path-unit-name">${escHtml(t('path_unit', { n: u + 1 }))}</span>
        <span class="path-unit-range">${escHtml(t('path_unit_range', { a: info.first + 1, b: info.last + 1 }))}</span>
        <span class="path-unit-state">${info.unitDone ? '✓ ' + escHtml(t('path_unit_done')) : info.unitLocked ? '🔒' : ''}</span>`;
    const unitNodes = info => {
        let nodes = '';
        for (let i = info.first; i <= info.last; i++) {
            const st = i < done ? 'done' : i === done ? 'current' : 'locked';
            const icon = st === 'done' ? '✓' : st === 'current' ? '★' : '🔒';
            const best = prog.best[i];
            const x = PATH_NODE_OFFSETS[(i - info.first) % PATH_NODE_OFFSETS.length];
            nodes += `<div class="path-node-wrap" style="--x:${x}px">
                ${st === 'current' ? `<span class="path-start">${escHtml(t('path_start'))}</span>` : ''}
                <button class="path-node ${st}" onclick="pathOpenLevel(${i})" aria-label="${escHtml(t('path_level', { n: i + 1 }))}"><span>${icon}</span></button>
                <span class="path-node-label">${escHtml(t('path_level', { n: i + 1 }))}${typeof best === 'number' ? ` · ${best}%` : ''}</span>
            </div>`;
        }
        return nodes + `<div class="path-chest ${info.unitDone ? 'open' : ''}" aria-hidden="true">${info.unitDone ? '🏆' : '🎁'}</div>`;
    };

    // phones: every unit as a collapsible section
    let accordion = '';
    // desktop: the picked unit's levels on the left, the list of units on the right
    let list = '';
    for (let u = 0; u < units; u++) {
        const info = unitInfo(u);
        accordion += `<details class="path-unit ${info.state}" ${u === currentUnit ? 'open' : ''}>
            <summary class="path-unit-head">${unitHead(u, info)}</summary>
            <div class="path-nodes">${unitNodes(info)}</div>
        </details>`;
        const passed = Math.max(0, Math.min(done, info.last + 1) - info.first);
        list += `<button type="button" class="path-unit-btn ${info.state} ${u === pathViewUnit ? 'selected' : ''}" onclick="pathShowUnit(${u})"${u === pathViewUnit ? ' aria-current="true"' : ''}>
            ${unitHead(u, info)}
            <span class="path-unit-count">${passed}/${info.last - info.first + 1}</span>
        </button>`;
    }
    const view = unitInfo(pathViewUnit);
    document.getElementById('path-units').innerHTML =
        `<div class="path-accordion">${accordion}</div>
        <div class="path-wide${units === 1 ? ' path-one-unit' : ''}">
            <div class="path-stage path-unit ${view.state}">
                <div class="path-unit-head">${unitHead(pathViewUnit, view)}</div>
                <div class="path-nodes">${unitNodes(view)}</div>
            </div>
            <div class="path-unit-list">${list}</div>
        </div>`;
    const sel = document.querySelector('.path-unit-btn.selected');
    if (sel && !keepView) sel.parentNode.scrollTop = Math.max(0, sel.offsetTop - sel.parentNode.offsetTop - 80);
}

// desktop unit list: show that unit's levels on the stage
function pathShowUnit(u) {
    const list = document.querySelector('.path-unit-list');
    const top = list ? list.scrollTop : 0;
    pathViewUnit = u;
    renderLessonPath(true);
    const again = document.querySelector('.path-unit-list');
    if (again) again.scrollTop = top;
}

function pathOpenLevel(level) {
    const prog = getSetProgress(currentLang);
    if (level > prog.done) {
        showShareToast(t('path_locked'));
        return;
    }
    showLessonPreview(level);
}

/* ----- a level: preview, then quiz ----- */

function showLessonPreview(level) {
    lessonSetId = currentLang;
    lessonLevel = level;
    ['path-card', 'quiz-card', 'result-card', 'mode-card']
        .forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    document.getElementById('lesson-card').style.display = 'block';
    renderLessonPreview();
    window.scrollTo(0, 0);
}

function renderLessonPreview() {
    const words = levelWords(lessonLevel);
    document.getElementById('lesson-title').textContent =
        t('path_level', { n: lessonLevel + 1 }) + ' · ' + t('lesson_preview_title');
    document.getElementById('lesson-hint').textContent = t('lesson_preview_hint', { n: words.length });
    document.getElementById('lesson-list').innerHTML = words.map((w, i) => {
        const e = lessonEntryFor(lessonSetId, w);
        const reading = isChineseQuizLang(lessonSetId)
            ? [w.bopomofo, w.roman].filter(Boolean).join(' · ')
            : (w.kana || '');
        const meaning = e.group === 'reading' ? e.hint : e.answer;
        return `<li class="lesson-word">
            <div class="lesson-word-main">
                <span class="lesson-word-text">${escHtml(e.word)}</span>
                ${reading ? `<span class="lesson-word-reading">${escHtml(reading)}</span>` : ''}
            </div>
            <div class="lesson-word-meaning">${escHtml(meaning || '')}</div>
            <button class="speak-btn lesson-speak" onclick="lessonSpeak(${i})" aria-label="🔊">🔊</button>
        </li>`;
    }).join('');
}

function lessonSpeak(i) {
    const w = levelWords(lessonLevel)[i];
    if (!w) return;
    const e = lessonEntryFor(lessonSetId, w);
    currentLang = lessonSetId;
    if (e.zct) zhCharType = e.zct;
    currentWord = Object.assign({}, w, { word: e.word });
    speakWord();
}

function startLessonQuiz() {
    const words = levelWords(lessonLevel);
    if (words.length === 0) return;
    const entries = words.map(w => lessonEntryFor(lessonSetId, w)).filter(e => e.answer);
    stopTimer();
    quizTimerSec = 0;
    currentListeningMode = false;
    reviewMode = true;
    reviewSource = 'lesson';
    lessonPassed = false;
    currentLang = lessonSetId;
    // wrong options come from the whole set, not just this level's ten words
    reviewPool = vocabularyList.map(w => lessonEntryFor(lessonSetId, w)).filter(e => e.answer);
    reviewList = shuffleArray(entries);
    reviewIdx = 0;
    score = 0;
    questionNum = 0;
    quizHistory = [];
    totalQuestions = reviewList.length;

    document.getElementById('lesson-card').style.display = 'none';
    document.getElementById('result-card').style.display = 'none';
    document.getElementById('quiz-card').style.display = 'block';
    document.getElementById('quiz-mode-label').innerText = t('path_level', { n: lessonLevel + 1 });
    document.getElementById('total-words').innerText = t('quiz_words', { n: reviewList.length });
    setQuizBackLabels('lesson');
    nextQuestion();
}

/* Called by showResults() for a lesson: records the result and returns the
   pass/fail banner shown above the score. */
function lessonResultHtml(pct) {
    const prog = getSetProgress(lessonSetId);
    lessonPassed = pct >= LESSON_PASS_PCT;
    prog.best[lessonLevel] = Math.max(prog.best[lessonLevel] || 0, pct);
    if (lessonPassed && prog.done === lessonLevel) prog.done = lessonLevel + 1;
    saveSetProgress(lessonSetId, prog);

    const levels = levelCountFor(vocabularyList.length);
    const isLast = lessonLevel + 1 >= levels;
    setResultAgainLabel(lessonPassed ? (isLast ? 'lesson_back_path' : 'lesson_next') : 'lesson_retry');
    const msg = lessonPassed
        ? t('lesson_pass', { p: pct })
        : t('lesson_fail', { p: pct, need: LESSON_PASS_PCT });
    return `<div class="lesson-result ${lessonPassed ? 'pass' : 'fail'}">${escHtml(msg)}</div>`;
}

/* "再來一次" after a lesson: next level when passed, the same quiz again otherwise. */
function lessonAgain() {
    const levels = levelCountFor(vocabularyList.length);
    if (lessonPassed) {
        endReviewState();
        if (lessonLevel + 1 < levels) showLessonPreview(lessonLevel + 1);
        else showLessonPath();
    } else {
        startLessonQuiz();
    }
}

/* "返回" during or after a lesson goes back to the path. */
function lessonBack() {
    endReviewState();
    currentLang = lessonSetId;
    showLessonPath();
}

/* Path progress for the dashboard's recent-sets cards; needs the set's cached word
   count, so it's null for a set that was never loaded on this device. */
function pathSummary(setId) {
    const cache = getVocabCache(setId);
    if (!cache || !cache.vocabularyList || !cache.vocabularyList.length) return null;
    const levels = levelCountFor(cache.vocabularyList.length);
    return { done: Math.min(getSetProgress(setId).done, levels), levels: levels };
}
