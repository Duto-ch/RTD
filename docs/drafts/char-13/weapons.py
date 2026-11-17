"""무기 분리 레이어 시안 (2026-11-17, v2 데포르메 — 이전 판은 weapons-v1.gif · weapons-parts-v1.png)
몸(무기 없는 13x13 캐릭터)과 무기 그림을 따로 두고, 무기를 손 위치(쥐는 점)에 얹어 돌리거나 옮겨 애니메이션을 만든다.
회전은 픽셀이 깨지지 않게 RotSprite 방식(8배 확대 → 회전 → 다시 축소)으로 미리 굽는다.
실행: python3 docs/drafts/char-13/weapons.py  →  weapons.gif · weapons-frames.png
"""
import os, sys, math
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import draw as D

OUT = os.path.dirname(os.path.abspath(__file__))
PAL = {**D.COMMON, 'M': '#a9b8cc', 'N': '#8a97ad', 'g': '#c98f2a', 'r': '#d8501e'}

# 무기 그림 + 쥐는 점(pivot) — 위쪽이 날·끝
WEAPONS = {  # v2 (2026-11-17): 데포르메 — 날·머리·구슬을 크게, 손잡이는 짧게
    'sword': ([
        "....O....",
        "...OLO...",
        "..OLLMO..",
        "..OLLMO..",
        "..OLLMO..",
        "..OLLMO..",
        "..OLLMO..",
        "..OLLMO..",
        "..OLLMO..",
        "..OLLMO..",
        "OOGGGGGOO",
        "OGGgGgGGO",
        "OOOOtOOOO",
        "...OtO...",
        "..OGGGO..",
        "...OOO..."], (4, 13)),
    'axe': ([
        ".......OOO.",
        ".OLLMO.OTO.",
        "OLLLMMOOTO.",
        "OLLMMMGOTO.",
        "OLLMMMGOTO.",
        "OLLLMMOOTO.",
        ".OLLMO.OTO.",
        "..OOO..OTO.",
        ".......OTO.",
        ".......OTO.",
        ".......OTO.",
        ".......OTO.",
        ".......OTO.",
        ".......OGO.",
        ".......OOO."], (8, 11)),
    'spear': ([
        "...O...",
        "..OLO..",
        ".OLLMO.",
        "OLLLMMO",
        "OLLLMMO",
        ".OLLMO.",
        "..OLO..",
        ".OGGGO.",
        "..OTO..",
        "..OTO..",
        "..OTO..",
        "..OTO..",
        "..OTO..",
        "..OTO..",
        "..OTO..",
        "..OTO..",
        "..OGO..",
        "..OOO.."], (3, 13)),
    'staff': ([
        "...OOO...",
        "..OFFFO..",
        ".OFYYFFO.",
        ".OFYWFFO.",
        ".OFFFFrO.",
        "..OrrrO..",
        ".OGO.OGO.",
        "..OGGGO..",
        "...OTO...",
        "...OTO...",
        "...OTO...",
        "...OTO...",
        "...OTO...",
        "...OTO...",
        "...OTO...",
        "...OOO..."], (4, 12)),
    'bow': ([
        "...OO..",
        "..OGO..",
        ".OTO...",
        "OTtO...",
        "OTtO...",
        "OTtO...",
        "OTtO...",
        "OTtO...",
        "OTtO...",
        "OTtO...",
        "OTtO...",
        "OTtO...",
        "OTtO...",
        ".OTO...",
        "..OGO..",
        "...OO.."], (1, 8)),
}
ARROW = [".OO.....OO", "OLLOOOOOGO", "OLLTTTTTGO", "OLLOOOOOGO", ".OO.....OO"]  # 왼쪽이 화살촉 쪽 (아래에서 뒤집음)


def paint(rows, pal):
    h, w = len(rows), max(len(r) for r in rows)
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, k in enumerate(r):
            if k not in '. ':
                c = pal[k].lstrip('#')
                img.putpixel((x, y), tuple(int(c[i:i + 2], 16) for i in (0, 2, 4)) + (255,))
    return img


def rot(img, pivot, deg, k=8):
    """RotSprite 근사: k배로 키워 쥐는 점 기준으로 돌린 뒤 다시 줄인다 (시계 방향 +)"""
    w, h = img.size
    pad = max(w, h) * 2
    big = Image.new('RGBA', (pad * 2 * k, pad * 2 * k), (0, 0, 0, 0))
    big.paste(img.resize((w * k, h * k), Image.NEAREST), ((pad - pivot[0]) * k, (pad - pivot[1]) * k))
    big = big.rotate(-deg, resample=Image.NEAREST, center=(pad * k + k // 2, pad * k + k // 2))
    small = big.resize((pad * 2, pad * 2), Image.NEAREST)
    return small, (pad, pad)  # 새 그림과 그 안의 쥐는 점


def body(char_id, strip_x, keep_top=0):
    """무기를 지운 몸 (strip_x: 지울 열 범위)"""
    ch = next(c for c in D.CHARS if c['id'] == char_id)
    img = D.build(ch)
    a, b = strip_x
    for y in range(24):
        for x in range(a, b):
            if not (5 <= x <= 17 and y >= 11) and not (y < keep_top):
                img.putpixel((x, y), (0, 0, 0, 0))
    # 무기 자리 손: 몸 바깥 칸은 지운다
    return img


def place(canvas, wimg, wpivot, at):
    canvas.alpha_composite(wimg, (at[0] - wpivot[0], at[1] - wpivot[1]))


W, H = 42, 30
OX, OY = 9, 5  # 24x24 캐릭터를 놓는 위치


def frame(body_img, weapon=None, deg=0, hand=(15, 20), dy=0, front=True, extra=None):
    c = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    wl = None
    if weapon:
        img, pv = paint(WEAPONS[weapon][0], PAL), WEAPONS[weapon][1]
        wl = rot(img, pv, deg) if deg else (img, pv)
    if wl and not front:
        place(c, wl[0], wl[1], (OX + hand[0], OY + hand[1] + dy))
    c.alpha_composite(body_img, (OX, OY + dy))
    if wl and front:
        place(c, wl[0], wl[1], (OX + hand[0], OY + hand[1] + dy))
    if extra:
        extra(c)
    return c


def sword_anim(b):
    seq = [(0, 0), (0, 0), (0, 1), (0, 1), (-35, 0), (-60, 0), (-60, 0), (20, 0), (75, 0), (100, 0), (100, 0), (60, 0), (20, 0), (0, 0)]
    return [frame(b, 'sword', d, (19, 20), dy) for d, dy in seq]


def staff_anim(b):
    out = []
    for i, (d, lift) in enumerate([(0, 0), (0, 0), (0, 1), (0, 1), (-10, -1), (-20, -2), (-20, -2), (-20, -2), (-10, -1), (0, 0), (0, 0), (0, 0), (0, 0), (0, 0)]):
        glow = None
        if 5 <= i <= 7:
            r = [4, 6, 8][i - 5]
            def glow(c, r=r, lift=lift):
                g = ImageDraw.Draw(c)
                cx, cy = OX + 19, OY + 22 + lift - 9
                g.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 154, 60, 255))
        out.append(frame(b, 'staff', d, (19, 22 + lift), 0, True, glow))
    return out


def bow_anim(b):
    out = []
    arrow = paint(ARROW, PAL)  # 화살촉이 왼쪽
    for i in range(14):
        def extra(c, i=i):
            g = ImageDraw.Draw(c)
            bx, by = OX + 1, OY + 18  # 활 쥐는 점
            top, bot = (bx + 3, by - 7), (bx + 3, by + 6)
            pull = [0, 0, 0, 0, 1, 3, 5, 5, 5, 0, 0, 0, 0, 0][i]
            mid = (bx + 3 + pull, by)
            col = (238, 246, 255, 255)
            g.line([top, mid], fill=col); g.line([mid, bot], fill=col)
            if 3 <= i <= 8:
                c.alpha_composite(arrow, (mid[0] - 9, by - 2))
            elif 9 <= i <= 12:
                c.alpha_composite(arrow, (mid[0] - 9 - (i - 8) * 4, by - 2))
        out.append(frame(b, 'bow', 0, (1, 18), 0, True, extra))
    return out


def swap_anim(b):
    out = []
    for wpn, deg in [('sword', 0), ('axe', 0), ('spear', 0)]:
        for d in [0, 0, -40, 60, 0]:
            out.append(frame(b, wpn, d if wpn != 'spear' else d // 2, (19, 20)))
    return out[:14] + out[14:15]


FONT = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 18)

if __name__ == '__main__':
    kaira = body('red_sword', (17, 24))
    verona = body('red_mage', (17, 24), 13)
    elin = body('green_archer', (0, 5))
    adel = body('blue_knight', (0, 5))
    rows = [
        ('검 휘두르기 (회전)', sword_anim(kaira)),
        ('지팡이 들어 올리기 (이동+회전)', staff_anim(verona)),
        ('활 시위 당기기 (줄·화살 따로)', bow_anim(elin)),
        ('같은 몸에 무기 바꿔 끼우기', swap_anim(adel)),
    ]
    n = min(len(f) for _, f in rows)
    Z = 8
    pw, ph = W * Z, H * Z + 34
    gif = []
    for i in range(n):
        im = Image.new('RGB', (pw * len(rows), ph), '#f6f1e4')
        d = ImageDraw.Draw(im)
        for j, (title, fr) in enumerate(rows):
            im.paste(fr[i].resize((W * Z, H * Z), Image.NEAREST), (j * pw, 34), fr[i].resize((W * Z, H * Z), Image.NEAREST))
            d.text((j * pw + 12, 8), title, font=FONT, fill='#3a2a1a')
        gif.append(im)
    gif[0].save(os.path.join(OUT, 'weapons.gif'), save_all=True, append_images=gif[1:], duration=90, loop=0, disposal=2)
    # 프레임 펼친 그림 (검)
    strip = Image.new('RGB', (W * 4 * n, H * 4), '#f6f1e4')
    for i, f in enumerate(rows[0][1][:n]):
        strip.paste(f.resize((W * 4, H * 4), Image.NEAREST), (i * W * 4, 0), f.resize((W * 4, H * 4), Image.NEAREST))
    strip.save(os.path.join(OUT, 'weapons-frames.png'))
    # 무기 원본
    parts = Image.new('RGB', (len(WEAPONS) * 13 * 8, 20 * 8), '#f6f1e4')
    for i, (k, (r, pv)) in enumerate(WEAPONS.items()):
        p = paint(r, PAL)
        parts.paste(p.resize((p.width * 8, p.height * 8), Image.NEAREST), (i * 104 + 8, 8), p.resize((p.width * 8, p.height * 8), Image.NEAREST))
        dd = ImageDraw.Draw(parts)
        dd.rectangle([i * 104 + 8 + pv[0] * 8, 8 + pv[1] * 8, i * 104 + 15 + pv[0] * 8, 15 + pv[1] * 8], outline='#d02020', width=2)
    parts.save(os.path.join(OUT, 'weapons-parts.png'))
    print('ok', n)
