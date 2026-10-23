"""錄音檢查 (owner's request 2026-10-23): checks the site's recordings so nobody has to
listen to 100 000 clips.

  1. coverage — every text the site speaks (tools/build_audio.py's jobs(), plus the 聽解
     lines in data/listening/) has a file: ok / waiting on the audio-queue branch /
     waiting for its Gemini turn (日文閱讀) / missing.
  2. health   — each file decoded (miniaudio): silent, too short or too long for its
     text, a long gap inside, clipping, a noise burst at the start.
  3. content  — Gemini listens: sentences (文法, 閱讀, 聽解) all, words a sample
     (WORD_SAMPLE). The owner's picks: Gemini, sentences only + a sample of words.

Results are kept per file (keyed by its size, so a re-recorded file is checked again) in
a state file — the audio-check branch in the cloud — so a clip is only ever paid for once.

  python tools/audio_check.py [--queue DIR] [--state FILE] [--only ja,ko] [--health new|all|none]
                              [--content N] [--report FILE] [--dry-run]
  --content N: at most N clips to Gemini this run (0 = none); --dry-run: count and estimate.
"""
import argparse, base64, hashlib, json, re, sys, time, urllib.error, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
import build_audio as ba        # noqa: E402

WORD_SAMPLE = 0.05              # share of word clips Gemini checks (the same ones every run)
CHECK_MODEL = 'gemini-3.1-flash-lite'
BATCH = 8                       # clips per Gemini request
SILENT_DB = -35                 # the loudest sample below this: nothing was said
GAP_SECS = 1.6                  # a quiet stretch this long inside a sentence
LISTEN_GAP_SECS = 2.5           # 聽解 lines may pause longer
CLIP_SHARE = 0.003              # share of samples at full scale: clipping
PRICE_IN = 0.30 / 1e6           # US$ per input token (audio), estimate — check the bill
PRICE_OUT = 1.20 / 1e6
AUDIO_TOKENS_PER_SEC = 32

KEYS = {}                       # file id -> the key text (what the page shows)
_audio_id = ba.audio_id


def _remember(key):
    fid = _audio_id(key)
    KEYS.setdefault(fid, key)
    return fid


ba.audio_id = _remember


def letters(text):
    # letters of any script (kana, kanji, hangul, Latin, Cyrillic …) and digits — build_audio's
    # spoken_chars() leaves out hangul and Cyrillic
    return max(1, len(re.findall(r'[^\W_]', text)))


def is_sentence(text):
    """grammar / reading sentences, as opposed to words: sentence punctuation, or 3+ words"""
    t = text.split('|')[0]
    if re.search(r'[。！？!?.]\s*$', t) or len(t.split()) >= 3:
        return True
    # no spaces in Japanese / Chinese: a long run of characters is a phrase or a sentence
    # (a long German compound is still a word)
    return bool(re.search(r'[぀-ヿ㐀-鿿]', t)) and letters(t) >= 12


def collect(site):
    """{lang: {fid: {'say': spoken text, 'key': shown text, 'kind': word|sentence|listening, 'tier': n}}}"""
    out = {}
    for lang in ba.LANGS:
        files, _aliases = ba.jobs(lang)
        tiers = ba.TIERS.get(lang, {})
        out[lang] = {fid: {'say': say, 'key': KEYS.get(fid, say), 'tier': tiers.get(fid, 2),
                           'kind': 'sentence' if is_sentence(KEYS.get(fid, say)) else 'word'}
                     for fid, say in files.items()}
    # 聽解: every object with an audio id "a" and its text (tools/build_listening.py)
    for f in sorted((site / 'data' / 'listening').glob('*.json')):
        if f.name == 'index.json':
            continue
        lang = f.stem.split('_')[0]
        got = out.setdefault('listening/' + lang, {})

        def walk(x):
            if isinstance(x, dict):
                if isinstance(x.get('a'), str) and x.get('plain'):
                    got.setdefault(x['a'], {'say': x.get('kana') or x['plain'], 'key': x['plain'], 'kind': 'listening', 'tier': 0})
                for k, nk in (('na', 'nk'),):
                    if isinstance(x.get(k), str) and x.get(nk):
                        got.setdefault(x[k], {'say': x[nk], 'key': x[nk], 'kind': 'listening', 'tier': 0})
                for v in x.values():
                    walk(v)
            elif isinstance(x, list):
                for v in x:
                    walk(v)
        walk(json.loads(f.read_text(encoding='utf-8')))
    return out


def index_of(root, lang):
    f = root / 'data' / 'audio' / lang / 'index.json'
    if not f.exists():
        return set(), set()
    d = json.loads(f.read_text(encoding='utf-8'))
    return set(d.get('f', [])), set(d.get('g', []))


def files_in(root, lang):
    d = root / 'data' / 'audio' / lang
    return {p.stem: p for p in d.glob('*.mp3')} if d.exists() else {}


# ---------- 2. health ----------
def health(path, item):
    import miniaudio
    import numpy as np
    try:
        # from bytes: decode_file can't open a path with non-ASCII folders on Windows (我的網站)
        snd = miniaudio.decode(path.read_bytes(), output_format=miniaudio.SampleFormat.FLOAT32, nchannels=1)
    except Exception:
        return ['broken'], 0.0
    x = np.frombuffer(snd.samples, dtype=np.float32)
    sr = snd.sample_rate
    secs = len(x) / sr if sr else 0
    issues = []
    peak = float(np.max(np.abs(x))) if len(x) else 0.0
    if peak < 10 ** (SILENT_DB / 20):
        return ['silent'], secs
    if secs < ba.MIN_CLIP:
        issues.append('too_short')
    text = item['say']
    n = letters(text)
    cjk = bool(re.search(r'[぀-ヿ㐀-鿿가-힯]', text))
    lo, hi = (0.07 * n + 0.1, 0.5 * n + 1.6) if cjk else (0.025 * n + 0.1, 0.2 * n + 1.6)
    if item['kind'] != 'word' or n > 3:          # a lone letter or short word varies too much
        if secs < lo:
            issues.append('too_short')
        elif secs > hi:
            issues.append('too_long')
    # quiet stretches inside (20 ms windows, 45 dB under the peak)
    win = max(1, int(sr * 0.02))
    m = len(x) // win
    if m > 4:
        rms = np.sqrt(np.mean(x[:m * win].reshape(m, win) ** 2, axis=1) + 1e-12)
        loud = rms > peak * 10 ** (-45 / 20)
        idx = np.flatnonzero(loud)
        if len(idx):
            inner = loud[idx[0]:idx[-1] + 1]
            run = best = 0
            for v in inner:
                run = 0 if v else run + 1
                best = max(best, run)
            if best * 0.02 >= (LISTEN_GAP_SECS if item['kind'] == 'listening' else GAP_SECS):
                issues.append('gap')
    if np.mean(np.abs(x) >= 0.99) > CLIP_SHARE:
        issues.append('clipping')
    return sorted(set(issues)), secs


# ---------- 3. content (Gemini listens) ----------
PROMPT = """You check recordings for a language-learning website ({lang}). For each numbered clip,
write down exactly what is said — every syllable, including anything extra at the start or end,
and nothing that is not said. {script} Then say whether it says the expected text given with the
clip, and if not, what is wrong. Answer only with JSON: [{"i": number, "heard": "what is said",
"ok": true|false, "problem": "none|missing_words|extra_words|wrong_words|not_speech|wrong_language|garbled"}]."""
SCRIPT = {'ja': 'Write Japanese in hiragana only (no kanji, no katakana), so it can be compared with the kana reading.',
          'zh': 'Write Chinese in the same characters as the expected text where they are the words said.'}
# similarity of what was heard to the text, below which a clip is flagged: sentences stricter,
# because a stray syllable (the Google voices sometimes start with 「おやり」) costs them little
MATCH = {'word': 0.85, 'sentence': 0.95, 'listening': 0.95}


def simplify(text):
    """for comparing: lower case, no punctuation or spaces, katakana as hiragana"""
    t = ''.join(chr(ord(ch) - 0x60) if 'ァ' <= ch <= 'ヶ' else ch for ch in text.lower())
    return ''.join(re.findall(r'[^\W_]', t))


def matches(heard, say):
    """Gemini's yes / no is unreliable (it says no to homophones such as 移動 / 異動, and to
    はう for 這う), so the clip is judged by how close what it heard is to the text"""
    import difflib
    x, y = simplify(heard), simplify(say)
    return difflib.SequenceMatcher(None, x, y).ratio() if x and y else 0.0


def judge(batch, lang, key):
    base = 'ja' if lang.startswith('ja') else 'zh' if lang.startswith(('zh', 'cmn')) else ''
    parts = [{'text': PROMPT.replace('{lang}', lang).replace('{script}', SCRIPT.get(base, ''))}]
    for i, (fid, item, path) in enumerate(batch):
        parts.append({'text': f'Clip {i}: should say: {item["say"]}'})
        parts.append({'inline_data': {'mime_type': 'audio/mp3', 'data': base64.b64encode(path.read_bytes()).decode()}})
    body = {'contents': [{'parts': parts}],
            'generationConfig': {'responseMimeType': 'application/json', 'temperature': 0}}
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{CHECK_MODEL}:generateContent?key={key}'
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, json.dumps(body).encode(), {'Content-Type': 'application/json'})
            res = json.load(urllib.request.urlopen(req, timeout=180))
            um = res.get('usageMetadata', {})
            out = json.loads(res['candidates'][0]['content']['parts'][0]['text'])
            return {o['i']: o for o in out if isinstance(o, dict) and 'i' in o}, um
        except urllib.error.HTTPError as e:
            if e.code in (400, 403):
                raise
            time.sleep(15 * (attempt + 1))
        except (KeyError, ValueError, urllib.error.URLError, TimeoutError):
            time.sleep(10)
    return {}, {}


def sampled(fid):
    return int(hashlib.sha1(fid.encode()).hexdigest()[:8], 16) / 0xffffffff < WORD_SAMPLE


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--queue', help='a checkout of the audio-queue branch (recordings not live yet)')
    ap.add_argument('--state', default=str(ROOT / 'tools' / '.audio-check' / 'state.json'))
    ap.add_argument('--only', help='languages, e.g. ja,ko (listening/ja for 聽解)')
    ap.add_argument('--health', default='new', choices=['new', 'all', 'none'])
    ap.add_argument('--content', type=int, default=0)
    ap.add_argument('--report', default=str(ROOT / 'tools' / '.audio-check' / 'report.json'))
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()

    site = ROOT
    queue = Path(args.queue) if args.queue else None
    state_f = Path(args.state)
    state = json.loads(state_f.read_text(encoding='utf-8')) if state_f.exists() else {}
    state.setdefault('health', {})
    state.setdefault('content', {})
    only = set(args.only.split(',')) if args.only else None

    texts = collect(site)
    report = {'when': time.strftime('%Y-%m-%d %H:%M UTC', time.gmtime()), 'langs': {}, 'problems': [], 'content_cost': 0.0}
    todo_content = []
    for lang, items in texts.items():
        if only and lang not in only:
            continue
        live_idx, live_g = index_of(site, lang)
        q_idx = index_of(queue, lang)[0] if queue else set()
        live_files = files_in(site, lang)
        q_files = files_in(queue, lang) if queue else {}
        listening = lang.startswith('listening/')
        rep = {k: {'total': 0, 'ok': 0, 'queued': 0, 'waiting': 0, 'missing': 0} for k in ('word', 'sentence', 'listening')}
        missing = []
        for fid, item in items.items():
            r = rep[item['kind']]
            r['total'] += 1
            path = live_files.get(fid) if (listening or fid in live_idx) else None
            if path is None and fid in q_files and (listening or fid in q_idx):
                path = q_files[fid]
                r['queued'] += 1
            elif path is not None:
                r['ok'] += 1
            elif lang == 'ja' and item['tier'] == 0:
                r['waiting'] += 1            # 日文閱讀: Gemini's daily turn will come
                continue
            else:
                r['missing'] += 1
                missing.append(item['key'])
                continue
            key = f'{lang}|{fid}'
            size = path.stat().st_size
            if args.health == 'all' or (args.health == 'new' and (state['health'].get(key) or [None])[0] != size):
                issues, secs = health(path, item)
                state['health'][key] = [size, issues, round(secs, 2)]
            h = state['health'].get(key)
            if h and h[0] == size and h[1]:
                report['problems'].append({'lang': lang, 'fid': fid, 'text': item['key'], 'issues': h[1], 'secs': h[2],
                                           'root': 'queue' if queue and path.is_relative_to(queue) else 'site', 'path': path.relative_to(queue if queue and path.is_relative_to(queue) else site).as_posix()})
            c = state['content'].get(key)
            if (item['kind'] != 'word' or sampled(fid)) and not (c and c[0] == size):
                todo_content.append((lang, fid, item, path, size))
            elif c and c[0] == size and not c[1]:
                report['problems'].append({'lang': lang, 'fid': fid, 'text': item['key'], 'issues': ['content:' + c[3]], 'heard': c[2],
                                           'root': 'queue' if queue and path.is_relative_to(queue) else 'site', 'path': path.relative_to(queue if queue and path.is_relative_to(queue) else site).as_posix()})
        report['langs'][lang] = {k: v for k, v in rep.items() if v['total']}
        if missing:
            report['langs'][lang]['missing_examples'] = missing[:10]

    # estimate, then (if asked) let Gemini listen
    secs_todo = sum((state['health'].get(f'{l}|{f}') or [0, [], 2.0])[2] for l, f, *_ in todo_content)
    est = secs_todo * AUDIO_TOKENS_PER_SEC * PRICE_IN + len(todo_content) * (60 * PRICE_IN + 40 * PRICE_OUT)
    report['content_todo'] = len(todo_content)
    report['content_todo_secs'] = round(secs_todo)
    report['content_estimate'] = round(est, 2)
    print(f'content: {len(todo_content)} clips to check ({secs_todo / 60:.0f} min of audio), about US${est:.2f}')
    if args.content and not args.dry_run and todo_content:
        key = ba.gemini_key()
        done = 0
        usage = {'in': 0, 'out': 0}
        by_lang = {}
        for t in todo_content[:args.content]:
            by_lang.setdefault(t[0], []).append(t)
        for lang, rows in by_lang.items():
            name = ba.LANGS[lang.split('/')[-1]][0] if lang.split('/')[-1] in ba.LANGS else lang
            for n in range(0, len(rows), BATCH):
                chunk = rows[n:n + BATCH]
                got, um = judge([(fid, item, path) for _l, fid, item, path, _s in chunk], name, key)
                usage['in'] += um.get('promptTokenCount', 0)
                usage['out'] += um.get('candidatesTokenCount', 0) + um.get('thoughtsTokenCount', 0)
                for i, (_l, fid, item, path, size) in enumerate(chunk):
                    v = got.get(i)
                    if not v:
                        continue
                    score = matches(str(v.get('heard', '')), item['say'])
                    ok = score >= MATCH[item['kind']]
                    problem = 'none' if ok else (v.get('problem') if v.get('problem') not in (None, 'none') else 'wrong_words')
                    v['problem'] = problem
                    state['content'][f'{lang}|{fid}'] = [size, ok, str(v.get('heard', ''))[:200], problem, round(score, 2)]
                    if not ok:
                        report['problems'].append({'lang': lang, 'fid': fid, 'text': item['key'], 'issues': ['content:' + v.get('problem', '?')],
                                                   'heard': v.get('heard', ''), 'root': 'queue' if queue and path.is_relative_to(queue) else 'site', 'path': path.relative_to(queue if queue and path.is_relative_to(queue) else site).as_posix()})
                done += len(chunk)
                state_f.parent.mkdir(parents=True, exist_ok=True)
                state_f.write_text(json.dumps(state, ensure_ascii=False), encoding='utf-8')
                print(f'  {lang}: {done}/{min(args.content, len(todo_content))}', flush=True)
        report['content_checked'] = done
        report['content_cost'] = round(usage['in'] * PRICE_IN + usage['out'] * PRICE_OUT, 3)
    state_f.parent.mkdir(parents=True, exist_ok=True)
    state_f.write_text(json.dumps(state, ensure_ascii=False), encoding='utf-8')
    Path(args.report).parent.mkdir(parents=True, exist_ok=True)
    Path(args.report).write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')
    for lang, r in report['langs'].items():
        print(lang, {k: v for k, v in r.items() if k != 'missing_examples'})
    print('problems:', len(report['problems']))


if __name__ == '__main__':
    main()
