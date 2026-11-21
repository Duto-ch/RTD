"""고양이 '미샤'(러시안 블루) — 아서 기준 새 비율 (2026-11-21)
아서·이졸데·오베론에 적용된 비율 (docs/drafts/pixellab-rule-test/README.md):
  머리 장식(귀) 5~9줄 · 머리 10~18줄(9줄) · 몸 19~23줄(5줄) · 머리 폭 x4~18 · 몸 폭 x5~17 · 가운데 x11 · 머리/몸 나누는 줄 19
  눈 = 세로 1x2 (9,15)·(13,15) · 외곽선 #2b1d2f · 발밑 = 발(털) 그늘색 · 팔·손·무기 없음 (둥근 손·무기는 애니메이션이 얹음)
레어 → 몸 14색 이하 + 은 견갑·가슴 보석·버클. 애니메이션은 게임과 같은 코드: 대기 8 + 공격 28프레임(단검 두 번 찌르기)
실행: python3 docs/drafts/cat-char/cat_arthur.py → arthur_body.png · arthur_sheet.png · arthur_compare.png · arthur_anim.gif
"""
import os, sys
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'roster-art'))
sys.path.insert(0, os.path.join(HERE, '..', 'anim28'))
import roster_art as R
import anim28 as A28
A = R.A

CAT = {'id': 'misha', 'name': '미샤', 'attr': 'green', 'grade': 3, 'style': 'rapid', 'title': '잿빛 발톱 도적',
       'look': 'russian blue cat thief with curved claw dagger', 'original': False}

PAL = {
    'O': '#2b1d2f',                   # 외곽선 = 눈동자
    'H': '#8c9cb8', 'h': '#66748f',   # 러시안 블루 털 · 그늘 (발도 이 색)
    'S': '#bac7db',                   # 얼굴 밝은 털 (앞발·수염도)
    's': '#f2a2a8',                   # 볼
    'K': '#f3a0b4',                   # 귀 안쪽 · 코
    'I': '#46b85a',                   # 눈 색 (초록 눈 = 키 컬러 그린)
    'C': '#3fae4a', 'c': '#2a7d36',   # 옷
    'U': '#dfe6ee',                   # 은 견갑·칼라 (레어)
    'Q': '#5ae07a',                   # 가슴 보석
    'A': '#7a4a22', 'G': '#f5c542',   # 벨트 · 버클
}
# 왼쪽 반 (x0~11). 오른쪽은 가운데 x11 기준으로 뒤집는다 (x12 = x10 … x22 = x0)
LEFT = {
    5:  "......O.....",
    6:  ".....OKO....",
    7:  ".....OKHO...",
    8:  "....OKKHO...",
    9:  "....OHKHHOOO",
    10: ".....OHHHHhH",   # 이마 줄무늬
    11: "....OHHHHhHh",
    12: "....OHHHHHHH",
    13: "...OHHHHHHHH",   # 가장 넓은 줄 (아서처럼 x3)
    14: "....OhHHHHHH",
    15: "....OHHSSOSS",   # 눈 윗칸 (x9)
    16: "..SSSOHsSISS",   # 수염 한 줄 · 볼 · 눈 색 — 아래로 갈수록 얼굴이 좁아진다 (아서 비율)
    17: ".....OhSSSSK",   # 코 (x11)
    18: "......OhSSOS",   # 입 (x10·x12)
    19: ".....OUUCUUU",   # 은 견갑 + 칼라
    20: ".....OhCCCCQ",   # 가슴 보석
    21: ".....OcCCCCC",
    22: ".....OAAAAAG",   # 벨트 버클
    23: ".....OOhhOcc",   # 발 (털 그늘색) · 옷자락
}
TAIL = {19: (20, 'OO'), 20: (19, 'OHHO'), 21: (18, 'OHhO'), 22: (17, 'OHhO'), 23: (18, 'OO')}   # 몸 뒤 오른쪽으로 말린 꼬리


def body_img():
    g = [['.'] * 24 for _ in range(24)]
    for y, row in LEFT.items():
        full = row + row[:11][::-1] + '.'
        for x, k in enumerate(full):
            if k != '.':
                g[y][x] = k
    for y, (x0, s) in TAIL.items():
        for i, k in enumerate(s):
            g[y][x0 + i] = k
    im = Image.new('RGBA', (24, 24), (0, 0, 0, 0))
    for y in range(24):
        for x in range(24):
            if g[y][x] != '.':
                im.putpixel((x, y), A.rgba(PAL[g[y][x]]))
    im = R.cap_colors(im, R.BODY_COLORS[CAT['grade']])
    im.info = {'split': 19, 'eyes': [(9, 15), (13, 15)]}
    return im


def ncolors(im):
    return len({p[:3] for p in im.get_flattened_data() if p[3]})


if __name__ == '__main__':
    fire = A28.install()           # 게임과 같은 28프레임 공격
    R.fire = fire
    body = body_img()
    R.body = lambda c: (body, {**R.D.COMMON, **PAL}, 0, False, 'cat')
    r = R.animate(CAT)
    frames = r['idle'] + r['attack']
    body.save(os.path.join(HERE, 'arthur_body.png'))
    R.sheet(frames).save(os.path.join(HERE, 'arthur_sheet.png'))
    bg = (246, 241, 228, 255)
    # 비교: 아서(참고) · 지금 기준 미샤 · 아서 기준 미샤 (몸 10배) + 대기 첫 프레임·찌르기 타격 프레임 6배 + 게임 크기
    arthur = Image.open(os.path.join(HERE, '..', 'pixellab-rule-test', 'arthur_pp_01.png')).convert('RGBA')
    old = Image.open(os.path.join(HERE, 'body.png')).convert('RGBA')
    z, fz = 10, 6
    hit = len(r['idle']) + A28.HIT28['dagger']
    W = 3 * (24 * z + 20) + 2 * (56 * fz) + 140
    out = Image.new('RGBA', (W, 24 * z + 40), bg)
    d = ImageDraw.Draw(out)
    for k, (im, t) in enumerate([(arthur, 'ref Arthur'), (old, 'Misha - old ratio'), (body, 'Misha - Arthur ratio')]):
        x = k * (24 * z + 20)
        out.alpha_composite(im.resize((24 * z, 24 * z), Image.NEAREST), (x, 30))
        d.text((x + 4, 8), t, fill=(60, 40, 30, 255))
    x0 = 3 * (24 * z + 20)
    for k, i in enumerate((0, hit)):
        out.alpha_composite(frames[i][0].resize((56 * fz, 40 * fz), Image.NEAREST), (x0 + k * 56 * fz, 30))
    out.alpha_composite(frames[0][0].resize((112, 80), Image.NEAREST), (W - 124, 24 * z - 60))
    d.text((W - 124, 24 * z - 76), 'game 2px', fill=(60, 40, 30, 255))
    out.convert('RGB').save(os.path.join(HERE, 'arthur_compare.png'))
    gif = []
    for f, _ in frames[:8] * 2 + frames[8:]:
        c = Image.new('RGBA', (56 * 6, 40 * 6), bg)
        c.alpha_composite(f.resize((56 * 6, 40 * 6), Image.NEAREST))
        gif.append(c.convert('RGB'))
    ms = [m for _, m in frames[:8] * 2 + frames[8:]]
    gif[0].save(os.path.join(HERE, 'arthur_anim.gif'), save_all=True, append_images=gif[1:], duration=ms, loop=0)
    print('body colors', ncolors(body), 'frames', len(r['idle']), '+', len(r['attack']), r['weapon'], r['variant'])
