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
W, H = 52, 32
OX, OY = 17, 6
SMEAR = (255, 244, 214, 255)
SMEAR2 = (255, 210, 122, 255)


def rgba(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def blink(img, pal):
    im = img.copy()
    for x in (8, 9, 13, 14):
        im.putpixel((x, 15), rgba(pal.get('S', '#ffe2c8')))
        im.putpixel((x, 16), rgba('#2b1d2f'))
    return im


def pose(img, head_dx=0, head_dy=0, hat_dx=0, hat_rows=0):
    """머리(0~17줄)를 몸에 대해 옮긴다. hat_rows: 위에서 몇 줄을 모자 끝으로 보고 더 흔들지"""
    out = Image.new('RGBA', img.size, (0, 0, 0, 0))
    bottom = img.crop((0, 18, 24, 24))
    top = img.crop((0, 0, 24, 18))
    out.alpha_composite(bottom, (0, 18))
    if head_dy < 0:  # 늘어남: 비는 목 줄을 몸 첫 줄로 채움
        out.alpha_composite(img.crop((0, 18, 24, 19)), (0, 17))
    if hat_rows and hat_dx:
        tip = top.crop((0, 0, 24, hat_rows))
        rest = top.crop((0, hat_rows, 24, 18))
        top = Image.new('RGBA', (24, 18), (0, 0, 0, 0))
        top.alpha_composite(rest, (0, hat_rows))
        top.alpha_composite(tip, (hat_dx, 0))
    out.alpha_composite(top, (head_dx, head_dy))
    return out


def weapon_img(name, deg, silhouette=None):
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
    rows, pv = Wp.WEAPONS[name]
    length = pv[1]  # 쥐는 점에서 위 끝까지
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


def compose(body, weapon=None, deg=0, hand=(19, 20), bdx=0, extra_before=None, extra_after=None, smear=None, behind=False):
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
    if wl and behind:
        c.alpha_composite(wl[0], (hx - wl[1][0], hy - wl[1][1]))
    c.alpha_composite(body, (OX + bdx, OY))
    if wl and not behind:
        c.alpha_composite(wl[0], (hx - wl[1][0], hy - wl[1][1]))
    if extra_after:
        extra_after(c, hx, hy)
    return c


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
        out.append((compose(b, weapon, deg, hd, extra_after=ex), IDLE_MS[i]))
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
        out.append((compose(pose(b, hdx, hdy), weapon, deg, hd, bdx, extra_after=after, smear=sm, behind=deg < -30), ms))
    return out


def thrust(ch, weapon='spear', hand=(19, 20)):
    """찌르기: 뒤로 당김 → 앞으로 쭉 (속도선) → 멈춤 → 회복"""
    b = ch['img']
    keys = [(60, -1, 0, -1, -1, 0, 80), (85, -1, 1, -3, 0, 0, 200), (90, 1, -1, 4, 0, 1, 40), (90, 1, 0, 5, 0, 3, 160), (90, 0, 0, 3, 0, 1, 80), (60, 0, 0, 1, 0, 0, 90), (20, 0, 0, 0, 0, 0, 100), (0, 0, 0, 0, 0, 0, 120)]
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
        out.append((compose(pose(b, hdx, hdy), weapon, deg, hd, extra_before=before, extra_after=after), ms))
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
            oy += 2
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
        out.append((compose(pose(b, 0, hdy), 'staff', deg, hd, extra_after=after), ms))
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
            top, bot = (x + 3, y - 7), (x + 3, y + 6)
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
        out.append((compose(pose(b, hdx, hdy), 'bow', 0, hand, bdx, extra_after=after), ms))
    return out


def char(cid, strip, keep_top=0):
    ch = next(c for c in D.CHARS if c['id'] == cid)
    return {'img': Wp.body(cid, strip, keep_top), 'pal': {**D.COMMON, **ch['pal']}}


def build_all():
    kaira = char('red_sword', (17, 24))
    verona = char('red_mage', (17, 24), 13)
    elin = char('green_archer', (0, 5))
    adel = char('blue_knight', (0, 5))
    return [
        {'key': 'sword', 'title': '카이라 · 검', 'sub': '젖힘 → 잔상 내려치기 → 타격 멈춤 → 회복',
         'idle': idle(kaira, 'sword', (19, 20)), 'attack': swing(kaira, 'sword')},
        {'key': 'staff', 'title': '베로나 · 지팡이', 'sub': '웅크림 → 번쩍 들어 올림 → 섬광·고리·불티',
         'idle': idle(verona, 'staff', (19, 22), hat_rows=9), 'attack': cast(verona)},
        {'key': 'bow', 'title': '엘린 · 활', 'sub': '당기며 기댐 → 멈춤 → 시위 튕김·반동·화살',
         'idle': idle(elin, 'bow', (1, 18), extra=lambda c, x, y, i: ImageDraw.Draw(c).line([(x + 3, y - 7), (x + 3, y + 6)], fill=(238, 246, 255, 255))), 'attack': shoot(elin)},
        {'key': 'knight', 'title': '아델 · 무기 바꿔 끼우기', 'sub': '같은 몸 — 도끼 휘두르기 · 창 찌르기',
         'idle': idle(adel, 'axe', (19, 20)), 'attack': swing(adel, 'axe') + idle(adel, 'spear', (19, 20))[:2] + thrust(adel, 'spear')},
    ]


def strip(frames):
    s = Image.new('RGBA', (W * len(frames), H), (0, 0, 0, 0))
    for i, (f, _) in enumerate(frames):
        s.alpha_composite(f, (i * W, 0))
    b = io.BytesIO()
    s.save(b, 'PNG')
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


if __name__ == '__main__':
    anims = build_all()
    data = {'W': W, 'H': H, 'anims': [
        {'key': a['key'], 'title': a['title'], 'sub': a['sub'],
         'idle': {'src': strip(a['idle']), 'ms': [m for _, m in a['idle']]},
         'attack': {'src': strip(a['attack']), 'ms': [m for _, m in a['attack']]}} for a in anims]}
    json.dump(data, open(os.path.join(OUT, 'anim.json'), 'w'))
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
