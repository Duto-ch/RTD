"""스킬 동작 시안 (2026-11-18): 카이라 · 베로나 · 엘린 — 캐릭터마다 스킬 2개
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
BW, BH = 112, 64          # 큰 판
BX, BY = 52, 28           # 캐릭터 판(56x32)을 놓는 자리
BODY = (BX + A.OX + 11.5, BY + A.OY + 17.5)   # 몸통 가운데 (큰 판 좌표)
GROUND = BY + A.OY + 23                     # 발밑 줄

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
    """화염 회전 베기 (Lv5): 칼에 불이 붙고 → 한 바퀴 회전(불꽃 잔상) → 발밑 불의 고리가 터지며 불기둥"""
    out = []
    hand = A.HAND['sword']
    cx, cy = BODY[0], GROUND
    # 1~2 예비: 칼을 뒤로 젖히고 불이 붙는다
    for k, (deg, ms) in enumerate([(-50, 110), (-65, 170)]):
        f = new(); g = ImageDraw.Draw(f)
        place(f, kaira_frame(ch, deg, hdx=-1, hdy=1, bdx=-1))
        tx, ty = tip_final(ch, 'sword', deg, hand, -1)
        for j in range(3 + k * 3):  # 칼 쪽으로 모이는 불티
            a = j * 2.1 + k
            r = 10 - k * 4
            px(g, tx + math.cos(a) * r, ty + math.sin(a) * r, FIRE[1])
        flame(g, tx, ty + 2, 3 + k * 2, k)
        out.append((f, ms))
    # 3~8 회전: 한 바퀴 돌며 불꽃 잔상 + 발밑 불의 고리가 커진다
    spin = [10, 80, 150, 220, 290, 360 + 40]
    prev = -65
    for k, deg in enumerate(spin):
        f = new(); g = ImageDraw.Draw(f)
        rx = 8 + k * 5
        ell(g, cx, cy, rx, max(2, rx // 4), FIRE[3])
        ell(g, cx, cy - 1, rx - 2, max(1, rx // 4 - 1), FIRE[2])
        sm = [prev + (deg - prev) * t for t in (0.25, 0.5, 0.75)]
        place(f, kaira_frame(ch, deg, hdx=1 if k % 2 else 0, hdy=-1 if k in (2, 3) else 0, smear=sm))
        tx, ty = tip_final(ch, 'sword', deg, hand)
        flame(g, tx, ty + 2, 4, k)
        out.append((f, 45))
        prev = deg
    # 9 마무리: 불의 고리가 터지며 둘레에 불기둥 + 섬광
    f = new(); g = ImageDraw.Draw(f)
    ell(g, cx, cy, 42, 10, FIRE[3], 2); ell(g, cx, cy, 38, 8, FIRE[1])
    for i in range(10):
        a = i * 2 * math.pi / 10
        flame(g, cx + math.cos(a) * 40, cy + math.sin(a) * 10, 7 + (i % 3) * 2, i)
    place(f, kaira_frame(ch, 110, hdx=1, bdx=1))
    tx, ty = tip_final(ch, 'sword', 110, hand, 1)
    A.spark(f, round(tx), round(ty), 3)
    out.append((f, 170))
    # 10 불기둥이 잦아들고 불티가 오른다
    f = new(); g = ImageDraw.Draw(f)
    ell(g, cx, cy, 46, 11, FIRE[3])
    for i in range(10):
        a = i * 2 * math.pi / 10 + 0.3
        flame(g, cx + math.cos(a) * 44, cy + math.sin(a) * 11, 3, i)
        px(g, cx + math.cos(a) * 30, cy - 10 - (i % 4) * 3, FIRE[1])
    place(f, kaira_frame(ch, 90))
    out.append((f, 110))
    # 11~12 회복 → 대기 자세
    for deg, ms in [(65, 100), (45, 140)]:
        f = new(); place(f, kaira_frame(ch, deg)); out.append((f, ms))
    return out


def kaira_cry(ch):
    """전투의 함성 (Lv4): 칼을 하늘로 치켜들고 외친다 → 붉은 기운이 퍼지고 금색 화살표(공격력 증가)가 솟는다"""
    out = []
    hand = A.HAND['sword']
    cx, cy = BODY
    f = new(); place(f, kaira_frame(ch, 100, hdy=1, hand=(hand[0], hand[1] + 1))); out.append((f, 130))
    f = new(); place(f, kaira_frame(ch, 0, hdy=-1, hand=(hand[0], hand[1] - 3))); out.append((f, 70))
    for k in range(5):
        f = new(); g = ImageDraw.Draw(f)
        r = 10 + k * 9
        ell(g, cx, GROUND, r, max(3, r // 3), FIRE[3] if k < 3 else FIRE[2])
        if k < 4:
            ell(g, cx, GROUND, max(4, r - 6), max(2, r // 3 - 2), FIRE[2])
        place(f, kaira_frame(ch, 0, hdy=-1 if k < 3 else 0, hand=(hand[0], hand[1] - 3)))
        tx, ty = tip_final(ch, 'sword', 0, (hand[0], hand[1] - 3))
        A.spark(f, round(tx), round(ty), 3 if k < 2 else 2)
        hx, hy = BX + A.OX + 11, BY + A.OY + 12   # 머리 양옆 외침 줄
        if k < 3:
            for s in (-1, 1):
                g.line([(hx + s * (9 + k), hy - 2), (hx + s * (12 + k), hy - 4)], fill=rgba(GOLD[1]))
                g.line([(hx + s * (9 + k), hy + 1), (hx + s * (13 + k), hy + 1)], fill=rgba(GOLD[1]))
        for i in range(4):  # 금색 화살표가 솟는다
            ax = cx - 24 + i * 16
            ay = GROUND - 4 - k * 4 - (i % 2) * 3
            if k >= 1:
                g.polygon([(ax, ay - 3), (ax - 2, ay), (ax + 2, ay)], fill=rgba(GOLD[1]))
                px(g, ax, ay + 1, GOLD[2])
        out.append((f, [200, 110, 110, 110, 120][k]))
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
    """화염 고리 (Lv3): 지팡이를 내렸다 번쩍 들면 발밑에서 불의 고리가 퍼지며 둘레에 불꽃이 솟는다"""
    out = []
    small, _ = verona_frame(ch, 15, 2, 1); f = new(); place(f, small); out.append((f, 130))
    small, hd = verona_frame(ch, -15, -3, -1, 3); f = new(); g = ImageDraw.Draw(f); place(f, small)
    ox, oy = tip_final(ch, 'staff', -15, hd); A.spark(f, round(ox), round(oy), 3); out.append((f, 70))
    cx, cy = BODY[0], GROUND
    for k in range(5):
        f = new(); g = ImageDraw.Draw(f)
        rx = 10 + k * 9
        ry = max(3, round(rx / 3.4))
        ell(g, cx, cy, rx, ry, FIRE[3], 2); ell(g, cx, cy - 1, rx - 2, max(1, ry - 1), FIRE[1])
        n = 8 + k * 2
        for i in range(n):
            a = i * 2 * math.pi / n + k * 0.2
            flame(g, cx + math.cos(a) * rx, cy + math.sin(a) * ry, max(2, 7 - k), i + k)
        small, hd = verona_frame(ch, -15, -3, -1 if k < 2 else 0, 3)
        place(f, small)
        ox, oy = tip_final(ch, 'staff', -15, hd)
        if k < 3:
            ell(g, ox, oy, 3 + k, 3 + k, FIRE[2])
        out.append((f, 75))
    f = new(); g = ImageDraw.Draw(f)
    for i in range(16):  # 끊어지며 사라지는 고리
        a = i * 2 * math.pi / 16
        if i % 2 == 0:
            px(g, cx + math.cos(a) * 52, cy + math.sin(a) * 15, FIRE[2])
            px(g, cx + math.cos(a) * 46, cy + math.sin(a) * 13 - 4, FIRE[1])
    small, _ = verona_frame(ch, 5); place(f, small); out.append((f, 110))
    small, _ = verona_frame(ch, 25); f = new(); place(f, small); out.append((f, 150))
    return out


def verona_meteor(ch):
    """메테오 (Lv5): 지팡이를 높이 들어 하늘에 불의 문을 열고 → 운석이 왼쪽 앞에 떨어져 폭발 · 화면 흔들림 · 연기"""
    out = []
    portal = (26, 12)
    target = (26, GROUND + 1)
    for k, ms in enumerate([120, 120, 140]):
        f = new(); g = ImageDraw.Draw(f)
        small, hd = verona_frame(ch, -25, -4, -1, 4)
        if k >= 1:
            disc(g, portal[0], portal[1], 3 + k * 3, [FIRE[0], FIRE[1], FIRE[2], FIRE[3]])
            rays(g, portal[0], portal[1], 6 + k * 3, 9 + k * 3, 8, FIRE[2], k * 0.3)
        place(f, small)
        ox, oy = tip_final(ch, 'staff', -25, hd)
        A.spark(f, round(ox), round(oy), 2 + (k % 2))
        g.line([(ox, oy), (ox - 8 - k * 4, oy - 6 - k * 3)], fill=rgba(FIRE[1]))  # 하늘로 뻗는 불빛
        out.append((f, ms))
    for t in (0.3, 0.65, 1.0):   # 운석 낙하 (꼬리 불꽃)
        f = new(); g = ImageDraw.Draw(f)
        mx = portal[0] + (target[0] - portal[0]) * t
        my = portal[1] + (target[1] - portal[1]) * t - 3
        if t < 1:
            disc(g, portal[0], portal[1], 6 - t * 5, [FIRE[1], FIRE[2], FIRE[3]])
        for j in range(1, 7):
            px(g, mx - j * 0.6 + (j % 2), my - j * 2.2, FIRE[min(3, j // 2)])
            px(g, mx + 1 - j * 0.6, my - j * 2.2, FIRE[min(3, 1 + j // 2)])
        disc(g, mx, my, 4, [FIRE[0], FIRE[1], FIRE[2], '#7a2a1a'])
        small, _ = verona_frame(ch, -25, -4, 0, 4)
        place(f, small)
        out.append((f, 55))
    # 폭발 (흔들림)
    for k, (r, ms, sh) in enumerate([(8, 70, (1, 0)), (12, 80, (-1, 1)), (16, 100, (0, 0))]):
        f = new(); g = ImageDraw.Draw(f)
        cx, cy = target[0] + sh[0], target[1] - 9 + sh[1]
        if k < 2:
            disc(g, cx, cy, r, [FIRE[0], FIRE[1], FIRE[2], FIRE[3]])
            rays(g, cx, cy, r + 2, r + 6, 10, FIRE[1], k * 0.2)
        else:
            ell(g, cx, cy + 8, r + 6, 5, FIRE[3], 2)
            for i in range(9):
                a = -math.pi * (i + 1) / 10
                px(g, cx + math.cos(a) * (r + 2), cy + math.sin(a) * (r - 4), FIRE[1])
                px(g, cx + math.cos(a) * (r + 6), cy + math.sin(a) * (r), '#5a4a48')
            for i in range(5):
                flame(g, cx - 14 + i * 7, cy + 9, 5 + (i % 2) * 3, i)
        small, _ = verona_frame(ch, -5, -1)
        place(f, small, sh)
        out.append((f, ms))
    # 연기
    f = new(); g = ImageDraw.Draw(f)
    for i, (dx, dy, r) in enumerate([(-8, -6, 4), (0, -10, 5), (8, -6, 4), (-3, -14, 3), (5, -15, 3)]):
        disc(g, target[0] + dx, target[1] + dy, r, ['#c8c0bc', '#9a908c', '#6e6662'])
    for i in range(4):
        flame(g, target[0] - 10 + i * 7, target[1] + 2, 3, i)
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
    """잎사귀 화살비 (Lv3): 하늘로 크게 당겨 쏘면 → 잎사귀와 함께 화살이 왼쪽 앞에 비처럼 쏟아진다"""
    out = []
    for deg, pull, hd, ms in [(20, 2, 0, 80), (45, 4, 1, 110), (45, 6, 1, 170)]:
        f = new(); g = ImageDraw.Draw(f)
        place(f, elin_frame(ch, deg, pull, True, hdx=1, hdy=hd))
        if pull == 6:
            (mx, my), u = bow_point(deg, pull)
            A.spark(f, round(mx + u[0] * 10), round(my + u[1] * 10), 1)
        out.append((f, ms))
    (mx, my), u = bow_point(45, 0)
    for k, ms in enumerate([40, 60]):   # 발사: 화살이 하늘로
        f = new(); g = ImageDraw.Draw(f)
        place(f, elin_frame(ch, 45, -2 if k == 0 else 1, False, hdx=-1 if k == 0 else 0))
        d = 14 + k * 18
        arrow(g, mx + u[0] * d, my + u[1] * d, u[0], u[1], n=10)
        g.line([(mx + u[0] * (d - 10), my + u[1] * (d - 10)), (mx + u[0] * (d - 18), my + u[1] * (d - 18))], fill=rgba(LEAF[1]))
        out.append((f, ms))
    rnd = random.Random(7)
    drops = [(rnd.uniform(4, 50), rnd.uniform(-30, 0)) for _ in range(16)]
    for k in range(5):   # 화살비
        f = new(); g = ImageDraw.Draw(f)
        for i, (x0, y0) in enumerate(drops):
            y = y0 + k * 16 + (i % 3) * 4
            x = x0 - k * 4
            if y < 0:
                continue
            if y >= GROUND - 2:   # 땅에 꽂힘 + 흙먼지
                arrow(g, x, GROUND - 1, -0.25, 1, n=5)
                px(g, x - 2, GROUND, '#c8a070'); px(g, x + 2, GROUND, '#c8a070')
            else:
                arrow(g, x, y, -0.25, 1, n=7)
            if i % 3 == 0 and y < GROUND - 4:   # 잎사귀
                px(g, x + 3, y - 5, LEAF[1]); px(g, x + 4, y - 5, LEAF[2])
        place(f, elin_frame(ch, 30 - k * 12, 0, False))
        out.append((f, 70))
    f = new(); g = ImageDraw.Draw(f)
    for i, (x0, _) in enumerate(drops[:10]):
        x = x0 - 18
        arrow(g, x, GROUND - 1, -0.25, 1, n=5)
        px(g, x + 2, GROUND - 3 - (i % 3), LEAF[(i % 2) + 1])
    place(f, elin_frame(ch, -30, 0, False, free=(A.OX + A.ELIN_FREE_X, A.OY + 21)))
    out.append((f, 150))
    return out


def elin_volley(ch):
    """숲의 일제 사격 (Lv5): 빠르게 세 번 — 한 번에 화살 세 대가 부채꼴로 · 마지막엔 잎사귀 회오리"""
    out = []
    (mx, my), u = bow_point(0, 0)
    for shot in range(3):
        quick = shot > 0
        for pull, ms in ([(3, 70), (6, 110)] if not quick else [(5, 60)]):
            f = new(); place(f, elin_frame(ch, 0, pull, True, hdx=1, hdy=1)); out.append((f, ms))
        for k, ms in enumerate([40, 50]):
            f = new(); g = ImageDraw.Draw(f)
            place(f, elin_frame(ch, 0, -2 if k == 0 else 0, False, hdx=-1 if k == 0 else 0, bdx=1 if k == 0 else 0))
            d = 14 + k * 16
            for ang in (-0.22, 0, 0.22):
                dx, dy = -math.cos(ang), math.sin(ang)
                ax, ay = mx + dx * d, my + dy * d
                arrow(g, ax, ay, dx, dy, n=9, fl=LEAF[1])
                g.line([(ax - dx * 9, ay - dy * 9), (ax - dx * 15, ay - dy * 15)], fill=rgba(LEAF[0]))
            out.append((f, ms))
    for k in range(3):   # 마지막: 잎사귀 회오리가 앞으로
        f = new(); g = ImageDraw.Draw(f)
        cx, cy = mx - 22 - k * 8, my
        for i in range(12):
            a = i * 2 * math.pi / 12 + k * 0.7
            r = 4 + k * 3 + (i % 3)
            px(g, cx + math.cos(a) * r, cy + math.sin(a) * r * 0.7, LEAF[1 + (i % 3)])
        A.spark(f, round(cx), round(cy), 2 if k < 2 else 1)
        place(f, elin_frame(ch, 0 if k < 2 else -15, 0, False))
        out.append((f, 80))
    f = new(); place(f, elin_frame(ch, -30, 0, False, free=(A.OX + A.ELIN_FREE_X, A.OY + 21))); out.append((f, 150))
    return out


def build():
    k, v, e = kaira_char(), verona_char(), elin_char()
    return [
        {'who': '카이라', 'name': '화염 회전 베기', 'lv': 'Lv5', 'desc': '칼에 불이 붙고 한 바퀴 회전 → 발밑 불의 고리가 터지며 불기둥', 'frames': kaira_spin(k)},
        {'who': '카이라', 'name': '전투의 함성', 'lv': 'Lv4', 'desc': '칼을 치켜들고 외침 → 붉은 기운이 퍼지고 금색 화살표(공격력 증가)', 'frames': kaira_cry(k)},
        {'who': '베로나', 'name': '화염 고리', 'lv': 'Lv3', 'desc': '지팡이를 번쩍 → 발밑에서 불의 고리가 퍼지며 둘레에 불꽃', 'frames': verona_ring(v)},
        {'who': '베로나', 'name': '메테오', 'lv': 'Lv5', 'desc': '하늘에 불의 문 → 운석 낙하 → 폭발·흔들림·연기', 'frames': verona_meteor(v)},
        {'who': '엘린', 'name': '잎사귀 화살비', 'lv': 'Lv3', 'desc': '하늘로 크게 쏘면 잎사귀와 함께 화살이 비처럼 쏟아짐', 'frames': elin_rain(e)},
        {'who': '엘린', 'name': '숲의 일제 사격', 'lv': 'Lv5', 'desc': '빠르게 세 번, 한 번에 세 대씩 부채꼴 → 잎사귀 회오리', 'frames': elin_volley(e)},
    ]


def strip_uri(frames):
    s = Image.new('RGBA', (BW * len(frames), BH), (0, 0, 0, 0))
    for i, (f, _) in enumerate(frames):
        s.alpha_composite(f, (i * BW, 0))
    b = io.BytesIO(); s.save(b, 'PNG')
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


if __name__ == '__main__':
    sk = build()
    json.dump({'W': BW, 'H': BH, 'skills': [{'who': s['who'], 'name': s['name'], 'lv': s['lv'], 'desc': s['desc'], 'ms': [m for _, m in s['frames']], 'src': strip_uri(s['frames'])} for s in sk]},
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
