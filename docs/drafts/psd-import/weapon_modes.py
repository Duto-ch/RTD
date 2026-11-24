"""무기 회전 방식 비교 시안 (2026-11-24 사용자 요청) — 같은 캐릭터·같은 동작을 네 가지 무기 회전으로 그려 나란히 본다
  지금   RotSprite: Scale2x 세 번 → 돌려서 칸 가운데 찍기 (게임에 들어간 방식)
  ①     8방향 맞춤: 각도를 가까운 45° 로 맞추고, 그린 그림(45°)에서 90° 단위로만 돌린다(픽셀 그대로).
         세운 그림(0°·90°…)은 아직 없어서 RotSprite 로 만든 초안 — 사용자가 PSD 로 한 장 그려 주면 그것도 원본 그대로
  ②     엔진 회전: 게임이 무기를 따로 실시간으로 돌린다고 치고 화면 해상도(아트 1px = 화면 4px)에서 돌린다. 그림은 원본, 픽셀이 비스듬해진다
  ③     기울여 밀기: 90° 단위로 돌린 뒤 남은 각도를 가로·세로·가로 세 번 밀어서 돌린다. 픽셀 수·색이 그대로 남는다
실행: python3 docs/drafts/psd-import/weapon_modes.py → weapon_modes.gif · weapon_modes.png
"""
import os, sys, math, inspect
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'roster-art'))
sys.path.insert(0, os.path.join(HERE, '..', 'anim28'))
sys.path.insert(0, HERE)
import roster_art as R
import anim28 as A28
import psd_overrides as OV
A = R.A
S = 4                       # 화면 배율 (아트 1px = 화면 2px × RES 2)
IDS = ['richard', 'arthur', 'halvard', 'fergus']
MODES = ['rot', 'snap', 'engine', 'shear']
LABEL = {'rot': '지금 (RotSprite)', 'snap': '① 8방향 맞춤', 'engine': '② 엔진 회전', 'shear': '③ 기울여 밀기'}
MODE = {'m': 'rot'}
ORIG = {}


def clockwise90(im, pv, k):
    for _ in range(k % 4):
        w, h = im.size
        im, pv = im.transpose(Image.ROTATE_270), (h - 1 - pv[1], pv[0])
    return im, pv


def core_of(cid):
    """바깥 외곽선을 뺀 원본 무기(대기 각도) + 쥐는 점"""
    im, pv, _, _, _ = OV._samples(cid)
    core = im.copy()
    cp, ip = core.load(), im.load()
    W, H = im.size
    op = lambda x, y: 0 <= x < W and 0 <= y < H and ip[x, y][3] > 0
    for y in range(H):
        for x in range(W):
            p = ip[x, y]
            if p[3] and sum(p[:3]) < 160 and any(not op(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                cp[x, y] = (0, 0, 0, 0)
    return core, pv


def render_core(core, pv, silhouette):
    px = core.load()
    filled = {(x - pv[0], y - pv[1]): '#%02x%02x%02x' % px[x, y][:3] for y in range(core.height) for x in range(core.width) if px[x, y][3]}
    return A._render(filled or {(0, 0): '#888888'}, silhouette)


def snap(cid, deg, silhouette):
    m = OV._meta['weapons'][cid]
    s = round(deg / 45) * 45
    k, rest = divmod(round(s - m['deg']), 90)
    if rest == 0:                                     # 그린 각도 + 90° 단위 → 원본 픽셀 그대로
        im, pv = clockwise90(*core_of(cid), k)
        return render_core(im, pv, silhouette)
    return ORIG["render"](cid, s, silhouette)       # 세운 그림 초안 (RotSprite)


def shear(cid, deg, silhouette):
    m = OV._meta['weapons'][cid]
    d = deg - m['deg']
    k = round(d / 90)
    core, pv = clockwise90(*core_of(cid), k)
    t = math.radians(d - k * 90)
    a, b = -math.tan(t / 2), math.sin(t)
    px = core.load()
    filled = {}
    for y in range(core.height):
        for x in range(core.width):
            if px[x, y][3]:
                X, Y = x - pv[0], y - pv[1]
                X = X + round(a * Y)
                Y = Y + round(b * X)
                X = X + round(a * Y)
                filled[(X, Y)] = '#%02x%02x%02x' % px[x, y][:3]
    return A._render(filled or {(0, 0): '#888888'}, silhouette)


def engine_layer(cid, deg):
    """화면 해상도(S배)로 원본 무기 그림(외곽선 포함)을 돌린다 — 가장 가까운 픽셀 찍기 (Phaser pixelArt 와 같다)"""
    im, (pvx, pvy), _, _, _ = OV._samples(cid)
    m = OV._meta['weapons'][cid]
    d = math.radians(deg - m['deg'])
    co, si = math.cos(d), math.sin(d)
    R_ = int(math.hypot(im.width, im.height) * S) + S
    out = Image.new('RGBA', (2 * R_, 2 * R_), (0, 0, 0, 0))
    o, p = out.load(), im.load()
    cx, cy = (pvx + 0.5), (pvy + 0.5)
    for qy in range(2 * R_):
        for qx in range(2 * R_):
            dx, dy = (qx + 0.5 - R_) / S, (qy + 0.5 - R_) / S
            sx, sy = cx + co * dx + si * dy, cy - si * dx + co * dy
            ix, iy = math.floor(sx), math.floor(sy)
            if 0 <= ix < im.width and 0 <= iy < im.height and p[ix, iy][3]:
                o[qx, qy] = p[ix, iy]
    return out, R_


def install():
    orig_render = OV.weapon_render
    ORIG["render"] = orig_render
    orig_compose = A.compose
    sig = inspect.signature(orig_compose)
    EMPTY = (Image.new('RGBA', (1, 1), (0, 0, 0, 0)), (0, 0))

    def weapon_render(cid, deg, silhouette=None):
        mo = MODE['m']
        if mo == 'snap':
            return snap(cid, deg, silhouette)
        if mo == 'shear':
            return shear(cid, deg, silhouette)
        if mo == 'engine' and not silhouette and MODE.get('hide'):
            MODE['last'] = deg
            return EMPTY
        return orig_render(cid, deg, silhouette)
    OV.weapon_render = weapon_render

    def compose(*a, **k):
        if MODE['m'] != 'engine' or not OV._cur['id'] or not OV.has_weapon(OV._cur['id']):
            return orig_compose(*a, **k)
        b = sig.bind(*a, **k)
        b.apply_defaults()
        g = dict(b.arguments)
        if not g.get('weapon'):
            return orig_compose(*a, **k)
        MODE['hide'] = True
        try:
            base = orig_compose(**g)                                    # 무기만 빠진 그림
            g2 = dict(g, body=Image.new('RGBA', g['body'].size, (0, 0, 0, 0)), extra_before=None, extra_after=None, smear=None)
            hands = orig_compose(**g2)                                  # 손(+방패)만
        finally:
            MODE['hide'] = False
        deg = MODE['last']
        hx, hy = A.OX + g['hand'][0] + g['bdx'], A.OY + g['hand'][1]
        lay, R_ = engine_layer(OV._cur['id'], deg)
        hi = Image.new('RGBA', (A.W * S, A.H * S), (0, 0, 0, 0))
        hi.alpha_composite(lay, (hx * S + S // 2 - R_, hy * S + S // 2 - R_)) if hx * S + S // 2 - R_ >= 0 and hy * S + S // 2 - R_ >= 0 else paste_clip(hi, lay, hx * S + S // 2 - R_, hy * S + S // 2 - R_)
        if g['ch'] and g['ch'].get('mirror'):
            hi = hi.transpose(Image.FLIP_LEFT_RIGHT)
        base.info = dict(base.info, hi=hi, hands=hands, behind=g['behind'])
        return base
    A.compose = compose


def paste_clip(dst, src, x, y):
    big = Image.new('RGBA', (dst.width + 2 * src.width, dst.height + 2 * src.height), (0, 0, 0, 0))
    big.alpha_composite(dst, (src.width, src.height))
    big.alpha_composite(src, (x + src.width, y + src.height))
    dst.paste(big.crop((src.width, src.height, src.width + dst.width, src.height + dst.height)))


def to_screen(f):
    up = f.resize((f.width * S, f.height * S), Image.NEAREST)
    hi = f.info.get('hi')
    if hi is None:
        return up
    out = Image.new('RGBA', up.size, (0, 0, 0, 0))
    if f.info['behind']:
        out.alpha_composite(hi)
        out.alpha_composite(up)
    else:
        out.alpha_composite(up)
        out.alpha_composite(hi)
        h = f.info['hands']
        out.alpha_composite(h.resize((h.width * S, h.height * S), Image.NEAREST))
    return out


def main():
    R.fire = A28.install()
    OV.install(R, A)
    install()
    BY = {c['id']: c for c in R.ROSTER}
    runs = {}
    for mo in MODES:
        MODE['m'] = mo
        for cid in IDS:
            r = R.animate(BY[cid])
            fr = r['idle'][:8] + r['attack']
            if mo == 'engine':
                print(cid, 'engine frames with hi-res weapon', sum('hi' in f.info for f, _ in fr), '/', len(fr))
            runs[(mo, cid)] = [(to_screen(f), ms) for f, ms in fr]
    # 칸: 프레임 가운데 몸 쪽 잘라 보기
    CW, CH = 44 * S, 34 * S
    crop = lambda im: im.crop((4 * S, 2 * S, 4 * S + CW, 2 * S + CH))
    font = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 22)
    small = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 18)
    TOP, LEFT = 40, 110
    Wd, Hd = LEFT + len(MODES) * (CW + 8), TOP + len(IDS) * (CH + 8)
    names = {'richard': '리처드', 'arthur': '아서', 'halvard': '할바르드', 'fergus': '퍼거스'}

    def board():
        b = Image.new('RGBA', (Wd, Hd), (246, 241, 228, 255))
        d = ImageDraw.Draw(b)
        for j, mo in enumerate(MODES):
            d.text((LEFT + j * (CW + 8) + 6, 8), LABEL[mo], fill=(70, 50, 35), font=font)
        for i, cid in enumerate(IDS):
            d.text((8, TOP + i * (CH + 8) + CH // 2 - 12), names[cid], fill=(70, 50, 35), font=font)
        return b
    n = len(runs[(MODES[0], IDS[0])])
    frames, durs = [], []
    for k in range(n):
        b = board()
        for i, cid in enumerate(IDS):
            for j, mo in enumerate(MODES):
                f = runs[(mo, cid)][min(k, len(runs[(mo, cid)]) - 1)][0]
                b.alpha_composite(crop(f), (LEFT + j * (CW + 8), TOP + i * (CH + 8)))
        frames.append(b.convert('RGB'))
        durs.append(runs[(MODES[0], IDS[0])][k][1] * 3)     # 3배 느리게 (잘 보이게)
    frames[0].save(os.path.join(HERE, 'weapon_modes.gif'), save_all=True, append_images=frames[1:], duration=durs, loop=0, disposal=2)
    # 정지 그림: 공격 프레임 몇 장 (캐릭터별 줄, 방식별 묶음)
    picks = [8 + 3, 8 + 7, 8 + 11, 8 + 15, 8 + 19, 8 + 24]
    b2 = Image.new('RGBA', (LEFT + len(MODES) * (len(picks) * (CW // 2) + 12), TOP + len(IDS) * (CH // 2 + 8) + 30), (246, 241, 228, 255))
    d = ImageDraw.Draw(b2)
    for j, mo in enumerate(MODES):
        d.text((LEFT + j * (len(picks) * (CW // 2) + 12) + 4, 8), LABEL[mo], fill=(70, 50, 35), font=small)
    for i, cid in enumerate(IDS):
        d.text((8, TOP + i * (CH // 2 + 8) + CH // 4 - 10), names[cid], fill=(70, 50, 35), font=small)
        for j, mo in enumerate(MODES):
            for q, k in enumerate(picks):
                f = crop(runs[(mo, cid)][min(k, len(runs[(mo, cid)]) - 1)][0])
                f = f.resize((CW // 2, CH // 2), Image.NEAREST)
                b2.alpha_composite(f, (LEFT + j * (len(picks) * (CW // 2) + 12) + q * (CW // 2), TOP + i * (CH // 2 + 8)))
    b2.save(os.path.join(HERE, 'weapon_modes.png'))
    print('frames', n, 'gif', frames[0].size)


if __name__ == '__main__':
    main()
