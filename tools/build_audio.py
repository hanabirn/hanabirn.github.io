"""Pre-renders natural (Google Cloud Text-to-Speech) audio for Japanese, Korean
and Chinese.

Browsers' built-in Japanese / Korean / Chinese voices sound robotic, so the
words of the JLPT, TOPIK and HSK sets, the topic sets (tp_ja_*, tp_ko_*,
tp_zh_*), the alphabet chart and the voice-picker
samples are rendered once here and shipped as small MP3s. js/speech.js plays
them when it has one and falls back to the browser voice otherwise.

French, Russian, Spanish and German (the CEFR word lists, topics, 文法 and 閱讀)
are rendered too (fr, ru, es, de), and since 2026-10-16 English in two accents
(en-US, en-GB: the 國中 / 高中 / 多益 / 托福 lists, topics, 閱讀 and the alphabet tab).

Output, per language directory (ja, ko, zh-CN, zh-TW, fr, ru, de, es, en-US, en-GB) under data/audio/:
    <id>.mp3     id = cyrb53(text) in base 36 — the same hash audioId() in
                 js/speech.js computes for the text the site asks to say
    index.json   {"voice": ..., "f": [ids], "a": {alias id: file id}}
Aliases let simplified Chinese reuse the traditional word's file.

Japanese words with kanji are spoken from their kana reading, so the audio
always matches the reading the quiz teaches. One written word can have several
readings in the lists (一日: ついたち / いちにち), so such words are keyed by
"word|kana", with the plain word as an alias for the reading met first going
from N5 up (the most basic one) — used when the site doesn't know the reading.

Each word is one request; the audio comes back as 16-bit PCM, the silence
around it is trimmed and it is encoded to a small MP3. Existing MP3s are kept,
so re-running only renders what is new (delete a file to re-render it).

Setup: pip install lameenc
       put GOOGLE_TTS_KEY=<API key> in tools/.google-tts.env (git-ignored);
       a voice can be overridden there too, e.g. GOOGLE_TTS_VOICE_ja=ja-JP-Neural2-C
Usage: python tools/build_audio.py --audition      # sample every voice, then pick
       python tools/build_audio.py [--only ja|ko|zh-CN|zh-TW|fr|ru|de|es|en-US|en-GB] [--limit N] [--dry-run]
       python tools/build_audio.py --only de --redo   # a new voice: re-render all of a language
--redo renders into the git-ignored tools/.audio-redo/<lang>/ (so an interrupted run
carries on, and the site keeps playing the old voice meanwhile) and copies the files
over the old ones once every file has been tried; with --limit it only renders a test batch.

Chinese with Gemini (--gemini, added 2026-10-10): Google Cloud has no natural
Taiwan Mandarin voice (only the old Wavenet), so zh-TW / zh-CN can be (re-)rendered
with the Gemini TTS model (GEMINI_TTS_MODEL), told by an English instruction to use a
Taiwan accent (voice Aoede) or Mainland Mandarin (voice Kore) — picked by ear. It uses
GEMINI_TTS_KEY from tools/.gemini-tts.env (git-ignored; a separate project with
billing, for recordings only — about $0.0002 a second of audio in 2026), else the
assistant's key (worker/assistant/.dev.vars), whose project has no billing and gets
only 10 TTS requests a day: the run stops when
the day's quota is spent (it resets at midnight Pacific time) and the next run
carries on. Order: the 閱讀 page (tier 0), the 文法 examples (tier 1), and with
--gemini-all everything else (words, alphabet, samples; tier 2). The model now and
then reads the instruction aloud too, so every clip is checked against the length
of its text and re-rendered (4 tries, 5 for a word of up to 4 characters; otherwise the old file stays). Files made by
Gemini are listed in index.json under "g". About 1 sentence in 5 ends with a short
mouth click, heard as a pop, and the gemini-3.8 models start every clip with ~80 ms
of noise, heard as a pop the moment 🔊 is pressed; drop_end_click() and
drop_lead_burst() cut them from every new clip, and --fix-clicks from the files
already made (needs `pip install miniaudio numpy`).
       python tools/build_audio.py --gemini [--only zh-TW|zh-CN] [--gemini-all] [--limit N]
       python tools/build_audio.py --fix-clicks [--only zh-TW|zh-CN]
"""
import argparse, base64, io, json, re, struct, sys, time, unicodedata, urllib.error, urllib.request, wave
import threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'data' / 'audio'
AUDITION = ROOT / 'tools' / '.audio-audition'
ENV_FILE = ROOT / 'tools' / '.google-tts.env'
API = 'https://texttospeech.googleapis.com/v1/'

# output dir -> (language code on the site, Google language code, voice, backup voice)
# Voices picked by ear with --audition (2026-10); Taiwan Mandarin has no Chirp3-HD
# voice. Chirp3-HD often returns silence or a clipped fragment for a lone kana
# or hangul syllable (い, き, 예, 이), so those — and anything still too short after
# retries — use the backup. Lone Chinese characters (爱, 八) are fine.
LANGS = {
    'ja': ('ja-JP', 'ja-JP', 'ja-JP-Chirp3-HD-Erinome', 'ja-JP-Neural2-B'),
    'ko': ('ko-KR', 'ko-KR', 'ko-KR-Chirp3-HD-Kore', 'ko-KR-Neural2-A'),
    'zh-CN': ('zh-CN', 'cmn-CN', 'cmn-CN-Chirp3-HD-Leda', 'cmn-CN-Wavenet-A'),
    'zh-TW': ('zh-TW', 'cmn-TW', 'cmn-TW-Wavenet-A', 'cmn-TW-Wavenet-A'),
    # European languages (added 2026-10-08: the browser voices sound robotic; Chirp3-HD
    # also rolls the Spanish / Russian r properly).
    'fr': ('fr-FR', 'fr-FR', 'fr-FR-Chirp3-HD-Kore', 'fr-FR-Neural2-F'),
    'ru': ('ru-RU', 'ru-RU', 'ru-RU-Chirp3-HD-Kore', 'ru-RU-Wavenet-C'),
    # German: Kore until 2026-10-16, then Zephyr (the owner's pick, 2026-10-11) —
    # re-rendered with --redo
    'de': ('de-DE', 'de-DE', 'de-DE-Chirp3-HD-Zephyr', 'de-DE-Neural2-G'),
    'es': ('es-ES', 'es-ES', 'es-ES-Chirp3-HD-Kore', 'es-ES-Neural2-H'),
    # English (2026-10-16) in both accents, the visitor picks one (en_accent in
    # js/speech.js): American Leda, British Erinome (owner's picks, 2026-10-11)
    'en-US': ('en-US', 'en-US', 'en-US-Chirp3-HD-Leda', 'en-US-Neural2-F'),
    'en-GB': ('en-GB', 'en-GB', 'en-GB-Chirp3-HD-Erinome', 'en-GB-Neural2-A'),
}
REDO = ROOT / 'tools' / '.audio-redo'   # --redo renders here first, then swaps
MIN_CLIP = 0.3         # seconds; shorter means the voice said nothing or got cut
QUIET_PEAK = 3000      # int16; a clip whose loudest sample is under this only whispered (はい, うん came out
                       # at -36 dB and passed the length check — found by tools/audio_check.py, 2026-10-23)
RATE = 0.9             # a little slower, for learners
SR = 16000
WORKERS = 8
RPM = 200              # requests per minute; Chirp3-HD answers 429 well before 300

# Gemini TTS for Chinese (--gemini): output dir -> (voice, instruction before the text)
GEMINI_TTS_MODEL = 'gemini-3.8-flash-tts'
# each model has its own 100 requests a day, so a run moves on to the next when one is
# spent: the owner's pick first, then the others (owner OK'd them for speed, 2026-10-10);
# the lite model kept reading the instruction in Mainland Mandarin, so zh-TW only
GEMINI_TTS_MODELS = ['gemini-3.8-flash-tts', 'gemini-3.1-flash-tts-preview', 'gemini-3.8-flash-lite-tts']
GEMINI_MODEL_LANGS = {'gemini-3.8-flash-lite-tts': {'zh-TW'}}
# Mainland Mandarin: 3.1 first — it made most of the Mainland 閱讀 recordings (one voice
# throughout), 3.8 often misreads the length in zh-CN, and 3.1 has no noise before the voice
GEMINI_LANG_ORDER = {'zh-CN': ['gemini-3.1-flash-tts-preview', 'gemini-3.8-flash-tts'],
                     # Japanese 閱讀 (2026-10-16): Aoede, picked by the owner over the Google voice;
                     # 3.8 only, so every passage sounds the same (owner, 2026-10-16)
                     'ja': ['gemini-3.8-flash-tts']}
# Japanese with Gemini only for the 閱讀 levels listed here (tier 0); everything else in
# Japanese — words, grammar examples, the other reading levels — stays with Google, and
# Gemini is given the sentence as written (kanji and all, GEMINI_SAY), not the kana
# N5 re-recorded to match N4 (owner, 2026-10-16); recorded in this order, a level at a time
GEMINI_JA_READING = ['ja_n5', 'ja_n4', 'ja_n3', 'ja_n2', 'ja_n1']
GEMINI_SAY = {}        # (lang, file id) -> the text Gemini reads, when it isn't files[fid]
GEMINI_RANK = {}       # (lang, file id) -> its level's place in GEMINI_JA_READING
# kanji Gemini reads its own way (錄音檢查 2026-10-29: 間 → あいだ for ま, 明日 → あす, 何に
# → なんに): a segment of exactly these is given to Gemini in the kana the page shows
GEMINI_JA_KANA = {'間', '明日', '何'}


def gemini_ja_text(sent):
    """a 閱讀 sentence as Gemini reads it: as written, but GEMINI_JA_KANA kanji in their kana"""
    if not any(seg[0] in GEMINI_JA_KANA and seg[1] for seg in sent.get('t', [])):
        return sent['plain']
    return ''.join(seg[1] if seg[0] in GEMINI_JA_KANA and seg[1] else seg[0] for seg in sent['t'])
REGEMINI = ''          # --regemini: files made by this model (index.json "gm") count as not made
GEMINI_SPENT = set()   # models whose daily quota ran out during this run
GEMINI_VOICES = {
    'zh-TW': ('Aoede', 'Read the following Chinese text aloud in a natural, warm Taiwanese Mandarin '
                       'accent (台灣華語), at a calm, clear pace. Say only the text:\n'),
    'zh-CN': ('Kore', 'Read the following Chinese text aloud in natural, standard Mainland Mandarin '
                      '(普通话), at a calm, clear pace. Say only the text:\n'),
    'ja': ('Aoede', 'Read the following Japanese text aloud in natural, standard Tokyo Japanese, '
                    'like a calm audiobook narrator, at a clear pace for learners. Say only the text:\n'),
}
GEMINI_RPM = 8
GEMINI_SR = 24000
TIERS = {}             # lang -> {file id: 0 reading, 1 grammar, 2 the rest}; filled by jobs()

_lock = threading.Lock()
_next_slot = 0.0       # earliest time the next request may start (shared by all threads)


def throttle(pause=0.0):
    """Spaces requests RPM-per-minute apart across threads; pause pushes them all back."""
    global _next_slot
    with _lock:
        now = time.time()
        if pause:
            _next_slot = max(_next_slot, now + pause)
            return
        slot = max(_next_slot, now)
        _next_slot = slot + 60.0 / RPM
    time.sleep(max(0.0, slot - time.time()))

# a few words per language for --audition (zh: 老師 / 吃 / 中 test the retroflexes)
AUDITION_WORDS = {
    'ja': ['こんにちは。はじめまして。', 'りんご', 'ありがとう', 'がっこう', 'ついたち'],
    'ko': ['안녕하세요. 만나서 반가워요.', '사과', '감사합니다', '학교', '병원'],
    'zh-CN': ['你好，很高兴认识你。', '老师', '吃饭', '中国人', '日本'],
    'zh-TW': ['你好，很高興認識你。', '老師', '吃飯', '中國人', '日本'],
    'fr': ['Bonjour, enchanté.', 'le chat', 'la grenouille', 'rouge', 'écureuil'],
    'ru': ['Здравствуйте, очень приятно.', 'рыба', 'хорошо', 'здравствуйте', 'спасибо'],
    'de': ['Guten Tag, freut mich.', 'Brötchen', 'Eichhörnchen', 'rot', 'Straße'],
    'es': ['Hola, mucho gusto.', 'perro', 'ratón', 'ferrocarril', 'jirafa'],
}

sys.stdout.reconfigure(encoding='utf-8')


# ---------- the hash shared with js/speech.js ----------
def cyrb53(s, seed=0):
    def imul(a, b):
        return (a * b) & 0xFFFFFFFF
    h1, h2 = 0xDEADBEEF ^ seed, 0x41C6CE57 ^ seed
    data = s.encode('utf-16-le')
    for (ch,) in struct.iter_unpack('<H', data):   # JS charCodeAt: UTF-16 units
        h1 = imul(h1 ^ ch, 2654435761)
        h2 = imul(h2 ^ ch, 1597334677)
    h1 = imul(h1 ^ (h1 >> 16), 2246822507)
    h1 ^= imul(h2 ^ (h2 >> 13), 3266489909)
    h2 = imul(h2 ^ (h2 >> 16), 2246822507)
    h2 ^= imul(h1 ^ (h1 >> 13), 3266489909)
    return 4294967296 * (2097151 & h2) + h1


def base36(n):
    digits = '0123456789abcdefghijklmnopqrstuvwxyz'
    out = ''
    while True:
        n, r = divmod(n, 36)
        out = digits[r] + out
        if not n:
            return out


def norm(text):
    return unicodedata.normalize('NFC', text).strip()


def audio_id(text):
    return base36(cyrb53(norm(text)))


# ---------- what to say ----------
HAS_KANJI = re.compile(r'[㐀-䶿一-鿿々]')


def vocab(prefix, reverse=False):
    for f in sorted((ROOT / 'data' / 'vocab').glob(prefix + '*.json'), reverse=reverse):
        yield from json.loads(f.read_text(encoding='utf-8'))['words']


def alphabet(tabs):
    """The letters' spoken text and example words of these alphabet-chart tabs."""
    src = (ROOT / 'js' / 'alphabet-data.js').read_text(encoding='utf-8')
    tab = None
    for line in src.splitlines():
        m = re.match(r'\s{4}(\w+): \{ tts:', line)
        if m:
            tab = m.group(1)
            continue
        m = re.match(r'\s+(\[".*\]),\s*$', line)
        if m and tab in tabs:
            item = json.loads(m.group(1))
            for text in (item[2], item[3]):
                if text:
                    yield text


def samples(site_lang):
    src = (ROOT / 'js' / 'speech.js').read_text(encoding='utf-8')
    m = re.search(r"'" + re.escape(site_lang) + r"': '([^']+)'", src)
    return [m.group(1)] if m else []


def jobs(lang):
    """Returns ({file id: text to speak}, {alias id: file id})."""
    files, aliases = {}, {}
    tiers = TIERS.setdefault(lang, {})

    def add(key, spoken, tier=2):
        fid = audio_id(key)
        tiers[fid] = min(tier, tiers.get(fid, 2))
        if fid in files and files[fid] != norm(spoken):
            print(f'  ! {lang}: {key!r} already says {files[fid]!r}, keeping that')
            return fid
        files.setdefault(fid, norm(spoken))
        return fid

    for text in samples(LANGS[lang][0]):
        add(text, text)
    if lang == 'ja':
        for text in alphabet({'hira', 'kata'}):
            add(text, text)
        # N5 first, then the 單字 page topics (tp_ja_*), so a plain word's alias
        # keeps the most basic JLPT reading
        # 文法 page examples (data/grammar/ja_*.json): keyed "sentence|kana" like
        # kanji words, spoken from the kana so the reading is the one taught
        for f in sorted((ROOT / 'data' / 'grammar').glob('ja_*.json')):
            for point in json.loads(f.read_text(encoding='utf-8'))['points']:
                for ex in point['examples']:
                    fid = add(ex['ja'] + '|' + ex['kana'], ex['kana'].replace(' ', ''))
                    aliases.setdefault(audio_id(ex['ja']), fid)
        # 閱讀 page (data/reading/ja_*.json): every sentence keyed "plain|kana" and spoken
        # from the kana (tools/build_reading.py makes both), and the glossary words
        for f in sorted((ROOT / 'data' / 'reading').glob('ja_*.json')):
            gem = f.stem in GEMINI_JA_READING
            rank = GEMINI_JA_READING.index(f.stem) if gem else 0
            for p in json.loads(f.read_text(encoding='utf-8'))['passages']:
                for para in p['paragraphs']:
                    for sent in para['s']:
                        fid = add(sent['plain'] + '|' + sent['kana'], sent['kana'], 0 if gem else 2)
                        if gem:
                            GEMINI_SAY[('ja', fid)] = gemini_ja_text(sent)
                            GEMINI_RANK[('ja', fid)] = rank
                for g in p['glossary']:
                    if HAS_KANJI.search(g['w']) and g['r']:
                        fid = add(g['w'] + '|' + g['r'], g['r'])
                        aliases.setdefault(audio_id(g['w']), fid)
                    else:
                        add(g['w'], g['w'])
        rows = list(vocab('jlpt_', reverse=True)) + list(vocab('tp_ja_'))
        for word, kana, *_ in rows:
            if HAS_KANJI.search(word) and kana:
                fid = add(word + '|' + kana, kana)
                aliases.setdefault(audio_id(word), fid)
            else:
                add(word, word)
    elif lang == 'ko':
        for text in alphabet({'ko'}):
            add(text, text)
        for word, *_ in list(vocab('topik_')) + list(vocab('tp_ko_')):
            add(word, word)
        # 閱讀 page (data/reading/ko_*.json): every sentence and glossary word
        for f in sorted((ROOT / 'data' / 'reading').glob('ko_*.json')):
            for p in json.loads(f.read_text(encoding='utf-8'))['passages']:
                for para in p['paragraphs']:
                    for sent in para['s']:
                        add(sent['plain'], sent['plain'])
                for g in p['glossary']:
                    add(g['w'], g['w'])
        # 文法 page examples (data/grammar/ko_*.json)
        for f in sorted((ROOT / 'data' / 'grammar').glob('ko_*.json')):
            for point in json.loads(f.read_text(encoding='utf-8'))['points']:
                for ex in point['examples']:
                    add(ex['text'], ex['text'])
    elif lang in ('fr', 'ru', 'de', 'es'):
        for text in alphabet({lang}):
            add(text, text)
        if lang in ('fr', 'ru', 'es', 'de'):
            # French / Spanish / German rows carry their article (le chat, el gato, der Hund),
            # Russian the plain word; the CEFR lists, then the 單字 page topics (tp_<lang>_*)
            # Spanish "el/la joven" (either gender) is said "el o la joven", not "el barra la"
            # (錄音檢查 2026-10-29)
            for word, *_ in list(vocab(lang + '_')) + list(vocab('tp_' + lang + '_')):
                add(word, word.replace('el/la ', 'el o la ') if lang == 'es' else word)
            # 文法 page examples (data/grammar/fr_*.json, ru_*.json)
            for f in sorted((ROOT / 'data' / 'grammar').glob(lang + '_*.json')):
                for point in json.loads(f.read_text(encoding='utf-8'))['points']:
                    for ex in point['examples']:
                        add(ex['text'], ex['text'])
            # 閱讀 page (data/reading/fr_*.json …): every sentence and glossary word
            for f in sorted((ROOT / 'data' / 'reading').glob(lang + '_*.json')):
                for p in json.loads(f.read_text(encoding='utf-8'))['passages']:
                    for para in p['paragraphs']:
                        for sent in para['s']:
                            add(sent['plain'], sent['plain'])
                    for g in p['glossary']:
                        add(g['w'], g['w'])
    elif lang in ('en-US', 'en-GB'):
        for text in alphabet({'en'}):
            add(text, text)
        # 國中 / 高中 / 多益 / 托福, then the 單字 page topics; a few rows are two
        # forms (a/an, movie/film): said as two words, not "a slash an"
        for word, *_ in list(vocab('en_')) + list(vocab('tp_en_')):
            add(word, word.replace('/', ', '))
        # 閱讀 page (data/reading/en_*.json): every sentence and glossary word
        for f in sorted((ROOT / 'data' / 'reading').glob('en_*.json')):
            for p in json.loads(f.read_text(encoding='utf-8'))['passages']:
                for para in p['paragraphs']:
                    for sent in para['s']:
                        add(sent['plain'], sent['plain'])
                for g in p['glossary']:
                    add(g['w'], g['w'])
    else:
        if lang == 'zh-TW':
            for text in alphabet({'zh'}):       # 注音 is Taiwan's: no Mainland recordings
                add(text, text)
        # 文法 page examples (data/grammar/zh_*.json, Traditional): keyed by the
        # Traditional text in both accents (the page has no Simplified), the Mainland
        # voice reading it in Simplified — converted character by character (tw2s),
        # so it says the Taiwan words on screen (捷運 → 捷运, not 地铁)
        if lang == 'zh-CN':
            import opencc
            tw2s = opencc.OpenCC('tw2s').convert
        for f in sorted((ROOT / 'data' / 'grammar').glob('zh_*.json')):
            for point in json.loads(f.read_text(encoding='utf-8'))['points']:
                for ex in point['examples']:
                    add(ex['text'], ex['text'] if lang == 'zh-TW' else tw2s(ex['text']), 1)
        # 閱讀 page (data/reading/zh_*.json): every sentence and glossary word — in
        # Traditional for zh-TW and in Simplified for zh-CN (the reader speaks the
        # script it shows, with that accent)
        for f in sorted((ROOT / 'data' / 'reading').glob('zh_*.json')):
            for p in json.loads(f.read_text(encoding='utf-8'))['passages']:
                for para in p['paragraphs']:
                    for sent in para['s']:
                        text = sent['plain'] if lang == 'zh-TW' else ''.join(sg[4] for sg in sent['t'])
                        add(text, text, 0)
                for g in p['glossary']:
                    w = g['w'] if lang == 'zh-TW' else g.get('simp') or g['w']
                    add(w, w, 0)
        for trad, simp, *_ in list(vocab('hsk_')) + list(vocab('tp_zh_')):
            fid = add(trad, simp if lang == 'zh-CN' else trad)
            if simp != trad:
                aliases[audio_id(simp)] = fid
    aliases = {a: f for a, f in aliases.items() if a not in files}
    return files, aliases


# ---------- Google Cloud Text-to-Speech ----------
def load_env():
    env = {}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding='utf-8-sig').splitlines():
            if '=' in line and not line.lstrip().startswith('#'):
                k, v = line.split('=', 1)
                env[k.strip()] = v.strip()
    if not env.get('GOOGLE_TTS_KEY'):
        sys.exit(f'Put GOOGLE_TTS_KEY=<API key> in {ENV_FILE.relative_to(ROOT)}')
    return env


def call(env, path, body=None):
    url = API + path + ('&' if '?' in path else '?') + 'key=' + env['GOOGLE_TTS_KEY']
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    for attempt in range(12):
        throttle()
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            msg = e.read().decode('utf-8', 'replace')
            if e.code == 429 and attempt < 11:
                throttle(pause=60)          # the per-minute quota: everyone waits
                continue
            if e.code in (500, 502, 503) and attempt < 11:
                time.sleep(10)
                continue
            raise RuntimeError(f'HTTP {e.code}: {msg[:300]}') from None
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt < 11:
                time.sleep(10)
                continue
            raise RuntimeError(f'network: {e}') from None


def synthesize(env, lang_code, voice, text):
    """PCM samples (16 kHz mono) of `text`, silence around it trimmed."""
    body = {'input': {'text': text},
            'voice': {'languageCode': lang_code, 'name': voice},
            'audioConfig': {'audioEncoding': 'LINEAR16', 'sampleRateHertz': SR, 'speakingRate': RATE}}
    res = call(env, 'text:synthesize', body)
    with wave.open(io.BytesIO(base64.b64decode(res['audioContent']))) as w:
        rate = w.getframerate()
        raw = w.readframes(w.getnframes())
    if rate != SR:
        raise RuntimeError(f'{voice} returned {rate} Hz')
    return trim(struct.unpack('<%dh' % (len(raw) // 2), raw))


def loud_enough(clip):
    return bool(clip) and max(abs(x) for x in clip) >= QUIET_PEAK


def trim(samples, sr=SR):
    """Cuts the silence around one word, keeping a short natural margin."""
    if not samples:
        return []
    peak = max(abs(x) for x in samples)
    thr = max(300, peak * 0.03)
    loud = [i for i, x in enumerate(samples) if abs(x) > thr]
    if not loud:
        return []
    start = max(0, loud[0] - int(0.06 * sr))
    end = min(len(samples), loud[-1] + int(0.15 * sr))
    return list(samples[start:end])


def to_mp3(samples, sr=SR, kbps=32):
    import lameenc
    enc = lameenc.Encoder()
    enc.set_bit_rate(kbps)
    enc.set_in_sample_rate(sr)
    enc.set_channels(1)
    enc.set_quality(2)
    return enc.encode(struct.pack('<%dh' % len(samples), *samples)) + enc.flush()


def voice_for(env, lang):
    return env.get('GOOGLE_TTS_VOICE_' + lang) or LANGS[lang][2]


# ---------- Gemini TTS (Chinese, --gemini) ----------
class QuotaSpent(Exception):
    pass


def gemini_key():
    # a key from a project with billing, used only for recordings (tools/.gemini-tts.env,
    # git-ignored); without it, the assistant's free-tier key (10 TTS requests a day)
    paid = ROOT / 'tools' / '.gemini-tts.env'
    for line in paid.read_text(encoding='utf-8-sig').splitlines() if paid.exists() else []:
        if line.strip().startswith('GEMINI_TTS_KEY') and line.split('=', 1)[1].strip():
            return line.split('=', 1)[1].strip().strip('"')
    f = ROOT / 'worker' / 'assistant' / '.dev.vars'
    for line in f.read_text(encoding='utf-8-sig').splitlines() if f.exists() else []:
        if line.strip().startswith('GEMINI_API_KEY'):
            return line.split('=', 1)[1].strip().strip('"')
    sys.exit('Put GEMINI_API_KEY in worker/assistant/.dev.vars')


def gemini_say(key, lang, text, model=None):
    """PCM samples (24 kHz) of Gemini TTS saying `text`, trimmed; QuotaSpent when the
    model's daily quota is used up."""
    voice, instruction = GEMINI_VOICES[lang]
    body = {'contents': [{'parts': [{'text': instruction + text}]}],
            'generationConfig': {'responseModalities': ['AUDIO'],
                                 'speechConfig': {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': voice}}}}}
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model or GEMINI_TTS_MODEL}:generateContent?key={key}'
    req = urllib.request.Request(url, json.dumps(body).encode(), {'Content-Type': 'application/json'})
    for attempt in range(8):
        throttle()
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                res = json.load(r)
            break
        except urllib.error.HTTPError as e:
            msg = e.read().decode('utf-8', 'replace')
            if e.code == 429:
                if re.search(r'PerDay|per_day|per day', msg, re.I):
                    raise QuotaSpent(msg[:3000]) from None
                throttle(pause=60)
                continue
            if e.code in (500, 502, 503, 504) and attempt < 7:
                time.sleep(20)
                continue
            raise RuntimeError(f'HTTP {e.code}: {msg[:300]}') from None
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt < 7:
                time.sleep(15)
                continue
            raise RuntimeError(f'network: {e}') from None
    else:
        raise RuntimeError('no answer')
    try:
        part = res['candidates'][0]['content']['parts'][0]['inlineData']
    except (KeyError, IndexError):
        raise RuntimeError(f'no audio: {str(res)[:200]}') from None
    raw = strip_c2pa(base64.b64decode(part['data']))
    m = re.search(r'rate=(\d+)', part.get('mimeType', ''))
    if m and int(m.group(1)) != GEMINI_SR:
        raise RuntimeError(f'Gemini returned {m.group(1)} Hz')
    clip = drop_lead_burst(trim(struct.unpack('<%dh' % (len(raw) // 2), raw), GEMINI_SR), GEMINI_SR)
    return drop_end_click(fade_out(clip, GEMINI_SR), GEMINI_SR)


def strip_c2pa(raw):
    """Gemini appends its C2PA content credentials ("Created by Google Generative AI",
    a CBOR block) to the PCM bytes; played as audio they are a loud pop at the end.
    The SynthID watermark inside the audio itself stays."""
    # the credentials are a "C2PA" + 4-byte length header followed by one JUMBF
    # superbox (4-byte size + "jumb", ~6 KB) at the very end
    at = raw.find(b'jumb', max(0, len(raw) - 65536))
    if at >= 4 and b'c2pa' in raw[at:]:
        head = raw.rfind(b'C2PA', max(0, at - 16), at)
        raw = raw[:head if head >= 0 else at - 4]
    return raw[:len(raw) // 2 * 2]


def fade_out(samples, sr, secs=0.01):
    """A 10 ms fade at the end, so a clip never stops with a click."""
    n = min(len(samples), int(sr * secs))
    if n:
        samples = list(samples)
        for i in range(n):
            samples[-n + i] = int(samples[-n + i] * (n - 1 - i) / n)
    return samples


def drop_end_click(samples, sr):
    """Gemini ends about 1 sentence in 5 with a mouth click — 5–15 ms of sound 10–25 ms
    after the voice stops — heard as a pop. Cuts it (up to 3 times: some clips end with
    two) and ends the clip with a 30 ms fade and 150 ms of silence; clips without one are
    returned unchanged. Picked by the owner over re-rendering, by ear (2026-10-15).
    Run it once per clip: a few clips end in creaky voice, pulses 20 ms apart that each
    look like a click, and running it again would eat into the last syllable."""
    w = int(sr * 0.005)
    if len(samples) < 4 * w:
        return samples
    peak = max(abs(x) for x in samples) or 1
    out, cut = list(samples), False
    for _ in range(3):
        # loudness of each 5 ms window, against the clip's peak
        env = [(sum(x * x for x in out[i:i + w]) / w) ** 0.5 / peak for i in range(0, len(out) - w, w)]
        loud = [i for i, e in enumerate(env) if e > 0.03]
        if not loud:
            break
        last = start = loud[-1]
        while start > 0 and env[start - 1] > 0.03:
            start -= 1
        g, gap = start - 1, 0
        while g > 0 and env[g] < 0.02:
            gap += 1
            g -= 1
        if last - start + 1 > 8 or gap < 2:      # a burst of <= 40 ms after >= 10 ms of quiet
            break
        out = out[:(g + 2) * w]                  # the voice, plus 5 ms of the quiet gap
        cut = True
    if not cut:
        return samples
    n = min(len(out), int(sr * 0.03))
    for i in range(n):
        out[-n + i] = int(out[-n + i] * (n - 1 - i) / n)
    return out + [0] * int(sr * 0.15)


def drop_lead_burst(samples, sr):
    """The gemini-3.8 TTS models (flash and flash-lite, not 3.1) start every clip with
    ~80 ms of noise — up to about -12 dB, as loud above 3 kHz as below, gone before
    the voice begins — heard as a pop the moment 🔊 is pressed (found 2026-10-15, the
    owner's ears and waveform). Cuts it: the clip starts 60 ms before the voice, with
    a 10 ms fade-in. Speech never matches: a voiced sound has far less energy above
    3 kHz, and a syllable doesn't die away within 100 ms with a gap after it."""
    import numpy as np
    s = np.asarray(samples, dtype=float)
    w = int(sr * 0.005)
    if len(s) < 40 * w:
        return samples
    peak = np.abs(s).max() or 1
    head = s[:len(s[:int(1.0 * sr)]) // w * w]      # some clips wait 0.6 s+ to speak
    spec = np.fft.rfft(head)
    spec[np.fft.rfftfreq(len(head), 1 / sr) < 3000] = 0
    high = np.fft.irfft(spec, len(head))

    def db(x):           # level of each 5 ms window, dB against the clip's peak
        return 20 * np.log10(np.sqrt(np.mean(x.reshape(-1, w) ** 2, axis=1)) / peak + 1e-6)

    e, h = db(head), db(high)
    above = np.flatnonzero(e > -50)
    if not len(above) or above[0] * w > 0.25 * sr:
        return samples
    on = above[0]
    top = on + int(np.argmax(e[on:on + 12]))          # its peak, within 60 ms
    if e[top] < -25 or e[top] - h[top] > 10:          # too quiet, or voiced
        return samples
    quiet = e < -42
    after = np.flatnonzero(quiet[top:-1] & quiet[top + 1:])   # 10 ms quiet: a dip isn't the end
    if not len(after) or (top + after[0] - on) * w > 0.1 * sr:
        return samples                                # still sounding after 100 ms
    end = top + after[0]
    voice = np.flatnonzero(e[end:] > -40)
    if not len(voice) or voice[0] * w < 0.02 * sr:
        return samples                                # no gap before the voice
    voice = end + voice[0]
    out = s[max(end, voice - 12) * w:].copy()          # from 60 ms before the voice
    n = int(sr * 0.01)
    out[:n] *= np.linspace(0, 1, n)
    return [int(x) for x in np.round(out)]


def fix_clicks(langs):
    """--fix-clicks: drop_end_click() and drop_lead_burst() on the Gemini files made
    before them — each file once (index.json "c" / "l" list the files each has been
    through; new recordings go straight in). A file is decoded and encoded again only
    when something was cut, both cuts at once."""
    import miniaudio
    for lang in langs:
        d = OUT / lang
        try:
            index = json.loads((d / 'index.json').read_text(encoding='utf-8'))
        except (OSError, ValueError):
            continue
        made = index.get('g', [])
        ends, leads = set(index.get('c', [])), set(index.get('l', []))
        todo = [fid for fid in made if fid not in ends or fid not in leads]
        cut_end = cut_lead = 0
        for fid in todo:
            f = d / f'{fid}.mp3'
            # decoded from bytes (miniaudio can't open a path with non-ASCII folders, 我的網站)
            # at the file's own rate: LAME stored the 24 kHz clips at 22.05 kHz
            data = f.read_bytes()
            sr = miniaudio.mp3_get_info(data).sample_rate
            pcm = miniaudio.decode(data, output_format=miniaudio.SampleFormat.SIGNED16, nchannels=1, sample_rate=sr)
            samples = clean = list(pcm.samples)
            if fid not in ends:
                c = drop_end_click(clean, sr)
                cut_end += c is not clean
                clean = c
            lead = clean
            if fid not in leads:
                clean = drop_lead_burst(clean, sr)
                cut_lead += clean is not lead
            if clean is not samples:
                if clean is lead:
                    # drop the silence the MP3 encoder added at the start (back to trim()'s
                    # 60 ms), so a file doesn't grow when it is encoded again
                    thr = max(300, max(abs(x) for x in clean) * 0.03)
                    first = next(i for i, x in enumerate(clean) if abs(x) > thr)
                    clean = clean[max(0, first - int(0.06 * sr)):]
                # 48 kbps: a second encoding at 32 kbps audibly dulls it (0.97 vs 0.995
                # correlation with the first encoding)
                f.write_bytes(to_mp3(clean, sr, 48))
            ends.add(fid)
            leads.add(fid)
        index['c'] = sorted(ends & set(made))
        index['l'] = sorted(leads & set(made))
        (d / 'index.json').write_text(json.dumps(index, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        print(f'{lang}: of {len(todo)} Gemini files, {cut_end} had an end click and {cut_lead} '
              f'a noise burst before the voice, cut ({len(made) - len(todo)} done before)')


def spoken_chars(text):
    # kanji, letters, digits — and kana, for Japanese
    return max(1, len(re.findall(r'[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaffA-Za-z0-9]', text)))


def gemini_length_ok(text, clip, kana=''):
    """About 0.25 s a character when it says just the text; much longer means it also
    read (part of) the instruction, much shorter that it got cut. Japanese read from kanji
    also gives its kana: about 0.17 s a kana, and past 0.25 it was the instruction read too
    or the sentence said twice (錄音檢查 2026-10-30; a kanji count let those through)."""
    n = spoken_chars(text)
    secs = len(clip) / GEMINI_SR
    k = spoken_chars(kana) if kana else 0
    return 0.12 * n + 0.2 <= secs <= 0.42 * n + 1.2 and (k <= 4 or secs <= 0.25 * k + 1.5)


def run_gemini(lang, files, aliases, top, limit):
    d = OUT / lang
    d.mkdir(parents=True, exist_ok=True)
    try:
        old = json.loads((d / 'index.json').read_text(encoding='utf-8'))
    except (OSError, ValueError):
        old = {}
    made = set(old.get('g', []))
    by_model = dict(old.get('gm', {}))     # file id -> the Gemini model that made it
    if REGEMINI:                           # --regemini MODEL: make that model's files again
        made -= {f for f, m in by_model.items() if m == REGEMINI}
    declicked = set(old.get('c', []))      # files drop_end_click() has been through
    deburst = set(old.get('l', []))        # … and drop_lead_burst()
    tiers = TIERS.get(lang, {})
    # in the order jobs() met them — passage by passage (its sentences, then its
    # words), so each day leaves whole passages done rather than scattered lines
    seq = {fid: i for i, fid in enumerate(files)}
    todo = sorted((tiers.get(fid, 2), GEMINI_RANK.get((lang, fid), 0), seq[fid], fid) for fid in files
                  if fid not in made and (tiers.get(fid, 2) <= top
                                          or (lang != 'ja' and not (d / f'{fid}.mp3').exists())))
    todo = [(t, fid) for t, _, _, fid in todo]
    if limit is not None:
        todo = todo[:limit]
    print(f'{lang} (Gemini {GEMINI_VOICES[lang][0]}): {len(todo)} to render '
          f'({sum(1 for t, _ in todo if t == 0)} reading, {sum(1 for t, _ in todo if t == 1)} grammar, '
          f'{sum(1 for t, _ in todo if t == 2)} other), {len(made)} done before')
    key = gemini_key()
    # which key this is, without showing it (compare with the PC's): the first 8 hex of its sha256
    import hashlib
    print(f'  key sha256 {hashlib.sha256(key.encode()).hexdigest()[:8]}, {len(key)} characters', flush=True)
    done = 0

    def save_index():
        have = sorted(fid for fid in files if (d / f'{fid}.mp3').exists())
        have_set = set(have)
        index = {'voice': old.get('voice', LANGS[lang][2]), 'f': have,
                 'a': {a: f for a, f in sorted(aliases.items()) if f in have_set},
                 'g': sorted(made & have_set),
                 'gm': {f: m for f, m in sorted(by_model.items()) if f in made & have_set},
                 'c': sorted(declicked & made & have_set),
                 'l': sorted(deburst & made & have_set)}
        (d / 'index.json').write_text(json.dumps(index, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        return index

    def say(said):
        """One clip from the first model with quota left for this language."""
        while True:
            models = [m for m in GEMINI_LANG_ORDER.get(lang, GEMINI_TTS_MODELS)
                      if m not in GEMINI_SPENT and lang in GEMINI_MODEL_LANGS.get(m, {lang})]
            if not models:
                raise QuotaSpent(f'every model available for {lang} is spent for today')
            try:
                return gemini_say(key, lang, said, models[0]), models[0]
            except QuotaSpent as e:
                GEMINI_SPENT.add(models[0])
                # Google's own words, so an unexpected "spent" can be told apart (the
                # first GitHub Actions run, 2026-10-22, got one while the PC's key still worked)
                print(f'  {lang}: {models[0]} is spent for today, moving on (Google: {" ".join(str(e).split())[:1500]})', flush=True)

    try:
        for tier, fid in todo:
            text = GEMINI_SAY.get((lang, fid), files[fid])
            clip = None
            # a lone word is the likeliest to come out with the instruction read too
            # (about 1 in 3), so words get more tries, alternating 「word」 / word。
            if spoken_chars(text) <= 4:
                tries = ['「' + text + '」', text + '。'] * 2 + ['「' + text + '」']
            else:
                tries = [text] * 4
            for said in tries:
                c, model = say(said)
                if gemini_length_ok(text, c, files[fid] if lang == 'ja' else ''):
                    clip = c
                    break
            if clip is None:
                print(f'  ! {lang}: {text!r} kept the old voice (length {len(c) / GEMINI_SR:.1f}s)')
                continue
            (d / f'{fid}.mp3').write_bytes(to_mp3(clip, GEMINI_SR))
            made.add(fid)
            declicked.add(fid)             # gemini_say() already cut the click
            deburst.add(fid)               # … and the noise before the voice
            by_model[fid] = model.replace('gemini-', '')
            done += 1
            if done % 25 == 0:
                save_index()               # an interrupted run doesn't lose the "g" list
                print(f'  {lang}: {done}/{len(todo)}', flush=True)
    except QuotaSpent as e:
        print(f'  {lang}: today\'s Gemini quota is used up after {done} files — run again tomorrow '
              f'(the quota resets at midnight Pacific time: 15:00 in Taiwan in summer time, 16:00 in winter). '
              f'Google said: {str(e)[-160:]}')
        save_index()
        print(f'  {lang}: {done} new Gemini files, {len(made)} in all')
        return 'quota'
    except RuntimeError as e:
        print(f'  ! {lang}: stopped: {e}')
    index = save_index()
    print(f'  {lang}: {done} new Gemini files, {len(index["g"])} in all')


# ---------- --audition: a page to compare the voices ----------
def audition(env, only):
    AUDITION.mkdir(parents=True, exist_ok=True)
    rows = []
    for lang in only:
        site_lang, code = LANGS[lang][:2]
        voices = call(env, 'voices?languageCode=' + code)['voices']
        good = [v['name'] for v in voices if re.search(r'Chirp3-HD|Neural2|Wavenet|Studio', v['name'])]
        good = sorted(set(good), key=lambda n: (0 if 'Chirp3' in n else 1 if 'Neural2' in n or 'Studio' in n else 2, n))
        print(f'{lang}: {len(good)} voices')
        rows.append(f'<h2>{lang}</h2>')
        for name in good:
            cells = []
            for i, text in enumerate(AUDITION_WORDS[lang]):
                f = AUDITION / f'{name}-{i}.mp3'
                if not f.exists():
                    try:
                        f.write_bytes(to_mp3(synthesize(env, code, name, text)))
                    except RuntimeError as e:
                        print(f'  ! {name}: {e}')
                        break
                cells.append(f'<button onclick="new Audio(\'{f.name}\').play()">{text}</button>')
            if cells:
                rows.append(f'<p><b>{name}</b><br>{" ".join(cells)}</p>')
    page = ('<!doctype html><meta charset="utf-8"><title>Voice audition</title>'
            '<style>body{font:16px sans-serif;margin:20px}button{margin:3px;padding:6px 10px;font-size:15px}</style>'
            + ''.join(rows))
    (AUDITION / 'index.html').write_text(page, encoding='utf-8')
    print(f'Open http://localhost:8765/tools/.audio-audition/ to listen.')


def main():
    global RPM
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', choices=list(LANGS))
    ap.add_argument('--limit', type=int, help='render at most N new files per language (for a test run)')
    ap.add_argument('--dry-run', action='store_true', help='only count what would be rendered')
    ap.add_argument('--audition', action='store_true', help='render a few words with every good voice')
    ap.add_argument('--workers', type=int, default=WORKERS, help='requests in parallel')
    ap.add_argument('--rpm', type=int, default=None, help='requests per minute')
    ap.add_argument('--gemini', action='store_true', help='(re-)render Chinese with Gemini TTS (zh-TW / zh-CN), and the Japanese 閱讀 levels in GEMINI_JA_READING')
    ap.add_argument('--gemini-all', action='store_true', help='with --gemini: also the words, alphabet and samples')
    ap.add_argument('--fix-clicks', action='store_true',
                    help='cut the end click from the Gemini files already made (no requests)')
    ap.add_argument('--regemini', metavar='MODEL',
                    help='with --gemini: render again the files made by this model, as index.json "gm" '
                         'names it (e.g. 3.1-flash-tts-preview), so a level ends up in one model\'s voice')
    ap.add_argument('--redo', action='store_true',
                    help='with --only: re-render every file with the current voice (into tools/.audio-redo/ '
                         'first; the site keeps the old files until all are made, then they are replaced)')
    args = ap.parse_args()
    global REGEMINI
    REGEMINI = args.regemini or ''
    if args.redo and (not args.only or args.only.startswith('zh')):
        sys.exit('--redo needs --only <lang>, and not zh-TW / zh-CN (their Gemini files would be lost)')
    langs = [args.only] if args.only else list(LANGS)
    if args.fix_clicks:
        fix_clicks([l for l in ('zh-TW', 'zh-CN') if l in langs])
        return
    RPM = args.rpm or (GEMINI_RPM if args.gemini else RPM)
    if args.gemini:
        # the 閱讀 page in both accents first, then the 文法 examples (and with
        # --gemini-all the rest); a spent daily quota ends the run
        todo = [l for l in ('zh-TW', 'zh-CN', 'ja') if l in langs]
        made = {l: jobs(l) for l in todo}
        for top in (0, 2 if args.gemini_all else 1):
            for lang in todo:
                # 'quota' = no model left for this language; another language
                # may still have one (the lite model is zh-TW only). Japanese: only the
                # 閱讀 levels in GEMINI_JA_READING (tier 0), never the words
                run_gemini(lang, *made[lang], 0 if lang == 'ja' else top, args.limit)
                if all(m in GEMINI_SPENT for m in GEMINI_TTS_MODELS):
                    return
        return

    env = None if args.dry_run else load_env()
    if args.audition:
        return audition(env, langs)
    for lang in langs:
        files, aliases = jobs(lang)
        d = (REDO if args.redo else OUT) / lang
        todo = [(fid, text) for fid, text in files.items() if not (d / f'{fid}.mp3').exists()]
        if lang == 'ja':
            # the 閱讀 levels in GEMINI_JA_READING are Gemini's alone: a Google stand-in
            # would be thrown away, and long sentences fail here after four tries anyway
            todo = [(fid, text) for fid, text in todo if ('ja', fid) not in GEMINI_SAY]
        if args.limit is not None:
            todo = todo[:args.limit]
        voice = voice_for(env or {}, lang)
        print(f'{lang} ({voice}): {len(files)} files ({len(aliases)} aliases), '
              f'{len(todo)} to render, {sum(len(t) for _, t in todo)} characters')
        if args.dry_run:
            continue
        d.mkdir(parents=True, exist_ok=True)
        (OUT / lang).mkdir(parents=True, exist_ok=True)
        code = LANGS[lang][1]

        backup = LANGS[lang][3]

        def render(job):
            try:
                return render_one(job)
            except RuntimeError as e:          # one bad word shouldn't stop the run
                return f'{job[1]!r}: {e}'

        def render_one(job):
            fid, text = job
            tries = [backup] if len(text) == 1 and lang in ('ja', 'ko') else [voice, voice, voice, backup]
            for name in tries:
                clip = synthesize(env, code, name, text)
                if MIN_CLIP * SR <= len(clip) <= 8 * SR and loud_enough(clip):
                    (d / f'{fid}.mp3').write_bytes(to_mp3(clip))
                    return 'backup' if name != voice else None
            return f'{text!r}: no usable clip ({len(clip) / SR:.2f}s), skipped'

        done = backups = 0
        with ThreadPoolExecutor(args.workers) as pool:
            for problem in pool.map(render, todo):
                done += 1
                if problem == 'backup':
                    backups += 1
                elif problem:
                    print(f'  ! {lang} {problem}')
                if done % 500 == 0:
                    print(f'  {lang}: {done}/{len(todo)}')
        if args.redo:
            # a test run (--limit) leaves the site alone; a full one moves the new files
            # over the old (one the new voice couldn't make keeps its old file)
            if args.limit is not None:
                print(f'  {lang}: test run, new files are in {d.relative_to(ROOT)} (the site is unchanged)')
                continue
            new = [fid for fid in files if (d / f'{fid}.mp3').exists()]
            for fid in new:
                (OUT / lang / f'{fid}.mp3').write_bytes((d / f'{fid}.mp3').read_bytes())
            print(f'  {lang}: {len(new)} files replaced, {len(files) - len(new)} kept the old voice')
            d = OUT / lang
        # the index lists only files that really exist
        have = sorted(fid for fid in files if (d / f'{fid}.mp3').exists())
        have_set = set(have)
        index = {'voice': voice, 'f': have,
                 'a': {a: f for a, f in sorted(aliases.items()) if f in have_set}}
        try:
            prev = json.loads((d / 'index.json').read_text(encoding='utf-8'))
        except (OSError, ValueError):
            prev = {}
        made = set(prev.get('g', []))
        if made & have_set:
            index['g'] = sorted(made & have_set)       # files Gemini made (--gemini)
            index['gm'] = {f: m for f, m in prev.get('gm', {}).items() if f in have_set}
            index['c'] = sorted(set(prev.get('c', [])) & made & have_set)
            index['l'] = sorted(set(prev.get('l', [])) & made & have_set)
        (d / 'index.json').write_text(json.dumps(index, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        print(f'  {lang}: {len(have)} files in the index ({backups} new ones by the backup voice)')


if __name__ == '__main__':
    main()
