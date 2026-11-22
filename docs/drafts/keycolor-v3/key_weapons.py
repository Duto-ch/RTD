"""키 컬러 시안 v3 — 무기까지 (2026-11-22 사용자 요청: 무기도 키 컬러로, 고유한 모양으로 손보기 + 시험 캐릭터 하나에 몸 오브젝트 더 붙이기)
- 대상: 유니크를 뺀 58명 (recolor.py 와 같은 키 컬러 배정 keys.json)
- 무기 모양: weapons_v3(docs/drafts/roster-v2-art/weapons_v3.py)의 66가지 — 검 8·도끼 6·망치 6·창 8·단검 7·지팡이 머리 16·활 6·총 5·석궁 4.
  무기 종류(= 공격 동작)는 그대로, 같은 종류끼리 모양이 겹치지 않게 나눈다 (설명이 정해 주는 모양이 먼저, 같은 모양은 1명만).
  지팡이처럼 사람이 모양 수보다 많은 종류는 몇 명이 겹치지만 키 컬러로 갈린다
- 무기 색: 날·손잡이·보석·지팡이 머리·시전 고리 = 키 컬러 (weapons_v3 재질: 커먼 쇠·나무 → 언커먼 키 컬러 손잡이 → 레어 은·키 보석)
- 몸: 게임 그림 그대로 그린 뒤 옷 주색·그늘색·가슴 보석만 키 컬러로 (recolor.py 와 같다)
- 시안 출신 7명(카이라·베로나·엘린·토른·아델·세레나·닉스)은 사용자·시안 몸 그림 그대로 두고 무기만 바꾼다
- 시험: 콜린(땜장이)에게 몸 오브젝트 — 올리브 캔버스 배낭(몸 양옆), 오른쪽 어깨 위 큰 톱니바퀴, 왼쪽 머리 뒤 렌치, 이마 고글, 허리 주머니
실행: python3 docs/drafts/keycolor-v3/key_weapons.py [--install] → sheets/<id>.png · weapons.json · compare.png · colin.png · colin.gif
      --install (2026-11-22 게임 적용): sheets/<id>.png 를 public/assets/custom/chars/<id>.png 로 복사 (프레임 수·타격 프레임은 그대로라 manifest 는 안 바뀜)
      ⚠️ roster-art/roster_art.py + tools/import-roster-art.py 로 캐릭터를 다시 만들면 이 58명이 예전 색으로 덮인다 → 그 뒤 이 스크립트를 --install 로 다시 돌릴 것
"""
import os, sys, json, types, subprocess
from collections import Counter
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(HERE, '..', 'roster-art'))
sys.path.insert(0, os.path.join(HERE, '..', 'roster-v2-art'))
sys.path.insert(0, os.path.join(HERE, '..', 'anim28'))
sys.path.insert(0, HERE)
import roster_art as R
import keys as KC
import weapons_v3 as W3
import anim28 as A28
import recolor as RC
A, D = R.A, R.D

BASE_LEN = dict(R.BASE_LEN)
KEY_OF = json.load(open(os.path.join(HERE, 'keys.json')))


def hexrgba(h):
    return A.rgba(h)


def fx_of(key):
    lit, mid, dark = KC.KEYS[key][3]
    return (hexrgba(mid), hexrgba(lit), hexrgba(lit))


def wtype_of(c):
    w = R.pick_weapon(c)
    return 'staff' if w.startswith('staff') else w


# ── 무기 모양 배정 ──
ORIG_W = {'kaira': 'sword', 'verona': 'staff', 'elin': 'bow', 'thorn': 'staff', 'adel': 'spear', 'serena': 'staff', 'nix': 'dagger'}


def assign(targets):
    cnt = Counter()

    def forced(c):
        v = W3.preferred_variant(c['wtype'], c['look'])
        if v is not None and cnt[(c['wtype'], v)] < 1:
            cnt[(c['wtype'], v)] += 1
            return v
        return None
    out = {}
    for wt in W3.VARIANTS:
        group = [c for c in targets if c['wtype'] == wt]
        out.update(KC.spread(group, W3.VARIANTS[wt], 'w3', lambda x: x['wtype'], forced=forced))
    return out


# ── 시험: 콜린 몸 오브젝트 ──
def colin_objects(img):
    """24x24 몸 그림에 덧그린다 — 배낭과 등에 꽂은 장비는 몸 뒤(투명한 곳에만), 고글·주머니는 몸 앞
    작은 몸에서도 읽히게 실루엣 위주: 오른쪽 어깨 위로 큰 톱니바퀴, 왼쪽 머리 뒤로 비스듬한 렌치, 옷(키 컬러)과 다른 올리브 캔버스 배낭"""
    O = (43, 29, 47, 255)
    BAG, BAGD, STRAP = hexrgba('#b4c46a'), hexrgba('#7f8f42'), hexrgba('#4a3020')
    GEAR, GEARD, BRASS = hexrgba('#e0b050'), hexrgba('#a07020'), hexrgba('#fff0b0')
    LENS, LENSD, STEEL, STEELD = hexrgba('#8ad8ff'), hexrgba('#3080b8'), hexrgba('#d8dde4'), hexrgba('#8a94a0')
    im = img.copy()
    px = im.load()

    def behind(x, y, c):
        if 0 <= x < 24 and 0 <= y < 24 and px[x, y][3] == 0:
            px[x, y] = c

    def front(x, y, c):
        if 0 <= x < 24 and 0 <= y < 24:
            px[x, y] = c

    def stamp(rows, x0, y0, pal, fn):
        for gy, row in enumerate(rows):
            for gx, k in enumerate(row):
                if k != '.':
                    fn(x0 + gx, y0 + gy, pal[k])
    # 배낭: 몸 양옆으로 비죽 (몸 뒤)
    # 배낭은 어깨 높이(14~19줄) — 그 아래는 둥근 손이 얹히는 자리라 가려진다
    bag = [".OO", "OBO", "OBO", "OBO", "ObO", "OOO"]
    stamp(bag, 4, 14, {'O': O, 'B': BAG, 'b': BAGD}, behind)
    stamp([r[::-1] for r in bag], 16, 14, {'O': O, 'B': BAG, 'b': BAGD}, behind)
    # 오른쪽 어깨 위 큰 톱니바퀴 (몸 뒤)
    stamp(["..O.O..", ".OGOGO.", "OGGGGGO", ".GGhGG.", "OGGGGdO", ".OdGdO.", "..O.O.."], 16, 9,
          {'O': O, 'G': GEAR, 'd': GEARD, 'h': BRASS}, behind)
    # 왼쪽 머리 뒤로 비스듬한 렌치 (몸 뒤): 벌린 머리 + 손잡이
    stamp(["OO.OO...", "OSOSO...", "OSSSO...", ".OSSsO..", "..OSSsO.", "...OSSsO", "....OOO."], 1, 6, {'O': O, 'S': STEEL, 's': STEELD}, behind)
    # 이마 고글 (앞): 끈 + 렌즈 두 개
    for x in range(6, 17):
        front(x, 13, STRAP)
    for x0 in (8, 12):
        stamp(["OLlO"], x0, 13, {'O': O, 'L': LENS, 'l': LENSD}, front)
    # 허리 주머니 하나 (오른쪽, 앞)
    stamp(["OO", "Bb"], 13, 21, {'O': O, 'B': BAG, 'b': BAGD}, front)
    return im


def main():
    game = RC.game
    targets = []
    for g in game:
        if g['grade'] == 4:
            continue
        c = {**RC.BY[g['id']], **g}
        c['grade'] = RC.BY[g['id']]['grade']        # 그림 등급 = 지금 게임 그림을 만든 등급 (몸 장식과 맞춘다)
        c['wtype'] = ORIG_W.get(c['id']) or wtype_of(c)
        targets.append(c)
    WVAR = assign(targets)
    for c in targets:
        if c['wtype'] == 'staff' and WVAR[c['id']] == 'orb':
            WVAR[c['id']] = ''
    # roster_art 의 무기 그리기를 weapons_v3 로 바꿔 끼운다
    R.fire = A28.install()
    A.geo_weapon = W3.geo
    R.W2 = types.SimpleNamespace(CTX=W3.CTX, GEO_LEN_V=W3.GEO_LEN_V, geo=W3.geo,
                                 pick_variant=lambda w, look, grade, cid: WVAR[cid])
    STAFF_NAMES = ('staff', 'staff_ice', 'staff_leaf')

    def set_ctx(c):
        v = WVAR[c['id']]
        W3.CTX.update(grade=c['grade'], key=KEY_OF[c['id']], var={**{n: v for n in STAFF_NAMES}, c['wtype']: v})
        A.GEO_LEN.clear(), A.GEO_LEN.update(BASE_LEN)
        L = W3.GEO_LEN_V.get((c['wtype'], v))
        if L:
            for n in (STAFF_NAMES if c['wtype'] == 'staff' else (c['wtype'],)):
                A.GEO_LEN[n] = L
    os.makedirs(os.path.join(HERE, 'sheets'), exist_ok=True)
    meta = {}
    orig_body = R.body
    # 1) 로스터 그림 캐릭터 (roster_art.animate)
    for c in targets:
        if c['id'] in RC.ORIG:
            continue
        set_ctx(c)
        old_fx = R.FX_BY_ATTR[c['attr']]
        R.FX_BY_ATTR[c['attr']] = fx_of(KEY_OF[c['id']])
        R.body = (lambda cc: (lambda *a: (lambda r: (colin_objects(r[0]), *r[1:]))(orig_body(cc))))(c) if c['id'] == 'colin' else orig_body
        try:
            r = R.animate(c)
        finally:
            R.FX_BY_ATTR[c['attr']] = old_fx
            R.body = orig_body
        frames = r['idle'] + r['attack']
        R.sheet(frames).save(os.path.join(HERE, 'sheets', f"{c['id']}.png"))
        meta[c['id']] = {'frames': frames}
    # 2) 시안 출신 6명: 몸 그림 그대로, 무기만 (anim.build_all 을 돌리면서 프레임마다 그 캐릭터 무기 설정)
    TAG = {'red_sword': 'kaira', 'red_mage': 'verona', 'green_archer': 'elin', 'green_druid': 'thorn', 'blue_knight': 'adel', 'blue_priest': 'serena', 'blue_rogue': 'nix'}
    BYID = {c['id']: c for c in targets}
    orig_char, orig_new, orig_compose = A.char, A.new_body, A.compose

    def tag(ch, key):
        cid = TAG.get(key)
        ch['cid'] = cid
        if cid:
            ch['fx'] = fx_of(KEY_OF[cid])
        return ch
    A.char = lambda key, *a, **k: tag(orig_char(key, *a, **k), key)
    A.new_body = lambda key: tag(orig_new(key), key)

    def compose(*a, ch=None, **k):
        if ch and ch.get('cid'):
            set_ctx(BYID[ch['cid']])
            A.geo_weapon = W3.geo
        else:
            A.geo_weapon = A.geo_weapon_orig       # 유니크 세레나·게임에 없는 브란은 예전 무기 그대로 (여기서는 버림)
        return orig_compose(*a, ch=ch, **k)
    A.compose = compose
    keymap = {'sword': 'kaira', 'staff': 'verona', 'bow': 'elin', 'knight': 'adel', 'leaf': 'thorn', 'ice': 'serena', 'dagger': 'nix'}   # 세레나는 게임에서 레어 (2026-11-22 빠져 있던 것 추가)
    for a in A.build_all():
        cid = keymap.get(a['key'])
        if cid:
            frames = a['idle'] + a['attack']
            R.sheet(frames).save(os.path.join(HERE, 'sheets', f'{cid}.png'))
    A.char, A.new_body, A.compose = orig_char, orig_new, orig_compose
    # 3) 몸 옷 색 다시 칠하기 (무기는 이미 키 컬러)
    for c in targets:
        Cm, Cs, gem = RC.old_colors(c)
        k = KC.KEYS[KEY_OF[c['id']]]
        m = {RC.rgb(Cm): RC.rgb(k[0]), RC.rgb(Cs): RC.rgb(k[1]), RC.rgb(gem): RC.rgb(k[2])}
        p = os.path.join(HERE, 'sheets', f"{c['id']}.png")
        sh = Image.open(p).convert('RGBA')
        px = sh.load()
        for y in range(sh.height):
            for x in range(sh.width):
                q = px[x, y]
                if q[3] and q[:3] in m:
                    px[x, y] = m[q[:3]] + (q[3],)
        sh.save(p)
    json.dump({c['id']: {'key': KEY_OF[c['id']], 'wtype': c['wtype'], 'wvar': WVAR[c['id']], 'wname': W3.vname(c['wtype'], WVAR[c['id']])} for c in targets},
              open(os.path.join(HERE, 'weapons.json'), 'w'), ensure_ascii=False, indent=0)
    compare(targets, WVAR)
    colin_view()
    if '--install' in sys.argv:
        import shutil
        dst = os.path.join(ROOT, 'public', 'assets', 'custom', 'chars')
        for c in targets:
            shutil.copyfile(os.path.join(HERE, 'sheets', f"{c['id']}.png"), os.path.join(dst, f"{c['id']}.png"))
        print('installed', len(targets), 'sheets → public/assets/custom/chars')
    print(len(targets), 'chars · weapon designs', len({(c['wtype'], WVAR[c['id']]) for c in targets}),
          dict(Counter(c['wtype'] for c in targets)))


def compare(targets, WVAR):
    """등급별, 캐릭터마다 위 = 지금 게임 · 아래 = 시안 (대기 첫 프레임 · 공격 타격 프레임, 3배)"""
    font = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 13)
    fontb = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 20)
    src = os.path.join(ROOT, 'public', 'assets', 'custom', 'chars')
    art = {c['id']: c for c in json.load(open(os.path.join(HERE, '..', 'roster-art', 'roster-art.json')))['chars']}
    z, fw, fh = 3, 56, 40
    cw, per = fw * z * 2 + 10, 6
    GN = {1: '커먼', 2: '언커먼', 3: '레어'}
    game_grade = {g['id']: g['grade'] for g in RC.game}
    groups = [(gr, sorted([c for c in targets if game_grade[c['id']] == gr], key=lambda c: (c['wtype'], c['id']))) for gr in (1, 2, 3)]
    rowh = fh * z * 2 + 24
    H = sum(34 + ((len(l) + per - 1) // per) * rowh for _, l in groups) + 10
    out = Image.new('RGB', (per * cw + 10, H), (246, 241, 228))
    d = ImageDraw.Draw(out)
    y = 6
    for gr, lst in groups:
        d.text((8, y), f"{GN[gr]} {len(lst)}명 — 위: 지금 · 아래: 시안 (대기 · 공격 타격 프레임)", fill=(80, 60, 40), font=fontb)
        y += 34
        for i, c in enumerate(lst):
            x0, y0 = 6 + (i % per) * cw, y + (i // per) * rowh
            hit = art[c['id']]['idle']['n'] + A28.HIT28[R.pick_weapon(c) if c['id'] not in ORIG_W else {'staff': 'staff', 'sword': 'sword', 'bow': 'bow', 'spear': 'spear', 'dagger': 'dagger'}[ORIG_W[c['id']]]]
            for j, path in enumerate((os.path.join(src, f"{c['id']}.png"), os.path.join(HERE, 'sheets', f"{c['id']}.png"))):
                sh = Image.open(path).convert('RGBA')
                for k, fi in enumerate((0, hit)):
                    f = sh.crop((fi * fw, 0, fi * fw + fw, fh)).resize((fw * z, fh * z), Image.NEAREST)
                    out.paste(f, (x0 + k * fw * z, y0 + j * fh * z), f)
            key = KEY_OF[c['id']]
            d.rectangle([x0 + 2, y0 + 2 * fh * z + 5, x0 + 11, y0 + 2 * fh * z + 14], fill=KC.KEYS[key][0], outline=(43, 29, 47))
            d.text((x0 + 15, y0 + 2 * fh * z + 2), f"{c['name']} · {KC.KEY_NAMES[key]} · {W3.vname(c['wtype'], WVAR[c['id']])}", fill=(60, 40, 30), font=font)
        y += ((len(lst) + per - 1) // per) * rowh
    out.save(os.path.join(HERE, 'compare.png'))


def colin_view():
    """시험 캐릭터 콜린: 지금 · 시안(오브젝트) 몸 8배 + 대기 GIF"""
    src = Image.open(os.path.join(ROOT, 'public', 'assets', 'custom', 'chars', 'colin.png')).convert('RGBA')
    new = Image.open(os.path.join(HERE, 'sheets', 'colin.png')).convert('RGBA')
    z, fw, fh = 8, 56, 40
    out = Image.new('RGBA', (fw * z * 2 + 30, fh * z + 20), (246, 241, 228, 255))
    for j, sh in enumerate((src, new)):
        f = sh.crop((0, 0, fw, fh)).resize((fw * z, fh * z), Image.NEAREST)
        out.alpha_composite(f, (10 + j * (fw * z + 10), 10))
    out.convert('RGB').save(os.path.join(HERE, 'colin.png'))
    n = new.width // fw
    gif = []
    for i in range(n):
        c = Image.new('RGBA', (fw * 6, fh * 6), (246, 241, 228, 255))
        c.alpha_composite(new.crop((i * fw, 0, i * fw + fw, fh)).resize((fw * 6, fh * 6), Image.NEAREST))
        gif.append(c.convert('RGB'))
    ni = 28   # 대기 28프레임 (2026-11-22)
    ms = [45] * ni * 2 + [40] * (n - ni)
    seq = gif[:ni] * 2 + gif[ni:]
    seq[0].save(os.path.join(HERE, 'colin.gif'), save_all=True, append_images=seq[1:], duration=ms[:len(seq)], loop=0)


if __name__ == '__main__':
    main()
