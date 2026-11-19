"""공격 애니메이션 28프레임 시안 (2026-11-19) — 검·지팡이·총·활·도끼·창 6종, 무기마다 한 명.
지금 게임의 공격은 8~10프레임(긴 정지 프레임으로 리듬을 만듦). 28프레임은 같은 동작을 사이 프레임으로 채워
예비 동작·휘두름·타격 멈춤·회복이 매끄럽게 이어지게 한다. 규칙은 docs/CHARACTER_ART.md 그대로
(팔 없음·둥근 손·무기 레이어·마지막 프레임 = 대기 자세). 창은 도트가 깨끗한 0·45·90° 각도만 쓴다.
실행: python3 docs/drafts/anim28/anim28.py → sheets/<id>.png (대기 8 + 공격 28), anim28.json(열람용)
"""
import os, sys, json, math, io, base64
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'roster-art'))
sys.path.insert(0, os.path.join(HERE, '..', 'char-13'))
import roster_art as R
A = R.A
W2 = R.W2

N = 28
PICK = [('sword', 'arthur'), ('staff', 'isolde'), ('gun', 'kristin'), ('bow', 'william'), ('axe', 'ragnar'), ('spear', 'brynhild')]


def ease(t, kind):
    if kind == 'out':
        return 1 - (1 - t) ** 3
    if kind == 'in':
        return t ** 3
    if kind == 'io':
        return 3 * t * t - 2 * t ** 3
    return t


def track(keys):
    """keys: [(프레임, 값 튜플, 그 구간 이징)] → 28프레임 값 목록 (정수로 반올림, 각도는 그대로)"""
    out = []
    for f in range(N):
        for (f0, v0, _), (f1, v1, k) in zip(keys, keys[1:]):
            if f0 <= f <= f1:
                t = 0 if f1 == f0 else (f - f0) / (f1 - f0)
                e = ease(t, k)
                out.append(tuple(round(a + (b - a) * e) for a, b in zip(v0, v1)))
                break
        else:
            out.append(keys[-1][1])
    return out


# ───────── 휘두르기 (검·도끼) ─────────
def swing28(heavy):
    def swing(ch, weapon, hand=(19, 20), idle_deg=0):
        b = ch['img']
        top = -80 if heavy else -75          # 도끼는 머리 위로 크게 들어 올린다
        hit = 118 if heavy else 108
        # (각도, 머리 dx, 머리 dy, 몸 dx, 손 dx, 손 dy)
        keys = [(0, (idle_deg, 0, 0, 0, 0, 0), 'l'), (3, (-10, -1, 0, 0, 0, 0), 'out'),
                (9, (top, -1, 1, -1, -1, -1), 'io'),
                (13 if heavy else 12, (top - 6, -1, 1, -1, -1, -2), 'io'),            # 예비 동작 멈춤 (조금 더 젖힘)
                (15 if heavy else 14, (hit - 70, 1, -1, 0, 1, 0), 'in'),              # 휘두르기
                (16 if heavy else 15, (hit, 1, 0, 1, 2, 1), 'l'),                     # 타격
                (20, (hit + 3, 1, 0, 1, 2, 1), 'l'),                                  # 타격 멈춤
                (27, (idle_deg, 0, 0, 0, 0, 0), 'out')]
        vals = track(keys)
        strike = keys[4][0]
        impact = keys[5][0]
        out = []
        for f, (deg, hdx, hdy, bdx, hx, hy) in enumerate(vals):
            sm = None
            if f == strike:
                sm = [top - 6 + k * 25 for k in range(4)]
            elif f == impact:
                sm = [hit - 75 + k * 25 for k in range(3)]
            sp = {impact: 2, impact + 1: 3, impact + 2: 3, impact + 3: 2, impact + 4: 1}.get(f, 0)
            shake = 1 if heavy and impact <= f <= impact + 2 and f % 2 == 0 else 0   # 도끼: 내려찍을 때 몸이 들썩
            hd = (hand[0] + hx, hand[1] + hy + shake)
            def after(c, x, y, deg=deg, sp=sp, hd=hd, bdx=bdx):
                if sp:
                    tx, ty = A.tip_of(weapon, deg, (A.OX + hd[0] + bdx, A.OY + hd[1]))
                    A.spark(c, tx, ty, sp)
            behind = deg < -30 and not heavy   # 도끼는 머리 위로 들어 올린 모습이 보이게 앞에 그린다
            out.append((A.compose(A.pose(b, -hdx if ch.get('mirror') else hdx, hdy + shake), weapon, deg, hd, bdx, extra_after=after, smear=sm, behind=behind, ch=ch,
                                  sdy=-1 if behind else 0, hands=A.hands_for(ch, weapon, deg, behind, free=(-hdx, hdy), bdx=bdx, sdy=-1 if behind else 0)), 40))
        return out
    return swing


# ───────── 찌르기 (창) ─────────
def thrust28(ch, weapon='spear', hand=(19, 20), keys=None):
    b = ch['img']
    # (프레임: 각도, 머리 dx, 머리 dy, 손 dx, 손 dy, 효과 0 없음·1 속도선·2 작은 섬광·3 큰 섬광)
    seq = {}
    pos = track([(0, (0, 0, -1, 0), 'l'), (4, (-1, 0, -1, 0), 'out'), (11, (-1, 1, -4, 0), 'io'), (13, (-1, 1, -4, 0), 'l'),
                 (15, (1, -1, 5, 1), 'in'), (16, (1, 0, 6, 2), 'l'), (19, (1, 0, 6, 2), 'l'), (22, (0, 0, 3, 1), 'out'), (27, (0, 0, 0, 0), 'out')])
    for f in range(N):
        deg = 45 if f in (0, 1) or f >= 25 else 90
        fx = 1 if f in (14, 15) else 3 if f in (16, 17) else 2 if f in (18, 19) else 0
        seq[f] = (deg, *pos[f], fx)
    out = []
    for f in range(N):
        deg, hdx, hdy, hx, hy, fx = seq[f]
        hd = (hand[0] + hx, hand[1] + hy)
        def before(c, x, y, fx=fx):
            if fx == 1:
                g = ImageDraw.Draw(c)
                for k, yy in enumerate((y - 2, y, y + 2)):
                    g.line([(x - 9 + k * 2, yy), (x - 3, yy)], fill=A.SMEAR)
        def after(c, x, y, fx=fx, deg=deg, hd=hd):
            if fx >= 2:
                tx, ty = A.tip_of(weapon, deg, (A.OX + hd[0], A.OY + hd[1]))
                A.spark(c, tx + 1, ty, 3 if fx == 3 else 1)
        out.append((A.compose(A.pose(b, -hdx if ch.get('mirror') else hdx, hdy), weapon, deg, hd, extra_before=before, extra_after=after, ch=ch,
                              hands=A.hands_for({**ch, 'spear_off': 4 if deg == A.IDLE_TILT['spear'] else -5}, weapon, deg)), 40))
    return out


# ───────── 시전 (지팡이) ─────────
def cast28(ch, hand=(19, 22), staff='staff', idle_deg=0):
    b = ch['img']
    # (각도, 머리 dy, 지팡이 dy)
    pose_v = track([(0, (idle_deg, 0, 0), 'l'), (8, (12, 1, 2), 'io'), (11, (15, 1, 2), 'l'), (13, (-22, -1, -4), 'in'),
                    (21, (-25, 0, -4), 'l'), (27, (idle_deg, 0, 0), 'out')])
    ring_c, ring_in, ember = ch.get('fx', ((255, 154, 60, 255), (255, 224, 102, 255), (255, 214, 102, 255)))
    out = []
    for f, (deg, hdy, wdy) in enumerate(pose_v):
        charge = f if 3 <= f <= 11 else 0                 # 모으기: 구슬 쪽으로 불티가 빨려 듦
        ring = 0 if f < 13 or f > 21 else 2 + (f - 13) * 2  # 시전: 고리가 퍼진다
        hd = (hand[0], hand[1] + wdy)
        def after(c, x, y, deg=deg, ring=ring, charge=charge, hd=hd, f=f):
            ox, oy = A.tip_of(staff, deg, (A.OX + hd[0], A.OY + hd[1]))
            g = ImageDraw.Draw(c)
            if charge:
                r = 9 - (charge - 3)
                for k in range(3):
                    a = k * 2.1 + charge * 0.6
                    g.point([(ox + round(math.cos(a) * r), oy + round(math.sin(a) * r))], fill=ember)
                if charge >= 9:
                    A.spark(c, ox, oy, 1)
            if ring:
                g.ellipse([ox - ring, oy - ring, ox + ring, oy + ring], outline=ring_c)
                if ring > 3:
                    g.ellipse([ox - ring + 2, oy - ring + 2, ox + ring - 2, oy + ring - 2], outline=ring_in)
                A.spark(c, ox, oy, 3 if ring <= 6 else 2 if ring <= 10 else 1)
                for k in range(4):
                    a = k * 1.6 + f * 0.5
                    rr = 3 + ring // 2
                    g.point([(ox + round(math.cos(a) * rr), oy + round(math.sin(a) * rr) - (f - 13) // 2)], fill=ember)
        out.append((A.compose(A.pose(b, 0, hdy), staff, deg, hd, extra_after=after, ch=ch,
                              hands=A.hands_for(ch, staff, deg, raise_free=max(0, -wdy) + (2 if ring else 0))), 40))
    return out


# ───────── 활 ─────────
def shoot28(ch, hand=(1, 18)):
    b = ch['img']
    arrow = R.Wp.paint(R.Wp.ARROW, R.Wp.PAL)
    # 당김(시위 x), 머리 dx, 머리 dy, 몸 dx
    pull = track([(0, (0, 0, 0, 0), 'l'), (2, (1, 0, 0, 0), 'out'), (10, (6, 1, 1, 1), 'io'), (14, (6, 1, 1, 1), 'l')])
    keys = []
    for f in range(15):
        p, hdx, hdy, bdx = pull[f]
        tremble = 1 if 11 <= f <= 14 and f % 2 else 0       # 꽉 당겨 떨림
        keys.append((p - tremble, hdx, hdy, bdx, -1))
    # 놓기: 시위 튕김 + 반동, 화살이 날아감 (ax 0..4), 시위 떨림 (-2, 1, -1, 0)
    for k, (p, hdx, hdy, bdx, ax) in enumerate([(-2, -1, -1, -1, 0), (2, -1, -1, -1, 1), (-1, 0, 0, 0, 2), (1, 0, 0, 0, 3), (-1, 0, 0, 0, 4),
                                                 (1, 0, 0, 0, -3), (0, 0, 0, 0, -3), (0, 0, 0, 0, -3)]):
        keys.append((p, hdx, hdy, bdx, ax))
    while len(keys) < N - 1:
        keys.append((0, 0, 0, 0, -3))                        # 빈손으로 다음 화살을 준비
    keys.append((0, 0, 0, 0, -2))                            # 마지막 = 대기 자세(기울인 활)
    out = []
    for pl, hdx, hdy, bdx, ax in keys:
        bdeg = A.IDLE_TILT['bow'] if ax == -2 else 0
        def after(c, x, y, pl=pl, ax=ax, bdx=bdx, bdeg=bdeg):
            g = ImageDraw.Draw(c)
            top, bot = A.bow_tips(bdeg, x, y)
            mid = (x + 3 + pl, y) if not bdeg else ((top[0] + bot[0]) // 2, (top[1] + bot[1]) // 2)
            col = (238, 246, 255, 255)
            g.line([top, mid], fill=col)
            g.line([mid, bot], fill=col)
            if ax == -1:
                c.alpha_composite(arrow, (mid[0] - 9, y - 2))
            elif ax >= 0:
                axp = x - 8 - ax * 6
                if axp > -14:
                    for k, yy in enumerate((y - 1, y + 1)):
                        g.line([(axp + 11, yy), (axp + 16 + ax * 3, yy)], fill=A.SMEAR)
                    c.alpha_composite(arrow, (axp, y - 2))
        def hands(hx, hy, pl=pl, ax=ax, bdx=bdx):
            if ax == -1:
                free = (hx + 3 + pl, hy, 'top')
            elif ax in (-2, -3):
                free = (A.OX + A.ELIN_FREE_X + bdx, A.OY + 21, 'top')
            else:
                free = (hx + 8 - min(ax, 1) * 2, hy - 2 + min(ax, 1), 'top')
            return [(hx, hy, 'top'), free]
        out.append((A.compose(A.pose(b, hdx, hdy), 'bow', bdeg, hand, bdx, extra_after=after, ch=ch, hands=hands), 40))
    return out


# ───────── 총 ─────────
def fire28(ch, weapon, hand, idle_deg):
    b = ch['img']
    # (각도, 머리 dx, 머리 dy, 손 dx)
    aim = track([(0, (idle_deg, 0, 0, 0), 'l'), (6, (80, -1, 0, -1), 'out'), (9, (90, -1, 1, -1), 'out'), (13, (90, -1, 1, -1), 'l')])
    keys = [(d, hx_, hy_, h_, 0, -1) for d, hx_, hy_, h_ in aim]
    # 발사: 섬광 3 → 반동(손 -3) → 탄이 날아감, 연기 → 회복
    keys += [(90, -1, -1, -3, 3, 0), (92, -1, -1, -3, 2, 6), (90, 0, 0, -2, 1, 12), (88, 0, 0, -2, 0, 18), (90, 0, 0, -1, 0, 24), (90, 0, 0, -1, 0, 30)]
    rec = track([(0, (90, 0, 0, -1), 'l'), (8, (idle_deg, 0, 0, 0), 'out')])
    keys += [(*v, 0, -1) for v in rec[1:9]]
    keys = keys[:N - 1] + [(idle_deg, 0, 0, 0, 0, -1)]
    out = []
    mir = ch.get('mirror')
    for i, (deg, hdx, hdy, hx, fl, bx) in enumerate(keys):
        hd = (hand[0] + hx, hand[1])
        smoke = 14 <= i <= 22
        def after(c, x, y, deg=deg, fl=fl, bx=bx, hd=hd, smoke=smoke, i=i):
            tx, ty = A.tip_of(weapon, deg, (A.OX + hd[0], A.OY + hd[1]))
            g = ImageDraw.Draw(c)
            if fl:
                A.spark(c, tx + 2, ty, fl)
            if bx >= 0:
                g.line([(tx + 2 + bx, ty), (tx + 6 + bx, ty)], fill=(255, 224, 102, 255))
                g.line([(tx + bx - 4, ty), (tx + 1 + bx, ty)], fill=A.SMEAR)
            if smoke and not fl:
                k = i - 14
                g.point([(tx + 1 + k // 3, ty - 1 - k // 2)], fill=(214, 214, 222, 255))
                if k > 2:
                    g.point([(tx + k // 3, ty - 2 - k // 2)], fill=(176, 176, 190, 255))
        out.append((A.compose(A.pose(b, -hdx if mir else hdx, hdy), weapon, deg, hd, extra_after=after, ch=ch,
                              hands=A.hands_for({**ch, 'spear_off': -4}, 'spear', deg)), 40))
    return out


def uri(img):
    bb = io.BytesIO()
    img.save(bb, 'PNG')
    return 'data:image/png;base64,' + base64.b64encode(bb.getvalue()).decode()


def main():
    os.makedirs(os.path.join(HERE, 'sheets'), exist_ok=True)
    by_id = {c['id']: c for c in R.ROSTER}
    orig = {'swing': A.swing, 'thrust': A.thrust, 'cast': A.cast, 'shoot': A.shoot, 'fire': R.fire}
    out = []
    for kind, cid in PICK:
        c = by_id[cid]
        A.swing, A.thrust, A.cast, A.shoot, R.fire = orig['swing'], orig['thrust'], orig['cast'], orig['shoot'], orig['fire']
        old = R.animate(c)
        A.swing = swing28(kind == 'axe')
        A.thrust, A.cast, A.shoot, R.fire = thrust28, cast28, shoot28, fire28
        new = R.animate(c)
        assert len(new['attack']) == N, (cid, len(new['attack']))
        sh = R.sheet(new['idle'] + new['attack'])
        sh.save(os.path.join(HERE, 'sheets', f'{cid}.png'))
        out.append({'id': cid, 'name': c['name'], 'grade': c['grade'], 'weapon': kind,
                    'idle': {'n': len(new['idle']), 'ms': [m for _, m in new['idle']]},
                    'attack': {'n': N, 'ms': [m for _, m in new['attack']]},
                    'old': {'n': len(old['attack']), 'ms': [m for _, m in old['attack']], 'src': uri(R.sheet(old['attack']))},
                    'src': uri(sh)})
    json.dump({'W': A.W, 'H': A.H, 'OX': A.OX, 'OY': A.OY, 'chars': out}, open(os.path.join(HERE, 'anim28.json'), 'w'), ensure_ascii=False)
    print('ok', [(o['id'], o['attack']['n'], sum(o['attack']['ms'])) for o in out])


if __name__ == '__main__':
    main()
