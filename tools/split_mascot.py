"""Split 小花火's Clip Studio PSD into the animation layers the site stacks
(images/mascot/*.webp, used by js/mascot.js).

    pip install psd-tools pillow numpy
    python tools/split_mascot.py "C:/Users/shira/Downloads/我的人˙物.psd"

Parts, by layer name in the PSD (clipped layers go with the layer they clip to):
    eyes_open    眼白 眼睛 眼睛睜開_線搞 瞳孔
    eyes_closed  眼睛閉起線搞
    mouth_smile  嘴巴
    mouth_closed 嘴巴閉線搞
    body         everything else that is visible (not Paper / 草稿)
The main line art (線搞) and 眉毛 still hold the open-eye lines, the upper eyelid
arcs and the open-mouth outline, so the line pixels inside each eye box (found from
眼白) and the mouth box (from 嘴巴) are moved into eyes_open / mouth_smile. Every
part keeps the same canvas, cropped to the character, so the images stack exactly.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from psd_tools import PSDImage

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'images' / 'mascot'
PARTS = {
    'eyes_open': {'眼白', '眼睛', '眼睛睜開_線搞', '瞳孔'},
    'eyes_closed': {'眼睛閉起線搞'},
    'mouth_smile': {'嘴巴'},
    'mouth_closed': {'嘴巴閉線搞'},
}
LINES = {'線搞', '眉毛'}
SKIP = {'Paper', '草稿'}


def main(path):
    psd = PSDImage.open(path)
    W, H = psd.size
    layers = list(psd)
    groups = []
    for layer in layers:
        if layer.clipping and groups:
            groups[-1].append(layer)
        else:
            groups.append([layer])

    def render(names):
        keep = set(id(l) for g in groups if g[0].name in names for l in g)
        img = psd.composite(layer_filter=lambda l: id(l) in keep and l.visible)
        return np.array((img or Image.new('RGBA', (W, H))).convert('RGBA')).astype(np.float32)

    def layer_alpha(name):
        layer = next(l for l in layers if l.name == name)
        return np.array(layer.composite(viewport=(0, 0, W, H)).convert('RGBA'))[..., 3] > 10

    def over(top, bottom):
        ta, ba = top[..., 3:] / 255, bottom[..., 3:] / 255
        a = ta + ba * (1 - ta)
        rgb = np.where(a > 0, (top[..., :3] * ta + bottom[..., :3] * ba * (1 - ta)) / np.maximum(a, 1e-6), 0)
        return np.concatenate([rgb, a * 255], -1)

    def masked(img, mask):
        out = img.copy()
        out[..., 3] *= mask
        return out

    # where the eyes and the mouth are
    white = layer_alpha('眼白')
    cols = np.where(white.any(0))[0]
    mid = (cols.min() + cols.max()) // 2
    eye_mask = np.zeros((H, W), bool)
    for side in (cols[cols < mid], cols[cols >= mid]):
        rows = np.where(white[:, side.min():side.max() + 1].any(1))[0]
        eye_mask[rows.min() - 7:rows.max() + 5, side.min() - 6:side.max() + 7] = True
    ys, xs = np.where(layer_alpha('嘴巴'))
    mouth_mask = np.zeros((H, W), bool)
    mouth_mask[ys.min() - 3:ys.max() + 4, xs.min() - 3:xs.max() + 4] = True

    moved = set().union(*PARTS.values()) | LINES | SKIP
    lines = render(LINES)
    parts = {
        'body': over(masked(lines, ~(eye_mask | mouth_mask)), render(set(g[0].name for g in groups) - moved)),
        'eyes_open': over(masked(lines, eye_mask), render(PARTS['eyes_open'])),
        'eyes_closed': render(PARTS['eyes_closed']),
        'mouth_smile': over(masked(lines, mouth_mask), render(PARTS['mouth_smile'])),
        'mouth_closed': render(PARTS['mouth_closed']),
    }

    # one crop box for all parts: the character plus a few pixels
    alpha = np.zeros((H, W), bool)
    for img in parts.values():
        alpha |= img[..., 3] > 0
    ys, xs = np.where(alpha)
    pad = 6
    box = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(W, xs.max() + pad + 1), min(H, ys.max() + pad + 1))
    OUT.mkdir(parents=True, exist_ok=True)
    for name, img in parts.items():
        im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGBA').crop(box)
        im.save(OUT / f'{name}.webp', 'WEBP', quality=92, method=6)
        print(f'{name}.webp  {(OUT / f"{name}.webp").stat().st_size:>6} bytes')
    print(f'size {box[2] - box[0]}x{box[3] - box[1]} (keep --mascot-ratio in css/mascot.css in step)')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
