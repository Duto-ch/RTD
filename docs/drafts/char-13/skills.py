"""스킬 동작 시안 (2026-11-18, 탑뷰판): 카이라 · 베로나 · 엘린 — 캐릭터마다 스킬 2개
- 탑뷰(필드를 위에서 내려다봄)에 맞춤: 캐릭터가 판 가운데, 바닥 효과는 위에서 본 원(SQ), 원거리 스킬은 목표 지점(TARGET)에 경고 원·그림자 → 위에서 떨어짐
- 캐릭터·무기·둥근 손은 anim.py 그대로, 이펙트가 넓게 퍼지도록 큰 판(112x64)에 그린다 (캐릭터는 오른쪽 아래, 공격은 왼쪽)
- 이펙트는 플랫 픽셀(3~4색), 속성색: 불꽃(레드) · 잎사귀(그린)
- 스킬 이름은 게임 로스터(src/data/roster.js ORIGINALS)의 확정 스킬
실행: python3 docs/drafts/char-13/skills.py  →  skills.json (열람 페이지용) · skills.gif
"""
import os, sys, math, json, io, base64, random
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import anim as A
import weapons as Wp

OUT = os.path.dirname(os.path.abspath(__file__))
A.ARMLESS = True
BW, BH = 144, 120         # 탑뷰 판: 캐릭터가 가운데, 이펙트가 사방으로 (도트)
TILE = 24                  # 필드 한 칸 (24도트 = 화면 48px)
BODY = (72, 66)            # 캐릭터 몸통 가운데 = 캐릭터가 선 칸의 가운데
BX, BY = round(BODY[0] - (A.OX + 11.5)), round(BODY[1] - (A.OY + 17.5))   # 캐릭터 판(56x40) 놓는 자리
GROUND = BODY[1]           # 탑뷰 바닥 기준 = 칸 가운데
SQ = 0.82                  # 바닥에 그리는 원: 위에서 내려다본 원 (세로를 살짝만 눌러 원근감)
TARGET = (BODY[0] - 40, BODY[1] - 30)   # 원거리 스킬 목표 지점 (왼쪽 위로 약 2칸 — 몬스터 길 쪽)


FIRE = ['#fff3b0', '#ffd34a', '#ff8a2a', '#d8401e']
LEAF = ['#efffc0', '#9ae070', '#4fae3a', '#2a6a2a']
GOLD = ['#fff6c8', '#f5c542', '#c98f2a']
OUTL = '#2b1d2f'


def rgba(h, a=255):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)


# ---------- 그리기 도우미 ----------
def px(g, x, y, col):
    g.point([(round(x), round(y))], fill=rgba(col) if isinstance(col, str) else col)


def ell(g, cx, cy, rx, ry, col, w=1):
    g.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], outline=rgba(col), width=w)


def disc(g, cx, cy, r, cols):
    """바깥부터 cols[-1] → cols[0] 로 겹친 원 (가운데가 밝음)"""
    n = len(cols)
    for i, c in enumerate(reversed(cols)):
        rr = r * (n - i) / n
        g.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=rgba(c))


def flame(g, x, y, h, phase=0, cols=FIRE):
    """바닥 (x, y) 에서 위로 솟는 불꽃 혀 (높이 h)"""
    sway = [0, 1, 0, -1][phase % 4]
    for k in range(h):
        t = k / max(1, h - 1)
        c = cols[3] if t < 0.25 else (cols[2] if t < 0.55 else (cols[1] if t < 0.85 else cols[0]))
        w = 2 if t < 0.5 else 1
        xx = x + (sway if t > 0.5 else 0)
        for dx in range(-w // 2, w - w // 2 + (1 if w == 2 else 0)):
            px(g, xx + dx, y - k, c)


def rays(g, cx, cy, r0, r1, n, col, rot=0):
    for i in range(n):
        a = rot + i * 2 * math.pi / n
        g.line([(cx + math.cos(a) * r0, cy + math.sin(a) * r0), (cx + math.cos(a) * r1, cy + math.sin(a) * r1)], fill=rgba(col))


def arrow(g, x, y, dx, dy, head='#e8e0c8', shaft='#9a6235', fl='#4fae3a', n=6):
    """(x, y) = 화살촉, (dx, dy) = 날아가는 방향"""
    L = math.hypot(dx, dy) or 1
    ux, uy = dx / L, dy / L
    for k in range(n):
        c = head if k == 0 else (fl if k >= n - 2 else shaft)
        px(g, x - ux * k, y - uy * k, c)
    px(g, x + ux, y + uy, OUTL)


def gcircle(g, cx, cy, r, col, w=1):
    """바닥 위의 원 (탑뷰)"""
    ell(g, cx, cy, r, r * SQ, col, w)


def blob(g, x, y, r, phase=0, cols=FIRE):
    """위에서 본 불꽃 덩어리: 가운데 밝은 원 + 일렁이는 가장자리"""
    j = [0, 1, 0, -1][phase % 4] * 0.5
    disc(g, x + j, y, r, cols)
    px(g, x - r + j, y - r * 0.6, cols[1]); px(g, x + r * 0.7, y - r * 0.8 - j, cols[2])


def tiles3(g, cx, cy, col, step):
    """시전자 주변 8칸 테두리 (주변 칸 버프 범위)"""
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dx == 0 and dy == 0:
                continue
            x0, y0 = cx + dx * TILE - TILE / 2 + 1, cy + dy * TILE - TILE / 2 + 1
            if step >= 1:
                g.rectangle([x0, y0, x0 + TILE - 3, y0 + TILE - 3], outline=rgba(col))


def place(big, small, shake=(0, 0)):
    big.alpha_composite(small, (BX + shake[0], BY + shake[1]))


def tip_final(ch, weapon, deg, hand, bdx=0):
    """무기 끝의 큰 판 좌표 (뒤집혀 그려지는 캐릭터는 다시 뒤집어 계산)"""
    tx, ty = A.tip_of(weapon, deg, (A.OX + hand[0] + bdx, A.OY + hand[1]))
    if ch.get('mirror'):
        tx = A.W - 1 - tx
    return BX + tx, BY + ty


def new():
    return Image.new('RGBA', (BW, BH), (0, 0, 0, 0))


# ---------- 카이라 ----------
def kaira_char():
    return A.char('red_sword', (17, 24), shield=True)


def kaira_frame(ch, deg, hdx=0, hdy=0, bdx=0, smear=None, hand=None):
    hand = hand or A.HAND['sword']
    behind = 200 <= (deg % 360) <= 340
    mir = -hdx if ch.get('mirror') else hdx
    return A.compose(A.pose(ch['img'], mir, hdy), 'sword', deg, hand, bdx, smear=smear, behind=behind, ch=ch,
                     sdy=-1 if behind else 0, hands=A.hands_for(ch, 'sword', deg, behind, bdx=bdx))


def kaira_spin(ch):
    """화염 회전 베기 (Lv5, 탑뷰): 칼에 불이 붙고 → 제자리 한 바퀴(불꽃 잔상) → 발밑 불의 원이 사방으로 퍼지며 불길이 둘러섬"""
    out = []
    hand = A.HAND['sword']
    cx, cy = BODY
    for k, (deg, ms) in enumerate([(-50, 110), (-65, 170)]):
        f = new(); g = ImageDraw.Draw(f)
        place(f, kaira_frame(ch, deg, hdx=-1, hdy=1, bdx=-1))
        tx, ty = tip_final(ch, 'sword', deg, hand, -1)
        for j in range(4 + k * 4):   # 사방에서 칼로 모이는 불티
            a = j * 2 * math.pi / (4 + k * 4)
            r = 14 - k * 6
            px(g, tx + math.cos(a) * r, ty + math.sin(a) * r, FIRE[1])
        blob(g, tx, ty, 1.5 + k, k)
        out.append((f, ms))
    spin = [10, 80, 150, 220, 290, 400]
    prev = -65
    for k, deg in enumerate(spin):
        f = new(); g = ImageDraw.Draw(f)
        r = 9 + k * 4
        gcircle(g, cx, cy, r, FIRE[3], 2); gcircle(g, cx, cy, r - 2, FIRE[1])
        a0 = k * math.pi / 3   # 회전을 따라 도는 불꽃 꼬리
        for j in range(5):
            a = a0 - j * 0.35
            blob(g, cx + math.cos(a) * r, cy + math.sin(a) * r * SQ, 2 - j * 0.3, j)
        place(f, kaira_frame(ch, deg, hdx=1 if k % 2 else 0, hdy=-1 if k in (2, 3) else 0,
                             smear=[prev + (deg - prev) * t for t in (0.25, 0.5, 0.75)]))
        out.append((f, 45))
        prev = deg
    # 마무리: 불의 원이 사방으로 터짐 (주변 1칸 반)
    for k, (r, ms) in enumerate([(30, 90), (36, 150)]):
        f = new(); g = ImageDraw.Draw(f)
        gcircle(g, cx, cy, r, FIRE[3], 2); gcircle(g, cx, cy, r - 3, FIRE[2]); gcircle(g, cx, cy, r - 6, FIRE[1])
        for i in range(12):
            a = i * 2 * math.pi / 12 + k * 0.13
            blob(g, cx + math.cos(a) * r, cy + math.sin(a) * r * SQ, 3 - k, i)
        rays(g, cx, cy, r + 3, r + 6 + k * 2, 16, FIRE[1], k * 0.2)
        place(f, kaira_frame(ch, 110, hdx=1, bdx=1))
        tx, ty = tip_final(ch, 'sword', 110, hand, 1)
        if k == 0:
            A.spark(f, round(tx), round(ty), 3)
        out.append((f, ms))
    f = new(); g = ImageDraw.Draw(f)   # 그을린 자리 + 잔불
    for i in range(12):
        a = i * 2 * math.pi / 12 + 0.26
        px(g, cx + math.cos(a) * 38, cy + math.sin(a) * 38 * SQ, FIRE[3])
        if i % 2 == 0:
            blob(g, cx + math.cos(a) * 33, cy + math.sin(a) * 33 * SQ, 1, i)
    place(f, kaira_frame(ch, 90)); out.append((f, 110))
    for deg, ms in [(65, 100), (45, 140)]:
        f = new(); place(f, kaira_frame(ch, deg)); out.append((f, ms))
    return out


def kaira_cry(ch):
    """전투의 함성 (Lv4, 탑뷰): 칼을 치켜들고 외침 → 붉은 기운이 원으로 퍼져 주변 8칸을 덮고, 그 칸들 위에 금색 화살표(공격력 증가)"""
    out = []
    hand = A.HAND['sword']
    cx, cy = BODY
    f = new(); place(f, kaira_frame(ch, 100, hdy=1, hand=(hand[0], hand[1] + 1))); out.append((f, 130))
    f = new(); place(f, kaira_frame(ch, 0, hdy=-1, hand=(hand[0], hand[1] - 3))); out.append((f, 70))
    for k in range(5):
        f = new(); g = ImageDraw.Draw(f)
        r = 8 + k * 9
        gcircle(g, cx, cy, r, FIRE[3] if k < 3 else FIRE[2], 2 if k < 3 else 1)
        if k >= 2:
            tiles3(g, cx, cy, GOLD[1] if k < 4 else GOLD[2], 1)
        place(f, kaira_frame(ch, 0, hdy=-1 if k < 3 else 0, hand=(hand[0], hand[1] - 3)))
        tx, ty = tip_final(ch, 'sword', 0, (hand[0], hand[1] - 3))
        A.spark(f, round(tx), round(ty), 3 if k < 2 else 2)
        hx, hy = cx, cy - 12
        if k < 3:   # 외침 줄 (머리 양옆)
            for sgn in (-1, 1):
                g.line([(hx + sgn * (9 + k), hy - 2), (hx + sgn * (12 + k), hy - 4)], fill=rgba(GOLD[1]))
                g.line([(hx + sgn * (9 + k), hy + 1), (hx + sgn * (13 + k), hy + 1)], fill=rgba(GOLD[1]))
        if k >= 2:   # 주변 8칸 위에 금색 화살표
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if dx == 0 and dy == 0:
                        continue
                    ax, ay = cx + dx * TILE, cy + dy * TILE - (k - 2) * 2
                    g.polygon([(ax, ay - 3), (ax - 2, ay), (ax + 2, ay)], fill=rgba(GOLD[1]))
                    px(g, ax, ay + 1, GOLD[2])
        out.append((f, [200, 110, 110, 120, 140][k]))
    for deg, ms in [(25, 100), (45, 140)]:
        f = new(); place(f, kaira_frame(ch, deg)); out.append((f, ms))
    return out


# ---------- 베로나 ----------
def verona_char():
    return A.char('red_mage', (17, 24), 13, custom={'file': 'edit/verona_body_v2.png', 'split': 19, 'eyes': [(9, 15), (13, 15)]}, free_x=6)


def verona_frame(ch, deg, dy=0, hdy=0, raise_free=0):
    hand = A.HAND['staff']
    hd = (hand[0], hand[1] + dy)
    return A.compose(A.pose(ch['img'], 0, hdy), 'staff', deg, hd, ch=ch, hands=A.hands_for(ch, 'staff', deg, raise_free=raise_free)), hd


def verona_ring(ch):
    """화염 고리 (Lv3, 탑뷰): 지팡이를 번쩍 → 발밑에서 불의 원이 사방으로 넓어지며 고리 위에 불꽃"""
    out = []
    small, _ = verona_frame(ch, 15, 2, 1); f = new(); place(f, small); out.append((f, 130))
    small, hd = verona_frame(ch, -15, -3, -1, 3); f = new(); place(f, small)
    ox, oy = tip_final(ch, 'staff', -15, hd); A.spark(f, round(ox), round(oy), 3); out.append((f, 70))
    cx, cy = BODY
    for k in range(5):
        f = new(); g = ImageDraw.Draw(f)
        r = 10 + k * 8
        gcircle(g, cx, cy, r, FIRE[3], 2); gcircle(g, cx, cy, r - 2, FIRE[1])
        n = 8 + k * 2
        for i in range(n):
            a = i * 2 * math.pi / n + k * 0.2
            blob(g, cx + math.cos(a) * r, cy + math.sin(a) * r * SQ, max(1, 2.5 - k * 0.3), i + k)
        small, hd = verona_frame(ch, -15, -3, -1 if k < 2 else 0, 3)
        place(f, small)
        ox, oy = tip_final(ch, 'staff', -15, hd)
        if k < 3:
            ell(g, ox, oy, 3 + k, 3 + k, FIRE[2])
        out.append((f, 75))
    f = new(); g = ImageDraw.Draw(f)
    for i in range(18):   # 끊어지며 사라지는 고리
        a = i * 2 * math.pi / 18
        if i % 2 == 0:
            px(g, cx + math.cos(a) * 50, cy + math.sin(a) * 50 * SQ, FIRE[2])
            px(g, cx + math.cos(a) * 46, cy + math.sin(a) * 46 * SQ, FIRE[1])
    small, _ = verona_frame(ch, 5); place(f, small); out.append((f, 110))
    small, _ = verona_frame(ch, 25); f = new(); place(f, small); out.append((f, 150))
    return out


def verona_meteor(ch):
    """메테오 (Lv5, 탑뷰): 지팡이를 들면 목표 지점에 붉은 경고 원 → 운석 그림자가 커지며 위에서 떨어짐 → 원형 충격파 · 사방으로 튀는 파편 · 그을음"""
    out = []
    tx, ty = TARGET
    for k, ms in enumerate([120, 120, 140]):
        f = new(); g = ImageDraw.Draw(f)
        small, hd = verona_frame(ch, -25, -4, -1, 4)
        if k >= 1:   # 목표 지점 경고 원 (점선이 안으로 조여든다)
            r = 16 - k * 2
            for i in range(16):
                a = i * 2 * math.pi / 16 + k * 0.2
                if i % 2 == 0:
                    px(g, tx + math.cos(a) * r, ty + math.sin(a) * r * SQ, FIRE[3])
            gcircle(g, tx, ty, 3, FIRE[2])
        place(f, small)
        ox, oy = tip_final(ch, 'staff', -25, hd)
        A.spark(f, round(ox), round(oy), 2 + (k % 2))
        out.append((f, ms))
    for k, t in enumerate((0.35, 0.7, 1.0)):   # 위에서 떨어지는 운석 + 커지는 그림자
        f = new(); g = ImageDraw.Draw(f)
        gcircle(g, tx, ty, 12, FIRE[3])
        g.ellipse([tx - 3 - k * 2, ty - (3 + k * 2) * SQ, tx + 3 + k * 2, ty + (3 + k * 2) * SQ], fill=(43, 29, 47, 90 + k * 40))
        my = -8 + (ty - 4 + 8) * t
        for j in range(1, 9):   # 위로 길게 남는 불꼬리
            px(g, tx + (j % 2), my - j * 2, FIRE[min(3, j // 2)])
            px(g, tx - 1 + (j % 3 == 0), my - j * 2 - 1, FIRE[min(3, 1 + j // 2)])
        disc(g, tx, my, 4 + k * 0.5, [FIRE[0], FIRE[1], FIRE[2], '#7a2a1a'])
        small, _ = verona_frame(ch, -25, -4, 0, 4)
        place(f, small)
        out.append((f, 55))
    for k, (r, ms, sh) in enumerate([(9, 70, (1, 0)), (16, 80, (-1, 1)), (24, 100, (0, 0))]):   # 충격파
        f = new(); g = ImageDraw.Draw(f)
        gx, gy = tx + sh[0], ty + sh[1]
        if k == 0:
            disc(g, gx, gy, r, [FIRE[0], FIRE[1], FIRE[2], FIRE[3]])
        else:
            gcircle(g, gx, gy, r, FIRE[3], 2); gcircle(g, gx, gy, r - 3, FIRE[1])
            disc(g, gx, gy, 6 - k * 1.5, [FIRE[1], FIRE[2], FIRE[3]])
        for i in range(12):   # 사방으로 튀는 파편
            a = i * 2 * math.pi / 12 + k * 0.4
            d = r + 3 + k * 2
            px(g, gx + math.cos(a) * d, gy + math.sin(a) * d * SQ, FIRE[1] if i % 2 else '#5a4a48')
        small, _ = verona_frame(ch, -5, -1)
        place(f, small, sh)
        out.append((f, ms))
    f = new(); g = ImageDraw.Draw(f)   # 그을린 자국 + 연기
    g.ellipse([tx - 9, ty - 9 * SQ, tx + 9, ty + 9 * SQ], fill=(58, 40, 36, 150))
    for dx, dy, r in [(-8, -4, 4), (0, -9, 5), (8, -3, 4), (-3, 6, 3), (6, 5, 3)]:
        disc(g, tx + dx, ty + dy, r, ['#c8c0bc', '#9a908c', '#6e6662'])
    for i in range(6):
        a = i * 2 * math.pi / 6
        blob(g, tx + math.cos(a) * 14, ty + math.sin(a) * 14 * SQ, 1, i)
    small, _ = verona_frame(ch, 10); place(f, small); out.append((f, 130))
    small, _ = verona_frame(ch, 25); f = new(); place(f, small); out.append((f, 150))
    return out


# ---------- 엘린 ----------
def elin_char():
    return A.char('green_archer', (0, 5), mirror=False)


def elin_frame(ch, deg, pull=0, nocked=True, hdx=0, hdy=0, bdx=0, free=None):
    """활 각도 deg(시계 방향 +, 45 = 위왼쪽을 겨눔) · 시위 당김 pull · 화살 걸림 여부"""
    hand = A.HAND['bow']
    a = math.radians(deg)
    n = (math.cos(a), math.sin(a))
    u = (-n[0], -n[1])   # 활이 겨누는 쪽 (배 쪽)
    def after(c, x, y):
        g = ImageDraw.Draw(c)
        top, bot = A.bow_tips(deg, x, y)
        mx, my = (top[0] + bot[0]) / 2 + n[0] * pull, (top[1] + bot[1]) / 2 + n[1] * pull
        g.line([top, (mx, my)], fill=(238, 246, 255, 255)); g.line([(mx, my), bot], fill=(238, 246, 255, 255))
        if nocked:
            arrow(g, mx + u[0] * 9, my + u[1] * 9, u[0], u[1], n=10)
        after.mid = (mx, my)
    after.mid = None
    def hands(hx, hy):
        top, bot = A.bow_tips(deg, hx, hy)
        mx, my = (top[0] + bot[0]) / 2 + n[0] * pull, (top[1] + bot[1]) / 2 + n[1] * pull
        second = free if free else (round(mx), round(my))
        return [(hx, hy, 'top'), (second[0], second[1], 'top')]
    return A.compose(A.pose(ch['img'], hdx, hdy), 'bow', deg, hand, bdx, extra_after=after, ch=ch, hands=hands)


def bow_point(deg, pull=0):
    """시위 가운데(화살이 떠나는 점)의 큰 판 좌표와 겨누는 방향"""
    hand = A.HAND['bow']
    x, y = A.OX + hand[0], A.OY + hand[1]
    top, bot = A.bow_tips(deg, x, y)
    a = math.radians(deg)
    n = (math.cos(a), math.sin(a))
    return (BX + (top[0] + bot[0]) / 2 + n[0] * pull, BY + (top[1] + bot[1]) / 2 + n[1] * pull), (-n[0], -n[1])


def elin_rain(ch):
    """잎사귀 화살비 (Lv3, 탑뷰): 목표 쪽 하늘로 쏘아 올림 → 목표 지점에 초록 원이 생기고 화살이 위에서 꽂히며 잎사귀가 흩날림"""
    out = []
    tx, ty = TARGET
    aim = 35   # 왼쪽 위를 겨눔
    for deg, pull, hd, ms in [(15, 2, 0, 80), (aim, 4, 1, 110), (aim, 6, 1, 170)]:
        f = new()
        place(f, elin_frame(ch, deg, pull, True, hdx=1, hdy=hd))
        if pull == 6:
            (mx, my), u = bow_point(deg, pull)
            A.spark(f, round(mx + u[0] * 10), round(my + u[1] * 10), 1)
        out.append((f, ms))
    (mx, my), u = bow_point(aim, 0)
    for k, ms in enumerate([40, 60]):   # 쏘아 올린 화살이 목표 쪽으로 날아가며 작아진다
        f = new(); g = ImageDraw.Draw(f)
        place(f, elin_frame(ch, aim, -2 if k == 0 else 1, False, hdx=-1 if k == 0 else 0))
        d = 14 + k * 16
        arrow(g, mx + u[0] * d, my + u[1] * d, u[0], u[1], n=10 - k * 3)
        out.append((f, ms))
    rnd = random.Random(7)
    pts = [(tx + rnd.uniform(-14, 14), ty + rnd.uniform(-11, 11)) for _ in range(14)]
    for k in range(5):   # 목표 원 + 위에서 꽂히는 화살 (그림자 → 화살 → 꽂힘)
        f = new(); g = ImageDraw.Draw(f)
        gcircle(g, tx, ty, 17, LEAF[2], 1 if k < 4 else 2)
        for i, (x, y) in enumerate(pts):
            phase = k - i % 4
            if phase < 0:
                continue
            if phase == 0:   # 떨어지는 중: 그림자 + 위에서 내려오는 화살
                px(g, x, y, (43, 29, 47, 120))
                arrow(g, x, y - 5, 0, 1, n=5)
            else:            # 꽂힌 화살 (위에서 본 깃) + 흙먼지
                px(g, x, y, '#9a6235'); px(g, x, y - 1, LEAF[1])
                if phase == 1:
                    px(g, x - 2, y, '#c8a070'); px(g, x + 2, y, '#c8a070'); px(g, x, y + 2, '#c8a070')
            if i % 3 == 0:   # 흩날리는 잎사귀
                a = i + k * 0.9
                px(g, x + math.cos(a) * 6, y + math.sin(a) * 4 - k, LEAF[1 + (i % 2)])
        place(f, elin_frame(ch, aim - k * 10, 0, False))
        out.append((f, 70))
    f = new(); g = ImageDraw.Draw(f)
    for i, (x, y) in enumerate(pts):
        px(g, x, y, '#9a6235'); px(g, x, y - 1, LEAF[1])
    place(f, elin_frame(ch, -30, 0, False, free=(A.OX + A.ELIN_FREE_X, A.OY + 21)))
    out.append((f, 150))
    return out


def elin_volley(ch):
    """숲의 일제 사격 (Lv5, 탑뷰): 목표 쪽으로 빠르게 세 번, 한 번에 세 대씩 부채꼴로 바닥 위를 날아감 → 목표에서 잎사귀 회오리"""
    out = []
    tx, ty = TARGET
    aim = 20
    (mx, my), u = bow_point(aim, 0)
    base = math.atan2(ty - my, tx - mx)
    for shot in range(3):
        for pull, ms in ([(3, 70), (6, 110)] if shot == 0 else [(5, 60)]):
            f = new(); place(f, elin_frame(ch, aim, pull, True, hdx=1, hdy=1)); out.append((f, ms))
        for k, ms in enumerate([40, 50]):
            f = new(); g = ImageDraw.Draw(f)
            place(f, elin_frame(ch, aim, -2 if k == 0 else 0, False, hdx=-1 if k == 0 else 0))
            d = 12 + k * 16
            for da in (-0.2, 0, 0.2):
                a = base + da
                dx, dy = math.cos(a), math.sin(a)
                ax, ay = mx + dx * d, my + dy * d
                arrow(g, ax, ay, dx, dy, n=9, fl=LEAF[1])
                g.line([(ax - dx * 9, ay - dy * 9), (ax - dx * 14, ay - dy * 14)], fill=rgba(LEAF[0]))
            out.append((f, ms))
    for k in range(3):   # 목표 지점에서 도는 잎사귀 회오리 (위에서 본 소용돌이)
        f = new(); g = ImageDraw.Draw(f)
        for i in range(18):
            a = i * 0.7 + k * 0.9
            r = 2 + i * 0.8
            px(g, tx + math.cos(a) * r, ty + math.sin(a) * r * SQ, LEAF[1 + (i % 3)])
        gcircle(g, tx, ty, 16 + k * 2, LEAF[2])
        A.spark(f, round(tx), round(ty), 2 if k < 2 else 1)
        place(f, elin_frame(ch, aim if k < 2 else 0, 0, False))
        out.append((f, 80))
    f = new(); place(f, elin_frame(ch, -30, 0, False, free=(A.OX + A.ELIN_FREE_X, A.OY + 21))); out.append((f, 150))
    return out


def build():
    k, v, e = kaira_char(), verona_char(), elin_char()
    return [
        {'who': '카이라', 'name': '화염 회전 베기', 'lv': 'Lv5', 'desc': '칼에 불이 붙고 제자리 한 바퀴 → 발밑 불의 원이 사방으로 터짐', 'frames': kaira_spin(k)},
        {'who': '카이라', 'name': '전투의 함성', 'lv': 'Lv4', 'desc': '칼을 치켜들고 외침 → 붉은 기운이 주변 8칸을 덮고 칸마다 금색 화살표', 'frames': kaira_cry(k)},
        {'who': '베로나', 'name': '화염 고리', 'lv': 'Lv3', 'desc': '지팡이를 번쩍 → 발밑에서 불의 원이 사방으로 넓어짐', 'frames': verona_ring(v)},
        {'who': '베로나', 'name': '메테오', 'lv': 'Lv5', 'desc': '목표에 경고 원 → 그림자가 커지며 운석이 위에서 낙하 → 원형 충격파·파편·그을음', 'frames': verona_meteor(v)},
        {'who': '엘린', 'name': '잎사귀 화살비', 'lv': 'Lv3', 'desc': '목표 쪽 하늘로 쏘아 올림 → 목표 원 안에 화살이 위에서 꽂힘', 'frames': elin_rain(e)},
        {'who': '엘린', 'name': '숲의 일제 사격', 'lv': 'Lv5', 'desc': '목표 쪽으로 빠르게 세 번, 한 번에 세 대씩 부채꼴 → 잎사귀 소용돌이', 'frames': elin_volley(e)},
    ]


def strip_uri(frames):
    s = Image.new('RGBA', (BW * len(frames), BH), (0, 0, 0, 0))
    for i, (f, _) in enumerate(frames):
        s.alpha_composite(f, (i * BW, 0))
    b = io.BytesIO(); s.save(b, 'PNG')
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


if __name__ == '__main__':
    sk = build()
    json.dump({'W': BW, 'H': BH, 'tile': TILE, 'body': BODY, 'skills': [{'who': s['who'], 'name': s['name'], 'lv': s['lv'], 'desc': s['desc'], 'ms': [m for _, m in s['frames']], 'src': strip_uri(s['frames'])} for s in sk]},
              open(os.path.join(OUT, 'skills.json'), 'w'))
    # 프레임 펼친 그림 (확인용)
    z = 3
    rows = []
    for s in sk:
        n = len(s['frames'])
        r = Image.new('RGB', (BW * z * min(n, 8), BH * z * ((n + 7) // 8)), '#f6f1e4')
        for i, (f, _) in enumerate(s['frames']):
            b = f.resize((BW * z, BH * z), Image.NEAREST)
            r.paste(b, ((i % 8) * BW * z, (i // 8) * BH * z), b)
        rows.append(r)
    for i, r in enumerate(rows):
        r.save(os.path.join(OUT, f'skills-{i}.png'))
    print('ok', [(s['name'], len(s['frames'])) for s in sk])
