"""② 엔진 방식을 몸에도 쓴 예시 (2026-11-24 사용자 요청) — 리처드 한 명
지금 게임: 28프레임 도트 그림을 한 장씩 넘긴다 (프레임마다 손으로 정한 픽셀)
엔진 방식: 몸을 부위(머리·몸통·손·무기)로 나눈 원본 그림을 게임이 매 화면(여기서는 20ms)마다 돌리고·옮기고·늘인다
  - 위치·각도는 지금 28프레임 동작에서 손 자리·무기 각도를 읽어 와서 그 사이를 부드럽게 이어 붙인다
  - 몸통은 휘두르는 쪽으로 기울고(발 기준 회전), 타격 순간 살짝 눌렸다 펴지고, 대기 때는 숨쉬기로 위아래 늘었다 줄었다
  - 화면 해상도(아트 1px = 화면 4px)에서 가장 가까운 픽셀 찍기 — 도트가 비스듬해질 수 있다
실행: python3 docs/drafts/psd-import/body_engine.py → body_engine.gif · body_engine.png
"""
import os, sys, math, json, inspect
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(HERE, '..', 'roster-art'))
sys.path.insert(0, os.path.join(HERE, '..', 'anim28'))
sys.path.insert(0, HERE)
import roster_art as R
import anim28 as A28
import psd_overrides as OV
A = R.A
S = 4
CID = 'richard'
TICK = 20


def lerp(a, b, t):
    return a + (b - a) * t


def ease(t):
    return t * t * (3 - 2 * t)


def draw(dst, src, piv, pos, ang=0.0, sx=1.0, sy=1.0, alpha=1.0):
    """src(아트 px)를 piv 점 기준으로 sx·sy 늘이고 ang 도 돌려 dst(화면 S배)의 pos(아트 좌표, 소수 가능)에 찍는다"""
    a = math.radians(ang)
    co, si = math.cos(a), math.sin(a)
    r = (math.hypot(src.width, src.height) + 2) * max(sx, sy)
    x0, x1 = int((pos[0] - r) * S), int((pos[0] + r) * S)
    y0, y1 = int((pos[1] - r) * S), int((pos[1] + r) * S)
    sp, dp = src.load(), dst.load()
    for qy in range(max(0, y0), min(dst.height, y1)):
        for qx in range(max(0, x0), min(dst.width, x1)):
            dx, dy = (qx + 0.5) / S - pos[0], (qy + 0.5) / S - pos[1]
            ux, uy = (co * dx + si * dy) / sx, (-si * dx + co * dy) / sy
            ix, iy = math.floor(piv[0] + ux), math.floor(piv[1] + uy)
            if 0 <= ix < src.width and 0 <= iy < src.height:
                p = sp[ix, iy]
                if p[3]:
                    if alpha >= 1:
                        dp[qx, qy] = p
                    else:
                        q = dp[qx, qy]
                        if not q[3]:
                            dp[qx, qy] = p[:3] + (round(255 * alpha),)
                        else:
                            dp[qx, qy] = tuple(round(q[i] * (1 - alpha) + p[i] * alpha) for i in range(3)) + (max(q[3], round(255 * alpha)),)


def main():
    R.fire = A28.install()
    OV.install(R, A)
    c = {x['id']: x for x in R.ROSTER}[CID]
    # 지금 동작의 손 자리·무기 각도 읽기
    rec = []
    orig = A.compose
    sig = inspect.signature(orig)

    def compose(*a, **k):
        b = sig.bind(*a, **k)
        b.apply_defaults()
        g = b.arguments
        hx, hy = A.OX + g['hand'][0] + g['bdx'], A.OY + g['hand'][1]
        other = None
        if g['hands'] and g['ch'] and g['ch'].get('armless'):
            hl = g['hands'](hx, hy)
            if len(hl) > 1:
                other = hl[1][:2]
        rec.append({'deg': g['deg'], 'hand': (hx, hy), 'other': other, 'bdx': g['bdx'], 'mirror': bool(g['ch'] and g['ch'].get('mirror')), 'behind': g['behind']})
        return orig(*a, **k)
    A.compose = compose
    r = R.animate(c)
    A.compose = orig
    ni, na = len(r['idle']), len(r['attack'])
    assert len(rec) == ni + na, (len(rec), ni, na)
    idle, atk = rec[:ni], rec[ni:]
    body, pal, *_ = R.body(c)
    split = body.info.get('split', 18)
    head = body.crop((0, 0, 24, split))
    torso = body.crop((0, split, 24, 24))
    hand = A.hand_img(pal)
    wim, wpv, _, _, _ = OV._samples(CID)
    deg0 = OV._meta['weapons'][CID]['deg']
    mirror = idle[0]['mirror']
    man = json.load(open(os.path.join(ROOT, 'public', 'assets', 'custom', 'manifest.json')))['sprites']['char_' + CID]
    sheet = Image.open(os.path.join(ROOT, 'public', 'assets', 'custom', 'chars', CID + '.png')).convert('RGBA')
    pc = sheet.width // A.W
    fr = lambda k: sheet.crop(((k % pc) * A.W, (k // pc) * A.H, (k % pc) * A.W + A.W, (k // pc) * A.H + A.H))
    an = man['animations']
    hit = an['attack']['hit']
    # 시간표: 대기 1번 → 공격 → 대기 1번 → 공격
    idle_ms = 45 * ni
    atk_ms = 40 * na
    plan = [('idle', idle_ms), ('attack', atk_ms), ('idle', idle_ms), ('attack', atk_ms)]
    ox, oy = A.OX, A.OY
    foot = (ox + 12, oy + 24)          # 몸통 회전 기준 = 발밑 가운데
    frames = []
    trail = []
    font = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 20)
    PAD = 10
    for kind, dur in plan:
        for t in range(0, dur, TICK):
            # ── 왼쪽: 지금 게임 프레임 ──
            if kind == 'idle':
                k = min(ni - 1, t // 45)
                left = fr(an['idle']['frames'][k])
            else:
                k = min(na - 1, t // 40)
                left = fr(an['attack']['frames'][k])
            left = left.resize((A.W * S, A.H * S), Image.NEAREST)
            # ── 오른쪽: 엔진 ──
            seq, step = (idle, 45) if kind == 'idle' else (atk, 40)
            f = t / step
            i0 = min(len(seq) - 1, int(f))
            i1 = min(len(seq) - 1, i0 + 1)
            u = ease(f - int(f))
            P0, P1 = seq[i0], seq[i1]
            deg = lerp(P0['deg'], P1['deg'], u)
            hx, hy = lerp(P0['hand'][0], P1['hand'][0], u), lerp(P0['hand'][1], P1['hand'][1], u)
            bdx = lerp(P0['bdx'], P1['bdx'], u)
            if kind == 'idle':
                ph = 2 * math.pi * t / idle_ms
                breath = math.sin(ph)
                lean, sxT, syT = 0.0, 1 + 0.02 * breath, 1 - 0.035 * breath
                head_dy, head_rot = 0.5 + 0.5 * breath, 1.5 * math.sin(ph + 0.8)
            else:
                swing = max(-1.0, min(1.0, (deg - deg0) / 120))
                lean = -6 * swing
                ht = (t / 40 - hit)
                pop = math.exp(-ht * ht / 3) if ht > -1 else 0
                sxT, syT = 1 + 0.06 * pop, 1 - 0.08 * pop
                head_dy, head_rot = 1.2 * pop, lean * 0.6
            cv = Image.new('RGBA', (A.W * S, A.H * S), (0, 0, 0, 0))
            # 무기 잔상 (지난 각도 몇 개를 옅게)
            trail.append((deg, hx, hy))
            trail = trail[-5:]
            if kind == 'attack':
                for j, (dg, x, y) in enumerate(trail[:-1]):
                    if abs(dg - deg) > 8:
                        draw(cv, wim, (wpv[0] + 0.5, wpv[1] + 0.5), (x + 0.5, y + 0.5), dg - deg0, alpha=0.15 + 0.1 * j)
            behind = P0['behind']
            wdraw = lambda: draw(cv, wim, (wpv[0] + 0.5, wpv[1] + 0.5), (hx + 0.5, hy + 0.5), deg - deg0)
            if behind:
                wdraw()
            # 몸통: 발 기준으로 기울이고 늘이기
            draw(cv, torso, (12, 24 - split), (foot[0] + bdx, foot[1]), lean, sxT, syT)
            # 머리: 목(몸통 위 가운데)에 붙여서
            a = math.radians(lean)
            neck_h = (24 - split) * syT
            nx, ny = foot[0] + bdx + math.sin(a) * neck_h, foot[1] - math.cos(a) * neck_h
            draw(cv, head, (12, split), (nx, ny + head_dy), lean + head_rot)
            if not behind:
                wdraw()
            draw(cv, hand, (2, 2), (hx, hy))
            if P0['other']:
                ox2, oy2 = lerp(P0['other'][0], (P1['other'] or P0['other'])[0], u), lerp(P0['other'][1], (P1['other'] or P0['other'])[1], u)
                draw(cv, hand, (2, 2), (ox2, oy2))
            if mirror:
                cv = cv.transpose(Image.FLIP_LEFT_RIGHT)
            # 합치기
            CW, CH = 44 * S, 34 * S
            crop = lambda im: im.crop((4 * S, 2 * S, 4 * S + CW, 2 * S + CH))
            b = Image.new('RGBA', (PAD * 3 + CW * 2, 40 + CH + PAD), (246, 241, 228, 255))
            d = ImageDraw.Draw(b)
            d.text((PAD, 8), '지금 (28프레임)', fill=(70, 50, 35), font=font)
            d.text((PAD * 2 + CW, 8), '② 엔진 (부위별)', fill=(70, 50, 35), font=font)
            b.alpha_composite(crop(left), (PAD, 40))
            b.alpha_composite(crop(cv), (PAD * 2 + CW, 40))
            frames.append(b)
    out = [f.convert('RGB') for f in frames]
    out[0].save(os.path.join(HERE, 'body_engine.gif'), save_all=True, append_images=out[1:], duration=TICK, loop=0)
    # 정지 그림: 공격 중 6순간
    na_ticks = (idle_ms // TICK)
    picks = [na_ticks + int(x / TICK) for x in (0, 200, 400, 560, 640, 900)]
    st = Image.new('RGB', (out[0].width * 3, out[0].height * 2), (246, 241, 228))
    for q, k in enumerate(picks):
        st.paste(out[k], ((q % 3) * out[0].width, (q // 3) * out[0].height))
    st.save(os.path.join(HERE, 'body_engine.png'))
    print('ticks', len(out), 'split', split, 'mirror', mirror, 'hit', hit)


if __name__ == '__main__':
    main()
