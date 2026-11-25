"""영지 배경 바람 마스크 (2026-11-25 사용자 요청: 구름·꽃·깃발이 살짝 움직이게 — 코드로)
lobby_key.webp(1920x1080) 위에 셰이더가 움직일 곳을 채널로 칠한다 → public/assets/lobby/lobby_wind.png
  R = 하늘(구름) — 성·산·초원은 0, 가장자리 부드럽게
  G = 초원 꽃 — 흰·노랑·분홍·파랑 꽃 픽셀을 3px 넓혀 부드럽게
  B = 깃발 — 깃대 쪽 0 → 끝 1 (깃발마다 상자)
실행: python3 docs/drafts/lobby-wind/mask.py [--preview out.png]
"""
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

SRC = 'public/assets/lobby/lobby_key.webp'
OUT = 'public/assets/lobby/lobby_wind.png'

# 깃발: (깃대 x, 깃발 위 y, 깃발 길이, 깃발 높이) — 원본 1920x1080 px, 눈으로 찍음
FLAGS = [
    (1496, 288, 16, 11), (1426, 375, 14, 9), (1458, 363, 8, 8), (1532, 364, 14, 9),
    (1569, 386, 15, 11), (1376, 410, 13, 8), (1309, 463, 14, 10), (1623, 438, 14, 10),
    (1686, 471, 15, 11), (1253, 501, 14, 10), (1740, 507, 14, 11), (1343, 484, 10, 8),
    (1653, 485, 11, 7),
]
CASTLE = (1180, 255, 1810, 660)  # 성·마을 상자 (구름 움직임 제외)


def main():
    im = np.asarray(Image.open(SRC).convert('RGB')).astype(int)
    H, W, _ = im.shape
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    yy, xx = np.mgrid[0:H, 0:W]

    # R: 하늘 — 위에서 y 470 까지 1, 540 에서 0 (산 꼭대기 위). 성 상자는 빼고 40px 부드럽게
    sky = np.clip((540 - yy) / 70.0, 0, 1)
    x0, y0, x1, y1 = CASTLE
    dx = np.maximum(np.maximum(x0 - xx, xx - x1), 0)
    dy = np.maximum(np.maximum(y0 - yy, yy - y1), 0)
    castle_far = np.clip(np.hypot(dx, dy) / 40.0, 0, 1)
    R = sky * castle_far

    # G: 꽃 — 초원(y 700 아래)에서 초록이 아닌 밝은 점
    mn = np.minimum(np.minimum(r, g), b)
    flower = (mn > 185) | ((r > 200) & (g > 170) & (b < 120)) | ((b > g + 15) & (b > 150)) | ((r > g + 15) & (r > 170))
    flower &= yy > 735
    flower = ndimage.binary_opening(flower, structure=np.ones((2, 2)))
    # 바위(회색 큰 덩어리)는 뺀다 — 넓혀 이은 덩어리가 크면 바위
    lab, n = ndimage.label(ndimage.binary_dilation(flower, iterations=2))
    size = ndimage.sum(np.ones_like(lab), lab, index=np.arange(1, n + 1))
    grey = (np.maximum(np.maximum(r, g), b) - mn) < 30
    greyfrac = ndimage.mean(grey, lab, index=np.arange(1, n + 1))
    keep = np.zeros(n + 1, bool)
    keep[1:] = (size < 260) & (greyfrac < 0.6)
    flower &= keep[lab]
    flower = ndimage.binary_dilation(flower, iterations=3)
    G = np.asarray(Image.fromarray((flower * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))) / 255.0

    # B: 깃발 — 깃대 0 → 끝 1, 위아래 2px 여유
    #    상자 안은 B 를 최소 2/255 로 (셰이더가 '깃발 상자' 로 알아봄), 상자 안 G = 깃발 픽셀 (분홍·노랑 — 하늘·구름이 아닌 것)
    #    → 셰이더는 깃발 픽셀만 옮기고, 깃발이 비운 자리는 위 하늘로 채운다 (뒤 구름이 같이 꿀렁이지 않게)
    B = np.zeros((H, W))
    flagpx = np.zeros((H, W), bool)
    for px, py, w, h in FLAGS:
        ys, xs = slice(py - 3, py + h + 3), slice(px + 1, px + w + 3)
        t = np.clip((xx[ys, xs] - px) / float(w), 2 / 255, 1)
        B[ys, xs] = np.maximum(B[ys, xs], t)
        rr, gg, bb = r[ys, xs], g[ys, xs], b[ys, xs]
        flagpx[ys, xs] |= (rr - bb > 8) | ((rr > 200) & (gg > 160) & (bb < 170))
    flagpx = ndimage.binary_dilation(flagpx) & (B > 0)
    G = np.where(B > 0, flagpx.astype(float), G)

    out = np.stack([R, G, B], -1)
    Image.fromarray((out * 255).round().astype(np.uint8)).save(OUT, optimize=True)
    print('saved', OUT, 'flower px', int(flower.sum()))
    if '--preview' in sys.argv:
        p = sys.argv[sys.argv.index('--preview') + 1]
        base = im * 0.5
        base[..., 0] += R * 100
        base[..., 1] += G * 120
        base[..., 2] += B * 255
        Image.fromarray(np.clip(base, 0, 255).astype(np.uint8)).resize((960, 540)).save(p)


if __name__ == '__main__':
    main()
