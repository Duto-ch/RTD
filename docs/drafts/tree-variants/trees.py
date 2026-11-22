"""사용자 나무(docs/drafts/tree-sway/tree.png)를 기준으로 만든 다른 나무들 (2026-11-22, 시안)
기준 그림에서 따온 그리는 방식:
  - 50x50 캔버스, 밑동은 아래 가운데쯤(y 46), 검은 외곽선 1px (실루엣 바깥만)
  - 잎은 둥근 덩어리 여러 개 — 덩어리마다 왼쪽 위가 밝은 잎, 가운데 띠가 중간 잎, 아래·덩어리 사이가 그늘 잎 (3톤)
  - 줄기는 2톤 갈색(밝음·그늘), 밑동이 벌어지고 갈래가 잎 속으로 들어간다
  - 잡티·그라데이션 없이 덩어리 단위로 색이 바뀐다
나무 7종: 참나무 · 포플러 · 전나무 · 덤불 · 자작나무 · 사과나무 · 어린 나무
실행: python3 docs/drafts/tree-variants/trees.py → <id>.png (50x50) · sheet.png (기준 + 7종, 6배·게임 크기 2px)
"""
import os, math
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
W = H = 50
OUT = (0, 0, 0)
LEAF = {  # (그늘, 중간, 밝은) — 기준 나무 색 + 같은 방식의 다른 녹색
    'olive': [(61, 74, 59), (149, 151, 56), (173, 191, 137)],
    'teal': [(36, 70, 64), (58, 136, 106), (128, 196, 156)],
    'spring': [(50, 92, 44), (108, 168, 56), (176, 214, 108)],
    'pine': [(30, 56, 52), (52, 104, 86), (98, 152, 112)],
    'birch': [(66, 96, 52), (146, 178, 74), (206, 222, 140)],
}
BARK = {'brown': [(86, 76, 72), (52, 44, 40)], 'birch': [(232, 228, 214), (150, 146, 136)], 'pine': [(110, 72, 52), (66, 44, 34)]}


class Tree:
    def __init__(self, leaf='olive', bark='brown'):
        self.blobs = []     # (cx, cy, rx, ry)
        self.trunk = set()  # (x, y, tone 0 밝음 / 1 그늘)
        self.extra = {}     # (x, y) → 색 (열매·자작나무 무늬 등, 잎 위에)
        self.leaf, self.bark = LEAF[leaf], BARK[bark]

    def blob(self, cx, cy, rx, ry=None):
        self.blobs.append((cx, cy, rx, ry or rx))

    def stem(self, pts, w0, w1):
        """밑동 → 끝 꺾은선, 굵기 w0 → w1. 왼쪽 반은 밝음, 오른쪽은 그늘"""
        n = len(pts) - 1
        total = sum(math.dist(pts[i], pts[i + 1]) for i in range(n))
        acc = 0
        for i in range(n):
            (x0, y0), (x1, y1) = pts[i], pts[i + 1]
            L = max(1, math.dist(pts[i], pts[i + 1]))
            for s in range(int(L * 3) + 1):
                t = s / (L * 3)
                x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
                w = w0 + (w1 - w0) * (acc + L * t) / total
                for k in range(-int(w), int(w) + 1):
                    if abs(k) <= w / 2:
                        self.trunk.add((round(x + k), round(y), 0 if k < w / 4 - 0.5 else 1))
            acc += L

    def roots(self, x, y, spread=3):
        for k in range(1, spread + 1):
            self.trunk.add((x - 2 - k, y - (spread - k) // 2, 0))
            self.trunk.add((x + 2 + k, y - (spread - k) // 2, 1))

    def render(self):
        g = {}
        # 줄기 먼저 (잎이 덮는다)
        for x, y, tone in sorted(self.trunk, key=lambda p: p[2]):
            if 0 <= x < W and 0 <= y < H:
                g[(x, y)] = self.bark[tone]
        # 잎 덩어리: 위에서 아래 순서로 그려 아래 덩어리가 앞에 온다
        dark, mid, light = self.leaf
        for bi, (cx, cy, rx, ry) in enumerate(sorted(self.blobs, key=lambda b: b[1])):
            ph = bi * 1.9 + cx * 0.3
            for y in range(int(cy - ry) - 2, int(cy + ry) + 3):
                for x in range(int(cx - rx) - 2, int(cx + rx) + 3):
                    u, v = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
                    a = math.atan2(v, u)
                    wob = 1 + 0.10 * math.sin(3 * a + ph) + 0.07 * math.sin(5 * a + ph * 1.7)   # 울퉁불퉁한 덩어리 테두리
                    d = (u * u + v * v) / (wob * wob)
                    if d > 1 or not (0 <= x < W and 0 <= y < H):
                        continue
                    lit = -(u * 0.55 + v * 0.85)          # 왼쪽 위로 갈수록 큼
                    if v > 0.05 and d > 0.55 or lit < -0.2:   # 덩어리 아래쪽·오른쪽 아래 = 그늘 (기준 나무처럼 넓게)
                        c = dark
                    elif lit > 0.32 and d < 0.62:         # 밝은 잎은 왼쪽 위 작은 머리에만
                        c = light
                    else:
                        c = mid
                    g[(x, y)] = c
        for p, c in self.extra.items():
            if p in g:
                g[p] = c
        # 외곽선: 실루엣 바깥 4방향
        line = set()
        for (x, y) in g:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                q = (x + dx, y + dy)
                if q not in g and 0 <= q[0] < W and 0 <= q[1] < H:
                    line.add(q)
        im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        for (x, y), c in g.items():
            im.putpixel((x, y), c + (255,))
        for (x, y) in line:
            im.putpixel((x, y), OUT + (255,))
        return im


def oak():
    """넓게 퍼진 참나무 — 기준보다 낮고 옆으로 넓은 덩어리 6개"""
    t = Tree('olive')
    t.stem([(24, 46), (24, 36), (19, 30)], 5, 2), t.stem([(24, 38), (30, 30)], 2, 1.5), t.roots(24, 46)
    for b in [(14, 24, 8, 6), (25, 18, 9, 7), (36, 23, 8, 6), (10, 30, 6, 5), (22, 28, 9, 6), (38, 30, 7, 5)]:
        t.blob(*b)
    return t


def poplar():
    """키 큰 포플러 — 세로로 긴 덩어리를 쌓는다"""
    t = Tree('spring')
    t.stem([(24, 46), (24, 30)], 3, 2), t.roots(24, 46, 2)
    for b in [(24, 9, 5, 6), (22, 16, 6, 6), (27, 20, 6, 6), (22, 25, 7, 6), (27, 30, 6, 5), (24, 34, 7, 4)]:
        t.blob(*b)
    return t


def pine():
    """전나무 — 위로 갈수록 좁아지는 층 4개 (각 층은 납작한 덩어리 줄)"""
    t = Tree('pine', 'pine')
    t.stem([(24, 46), (24, 14)], 3, 1.5), t.roots(24, 46, 2)
    for i, (y, half) in enumerate([(12, 4), (20, 8), (28, 12), (36, 15)]):
        n = max(1, half // 4)
        for k in range(-n, n + 1):
            t.blob(24 + k * (half / (n + 0.5)), y + abs(k) * 0.8, half / (n + 0.5) * 0.9 + 1.5, 4.5)
    return t


def bush():
    """덤불 — 줄기 없이 낮고 넓게, 분홍 꽃 몇 송이"""
    t = Tree('teal')
    for b in [(14, 38, 7, 6), (25, 34, 8, 7), (36, 38, 7, 6), (19, 41, 7, 5), (31, 41, 7, 5)]:
        t.blob(*b)
    for p in [(13, 35), (22, 31), (29, 33), (37, 36), (25, 39), (17, 40)]:
        t.extra[p] = (255, 154, 176)
        t.extra[(p[0] + 1, p[1] + 1)] = (255, 214, 226)
    return t


def birch():
    """자작나무 — 흰 줄기에 검은 무늬, 가볍고 밝은 잎"""
    t = Tree('birch', 'birch')
    t.stem([(23, 46), (23, 30), (20, 20)], 3.5, 2), t.stem([(23, 33), (29, 24)], 2, 1.5), t.roots(23, 46, 2)
    for b in [(20, 14, 7, 6), (30, 18, 7, 6), (16, 22, 6, 5), (26, 24, 7, 5)]:
        t.blob(*b)
    for y in (44, 40, 37, 34):   # 검은 가로 무늬
        t.trunk.add((22 + (y % 2), y, 1))
    t.extra = {}
    t._marks = [(22, 43), (23, 39), (22, 36), (24, 33)]
    return t


def apple():
    """사과나무 — 둥근 머리에 빨간 열매"""
    t = Tree('spring')
    t.stem([(24, 46), (24, 34), (20, 28)], 4, 2), t.stem([(24, 36), (29, 29)], 2, 1.5), t.roots(24, 46)
    for b in [(17, 20, 8, 7), (30, 19, 8, 7), (24, 13, 8, 6), (22, 27, 10, 6), (33, 27, 6, 5)]:
        t.blob(*b)
    for p in [(15, 18), (27, 12), (33, 21), (21, 26), (30, 28), (14, 26)]:
        t.extra[p] = (214, 52, 52)
        t.extra[(p[0] + 1, p[1])] = (214, 52, 52)
        t.extra[(p[0], p[1] - 1)] = (255, 140, 120)
    return t


def sapling():
    """어린 나무 — 가는 줄기에 작은 덩어리 3개"""
    t = Tree('olive')
    t.stem([(24, 46), (24, 30)], 2, 1), t.roots(24, 46, 1)
    for b in [(22, 25, 5, 4), (28, 27, 5, 4), (24, 31, 5, 4)]:
        t.blob(*b)
    return t


TREES = [('oak', '참나무', oak), ('poplar', '포플러', poplar), ('pine', '전나무', pine), ('bush', '덤불', bush),
         ('birch', '자작나무', birch), ('apple', '사과나무', apple), ('sapling', '어린 나무', sapling)]


def birch_marks(im, t):
    """자작나무 무늬는 줄기 위에만 (잎에 덮이지 않은 곳)"""
    for x, y in getattr(t, '_marks', []):
        if im.getpixel((x, y))[:3] in BARK['birch']:
            im.putpixel((x, y), (40, 36, 34, 255))
            if im.getpixel((x + 1, y))[:3] in BARK['birch']:
                im.putpixel((x + 1, y), (40, 36, 34, 255))
    return im


if __name__ == '__main__':
    out = [('ref', '기준', Image.open(os.path.join(HERE, '..', 'tree-sway', 'tree.png')).convert('RGBA'))]
    for tid, name, f in TREES:
        t = f()
        im = birch_marks(t.render(), t)
        im.save(os.path.join(HERE, f'{tid}.png'))
        out.append((tid, name, im))
    z = 6
    font = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 22)
    grass = (35, 63, 46)   # 초원 땅 기본색 (biomes.js)
    cw = W * z + 16
    sheet = Image.new('RGB', (cw * len(out) + 16, H * z + 40 + H * 2 + 40), grass)
    d = ImageDraw.Draw(sheet)
    for k, (tid, name, im) in enumerate(out):
        x = 8 + k * cw
        b = im.resize((W * z, H * z), Image.NEAREST)
        sheet.paste(b, (x, 36), b)
        d.text((x + 8, 6), name, fill=(240, 232, 200), font=font)
        s = im.resize((W * 2, H * 2), Image.NEAREST)          # 게임 크기 (아트 1px = 화면 2px)
        sheet.paste(s, (x + (W * z - W * 2) // 2, H * z + 56), s)
    sheet.save(os.path.join(HERE, 'sheet.png'))
    print('ok', [t for t, _, _ in out])
