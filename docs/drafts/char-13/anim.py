"""대기 + 역동적인 공격 애니메이션 시안 (2026-11-17, v3)
- 프레임마다 길이가 다르다(ms): 예비 동작은 길게 · 휘두르기는 아주 짧게 · 타격 순간은 멈춘 듯 길게 · 회복은 보통
- 몸 변형: 머리(0~17줄)를 몸(18~23줄)에 대해 1px 옮겨 기울기·찌그러짐(squash)·늘어남(stretch)
- 잔상(smear): 휘두르는 사이 각도에 무기 실루엣을 밝은 색으로 겹쳐 그림 · 타격 섬광 · 활시위 떨림
- 대기: 숨쉬기(머리 1px 내려앉음) · 눈 깜빡임 · 무기가 반 박자 늦게 따라 흔들림 · 마법사 모자 끝 흔들림
실행: python3 docs/drafts/char-13/anim.py  →  anim.gif · anim.json(페이지용)
"""
import os, sys, math, json, io, base64
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import weapons as Wp
import draw as D

OUT = os.path.dirname(os.path.abspath(__file__))
W, H = 56, 32
OX, OY = 16, 6  # 가운데 — 뒤집어도 같은 자리
SMEAR = (255, 244, 214, 255)
SMEAR2 = (255, 210, 122, 255)


def rgba(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def blink(img, pal):
    """눈 감기: 눈 윗줄은 피부색, 아랫줄은 감은 눈 선. 사용자 그림은 img.info['eyes'] 의 눈 위치를 쓴다"""
    im = img.copy()
    im.info = dict(img.info)
    eyes = img.info.get('eyes') or [(x, 15) for x in (8, 9, 13, 14)]
    for x, y in eyes:
        im.putpixel((x, y), rgba(pal.get('S', '#ffe2c8')))
        im.putpixel((x, y + 1), rgba('#2b1d2f'))
    return im


def pose(img, head_dx=0, head_dy=0, hat_dx=0, hat_rows=0):
    """머리(0~split-1줄)를 몸에 대해 옮긴다 (split 기본 18, 사용자 그림은 img.info['split']).
    hat_rows: 위에서 몇 줄을 모자 끝으로 보고 더 흔들지"""
    sp = img.info.get('split', 18)
    out = Image.new('RGBA', img.size, (0, 0, 0, 0))
    out.info = dict(img.info)
    bottom = img.crop((0, sp, 24, 24))
    top = img.crop((0, 0, 24, sp))
    out.alpha_composite(bottom, (0, sp))
    if head_dy < 0:  # 늘어남: 비는 목 줄을 몸 첫 줄로 채움
        out.alpha_composite(img.crop((0, sp, 24, sp + 1)), (0, sp - 1))
    if hat_rows and hat_dx:
        tip = top.crop((0, 0, 24, hat_rows))
        rest = top.crop((0, hat_rows, 24, sp))
        top = Image.new('RGBA', (24, sp), (0, 0, 0, 0))
        top.alpha_composite(rest, (0, hat_rows))
        top.alpha_composite(tip, (hat_dx, 0))
    out.alpha_composite(top, (head_dx, head_dy))
    return out




# ---------- 각도마다 새로 찍는 무기 (창·지팡이·활) ----------
# 그림을 돌리면 작은 도트가 뭉개지므로, 무기 축(쥐는 점 → 끝)을 따라 각도마다 픽셀을 새로 찍고
# 마지막에 바깥 4방향 외곽선을 두른다. 각도는 시계 방향 +, 0 = 위.
GEO_LEN = {'spear': 14, 'staff': 9, 'bow': 0}
OUTLINE = '#2b1d2f'


def _line(x0, y0, x1, y1):
    pts, dx, dy = [], abs(x1 - x0), -abs(y1 - y0)
    sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
    err = dx + dy
    while True:
        pts.append((x0, y0))
        if x0 == x1 and y0 == y1:
            return pts
        e2 = 2 * err
        if e2 >= dy:
            err += dy; x0 += sx
        if e2 <= dx:
            err += dx; y0 += sy


def _render(filled, silhouette=None):
    """filled {(x,y): 색} (쥐는 점 = (0,0)) → (그림, 쥐는 점)"""
    border = set()
    for (x, y) in filled:
        for q in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if q not in filled:
                border.add(q)
    xs = [x for x, _ in list(filled) + list(border)]
    ys = [y for _, y in list(filled) + list(border)]
    x0, y0 = min(xs), min(ys)
    img = Image.new('RGBA', (max(xs) - x0 + 1, max(ys) - y0 + 1), (0, 0, 0, 0))
    for (x, y), col in filled.items():
        img.putpixel((x - x0, y - y0), silhouette or rgba(col))
    for (x, y) in border:
        img.putpixel((x - x0, y - y0), silhouette or rgba(OUTLINE))
    return img, (-x0, -y0)


def geo_weapon(name, deg, silhouette=None):
    a = math.radians(deg)
    u = (math.sin(a), -math.cos(a))   # 끝 방향
    n = (math.cos(a), math.sin(a))    # 오른쪽(시계 방향 90°)
    P = lambda t, k=0: (round(u[0] * t + n[0] * k), round(u[1] * t + n[1] * k))
    f = {}
    def diamond(c, r, pick):
        for dx in range(-r, r + 1):
            for dy in range(-r, r + 1):
                if abs(dx) + abs(dy) <= r:
                    q = (c[0] + dx, c[1] + dy)
                    f[q] = pick(q)
    side = lambda q: q[0] * n[0] + q[1] * n[1]  # 축 기준 오른쪽(+)/왼쪽(-)
    if name == 'spear':
        for q in _line(*P(-4), *P(8)):
            f[q] = Wp.PAL['T']
        f[P(-4)] = Wp.PAL['G']
        diamond(P(8), 1, lambda q: Wp.PAL['G'])
        for t, r in zip(range(9, 15), [1, 1, 2, 1, 1, 0]):  # 잎사귀 창날
            diamond(P(t), r, lambda q: Wp.PAL['L'] if side(q) < 0.5 else Wp.PAL['M'])
    elif name == 'staff':
        for q in _line(*P(-3), *P(6)):
            f[q] = Wp.PAL['T']
        f[P(-3)] = Wp.PAL['G']
        f[P(6)] = Wp.PAL['G']
        for k in (-1, 1):  # 구슬을 받치는 금색 갈퀴
            f[P(6.6, k * 1.4)] = Wp.PAL['G']
        c = (u[0] * 9, u[1] * 9)
        for x in range(round(c[0]) - 3, round(c[0]) + 4):
            for y in range(round(c[1]) - 3, round(c[1]) + 4):
                dx, dy = x - c[0], y - c[1]
                if dx * dx + dy * dy <= 6.6:
                    lit = dx * -0.7 + dy * -0.7  # 왼쪽 위가 밝음
                    f[(x, y)] = Wp.PAL['Y'] if lit > 0.9 else (Wp.PAL['r'] if lit < -0.9 else Wp.PAL['F'])
        f[(round(c[0] - 1), round(c[1] - 1))] = '#ffffff'
    elif name == 'bow':
        HALF, BULGE = 7, 3
        for i in range(-HALF * 4, HALF * 4 + 1):  # 활대: 바깥(왼쪽)으로 볼록한 곡선, 2톤 두께
            sv = i / 4
            k = -BULGE * (1 - (sv / HALF) ** 2) + BULGE
            f[P(sv, k - BULGE)] = Wp.PAL['T']
            q = P(sv, k - BULGE + 1)
            if abs(sv) < HALF - 1 and q not in f:
                f[q] = Wp.PAL['t']
        for sv in (-HALF, HALF):
            f[P(sv, 0)] = Wp.PAL['G']
    return _render(f, silhouette)


def bow_tips(deg, x, y):
    """시위가 걸리는 활 양 끝 (쥐는 점 = 활대 가운데)"""
    return rot_pt(3, -7, deg, x, y), rot_pt(3, 7, deg, x, y)


def weapon_img(name, deg, silhouette=None):
    if name in GEO_LEN:
        return geo_weapon(name, deg, silhouette)
    rows, pv = Wp.WEAPONS[name]
    img = Wp.paint(rows, Wp.PAL)
    if silhouette:
        px = img.load()
        for y in range(img.height):
            for x in range(img.width):
                if px[x, y][3]:
                    px[x, y] = silhouette
    return Wp.rot(img, pv, deg) if deg else (img, pv)


def tip_of(name, deg, hand):
    length = GEO_LEN[name] if name in GEO_LEN else Wp.WEAPONS[name][1][1]  # 쥐는 점에서 끝까지
    a = math.radians(deg)
    return (hand[0] + round(math.sin(a) * length), hand[1] - round(math.cos(a) * length))


def spark(c, x, y, size):
    g = ImageDraw.Draw(c)
    if size >= 1:
        g.point([(x, y)], fill=(255, 255, 255, 255))
        for d in range(1, size + 1):
            col = (255, 255, 255, 255) if d == 1 else (255, 214, 102, 255)
            g.point([(x + d, y), (x - d, y), (x, y + d), (x, y - d)], fill=col)
        if size >= 2:
            g.point([(x + 1, y + 1), (x - 1, y - 1), (x + 1, y - 1), (x - 1, y + 1)], fill=(255, 214, 102, 255))


SHIELD = Wp.paint([
    ".OOOOO.",
    "OCCGCcO",
    "OCCGCcO",
    "OGGGGGO",
    "OCCGCcO",
    ".OCGcO.",
    "..OcO..",
    "...O..."], {'O': '#2b1d2f', 'C': '#e0393e', 'c': '#a8232f', 'G': '#f5c542'})


def hand_img(pal):
    return Wp.paint([".OO.", "OSSO", "OSsO", ".OO."], {'O': '#2b1d2f', 'S': pal.get('S', '#ffe2c8'), 's': '#f2c4a4'})


def noarms(img):
    """팔(19~20줄 양옆) 지우기 — 몸통 x8~14 만 남긴다"""
    im = img.copy()
    for y in (19, 20):
        for x in (7, 15):
            im.putpixel((x, y), (0, 0, 0, 0))
        for x in (8, 14):
            im.putpixel((x, y), rgba('#2b1d2f'))
    return im


def compose(body, weapon=None, deg=0, hand=(19, 20), bdx=0, extra_before=None, extra_after=None, smear=None, behind=False, ch=None, sdy=0, hands=None):
    """ch['mirror']: 몸을 뒤집어 그린 뒤 전체를 다시 뒤집는다 → 몸은 그대로, 무기·효과만 캐릭터 왼쪽으로"""
    mirror = bool(ch and ch.get('mirror'))
    if mirror:
        body = body.transpose(Image.FLIP_LEFT_RIGHT)
    c = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    hx, hy = OX + hand[0] + bdx, OY + hand[1]
    if smear and weapon:
        for i, a in enumerate(smear):
            col = SMEAR2 if i < len(smear) // 2 else SMEAR
            im, pv = weapon_img(weapon, a, col)
            c.alpha_composite(im, (hx - pv[0], hy - pv[1]))
    if extra_before:
        extra_before(c, hx, hy)
    wl = weapon_img(weapon, deg) if weapon else None
    hl = hands(hx, hy) if (hands and ch and ch.get('armless')) else []
    himg = hand_img(ch['pal']) if hl else None
    put = lambda layer: [c.alpha_composite(himg, (x - 2, y - 2)) for x, y, l in hl if l == layer]
    if wl and behind:
        c.alpha_composite(wl[0], (hx - wl[1][0], hy - wl[1][1]))
    put('back')
    c.alpha_composite(body, (OX + bdx, OY))
    if wl and not behind:
        c.alpha_composite(wl[0], (hx - wl[1][0], hy - wl[1][1]))
    put('under')
    if ch and ch.get('shield'):  # 왼손(뒤집힌 상태 기준) 방패 — 최종 그림에서는 캐릭터 오른쪽
        c.alpha_composite(SHIELD.transpose(Image.FLIP_LEFT_RIGHT) if mirror else SHIELD, (OX + 1 + bdx, OY + 17 + sdy))
    put('top')
    if extra_after:
        extra_after(c, hx, hy)
    return c.transpose(Image.FLIP_LEFT_RIGHT) if mirror else c


def along(weapon, deg, x, y, d):
    """무기 축을 따라 쥐는 점에서 d 픽셀 (끝 쪽 +)"""
    a = math.radians(deg)
    return (x + round(math.sin(a) * d), y - round(math.cos(a) * d))


def hands_for(ch, weapon, deg, behind=False, free=(0, 0), raise_free=0, bdx=0, sdy=0):
    """쥐는 손 + 다른 손. free: 다른 손의 흔들림, raise_free: 시전 때 다른 손 들어 올리기"""
    def f(hx, hy):
        main = 'back' if behind else 'top'
        out = [(hx, hy, main)]
        if weapon == 'spear':
            out.append(along(weapon, deg, hx, hy, ch.get('spear_off', 4)) + ('top',))
        elif ch.get('shield'):
            out.append((OX + 8 + bdx, OY + 20 + sdy, 'under'))
        elif weapon != 'bow':
            out.append((OX + ch.get('free_x', 5) + bdx + free[0], OY + 20 + free[1] - raise_free, 'top'))
        return out
    return f


# ---------- 대기 ----------
IDLE_HEAD = [0, 0, 0, 1, 1, 1, 1, 0]          # 숨쉬기: 내쉴 때 머리 1px 내려앉음
IDLE_WPN = [0, 0, 0, 0, 1, 1, 1, 1]           # 무기는 반 박자 늦게
IDLE_HAT = [0, 0, 0, 0, 1, 1, 0, 0]           # 모자 끝 흔들림 (마법사)
IDLE_MS = [160, 140, 140, 180, 160, 140, 140, 180]


def idle(ch, weapon, hand, deg=0, hat_rows=0, blink_at=6, extra=None):
    out = []
    for i in range(8):
        b = blink(ch['img'], ch['pal']) if i == blink_at else ch['img']
        b = pose(b, 0, IDLE_HEAD[i], IDLE_HAT[i] if hat_rows else 0, hat_rows)
        hd = (hand[0], hand[1] + IDLE_WPN[i])
        ex = (lambda c, hx, hy, i=i: extra(c, hx, hy, i)) if extra else None
        hf = hands_for(ch, weapon, deg, free=(0, 1 - IDLE_WPN[i]), sdy=IDLE_WPN[i])
        if weapon == 'bow':
            hf = lambda hx, hy, i=i: [(hx, hy, 'top'), (OX + 18, OY + 20 + (1 - IDLE_WPN[i]), 'top')]
        out.append((compose(b, weapon, deg, hd, extra_after=ex, ch=ch, sdy=IDLE_WPN[i], hands=hf), IDLE_MS[i]))
    return out


# ---------- 공격 ----------
def swing(ch, weapon, hand=(19, 20)):
    """휘두르기: 예비(뒤로 젖힘·찌그러짐) → 잔상과 함께 내려침(늘어남) → 타격 멈춤 + 섬광 → 회복"""
    b = ch['img']
    keys = [  # (각도, 머리 dx, 머리 dy, 몸 dx, 손 dx, 손 dy, 잔상 각도들, 섬광, ms)
        (-20, -1, 0, 0, 0, 0, None, 0, 70),
        (-55, -1, 1, -1, -1, -1, None, 0, 90),
        (-70, -1, 1, -1, -1, -1, None, 0, 200),            # 예비 동작 멈춤
        (30, 1, -1, 0, 1, 0, [-70, -45, -20, 5], 0, 40),      # 휘두르기 (잔상)
        (105, 1, 0, 1, 2, 1, [30, 55, 80], 2, 50),           # 타격
        (110, 1, 0, 1, 2, 1, None, 3, 160),                  # 타격 멈춤
        (95, 0, 0, 0, 1, 1, None, 1, 80),
        (60, 0, 0, 0, 0, 0, None, 0, 90),
        (20, 0, 0, 0, 0, 0, None, 0, 100),
        (0, 0, 0, 0, 0, 0, None, 0, 120),
    ]
    out = []
    for deg, hdx, hdy, bdx, hx, hy, sm, sp, ms in keys:
        hd = (hand[0] + hx, hand[1] + hy)
        def after(c, x, y, deg=deg, sp=sp, hd=hd, bdx=bdx):
            if sp:
                tx, ty = tip_of(weapon, deg, (OX + hd[0] + bdx, OY + hd[1]))
                spark(c, tx, ty, sp)
        out.append((compose(pose(b, -hdx if ch.get('mirror') else hdx, hdy), weapon, deg, hd, bdx, extra_after=after, smear=sm, behind=deg < -30, ch=ch, sdy=-1 if deg < -30 else 0, hands=hands_for(ch, weapon, deg, deg < -30, free=(-hdx, hdy), bdx=bdx, sdy=-1 if deg < -30 else 0)), ms))
    return out


def thrust(ch, weapon='spear', hand=(19, 20)):
    """찌르기: 뒤로 당김 → 앞으로 쭉 (속도선) → 멈춤 → 회복"""
    b = ch['img']
    # 창 각도는 도트가 깔끔한 0·45·90° 만 쓴다 (대기 45° 에서 시작해 45° 로 돌아옴)
    keys = [(45, -1, 0, -1, -1, 0, 80), (90, -1, 1, -3, 0, 0, 200), (90, 1, -1, 4, 0, 1, 40), (90, 1, 0, 5, 0, 3, 160), (90, 0, 0, 3, 0, 1, 80), (45, 0, 0, 1, 0, 0, 90), (45, 0, 0, 0, 0, 0, 100), (45, 0, 0, 0, 0, 0, 120)]
    out = []
    for deg, hdx, hdy, hx, hy, fx, ms in keys:
        hd = (hand[0] + hx, hand[1] + hy)
        def before(c, x, y, fx=fx):
            if fx == 1:
                g = ImageDraw.Draw(c)
                for k, yy in enumerate((y - 2, y, y + 2)):
                    g.line([(x - 9 + k * 2, yy), (x - 3, yy)], fill=SMEAR)
        def after(c, x, y, fx=fx, deg=deg, hd=hd):
            if fx >= 1:
                tx, ty = tip_of(weapon, deg, (OX + hd[0], OY + hd[1]))
                spark(c, tx + 1, ty, 3 if fx == 3 else 1)
        out.append((compose(pose(b, -hdx if ch.get('mirror') else hdx, hdy), weapon, deg, hd, extra_before=before, extra_after=after, ch=ch, hands=hands_for({**ch, 'spear_off': -5}, weapon, deg)), ms))
    return out


def cast(ch, hand=(19, 22)):
    """시전: 웅크림(지팡이 내림) → 번쩍 들어 올림(늘어남) → 구슬 섬광 + 퍼지는 고리 + 불티 → 회복"""
    b = ch['img']
    keys = [  # (각도, 머리 dy, 지팡이 dy, 고리 반지름, 불티, ms)
        (10, 1, 1, 0, 0, 120),
        (15, 1, 2, 0, 0, 200),
        (-20, -1, -3, 0, 1, 50),
        (-25, -1, -4, 4, 2, 60),
        (-25, -1, -4, 8, 3, 70),
        (-25, 0, -3, 12, 4, 90),
        (-15, 0, -2, 0, 0, 100),
        (0, 0, 0, 0, 0, 140),
    ]
    out = []
    for deg, hdy, wdy, ring, emb, ms in keys:
        hd = (hand[0], hand[1] + wdy)
        def after(c, x, y, deg=deg, ring=ring, emb=emb, hd=hd):
            ox, oy = tip_of('staff', deg, (OX + hd[0], OY + hd[1]))
            g = ImageDraw.Draw(c)
            if ring:
                g.ellipse([ox - ring, oy - ring, ox + ring, oy + ring], outline=(255, 154, 60, 255))
                if ring > 3:
                    g.ellipse([ox - ring + 2, oy - ring + 2, ox + ring - 2, oy + ring - 2], outline=(255, 224, 102, 255))
            if emb:
                spark(c, ox, oy, 2 if emb < 3 else 1)
                for k in range(emb):
                    a = k * 2.1 + emb
                    r = 3 + emb * 2
                    g.point([(ox + round(math.cos(a) * r), oy + round(math.sin(a) * r) - emb)], fill=(255, 214, 102, 255))
        out.append((compose(pose(b, 0, hdy), 'staff', deg, hd, extra_after=after, ch=ch, hands=hands_for(ch, 'staff', deg, raise_free=max(0, -wdy) + (2 if ring else 0))), ms))
    return out


def shoot(ch, hand=(1, 18)):
    """활: 당기며 뒤로 기댐 → 꽉 당겨 멈춤 → 놓는 순간 시위 튕김 + 반동 + 화살(속도선) → 시위 떨림 → 회복"""
    b = ch['img']
    arrow = Wp.paint(Wp.ARROW, Wp.PAL)
    # (당김, 머리 dx, 머리 dy, 몸 dx, 화살 x(-1 = 시위에 걸림), 시위 떨림, ms)
    keys = [
        (1, 0, 0, 0, -1, 0, 90), (3, 1, 0, 0, -1, 0, 80), (5, 1, 1, 1, -1, 0, 80), (6, 1, 1, 1, -1, 0, 220),
        (-2, -1, -1, -1, 0, 0, 40), (1, 0, 0, 0, 1, 0, 50), (-1, 0, 0, 0, 2, 0, 50), (0, 0, 0, 0, 3, 0, 60),
        (0, 0, 0, 0, -2, 0, 120),
    ]
    out = []
    for pull, hdx, hdy, bdx, ax, _, ms in keys:
        def after(c, x, y, pull=pull, ax=ax, bdx=bdx):
            g = ImageDraw.Draw(c)
            top, bot = bow_tips(0, x, y)
            mid = (x + 3 + pull, y)
            col = (238, 246, 255, 255)
            g.line([top, mid], fill=col)
            g.line([mid, bot], fill=col)
            if ax == -1:
                c.alpha_composite(arrow, (mid[0] - 9, y - 2))
            elif ax >= 0:
                axp = x - 8 - ax * 6
                for k, yy in enumerate((y - 1, y + 1)):
                    g.line([(axp + 11, yy), (axp + 16 + ax * 3, yy)], fill=SMEAR)
                c.alpha_composite(arrow, (axp, y - 2))
        out.append((compose(pose(b, hdx, hdy), 'bow', 0, hand, bdx, extra_after=after, ch=ch, hands=lambda hx, hy, pull=pull, ax=ax: [(hx, hy, 'top'), ((hx + 3 + pull, hy, 'top') if ax == -1 else (hx + 8 - min(ax, 1) * 2, hy - 2 + min(ax, 1), 'top'))]), ms))
    return out


ARMLESS = False


def char(cid, strip, keep_top=0, mirror=True, shield=False, custom=None, free_x=5):
    """custom: 사용자가 고친 몸 그림 {'file', 'split'(머리/몸 나누는 줄), 'eyes'[(x, 눈 윗줄 y)…]} — 팔 없는 버전에만 쓴다"""
    ch = next(c for c in D.CHARS if c['id'] == cid)
    if custom and ARMLESS:
        img = Image.open(os.path.join(OUT, custom['file'])).convert('RGBA')
        img.info = {'split': custom['split'], 'eyes': custom['eyes']}
    else:
        img = Wp.body(cid, strip, keep_top)
        img = noarms(img) if ARMLESS else img
    return {'img': img, 'pal': {**D.COMMON, **ch['pal']}, 'mirror': mirror, 'shield': shield, 'armless': ARMLESS, 'free_x': free_x}


# 무기 쥐는 손 위치 (몸 기준 좌표, 아델·베로나는 뒤집혀 그려짐) — 몸통 쪽으로 붙여 무기가 몸을 조금 가리게
HAND = {'staff': (16, 22), 'bow': (5, 19), 'spear': (16, 20)}
IDLE_TILT = {'bow': -30, 'spear': 45, 'staff': 25}  # 대기 때 대각선으로 기울여 잡기 (시계 방향 +, 아델은 뒤집혀 그려져 최종 그림에서 바깥쪽으로)


def rot_pt(dx, dy, deg, x, y):
    a = math.radians(deg)
    return (x + round(dx * math.cos(a) - dy * math.sin(a)), y + round(dx * math.sin(a) + dy * math.cos(a)))


def build_all():
    kaira = char('red_sword', (17, 24), shield=True)
    verona = char('red_mage', (17, 24), 13, custom={'file': 'edit/verona_body_v2.png', 'split': 19, 'eyes': [(9, 15), (13, 15)]}, free_x=4)
    elin = char('green_archer', (0, 5), mirror=False)
    adel = char('blue_knight', (0, 5))
    return [
        {'key': 'sword', 'title': '카이라 · 검과 방패', 'sub': '젖힘 → 잔상 내려치기 → 타격 멈춤 → 회복',
         'idle': idle(kaira, 'sword', (19, 20)), 'attack': swing(kaira, 'sword')},
        {'key': 'staff', 'title': '베로나 · 지팡이', 'sub': '웅크림 → 번쩍 들어 올림 → 섬광·고리·불티',
         'idle': idle(verona, 'staff', HAND['staff'], deg=IDLE_TILT['staff'], hat_rows=9), 'attack': cast(verona, HAND['staff'])},
        {'key': 'bow', 'title': '엘린 · 활', 'sub': '당기며 기댐 → 멈춤 → 시위 튕김·반동·화살',
         'idle': idle(elin, 'bow', HAND['bow'], deg=IDLE_TILT['bow'], extra=lambda c, x, y, i: ImageDraw.Draw(c).line(list(bow_tips(IDLE_TILT['bow'], x, y)), fill=(238, 246, 255, 255))), 'attack': shoot(elin, HAND['bow'])},
        {'key': 'knight', 'title': '아델 · 창', 'sub': '뒤로 당김 → 쭉 찌르기(속도선) → 멈춤 → 회복',
         'idle': idle(adel, 'spear', HAND['spear'], deg=IDLE_TILT['spear']), 'attack': thrust(adel, 'spear', HAND['spear'])},
    ]


def strip(frames):
    s = Image.new('RGBA', (W * len(frames), H), (0, 0, 0, 0))
    for i, (f, _) in enumerate(frames):
        s.alpha_composite(f, (i * W, 0))
    b = io.BytesIO()
    s.save(b, 'PNG')
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


if __name__ == '__main__':
    pack = lambda anims: [
        {'key': a['key'], 'title': a['title'], 'sub': a['sub'],
         'idle': {'src': strip(a['idle']), 'ms': [m for _, m in a['idle']]},
         'attack': {'src': strip(a['attack']), 'ms': [m for _, m in a['attack']]}} for a in anims]
    arms = build_all()
    ARMLESS = True
    anims = build_all()  # 팔 없음 + 떠 있는 둥근 손 (GIF 도 이 버전)
    json.dump({'W': W, 'H': H, 'anims': pack(anims), 'arms': pack(arms)}, open(os.path.join(OUT, 'anim.json'), 'w'))
    # GIF: 대기 2번 → 공격 → 대기 (4명 나란히)
    Z = 6
    seqs = [a['idle'] * 2 + a['attack'] + a['idle'] for a in anims]
    # 공통 시간축 40ms 단위로 맞춤
    total = max(sum(m for _, m in s) for s in seqs)
    frames, durs = [], []
    t = 0
    while t < total:
        im = Image.new('RGB', (W * Z * 4, H * Z), '#f6f1e4')
        for j, s in enumerate(seqs):
            acc, pick = 0, s[-1][0]
            for f, m in s:
                if acc + m > t:
                    pick = f
                    break
                acc += m
            im.paste(pick.resize((W * Z, H * Z), Image.NEAREST), (j * W * Z, 0), pick.resize((W * Z, H * Z), Image.NEAREST))
        frames.append(im)
        durs.append(40)
        t += 40
    frames[0].save(os.path.join(OUT, 'anim.gif'), save_all=True, append_images=frames[1:], duration=durs, loop=0)
    print('ok', [(a['key'], len(a['idle']), len(a['attack'])) for a in anims])
