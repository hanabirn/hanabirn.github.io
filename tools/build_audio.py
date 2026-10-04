"""Pre-renders natural (Google Cloud Text-to-Speech) audio for Japanese, Korean
and Chinese.

Browsers' built-in Japanese / Korean / Chinese voices sound robotic, so the
words of the JLPT, TOPIK and HSK sets, the Japanese / Korean topic sets (tp_ja_*,
tp_ko_*), the alphabet chart and the voice-picker
samples are rendered once here and shipped as small MP3s. js/speech.js plays
them when it has one and falls back to the browser voice otherwise.

Output, per language directory (ja, ko, zh-CN, zh-TW) under data/audio/:
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
       python tools/build_audio.py [--only ja|ko|zh-CN|zh-TW] [--limit N] [--dry-run]
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
}
MIN_CLIP = 0.3         # seconds; shorter means the voice said nothing or got cut
RATE = 0.9             # a little slower, for learners
SR = 16000
WORKERS = 8
RPM = 200              # requests per minute; Chirp3-HD answers 429 well before 300

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

    def add(key, spoken):
        fid = audio_id(key)
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
    else:
        if lang == 'zh-TW':
            for text in alphabet({'zh'}):
                add(text, text)
        for trad, simp, *_ in vocab('hsk_'):
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


def trim(samples):
    """Cuts the silence around one word, keeping a short natural margin."""
    if not samples:
        return []
    peak = max(abs(x) for x in samples)
    thr = max(300, peak * 0.03)
    loud = [i for i, x in enumerate(samples) if abs(x) > thr]
    if not loud:
        return []
    start = max(0, loud[0] - int(0.06 * SR))
    end = min(len(samples), loud[-1] + int(0.15 * SR))
    return list(samples[start:end])


def to_mp3(samples):
    import lameenc
    enc = lameenc.Encoder()
    enc.set_bit_rate(32)
    enc.set_in_sample_rate(SR)
    enc.set_channels(1)
    enc.set_quality(2)
    return enc.encode(struct.pack('<%dh' % len(samples), *samples)) + enc.flush()


def voice_for(env, lang):
    return env.get('GOOGLE_TTS_VOICE_' + lang) or LANGS[lang][2]


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
    ap.add_argument('--rpm', type=int, default=RPM, help='requests per minute')
    args = ap.parse_args()
    langs = [args.only] if args.only else list(LANGS)
    RPM = args.rpm

    env = None if args.dry_run else load_env()
    if args.audition:
        return audition(env, langs)
    for lang in langs:
        files, aliases = jobs(lang)
        d = OUT / lang
        todo = [(fid, text) for fid, text in files.items() if not (d / f'{fid}.mp3').exists()]
        if args.limit is not None:
            todo = todo[:args.limit]
        voice = voice_for(env or {}, lang)
        print(f'{lang} ({voice}): {len(files)} files ({len(aliases)} aliases), '
              f'{len(todo)} to render, {sum(len(t) for _, t in todo)} characters')
        if args.dry_run:
            continue
        d.mkdir(parents=True, exist_ok=True)
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
                if MIN_CLIP * SR <= len(clip) <= 8 * SR:
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
        # the index lists only files that really exist
        have = sorted(fid for fid in files if (d / f'{fid}.mp3').exists())
        have_set = set(have)
        index = {'voice': voice, 'f': have,
                 'a': {a: f for a, f in sorted(aliases.items()) if f in have_set}}
        (d / 'index.json').write_text(json.dumps(index, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        print(f'  {lang}: {len(have)} files in the index ({backups} new ones by the backup voice)')


if __name__ == '__main__':
    main()
