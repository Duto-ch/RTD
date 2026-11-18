"""24x24 캔버스 · 기본 캐릭터 13x13 시안 (2026-11-17)
규칙: 본체(두상+몸)는 아래 가운데 13x13 상자(x5~17, y11~23) 고정 — 두상 7줄(y11~17) + 몸 6줄(y18~23) = 2등신
      위 11px(y0~10)와 좌우 여백은 모자·투구·뿔·장식·무기 공간 · 두상은 모든 캐릭터가 같은 틀
실행: python3 docs/drafts/char-13/draw.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.dirname(os.path.abspath(__file__))

BASE = ["." * 24] * 11 + [
    "........OOOOOOO.........",  # 11 ┐
    "......OOHHHHHHHOO.......",  # 12 │
    ".....OHHHHHHHHHHHO......",  # 13 │
    ".....OHhSSHHHSShHO......",  # 14 │ 두상 13x7 (모두 동일)
    ".....OHhSESSSEShHO......",  # 15 │ 세로눈 1x2 (2026-11-17): 윗칸 진한 눈동자
    ".....OHsSISSSISsHO......",  # 16 │            아랫칸 눈 색 I
    "......OOSSSSSSSOO.......",  # 17 ┘
    "........OCCDCCO.........",  # 18 ┐
    ".......OcCCCCCcO........",  # 19 │
    ".......OSCCCCCSO........",  # 20 │ 몸 6줄
    "........OAAAAAO.........",  # 21 │
    "........OBBOBBO.........",  # 22 │
    "........ObbObbO.........",  # 23 ┘ 발밑: 검은 줄 대신 신발 그늘색 b (바깥 외곽선만)
]

COMMON = {
    'O': '#2b1d2f', 'E': '#2b1d2f', 'S': '#ffe2c8', 's': '#f7a8a0', 'W': '#ffffff',
    'G': '#f5c542', 'L': '#eef6ff', 'T': '#9a6235', 't': '#6b3f1f', 'F': '#ff8a2a', 'Y': '#ffe066',
    'V': '#6fcf5a', 'v': '#3f9a3a', 'M': '#c9d3e0',
}
ROBE = {22: "........OcccccO.........", 23: "........OOOOOOO........."}
STAFF = lambda a, b: {y: "..................OTO..." for y in range(a, b)}

CHARS = [
    {'id': 'red_sword', 'key': '레드', 'name': '카이라', 'role': '불꽃 검사',
     'pal': {'H': '#6b3a2a', 'h': '#4a2418', 'C': '#e0393e', 'c': '#a8232f', 'D': '#ffe2b0', 'A': '#f5c542', 'B': '#5a3a2a', 'I': '#c0392b', 'R': '#e0393e'},
     'over': {
         11: "...................O....",
         12: "..................OLO...",
         13: "...RRORRRRRRRRRRROOLO...",
         14: "....R.............OLO...",
         15: "..................OLO...",
         16: "..................OLO...",
         17: "..................OLO...",
         18: "..................OLO...",
         19: ".................OGGGO..",
         20: "..................OtO...",
         21: "..................OGO...",
         22: "...................O...."}},
    {'id': 'red_mage', 'key': '레드', 'name': '베로나', 'role': '화염 마법사',
     'pal': {'H': '#ffd66b', 'h': '#e0a83a', 'C': '#d8343c', 'c': '#9c2230', 'D': '#f5c542', 'A': '#f5c542', 'B': '#5a2a3a', 'I': '#d0602a'},
     'over': {
         1: "..............OO........",
         2: ".............OCO........",
         3: "............OCCO........",
         4: "...........OCCCO........",
         5: "..........OCcCCO........",
         6: "..........OCcCCCO.......",
         7: ".........OCCcCCCO.......",
         8: ".........OCCCCCCO.......",
         9: "........OGGGGGGGGO......",
         10: "........OCCCCCCCCO......",
         11: "......OCCCCCCCCCCO......",
         12: "...OOOcccccccccccOOO....",
         13: "...................O....",
         14: "..................OFO...",
         15: ".................OFYFO..",
         16: "..................OFO...",
         **STAFF(17, 22),
         20: ".......OSCCCCCSO..OTO...",
         22: "........OcccccO...OTO...",
         23: "........OOOOOOO...OOO..."}},
    {'id': 'green_archer', 'key': '그린', 'name': '엘린', 'role': '숲 궁수',
     'pal': {'H': '#e8a25a', 'h': '#b8702e', 'C': '#3fae4a', 'c': '#2a7d36', 'D': '#b8ec90', 'A': '#8a5a2e', 'B': '#5a3a2a', 'I': '#2a8f4a'},
     'over': {
         9: "..............O.........",
         10: ".............OVO........",
         11: ".............vV.........",
         13: "..................OO....",
         14: "..OOO.............HO....",
         15: ".OTOL.............hO....",
         16: "OTO.L.............O.....",
         17: "OTO.L...................",
         18: "OTO.L...................",
         19: "OTO.L...................",
         20: "OTO.L...................",
         21: ".OTOL...................",
         22: "..OOO..................."}},
    {'id': 'green_druid', 'key': '그린', 'name': '토른', 'role': '숲의 드루이드',
     'pal': {'H': '#5a7a2e', 'h': '#3c5420', 'C': '#4f9d3a', 'c': '#356e28', 'D': '#e8e0b0', 'A': '#8a5a2e', 'B': '#4a3020', 'I': '#3c8a3c'},
     'over': {
         3: "...O..O.......O..O......",
         4: "...OTOTO.....OTOTO......",
         5: "....OTTO.....OTTO.......",
         6: ".....OTO.....OTO........",
         7: ".....OTO.....OTO........",
         8: "......OTO...OTO.........",
         9: "......OTO...OTO.........",
         10: ".......OTO.OTO..........",
         11: "........t.....t.........",
         12: ".OVO....................",
         13: "OVvVO...................",
         14: ".OVO....................",
         **{y: ".OTO...................." for y in range(15, 22)},
         20: ".OTOOS..................",
         22: ".OOO....OcccccO.........",
         23: "........OOOOOOO........."}},
    {'id': 'blue_knight', 'key': '블루', 'name': '아델', 'role': '푸른 기사',
     'pal': {'H': '#c9d3e0', 'h': '#8a97ad', 'C': '#3a6fd8', 'c': '#284c9a', 'D': '#9cc4ff', 'A': '#f5c542', 'B': '#39415a', 'I': '#3a6fd8'},
     'over': {
         7: "..........OOO...........",
         8: "........OOCDCOO.........",
         9: ".......OCCDDDCCO........",
         10: ".......OcCCCCCcO........",
         13: "......GGGGGGGGGGG.......",
         17: "OOOOO...................",
         18: "OCGCO...................",
         19: "OGGGO...................",
         20: "OCGCO...................",
         21: ".OCO....................",
         22: "..O....................."}},
    {'id': 'blue_priest', 'key': '블루', 'name': '세레나', 'role': '얼음 사제',
     'pal': {'H': '#d4e8ff', 'h': '#8fb4e0', 'C': '#4a8fe8', 'c': '#2f62b0', 'D': '#ffffff', 'A': '#f5c542', 'B': '#2f3a5a', 'I': '#4a8fe8'},
     'over': {
         6: "...........O............",
         7: "..........OLO...........",
         8: "......O..OLDLO..O.......",
         9: ".....OLO.OLDLO.OLO......",
         10: "......OGGGGGGGGGO.......",
         11: "....................O...",
         12: "...................OLO..",
         13: "..................OLDLO.",
         14: "...................OLO..",
         **{y: "...................OTO.." for y in range(15, 23)},
         17: "....OH...........HO.OTO.",
         18: "....OH...........HO.OTO.",
         19: "....Oh...........hO.OTO.",
         20: "....Oh...........hO.OTO.",
         21: ".....O...........O..OTO.",
         22: "........OcccccO.....OTO.",
         23: "........OOOOOOO.....OOO."}},
]
# 사제 지팡이 줄 맞춤 (15~16줄)
for y in (15, 16):
    CHARS[5]['over'][y] = "....................OTO."


def build(ch):
    rows = [list(r) for r in BASE]
    for y, line in ch['over'].items():
        assert len(line) == 24, (ch['id'], y, len(line), line)
        for x, k in enumerate(line):
            if k != '.':
                rows[y][x] = k
    # 로브 밑단이 검은 줄로 끝나면 옷 색으로 채운다 (발밑 규칙과 같게)
    if ''.join(rows[23][8:15]) == 'OOOOOOO':
        rows[22][9:14] = list('CCCCC')
        rows[23][9:14] = list('ccccc')
    pal = {**COMMON, **ch['pal']}
    if 'b' not in pal:  # 신발 그늘색 = 신발 색을 어둡게
        h = pal.get('B', '#4a3020').lstrip('#')
        pal['b'] = '#%02x%02x%02x' % tuple(int(int(h[i:i + 2], 16) * 0.7) for i in (0, 2, 4))
    img = Image.new('RGBA', (24, 24), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, k in enumerate(r):
            if k != '.':
                h = pal[k].lstrip('#')
                img.putpixel((x, y), tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,))
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
        for y in range(24):
            for x in range(24):
                d.rectangle([ox + x * z, oy + y * z, ox + (x + 1) * z - 1, oy + (y + 1) * z - 1], fill='#e9e2d0' if (x + y) % 2 else '#f1ebdc')
        big = sp.resize((24 * z, 24 * z), Image.NEAREST)
        if guide:
            for k in range(25):
                d.line([ox, oy + k * z, ox + 24 * z, oy + k * z], fill='#cfc4ac')
                d.line([ox + k * z, oy, ox + k * z, oy + 24 * z], fill='#cfc4ac')
        img.paste(big, (ox, oy), big)
        if guide:
            d.rectangle([ox, oy, ox + 24 * z - 1, oy + 11 * z - 1], outline='#b07cd8', width=2)            # 장식 공간 11px
            d.rectangle([ox + 5 * z, oy + 11 * z, ox + 18 * z - 1, oy + 24 * z - 1], outline='#d02020', width=3)  # 본체 13x13
            d.rectangle([ox + 5 * z + 4, oy + 11 * z + 4, ox + 18 * z - 5, oy + 18 * z - 1], outline='#18a8d8', width=2)  # 두상
        d.rectangle([ox, oy + 24 * z + 12, ox + 14, oy + 24 * z + 26], fill=KEYCOL[ch['key']])
        d.text((ox + 22, oy + 24 * z + 6), f"{ch['name']} · {ch['role']}", font=FONT, fill='#3a2a1a')
        d.text((ox + 22, oy + 24 * z + 36), f"키 컬러 {ch['key']}", font=FONT_S, fill='#7a6a5a')
    return img


def field(sprites, scale):
    cell = 64
    img = Image.new('RGB', (cell * 6 + 40, cell + 60), '#5f8a3e')
    d = ImageDraw.Draw(img)
    for i in range(6):
        x0 = 20 + i * cell
        d.rectangle([x0, 30, x0 + cell - 1, 30 + cell - 1], fill='#8c8c86' if i % 2 else '#a4a49c')
    for i, sp in enumerate(sprites):
        big = sp.resize((24 * scale, 24 * scale), Image.NEAREST)
        img.paste(big, (20 + i * cell + cell // 2 - 12 * scale + scale // 2, 30 + cell - 4 - 24 * scale), big)
    d.text((20, 4), f"칸 64px · 1px = {scale}px · 캔버스 {24 * scale} · 본체 {13 * scale}px", font=FONT_S, fill='#ffffff')
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
