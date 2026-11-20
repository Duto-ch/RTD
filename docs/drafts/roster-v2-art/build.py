"""70명 그림 v2 (2026-11-20): 키 컬러 16색 + 생김새·무기 나누기 → sheets/<id>.png, v2.json(열람용)
실행: python3 docs/drafts/roster-v2-art/build.py && python3 docs/drafts/roster-v2-art/build_view.py
등급은 재배분된 새 등급(docs/drafts/synergy/synergy.json). 시안 출신 8명은 사용자 그림이라 그대로 둔다.
"""
import os, sys, json, io, base64
from collections import Counter
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'char-13'))
import roster_v2 as R
import keys as KC
import weapons_v3 as W3
A = R.A

syn = json.load(open(os.path.join(HERE, '..', 'synergy', 'synergy.json')))
BY = {c['id']: c for c in R.ROSTER}
chars = []
for s in syn['chars']:
    c = dict(BY[s['id']])
    c.update(grade=s['grade'], origin=s['origin'], cls=s['cls'], old=s['old'])
    w = R.pick_weapon(c)
    c['wtype'] = 'staff' if w.startswith('staff') else w
    c['female'] = c['id'] in R.FEMALE_IDS or R.has(c['look'], *R.FEMALE)
    G = R.Grid(); before = [r[:] for r in G.g]
    R.headgear(G, c, {'C': '#000000', 'c': '#000000', 'H': '#000000', 'h': '#000000'}, c['female'])
    c['gear'] = before != G.g
    chars.append(c)
draw = [c for c in chars if not c.get('original')]

# 1) 키 컬러
key_of = KC.assign_keys(chars)
for c in chars:
    c['key'] = key_of[c['id']]

# 2) 무기 모양: look 이 정해 주면 그것(같은 모양 2명까지), 아니면 같은 무기끼리 겹치지 않게
cnt = Counter()
def wforce(c):
    v = W3.preferred_variant(c['wtype'], c['look'])
    if v is not None and cnt[(c['wtype'], v)] < 2:
        cnt[(c['wtype'], v)] += 1
        return v
    return None
wv = {}
for wt in W3.VARIANTS:
    group = [c for c in draw if c['wtype'] == wt]
    got = KC.spread(group, W3.VARIANTS[wt], 'w', lambda x: x['wtype'], forced=wforce)
    wv.update(got)
for c in draw:
    c['wvar'] = wv[c['id']]
    if c['wtype'] == 'staff' and c['wvar'] == 'orb':
        c['wvar'] = ''

# 3) 머리 모양 (모자·투구·두건이 있으면 위로 솟는 머리는 빼고)
def styles(c):
    if c['female']:
        return ['long', 'pony', 'twin', 'bob'] + ([] if c['gear'] else ['bun'])
    return ['short', 'swept'] + ([] if c['gear'] else ['spiky', 'mohawk', 'topknot'])
FORCE_LONG = ('long white', 'long silver', 'flowing', 'seaweed hair')
hs = KC.spread(draw, None, 'hs', lambda x: x['wtype'], forced=lambda c: 'long' if R.has(c['look'], *FORCE_LONG) else None, allowed=styles)
# 4) 머리 색: 설명에 머리 색이 있으면 그대로, 아니면 같은 키 컬러끼리 겹치지 않게
HAIR_WORDS = ('red-haired', 'golden-red', 'red-bearded', 'silver', 'white hair', 'long white', 'white fur', 'white wolf', 'golden', 'sun crown', 'grey', 'old ', 'elder', 'blonde', 'pale')
hc = KC.spread(draw, ['brown', 'black', 'blonde', 'auburn', 'ginger', 'silver', 'blue', 'green', 'red', 'white', 'grey'], 'hc', lambda x: x['key'],
               forced=lambda c: '' if R.has(c['look'], *HAIR_WORDS) else None)
# 5) 작은 장식 (머리 장식이 없는 캐릭터만 그려짐)
def accs(c):
    base = ['none', 'circlet', 'feather', 'horns', 'ears', 'band', 'freckles']
    return base + (['flower'] if c['female'] else ['eyepatch', 'scar'])
ac = KC.spread(draw, None, 'ac', lambda x: x['wtype'], allowed=accs)
for c in draw:
    c['hstyle'], c['hcolor'], c['acc'] = hs[c['id']], hc[c['id']] or None, ac[c['id']]

os.makedirs(os.path.join(HERE, 'sheets'), exist_ok=True)


def uri(img):
    b = io.BytesIO(); img.save(b, 'PNG')
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


meta_old = {x['id']: x for x in json.load(open(os.path.join(HERE, '..', 'roster-art', 'roster-art.json')))['chars']}
out = []
for c in chars:
    old = Image.open(os.path.join(HERE, '..', 'roster-art', 'sheets', f"{c['id']}.png"))
    if c.get('original'):
        new, idle_ms, atk_ms = old, meta_old[c['id']]['idle']['ms'], meta_old[c['id']]['attack']['ms']
    else:
        r = R.animate(c)
        new = R.sheet(r['idle'] + r['attack'])
        new.save(os.path.join(HERE, 'sheets', f"{c['id']}.png"))
        idle_ms, atk_ms = [m for _, m in r['idle']], [m for _, m in r['attack']]
    out.append({'id': c['id'], 'name': c['name'], 'grade': c['grade'], 'origin': c['origin'], 'cls': c['cls'], 'original': bool(c.get('original')),
                'key': c['key'], 'keyName': KC.KEY_NAMES[c['key']], 'keyColor': KC.KEYS[c['key']][0], 'oldAttr': c['attr'],
                'wtype': c['wtype'], 'wvar': c.get('wvar', ''), 'wname': W3.vname(c['wtype'], c.get('wvar', '')),
                'oldW': f"{meta_old[c['id']]['weapon']}/{meta_old[c['id']]['variant']}",
                'hstyle': c.get('hstyle'), 'acc': c.get('acc'), 'idle': idle_ms, 'attack': atk_ms,
                'oldSrc': uri(old), 'src': uri(new)})


# 얼핏 비슷한 쌍: 대기 첫 프레임끼리 색 차이가 작은 쌍 수 (전·후 비교)
def frame0(src):
    im = Image.open(io.BytesIO(base64.b64decode(src.split(',')[1]))).convert('RGBA').crop((10, 0, 46, 34))
    return im.resize((18, 17), Image.BILINEAR)
def dist(a, b):
    pa, pb = list(a.getdata()), list(b.getdata())
    return sum(abs(x[0] - y[0]) + abs(x[1] - y[1]) + abs(x[2] - y[2]) + abs(x[3] - y[3]) for x, y in zip(pa, pb)) / len(pa)
def similar(field):
    fr = [frame0(o[field]) for o in out]
    ds = [(dist(fr[i], fr[j]), i, j) for i in range(len(fr)) for j in range(i + 1, len(fr))]
    return ds
before, after = similar('oldSrc'), similar('src')
TH = sorted(d for d, _, _ in before)[len(before) // 40]   # 예전 그림 기준 가장 비슷한 2.5% 쌍의 문턱
pairs_b = sorted([(d, i, j) for d, i, j in before if d <= TH])
pairs_a = sorted([(d, i, j) for d, i, j in after if d <= TH])
stats = {
    'similarBefore': len(pairs_b), 'similarAfter': len(pairs_a),
    'topBefore': [[out[i]['name'], out[j]['name']] for _, i, j in pairs_b[:12]],
    'topAfter': [[out[i]['name'], out[j]['name']] for _, i, j in pairs_a[:12]],
    'keys': Counter(o['key'] for o in out), 'weaponsBefore': len({o['oldW'] for o in out}),
    'weaponsAfter': len({(o['wtype'], o['wvar']) for o in out if not o['original']}) + len({o['oldW'] for o in out if o['original']}),
}
json.dump({'W': A.W, 'H': A.H, 'chars': out, 'stats': stats,
           'keys': {k: {'name': KC.KEY_NAMES[k], 'color': v[0], 'shade': v[1]} for k, v in KC.KEYS.items()}},
          open(os.path.join(HERE, 'v2.json'), 'w'), ensure_ascii=False)
print('drawn', len(draw), '| similar pairs', stats['similarBefore'], '->', stats['similarAfter'], '| weapon designs', stats['weaponsBefore'], '->', stats['weaponsAfter'])
print('keys', dict(stats['keys']))
print('top after', stats['topAfter'][:6])
