"""배경 나무 — 바람에 살랑이는 28프레임 (2026-11-21 처음, 2026-11-22 사용자 새 나무 3장으로 교체)
그림: tree_1.png · tree_2.png · tree_3.png (사용자 그림 50x50) → manifest `deco_tree_1` · `deco_tree_2` · `deco_tree_3`
     (예전 tree.png 와 잎 색 변형 deco_tree·_teal·_spring 은 2026-11-22 교체로 뺐다 — tree.png 는 기록용으로만 남김)
- 흔들림: 줄기 밑동은 땅에 고정, 위로 갈수록 더 크게 좌우로 기운다 (높이^1.6, 꼭대기 최대 ±2px).
  바람은 한 번 크게 + 작은 되흔들림 (sin t 0.75 + sin 2t 0.25) — 28프레임이 끊김 없이 돈다. 나무마다 바람 결이 조금 다르다
- 바스락: 실루엣(외곽선)은 위 흔들림만 따르고, 잎 안쪽(녹색 계열 색)만 덩어리마다 다른 박자로 1px 일렁인다.
- 색·반투명 픽셀은 원본 그대로 (새 색 없음), 도트 격자 그대로 — 회전·흐림 없이 줄마다 정수 칸만 옮긴다.
- 밑동(pivot)·꼭대기는 그림마다 자동으로 잰다: 밑동 = 맨 아래 줄 불투명 픽셀 가운데, 꼭대기 = 맨 위 줄
실행: python3 docs/drafts/tree-sway/sway.py → sheet_<n>.png (50x50 × 28) · sway.gif (6배, 3그루) · preview.png
      + public/assets/custom/deco/tree_sway_<n>.png · manifest `deco_tree_<n>` (sway 28프레임 × 100ms). 놓는 자리는 scatter.py → src/data/decor.js
"""
import os, math, json, shutil, colorsys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
N, MS = 28, 100
AMP = 2.2              # 꼭대기 최대 흔들림 (px)
TREES = [('deco_tree_1', 'tree_1.png'), ('deco_tree_2', 'tree_2.png'), ('deco_tree_3', 'tree_3.png')]
OLD_KEYS = ['deco_tree', 'deco_tree_teal', 'deco_tree_spring']
OLD_FILES = ['tree_sway.png', 'tree_sway_teal.png', 'tree_sway_spring.png']


def is_leaf(c):
    """잎 = 어둡지 않은 녹색 계열 (줄기 갈색·검은 외곽선은 아님)"""
    r, g, b = c
    if max(c) < 40:
        return False
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    return 0.12 <= h <= 0.45 and s > 0.12 and g >= r - 6


class Swayer:
    def __init__(self, path, seed):
        im = Image.open(path).convert('RGBA')
        self.W, self.H = im.size
        self.src = {(x, y): im.getpixel((x, y)) for x in range(self.W) for y in range(self.H)}
        x0, y0, x1, y1 = im.getbbox()
        self.top, self.base = y0, y1 - 1
        bottom = [x for x in range(self.W) if self.src[(x, self.base)][3] > 128]
        self.pivot = (round(sum(bottom) / len(bottom)), self.base)
        self.seed = seed

    def sway(self, y, t):
        k = max(0.0, (self.base - y) / (self.base - self.top)) ** 1.6
        a = 2 * math.pi * t
        w = 0.75 * math.sin(a) + 0.25 * math.sin(2 * a + 0.9 + self.seed * 0.4)
        return round(AMP * k * w)

    def rustle(self, x, y, t):
        a = 2 * math.pi * t
        clump = (x // 9) * 1.7 + (y // 8) * 2.3 + self.seed
        v = math.sin(2 * a + clump)
        return 1 if v > 0.55 else (-1 if v < -0.55 else 0)

    def frame(self, t):
        out = Image.new('RGBA', (self.W, self.H), (0, 0, 0, 0))
        for y in range(self.H):
            dx = self.sway(y, t)
            for x in range(self.W):
                p = self.src.get((x - dx, y))
                if not p or not p[3]:
                    continue
                if p[3] == 255 and is_leaf(p[:3]):
                    q = self.src.get((x - dx - self.rustle(x, y, t), y))
                    if q and q[3] == 255 and is_leaf(q[:3]):
                        p = q
                out.putpixel((x, y), p)
        return out


if __name__ == '__main__':
    dst = os.path.join(ROOT, 'public', 'assets', 'custom', 'deco')
    os.makedirs(dst, exist_ok=True)
    mf_path = os.path.join(ROOT, 'public', 'assets', 'custom', 'manifest.json')
    mf = json.load(open(mf_path))
    for k in OLD_KEYS:
        mf['sprites'].pop(k, None)
    for f in OLD_FILES:
        if os.path.exists(os.path.join(dst, f)):
            os.remove(os.path.join(dst, f))
    for f in ('sheet.png', 'sheet_teal.png', 'sheet_spring.png', 'colors.png'):
        if os.path.exists(os.path.join(HERE, f)):
            os.remove(os.path.join(HERE, f))
    grass = (35, 63, 46, 255)
    all_frames = []
    for i, (key, f) in enumerate(TREES, 1):
        s = Swayer(os.path.join(HERE, f), i)
        frames = [s.frame(n / N) for n in range(N)]
        all_frames.append(frames)
        sheet = Image.new('RGBA', (s.W * N, s.H), (0, 0, 0, 0))
        for n, fr in enumerate(frames):
            sheet.alpha_composite(fr, (n * s.W, 0))
        sheet.save(os.path.join(HERE, f'sheet_{i}.png'))
        shutil.copyfile(os.path.join(HERE, f'sheet_{i}.png'), os.path.join(dst, f'tree_sway_{i}.png'))
        mf['sprites'][key] = {'file': f'deco/tree_sway_{i}.png', 'frameWidth': s.W, 'frameHeight': s.H, 'scale': 1,
                              'pivotX': s.pivot[0], 'pivotY': s.pivot[1],
                              'animations': {'sway': {'frames': list(range(N)), 'ms': [MS] * N, 'loop': True}}}
        print(key, 'pivot', s.pivot, 'top', s.top, 'sway', [s.sway(s.top, n / N) for n in range(0, N, 4)])
    json.dump(mf, open(mf_path, 'w'), ensure_ascii=False, indent=1)
    # GIF: 3그루를 나란히 (6배, 초원 땅색)
    z = 6
    gif = []
    for n in range(N):
        c = Image.new('RGBA', (50 * z * 3, 50 * z), grass)
        for k, frames in enumerate(all_frames):
            c.alpha_composite(frames[n].resize((50 * z, 50 * z), Image.NEAREST), (k * 50 * z, 0))
        gif.append(c.convert('RGB'))
    gif[0].save(os.path.join(HERE, 'sway.gif'), save_all=True, append_images=gif[1:], duration=MS, loop=0)
    pv = Image.new('RGBA', (50 * z * 3, 50 * z * 2), grass)
    for k, frames in enumerate(all_frames):
        pv.alpha_composite(frames[0].resize((50 * z, 50 * z), Image.NEAREST), (k * 50 * z, 0))
        pv.alpha_composite(frames[5].resize((50 * z, 50 * z), Image.NEAREST), (k * 50 * z, 50 * z))
    pv.convert('RGB').save(os.path.join(HERE, 'preview.png'))
    print('installed', [k for k, _ in TREES])
