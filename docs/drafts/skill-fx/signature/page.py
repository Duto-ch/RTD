import json, base64, os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
idx = json.load(open(os.path.join(HERE, 'index.json')))
def uri(p): return 'data:image/png;base64,' + base64.b64encode(open(p, 'rb').read()).decode()
for e in idx:
    e['src'] = uri(os.path.join(HERE, 'sheets', e['key'] + '.png'))
    if e.get('back'): e['backSrc'] = uri(os.path.join(HERE, 'sheets', e['key'] + '_back.png'))
roster = json.loads(subprocess.check_output(['node', '-e', "import('/home/user/rtd/src/data/roster.js').then(m=>console.log(JSON.stringify(m.ROSTER.filter(c=>c.grade>=3).map(c=>({id:c.id,lv:m.skillLevels(c),title:c.title})))))"]))
chars = {}
for r in roster: chars[r['id']] = {'char': uri(os.path.join(HERE, '../../../../public/assets/custom/chars/' + r['id'] + '.png')), 'lv': r['lv'], 'title': r['title']}
html = open(os.path.join(HERE, 'page_tpl.html')).read().replace('__DATA__', json.dumps({'fx': idx, 'chars': chars}, ensure_ascii=False))
open('/tmp/claude-0/-home-user-rtd/5413c952-d8c2-5a72-ae63-36cb90a211c9/scratchpad/sigfx.html', 'w').write(html); print(len(html))
