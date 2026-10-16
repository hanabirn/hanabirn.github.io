/* ===================== Text-to-speech =====================
   The one place that picks a voice and speaks, used by the quiz, the lesson
   preview, the dictionary and the alphabet chart.

   speechSynthesis lists the device's old built-in voices first (on Windows:
   Microsoft Ayumi, Heami, Hanhan…), which sound robotic, so voices are ranked
   instead: Edge's neural "… Online (Natural)" voices, then Chrome's online
   "Google …" voices, then any other online voice, then the built-in ones.
   Visitors can pick a voice per language in the settings panel; the choice is
   kept by voice name in localStorage['tts_voices'] and ignored on a device
   that doesn't have that voice.

   Japanese, Korean and Chinese words of the bundled sets, the alphabet chart
   and the samples below also exist as pre-rendered neural recordings
   (data/audio/, made by tools/build_audio.py). Unless the visitor picked a
   browser voice for that language, those are played instead; anything without
   a recording falls back to the browser voice. */

const TTS_RATE = 0.9;
const TTS_LANGS = ['ja-JP', 'ko-KR', 'en-US', 'en-GB', 'fr-FR', 'es-ES', 'de-DE', 'ru-RU', 'zh-TW', 'zh-CN'];
const TTS_SAMPLE = {
    'ja-JP': 'こんにちは。はじめまして。',
    'ko-KR': '안녕하세요. 만나서 반가워요.',
    'en-US': 'Hello! Nice to meet you.',
    'en-GB': 'Hello! Nice to meet you.',
    'fr-FR': 'Bonjour ! Enchanté.',
    'es-ES': '¡Hola! Mucho gusto.',
    'de-DE': 'Hallo! Freut mich.',
    'ru-RU': 'Здравствуйте! Очень приятно.',
    'zh-TW': '你好，很高興認識你。',
    'zh-CN': '你好，很高兴认识你。'
};

// recordings per language: directory under data/audio/
const AUDIO_DIRS = { 'ja-JP': 'ja', 'ko-KR': 'ko', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW',
    'fr-FR': 'fr', 'ru-RU': 'ru', 'de-DE': 'de', 'es-ES': 'es', 'en-US': 'en-US', 'en-GB': 'en-GB' };
const audioIndexes = {};
let audioPlaying = null;
let speakSeq = 0;

/* Must match cyrb53() / audio_id() in tools/build_audio.py: the file name of a
   recording is this hash of the text, in base 36. */
function audioId(text) {
    const str = text.normalize('NFC').trim();
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

// id -> file id for one language, loaded once (null while there is none)
function audioIndex(dir) {
    if (!audioIndexes[dir]) {
        audioIndexes[dir] = fetch('data/audio/' + dir + '/index.json')
            .then(r => r.ok ? r.json() : null)
            .then(j => {
                if (!j) return null;
                const map = new Map();
                (j.f || []).forEach(id => map.set(id, id));
                Object.entries(j.a || {}).forEach(([alias, id]) => map.set(alias, id));
                return map;
            })
            .catch(() => { delete audioIndexes[dir]; return null; });
    }
    return audioIndexes[dir];
}

// starts loading a language's index ahead of the first 🔊, so it plays at once
function audioWarm(lang) {
    const dir = AUDIO_DIRS[ttsNorm(lang)];
    if (dir) audioIndex(dir);
}

function ttsNorm(lang) {
    return (lang || '').replace('_', '-');
}

// settings key for a language: its TTS_LANGS entry (Chinese keeps its region)
function ttsKey(lang) {
    const l = ttsNorm(lang), base = l.split('-')[0];
    if (base === 'zh' || TTS_LANGS.includes(l)) return l;
    return TTS_LANGS.find(k => k.startsWith(base + '-')) || l;
}

function ttsScore(v) {
    if (/natural/i.test(v.name)) return 3;
    if (/^google/i.test(v.name)) return 2;
    if (!v.localService) return 1;
    return 0;
}

/* Voices that can read `lang`, best first: the same language (for Chinese the
   same region too — zh-HK is Cantonese), the exact region before others. */
function ttsCandidates(lang) {
    if (!window.speechSynthesis) return [];
    const want = ttsNorm(lang), base = want.split('-')[0];
    return speechSynthesis.getVoices()
        .filter(v => {
            const l = ttsNorm(v.lang);
            return base === 'zh' ? l === want : l.split('-')[0] === base;
        })
        .sort((a, b) => (ttsNorm(b.lang) === want) - (ttsNorm(a.lang) === want) || ttsScore(b) - ttsScore(a));
}

function ttsSaved() {
    try {
        const v = JSON.parse(localStorage.getItem('tts_voices'));
        return v && typeof v === 'object' ? v : {};
    } catch { return {}; }
}

function ttsVoiceFor(lang) {
    const list = ttsCandidates(lang);
    const name = ttsSaved()[ttsKey(lang)];
    return (name && list.find(v => v.name === name)) || list[0] || null;
}

function stopSpeech() {
    speakSeq++;
    if (audioPlaying) {
        audioPlaying.pause();
        audioPlaying = null;
    }
    if (window.speechSynthesis) speechSynthesis.cancel();
}

/* Says `text` in `lang`: a recording if there is one (opts.reading — the kana
   of a Japanese word — picks the right one when a word has several readings),
   else the browser voice. opts.slow plays it at TTS_SLOW_FACTOR of the usual speed
   (the listening quiz's 🐢 button); opts.onend is called once it has finished
   (not when another speakText() / stopSpeech() cut it short) — the 閱讀 page's
   read-all plays sentence after sentence with it. */
const TTS_SLOW_FACTOR = 0.65;

function speakText(text, lang, opts) {
    if (!text) return;
    stopSpeech();
    const seq = speakSeq;
    const slow = !!(opts && opts.slow);
    const onend = opts && typeof opts.onend === 'function'
        ? () => { if (seq === speakSeq) opts.onend(); } : null;
    // English is said in the visitor's accent (opts.exact: just this one — the settings rows)
    if (/^en([-_]|$)/.test(lang || '') && !(opts && opts.exact)) lang = enAccent();
    const dir = AUDIO_DIRS[ttsNorm(lang)];
    if (!dir || ttsSaved()[ttsKey(lang)]) return speakWithVoice(text, lang, slow, onend);
    // an English word not recorded in this accent yet: the other accent's recording
    const other = EN_ACCENTS.includes(lang) && !(opts && opts.exact)
        ? EN_ACCENTS.find(v => v !== lang && !ttsSaved()[v]) : null;
    Promise.all([audioIndex(dir), other ? audioIndex(AUDIO_DIRS[other]) : null]).then(([map, otherMap]) => {
        if (seq !== speakSeq) return;
        const keys = opts && opts.reading ? [text + '|' + opts.reading, text] : [text];
        const find = m => m && keys.map(k => m.get(audioId(k))).find(Boolean);
        let id = find(map), from = dir;
        if (!id && find(otherMap)) {
            id = find(otherMap);
            from = AUDIO_DIRS[other];
        }
        if (!id) return speakWithVoice(text, lang, slow, onend);
        const a = new Audio('data/audio/' + from + '/' + id + '.mp3');
        if (slow) a.playbackRate = TTS_SLOW_FACTOR;
        audioPlaying = a;
        a.addEventListener('ended', () => {
            if (audioPlaying === a) audioPlaying = null;
            if (onend) onend();
        });
        // blocked autoplay or a missing file (offline): use the browser voice
        a.play().catch(() => { if (seq === speakSeq) speakWithVoice(text, lang, slow, onend); });
    });
}

/* ----- English accent -----
   American (en-US, the default) or British (en-GB), picked in the settings panel and on
   the 閱讀 reader (localStorage['en_accent']); every English speakText() follows it. */
const EN_ACCENTS = ['en-US', 'en-GB'];

function enAccent() {
    let v = '';
    try { v = localStorage.getItem('en_accent') || ''; } catch {}
    return EN_ACCENTS.includes(v) ? v : 'en-US';
}

function setEnAccent(v) {
    try {
        if (v === 'en-GB') localStorage.setItem('en_accent', v);
        else localStorage.removeItem('en_accent');
    } catch {}
}

/* ----- Chinese accent -----
   Taiwan (zh-TW) or Mainland (zh-CN), as the visitor picked (settings panel, the 閱讀
   and 文法 pages; localStorage['zh_accent']), else the one that goes with the script
   on screen: Traditional → Taiwan, Simplified → Mainland. */
const ZH_ACCENTS = ['zh-TW', 'zh-CN'];

function zhAccentSaved() {
    let v = '';
    try { v = localStorage.getItem('zh_accent') || ''; } catch {}
    return ZH_ACCENTS.includes(v) ? v : '';
}

function zhAccent(script) {
    return zhAccentSaved() || (script === 'simp' ? 'zh-CN' : 'zh-TW');
}

// the script of the site's Chinese UI, for pages without a 繁 / 简 switch of their own
function zhUiScript() {
    return typeof siteLang !== 'undefined' && siteLang === 'zh-Hans' ? 'simp' : 'trad';
}

function setZhAccent(v) {
    try {
        if (ZH_ACCENTS.includes(v)) localStorage.setItem('zh_accent', v);
        else localStorage.removeItem('zh_accent');
    } catch {}
}

/* Says a Chinese sentence or word in the visitor's accent. Recordings are keyed by
   the Traditional text (`trad`) — except the 閱讀 page's Mainland ones, keyed by the
   Simplified text (`simp`) — so both are tried. One not recorded in that accent yet
   plays the other accent's recording rather than the browser voice, unless the
   visitor picked a browser voice for it. */
function speakChinese(trad, simp, script, opts) {
    const accent = zhAccent(script);
    const other = accent === 'zh-CN' ? 'zh-TW' : 'zh-CN';
    const mine = accent === 'zh-CN' ? [simp || trad, trad] : [trad, simp || trad];
    stopSpeech();
    const seq = speakSeq;
    if (ttsSaved()[ttsKey(accent)]) return speakText(mine[0], accent, opts);
    Promise.all([audioIndex(AUDIO_DIRS[accent]), audioIndex(AUDIO_DIRS[other])]).then(([map, otherMap]) => {
        if (seq !== speakSeq) return;          // stopped meanwhile
        const has = (m, text) => m && m.get(audioId(text));
        const own = mine.find(text => has(map, text));
        if (own) return speakText(own, accent, opts);
        const theirs = mine.slice().reverse().find(text => has(otherMap, text));
        if (theirs && !ttsSaved()[ttsKey(other)]) return speakText(theirs, other, opts);
        speakText(mine[0], accent, opts);
    });
}

function speakWithVoice(text, lang, slow, onend) {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = slow ? TTS_RATE * TTS_SLOW_FACTOR : TTS_RATE;
    const voice = ttsVoiceFor(lang);
    if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
    }
    if (onend) u.onend = onend;
    speechSynthesis.speak(u);
}

/* ----- settings panel ----- */

// "Microsoft Nanami Online (Natural) - Japanese (Japan)" -> "Microsoft Nanami Online (Natural)"
function ttsShortName(v) {
    return v.name.replace(/\s+-\s+[^-]+$/, '');
}

function ttsLangLabel(lang) {
    return lang.startsWith('zh') || lang.startsWith('en') ? t('tts_lang_' + lang.replace('-', '_')) : t('dict_lang_' + lang.split('-')[0]);
}

function renderTtsSettings() {
    const el = document.getElementById('tts-settings-list');
    if (!el) return;
    // the Chinese accent works without browser voices too (recordings)
    const cur = zhAccentSaved();
    const accentRow = `<div class="tts-row">
            <label class="tts-lang" for="tts-zh-accent">${escHtml(t('zh_accent'))}</label>
            <select class="tts-select" id="tts-zh-accent" onchange="setZhAccentFromSettings(this.value)">
                ${[['', 'zh_accent_auto'], ['zh-TW', 'zh_accent_tw'], ['zh-CN', 'zh_accent_cn']].map(([v, k]) =>
                    `<option value="${v}"${cur === v ? ' selected' : ''}>${escHtml(t(k))}</option>`).join('')}
            </select>
            <button type="button" class="speak-btn tts-try" onclick="speakChinese(TTS_SAMPLE['zh-TW'], TTS_SAMPLE['zh-CN'], zhUiScript())" title="${escHtml(t('tts_try'))}" aria-label="${escHtml(t('tts_try'))}">▶</button>
        </div><div class="tts-row">
            <label class="tts-lang" for="tts-en-accent">${escHtml(t('en_accent'))}</label>
            <select class="tts-select" id="tts-en-accent" onchange="setEnAccentFromSettings(this.value)">
                ${[['en-US', 'en_accent_us'], ['en-GB', 'en_accent_gb']].map(([v, k]) =>
                    `<option value="${v}"${enAccent() === v ? ' selected' : ''}>${escHtml(t(k))}</option>`).join('')}
            </select>
            <button type="button" class="speak-btn tts-try" onclick="speakText(TTS_SAMPLE['en-US'], 'en')" title="${escHtml(t('tts_try'))}" aria-label="${escHtml(t('tts_try'))}">▶</button>
        </div>`;
    if (!window.speechSynthesis) {
        el.innerHTML = accentRow + `<p class="tts-empty">${escHtml(t('tts_unsupported'))}</p>`;
        return;
    }
    const saved = ttsSaved();
    el.innerHTML = accentRow + TTS_LANGS.map(lang => {
        const list = ttsCandidates(lang);
        const auto = AUDIO_DIRS[lang]
            ? t('tts_auto_rec', { v: list.length ? ttsShortName(list[0]) : '—' })
            : list.length ? t('tts_auto', { v: ttsShortName(list[0]) }) : '';
        const opts = list.length || AUDIO_DIRS[lang]
            ? [`<option value="">${escHtml(auto)}</option>`]
                .concat(list.map(v => `<option value="${escHtml(v.name)}"${saved[lang] === v.name ? ' selected' : ''}>${escHtml(ttsShortName(v))}</option>`))
            : [`<option value="">${escHtml(t('tts_none'))}</option>`];
        return `<div class="tts-row">
            <label class="tts-lang" for="tts-${lang}">${escHtml(ttsLangLabel(lang))}</label>
            <select class="tts-select" id="tts-${lang}" onchange="setTtsVoice('${lang}', this.value)"${list.length ? '' : ' disabled'}>${opts.join('')}</select>
            <button type="button" class="speak-btn tts-try" onclick="speakText(TTS_SAMPLE['${lang}'], '${lang}', {exact: true})" title="${escHtml(t('tts_try'))}" aria-label="${escHtml(t('tts_try'))}"${list.length || AUDIO_DIRS[lang] ? '' : ' disabled'}>▶</button>
        </div>`;
    }).join('');
}

function setZhAccentFromSettings(v) {
    setZhAccent(v);
    speakChinese(TTS_SAMPLE['zh-TW'], TTS_SAMPLE['zh-CN'], zhUiScript());
    // the 閱讀 / 文法 pages show the accent on their own switches; only the open one is
    // redrawn (they set page-wide classes on <body>), the other draws itself when opened
    const page = document.body.dataset.page;
    if (page === 'reading' && typeof renderReading === 'function') renderReading();
    if (page === 'grammar' && typeof renderGrammar === 'function') renderGrammar();
}

function setTtsVoice(lang, name) {
    const saved = ttsSaved();
    if (name) saved[lang] = name; else delete saved[lang];
    try { localStorage.setItem('tts_voices', JSON.stringify(saved)); } catch {}
    speakText(TTS_SAMPLE[lang], lang, { exact: true });
}

function setEnAccentFromSettings(v) {
    setEnAccent(v);
    speakText(TTS_SAMPLE['en-US'], 'en');
    if (document.body.dataset.page === 'reading' && typeof renderReading === 'function') renderReading();
}

// Chrome fills the voice list asynchronously; refresh the panel when it arrives.
// The event can fire while the page is still loading — before quiz.js (escHtml)
// exists — so only redraw a panel that is actually open.
if (window.speechSynthesis) {
    speechSynthesis.getVoices();
    speechSynthesis.addEventListener('voiceschanged', () => {
        const overlay = document.getElementById('tab-settings-overlay');
        if (overlay && overlay.classList.contains('show')) renderTtsSettings();
    });
}
