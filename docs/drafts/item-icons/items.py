"""아이템 아이콘 40종 (2026-11-21) — 재료 6 · 왕실 인장 · 조합 21 · 문장 12. 유물 아이콘과 같은 규칙:
12x12 아트 px, 16비트(RGB555) 색 6개 이하, 외곽선은 그 아이콘 계열의 진한 색(검은 선 금지), 빛은 왼쪽 위.
문장 12종은 시너지 상징(7x7, src/ui/theme.js trait_<id>)을 시너지 색 깃발 위에 얹어 만든다.
실행: python3 docs/drafts/item-icons/items.py → public/assets/custom/items/<id>.png + manifest item_<id> + 미리보기 preview.png
"""
import json, os
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))


def c555(h):
    h = h.lstrip('#'); r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    q = lambda v: round(v / 255 * 31) * 255 // 31
    return (q(r), q(g), q(b), 255)


ICONS = {
    # ── 재료 6 + 인장 ──
    # 숫돌: 비스듬한 회색 돌 + 반짝
    'whet': ({'o': '#3a3440', 'S': '#a8a3ae', 's': '#6e6876', 'L': '#e4e0ea', 'W': '#ffffff'}, [
        '..........W.', '.........WWW', '......oo..W.', '....ooLSo...', '..ooLSSSso..', '.oLSSSSsso..',
        'oLSSSSsso...', 'oSSSSsso....', 'osssso......', '.oooo.......', '............', '............']),
    # 깃털: 초록 깃
    'feath': ({'o': '#24401c', 'G': '#6fbf4a', 'g': '#3f8a2e', 'L': '#b8ec8c', 'Q': '#e8dcc0'}, [
        '.........oo.', '........oLGo', '.......oLGgo', '......oLGgo.', '.....oLGgo..', '....oLGgo...',
        '...oLGgo....', '..oGGgo.....', '..oggo......', '.oQo........', 'oQo.........', 'oo..........']),
    # 마력석: 푸른 결정
    'mana': ({'o': '#1c2f63', 'B': '#4a8fe8', 'b': '#2d5fb8', 'L': '#bfe6ff', 'W': '#ffffff'}, [
        '.....oo.....', '....oLBo....', '...oLLBbo...', '..oLWLBbbo..', '..oLLBBbbo..', '.oLLBBBbbbo.',
        '.oLBBBBbbbo.', '..oBBBBbbo..', '..oBBBbbbo..', '...oBBbbo...', '....oBbo....', '.....oo.....']),
    # 렌즈: 청록 렌즈 + 손잡이
    'lens': ({'o': '#1f4a4f', 'T': '#5fb8b0', 'L': '#c8f0ec', 'G': '#c9a227', 'H': '#7a5a2e'}, [
        '...oooo.....', '..oLLTTo....', '.oLLTTTTo...', '.oLTTTTTo...', '.oTTTTTTo...', '.oTTTTTTo...',
        '..oTTTTo....', '...ooooGo...', '.......oGo..', '........oHo.', '.........oHo', '..........o.']),
    # 화약: 주황 화약 주머니 + 끈
    'powd': ({'o': '#5a2a10', 'O': '#e08a3a', 'p': '#b25c1c', 'L': '#ffc98a', 'K': '#3a3040'}, [
        '....K..K....', '.....KK.....', '....oKKo....', '...oLOOpo...', '..oLOOOOpo..', '.oLOOKKOOpo.',
        '.oOOKKKKOpo.', '.oOOOKKOppo.', '.oOOOOOppo..', '..oppppppo..', '...oooooo...', '............']),
    # 금화 주머니: 갈색 주머니 + 금화
    'coin': ({'o': '#4a3410', 'T': '#a8743c', 't': '#7a5428', 'Y': '#f1c40f', 'y': '#c08a0c', 'L': '#fff3b0'}, [
        '....o..o....', '.....oo.....', '....oTto....', '...oTTTto...', '..oTTTTTto..', '.oTTTTTTtto.',
        '.oTTTTTTtto.', '.oTTTTTttoYo', '..otttttoLYo', '...ooooooYyo', '.........oo.', '............']),
    # 왕실 인장: 보라 밀랍 + 금 왕관
    'seal': ({'o': '#2a1a3e', 'P': '#8a4fb5', 'p': '#5e3480', 'L': '#c9a0e8', 'Y': '#e3b23c'}, [
        '............', '...oooooo...', '..oLPPPPpo..', '.oLPYPYPYpo.', '.oPPYYYYPpo.', '.oPPYYYYPpo.',
        '.oPPPPPPPpo.', '.oPPPPPPppo.', '..oPPPPppo..', '...oooooo...', '............', '............']),

    # ── 조합 21 ──
    # 거인의 대검: 굵은 대검
    'giant_sword': ({'o': '#2e3a4a', 'L': '#ffffff', 'B': '#bdc3c7', 'b': '#7f8c99', 'G': '#e3b23c', 'H': '#8a5426'}, [
        '........ooo.', '.......oLBBo', '......oLBBbo', '.....oLBBbo.', '....oLBBbo..', '.o.oLBBbo...',
        '.oGoBBbo....', '..oGGbo.....', '..oHoGGo....', '.oHo..oo....', 'oHo.........', 'oo..........']),
    # 쌍날 단검: 엇갈린 단검 둘
    'twin_dagger': ({'o': '#2e3a4a', 'L': '#ffffff', 'B': '#bdc3c7', 'G': '#e3b23c', 'H': '#6b3f1f'}, [
        'oo........oo', 'oLo......oLo', '.oBo....oBo.', '..oBo..oBo..', '...oBooBo...', '....oBBo....',
        '....oGGo....', '...oGooGo...', '..oHo..oHo..', '.oHo....oHo.', '.oo......oo.', '............']),
    # 룬 각인 검: 검 + 푸른 룬 빛
    'rune_sword': ({'o': '#1c2f63', 'L': '#ffffff', 'B': '#bdc3c7', 'R': '#4a8fe8', 'G': '#e3b23c', 'H': '#8a5426'}, [
        '.R.......oo.', 'RRR.....oLBo', '.R.....oLRBo', '......oLRBo.', '.....oLRBo..', '..o.oLRBo..R',
        '..oGoBRo..RR', '...oGGo....R', '...oHGGo....', '..oHo.oo....', '.oHo........', '.oo.........']),
    # 명사수 조준경: 망원 조준경
    'marksman_scope': ({'o': '#2b2b36', 'K': '#5a5a6a', 'k': '#3e3e4c', 'L': '#9fe0ff', 'G': '#c9a227'}, [
        '............', '............', '.ooo.....ooo', 'oLLKoooooKKo', 'oLKKKKKKKKko', 'oKKKKKKKKkko',
        '.ooo.oGo.ooo', '.....oGo....', '....ooGoo...', '....oGGGo...', '....ooooo...', '............']),
    # 산탄 장치: 나팔총 + 탄 셋
    'scatter': ({'o': '#4a2a10', 'T': '#a8743c', 'K': '#5a5a6a', 'k': '#3e3e4c', 'Y': '#ffe066'}, [
        '.........Y..', '.......ooo.Y', '.....ooKKKo.', '...ooKKKkko.', '.ooKKKkkoo.Y', 'oTTTkkoo....',
        'oTTToo......', '.oTTo.......', '.oTTo.......', '..oo........', '............', '............']),
    # 현상금 표식: 수배 종이 + 해골
    'bounty_mark': ({'o': '#5e3a1c', 'P': '#f3e2b8', 'p': '#c9a66b', 'K': '#3a2a18', 'R': '#c0392b'}, [
        '.oooooooooo.', '.oPPPPPPPpo.', '.oPPKKKKPpo.', '.oPKKKKKKpo.', '.oPKPKKPKpo.', '.oPKKKKKKpo.',
        '.oPPKPKPPpo.', '.oPPPPPPPpo.', '.oPRRRRRRpo.', '.oPPPPPPPpo.', '.oooooooooo.', '............']),
    # 질풍 장화: 장화 + 날개
    'gale_boots': ({'o': '#24401c', 'T': '#a8743c', 't': '#6b3f1f', 'W': '#ffffff', 'L': '#bfe6ff'}, [
        '............', '.......oo...', '....ooTTo.WW', '....oTTto.WL', '....oTTtoWWL', '....oTTto.W.',
        '....oTTto...', '...oTTTto...', '.ooTTTTtto..', 'oTTTTTTttto.', 'ottttttttto.', '.oooooooooo.']),
    # 마나 깃펜: 푸른 깃 + 펜촉
    'mana_quill': ({'o': '#1c2f63', 'B': '#4a8fe8', 'b': '#2d5fb8', 'L': '#bfe6ff', 'G': '#c9a227'}, [
        '.........oo.', '........oLBo', '.......oLBbo', '......oLBbo.', '.....oLBbo..', '....oLBbo...',
        '...oBBbo....', '...oBbo.....', '..oGoo......', '.oGo........', 'oGo.........', 'oo..........']),
    # 연발 석궁
    'repeater': ({'o': '#3a2a18', 'T': '#a8743c', 't': '#6b3f1f', 'S': '#bdc3c7', 's': '#7f8c99', 'W': '#f6e7c8'}, [
        '............', '..oooooooo..', '.oSSSSSSSso.', 'oSoWoTToWoso', 'oo..oTTo..oo', '....oTTo....',
        '....oTto....', '...oTTTto...', '...oTttto...', '....oTto....', '....oooo....', '............']),
    # 불꽃 화살통
    'fire_quiver': ({'o': '#4a2a10', 'T': '#a8743c', 't': '#6b3f1f', 'F': '#ff8a3d', 'Y': '#ffe066'}, [
        '..Y..F..Y...', '.YF.FYF.FY..', '..F..F..F...', '...oTTTTo...', '...oTttTo...', '...oTTTTo...',
        '...oTttTo...', '...oTTTTo...', '...oTttTo...', '...oTTTTo...', '....oooo....', '............']),
    # 행운의 편자
    'horseshoe': ({'o': '#2e3a4a', 'S': '#bdc3c7', 's': '#7f8c99', 'L': '#ffffff', 'G': '#6fbf4a'}, [
        '............', '.oooo..oooo.', '.oLSo..oSso.', '.oSSo..oSso.', '.oSSo..oSso.', '.oSSo..oSso.',
        '.oSSSooSSso.', '..oSSSSSso..', '...ossssso..', '....oooo....', '.....G......', '....GGG.....']),
    # 대마법사의 구슬: 보라 구슬 + 받침
    'archmage_orb': ({'o': '#2a1a3e', 'P': '#8a4fb5', 'p': '#5e3480', 'L': '#e0c4f4', 'G': '#c9a227', 'g': '#8a6a1c'}, [
        '...oooooo...', '..oLLPPPpo..', '.oLLPPPPppo.', '.oLPPPPPppo.', '.oPPPPPpppo.', '.oPPPPppppo.',
        '..oPPpppo...', '...oooooo...', '...oGGGgo...', '..oGGGGggo..', '..oooooooo..', '............']),
    # 별빛 망원경
    'star_scope': ({'o': '#24365e', 'B': '#4a6fa8', 'b': '#2f4a7a', 'G': '#e3b23c', 'Y': '#ffe066'}, [
        '.........Y..', '........YYY.', '......oo.Y..', '....ooBBo...', '..ooBBBbo...', 'ooBBBbbo....',
        'oBBbboo.....', '.oboo.......', '..oGo.......', '.oGGGo......', '.ooooo......', '............']),
    # 폭주 마도서: 붉은 책 + 눈
    'mad_grimoire': ({'o': '#4f120c', 'R': '#c0392b', 'r': '#86251c', 'P': '#f3e2b8', 'Y': '#ffe066', 'K': '#2b1d2f'}, [
        '............', '.oooooooooo.', '.oRRRRRRRPo.', '.oRRYYYYRPo.', '.oRYYKKYYPo.', '.oRYKKKKYPo.',
        '.oRYYKKYYPo.', '.oRRYYYYRPo.', '.orrrrrrrPo.', '.oooooooooo.', '............', '............']),
    # 연금술 플라스크: 초록 약병
    'alchemy_flask': ({'o': '#1e4a2a', 'G': '#6fd36a', 'g': '#3f9a52', 'L': '#d6f5cf', 'C': '#a8743c'}, [
        '....oCCo....', '....oCCo....', '....oLLo....', '....oLLo....', '...oLLLLo...', '..oLLLLLLo..',
        '.oLGGGGGGgo.', '.oGGLGGGggo.', '.oGGGGGgggo.', '.oGGGGgggo..', '..oooooooo..', '............']),
    # 독수리 망원경: 금 망원경
    'eagle_scope': ({'o': '#4a3410', 'Y': '#e3b23c', 'y': '#a87b0c', 'L': '#fff3b0', 'B': '#9fe0ff'}, [
        '............', '..........oo', '........ooBo', '......ooYyo.', '....ooLYyo..', '..ooLYYyo...',
        'ooLYYyyo....', 'oBYyyoo.....', '.oyoo.......', '..o.........', '............', '............']),
    # 공성 조준기: 빨간 과녁
    'siege_sight': ({'o': '#4f120c', 'R': '#d2473a', 'W': '#f6e7c8', 'K': '#2b1d2f'}, [
        '.....oo.....', '...ooRRoo...', '..oRRWWRRo..', '.oRWWRRWWRo.', '.oRWRRRRWRo.', 'oRWRRKKRRWRo',
        'oRWRRKKRRWRo', '.oRWRRRRWRo.', '.oRWWRRWWRo.', '..oRRWWRRo..', '...ooRRoo...', '.....oo.....']),
    # 상인의 저울
    'merchant_scale': ({'o': '#4a3410', 'Y': '#e3b23c', 'y': '#a87b0c', 'T': '#a8743c'}, [
        '.....oo.....', '.oooooYooooo', '.oYYYYYYYYo.', '.o...oYo..o.', 'oyo..oYo.oyo', 'yYYy.oYo.yYy',
        '.yy..oYo..yy', '.....oYo....', '.....oYo....', '...ooTTToo..', '...oTTTTTo..', '...ooooooo..']),
    # 대포알: 검은 쇠공
    'cannonball': ({'o': '#1b1b26', 'K': '#4a4a5a', 'k': '#2e2e3a', 'L': '#9a9aaa'}, [
        '............', '....oooo....', '..ooKKKKoo..', '.oLLKKKKkko.', '.oLKKKKKkko.', 'oKKKKKKKkkko',
        'oKKKKKKkkkko', 'oKKKKKkkkkko', '.oKKKkkkkko.', '.okkkkkkkko.', '..ookkkkoo..', '....oooo....']),
    # 보물 폭탄: 폭탄 + 금화
    'treasure_bomb': ({'o': '#2b1d2f', 'K': '#4a4a5a', 'k': '#2e2e3a', 'Y': '#f1c40f', 'F': '#ff8a3d'}, [
        '........FY..', '.......oF...', '......o.....', '...ooooo....', '..oKKKKKo...', '.oKKKKKkko..',
        '.oKKKKkkko..', '.oKKKkkkoYY.', '..okkkkoYYYY', '...oooooYYYY', '........YYY.', '............']),
    # 길드 금고: 금 테 상자
    'guild_vault': ({'o': '#3a2a18', 'T': '#a8743c', 't': '#6b3f1f', 'Y': '#e3b23c', 'y': '#a87b0c', 'K': '#2b1d2f'}, [
        '............', '.oooooooooo.', '.oYYYYYYYYo.', '.oTTTTTTTTo.', '.oTTTttTTto.', '.oYYYYYYYYo.',
        '.oTTTYYTTto.', '.oTTTYKTTto.', '.oTTTttTTto.', '.oyyyyyyyyo.', '.oooooooooo.', '............'])
}

# 시너지 상징 7x7 (src/ui/theme.js trait_<id> 와 같은 모양) + 시너지 색
TRAIT_SYM = {
    'warrior': ['......x', '.....x.', '....x..', 'x..x...', '.xx....', '.xx....', 'x..x...'],
    'ranger': ['...xxxx', '.....xx', '....x.x', '...x..x', '..x....', 'xx.....', 'xx.....'],
    'assassin': ['..xxx..', '.xx....', 'xx.....', 'xx.....', 'xx.....', '.xx....', '..xxx..'],
    'gunner': ['.....xx', '....x..', '..xxx..', '.xxxxx.', 'xxxxxxx', '.xxxxx.', '..xxx..'],
    'hexer': ['.xxxxx.', 'xxxxxxx', 'x..x..x', 'xxxxxxx', '.xxxxx.', '.x.x.x.', '.......'],
    'support': ['..xxx..', '..xxx..', 'xxxxxxx', 'xxxxxxx', 'xxxxxxx', '..xxx..', '..xxx..'],
    'north': ['x.....x', 'xx...xx', '.xxxxx.', 'xxxxxxx', 'xxxxxxx', 'xx.x.xx', '.......'],
    'knight': ['xxxxxxx', 'xxxxxxx', 'xxxxxxx', 'xxxxxxx', '.xxxxx.', '..xxx..', '...x...'],
    'tower': ['...x...', '..xx...', '..xxx..', '.xxxx..', '.xxxxx.', 'xxxxxxx', '.......'],
    'grove': ['....xxx', '..xxxxx', '.xxxx.x', '.xxx.xx', '.xx.xxx', '.x.xxx.', 'x......'],
    'lake': ['...x...', '..xxx..', '.xxxxx.', 'xxxxxxx', 'xxxxxxx', '.xxxxx.', '..xxx..'],
    'guild': ['..x.x..', '...x...', '.xxxxx.', 'xxxxxxx', 'xxxxxxx', 'xxxxxxx', '.xxxxx.'],
}
TRAIT_COLOR = {'warrior': '#c0563c', 'ranger': '#5f8f3e', 'assassin': '#6b4a8f', 'gunner': '#d9822b', 'hexer': '#3f7f86', 'support': '#c9a227',
               'north': '#a8432f', 'knight': '#4a6fa8', 'tower': '#8a4fb5', 'grove': '#3e8a50', 'lake': '#3a8fb0', 'guild': '#9a7a3a'}


def darken(h, k):
    h = h.lstrip('#')
    return '#' + ''.join(f'{int(int(h[i:i + 2], 16) * k):02x}' for i in (0, 2, 4))


def emblem(trait):
    """문장: 시너지 색 깃발(아래가 뾰족) + 가운데 하얀 상징"""
    base = TRAIT_COLOR[trait]
    pal = {'o': darken(base, 0.4), 'F': base, 'f': darken(base, 0.72), 'W': '#ffffff', 'G': '#e3b23c'}
    rows = [list('.GGGGGGGGGG.'), list('.oooooooooo.')] + [list('.oFFFFFFFfo.') for _ in range(7)] + [list('.oFFFffFFfo.'), list('..oFfoofFo..'), list('...oo..oo...')]
    for y, r in enumerate(TRAIT_SYM[trait]):
        for x, ch in enumerate(r):
            if ch == 'x':
                rows[2 + y][2 + x] = 'W'
    return pal, [''.join(r) for r in rows]


def render(pal, rows):
    im = Image.new('RGBA', (12, 12), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        assert len(row) == 12, (row, len(row))
        for x, ch in enumerate(row):
            if ch != '.':
                im.putpixel((x, y), c555(pal[ch]))
    assert len({im.getpixel((x, y)) for x in range(12) for y in range(12) if im.getpixel((x, y))[3]}) <= 6
    return im


def main():
    for t in TRAIT_SYM:
        ICONS[f'emblem_{t}'] = emblem(t)
    out = os.path.join(ROOT, 'public/assets/custom/items')
    os.makedirs(out, exist_ok=True)
    order = list(ICONS)
    sheet = Image.new('RGBA', (10 * 64, 4 * 64), (251, 247, 236, 255))
    for i, k in enumerate(order):
        im = render(*ICONS[k])
        im.save(os.path.join(out, f'{k}.png'))
        sheet.alpha_composite(im.resize((48, 48), Image.NEAREST), ((i % 10) * 64 + 8, (i // 10) * 64 + 8))
    sheet.save(os.path.join(os.path.dirname(__file__), 'preview.png'))
    mp = os.path.join(ROOT, 'public/assets/custom/manifest.json')
    m = json.load(open(mp, encoding='utf8'))
    for k in order:
        m['sprites'][f'item_{k}'] = {'file': f'items/{k}.png'}
    open(mp, 'w', encoding='utf8').write(json.dumps(m, ensure_ascii=False, indent=1))
    print('items', len(order))


if __name__ == '__main__':
    main()
