"""무기만 촘촘하게 돌려 굽는 2배 시트 (2026-11-24 사용자 요청 — 시험: 리처드 한 명)
- 몸·효과: 지금 게임 프레임 그대로를 2배로 늘린다 (도트 모양 그대로, 아트 1px = 시트 2px)
- 무기 + 손: 원본 무기 그림(PSD 로 고친 그림)을 시트 2px 격자에서 돌려 찍는다 → 무기 모양이 어느 각도에서도 원본대로 (반 도트 단위로 돈다)
- 게임 엔진은 그대로: manifest 의 frameWidth·frameHeight 를 2배로, scale 을 절반으로, pivot 을 2배로 적으면 화면 크기가 같다
- 시트는 8열 격자 (한 줄로 늘어놓으면 6272px 이라 일부 폰의 텍스처 한도 4096 을 넘는다)
실행: python3 docs/drafts/psd-import/bake2x.py richard [--install] → bake2x/<id>.png · bake2x/<id>_compare.png
      --install: public/assets/custom/chars/<id>.png 와 manifest 를 바꾼다
⚠️ roster_art.py → import-roster-art.py 를 다시 돌리면 1배 시트로 돌아간다 → 그 뒤 이 스크립트를 --install 로 다시
"""
import os, sys, json, inspect
from PIL import Image, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import body_engine as BE
BE.S = 2
R, A, A28, OV = BE.R, BE.A, BE.A28, BE.OV
ROOT = BE.ROOT
K = 2
COLS = 8


def capture(cid):
    """지금 동작을 그리면서 프레임마다 손·무기 각도와 '무기·손 없는 그림'을 받아 둔다"""
    c = {x['id']: x for x in R.ROSTER}[cid]
    orig = A.compose
    sig = inspect.signature(orig)
    owi = A.weapon_img
    EMPTY = (Image.new('RGBA', (1, 1), (0, 0, 0, 0)), (0, 0))
    rec = []

    def compose(*a, **k):
        b = sig.bind(*a, **k)
        b.apply_defaults()
        g = dict(b.arguments)
        hx, hy = A.OX + g['hand'][0] + g['bdx'], A.OY + g['hand'][1]
        hl = g['hands'](hx, hy) if (g['hands'] and g['ch'] and g['ch'].get('armless')) else []
        full = orig(**g)
        A.weapon_img = lambda name, deg, sil=None: EMPTY if sil is None else owi(name, deg, sil)
        try:
            bare = orig(**dict(g, hands=None))
        finally:
            A.weapon_img = owi
        rec.append({'deg': g['deg'], 'hand': (hx, hy), 'hands': [h[:2] for h in hl], 'layers': [h[2] for h in hl],
                    'mirror': bool(g['ch'] and g['ch'].get('mirror')), 'behind': g['behind'], 'full': full, 'bare': bare})
        return full
    A.compose = compose
    try:
        r = R.animate(c)
    finally:
        A.compose = orig
    frames = r['idle'] + r['attack']
    assert len(rec) == len(frames)
    body, pal, *_ = R.body(c)
    return rec, frames, A.hand_img(pal)


def bake_frame(P, final, hand, cid):
    wim, wpv, _, _, _ = OV._samples(cid)
    deg0 = OV._meta['weapons'][cid]['deg']
    # 후처리로 더해진 것(유니크 반짝이 등) = 최종 프레임 − 합성 직후 프레임 → 무기 없는 그림에 다시 얹는다
    extra = final.copy()
    diff = ImageChops.difference(final, P['full']).convert('L').point(lambda v: 255 if v else 0)
    extra.putalpha(ImageChops.multiply(extra.getchannel('A'), diff))
    bare = P['bare'].copy()
    W2, H2 = A.W * K, A.H * K
    up = lambda im: im.resize((im.width * K, im.height * K), Image.NEAREST)
    flip = lambda im: im.transpose(Image.FLIP_LEFT_RIGHT) if P['mirror'] else im
    body = flip(up(bare))                     # 펴진 좌표 (무기·손 자리 기준)
    wl = Image.new('RGBA', (W2, H2), (0, 0, 0, 0))
    hx, hy = P['hand']
    BE.draw(wl, wim, (wpv[0] + 0.5, wpv[1] + 0.5), (hx + 0.5, hy + 0.5), P['deg'] - deg0)
    top = Image.new('RGBA', (W2, H2), (0, 0, 0, 0))
    back = Image.new('RGBA', (W2, H2), (0, 0, 0, 0))
    for (x, y), lay in zip(P['hands'], P['layers']):
        (back if lay == 'back' else top).alpha_composite(up(hand), (x * K - 2 * K, y * K - 2 * K))
    cv = Image.new('RGBA', (W2, H2), (0, 0, 0, 0))
    order = [wl, back, body] if P['behind'] else [back, body, wl]
    for l in order + [top]:
        cv.alpha_composite(l)
    cv = flip(cv)
    cv.alpha_composite(up(extra))
    return cv


def main():
    cid = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('-') else 'richard'
    R.fire = A28.install()
    OV.install(R, A)
    assert OV.has_weapon(cid), f'{cid}: PSD 로 고친 무기가 없다'
    rec, frames, hand = capture(cid)
    man_p = os.path.join(ROOT, 'public', 'assets', 'custom', 'manifest.json')
    man = json.load(open(man_p))
    e = man['sprites']['char_' + cid]
    if e['frameWidth'] != A.W:
        raise SystemExit('이미 2배 시트다 — roster_art → import-roster-art 를 먼저 다시 돌릴 것')
    cur = Image.open(os.path.join(ROOT, 'public', 'assets', 'custom', 'chars', cid + '.png')).convert('RGBA')
    n = cur.width // A.W
    assert n == len(frames), (n, len(frames))
    same = sum(not ImageChops.difference(cur.crop((k * A.W, 0, k * A.W + A.W, A.H)), f).getbbox() for k, (f, _) in enumerate(frames))
    print('지금 시트와 같은 프레임', same, '/', n)
    rows = (n + COLS - 1) // COLS
    out = Image.new('RGBA', (COLS * A.W * K, rows * A.H * K), (0, 0, 0, 0))
    for k, ((f, _), P) in enumerate(zip(frames, rec)):
        out.alpha_composite(bake_frame(P, f, hand, cid), ((k % COLS) * A.W * K, (k // COLS) * A.H * K))
    os.makedirs(os.path.join(HERE, 'bake2x'), exist_ok=True)
    out.save(os.path.join(HERE, 'bake2x', cid + '.png'))
    # 비교 (공격 프레임: 위 지금 1배를 2배로 늘린 것 · 아래 2배 굽기)
    cmp_ = Image.new('RGBA', (14 * A.W * K, 4 * A.H * K), (246, 241, 228, 255))
    for j in range(28):
        k = 28 + j
        a = cur.crop((k * A.W, 0, k * A.W + A.W, A.H)).resize((A.W * K, A.H * K), Image.NEAREST)
        b = out.crop(((k % COLS) * A.W * K, (k // COLS) * A.H * K, (k % COLS + 1) * A.W * K, (k // COLS + 1) * A.H * K))
        x, y = (j % 14) * A.W * K, (j // 14) * 2 * A.H * K
        cmp_.alpha_composite(a, (x, y))
        cmp_.alpha_composite(b, (x, y + A.H * K))
    cmp_.resize((cmp_.width * 2, cmp_.height * 2), Image.NEAREST).save(os.path.join(HERE, 'bake2x', cid + '_compare.png'))
    print('sheet', out.size, 'bytes 1x', os.path.getsize(os.path.join(ROOT, 'public', 'assets', 'custom', 'chars', cid + '.png')),
          '2x', os.path.getsize(os.path.join(HERE, 'bake2x', cid + '.png')))
    if '--install' in sys.argv:
        out.save(os.path.join(ROOT, 'public', 'assets', 'custom', 'chars', cid + '.png'))
        e['frameWidth'], e['frameHeight'] = A.W * K, A.H * K
        e['scale'] = e['scale'] / K
        e['pivotX'], e['pivotY'] = e['pivotX'] * K, e['pivotY'] * K
        e['bake2x'] = True
        json.dump(man, open(man_p, 'w'), ensure_ascii=False, indent=1)
        open(man_p, 'a').write('\n') if not open(man_p).read().endswith('\n') else None
        print('installed', cid)


if __name__ == '__main__':
    main()
