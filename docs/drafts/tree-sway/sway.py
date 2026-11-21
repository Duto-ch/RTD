"""배경 나무 — 바람에 살랑이는 28프레임 (2026-11-21, 사용자 그림 tree.png 50x50)
- 흔들림: 줄기 밑동은 땅에 고정, 위로 갈수록 더 크게 좌우로 기운다 (높이^1.6, 꼭대기 최대 ±2px).
  바람은 한 번 크게 + 작은 되흔들림 (sin t 0.75 + sin 2t 0.25) — 28프레임이 끊김 없이 돈다.
- 바스락: 실루엣(외곽선)은 위 흔들림만 따르고, 잎 안쪽 무늬(밝은 잎·중간·그늘 3톤)만 덩어리마다 다른 박자로 1px 일렁인다.
- 색은 원본 11색 그대로 (새 색 없음), 도트 격자 그대로 — 회전·흐림 없이 줄마다 정수 칸만 옮긴다.
실행: python3 docs/drafts/tree-sway/sway.py → sheet.png (50x50 × 28, 가로) · sway.gif (6배) · preview.png (게임 크기 2px · 4배 프레임)
      게임 적용(2026-11-21): 같은 실행이 public/assets/custom/deco/tree_sway.png + manifest `deco_tree`(sway 28프레임 × 100ms, 밑동 22,46) 를 쓴다.
      놓는 자리는 src/data/decor.js, 그리는 곳은 src/art/decor.js
"""
import os, math, json, shutil
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
N, MS = 28, 100
SRC = Image.open(os.path.join(HERE, 'tree.png')).convert('RGBA')
W, H = SRC.size
src = {(x, y): SRC.getpixel((x, y)) for x in range(W) for y in range(H)}
OUT = (0, 0, 0)
LEAF = {(61, 74, 59), (149, 151, 56), (173, 191, 137)}   # 그늘 · 중간 · 밝은 잎
BASE_Y = 46            # 밑동 (고정)
TOP_Y = 8              # 꼭대기
AMP = 2.2              # 꼭대기 최대 흔들림 (px)


def opaque(p):
    return p[3] > 128


def sway(y, t):
    """y 줄이 t(0~1) 에 옆으로 움직이는 칸 수 (정수)"""
    k = max(0.0, (BASE_Y - y) / (BASE_Y - TOP_Y)) ** 1.6
    a = 2 * math.pi * t
    w = 0.75 * math.sin(a) + 0.25 * math.sin(2 * a + 0.9)
    return round(AMP * k * w)


def rustle(x, y, t):
    """잎 덩어리마다 다른 박자로 안쪽 무늬만 0 / ±1 칸"""
    a = 2 * math.pi * t
    clump = (x // 9) * 1.7 + (y // 8) * 2.3
    v = math.sin(2 * a + clump)
    return 1 if v > 0.55 else (-1 if v < -0.55 else 0)


def frame(t):
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for y in range(H):
        dx = sway(y, t)
        for x in range(W):
            p = src.get((x - dx, y))
            if not p or not opaque(p):
                continue
            if p[:3] in LEAF:   # 잎 안쪽: 덩어리 박자로 옆 칸 잎 색을 가져온다 (실루엣은 그대로)
                r = rustle(x, y, t)
                q = src.get((x - dx - r, y))
                if q and opaque(q) and q[:3] in LEAF:
                    p = q
            out.putpixel((x, y), p[:3] + (255,))
    return out


if __name__ == '__main__':
    frames = [frame(i / N) for i in range(N)]
    sheet = Image.new('RGBA', (W * N, H), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        sheet.alpha_composite(f, (i * W, 0))
    sheet.save(os.path.join(HERE, 'sheet.png'))
    grass = (124, 170, 84, 255)
    gif = []
    for f in frames:
        c = Image.new('RGBA', (W * 6, H * 6), grass)
        c.alpha_composite(f.resize((W * 6, H * 6), Image.NEAREST))
        gif.append(c.convert('RGB'))
    gif[0].save(os.path.join(HERE, 'sway.gif'), save_all=True, append_images=gif[1:], duration=MS, loop=0)
    # 미리보기: 원본 · 가장 왼쪽 · 가운데 · 가장 오른쪽 (6배) + 게임 크기 2px
    pick = [0, 5, 14, 19]
    pv = Image.new('RGBA', (W * 6 * 5 + 40, H * 6 + 20), grass)
    pv.alpha_composite(SRC.resize((W * 6, H * 6), Image.NEAREST), (10, 10))
    for k, i in enumerate(pick):
        pv.alpha_composite(frames[i].resize((W * 6, H * 6), Image.NEAREST), (10 + (k + 1) * W * 6 + k * 5, 10))
    pv.convert('RGB').save(os.path.join(HERE, 'preview.png'))
    print('frames', N, 'ms', MS, 'colors', len({p[:3] for f in frames for p in f.get_flattened_data() if p[3]}),
          'sway', [sway(TOP_Y, i / N) for i in range(N)])


# ── 잎 색 변형 (2026-11-21 사용자 요청: 몇 그루는 다른 녹색 계열로) — 잎 3톤(그늘·중간·밝은)만 바꾼다. 외곽선·줄기 그대로 ──
VARIANTS = {
    'teal':   [(36, 70, 64), (58, 136, 106), (128, 196, 156)],    # 푸른빛 도는 청록 녹색
    'spring': [(50, 92, 44), (108, 168, 56), (176, 214, 108)],    # 맑은 연두
}
LEAF_ORDER = [(61, 74, 59), (149, 151, 56), (173, 191, 137)]


def recolor(img, cols):
    m = dict(zip(LEAF_ORDER, cols))
    out = img.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            p = px[x, y]
            if p[3] and p[:3] in m:
                px[x, y] = m[p[:3]] + (p[3],)
    return out


sheet_all = Image.open(os.path.join(HERE, 'sheet.png')).convert('RGBA')
for vn, cols in VARIANTS.items():
    recolor(sheet_all, cols).save(os.path.join(HERE, f'sheet_{vn}.png'))
cmp_ = Image.new('RGBA', (W * 6 * 3 + 40, H * 6 + 20), (124, 170, 84, 255))
for k, im in enumerate([SRC] + [recolor(SRC, c) for c in VARIANTS.values()]):
    cmp_.alpha_composite(im.resize((W * 6, H * 6), Image.NEAREST), (10 + k * (W * 6 + 10), 10))
cmp_.convert('RGB').save(os.path.join(HERE, 'colors.png'))

# ── 게임에 넣기 (manifest 의 다른 항목은 그대로) ──
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
dst = os.path.join(ROOT, 'public', 'assets', 'custom', 'deco')
os.makedirs(dst, exist_ok=True)
mf_path = os.path.join(ROOT, 'public', 'assets', 'custom', 'manifest.json')
mf = json.load(open(mf_path))
for key, f in [('deco_tree', 'sheet.png')] + [(f'deco_tree_{vn}', f'sheet_{vn}.png') for vn in VARIANTS]:
    shutil.copyfile(os.path.join(HERE, f), os.path.join(dst, f.replace('sheet', 'tree_sway')))
    mf['sprites'][key] = {'file': 'deco/' + f.replace('sheet', 'tree_sway'), 'frameWidth': W, 'frameHeight': H, 'scale': 1, 'pivotX': 22, 'pivotY': 46,
                          'animations': {'sway': {'frames': list(range(N)), 'ms': [MS] * N, 'loop': True}}}
json.dump(mf, open(mf_path, 'w'), ensure_ascii=False, indent=1)
print('installed deco_tree +', list(VARIANTS))
