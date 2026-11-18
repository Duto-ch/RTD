"""무기 디자인 v2 (2026-11-17): 종류마다 모양 변형 + 등급별 재질
- 모양: 캐릭터 설명(look) 키워드로 고른다 (예: greatsword → 대검, rapier → 세검, trident → 삼지창, frying pan → 프라이팬)
- 재질: 커먼 쇠·나무 → 언커먼 강철·속성색 손잡이 → 레어 은·보석 → 유니크 금·속성빛 날
그림은 anim.geo_weapon 과 같은 방식(축을 따라 각도마다 새로 찍고 외곽선)이라 어느 각도에서도 도트가 깔끔하다.
roster_art.py 가 캐릭터마다 CTX 를 바꾼 뒤 anim.geo_weapon 자리에 geo() 를 끼운다.
"""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'char-13'))
import anim as A

CTX = {'grade': 1, 'attr': 'red', 'var': {}}   # 지금 그리는 캐릭터: 등급·속성·무기별 모양

ATTR_GLOW = {'red': ('#ffe0c0', '#ff9a5a', '#d8501e'), 'blue': ('#eaf8ff', '#8cc8f0', '#4a8fe8'), 'green': ('#f0ffe0', '#9ad870', '#4f9d3a')}
GEM = {'red': '#ff4a5a', 'blue': '#4ab0ff', 'green': '#5ae07a'}
ATTR_DARK = {'red': '#9c2a30', 'blue': '#284c9a', 'green': '#2a7d36'}


def mat():
    g, a = CTX['grade'], CTX['attr']
    if g == 1:
        return dict(L='#d8dde4', M='#9aa3b0', D='#7d8590', guard='#b08850', grip='#6b3f1f', wood='#9a6235', woodD='#6b3f1f', gem=None, trim='#b08850')
    if g == 2:
        return dict(L='#eef6ff', M='#a9b8cc', D='#7d8aa0', guard='#c9d3e0', grip=ATTR_DARK[a], wood='#8a5a2e', woodD='#5a3a1a', gem=None, trim='#c9d3e0')
    if g == 3:
        return dict(L='#ffffff', M='#b8c4d8', D='#8a97ad', guard='#e6ecf4', grip='#3a2a3a', wood='#5a3a2a', woodD='#3a2418', gem=GEM[a], trim='#e6ecf4')
    hi, mid, lo = ATTR_GLOW[a]
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
                    f[q] = (m['L'] if t > 5 else ATTR_GLOW[CTX['attr']][1]) if ang % 20 == 0 else ATTR_GLOW[CTX['attr']][2]
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
        lit, mid, dark = A.ORB[name]
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
        elif name == 'staff_ice' or v == 'crystal':
            for t, r in zip(range(7, 13), [1, 2, 2, 1, 1, 0]):
                diamond(P(t), r, lambda q: lit if side(q) < -0.5 else (mid if side(q) < 0.6 else dark))
            f[P(9, -1)] = '#ffffff'
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


GEO_LEN_V = {('sword', 'great'): 14, ('sword', 'rapier'): 13, ('spear', 'lance'): 16, ('spear', 'trident'): 13, ('gun', 'cannon'): 9,
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
