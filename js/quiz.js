const PLAYLISTS = {
    all: '0QFBFg35lFuDvuYapAolHC',
    cn: '5XQgwQcuRRBcyVaKMQbB88'
};

applyLang(siteLang);

function switchPage(page, el) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');

    const pages = ['guide', 'about', 'quiz', 'examquiz', 'notes', 'music', 'games', 'rhythm', 'guestbook', 'feedback'];
    const main = document.querySelector('main');
    main.style.opacity = '0';
    main.style.transition = 'opacity 0.2s ease';

    if (page !== 'games' && typeof stopAllGames === 'function') stopAllGames();

    setTimeout(() => {
        pages.forEach(p => {
            const el = document.getElementById('page-' + p);
            if (el) el.style.display = p === page ? 'block' : 'none';
        });
        main.style.opacity = '1';
        if (page === 'guestbook') loadGuestbookMessages();
        if (page === 'notes') renderNotes();
    }, 200);
}

/* ===================== Tab Visibility Settings ===================== */

const ALL_TABS = ['guide', 'about', 'quiz', 'examquiz', 'notes', 'music', 'games', 'rhythm', 'guestbook', 'feedback'];
const LOCKED_TABS = ['guide'];

function getTabVisibility() {
    const v = {};
    ALL_TABS.forEach(k => v[k] = true);
    try {
        const saved = JSON.parse(localStorage.getItem('nav_tab_visibility'));
        if (saved && typeof saved === 'object') {
            ALL_TABS.forEach(k => { if (saved[k] === false) v[k] = false; });
        }
    } catch {}
    LOCKED_TABS.forEach(k => v[k] = true);
    return v;
}

function saveTabVisibility(v) {
    localStorage.setItem('nav_tab_visibility', JSON.stringify(v));
}

function applyTabVisibility() {
    const v = getTabVisibility();

    ALL_TABS.forEach(key => {
        const btn = document.querySelector(`.nav-btn[data-tab="${key}"]`);
        if (btn) btn.style.display = v[key] ? '' : 'none';
    });

    const activeBtn = document.querySelector('.nav-btn.active');
    const activeKey = activeBtn && activeBtn.dataset.tab;
    if (activeKey && !v[activeKey]) {
        const firstVisible = ALL_TABS.find(k => v[k]);
        const btn = document.querySelector(`.nav-btn[data-tab="${firstVisible}"]`);
        if (btn) switchPage(firstVisible, btn);
    }
}

function renderTabSettingsList() {
    const v = getTabVisibility();
    const container = document.getElementById('tab-settings-list');
    if (!container) return;
    container.innerHTML = ALL_TABS.map(key => {
        const label = t('nav_' + key) || key;
        if (LOCKED_TABS.includes(key)) {
            return `<label class="tab-settings-item locked" title="${t('tab_settings_locked')}">
                <input type="checkbox" checked disabled>
                <span>${label}</span>
                <span class="tab-settings-lock">&#x1F512;</span>
            </label>`;
        }
        return `<label class="tab-settings-item">
            <input type="checkbox" data-tab-key="${key}" ${v[key] ? 'checked' : ''} onchange="onTabSettingChange(this)">
            <span>${label}</span>
        </label>`;
    }).join('');
}

function onTabSettingChange(input) {
    const key = input.dataset.tabKey;
    const v = getTabVisibility();
    v[key] = input.checked;
    saveTabVisibility(v);
    applyTabVisibility();
}

function toggleTabSettings() {
    const overlay = document.getElementById('tab-settings-overlay');
    if (!overlay) return;
    const show = overlay.style.display === 'none' || !overlay.style.display;
    if (show) renderTabSettingsList();
    overlay.style.display = show ? 'flex' : 'none';
}

function resetTabSettings() {
    const v = {};
    ALL_TABS.forEach(k => v[k] = true);
    saveTabVisibility(v);
    applyTabVisibility();
    renderTabSettingsList();
}

function copyTabSettingsLink() {
    const v = getTabVisibility();
    const visible = ALL_TABS.filter(k => v[k]);
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('tabs', visible.join(','));
    const link = url.toString();
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link)
            .then(() => showShareToast(t('tab_settings_copied')))
            .catch(() => prompt(t('tab_settings_copy'), link));
    } else {
        prompt(t('tab_settings_copy'), link);
    }
}

function initTabVisibility() {
    const params = new URLSearchParams(location.search);
    const tabsParam = params.get('tabs');
    if (tabsParam !== null) {
        const requested = tabsParam.split(',').map(s => s.trim()).filter(k => ALL_TABS.includes(k));
        const v = {};
        ALL_TABS.forEach(k => v[k] = requested.includes(k));
        LOCKED_TABS.forEach(k => v[k] = true);
        saveTabVisibility(v);
        params.delete('tabs');
        const cleanUrl = location.pathname + (params.toString() ? '?' + params.toString() : '') + location.hash;
        history.replaceState(null, '', cleanUrl);
    }
    applyTabVisibility();
}

let currentSpotifyPlaylist = PLAYLISTS.all;

function switchMusicTab(lang, btn) {
    document.querySelectorAll('.music-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSpotifyPlaylist = PLAYLISTS[lang];
    document.getElementById('music-iframe').src = `https://open.spotify.com/embed/playlist/${PLAYLISTS[lang]}?utm_source=generator&theme=0`;
}

const SHEETS = {
    jp: 'https://docs.google.com/spreadsheets/d/134jLu-WAoCx7VK7aTsnEYbWJPQPA56Su2Vsez3jFRPw/export?format=csv&gid=0',
    kr: 'https://docs.google.com/spreadsheets/d/1BsO7tpzFgO39AyBo2SV1RZFDWfPECB-LzWBGA87nbQA/export?format=csv&gid=0',
    fr: 'https://docs.google.com/spreadsheets/d/1Ki0fuTZb1netmpSOBd8uJbZnYhgtD17aEtGQb3Ehb3Y/export?format=csv&gid=0',
    en: 'https://docs.google.com/spreadsheets/d/1Uof80EqNrC3SrtAcce0OgQDr_MRpqcxCQCb2oQS4I0s/export?format=csv&gid=0',
    zh: 'https://docs.google.com/spreadsheets/d/1dHIWN5lOINUzeLvTD7zsnpORSBLdlgsF_T8VMX8pTFA/export?format=csv&gid=0'
};

const JLPT_SHEETS = {
    jlpt_n5: 'https://docs.google.com/spreadsheets/d/12B2ZV8eGUO7d1-YcWNLTlqDptkNrhsQvijyjed6Y_TE/export?format=csv&gid=0',
    jlpt_n4: 'https://docs.google.com/spreadsheets/d/1unwngsmxA4_HoNMO9l0-mN4dkhrQF7vYbbHgdSDY4SQ/export?format=csv&gid=0',
    jlpt_n3: 'https://docs.google.com/spreadsheets/d/1Tw8Ll29yjH-AkYlVWjTlWSY1Kh33Jxj_gqxWWcVs4NQ/export?format=csv&gid=0',
    jlpt_n2: 'https://docs.google.com/spreadsheets/d/1GKE8uKb8mH8PSHYELErZbzrYAgU19u1eBLTJsy67S-4/export?format=csv&gid=0',
    jlpt_n1: 'https://docs.google.com/spreadsheets/d/1zHezXxlkiSKsIzFCyUMBCLRNOxQV0zwvAgYnMFqnQ38/export?format=csv&gid=0'
};

const TOPIK_SHEETS = {
    topik_1: 'https://docs.google.com/spreadsheets/d/1XJTpFBly3hRNBBBnZoAzJneOXwJajbC4KqniSRfSPUg/export?format=csv&gid=0',
    topik_2: 'https://docs.google.com/spreadsheets/d/1FBjH5ObsgShVevgMcXXJDmsmh0JQBzk6DDsJAyi6kaE/export?format=csv&gid=0',
    topik_3: 'https://docs.google.com/spreadsheets/d/1pVOTCK3e2OgAhdktgVb29j4vUlKpmIULk2OnkiPeNA0/export?format=csv&gid=0',
    topik_4: 'https://docs.google.com/spreadsheets/d/1UZJ29Jxl8pjM4eZREWKed8YRkPpjRIKkSfzfYFaAlig/export?format=csv&gid=0'
};

let currentLang = '';
let vocabularyList = [];
let readingList = [];
let meaningList = [];
let currentWord = null;
let currentMode = 'meaning';
let score = 0;
let questionNum = 0;
let answered = false;
let totalQuestions = 0;
let quizHistory = [];
let needAnswerLang = false;
let shuffledVocab = [];
let shuffledReading = [];
let shuffledMeaning = [];
let vocabIdx = 0;
let readingIdx = 0;
let meaningIdx = 0;
let zhCharType = '';   // 'trad' | 'simp'
let zhTestType = '';   // 'bopomofo' | 'roman' | 'meaning'

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function playSound(correct) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        if (correct) {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523, ctx.currentTime);
            osc.frequency.setValueAtTime(659, ctx.currentTime + 0.08);
            osc.frequency.setValueAtTime(784, ctx.currentTime + 0.16);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.4);
        } else {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, ctx.currentTime);
            osc.frequency.setValueAtTime(180, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.35);
        }
    } catch(e) {}
}

/* JLPT levels (jlpt_n5, jlpt_n4, ...) are all Japanese vocab, so treat them
   the same as 'jp' anywhere quiz.js branches on currentLang for language
   (not sheet-loading) purposes — see isJapaneseQuizLang() call sites. */
function isJapaneseQuizLang(lang) {
    return lang === 'jp' || lang.startsWith('jlpt_');
}

/* TOPIK levels (topik_1, topik_2, ...) are all Korean vocab, so treat them
   the same as 'kr' anywhere quiz.js branches on currentLang for language
   (not sheet-loading) purposes — see isKoreanQuizLang() call sites. */
function isKoreanQuizLang(lang) {
    return lang === 'kr' || lang.startsWith('topik_');
}

function speakWord() {
    if (!currentWord || !currentWord.word) return;
    window.speechSynthesis.cancel();
    const speakText = currentWord.word.includes(' / ') ? pickOneVariant(currentWord.word) : currentWord.word;
    const utter = new SpeechSynthesisUtterance(speakText);
    utter.lang = isJapaneseQuizLang(currentLang) ? 'ja-JP' : currentLang === 'fr' ? 'fr-FR' : currentLang === 'en' ? 'en-US' : currentLang === 'zh' ? (zhCharType === 'simp' ? 'zh-CN' : 'zh-TW') : 'ko-KR';
    utter.rate = 0.8;
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = isJapaneseQuizLang(currentLang) ? 'ja' : currentLang === 'fr' ? 'fr' : currentLang === 'en' ? 'en' : currentLang === 'zh' ? 'zh' : 'ko';
    const match = voices.find(v => v.lang.startsWith(langPrefix));
    if (match) utter.voice = match;
    window.speechSynthesis.speak(utter);
}

let autoSpeak = true;
let quizAnswerLang = 'zh';

function toggleAutoSpeak() {
    autoSpeak = !autoSpeak;
    const btn = document.getElementById('autoSpeakBtn');
    if (btn) btn.classList.toggle('speak-active', autoSpeak);
}

function extractSheetId(url) {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : url;
}

function isValidWord(word, meaning) {
    if (!word || !meaning) return false;
    const w = word.trim();
    const m = meaning.trim();
    if (w.includes('動畫') || w.includes('動画') || w.includes('동영상') || w.includes('註') || w.includes('★') || w.includes('單字')) return false;
    if (m.includes('動畫') || m.includes('動画') || m.includes('意思') || m.includes('註')) return false;
    if (/^\d+$/.test(w)) return false;
    if (w.length === 0 || m.length === 0) return false;
    return true;
}

function selectLanguage(lang) {
    currentLang = lang;
    document.getElementById('lang-card').style.display = 'none';
    document.getElementById('sheetUrlInput').value = SHEETS[lang];
    loadSheetData(SHEETS[lang]);
}

/* Certification-exam vocab sets (e.g. JLPT N5, TOPIK 1) live in their own
   Google Sheets (JLPT_SHEETS / TOPIK_SHEETS, one spreadsheet per level),
   fetched live via CSV export just like the general-language sheets in
   SHEETS — but each row is a single word, so no stride parsing is needed,
   just parseExamVocab()/parseTopikVocab() below. Only the specific level a
   visitor picks is ever fetched, and it's cached to localStorage the same
   way as the general languages (saveVocabCache/getVocabCache). */
function showJlptLevels() {
    document.getElementById('examquiz-card').style.display = 'none';
    document.getElementById('examquiz-jlpt-level-card').style.display = 'block';
}

function hideJlptLevels() {
    document.getElementById('examquiz-jlpt-level-card').style.display = 'none';
    document.getElementById('examquiz-card').style.display = 'block';
}

function showTopikLevels() {
    document.getElementById('examquiz-card').style.display = 'none';
    document.getElementById('examquiz-topik-level-card').style.display = 'block';
}

function hideTopikLevels() {
    document.getElementById('examquiz-topik-level-card').style.display = 'none';
    document.getElementById('examquiz-card').style.display = 'block';
}

function parseExamVocab(rows) {
    rows.forEach((row, idx) => {
        if (idx === 0) return; // header row: word,kana,meaning,english
        if (row.length < 4) return;
        addWord(row[0], row[1], row[2], row[3]);
    });
}

/* TOPIK sheets have no reading column (Korean is already written in hangul,
   no furigana-like reading needed) — word,meaning,english. */
function parseTopikVocab(rows) {
    rows.forEach((row, idx) => {
        if (idx === 0) return; // header row: 韓文單字,繁體中文翻譯,English
        if (row.length < 3) return;
        addWord(row[0], '', row[1], row[2]);
    });
}

function selectExamSet(examId) {
    currentLang = examId;
    vocabularyList = [];
    readingList = [];
    meaningList = [];
    document.getElementById('lang-card').style.display = 'none';
    switchPage('quiz', document.querySelector('.nav-btn[data-tab="quiz"]'));

    const setupCard = document.getElementById('setup-card');
    const statusMsg = document.getElementById('status-msg');
    setupCard.style.display = 'block';
    document.getElementById('mistake-card').style.display = 'none';
    document.getElementById('stats-card').style.display = 'none';
    statusMsg.innerText = '正在讀取 Google 試算表單字庫...';
    statusMsg.style.color = '#c8a2e0';

    const isTopik = examId.startsWith('topik_');
    const sheetUrl = isTopik ? TOPIK_SHEETS[examId] : JLPT_SHEETS[examId];

    Papa.parse(sheetUrl, {
        download: true,
        header: false,
        complete: function(results) {
            if (isTopik) parseTopikVocab(results.data);
            else parseExamVocab(results.data);
            if (vocabularyList.length >= 4) {
                saveVocabCache(currentLang);
                statusMsg.innerText = t('load_success', {n: vocabularyList.length}) + (readingList.length > 0 ? t('load_with_reading', {n: readingList.length}) : '');
                statusMsg.style.color = '#f472b6';
                showModeSelection();
            } else {
                statusMsg.innerText = `讀取到的單字不足（僅 ${vocabularyList.length} 個），無法出題！`;
                statusMsg.style.color = '#ff5252';
            }
        },
        error: function() {
            const cached = getVocabCache(currentLang);
            if (cached && cached.vocabularyList && cached.vocabularyList.length >= 4) {
                vocabularyList = cached.vocabularyList;
                readingList = cached.readingList || [];
                statusMsg.innerText = t('load_offline_cache', {n: vocabularyList.length});
                statusMsg.style.color = '#fbbf24';
                showModeSelection();
            } else {
                statusMsg.innerText = t('load_fail_no_cache');
                statusMsg.style.color = '#ff5252';
            }
        }
    });
}

function saveVocabCache(lang) {
    try {
        localStorage.setItem('quiz_cache_' + lang, JSON.stringify({ vocabularyList, readingList }));
    } catch (e) {}
}

function getVocabCache(lang) {
    try { return JSON.parse(localStorage.getItem('quiz_cache_' + lang)); }
    catch { return null; }
}

function loadSheetData(url) {
    const statusMsg = document.getElementById('status-msg');
    const setupCard = document.getElementById('setup-card');
    setupCard.style.display = 'block';
    document.getElementById('mistake-card').style.display = 'none';
    document.getElementById('stats-card').style.display = 'none';

    const sheetId = extractSheetId(url);
    if (!sheetId) {
            alert(t('invalid_url'));
        return;
    }

    statusMsg.innerText = '正在讀取 Google 試算表單字庫...';
    statusMsg.style.color = '#c8a2e0';

    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;

    function finalizeLoad() {
        if (vocabularyList.length >= 4) {
            saveVocabCache(currentLang);
            statusMsg.innerText = t('load_success', {n: vocabularyList.length}) + (readingList.length > 0 ? t('load_with_reading', {n: readingList.length}) : '');
            statusMsg.style.color = '#f472b6';
            if (currentLang === 'zh') { showChineseSelection(); } else { showModeSelection(); }
        } else {
            statusMsg.innerText = `讀取到的單字不足（僅 ${vocabularyList.length} 個），無法出題！`;
            statusMsg.style.color = '#ff5252';
        }
    }

    Papa.parse(csvUrl, {
        download: true,
        header: false,
        complete: function(results) {
            const rows = results.data;
            vocabularyList = [];
            readingList = [];
            meaningList = [];

            if (currentLang === 'jp') {
                parseJapanese(rows);
                const csvUrl2 = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=1244107386`;
                Papa.parse(csvUrl2, {
                    download: true,
                    header: false,
                    complete: function(r2) { parseJapanese2(r2.data); finalizeLoad(); },
                    error: function() { finalizeLoad(); }
                });
            } else if (currentLang === 'fr') {
                parseFrench(rows);
                finalizeLoad();
            } else if (currentLang === 'en') {
                parseEnglish(rows);
                finalizeLoad();
            } else if (currentLang === 'zh') {
                parseChinese(rows);
                finalizeLoad();
            } else {
                parseKorean(rows);
                finalizeLoad();
            }
        },
        error: function() {
            const cached = getVocabCache(currentLang);
            if (cached && cached.vocabularyList && cached.vocabularyList.length >= 4) {
                vocabularyList = cached.vocabularyList;
                readingList = cached.readingList || [];
                statusMsg.innerText = t('load_offline_cache', {n: vocabularyList.length});
                statusMsg.style.color = '#fbbf24';
                if (currentLang === 'zh') { showChineseSelection(); } else { showModeSelection(); }
            } else {
                statusMsg.innerText = t('load_fail_no_cache');
                statusMsg.style.color = '#ff5252';
            }
        }
    });
}

function parseJapanese(rows) {
    rows.forEach((row) => {
        if (row.length < 6) return;
        addWord(row[2], row[3], row[4], row[5]);
        if (row.length > 8)  addWord(row[8], row[9], row[10], row[11]);
        if (row.length > 14) addWord(row[14], row[15], row[16], row[17]);
        if (row.length > 20) addWord(row[20], row[21], row[22], row[23]);
    });
}

function parseJapanese2(rows) {
    rows.forEach((row) => {
        if (row.length < 5) return;
        addWord(row[2], row[3], row[4], row[5]);
        if (row.length > 9)  addWord(row[7], row[8], row[9], row[10]);
        if (row.length > 14) addWord(row[12], row[13], row[14], row[15]);
        if (row.length > 19) addWord(row[17], row[18], row[19], row[20]);
    });
}

function parseKorean(rows) {
    rows.forEach((row) => {
        if (row.length < 5) return;
        addWord(row[2], '', row[3], row[4]);
        if (row.length > 9)  addWord(row[7], '', row[8], row[9]);
        if (row.length > 14) addWord(row[12], '', row[13], row[14]);
        if (row.length > 19) addWord(row[17], '', row[18], row[19]);
    });
}

function parseFrench(rows) {
    rows.forEach((row) => {
        if (row.length < 5) return;
        addWord(row[2], '', row[3], row[4]);
        if (row.length > 9)  addWord(row[7], '', row[8], row[9]);
        if (row.length > 14) addWord(row[12], '', row[13], row[14]);
        if (row.length > 19) addWord(row[17], '', row[18], row[19]);
    });
}

function parseEnglish(rows) {
    rows.forEach((row, idx) => {
        if (row.length < 4) return;
        const w = row[2] ? row[2].trim() : '';
        const m = row[3] ? row[3].trim() : '';
        if (!w || !m || /^\d+$/.test(w)) return;
        if (w.includes('單字') || w.includes('意思') || w.includes('Video') || w.includes('註')) return;
        vocabularyList.push({ word: w, kana: '', meaning: m, english: '' });
        if (row.length > 6 && row[6] && row[7]) {
            const w2 = row[6].trim(), m2 = row[7].trim();
            if (w2 && m2 && !/^\d+$/.test(w2) && !w2.includes('單字')) vocabularyList.push({ word: w2, kana: '', meaning: m2, english: '' });
        }
        if (row.length > 10 && row[10] && row[11]) {
            const w3 = row[10].trim(), m3 = row[11].trim();
            if (w3 && m3 && !/^\d+$/.test(w3) && !w3.includes('單字')) vocabularyList.push({ word: w3, kana: '', meaning: m3, english: '' });
        }
        if (row.length > 14 && row[14] && row[15]) {
            const w4 = row[14].trim(), m4 = row[15].trim();
            if (w4 && m4 && !/^\d+$/.test(w4) && !w4.includes('單字')) vocabularyList.push({ word: w4, kana: '', meaning: m4, english: '' });
        }
        if (row.length > 18 && row[18] && row[19]) {
            const w5 = row[18].trim(), m5 = row[19].trim();
            if (w5 && m5 && !/^\d+$/.test(w5) && !w5.includes('單字')) vocabularyList.push({ word: w5, kana: '', meaning: m5, english: '' });
        }
    });
}

function parseChinese(rows) {
    rows.forEach((row) => {
        [2, 9, 16, 23, 30].forEach(c => {
            if (row.length <= c + 5) return;
            addZhWord(row[c + 1], row[c + 2], row[c + 3], row[c + 4], row[c + 5]);
        });
    });
}

function addZhWord(trad, simp, bopomofo, roman, meaning) {
    const tr = trad ? trad.trim() : '';
    const si = simp ? simp.trim() : '';
    const bo = bopomofo ? bopomofo.trim() : '';
    const ro = roman ? roman.trim() : '';
    const me = meaning ? meaning.trim() : '';
    if (!tr || !si || !me) return;
    if (/^\d+$/.test(tr)) return;
    if (tr.includes('單字') || tr.includes('单字') || tr.includes('註') || me === 'Meaning') return;
    vocabularyList.push({ word: tr, trad: tr, simp: si, bopomofo: bo, roman: ro, meaning: me, kana: '', english: '' });
}

/* Japanese/JLPT vocab splits into two disjoint quiz pools so no word can
   leak its own answer: kanji words (hasKanji) only ever get asked as
   "reading" questions (readingList), kana-only words only ever get asked
   as "meaning" questions (meaningList). For non-Japanese languages
   hasKanji() is always false, so meaningList just mirrors vocabularyList. */
function addWord(word, kana, meaning, englishMeaning) {
    const w = word.trim();
    const k = kana ? kana.trim() : '';
    const m = meaning.trim();
    const e = englishMeaning ? englishMeaning.trim() : '';
    if (!isValidWord(w, m)) return;
    const entry = { word: w, kana: k, meaning: m, english: e };
    vocabularyList.push(entry);
    if (hasKanji(w)) {
        if (k.length > 0) readingList.push(entry);
    } else {
        meaningList.push(entry);
    }
}

function refreshDynamicContent() {
    const isVisible = (id) => {
        const el = document.getElementById(id);
        return el && el.style.display !== 'none';
    };
    if (isVisible('mode-card') && !isVisible('quiz-card')) {
        if (currentLang === 'zh' && selectedQuizMode === 'zh') {
            showChineseSelection();
        } else if (currentLang) {
            showModeSelection();
        }
        if (isVisible('timer-buttons')) showTimerOptions();
    }
    if (isVisible('flashcard-setup-card')) {
        const langBtns = document.getElementById('fc-lang-buttons');
        if (langBtns && langBtns.children.length > 0) {
            document.querySelectorAll('#fc-lang-buttons .mode-btn').forEach(b => {
                const key = b.getAttribute('data-i18n');
                if (key) b.innerText = t(key);
            });
        }
        const modeBtns = document.getElementById('fc-mode-buttons');
        if (modeBtns && modeBtns.children.length > 0 && flashcardLang) {
            selectFlashcardLang(flashcardLang, document.querySelector('#fc-lang-buttons .mode-btn-active'));
        }
        updateMasteredCount();
        const startBtn = document.getElementById('fc-start-btn');
        if (startBtn) startBtn.innerText = t('fc_start_flashcard');
    }
    if (isVisible('listening-setup-card') && listeningLang) {
        const langBtns = document.getElementById('lc-lang-buttons');
        if (langBtns && langBtns.children.length > 0) {
            document.querySelectorAll('#lc-lang-buttons .mode-btn').forEach(b => {
                const key = b.getAttribute('data-i18n');
                if (key) b.innerText = t(key);
            });
        }
        const modeBtns = document.getElementById('lc-mode-buttons');
        if (modeBtns && modeBtns.children.length > 0) {
            document.querySelectorAll('#lc-mode-buttons .mode-btn').forEach(b => {
                const key = b.getAttribute('data-i18n');
                if (key) b.innerText = t(key);
            });
        }
        const meaningBtns = document.getElementById('lc-meaning-buttons');
        if (meaningBtns && meaningBtns.children.length > 0) {
            document.querySelectorAll('#lc-meaning-buttons .mode-btn').forEach(b => {
                const key = b.getAttribute('data-i18n');
                if (key) b.innerText = t(key);
            });
        }
        const countBtns = document.getElementById('lc-count-buttons');
        if (countBtns && countBtns.children.length > 0) {
            document.querySelectorAll('#lc-count-buttons .mode-btn').forEach(b => {
                const key = b.getAttribute('data-i18n');
                if (key) b.innerText = t(key);
            });
        }
    }
    if (isVisible('mistake-card')) renderMistakeBook();
    if (isVisible('stats-card')) showQuizStats();
}

function setModeCardTitle(id, key) {
    const el = document.getElementById(id);
    if (!el) return;
    el.setAttribute('data-i18n', key);
    el.innerText = t(key);
}

function showModeSelection() {
    if (reviewMode) { reviewMode = false; showMistakeBook(); return; }
    document.getElementById('setup-card').style.display = 'none';
    document.getElementById('mode-card').style.display = 'block';
    document.getElementById('quiz-card').style.display = 'none';
    document.getElementById('result-card').style.display = 'none';
    document.getElementById('flashcard-card').style.display = 'none';
    document.getElementById('mistake-card').style.display = 'none';
    document.getElementById('stats-card').style.display = 'none';
    quizTimerSec = 0;
    stopTimer();

    setModeCardTitle('mode-title', 'mode_title');
    setModeCardTitle('answer-lang-title', 'answer_lang_title');

    const container = document.getElementById('mode-buttons');
    container.innerHTML = '';

    const skipModeSelection = isKoreanQuizLang(currentLang) || currentLang === 'fr' || currentLang === 'en';

    const btnMeaning = document.createElement('button');
    btnMeaning.className = 'mode-btn';
    const meaningKey = currentLang === 'en' ? 'mode_en_meaning' : isJapaneseQuizLang(currentLang) ? 'mode_jp_meaning' : currentLang === 'fr' ? 'mode_fr_meaning' : 'mode_kr_meaning';
    btnMeaning.setAttribute('data-i18n', meaningKey);
    btnMeaning.innerText = t(meaningKey);
    btnMeaning.onclick = function() { selectMode('meaning', this); };
    if (!isJapaneseQuizLang(currentLang) || meaningList.length >= 4) {
        container.appendChild(btnMeaning);
    }

    if (readingList.length >= 4 && currentLang !== 'fr' && currentLang !== 'en') {
        const btnReading = document.createElement('button');
        btnReading.className = 'mode-btn';
        btnReading.setAttribute('data-i18n', 'mode_jp_reading');
        btnReading.innerText = t('mode_jp_reading');
        btnReading.onclick = function() { selectMode('reading', this); };
        container.appendChild(btnReading);
    }

    if (!skipModeSelection) {
        const btnBoth = document.createElement('button');
        btnBoth.className = 'mode-btn';
        btnBoth.setAttribute('data-i18n', 'mode_both');
        btnBoth.innerText = t('mode_both');
        btnBoth.onclick = function() { selectMode('both', this); };
        container.appendChild(btnBoth);
    }

    document.getElementById('mode-title').style.display = skipModeSelection ? 'none' : '';
    container.style.display = skipModeSelection ? 'none' : '';

    needAnswerLang = vocabularyList.some(w => w.english && w.english.length > 0);
    document.getElementById('answer-lang-title').style.display = 'none';
    document.getElementById('answer-lang-buttons').style.display = 'none';
    document.getElementById('quiz-count-title').style.display = 'none';
    document.getElementById('quiz-count-buttons').style.display = 'none';
    document.getElementById('timer-title').style.display = 'none';
    document.getElementById('timer-buttons').style.display = 'none';

    const answerContainer = document.getElementById('answer-lang-buttons');
    answerContainer.innerHTML = '';
    const btnZh = document.createElement('button');
    btnZh.className = 'mode-btn';
    btnZh.setAttribute('data-i18n', 'answer_lang_zh');
    btnZh.innerText = t('answer_lang_zh');
    btnZh.onclick = function() { selectAnswerLang('zh', this); };
    answerContainer.appendChild(btnZh);
    const btnEn = document.createElement('button');
    btnEn.className = 'mode-btn';
    btnEn.setAttribute('data-i18n', 'answer_lang_en');
    btnEn.innerText = t('answer_lang_en');
    btnEn.onclick = function() { selectAnswerLang('en', this); };
    answerContainer.appendChild(btnEn);

    const countContainer = document.getElementById('quiz-count-buttons');
    countContainer.innerHTML = '';
    const counts = [{n: 10, key: 'quiz_count_10'}, {n: 20, key: 'quiz_count_20'}, {n: 30, key: 'quiz_count_30'}, {n: 0, key: 'quiz_count_all'}];
    counts.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'mode-btn count-btn';
        btn.setAttribute('data-i18n', c.key);
        btn.innerText = t(c.key);
        btn.onclick = function() { selectCount(c.n, this); };
        countContainer.appendChild(btn);
    });

    if (skipModeSelection) {
        selectMode('meaning', btnMeaning);
    }
}

let selectedQuizMode = 'meaning';

function showChineseSelection() {
    document.getElementById('setup-card').style.display = 'none';
    document.getElementById('mode-card').style.display = 'block';
    document.getElementById('quiz-card').style.display = 'none';
    document.getElementById('result-card').style.display = 'none';
    document.getElementById('mistake-card').style.display = 'none';
    document.getElementById('stats-card').style.display = 'none';

    zhCharType = '';
    zhTestType = '';
    selectedQuizMode = 'zh';
    needAnswerLang = true;

    setModeCardTitle('mode-title', 'zh_char_title');
    setModeCardTitle('answer-lang-title', 'zh_test_title');

    const container = document.getElementById('mode-buttons');
    container.innerHTML = '';
    const btnTrad = document.createElement('button');
    btnTrad.className = 'mode-btn';
    btnTrad.setAttribute('data-i18n', 'zh_char_trad');
    btnTrad.innerText = t('zh_char_trad');
    btnTrad.onclick = function() { selectZhCharType('trad', this); };
    container.appendChild(btnTrad);
    const btnSimp = document.createElement('button');
    btnSimp.className = 'mode-btn';
    btnSimp.setAttribute('data-i18n', 'zh_char_simp');
    btnSimp.innerText = t('zh_char_simp');
    btnSimp.onclick = function() { selectZhCharType('simp', this); };
    container.appendChild(btnSimp);

    document.getElementById('answer-lang-title').style.display = 'none';
    document.getElementById('answer-lang-buttons').style.display = 'none';
    document.getElementById('answer-lang-buttons').innerHTML = '';
    document.getElementById('quiz-count-title').style.display = 'none';
    document.getElementById('quiz-count-buttons').style.display = 'none';
    document.getElementById('timer-title').style.display = 'none';
    document.getElementById('timer-buttons').style.display = 'none';

    const countContainer = document.getElementById('quiz-count-buttons');
    countContainer.innerHTML = '';
    const counts = [{n: 10, key: 'quiz_count_10'}, {n: 20, key: 'quiz_count_20'}, {n: 30, key: 'quiz_count_30'}, {n: 0, key: 'quiz_count_all'}];
    counts.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'mode-btn count-btn';
        btn.setAttribute('data-i18n', c.key);
        btn.innerText = t(c.key);
        btn.onclick = function() { selectCount(c.n, this); };
        countContainer.appendChild(btn);
    });
}

function selectZhCharType(type, el) {
    zhCharType = type;
    zhTestType = '';
    document.querySelectorAll('#mode-buttons .mode-btn').forEach(b => b.classList.remove('mode-btn-active'));
    el.classList.add('mode-btn-active');

    const answerContainer = document.getElementById('answer-lang-buttons');
    answerContainer.innerHTML = '';
    const btnPron = document.createElement('button');
    btnPron.className = 'mode-btn';
    const pronKey = type === 'trad' ? 'zh_test_bopomofo' : 'zh_test_roman';
    btnPron.setAttribute('data-i18n', pronKey);
    btnPron.innerText = t(pronKey);
    btnPron.onclick = function() { selectZhTestType(type === 'trad' ? 'bopomofo' : 'roman', this); };
    answerContainer.appendChild(btnPron);
    const btnMean = document.createElement('button');
    btnMean.className = 'mode-btn';
    btnMean.setAttribute('data-i18n', 'zh_test_meaning');
    btnMean.innerText = t('zh_test_meaning');
    btnMean.onclick = function() { selectZhTestType('meaning', this); };
    answerContainer.appendChild(btnMean);

    document.getElementById('answer-lang-title').style.display = '';
    answerContainer.style.display = '';
    document.getElementById('quiz-count-title').style.display = 'none';
    document.getElementById('quiz-count-buttons').style.display = 'none';
    document.querySelectorAll('#quiz-count-buttons .mode-btn').forEach(b => b.classList.remove('mode-btn-active'));
}

function selectZhTestType(type, el) {
    zhTestType = type;
    document.querySelectorAll('#answer-lang-buttons .mode-btn').forEach(b => b.classList.remove('mode-btn-active'));
    el.classList.add('mode-btn-active');
    document.getElementById('quiz-count-title').style.display = '';
    document.getElementById('quiz-count-buttons').style.display = '';
}

function selectMode(mode, el) {
    selectedQuizMode = mode;
    document.querySelectorAll('#mode-buttons .mode-btn').forEach(b => b.classList.remove('mode-btn-active'));
    el.classList.add('mode-btn-active');
    document.getElementById('timer-title').style.display = 'none';
    document.getElementById('timer-buttons').style.display = 'none';
    if (needAnswerLang) {
        document.getElementById('answer-lang-title').style.display = '';
        document.getElementById('answer-lang-buttons').style.display = '';
    } else {
        document.getElementById('quiz-count-title').style.display = '';
        document.getElementById('quiz-count-buttons').style.display = '';
    }
    checkStartQuiz();
}

function selectAnswerLang(lang, el) {
    quizAnswerLang = lang;
    document.querySelectorAll('#answer-lang-buttons .mode-btn').forEach(b => b.classList.remove('mode-btn-active'));
    el.classList.add('mode-btn-active');
    document.getElementById('quiz-count-title').style.display = '';
    document.getElementById('quiz-count-buttons').style.display = '';
    checkStartQuiz();
}

function selectCount(n, el) {
    totalQuestions = n;
    document.querySelectorAll('#quiz-count-buttons .mode-btn').forEach(b => b.classList.remove('mode-btn-active'));
    el.classList.add('mode-btn-active');
    showTimerOptions();
}

function checkStartQuiz() {
    const modePicked = document.querySelector('#mode-buttons .mode-btn-active');
    const countPicked = document.querySelector('#quiz-count-buttons .mode-btn-active');
    const answerPicked = !needAnswerLang || document.querySelector('#answer-lang-buttons .mode-btn-active');
    if (modePicked && countPicked && answerPicked) {
        startQuiz(selectedQuizMode);
    }
}

function startQuiz(mode) {
    currentMode = mode;
    score = 0;
    questionNum = 0;
    quizHistory = [];
    shuffledVocab = shuffleArray(vocabularyList);
    shuffledReading = shuffleArray(readingList);
    shuffledMeaning = shuffleArray(meaningList);
    vocabIdx = 0;
    readingIdx = 0;
    meaningIdx = 0;
    currentListeningMode = false;

    document.getElementById('mode-card').style.display = 'none';
    document.getElementById('quiz-card').style.display = 'block';
    document.getElementById('result-card').style.display = 'none';

    const modeNames = { meaning: t('mode_title_label'), reading: t('mode_title_label'), both: t('mode_title_label') };
    document.getElementById('quiz-mode-label').innerText = modeNames[mode] || t('mode_title_label');
    document.getElementById('total-words').innerText = t('quiz_words', {n: vocabularyList.length});
    nextQuestion();
}

function pickQuestionType() {
    if (currentMode === 'meaning') return 'meaning';
    if (currentMode === 'reading') return 'reading';
    return Math.random() < 0.5 ? 'meaning' : 'reading';
}

function nextQuestion() {
    answered = false;
    questionNum++;
    document.getElementById('question-count').innerText = t('quiz_question', {n: questionNum});
    document.getElementById('score-count').innerText = t('quiz_score', {n: score});
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('feedback').innerText = '';
    document.getElementById('feedback').className = 'feedback';

    if (quizTimerSec > 0 && !currentListeningMode) {
        startTimer();
    } else {
        document.getElementById('timer-display').style.display = 'none';
        document.getElementById('timer-bar-container').style.display = 'none';
    }

    if (reviewMode) {
        currentReviewEntry = reviewList[reviewIdx++];
        currentWord = { word: currentReviewEntry.word, kana: '', meaning: currentReviewEntry.answer, english: '' };
        if (currentReviewEntry.lang === 'zh' && currentReviewEntry.zct) zhCharType = currentReviewEntry.zct;

        document.getElementById('word-question').innerText = currentReviewEntry.word;
        document.getElementById('word-hint').innerText = currentReviewEntry.hint || '';

        const sameGroup = reviewPool.filter(m => m.group === currentReviewEntry.group && m.answer !== currentReviewEntry.answer);
        const others = reviewPool.filter(m => m.group !== currentReviewEntry.group && m.answer !== currentReviewEntry.answer);
        const pool = shuffleArray(sameGroup).concat(shuffleArray(others));
        let options = [currentReviewEntry.answer];
        for (const p of pool) {
            if (options.length >= 4) break;
            if (!options.includes(p.answer)) options.push(p.answer);
        }
        options.sort(() => Math.random() - 0.5);
        renderOptions(options, 'review');

        if (autoSpeak && currentWord.word && !isJapaneseQuizLang(currentLang)) setTimeout(() => speakWord(), 300);
        return;
    }

    if (currentLang === 'zh') {
        if (vocabIdx >= shuffledVocab.length) { shuffledVocab = shuffleArray(vocabularyList); vocabIdx = 0; }
        currentWord = shuffledVocab[vocabIdx++];
        const display = zhCharType === 'simp' ? currentWord.simp : currentWord.trad;
        currentWord.word = display;

        document.getElementById('word-question').innerText = display;
        document.getElementById('word-hint').innerText = '';

        const field = zhTestType;
        const pool = shuffledVocab.filter(w => w[field] && w[field].length > 0);
        const correctAnswer = currentWord[field];
        let options = [correctAnswer];
        let attempts = 0;
        while (options.length < 4 && pool.length >= 4 && attempts < 300) {
            attempts++;
            const pick = pool[Math.floor(Math.random() * pool.length)][field];
            if (!options.includes(pick)) options.push(pick);
        }
        options.sort(() => Math.random() - 0.5);
        renderOptions(options, 'zh');

        if (autoSpeak && currentWord.word) {
            setTimeout(() => speakWord(), 300);
        }
        return;
    }

    let questionType = pickQuestionType();
    const useEn = quizAnswerLang === 'en';
    /* For Japanese/JLPT, kanji words only ever get asked via "reading" and
       kana-only words only ever get asked via "meaning" (see addWord()) —
       so the meaning-question pool must be meaningList, not the full
       vocabularyList, otherwise a kanji word's meaning question would show
       its own pronunciation-revealing kanji with no reading test at all. */
    const jpSplit = isJapaneseQuizLang(currentLang);
    if (jpSplit && questionType === 'meaning' && shuffledMeaning.length < 4 && shuffledReading.length >= 4) {
        questionType = 'reading';
    }

    if (questionType === 'reading' && shuffledReading.length >= 4) {
        if (readingIdx >= shuffledReading.length) shuffledReading = shuffleArray(readingList);
        currentWord = shuffledReading[readingIdx++];

        document.getElementById('word-question').innerText = currentWord.word;
        document.getElementById('word-hint').innerText = useEn
            ? currentWord.english || currentWord.meaning
            : currentWord.meaning;

        let options = [currentWord.kana];
        while (options.length < 4) {
            const pick = shuffledReading[Math.floor(Math.random() * shuffledReading.length)].kana;
            if (!options.includes(pick)) options.push(pick);
        }
        options.sort(() => Math.random() - 0.5);
        renderOptions(options, 'reading');
    } else if (jpSplit && shuffledMeaning.length < 4) {
        renderOptions([], 'meaning');
        return;
    } else {
        const pool = jpSplit ? shuffledMeaning : shuffledVocab;
        if (jpSplit) {
            if (meaningIdx >= shuffledMeaning.length) shuffledMeaning = shuffleArray(meaningList);
            currentWord = shuffledMeaning[meaningIdx++];
        } else {
            if (vocabIdx >= shuffledVocab.length) shuffledVocab = shuffleArray(vocabularyList);
            currentWord = shuffledVocab[vocabIdx++];
        }

        document.getElementById('word-question').innerText = currentWord.word;
        document.getElementById('word-hint').innerText = currentWord.kana ? `讀法：${currentWord.kana}` : '';

        const answerPool = useEn
            ? pool.filter(w => w.english && w.english.length > 0)
            : pool;
        if (answerPool.length < 4) { renderOptions([], 'meaning'); return; }

        const correctAnswer = useEn ? (currentWord.english || currentWord.meaning) : currentWord.meaning;
        let options = [correctAnswer];
        while (options.length < 4) {
            const pick = answerPool[Math.floor(Math.random() * answerPool.length)];
            const val = useEn ? (pick.english || pick.meaning) : pick.meaning;
            if (!options.includes(val)) options.push(val);
        }
        options.sort(() => Math.random() - 0.5);
        renderOptions(options, 'meaning');
    }

    /* Japanese/JLPT: never auto-speak when a question first appears (that
       would hand over the reading to anyone who recognizes 50-on sounds) —
       pronunciation only plays automatically after a wrong answer, in
       selectOption(). Other languages keep the original entry auto-speak. */
    if (autoSpeak && currentWord && currentWord.word && !jpSplit) {
        setTimeout(() => speakWord(), 300);
    }
}

function renderOptions(options, type) {
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    options.forEach((optText) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = optText;
        btn.onclick = () => selectOption(btn, optText, type);
        container.appendChild(btn);
    });
}

function selectOption(selectedBtn, selectedText, type) {
    if (answered) return;
    answered = true;
    stopTimer();

    const allBtns = document.querySelectorAll('.option-btn');
    allBtns.forEach(btn => btn.disabled = true);

    const feedback = document.getElementById('feedback');
    const useEn = quizAnswerLang === 'en';
    const correctAnswer = type === 'reading' ? currentWord.kana
        : type === 'zh' ? currentWord[zhTestType]
        : type === 'review' ? currentReviewEntry.answer
        : (useEn ? (currentWord.english || currentWord.meaning) : currentWord.meaning);
    const isCorrect = selectedText === correctAnswer;

    if (type === 'review') {
        if (isCorrect) { removeMistakeById(currentReviewEntry.id); }
        else { bumpMistake(currentReviewEntry.id); }
    } else if (!isCorrect) {
        recordMistake(type, correctAnswer);
    }

    quizHistory.push({
        question: currentWord.word,
        yourAnswer: selectedText,
        correctAnswer: correctAnswer,
        isCorrect: isCorrect,
        type: type
    });

    if (isCorrect) {
        score += 10;
        selectedBtn.classList.add('correct-choice');
        feedback.innerText = t('correct');
        feedback.className = 'feedback correct';
        playSound(true);
    } else {
        score -= 3;
        selectedBtn.classList.add('wrong-choice');
        allBtns.forEach(btn => {
            if (btn.innerText === correctAnswer) {
                btn.classList.add('correct-choice');
            }
        });
        feedback.innerText = t('wrong') + correctAnswer;
        feedback.className = 'feedback wrong';
        playSound(false);
        /* Japanese/JLPT only auto-speaks after a wrong answer (never on
           question entry, see nextQuestion()) so the pronunciation serves
           as a learning aid instead of a giveaway. */
        if (autoSpeak && isJapaneseQuizLang(currentLang) && currentWord && currentWord.word) {
            setTimeout(() => speakWord(), 300);
        }
    }

    document.getElementById('score-count').innerText = `${t('quiz_score', {n: score})}`;

    if (totalQuestions > 0 && questionNum >= totalQuestions) {
        document.getElementById('nextBtn').innerText = t('quiz_next');
        document.getElementById('nextBtn').onclick = () => showResults();
    } else {
        document.getElementById('nextBtn').innerText = t('quiz_next');
        document.getElementById('nextBtn').onclick = () => nextQuestion();
    }
    document.getElementById('nextBtn').style.display = 'inline-block';
}

function showResults() {
    stopTimer();
    document.getElementById('quiz-card').style.display = 'none';
    document.getElementById('result-card').style.display = 'block';

    const correctCount = quizHistory.filter(h => h.isCorrect).length;
    const wrongCount = quizHistory.filter(h => !h.isCorrect).length;
    const total = quizHistory.length;
    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    if (total > 0) {
        saveQuizRecord({
            date: Date.now(),
            lang: currentLang,
            review: reviewMode,
            total: total,
            correct: correctCount,
            wrong: wrongCount,
            score: score,
            pct: percentage
        });
        checkAchievements();
    }

    document.getElementById('result-summary').innerHTML =
        `<div class="result-stats">
            <div class="stat correct-stat">${t('result_correct')}: ${correctCount}</div>
            <div class="stat wrong-stat">${t('result_wrong')}: ${wrongCount}</div>
            <div class="stat score-stat">${t('result_score')}: ${score}</div>
            <div class="stat pct-stat">${percentage}%</div>
        </div>`;

    let detailHTML = '<table class="result-table"><thead><tr>';
    detailHTML += `<th>${t('result_question', {n: ''})}</th>`;
    detailHTML += `<th>${t('result_your_answer')}</th>`;
    detailHTML += `<th>${t('result_correct_answer')}</th></tr></thead><tbody>`;

    quizHistory.forEach((h, i) => {
        const cls = h.isCorrect ? 'result-correct' : 'result-wrong';
        detailHTML += `<tr class="${cls}">
            <td>${i + 1}. ${h.question}</td>
            <td>${h.yourAnswer}</td>
            <td>${h.correctAnswer}</td>
        </tr>`;
    });
    detailHTML += '</tbody></table>';
    document.getElementById('result-detail').innerHTML = detailHTML;
}

function backToLanguage() {
    const wasJlptQuiz = currentLang.startsWith('jlpt_');
    const wasTopikQuiz = currentLang.startsWith('topik_');
    currentLang = '';
    vocabularyList = [];
    readingList = [];
    meaningList = [];
    reviewMode = false;
    currentListeningMode = false;
    stopTimer();
    quizTimerSec = 0;
    document.getElementById('lang-card').style.display = 'block';
    document.getElementById('setup-card').style.display = 'none';
    document.getElementById('mode-card').style.display = 'none';
    document.getElementById('quiz-card').style.display = 'none';
    document.getElementById('result-card').style.display = 'none';
    document.getElementById('mistake-card').style.display = 'none';
    document.getElementById('stats-card').style.display = 'none';
    document.getElementById('flashcard-card').style.display = 'none';
    document.getElementById('flashcard-setup-card').style.display = 'none';
    document.getElementById('listening-setup-card').style.display = 'none';
    updateMistakeBadge();
    updateStreakBadge();

    /* exam-quiz quizzes borrow #page-quiz's engine, so its "返回" should
       land back on the JLPT/TOPIK level picker, not #page-quiz's own language card */
    if (wasJlptQuiz || wasTopikQuiz) {
        document.getElementById('lang-card').style.display = 'none';
        switchPage('examquiz', document.querySelector('.nav-btn[data-tab="examquiz"]'));
        if (wasJlptQuiz) showJlptLevels();
        else showTopikLevels();
    }
}

/* ===================== 錯題本 Mistake Notebook ===================== */

let reviewMode = false;
let reviewList = [];
let reviewIdx = 0;
let reviewPool = [];
let currentReviewEntry = null;
let _mistakeCache = [];

const QUIZ_LANG_FLAGS = { jp: '🇯🇵', kr: '🇰🇷', fr: '🇫🇷', en: '🇺🇸', zh: '🇨🇳', jlpt_n5: '📖', jlpt_n4: '📖', jlpt_n3: '📖', jlpt_n2: '📖', jlpt_n1: '📖', topik_1: '📖', topik_2: '📖', topik_3: '📖', topik_4: '📖' };
const QUIZ_LANG_ORDER = ['jp', 'kr', 'fr', 'en', 'zh', 'jlpt_n5', 'jlpt_n4', 'jlpt_n3', 'jlpt_n2', 'jlpt_n1', 'topik_1', 'topik_2', 'topik_3', 'topik_4'];

function escQ(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getMistakes() {
    try { return JSON.parse(localStorage.getItem('quiz_mistakes')) || []; }
    catch { return []; }
}

function saveMistakes(list) {
    if (list.length > 300) {
        list = list.sort((a, b) => b.last - a.last).slice(0, 300);
    }
    localStorage.setItem('quiz_mistakes', JSON.stringify(list));
    updateMistakeBadge();
}

function recordMistake(type, correctAnswer) {
    if (!currentWord || !currentWord.word) return;
    const group = type === 'zh' ? 'zh-' + zhTestType
        : type === 'reading' ? 'reading'
        : 'meaning-' + (quizAnswerLang || 'zh');
    const hint = type === 'reading' ? (currentWord.meaning || '')
        : (currentWord.kana || '');
    const id = currentLang + '|' + currentWord.word + '|' + group;
    const list = getMistakes();
    const existing = list.find(m => m.id === id);
    if (existing) {
        existing.count++;
        existing.last = Date.now();
        existing.answer = correctAnswer;
    } else {
        list.push({
            id: id,
            lang: currentLang,
            word: currentWord.word,
            answer: correctAnswer,
            hint: hint,
            group: group,
            zct: currentLang === 'zh' ? zhCharType : undefined,
            count: 1,
            last: Date.now()
        });
    }
    saveMistakes(list);
}

function removeMistakeById(id) {
    saveMistakes(getMistakes().filter(m => m.id !== id));
}

function bumpMistake(id) {
    const list = getMistakes();
    const m = list.find(x => x.id === id);
    if (m) { m.count++; m.last = Date.now(); }
    saveMistakes(list);
}

function deleteMistakeAt(idx) {
    const entry = _mistakeCache[idx];
    if (!entry) return;
    removeMistakeById(entry.id);
    renderMistakeBook();
}

function clearMistakesLang(lang) {
    if (!confirm(t('mistake_clear') + '?')) return;
    saveMistakes(getMistakes().filter(m => m.lang !== lang));
    renderMistakeBook();
}

function updateMistakeBadge() {
    const badge = document.getElementById('mistake-badge');
    if (!badge) return;
    const n = getMistakes().length;
    badge.innerText = n;
    badge.style.display = n > 0 ? '' : 'none';
}

const MISTAKE_PAGE_SIZE = 8;
let mistakePageByLang = {};

function showMistakeBook() {
    reviewMode = false;
    mistakePageByLang = {};
    document.getElementById('lang-card').style.display = 'none';
    document.getElementById('setup-card').style.display = 'none';
    document.getElementById('mode-card').style.display = 'none';
    document.getElementById('quiz-card').style.display = 'none';
    document.getElementById('result-card').style.display = 'none';
    document.getElementById('stats-card').style.display = 'none';
    document.getElementById('mistake-card').style.display = 'block';
    renderMistakeBook();
}

function changeMistakePage(lang, dir) {
    mistakePageByLang[lang] = (mistakePageByLang[lang] || 1) + dir;
    renderMistakeBook();
}

function renderMistakeBook() {
    const list = getMistakes();
    _mistakeCache = list;
    const container = document.getElementById('mistake-content');
    if (list.length === 0) {
        container.innerHTML = `<p class="mistake-empty">${t('mistake_empty')}</p>`;
        return;
    }
    let html = '';
    QUIZ_LANG_ORDER.forEach(lg => {
        const items = list.map((m, i) => ({ m, i })).filter(x => x.m.lang === lg);
        if (items.length === 0) return;
        items.sort((a, b) => b.m.last - a.m.last);

        const totalPages = Math.ceil(items.length / MISTAKE_PAGE_SIZE);
        let page = mistakePageByLang[lg] || 1;
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;
        mistakePageByLang[lg] = page;
        const start = (page - 1) * MISTAKE_PAGE_SIZE;
        const pageItems = items.slice(start, start + MISTAKE_PAGE_SIZE);

        html += `<div class="mistake-group">
            <div class="mistake-group-header">
                <span class="mistake-group-name">${QUIZ_LANG_FLAGS[lg] || ''} ${t('quiz_' + lg)}（${items.length}）</span>
                <span class="mistake-group-actions">
                    ${items.length >= 4 ? `<button class="mistake-review-btn" onclick="startReviewQuiz('${lg}')">▶ ${t('mistake_review')}</button>` : `<span class="mistake-need4">${t('mistake_need4')}</span>`}
                    <button class="mistake-clear-btn" onclick="clearMistakesLang('${lg}')">🗑 ${t('mistake_clear')}</button>
                </span>
            </div>
            <div class="mistake-items">`;
        pageItems.forEach(x => {
            html += `<div class="mistake-item">
                <span class="mistake-word">${escQ(x.m.word)}</span>
                <span class="mistake-answer">${escQ(x.m.answer)}</span>
                <span class="mistake-count">×${x.m.count}</span>
                <button class="mistake-del" onclick="deleteMistakeAt(${x.i})" title="delete">✕</button>
            </div>`;
        });
        html += `</div>`;
        if (totalPages > 1) {
            html += `<div class="mistake-pagination">
                <button class="mistake-page-btn" onclick="changeMistakePage('${lg}', -1)" ${page <= 1 ? 'disabled' : ''}>◀ ${t('mistake_prev')}</button>
                <span class="mistake-page-info">${page} / ${totalPages}</span>
                <button class="mistake-page-btn" onclick="changeMistakePage('${lg}', 1)" ${page >= totalPages ? 'disabled' : ''}>${t('mistake_next')} ▶</button>
            </div>`;
        }
        html += `</div>`;
    });
    container.innerHTML = html;
}

function startReviewQuiz(lang) {
    const mistakes = getMistakes().filter(m => m.lang === lang);
    if (mistakes.length < 4) { alert(t('mistake_need4')); return; }

    reviewMode = true;
    currentLang = lang;
    reviewPool = mistakes;
    reviewList = shuffleArray(mistakes);
    reviewIdx = 0;
    score = 0;
    questionNum = 0;
    quizHistory = [];
    totalQuestions = reviewList.length;

    document.getElementById('mistake-card').style.display = 'none';
    document.getElementById('stats-card').style.display = 'none';
    document.getElementById('quiz-card').style.display = 'block';
    document.getElementById('result-card').style.display = 'none';
    document.getElementById('quiz-mode-label').innerText = t('review_label');
    document.getElementById('total-words').innerText = t('quiz_words', {n: reviewList.length});
    nextQuestion();
}

/* ===================== 測驗統計 Quiz Stats ===================== */

function getQuizRecords() {
    try { return JSON.parse(localStorage.getItem('quiz_records')) || []; }
    catch { return []; }
}

function saveQuizRecord(rec) {
    const list = getQuizRecords();
    list.push(rec);
    if (list.length > 200) list.splice(0, list.length - 200);
    localStorage.setItem('quiz_records', JSON.stringify(list));
}

function calcStreak(recs) {
    if (!recs || recs.length === 0) return 0;
    const dayKey = ts => {
        const d = new Date(ts);
        return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    };
    const days = new Set(recs.map(r => dayKey(r.date)));
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    if (!days.has(dayKey(cursor.getTime()))) {
        cursor.setDate(cursor.getDate() - 1);
    }
    let streak = 0;
    while (days.has(dayKey(cursor.getTime()))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
}

function updateStreakBadge() {
    const wrap = document.getElementById('streak-display');
    const countEl = document.getElementById('streak-count');
    if (!wrap || !countEl) return;
    const streak = calcStreak(getQuizRecords());
    countEl.textContent = streak;
    wrap.style.display = streak > 0 ? '' : 'none';
}

function showQuizStats() {
    document.getElementById('lang-card').style.display = 'none';
    document.getElementById('setup-card').style.display = 'none';
    document.getElementById('mode-card').style.display = 'none';
    document.getElementById('quiz-card').style.display = 'none';
    document.getElementById('result-card').style.display = 'none';
    document.getElementById('mistake-card').style.display = 'none';
    document.getElementById('stats-card').style.display = 'block';
    renderQuizStats();
}

function renderQuizStats() {
    const recs = getQuizRecords();
    const container = document.getElementById('stats-content');
    if (recs.length === 0) {
        container.innerHTML = `<p class="mistake-empty">${t('stats_empty')}</p>`;
        return;
    }

    const total = recs.length;
    const avg = Math.round(recs.reduce((s, r) => s + r.pct, 0) / total);
    const best = Math.max(...recs.map(r => r.score));
    const totalQ = recs.reduce((s, r) => s + r.total, 0);
    const streak = calcStreak(recs);

    let html = `<div class="stats-summary">
        <div class="stats-tile"><div class="stats-num">${total}</div><div class="stats-label">${t('stats_total')}</div></div>
        <div class="stats-tile"><div class="stats-num">${avg}%</div><div class="stats-label">${t('stats_avg')}</div></div>
        <div class="stats-tile"><div class="stats-num">${best}</div><div class="stats-label">${t('stats_best')}</div></div>
        <div class="stats-tile"><div class="stats-num">${totalQ}</div><div class="stats-label">${t('stats_questions')}</div></div>
        <div class="stats-tile"><div class="stats-num">&#x1F525;${streak}</div><div class="stats-label">${t('stats_streak')}</div></div>
    </div>`;

    html += renderAchievementsHTML();

    const last = recs.slice(-20);
    if (last.length >= 2) {
        const pts = last.map((r, i) => {
            const x = (i / (last.length - 1)) * 280 + 10;
            const y = 95 - (r.pct / 100) * 80;
            return { x, y, pct: r.pct };
        });
        const polyline = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
        const circles = pts.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#f472b6"><title>${p.pct}%</title></circle>`).join('');
        html += `<div class="stats-chart-title">${t('stats_trend')}</div>
        <div class="stats-chart">
            <svg viewBox="0 0 300 110" preserveAspectRatio="none">
                <line x1="10" y1="15" x2="290" y2="15" stroke="rgba(249,168,212,0.15)" stroke-width="1" stroke-dasharray="4 3"/>
                <line x1="10" y1="55" x2="290" y2="55" stroke="rgba(249,168,212,0.15)" stroke-width="1" stroke-dasharray="4 3"/>
                <line x1="10" y1="95" x2="290" y2="95" stroke="rgba(249,168,212,0.3)" stroke-width="1"/>
                <text x="8" y="13" fill="rgba(249,168,212,0.5)" font-size="8" text-anchor="end">100</text>
                <text x="8" y="58" fill="rgba(249,168,212,0.5)" font-size="8" text-anchor="end">50</text>
                <text x="8" y="98" fill="rgba(249,168,212,0.5)" font-size="8" text-anchor="end">0</text>
                <polyline points="${polyline}" fill="none" stroke="#c084fc" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
                ${circles}
            </svg>
        </div>`;
    }

    const recent = recs.slice(-10).reverse();
    html += `<div class="stats-chart-title">${t('stats_recent')}</div>
    <table class="result-table stats-table"><thead><tr>
        <th>${t('stats_date')}</th><th>${t('stats_lang')}</th><th>${t('stats_score')}</th><th>${t('stats_accuracy')}</th>
    </tr></thead><tbody>`;
    recent.forEach(r => {
        const d = new Date(r.date);
        const dateStr = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        const langLabel = (QUIZ_LANG_FLAGS[r.lang] || '') + (r.review ? ' 📖' : '');
        const cls = r.pct >= 60 ? 'result-correct' : 'result-wrong';
        html += `<tr class="${cls}"><td>${dateStr}</td><td>${langLabel}</td><td>${r.score}</td><td>${r.pct}%（${r.correct}/${r.total}）</td></tr>`;
    });
    html += '</tbody></table>';

    container.innerHTML = html;
}

/* ===================== 成就系統 Achievements ===================== */

const ACHIEVEMENTS = [
    { id: 'first_quiz', icon: '🎉', titleKey: 'ach_first_quiz', descKey: 'ach_first_quiz_desc', check: d => d.total >= 1 },
    { id: 'quiz_10', icon: '📚', titleKey: 'ach_quiz_10', descKey: 'ach_quiz_10_desc', check: d => d.total >= 10 },
    { id: 'streak_3', icon: '🔥', titleKey: 'ach_streak_3', descKey: 'ach_streak_3_desc', check: d => d.streak >= 3 },
    { id: 'streak_7', icon: '⚡', titleKey: 'ach_streak_7', descKey: 'ach_streak_7_desc', check: d => d.streak >= 7 },
    { id: 'perfect', icon: '💯', titleKey: 'ach_perfect', descKey: 'ach_perfect_desc', check: d => d.hasPerfect },
    { id: 'mastered_50', icon: '🏆', titleKey: 'ach_mastered_50', descKey: 'ach_mastered_50_desc', check: d => d.mastered >= 50 },
];

function getUnlockedAchievements() {
    try { return JSON.parse(localStorage.getItem('quiz_achievements')) || []; }
    catch { return []; }
}

function computeAchievementData() {
    const recs = getQuizRecords();
    return {
        total: recs.length,
        streak: calcStreak(recs),
        hasPerfect: recs.some(r => r.pct === 100),
        mastered: getFlashcardKnown().length
    };
}

function checkAchievements() {
    const data = computeAchievementData();
    const unlocked = new Set(getUnlockedAchievements());
    const newly = [];
    ACHIEVEMENTS.forEach(a => {
        if (!unlocked.has(a.id) && a.check(data)) {
            unlocked.add(a.id);
            newly.push(a);
        }
    });
    if (newly.length) {
        localStorage.setItem('quiz_achievements', JSON.stringify([...unlocked]));
        newly.forEach((a, i) => {
            setTimeout(() => showShareToast(`${a.icon} ${t('ach_unlocked')}: ${t(a.titleKey)}`), i * 1200);
        });
    }
    return unlocked;
}

function renderAchievementsHTML() {
    const unlocked = checkAchievements();
    const items = ACHIEVEMENTS.map(a => {
        const isUnlocked = unlocked.has(a.id);
        return `<div class="achievement-badge${isUnlocked ? '' : ' locked'}">
            <div class="achievement-icon">${a.icon}</div>
            <div class="achievement-title">${t(a.titleKey)}</div>
            <div class="achievement-desc">${t(a.descKey)}</div>
        </div>`;
    }).join('');
    return `<div class="stats-chart-title">${t('achievements_title')}</div>
    <div class="achievement-grid">${items}</div>`;
}

function closeQuizTools() {
    backToLanguage();
}

/* ===================== Share Score Card ===================== */

function shareScoreCard() {
    const correctCount = quizHistory.filter(h => h.isCorrect).length;
    const wrongCount = quizHistory.filter(h => !h.isCorrect).length;
    const total = quizHistory.length;
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    const W = 600, H = 320;
    const cvs = document.createElement('canvas');
    cvs.width = W * 2; cvs.height = H * 2;
    const ctx = cvs.getContext('2d');
    ctx.scale(2, 2);

    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#1a1035');
    g.addColorStop(0.5, '#2d1b69');
    g.addColorStop(1, '#1a1035');
    ctx.fillStyle = g;
    roundRect(ctx, 0, 0, W, H, 20);
    ctx.fill();

    const rg = ctx.createRadialGradient(W * 0.8, H * 0.2, 10, W * 0.8, H * 0.2, 200);
    rg.addColorStop(0, 'rgba(244,114,182,0.18)');
    rg.addColorStop(1, 'rgba(244,114,182,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);

    const rg2 = ctx.createRadialGradient(W * 0.15, H * 0.85, 10, W * 0.15, H * 0.85, 180);
    rg2.addColorStop(0, 'rgba(168,85,247,0.15)');
    rg2.addColorStop(1, 'rgba(168,85,247,0)');
    ctx.fillStyle = rg2;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    roundRect(ctx, 12, 12, W - 24, H - 24, 16);
    ctx.stroke();

    const flag = QUIZ_LANG_FLAGS[currentLang] || '';
    const langLabel = flag + ' ' + (t('quiz_' + currentLang) || currentLang);
    ctx.font = '600 18px "Noto Sans TC", "Noto Sans JP", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.textAlign = 'left';
    ctx.fillText(langLabel, 36, 50);

    if (reviewMode) {
        ctx.font = '14px "Noto Sans TC", sans-serif';
        ctx.fillStyle = 'rgba(200,162,224,0.8)';
        ctx.fillText('📖 ' + (t('review_label') || 'Review'), 36, 74);
    }

    ctx.textAlign = 'right';
    ctx.font = '13px "Noto Sans TC", "Noto Sans JP", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()}`;
    ctx.fillText(dateStr, W - 36, 40);

    ctx.textAlign = 'center';

    const pctColor = pct >= 80 ? '#6ee7b7' : pct >= 60 ? '#fbbf24' : '#f87171';
    ctx.font = 'bold 72px "Noto Sans TC", "Noto Sans JP", sans-serif';
    ctx.fillStyle = pctColor;
    ctx.fillText(pct + '%', W / 2, 145);

    ctx.font = '15px "Noto Sans TC", "Noto Sans JP", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    const pctLabel = (t('result_correct') || 'Correct') + ' ' + correctCount + ' / ' + total;
    ctx.fillText(pctLabel, W / 2, 172);

    const bx = 36, bw = (W - 72 - 24) / 3;
    const by = 195, bh = 70;
    const statsData = [
        { label: t('result_correct') || 'Correct', value: correctCount, color: '#6ee7b7' },
        { label: t('result_wrong') || 'Wrong', value: wrongCount, color: '#f87171' },
        { label: t('result_score') || 'Score', value: score, color: '#c0a2e0' }
    ];
    statsData.forEach((s, i) => {
        const x = bx + i * (bw + 12);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        roundRect(ctx, x, by, bw, bh, 12);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        roundRect(ctx, x, by, bw, bh, 12);
        ctx.stroke();
        ctx.fillStyle = s.color;
        ctx.font = 'bold 28px "Noto Sans TC", "Noto Sans JP", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(s.value), x + bw / 2, by + 35);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.font = '13px "Noto Sans TC", "Noto Sans JP", sans-serif';
        ctx.fillText(s.label, x + bw / 2, by + 56);
    });

    ctx.textAlign = 'right';
    ctx.font = '13px "Noto Sans TC", "Noto Sans JP", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillText('Hanabiの小天地 ✦', W - 36, H - 24);

    cvs.toBlob(function(blob) {
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], 'score.png', { type: 'image/png' })] })) {
            const file = new File([blob], 'score.png', { type: 'image/png' });
            navigator.share({ files: [file] }).catch(function() {});
        } else if (navigator.clipboard && navigator.clipboard.write) {
            const item = new ClipboardItem({ 'image/png': blob });
            navigator.clipboard.write([item]).then(function() {
                showShareToast(t('share_copied') || '已複製到剪貼簿！');
            }).catch(function() {
                downloadBlob(blob);
            });
        } else {
            downloadBlob(blob);
        }
    }, 'image/png');

    function downloadBlob(b) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = 'hanabi-score.png';
        a.click();
        URL.revokeObjectURL(a.href);
        showShareToast(t('share_downloaded') || '已下載圖片！');
    }
}

function showShareToast(msg) {
    let toast = document.getElementById('share-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'share-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className = 'share-toast show';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function() { toast.className = 'share-toast'; }, 2500);
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

/* ===================== Timer Mode ===================== */

let quizTimerSec = 0;
let timerInterval = null;
let timeLeft = 0;

function selectTimer(sec, el) {
    quizTimerSec = sec;
    document.querySelectorAll('#timer-buttons .mode-btn').forEach(b => b.classList.remove('mode-btn-active'));
    el.classList.add('mode-btn-active');
    checkStartQuizWithTimer();
}

function checkStartQuizWithTimer() {
    const modePicked = document.querySelector('#mode-buttons .mode-btn-active');
    const countPicked = document.querySelector('#quiz-count-buttons .mode-btn-active');
    const answerPicked = !needAnswerLang || document.querySelector('#answer-lang-buttons .mode-btn-active');
    const timerPicked = document.querySelector('#timer-buttons .mode-btn-active');
    if (modePicked && countPicked && answerPicked && timerPicked) {
        startQuiz(selectedQuizMode);
    }
}

function showTimerOptions() {
    const title = document.getElementById('timer-title');
    const container = document.getElementById('timer-buttons');
    title.style.display = '';
    container.style.display = '';
    container.innerHTML = '';
    const opts = [
        { sec: 0, key: 'timer_none' },
        { sec: 15, key: 'timer_15' },
        { sec: 30, key: 'timer_30' }
    ];
    opts.forEach(o => {
        const btn = document.createElement('button');
        btn.className = 'mode-btn count-btn';
        btn.setAttribute('data-i18n', o.key);
        btn.innerText = t(o.key);
        btn.onclick = function() { selectTimer(o.sec, this); };
        container.appendChild(btn);
    });
}

function startTimer() {
    if (quizTimerSec <= 0) {
        document.getElementById('timer-display').style.display = 'none';
        document.getElementById('timer-bar-container').style.display = 'none';
        return;
    }
    timeLeft = quizTimerSec;
    const display = document.getElementById('timer-display');
    const barContainer = document.getElementById('timer-bar-container');
    const bar = document.getElementById('timer-bar');
    display.style.display = '';
    barContainer.style.display = '';
    display.textContent = '\u23F1 ' + timeLeft;
    bar.style.width = '100%';
    bar.style.transition = 'none';
    bar.style.background = '';
    void bar.offsetWidth;
    bar.style.transition = 'width ' + quizTimerSec + 's linear, background 0.3s';
    bar.style.width = '0%';
    if (timeLeft <= 5) bar.style.background = '#f87171';
    else if (timeLeft <= 10) bar.style.background = '#fbbf24';
    else bar.style.background = '#6ee7b7';

    clearInterval(timerInterval);
    timerInterval = setInterval(function() {
        timeLeft--;
        display.textContent = '\u23F1 ' + timeLeft;
        if (timeLeft <= 5) bar.style.background = '#f87171';
        else if (timeLeft <= 10) bar.style.background = '#fbbf24';
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            onTimerExpired();
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        const bar = document.getElementById('timer-bar');
        if (bar) {
            const computed = getComputedStyle(bar);
            bar.style.transition = 'none';
            bar.style.width = computed.width;
        }
    }
}

function onTimerExpired() {
    if (answered) return;
    answered = true;
    const feedback = document.getElementById('feedback');
    const allBtns = document.querySelectorAll('.option-btn');
    allBtns.forEach(btn => btn.disabled = true);

    let correctAnswer = '';
    if (currentListeningMode) {
        correctAnswer = getListeningCorrectAnswer();
    } else {
        const useEn = quizAnswerLang === 'en';
        const type = currentMode === 'reading' ? 'reading' : currentLang === 'zh' ? 'zh' : 'meaning';
        correctAnswer = type === 'reading' ? currentWord.kana
            : type === 'zh' ? currentWord[zhTestType]
            : (useEn ? (currentWord.english || currentWord.meaning) : currentWord.meaning);
    }

    score -= 3;
    feedback.innerText = t('timer_expired') + correctAnswer;
    feedback.className = 'feedback wrong';
    playSound(false);

    if (!currentListeningMode) {
        allBtns.forEach(btn => {
            if (btn.innerText === correctAnswer) btn.classList.add('correct-choice');
        });
    }

    quizHistory.push({
        question: currentWord.word,
        yourAnswer: '⏱ ' + (t('timer_expired_short') || '超時'),
        correctAnswer: correctAnswer,
        isCorrect: false,
        type: currentListeningMode ? 'listening' : 'timed'
    });

    document.getElementById('score-count').innerText = t('quiz_score', {n: score});
    document.getElementById('nextBtn').innerText = t('quiz_next');
    if (totalQuestions > 0 && questionNum >= totalQuestions) {
        document.getElementById('nextBtn').onclick = () => showResults();
    } else {
        document.getElementById('nextBtn').onclick = () => nextQuestion();
    }
    document.getElementById('nextBtn').style.display = 'inline-block';

    if (currentListeningMode) {
        const input = document.getElementById('listening-input');
        if (input) { input.disabled = true; }
        const submitBtn = document.getElementById('listening-submit');
        if (submitBtn) submitBtn.style.display = 'none';
    }
}

/* ===================== Flashcard Mode ===================== */

let flashcardList = [];
let flashcardIdx = 0;
let flashcardKnownSet = new Set();
let flashcardUnknownSet = new Set();
let flashcardLang = '';
let flashcardMode = '';

function getFlashcardKnown() {
    try { return JSON.parse(localStorage.getItem('flashcard_known')) || []; } catch { return []; }
}

function saveFlashcardKnown() {
    localStorage.setItem('flashcard_known', JSON.stringify([...flashcardKnownSet]));
}

function getFlashcardUnknown() {
    try { return JSON.parse(localStorage.getItem('flashcard_unknown')) || []; } catch { return []; }
}

function saveFlashcardUnknown() {
    localStorage.setItem('flashcard_unknown', JSON.stringify([...flashcardUnknownSet]));
}

function showFlashcard() {
    document.getElementById('lang-card').style.display = 'none';
    document.getElementById('flashcard-setup-card').style.display = 'block';
    document.getElementById('fc-lang-title').style.display = '';
    document.getElementById('fc-lang-buttons').style.display = '';
    document.getElementById('fc-mode-title').style.display = 'none';
    document.getElementById('fc-mode-buttons').style.display = 'none';
    document.getElementById('fc-mode-buttons').innerHTML = '';

    const container = document.getElementById('fc-lang-buttons');
    container.innerHTML = '';
    const langs = [
        { id: 'jp', i18n: 'fc_lang_jp', fallback: '🇯🇵 日文' },
        { id: 'kr', i18n: 'fc_lang_kr', fallback: '🇰🇷 韓文' },
        { id: 'fr', i18n: 'fc_lang_fr', fallback: '🇫🇷 法文' },
        { id: 'en', i18n: 'fc_lang_en', fallback: '🇺🇸 英文' },
        { id: 'zh', i18n: 'fc_lang_zh', fallback: '🇨🇳 中文' }
    ];
    langs.forEach(l => {
        const btn = document.createElement('button');
        btn.className = 'mode-btn';
        btn.setAttribute('data-i18n', l.i18n);
        btn.innerText = t(l.i18n) || l.fallback;
        btn.onclick = function() { selectFlashcardLang(l.id, this); };
        container.appendChild(btn);
    });
}

function selectFlashcardLang(lang, el) {
    flashcardLang = lang;
    document.querySelectorAll('#fc-lang-buttons .mode-btn').forEach(b => b.classList.remove('mode-btn-active'));
    if (el) el.classList.add('mode-btn-active');

    const title = document.getElementById('fc-mode-title');
    const container = document.getElementById('fc-mode-buttons');
    title.style.display = '';
    container.style.display = '';
    container.innerHTML = '';

    const modeMap = {
        jp: [
            { id: 'zh-meaning', key: 'fc_mode_jp_zh' },
            { id: 'en-meaning', key: 'fc_mode_jp_en' }
        ],
        kr: [
            { id: 'zh-meaning', key: 'fc_mode_kr_zh' },
            { id: 'en-meaning', key: 'fc_mode_kr_en' }
        ],
        fr: [
            { id: 'zh-meaning', key: 'fc_mode_fr_zh' },
            { id: 'en-meaning', key: 'fc_mode_fr_en' }
        ],
        en: [
            { id: 'zh-meaning', key: 'fc_mode_en_zh' }
        ],
        zh: [
            { id: 'trad-bopomofo', key: 'fc_mode_zh_trad' },
            { id: 'simp-roman', key: 'fc_mode_zh_simp' }
        ]
    };

    const modes = modeMap[lang] || [];
    modes.forEach(m => {
        const btn = document.createElement('button');
        btn.className = 'mode-btn';
        btn.setAttribute('data-i18n', m.key);
        btn.innerText = t(m.key);
        btn.onclick = function() { startFlashcardWithMode(m.id, this); };
        container.appendChild(btn);
    });

    if (modes.length === 1) {
        setTimeout(() => startFlashcardWithMode(modes[0].id, container.firstChild), 100);
    }
}

function startFlashcardWithMode(modeId) {
    flashcardMode = modeId;
    const lang = flashcardLang;
    if (!SHEETS[lang]) return;

    flashcardKnownSet = new Set(getFlashcardKnown().filter(k => k.startsWith(lang + '|' + modeId + '|')));
    flashcardUnknownSet = new Set(getFlashcardUnknown().filter(k => k.startsWith(lang + '|' + modeId + '|')));

    document.getElementById('fc-lang-title').style.display = 'none';
    document.getElementById('fc-lang-buttons').style.display = 'none';
    document.getElementById('fc-mode-title').style.display = 'none';
    document.getElementById('fc-mode-buttons').style.display = 'none';

    updateMasteredCount();
    updateUnknownCount();

    const section = document.getElementById('fc-mastered-section');
    let startBtn = document.getElementById('fc-start-btn');
    if (!startBtn) {
        startBtn = document.createElement('button');
        startBtn.id = 'fc-start-btn';
        startBtn.className = 'btn next-btn';
        startBtn.style.marginTop = '10px';
        startBtn.onclick = function() { launchFlashcard(lang, modeId); };
        section.appendChild(startBtn);
    }
    startBtn.innerText = t('fc_start_flashcard');
}

function launchFlashcard(lang, modeId) {
    document.getElementById('flashcard-setup-card').style.display = 'none';
    document.getElementById('mastered-list-card').style.display = 'none';
    document.getElementById('flashcard-card').style.display = 'block';
    loadFlashcardVocab(lang, modeId);
}

function loadFlashcardVocab(lang, modeId) {
    const sheetUrl = SHEETS[lang];
    vocabularyList = [];
    readingList = [];
    meaningList = [];
    fetch(sheetUrl)
        .then(r => r.text())
        .then(csv => {
            const rows = Papa.parse(csv, { header: false }).data;
            if (lang === 'jp') parseJapanese(rows);
            else if (lang === 'kr') parseKorean(rows);
            else if (lang === 'fr') parseFrench(rows);
            else if (lang === 'en') parseEnglish(rows);
            else if (lang === 'zh') parseChinese(rows);

            flashcardList = shuffleArray([...vocabularyList]);
            flashcardIdx = 0;
            renderFlashcard();
        })
        .catch(() => {
            closeFlashcard();
        });
}

function renderFlashcard() {
    if (flashcardList.length === 0) return;
    const word = flashcardList[flashcardIdx];
    const front = document.getElementById('flashcard-front');
    const back = document.getElementById('flashcard-back');
    const hint = document.getElementById('flashcard-hint');
    const card = document.getElementById('flashcard');
    const counter = document.getElementById('flashcard-counter');

    card.classList.remove('flipped');

    const m = flashcardMode;
    let frontHTML = '';
    let backHTML = '';

    if (m === 'trad-bopomofo') {
        frontHTML = '<div class="flashcard-word">' + escHtml(word.trad || word.word) + '</div>' +
            (word.bopomofo ? '<div class="flashcard-sub">' + escHtml(word.bopomofo) + '</div>' : '');
        backHTML = '<div class="flashcard-word">' + escHtml(word.meaning) + '</div>' +
            (word.english ? '<div class="flashcard-sub">' + escHtml(word.english) + '</div>' : '');
    } else if (m === 'simp-roman') {
        frontHTML = '<div class="flashcard-word">' + escHtml(word.simp || word.word) + '</div>' +
            (word.roman ? '<div class="flashcard-sub">' + escHtml(word.roman) + '</div>' : '');
        backHTML = '<div class="flashcard-word">' + escHtml(word.meaning) + '</div>' +
            (word.english ? '<div class="flashcard-sub">' + escHtml(word.english) + '</div>' : '');
    } else if (m === 'zh-meaning') {
        const wordText = word.word;
        const readingText = word.kana || '';
        frontHTML = '<div class="flashcard-word">' + escHtml(wordText) + '</div>' +
            (readingText ? '<div class="flashcard-sub">' + escHtml(readingText) + '</div>' : '');
        backHTML = '<div class="flashcard-word">' + escHtml(word.meaning) + '</div>';
    } else if (m === 'en-meaning') {
        const wordText = word.word;
        const readingText = word.kana || '';
        frontHTML = '<div class="flashcard-word">' + escHtml(wordText) + '</div>' +
            (readingText ? '<div class="flashcard-sub">' + escHtml(readingText) + '</div>' : '');
        backHTML = '<div class="flashcard-word">' + escHtml(word.english || word.meaning) + '</div>';
    }

    front.innerHTML = frontHTML;
    back.innerHTML = backHTML;

    const cardKey = flashcardLang + '|' + flashcardMode + '|' + word.word;
    const isKnown = flashcardKnownSet.has(cardKey);
    const isUnknown = flashcardUnknownSet.has(cardKey);
    hint.innerHTML = isKnown ? '<span style="color:#6ee7b7">' + t('flashcard_known') + '</span>' : '';
    if (!isKnown && isUnknown) {
        hint.innerHTML = '<span style="color:#f87171">' + t('flashcard_unknown') + '</span>';
    }
    counter.textContent = (flashcardIdx + 1) + ' / ' + flashcardList.length;

    currentLang = flashcardLang;
    currentWord = word;
    if (autoSpeak && word.word) setTimeout(() => speakWord(), 300);
}

function flipCard() {
    document.getElementById('flashcard').classList.toggle('flipped');
}

function flashcardNext() {
    if (flashcardIdx < flashcardList.length - 1) {
        flashcardIdx++;
        renderFlashcard();
    }
}

function flashcardPrev() {
    if (flashcardIdx > 0) {
        flashcardIdx--;
        renderFlashcard();
    }
}

function flashcardRate(known) {
    const word = flashcardList[flashcardIdx];
    const key = flashcardLang + '|' + flashcardMode + '|' + word.word;
    if (known) {
        flashcardKnownSet.add(key);
        flashcardUnknownSet.delete(key);
    } else {
        flashcardKnownSet.delete(key);
        flashcardUnknownSet.add(key);
    }
    saveFlashcardKnown();
    saveFlashcardUnknown();
    checkAchievements();
    updateMasteredCount();
    updateUnknownCount();
    renderFlashcard();
}

function closeFlashcard() {
    document.getElementById('flashcard-card').style.display = 'none';
    document.getElementById('lang-card').style.display = 'block';
}

function closeFlashcardSetup() {
    document.getElementById('flashcard-setup-card').style.display = 'none';
    document.getElementById('mastered-list-card').style.display = 'none';
    document.getElementById('unknown-list-card').style.display = 'none';
    document.getElementById('fc-mastered-section').style.display = 'none';
    document.getElementById('fc-unknown-section').style.display = 'none';
    const startBtn = document.getElementById('fc-start-btn');
    if (startBtn) startBtn.remove();
    document.getElementById('lang-card').style.display = 'block';
}

function updateMasteredCount() {
    const set = new Set([...flashcardKnownSet].filter(k => k.startsWith(flashcardLang + '|' + flashcardMode + '|')));
    const count = set.size;
    const el = document.getElementById('fc-mastered-count');
    const section = document.getElementById('fc-mastered-section');
    if (flashcardLang && flashcardMode) {
        section.style.display = '';
        el.innerText = t('fc_mastered_count', {n: count, m: flashcardList.length});
    } else {
        section.style.display = 'none';
    }
}

function showMasteredList() {
    const prefix = flashcardLang + '|' + flashcardMode + '|';
    const known = [...flashcardKnownSet].filter(k => k.startsWith(prefix)).map(k => k.split('|')[2]);
    const container = document.getElementById('mastered-list-content');
    if (known.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#aaa;">' + t('fc_mastered_empty') + '</p>';
    } else {
        let html = '';
        known.forEach(word => {
            html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; margin:4px 0; background:rgba(110,231,183,0.08); border-radius:8px;">' +
                '<span>' + escHtml(word) + '</span>' +
                '<button onclick="removeFromMastered(\'' + escHtml(word).replace(/'/g, "\\'") + '\')" style="background:none; border:none; color:#f87171; cursor:pointer; font-size:0.9em;">\u2716</button>' +
                '</div>';
        });
        container.innerHTML = html;
    }
    document.getElementById('flashcard-setup-card').style.display = 'none';
    document.getElementById('mastered-list-card').style.display = 'block';
}

function removeFromMastered(word) {
    const key = flashcardLang + '|' + flashcardMode + '|' + word;
    flashcardKnownSet.delete(key);
    saveFlashcardKnown();
    showMasteredList();
    updateMasteredCount();
}

function closeMasteredList() {
    document.getElementById('mastered-list-card').style.display = 'none';
    document.getElementById('flashcard-setup-card').style.display = 'block';
    updateMasteredCount();
}

function updateUnknownCount() {
    const set = new Set([...flashcardUnknownSet].filter(k => k.startsWith(flashcardLang + '|' + flashcardMode + '|')));
    const count = set.size;
    const el = document.getElementById('fc-unknown-count');
    const section = document.getElementById('fc-unknown-section');
    if (flashcardLang && flashcardMode) {
        section.style.display = '';
        el.innerText = t('fc_unknown_count', {n: count});
    } else {
        section.style.display = 'none';
    }
}

function showUnknownList() {
    const prefix = flashcardLang + '|' + flashcardMode + '|';
    const unknown = [...flashcardUnknownSet].filter(k => k.startsWith(prefix)).map(k => k.split('|')[2]);
    const container = document.getElementById('unknown-list-content');
    if (unknown.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#aaa;">' + t('fc_unknown_empty') + '</p>';
    } else {
        let html = '';
        unknown.forEach(word => {
            html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; margin:4px 0; background:rgba(248,113,113,0.08); border-radius:8px;">' +
                '<span>' + escHtml(word) + '</span>' +
                '<button onclick="removeFromUnknown(\'' + escHtml(word).replace(/'/g, "\\'") + '\')" style="background:none; border:none; color:#f87171; cursor:pointer; font-size:0.9em;">&#10006;</button>' +
                '</div>';
        });
        container.innerHTML = html;
    }
    document.getElementById('flashcard-setup-card').style.display = 'none';
    document.getElementById('unknown-list-card').style.display = 'block';
}

function removeFromUnknown(word) {
    const key = flashcardLang + '|' + flashcardMode + '|' + word;
    flashcardUnknownSet.delete(key);
    saveFlashcardUnknown();
    showUnknownList();
    updateUnknownCount();
}

function closeUnknownList() {
    document.getElementById('unknown-list-card').style.display = 'none';
    document.getElementById('flashcard-setup-card').style.display = 'block';
    updateUnknownCount();
}

function reviewUnknownWords() {
    const lang = flashcardLang;
    const modeId = flashcardMode;
    const prefix = lang + '|' + modeId + '|';
    const unknownWords = [...flashcardUnknownSet].filter(k => k.startsWith(prefix)).map(k => k.split('|')[2]);
    if (unknownWords.length === 0) return;

    const sheetUrl = SHEETS[lang];
    vocabularyList = [];
    readingList = [];
    meaningList = [];
    fetch(sheetUrl)
        .then(r => r.text())
        .then(csv => {
            const rows = Papa.parse(csv, { header: false }).data;
            if (lang === 'jp') parseJapanese(rows);
            else if (lang === 'kr') parseKorean(rows);
            else if (lang === 'fr') parseFrench(rows);
            else if (lang === 'en') parseEnglish(rows);
            else if (lang === 'zh') parseChinese(rows);

            flashcardList = shuffleArray(vocabularyList.filter(w => unknownWords.includes(w.word)));
            flashcardIdx = 0;
            if (flashcardList.length === 0) return;
            document.getElementById('unknown-list-card').style.display = 'none';
            document.getElementById('flashcard-card').style.display = 'block';
            renderFlashcard();
        });
}

function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ===================== Listening Quiz ===================== */

let currentListeningMode = false;
let listeningLang = '';
let listeningMode = '';
let listeningCount = 0;
let listeningMeaningLang = 'zh';

function startListeningQuiz() {
    document.getElementById('lang-card').style.display = 'none';
    document.getElementById('listening-setup-card').style.display = 'block';
    document.getElementById('lc-lang-title').style.display = '';
    document.getElementById('lc-lang-buttons').style.display = '';
    document.getElementById('lc-mode-title').style.display = 'none';
    document.getElementById('lc-mode-buttons').style.display = 'none';
    document.getElementById('lc-count-title').style.display = 'none';
    document.getElementById('lc-count-buttons').style.display = 'none';
    document.getElementById('lc-mode-buttons').innerHTML = '';
    document.getElementById('lc-count-buttons').innerHTML = '';

    const container = document.getElementById('lc-lang-buttons');
    container.innerHTML = '';
    const langs = [
        { id: 'jp', i18n: 'fc_lang_jp', fallback: '🇯🇵 日文' },
        { id: 'kr', i18n: 'fc_lang_kr', fallback: '🇰🇷 韓文' },
        { id: 'fr', i18n: 'fc_lang_fr', fallback: '🇫🇷 法文' },
        { id: 'en', i18n: 'fc_lang_en', fallback: '🇺🇸 英文' },
        { id: 'zh', i18n: 'fc_lang_zh', fallback: '🇨🇳 中文' }
    ];
    langs.forEach(l => {
        const btn = document.createElement('button');
        btn.className = 'mode-btn';
        btn.setAttribute('data-i18n', l.i18n);
        btn.innerText = t(l.i18n) || l.fallback;
        btn.onclick = function() { selectListeningLang(l.id, this); };
        container.appendChild(btn);
    });
}

function selectListeningLang(lang, el) {
    listeningLang = lang;
    document.querySelectorAll('#lc-lang-buttons .mode-btn').forEach(b => b.classList.remove('mode-btn-active'));
    el.classList.add('mode-btn-active');

    const title = document.getElementById('lc-mode-title');
    const container = document.getElementById('lc-mode-buttons');
    title.style.display = '';
    container.style.display = '';
    container.innerHTML = '';

    const modeMap = {
        jp: [
            { id: 'roman', key: 'lc_mode_jp_roman' },
            { id: 'hiragana', key: 'lc_mode_jp_hiragana' },
            { id: 'katakana', key: 'lc_mode_jp_katakana' }
        ],
        kr: [
            { id: 'korean', key: 'lc_mode_kr_korean' }
        ],
        fr: [
            { id: 'french', key: 'lc_mode_fr_french' }
        ],
        en: [
            { id: 'english', key: 'lc_mode_en_english' }
        ],
        zh: [
            { id: 'bopomofo', key: 'lc_mode_zh_bopomofo' },
            { id: 'pinyin', key: 'lc_mode_zh_pinyin' }
        ]
    };

    const modes = modeMap[lang] || [];
    modes.forEach(m => {
        const btn = document.createElement('button');
        btn.className = 'mode-btn';
        btn.setAttribute('data-i18n', m.key);
        btn.innerText = t(m.key);
        btn.onclick = function() { selectListeningMode(m.id, this); };
        container.appendChild(btn);
    });

    document.getElementById('lc-count-title').style.display = 'none';
    document.getElementById('lc-count-buttons').style.display = 'none';

    if (modes.length === 1) {
        setTimeout(() => selectListeningMode(modes[0].id, container.firstChild), 100);
    }
}

function selectListeningMode(modeId, el) {
    listeningMode = modeId;
    document.querySelectorAll('#lc-mode-buttons .mode-btn').forEach(b => b.classList.remove('mode-btn-active'));
    el.classList.add('mode-btn-active');

    document.getElementById('lc-count-title').style.display = 'none';
    document.getElementById('lc-count-buttons').style.display = 'none';

    const title = document.getElementById('lc-meaning-title');
    const container = document.getElementById('lc-meaning-buttons');
    title.style.display = '';
    container.style.display = '';
    container.innerHTML = '';

    const needMeaningChoice = listeningLang !== 'en' && listeningLang !== 'zh';

    if (needMeaningChoice) {
        const btnZh = document.createElement('button');
        btnZh.className = 'mode-btn';
        btnZh.setAttribute('data-i18n', 'answer_lang_zh');
        btnZh.innerText = t('answer_lang_zh') || '中文意思';
        btnZh.onclick = function() { selectListeningMeaningLang('zh', this); };
        container.appendChild(btnZh);
        const btnEn = document.createElement('button');
        btnEn.className = 'mode-btn';
        btnEn.setAttribute('data-i18n', 'answer_lang_en');
        btnEn.innerText = t('answer_lang_en') || '英文意思';
        btnEn.onclick = function() { selectListeningMeaningLang('en', this); };
        container.appendChild(btnEn);
    } else {
        listeningMeaningLang = listeningLang === 'en' ? 'zh' : 'en';
        showListeningCountSelection();
    }
}

function selectListeningMeaningLang(lang, el) {
    listeningMeaningLang = lang;
    document.querySelectorAll('#lc-meaning-buttons .mode-btn').forEach(b => b.classList.remove('mode-btn-active'));
    el.classList.add('mode-btn-active');
    showListeningCountSelection();
}

function showListeningCountSelection() {
    document.getElementById('lc-meaning-title').style.display = 'none';
    document.getElementById('lc-meaning-buttons').style.display = 'none';

    const title = document.getElementById('lc-count-title');
    const container = document.getElementById('lc-count-buttons');
    title.style.display = '';
    container.style.display = '';
    container.innerHTML = '';

    const counts = [
        { n: 10, key: 'quiz_count_10' },
        { n: 20, key: 'quiz_count_20' },
        { n: 30, key: 'quiz_count_30' },
        { n: 0, key: 'quiz_count_all' }
    ];
    counts.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'mode-btn count-btn';
        btn.setAttribute('data-i18n', c.key);
        btn.innerText = t(c.key);
        btn.onclick = function() { startListeningWithConfig(c.n); };
        container.appendChild(btn);
    });
}

function startListeningWithConfig(count) {
    listeningCount = count;
    if (!SHEETS[listeningLang]) return;

    document.getElementById('listening-setup-card').style.display = 'none';

    currentListeningMode = true;
    currentLang = listeningLang;
    score = 0;
    questionNum = 0;
    totalQuestions = count;
    quizHistory = [];

    const sheetUrl = SHEETS[listeningLang];
    fetch(sheetUrl)
        .then(r => r.text())
        .then(csv => {
            const rows = Papa.parse(csv, { header: false }).data;
            if (listeningLang === 'jp') parseJapanese(rows);
            else if (listeningLang === 'kr') parseKorean(rows);
            else if (listeningLang === 'fr') parseFrench(rows);
            else if (listeningLang === 'en') parseEnglish(rows);
            else if (listeningLang === 'zh') parseChinese(rows);

            shuffledVocab = shuffleArray(vocabularyList);
            vocabIdx = 0;

            document.getElementById('quiz-card').style.display = 'block';
            document.getElementById('result-card').style.display = 'none';
            document.getElementById('quiz-mode-label').innerText = t('tool_listening') || '\u{1F50A} 聽力測驗';
            document.getElementById('total-words').innerText = t('quiz_words', {n: vocabularyList.length});
            document.getElementById('timer-display').style.display = 'none';
            document.getElementById('timer-bar-container').style.display = 'none';
            nextListeningQuestion();
        });
}

function closeListeningSetup() {
    document.getElementById('listening-setup-card').style.display = 'none';
    document.getElementById('lang-card').style.display = 'block';
}

function pinyinToToneNumber(str) {
    const toneMap = {
        'ā': 'a1', 'á': 'a2', 'ǎ': 'a3', 'à': 'a4',
        'ē': 'e1', 'é': 'e2', 'ě': 'e3', 'è': 'e4',
        'ī': 'i1', 'í': 'i2', 'ǐ': 'i3', 'ì': 'i4',
        'ō': 'o1', 'ó': 'o2', 'ǒ': 'o3', 'ò': 'o4',
        'ū': 'u1', 'ú': 'u2', 'ǔ': 'u3', 'ù': 'u4',
        'ǖ': 'v1', 'ǘ': 'v2', 'ǚ': 'v3', 'ǜ': 'v4',
        'ü': 'v'
    };
    let result = '';
    for (const ch of str) {
        result += toneMap[ch] || ch;
    }
    return result;
}

function normalizePinyin(str) {
    return pinyinToToneNumber(str).toLowerCase().replace(/\s+/g, '').replace(/ü/g, 'v');
}

function hiraganaToKatakana(h) {
    let r = '';
    for (let i = 0; i < h.length; i++) {
        const c = h.charCodeAt(i);
        if (c >= 0x3041 && c <= 0x3096) r += String.fromCharCode(c + 0x60);
        else r += h[i];
    }
    return r;
}

function katakanaToHiragana(s) {
    let r = '';
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        if (c >= 0x30A1 && c <= 0x30F6) r += String.fromCharCode(c - 0x60);
        else r += s[i];
    }
    return r;
}

function isKatakana(s) {
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        if (c >= 0x30A0 && c <= 0x30FF) return true;
    }
    return false;
}

function hasKanji(s) {
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        if (c >= 0x4E00 && c <= 0x9FAF) return true;
    }
    return false;
}

function getJapaneseReading(w) {
    if (w.kana) return w.kana;
    if (w.word && isKatakana(w.word)) return katakanaToHiragana(w.word);
    return w.word || '';
}

function hiraganaToRomaji(h) {
    const map = {
        '\u3042':'a','\u3044':'i','\u3046':'u','\u3048':'e','\u304A':'o',
        '\u3041':'a','\u3043':'i','\u3045':'u','\u3047':'e','\u3049':'o',
        '\u304B':'ka','\u304D':'ki','\u304F':'ku','\u3051':'ke','\u3053':'ko',
        '\u304C':'ga','\u304E':'gi','\u3050':'gu','\u3052':'ge','\u3054':'go',
        '\u3055':'sa','\u3057':'shi','\u3059':'su','\u305B':'se','\u305D':'so',
        '\u3056':'za','\u3058':'ji','\u305A':'zu','\u305C':'ze','\u305E':'zo',
        '\u305F':'ta','\u3061':'chi','\u3064':'tsu','\u3066':'te','\u3068':'to',
        '\u3060':'da','\u3062':'ji','\u3065':'zu','\u3067':'de','\u3069':'do',
        '\u306A':'na','\u306B':'ni','\u306C':'nu','\u306D':'ne','\u306E':'no',
        '\u306F':'ha','\u3072':'hi','\u3075':'fu','\u3078':'he','\u307B':'ho',
        '\u3070':'ba','\u3073':'bi','\u3076':'bu','\u3079':'be','\u307C':'bo',
        '\u3071':'pa','\u3074':'pi','\u3077':'pu','\u307A':'pe','\u307D':'po',
        '\u307E':'ma','\u307F':'mi','\u3080':'mu','\u3081':'me','\u3082':'mo',
        '\u3084':'ya','\u3086':'yu','\u3088':'yo',
        '\u3083':'ya','\u3085':'yu','\u3087':'yo',
        '\u3089':'ra','\u308A':'ri','\u308B':'ru','\u308C':'re','\u308D':'ro',
        '\u308F':'wa','\u3090':'wi','\u3091':'we','\u3092':'wo',
        '\u3093':'n',
        '\u3040':'a','\u3095':'vu','\u3096':'ka','\u3097':'ke'
    };
    const comboMap = {
        '\u304D\u3083':'kya','\u304D\u3085':'kyu','\u304D\u3087':'kyo',
        '\u304E\u3083':'gya','\u304E\u3085':'gyu','\u304E\u3087':'gyo',
        '\u3057\u3083':'sha','\u3057\u3085':'shu','\u3057\u3087':'sho',
        '\u3058\u3083':'ja','\u3058\u3085':'ju','\u3058\u3087':'jo',
        '\u3061\u3083':'cha','\u3061\u3085':'chu','\u3061\u3087':'cho',
        '\u3062\u3083':'ja','\u3062\u3085':'ju','\u3062\u3087':'jo',
        '\u306B\u3083':'nya','\u306B\u3085':'nyu','\u306B\u3087':'nyo',
        '\u3072\u3083':'hya','\u3072\u3085':'hyu','\u3072\u3087':'hyo',
        '\u3073\u3083':'bya','\u3073\u3085':'byu','\u3073\u3087':'byo',
        '\u3074\u3083':'pya','\u3074\u3085':'pyu','\u3074\u3087':'pyo',
        '\u307F\u3083':'mya','\u307F\u3085':'myu','\u307F\u3087':'myo',
        '\u308A\u3083':'rya','\u308A\u3085':'ryu','\u308A\u3087':'ryo'
    };
    const consonantOf = function(roma) {
        if (!roma) return '';
        if (roma === 'a'||roma==='i'||roma==='u'||roma==='e'||roma==='o') return '';
        if (roma.startsWith('sh') || roma.startsWith('ch') || roma.startsWith('ts')) return roma.substring(0, 2);
        return roma[0] === 'n' ? 'n' : roma[0];
    };
    let r = '';
    let i = 0;
    while (i < h.length) {
        const ch = h[i];
        const cp = h.charCodeAt(i);
        if (cp === 0x3063) {
            if (i + 1 < h.length) {
                let next;
                if (i + 2 < h.length && comboMap[h[i+1]+h[i+2]]) {
                    next = comboMap[h[i+1]+h[i+2]];
                    r += consonantOf(next);
                    r += next;
                    i += 3; continue;
                }
                next = map[h[i+1]] || h[i+1];
                r += consonantOf(next);
                r += next;
                i += 2; continue;
            }
            i++; continue;
        }
        if (cp === 0x30FC) {
            if (r.length > 0) {
                const last = r[r.length - 1];
                if ('aiueo'.includes(last)) r += last;
            }
            i++; continue;
        }
        if (i + 1 < h.length) {
            const combo = h[i] + h[i + 1];
            if (comboMap[combo]) { r += comboMap[combo]; i += 2; continue; }
        }
        r += map[ch] || ch;
        i++;
    }
    return r;
}

function pickOneVariant(s) {
    if (!s) return '';
    const parts = s.split(' / ');
    return parts[Math.floor(Math.random() * parts.length)].trim();
}

function normalizeBopomofo(s) {
    return s.replace(/\s+/g, '');
}

function getListeningCorrectAnswer() {
    const w = currentWord;
    const mode = listeningMode;
    if (mode === 'bopomofo') return normalizeBopomofo(pickOneVariant(w.bopomofo || ''));
    if (mode === 'pinyin') return normalizePinyin(pickOneVariant(w.roman || ''));
    const jpReading = getJapaneseReading(w);
    if (mode === 'roman') return hiraganaToRomaji(jpReading);
    if (mode === 'hiragana') return jpReading;
    if (mode === 'katakana') return hiraganaToKatakana(jpReading);
    if (mode === 'korean') return w.word || '';
    if (mode === 'french') return pickOneVariant(w.word || '');
    if (mode === 'english') return pickOneVariant(w.english || w.word || '');
    return pickOneVariant(w.word || '');
}

function nextListeningQuestion() {
    answered = false;
    questionNum++;
    document.getElementById('question-count').innerText = t('quiz_question', {n: questionNum});
    document.getElementById('score-count').innerText = t('quiz_score', {n: score});
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('feedback').innerText = '';
    document.getElementById('feedback').className = 'feedback';

    if (vocabIdx >= shuffledVocab.length) shuffledVocab = shuffleArray(vocabularyList);
    currentWord = shuffledVocab[vocabIdx++];

    document.getElementById('word-question').innerHTML = '\u{1F50A} ' + (t('listening_hint') || '\u807C\u807C\u770B...');
    document.getElementById('word-hint').innerText = listeningMeaningLang === 'en' ? (currentWord.english || currentWord.meaning || '') : (currentWord.meaning || currentWord.english || '');

    const container = document.getElementById('options-container');
    container.innerHTML = '';
    const inputGroup = document.createElement('div');
    inputGroup.className = 'listening-input-group';
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'listening-input';
    input.className = 'listening-input';
    input.placeholder = t('listening_placeholder') || '\u8F38\u5165\u4F60\u807C\u5230\u7684\u55AE\u5B57...';
    input.setAttribute('autocomplete', 'off');
    const submitBtn = document.createElement('button');
    submitBtn.id = 'listening-submit';
    submitBtn.className = 'btn next-btn';
    submitBtn.innerText = t('listening_submit') || '\u9001\u51FA';
    submitBtn.onclick = function() { submitListeningAnswer(); };
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !answered) submitListeningAnswer();
    });
    inputGroup.appendChild(input);
    inputGroup.appendChild(submitBtn);
    container.appendChild(inputGroup);

    setTimeout(() => { currentWord = currentWord; speakWord(); }, 300);
    setTimeout(() => { input.focus(); }, 500);
}

function submitListeningAnswer() {
    if (answered) return;
    const input = document.getElementById('listening-input');
    if (!input) return;
    const userAnswer = input.value.trim();
    if (!userAnswer) return;

    answered = true;
    input.disabled = true;
    document.getElementById('listening-submit').style.display = 'none';

    const feedback = document.getElementById('feedback');
    const correctAnswer = getListeningCorrectAnswer();
    let normalizedUserAnswer;
    if (listeningMode === 'pinyin') {
        normalizedUserAnswer = normalizePinyin(userAnswer);
    } else if (listeningMode === 'bopomofo') {
        normalizedUserAnswer = normalizeBopomofo(userAnswer);
    } else {
        normalizedUserAnswer = userAnswer.toLowerCase();
    }
    const isCorrect = normalizedUserAnswer === correctAnswer.toLowerCase();

    quizHistory.push({
        question: currentWord.word,
        yourAnswer: userAnswer,
        correctAnswer: correctAnswer,
        isCorrect: isCorrect,
        type: 'listening'
    });

    if (!isCorrect) recordMistake('meaning', correctAnswer);

    if (isCorrect) {
        score += 10;
        feedback.innerText = t('correct');
        feedback.className = 'feedback correct';
        input.style.borderColor = '#6ee7b7';
        playSound(true);
    } else {
        score -= 3;
        feedback.innerText = t('wrong') + correctAnswer;
        feedback.className = 'feedback wrong';
        input.style.borderColor = '#f87171';
        playSound(false);
    }

    document.getElementById('score-count').innerText = t('quiz_score', {n: score});
    if (totalQuestions > 0 && questionNum >= totalQuestions) {
        document.getElementById('nextBtn').innerText = t('quiz_next');
        document.getElementById('nextBtn').onclick = () => showResults();
    } else {
        document.getElementById('nextBtn').innerText = t('quiz_next');
        document.getElementById('nextBtn').onclick = () => nextListeningQuestion();
    }
    document.getElementById('nextBtn').style.display = 'inline-block';
}

document.addEventListener('DOMContentLoaded', updateMistakeBadge);
document.addEventListener('DOMContentLoaded', updateStreakBadge);
document.addEventListener('DOMContentLoaded', checkAchievements);
document.addEventListener('DOMContentLoaded', initTabVisibility);
