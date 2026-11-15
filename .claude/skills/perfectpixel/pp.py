#!/usr/bin/env python3
"""Snap an AI-made "pixel style" image to a true pixel grid with perfect-pixel.

usage: python3 pp.py IN.png OUT.png [--preview N] [--key-white] [--colors K]
  OUT.png       true-resolution sprite (one pixel per grid cell)
  --preview N   also write OUT_xN.png, nearest-neighbour upscaled for viewing
  --key-white   make near-white background transparent (flood from the edges)
  --colors K    reduce to at most K colours (median cut)
"""
import argparse, sys
import cv2, numpy as np
from PIL import Image
from perfect_pixel import get_perfect_pixel

ap = argparse.ArgumentParser()
ap.add_argument("inp"); ap.add_argument("out")
ap.add_argument("--preview", type=int, default=0)
ap.add_argument("--key-white", action="store_true")
ap.add_argument("--colors", type=int, default=0)
a = ap.parse_args()

bgr = cv2.imread(a.inp, cv2.IMREAD_COLOR)
if bgr is None: sys.exit(f"cannot read {a.inp}")
w, h, out = get_perfect_pixel(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
img = Image.fromarray(out.astype(np.uint8)).convert("RGBA")
if a.colors:
    img = img.convert("RGB").quantize(colors=a.colors, method=Image.Quantize.MEDIANCUT).convert("RGBA")
if a.key_white:
    px = img.load(); W, H = img.size; seen = set()
    stack = [(x, y) for x in range(W) for y in (0, H - 1)] + [(x, y) for y in range(H) for x in (0, W - 1)]
    while stack:
        x, y = stack.pop()
        if (x, y) in seen or not (0 <= x < W and 0 <= y < H): continue
        seen.add((x, y)); r, g, b, _ = px[x, y]
        if min(r, g, b) < 230: continue
        px[x, y] = (0, 0, 0, 0); stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
img.save(a.out)
print(f"grid {w}x{h} -> {a.out}")
if a.preview:
    p = a.out.rsplit(".", 1)[0] + f"_x{a.preview}.png"
    img.resize((img.width * a.preview, img.height * a.preview), Image.NEAREST).save(p); print(f"preview -> {p}")
