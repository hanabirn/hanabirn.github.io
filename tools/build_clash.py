"""Words of a set that mean the same, for the quiz's wrong options (2026-10-25).

js/quiz.js already keeps apart two options whose meanings share a sense (meaningsClash);
this finds the pairs that only mean the same — さようなら 再見 / バイバイ 拜拜 — which no
string comparison can see. Gemini reads each word set (word + Chinese meaning) and lists the
entries that could each be a right answer for the other's question; the pairs go to
data/vocab/clash.json ({set id: [[word, word], …]}), which js/quiz.js loads (loadMeaningClash).
Answers are cached per set and content in the git-ignored tools/.vocab-cache/clash/, so a re-run
only asks about sets that changed.

  python tools/build_clash.py [--max-size 200] [--only tp_ja_] [--limit N] [--dry-run]
"""
import argparse, glob, hashlib, json, os, sys, threading, urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
from content_i18n import gemini_key   # noqa: E402

OUT = ROOT / 'data' / 'vocab' / 'clash.json'
MODEL = 'gemini-3.8-flash'
THINK = 'low'
CHUNK = 500
CACHE = ROOT / 'tools' / '.vocab-cache' / 'clash' / f'{MODEL}-{THINK}'     # one folder per model
PRICE = (0.30 / 1e6, 2.50 / 1e6)     # US$ per input / output token, estimate
USAGE = {'in': 0, 'out': 0}
LOCK = threading.Lock()

PROMPT = """These are the words of one vocabulary list for learners, each with its meaning (Chinese, or
English for a Chinese word list). A quiz shows one word and four meanings to choose from: the right one and
three meanings of other words in this list. List every pair of entries whose meanings are so close
that a learner could rightly pick either meaning for either word (synonyms such as 再見 / 拜拜,
妻子 / 太太, 嬰兒 / 小寶寶; a word and its own politer or casual form). Do not list words that are
merely related (爸爸 / 媽媽, 早上 / 晚上, 吃 / 喝). Answer with a JSON array of [id, id] pairs
(an empty array when there are none).
Entries:
"""


def ask(entries):
    schema = {'type': 'ARRAY', 'items': {'type': 'ARRAY', 'items': {'type': 'INTEGER'}}}
    body = {'contents': [{'parts': [{'text': PROMPT + '\n'.join(f'{i}: {w} — {m}' for i, (w, m) in enumerate(entries))}]}],
            'generationConfig': {'responseMimeType': 'application/json', 'responseSchema': schema, 'temperature': 0,
                                 'thinkingConfig': {'thinkingLevel': THINK}}}
    req = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent',
                                 json.dumps(body).encode(), {'Content-Type': 'application/json', 'x-goog-api-key': gemini_key()})
    with urllib.request.urlopen(req, timeout=300) as r:
        d = json.load(r)
    u = d.get('usageMetadata', {})
    with LOCK:
        USAGE['in'] += u.get('promptTokenCount', 0)
        USAGE['out'] += u.get('candidatesTokenCount', 0) + u.get('thoughtsTokenCount', 0)
    pairs = json.loads(d['candidates'][0]['content']['parts'][0]['text'])
    return [(a, b) for a, b in (p[:2] for p in pairs if len(p) >= 2) if a != b and 0 <= a < len(entries) and 0 <= b < len(entries)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--max-size', type=int, default=200, help='only sets of at most this many words')
    ap.add_argument('--only', help='set ids starting with this')
    ap.add_argument('--limit', type=int, help='at most N sets (a test batch)')
    ap.add_argument('--workers', type=int, default=6)
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()
    CACHE.mkdir(parents=True, exist_ok=True)
    sets = []
    for f in sorted(glob.glob(str(ROOT / 'data' / 'vocab' / '*.json'))):
        d = json.load(open(f, encoding='utf-8'))
        if not isinstance(d, dict) or 'words' not in d or len(d['words']) > args.max_size:
            continue
        if args.only and not d['id'].startswith(args.only):
            continue
        # word + the meaning the quiz asks: [word, reading, zh, en]
        col = 4 if d['id'].startswith(('hsk', 'tp_zh')) else 2     # Chinese rows: [trad, simp, zhuyin, pinyin, english]
        entries = [(w[0], w[col]) for w in d['words'] if len(w) > col and w[col]]
        sets.append((d['id'], entries))
    todo = []
    for sid, entries in sets:
        h = hashlib.sha1(json.dumps(entries, ensure_ascii=False).encode()).hexdigest()[:12]
        if not (CACHE / f'{sid}.{h}.json').exists():
            todo.append((sid, entries, h))
    if args.limit:
        todo = todo[:args.limit]
    n = sum(len(e) for _, e, _ in todo)
    print(f'{len(sets)} sets, {len(todo)} to ask ({n} entries)')
    if args.dry_run:
        return

    def run(job):
        # a long graded list goes in parts of CHUNK words (one request of 6,000 misses most pairs)
        sid, entries, h = job
        found = []
        try:
            for start in range(0, len(entries), CHUNK):
                part = entries[start:start + CHUNK]
                found += [[part[a][0], part[b][0]] for a, b in ask(part)]
        except Exception as e:
            print(f'  {sid}: {e}', flush=True)
            return
        (CACHE / f'{sid}.{h}.json').write_text(json.dumps(found, ensure_ascii=False), encoding='utf-8')

    with ThreadPoolExecutor(args.workers) as pool:
        list(pool.map(run, todo))
    cost = USAGE['in'] * PRICE[0] + USAGE['out'] * PRICE[1]
    print(f'tokens {USAGE["in"]} in / {USAGE["out"]} out ≈ US${cost:.3f}')

    # every set's newest cached answer → clash.json
    out = {}
    for sid, entries in sets:
        h = hashlib.sha1(json.dumps(entries, ensure_ascii=False).encode()).hexdigest()[:12]
        f = CACHE / f'{sid}.{h}.json'
        if f.exists():
            pairs = json.loads(f.read_text(encoding='utf-8'))
            if pairs:
                out[sid] = pairs
    if not args.only and not args.limit:
        OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        print(f'{OUT.relative_to(ROOT)}: {sum(len(v) for v in out.values())} pairs in {len(out)} sets')


if __name__ == '__main__':
    main()
