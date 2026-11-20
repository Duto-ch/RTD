import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
d = json.load(open(os.path.join(HERE, 'compare.json')))
tpl = open(os.path.join(HERE, 'view.tpl.html'), encoding='utf8').read()
open(os.path.join(HERE, 'view.html'), 'w', encoding='utf8').write(tpl.replace('__DATA__', json.dumps(d, ensure_ascii=False)))
print('view.html')
