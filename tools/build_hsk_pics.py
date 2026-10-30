"""HSK pictures with Gemini Batch mode (owner's pick 2026-10-30: half the price, drawn a level at a
time once its questions are written). The pictures are described in the HSK files themselves —
閱讀 zh_pic items (tools/reading/zh_hsk*.json, pic {cols, rows, panels, cap}) and the 聽解 sets'
"pics" (tools/listening/zh_hsk*.json) — and drawn in the JLPT 聽解 line-art style
(build_reading.hsk_pic_prompt). Each file is <its folder>/<hsk_pic_id>.webp, so a changed
description is drawn again and an unchanged one never is; the builds mark a picture drawn once its
file exists, so re-run tools/build_reading.py and tools/build_listening.py after fetching.

  python tools/build_hsk_pics.py --dry-run        what is still to draw, and the estimate
  python tools/build_hsk_pics.py --submit         one Batch job with every missing picture
  python tools/build_hsk_pics.py --fetch          the job's state; once it has succeeded, the pictures
  python tools/build_hsk_pics.py --review         tools/.mockups/hsk_pics/review.html (every picture, its captions)
  python tools/build_hsk_pics.py --redo <id> …    forget a picture so the next --submit draws it again

The job (its name and which picture each request is) is kept in tools/.mockups/hsk_pics/batch.json.
Batch results come back in request order (ai.google.dev/gemini-api/docs/batch-mode, 2026-10-30).
Look at every picture before it goes live: the model sometimes writes text into one (TAXI, 学班).
"""
import argparse, base64, io, json, sys, time, urllib.error, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
import build_audio as ba                                       # noqa: E402  (gemini_key)
from build_reading import hsk_pic_prompt, hsk_pic_id           # noqa: E402

MODEL = 'gemini-3.1-flash-image'
# US$ per output image token in Batch mode (ai.google.dev pricing 2026-10-30: half of the 60 / 1M
# standard) — about 1,300–1,500 tokens a picture, so US$0.04–0.045
PRICE_IMG_BATCH = 30 / 1e6
PRICE_IN_BATCH = 0.25 / 1e6
WORK = ROOT / 'tools' / '.mockups' / 'hsk_pics'
JOB = WORK / 'batch.json'
DIRS = {'reading': ROOT / 'data' / 'reading' / 'img' / 'zh', 'listening': ROOT / 'data' / 'listening' / 'img' / 'zh'}
API = 'https://generativelanguage.googleapis.com/v1beta/'


def pictures():
    """[(id, page, where, spec)] of every HSK picture described, each id once"""
    out, seen = [], set()
    for f in sorted((ROOT / 'tools' / 'reading').glob('zh_hsk*.json')):
        for st in json.loads(f.read_text(encoding='utf-8')).get('sets', []):
            for k, it in enumerate(st.get('items', [])):
                pic = it.get('pic') or {}
                if it.get('type') == 'zh_pic' and 'panels' in pic:
                    out.append((hsk_pic_id(pic), 'reading', f'{f.stem}/{st["id"]} #{k + 1}', pic))
    for f in sorted((ROOT / 'tools' / 'listening').glob('zh_hsk*.json')):
        for st in json.loads(f.read_text(encoding='utf-8')).get('sets', []):
            for name, pic in (st.get('pics') or {}).items():
                out.append((hsk_pic_id(pic), 'listening', f'{f.stem}/{st["id"]} {name}', pic))
    uniq = []
    for p in out:
        if p[0] not in seen:
            seen.add(p[0])
            uniq.append(p)
    return uniq


def missing():
    return [p for p in pictures() if not (DIRS[p[1]] / f'{p[0]}.webp').exists()]


def call(url, body=None):
    key = ba.gemini_key()
    req = urllib.request.Request(API + url, json.dumps(body).encode() if body is not None else None,
                                 {'Content-Type': 'application/json', 'x-goog-api-key': key}, method='POST' if body is not None else 'GET')
    try:
        return json.load(urllib.request.urlopen(req, timeout=120))
    except urllib.error.HTTPError as e:
        raise RuntimeError(f'HTTP {e.code}: {e.read().decode("utf-8", "replace")[:600]}') from None


def submit(todo):
    if JOB.exists() and json.loads(JOB.read_text(encoding='utf-8')).get('state') not in ('done', 'failed'):
        sys.exit(f'a job is still open ({JOB}); --fetch it first')
    reqs = []
    for pid, page, where, spec in todo:
        prompt, aspect = hsk_pic_prompt(spec)
        reqs.append({'request': {'contents': [{'parts': [{'text': prompt}]}],
                                 'generationConfig': {'responseModalities': ['IMAGE'], 'imageConfig': {'aspectRatio': aspect}}},
                     'metadata': {'key': pid}})
    res = call(f'models/{MODEL}:batchGenerateContent',
               {'batch': {'display_name': f'hsk-pics-{time.strftime("%Y%m%d-%H%M")}', 'input_config': {'requests': {'requests': reqs}}}})
    name = res.get('name') or res.get('metadata', {}).get('name')
    WORK.mkdir(parents=True, exist_ok=True)
    JOB.write_text(json.dumps({'name': name, 'state': 'submitted', 'at': time.strftime('%Y-%m-%d %H:%M'),
                               'pictures': [{'id': p, 'page': g, 'where': w} for p, g, w, _ in todo]}, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'submitted {len(todo)} pictures as {name}')


def save_webp(b64, path):
    from PIL import Image
    im = Image.open(io.BytesIO(base64.b64decode(b64))).convert('RGB')
    im.thumbnail((960, 960))
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, 'WEBP', quality=82, method=6)


def fetch():
    job = json.loads(JOB.read_text(encoding='utf-8'))
    res = call(job['name'])
    state = res.get('state') or res.get('metadata', {}).get('state') or ''
    print('state:', state)
    # the docs say JOB_STATE_*, the API answered BATCH_STATE_* (2026-10-30): take either
    kind = state.split('_STATE_')[-1]
    if kind != 'SUCCEEDED':
        if kind in ('FAILED', 'CANCELLED', 'EXPIRED'):
            job['state'] = 'failed'
            JOB.write_text(json.dumps(job, ensure_ascii=False, indent=1), encoding='utf-8')
            print(json.dumps(res)[:800])
        return
    out = res.get('response') or res.get('dest') or res.get('metadata', {}).get('output') or {}
    got = (out.get('inlinedResponses') or {}).get('inlinedResponses') or out.get('inlinedResponses') or []
    if len(got) != len(job['pictures']):
        sys.exit(f'{len(got)} results for {len(job["pictures"])} pictures — not saving (check the order by hand)')
    tokens_in = tokens_out = 0
    for pic, r in zip(job['pictures'], got):
        if r.get('error') or 'response' not in r:
            print(f'  ! {pic["where"]}: {json.dumps(r.get("error"))[:200]}')
            continue
        um = r['response'].get('usageMetadata', {})
        tokens_in += um.get('promptTokenCount', 0)
        tokens_out += um.get('candidatesTokenCount', 0) + um.get('thoughtsTokenCount', 0)
        parts = r['response']['candidates'][0]['content'].get('parts', [])
        data = next((p.get('inlineData') or p.get('inline_data') for p in parts if p.get('inlineData') or p.get('inline_data')), None)
        if not data:
            print(f'  ! {pic["where"]}: no picture in the answer')
            continue
        save_webp(data['data'], DIRS[pic['page']] / f'{pic["id"]}.webp')
        print(f'  {pic["where"]}: {pic["id"]}.webp')
    job['state'] = 'done'
    job['cost'] = round(tokens_in * PRICE_IN_BATCH + tokens_out * PRICE_IMG_BATCH, 3)
    JOB.write_text(json.dumps(job, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'tokens in {tokens_in}, out {tokens_out}: about US${job["cost"]} (check the Spend page)')


def review():
    cards = []
    for pid, page, where, spec in pictures():
        f = DIRS[page] / f'{pid}.webp'
        rel = '../../../' + f.relative_to(ROOT).as_posix()
        caps = '　'.join(f'{"ABCDEFGHI"[i]} {c}' for i, c in enumerate(spec.get('cap', [])))
        cards.append(f'<figure><img src="{rel}" alt="" loading="lazy"{"" if f.exists() else " hidden"}>'
                     f'<figcaption><b>{where}</b>　<code>{pid}</code><br>{caps}{"" if f.exists() else "<br><i>（還沒畫）</i>"}</figcaption></figure>')
    WORK.mkdir(parents=True, exist_ok=True)
    (WORK / 'review.html').write_text(
        '<!doctype html><meta charset="utf-8"><title>HSK 圖片檢查</title><style>body{font:15px sans-serif;margin:20px}'
        'main{display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:18px}img{width:100%;border:1px solid #ccc}'
        'figcaption{margin-top:4px;color:#444}</style><h2>HSK 圖片（每格的意思從左到右、從上到下）</h2><main>'
        + ''.join(cards) + '</main>', encoding='utf-8')
    print('Open http://localhost:8000/tools/.mockups/hsk_pics/review.html')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--submit', action='store_true')
    ap.add_argument('--fetch', action='store_true')
    ap.add_argument('--review', action='store_true')
    ap.add_argument('--redo', nargs='+')
    a = ap.parse_args()
    if a.redo:
        for pid, page, where, _ in pictures():
            if pid in a.redo and (DIRS[page] / f'{pid}.webp').exists():
                (DIRS[page] / f'{pid}.webp').unlink()
                print('forgot', where, pid)
    todo = missing()
    if a.dry_run or not (a.submit or a.fetch or a.review or a.redo):
        for pid, page, where, spec in todo:
            print(f'  {where}: {pid} ({spec["cols"]}x{spec["rows"]})')
        print(f'{len(todo)} to draw, about US${len(todo) * 1450 * PRICE_IMG_BATCH:.2f} in Batch mode')
    if a.submit:
        if not todo:
            print('nothing to draw')
        else:
            submit(todo)
    if a.fetch:
        fetch()
    if a.review:
        review()


if __name__ == '__main__':
    main()
