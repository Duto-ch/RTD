#!/usr/bin/env python3
"""픽셀아트 Scale2x (AdvMAME2x) — 도트 굵기를 절반으로 (2026-11-17 2px 통일). 프레임 경계를 넘지 않게 프레임마다 따로 처리.
사용: python3 tools/scale2x.py in.png out.png [frameW frameH]"""
import sys
from PIL import Image

def s2x(im):
    W, H = im.size
    p = im.load()
    out = Image.new('RGBA', (W * 2, H * 2))
    q = out.load()
    g = lambda x, y: p[min(W - 1, max(0, x)), min(H - 1, max(0, y))]
    for y in range(H):
        for x in range(W):
            P = p[x, y]; A = g(x, y - 1); B = g(x + 1, y); C = g(x - 1, y); D = g(x, y + 1)
            e0 = e1 = e2 = e3 = P
            if A != D and C != B:
                if C == A: e0 = A
                if A == B: e1 = B
                if D == C: e2 = C
                if B == D: e3 = D
            q[2 * x, 2 * y] = e0; q[2 * x + 1, 2 * y] = e1; q[2 * x, 2 * y + 1] = e2; q[2 * x + 1, 2 * y + 1] = e3
    return out

src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGBA')
if len(sys.argv) >= 5:
    fw, fh = int(sys.argv[3]), int(sys.argv[4])
    out = Image.new('RGBA', (im.width * 2, im.height * 2))
    for fy in range(0, im.height, fh):
        for fx in range(0, im.width, fw):
            out.paste(s2x(im.crop((fx, fy, fx + fw, fy + fh))), (fx * 2, fy * 2))
else:
    out = s2x(im)
out.save(dst)
print(src, im.size, '->', out.size)
