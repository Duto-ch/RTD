"""게임 캐릭터 70명 — 아서 기준 새 비율 + 키 컬러 16색 (2026-11-21, 시안 v4)
v3(bodies_v3.py)에서 바꾼 것:
  - 옷 주색 = 레드·그린·블루 대신 키 컬러 16색 (docs/drafts/roster-v2-art/keys.py: 생김새에 어울리는 색 + 같은 무기·출신·계열끼리 겹치지 않게, 한 색 최대 5명)
    눈 색·가슴 보석·날개·고깔모자·두건도 키 컬러에서
  - 머리 장식을 위로 더 크게 (2~9줄): 왕관·티아라·투구 깃털·뿔·날개 투구·모자 깃털·고깔 두건·후광·꽃관
  - 장식이 없는 캐릭터: 리본(여성)·삐침 머리 한 가닥(남성)·뾰족 귀(엘프) 등 작은 장식으로 실루엣을 나눈다
(이하 v3 설명)
비율 (아서·이졸데·오베론, docs/drafts/pixellab-rule-test/README.md):
  머리 장식 2~9줄 · 머리(머리카락 포함) 10~18줄(9줄, 위 외곽선 9줄) · 몸 19~23줄(5줄) · 머리 폭 x4~18 (13줄만 x3~19) · 몸 폭 x5~17 · 가운데 x11
  머리/몸 나누는 줄 19 · 눈 세로 1x2 (9,15)·(13,15) · 외곽선 #2b1d2f · 발밑 신발 그늘색 · 팔·손·무기 없음 · 등급별 몸 색 수 10·12·14·15
생김새는 지금 게임 그림(roster-art/roster_art.py)과 같은 방식 — look(영어 설명) 낱말로 머리 모양·머리 장식·수염·옷자락·망토·날개 + 등급 장식.
아서·이졸데·오베론 3명은 이미 게임에 들어간 새 비율 그림 그대로.
실행: python3 docs/drafts/roster-v3/bodies_v3.py → bodies/<id>.png (24x24) · fronts.png (70명 정면) · compare.png (지금 ↔ 새 비율)
"""
import os, sys, json, re
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'roster-art'))
import roster_art as R
sys.path.insert(0, os.path.join(HERE, '..', 'roster-v2-art'))
import keys as KC
A, D = R.A, R.D
has, h = R.has, R.h

ROSTER = json.load(open(os.path.join(HERE, 'game-roster.json')))
LOOK = {c['id']: c for c in R.ROSTER}       # 시안 출신 8명 설명 포함

# ───── 새 비율 기본 틀 (짧은 머리) ─────
BASE = ["." * 24] * 9 + [
    ".......OOOOOOOOO........",  # 9  머리 위 외곽선
    ".....OOHHHHHHHHHOO......",  # 10 ┐
    "....OHHHHHHHHHHHHHO.....",  # 11 │
    "....OHHHHHHHHHHHHHO.....",  # 12 │
    "...OHHHHhHHHHHhHHHHO....",  # 13 │ 가장 넓은 줄 (x3~19)
    "....OHHHhSSSSShHHHO.....",  # 14 │ 앞머리 가운데 가르마 (아서처럼)
    ".....OHHSESSSESHHO......",  # 15 │ 눈 윗칸 (진한 눈동자) · 옆머리가 얼굴을 감싼다
    ".....OHsSISSSISsHO......",  # 16 │ 눈 아랫칸 (눈 색) · 볼
    "......OhSSSSSSShO.......",  # 17 │
    ".......OSSSSSSSO........",  # 18 ┘ 턱
    "......OCCCDDDCCCO.......",  # 19 ┐ 칼라
    "......OcCCCCCCCcO.......",  # 20 │
    ".....OAAAAAAAAAAAO......",  # 21 │ 벨트 — 아래로 갈수록 조금 넓어진다
    ".....OCCCCCCCCCCCO......",  # 22 │
    ".....OcbbcccccbbcO......",  # 23 ┘ 옷자락 + 신발 끝 (발밑 = 신발 그늘색)
]
COMMON = {**D.COMMON, 'E': '#2b1d2f'}


class Grid:
    def __init__(self):
        self.g = [list(r) for r in BASE]

    def put(self, x, y, k):
        if 0 <= x < 24 and 0 <= y < 24:
            self.g[y][x] = k

    def row(self, y, x0, text):
        for i, k in enumerate(text):
            if k != '.':
                self.put(x0 + i, y, k)

    def mirror_row(self, y, x0, text):
        """왼쪽에 그리고 가운데 x11 기준으로 오른쪽에도"""
        for i, k in enumerate(text):
            if k != '.':
                self.put(x0 + i, y, k)
                self.put(22 - (x0 + i), y, k)

    def recolor(self, ys, frm, to):
        for y in ys:
            for x in range(24):
                if self.g[y][x] in frm:
                    self.g[y][x] = to[frm.index(self.g[y][x])]


def hair_style(G, c, female):
    L, i = c['look'], c['id']
    if has(L, 'long white', 'long silver', 'long pale', 'flowing', 'seaweed hair', 'long hair') or (female and h(i + 'hs', 3) == 0):   # 긴 머리
        for y in range(15, 21):
            G.row(y, 4, 'OH'), G.row(y, 17, 'HO')
        G.row(17, 6, 'H'), G.row(17, 16, 'H'), G.row(20, 4, 'Oh'), G.row(20, 17, 'hO'), G.row(21, 4, 'O'), G.row(21, 18, 'O')
        return 'long'
    if female and h(i + 'hs', 3) == 1 or has(L, 'ponytail'):   # 포니테일 (오른쪽 뒤)
        G.row(11, 18, 'OO'), G.row(12, 19, 'HO'), G.row(13, 20, 'HO'), G.row(14, 20, 'HO'), G.row(15, 19, 'OhO'), G.row(16, 19, 'OO')
        return 'pony'
    if female:                                                  # 양갈래
        G.mirror_row(12, 1, 'OO'), G.mirror_row(13, 0, 'OHH'), G.mirror_row(14, 0, 'OHH'), G.mirror_row(15, 0, 'OhH'), G.mirror_row(16, 1, 'Oh'), G.mirror_row(17, 1, 'OO')
        return 'twin'
    if h(i + 'hs', 2) == 0:                                     # 삐친 머리
        G.row(6, 9, 'O...O'), G.row(7, 8, 'OHO.OHO'), G.row(8, 7, 'OHHOHHHOO'), G.row(9, 7, 'HHHHHHHHH')
        return 'spiky'
    return 'short'


def crown(G, pal, c):
    """큰 왕관 (4~9줄, x6~16): 뾰족 끝 3개 + 보석 띠 (보석 = 키 컬러)"""
    for y, line in {4: ".O...O...O.", 5: "OGO.OQO.OGO", 6: "OGGOGGGOGGO", 7: "OQGGGQGGGQO", 8: "OGGGGGGGGGO", 9: "OJJJJJJJJJO"}.items():
        G.row(y, 6, line)


def headgear(G, c, pal):
    """look 낱말로 머리 장식 하나. 반환: 모자 끝 흔들림 줄 수"""
    L = c['look']
    if has(L, 'wizard hat', 'tall blue hat', 'pointed hat', 'witch') and not has(L, 'sea witch', 'fire witch'):
        # 마녀 고깔모자 = 베로나 모자 모양 그대로 (사용자 결정), 새 비율에 맞춰 한 줄 위로
        pal['P'], pal['p'] = pal['C'], pal['c']
        for (x, y), k in R.VERONA_HAT.items():
            G.put(x, y - 2, k)
        G.row(10, 3, 'O'), G.row(10, 19, 'O')
        return 9
    if has(L, 'hood', 'veil', 'habit', 'shawl', 'sand scarf'):
        pal['P'], pal['p'] = (pal['C'], pal['c']) if not has(L, 'white fur') else ('#f2f2f2', '#c4c8d0')
        G.recolor(range(9, 18), 'Hh', 'Pp')
        if has(L, 'pointed'):
            G.row(3, 13, 'O'), G.row(4, 12, 'OPO'), G.row(5, 12, 'OPO'), G.row(6, 11, 'OPPO'), G.row(7, 10, 'OPPPO'), G.row(8, 9, 'OPPPPPO')
        if has(L, 'face scarf'):
            G.row(17, 7, 'ppppppppp'), G.row(18, 8, 'ppppppp')
        return 0
    if has(L, 'helmet', 'helm', 'visor', 'plate', 'armor') and not has(L, 'scale armor', 'bark'):
        pal['H'], pal['h'] = ('#e8e0c8', '#b8ad90') if has(L, 'skull') else ('#c9d3e0', '#8a97ad')
        G.row(13, 4, 'G' * 15)
        if has(L, 'visor'):
            G.row(14, 5, 'NNNNNNNNNNNNN'), G.row(15, 6, 'NNN'), G.row(15, 14, 'NNN')
            pal['N'] = '#5a6070'
        if has(L, 'horned', 'viking'):
            pal['K'], pal['k'] = '#f3e6c8', '#c9b48a'
            for y, line in {2: "O", 3: "OO", 4: "OKO", 5: "OKO", 6: "OKKO", 7: ".OKKO", 8: ".OkKKO", 9: "..OkKO", 10: "...OO"}.items():
                G.mirror_row(y, 0, line)
        elif has(L, 'winged'):
            for y, line in {4: "OO", 5: "OWO", 6: "OWWO", 7: "OWWWO", 8: ".OWWWO", 9: "..OWWO", 10: "...OO"}.items():
                G.mirror_row(y, 0, line)
        elif has(L, 'skull'):
            G.mirror_row(7, 5, 'OO'), G.mirror_row(8, 5, 'OHO'), G.mirror_row(9, 5, 'OHHO')
        elif has(L, 'plume', 'lion mane', 'crest') or c['grade'] >= 3:
            pal['P'], pal['p'] = (pal['C'], pal['c']) if not has(L, 'lion mane') else ('#e8a25a', '#b8702e')
            for y, line in {1: "...........OO...........", 2: "..........OPPO..........", 3: ".........OPPPPO.........", 4: "........OPPPPPPO........",
                            5: ".......OPPPPPPPPO.......", 6: ".......OpPPPPPPpO.......", 7: ".......OpppppppO........", 8: "........OGGGGGO........."}.items():
                G.row(y, 0, line)
        return 0
    if has(L, 'antler'):
        for y, line in {1: "...O..O.......O..O......", 2: "...OTOTO.....OTOTO......", 3: "....OTTO.....OTTO.......", 4: ".....OTO.....OTO........",
                        5: ".....OTO.....OTO........", 6: "......OTO...OTO.........", 7: "......OTO...OTO.........", 8: ".......OTO.OTO.........."}.items():
            G.row(y, 0, line)
        return 0
    if has(L, 'flower crown', 'vine crown'):
        pal['R'] = '#ff8ab0'
        G.row(9, 6, 'vVRvVYVvRVv'), G.row(8, 7, 'ORO.OYO.ORO'), G.row(7, 8, 'O...O...O')
        return 0
    if has(L, 'tiara'):
        G.row(6, 10, 'OGO'), G.row(7, 8, 'OGOQOGO'), G.row(8, 7, 'OGGGGGGGO')
        if has(L, 'horn tiara'):
            pal['G'] = '#f3e6c8'
            G.mirror_row(5, 5, 'OO'), G.mirror_row(6, 5, 'OGO'), G.mirror_row(7, 6, 'OG')
        return 0
    if has(L, 'crown'):
        crown(G, pal, c)
        if has(L, 'ice crystal crown', 'crystal crown'):
            pal['G'], pal['J'] = '#bfe6ff', '#6aa8e8'
        elif has(L, 'coral crown'):
            pal['G'], pal['J'] = '#ff9a8a', '#c85a5a'
        return 0
    if re.search(r'\bcap\b', L) or has(L, 'feathered hat', 'tricorn', 'fur cap', 'raincoat'):
        hat = '#f0c040' if has(L, 'raincoat') else ('#8a5a2e' if has(L, 'fur cap') else ('#3a3040' if has(L, 'tricorn') else pal['C']))
        pal['P'], pal['p'] = hat, R.D_shade(hat)
        G.row(6, 8, 'OOOOOOO'), G.row(7, 7, 'OPPPPPPPO'), G.row(8, 6, 'OPPPPPPPPPO'), G.row(9, 3, 'OOOOpppppppppppppOO'), G.row(10, 3, 'OOOO'), G.row(10, 17, 'OOO')
        if has(L, 'feather', 'tricorn', 'plume'):
            G.row(1, 17, 'O'), G.row(2, 16, 'OWO'), G.row(3, 15, 'OWWO'), G.row(4, 15, 'OWWO'), G.row(5, 15, 'OWO'), G.row(6, 15, 'OW')
        return 0
    if has(L, 'bandana', 'war paint', 'headband'):
        pal['R'] = pal['C']
        G.row(12, 4, 'R' * 15), G.row(12, 1, 'RRO'), G.row(13, 0, 'ORR')
        if has(L, 'war paint'):
            G.row(16, 7, 's'), G.row(16, 15, 's')
        return 0
    if has(L, 'goggled', 'goggles'):
        pal['N'], pal['L'] = '#5a6070', '#bfe6ff'
        G.row(12, 4, 'NNNLLNNNLLNNNNN'.replace('L', 'L'))
        return 0
    if has(L, 'mask'):
        pal['N'] = '#2f8a5a'
        G.row(15, 6, 'NNNENNNENNN')
        return 0
    if has(L, 'glasses', 'spectacles', 'professor'):
        G.row(15, 8, 'O.O'), G.row(15, 12, 'O.O'), G.row(14, 8, 'OOO'), G.row(14, 12, 'OOO'), G.row(15, 11, 'O')
        return 0
    if has(L, 'fox-eared', 'wolf skull', 'wolf pelt', 'feral', 'bear pelt', 'great bear', 'lion pelt'):
        pal['P'], pal['p'] = ('#e8e0c8', '#b8ad90') if has(L, 'wolf') else ('#8a5a2e', '#5a3a1a') if has(L, 'bear') else ('#e8a25a', '#b8702e')
        G.mirror_row(4, 5, 'O'), G.mirror_row(5, 5, 'OO'), G.mirror_row(6, 5, 'OPO'), G.mirror_row(7, 5, 'OpPO'), G.mirror_row(8, 5, 'OpPPO')
        G.recolor(range(10, 13), 'Hh', 'Pp')
        return 0
    if has(L, 'halo', 'saint', 'holy', 'priestess', 'nun', 'goddess'):
        G.row(3, 8, 'YYYYYYY'), G.row(4, 7, 'Y'), G.row(4, 15, 'Y'), G.row(5, 8, 'YYYYYYY')
        return 0
    if has(L, 'owl on her shoulder', 'spirit owl'):
        pal['P'], pal['p'] = '#c8a070', '#8a6a40'
        G.row(9, 16, 'OOO'), G.row(10, 15, 'OPPPO'), G.row(11, 15, 'OEPEO'), G.row(12, 16, 'OYO')
        return 0
    return 0


def body(c):
    L, i, attr, grade = c['look'], c['id'], c['attr'], c['grade']
    female = i in R.FEMALE_IDS or has(L, *R.FEMALE)
    key = KC.KEYS[c['key']]
    Cm, Cs = key[0], key[1]
    hair, hair_s = R.pick_hair(c)
    pal = {'H': hair, 'h': hair_s, 'C': Cm, 'c': Cs, 'D': R.GRADE_ACCENT[grade],
           'A': '#f5c542' if grade == 4 else ['#7a4a22', '#5a3a1a', '#8a5a2e'][h(i + 'a', 3)],
           'B': ['#5a3a2a', '#4a3020', '#3a3040', '#6a4a2a'][h(i + 'b', 4)], 'I': key[1] if c['key'] not in ('ivory', 'charcoal') else '#5a6a8a',
           'S': R.SKIN[h(i + 's', 4)] if not has(L, 'pale') else '#f4e8e4'}
    if has(L, 'glowing red eyes'):
        pal['I'] = '#ff3a3a'
    G = Grid()
    style = hair_style(G, c, female)
    before = [r[:] for r in G.g]
    hat_rows = headgear(G, c, pal)
    hg = before != G.g
    if has(L, 'beard', 'bearded', 'grizzled', 'viking', 'warlord', 'veteran') and not female:   # 수염
        pal['R'] = hair if not has(L, 'grey', 'old ', 'snow') else '#e8ecf0'
        G.row(17, 6, 'ORRRRRRRRRO'), G.row(18, 7, 'ORRRRRRRO'), G.row(19, 9, 'ORRRO')
    if has(L, 'scar'):
        G.row(14, 13, 'R'), G.row(15, 14, 'R')
        pal.setdefault('R', '#c0392b')
    if has(L, 'robe', 'gown', 'dress', 'habit', 'skirt', 'apron', 'shawl', 'tartan') or c['style'] == 'hex' and h(i + 'r', 2) == 0:   # 긴 옷자락
        G.row(22, 5, 'OCCCCCCCCCCCO'), G.row(23, 5, 'OcccccccccccO')
        if has(L, 'apron'):
            G.row(20, 8, 'WWWWWWW'), G.row(21, 8, 'WWWWWWW'), G.row(22, 8, 'WWWWWWW')
    if grade == 4 or has(L, 'cape', 'cloak', 'mantle'):   # 망토 (몸 양옆으로)
        for y in (19, 20):
            G.row(y, 4, 'Oc'), G.row(y, 17, 'cO')
        for y in (21, 22, 23):
            G.row(y, 3, 'Oc'), G.row(y, 18, 'cO')
        G.row(18, 5, 'OO'), G.row(18, 16, 'OO')
    if has(L, 'wings', 'fairy', 'butterfly', 'flaming wings', 'firebird', 'gust'):   # 날개 (몸 뒤 양옆)
        pal['Z'] = '#ffd66b' if has(L, 'flaming', 'firebird') else key[3][0]
        for y, line in {13: "..OO", 14: ".OZZ", 15: "OZZZ", 16: "OZZZ", 17: ".OZZ", 18: "..OO"}.items():
            G.mirror_row(y, 0, line)
    if has(L, 'elven', 'elf', 'fairy'):          # 뾰족 귀
        G.row(14, 2, 'OO'), G.row(15, 2, 'OSSO'), G.row(14, 19, 'OO'), G.row(15, 17, 'OSSO')
    if not hg and grade < 3:
        if female:                                 # 리본 (키 컬러 보석색), 머리 오른쪽 위
            pal['V2'] = key[2]
            G.row(7, 14, 'OO.OO'), G.row(8, 14, 'OVOVO'.replace('V', 'X')), G.row(9, 15, 'OXO'), G.row(10, 15, 'O.O')
            pal['X'] = key[2]
        elif h(i + 'ahoge', 2) == 0 and style != 'spiky':   # 삐침 머리 한 가닥
            G.row(6, 12, 'OO'), G.row(7, 11, 'OHO'), G.row(8, 11, 'OH')
    # ── 등급 장식: 언커먼 버클 · 레어 은 견갑 + 가슴 보석 (+ 머리 장식 없으면 은 머리띠) · 유니크 금 견갑 + 금관 ──
    if grade >= 2:
        G.put(11, 21, 'G' if grade >= 3 else 'U')
    if grade >= 3:
        G.row(19, 6, 'OUU'), G.row(19, 14, 'UUO'), G.put(11, 20, 'Q')
        if not hg:
            if grade == 3:
                G.row(12, 4, 'UUUUUUUQUUUUUUU')
            else:
                crown(G, pal, c)
    pal['U'] = {1: '#c9d3e0', 2: '#c9d3e0', 3: '#dfe6ee', 4: '#f5c542'}[grade]
    pal['Q'] = key[2]
    pal.setdefault('P', pal['C']), pal.setdefault('p', pal['c'])
    for k, v in {'K': '#f3e6c8', 'k': '#c9b48a', 'R': '#e0393e', 'Z': '#ffffff', 'N': '#5a6070', 'W': '#ffffff', 'Y': '#ffe066',
                 'J': '#c98f2a', 'L': '#bfe6ff', 'X': '#ff9ac8'}.items():
        pal.setdefault(k, v)
    pal = {**COMMON, **pal}
    if 'b' not in pal:
        pal['b'] = R.D_shade(pal['B'])
    img = Image.new('RGBA', (24, 24), (0, 0, 0, 0))
    for y, r in enumerate(G.g):
        for x, k in enumerate(r):
            if k != '.':
                img.putpixel((x, y), A.rgba(pal[k]))
    img = R.cap_colors(img, R.BODY_COLORS[grade])
    img.info = {'split': 19, 'eyes': [(9, 15), (13, 15)]}
    return img, pal, hat_rows, female, style


def front(c):
    if c['id'] in R.CUSTOM_BODY:
        f, _ = R.CUSTOM_BODY[c['id']]
        return Image.open(os.path.join(R.NEW_RATIO, f)).convert('RGBA'), 'custom'
    img, *_ , style = body(c)
    return img, style


GRADE_NAME = {1: '커먼', 2: '언커먼', 3: '레어', 4: '유니크'}
GRADE_COL = {1: (166, 112, 74), 2: (150, 160, 176), 3: (150, 96, 200), 4: (226, 172, 40)}
ATTR_ORDER = {'red': 0, 'blue': 1, 'green': 2}


if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'bodies_v4'), exist_ok=True)
    font = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 15)
    fontb = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 22)
    chars = []
    allc = [{**LOOK.get(g['id'], {}), **g} for g in ROSTER]
    for c in allc:
        c['wtype'] = R.pick_weapon(c)
    KEY_OF = KC.assign_keys(allc)
    # 이미 게임에 들어간 새 비율 그림 3명은 옷 색이 정해져 있다 → 그 색으로 고정, 밀려난 색은 같은 색 캐릭터(가장 낮은 등급) 하나와 맞바꾼다
    FIXED = {'arthur': 'cobalt', 'isolde': 'crimson', 'oberon': 'leaf'}
    by = {c['id']: c for c in allc}
    for cid, k in FIXED.items():
        if KEY_OF[cid] != k:
            other = min((o for o in KEY_OF if KEY_OF[o] == k and o not in FIXED), key=lambda o: (by[o]['grade'], o))
            KEY_OF[other], KEY_OF[cid] = KEY_OF[cid], k
    json.dump(KEY_OF, open(os.path.join(HERE, 'keys_v4.json'), 'w'), indent=0)
    for c in allc:
        c['key'] = KEY_OF[c['id']]
        img, style = front(c)
        img.save(os.path.join(HERE, 'bodies_v4', f"{c['id']}.png"))
        chars.append((c, img))
    # 70명 정면: 등급별 줄, 속성 순 (몸 6배 + 이름)
    z, cw, chh, per = 6, 24 * 6 + 14, 24 * 6 + 26, 12
    rows = []
    for gr in (1, 2, 3, 4):
        lst = sorted([x for x in chars if x[0]['grade'] == gr], key=lambda x: (ATTR_ORDER[x[0]['attr']], x[0]['id']))
        rows.append((gr, lst))
    H = sum(40 + ((len(l) + per - 1) // per) * chh for _, l in rows) + 10
    out = Image.new('RGB', (per * cw + 20, H), (246, 241, 228))
    d = ImageDraw.Draw(out)
    y = 6
    for gr, lst in rows:
        d.text((12, y + 6), f"{GRADE_NAME[gr]} {len(lst)}명", fill=GRADE_COL[gr], font=fontb)
        y += 40
        for k, (c, img) in enumerate(lst):
            x0, y0 = 10 + (k % per) * cw, y + (k // per) * chh
            out.paste(img.resize((24 * z, 24 * z), Image.NEAREST), (x0 + 7, y0), img.resize((24 * z, 24 * z), Image.NEAREST))
            t = f"{c['name']} · {KC.KEY_NAMES[c['key']]}"
            w = d.textlength(t, font=font) + 14
            tx = x0 + cw / 2 - w / 2
            d.rectangle([tx, y0 + 24 * z + 5, tx + 10, y0 + 24 * z + 15], fill=KC.KEYS[c['key']][0], outline=(43, 29, 47))
            d.text((tx + 14, y0 + 24 * z + 2), t, fill=(60, 40, 30), font=font)
        y += ((len(lst) + per - 1) // per) * chh
    out.save(os.path.join(HERE, 'fronts_v4.png'))
    # 지금 ↔ 새 비율 (몸 4배, 위 = 지금 · 아래 = 새)
    z2, cw2 = 4, 24 * 4 + 8
    ordered = [x for _, l in rows for x in l]
    per2 = 18
    nrow = (len(ordered) + per2 - 1) // per2
    out2 = Image.new('RGB', (per2 * cw2 + 10, nrow * (24 * z2 * 2 + 30) + 10), (246, 241, 228))
    d2 = ImageDraw.Draw(out2)
    for k, (c, img) in enumerate(ordered):
        x0, y0 = 5 + (k % per2) * cw2, 5 + (k // per2) * (24 * z2 * 2 + 30)
        old = Image.open(os.path.join(HERE, 'bodies', f"{c['id']}.png")).convert('RGBA')   # v3 (RGB 키 컬러)
        for j, im in enumerate((old, img)):
            b = im.resize((24 * z2, 24 * z2), Image.NEAREST)
            out2.paste(b, (x0, y0 + j * 24 * z2), b)
        t = c['name']
        d2.text((x0 + cw2 / 2 - d2.textlength(t, font=font) / 2 - 4, y0 + 2 * 24 * z2 + 2), t, fill=(60, 40, 30), font=font)
    out2.save(os.path.join(HERE, 'compare_v4.png'))
    from collections import Counter
    print('ok', len(chars), Counter(s for _, s in [(c, s) for c, s in [(c, front(c)[1]) for c, _ in chars]]))
