"""나무 배치 시안에 무작위 나무를 더한다 (2026-11-21 사용자 요청: 4그루 정도 더)
빈 땅에서만 고른다 — 위 띠(HUD 카드 아래 ~ 몬스터 길 위) · 왼쪽/오른쪽 가장자리 · 아래 띠(아이템 띠 뒤, 서로 겹쳐도 됨).
이미 있는 나무와 너무 붙지 않게(위·옆 46px, 아래 26px). 색은 기본 / 다른 녹색(alt) 을 섞는다. 같은 씨앗이면 같은 결과.
실행: python3 docs/drafts/tree-sway/add_random.py [그루 수=4] → layouts_plus.json
"""
import json, os, random, sys

HERE = os.path.dirname(os.path.abspath(__file__))
N = int(sys.argv[1]) if len(sys.argv) > 1 else 4
REGIONS = [  # (이름, x 범위, y 범위, 다른 나무와 최소 거리)
    ('top', (10, 534), (236, 256), 46),
    ('left', (4, 20), (290, 690), 46),
    ('right', (524, 540), (290, 690), 46),
    ('bottom', (0, 544), (748, 776), 26),
]
WEIGHT = [3, 1, 1, 3]
base = json.load(open(os.path.join(HERE, 'layouts.json')))
out = {}
for k, trees in base.items():
    rnd = random.Random('trees-plus-' + k)
    t = [dict(d) for d in trees]
    added = 0
    while added < N:
        name, (x0, x1), (y0, y1), gap = rnd.choices(REGIONS, WEIGHT)[0]
        x, y = rnd.randint(x0, x1), rnd.randint(y0, y1)
        if any(((x - d['x']) ** 2 + ((y - d['y']) * 1.6) ** 2) ** 0.5 < gap for d in t):
            continue
        t.append({'x': x, 'y': y, 'flip': rnd.random() < 0.5, 'alt': rnd.random() < 0.35, 'added': True})
        added += 1
    out[k] = t
json.dump(out, open(os.path.join(HERE, 'layouts_plus.json'), 'w'), ensure_ascii=False, indent=1)
print({k: [(d['x'], d['y']) for d in v if d.get('added')] for k, v in out.items()})
