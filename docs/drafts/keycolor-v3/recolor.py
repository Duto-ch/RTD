"""키 컬러 다양화 시안 v3 (2026-11-22) — 지금 게임 캐릭터 그림(기존 비율) 그대로, 유니크를 뺀 58명의 옷 색만 다시 칠한다
- 대상: 게임 로스터(src/data/roster.js) 중 유니크(등급 4)를 뺀 커먼·언커먼·레어. 유니크 12명은 그대로
- 색: 키 컬러 16색(docs/drafts/roster-v2-art/keys.py) — 생김새(look)에 어울리는 색 + 같은 무기·출신·계열끼리 겹치지 않게, 한 색 최대 5명.
  예전 속성(레드·블루·그린) 쪽 가산점은 뺐다 (다양하게)
- 다시 칠하는 것: 게임 시트(대기·공격 전 프레임)에서 그 캐릭터의 옷 주색·그늘색 → 키 컬러 주색·그늘색, 가슴 보석(레어) → 키 컬러 보석색.
  옷 색을 쓰는 모자·두건·방패도 같이 바뀐다. 머리카락·피부·무기·외곽선은 그대로
실행: python3 docs/drafts/keycolor-v3/recolor.py → sheets/<id>.png (다시 칠한 게임 시트) · keys.json · compare.png (지금 ↔ 시안, 대기 첫 프레임)
"""
import os, sys, json, subprocess
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(HERE, '..', 'roster-art'))
sys.path.insert(0, os.path.join(HERE, '..', 'roster-v2-art'))
import roster_art as R
import keys as KC
D, A = R.D, R.A

game = json.loads(subprocess.check_output(['node', '-e', "import('./src/data/roster.js').then(m=>console.log(JSON.stringify((m.ROSTER||m.default).map(c=>({id:c.id,name:c.name,grade:c.grade,attr:c.attr,cls:c.cls,origin:c.origin})))))"], cwd=ROOT))
BY = {c['id']: c for c in R.ROSTER}
# 시안 출신 캐릭터의 옷 색 (char-13 그림)
ORIG = {'kaira': 'red_sword', 'verona': 'red_mage', 'elin': 'green_archer', 'thorn': 'green_druid', 'adel': 'blue_knight', 'serena': 'blue_priest'}
ORIG_PAL = {c['id']: c['pal'] for c in D.CHARS}
ORIG_PAL['blue_rogue'] = A.NEW_BODIES['blue_rogue']['pal']
ORIG['nix'] = 'blue_rogue'
GEM = {'red': '#ff4a5a', 'blue': '#4ab0ff', 'green': '#5ae07a'}


def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def old_colors(c):
    """그 캐릭터 그림에 쓰인 옷 주색·그늘색·보석색 (지금 게임 그림을 만든 규칙 그대로)"""
    if c['id'] in ORIG:
        p = ORIG_PAL[ORIG[c['id']]]
        return p['C'], p['c'], GEM[BY[c['id']]['attr']]
    Cm, Cs = R.OUTFIT[BY[c['id']]['attr']][R.h(c['id'] + 'o', 4)]
    return Cm, Cs, GEM[BY[c['id']]['attr']]


if __name__ == '__main__':
    targets = []
    for g in game:
        if g['grade'] == 4:
            continue
        c = {**BY[g['id']], **g}
        c['wtype'] = R.pick_weapon(c)
        c['attr'] = ''          # 예전 속성 색 가산점 없이 (다양하게)
        targets.append(c)
    key_of = KC.assign_keys(targets)
    json.dump(key_of, open(os.path.join(HERE, 'keys.json'), 'w'), ensure_ascii=False, indent=0)
    os.makedirs(os.path.join(HERE, 'sheets'), exist_ok=True)
    src_dir = os.path.join(ROOT, 'public', 'assets', 'custom', 'chars')
    rows = []
    for c in targets:
        Cm, Cs, gem = old_colors(c)
        k = KC.KEYS[key_of[c['id']]]
        m = {rgb(Cm): rgb(k[0]), rgb(Cs): rgb(k[1]), rgb(gem): rgb(k[2])}
        sh = Image.open(os.path.join(src_dir, f"{c['id']}.png")).convert('RGBA')
        px = sh.load()
        hit = 0
        for y in range(sh.height):
            for x in range(sh.width):
                p = px[x, y]
                if p[3] and p[:3] in m:
                    px[x, y] = m[p[:3]] + (p[3],)
                    hit += 1
        sh.save(os.path.join(HERE, 'sheets', f"{c['id']}.png"))
        rows.append((c, key_of[c['id']], hit))
    # 비교: 등급별 줄, 캐릭터마다 위 = 지금 · 아래 = 시안 (대기 첫 프레임, 4배)
    font = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 14)
    fontb = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 20)
    z, cw, ch = 4, 30 * 4 + 6, 30 * 4
    per = 14
    GN = {1: '커먼', 2: '언커먼', 3: '레어'}
    groups = [(gr, sorted([r for r in rows if r[0]['grade'] == gr], key=lambda r: (r[1], r[0]['id']))) for gr in (1, 2, 3)]
    H = sum(34 + ((len(l) + per - 1) // per) * (ch * 2 + 26) for _, l in groups) + 10
    out = Image.new('RGB', (per * cw + 12, H), (246, 241, 228))
    d = ImageDraw.Draw(out)
    y = 6
    for gr, lst in groups:
        d.text((8, y), f"{GN[gr]} {len(lst)}명  (위: 지금 · 아래: 키 컬러 시안)", fill=(80, 60, 40), font=fontb)
        y += 34
        for i, (c, key, _) in enumerate(lst):
            x0, y0 = 6 + (i % per) * cw, y + (i // per) * (ch * 2 + 26)
            for j, path in enumerate((os.path.join(src_dir, f"{c['id']}.png"), os.path.join(HERE, 'sheets', f"{c['id']}.png"))):
                f = Image.open(path).convert('RGBA').crop((A.OX - 3, A.OY - 5, A.OX - 3 + 30, A.OY - 5 + 30)).resize((30 * z, 30 * z), Image.NEAREST)
                out.paste(f, (x0, y0 + j * ch), f)
            t = f"{c['name']}·{KC.KEY_NAMES[key]}"
            d.rectangle([x0 + 2, y0 + 2 * ch + 6, x0 + 11, y0 + 2 * ch + 15], fill=KC.KEYS[key][0], outline=(43, 29, 47))
            d.text((x0 + 14, y0 + 2 * ch + 2), t, fill=(60, 40, 30), font=font)
        y += ((len(lst) + per - 1) // per) * (ch * 2 + 26)
    out.save(os.path.join(HERE, 'compare.png'))
    from collections import Counter
    print(len(rows), 'chars', dict(Counter(KC.KEY_NAMES[k] for k in key_of.values())), 'no-hit', [c['id'] for c, _, n in rows if n == 0])
