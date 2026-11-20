"""PixelLab 비율로 직접 찍은 도트 — 오베론(요정왕, 그린 유니크) 정면 24x24 (2026-11-20)
비율은 PixelLab 아서·이졸데(perfectPixel 정리본)에서 잰 값:
  머리 장식 5~9줄 · 머리(머리카락 포함) 10~18줄(9줄) · 몸 19~23줄(5줄) · 머리 폭 x4~18 · 몸 폭 x5~17 · 가운데 x11
  눈 = 세로 1x2 (x9·x13, 15~16줄: 윗칸 진한 눈동자, 아랫칸 캐릭터 눈 색) — 우리 규칙 그대로
  발밑 = 검은 줄 대신 옷 그늘색·신발색 (우리 규칙), 몸 색 15 이하 (유니크)
실행: python3 docs/drafts/pixellab-rule-test/handdot_oberon.py → oberon_handdot.png (+ 비교 oberon_compare.png)
"""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
PAL = {
    'O': '#2b1d2f',                  # 외곽선 = 눈동자
    'H': '#eef2e6', 'h': '#b9c9b4',  # 은빛 머리
    'S': '#ffe2c8', 's': '#f7a8a0',  # 피부 · 볼
    'I': '#2a8f4a',                  # 눈 색 (그린)
    'L': '#7fd05a', 'l': '#3f9a3a',  # 덩굴 잎
    'F': '#ff8ab0',                  # 꽃
    'G': '#f5c542',                  # 금
    'C': '#3fae4a', 'c': '#2a7d36',  # 옷 (키 컬러 그린)
    'W': '#d8fbe8', 'w': '#8ad8b8',  # 나비 날개
    'B': '#5a3a2a',                  # 신발 그늘
}
ROWS = {
    4:  "...........O............",
    5:  ".......O..OFO..O........",
    6:  "......OLO.OLO.OLO.......",
    7:  "......OLLOLLLOLLO.......",
    8:  "......OlLLLGLLLlO.......",
    9:  "......OllFlllFllO.......",
    10: ".....OhhhhhhhhhhhO......",
    11: "....OHHHHHHHHHHHHHO.....",
    12: "....OHHHhHHHHHhHHHO.....",
    13: "...OHHHhHHhHhHHhHHHO....",
    14: "....OHHhHSShSSHhHHO.....",
    15: ".....OHSSOSSSOSSHO......",
    16: ".....OhsSISSSISshO......",
    17: ".....OhSSSSSSSSShO......",
    18: ".....OhOSSSSSSSOhO......",
    19: ".....OhOGCCGCCGOhO......",
    20: "......OCCCCGCCCCO.......",
    21: ".....OcCCCCGCCCCcO......",
    22: ".....OccCCcGcCCccO......",
    23: ".....OcBBcccccBBcO......",
}
# 나비 날개 (몸 뒤, 왼쪽을 그리고 가운데 x11 기준으로 뒤집어 오른쪽)
WING = {
    10: "OO...",
    11: "OWO..",
    12: "OWwO.",
    13: "OWFw.",
    14: "OwWW.",
    15: ".OwW.",
    16: "..OO.",
    17: ".OwW.",
    18: "OWFw.",
    19: "OWwO.",
    20: ".OO..",
}


def build():
    g = [['.'] * 24 for _ in range(24)]
    for y, line in WING.items():
        for x, k in enumerate(line):
            if k != '.':
                g[y][x] = k
                g[y][22 - x] = k
    for y, line in ROWS.items():
        for x, k in enumerate(line):
            if k != '.':
                g[y][x] = k
    im = Image.new('RGBA', (24, 24), (0, 0, 0, 0))
    for y in range(24):
        for x in range(24):
            if g[y][x] != '.':
                im.putpixel((x, y), Image.new('RGBA', (1, 1), PAL[g[y][x]]).getpixel((0, 0)))
    return im


if __name__ == '__main__':
    im = build()
    im.save(os.path.join(HERE, 'oberon_handdot.png'))
    cols = {p for p in im.getdata() if p[3]}
    print('colors', len(cols) - 1, '(+ outline)')
    cur = Image.open(os.path.join(HERE, '..', 'roster-art', 'bodies', 'oberon.png')).convert('RGBA')
    refs = [(cur, 'current Oberon'), (im, 'hand-dotted, PixelLab ratio'),
            (Image.open(os.path.join(HERE, 'arthur_pp_01.png')).convert('RGBA'), 'ref Arthur'),
            (Image.open(os.path.join(HERE, 'isolde_pp_34.png')).convert('RGBA'), 'ref Isolde')]
    z = 10
    out = Image.new('RGBA', (len(refs) * (24 * z + 24) + 200, 24 * z + 36), (246, 241, 228, 255))
    d = ImageDraw.Draw(out)
    for k, (r, t) in enumerate(refs):
        x = k * (24 * z + 24)
        out.alpha_composite(r.resize((24 * z, 24 * z), Image.NEAREST), (x, 30))
        d.text((x + 4, 8), t, fill=(60, 40, 30, 255))
    x0 = len(refs) * (24 * z + 24)
    d.text((x0, 24 * z - 50), 'game 2px', fill=(60, 40, 30, 255))
    for k, (r, _) in enumerate(refs):
        out.alpha_composite(r.resize((48, 48), Image.NEAREST), (x0 + k * 46, 24 * z - 30))
    out.save(os.path.join(HERE, 'oberon_compare.png'))
