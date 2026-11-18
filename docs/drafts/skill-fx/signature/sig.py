# 레어·유니크 전용 스킬 이펙트 (2026-11-18) — 캐릭터 상징(motifs.py) × 스킬 모양별 연출 × 같은 모양이면 다른 변형
# 규칙: 탑뷰 · 셀 카툰(2도트 이상) · 16비트 · 색 외곽선 · 레어 5색 / 유니크 6색(강조색) · 바닥 부분은 back 레이어
import json, math, os, random, subprocess, sys
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from motifs import M, UNIQUE_ACCENT
SQ = 0.82
def snap(v): return round(v * 31 / 255) * 255 // 31
def P(h): return tuple(snap(int(h[i:i + 2], 16)) for i in (1, 3, 5))
RAMP = {'red': ['#9c2622', '#d8432f', '#f58a3a', '#ffd25a', '#fff8d0'], 'blue': ['#1c3a80', '#2f6fd0', '#5aa8ff', '#a8dcff', '#f2fbff'],
        'green': ['#1e5a2a', '#3a8f3a', '#6fc84a', '#c4ee84', '#f6ffe0']}

class Ctx:
    def __init__(s, ch, W, H, cx, cy):
        r = [P(c) for c in RAMP[ch['attr']]]
        s.rim, s.cmap = r[0], {'d': r[1], 'b': r[2], 'l': r[3], 'h': r[4]}
        s.uni = ch['grade'] == 4
        s.cmap['a'] = P(UNIQUE_ACCENT[ch['id']]) if s.uni else r[4]
        s.dk, s.base, s.light, s.hi, s.acc = r[1], r[2], r[3], r[4], s.cmap['a']
        s.motif = M[ch['id']]; s.W, s.H, s.cx, s.cy = W, H, cx, cy
    def new(s):
        s.back = Image.new('RGBA', (s.W, s.H)); s.front = Image.new('RGBA', (s.W, s.H))
        s.db, s.df = ImageDraw.Draw(s.back), ImageDraw.Draw(s.front); s.d = s.df; s.img = s.front; s.used_back = False
    def layer(s, w):
        if w == 'back': s.d, s.img, s.used_back = s.db, s.back, True
        else: s.d, s.img = s.df, s.front
    def oval(s, r, fill, width=None, x=None, y=None):
        x = s.cx if x is None else x; y = s.cy if y is None else y
        b = [x - r, y - r * SQ, x + r, y + r * SQ]
        (s.d.ellipse(b, outline=fill, width=width) if width else s.d.ellipse(b, fill=fill))
    def sq(s, x, y, n, c): s.d.rectangle([round(x) - n // 2, round(y) - n // 2, round(x) - n // 2 + n - 1, round(y) - n // 2 + n - 1], fill=c)
    def star(s, x, y, r, c):
        pts = [(x + math.cos(k * math.pi / 4 - math.pi / 2) * (r if k % 2 == 0 else max(1.2, r * 0.35)), y + math.sin(k * math.pi / 4 - math.pi / 2) * (r if k % 2 == 0 else max(1.2, r * 0.35))) for k in range(8)]
        s.d.polygon(pts, fill=c)
    def stamp(s, x, y, k=1, flip=False, mono=None):
        """상징 찍기 — k 배율(유니크 2배), 가운데 기준"""
        m = s.motif; h = len(m); w = max(len(r) for r in m)
        x0 = round(x - w * k / 2); y0 = round(y - h * k / 2); p = s.img.load()
        for j, row in enumerate(m):
            for i, c in enumerate(row):
                if c == '.': continue
                col = mono or s.cmap[c]; ii = (w - 1 - i) if flip else i
                for dy in range(k):
                    for dx in range(k):
                        X, Y = x0 + ii * k + dx, y0 + j * k + dy
                        if 0 <= X < s.W and 0 <= Y < s.H: p[X, Y] = col + (255,)
    def _rim(s, img):
        p = img.load(); out = img.copy(); o = out.load()
        for y in range(s.H):
            for x in range(s.W):
                if p[x, y][3]: continue
                if any(0 <= x + dx < s.W and 0 <= y + dy < s.H and p[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): o[x, y] = s.rim + (255,)
        return out
    def done(s): return (s._rim(s.back) if s.used_back else None, s._rim(s.front))

def K(c): return 2                      # 상징 크기 (2배 = 14도트, 화면 28px)

# ── 연출: 대상 (single / multi / execute) — 상징이 날아와 박힌 뒤 변형마다 다르게 터진다 ──
#   변형 0: 수직 낙하 → 작은 상징 4개로 갈라져 흩어짐
#   변형 1: 비스듬히 날아옴 → 상징 고리가 돌며 퍼짐
#   변형 2: 회전하며 내려옴 → 상징이 위로 쌓이는 기둥
def target_fx(ch, sk, v):
    c = Ctx(ch, 56, 64, 28, 46); F = []; n = 11 if not c.uni else 14; fx = sk.get('fx') or {}; ex = 'execute' in fx
    land = 4 if not c.uni else 5; big = K(c) + (1 if (ex or c.uni) else 0)
    for f in range(n):
        c.new()
        if f < land:
            r = land - f
            if v == 0: c.stamp(28, 46 - r * 9, big)
            elif v == 1: c.stamp(28 - r * 7, 46 - r * 6, big); c.sq(28 - r * 7 - 6, 46 - r * 6 - 4, 2, c.light)
            else: c.stamp(28 + (r % 2) * 4 - 2, 46 - r * 8, big, flip=bool(r % 2))
        else:
            k = f - land; last = n - land - 1
            c.layer('back')
            if k < 3: c.oval(5 + k * 4 + (3 if c.uni else 0), c.light if k == 0 else c.base, width=2)
            c.layer('front')
            if k == 0: c.stamp(28, 46, big)
            elif v == 0 and k < last:
                for i in range(4 if not c.uni else 6):
                    ang = i * 2 * math.pi / (4 if not c.uni else 6) + 0.6; d = 4 + k * 4
                    c.stamp(28 + math.cos(ang) * d, 46 + math.sin(ang) * d * SQ - k, 1)
            elif v == 1 and k < last:
                rr = 6 + k * 3
                for i in range(5 if not c.uni else 7):
                    ang = i * 2 * math.pi / (5 if not c.uni else 7) + k * 0.5
                    c.stamp(28 + math.cos(ang) * rr, 46 + math.sin(ang) * rr * SQ, 1)
            elif v == 2 and k < last:
                for j in range(min(k, 4)): c.stamp(28, 44 - j * 8, 1 if j else 2)
            if ex and k < 3: c.d.line([18, 36, 38, 56], fill=c.hi, width=3); c.d.line([38, 36, 18, 56], fill=c.hi, width=3)
            if fx.get('vuln') and 1 <= k < last: c.d.line([22, 34, 27, 40, 24, 44, 30, 50], fill=c.dk, width=2)
            if fx.get('dot') and 1 <= k < last and k % 2: c.sq(22 + k * 2, 50 - k * 3, 3, c.light)
            if fx.get('stun') and 2 <= k < last:
                for i in range(3): c.star(28 + math.cos(k * 0.8 + i * 2.1) * 9, 30 + math.sin(k * 0.8 + i * 2.1) * 3, 3, c.acc if c.uni else c.hi)
            if c.uni and 1 <= k < last and k % 2: c.star(28 + (k % 4) * 6 - 9, 26, 3, c.acc)
        F.append(c.done())
    return 'target', F, [60] * land + [60, 70, 70] + [80] * (n - land - 3), (28, 46)

# ── 연출: 원형 (circle) — 변형 0 폭발 고리 · 1 상징 비 · 2 소용돌이 ──
def circle_fx(ch, sk, v):
    U = Ctx(ch, 1, 1, 0, 0).uni
    W, H = (96, 88) if U else (80, 72); c = Ctx(ch, W, H, W // 2, H // 2 + 2); F = []; n = 11 if not U else 15
    R = 32 if U else 26; fx = sk.get('fx') or {}; rnd = random.Random(hash(ch['id']) % 1000 + v)
    drops = [(rnd.uniform(-R * 0.8, R * 0.8), rnd.uniform(-R * 0.6, R * 0.6), rnd.randint(0, 4)) for _ in range(7 if not U else 10)]
    for f in range(n):
        c.new(); t = f / (n - 1)
        # 바닥: 효과에 따라 남는 자국 (몬스터 발밑)
        c.layer('back')
        if fx.get('dot') and f >= 3: c.oval(R * min(1, (f - 2) / 3) * (0.9 if f < n - 2 else 0.6), c.dk); c.oval(R * 0.55 * min(1, (f - 2) / 3), c.base)
        if fx.get('slow') and f >= 2: c.oval(R * 0.95, c.light, width=2); c.oval(R * 0.6, c.base, width=2)
        c.layer('front')
        if v == 0:   # 폭발 고리: 상징이 둥글게 퍼짐
            r = 6 + (R - 6) * min(1, f / (n * 0.6))
            if f < n - 2: c.oval(r, c.base if f > 2 else c.light, width=3)
            if f < 3: c.oval(10 - f * 3, c.hi)
            for i in range(6 if not U else 8):
                ang = i * 2 * math.pi / (6 if not U else 8) + f * 0.08
                if 1 <= f < n - 2: c.stamp(c.cx + math.cos(ang) * r, c.cy + math.sin(ang) * r * SQ, K(c) if f < n - 4 else 1)
        elif v == 1:  # 상징 비: 범위 안 여러 곳에 내리꽂힘
            for (dx, dy, ph) in drops:
                k = f - ph
                if 0 <= k < 3: c.stamp(c.cx + dx, c.cy + dy - (3 - k) * 7, K(c))
                elif 3 <= k < 6: c.oval(3 + (k - 3) * 3, c.light if k == 3 else c.base, width=2, x=c.cx + dx, y=c.cy + dy)
            if f < n - 1: c.oval(R, c.base if f % 2 else c.light, width=2)
        else:          # 소용돌이: 상징이 안으로 말려 들어갔다 터짐
            if f < n * 0.6:
                for i in range(5 if not U else 7):
                    ang = i * 2 * math.pi / (5 if not U else 7) + f * 0.55; rr = R * (1 - f / (n * 0.6))
                    c.stamp(c.cx + math.cos(ang) * rr, c.cy + math.sin(ang) * rr * SQ, K(c))
            else:
                k = f - int(n * 0.6); c.oval(6 + k * 7, c.light if k < 2 else c.base, width=3)
                if k < 2: c.star(c.cx, c.cy, 10 if U else 8, c.hi)
        if fx.get('stun') and f >= n * 0.5 and f < n - 1:
            for i in range(3):
                ang = f * 0.7 + i * 2.09; c.star(c.cx + math.cos(ang) * 10, c.cy - 12 + math.sin(ang) * 4, 3, c.acc if U else c.hi)
        if fx.get('vuln') and f >= n * 0.5 and f < n - 1:
            c.d.line([c.cx - 6, c.cy - 10, c.cx, c.cy - 4, c.cx - 3, c.cy, c.cx + 4, c.cy + 6], fill=c.dk, width=2)
        if fx.get('push') and 2 <= f < n - 1:
            for i in range(8):
                ang = i * math.pi / 4; d = 8 + f * 3; x = c.cx + math.cos(ang) * d; y = c.cy + math.sin(ang) * d * SQ
                c.d.polygon([(x + math.cos(ang) * 4, y + math.sin(ang) * 4 * SQ), (x - math.sin(ang) * 3, y + math.cos(ang) * 3), (x + math.sin(ang) * 3, y - math.cos(ang) * 3)], fill=c.light)
        if U and f % 3 == 1 and f < n - 1: c.star(c.cx + ((f * 13) % 30) - 15, c.cy - R * 0.6, 3, c.acc)
        F.append(c.done())
    return 'center', F, [50, 50, 60] + [70] * (n - 6) + [90, 100, 110], (W // 2, H // 2 + 2)

# ── 연출: 사거리 전체 (range) — 변형 0 상징 폭우 · 1 거대 상징 낙하 · 2 회전 고리 ──
def range_fx(ch, sk, v):
    U = Ctx(ch, 1, 1, 0, 0).uni
    W, H = (128, 112) if U else (112, 96); c = Ctx(ch, W, H, W // 2, H // 2); F = []; n = 12 if not U else 16; R = 50 if U else 42
    fx = sk.get('fx') or {}; rnd = random.Random(hash(ch['id']) % 777 + 7 * v)
    drops = [(rnd.uniform(-R, R), rnd.uniform(-R * 0.75, R * 0.75), rnd.randint(0, n - 6)) for _ in range(12 if not U else 18)]
    for f in range(n):
        c.new()
        c.layer('back')
        if f < n - 1: c.oval(R, c.base if f % 3 else c.light, width=2)
        if fx.get('dot') and f > 3: c.oval(R * 0.5, c.dk)
        c.layer('front')
        if v == 0:
            for (dx, dy, ph) in drops:
                k = f - ph
                if 0 <= k < 3: c.stamp(c.cx + dx, c.cy + dy - (3 - k) * 8, K(c))
                elif 3 <= k < 5: c.oval(3 + (k - 3) * 4, c.light, width=2, x=c.cx + dx, y=c.cy + dy)
        elif v == 1:
            if f < 5: c.stamp(c.cx, c.cy - (5 - f) * 10, 4 if U else 3)
            else:
                k = f - 5
                if k < 6: c.oval(8 + k * 8, c.light if k < 2 else c.base, width=3)
                if k < 2: c.star(c.cx, c.cy, 14 if U else 11, c.hi)
                for i in range(8 if U else 6):
                    ang = i * 2 * math.pi / (8 if U else 6); d = 8 + k * 6
                    if k < 6: c.stamp(c.cx + math.cos(ang) * d, c.cy + math.sin(ang) * d * SQ - k, K(c))
        else:
            for i in range(10 if U else 8):
                ang = i * 2 * math.pi / (10 if U else 8) + f * 0.35; rr = R * min(1, 0.3 + f / 6)
                if f < n - 1: c.stamp(c.cx + math.cos(ang) * rr, c.cy + math.sin(ang) * rr * SQ, K(c))
        if fx.get('stun') and f > n // 2 and f < n - 1:
            for i in range(4): c.star(c.cx + math.cos(f * 0.6 + i * 1.57) * 16, c.cy - 16 + math.sin(f * 0.6 + i * 1.57) * 5, 3, c.acc if U else c.hi)
        if fx.get('push') and 2 <= f < n - 1:
            for i in range(10):
                ang = i * math.pi / 5; d = 12 + f * 3.4; x = c.cx + math.cos(ang) * d; y = c.cy + math.sin(ang) * d * SQ
                c.d.polygon([(x + math.cos(ang) * 4, y + math.sin(ang) * 4 * SQ), (x - math.sin(ang) * 3, y + math.cos(ang) * 3), (x + math.sin(ang) * 3, y - math.cos(ang) * 3)], fill=c.light)
        if fx.get('vuln') and f > n // 2 and f < n - 1: c.d.line([c.cx - 10, c.cy - 8, c.cx - 2, c.cy, c.cx - 5, c.cy + 4, c.cx + 6, c.cy + 10], fill=c.dk, width=2)
        if U and f % 2 == 0 and f < n - 1: c.star(c.cx + math.cos(f) * R * 0.7, c.cy + math.sin(f) * R * 0.5, 3, c.acc)
        F.append(c.done())
    return 'self_area', F, [50, 50] + [70] * (n - 4) + [100, 120], (W // 2, H // 2)

# ── 연출: 연쇄 (chain) — 상징이 대상 사이를 잇는 한 마디 (가로 64도트를 늘려 씀) ──
def chain_fx(ch, sk, v):
    c = Ctx(ch, 76, 28, 6, 14); F = []; n = 7 if not c.uni else 9; rnd = random.Random(hash(ch['id']) % 99)
    for f in range(n):
        c.new()
        if f < n - 1:
            pts = [(6, 14)] + [(6 + i * 8, 14 + rnd.randint(-5, 5)) for i in range(1, 8)] + [(70, 14)]
            c.d.line(pts, fill=c.base if f > 2 else c.light, width=4); c.d.line(pts, fill=c.hi, width=2)
            c.stamp(6 + min(64, f * 16), 14, K(c))
            if c.uni and f % 2: c.star(38, 6, 3, c.acc)
        F.append(c.done())
    return 'chain', F, [40, 50, 50, 60, 60, 70, 80, 90, 100][:n], (6, 14)

# ── 연출: 자기 버프 ──
def self_fx(ch, sk, v):
    c = Ctx(ch, 56, 64, 28, 50); F = []; n = 10 if not c.uni else 13
    for f in range(n):
        c.new(); c.layer('back')
        if f < n - 1: c.oval(12 + (f % 2), c.base, width=2); c.oval(16, c.light, width=2) if c.uni and f % 2 else None
        c.layer('front')
        for i in range(3 if not c.uni else 5):
            ang = f * 0.5 + i * 2 * math.pi / (3 if not c.uni else 5)
            if f < n - 1: c.stamp(28 + math.cos(ang) * 14, 50 - f * 3 - 4 + math.sin(ang) * 4, 1)
        if c.uni and f in (3, 7): c.star(28, 14, 6, c.acc)
        F.append(c.done())
    return 'self', F, [70] * n, (28, 50)

# ── 연출: 주변 아군 버프 (3x3 칸) — 변형 0 물결 · 1 네 모서리 상징 ──
def adj_fx(ch, sk, v):
    c = Ctx(ch, 80, 80, 40, 40); F = []; n = 10 if not c.uni else 12; T = 24
    for f in range(n):
        c.new()
        for ty in (-1, 0, 1):
            for tx in (-1, 0, 1):
                ring = max(abs(tx), abs(ty)); k = f - ring * 2
                if k < 0 or f >= n - 1: continue
                x0 = 40 + tx * T - T // 2 + 1; y0 = 40 + ty * T - T // 2 + 1
                if k < 4: c.layer('back'); c.d.rectangle([x0, y0, x0 + T - 3, y0 + T - 3], outline=c.hi if k == 0 else c.light if k < 3 else c.base, width=2); c.layer('front')
                if 1 <= k < 6:
                    if v == 0: c.stamp(40 + tx * T, 40 + ty * T + 4 - k * 2, 1)
                    else: c.stamp(x0 + 5, y0 + 5, 1); c.stamp(x0 + T - 8, y0 + T - 8, 1, flip=True)
        if c.uni and f % 3 == 2: c.star(40, 40 - 30, 4, c.acc)
        F.append(c.done())
    return 'adj', F, [60] * n, (40, 40)

# ── 연출: 아군 전체 버프 (아군마다) — 변형 0 내려꽂힘 · 1 솟는 후광 · 2 상징 꽃가루 ──
def all_fx(ch, sk, v):
    c = Ctx(ch, 44, 72, 22, 58); F = []; n = 10 if not c.uni else 12
    for f in range(n):
        c.new(); c.layer('back')
        if 3 <= f < n - 1: c.oval(8 + (f - 3) * 1.5, c.base, width=2)
        c.layer('front')
        if v == 0:
            if f < 4: c.stamp(22, 6 + f * 13, K(c))
            elif f < n - 1: c.star(22, 58 - 8 - (f - 4) * 2, 4, c.hi)
        elif v == 1:
            if f < n - 1:
                for i in range(3): c.stamp(22 + math.cos(f * 0.5 + i * 2.09) * 12, 52 - f * 3 + math.sin(f * 0.5 + i * 2.09) * 3, 1 if not c.uni else 2)
        else:
            for i in range(6):
                k = (f + i) % 7
                if f < n - 1 and k < 5: c.sq(22 + (i - 3) * 6, 56 - k * 8, 3, c.light if k < 3 else c.base)
            if f in (2, 5): c.stamp(22, 24, K(c))
        if c.uni and f % 3 == 1 and f < n - 1: c.star(22 + (f % 2) * 12 - 6, 20, 3, c.acc)
        F.append(c.done())
    return 'ally', F, [50, 50, 60, 60] + [80] * (n - 4), (22, 58)

# ── 연출: 골드 ──
def gold_fx(ch, sk, v):
    c = Ctx(ch, 56, 56, 28, 44); F = []; n = 10 if not c.uni else 12
    G = [P('#8a5a10'), P('#d89a20'), P('#ffd23a'), P('#fff2a0')]
    for f in range(n):
        c.new()
        for i, (dx, sp) in enumerate([(-10, 1.0), (0, 1.3), (10, 0.9), (-5, 1.15), (6, 1.05)]):
            k = f / (n - 1); x = 28 + dx * k * 1.4; y = 44 - math.sin(k * math.pi) * 26 * sp
            if f < n - 1: c.d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=G[1]); c.d.ellipse([x - 2, y - 3, x + 2, y + 2], fill=G[2])
        if f in (1, 2, 6): c.stamp(28, 22, K(c), mono=G[3])   # 골드 스킬은 상징도 금색 (색 수 제한)
        F.append(c.done())
    return 'self', F, [60] * n, (28, 44)

def pick(sk):
    if sk.get('buff'):
        return {'self': self_fx, 'adjacent': adj_fx, 'all': all_fx}[sk['buff']['scope']], 'buff-' + sk['buff']['scope']
    if sk.get('area'):
        t = sk['area']['type']
        return {'single': target_fx, 'multi': target_fx, 'circle': circle_fx, 'range': range_fx, 'chain': chain_fx}[t], t
    return gold_fx, 'gold'

if __name__ == '__main__':
    roster = json.loads(subprocess.check_output(['node', '-e', "import('/home/user/rtd/src/data/roster.js').then(m=>console.log(JSON.stringify(m.ROSTER.filter(c=>c.grade>=3))))"]))
    os.makedirs(os.path.join(HERE, 'sheets'), exist_ok=True)
    index = []; seen = set()
    for ch in roster:
        used = {}
        for si, sk in enumerate(ch['skills']):
            fn, shape = pick(sk)
            v = used.get(shape, 0); used[shape] = v + 1
            v = (v + sum(map(ord, ch['id']))) % 3   # 같은 모양이라도 캐릭터·순서마다 변형이 갈림
            kind, frames, ms, (ax, ay) = fn(ch, sk, v)
            w, h = frames[0][1].size; key = f"{ch['id']}_{si}"
            entry = {'key': key, 'id': ch['id'], 'name': ch['name'], 'grade': ch['grade'], 'attr': ch['attr'], 'skill': sk['name'], 'shape': shape, 'variant': v,
                     'kind': kind, 'w': w, 'h': h, 'n': len(frames), 'ms': ms, 'ax': ax, 'ay': ay}
            cols = set()
            for li, suf in ((1, ''), (0, '_back')):
                if li == 0 and not any(fr[0] for fr in frames): continue
                sh = Image.new('RGBA', (w * len(frames), h))
                for i, fr in enumerate(frames):
                    if fr[li]: sh.paste(fr[li], (i * w, 0))
                sh.save(os.path.join(HERE, 'sheets', key + suf + '.png')); cols |= {p[:3] for p in sh.getdata() if p[3]}
                if suf: entry['back'] = True
            entry['colors'] = len(cols); index.append(entry)
            seen.add((ch['id'], shape, v))
    json.dump(index, open(os.path.join(HERE, 'index.json'), 'w'), ensure_ascii=False)
    from collections import Counter
    print(len(index), 'effects', Counter((e['grade'], e['colors']) for e in index))
    # 같은 캐릭터 안 중복(모양+변형) 검사
    dup = Counter((e['id'], e['shape'], e['variant']) for e in index); print('same-char duplicates:', [k for k, v in dup.items() if v > 1])
