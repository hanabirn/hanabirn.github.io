"""Pictures for the 聽解 page (owner's pick 2026-10-22: black-and-white line art like the
JLPT paper), drawn with Gemini image generation from the descriptions in
tools/listening/pics.json:
  grid  — one 2x2 picture whose panels are a 課題理解 item's four options (the page shows
          one quarter in each option button), as on the N5/N4 paper;
  scene — one picture with one arrow at the person who speaks, for 発話表現 (N5–N3).
Each picture is data/listening/img/<lang>/<id>.webp, id = pic_id() of its prompt
(tools/build_listening.py), so a changed description is drawn again and an unchanged
one never is. Run tools/build_listening.py afterwards: it only links pictures that exist.

Every picture needs a look before it goes live (the model sometimes adds a second arrow
or text): --review writes tools/.mockups/listening_img/review.html; to draw one again,
delete its file (or --redo <key>) and run this again.

Usage: python tools/build_listening_img.py [--dry-run] [--only ja_n5] [--redo KEY ...] [--limit N] [--review]
Cost (2026-10): about US$0.067 a picture (gemini-3.1-flash-image at 1K, 1120 output tokens).
"""
import argparse, base64, io, json, sys, time, urllib.error, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
import build_audio as ba                                     # noqa: E402  (gemini_key)
from build_listening import PICS, pic_prompt, pic_id, IMG    # noqa: E402

MODEL = 'gemini-3.1-flash-image'
PRICE = 0.067                     # US$ a 1K picture
REVIEW = ROOT / 'tools' / '.mockups' / 'listening_img' / 'review.html'


def draw(key, spec):
    prompt, aspect = pic_prompt(spec)
    body = {'contents': [{'parts': [{'text': prompt}]}],
            'generationConfig': {'responseModalities': ['IMAGE'], 'imageConfig': {'aspectRatio': aspect}}}
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={ba.gemini_key()}'
    req = urllib.request.Request(url, json.dumps(body).encode(), {'Content-Type': 'application/json'})
    for attempt in range(4):
        try:
            res = json.load(urllib.request.urlopen(req, timeout=240))
            break
        except urllib.error.HTTPError as e:
            msg = e.read().decode('utf-8', 'replace')
            if e.code in (429, 500, 503) and attempt < 3:
                time.sleep(30 * (attempt + 1))
                continue
            raise RuntimeError(f'HTTP {e.code}: {msg[:300]}') from None
    for part in res['candidates'][0]['content'].get('parts', []):
        data = part.get('inlineData') or part.get('inline_data')
        if data:
            from PIL import Image
            im = Image.open(io.BytesIO(base64.b64decode(data['data']))).convert('RGB')
            im.thumbnail((960, 960))
            buf = io.BytesIO()
            im.save(buf, 'WEBP', quality=82, method=6)
            return buf.getvalue()
    raise RuntimeError('no picture in the answer: ' + json.dumps(res)[:300])


def review(items):
    """A page with every picture and the item it belongs to, for the owner's check."""
    rows = []
    for key, spec in items:
        f = IMG / spec_lang(key) / f'{pic_id(spec)}.webp'
        rel = '../../../' + f.relative_to(ROOT).as_posix()
        what = (' / '.join(f'{i + 1} {p}' for i, p in enumerate(spec['grid']['panels'])) if 'grid' in spec
                else spec['scene']['desc'] + ' — arrow: ' + spec['scene']['arrow'])
        rows.append(f'<figure><img src="{rel}" alt="" loading="lazy"{"" if f.exists() else " hidden"}>'
                    f'<figcaption><b>{key}</b>　{spec["first"]}<br><small>{what}</small>'
                    f'{"" if f.exists() else "<br><i>（還沒畫）</i>"}</figcaption></figure>')
    REVIEW.parent.mkdir(parents=True, exist_ok=True)
    REVIEW.write_text('<!doctype html><meta charset="utf-8"><title>聽解配圖審核</title>'
                      '<style>body{font-family:system-ui,sans-serif;margin:20px;background:#f6f1e7}'
                      'main{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}'
                      'figure{margin:0;background:#fff;border:1px solid #ddd;border-radius:10px;padding:10px}'
                      'img{width:100%;border-radius:6px}figcaption{font-size:13px;line-height:1.6;margin-top:6px}'
                      'small{color:#666}</style><h1>聽解配圖審核（' + str(len(rows)) + ' 張）</h1>'
                      '<p>有問題的圖告訴 Claude 它的編號（例：ja_n5/s1/4），就會重畫。</p><main>' + ''.join(rows) + '</main>',
                      encoding='utf-8')
    print('review page:', REVIEW.relative_to(ROOT))


def spec_lang(key):
    return key.split('/')[0].split('_')[0]          # ja_n5/s1/0 -> ja


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--only', help='a level, e.g. ja_n5')
    ap.add_argument('--redo', nargs='*', default=[], help='keys to draw again')
    ap.add_argument('--limit', type=int)
    ap.add_argument('--review', action='store_true')
    args = ap.parse_args()
    items = [(k, v) for k, v in PICS.items() if not args.only or k.startswith(args.only + '/')]
    if args.review:
        return review(items)
    for k in args.redo:
        f = IMG / spec_lang(k) / f'{pic_id(PICS[k])}.webp'
        if f.exists():
            f.unlink()
    todo = [(k, v) for k, v in items if not (IMG / spec_lang(k) / f'{pic_id(v)}.webp').exists()]
    if args.limit is not None:
        todo = todo[:args.limit]
    print(f'{len(items)} pictures, {len(todo)} to draw, about US${len(todo) * PRICE:.2f}')
    if args.dry_run:
        return
    done = 0
    for key, spec in todo:
        try:
            webp = draw(key, spec)
        except RuntimeError as e:
            print(f'  ! {key}: {e}')
            continue
        out = IMG / spec_lang(key) / f'{pic_id(spec)}.webp'
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(webp)
        done += 1
        print(f'  {key}: {len(webp) // 1024} KB ({done}/{len(todo)})', flush=True)
    print(f'{done} drawn, about US${done * PRICE:.2f}')
    review(items)


if __name__ == '__main__':
    main()
