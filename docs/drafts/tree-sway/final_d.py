"""게임 적용 배치 (2026-11-21 사용자 결정): D 배치 + 무작위 4그루(layouts_plus.json) + 양옆 무작위 3그루, 색 3가지(기본·청록·연두) 모두 사용
색은 가까운 나무끼리 같은 색이 덜 겹치게 고른다(가까운 순으로 이미 정한 색을 피함). 박자(phase)도 무작위.
실행: python3 docs/drafts/tree-sway/final_d.py → src/data/decor.js 의 grass 배열을 다시 쓴다
"""
import json, os, random, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
rnd = random.Random('trees-final-D')
trees = [dict(d) for d in json.load(open(os.path.join(HERE, 'layouts_plus.json')))['D']]
SIDES = [((4, 20), (290, 690)), ((524, 540), (290, 690))]
added = 0
while added < 3:
    (x0, x1), (y0, y1) = rnd.choice(SIDES)
    x, y = rnd.randint(x0, x1), rnd.randint(y0, y1)
    if any(((x - d['x']) ** 2 + ((y - d['y']) * 1.6) ** 2) ** 0.5 < 70 for d in trees):
        continue
    trees.append({'x': x, 'y': y, 'flip': rnd.random() < 0.5, 'side': True})
    added += 1
COLORS = ['deco_tree', 'deco_tree_teal', 'deco_tree_spring']
order = list(range(len(trees)))
rnd.shuffle(order)
count = {c: 0 for c in COLORS}
for i in order:
    d = trees[i]
    near = sorted((((d['x'] - o['x']) ** 2 + (d['y'] - o['y']) ** 2), o.get('key')) for o in trees if o is not d and o.get('key'))[:2]
    used = {k for _, k in near}
    d['key'] = min(COLORS, key=lambda c: (c in used, count[c], rnd.random()))
    count[d['key']] += 1
    d['phase'] = round(rnd.random(), 2)
# 오른쪽 위가 비어 보여서 손으로 2그루 더 (2026-11-21 사용자 요청) — 앞 나무들의 색·박자는 그대로 두고, 가까운 나무 색을 피해 고른다
for d in [{'x': 438, 'y': 241, 'flip': False}, {'x': 486, 'y': 254, 'flip': True}]:
    near = sorted(((d['x'] - o['x']) ** 2 + (d['y'] - o['y']) ** 2, o['key']) for o in trees)[:2]
    used = {k for _, k in near}
    d['key'] = min(COLORS, key=lambda c: (c in used, count[c], rnd.random()))
    count[d['key']] += 1
    d['phase'] = round(rnd.random(), 2)
    trees.append(d)
trees.sort(key=lambda d: (d['y'], d['x']))
lines = ',\n'.join(f"    {{ key: '{d['key']}', x: {d['x']}, y: {d['y']}, phase: {d['phase']}{', flip: true' if d.get('flip') else ''} }}" for d in trees)
p = os.path.join(ROOT, 'src', 'data', 'decor.js')
s = open(p).read()
s = re.sub(r"  grass: \[\n.*?\n  \]", "  grass: [\n    // D 배치 + 무작위 7그루 + 오른쪽 위 2그루, 색 3가지 (docs/drafts/tree-sway/final_d.py 가 쓴다 — 손으로 고치면 다음 실행에 덮인다)\n" + lines + "\n  ]", s, flags=re.S)
open(p, 'w').write(s)
print(len(trees), count, [(d['x'], d['y']) for d in trees if d.get('side')])
