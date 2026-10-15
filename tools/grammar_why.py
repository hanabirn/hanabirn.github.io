"""Why each option of a 文法 practice question is right or wrong.

The questions (tools/grammar/<id>.json, quiz[]) were written with the answer and a
translation only. For the bot and the site to say why a picked option doesn't fit and
the answer does, Gemini writes one short line per option in Traditional Chinese and
English (owner's choice, 2026-10-15); they are stored in the tracked
tools/grammar_why/<level>.json, keyed by a hash of the question, and
tools/build_grammar.py adds them as quiz[].why = [{zh, en}, …] (one per option) — the
other languages then come from tools/content_i18n.py like every other text.

    python tools/grammar_why.py [--only <level>] [--limit N] [--dry-run]

A changed question (text, options or answer) gets a new key and a new explanation.
Uses the paid key in tools/.gemini-tts.env.
"""
import argparse, hashlib, json, sys, threading, time, urllib.error, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'tools' / 'grammar'
STORE = ROOT / 'tools' / 'grammar_why'
MODEL = 'gemini-3.8-flash'
BATCH = 12
LANG_NAMES = {'ja': 'Japanese', 'ko': 'Korean', 'zh': 'Mandarin Chinese', 'en': 'English', 'fr': 'French',
              'ru': 'Russian', 'es': 'Spanish', 'de': 'German'}
LOCK = threading.Lock()
USAGE = {'in': 0, 'out': 0}

sys.stdout.reconfigure(encoding='utf-8')


def q_key(lesson, q):
    raw = json.dumps([lesson, q['q'], q['options'], q['answer']], ensure_ascii=False)
    return hashlib.sha1(raw.encode('utf-8')).hexdigest()[:16]


def load_store(level):
    f = STORE / f'{level}.json'
    return json.loads(f.read_text(encoding='utf-8')) if f.exists() else {}


def save_store(level, data):
    STORE.mkdir(parents=True, exist_ok=True)
    (STORE / f'{level}.json').write_text(json.dumps(dict(sorted(data.items())), ensure_ascii=False, indent=0),
                                         encoding='utf-8')


def fill_why(data):
    """quiz[].why from the store (tools/build_grammar.py); returns how many lack one."""
    store, missing = load_store(data['id']), 0
    for p in data['points']:
        for q in p.get('quiz', []):
            why = store.get(q_key(data['lang'], q))
            if why and len(why) == len(q['options']):
                q['why'] = [{'zh': w['zh'], 'en': w['en']} for w in why]
            else:
                q.pop('why', None)
                missing += 1
    return missing


def gemini_key():
    f = ROOT / 'tools' / '.gemini-tts.env'
    for line in f.read_text(encoding='utf-8-sig').splitlines() if f.exists() else []:
        if line.strip().startswith('GEMINI_TTS_KEY') and line.split('=', 1)[1].strip():
            return line.split('=', 1)[1].strip().strip('"')
    sys.exit('Put GEMINI_TTS_KEY in tools/.gemini-tts.env')


def prompt(lesson, items):
    lang = LANG_NAMES.get(lesson, lesson)
    return (
        f"You are a careful teacher of {lang} grammar for beginners. Each item is a fill-in-the-blank practice "
        "question from a lesson on one grammar point (its pattern, title and explanation are given), with its "
        "options and the index of the correct answer.\n"
        "For EVERY option, in the same order, write one short line that a learner who picked it would read:\n"
        "- the correct option: why it is right here (the rule, briefly);\n"
        "- a wrong option: why it does not fit this sentence — what it means or which grammar it belongs to, and "
        "what it would change — without just repeating the answer. If it is grammatical but means something "
        "else, say so.\n"
        "Write each line twice: \"zh\" in Traditional Chinese as used in Taiwan, at most 45 characters; \"en\" in "
        "English, at most 25 words. Keep every word in "
        f"{lang} exactly as written (quote options with 「」 in zh and with no quotes or italics in en). Be "
        "accurate; never invent rules. Plain text, no markdown.\n"
        "Answer with a JSON array: one object per item, same id, \"why\" = array of {\"zh\", \"en\"} with exactly "
        "as many entries as that item's options.\n"
        "Items:\n" + json.dumps(items, ensure_ascii=False))


def ask(items, lesson):
    schema = {'type': 'ARRAY', 'items': {'type': 'OBJECT', 'required': ['id', 'why'], 'properties': {
        'id': {'type': 'INTEGER'},
        'why': {'type': 'ARRAY', 'items': {'type': 'OBJECT', 'required': ['zh', 'en'],
                                            'properties': {'zh': {'type': 'STRING'}, 'en': {'type': 'STRING'}}}}}}}
    body = {'contents': [{'parts': [{'text': prompt(lesson, items)}]}],
            'generationConfig': {'responseMimeType': 'application/json', 'responseSchema': schema,
                                 'temperature': 0.2, 'thinkingConfig': {'thinkingLevel': 'low'}}}
    req = urllib.request.Request(
        f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent',
        json.dumps(body).encode(), {'Content-Type': 'application/json', 'x-goog-api-key': gemini_key()})
    with urllib.request.urlopen(req, timeout=300) as r:
        d = json.load(r)
    u = d.get('usageMetadata', {})
    with LOCK:
        USAGE['in'] += u.get('promptTokenCount', 0)
        USAGE['out'] += u.get('candidatesTokenCount', 0) + u.get('thoughtsTokenCount', 0)
    return json.loads(d['candidates'][0]['content']['parts'][0]['text'])


def run_batch(level, lesson, batch, store):
    items = [{'id': i, 'pattern': p['pattern'], 'title': p['title'].get('en', ''), 'explain': p['explain'].get('en', ''),
              'question': q['q'], 'translation': q.get('en', ''), 'options': q['options'], 'answer': q['answer']}
             for i, (p, q) in enumerate(batch)]
    for attempt in range(4):
        try:
            got = {int(a['id']): a['why'] for a in ask(items, lesson)}
        except urllib.error.HTTPError as e:
            msg = e.read()[:300].decode('utf-8', 'replace')
            print(f'    HTTP {e.code} {msg[:160]}', flush=True)
            if e.code == 402 or 'prepayment' in msg.lower():
                return -1
            time.sleep(30)
            continue
        except (urllib.error.URLError, OSError, ValueError, KeyError, TypeError) as e:
            print(f'    {str(e)[:160]}', flush=True)
            time.sleep(10)
            continue
        done = 0
        with LOCK:
            for i, (p, q) in enumerate(batch):
                why = got.get(i)
                if why and len(why) == len(q['options']) and all(w.get('zh', '').strip() and w.get('en', '').strip() for w in why):
                    store[q_key(lesson, q)] = [{'zh': w['zh'].strip(), 'en': w['en'].strip()} for w in why]
                    done += 1
        if done >= len(batch) * 0.9:
            return done
        print(f'    only {done}/{len(batch)}, again', flush=True)
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', help='one level, e.g. ja_n5')
    ap.add_argument('--limit', type=int, help='at most N questions (a test run)')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--workers', type=int, default=4)
    args = ap.parse_args()
    jobs, stores = [], {}
    for src in sorted(SRC.glob('*.json')):
        data = json.loads(src.read_text(encoding='utf-8'))
        if not data.get('points') or (args.only and data['id'] != args.only):
            continue
        store = stores[data['id']] = load_store(data['id'])
        todo = [(p, q) for p in data['points'] for q in p.get('quiz', []) if q_key(data['lang'], q) not in store]
        print(f'{data["id"]}: {len(todo)} questions to explain', flush=True)
        jobs += [(data['id'], data['lang'], todo[i:i + BATCH]) for i in range(0, len(todo), BATCH)]
    if args.limit is not None:
        keep, n = [], 0
        for level, lesson, batch in jobs:
            if n >= args.limit:
                break
            keep.append((level, lesson, batch[:args.limit - n]))
            n += len(keep[-1][2])
        jobs = keep
    print(f'{sum(len(j[2]) for j in jobs)} questions in {len(jobs)} batches', flush=True)
    if args.dry_run:
        return
    from concurrent.futures import ThreadPoolExecutor
    stop = threading.Event()

    def work(job):
        level, lesson, batch = job
        if stop.is_set():
            return 0
        done = run_batch(level, lesson, batch, stores[level])
        if done < 0:
            stop.set()
        with LOCK:
            save_store(level, stores[level])
            print(f'  {level}: {max(done, 0)}/{len(batch)} — tokens {USAGE["in"]} in / {USAGE["out"]} out', flush=True)
        return done

    with ThreadPoolExecutor(args.workers) as pool:
        results = list(pool.map(work, jobs))
    print(f'tokens this run: {USAGE["in"]} in, {USAGE["out"]} out')
    if stop.is_set():
        sys.exit('Stopped: the prepaid Gemini credit seems used up')
    if any(r == 0 for r in results):
        sys.exit('Some batches got no answer — run again; the rest is stored')


if __name__ == '__main__':
    main()
