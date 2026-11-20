"""synergy.json + 초상화 → view.html (python3 assign.py 다음에 실행)"""
import json, os, base64, io
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
d = json.load(open(os.path.join(HERE, 'synergy.json')))
for c in d['chars']:
    sh = Image.open(os.path.join(HERE, '..', 'roster-art', 'sheets', f"{c['id']}.png"))
    f = sh.crop((13, 1, 43, 31))
    b = io.BytesIO(); f.save(b, 'PNG'); c['img'] = 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()
tpl = open(os.path.join(HERE, 'view.tpl.html'), encoding='utf8').read()
open(os.path.join(HERE, 'view.html'), 'w', encoding='utf8').write(tpl.replace('__DATA__', json.dumps(d, ensure_ascii=False)))
print('view.html')
