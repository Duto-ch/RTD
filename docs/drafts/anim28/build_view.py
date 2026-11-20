"""anim28.json → view.html (열람용: 지금 공격 vs 28프레임, 공속 슬라이더)"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
d = json.load(open(os.path.join(HERE, 'anim28.json')))
tpl = open(os.path.join(HERE, 'view.tpl.html'), encoding='utf8').read()
open(os.path.join(HERE, 'view.html'), 'w', encoding='utf8').write(tpl.replace('__DATA__', json.dumps(d, ensure_ascii=False)))
print('view.html')
