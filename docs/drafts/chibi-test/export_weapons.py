"""무기 그림 전부 PNG 로 내보내기 → 압축 파일 (2026-11-20)
- v3 무기 66종 × 재질 3(커먼·레어·유니크) × 대기 각도, 원본 크기(아트 1px) + 4배 미리보기
- 도끼·망치 실루엣 시안 16종 (실루엣·강철·금)
실행: python3 docs/drafts/chibi-test/export_weapons.py <출력 폴더>
"""
import os, sys, json, io, base64, zipfile
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'roster-v2-art'))
sys.path.insert(0, os.path.join(HERE, '..', 'char-13'))
import roster_v2 as R
import weapons_v3 as W3
A = R.A

out = sys.argv[1]
zpath = os.path.join(out, 'rtd-weapons.zip')
GRADES = ((1, 'brown', 'common'), (3, 'violet', 'rare'), (4, 'amber', 'unique'))
DEG = {'bow': -30, 'staff': 25}
n = 0
with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
    def add(name, img):
        b = io.BytesIO(); img.save(b, 'PNG'); z.writestr(name, b.getvalue())
    for wt, vs in W3.VARIANTS.items():
        sheet_imgs = []
        for v in vs:
            vv = '' if (wt == 'staff' and v == 'orb') else v
            row = []
            for g, key, gname in GRADES:
                W3.CTX.update(grade=g, key=key, var={wt: vv})
                A.GEO_LEN.clear(); A.GEO_LEN.update(R.BASE_LEN)
                if (wt, vv) in W3.GEO_LEN_V:
                    A.GEO_LEN[wt] = W3.GEO_LEN_V[(wt, vv)]
                img, _ = W3.geo(wt, DEG.get(wt, 45))
                add(f"v3/{wt}/{wt}_{v or 'basic'}_{gname}.png", img)
                n += 1
                row.append(img)
            sheet_imgs.append(row)
        # 종류별 한 장 미리보기 (4배): 줄 = 모양, 칸 = 커먼·레어·유니크
        cw = max(i.width for r in sheet_imgs for i in r) + 4
        ch = max(i.height for r in sheet_imgs for i in r) + 4
        sh = Image.new('RGBA', (cw * 3, ch * len(sheet_imgs)), (109, 143, 78, 255))
        for y, r in enumerate(sheet_imgs):
            for x, im in enumerate(r):
                sh.alpha_composite(im, (x * cw + 2, y * ch + 2))
        add(f"v3/_preview_{wt}_x4.png", sh.resize((sh.width * 4, sh.height * 4), Image.NEAREST))
    # 지금 게임에 들어간 무기 (v2: 속성색 × 등급 재질) — roster-art 가 캐릭터마다 쓰는 모양
    sys.path.insert(0, os.path.join(HERE, '..', 'roster-art'))
    import weapons_v2 as WV2
    import anim as AN
    ORIG = AN.geo_weapon_orig if hasattr(AN, 'geo_weapon_orig') else AN.geo_weapon
    used = json.load(open(os.path.join(HERE, '..', 'roster-art', 'roster-art.json')))['chars']
    combos = sorted({(c['weapon'], c.get('variant', '')) for c in used})
    AN.geo_weapon_orig = ORIG
    for wt, v in combos:
        for g, gname in ((1, 'common'), (2, 'uncommon'), (3, 'rare'), (4, 'unique')):
            for attr in ('red', 'blue', 'green'):
                WV2.CTX.update(grade=g, attr=attr, var={wt: v})
                A.GEO_LEN.clear(); A.GEO_LEN.update(R.BASE_LEN)
                if (wt, v) in WV2.GEO_LEN_V:
                    A.GEO_LEN[wt] = WV2.GEO_LEN_V[(wt, v)]
                deg = {'bow': -30, 'staff': 25, 'staff_ice': 25, 'staff_leaf': 25}.get(wt, 45)
                try:
                    img, _ = WV2.geo(wt, deg)
                except Exception:
                    continue
                add(f"game-current/{wt}/{wt}_{v or 'basic'}_{gname}_{attr}.png", img)
                n += 1
    # 도끼·망치 실루엣 시안
    ah = json.load(open(os.path.join(HERE, 'axe_hammer.json')))
    for kind, lst in ah.items():
        for i, it in enumerate(lst):
            for f in ('sil', 'steel', 'gold'):
                im = Image.open(io.BytesIO(base64.b64decode(it[f].split(',')[1])))
                add(f"axe-hammer-draft/{kind}/{i + 1:02d}_{it['name']}_{f}.png", im)
                n += 1
    z.writestr('README.txt', '용병단 디펜스 무기 그림 (2026-11-20)\n'
               'game-current/<종류>/<종류>_<모양>_<등급>_<속성>.png : 지금 게임(104명)에 들어간 무기 — 등급 재질 4 × 속성색 3, 아트 1px 원본, 대기 각도\n'
               'v3/<종류>/<종류>_<모양>_<등급>.png : 아트 1px 원본, 대기 각도(활 -30°, 지팡이 25°, 나머지 45°). 등급 = common(쇠·나무) / rare(은·보석) / unique(금·빛)\n'
               'v3/_preview_<종류>_x4.png : 종류별 한눈에 (4배, 줄 = 모양, 칸 = 커먼·레어·유니크)\n'
               'axe-hammer-draft/ : 도끼·망치 실루엣 시안 (세로로 세운 그림) — sil = 검은 실루엣, steel = 강철, gold = 금\n')
print(zpath, n, 'images')
