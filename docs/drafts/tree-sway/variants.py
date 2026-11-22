"""초원 나무·꽃 배치 다른 시안 (2026-11-22) — 게임 데이터(src/data/decor.js)는 건드리지 않고 variants.json 에만 쓴다
규칙은 scatter.py 와 같다: 필드·몬스터 길 상자(x 42~502, y 250~710)만 피해 화면 전체(UI 뒤 포함), 나무 3종·꽃 6종을 가까운 것끼리 덜 겹치게
  A · B  고른 흩뿌리기 (지금과 같은 방식, 다른 씨앗) — 나무 25 · 꽃 50
  C      숲 덩어리 — 나무를 4~5군데에 모아 작은 숲, 꽃도 6~7군데 꽃밭으로 무리 짓기 — 나무 26 · 꽃 56
  D      꽃밭 — 나무는 적게 고르게 15, 꽃은 많이 80
실행: python3 docs/drafts/tree-sway/variants.py → variants.json · 찍기: node docs/drafts/tree-sway/variants.cjs (빌드 + vite preview 4173 먼저)
"""
import os, json, random, math

HERE = os.path.dirname(os.path.abspath(__file__))
GW, GH = 544, 960
PATH = (42, 250, 502, 710)
TREES = ['deco_tree_1', 'deco_tree_2', 'deco_tree_3']
FSIZE = json.load(open(os.path.join(HERE, '..', 'flowers', 'sizes.json')))
FLOWERS = sorted(FSIZE)


def overlap(b):
    return min(b[2], PATH[2]) - max(b[0], PATH[0]), min(b[3], PATH[3]) - max(b[1], PATH[1])


def tree_ok(x, y, flip):
    b = (x - 48, y - 76, x + 34, y) if flip else (x - 34, y - 76, x + 48, y)
    ix, iy = overlap(b)
    return not (ix > 18 and iy > 24)


def flower_ok(key, x, y):
    w, h = FSIZE[key][0] * 2, FSIZE[key][1] * 2
    ix, iy = overlap((x - w / 2, y - h, x + w / 2, y))
    return not (ix > 4 and iy > 4)


def pick_key(rnd, keys, x, y, placed, count):
    near = sorted(((x - o['x']) ** 2 + (y - o['y']) ** 2, o['key']) for o in placed if o['key'] in keys)[:2]
    used = {k for _, k in near}
    return min(keys, key=lambda c: (c in used, count.get(c, 0), rnd.random()))


def scatter(rnd, n, gap, sampler, ok, keys, placed, yscale=1.4):
    out, count, tries = [], {}, 0
    while len(out) < n and tries < 300000:
        tries += 1
        x, y = sampler()
        flip = rnd.random() < 0.5
        key = pick_key(rnd, keys, x, y, placed + out, count)
        if not ok(key, x, y, flip):
            continue
        if any(((x - o['x']) ** 2 + ((y - o['y']) * yscale) ** 2) ** 0.5 < gap for o in out):
            continue
        count[key] = count.get(key, 0) + 1
        out.append({'key': key, 'x': x, 'y': y, 'flip': flip, 'phase': round(rnd.random(), 2)})
    assert len(out) == n, (len(out), n)
    return out


def even(rnd):
    return lambda: (rnd.randint(-10, GW + 10), rnd.randint(70, GH + 40))


def clusters(rnd, centers, spread):
    def f():
        cx, cy = rnd.choice(centers)
        return round(rnd.gauss(cx, spread)), round(rnd.gauss(cy, spread * 0.8))
    return f


def free_centers(rnd, k, min_d):
    """길 상자 바깥 땅에서 서로 떨어진 무리 중심 k 개"""
    out = []
    while len(out) < k:
        x, y = rnd.randint(0, GW), rnd.randint(90, GH)
        if PATH[0] + 30 < x < PATH[2] - 30 and PATH[1] - 10 < y < PATH[3] + 40:
            continue
        if all(math.dist((x, y), c) > min_d for c in out):
            out.append((x, y))
    return out


tree_ok_k = lambda k, x, y, f: tree_ok(x, y, f)
flower_ok_k = lambda k, x, y, f: flower_ok(k, x, y)


def build(name, seed, n_tree, n_flower, mode):
    rnd = random.Random(f'decor-{name}-{seed}')
    if mode == 'even':
        trees = scatter(rnd, n_tree, 64 if n_tree > 18 else 80, even(rnd), tree_ok_k, TREES, [])
        flowers = scatter(rnd, n_flower, 28 if n_flower <= 60 else 22, even(rnd), flower_ok_k, FLOWERS, trees, 1)
    else:   # grove
        tc = free_centers(rnd, 5, 170)
        trees = scatter(rnd, n_tree, 40, clusters(rnd, tc, 42), tree_ok_k, TREES, [])
        fc = free_centers(rnd, 7, 120)
        flowers = scatter(rnd, n_flower, 18, clusters(rnd, fc, 30), flower_ok_k, FLOWERS, trees, 1)
    return sorted(trees + flowers, key=lambda d: (d['y'], d['x']))


if __name__ == '__main__':
    V = {
        'A': build('A', 1, 25, 50, 'even'),
        'B': build('B', 2, 25, 50, 'even'),
        'C': build('C', 3, 26, 56, 'grove'),
        'D': build('D', 4, 15, 80, 'even'),
    }
    json.dump(V, open(os.path.join(HERE, 'variants.json'), 'w'), ensure_ascii=False)
    print({k: (sum(d['key'].startswith('deco_tree') for d in v), sum(d['key'].startswith('deco_flower') for d in v)) for k, v in V.items()})
