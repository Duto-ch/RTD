"""무기 디자인 v3 (2026-11-20): v2 + 종류마다 새 모양을 더하고(검 8·도끼 6·망치 6·창 8·단검 7·지팡이 머리 16·활 6·총 5·석궁 4), 색은 속성 대신 캐릭터 키 컬러
(이전 v2 설명)
무기 디자인 v2 (2026-11-17): 종류마다 모양 변형 + 등급별 재질
- 모양: 캐릭터 설명(look) 키워드로 고른다 (예: greatsword → 대검, rapier → 세검, trident → 삼지창, frying pan → 프라이팬)
- 재질: 커먼 쇠·나무 → 언커먼 강철·속성색 손잡이 → 레어 은·보석 → 유니크 금·속성빛 날
그림은 anim.geo_weapon 과 같은 방식(축을 따라 각도마다 새로 찍고 외곽선)이라 어느 각도에서도 도트가 깔끔하다.
roster_art.py 가 캐릭터마다 CTX 를 바꾼 뒤 anim.geo_weapon 자리에 geo() 를 끼운다.
"""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'char-13'))
import anim as A

import keys as K
CTX = {'grade': 1, 'key': 'crimson', 'var': {}}   # 지금 그리는 캐릭터: 등급·속성·무기별 모양

def glow():
    return K.KEYS[CTX['key']][3]


def mat():
    g, k = CTX['grade'], K.KEYS[CTX['key']]
    if g == 1:
        return dict(L='#d8dde4', M='#9aa3b0', D='#7d8590', guard='#b08850', grip='#6b3f1f', wood='#9a6235', woodD='#6b3f1f', gem=None, trim='#b08850')
    if g == 2:
        return dict(L='#eef6ff', M='#a9b8cc', D='#7d8aa0', guard='#c9d3e0', grip=k[1], wood='#8a5a2e', woodD='#5a3a1a', gem=None, trim='#c9d3e0')
    if g == 3:
        return dict(L='#ffffff', M='#b8c4d8', D='#8a97ad', guard='#e6ecf4', grip='#3a2a3a', wood='#5a3a2a', woodD='#3a2418', gem=k[2], trim='#e6ecf4')
    hi, mid, lo = k[3]
    return dict(L=hi, M=mid, D=lo, guard='#f5c542', grip='#c98f2a', wood='#c98f2a', woodD='#8a5a1a', gem='#ffffff', trim='#f5c542')


def geo(name, deg, silhouette=None):
    m = mat()
    v = CTX['var'].get(name, '')
    a = math.radians(deg)
    u = (math.sin(a), -math.cos(a))
    n = (math.cos(a), math.sin(a))
    P = lambda t, k=0: (round(u[0] * t + n[0] * k), round(u[1] * t + n[1] * k))
    f = {}
    side = lambda q: q[0] * n[0] + q[1] * n[1]

    def band(t0, t1, k0, k1, col, step=0.5):
        t = t0
        while t <= t1 + 1e-6:
            k = k0
            while k <= k1 + 1e-6:
                q = P(t, k)
                f[q] = col(t, k) if callable(col) else col
                k += step
            t += step

    def shaft(t0, t1, col):
        for q in A._line(*P(t0), *P(t1)):
            f[q] = col

    def disc(t, r, col):
        c = (u[0] * t, u[1] * t)
        R = int(math.ceil(r)) + 1
        for x in range(round(c[0]) - R, round(c[0]) + R + 1):
            for y in range(round(c[1]) - R, round(c[1]) + R + 1):
                dx, dy = x - c[0], y - c[1]
                if dx * dx + dy * dy <= r * r + 0.6:
                    f[(x, y)] = col(dx, dy) if callable(col) else col

    def diamond(c, r, pick):
        for dx in range(-r, r + 1):
            for dy in range(-r, r + 1):
                if abs(dx) + abs(dy) <= r:
                    q = (c[0] + dx, c[1] + dy)
                    f[q] = pick(q)

    edge = lambda t, k: m['L'] if k < 0 else m['M']
    gem = m['gem']

    if name in NEW and v in NEW[name]:
        NEW[name][v](f, P, band, disc, diamond, shaft, side, m, edge, gem)
        return A._render(f, silhouette)
    if name == 'sword':
        if v == 'great':           # 대검: 3px 넓은 날, 큰 막이
            band(-1, 0, 0, 0, m['grip']); f[P(-2)] = m['guard']
            band(1, 1.5, -3.5, 3.5, m['guard'])
            band(2, 13, -1, 1, lambda t, k: m['L'] if k < -0.4 else (m['M'] if k < 0.6 else m['D']))
            band(13.5, 14, -0.5, 0.5, m['L'])
            if gem: f[P(1, 0)] = gem
        elif v == 'rapier':        # 세검: 1px 가는 날 + 둥근 손잡이 보호대
            band(-1, 0, 0, 0, m['grip']); f[P(-2)] = m['guard']
            band(0.5, 1.5, -2, 2, m['guard']); f[P(0, -2.5)] = m['guard']; f[P(0, 2.5)] = m['guard']
            band(2, 12, 0, 0, m['L']); f[P(13)] = m['M']
            if gem: f[P(1)] = gem
        elif v == 'curved':        # 곡도: 끝으로 갈수록 휘는 날
            band(-1, 0, 0, 0, m['grip']); f[P(-2)] = m['guard']
            band(1, 1, -2, 2, m['guard'])
            t = 2
            while t <= 11:
                bend = ((t - 2) / 9) ** 2 * 2.5
                band(t, t, -0.5 + bend, 0.5 + bend, edge)
                t += 0.5
            f[P(11.5, 2.5)] = m['L']
            if gem: f[P(1)] = gem
        else:                      # 기본 장검
            band(-1, 0, 0, 0, m['grip']); f[P(-2)] = m['guard']
            band(1, 1, -3, 3, m['guard'])
            band(2, 11, -0.5, 0.5, edge); f[P(12)] = m['L']
            if gem: f[P(1)] = gem
    elif name == 'axe':
        shaft(-3, 9, m['wood']); f[P(-3)] = m['guard']; f[P(9)] = m['guard']
        big = 1.3 if v == 'great' else 1.0
        widths = {4.5: 1.5, 5: 2.5, 5.5: 3.5, 6: 4, 6.5: 4.5, 7: 4.5, 7.5: 4.5, 8: 4, 8.5: 3, 9: 2}
        sides = (1, -1) if v in ('double', 'great') else (1,)
        for sgn in sides:
            for t, wd in widths.items():
                wd = wd * big if sgn == 1 else wd * 0.8
                k = 1
                while k <= wd + 1e-6:
                    f[P(t, k * sgn)] = m['L'] if k >= wd - 0.9 else m['M']
                    k += 0.5
        if gem: f[P(6.5, 0)] = gem
    elif name == 'hammer':
        if v == 'mace':            # 철퇴: 둥근 머리 + 가시
            shaft(-3, 6, m['wood']); f[P(-3)] = m['guard']
            disc(8.5, 2.5, lambda dx, dy: m['L'] if dx + dy < -1 else m['M'])
            for kk, tt in ((0, 12), (3.8, 8.5), (-3.8, 8.5)):
                f[P(tt, kk)] = m['D']
            if gem: f[P(8.5)] = gem
        elif v == 'club':          # 몽둥이: 끝이 굵어지는 나무
            band(-3, 5, -0.5, 0.5, lambda tt, k: m['wood'] if k < 0 else m['woodD'])
            disc(8, 2.4, lambda dx, dy: m['wood'] if -0.7 * dx - 0.7 * dy > -0.5 else m['woodD'])
            f[P(8.5, 1)] = m['woodD']; f[P(7, -1)] = m['woodD']
            if gem: band(5.5, 5.5, -1.5, 1.5, m['trim'])
        elif v == 'pan':           # 프라이팬
            shaft(-3, 4, '#3a3a44'); f[P(-3)] = m['guard']
            disc(8, 3, lambda dx, dy: '#5a5a66' if dx * dx + dy * dy > 4.5 else ('#8a8a96' if dx + dy < 0 else '#6a6a76'))
        else:                      # 사각 망치
            shaft(-3, 7, m['wood']); f[P(-3)] = m['guard']
            band(7, 10, -3, 3, m['M']); band(10, 10, -3, 3, m['L']); band(7, 7, -3, 3, m['D'])
            if gem: f[P(8.5)] = gem
    elif name == 'spear':
        shaft(-4, 8, m['wood']); f[P(-4)] = m['guard']
        diamond(P(8), 1, lambda q: m['guard'])
        if v == 'trident':         # 삼지창
            band(9, 9, -3, 3, m['M'])
            for kk in (-3, 0, 3):
                band(9.5, 12 if kk else 13, kk, kk, m['L'])
            if gem: f[P(9, 0)] = gem
        elif v == 'lance':         # 랜스: 길고 뾰족한 원뿔
            t = 9
            while t <= 16:
                w = max(0, (16 - t) / 7 * 2)
                band(t, t, -w, w, lambda tt, k: m['L'] if k < 0 else m['M'])
                t += 0.5
            band(8.5, 8.5, -2.5, 2.5, m['trim'])
        elif v == 'harpoon':       # 작살: 촉 + 갈고리
            band(9, 13, 0, 0, m['L']); f[P(14)] = m['L']
            for tt, kk in ((11, -1), (10, -2), (11, 1), (10, 2)):
                f[P(tt, kk)] = m['M']
        else:                      # 잎사귀 창날
            for t, r in zip(range(9, 15), [1, 1, 2, 1, 1, 0]):
                diamond(P(t), r, lambda q: m['L'] if side(q) < 0.5 else m['M'])
            if gem: f[P(11)] = gem
    elif name == 'dagger':
        band(-1, 0, 0, 0, m['grip']); f[P(-2)] = m['guard']
        if v == 'fan':             # 부채: 손잡이에서 펼쳐지는 부챗살
            for ang in range(-50, 51, 10):
                r = math.radians(ang)
                for t in range(2, 8):
                    q = (round((u[0] * math.cos(r) + n[0] * math.sin(r)) * t), round((u[1] * math.cos(r) + n[1] * math.sin(r)) * t))
                    f[q] = (m['L'] if t > 5 else glow()[1]) if ang % 20 == 0 else glow()[2]
        elif v == 'curved':
            band(1, 1, -1.5, 1.5, m['guard'])
            t = 2
            while t <= 7:
                bend = ((t - 2) / 5) ** 2 * 1.8
                band(t, t, -0.5 + bend, 0.5 + bend, edge)
                t += 0.5
        else:
            band(1, 1, -1.5, 1.5, m['guard'])
            band(2, 6, -0.5, 0.5, edge); f[P(7)] = m['L']
        if gem and v != 'fan': f[P(1)] = gem
    elif name in ('staff', 'staff_ice', 'staff_leaf'):
        shaft(-3, 6, m['wood']); f[P(-3)] = m['guard']; f[P(6)] = m['guard']
        lit, mid, dark = glow()
        if v in NEW_STAFF:
            NEW_STAFF[v](f, P, band, disc, diamond, shaft, side, m, lit, mid, dark, u, n)
            v = '__done'
        if v == 'lantern':         # 등불·향로: 사각 틀 안의 불꽃
            band(6.5, 11, -2, 2, m['trim'])
            band(7.5, 10, -1, 1, lambda t, k: lit if t > 9 else mid)
        elif v == 'skull':         # 뼈 지팡이: 해골 머리
            disc(9, 2, '#e8e0c8')
            f[P(9.3, -1)] = '#2b1d2f'; f[P(9.3, 1)] = '#2b1d2f'; f[P(7.6)] = '#c9b48a'
            f[P(9.5)] = mid
        elif v == 'moon':          # 초승달: 큰 원에서 오른쪽으로 비킨 원을 빼낸 모양
            cx, cy = u[0] * 9, u[1] * 9
            ox, oy = cx + n[0] * 1.6, cy + n[1] * 1.6
            for x in range(round(cx) - 4, round(cx) + 5):
                for y in range(round(cy) - 4, round(cy) + 5):
                    if (x - cx) ** 2 + (y - cy) ** 2 <= 9.6 and (x - ox) ** 2 + (y - oy) ** 2 > 5.2:
                        f[(x, y)] = lit if (x - cx) * n[0] + (y - cy) * n[1] < -1.2 else mid
        elif v == 'totem':         # 토템: 나무 조각 + 속성색 눈
            band(6.5, 11, -1.5, 1.5, lambda t, k: m['woodD'] if int(t * 2) % 3 == 0 else m['wood'])
            f[P(9.5, -1)] = mid; f[P(9.5, 1)] = mid
        elif v == '__done':
            pass
        elif v == 'crystal':
            for t, r in zip(range(7, 13), [1, 2, 2, 1, 1, 0]):
                diamond(P(t), r, lambda q: lit if side(q) < -0.5 else (mid if side(q) < 0.6 else dark))
            f[P(9, -1)] = '#ffffff'
        elif v == 'leaf':          # 새싹 잎 두 장
            for t, r in zip(range(7, 11), [1, 2, 1, 0]):
                diamond(P(t, -1.5), r, lambda q: lit if side(q) < -1.5 else mid)
            for t, r in zip(range(8, 12), [1, 2, 1, 0]):
                diamond(P(t, 1.5), r, lambda q: mid if side(q) < 1.5 else dark)
        else:                      # 둥근 구슬 (+ 금속 갈퀴)
            for kk in (-1, 1):
                f[P(6.6, kk * 1.4)] = m['trim']
            disc(9, 2.5, lambda dx, dy: lit if -0.7 * dx - 0.7 * dy > 0.9 else (dark if -0.7 * dx - 0.7 * dy < -0.9 else mid))
            f[(round(u[0] * 9 - 1), round(u[1] * 9 - 1))] = '#ffffff'
        if CTX['grade'] >= 3:      # 레어+: 지팡이 머리 아래 장식 띠
            band(5, 5.5, -1, 1, m['trim'])
    elif name == 'bow':
        HALF = 8 if v == 'long' else (6 if v == 'short' else 7)
        BULGE = 3
        for i in range(-HALF * 4, HALF * 4 + 1):
            sv = i / 4
            k = -BULGE * (1 - (sv / HALF) ** 2) + BULGE
            f[P(sv, k - BULGE)] = m['wood']
            q = P(sv, k - BULGE + 1)
            if abs(sv) < HALF - 1 and q not in f:
                f[q] = m['woodD']
        tip = m['guard']
        for sv in (-HALF, HALF):
            f[P(sv, 0)] = tip
            if v == 'recurve' or CTX['grade'] == 4:   # 끝이 바깥으로 말린 활
                f[P(sv + (0.8 if sv > 0 else -0.8), 0.8)] = tip
        if gem:
            f[P(0, -BULGE)] = gem
        f[P(-0.5, -BULGE)] = m['trim']
    elif name == 'gun':
        if v == 'cannon':          # 손대포: 굵고 짧은 포신
            band(-3, 1, -1, 0.5, m['wood'])
            band(1.5, 8, -1, 1, lambda t, k: '#7a808c' if k < 0 else '#5a6070')
            band(8.5, 9, -1.5, 1.5, m['trim'])
        else:                      # 장총
            band(-4, 1, -1, 0.5, m['wood']); f[P(-4, -1)] = m['trim']
            band(1.5, 11.5, 0, 0, '#5a6070'); band(2, 9, -0.5, -0.5, m['M'])
            f[P(12)] = m['trim']
            if gem: f[P(1, -1)] = gem
    elif name == 'crossbow':
        band(-3, 7, -0.5, 0.5, m['wood'])
        band(7, 7.5, -4, 4, m['woodD'])
        f[P(7, -4)] = m['trim']; f[P(7, 4)] = m['trim']
        band(8, 9, 0, 0, m['L'])
        if v == 'repeating':       # 연사 석궁: 위에 화살 상자
            band(2, 5, 1, 2.5, m['woodD'])
        if gem: f[P(2, -1)] = gem
    else:
        return A.geo_weapon_orig(name, deg, silhouette)
    return A._render(f, silhouette)


GEO_LEN_V = {('sword', 'cross'): 13, ('sword', 'cleaver'): 10, ('sword', 'short'): 9, ('sword', 'wavy'): 12, ('axe', 'hatchet'): 6, ('spear', 'pike'): 15, ('spear', 'glaive'): 14, ('spear', 'halberd'): 13, ('dagger', 'stiletto'): 9, ('gun', 'pistol'): 7, ('gun', 'blunder'): 10, ('crossbow', 'heavy'): 11, ('crossbow', 'hand'): 6, ('sword', 'great'): 14, ('sword', 'rapier'): 13, ('spear', 'lance'): 16, ('spear', 'trident'): 13, ('gun', 'cannon'): 9,
             ('hammer', 'mace'): 11, ('hammer', 'club'): 10, ('hammer', 'pan'): 11}


def pick_variant(weapon, look, grade, cid):
    has = lambda *w: any(x in look for x in w)
    h = sum(map(ord, cid))
    if weapon == 'sword':
        if has('greatsword', 'great sword', 'broad sword', 'holy sword') or (grade == 4 and 'sword' in look):
            return 'great'
        if has('rapier', 'duelist', 'musketeer'):
            return 'rapier'
        if has('curved', 'blade', 'scimitar', 'gladius'):
            return 'curved'
        return ['', 'curved', ''][h % 3]
    if weapon == 'axe':
        return 'great' if has('greataxe', 'flaming') else ('double' if has('double', 'two axes') else '')
    if weapon == 'hammer':
        return 'mace' if has('mace') else ('club' if has('club', 'barrel') else ('pan' if has('frying pan') else ''))
    if weapon == 'spear':
        return 'trident' if has('trident') else ('lance' if has('lance') else ('harpoon' if has('harpoon', 'javelin') else ''))
    if weapon == 'dagger':
        return 'fan' if has('fans') else ('curved' if has('curved', 'claw', 'sickle', 'blades') else ['', 'curved'][h % 2])
    if weapon.startswith('staff'):
        if has('lantern', 'torch', 'censer'):
            return 'lantern'
        if has('bone', 'skull'):
            return 'skull'
        if has('moon', 'aurora', 'star', 'bell'):
            return 'moon'
        if has('totem', 'runestone', 'carved'):
            return 'totem'
        if has('crystal', 'ice'):
            return 'crystal'
        return ''
    if weapon == 'bow':
        return 'long' if has('longbow', 'huge', 'great longbow') else ('short' if has('short bow', 'slingshot', 'sling') else ('recurve' if has('recurve') else ''))
    if weapon == 'gun':
        return 'cannon' if has('cannon', 'catapult') else ''
    if weapon == 'crossbow':
        return 'repeating' if has('repeating') else ''
    return ''


# ───────────── v3 새 모양 (2026-11-20) ─────────────
# 모두 축(t: 손잡이 → 끝) · 옆(k) 좌표로 그려서 어느 각도에서도 도트가 깔끔하다 (v2 와 같은 방식)
def _cleaver(f, P, band, disc, diamond, shaft, side, m, edge, gem):      # 도축칼형 넓은 칼: 끝이 넓고 각진 날
    band(-1, 0, 0, 0, m['grip']); f[P(-2)] = m['guard']; band(1, 1, -2, 2, m['guard'])
    band(2, 10, -0.5, 2, lambda t, k: m['L'] if k < 0 else (m['M'] if k < 1.5 else m['D']))
    band(10, 10.5, -0.5, 2.5, m['L'])
    if gem: f[P(1)] = gem
def _wavy(f, P, band, disc, diamond, shaft, side, m, edge, gem):         # 물결 날 (불꽃검)
    band(-1, 0, 0, 0, m['grip']); f[P(-2)] = m['guard']; band(1, 1.5, -3, 3, m['guard'])
    t = 2
    while t <= 12:
        off = 0.8 * math.sin(t * 1.6)
        band(t, t, -0.5 + off, 0.5 + off, edge); t += 0.5
    f[P(12.5)] = m['L']
    if gem: f[P(1)] = gem
def _cross(f, P, band, disc, diamond, shaft, side, m, edge, gem):        # 성검: 긴 십자 막이 + 날 가운데 홈
    band(-2, 0, 0, 0, m['grip']); f[P(-3)] = m['guard']; band(1, 1.5, -4, 4, m['guard']); f[P(1, -4.5)] = m['trim']; f[P(1, 4.5)] = m['trim']
    band(2, 12, -1, 1, lambda t, k: m['L'] if k < -0.4 else (m['D'] if abs(k) < 0.4 else m['M']))
    band(12.5, 13, -0.5, 0.5, m['L'])
    if gem: f[P(1)] = gem
def _short(f, P, band, disc, diamond, shaft, side, m, edge, gem):        # 짧은 검 (글라디우스): 넓고 짧은 잎 모양 날
    band(-1, 0, 0, 0, m['grip']); f[P(-2)] = m['guard']; band(1, 1, -1.5, 1.5, m['guard'])
    for t, w in zip(range(2, 10), [0.5, 1, 1, 1, 1, 0.5, 0.5, 0]):
        band(t, t, -w, w, edge)
    if gem: f[P(1)] = gem
def _bearded(f, P, band, disc, diamond, shaft, side, m, edge, gem):      # 수염 도끼: 아래로 길게 늘어진 날
    shaft(-3, 9, m['wood']); f[P(-3)] = m['guard']; f[P(9)] = m['guard']
    for t, wd in {5: 1.5, 5.5: 2, 6: 2.5, 6.5: 3, 7: 3.5, 7.5: 4, 8: 4.5, 8.5: 4.5, 9: 3}.items():
        k = 1
        while k <= wd + 1e-6:
            f[P(t - (k - 1) * 0.6, k)] = m['L'] if k >= wd - 0.9 else m['M']; k += 0.5
    if gem: f[P(7, 0)] = gem
def _hatchet(f, P, band, disc, diamond, shaft, side, m, edge, gem):      # 손도끼: 짧은 자루 + 작은 네모 날 + 뒤쪽 뿔
    shaft(-2, 6, m['wood']); f[P(-2)] = m['guard']
    band(4.5, 6.5, 1, 3, lambda t, k: m['L'] if k > 2.4 else m['M']); f[P(5.5, -1.5)] = m['D']
    if gem: f[P(5.5, 0)] = gem
def _moonaxe(f, P, band, disc, diamond, shaft, side, m, edge, gem):      # 반달 도끼: 크게 휜 초승달 날
    shaft(-3, 9, m['wood']); f[P(-3)] = m['guard']
    for a in range(-70, 71, 8):
        r = math.radians(a)
        for rr in (3.5, 4, 4.5):
            t, k = 6.5 + math.sin(r) * rr, 1 + math.cos(r) * rr * 0.9
            f[P(t, k)] = m['L'] if rr > 4.2 else m['M']
    if gem: f[P(6.5, 0.5)] = gem
def _war(f, P, band, disc, diamond, shaft, side, m, edge, gem):          # 전쟁 망치: 한쪽 망치 + 반대쪽 송곳
    shaft(-3, 8, m['wood']); f[P(-3)] = m['guard']
    band(7, 9.5, 0.5, 3, m['M']); band(7, 9.5, 3, 3, m['L'])
    for kk, tt in ((-1, 8.2), (-2, 8.2), (-3, 8.4), (-4, 8.5)):
        f[P(tt, kk)] = m['D']
    if gem: f[P(8.2, 1.5)] = gem
def _maul(f, P, band, disc, diamond, shaft, side, m, edge, gem):         # 큰 망치: 아주 큰 네모 머리
    shaft(-3, 7, m['wood']); f[P(-3)] = m['guard']
    band(7, 11, -3.5, 3.5, lambda t, k: m['L'] if t > 10.4 else (m['D'] if t < 7.6 else m['M']))
    band(8.5, 9.5, -3.5, 3.5, m['trim'])
def _glaive(f, P, band, disc, diamond, shaft, side, m, edge, gem):       # 언월도: 자루 끝에 휜 외날
    shaft(-4, 8, m['wood']); f[P(-4)] = m['guard']; band(8, 8.5, -1.5, 1.5, m['guard'])
    t = 9
    while t <= 14:
        bend = ((t - 9) / 5) ** 2 * 2
        band(t, t, -0.5 + bend, 1.5 + bend * 0.6 if t < 13 else 0.5 + bend, lambda tt, k: m['L'] if k < bend else m['M']); t += 0.5
    if gem: f[P(8.2)] = gem
def _halberd(f, P, band, disc, diamond, shaft, side, m, edge, gem):      # 미늘창: 창끝 + 도끼날 + 갈고리
    shaft(-4, 9, m['wood']); f[P(-4)] = m['guard']
    band(9, 13, 0, 0, m['L']); f[P(13.5)] = m['L']
    band(8, 10.5, 1, 3, lambda t, k: m['L'] if k > 2.4 else m['M'])
    f[P(9, -1)] = m['D']; f[P(9.5, -2)] = m['D']
def _pike(f, P, band, disc, diamond, shaft, side, m, edge, gem):         # 장창: 가늘고 긴 자루 + 작은 촉
    shaft(-5, 12, m['wood']); f[P(-5)] = m['guard']
    band(12.5, 14.5, 0, 0, m['L']); f[P(13, -1)] = m['M']; f[P(13, 1)] = m['M']; f[P(15)] = m['L']
def _winged(f, P, band, disc, diamond, shaft, side, m, edge, gem):       # 날개 창: 촉 아래 양쪽 날개
    shaft(-4, 8, m['wood']); f[P(-4)] = m['guard']
    for t, r in zip(range(9, 14), [1, 1, 1, 0, 0]):
        diamond(P(t), r, lambda q: m['L'] if side(q) < 0.5 else m['M'])
    for kk in (-1, 1):
        f[P(8.5, kk * 2)] = m['trim']; f[P(8, kk * 3)] = m['trim']
    if gem: f[P(10)] = gem
def _kris(f, P, band, disc, diamond, shaft, side, m, edge, gem):         # 물결 단검
    band(-1, 0, 0, 0, m['grip']); f[P(-2)] = m['guard']; band(1, 1, -1.5, 1.5, m['guard'])
    t = 2
    while t <= 7:
        off = 0.7 * math.sin(t * 2.2)
        band(t, t, -0.5 + off, 0.5 + off, edge); t += 0.5
    if gem: f[P(1)] = gem
def _sickle(f, P, band, disc, diamond, shaft, side, m, edge, gem):       # 낫: C 자로 휜 날
    band(-1, 1, 0, 0, m['wood']); f[P(-2)] = m['guard']
    for a in range(0, 181, 12):
        r = math.radians(a)
        f[P(4 + math.sin(r) * 3, -math.cos(r) * 3 + 3 - 3)] = m['L'] if a < 90 else m['M']
    if gem: f[P(1.5)] = gem
def _claw(f, P, band, disc, diamond, shaft, side, m, edge, gem):         # 갈퀴 손톱: 세 갈래
    band(-1, 1, -1, 1, m['grip'])
    for kk in (-1.5, 0, 1.5):
        band(2, 6, kk, kk, m['L']); f[P(6.5, kk * 1.2)] = m['M']
def _stiletto(f, P, band, disc, diamond, shaft, side, m, edge, gem):     # 송곳 단검: 아주 가는 날 + 둥근 고리 손잡이
    band(-1, 0, 0, 0, m['grip']); disc(-2.3, 1, m['guard']); f[P(-2.3)] = m['grip']
    band(1, 1, -1, 1, m['guard']); band(2, 8, 0, 0, m['L']); f[P(9)] = m['M']
def _horn(f, P, band, disc, diamond, shaft, side, m, edge, gem):         # 뿔 활: 가운데가 들어간 두 곡선
    for i in range(-28, 29):
        sv = i / 4
        k = -abs(math.sin(sv / 7 * math.pi)) * 3 + (2.5 if abs(sv) < 2 else 0)
        f[P(sv, k - 1)] = '#e8dcc0' if abs(sv) > 4 else m['wood']
    f[P(-7, -1)] = m['guard']; f[P(7, -1)] = m['guard']
    if gem: f[P(0, 1)] = gem
def _composite(f, P, band, disc, diamond, shaft, side, m, edge, gem):    # 복합 활: 손잡이 감개 + 끝이 꺾인 날개
    HALF, BUL = 7, 3
    for i in range(-HALF * 4, HALF * 4 + 1):
        sv = i / 4
        k = -BUL * (1 - (sv / HALF) ** 2) + BUL
        f[P(sv, k - BUL)] = m['woodD'] if abs(sv) > 4.5 else m['wood']
    band(-1, 1, -BUL - 0.5, -BUL + 0.5, m['trim'])
    for sv in (-HALF, HALF):
        f[P(sv + (1 if sv > 0 else -1), -1)] = m['guard']
def _pistol(f, P, band, disc, diamond, shaft, side, m, edge, gem):       # 단총: 짧은 총신 + 굽은 손잡이
    band(-2, 0, -1.5, -0.5, m['wood']); f[P(-2.5, -2)] = m['wood']
    band(0.5, 6, 0, 0.5, '#5a6070'); band(1, 4, -0.5, -0.5, m['M']); f[P(6.5)] = m['trim']
    if gem: f[P(0, -1)] = gem
def _blunder(f, P, band, disc, diamond, shaft, side, m, edge, gem):      # 나팔총: 끝이 나팔처럼 벌어짐
    band(-4, 1, -1, 0.5, m['wood'])
    band(1.5, 8, -0.5, 0.5, '#7a808c')
    band(8.5, 9, -1.5, 1.5, '#7a808c'); band(9.5, 10, -2, 2, m['trim'])
    if gem: f[P(1, -1)] = gem
def _harpoongun(f, P, band, disc, diamond, shaft, side, m, edge, gem):   # 작살총: 총신 위에 작살 촉
    band(-3, 1, -1, 0.5, m['wood']); band(1.5, 8, 0, 0, '#5a6070')
    band(8.5, 11, 0, 0, m['L']); f[P(10, -1)] = m['M']; f[P(10, 1)] = m['M']; f[P(12)] = m['L']
def _heavyxb(f, P, band, disc, diamond, shaft, side, m, edge, gem):      # 공성 석궁: 굵은 몸통 + 큰 활 + 손잡이 바퀴
    band(-3, 8, -1, 1, m['wood']); band(8, 9, -5, 5, m['woodD'])
    f[P(8.5, -5)] = m['trim']; f[P(8.5, 5)] = m['trim']; band(9, 11, 0, 0, m['L']); disc(0, 1.2, m['trim'])
def _handxb(f, P, band, disc, diamond, shaft, side, m, edge, gem):       # 손석궁: 작은 몸통 + 짧은 활
    band(-2, 4, -0.5, 0.5, m['wood']); band(4, 4.5, -2.5, 2.5, m['woodD'])
    f[P(4, -3)] = m['trim']; f[P(4, 3)] = m['trim']; band(5, 6, 0, 0, m['L'])
    if gem: f[P(1, -1)] = gem

NEW = {
    'sword': {'cleaver': _cleaver, 'wavy': _wavy, 'cross': _cross, 'short': _short},
    'axe': {'bearded': _bearded, 'hatchet': _hatchet, 'moon': _moonaxe},
    'hammer': {'war': _war, 'maul': _maul},
    'spear': {'glaive': _glaive, 'halberd': _halberd, 'pike': _pike, 'winged': _winged},
    'dagger': {'kris': _kris, 'sickle': _sickle, 'claw': _claw, 'stiletto': _stiletto},
    'bow': {'horn': _horn, 'composite': _composite},
    'gun': {'pistol': _pistol, 'blunder': _blunder, 'harpoon': _harpoongun},
    'crossbow': {'heavy': _heavyxb, 'hand': _handxb},
}


# 지팡이 머리 새 모양 9종
def _ring(f, P, band, disc, diamond, shaft, side, m, lit, mid, dark, u, n):     # 고리 지팡이: 큰 고리 + 작은 고리 둘
    cx, cy = u[0] * 9, u[1] * 9
    for a in range(0, 360, 15):
        r = math.radians(a)
        f[(round(cx + math.cos(r) * 2.6), round(cy + math.sin(r) * 2.6))] = m['trim']
    f[(round(cx), round(cy))] = mid
    for kk in (-3.2, 3.2):
        f[P(8, kk)] = lit
def _star(f, P, band, disc, diamond, shaft, side, m, lit, mid, dark, u, n):     # 별
    for t in range(7, 12):
        f[P(t)] = mid
    for kk in range(-2, 3):
        f[P(9, kk)] = mid
    for d in ((8, -1), (8, 1), (10, -1), (10, 1)):
        f[P(*d)] = lit
    f[P(9)] = '#ffffff'; f[P(11.5)] = lit; f[P(9, -2.5)] = lit; f[P(9, 2.5)] = lit
def _flower(f, P, band, disc, diamond, shaft, side, m, lit, mid, dark, u, n):   # 꽃: 꽃잎 다섯 + 노란 가운데
    for a in range(0, 360, 72):
        r = math.radians(a)
        disc_c = (8.8 + math.cos(r) * 1.8, math.sin(r) * 1.8)
        f[P(*disc_c)] = mid; f[P(disc_c[0] + 0.5, disc_c[1])] = lit
    f[P(8.8)] = '#ffe066'; f[P(6.5, 1)] = '#4fae3a'; f[P(7, 1.5)] = '#4fae3a'
def _feather(f, P, band, disc, diamond, shaft, side, m, lit, mid, dark, u, n):  # 깃털 다발
    for kk, top in ((-1.5, 10), (0, 12), (1.5, 10)):
        band(7, top, kk, kk, lambda t, k: lit if t > top - 2 else mid)
        f[P(top - 1, kk - 0.7)] = dark
    band(6.5, 7, -1.5, 1.5, m['trim'])
def _tome(f, P, band, disc, diamond, shaft, side, m, lit, mid, dark, u, n):     # 책 지팡이: 끝에 매달린 펼친 책
    band(7, 10, -2.5, 2.5, lambda t, k: '#fff6e0' if abs(k) > 0.4 else dark)
    band(7, 7, -2.5, 2.5, mid); band(10, 10, -2.5, 2.5, mid)
def _bell(f, P, band, disc, diamond, shaft, side, m, lit, mid, dark, u, n):     # 방울
    for t, w in zip(range(7, 12), [0.5, 1, 1.5, 2, 2]):
        band(t, t, -w, w, lambda tt, k: lit if k < -0.5 else mid)
    f[P(12)] = dark; f[P(6.5)] = m['trim']
def _eye(f, P, band, disc, diamond, shaft, side, m, lit, mid, dark, u, n):      # 눈알 구슬
    disc(9, 2.5, lambda dx, dy: '#f4f0e8')
    disc(9, 1.3, lambda dx, dy: mid); f[P(9)] = '#2b1d2f'
    for kk in (-1, 1):
        f[P(6.6, kk * 1.4)] = m['trim']
def _flame(f, P, band, disc, diamond, shaft, side, m, lit, mid, dark, u, n):    # 불꽃 머리: 날름거리는 세 갈래 불
    band(6.5, 7, -1.5, 1.5, m['trim'])
    for kk, top in ((-1.2, 10), (0, 12), (1.2, 10.5)):
        band(7.5, top, kk - 0.5, kk + 0.5, lambda t, k: lit if t > top - 1.5 else (mid if t > 8.5 else dark))
def _branch(f, P, band, disc, diamond, shaft, side, m, lit, mid, dark, u, n):   # 갈래 나뭇가지 + 잎
    shaft(6, 9, m['wood'])
    for q in ((9.5, -1), (10.5, -2), (9.5, 1), (10.5, 2)):
        f[P(*q)] = m['wood']
    for q in ((11, -2.5), (11.5, 2.5), (10, 0)):
        f[P(*q)] = mid; f[P(q[0] + 0.6, q[1])] = lit

NEW_STAFF = {'ring': _ring, 'star': _star, 'flower': _flower, 'feather': _feather, 'tome': _tome, 'bell': _bell,
             'eye': _eye, 'flame': _flame, 'branch': _branch}

VARIANTS = {
    'sword': ['', 'great', 'rapier', 'curved', 'cleaver', 'wavy', 'cross', 'short'],
    'axe': ['', 'double', 'great', 'bearded', 'hatchet', 'moon'],
    'hammer': ['', 'mace', 'club', 'pan', 'war', 'maul'],
    'spear': ['', 'trident', 'lance', 'harpoon', 'glaive', 'halberd', 'pike', 'winged'],
    'dagger': ['', 'curved', 'fan', 'kris', 'sickle', 'claw', 'stiletto'],
    'staff': ['orb', 'crystal', 'leaf', 'lantern', 'skull', 'moon', 'totem', 'ring', 'star', 'flower', 'feather', 'tome', 'bell', 'eye', 'flame', 'branch'],
    'bow': ['', 'long', 'short', 'recurve', 'horn', 'composite'],
    'gun': ['', 'cannon', 'pistol', 'blunder', 'harpoon'],
    'crossbow': ['', 'repeating', 'heavy', 'hand'],
}
VARIANT_NAMES = {'': '기본', 'great': '대형', 'rapier': '세검', 'curved': '곡도', 'cleaver': '넓은 칼', 'wavy': '물결검', 'cross': '성검', 'short': '단검형',
                 'double': '양날', 'bearded': '수염 도끼', 'hatchet': '손도끼', 'moon': '반달', 'mace': '철퇴', 'club': '몽둥이', 'pan': '프라이팬',
                 'war': '전쟁 망치', 'maul': '큰 망치', 'trident': '삼지창', 'lance': '랜스', 'harpoon': '작살', 'glaive': '언월도', 'halberd': '미늘창',
                 'pike': '장창', 'winged': '날개 창', 'fan': '부채', 'kris': '물결 단검', 'sickle': '낫', 'claw': '갈퀴', 'stiletto': '송곳',
                 'orb': '구슬', 'crystal': '수정', 'leaf': '새싹', 'lantern': '등불', 'skull': '해골', 'totem': '토템', 'ring': '고리', 'star': '별',
                 'flower': '꽃', 'feather': '깃털', 'tome': '책', 'bell': '방울', 'eye': '눈알', 'flame': '불꽃', 'branch': '나뭇가지',
                 'long': '장궁', 'short': '단궁', 'recurve': '곡궁', 'horn': '뿔 활', 'composite': '복합 활', 'cannon': '손대포', 'pistol': '단총',
                 'blunder': '나팔총', 'repeating': '연사', 'heavy': '공성', 'hand': '손석궁'}
TYPE_VNAMES = {('sword', 'short'): '짧은 검', ('bow', 'short'): '단궁', ('gun', 'harpoon'): '작살총', ('spear', 'harpoon'): '작살',
               ('axe', 'great'): '대형 도끼', ('sword', 'great'): '대검', ('axe', 'moon'): '반달 도끼', ('staff', 'moon'): '초승달'}


def vname(wt, v):
    return TYPE_VNAMES.get((wt, v)) or VARIANT_NAMES.get(v, v) or '기본'


# look 키워드 → 어울리는 모양 (먼저 맞는 것)
VPREF = {
    'sword': [(('greatsword', 'great sword'), 'great'), (('holy sword', 'sun emblem', 'paladin'), 'cross'), (('rapier', 'duelist', 'musketeer'), 'rapier'),
              (('gladius', 'short sword'), 'short'), (('flaming sword', 'fire'), 'wavy'), (('curved', 'scimitar'), 'curved'), (('broad', 'cleaver'), 'cleaver')],
    'axe': [(('greataxe',), 'great'), (('two axes', 'double'), 'double'), (('living wood', 'bark'), 'bearded')],
    'hammer': [(('mace',), 'mace'), (('club', 'barrel'), 'club'), (('frying pan',), 'pan'), (('frost hammer', 'giant'), 'maul'), (('smith', 'tongs'), 'war')],
    'spear': [(('trident',), 'trident'), (('lance',), 'lance'), (('harpoon', 'javelin'), 'harpoon'), (('valkyrie', 'winged'), 'winged'), (('crook',), 'glaive')],
    'dagger': [(('fans',), 'fan'), (('sickle',), 'sickle'), (('claw',), 'claw'), (('poison',), 'kris'), (('curved', 'blades'), 'curved')],
    'staff': [(('lantern', 'torch', 'censer'), 'lantern'), (('bone', 'skull'), 'skull'), (('moon',), 'moon'), (('star', 'aurora', 'starlight'), 'star'),
              (('bell',), 'bell'), (('totem', 'runestone', 'carved'), 'totem'), (('crystal ball', 'fortune', 'eye'), 'eye'), (('scroll', 'quill', 'book', 'professor'), 'tome'),
              (('owl', 'feather'), 'feather'), (('flower', 'blooming', 'petal'), 'flower'), (('living wood', 'branch', 'vine'), 'branch'),
              (('flame', 'fire', 'burning', 'sun'), 'flame'), (('crystal', 'ice', 'frost', 'snow'), 'crystal'), (('leaf', 'forest', 'sprout'), 'leaf'),
              (('clockwork', 'brass', 'chalice', 'coral'), 'ring')],
    'bow': [(('longbow', 'huge'), 'long'), (('short bow', 'slingshot', 'sling'), 'short'), (('recurve',), 'recurve'), (('leaf-blade', 'elven'), 'composite'), (('desert', 'horn'), 'horn')],
    'gun': [(('cannon', 'catapult'), 'cannon'), (('musket',), ''), (('harpoon',), 'harpoon')],
    'crossbow': [(('repeating',), 'repeating'), (('golden crossbow', 'admiral', 'harpoon'), 'heavy')],
}


def preferred_variant(wtype, look):
    for words, v in VPREF.get(wtype, []):
        if any(w in look for w in words):
            return v
    return None
