"""캐릭터 키 컬러 16색 + 70명 배정 + 생김새 나누기 (2026-11-20)
속성(레드·블루·그린)이 없어지면서 옷 주색을 16색으로 넓힌다. 캐릭터 설명(look) 키워드로 어울리는 색을 고르고,
같은 무기·같은 출신·같은 계열끼리는 색이 겹치지 않게 나눈다 (한 색 최대 5명).
같은 방식으로 머리 모양·머리 색·작은 장식·무기 모양도 '얼핏 비슷한' 캐릭터끼리 겹치지 않게 고른다.
"""
import hashlib

# 이름: (주색, 그늘, 보석, 빛(밝음·중간·짙음) — 지팡이 머리·스킬 고리·유니크 무기 날)
KEYS = {
    'crimson': ('#c8323c', '#8a1e28', '#ff4a5a', ('#ffd0c0', '#ff6a5a', '#c0283a')),
    'orange':  ('#e8762a', '#a84e18', '#ff9a3a', ('#ffe0b0', '#ffa04a', '#d0601e')),
    'amber':   ('#d8a22a', '#9a6e14', '#ffd23a', ('#fff4c0', '#ffd04a', '#c98f1a')),
    'olive':   ('#8a9a3a', '#5e6a22', '#c8e05a', ('#f0f8c0', '#c0d860', '#7a8a2a')),
    'leaf':    ('#4fae3a', '#33782a', '#7ae05a', ('#e8ffd0', '#8ad860', '#3f9a3a')),
    'emerald': ('#1f9a6a', '#136a48', '#3ae0a0', ('#d0fff0', '#5ad8a8', '#1a8a60')),
    'teal':    ('#2a9a9a', '#1a6a6e', '#4ae0e0', ('#d0ffff', '#60d0d0', '#1a8a8e')),
    'sky':     ('#58b4e8', '#3080b8', '#8ad8ff', ('#eaf8ff', '#8cc8f0', '#4a8fe8')),
    'cobalt':  ('#3a5fd0', '#26409a', '#5a8aff', ('#dce6ff', '#7a9aff', '#3a5fd0')),
    'navy':    ('#2e3a6e', '#1c2448', '#7a8ad8', ('#d8dcff', '#8a94e0', '#3a4488')),
    'violet':  ('#7a4ac8', '#52308e', '#b07aff', ('#f0e0ff', '#b48aff', '#6a3ab8')),
    'plum':    ('#a03a8a', '#6e2460', '#ff6ad0', ('#ffd8f4', '#e070c8', '#8a2a78')),
    'rose':    ('#e06a9a', '#a8466e', '#ff9ac8', ('#ffe8f2', '#ff9ac0', '#c8507a')),
    'brown':   ('#8a5a32', '#5e3a1e', '#e0a060', ('#fff0d8', '#e0b070', '#8a5a2a')),
    'ivory':   ('#e8e2d0', '#b0a890', '#ffe48a', ('#ffffff', '#fff0b0', '#d8c070')),
    'charcoal': ('#4a4650', '#2e2b34', '#c0b8d0', ('#f0f0f4', '#b0aac0', '#5a5466')),
}
KEY_NAMES = {'crimson': '진홍', 'orange': '주황', 'amber': '호박', 'olive': '올리브', 'leaf': '연두', 'emerald': '에메랄드',
             'teal': '청록', 'sky': '하늘', 'cobalt': '코발트', 'navy': '남색', 'violet': '보라', 'plum': '자두', 'rose': '장미',
             'brown': '갈색', 'ivory': '상아', 'charcoal': '숯'}

# look 키워드 → 어울리는 색 (앞일수록 더 어울림)
PREF = [
    (('flame', 'fire', 'ember', 'burning', 'crimson', 'red silk', 'red cape', 'scarlet'), ['crimson', 'orange']),
    (('phoenix', 'firebird', 'sun', 'golden', 'gold'), ['amber', 'orange', 'crimson']),
    (('ice', 'frost', 'snow', 'crystal', 'aurora', 'pale'), ['sky', 'ivory', 'teal']),
    (('sea', 'tide', 'lake', 'water', 'coral', 'jellyfish', 'deep sea', 'seafoam', 'shell', 'admiral', 'dock', 'fisherman'), ['teal', 'cobalt', 'navy']),
    (('forest', 'leaf', 'leafy', 'flower', 'druid', 'bark', 'living wood', 'vine', 'moss', 'herb', 'elven', 'wind'), ['leaf', 'emerald', 'olive']),
    (('shadow', 'hood', 'thief', 'rogue', 'night', 'mask', 'assassin'), ['charcoal', 'navy', 'violet']),
    (('witch', 'mage', 'wizard', 'sorceress', 'summoner', 'star', 'moon', 'fortune', 'arcane', 'archmage'), ['violet', 'plum', 'navy']),
    (('holy', 'saint', 'priest', 'nun', 'goddess', 'paladin', 'halo', 'angel'), ['ivory', 'amber', 'sky']),
    (('viking', 'wolf', 'bear', 'fur', 'pelt', 'berserker', 'barbarian'), ['brown', 'charcoal', 'crimson']),
    (('king', 'queen', 'royal', 'prince', 'knight', 'commander', 'lady'), ['cobalt', 'plum', 'crimson']),
    (('smith', 'engineer', 'tinkerer', 'merchant', 'hunter', 'trapper', 'gear', 'leather', 'goggled'), ['brown', 'olive', 'orange']),
    (('dancer', 'bard', 'fairy', 'butterfly', 'petal', 'cheerful', 'girl'), ['rose', 'plum', 'amber']),
    (('bee', 'honey'), ['amber', 'brown']),
    (('poison', 'toxic', 'swamp'), ['olive', 'emerald', 'violet']),
]
OLD_ATTR = {'red': ['crimson', 'orange'], 'blue': ['cobalt', 'sky'], 'green': ['leaf', 'emerald']}
CAP = 5


def h(s, n):
    return int(hashlib.md5(s.encode()).hexdigest(), 16) % n


def key_scores(c):
    L = c['look'].lower()
    sc = {k: 0.0 for k in KEYS}
    for words, ks in PREF:
        if any(w in L for w in words):
            for rank, k in enumerate(ks):
                sc[k] += 3 - rank
    for rank, k in enumerate(OLD_ATTR.get(c['attr'], [])):
        sc[k] += 0.8 - rank * 0.3          # 예전 속성 색은 약하게만 (익숙함 유지)
    for k in KEYS:
        sc[k] += h(c['id'] + k, 100) / 1000  # 같은 점수일 때 캐릭터마다 다르게
    return sc


def assign_keys(chars):
    """chars: [{id, look, attr, grade, wtype, origin, cls}] → {id: key}"""
    used, out = {}, {}
    for c in sorted(chars, key=lambda c: (-c['grade'], c['id'])):
        sc = key_scores(c)
        def cost(k):
            same = [o for o in chars if out.get(o['id']) == k]
            pen = 3.0 * sum(o['wtype'] == c['wtype'] for o in same) + 2.0 * sum(o['origin'] == c['origin'] for o in same) \
                + 1.5 * sum(o['cls'] == c['cls'] for o in same) + (100 if used.get(k, 0) >= CAP else 0)
            return pen - sc[k]
        k = min(KEYS, key=cost)
        out[c['id']] = k
        used[k] = used.get(k, 0) + 1
    return out


def spread(chars, options, field, group, forced=None, allowed=None):
    """비슷한 캐릭터(group 이 같은)끼리 겹치지 않게 options 중 하나씩 고른다. forced(c) 가 값을 돌려주면 그것을 쓴다"""
    out = {}
    for c in sorted(chars, key=lambda c: (-c['grade'], c['id'])):
        f = forced(c) if forced else None
        if f is not None:
            out[c['id']] = f
            continue
        opts = allowed(c) if allowed else options
        def cost(o):
            same = [x for x in chars if out.get(x['id']) == o]
            return 3 * sum(group(x) == group(c) for x in same) + len(same) * 0.4 + h(c['id'] + field + o, 100) / 1000
        out[c['id']] = min(opts, key=cost)
    return out
