"""② 엔진 방식을 무기에만 쓴 예시 (2026-11-24 사용자 요청) — 리처드
몸은 지금 28프레임 도트 그대로(손 없이), 무기 + 손은 게임이 매 화면(20ms)마다 원본 무기 그림을 돌려 그린다 (화면 해상도 = 아트 1px 의 4배)
손 자리·무기 각도는 지금 동작에서 읽어 와 프레임 사이를 부드럽게 잇는다
실행: python3 docs/drafts/psd-import/weapon_engine.py → weapon_engine.gif (실제 속도) · weapon_engine.png (공격 28프레임 전부: 위 지금 · 아래 엔진)
"""
import os, sys, math, json, inspect
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import body_engine as BE
R, A, A28, OV = BE.R, BE.A, BE.A28, BE.OV
S, CID, TICK = BE.S, BE.CID, BE.TICK
draw, lerp, ease = BE.draw, BE.lerp, BE.ease


def main():
    R.fire = A28.install()
    OV.install(R, A)
    c = {x['id']: x for x in R.ROSTER}[CID]
    orig = A.compose
    sig = inspect.signature(orig)
    rec = []
    EMPTY = (Image.new('RGBA', (1, 1), (0, 0, 0, 0)), (0, 0))
    owi = A.weapon_img

    def compose(*a, **k):
        b = sig.bind(*a, **k)
        b.apply_defaults()
        g = dict(b.arguments)
        hx, hy = A.OX + g['hand'][0] + g['bdx'], A.OY + g['hand'][1]
        hl = g['hands'](hx, hy) if (g['hands'] and g['ch'] and g['ch'].get('armless')) else []
        full = orig(**g)
        A.weapon_img = lambda name, deg, sil=None: EMPTY if sil is None else owi(name, deg, sil)
        try:
            bare = orig(**dict(g, hands=None))           # 무기·손 없는 몸 (휘두름 잔상·효과는 남는다)
        finally:
            A.weapon_img = owi
        rec.append({'deg': g['deg'], 'hand': (hx, hy), 'hands': [h[:2] for h in hl], 'layers': [h[2] for h in hl],
                    'mirror': bool(g['ch'] and g['ch'].get('mirror')), 'behind': g['behind'], 'full': full, 'bare': bare})
        return full
    A.compose = compose
    r = R.animate(c)
    A.compose = orig
    ni, na = len(r['idle']), len(r['attack'])
    idle, atk = rec[:ni], rec[ni:]
    # 게임 시트와 같은 후처리(유니크 반짝이 등)는 r 프레임에 있다 → 지금 쪽은 r 프레임을 그대로 쓴다
    now_idle, now_atk = [f for f, _ in r['idle']], [f for f, _ in r['attack']]
    body, pal, *_ = R.body(c)
    hand = A.hand_img(pal)
    wim, wpv, _, _, _ = OV._samples(CID)
    deg0 = OV._meta['weapons'][CID]['deg']

    def engine(seq, f):
        i0 = min(len(seq) - 1, int(f))
        i1 = min(len(seq) - 1, i0 + 1)
        u = ease(f - int(f))
        P0, P1 = seq[i0], seq[i1]
        deg = lerp(P0['deg'], P1['deg'], u)
        hx, hy = lerp(P0['hand'][0], P1['hand'][0], u), lerp(P0['hand'][1], P1['hand'][1], u)
        base = P0['bare']
        cv = Image.new('RGBA', (A.W * S, A.H * S), (0, 0, 0, 0))
        up = base.resize((A.W * S, A.H * S), Image.NEAREST)
        if P0['mirror']:
            up = up.transpose(Image.FLIP_LEFT_RIGHT)      # 펴진 좌표에서 그린 뒤 다시 뒤집는다
        wl = Image.new('RGBA', cv.size, (0, 0, 0, 0))
        draw(wl, wim, (wpv[0] + 0.5, wpv[1] + 0.5), (hx + 0.5, hy + 0.5), deg - deg0)
        hands = Image.new('RGBA', cv.size, (0, 0, 0, 0))
        back = Image.new('RGBA', cv.size, (0, 0, 0, 0))
        for j, (p0, lay) in enumerate(zip(P0['hands'], P0['layers'])):
            p1 = P1['hands'][j] if j < len(P1['hands']) else p0
            pos = (lerp(p0[0], p1[0], u), lerp(p0[1], p1[1], u)) if j else (hx, hy)
            draw(back if lay == 'back' else hands, hand, (2, 2), pos)
        if P0['behind']:
            cv.alpha_composite(wl)
            cv.alpha_composite(back)
            cv.alpha_composite(up)
        else:
            cv.alpha_composite(back)
            cv.alpha_composite(up)
            cv.alpha_composite(wl)
        cv.alpha_composite(hands)
        return cv.transpose(Image.FLIP_LEFT_RIGHT) if P0['mirror'] else cv

    font = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 20)
    CW, CH = 44 * S, 34 * S
    crop = lambda im: im.crop((4 * S, 2 * S, 4 * S + CW, 2 * S + CH))
    PAD = 10
    frames = []
    for kind, n, step, now, seq in [('idle', ni, 45, now_idle, idle), ('attack', na, 40, now_atk, atk)] * 2:
        for t in range(0, n * step, TICK):
            k = min(n - 1, t // step)
            left = now[k].resize((A.W * S, A.H * S), Image.NEAREST)
            right = engine(seq, t / step)
            b = Image.new('RGBA', (PAD * 3 + CW * 2, 40 + CH + PAD), (246, 241, 228, 255))
            d = ImageDraw.Draw(b)
            d.text((PAD, 8), '지금 (28프레임)', fill=(70, 50, 35), font=font)
            d.text((PAD * 2 + CW, 8), '② 무기만 엔진', fill=(70, 50, 35), font=font)
            b.alpha_composite(crop(left), (PAD, 40))
            b.alpha_composite(crop(right), (PAD * 2 + CW, 40))
            frames.append(b.convert('RGB'))
    frames[0].save(os.path.join(HERE, 'weapon_engine.gif'), save_all=True, append_images=frames[1:], duration=TICK, loop=0)
    # 공격 28프레임 전부 (위: 지금 · 아래: 엔진, 프레임 번호)
    per = 7
    cw, ch = CW // 2, CH // 2
    rows = (na + per - 1) // per
    sheet = Image.new('RGBA', (per * (cw + 4) + 10, rows * (ch * 2 + 34) + 10), (246, 241, 228, 255))
    d = ImageDraw.Draw(sheet)
    small = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 14)
    hit = json.load(open(os.path.join(BE.ROOT, 'public', 'assets', 'custom', 'manifest.json')))['sprites']['char_' + CID]['animations']['attack']['hit']
    for k in range(na):
        x0, y0 = 6 + (k % per) * (cw + 4), 6 + (k // per) * (ch * 2 + 34)
        a_ = crop(now_atk[k].resize((A.W * S, A.H * S), Image.NEAREST)).resize((cw, ch), Image.NEAREST)
        b_ = crop(engine(atk, k)).resize((cw, ch), Image.NEAREST)
        sheet.alpha_composite(a_, (x0, y0))
        sheet.alpha_composite(b_, (x0, y0 + ch))
        d.text((x0 + 2, y0 + ch * 2 + 2), f'{k}' + (' 타격' if k == hit else ''), fill=(200, 60, 50) if k == hit else (80, 60, 40), font=small)
    sheet.save(os.path.join(HERE, 'weapon_engine.png'))
    print('ticks', len(frames), 'attack', na, 'hit', hit)


if __name__ == '__main__':
    main()
