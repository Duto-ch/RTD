# 커먼·언커먼 공용 스킬 이펙트 세트 (2026-11-18) — 탑뷰 · 셀 카툰 · 16비트 · 색 외곽선 · 커먼 4색 / 언커먼 5색
# 출력: sheets/<tier>_<name>_<attr>.png + index.json (프레임 크기·기준점·프레임 길이)
import json, math, os, random
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
SQ = 0.82
def snap(v): return round(v * 31 / 255) * 255 // 31
def P(*hexes): return [tuple(snap(int(h[i:i + 2], 16)) for i in (1, 3, 5)) for h in hexes]
# 속성 램프 [테두리(진함), 그늘, 기본, 밝음, 하이라이트]
RAMP = {'red': P('#9c2622', '#d8432f', '#f58a3a', '#ffd25a', '#fff8d0'),
        'blue': P('#1c3a80', '#2f6fd0', '#5aa8ff', '#a8dcff', '#f2fbff'),
        'green': P('#1e5a2a', '#3a8f3a', '#6fc84a', '#c4ee84', '#f6ffe0')}
GOLD = P('#8a5a10', '#d89a20', '#ffd23a', '#fff2a0', '#ffffff')

class Ctx:
    def __init__(s, tier, attr, W, H, cx, cy):
        s.tier, s.W, s.H, s.cx, s.cy = tier, W, H, cx, cy
        r = RAMP[attr]
        # 커먼 4색(테두리·기본·밝음·하이라이트), 언커먼 5색(+그늘)
        s.rim, s.dark, s.base, s.light, s.hi = r[0], (r[1] if tier == 2 else r[2]), r[2], r[3], r[4]
    def new(s):
        s.img = Image.new('RGBA', (s.W, s.H)); s.d = ImageDraw.Draw(s.img); return s
    def oval(s, r, fill=None, width=None, ox=0, oy=0):
        b = [s.cx + ox - r, s.cy + oy - r * SQ, s.cx + ox + r, s.cy + oy + r * SQ]
        if width: s.d.ellipse(b, outline=fill, width=width)
        else: s.d.ellipse(b, fill=fill)
    def sq(s, x, y, n, c): s.d.rectangle([round(x) - n // 2, round(y) - n // 2, round(x) - n // 2 + n - 1, round(y) - n // 2 + n - 1], fill=c)
    def star(s, x, y, r, c, core=None, pts=4, rot=0):
        poly = []
        for k in range(pts * 2):
            a = rot + k * math.pi / pts - math.pi / 2; rr = r if k % 2 == 0 else max(1, r * 0.35)
            poly.append((x + math.cos(a) * rr, y + math.sin(a) * rr))
        s.d.polygon(poly, fill=c)
        if core: s.d.rectangle([x - 1, y - 1, x, y], fill=core)
    def arrow_up(s, x, y, c, h=5):
        s.d.polygon([(x, y - h), (x - 3, y - h + 3), (x - 1, y - h + 3), (x - 1, y), (x + 0, y), (x + 0, y - h + 3), (x + 2, y - h + 3)], fill=c)
    def done(s):
        # 색 외곽선(셀아웃): 바깥 둘레를 속성 테두리색으로
        img = s.img; p = img.load(); out = img.copy(); o = out.load()
        for y in range(s.H):
            for x in range(s.W):
                if p[x, y][3]: continue
                if any(0 <= x + dx < s.W and 0 <= y + dy < s.H and p[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    o[x, y] = s.rim + (255,)
        return out

# ── 이펙트들: (ctx 만드는 크기, 프레임 함수 목록, 프레임 길이) ──
def hit(t, a):
    c = Ctx(t, a, 32, 32, 16, 16); F = []
    n = 6 if t == 1 else 8
    for f in range(n):
        c.new()
        if f == 0: c.sq(16, 16, 4, c.hi)
        elif f < (3 if t == 1 else 4):
            r = 4 + f * 2
            if t == 2: c.oval(r + 2, c.dark, width=1)
            c.star(16, 16, r, c.light, c.hi, pts=4 if t == 1 else 8, rot=0 if t == 1 else f * 0.2)
            c.star(16, 16, r * 0.55, c.hi)
        else:
            k = f - (3 if t == 1 else 4)
            for i in range(4 if t == 1 else 6):
                ang = i * 2 * math.pi / (4 if t == 1 else 6) + 0.4
                d = 6 + k * 3
                c.sq(16 + math.cos(ang) * d, 16 + math.sin(ang) * d * SQ, 2, c.light if k < 2 else c.base)
        F.append(c.done())
    return F, [40] + [50] * (n - 1), (16, 16)
def blast(t, a):
    c = Ctx(t, a, 72, 64, 36, 32); F = []; n = 8 if t == 1 else 10; R = 24 if t == 1 else 28
    for f in range(n):
        c.new()
        r = 6 + (R - 6) * min(1, f / (n - 3))
        if f < n - 1: c.oval(r, c.base if f < n - 3 else c.dark, width=3 if f < 3 else 2)
        if t == 2 and 1 <= f < n - 2: c.oval(r * 0.7, c.light, width=1)
        if f < 3:
            c.oval(10 - f * 2 if t == 1 else 12 - f * 2, c.light); c.oval(5 - f, c.hi)
        for i in range(5 if t == 1 else 8):
            ang = i * 2 * math.pi / (5 if t == 1 else 8) + 0.3
            dd = 8 + f * 3; hz = -f * (n - f) * 0.4
            if f >= 1 and f < n - 1: c.sq(36 + math.cos(ang) * dd, 32 + math.sin(ang) * dd * SQ + hz, 2 if t == 1 else 3, c.base if f > 4 else c.light)
        F.append(c.done())
    return F, [50, 50, 60, 60, 70, 80, 90, 100, 100, 100][:n], (36, 32)
def slow(t, a):
    c = Ctx(t, a, 72, 64, 36, 32); F = []; n = 9 if t == 1 else 11; rnd = random.Random(2)
    blobs = [(rnd.uniform(-12, 12), rnd.uniform(-8, 8), rnd.uniform(6, 10)) for _ in range(5 if t == 1 else 7)]
    for f in range(n):
        c.new(); g = min(1, (f + 1) / 3); fade = 1 if f < n - 3 else (n - f) / 3
        for (bx, by, br) in blobs:
            r = br * g * fade
            if r >= 1.5: c.oval(r, c.base, ox=bx, oy=by)
        for (bx, by, br) in blobs[:3]:
            r = br * g * fade * 0.45
            if r >= 1: c.oval(r, c.light, ox=bx - 2, oy=by - 2)
        if t == 2 and 2 <= f < n - 2:   # 얼음 결정 반짝임
            for i, (bx, by, _) in enumerate(blobs[:4]):
                if (f + i) % 3 == 0: c.star(36 + bx, 32 + by - 3, 3, c.hi)
        F.append(c.done())
    return F, [60, 60, 70] + [110] * (n - 6) + [90, 90, 90], (36, 32)
def stun(t, a):
    c = Ctx(t, a, 48, 48, 24, 30); F = []; n = 10 if t == 1 else 12
    for f in range(n):
        c.new()
        if f < 3: c.oval(6 + f * 5, c.light if f < 2 else c.base, width=2)
        if f >= 1:
            for i in range(3 if t == 1 else 4):
                ang = f * 0.6 + i * 2 * math.pi / (3 if t == 1 else 4)
                x = 24 + math.cos(ang) * 9; y = 16 + math.sin(ang) * 3.5
                if f < n - 1: c.star(x, y, 3 if t == 1 else 4, GOLD[2] if t == 2 else c.hi, GOLD[4] if t == 2 else None, pts=5)
        F.append(c.done())
    return F, [50, 60, 70] + [80] * (n - 3), (24, 30)
def push(t, a):
    c = Ctx(t, a, 72, 64, 36, 32); F = []; n = 7 if t == 1 else 9
    for f in range(n):
        c.new(); d0 = 8 + f * (3.6 if t == 1 else 2.9)
        if t == 2 and f < 4: c.oval(d0 - 2, c.light, width=1)
        for i in range(8 if t == 1 else 12):
            ang = i * 2 * math.pi / (8 if t == 1 else 12)
            x = 36 + math.cos(ang) * d0; y = 32 + math.sin(ang) * d0 * SQ
            ux, uy = math.cos(ang), math.sin(ang) * SQ
            px, py = -uy, ux
            col = c.light if f < n - 2 else c.base
            c.d.polygon([(x + ux * 3, y + uy * 3), (x + px * 3 - ux, y + py * 3 - uy), (x - px * 3 - ux, y - py * 3 - uy)], fill=col)
        F.append(c.done())
    return F, [50] * n, (36, 32)
def dot(t, a):
    c = Ctx(t, a, 72, 64, 36, 32); F = []; n = 10 if t == 1 else 12; rnd = random.Random(5)
    bubbles = [(rnd.uniform(-14, 14), rnd.uniform(-8, 8), rnd.randint(0, 5)) for _ in range(6 if t == 1 else 9)]
    for f in range(n):
        c.new(); g = min(1, (f + 1) / 3); fade = 1 if f < n - 2 else 0.6
        c.oval(20 * g * fade, c.dark if t == 2 else c.base); c.oval(14 * g * fade, c.base, oy=-1)
        if t == 2: c.oval(8 * g * fade, c.light, ox=-3, oy=-2)
        for (bx, by, ph) in bubbles:
            k = (f + ph) % 5
            if f < n - 2 and k < 4:
                r = [1, 2, 3, 1][k]
                if k == 3: c.d.point((36 + bx - 2, 32 + by - 2), fill=c.hi); c.d.point((36 + bx + 2, 32 + by - 2), fill=c.hi)
                else: c.oval(r, c.light, ox=bx, oy=by); c.d.point((36 + bx - 1, 32 + by - 1), fill=c.hi)
        F.append(c.done())
    return F, [60, 60, 70] + [90] * (n - 3), (36, 32)
def vuln(t, a):
    c = Ctx(t, a, 32, 40, 16, 26); F = []; n = 8 if t == 1 else 10
    for f in range(n):
        c.new(); y = 8 + min(f, 3) * 2
        # 깨진 방패 표시 (위에서 내려와 박힘) + 금
        sh = [(16, y - 6), (21, y - 4), (20, y + 2), (16, y + 5), (12, y + 2), (11, y - 4)]
        if f < n - 1:
            c.d.polygon(sh, fill=c.base); c.d.polygon([(16, y - 6), (21, y - 4), (20, y + 2), (16, y + 5)], fill=c.light)
            if f >= 3: c.d.line([16, y - 6, 15, y - 1, 17, y + 1, 16, y + 5], fill=c.rim, width=1)
            if t == 2 and f >= 3: c.d.line([12, y - 2, 15, y - 1], fill=c.rim); c.d.line([17, y + 1, 20, y], fill=c.rim)
        if 3 <= f < 6:
            for i in range(4): c.sq(16 + (-1) ** i * (4 + (f - 3) * 3), y + 4 + (i // 2) * 2, 2, c.light)
        F.append(c.done())
    return F, [50, 50, 60, 120, 70, 70, 90, 120, 120, 120][:n], (16, 26)
def pulse(t, a):
    c = Ctx(t, a, 104, 88, 52, 44); F = []; n = 7 if t == 1 else 9
    for f in range(n):
        c.new(); r = 10 + f * (38 / (n - 1))
        c.oval(r, c.light if f < n - 2 else c.base, width=2)
        if t == 2 and f >= 1: c.oval(r - 5, c.base, width=1)
        if t == 2 and f % 2 == 0:
            for i in range(6):
                ang = i * math.pi / 3 + f * 0.2; c.star(52 + math.cos(ang) * r, 44 + math.sin(ang) * r * SQ, 2, c.hi)
        F.append(c.done())
    return F, [50] * n, (52, 44)
def buff_adj(t, a):
    c = Ctx(t, a, 80, 80, 40, 40); F = []; n = 8 if t == 1 else 10; T = 24
    for f in range(n):
        c.new()
        for ty in (-1, 0, 1):
            for tx in (-1, 0, 1):
                ring = max(abs(tx), abs(ty))          # 가운데 0 → 바깥 1
                k = f - ring * 2
                if k < 0 or f >= n - 1: continue
                x0 = 40 + tx * T - T // 2 + 1; y0 = 40 + ty * T - T // 2 + 1
                if k < 4:
                    col = c.hi if k == 0 else c.light if k < 3 else c.base
                    c.d.rectangle([x0, y0, x0 + T - 3, y0 + T - 3], outline=col, width=1 if t == 1 else 2)
                if 1 <= k < 6:
                    c.arrow_up(40 + tx * T, 40 + ty * T + 5 - k * 2, c.light if k < 4 else c.base, 6)
                if t == 2 and k == 2: c.star(40 + tx * T + 6, 40 + ty * T - 6, 2, c.hi)
        F.append(c.done())
    return F, [60] * n, (40, 40)
def buff_self(t, a):
    c = Ctx(t, a, 48, 56, 24, 42); F = []; n = 8 if t == 1 else 10
    for f in range(n):
        c.new()
        if f < n - 1: c.oval(10 + (f % 2), c.base, width=2)
        for i, (dx, ph) in enumerate([(-10, 0), (10, 2), (0, 4)] + ([(-5, 1), (6, 3)] if t == 2 else [])):
            k = (f + ph) % 6
            if f < n - 1 and k < 5: c.arrow_up(24 + dx, 42 - k * 6, c.light if k < 3 else c.base, 5)
        if t == 2 and f < n - 1 and f % 3 == 1: c.star(24 + (f % 2) * 8 - 4, 18, 3, c.hi)
        F.append(c.done())
    return F, [70] * n, (24, 42)
def gold(t, a):
    c = Ctx(t, a, 48, 48, 24, 36); F = []; n = 8 if t == 1 else 10
    c.rim = GOLD[0]
    coins = [(-8, 1.0), (0, 1.3), (8, 0.9)] + ([(-4, 1.15), (5, 1.05)] if t == 2 else [])
    for f in range(n):
        c.new()
        for (dx, sp) in coins:
            k = f / (n - 1); x = 24 + dx * k * 1.4; y = 36 - math.sin(k * math.pi) * 22 * sp
            if f < n - 1:
                c.d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=GOLD[1]); c.d.ellipse([x - 2, y - 3, x + 2, y + 2], fill=GOLD[2])
                c.d.line([x, y - 1, x, y + 1], fill=GOLD[1]); c.d.point((x - 1, y - 2), fill=GOLD[4] if t == 2 else GOLD[3])
        if f in (1, 2) or (t == 2 and f in (5, 6)): c.star(24, 26, 4, GOLD[3], GOLD[4] if t == 2 else None)
        F.append(c.done())
    return F, [60] * n, (24, 36)
def chain(t, a):   # 언커먼 전용: 대상 사이를 잇는 번개 (가로 72px 한 마디, 게임에서는 늘려 씀)
    c = Ctx(t, a, 72, 24, 4, 12); F = []; n = 6; rnd = random.Random(3)
    for f in range(n):
        c.new()
        if f < n - 1:
            pts = [(4, 12)] + [(4 + i * 8, 12 + rnd.randint(-5, 5)) for i in range(1, 8)] + [(68, 12)]
            c.d.line(pts, fill=c.base if f > 2 else c.light, width=3); c.d.line(pts, fill=c.hi, width=1)
            if f < 2: c.star(68, 12, 5, c.hi)
        F.append(c.done())
    return F, [40, 50, 50, 60, 60, 80], (4, 12)
def buff_all(t, a):  # 언커먼 전용: 아군 전체 — 캐릭터마다 위에서 빛 화살 + 발밑 고리
    c = Ctx(t, a, 32, 56, 16, 44); F = []; n = 9
    for f in range(n):
        c.new()
        if f < 4: c.d.rectangle([14, 2 + f * 9, 17, 10 + f * 9], fill=c.light); c.d.rectangle([15, 2 + f * 9, 16, 10 + f * 9], fill=c.hi)
        if 3 <= f < n - 1: c.oval(6 + (f - 3) * 2, c.base, width=2); c.star(16, 40 - (f - 3) * 4, 3, c.hi)
        F.append(c.done())
    return F, [40, 40, 40, 50, 70, 80, 90, 100, 100], (16, 44)

COMMON = [('hit', '단일 타격', hit), ('blast', '원형 폭발', blast), ('slow', '감속 웅덩이', slow), ('stun', '기절', stun), ('push', '밀치기', push),
          ('dot', '지속 피해', dot), ('vuln', '약화', vuln), ('pulse', '사거리 전체', pulse), ('buff_adj', '주변 아군 버프', buff_adj),
          ('buff_self', '자기 버프', buff_self), ('gold', '골드', gold)]
UNCOMMON = COMMON + [('chain', '연쇄', chain), ('buff_all', '아군 전체 버프', buff_all)]
if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'sheets'), exist_ok=True)
    index = []
    for tier, lst in ((1, COMMON), (2, UNCOMMON)):
        for key, name, fn in lst:
            for attr in RAMP:
                frames, ms, (ax, ay) = fn(tier, attr)
                w, h = frames[0].size; sh = Image.new('RGBA', (w * len(frames), h))
                for i, fr in enumerate(frames): sh.paste(fr, (i * w, 0))
                fn_ = f"{'c' if tier == 1 else 'u'}_{key}_{attr}.png"; sh.save(os.path.join(HERE, 'sheets', fn_))
                cols = {px[:3] for px in sh.getdata() if px[3]}
                index.append({'tier': tier, 'key': key, 'name': name, 'attr': attr, 'file': fn_, 'w': w, 'h': h, 'n': len(frames), 'ms': ms, 'ax': ax, 'ay': ay, 'colors': len(cols)})
    json.dump(index, open(os.path.join(HERE, 'index.json'), 'w'), ensure_ascii=False)
    from collections import Counter
    print(len(index), 'sheets; max colors', max(i['colors'] for i in index), Counter((i['tier'], i['colors']) for i in index))
