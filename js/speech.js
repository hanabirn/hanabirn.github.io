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
const TTS_LANGS = ['ja-JP', 'ko-KR', 'en-US', 'fr-FR', 'es-ES', 'de-DE', 'ru-RU', 'zh-TW', 'zh-CN'];
const TTS_SAMPLE = {
    'ja-JP': 'こんにちは。はじめまして。',
    'ko-KR': '안녕하세요. 만나서 반가워요.',
    'en-US': 'Hello! Nice to meet you.',
    'fr-FR': 'Bonjour ! Enchanté.',
    'es-ES': '¡Hola! Mucho gusto.',
    'de-DE': 'Hallo! Freut mich.',
    'ru-RU': 'Здравствуйте! Очень приятно.',
    'zh-TW': '你好，很高興認識你。',
    'zh-CN': '你好，很高兴认识你。'
};

// recordings per language: directory under data/audio/
const AUDIO_DIRS = { 'ja-JP': 'ja', 'ko-KR': 'ko', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW' };
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
    if (base === 'zh') return l;
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
   else the browser voice. */
function speakText(text, lang, opts) {
    if (!text) return;
    stopSpeech();
    const seq = speakSeq;
    const dir = AUDIO_DIRS[ttsNorm(lang)];
    if (!dir || ttsSaved()[ttsKey(lang)]) return speakWithVoice(text, lang);
    audioIndex(dir).then(map => {
        if (seq !== speakSeq) return;
        const keys = opts && opts.reading ? [text + '|' + opts.reading, text] : [text];
        const id = map && keys.map(k => map.get(audioId(k))).find(Boolean);
        if (!id) return speakWithVoice(text, lang);
        const a = new Audio('data/audio/' + dir + '/' + id + '.mp3');
        audioPlaying = a;
        a.addEventListener('ended', () => { if (audioPlaying === a) audioPlaying = null; });
        // blocked autoplay or a missing file (offline): use the browser voice
        a.play().catch(() => { if (seq === speakSeq) speakWithVoice(text, lang); });
    });
}

function speakWithVoice(text, lang) {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = TTS_RATE;
    const voice = ttsVoiceFor(lang);
    if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
    }
    speechSynthesis.speak(u);
}

/* ----- settings panel ----- */

// "Microsoft Nanami Online (Natural) - Japanese (Japan)" -> "Microsoft Nanami Online (Natural)"
function ttsShortName(v) {
    return v.name.replace(/\s+-\s+[^-]+$/, '');
}

function ttsLangLabel(lang) {
    return lang.startsWith('zh') ? t('tts_lang_' + lang.replace('-', '_')) : t('dict_lang_' + lang.split('-')[0]);
}

function renderTtsSettings() {
    const el = document.getElementById('tts-settings-list');
    if (!el) return;
    if (!window.speechSynthesis) {
        el.innerHTML = `<p class="tts-empty">${escHtml(t('tts_unsupported'))}</p>`;
        return;
    }
    const saved = ttsSaved();
    el.innerHTML = TTS_LANGS.map(lang => {
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
            <button type="button" class="speak-btn tts-try" onclick="speakText(TTS_SAMPLE['${lang}'], '${lang}')" title="${escHtml(t('tts_try'))}" aria-label="${escHtml(t('tts_try'))}"${list.length || AUDIO_DIRS[lang] ? '' : ' disabled'}>▶</button>
        </div>`;
    }).join('');
}

function setTtsVoice(lang, name) {
    const saved = ttsSaved();
    if (name) saved[lang] = name; else delete saved[lang];
    try { localStorage.setItem('tts_voices', JSON.stringify(saved)); } catch {}
    speakText(TTS_SAMPLE[lang], lang);
}

// Chrome fills the voice list asynchronously; refresh the panel when it arrives
if (window.speechSynthesis) {
    speechSynthesis.getVoices();
    speechSynthesis.addEventListener('voiceschanged', renderTtsSettings);
}
