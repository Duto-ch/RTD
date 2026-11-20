"""rule6.json(규칙대로 6명) + axe_hammer.json + 지금(v3) 도끼·망치 실루엣 → view.html"""
import os, sys, json, io, base64
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'roster-v2-art'))
sys.path.insert(0, os.path.join(HERE, '..', 'char-13'))
import roster_v2 as R
import weapons_v3 as W3
A = R.A


def uri(img):
    b = io.BytesIO(); img.save(b, 'PNG')
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


cur = {}
for wt in ('axe', 'hammer'):
    cur[wt] = []
    for v in W3.VARIANTS[wt]:
        W3.CTX.update(grade=2, key='brown', var={wt: v})
        A.GEO_LEN.clear(); A.GEO_LEN.update(R.BASE_LEN)
        if (wt, v) in W3.GEO_LEN_V:
            A.GEO_LEN[wt] = W3.GEO_LEN_V[(wt, v)]
        col, _ = W3.geo(wt, 0)
        sil, _ = W3.geo(wt, 0, silhouette=(40, 32, 44, 255))
        cur[wt].append({'name': W3.vname(wt, v), 'sil': uri(sil), 'steel': uri(col)})
r6 = json.load(open(os.path.join(HERE, 'rule6.json')))
d = {'W': r6['W'], 'H': r6['H'], 'chars': r6['chars'], 'new': json.load(open(os.path.join(HERE, 'axe_hammer.json'))), 'cur': cur}
tpl = open(os.path.join(HERE, 'view.tpl.html'), encoding='utf8').read()
open(os.path.join(HERE, 'view.html'), 'w', encoding='utf8').write(tpl.replace('__DATA__', json.dumps(d, ensure_ascii=False)))
print('view.html')
