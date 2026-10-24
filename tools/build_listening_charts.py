"""Charts for the 聽解 page — TOPIK II question 3 ("알맞은 그래프를 고르십시오"): four small
charts in one 2x2 picture, like the AI-drawn picture grids, but drawn here with PIL so the
numbers are exact and nothing is paid. A pics.json entry {"first", "chart": {"panels": [4 charts]}}
where a chart is {kind: bar | line | pie, title, labels, values, unit?}; the file is
data/listening/img/<lang>/<pic_id>.webp (tools/build_listening.py pic_id hashes the chart spec,
so a changed chart is drawn again). Run tools/build_listening.py afterwards: it links pictures that exist.

Usage: python tools/build_listening_charts.py [--only ko_3] [--show]   (--show: also a PNG in the scratch folder)
"""
import argparse, io, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_listening import PICS, pic_id, IMG       # noqa: E402

FONT = 'C:/Windows/Fonts/malgun.ttf'
FONT_B = 'C:/Windows/Fonts/malgunbd.ttf'
SIDE = 512                                  # one panel; the picture is 2 x 2 panels
GRAYS = [(70, 70, 70), (130, 130, 130), (185, 185, 185), (225, 225, 225), (100, 100, 100)]
INK = (20, 20, 20)


def font(size, bold=False):
    return ImageFont.truetype(FONT_B if bold else FONT, size)


def centred(d, xy, text, f, fill=INK):
    w = d.textlength(text, font=f)
    d.text((xy[0] - w / 2, xy[1]), text, font=f, fill=fill)


def fit(d, text, size, width, bold=False):
    """the largest font up to `size` at which text fits in width"""
    while size > 12 and d.textlength(text, font=font(size, bold)) > width:
        size -= 1
    return font(size, bold)


def bar(d, box, c):
    x0, y0, x1, y1 = box
    n = len(c['values'])
    top, bottom = y0 + 70, y1 - 60
    vmax = max(c['values']) * 1.18
    d.line((x0 + 30, bottom, x1 - 20, bottom), fill=INK, width=2)
    slot = (x1 - x0 - 50) / n
    bw = min(70, slot * 0.6)
    for i, (lab, v) in enumerate(zip(c['labels'], c['values'])):
        cx = x0 + 30 + slot * (i + 0.5)
        h = (bottom - top) * v / vmax
        d.rectangle((cx - bw / 2, bottom - h, cx + bw / 2, bottom), fill=GRAYS[1], outline=INK, width=2)
        centred(d, (cx, bottom - h - 28), f'{v:g}{c.get("unit", "")}', font(20))
        centred(d, (cx, bottom + 10), lab, fit(d, lab, 21, slot - 4))


def line(d, box, c):
    x0, y0, x1, y1 = box
    n = len(c['values'])
    top, bottom = y0 + 80, y1 - 60
    lo, hi = min(c['values']), max(c['values'])
    pad = (hi - lo) * 0.25 or 1
    lo, hi = max(0, lo - pad), hi + pad
    d.line((x0 + 30, bottom, x1 - 20, bottom), fill=INK, width=2)
    d.line((x0 + 30, top - 10, x0 + 30, bottom), fill=INK, width=2)
    pts = [(x0 + 55 + (x1 - x0 - 100) * i / (n - 1), bottom - (bottom - top) * (v - lo) / (hi - lo))
           for i, v in enumerate(c['values'])]
    d.line(pts, fill=INK, width=4)
    for (x, y), lab, v in zip(pts, c['labels'], c['values']):
        d.ellipse((x - 7, y - 7, x + 7, y + 7), fill=(255, 255, 255), outline=INK, width=3)
        centred(d, (x, y - 34), f'{v:g}{c.get("unit", "")}', font(19))
        centred(d, (x, bottom + 10), lab, fit(d, lab, 20, (x1 - x0 - 100) / (n - 1)))


def pie(d, box, c):
    import math
    x0, y0, x1, y1 = box
    cx, cy, r = (x0 + x1) / 2, (y0 + y1) / 2 + 30, min(x1 - x0, y1 - y0) / 2 - 75
    total = sum(c['values'])
    a = -90
    for i, (lab, v) in enumerate(zip(c['labels'], c['values'])):
        sweep = 360 * v / total
        d.pieslice((cx - r, cy - r, cx + r, cy + r), a, a + sweep, fill=GRAYS[i % len(GRAYS)], outline=INK, width=2)
        mid = math.radians(a + sweep / 2)
        tx, ty = cx + math.cos(mid) * r * 0.62, cy + math.sin(mid) * r * 0.62
        fill = (255, 255, 255) if i in (0, 4) else INK
        centred(d, (tx, ty - 24), lab, fit(d, lab, 19, r * 0.8), fill)
        centred(d, (tx, ty), f'{v:g}{c.get("unit", "%")}', font(19, True), fill)
        a += sweep


def draw_chart(spec):
    img = Image.new('RGB', (SIDE * 2, SIDE * 2), 'white')
    d = ImageDraw.Draw(img)
    for k, c in enumerate(spec['chart']['panels']):
        px, py = (k % 2) * SIDE, (k // 2) * SIDE
        box = (px + 14, py + 14, px + SIDE - 14, py + SIDE - 14)
        d.rectangle(box, outline=INK, width=3)
        centred(d, ((box[0] + box[2]) / 2, box[1] + 18), c['title'], fit(d, c['title'], 24, SIDE - 60, True))
        {'bar': bar, 'line': line, 'pie': pie}[c['kind']](d, box, c)
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only')
    ap.add_argument('--show', help='folder for PNG copies to look at')
    args = ap.parse_args()
    for key, spec in PICS.items():
        if 'chart' not in spec or (args.only and not key.startswith(args.only + '/')):
            continue
        img = draw_chart(spec)
        lang = key.split('/')[0].split('_')[0]
        out = IMG / lang / f'{pic_id(spec)}.webp'
        out.parent.mkdir(parents=True, exist_ok=True)
        buf = io.BytesIO()
        img.save(buf, 'WEBP', quality=88)
        out.write_bytes(buf.getvalue())
        if args.show:
            img.save(Path(args.show) / (key.replace('/', '_') + '.png'))
        print(f'  {key}: {out.name} ({len(buf.getvalue()) // 1024} KB)')


if __name__ == '__main__':
    main()
