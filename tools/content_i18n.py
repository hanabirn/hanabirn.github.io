"""Japanese, Korean, Russian, French, Spanish and German for the 文法, 閱讀 and 聽解 data.

The lessons are written with Traditional Chinese and English texts ({zh, en}: an
explanation, a translation, a hint); Simplified Chinese is converted (zh-Hans). The
site's six other interface languages are machine-translated by Gemini (owner's
choice, 2026-10-15) and stored in tools/translations/<lang>.json — tracked, so a
rebuild needs no network and a wrong translation can be fixed by hand there.

    fill(data)      adds the stored translations to every {zh, en} text of one data
                    file (tools/build_grammar.py, build_reading.py and
                    build_listening.py call it before writing)
    python tools/content_i18n.py [--limit N] [--dry-run]
                    asks Gemini for the texts not translated yet, stores them and
                    fills data/grammar, data/reading and data/listening in place

A text is keyed by its Chinese and English (a changed source gets a new
translation). A lesson gets no translation into its own language (a Japanese
example translated into Japanese is the sentence again, and a hint would give the
answer away): the page shows English there. The key is the paid one used for the
recordings (tools/.gemini-tts.env).
"""
import argparse, hashlib, json, sys, threading, time, urllib.error, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STORE = ROOT / 'tools' / 'translations'
KINDS = ('grammar', 'reading', 'listening')
TARGETS = {'ja': 'Japanese', 'ko': 'Korean', 'ru': 'Russian', 'fr': 'French', 'es': 'Spanish', 'de': 'German'}
LESSON_LANGS = {'ja': 'Japanese', 'ko': 'Korean', 'zh': 'Chinese', 'en': 'English', 'fr': 'French',
                'ru': 'Russian', 'es': 'Spanish', 'de': 'German'}
# grammar explanations need the right grammar terms (the lite model translates them
# word for word: 5-stufiges Verb); reading and listening are plain sentences
MODELS = {'grammar': ('gemini-3.8-flash', 'gemini-3.6-flash'),
          'reading': ('gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'),
          'listening': ('gemini-3.1-flash-lite', 'gemini-3.5-flash-lite')}
BATCH = 40

sys.stdout.reconfigure(encoding='utf-8')


def text_key(obj):
    zh, en = obj.get('zh') or '', obj.get('en') or ''
    return hashlib.sha1(f'{zh}\x1f{en}'.encode('utf-8')).hexdigest()[:16]


def texts(obj):
    """Every dict with a non-empty zh or en string, depth first."""
    if isinstance(obj, dict):
        if (isinstance(obj.get('zh'), str) and obj['zh']) or (isinstance(obj.get('en'), str) and obj['en']):
            yield obj
        for k, v in obj.items():
            if k not in TARGETS:
                yield from texts(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from texts(v)


def targets_for(lesson):
    return [t for t in TARGETS if t != lesson]


_store = {}


def store(lang):
    if lang not in _store:
        f = STORE / f'{lang}.json'
        _store[lang] = json.loads(f.read_text(encoding='utf-8')) if f.exists() else {}
    return _store[lang]


def save_store(lang):
    STORE.mkdir(parents=True, exist_ok=True)
    data = dict(sorted(store(lang).items()))
    (STORE / f'{lang}.json').write_text(json.dumps(data, ensure_ascii=False, indent=0), encoding='utf-8')


def fill(data):
    """Adds the stored translations; returns how many texts still lack one."""
    missing = 0
    for obj in texts(data):
        key = text_key(obj)
        for t in targets_for(data.get('lang')):
            got = store(t).get(key)
            if got:
                obj[t] = got
            else:
                obj.pop(t, None)
                missing += 1
    return missing


def report_missing(missing, name):
    if missing:
        print(f'  {name}: {missing} translations missing (the page shows English there) — '
              f'run python tools/content_i18n.py')


# ---------- Gemini ----------
def gemini_key():
    f = ROOT / 'tools' / '.gemini-tts.env'
    for line in f.read_text(encoding='utf-8-sig').splitlines() if f.exists() else []:
        if line.strip().startswith('GEMINI_TTS_KEY') and line.split('=', 1)[1].strip():
            return line.split('=', 1)[1].strip().strip('"')
    sys.exit('Put GEMINI_TTS_KEY in tools/.gemini-tts.env')


KIND_NAMES = {'grammar': 'a grammar lesson', 'reading': 'a graded reading passage with its quiz',
              'listening': 'a listening exercise (dialogue lines, answer options, explanations)'}


def prompt(kind, lesson, targets, items):
    names = ', '.join(f'"{t}" = {TARGETS[t]}' for t in targets)
    return (
        f"You translate the learner-facing texts of {KIND_NAMES[kind]} on a site for people learning "
        f"{LESSON_LANGS.get(lesson, lesson)}. Each item has the same text in {'Simplified' if lesson == 'zh' else 'Traditional'} Chinese (zh) and "
        f"English (en); one of them may be empty. Translate it into: {names}.\n"
        "Rules:\n"
        f"- Keep every word, phrase or sentence in {LESSON_LANGS.get(lesson, lesson)} exactly as written "
        "(examples, grammar patterns such as 〜ている or -았/었-, quoted words, words in brackets), and keep "
        "symbols and layout: ＋ ・ → … ○ × quotation marks, slashes, numbers, line breaks.\n"
        + ("- The zh text is itself Chinese: only Chinese inside 「」 or after a colon as an example stays as "
           "written; every other Chinese word is the explanation and is translated (follow the en text), "
           "e.g. 王先生是医生，「他的女儿是老师」。 → 王さんは医者で、「他的女儿是老师」（娘は先生）です。 "
           "A text that is only a quote keeps it and adds its meaning: 「她是医生」。 → 「她是医生」（彼女は医者です）。\n"
           if lesson == 'zh' else '') +
        "- Translate the meaning naturally and concisely, in the plain, friendly register of a textbook for "
        "beginners; grammar terms as learners of that language know them.\n"
        "- When zh and en differ in detail, keep the fuller meaning. Names of people and places in their usual "
        "spelling for that language.\n"
        "- Answer with a JSON array, one object per item with the same id and one string per language code.\n"
        "Items:\n" + json.dumps(items, ensure_ascii=False))


def ask(model, kind, lesson, targets, items):
    schema = {'type': 'ARRAY', 'items': {'type': 'OBJECT', 'required': ['id'] + targets,
              'properties': {'id': {'type': 'INTEGER'}, **{t: {'type': 'STRING'} for t in targets}}}}
    config = {'responseMimeType': 'application/json', 'responseSchema': schema, 'temperature': 0.2}
    if 'lite' not in model:
        # thinking is billed as output and doubled the cost of a batch, for the same
        # translations (tried 2026-10-15); "minimal" is refused by 3.8-flash
        config['thinkingConfig'] = {'thinkingLevel': 'low'}
    body = {'contents': [{'parts': [{'text': prompt(kind, lesson, targets, items)}]}], 'generationConfig': config}
    req = urllib.request.Request(
        f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
        json.dumps(body).encode(), {'Content-Type': 'application/json', 'x-goog-api-key': gemini_key()})
    with urllib.request.urlopen(req, timeout=300) as r:
        d = json.load(r)
    u = d.get('usageMetadata', {})
    USAGE['in'] += u.get('promptTokenCount', 0)
    USAGE['out'] += u.get('candidatesTokenCount', 0) + u.get('thoughtsTokenCount', 0)
    return json.loads(d['candidates'][0]['content']['parts'][0]['text'])


USAGE = {'in': 0, 'out': 0}   # tokens this run, printed at the end
LOCK = threading.Lock()
STOP = threading.Event()        # set when the prepaid credit runs out


def translate(kind, lesson, objs):
    """objs: dicts needing at least one translation; stores the answers and returns
    how many were translated (0 = no model answered)."""
    targets = targets_for(lesson)
    # an HSK explanation quotes the Simplified sentence on the page: given the Traditional text, the
    # model kept 「我很喜歡看書」 in every language (2026-10-29), so it gets the converted zh-Hans
    # A Chinese line or question with nothing quoted goes from its English alone: given the Chinese,
    # the model kept the whole mock-exam dialogue as written (2026-10-29)
    def zh_of(o):
        if lesson != 'zh':
            return o.get('zh') or ''
        src = o.get('zh-Hans') or o.get('zh') or ''
        return src if '「' in src or not o.get('en') else ''
    items = [{'id': i, 'zh': zh_of(o), 'en': o.get('en') or ''} for i, o in enumerate(objs)]
    for model in MODELS[kind]:
        for attempt in range(4):
            if STOP.is_set():
                return 0
            try:
                answer = ask(model, kind, lesson, targets, items)
                got = {int(a['id']): a for a in answer}
            except urllib.error.HTTPError as e:
                msg = e.read()[:300].decode('utf-8', 'replace')
                print(f'    {model}: HTTP {e.code} {msg[:160]}', flush=True)
                if e.code == 402 or 'prepayment' in msg.lower() or 'credit' in msg.lower():
                    STOP.set()                     # the prepaid credit is used up
                    return 0
                time.sleep(30 if e.code in (429, 500, 503) else 5)
                continue
            except (urllib.error.URLError, OSError, ValueError, KeyError, TypeError) as e:
                print(f'    {model}: {str(e)[:160]}', flush=True)
                time.sleep(10)
                continue
            done = 0
            with LOCK:
                for i, o in enumerate(objs):
                    a = got.get(i) or {}
                    if all(isinstance(a.get(t), str) and a[t].strip() for t in targets):
                        # a text shared with another lesson (same zh + en) keeps the translation
                        # it already has — the run only adds the languages it lacked (2026-10-24:
                        # Korean listening re-translated 66 grammar / reading texts and moved them)
                        for t in targets:
                            store(t).setdefault(text_key(o), a[t].strip())
                        done += 1
            if done >= len(objs) * 0.9:
                return done
            print(f'    {model}: only {done}/{len(objs)} answered, again', flush=True)
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', choices=KINDS, help='only the grammar, reading or listening data')
    ap.add_argument('--limit', type=int, help='translate at most N texts (a test run)')
    ap.add_argument('--dry-run', action='store_true', help='only count what is missing')
    ap.add_argument('--workers', type=int, default=4, help='batches in parallel')
    args = ap.parse_args()
    kinds = [args.only] if args.only else KINDS
    files = [f for kind in KINDS for f in sorted((ROOT / 'data' / kind).glob('*.json')) if f.name != 'index.json']
    jobs, seen = [], set()
    for f in files:
        kind = f.parent.name
        if kind not in kinds:
            continue
        data = json.loads(f.read_text(encoding='utf-8'))
        lesson = data.get('lang')
        todo = []
        for o in texts(data):
            k = (lesson, text_key(o))
            if k not in seen and any(k[1] not in store(t) for t in targets_for(lesson)):
                seen.add(k)
                todo.append(o)
        print(f'{kind}/{f.name}: {len(todo)} texts to translate', flush=True)
        jobs += [(kind, lesson, f.name, todo[i:i + BATCH]) for i in range(0, len(todo), BATCH)]
    if args.limit is not None:
        keep, n = [], 0
        for job in jobs:
            if n >= args.limit:
                break
            keep.append(job[:3] + (job[3][:args.limit - n],))
            n += len(keep[-1][3])
        jobs = keep
    total = sum(len(j[3]) for j in jobs)
    print(f'{total} texts in {len(jobs)} batches', flush=True)
    if args.dry_run:
        return
    done_n = 0

    def run(job):
        nonlocal done_n
        kind, lesson, name, batch = job
        done = translate(kind, lesson, batch)
        with LOCK:
            for t in TARGETS:
                save_store(t)
            done_n += len(batch)
            print(f'  {name} ({kind}): {done}/{len(batch)} translated — {done_n}/{total} asked, '
                  f'tokens {USAGE["in"]} in / {USAGE["out"]} out', flush=True)
        return done

    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(args.workers) as pool:
        failed = sum(1 for d in pool.map(run, jobs) if not d)
    print(f'tokens this run: {USAGE["in"]} in, {USAGE["out"]} out', flush=True)
    # fill the data files in place, written as the build scripts write them
    for f in files:
        data = json.loads(f.read_text(encoding='utf-8'))
        missing = fill(data)
        f.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        if missing and f.parent.name in kinds:
            print(f'  {f.parent.name}/{f.name}: {missing} translations still missing')
    if STOP.is_set():
        sys.exit('Stopped: the prepaid Gemini credit seems used up — top it up and run again')
    if failed:
        sys.exit(f'{failed} batches got no answer — run again later; the rest is stored')


if __name__ == '__main__':
    main()
