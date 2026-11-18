# 자연물 오브젝트 시안 — 필드 배경과 같은 도트 1px = 화면 2px, 플랫 2~3톤 + 계열 외곽선 + 바닥 그림자 (빛은 왼쪽 위)
import math, os, random
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
def hx(s): return tuple(int(s[i:i+2], 16) for i in (1, 3, 5)) + (255,)
SHADOW = (0, 0, 0, 70)
def blob(cx, cy, rx, ry, wob=0.0, seed=0, lobes=5):
    rnd = random.Random(seed); ph = [rnd.uniform(0, 6.28) for _ in range(3)]
    def inside(x, y):
        dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
        a = math.atan2(dy, dx)
        r = 1 + wob * (math.sin(lobes * a + ph[0]) * 0.6 + math.sin((lobes + 2) * a + ph[1]) * 0.4)
        return dx * dx + dy * dy <= r * r
    return inside
def paint(img, inside, ramp, outline, cx, cy, rx, ry, light=(-0.45, -0.55)):
    """ramp: [그늘, 기본, 밝음, (하이라이트)] — 왼쪽 위가 밝다. 외곽선은 계열 진한 색"""
    W, H = img.size; p = img.load()
    for y in range(H):
        for x in range(W):
            if not inside(x, y): continue
            edge = any(not inside(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if edge: p[x, y] = outline; continue
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            t = dx * light[0] + dy * light[1]
            c = ramp[0] if t < -0.25 else ramp[1] if t < 0.35 else ramp[2]
            if len(ramp) > 3 and t > 0.7: c = ramp[3]
            p[x, y] = c
def shadow(img, cx, cy, rx, ry):
    ImageDraw.Draw(img).ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=SHADOW)
LEAF = [hx('#2f6a34'), hx('#43914a'), hx('#62b55a'), hx('#8ad06a')]
LEAF_O = hx('#1d3f22')
BARK = [hx('#5a3a22'), hx('#7a5032'), hx('#9a6a44')]; BARK_O = hx('#3a2414')
PINE = [hx('#24523a'), hx('#2f6e4a'), hx('#43905c')]; PINE_O = hx('#16301f')
STONE = [hx('#6e7380'), hx('#8f95a2'), hx('#b4bac6'), hx('#d4d9e2')]; STONE_O = hx('#40444e')

def tree_round(seed=1):
    img = Image.new('RGBA', (28, 34)); d = ImageDraw.Draw(img)
    shadow(img, 15, 30, 10, 3)
    d.rectangle([12, 20, 15, 30], fill=BARK_O); d.rectangle([13, 20, 14, 29], fill=BARK[1]); d.point((13, 21), fill=BARK[2])
    paint(img, blob(14, 13, 12, 11, 0.12, seed), LEAF, LEAF_O, 14, 13, 12, 11)
    for (x, y) in [(9, 9), (17, 7), (12, 14)]: d.point((x, y), fill=LEAF[3])
    return img
def tree_fruit():
    img = tree_round(4); d = ImageDraw.Draw(img)
    for (x, y) in [(8, 13), (18, 10), (15, 17), (11, 8), (20, 15)]:
        d.rectangle([x, y, x + 1, y + 1], fill=hx('#d8434a')); d.point((x, y), fill=hx('#ff9a8a'))
    return img
def tree_pine():
    img = Image.new('RGBA', (24, 36)); d = ImageDraw.Draw(img)
    shadow(img, 12, 32, 8, 3)
    d.rectangle([11, 26, 13, 32], fill=BARK_O); d.rectangle([11, 26, 12, 31], fill=BARK[1])
    for k, (top, w, h) in enumerate([(2, 5, 9), (8, 8, 10), (14, 10, 12)]):
        cx = 12
        inside = lambda x, y, top=top, w=w, h=h: top <= y < top + h and abs(x + 0.5 - cx) <= w * (y - top + 1) / h
        paint(img, inside, PINE, PINE_O, cx, top + h / 2, w, h / 2)
    d.point((10, 6), fill=hx('#6ab07a')); d.point((9, 13), fill=hx('#6ab07a')); d.point((8, 20), fill=hx('#6ab07a'))
    return img
def bush():
    img = Image.new('RGBA', (22, 16))
    shadow(img, 11, 13, 9, 2)
    paint(img, blob(11, 8, 10, 6, 0.15, 7, 6), LEAF, LEAF_O, 11, 8, 10, 6)
    return img
def bush_berry():
    img = bush(); d = ImageDraw.Draw(img)
    for (x, y) in [(6, 7), (12, 5), (15, 9), (9, 10)]: d.point((x, y), fill=hx('#4a7ae0')); d.point((x + 1, y), fill=hx('#9fd4ff'))
    return img
def flowers(col, light, seed):
    img = Image.new('RGBA', (16, 12)); d = ImageDraw.Draw(img); rnd = random.Random(seed)
    for _ in range(5):   # 잎
        x, y = rnd.randint(2, 12), rnd.randint(5, 10)
        d.point((x, y), fill=LEAF[1]); d.point((x + 1, y - 1), fill=LEAF[2]); d.point((x, y + 1), fill=LEAF_O)
    for (x, y) in [(3, 4), (8, 2), (12, 5), (6, 7), (10, 8)][:4 + seed % 2]:
        d.point((x, y + 1), fill=hx('#1d3f22'))
        for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)): d.point((x + dx, y + dy), fill=col)
        d.point((x, y), fill=hx('#ffe066')); d.point((x - 1, y - 1), fill=light)
    return img
def rock_big():
    img = Image.new('RGBA', (22, 16))
    shadow(img, 12, 13, 9, 2)
    paint(img, blob(11, 8, 9, 6, 0.08, 3, 4), STONE, STONE_O, 11, 8, 9, 6)
    d = ImageDraw.Draw(img); d.line([12, 5, 14, 8], fill=STONE[0]); d.point((7, 9), fill=STONE[0])
    return img
def rocks_small():
    img = Image.new('RGBA', (18, 10))
    for i, (cx, cy, rx, ry) in enumerate([(5, 6, 4, 3), (12, 5, 4, 3), (9, 8, 3, 2)]):
        shadow(img, cx + 1, cy + ry, rx, 1)
        paint(img, blob(cx, cy, rx, ry, 0.1, i + 10, 4), STONE, STONE_O, cx, cy, rx, ry)
    return img
def rock_moss():
    img = rock_big(); p = img.load()
    for y in range(2, 8):
        for x in range(3, 18):
            if p[x, y][3] == 255 and p[x, y][:3] != STONE_O[:3] and (x + y) % 3 != 0 and y < 6: p[x, y] = LEAF[1] if (x * 7 + y) % 4 else LEAF[2]
    return img
def stump():
    img = Image.new('RGBA', (16, 14)); d = ImageDraw.Draw(img)
    shadow(img, 8, 11, 7, 2)
    d.rectangle([2, 4, 13, 11], fill=BARK_O); d.rectangle([3, 5, 12, 10], fill=BARK[1]); d.rectangle([3, 5, 5, 10], fill=BARK[2]); d.rectangle([10, 5, 12, 10], fill=BARK[0])
    d.ellipse([2, 1, 13, 7], fill=BARK_O); d.ellipse([3, 2, 12, 6], fill=hx('#d2a46a')); d.ellipse([5, 3, 10, 5], outline=hx('#a87a48'))
    return img
def log():
    img = Image.new('RGBA', (24, 12)); d = ImageDraw.Draw(img)
    shadow(img, 12, 10, 10, 2)
    d.rectangle([3, 2, 21, 9], fill=BARK_O); d.rectangle([4, 3, 20, 8], fill=BARK[1]); d.line([4, 3, 20, 3], fill=BARK[2]); d.line([4, 8, 20, 8], fill=BARK[0])
    d.ellipse([18, 2, 23, 9], fill=BARK_O); d.ellipse([19, 3, 22, 8], fill=hx('#d2a46a')); d.point((20, 5), fill=hx('#a87a48'))
    d.point((9, 5), fill=BARK[0]); d.point((14, 6), fill=BARK[0])
    return img
def mushrooms():
    img = Image.new('RGBA', (14, 12)); d = ImageDraw.Draw(img)
    for (cx, cy, r) in [(4, 6, 3), (10, 7, 2)]:
        shadow(img, cx, cy + r + 2, r, 1)
        d.rectangle([cx - 1, cy, cx, cy + r + 1], fill=hx('#f0e2c8')); d.point((cx - 1, cy + r + 1), fill=hx('#b8a080'))
        d.pieslice([cx - r - 1, cy - r - 1, cx + r, cy + r], 180, 360, fill=hx('#8a1f1f')); d.pieslice([cx - r, cy - r, cx + r - 1, cy + r - 1], 180, 360, fill=hx('#d8434a'))
        d.point((cx - 1, cy - r + 1), fill=hx('#ffffff')); d.point((cx + 1, cy - 1), fill=hx('#ffffff'))
    return img
def reeds():
    img = Image.new('RGBA', (14, 16)); d = ImageDraw.Draw(img)
    for i, x in enumerate([3, 6, 8, 11]):
        top = 3 + (i * 3) % 5
        d.line([x, 14, x + (i % 2), top], fill=LEAF[1]); d.point((x + (i % 2), top), fill=LEAF[3])
    d.rectangle([5, 4, 6, 7], fill=hx('#7a5032')); d.rectangle([10, 5, 11, 8], fill=hx('#7a5032'))
    return img
OBJS = [('둥근 나무', tree_round()), ('열매 나무', tree_fruit()), ('소나무', tree_pine()), ('덤불', bush()), ('열매 덤불', bush_berry()),
        ('꽃 (노랑)', flowers(hx('#ffd23a'), hx('#fff6b0'), 1)), ('꽃 (분홍)', flowers(hx('#ff8ab0'), hx('#ffd0e0'), 2)), ('꽃 (흰)', flowers(hx('#f4f4f4'), hx('#ffffff'), 3)),
        ('큰 바위', rock_big()), ('이끼 바위', rock_moss()), ('돌무더기', rocks_small()), ('그루터기', stump()), ('통나무', log()), ('버섯', mushrooms()), ('부들', reeds())]
if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'sprites'), exist_ok=True)
    for i, (n, im) in enumerate(OBJS): im.save(os.path.join(HERE, 'sprites', f'{i:02d}.png'))
    F = '/tmp/claude-0/-home-user-rtd/5413c952-d8c2-5a72-ae63-36cb90a211c9/scratchpad/fonts/'
    font = ImageFont.truetype(F + 'merged_sunflower_500.ttf', 15); big = ImageFont.truetype(F + 'merged_sunflower_700.ttf', 22)
    # ① 하나씩 크게 (×5)
    Z = 5; cols = 5; cw, ch = 40, 42
    sheet = Image.new('RGBA', (cols * cw * Z, 3 * (ch * Z + 26) + 50), '#f3eedf'); d = ImageDraw.Draw(sheet)
    d.text((10, 10), '자연물 오브젝트 15종 (×5 확대) — 도트 1px = 게임 화면 2px', fill='#4a3a28', font=big)
    for i, (n, im) in enumerate(OBJS):
        cx, cy = (i % cols) * cw * Z, 50 + (i // cols) * (ch * Z + 26)
        cell = Image.new('RGBA', (cw, ch), hx('#2b4b37')); cell.alpha_composite(im, ((cw - im.width) // 2, ch - im.height - 3))
        sheet.paste(cell.resize((cw * Z - 8, ch * Z - 8), Image.NEAREST), (cx + 4, cy))
        d.text((cx + 8, cy + ch * Z - 4), n, fill='#4a3a28', font=font)
    sheet.save(os.path.join(HERE, 'nature-objects.png'))
    # ② 초원 땅 위에 배치한 장면 (×2 = 게임 크기)
    W, H = 180, 110; bg = Image.new('RGBA', (W, H), hx('#233f2e')); rnd = random.Random(9); p = bg.load()
    for y in range(H):
        for x in range(W):
            v = math.sin(x * 0.07 + y * 0.05) + math.sin(x * 0.03 - y * 0.09)
            p[x, y] = hx('#1d3628') if v < -0.8 else hx('#2b4b37') if v > 0.9 else hx('#233f2e')
    ImageDraw.Draw(bg).rectangle([0, 80, W, 110], fill=hx('#b38d5c'))
    place = [(2, 20, 52), (0, 5, 48), (3, 40, 62), (5, 60, 66), (8, 78, 60), (6, 95, 70), (12, 112, 66), (1, 130, 54), (9, 150, 64), (13, 30, 74), (14, 165, 72), (10, 120, 76), (7, 70, 76), (11, 150, 90), (4, 88, 46)]
    for idx, x, yb in sorted(place, key=lambda t: t[2]):
        im = OBJS[idx][1]; bg.alpha_composite(im, (x - im.width // 2 + 10, yb - im.height))
    scene = Image.new('RGBA', (W * 4, H * 4 + 40), '#f3eedf'); scene.paste(bg.resize((W * 4, H * 4), Image.NEAREST), (0, 40))
    ImageDraw.Draw(scene).text((10, 8), '초원 땅 위에 배치 (×4, 아래 띠는 흙길)', fill='#4a3a28', font=big)
    scene.save(os.path.join(HERE, 'nature-scene.png'))
    print('ok')
