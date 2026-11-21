"""고양이 캐릭터 시안 (2026-11-21) — 러시안 블루 '미샤'
기준: docs/CHARACTER_ART.md — 24x24 · 본체 13x13(두상 7줄 + 몸 6줄, 머리/몸 나누는 줄 18) · 팔 없음 + 둥근 손(앞발) ·
      무기 레이어 왼쪽 · 세로눈 1x2 · 발밑 신발(발) 그늘색 · 키 컬러 그린 · 레어 14색 이하 + 레어 장식(은 견갑·가슴 보석·버클)
roster_art.py 의 애니메이션(대기 8 + 단검 두 번 찌르기)을 그대로 쓰고 몸 그림만 고양이로 바꾼다.
실행: python3 docs/drafts/cat-char/cat.py  →  body.png · sheet.png(게임 시트 56x40 프레임) · preview.png · anim.gif
"""
import os, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'roster-art'))
import roster_art as R
A, D = R.A, R.D

CAT = {'id': 'misha', 'name': '미샤', 'attr': 'green', 'grade': 3, 'style': 'rapid', 'title': '잿빛 발톱 도적',
       'look': 'russian blue cat thief with curved claw dagger and green scarf', 'original': False}

PAL = {
    'H': '#8c9cb8', 'h': '#66748f',   # 러시안 블루 털 (청회색)
    'S': '#b9c6da',                   # 얼굴·앞발 밝은 털
    's': '#f2a2a8',                   # 볼 홍조
    'K': '#f3a7b8',                   # 귀 안쪽
    'N': '#e8788e',                   # 코
    'I': '#46b85a',                   # 눈 색 (러시안 블루 = 초록 눈, 키 컬러 그린)
    'W': '#eef2f8',                   # 수염
    'C': '#3fae4a', 'c': '#2a7d36',   # 옷 (그린)
    'D': '#dfe6ee',                   # 칼라 (레어 장식색)
    'A': '#7a4a22',                   # 벨트
    'B': '#8c9cb8', 'b': '#66748f',   # 발 = 털색, 발밑은 털 그늘색
    'U': '#dfe6ee', 'Q': '#5ae07a', 'G': '#f5c542',
}

OVER = {  # 기본 틀(D.BASE) 위에 덮어 그리는 줄 (24칸)
    8:  "......O.........O.......",
    9:  ".....OKO.......OKO......",
    10: ".....OKHO.....OHKO......",
    11: ".....OHHHOOOOOHHHO......",
    12: ".....OHHHHhHhHHHHO......",   # 이마 줄무늬 살짝
    13: ".....OHHHHHHHHHHHO......",
    15: "...WW.............WW....",   # 수염
    16: "....W......N......W.....",   # 코
    17: "...........E............",   # 입
    18: ".......OUUCDCUUO........",   # 은 견갑 + 칼라
    19: ".......OcCCQCCcO........",   # 가슴 보석
    21: "........OAAGAAO.........",   # 버클
}
TAIL = {  # 꼬리 (몸 뒤 오른쪽으로 말려 올라감, 오른쪽 수염 아래): 줄: (시작 x, 기호)
        16: (20, 'OO'), 17: (19, 'OHHO'), 18: (19, 'OHO'), 19: (17, 'OHhO'), 20: (16, 'OHhO'), 21: (15, 'OhO'), 22: (15, 'OO')}


def cat_body():
    G = R.Grid()
    for y, line in OVER.items():
        G.row(y, 0, line)
    for y, (x0, s) in TAIL.items():
        G.row(y, x0, s)
    pal = {**PAL}
    img = A.noarms(D.build({'id': CAT['id'], 'pal': pal, 'over': G.over()}))
    # noarms 가 지운 19·20줄 x15 에 꼬리가 닿아 있으면 다시 그린다
    for y in (19, 20):
        x0, s = TAIL[y]
        for i, k in enumerate(s):
            if k != '.':
                img.putpixel((x0 + i, y), A.rgba(pal[k] if k != 'O' else '#2b1d2f'))
    img = R.cap_colors(img, R.BODY_COLORS[CAT['grade']])
    return img, {**D.COMMON, **pal}, 0, False, 'cat'


R.body = lambda c: cat_body()


if __name__ == '__main__':
    r = R.animate(CAT)
    frames = r['idle'] + r['attack']
    r['body'].save(os.path.join(HERE, 'body.png'))
    sh = R.sheet(frames)
    sh.save(os.path.join(HERE, 'sheet.png'))
    ncol = len({p[:3] for p in r['body'].get_flattened_data() if p[3]})
    # 미리보기: 몸 8배 + 대기 첫 프레임 게임 크기(2px)·4배 + 전 프레임 4배 줄
    z = 8
    bg = (246, 241, 228)
    strip = Image.new('RGB', (A.W * 4 * len(frames), A.H * 4), bg)
    for k, (f, _) in enumerate(frames):
        b = f.resize((A.W * 4, A.H * 4), Image.NEAREST)
        strip.paste(b, (k * A.W * 4, 0), b)
    big = r['body'].resize((24 * z, 24 * z), Image.NEAREST)
    g2 = frames[0][0].resize((A.W * 2, A.H * 2), Image.NEAREST)
    W = max(strip.width, 24 * z + A.W * 2 + 60)
    pv = Image.new('RGB', (W, 24 * z + 20 + strip.height), bg)
    pv.paste(big, (10, 10), big)
    pv.paste(g2, (24 * z + 40, 10 + 24 * z - A.H * 2), g2)
    pv.paste(strip, (0, 24 * z + 20))
    pv.save(os.path.join(HERE, 'preview.png'))
    gif = [f.resize((A.W * 6, A.H * 6), Image.NEAREST) for f, _ in frames]
    gbg = [Image.new('RGBA', g.size, bg + (255,)) for g in gif]
    for a, b in zip(gbg, gif):
        a.alpha_composite(b)
    gbg[0].convert('RGB').save(os.path.join(HERE, 'anim.gif'), save_all=True, append_images=[g.convert('RGB') for g in gbg[1:]],
                               duration=[ms for _, ms in frames], loop=0)
    print('ok', r['weapon'], r['variant'], 'frames', len(r['idle']), '+', len(r['attack']), 'body colors', ncol)
