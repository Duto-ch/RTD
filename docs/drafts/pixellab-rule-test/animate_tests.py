"""시험 중인 3명(PixelLab 아서·이졸데 + 직접 찍은 오베론)을 지금 애니메이션 규칙 그대로 움직이기 (2026-11-20)
- 게임과 같은 코드(`roster-art/roster_art.py` animate → `char-13/anim.py`)에 몸 그림만 바꿔 넣는다:
  무기는 별도 레이어·캐릭터 왼쪽·대기 때 대각선 / 둥근 손 4x4 / 대기 8프레임(숨쉬기 머리 1px·무기 반 박자 늦게·깜빡임) /
  공격(예비 멈춤 → 잔상 → 타격 섬광·멈춤 → 회복, 마지막 = 대기 자세) / 유니크 반짝임
- 새 비율이라 머리/몸 나누는 줄 = 19 (지금 규칙 18), 눈 = (9,15)·(13,15)
실행: python3 docs/drafts/pixellab-rule-test/animate_tests.py → anim/<id>.png(시트) · anim/<id>.gif · anim/preview.png
"""
import os, sys
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'roster-art'))
import roster_art as R
A = R.A

TESTS = {   # id: (몸 그림, 피부색, 여성)
    'arthur': ('arthur_pp_01.png', '#fccbaf', False),
    'isolde': ('isolde_pp_34.png', '#fdc1a2', True),
    'oberon': ('oberon_handdot.png', '#ffe2c8', False),
}
OUT = os.path.join(HERE, 'anim')
os.makedirs(OUT, exist_ok=True)
orig_body = R.body
UNIQUE_WPN = {'arthur': 'excalibur', 'isolde': 'sun', 'oberon': 'fairy'}   # 캐릭터 전용 무기 (weapons_v2.py)
_pick = R.W2.pick_variant
R.W2.pick_variant = lambda w, look, g, cid: UNIQUE_WPN.get(cid) or _pick(w, look, g, cid)


def run(cid):
    file, skin, female = TESTS[cid]
    c = next(c for c in R.ROSTER if c['id'] == cid)
    _, pal, _, _, style = orig_body(c)          # 옷 색 등(방패용)은 원래 값
    img = Image.open(os.path.join(HERE, file)).convert('RGBA')
    img.info = {'split': 19, 'eyes': [(9, 15), (13, 15)]}
    pal = {**pal, 'S': skin}
    R.body = lambda _c: (img, pal, 0, female, style)
    try:
        r = R.animate(c)
    finally:
        R.body = orig_body
    frames = r['idle'] + r['attack']
    R.sheet(frames).save(os.path.join(OUT, f'{cid}.png'))
    return r, frames


def gif(frames, path, z=6, loops=2):
    big = []
    for f, ms in frames:
        bg = Image.new('RGBA', f.size, (246, 241, 228, 255))
        bg.alpha_composite(f)
        big.append((bg.resize((f.width * z, f.height * z), Image.NEAREST).convert('P', palette=Image.ADAPTIVE), ms))
    big[0][0].save(path, save_all=True, append_images=[b for b, _ in big[1:]], duration=[ms for _, ms in big], loop=0, disposal=2)


if __name__ == '__main__':
    rows = []
    for cid in TESTS:
        r, frames = run(cid)
        # 대기 2번 + 공격 1번 = 게임에서 보이는 흐름
        seq = r['idle'] + r['idle'] + r['attack']
        gif(seq, os.path.join(OUT, f'{cid}.gif'))
        cur = Image.open(os.path.join(HERE, '..', '..', '..', 'public', 'assets', 'custom', 'chars', f'{cid}.png')).convert('RGBA')
        rows.append((cid, frames, cur, len(r['idle']), r['weapon']))
        print(cid, r['weapon'], 'idle', len(r['idle']), 'attack', len(r['attack']))
    # 한눈에 보기: 캐릭터마다 위 줄 = 새 그림 전 프레임, 아래 줄 = 지금 게임 그림 (같은 프레임 수)
    z, fw, fh = 4, A.W, A.H
    n = max(len(f) for _, f, _, _, _ in rows)
    out = Image.new('RGBA', (n * fw * z, len(rows) * (fh * z * 2 + 30)), (246, 241, 228, 255))
    d = ImageDraw.Draw(out)
    for k, (cid, frames, cur, ni, w) in enumerate(rows):
        y0 = k * (fh * z * 2 + 30)
        d.text((4, y0 + 2), f'{cid} ({w}) - top: new ratio / bottom: current game | idle {ni} + attack {len(frames) - ni}', fill=(60, 40, 30, 255))
        for i, (f, _) in enumerate(frames):
            out.alpha_composite(f.resize((fw * z, fh * z), Image.NEAREST), (i * fw * z, y0 + 14))
        for i in range(min(n, cur.width // fw)):
            out.alpha_composite(cur.crop((i * fw, 0, i * fw + fw, fh)).resize((fw * z, fh * z), Image.NEAREST), (i * fw * z, y0 + 14 + fh * z))
    out.save(os.path.join(OUT, 'preview.png'))
