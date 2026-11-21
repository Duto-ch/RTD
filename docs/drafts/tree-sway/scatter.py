"""초원 나무 흩뿌리기 (2026-11-21 사용자 요청: 길을 따라 늘어선 느낌 대신, 보이지 않는 UI 뒤 땅까지 화면 전체에 무작위로 지금의 두 배)
- 필드·몬스터 길(바깥 상자 x 42~502, y 250~710)만 피하고 화면 전체(544x960)에 40그루
- 나무 그림 범위(밑동 기준 가로 -34~+48 · 세로 -76~0, 뒤집으면 가로 반대)가 길 상자와 크게 겹치면 다시 뽑는다 (가장자리 조금은 허용)
- 포아송 원반 방식: 나무 사이 최소 간격(가로 56 · 세로는 1.4배로 계산)을 두고 뽑아 뭉치거나 줄지어 서지 않게
- 잎 색 3가지(기본·청록·연두)를 가까운 나무끼리 덜 겹치게, 좌우 뒤집기·박자 무작위. 같은 씨앗이면 같은 결과
실행: python3 docs/drafts/tree-sway/scatter.py [그루 수=40] [씨앗=grass-scatter] → src/data/decor.js 의 grass 배열을 다시 쓴다
"""
import os, random, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
N = int(sys.argv[1]) if len(sys.argv) > 1 else 40
rnd = random.Random(sys.argv[2] if len(sys.argv) > 2 else 'grass-scatter')
GW, GH = 544, 960
PATH = (42, 250, 502, 710)       # 필드 + 몬스터 길 바깥 상자
ALLOW = (18, 24)                 # 길 상자와 이만큼(가로, 세로)까지는 겹쳐도 됨
GAP = 56                         # 나무 사이 최소 간격


def box(x, y, flip):
    return (x - 48, y - 76, x + 34, y) if flip else (x - 34, y - 76, x + 48, y)


def hits_path(b):
    ix = min(b[2], PATH[2]) - max(b[0], PATH[0])
    iy = min(b[3], PATH[3]) - max(b[1], PATH[1])
    return ix > ALLOW[0] and iy > ALLOW[1]


trees, tries = [], 0
while len(trees) < N and tries < 200000:
    tries += 1
    x, y = rnd.randint(-10, GW + 10), rnd.randint(70, GH + 40)
    flip = rnd.random() < 0.5
    if hits_path(box(x, y, flip)):
        continue
    if any(((x - t['x']) ** 2 + ((y - t['y']) * 1.4) ** 2) ** 0.5 < GAP for t in trees):
        continue
    trees.append({'x': x, 'y': y, 'flip': flip})
assert len(trees) == N, (len(trees), '자리가 모자람 — GAP 을 줄일 것')

COLORS = ['deco_tree', 'deco_tree_teal', 'deco_tree_spring']
count = {c: 0 for c in COLORS}
for d in trees:
    near = sorted(((d['x'] - o['x']) ** 2 + (d['y'] - o['y']) ** 2, o['key']) for o in trees if o is not d and o.get('key'))[:2]
    used = {k for _, k in near}
    d['key'] = min(COLORS, key=lambda c: (c in used, count[c], rnd.random()))
    count[d['key']] += 1
    d['phase'] = round(rnd.random(), 2)
trees.sort(key=lambda d: (d['y'], d['x']))
lines = ',\n'.join(f"    {{ key: '{d['key']}', x: {d['x']}, y: {d['y']}, phase: {d['phase']}{', flip: true' if d['flip'] else ''} }}" for d in trees)
p = os.path.join(ROOT, 'src', 'data', 'decor.js')
s = open(p).read()
s = re.sub(r"  grass: \[\n.*?\n  \]", "  grass: [\n    // 화면 전체(UI 뒤 땅 포함)에 흩뿌린 나무 — docs/drafts/tree-sway/scatter.py 가 쓴다 (손으로 고치면 다음 실행에 덮인다)\n" + lines + "\n  ]", s, flags=re.S)
open(p, 'w').write(s)
print(N, 'trees', count, 'tries', tries)
