"""유물 아이콘 30종 (2026-11-19 10종 → 2026-11-20 룰 v2 30종) — 12x12 아트 px, 아이콘마다 전용 모양.
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


# ── 룰 v2 유물 30종 (2026-11-20): 새 20종 — 같은 규칙(12x12, 색 6 이하, 계열 진한 외곽선, 빛은 왼쪽 위) ──
ICONS.update({
    # 마나 성배: 푸른 물이 담긴 은잔
    'mana_chalice': ({'o': '#24365e', 'S': '#d8dde4', 's': '#8a95a8', 'B': '#4a8fe8', 'L': '#bfe6ff'}, [
        '............', '.oooooooooo.', '.oLLBBBBBso.', '.oSBBBBBBso.', '..oSBBBBso..', '...oSSSso...',
        '....oSso....', '....oSso....', '...ooSsoo...', '..oSSSSsso..', '..oooooooo..', '............']),
    # 전사의 깃발: 붉은 깃발 + 검 문양
    'warrior_banner': ({'o': '#4f120c', 'R': '#c0563c', 'r': '#86251c', 'P': '#a8743c', 'W': '#f6e7c8'}, [
        '.o..........', 'oPoooooooo..', 'oPoRRRRRRro.', 'oPoRRWRRRro.', 'oPoRRWRRrro.', 'oPoRWWWRrro.',
        'oPoRRWRrrro.', 'oPoRRRrrro..', 'oPoRrroooo..', 'oPooo.......', 'oPo.........', '.o..........']),
    # 사수의 화살통: 갈색 통 + 깃 세 개
    'ranger_quiver': ({'o': '#2f4a1c', 'G': '#5f8f3e', 'W': '#f6e7c8', 'T': '#9a6235', 't': '#6b3f1f'}, [
        '..W..W..W...', '.oWooWooWo..', '..o.Go..Go..', '...oTTTTo...', '...oTttTo...', '...oTTTTo...',
        '...oTttTo...', '...oTTTTo...', '...oTttTo...', '...oTTTTo...', '....oooo....', '............']),
    # 암살자의 가면: 보라 반가면
    'assassin_mask': ({'o': '#2a1a3e', 'M': '#6b4a8f', 'm': '#45305e', 'L': '#a98ad0', 'K': '#1a1022'}, [
        '............', '............', '..oooooooo..', '.oLMMMMMMmo.', 'oLMKKMMKKMmo', 'oMMKKMMKKMmo',
        'oMMMMMMMMMmo', '.oMMMmmMMmo.', '..oMmo.oMo..', '...oo...o...', '............', '............']),
    # 포격수의 화약통: 나무통 + 도화선 불꽃
    'gunner_keg': ({'o': '#4a2a10', 'T': '#a8743c', 't': '#6b3f1f', 'B': '#3a3040', 'F': '#ffb030', 'Y': '#ffe066'}, [
        '........Y...', '.......YF...', '......oFo...', '...ooooBoo..', '..oTTtTTTto.', '..oBBBBBBBo.',
        '..oTTtTTTto.', '..oTTtTTTto.', '..oBBBBBBBo.', '..oTTtTTTto.', '...oooooooo.', '............']),
    # 주술 인형: 천 인형 + 핀
    'hexer_doll': ({'o': '#1f4a4f', 'C': '#c9b48a', 'c': '#8a7550', 'K': '#2b1d2f', 'P': '#d9603f', 'S': '#bfc6d0'}, [
        '....oooo....', '...oCCCco...', '...oKCKco.S.', '...oCCCcoS..', '..ooocooS...', '.oCCCCCcPo..',
        '.oCoCCCcoCo.', '...oCCCco...', '...oCcCco...', '..oCco.oCco.', '..ooo...ooo.', '............']),
    # 지원가의 하프: 금 하프
    'support_harp': ({'o': '#5c4206', 'Y': '#e3b23c', 'y': '#a87b0c', 'L': '#fff3b0', 'W': '#f6e7c8'}, [
        '.oo.........', 'oYYo........', 'oYyYoooooo..', '.oYW.W.W.Yo.', '.oYW.W.W.yo.', '.oYW.W.W.yo.',
        '.oYW.W.W.yo.', '.oYW.W.Wyo..', '.oYW.WWyo...', '.oYyyyyo....', '.ooooooo....', '............']),
    # 북방의 뿔피리
    'north_horn': ({'o': '#4a2a10', 'H': '#f3e6c8', 'h': '#c9b48a', 'B': '#a8432f', 'b': '#6b2a1c'}, [
        '............', '.........oo.', '........oHo.', '.......oHho.', '......oHho..', '....ooHho...',
        '..ooHHhho...', '.oHHhhoo....', 'oBBBBbo.....', 'obbbbbo.....', '.ooooo......', '............']),
    # 기사단 방패
    'knight_shield': ({'o': '#1d2f52', 'B': '#4a6fa8', 'b': '#2f4a7a', 'S': '#dfe6ee', 'Y': '#e3b23c'}, [
        '.oooooooooo.', '.oSSSSSSSSo.', '.oBBBYYBBbo.', '.oBBBYYBBbo.', '.oBYYYYYYbo.', '.oBYYYYYYbo.',
        '.oBBBYYBBbo.', '..oBBYYBbo..', '..oBBYYbbo..', '...oBBbbo...', '....obbo....', '.....oo.....']),
    # 호수의 진주: 조개 + 진주
    'lake_pearl': ({'o': '#163a52', 'S': '#3a8fb0', 's': '#245e78', 'P': '#f4f0fa', 'p': '#c8c0dc', 'L': '#bfe6ff'}, [
        '............', '...oooooo...', '..oLSSSSso..', '.oLSSoSSSso.', '.oSoSSoSoso.', '.ooooooooo..',
        '..oPPpo.....', '.oPPPPpo....', '.oPPPppo....', '..oPppo.....', '...ooo......', '............']),
    # 길드 장부: 금 테 장부
    'guild_ledger': ({'o': '#4a3410', 'G': '#9a7a3a', 'g': '#6b5420', 'P': '#f3e2b8', 'p': '#c9a66b', 'Y': '#f1c40f'}, [
        '............', '.oooooooooo.', '.oGGGGGGGgo.', '.oGPPPPPPgo.', '.oGPppppPgo.', '.oGPPPPPPgo.',
        '.oGPppppPgo.', '.oGPPPPPPgo.', '.oGGGYYGGgo.', '.oggggYgggo.', '.oooooooooo.', '............']),
    # 상인의 인장: 붉은 밀랍 인장
    'merchant_seal': ({'o': '#4f120c', 'R': '#c0392b', 'r': '#86251c', 'L': '#e8735f', 'Y': '#e3b23c'}, [
        '............', '....oooo....', '..ooRRRRoo..', '.oLRRRRRRro.', '.oRRYYYYRro.', 'oRRYRRRRYrro',
        'oRRYRRRRYrro', '.oRRYYYYrro.', '.oRRRRRrrro.', '..oorrrroo..', '....oooo....', '............']),
    # 영지 문서: 두루마리 + 집 그림
    'estate_deed': ({'o': '#5e3a1c', 'P': '#f3e2b8', 'p': '#c9a66b', 'G': '#56743f', 'R': '#c0392b'}, [
        '.oooooooooo.', 'oppPPPPPPppo', '.oPPPPPPPPo.', '.oPPPRRPPPo.', '.oPPRRRRPPo.', '.oPPGGGGPPo.',
        '.oPPGPPGPPo.', '.oPPGGGGPPo.', '.oPPPPPPPPo.', 'oppPPPPPPppo', '.oooooooooo.', '............']),
    # 보물 지도: X 표시
    'treasure_map': ({'o': '#5e3a1c', 'P': '#f3e2b8', 'p': '#c9a66b', 'R': '#c0392b', 'G': '#3f9a52'}, [
        '............', '.oooooooooo.', '.oPPpPPPPpo.', '.oPGGPPRPRo.', '.oPGPpPPRPo.', '.oPPPPPRPRo.',
        '.opPPpPPPPo.', '.oPPPGGPPpo.', '.oPpPPGGPPo.', '.oPPPPPPpPo.', '.oooooooooo.', '............']),
    # 돌 심장
    'stone_heart': ({'o': '#2e2a2e', 'S': '#9a9c98', 's': '#6a6c6a', 'L': '#c8cac6', 'R': '#c2453a'}, [
        '............', '.ooo..ooo...', 'oLSSooSSSo..', 'oLSSSSSRSso.', 'oSSSSSRRSso.', 'oSSSSSSSSso.',
        '.oSSSSSSso..', '..oSSSSso...', '...oSsso....', '....oso.....', '.....o......', '............']),
    # 수호의 방패: 둥근 금 방패
    'aegis': ({'o': '#5c4206', 'Y': '#f1c40f', 'y': '#a87b0c', 'L': '#fff3b0', 'W': '#f6e7c8'}, [
        '....oooo....', '..ooYYYYoo..', '.oLYYyyYYyo.', '.oYYyWWyYyo.', 'oYYyWYYWyYyo', 'oYYyWYYWyYyo',
        'oYYyWYYWyyyo', '.oYYyWWyYyo.', '.oYYyyyyyyo.', '..ooyyyyoo..', '....oooo....', '............']),
    # 석공의 망치
    'mason_hammer': ({'o': '#2e3a4a', 'S': '#bdc3c7', 's': '#7f8c99', 'L': '#ffffff', 'T': '#9a6235', 't': '#6b3f1f'}, [
        '............', '.oooooo.....', 'oLSSSSso....', 'oSSSSSsso...', 'osssssssto..', '.ooooootTo..',
        '......oTto..', '.......oTto.', '........oTto', '.........oto', '..........o.', '............']),
    # 왕실 인장함: 보라 상자 + 금 인장
    'royal_seal_box': ({'o': '#2a1a3e', 'P': '#8a4fb5', 'p': '#5e3480', 'Y': '#e3b23c', 'y': '#a87b0c', 'L': '#c9a0e8'}, [
        '............', '............', '.oooooooooo.', '.oLPPPPPPpo.', '.oPPPYYPPpo.', '.oooYYYYooo.',
        '.oPPYyyYPpo.', '.oPPPYYPPpo.', '.oPPPPPPPpo.', '.oppppppppo.', '.oooooooooo.', '............']),
    # 모루 부적: 모루 + 끈
    'anvil_charm': ({'o': '#2e2a2e', 'S': '#8a8f98', 's': '#5a5f68', 'L': '#c8ccd4', 'R': '#c0392b'}, [
        '.....R......', '....R.R.....', '...R...R....', '..oooooooo..', '.oLLSSSSSso.', 'ooSSSSSSssoo',
        '..oSSSSsso..', '...oSSsso...', '..oSSSSsso..', '.osssssssso.', '.oooooooooo.', '............']),
    # 별가루 병
    'star_dust': ({'o': '#24365e', 'G': '#cfe8f0', 'g': '#8ab0c0', 'Y': '#ffe066', 'W': '#ffffff', 'C': '#a8743c'}, [
        '....oCCo....', '....oCCo....', '...oogGoo...', '..oGGGGGgo..', '.oGGYGGWGgo.', '.oGYYYGGGgo.',
        '.oGGYGGGYgo.', '.oGGGGGYYYo.', '.oGWGGGGYgo.', '..oGGGGGgo..', '...oooooo...', '............']),
})


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
    order = ['war_drum', 'hero_sword', 'hawk_eye', 'golden_grail', 'red_orb', 'blue_orb', 'green_orb', 'frost_crown', 'contract', 'lucky_coin',
             'mana_chalice', 'warrior_banner', 'ranger_quiver', 'assassin_mask', 'gunner_keg', 'hexer_doll', 'support_harp', 'north_horn',
             'knight_shield', 'lake_pearl', 'guild_ledger', 'merchant_seal', 'estate_deed', 'treasure_map', 'stone_heart', 'aegis',
             'mason_hammer', 'royal_seal_box', 'anvil_charm', 'star_dust']
    sheet = Image.new('RGBA', (10 * 64, 3 * 64), (251, 247, 236, 255))
    for i, rid in enumerate(order):
        im = render(*ICONS[rid])
        im.save(os.path.join(out, f'{rid}.png'))
        sheet.alpha_composite(im.resize((48, 48), Image.NEAREST), ((i % 10) * 64 + 8, (i // 10) * 64 + 8))
    sheet.save(os.path.join(os.path.dirname(__file__), 'preview.png'))
    mp = os.path.join(ROOT, 'public/assets/custom/manifest.json')
    m = json.load(open(mp, encoding='utf8'))
    for rid in order:
        m['sprites'][f'relic_{rid}'] = {'file': f'relics/{rid}.png'}
    open(mp, 'w', encoding='utf8').write(json.dumps(m, ensure_ascii=False, indent=1))
    print('relics', len(order))


if __name__ == '__main__':
    main()
