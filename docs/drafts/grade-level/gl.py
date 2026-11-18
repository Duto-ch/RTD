# 레벨 + 등급 표시 시안 (속성 표시 없음). 아트 1px = 게임 2px. 캐릭터 = 게임에 들어간 시트의 대기 첫 장
import math, os
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
CH = os.path.join(HERE, '../../../public/assets/custom/chars/')
FONT = '/tmp/claude-0/-home-user-rtd/5413c952-d8c2-5a72-ae63-36cb90a211c9/scratchpad/fonts/'
def hx(s): return tuple(int(s[i:i+2], 16) for i in (1, 3, 5))
OUT = hx('#2b1d2f'); WHITE = (255, 255, 255); EMPTY = hx('#4a4052')
# 등급색: 속성색(빨·파·초)과 겹치지 않게 — 커먼 동 · 언커먼 은 · 레어 보라 · 유니크 금  [진함, 기본, 밝음]
GR = {1: [hx('#6e4a2a'), hx('#b07a48'), hx('#e0b07a')], 2: [hx('#6a7280'), hx('#b8c0cc'), hx('#eef2f8')],
      3: [hx('#4a2a7a'), hx('#9a5ae0'), hx('#d6b4ff')], 4: [hx('#8a5a10'), hx('#f5c542'), hx('#fff2a0')]}
LV5 = hx('#ffe066')
DIG = {1: [".w.", "ww.", ".w.", ".w.", "www"], 2: ["ww.", "..w", ".w.", "w..", "www"], 3: ["ww.", "..w", ".w.", "..w", "ww."],
       4: ["w.w", "w.w", "www", "..w", "..w"], 5: ["www", "w..", "ww.", "..w", "ww."]}
def bitmap(d, x, y, rows, cmap):
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch in cmap: d.point((x + i, y + j), fill=cmap[ch])
def digit(d, x, y, lv, col=None):
    bitmap(d, x, y, DIG[lv], {'w': col or (LV5 if lv == 5 else WHITE)})

# ── A: 탑뷰 받침 — 발밑 타원 고리(등급색), 앞쪽 테두리에 레벨 점 5개 (고리 뒤쪽 반은 캐릭터 뒤) ──
def A(d, cx, cy, grade, lv, part):
    g = GR[grade]; rx, ry = 10, 4; ey = cy + 8
    for t in range(0, 360, 2):
        a = math.radians(t); x = cx + math.cos(a) * rx; y = ey + math.sin(a) * ry
        front = math.sin(a) > 0
        if (part == 'back') == front: continue
        d.rectangle([round(x), round(y), round(x), round(y) + 1], fill=g[1] if not front else g[2] if grade == 4 else g[1])
    if part == 'front':
        for k in range(5):
            x = cx - 6 + k * 3; y = ey + ry + 1
            d.rectangle([x - 1, y - 1, x + 1, y + 1], fill=OUT)
            d.point((x, y), fill=(LV5 if lv == 5 else WHITE) if k < lv else EMPTY)
# ── B: 등급 보석(모양도 등급마다 다름) + 레벨 5칸 바, 발밑 가운데 ──
GEM = {1: ["..o..", ".obo.", "obcbo", ".obo.", "..o.."][::1], 2: ["..o..", ".obo.", "obcbo", "obbbo", ".ooo."],
       3: [".ooo.", "obcbo", "obbbo", "obbbo", ".ooo."], 4: ["o.o.o", "obobo", "obcbo", "obbbo", "ooooo"]}
GEM[1] = [".ooo.", "obbbo", "obcbo", "obbbo", ".ooo."]   # 커먼 동그라미
GEM[2] = ["..o..", ".obo.", "obcbo", ".obo.", "..o.."]   # 언커먼 마름모
GEM[3] = [".ooo.", "obcbo", "obbbo", ".obo.", "..o.."]   # 레어 방패꼴
def B(d, cx, cy, grade, lv, part):
    if part != 'front': return
    g = GR[grade]; x = cx - 11; y = cy + 6
    bitmap(d, x, y, GEM[grade], {'o': OUT, 'b': g[1], 'c': g[2]})
    bx = x + 7; d.rectangle([bx, y + 1, bx + 15, y + 4], fill=OUT)
    for k in range(5):
        sx = bx + 1 + k * 3
        d.rectangle([sx, y + 2, sx + 1, y + 3], fill=(LV5 if lv == 5 else WHITE) if k < lv else EMPTY)
# ── C: 등급색 방패 엠블럼 + 레벨 숫자 (오른쪽 아래) ──
def C(d, cx, cy, grade, lv, part):
    if part != 'front': return
    g = GR[grade]; x = cx + 3; y = cy + 2
    sh = ["ooooooooo", "ollllllo.", "olbbbbbbo", "olbbbbbbo", "olbbbbbbo", "olbbbbbbo", ".obbbbbo.", "..obbbo..", "...ooo..."]
    sh = ["ooooooooo", "olllllllo", "olbbbbbbo", "olbbbbbbo", "olbbbbbbo", "olbbbbbbo", ".obbbbbo.", "..obbbo..", "...ooo..."]
    bitmap(d, x, y, sh, {'o': OUT, 'l': g[2], 'b': g[0]})
    digit(d, x + 3, y + 2, lv)
# ── D: 등급색 리본 + 계급장(∧) 개수 = 레벨, 발밑 가운데 ──
def D(d, cx, cy, grade, lv, part):
    if part != 'front': return
    g = GR[grade]; y = cy + 8
    d.rectangle([cx - 9, y, cx + 9, y + 4], fill=OUT); d.rectangle([cx - 8, y + 1, cx + 8, y + 3], fill=g[1])
    d.line([cx - 8, y + 1, cx + 8, y + 1], fill=g[2])
    for side in (-1, 1):   # 리본 꼬리
        ex = cx + side * 10
        d.polygon([(ex, y), (ex + side * 2, y), (ex + side * 1, y + 2), (ex + side * 2, y + 4), (ex, y + 4)], fill=g[0])
    col = OUT if lv < 5 else WHITE     # 계급장은 진한 색 (Lv5 는 흰색으로 빛남)
    w = lv * 4 - 1; sx = cx - w // 2
    for k in range(lv):     # 작은 ∧ 계급장
        x = sx + k * 4
        d.point((x, y + 3), fill=col); d.point((x + 1, y + 2), fill=col); d.point((x + 2, y + 3), fill=col)
VARS = [('A', '탑뷰 받침 고리(등급색) + 레벨 점 5개', A), ('B', '등급 보석(모양·색) + 레벨 5칸 바', B),
        ('C', '등급색 방패 + 레벨 숫자 (오른쪽 아래)', C), ('D', '등급색 리본 + 계급장 개수 = 레벨', D)]
CHARS = [('bran', 1, 1), ('agnes', 2, 3), ('asta', 3, 4), ('arthur', 4, 5)]   # (id, 등급, 레벨)
def tile_bg(w, h, ox, oy, T=24):
    bg = Image.new('RGBA', (w, h)); dd = ImageDraw.Draw(bg)
    for ty in range(-1, h // T + 2):
        for tx in range(-1, w // T + 2):
            x = ox + tx * T; y = oy + ty * T
            dd.rectangle([x, y, x + T - 1, y + T - 1], fill='#696e7a' if (tx + ty) % 2 else '#adafb7')
            dd.line([x, y, x + T, y], fill='#454953'); dd.line([x, y, x, y + T], fill='#454953')
    return bg
def scene(fn):
    W, H = 4 * 24, 46; img = tile_bg(W, H, 0, 9); d = ImageDraw.Draw(img)
    for i, (cid, gr, lv) in enumerate(CHARS):
        cx = i * 24 + 12; cy = 21
        fn(d, cx, cy, gr, lv, 'back')
        fr = Image.open(CH + cid + '.png').convert('RGBA').crop((0, 0, 56, 40))
        x0 = cx - 27
        if x0 < 0: fr = fr.crop((-x0, 0, 56, 40)); x0 = 0
        img.alpha_composite(fr, (x0, cy - 23 + 0) if cy - 23 >= 0 else (x0, 0)) if cy - 23 >= 0 else img.alpha_composite(fr.crop((0, 23 - cy, fr.width, 40)), (x0, 0))
        fn(d, cx, cy, gr, lv, 'front')
    return img
if __name__ == '__main__':
    font = ImageFont.truetype(FONT + 'merged_sunflower_700.ttf', 24); small = ImageFont.truetype(FONT + 'merged_sunflower_500.ttf', 17)
    rows = [(k, t, scene(f)) for k, t, f in VARS]
    Z, G = 4, 2; sw = 96 * Z
    W = 40 + sw + 40 + 96 * G + 40; H = 100 + sum(r[2].size[1] * Z + 70 for r in rows)
    sh = Image.new('RGBA', (W, H), '#f3eedf'); d = ImageDraw.Draw(sh)
    d.text((40, 14), '크게 보기 (×4)', fill='#4a3a28', font=font); d.text((40 + sw + 40, 14), '게임 크기 (2px)', fill='#4a3a28', font=font)
    d.text((40, 46), '왼쪽부터 커먼 Lv1 · 언커먼 Lv3 · 레어 Lv4 · 유니크 Lv5   (등급색: 동 · 은 · 보라 · 금)', fill='#7d6c57', font=small)
    y = 90
    for k, t, img in rows:
        d.text((40, y), f'{k}  {t}', fill='#4a3a28', font=small); y += 30
        sh.paste(img.resize((img.size[0] * Z, img.size[1] * Z), Image.NEAREST), (40, y))
        sh.paste(img.resize((img.size[0] * G, img.size[1] * G), Image.NEAREST), (40 + sw + 40, y))
        y += img.size[1] * Z + 40
    sh.save(os.path.join(HERE, 'grade-level-drafts.png')); print(sh.size)
