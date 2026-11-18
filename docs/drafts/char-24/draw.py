"""24x24 캐릭터 시안 (2026-11-17)
규칙: 캔버스 24x24 · 본체 높이 16px(y8~23) 고정 · 위 8px(y0~7)는 모자·투구·뿔·장식 공간
      두상(x6~17, y8~15)은 모든 캐릭터가 같은 틀 · 차이는 의상·머리·무기·장식으로만
실행: python3 docs/drafts/char-24/draw.py  →  같은 폴더에 PNG 생성
"""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.dirname(os.path.abspath(__file__))

# 공통 몸 틀 — 두상 8줄(y8~15) + 몸 8줄(y16~23) = 2등신
BASE = [
    "........................",  # 0  ┐
    "........................",  # 1  │
    "........................",  # 2  │ 장식 공간 (8px)
    "........................",  # 3  │
    "........................",  # 4  │
    "........................",  # 5  │
    "........................",  # 6  │
    "........................",  # 7  ┘
    "........OOOOOOOO........",  # 8  ┐
    "......OOHHHHHHHHOO......",  # 9  │
    "......OHHHHHHHHHHO......",  # 10 │
    "......OHHHHHHHHHHO......",  # 11 │ 두상 (모두 동일)
    "......OHhSSHHSShHO......",  # 12 │
    "......OHhEESSEEhHO......",  # 13 │
    "......OHsIWSSIWsHO......",  # 14 │
    ".......OHSSSSSSHO.......",  # 15 ┘
    "........OCCDDCCO........",  # 16 ┐
    ".......OcCCCCCCcO.......",  # 17 │
    ".......OcCCCCCCcO.......",  # 18 │
    ".......OSCCCCCCSO.......",  # 19 │ 몸
    "........OAAAAAAO........",  # 20 │
    "........OCCCCCCO........",  # 21 │
    "........OBBOOBBO........",  # 22 │
    "........OOO..OOO........",  # 23 ┘
]

COMMON = {
    'O': '#2b1d2f', 'E': '#2b1d2f', 'S': '#ffe2c8', 's': '#f7a8a0', 'W': '#ffffff', 'm': '#c25a55',
    'G': '#f5c542', 'L': '#eef6ff', 'T': '#9a6235', 't': '#6b3f1f', 'F': '#ff8a2a', 'Y': '#ffe066',
    'V': '#6fcf5a', 'v': '#3f9a3a', 'M': '#c9d3e0', 'N': '#8a97ad',
}

ROBE = {22: "........OccccccO........", 23: "........OOOOOOOO........"}

CHARS = [
    {
        'id': 'red_sword', 'key': '레드', 'name': '카이라', 'role': '불꽃 검사',
        'pal': {'H': '#6b3a2a', 'h': '#4a2418', 'C': '#e0393e', 'c': '#a8232f', 'D': '#ffe2b0', 'A': '#f5c542', 'B': '#5a3a2a', 'I': '#c0392b', 'R': '#e0393e'},
        'over': {
            9: "..................O.....",
            10: "......ORRRRRRRRRRORRO...",
            11: ".................OLLOR..",
            12: ".................OLMO...",
            13: ".................OLMO...",
            14: ".................OLMO...",
            15: ".................OLMO...",
            16: ".................OLMO...",
            17: ".................OLMO...",
            18: "................OGGGGO..",
            19: ".................OttO...",
            20: ".................OttO...",
            21: ".................OGGO...",
            22: "..................OO...."},
    },
    {
        'id': 'red_mage', 'key': '레드', 'name': '베로나', 'role': '화염 마법사',
        'pal': {'H': '#ffd66b', 'h': '#e0a83a', 'C': '#d8343c', 'c': '#9c2230', 'D': '#f5c542', 'A': '#f5c542', 'B': '#5a2a3a', 'I': '#d0602a'},
        'over': {
            0: "..............OO........",
            1: ".............OCO........",
            2: "............OCCO........",
            3: "...........OCCCO........",
            4: "..........OCcCCO........",
            5: ".........OCCcCCCO.......",
            6: "........OCCCcCCCO.......",
            7: "........OGGGGGGGO.......",
            8: ".......OCCCCCCCCCO......",
            9: "....OOOccccccccccOOO....",
            10: "...................O....",
            11: "..................OFO...",
            12: ".................OFYFO..",
            13: "..................OFO...",
            14: "..................OTO...",
            15: "..................OTO...",
            16: "..................OTO...",
            17: "..................OTO...",
            18: "..................OTO...",
            19: "................OSOTO...",
            20: "..................OTO...",
            21: "..................OTO...",
            **ROBE},
    },
    {
        'id': 'green_archer', 'key': '그린', 'name': '엘린', 'role': '숲 궁수',
        'pal': {'H': '#e8a25a', 'h': '#b8702e', 'C': '#3fae4a', 'c': '#2a7d36', 'D': '#b8ec90', 'A': '#8a5a2e', 'B': '#5a3a2a', 'I': '#2a8f4a'},
        'over': {
            6: "...............O........",
            7: "..............OVO.......",
            8: "..............vV........",
            11: "...OOO..................",
            10: "..................OO....",
            12: "..OTOL............HO....",
            13: ".OTO.L............hO....",
            14: ".OTO.L............O.....",
            15: ".OTO.L..................",
            16: ".OTO.L..................",
            17: ".OTO.L..................",
            18: ".OTO.L..................",
            19: ".OTO.L..................",
            20: "..OTOL..................",
            21: "...OOO.................."},
    },
    {
        'id': 'green_druid', 'key': '그린', 'name': '토른', 'role': '숲의 드루이드',
        'pal': {'H': '#5a7a2e', 'h': '#3c5420', 'C': '#4f9d3a', 'c': '#356e28', 'D': '#e8e0b0', 'A': '#8a5a2e', 'B': '#4a3020', 'I': '#3c8a3c'},
        'over': {
            1: "....O..O........O..O....",
            2: "....OTOTO......OTOTO....",
            3: ".....OTTO......OTTO.....",
            4: "......OTO......OTO......",
            5: "......OTO......OTO......",
            6: ".......OTO....OTO.......",
            7: ".......OTO....OTO.......",
            8: "........t......t........",
            9: "..OVO...................",
            10: ".OVvVO..................",
            11: "..OVO...................",
            12: "..OTO...................",
            13: "..OTO...................",
            14: "..OTO...................",
            15: "..OTO...................",
            16: "..OTO...................",
            17: "..OTO...................",
            18: "..OTO...................",
            19: "..OTOOS.................",
            20: "..OTO...................",
            21: "..OTO...................",
            22: "..OOO...OccccccO........",
            23: "........OOOOOOOO........"},
    },
    {
        'id': 'blue_knight', 'key': '블루', 'name': '아델', 'role': '푸른 기사',
        'pal': {'H': '#c9d3e0', 'h': '#8a97ad', 'C': '#3a6fd8', 'c': '#284c9a', 'D': '#9cc4ff', 'A': '#f5c542', 'B': '#39415a', 'I': '#3a6fd8'},
        'over': {
            4: "..........OOOO..........",
            5: "........OOCDDCOO........",
            6: ".......OCCDDDDCCO.......",
            7: ".......OcCCCCCCcO.......",
            11: ".......GGGGGGGGGG.......",
            14: ".OOOOO..................",
            15: ".OCGCO..................",
            16: ".OGGGO..................",
            17: ".OCGCO..................",
            18: ".OCGCO..................",
            19: "..OCO...................",
            20: "...O...................."},
    },
    {
        'id': 'blue_priest', 'key': '블루', 'name': '세레나', 'role': '얼음 사제',
        'pal': {'H': '#d4e8ff', 'h': '#8fb4e0', 'C': '#4a8fe8', 'c': '#2f62b0', 'D': '#ffffff', 'A': '#f5c542', 'B': '#2f3a5a', 'I': '#4a8fe8'},
        'over': {
            3: "...........OO...........",
            4: "........O.OLLO.O........",
            5: ".......OLOLDDLOLO.......",
            6: ".......OLLLDDLLLO.......",
            7: "........OGGGGGGO........",
            9: "....................O...",
            10: "...................OLO..",
            11: "..................OLDLO.",
            12: "...................OLO..",
            13: "...................OTO..",
            14: "...................OTO..",
            15: "......OH........HO.OTO..",
            16: "......OH........HO.OTO..",
            17: "......Oh........hO.OTO..",
            18: "......Oh........hO.OTO..",
            19: ".......O........O..OTO..",
            21: "...................OTO..",
            22: "........OccccccO...OTO..",
            23: "........OOOOOOOO...OOO.."},
    },
]


def build(ch):
    rows = [list(r) for r in BASE]
    for y, line in ch['over'].items():
        assert len(line) == 24, (ch['id'], y, len(line))
        for x, k in enumerate(line):
            if k != '.':
                rows[y][x] = k
    pal = {**COMMON, **ch['pal']}
    img = Image.new('RGBA', (24, 24), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        assert len(r) == 24
        for x, k in enumerate(r):
            if k != '.':
                img.putpixel((x, y), Image.new('RGB', (1, 1), pal[k]).getpixel((0, 0)) + (255,))
    return img


FONT = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 22)
FONT_S = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 16)
KEYCOL = {'레드': '#d8343c', '그린': '#3f9a3a', '블루': '#3a6fd8'}


def sheet(sprites, z=10, guide=False):
    cw, chh = 24 * z + 40, 24 * z + 90
    img = Image.new('RGB', (cw * 6, chh), '#f6f1e4')
    d = ImageDraw.Draw(img)
    for i, (ch, sp) in enumerate(zip(CHARS, sprites)):
        ox, oy = i * cw + 20, 20
        # 체크 배경 (투명 영역)
        for y in range(24):
            for x in range(24):
                c = '#e9e2d0' if (x + y) % 2 else '#f1ebdc'
                d.rectangle([ox + x * z, oy + y * z, ox + (x + 1) * z - 1, oy + (y + 1) * z - 1], fill=c)
        img.paste(sp.resize((24 * z, 24 * z), Image.NEAREST), (ox, oy), sp.resize((24 * z, 24 * z), Image.NEAREST))
        if guide:
            for k in range(25):
                d.line([ox, oy + k * z, ox + 24 * z, oy + k * z], fill='#cfc4ac', width=1)
                d.line([ox + k * z, oy, ox + k * z, oy + 24 * z], fill='#cfc4ac', width=1)
            img.paste(sp.resize((24 * z, 24 * z), Image.NEAREST), (ox, oy), sp.resize((24 * z, 24 * z), Image.NEAREST))
            d.rectangle([ox, oy, ox + 24 * z - 1, oy + 8 * z - 1], outline='#b07cd8', width=2)  # 장식 공간
            d.rectangle([ox + 6 * z, oy + 8 * z, ox + 18 * z - 1, oy + 16 * z - 1], outline='#18a8d8', width=3)  # 두상
            d.rectangle([ox + 7 * z, oy + 16 * z, ox + 17 * z - 1, oy + 24 * z - 1], outline='#e86a2a', width=3)  # 몸
            d.line([ox - 10, oy + 8 * z, ox + 24 * z + 10, oy + 8 * z], fill='#d02020', width=2)
        d.rectangle([ox, oy + 24 * z + 12, ox + 14, oy + 24 * z + 26], fill=KEYCOL[ch['key']])
        d.text((ox + 22, oy + 24 * z + 6), f"{ch['name']} · {ch['role']}", font=FONT, fill='#3a2a1a')
        d.text((ox + 22, oy + 24 * z + 36), f"키 컬러 {ch['key']}", font=FONT_S, fill='#7a6a5a')
    return img


def field(sprites, scale):
    """게임 화면 위 (아트 1px = 화면 scale px), 64px 칸 6개"""
    cell = 64
    img = Image.new('RGB', (cell * 6 + 40, cell + 60), '#5f8a3e')
    d = ImageDraw.Draw(img)
    for i in range(6):
        x0 = 20 + i * cell
        d.rectangle([x0, 30, x0 + cell - 1, 30 + cell - 1], fill='#8c8c86' if i % 2 else '#a4a49c')
    for i, sp in enumerate(sprites):
        big = sp.resize((24 * scale, 24 * scale), Image.NEAREST)
        x = 20 + i * cell + cell // 2 - 12 * scale
        y = 30 + cell - 4 - 24 * scale
        img.paste(big, (x, y), big)
    d.text((20, 4), f"칸 64px · 1px = {scale}px · 캔버스 {24 * scale} · 본체 {16 * scale}px", font=FONT_S, fill='#ffffff')
    return img


if __name__ == '__main__':
    sprites = [build(c) for c in CHARS]
    for c, s in zip(CHARS, sprites):
        s.save(os.path.join(OUT, f"{c['id']}.png"))
    sheet(sprites).save(os.path.join(OUT, 'sheet.png'))
    sheet(sprites, guide=True).save(os.path.join(OUT, 'sheet-guide.png'))
    f2, f3 = field(sprites, 2), field(sprites, 3)
    both = Image.new('RGB', (f2.width, f2.height + f3.height + 10), '#2b1d2f')
    both.paste(f2, (0, 0)); both.paste(f3, (0, f2.height + 10))
    both.save(os.path.join(OUT, 'in-game.png'))
    print('ok')
