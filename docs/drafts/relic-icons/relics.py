"""유물 아이콘 10종 (2026-11-19) — 12x12 아트 px, 아이콘마다 전용 모양.
규칙: 16비트(RGB555) 색 5개(+1), 그라데이션·반투명 없음, 외곽선은 그 아이콘 계열의 진한 색(검은 선 금지), 빛은 왼쪽 위.
실행: python3 docs/drafts/relic-icons/relics.py → public/assets/custom/relics/<id>.png + manifest relic_<id> + 미리보기 preview.png
"""
import json, os
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

def c555(h):
    h = h.lstrip('#'); r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    q = lambda v: round(v / 255 * 31) * 255 // 31
    return (q(r), q(g), q(b), 255)

ICONS = {
    # 전쟁의 북: 붉은 북통 + 크림 북면 + 나무 북채
    'war_drum': ({'o': '#5a1410', 'R': '#c0392b', 'r': '#86251c', 'W': '#f6e7c8', 'w': '#d8bf94', 'S': '#a8743c'}, [
        '.S........S.',
        '..S......S..',
        '..oSooooSo..',
        '.oWWSWWSwwo.',
        '.oowwSSwwoo.',
        '.oRRrRRrRro.',
        '.oRwRRwRwro.',
        '.oRwRRwRwro.',
        '.oRwRRwRwro.',
        '.oRRrRRrrro.',
        '..oooooooo..',
        '............']),
    # 용사의 검: 대각선 검
    'hero_sword': ({'o': '#2e3a4a', 'L': '#ffffff', 'B': '#bdc3c7', 'b': '#7f8c99', 'G': '#e3b23c', 'H': '#8a5426'}, [
        '.........oo.',
        '........oLBo',
        '.......oLBbo',
        '......oLBbo.',
        '.....oLBbo..',
        '..o.oLBbo...',
        '..oGoBbo....',
        '...oGGo.....',
        '...oHGGo....',
        '..oHHo.oo...',
        '.oHHo.......',
        '.ooo........']),
    # 매의 눈: 금빛 눈동자의 눈
    'hawk_eye': ({'o': '#5c4206', 'W': '#fbf3d5', 'Y': '#f2c230', 'y': '#a87b0c', 'K': '#3a2608', 'L': '#ffffff'}, [
        '............',
        '............',
        '....oooo....',
        '..ooWWWWoo..',
        '.oWWYYYyWWo.',
        'oWWYYKKYyWWo',
        'oWWYKLKKyWWo',
        '.oWWyKKyWWo.',
        '..ooWyyWoo..',
        '....oooo....',
        '............',
        '............']),
    # 황금 성배
    'golden_grail': ({'o': '#6b4a06', 'Y': '#f1c40f', 'y': '#b8860b', 'L': '#fff3b0', 'R': '#c0392b'}, [
        '............',
        '.oooooooooo.',
        '.oLYYYYYYyo.',
        '.oLYRRRYYyo.',
        '..oYYYYYyo..',
        '..oLYYYyyo..',
        '...ooYyoo...',
        '....oYyo....',
        '....oLyo....',
        '...oYYyyo...',
        '..oLYYYyyo..',
        '..oooooooo..']),
    # 행운의 동전: 금화 + 네잎클로버
    'lucky_coin': ({'o': '#6b4a06', 'Y': '#f1c40f', 'y': '#b8860b', 'L': '#fff3b0', 'G': '#2e9e5b'}, [
        '............',
        '....oooo....',
        '..ooLLYYoo..',
        '..oLYYYYyo..',
        '.oLYGGYGGyo.',
        '.oLYGGYGGyo.',
        '.oYYYGGYYyo.',
        '.oYYGGYGGyo.',
        '.oYYGGYGGyo.',
        '..oYYYGyyo..',
        '..ooYyyyoo..',
        '....oooo....',
        '............']),
    # 서리 왕관
    'frost_crown': ({'o': '#1d4f73', 'C': '#76d7ea', 'c': '#3a9cc0', 'L': '#e9fbff', 'B': '#3b6fd8'}, [
        '............',
        '............',
        '.o...o...o..',
        'oLo.oLo.oLo.',
        'oCo.oCo.oCo.',
        'oCCoCCCoCco.',
        'oLCCCCCCCco.',
        'oCBCCBCCBco.',
        'oCCCCCCCcco.',
        'oLccccccccco',
        '.oooooooooo.',
        '............']),
    # 용병 계약서: 말린 양피지 + 붉은 봉인
    'contract': ({'o': '#5e3a1c', 'P': '#f3e2b8', 'p': '#c9a66b', 'K': '#8a6a40', 'R': '#c0392b', 'r': '#7b241c'}, [
        '............',
        '.oooooooooo.',
        'oPPPPPPPPppo',
        '.oPKKKKKKpo.',
        '.oPPPPPPPpo.',
        '.oPKKKKKKpo.',
        '.oPPPPPPPpo.',
        '.oPKKKKoopo.',
        '.oPPPPoRRo..',
        'oPPPPPoRro..',
        '.ooooooroo..',
        '............']),
}

ORB_SHAPE = [
    '............',
    '....oooo....',
    '..ooLAAAoo..',
    '..oLAAAAao..',
    '.oLAAAAAaao.',
    '.oAAAAAAaao.',
    '.oAAAAAaaao.',
    '..oAAaaaao..',
    '..ooaaaaoo..',
    '..oGGGGGgo..',
    '.oGGGGGGggo.',
    '.oooooooooo.']
for rid, (L, A, a, o) in {
    'red_orb': ('#ffb4a8', '#e74c3c', '#922b21', '#4f120c'),
    'blue_orb': ('#aed6f1', '#3498db', '#1a5276', '#0f2c45'),
    'green_orb': ('#abebc6', '#2ecc71', '#196f3d', '#0d3a1f'),
}.items():
    ICONS[rid] = ({'o': o, 'L': L, 'A': A, 'a': a, 'G': '#e3b23c', 'g': '#9a6a12'}, ORB_SHAPE)


def render(pal, rows):
    im = Image.new('RGBA', (12, 12), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        assert len(row) == 12, row
        for x, ch in enumerate(row):
            if ch != '.':
                im.putpixel((x, y), c555(pal[ch]))
    assert len({im.getpixel((x, y)) for x in range(12) for y in range(12) if im.getpixel((x, y))[3]}) <= 6
    return im


def main():
    out = os.path.join(ROOT, 'public/assets/custom/relics')
    os.makedirs(out, exist_ok=True)
    order = ['war_drum', 'hero_sword', 'hawk_eye', 'golden_grail', 'red_orb', 'blue_orb', 'green_orb', 'frost_crown', 'contract', 'lucky_coin']
    sheet = Image.new('RGBA', (len(order) * 16 * 4, 16 * 4), (251, 247, 236, 255))
    for i, rid in enumerate(order):
        im = render(*ICONS[rid])
        im.save(os.path.join(out, f'{rid}.png'))
        sheet.alpha_composite(im.resize((48, 48), Image.NEAREST), (i * 64 + 8, 8))
    sheet.save(os.path.join(os.path.dirname(__file__), 'preview.png'))
    mp = os.path.join(ROOT, 'public/assets/custom/manifest.json')
    m = json.load(open(mp, encoding='utf8'))
    for rid in order:
        m['sprites'][f'relic_{rid}'] = {'file': f'relics/{rid}.png'}
    open(mp, 'w', encoding='utf8').write(json.dumps(m, ensure_ascii=False, indent=1))
    print('relics', len(order))


if __name__ == '__main__':
    main()
