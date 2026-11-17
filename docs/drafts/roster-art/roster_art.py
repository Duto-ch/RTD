"""캐릭터 96명 그림 + 대기·공격 애니메이션 (2026-11-17)
규칙: docs/CHARACTER_ART.md — 24x24 캔버스·본체 13x13·두상 동일·팔 없음 + 둥근 손·무기 레이어(왼쪽)·대기 때 대각선·
      세로눈 1x2·발밑 신발 그늘색·키 컬러(속성)·월드 플리퍼 풍
외형은 roster.json 의 look(영어 설명) 키워드로 정한다: 머리 모양·머리 색·머리 장식·수염·망토·날개·무기·방패.
실행: python3 docs/drafts/roster-art/roster_art.py  →  sheets/<id>.png (대기 8 + 공격 프레임), bodies/<id>.png, roster-art.json(열람용)
"""
import os, sys, json, hashlib, math, io, base64
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'char-13'))
import draw as D          # 공통 몸 틀 (BASE) · 그리기
import anim as A          # 무기 레이어 · 손 · 애니메이션
import weapons as Wp
import weapons_v2 as W2   # 무기 모양 변형 + 등급별 재질

A.geo_weapon_orig = A.geo_weapon
A.geo_weapon = W2.geo
BASE_LEN = dict(A.GEO_LEN)

A.ARMLESS = True
ROSTER = json.load(open(os.path.join(HERE, 'roster.json')))


def h(s, n):
    """id 로 정해지는 고정 난수 (같은 캐릭터는 항상 같은 모습)"""
    return int(hashlib.md5(s.encode()).hexdigest(), 16) % n


def has(look, *words):
    return any(w in look for w in words)


# ---------- 색 ----------
OUTFIT = {  # 속성(키 컬러)별 옷 주색 후보 (주색, 그늘)
    'red': [('#d8434a', '#9c2a30'), ('#c0392b', '#862518'), ('#e0603a', '#a8402a'), ('#c43a5a', '#8a2440')],
    'blue': [('#3a6fd8', '#284c9a'), ('#2f62b0', '#1f4380'), ('#4a8fe8', '#2f62b0'), ('#3a5fa8', '#26407a')],
    'green': [('#3fae4a', '#2a7d36'), ('#4f9d3a', '#356e28'), ('#5fae3a', '#3f7d28'), ('#2f8a5a', '#1f6040')],
}
IRIS = {'red': '#c0392b', 'blue': '#3a6fd8', 'green': '#2a8f4a'}
GRADE_ACCENT = {1: '#f0e0c0', 2: '#ffffff', 3: '#dfe6ee', 4: '#f5c542'}  # 칼라·장식 (커먼 크림 → 유니크 금색)
SKIN = ['#ffe2c8', '#f6d2b0', '#ecc09a', '#d9a27a']
HAIR = {
    'red': ('#c0392b', '#862518'), 'silver': ('#d4d8e0', '#9aa0ac'), 'white': ('#f2f2f2', '#c4c8d0'),
    'golden': ('#f5c542', '#c98f2a'), 'blonde': ('#ffd66b', '#e0a83a'), 'grey': ('#a8acb4', '#7a7e88'),
    'black': ('#3a2a3a', '#241826'), 'brown': ('#6b3a2a', '#4a2418'), 'auburn': ('#a0502a', '#70361c'),
    'ginger': ('#e8a25a', '#b8702e'), 'green': ('#5a8a3a', '#3c5c26'), 'blue': ('#5a7ac8', '#3a5296'),
}


def pick_hair(c):
    L = c['look']
    if has(L, 'red-haired', 'golden-red', 'red-bearded'):
        return HAIR['red']
    if has(L, 'silver'):
        return HAIR['silver']
    if has(L, 'white hair', 'long white', 'white fur', 'white wolf'):
        return HAIR['white']
    if has(L, 'golden', 'sun crown'):
        return HAIR['golden']
    if has(L, 'grey', 'old ', 'elder'):
        return HAIR['grey']
    if has(L, 'seaweed', 'leaf', 'forest', 'flower', 'druid', 'vine'):
        return HAIR['green'] if h(c['id'] + 'hg', 3) == 0 else HAIR[['brown', 'ginger', 'blonde'][h(c['id'], 3)]]
    if has(L, 'pale', 'ice', 'frost', 'snow', 'aurora'):
        return HAIR[['silver', 'white', 'blue'][h(c['id'], 3)]]
    return HAIR[['brown', 'black', 'blonde', 'auburn', 'ginger', 'brown'][h(c['id'], 6)]]


FEMALE = ('girl', 'woman', 'witch', 'nun', 'priestess', 'sorceress', 'dancer', 'maiden', 'queen', 'lady', 'saint',
          'valkyrie', 'shaman', 'herbalist', 'cook', 'bard girl', 'fortune', 'beekeeper', 'messenger', 'duelist', 'archmage queen', 'shrine')
FEMALE_IDS = {'helga', 'kale', 'yvonne', 'molly', 'siri', 'greta', 'claire', 'elva', 'cecilia', 'rosalind', 'isolde', 'brynhild',
              'ingrid', 'emma', 'aud', 'lucy', 'sophie', 'sigrid', 'liv', 'agnes', 'nora', 'kristin', 'eleanor', 'asta', 'solveig',
              'vivian', 'astrid', 'kit', 'holly', 'inga', 'mae', 'britt', 'hailey', 'freya', 'edda', 'thea', 'marit', 'ylva',
              'rowena', 'gwen', 'celeste', 'freydis'}


# ---------- 무기 ----------
def pick_weapon(c):
    L, st = c['look'], c['style']
    if has(L, 'crossbow'):
        return 'crossbow'
    if has(L, 'rifle', 'musket', 'cannon', 'matchlock', 'harpoon gun'):
        return 'gun'
    if has(L, 'longbow', 'short bow', 'recurve', ' bow', 'slingshot', 'sling'):
        return 'bow'
    if has(L, 'spear', 'lance', 'trident', 'javelin', 'harpoon', 'crook'):
        return 'spear'
    if has(L, 'axe', 'greataxe'):
        return 'axe'
    if has(L, 'hammer', 'mace', 'club', 'tongs', 'frying pan', 'barrel'):
        return 'hammer'
    if has(L, 'dagger', 'knife', 'knives', 'blades', 'fans', 'claw', 'sickle'):
        return 'dagger'
    if has(L, 'sword', 'rapier', 'gladius', 'blade'):
        return 'sword'
    if has(L, 'staff', 'wand', 'totem', 'scepter', 'orb', 'lantern', 'torch', 'censer', 'chalice', 'bell', 'flute', 'harp',
           'scroll', 'quill', 'flask', 'crystal ball', 'runestone', 'basket', 'backpack', 'catapult', 'pot', 'trap', 'banner'):
        return 'staff'
    return {'bow': 'bow', 'rapid': 'dagger', 'heavy': 'gun', 'blast': 'staff', 'hex': 'staff', 'brawl': 'sword', 'aid': 'staff'}[st]


STAFF_BY_ATTR = {'red': 'staff', 'blue': 'staff_ice', 'green': 'staff_leaf'}
FX_BY_ATTR = {
    'red': ((255, 154, 60, 255), (255, 224, 102, 255), (255, 214, 102, 255)),
    'blue': ((106, 168, 232, 255), (230, 246, 255, 255), (255, 255, 255, 255)),
    'green': ((111, 207, 90, 255), (200, 240, 138, 255), (255, 240, 140, 255)),
}
A.IDLE_TILT.update({'gun': 45, 'crossbow': 45, 'hammer': 45, 'staff_ice': 25, 'staff_leaf': 25})
A.HAND.update({'gun': (16, 20), 'crossbow': (16, 20), 'hammer': (16, 20)})


# ---------- 몸 그리기 ----------
class Grid:
    def __init__(self):
        self.g = [list(r) for r in D.BASE]

    def put(self, x, y, k):
        if 0 <= x < 24 and 0 <= y < 24:
            self.g[y][x] = k

    def row(self, y, x0, text):
        for i, k in enumerate(text):
            if k != '.':
                self.put(x0 + i, y, k)

    def over(self):
        base = D.BASE
        return {y: ''.join(k if k != base[y][x] else '.' for x, k in enumerate(r)) for y, r in enumerate(self.g)}


def hair_style(G, c, female):
    L, i = c['look'], c['id']
    if has(L, 'long white', 'long silver', 'flowing', 'seaweed hair') or (female and h(i + 'hs', 3) == 0):   # 긴 머리
        for y in range(15, 20):
            G.row(y, 4, 'OH'), G.row(y, 17, 'HO')
        G.row(19, 4, 'Oh'), G.row(19, 17, 'hO'), G.row(20, 5, 'O'), G.row(20, 17, 'O')
        return 'long'
    if female and h(i + 'hs', 3) == 1:   # 포니테일
        G.row(12, 17, 'OO'), G.row(13, 18, 'HO'), G.row(14, 18, 'HO'), G.row(15, 18, 'hO'), G.row(16, 18, 'O')
        return 'pony'
    if female:                           # 양갈래
        for x0 in (3, 18):
            G.row(13, x0, 'OO'), G.row(14, x0, 'HO' if x0 == 3 else 'OH'), G.row(15, x0, 'HO' if x0 == 3 else 'OH'), G.row(16, x0, 'hO' if x0 == 3 else 'Oh'), G.row(17, x0 + (0 if x0 == 3 else 0), 'OO')
        return 'twin'
    if h(i + 'hs', 2) == 0:              # 삐친 머리
        G.row(10, 8, 'O.O.O.O'), G.row(11, 8, 'OHOHOHO')
        return 'spiky'
    return 'short'


def headgear(G, c, pal, female):
    """look 키워드로 머리 장식 하나(또는 둘)를 얹는다. 반환: 모자 끝 흔들림 줄 수"""
    L = c['look']
    gold = 'G'
    hat_rows = 0
    if has(L, 'wizard hat', 'tall blue hat', 'oversized red hat', 'witch') and not has(L, 'sea witch', 'fire witch'):
        pal['P'], pal['p'] = pal['C'], pal['c']
        for y, line in {1: "..............OO........", 2: ".............OPO........", 3: "............OPPO........", 4: "...........OPPPO........",
                        5: "..........OPpPPO........", 6: "..........OPpPPPO.......", 7: ".........OPPpPPPO.......", 8: ".........OPPPPPPO.......",
                        9: "........OGGGGGGGGO......", 10: "........OPPPPPPPPO......", 11: "......OPPPPPPPPPPO......",
                        12: "...OOOpppppppppppOOO...."}.items():
            G.row(y, 0, line)
        return 9
    if has(L, 'hood', 'veil', 'habit', 'shawl', 'scarf', 'sand scarf'):
        pal['P'], pal['p'] = (pal['C'], pal['c']) if not has(L, 'white fur') else ('#f2f2f2', '#c4c8d0')
        for y in (12, 13):
            for x in range(24):
                if G.g[y][x] in 'Hh':
                    G.put(x, y, 'P')
        G.row(10, 10, 'OOO'), G.row(11, 9, 'OPPPPO'), G.row(12, 6, 'OPPPPPPPPPO')
        for y in range(14, 19):
            G.row(y, 5, 'OP'), G.row(y, 16, 'PO')
        G.row(19, 6, 'O'), G.row(19, 16, 'O')
        return 0
    if has(L, 'helmet', 'helm', 'visor', 'plate', 'armor') and not has(L, 'scale armor', 'bark'):
        pal['H'], pal['h'] = ('#e8e0c8', '#b8ad90') if has(L, 'skull') else ('#c9d3e0', '#8a97ad')
        G.row(13, 6, gold * 11)
        if has(L, 'horned', 'viking'):
            for y, line in {7: "..O.................O...", 8: ".OKO...............OKO..", 9: ".OKKO.............OKKO..",
                            10: "..OKKO...........OKKO...", 11: "...OkKOO.......OOKkO...."}.items():
                G.row(y, 0, line)
            pal['K'], pal['k'] = '#f3e6c8', '#c9b48a'
        elif has(L, 'winged'):
            for y, line in {9: "...OO..............OO...", 10: "..OWWO............OWWO..", 11: "...OWWO..........OWWO...", 12: "....OO............OO...."}.items():
                G.row(y, 0, line)
        elif has(L, 'plume', 'lion mane') or c['grade'] >= 3:
            pal['P'], pal['p'] = pal['C'], pal['c']
            for y, line in {6: "..........OOOO..........", 7: "........OOPPPPOO........", 8: ".......OPPPPPPPPO.......", 9: ".......OpPPPPPPpO.......", 10: ".......OpppppppppO......"}.items():
                G.row(y, 0, line)
            if has(L, 'lion mane'):
                pal['P'], pal['p'] = '#e8a25a', '#b8702e'
        return 0
    if has(L, 'antler'):
        for y, line in {3: "...O..O.......O..O......", 4: "...OTOTO.....OTOTO......", 5: "....OTTO.....OTTO.......", 6: ".....OTO.....OTO........",
                        7: ".....OTO.....OTO........", 8: "......OTO...OTO.........", 9: "......OTO...OTO.........", 10: ".......OTO.OTO.........."}.items():
            G.row(y, 0, line)
        return 0
    if has(L, 'crown', 'tiara'):
        jewel = {'red': 'R', 'blue': 'Q', 'green': 'V'}[c['attr']]
        pal['R'], pal['Q'] = '#e0393e', '#6ab0ff'
        if has(L, 'flower crown', 'vine crown'):
            G.row(11, 7, 'OVROVYVROVO'.replace('O', 'v'))
            pal['R'] = '#ff8ab0'
        else:
            G.row(8, 7, 'O...O...O'), G.row(9, 7, 'GO.OGO.OG'), G.row(10, 7, 'G' + jewel + 'GGGGG' + jewel + 'G'), G.row(11, 7, 'OGGGGGGGO')
        return 0
    if has(L, 'cap', 'feathered hat', 'tricorn', 'fur cap', 'raincoat'):
        hat = '#f0c040' if has(L, 'raincoat') else ('#8a5a2e' if has(L, 'fur cap') else pal['C'])
        pal['P'], pal['p'] = hat, A.rgba(hat) and D_shade(hat)
        G.row(9, 8, 'OOOOOOO'), G.row(10, 7, 'OPPPPPPPO'), G.row(11, 6, 'OPPPPPPPPPO'), G.row(12, 3, 'OOOOpppppppppppO')
        if has(L, 'feather', 'tricorn', 'plume'):
            G.row(6, 16, 'O'), G.row(7, 15, 'OWO'), G.row(8, 15, 'OWO'), G.row(9, 15, 'OW')
        return 0
    if has(L, 'bandana', 'war paint', 'headband'):
        G.row(13, 3, 'RROR' + 'R' * 10 + 'O')
        pal['R'] = pal['C']
        return 0
    if has(L, 'goggled', 'goggles', 'glasses', 'spectacles'):
        G.row(14, 8, 'NLNNNLN' if not has(L, 'glasses', 'spectacles') else '.......')
        if has(L, 'glasses', 'spectacles'):
            G.row(15, 8, 'O'), G.row(15, 14, 'O'), G.row(15, 10, 'OOO')
        pal['N'] = '#5a6070'
        return 0
    if has(L, 'mushroom'):
        pal['P'], pal['p'] = '#e0393e', '#a8232f'
        for y, line in {6: "........OOOOOOO.........", 7: "......OOPWPPPWPOO.......", 8: ".....OPPPPPWPPPPPO......", 9: "....OPWPPPPPPPWPPPO.....",
                        10: "....OppppppppppppO......", 11: ".....OOOOOOOOOOOO......."}.items():
            G.row(y, 0, line)
        return 0
    if has(L, 'fox-eared', 'wolf skull', 'wolf pelt', 'feral'):
        pal['P'] = pal['H'] if has(L, 'fox') else '#e8e0c8'
        G.row(8, 7, 'O.....O'.replace('.', '.')), G.row(8, 7, 'O'), G.row(8, 15, 'O')
        G.row(9, 6, 'OPO'), G.row(9, 14, 'OPO'), G.row(10, 6, 'OPPO'), G.row(10, 13, 'OPPO')
        return 0
    if has(L, 'halo', 'saint', 'holy', 'priestess', 'nun', 'goddess'):
        G.row(7, 8, 'OYYYYYO'), G.row(8, 7, 'Y.......Y'.replace('.', '.')), G.row(8, 7, 'Y'), G.row(8, 15, 'Y')
        return 0
    if has(L, 'pinwheel'):
        G.row(6, 10, 'OROVO'), G.row(7, 10, 'OVYRO'), G.row(8, 10, 'OROVO'), G.row(9, 12, 'T'), G.row(10, 12, 'T')
        pal['R'] = '#e0393e'
        return 0
    return hat_rows


def D_shade(hexc, k=0.7):
    hc = hexc.lstrip('#')
    return '#%02x%02x%02x' % tuple(int(int(hc[i:i + 2], 16) * k) for i in (0, 2, 4))


def body(c):
    L, i, attr, grade = c['look'], c['id'], c['attr'], c['grade']
    female = i in FEMALE_IDS or has(L, *FEMALE)
    Cm, Cs = OUTFIT[attr][h(i + 'o', 4)]
    hair, hair_s = pick_hair(c)
    pal = {'H': hair, 'h': hair_s, 'C': Cm, 'c': Cs, 'D': GRADE_ACCENT[grade], 'A': '#f5c542' if grade == 4 else ['#7a4a22', '#5a3a1a', '#8a5a2e'][h(i + 'a', 3)],
           'B': ['#5a3a2a', '#4a3020', '#3a3040', '#6a4a2a'][h(i + 'b', 4)], 'I': IRIS[attr], 'S': SKIN[h(i + 's', 4) if not has(L, 'pale') else 0]}
    if has(L, 'pale'):
        pal['S'] = '#f4e8e4'
    G = Grid()
    style = hair_style(G, c, female)
    before = [r[:] for r in G.g]
    hat_rows = headgear(G, c, pal, female)
    hg_applied = before != G.g
    if has(L, 'beard', 'bearded', 'grizzled', 'viking', 'warlord', 'veteran') and not female:   # 수염
        pal['R'] = hair if not has(L, 'grey') else '#c8ccd4'
        G.row(17, 6, 'OORRRRRRROO'), G.row(18, 8, 'ORRRRRO')
    if has(L, 'robe', 'gown', 'dress', 'habit', 'skirt', 'apron', 'shawl') or c['style'] in ('hex',) and h(i + 'r', 2) == 0:   # 긴 옷자락
        G.row(22, 8, 'OCCCCCO'), G.row(23, 8, 'OcccccO')
    if grade == 4 or has(L, 'cape', 'cloak'):   # 망토 끝자락 (몸 옆으로 살짝)
        pal['K2'] = D_shade(Cm, 0.55)
        for y in range(19, 23):
            G.row(y, 7, 'O'), G.row(y, 15, 'O')
        G.row(19, 6, 'O'), G.row(20, 6, 'Oc'), G.row(21, 6, 'Oc'), G.row(22, 6, 'Oc'), G.row(23, 6, 'OO')
        G.row(20, 15, 'cO'), G.row(21, 15, 'cO'), G.row(22, 15, 'cO'), G.row(23, 15, 'OO')
        G.row(19, 16, 'O')
    if has(L, 'wings', 'fairy', 'butterfly', 'flaming wings', 'firebird'):   # 날개 (몸 뒤 양옆)
        wc = '#ffd66b' if has(L, 'flaming', 'firebird') else ('#c8f0ff' if attr != 'green' else '#e8ffb0')
        pal['Z'] = wc
        for y, (l, r) in {15: ('..OO', 'OO..'), 16: ('.OZZ', 'ZZO.'), 17: ('OZZZ', 'ZZZO'), 18: ('.OZZ', 'ZZO.'), 19: ('..OO', 'OO..')}.items():
            G.row(y, 1, l), G.row(y, 19, r)
    # ── 등급이 오를수록 하나씩 늘어나는 장식 ──
    #  언커먼: 금속 버클 · 레어: 은 견갑 + 가슴 보석 (+ 머리 장식이 없으면 은 머리띠) · 유니크: 금 견갑·보석·금관, 망토, 반짝임
    if grade >= 2:
        G.put(11, 21, 'G' if grade >= 3 else 'U')
    if grade >= 3:
        G.row(18, 7, 'OUU'), G.row(18, 13, 'UUO'), G.put(11, 19, 'Q')
        if not hg_applied:
            if grade == 3:
                G.row(13, 6, 'UUUUUQUUUUU')
            else:
                G.row(8, 7, 'O...O...O'), G.row(9, 7, 'GO.OGO.OG'), G.row(10, 7, 'GQGGGGGQG'), G.row(11, 7, 'OGGGGGGGO')
    pal['U'] = {1: '#c9d3e0', 2: '#c9d3e0', 3: '#dfe6ee', 4: '#f5c542'}[grade]
    pal['Q'] = {'red': '#ff4a5a', 'blue': '#4ab0ff', 'green': '#5ae07a'}[attr]
    over = G.over()
    pal.setdefault('P', pal['C']), pal.setdefault('p', pal['c'])
    for k in ('K', 'k', 'R', 'Z', 'N', 'W', 'Y'):
        pal.setdefault(k, {'K': '#f3e6c8', 'k': '#c9b48a', 'R': '#e0393e', 'Q': '#6ab0ff', 'Z': '#ffffff', 'N': '#5a6070', 'W': '#ffffff', 'Y': '#ffe066'}[k])
    pal.pop('K2', None)
    img = A.noarms(D.build({'id': i, 'pal': pal, 'over': over}))   # 팔 없음 (둥근 손이 따로)
    return img, {**D.COMMON, **pal}, hat_rows, female, style


# ---------- 공격: 총·석궁 쏘기 ----------
def fire(ch, weapon, hand, idle_deg):
    """조준(들어 올려 멈춤) → 발사: 총구 섬광 + 반동(몸·손 뒤로) + 탄환 속도선 → 회복"""
    b = ch['img']
    keys = [  # (각도, 머리 dx, 머리 dy, 손 dx, 섬광, 탄 거리(-1 없음), ms)
        (70, -1, 0, -1, 0, -1, 80), (90, -1, 1, -1, 0, -1, 200),
        (90, -1, -1, -3, 3, 0, 40), (90, 0, 0, -2, 1, 8, 50), (90, 0, 0, -1, 0, 16, 60), (90, 0, 0, 0, 0, 24, 60),
        (70, 0, 0, 0, 0, -1, 90), (idle_deg, 0, 0, 0, 0, -1, 120)]
    out = []
    mir = ch.get('mirror')
    for deg, hdx, hdy, hx, fl, bx, ms in keys:
        hd = (hand[0] + hx, hand[1])
        def after(c, x, y, deg=deg, fl=fl, bx=bx, hd=hd):
            tx, ty = A.tip_of(weapon, deg, (A.OX + hd[0], A.OY + hd[1]))
            if fl:
                A.spark(c, tx + 2, ty, fl)
            if bx >= 0:
                g = ImageDraw.Draw(c)
                g.line([(tx + 2 + bx, ty), (tx + 6 + bx, ty)], fill=(255, 224, 102, 255))
                g.line([(tx + bx - 4, ty), (tx + 1 + bx, ty)], fill=A.SMEAR)
        out.append((A.compose(A.pose(b, -hdx if mir else hdx, hdy), weapon, deg, hd, extra_after=after, ch=ch,
                              hands=A.hands_for({**ch, 'spear_off': -4}, 'spear', deg)), ms))
    return out


def animate(c):
    img, pal, hat_rows, female, style = body(c)
    w = pick_weapon(c)
    shield = 'shield' in c['look'] and w in ('sword', 'spear', 'hammer', 'axe')
    ch = {'img': img, 'pal': pal, 'mirror': w != 'bow', 'shield': shield, 'armless': True, 'free_x': 6, 'fx': FX_BY_ATTR[c['attr']],
          'shield_img': Wp.paint(["..OOOOO.".strip('.') and ".OOOOO.", "OCCGCcO", "OCCGCcO", "OGGGGGO", "OCCGCcO", ".OCGcO.", "..OcO..", "...O..."],
                                 {'O': '#2b1d2f', 'C': pal['C'], 'c': pal['c'], 'G': GRADE_ACCENT[max(2, c['grade'])] if c['grade'] < 4 else '#f5c542'})}
    if w == 'staff':
        w = STAFF_BY_ATTR[c['attr']]
    var = W2.pick_variant(w, c['look'], c['grade'], c['id'])
    W2.CTX.update(grade=c['grade'], attr=c['attr'], var={w: var})
    A.GEO_LEN.clear(); A.GEO_LEN.update(BASE_LEN)
    if (w, var) in W2.GEO_LEN_V:
        A.GEO_LEN[w] = W2.GEO_LEN_V[(w, var)]
    tilt = A.IDLE_TILT.get(w, 45)
    if w == 'bow':
        hand = A.HAND['bow']
        idle = A.idle(ch, 'bow', hand, deg=A.IDLE_TILT['bow'], hat_rows=hat_rows,
                      extra=lambda cc, x, y, i: ImageDraw.Draw(cc).line(list(A.bow_tips(A.IDLE_TILT['bow'], x, y)), fill=(238, 246, 255, 255)))
        attack = A.shoot(ch, hand)
    elif w.startswith('staff'):
        hand = A.HAND['staff']
        idle = A.idle(ch, w, hand, deg=tilt, hat_rows=hat_rows)
        attack = A.cast(ch, hand, w, tilt)
    elif w in ('gun', 'crossbow'):
        hand = A.HAND[w]
        idle = A.idle(ch, w, hand, deg=tilt, hat_rows=hat_rows)
        attack = fire(ch, w, hand, tilt)
    elif w == 'spear':
        hand = A.HAND['spear']
        idle = A.idle(ch, 'spear', hand, deg=45, hat_rows=hat_rows)
        attack = A.thrust(ch, 'spear', hand)
    elif w == 'dagger':
        hand = A.HAND['dagger']
        idle = A.idle(ch, 'dagger', hand, deg=45, hat_rows=hat_rows)
        attack = A.thrust(ch, 'dagger', hand, A.STAB2)
    else:  # sword · axe · hammer
        hand = A.HAND.get(w, (16, 20))
        idle = A.idle(ch, w, hand, deg=45, hat_rows=hat_rows)
        attack = A.swing(ch, w, hand, 45)
    if c['grade'] == 4:   # 유니크: 대기 중 몸 주위에 반짝임이 돌아가며 핀다
        spots = [(2, 9), (21, 12), (19, 5), (4, 16), (20, 19), (6, 6), (18, 15), (3, 12)]
        idle = [(sparkle(f, spots[k % len(spots)], k), ms) for k, (f, ms) in enumerate(idle)]
    return {'body': img, 'idle': idle, 'attack': attack, 'weapon': w, 'variant': var, 'shield': shield, 'female': female, 'hair': style}


def sparkle(frame, pos, k):
    f = frame.copy()
    x, y = A.OX + pos[0], A.OY + pos[1]
    A.spark(f, x, y, 1 + (k % 2))
    return f


def sheet(frames):
    s = Image.new('RGBA', (A.W * len(frames), A.H), (0, 0, 0, 0))
    for k, (f, _) in enumerate(frames):
        s.alpha_composite(f, (k * A.W, 0))
    return s


def uri(img):
    b = io.BytesIO()
    img.save(b, 'PNG')
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'sheets'), exist_ok=True)
    os.makedirs(os.path.join(HERE, 'bodies'), exist_ok=True)
    out = []
    for c in ROSTER:
        r = animate(c)
        r['body'].save(os.path.join(HERE, 'bodies', f"{c['id']}.png"))
        frames = r['idle'] + r['attack']
        sh = sheet(frames)
        sh.save(os.path.join(HERE, 'sheets', f"{c['id']}.png"))
        out.append({**c, 'weapon': r['weapon'], 'variant': r['variant'], 'shield': r['shield'], 'idle': {'n': len(r['idle']), 'ms': [m for _, m in r['idle']]},
                    'attack': {'n': len(r['attack']), 'ms': [m for _, m in r['attack']]}, 'src': uri(sh)})
    # ── 시안 8종 (2026-11-17 테스트로 만든 캐릭터, docs/drafts/char-13/anim.py) — 도감에 함께 싣는다 (게임 로스터에는 아직 없음) ──
    A.geo_weapon = A.geo_weapon_orig          # 시안 그대로의 무기 (v2 모양·재질 없이)
    A.GEO_LEN.clear(); A.GEO_LEN.update(BASE_LEN)
    TEST = {'sword': ('t_kaira', '카이라', 'red', '불꽃 검사', 'sword', True), 'staff': ('t_verona', '베로나', 'red', '화염 마법사', 'staff', False),
            'bow': ('t_elin', '엘린', 'green', '숲 궁수', 'bow', False), 'knight': ('t_adel', '아델', 'blue', '푸른 기사', 'spear', False),
            'axe': ('t_bran', '브란', 'red', '뿔 투구 도끼 전사', 'axe', False), 'leaf': ('t_thorn', '토른', 'green', '숲의 드루이드', 'staff_leaf', False),
            'ice': ('t_serena', '세레나', 'blue', '얼음 사제', 'staff_ice', False), 'dagger': ('t_nix', '닉스', 'blue', '두건 도적', 'dagger', False)}
    for a in A.build_all():
        cid, name, attr, title, w, shield = TEST[a['key']]
        frames = a['idle'] + a['attack']
        sh = sheet(frames)
        sh.save(os.path.join(HERE, 'sheets', f"{cid}.png"))
        out.append({'id': cid, 'name': name, 'attr': attr, 'grade': 0, 'style': '', 'title': title, 'look': 'test draft', 'weapon': w, 'variant': '',
                    'shield': shield, 'idle': {'n': len(a['idle']), 'ms': [m for _, m in a['idle']]},
                    'attack': {'n': len(a['attack']), 'ms': [m for _, m in a['attack']]}, 'src': uri(sh)})
    A.geo_weapon = W2.geo
    json.dump({'W': A.W, 'H': A.H, 'OX': A.OX, 'OY': A.OY, 'chars': out}, open(os.path.join(HERE, 'roster-art.json'), 'w'))
    # 한눈에 보기: 대기 첫 프레임 96명 (속성별 줄)
    z = 4
    cw, chh = 30, 30
    grid = Image.new('RGB', (cw * z * 16, chh * z * 6), '#f6f1e4')
    for k, c in enumerate(ROSTER):
        f = Image.open(os.path.join(HERE, 'sheets', f"{c['id']}.png")).crop((A.OX - 3, A.OY - 5, A.OX - 3 + cw, A.OY - 5 + chh))
        b = f.resize((cw * z, chh * z), Image.NEAREST)
        grid.paste(b, ((k % 16) * cw * z, (k // 16) * chh * z), b)
    grid.save(os.path.join(HERE, 'overview.png'))
    from collections import Counter
    print('ok', len(out), Counter(o['weapon'] for o in out))
