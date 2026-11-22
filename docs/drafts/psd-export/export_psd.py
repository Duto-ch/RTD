"""게임 캐릭터 70명의 몸·무기 그림을 레이어로 나눈 PSD 하나로 내보내기 (2026-11-22 사용자 요청)
- 몸: 팔·손·무기 없는 24x24 몸 그림 (게임과 같은 코드로 다시 그림). 유니크 뺀 58명은 키 컬러 옷(keycolor-v3) + 콜린 몸 오브젝트
- 무기: 대기 자세 각도 그대로 (쥐는 점 기준), 58명은 weapons_v3 모양·키 컬러, 유니크는 지금 게임 무기(전용 무기 포함). 활은 시위까지
- 레이어 구조: [캐릭터 몸] 안에 등급별 그룹(커먼·언커먼·레어·유니크) → 캐릭터마다 레이어 '이름 (id)'
              [무기] 안에 무기 종류별 그룹(검·도끼·망치·창·단검·지팡이·활·총·석궁) → 레이어 '이름 · 모양'
              [배경] 크림색 (숨김)
- 배치: 등급순으로 한 줄에 10명, 칸 72x48 — 칸 왼쪽에 몸, 오른쪽에 무기. 원래 도트 크기(아트 1px)라 확대해서 고치면 된다
실행: python3 docs/drafts/psd-export/export_psd.py → characters_weapons.psd · preview.png (4배 미리보기)
필요: pip install psd-tools
"""
import os, sys, json, types
from PIL import Image, ImageDraw
from psd_tools import PSDImage
from psd_tools.api.layers import PixelLayer, Group

HERE = os.path.dirname(os.path.abspath(__file__))
KV = os.path.join(HERE, '..', 'keycolor-v3')
sys.path.insert(0, KV)
import key_weapons as KW          # roster_art · weapons_v3 · keys 를 함께 불러온다
R, A, W3, KC, RC = KW.R, KW.A, KW.W3, KW.KC, KW.RC
W2 = sys.modules['weapons_v2']

GRADE = {1: '커먼', 2: '언커먼', 3: '레어', 4: '유니크'}
WNAME = {'sword': '검', 'axe': '도끼', 'hammer': '망치', 'spear': '창', 'dagger': '단검', 'staff': '지팡이', 'bow': '활', 'gun': '총', 'crossbow': '석궁'}
CELL_W, CELL_H, PER = 72, 48, 10
ORIG_KEY = {'kaira': 'red_sword', 'verona': 'red_mage', 'elin': 'green_archer', 'thorn': 'green_druid', 'adel': 'blue_knight', 'serena': 'blue_priest', 'nix': 'blue_rogue'}
ORIG_W = {'kaira': 'sword', 'verona': 'staff', 'elin': 'bow', 'thorn': 'staff_leaf', 'adel': 'spear', 'serena': 'staff_ice', 'nix': 'dagger'}


def named(layer, name):
    """한글 이름: 만들 때는 ASCII 로(예전 이름 칸은 macroman 이라 한글을 못 담는다), 그 뒤 유니코드 이름으로 바꾼다"""
    layer.name = name
    return layer


def recolor_body(img, c):
    Cm, Cs, gem = RC.old_colors(c)
    k = KC.KEYS[KW.KEY_OF[c['id']]]
    m = {RC.rgb(Cm): RC.rgb(k[0]), RC.rgb(Cs): RC.rgb(k[1]), RC.rgb(gem): RC.rgb(k[2])}
    im = img.copy()
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            q = px[x, y]
            if q[3] and q[:3] in m:
                px[x, y] = m[q[:3]] + (q[3],)
    return im


def body_of(c):
    if c['id'] in ORIG_KEY:      # anim.build_all 과 같은 인자 (원래 몸 그림에 그려진 무기 줄을 지운다)
        args = {'kaira': (('red_sword', (17, 24)), {'shield': True}),
                'verona': (('red_mage', (17, 24), 13), {'custom': {'file': 'edit/verona_body_v2.png', 'split': 19, 'eyes': [(9, 15), (13, 15)]}, 'free_x': 6}),
                'elin': (('green_archer', (0, 5)), {'mirror': False}), 'adel': (('blue_knight', (0, 5)), {}),
                'thorn': (('green_druid', (0, 5), 12), {}), 'serena': (('blue_priest', (19, 24)), {})}
        img = A.new_body('blue_rogue')['img'] if c['id'] == 'nix' else A.char(*args[c['id']][0], **args[c['id']][1])['img']
    else:
        img = KW.orig_body_fn(c)[0]
        if c['id'] == 'colin':
            img = KW.colin_objects(img)
    return recolor_body(img, c) if c['id'] in KW.KEY_OF else img


def weapon_of(c, wvar):
    """대기 자세 각도의 무기 그림 (쥐는 점이 그림 안 어디인지도)"""
    if c['id'] in KW.KEY_OF:
        A.geo_weapon = W3.geo
        wt = c['wtype']
        name = ORIG_W.get(c['id']) or (R.STAFF_BY_ATTR[RC.BY[c['id']]['attr']] if wt == 'staff' else wt)
        KW_set_ctx(c, wvar)
        v = wvar[c['id']]
    else:   # 유니크 = 지금 게임 무기 그대로
        rc = RC.BY[c['id']]
        if c['id'] in ORIG_W:
            A.geo_weapon = A.geo_weapon_orig
            name, v = ORIG_W[c['id']], ''
            A.GEO_LEN.clear(), A.GEO_LEN.update(KW.BASE_LEN)
        else:
            A.geo_weapon = W2.geo
            w = R.pick_weapon(rc)
            name = R.STAFF_BY_ATTR[rc['attr']] if w == 'staff' else w
            v = R.UNIQUE_WPN.get(c['id']) or W2.pick_variant(name, rc['look'], rc['grade'], c['id'])
            W2.CTX.update(grade=rc['grade'], attr=rc['attr'], var={name: v})
            A.GEO_LEN.clear(), A.GEO_LEN.update(KW.BASE_LEN)
            if (name, v) in W2.GEO_LEN_V:
                A.GEO_LEN[name] = W2.GEO_LEN_V[(name, v)]
    deg = A.IDLE_TILT.get(name, 45)
    im, pv = A.weapon_img(name, deg)
    im = im.copy()
    if name == 'bow':   # 시위
        pad = 2
        big = Image.new('RGBA', (im.width + pad * 2, im.height + pad * 2), (0, 0, 0, 0))
        big.alpha_composite(im, (pad, pad))
        top, bot = A.bow_tips(deg, pv[0] + pad, pv[1] + pad)
        ImageDraw.Draw(big).line([top, bot], fill=(238, 246, 255, 255))
        im, pv = big, (pv[0] + pad, pv[1] + pad)
    return im, name, v


def KW_set_ctx(c, wvar):
    STAFF = ('staff', 'staff_ice', 'staff_leaf')
    v = wvar[c['id']]
    W3.CTX.update(grade=c['grade'], key=KW.KEY_OF[c['id']], var={**{n: v for n in STAFF}, c['wtype']: v})
    A.GEO_LEN.clear(), A.GEO_LEN.update(KW.BASE_LEN)
    L = W3.GEO_LEN_V.get((c['wtype'], v))
    if L:
        for n in (STAFF if c['wtype'] == 'staff' else (c['wtype'],)):
            A.GEO_LEN[n] = L


def main():
    KW.orig_body_fn = R.body
    wjson = json.load(open(os.path.join(KV, 'weapons.json')))
    wvar = {k: v['wvar'] for k, v in wjson.items()}
    chars = []
    for g in RC.game:
        c = {**RC.BY[g['id']], **g}
        c['grade'] = RC.BY[g['id']]['grade']
        c['game_grade'] = g['grade']
        c['wtype'] = wjson[g['id']]['wtype'] if g['id'] in wjson else ('staff' if R.pick_weapon(c).startswith('staff') else R.pick_weapon(c))
        chars.append(c)
    chars.sort(key=lambda c: (c['game_grade'], c['id']))
    rows = (len(chars) + PER - 1) // PER
    W, H = PER * CELL_W, rows * CELL_H
    psd = PSDImage.new('RGBA', (W, H))
    bg = named(PixelLayer.frompil(Image.new('RGBA', (W, H), (246, 241, 228, 255)), psd, 'bg', 0, 0), '배경 (크림)')
    bg.visible = False
    body_root = named(Group.new(psd, 'body'), '캐릭터 몸')
    wpn_root = named(Group.new(psd, 'weapon'), '무기')
    gb = {g: named(Group.new(body_root, f'grade{g}'), GRADE[g]) for g in (1, 2, 3, 4)}
    gw = {}
    preview = Image.new('RGBA', (W, H), (246, 241, 228, 255))
    for i, c in enumerate(chars):
        x0, y0 = (i % PER) * CELL_W, (i // PER) * CELL_H
        body = body_of(c)
        bx, by = x0 + 4, y0 + (CELL_H - 24) // 2
        named(PixelLayer.frompil(body, gb[c['game_grade']], c['id'], by, bx), f"{c['name']} ({c['id']})")
        preview.alpha_composite(body, (bx, by))
        wim, name, v = weapon_of(c, wvar)
        bbox = wim.getbbox()
        if bbox:
            wim = wim.crop(bbox)
        wx = x0 + 30 + max(0, (CELL_W - 32 - wim.width) // 2)
        wy = y0 + max(0, (CELL_H - wim.height) // 2)
        wt = c['wtype']
        if wt not in gw:
            gw[wt] = named(Group.new(wpn_root, wt), WNAME.get(wt, wt))
        vn = W3.vname(wt, v) if c['id'] in KW.KEY_OF else (W3.vname(wt, v) if v else '기본')
        named(PixelLayer.frompil(wim, gw[wt], c['id'], wy, wx), f"{c['name']} · {vn}")
        preview.alpha_composite(wim, (wx, wy))
    out = os.path.join(HERE, 'characters_weapons.psd')
    psd.save(out)
    preview.resize((W * 4, H * 4), Image.NEAREST).save(os.path.join(HERE, 'preview.png'))
    chk = PSDImage.open(out)
    print('saved', out, chk.size, 'top groups', [l.name for l in chk], 'layers', sum(1 for _ in chk.descendants() if not _.is_group()))


if __name__ == '__main__':
    main()
