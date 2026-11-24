"""사용자가 PSD 로 고친 몸·무기 그림을 게임 그림 만들기에 끼워 넣는다 (2026-11-24)
data/ 는 import_psd.py 가 수정한 PSD 에서 뽑아 만든다:
  data/bodies/<id>.png  24x24 몸 (팔·손·무기 없음) · data/weapons/<id>.png 대기 각도 무기 · data/overrides.json (쥐는 점·각도·눈·머리 줄 등)
끼우는 곳 (install 이 바꿔 끼운다):
  - roster_art.body(c)       → 고친 몸 (img.info 에 머리/몸 줄 split·눈 eyes, 손 피부색 pal['S'] 도 몸에 맞춤)
  - anim.weapon_img / tip_of → 고친 무기. 대기 각도는 그림 그대로, 다른 각도는 RotSprite(Scale2x 세 번 → 돌려서 칸 가운데 찍기) + 외곽선 다시 두르기
  - anim.blink               → 눈을 못 찾은 몸은 깜빡이지 않는다
  - roster_art.pick_weapon   → 무기 종류를 바꾼 캐릭터(퍼거스: 창 → 총)
지금 그리는 캐릭터는 set_current(id) 로 알린다 (roster_art.animate 는 자동, key_weapons 는 set_ctx 에서)
"""
import os, json, math
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, 'data')
OUTLINE = (0x2b, 0x1d, 0x2f)
_meta = json.load(open(os.path.join(DATA, 'overrides.json'))) if os.path.exists(os.path.join(DATA, 'overrides.json')) else {'bodies': {}, 'weapons': {}, 'wtype': {}}
_cur = {'id': None}
_cache = {}


def set_current(cid):
    _cur['id'] = cid


def has_body(cid):
    return cid in _meta['bodies']


def has_weapon(cid):
    return cid in _meta['weapons']


def wtype(cid):
    return _meta.get('wtype', {}).get(cid)


def body_img(cid, base_info=None):
    """고친 몸. 머리/몸 줄(split) 등은 원래 몸 그림 값을 그대로 쓰고, 눈 자리만 고친 그림에서 찾은 값"""
    m = _meta['bodies'][cid]
    im = Image.open(os.path.join(DATA, 'bodies', f'{cid}.png')).convert('RGBA')
    im.info = dict(base_info or {})
    if m.get('split'):
        im.info['split'] = m['split']
    im.info['eyes'] = [tuple(e) for e in m['eyes']]
    if not m['eyes']:
        im.info['noblink'] = True
    return im


def body_skin(cid):
    return _meta['bodies'][cid].get('skin')


# ── 무기: 대기 각도 그림 → 축 좌표 샘플 ──
def _axes(deg):
    a = math.radians(deg)
    return (math.sin(a), -math.cos(a)), (math.cos(a), math.sin(a))


def _samples(cid):
    if cid in _cache:
        return _cache[cid]
    m = _meta['weapons'][cid]
    im = Image.open(os.path.join(DATA, 'weapons', f'{cid}.png')).convert('RGBA')
    px, (pvx, pvy) = im.load(), m['pivot']
    u, n = _axes(m['deg'])
    W, H = im.size
    opaque = lambda x, y: 0 <= x < W and 0 <= y < H and px[x, y][3] > 0
    pts = []
    for y in range(H):
        for x in range(W):
            p = px[x, y]
            if not p[3]:
                continue
            edge = any(not opaque(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if edge and sum(p[:3]) < 160:      # 바깥 외곽선은 다시 두른다
                continue
            dx, dy = x - pvx, y - pvy
            pts.append((dx * u[0] + dy * u[1], dx * n[0] + dy * n[1], p))
    length = max(1, round(max((t for t, _, _ in pts), default=1)))
    buckets = {}
    for t, k, p in pts:
        buckets.setdefault((round(t), round(k)), []).append((t, k, p))
    _cache[cid] = (im, (pvx, pvy), pts, buckets, length)
    return _cache[cid]


def weapon_render(cid, deg, silhouette=None):
    im, pv, _, _, _ = _samples(cid)
    m = _meta['weapons'][cid]
    if abs((deg - m['deg'] + 180) % 360 - 180) < 0.5:      # 대기 각도 = 고친 그림 그대로
        out = im.copy()
        if silhouette:
            o = out.load()
            for y in range(out.height):
                for x in range(out.width):
                    if o[x, y][3]:
                        o[x, y] = silhouette
        return out, pv
    import anim as A
    big, (cx, cy) = _rot_src(cid)
    d = math.radians(deg - m['deg'])
    co, si = math.cos(d), math.sin(d)
    W, H = big.size
    bp = big.load()
    R = int(math.hypot(im.width, im.height)) + 2
    filled = {}
    for qy in range(-R, R + 1):
        for qx in range(-R, R + 1):
            # 화면 칸 (qx,qy) → 원래 그림 8배 좌표 (회전 반대로)
            sx = cx + (co * qx + si * qy) * 8
            sy = cy + (-si * qx + co * qy) * 8
            ix, iy = int(math.floor(sx)), int(math.floor(sy))
            if 0 <= ix < W and 0 <= iy < H and bp[ix, iy][3]:
                filled[(qx, qy)] = '#%02x%02x%02x' % bp[ix, iy][:3]
    if not filled:
        filled[(0, 0)] = '#888888'
    return A._render(filled, silhouette)


def _scale2x(im):
    W, H = im.size
    p = im.load()
    out = Image.new('RGBA', (W * 2, H * 2))
    o = out.load()
    g = lambda x, y: p[min(W - 1, max(0, x)), min(H - 1, max(0, y))]
    for y in range(H):
        for x in range(W):
            P, A_, B, C, D = p[x, y], g(x, y - 1), g(x + 1, y), g(x - 1, y), g(x, y + 1)
            o[2 * x, 2 * y] = C if C == A_ and C != D and A_ != B else P
            o[2 * x + 1, 2 * y] = A_ if A_ == B and A_ != C and B != D else P
            o[2 * x, 2 * y + 1] = D if D == C and D != B and C != A_ else P
            o[2 * x + 1, 2 * y + 1] = B if B == D and B != A_ and D != C else P
    return out


def _rot_src(cid):
    """RotSprite 준비: 바깥 외곽선을 뺀 무기 그림을 Scale2x 세 번(8배) — 회전 뒤 칸 가운데를 찍으면 계단이 덜 깨진다"""
    key = ('rot', cid)
    if key in _cache:
        return _cache[key]
    im, (pvx, pvy), pts, _, _ = _samples(cid)
    core = Image.new('RGBA', im.size, (0, 0, 0, 0))
    cp, ip = core.load(), im.load()
    W, H = im.size
    opaque = lambda x, y: 0 <= x < W and 0 <= y < H and ip[x, y][3] > 0
    for y in range(H):
        for x in range(W):
            p = ip[x, y]
            if p[3] and not (sum(p[:3]) < 160 and any(not opaque(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))):
                cp[x, y] = p
    big = _scale2x(_scale2x(_scale2x(core)))
    _cache[key] = (big, (pvx * 8 + 4, pvy * 8 + 4))
    return _cache[key]


def weapon_length(cid):
    return _samples(cid)[4]


def install(R, A):
    """roster_art(R)·anim(A) 에 끼운다. 여러 번 불러도 한 번만"""
    if getattr(A, '_psd_ov', False):
        return
    A._psd_ov = True
    orig_body, orig_pick, orig_animate = R.body, R.pick_weapon, R.animate
    orig_wimg, orig_tip, orig_blink = A.weapon_img, A.tip_of, A.blink

    def body(c):
        r = orig_body(c)
        if not has_body(c['id']):
            return r
        img, pal, hat_rows, female, style = r
        pal = dict(pal)
        if body_skin(c['id']):
            pal['S'] = body_skin(c['id'])
        return body_img(c['id'], img.info), pal, hat_rows, female, style

    def pick_weapon(c):
        return wtype(c['id']) or orig_pick(c)

    def animate(c):
        set_current(c['id'])
        try:
            return orig_animate(c)
        finally:
            set_current(None)

    def weapon_img(name, deg, silhouette=None):
        cid = _cur['id']
        if cid and has_weapon(cid):
            return weapon_render(cid, deg, silhouette)
        return orig_wimg(name, deg, silhouette)

    def tip_of(name, deg, hand):
        cid = _cur['id']
        if cid and has_weapon(cid):
            L = weapon_length(cid)
            a = math.radians(deg)
            return (hand[0] + round(math.sin(a) * L), hand[1] - round(math.cos(a) * L))
        return orig_tip(name, deg, hand)

    def blink(img, pal):
        if img.info.get('noblink'):
            out = img.copy()
            out.info = dict(img.info)
            return out
        return orig_blink(img, pal)
    R.body, R.pick_weapon, R.animate = body, pick_weapon, animate
    A.weapon_img, A.tip_of, A.blink = weapon_img, tip_of, blink
