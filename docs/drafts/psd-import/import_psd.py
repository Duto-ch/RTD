"""사용자가 고친 PSD(edited.psd) → 게임에 끼울 몸·무기 그림 (2026-11-24)
처음 내보낸 PSD(docs/drafts/psd-export/characters_weapons.psd)와 레이어마다 픽셀을 비교해 실제로 바뀐 것만 뽑는다.
- 몸: 처음 PSD 의 그 캐릭터 몸 칸(24x24) 안만 잘라 쓴다 — 칸 밖에 떨어진 점(테아·프레이디스)은 버린다.
      몸 그룹에 새로 생긴 레이어(예: '레이어 1' = 윌리엄 화살통)는 그 레이어가 놓인 몸 칸의 캐릭터 몸에 합친다.
      반투명 픽셀은 알파 128 기준으로 불투명/투명. 눈(세로 1x2 — 진한 윗칸 + 아랫칸)·머리/몸 나누는 줄(턱 아래)·피부색을 그림에서 찾는다
- 무기: 처음 PSD 의 무기 레이어 자리와 그때 쥐는 점으로, 고친 그림의 쥐는 점을 거꾸로 계산한다. 활 시위(밝은 선)는 지운다(게임이 따로 그린다)
- 무기 종류 바꿈: 레이어 이름의 무기 모양 이름이 바뀐 것(퍼거스 '작살' → '장총') → 총
실행: python3 docs/drafts/psd-import/import_psd.py → data/bodies·weapons/<id>.png + data/overrides.json · preview.png
필요: pip install psd-tools
"""
import os, sys, json
from collections import Counter
from psd_tools import PSDImage
from PIL import Image, ImageChops, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OLD = os.path.join(HERE, '..', 'psd-export', 'characters_weapons.psd')
NEW = os.path.join(HERE, 'edited.psd')
DATA = os.path.join(HERE, 'data')
sys.path.insert(0, os.path.join(HERE, '..', 'psd-export'))
import export_psd as EX
A = EX.A
WTYPE_BY_NAME = {'장총': 'gun', '총': 'gun', '단총': 'gun', '손대포': 'gun'}
BOW_STRING = (238, 246, 255)
# 레이어 이름은 그대로인데 그림이 다른 무기 종류로 바뀐 것 (눈으로 확인, 2026-11-24): 리처드 석궁 → 검
WTYPE_DRAWN = {'richard': 'sword'}


def layers(path):
    psd = PSDImage.open(path)
    out = {}

    def walk(g, trail):
        for l in g:
            if l.is_group():
                walk(l, trail + [l.name])
            else:
                out[(tuple(trail), l.name)] = l
    walk(psd, [])
    return psd, out


def placed(l, size):
    c = Image.new('RGBA', size, (0, 0, 0, 0))
    im = l.topil()
    if im is not None:
        c.alpha_composite(im.convert('RGBA'), (l.left, l.top))
    return c


def solid(im):
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            p = px[x, y]
            px[x, y] = p[:3] + (255,) if p[3] >= 128 else (0, 0, 0, 0)
    return im


def analyse_body(im):
    """눈·머리 줄·피부색 찾기"""
    px = im.load()
    face = Counter(px[x, y][:3] for y in range(15, 18) for x in range(9, 15) if px[x, y][3] and sum(px[x, y][:3]) > 300)
    skin = face.most_common(1)[0][0] if face else None
    is_skin = lambda p: skin and p[3] and abs(p[0] - skin[0]) + abs(p[1] - skin[1]) + abs(p[2] - skin[2]) < 40
    dark = lambda p: p[3] and sum(p[:3]) < 200
    eye = lambda x, y: dark(px[x, y]) and px[x, y + 1][3] and not dark(px[x, y + 1])
    eyes = []
    if eye(9, 15) and eye(13, 15):          # 기본 자리 (원래 그림 규칙)
        eyes = [(9, 15), (13, 15)]
    else:                                   # 옮겼으면: 같은 줄 3~6칸 떨어진 눈 한 쌍, 적어도 한쪽 옆이 피부
        cand = [(x, y) for y in range(12, 19) for x in range(6, 18)
                if eye(x, y) and (is_skin(px[x - 1, y]) or is_skin(px[x + 1, y]))]
        for p in cand:
            for q in cand:
                if p[1] == q[1] and 3 <= q[0] - p[0] <= 6 and not eyes:
                    eyes = [p, q]
    return eyes, None, ('#%02x%02x%02x' % skin) if skin else None


def main():
    po, old = layers(OLD)
    pn, new = layers(NEW)
    chars, wvar = EX.build_chars(os.path.join(HERE, 'export_weapons.json'))   # PSD 를 내보낼 때의 무기 배정 (쥐는 점 계산이 그때와 같아야 한다)
    by_name = {c['name']: c for c in chars}
    by_id = {c['id']: c for c in chars}
    os.makedirs(os.path.join(DATA, 'bodies'), exist_ok=True)
    os.makedirs(os.path.join(DATA, 'weapons'), exist_ok=True)
    meta = {'bodies': {}, 'weapons': {}, 'wtype': {}}
    # ── 몸 ──
    body_box = {}
    for k, l in old.items():
        if k[0] and k[0][0] == '캐릭터 몸':
            cid = l.name.split('(')[-1].rstrip(')')
            body_box[cid] = (l.left, l.top, l.left + 24, l.top + 24)
    extra = {}
    for k, l in new.items():
        if k[0] and k[0][0] == '캐릭터 몸' and k not in old:      # 새 레이어 → 놓인 몸 칸의 캐릭터
            cx, cy = (l.bbox[0] + l.bbox[2]) / 2, (l.bbox[1] + l.bbox[3]) / 2
            for cid, b in body_box.items():
                if b[0] - 24 <= cx < b[2] + 24 and b[1] - 12 <= cy < b[3] + 12:
                    extra.setdefault(cid, []).append(l)
                    print('extra layer', l.name, '->', cid)
    for k, l in new.items():
        if not (k[0] and k[0][0] == '캐릭터 몸') or k not in old:
            continue
        cid = l.name.split('(')[-1].rstrip(')')
        a, b = placed(old[k], po.size), placed(l, pn.size)
        for e in extra.get(cid, []):
            b.alpha_composite(placed(e, pn.size))
        box = body_box[cid]
        if not ImageChops.difference(a.crop(box), b.crop(box)).getbbox():
            continue
        body = solid(b.crop(box))
        eyes, split, skin = analyse_body(body)
        body.save(os.path.join(DATA, 'bodies', f'{cid}.png'))
        meta['bodies'][cid] = {'eyes': eyes, 'split': split, 'skin': skin}
    # ── 무기 ──
    old_w = {l.name.split(' · ')[0]: l for k, l in old.items() if k[0] and k[0][0] == '무기'}
    for k, l in new.items():
        if not (k[0] and k[0][0] == '무기'):
            continue
        nm = l.name.split(' · ')[0]
        c, ol = by_name[nm], old_w[nm]
        a, b = placed(ol, po.size), placed(l, pn.size)
        if not ImageChops.difference(a, b).getbbox():
            continue
        cid = c['id']
        wim, name, v, pv = EX.weapon_of(c, wvar)       # 처음 내보낼 때와 같은 계산 → 그때 쥐는 점
        bb = wim.getbbox()
        piv = (ol.left - bb[0] + pv[0], ol.top - bb[1] + pv[1])    # 캔버스 좌표
        nb = b.getbbox()
        img = solid(b.crop((nb[0] - 1, nb[1] - 1, nb[2] + 1, nb[3] + 1)))
        if name == 'bow':
            px = img.load()
            for y in range(img.height):
                for x in range(img.width):
                    if px[x, y][3] and px[x, y][:3] == BOW_STRING:
                        px[x, y] = (0, 0, 0, 0)
        img.save(os.path.join(DATA, 'weapons', f'{cid}.png'))
        meta['weapons'][cid] = {'pivot': [piv[0] - (nb[0] - 1), piv[1] - (nb[1] - 1)], 'deg': A.IDLE_TILT.get(name, 45), 'name': name}
        shape = l.name.split(' · ')[-1]
        if shape in WTYPE_BY_NAME and shape != ol.name.split(' · ')[-1]:      # 모양 이름이 바뀐 것
            meta['wtype'][cid] = WTYPE_BY_NAME[shape]
        if cid in WTYPE_DRAWN:
            meta['wtype'][cid] = WTYPE_DRAWN[cid]
    json.dump(meta, open(os.path.join(DATA, 'overrides.json'), 'w'), ensure_ascii=False, indent=1)
    print('bodies', len(meta['bodies']), 'weapons', len(meta['weapons']), 'wtype', meta['wtype'])
    print('no eyes found:', [c for c, m in meta['bodies'].items() if not m['eyes']])
    print('split:', Counter(m['split'] for m in meta['bodies'].values()))


if __name__ == '__main__':
    main()
