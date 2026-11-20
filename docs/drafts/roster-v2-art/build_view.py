"""v2.json + 무기 도감 그림 → view.html"""
import os, sys, json, io, base64
from collections import defaultdict
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'char-13'))
import roster_v2 as R   # A.geo_weapon 을 v3 로 바꿔 끼움
import weapons_v3 as W3
A = R.A

d = json.load(open(os.path.join(HERE, 'v2.json')))
users = defaultdict(list)
for c in d['chars']:
    if not c['original']:
        users[(c['wtype'], c['wvar'])].append(c['name'])


def uri(img):
    b = io.BytesIO(); img.save(b, 'PNG')
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


TYPE_NAMES = {'sword': '검', 'axe': '도끼', 'hammer': '망치', 'spear': '창', 'dagger': '단검', 'staff': '지팡이', 'bow': '활', 'gun': '총', 'crossbow': '석궁'}
cat = []
for wt, vs in W3.VARIANTS.items():
    items = []
    for v in vs:
        vv = '' if (wt == 'staff' and v == 'orb') else v
        row = []
        for grade, key in ((1, 'brown'), (3, 'violet'), (4, 'amber')):   # 커먼 쇠·나무 / 레어 은·보석 / 유니크 빛
            W3.CTX.update(grade=grade, key=key, var={wt: vv})
            A.GEO_LEN.clear(); A.GEO_LEN.update(R.BASE_LEN)
            if (wt, vv) in W3.GEO_LEN_V:
                A.GEO_LEN[wt] = W3.GEO_LEN_V[(wt, vv)]
            deg = {'bow': 0, 'staff': 0}.get(wt, 45)
            img, _ = W3.geo(wt, deg)
            row.append(uri(img))
        items.append({'v': v, 'name': W3.vname(wt, v), 'imgs': row, 'users': users.get((wt, vv), [])})
    cat.append({'type': wt, 'name': TYPE_NAMES[wt], 'items': items})
d['catalog'] = cat
tpl = open(os.path.join(HERE, 'view.tpl.html'), encoding='utf8').read()
open(os.path.join(HERE, 'view.html'), 'w', encoding='utf8').write(tpl.replace('__DATA__', json.dumps(d, ensure_ascii=False)))
print('view.html', sum(len(c['items']) for c in cat), 'weapon designs')
