"""기존 캐릭터 규칙 그대로 + 참고 그림의 '실루엣 만드는 법'만 빌린 6명 (2026-11-20)
규칙(docs/CHARACTER_ART.md): 24x24 · 두상 13x7 + 몸 13x6(공통 BASE) · 위쪽 y0~10 장식 공간 · 세로 1x2 눈 · 팔 없음 + 둥근 손 · 무기 레이어 왼쪽 ·
발밑 신발 그늘색 · 외곽선 #2b1d2f. 몸 틀은 그대로 두고 머리카락·장식·옷으로만 가른다.
참고 그림에서 빌린 것: 머리 위·양옆으로 크게 튀어나오는 실루엣(왕관 광선·날개 투구·고양이귀 두건·큰 리본·소뿔·나비 날개),
머리카락 덩어리로 얼굴 둘레를 감싸기, 선명한 머리색.
실행: python3 docs/drafts/chibi-test/rule6.py → rule6/<id>.png(대기+공격 시트), rule6.json
"""
import os, sys, json, io, base64
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'roster-v2-art'))
sys.path.insert(0, os.path.join(HERE, '..', 'char-13'))
import roster_v2 as R
import weapons_v3 as W3
D, A = R.D, R.A

# over: BASE 위에 덮어쓰는 줄 ('.' = BASE 그대로). BASE 두상 x5~17·y11~17, 눈 (9,15)·(13,15)
CHARS = [
    {'id': 'isolde', 'name': '이졸데', 'grade': 4, 'key': 'amber', 'w': ('staff', 'flame'), 'note': '태양 광선 왕관 · 양옆으로 넘실대는 금발',
     'pal': {'H': '#ffd66b', 'h': '#e0a83a', 'L': '#fff4c0', 'C': '#e8762a', 'c': '#a84e18', 'D': '#f5c542', 'A': '#f5c542', 'B': '#7a3a1a', 'b': '#4a2010',
             'I': '#e0602a', 'Y': '#f5c542', 'y': '#c98f2a', 'G': '#ff4a5a'},
     'over': {
         5: "...........Y............",
         6: "......Y....Y....Y.......",
         7: ".......Y..OYO..Y........",
         8: "........OOYGYOO.........",
         9: ".......OYYYYYYYO........",
         10: "......OYyYYGYYyYO.......",
         11: "......OOOOOOOOOOO.......",
         12: ".....OHHLHHHHHHHHO......",
         13: "....OHHHHHHHHHHHHHO.....",
         14: "...OHHhSSHHHHHSShHHO....",
         15: "...OHHhSESSSSSEShHHO....",
         16: "...OHhsSISSSSSISshHO....",
         17: "...OHhOOSSSSSSSOOhHO....",
         18: "...OHhO.OCCDCCO.OhHO....",
         19: "....OhO.OcCCCCcO.OhO....",
         20: ".....O..OSCCCCCSO.O.....",
     }},
    {'id': 'brynhild', 'name': '브륀힐드', 'grade': 3, 'key': 'crimson', 'w': ('spear', 'winged'), 'note': '양옆 큰 날개 투구 · 은발 땋은 머리 두 갈래',
     'pal': {'H': '#e4e8f0', 'h': '#9aa0ac', 'C': '#c8323c', 'c': '#8a1e28', 'D': '#f5c542', 'A': '#c9a227', 'B': '#5a3a2a', 'b': '#3a2418',
             'I': '#3a6fd8', 'K': '#c9d3e0', 'k': '#8a97ad', 'W': '#ffffff', 'w': '#b8c8f0', 'G': '#4ab0ff'},
     'over': {
         6: ".OO..................OO.",
         7: "OWWO................OWWO",
         8: "OWwWO..............OWwWO",
         9: ".OWwWO...OOOOO....OWwWO.",
         10: "..OWwWO.OKKGKKO..OWwWO..",
         11: "...OWwOOKKKKKKKOOwWO....",
         12: "....OOKkkkkkkkkkKOO.....",
         13: ".....OHHHHHHHHHHHO......",
         17: "....OHOOSSSSSSSOOHO.....",
         18: "....OHO.OCCDCCO..OHO....",
         19: "....OhO.OcCCCCcO.OhO....",
         20: "....ODO.OSCCCCCSO.ODO...",
         21: ".....O..OAAAAAO....O....",
     }},
    {'id': 'oberon', 'name': '오베론', 'grade': 4, 'key': 'emerald', 'w': ('staff', 'branch'), 'note': '뾰족 요정 귀 · 꽃 덩굴 관 · 등 뒤 나비 날개',
     'pal': {'H': '#5ad8a8', 'h': '#1a8a60', 'C': '#1f9a6a', 'c': '#136a48', 'D': '#f5c542', 'A': '#c9a227', 'B': '#3a5a2a', 'b': '#24401a',
             'I': '#1a8a60', 'V': '#4fae3a', 'F': '#ff8ab0', 'Y': '#ffe066', 'Z': '#ffd8f4', 'z': '#e070c8', 'u': '#8a2a78'},
     'over': {
         8: "..........O..O..........",
         9: ".........OHOOHO.........",
         10: "........OVFVVFVO........",
         11: ".......OHVVYVVVHO.......",
         12: "......OHHHHHHHHHO.......",
         14: "...OO.OHhSSHHHSShHO.OO..",
         15: "..OSSOOHhSESSSEShHOOSSO.",
         16: "...OO.OHsSISSSISsHO.OO..",
         17: "......OOOSSSSSSSOOO.....",
         18: ".OO.....OCCDCCO.....OO..",
         19: "OZzO...OcCCCCCcO...OzZO.",
         20: "OZuzO..OSCCCCCSO..OzuZO.",
         21: ".OZzO...OAAAAAO...OzZO..",
         22: "..OO....OBBOBBO....OO...",
     }},
    {'id': 'ivar', 'name': '이바르', 'grade': 4, 'key': 'navy', 'w': ('dagger', 'kris'), 'note': '고양이귀 두건 · 에메랄드 반가면 · 날리는 목도리',
     'pal': {'H': '#3a2a3a', 'h': '#241826', 'P': '#2e3a6e', 'p': '#1c2448', 'X': '#1f9a6a', 'x': '#136a48', 'C': '#4a4650', 'c': '#2e2b34',
             'D': '#f5c542', 'A': '#c9a227', 'B': '#3a3040', 'b': '#241826', 'I': '#7ae05a', 'G': '#3ae0a0'},
     'over': {
         7: ".....O.........O........",
         8: ".....OPO.....OPO........",
         9: ".....OppO...OppO........",
         10: ".....OPPPOOOPPPO........",
         11: "....OPPPPPPPPPPPO.......",
         12: "....OPPHHHHHHHHPPO......",
         13: "....OPHHHhHHhHHHPO......",
         14: "....OPXXXXXXXXXXPO......",
         15: "....OPXXEXXXXEXXPO......",
         16: "....OPxxIxxxxIxxPO......",
         17: ".....OOOSSSSSSSOO.......",
         18: "......OPPPPPPPPPO.......",
         19: ".......OPPPcCCCOPPO.....",
         20: ".......OSCCCCCSO.OpO....",
     }},
    {'id': 'asta', 'name': '아스타', 'grade': 4, 'key': 'violet', 'w': ('staff', 'bell'), 'note': '머리 위 큰 리본 · 일자 앞머리 긴 흑발 · 양옆 방울',
     'pal': {'H': '#3a2a3a', 'h': '#241826', 'L': '#6a5a7a', 'R': '#b48aff', 'r': '#6a3ab8', 'T': '#60d0d0', 'Y': '#ffd23a', 'C': '#f4f0e8', 'c': '#c8c0b0',
             'D': '#c8323c', 'A': '#c8323c', 'B': '#7a2a30', 'b': '#4a1a20', 'I': '#b48aff'},
     'over': {
         6: ".....OOO.....OOO........",
         7: "....ORRRO...ORRRO.......",
         8: "....ORrRRO.ORRrRO.......",
         9: ".....ORRRTTTRRRO........",
         10: "......OOOTrTOOO.........",
         11: "......OOHOOOHOOO........",
         12: ".....OHHHHHHHHHHO.......",
         13: ".....OHHHHHHHHHHHO......",
         14: "....OHHHHHHHHHHHHHO.....",
         15: "...OYHhSESSSSSEShHYO....",
         16: "...OYHhSISSSSSISShYO....",
         17: "....OHOOSSSSSSSOOHO.....",
         18: "....OHO.OCCDCCO.OHO.....",
         19: "....OHO.OcCCCCcO.OHO....",
         20: "....OhO.OSCCCCCSO.OhO...",
         21: ".....O..OAAAAAO....O....",
     }},
    {'id': 'ragnar', 'name': '라그나르', 'grade': 4, 'key': 'crimson', 'w': ('axe', 'great'), 'note': '하늘로 솟은 소뿔 투구 · 가슴까지 덮는 주황 수염 · 털 견갑',
     'pal': {'H': '#e8a25a', 'h': '#b8702e', 'C': '#c8323c', 'c': '#8a1e28', 'D': '#f5c542', 'A': '#c9a227', 'B': '#5a3a2a', 'b': '#3a2418',
             'I': '#3a6fd8', 'K': '#f3e6c8', 'k': '#c9b48a', 'M': '#c9d3e0', 'N': '#8a97ad', 'F': '#8a5a32', 'f': '#5e3a1e'},
     'over': {
         3: "..O..................O..",
         4: ".OKO................OKO.",
         5: ".OKO................OKO.",
         6: ".OKkO..............OkKO.",
         7: "..OKkO............OkKO..",
         8: "..OKkkO..OOOOO..OkkKO...",
         9: "...OKkkOOMMMMMOOkkKO....",
         10: "....OOkMMMMDMMMMkOO.....",
         11: "......OMMMMDMMMMO.......",
         12: "......ONNNNNNNNNO.......",
         13: ".....OHNNNNNNNNNHO......",
         16: ".....OHHSISSSISHHO......",
         17: "......OHHHHHHHHHO.......",
         18: ".....OFOHHHhHHHOFO......",
         19: "....OFfOcHHHHHcOfFO.....",
         20: ".....OO.OShHhHSO.OO.....",
     }},
]


def body(c):
    pal = {**D.COMMON, **c['pal']}
    over = {y: r.ljust(24, '.')[:24] for y, r in c['over'].items()}
    img = A.noarms(D.build({'id': c['id'], 'pal': pal, 'over': over}))
    img = R.cap_colors(img, R.BODY_COLORS[c['grade']])
    female = c['id'] in ('isolde', 'brynhild', 'asta')
    hat = 4 if c['id'] in ('isolde', 'asta', 'ragnar') else 0
    return img, pal, hat, female, 'custom'


def uri(img):
    b = io.BytesIO(); img.save(b, 'PNG')
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


os.makedirs(os.path.join(HERE, 'rule6'), exist_ok=True)
orig_body = R.body
out = []
for c in CHARS:
    base = next(x for x in R.ROSTER if x['id'] == c['id'])
    cc = {**base, 'grade': c['grade'], 'key': c['key'], 'wvar': c['w'][1]}
    R.body = lambda _c, c=c: body(c)
    r = R.animate(cc)
    R.body = orig_body
    sh = R.sheet(r['idle'] + r['attack'])
    sh.save(os.path.join(HERE, 'rule6', f"{c['id']}.png"))
    out.append({'id': c['id'], 'name': c['name'], 'note': c['note'], 'grade': c['grade'], 'src': uri(sh),
                'idle': [m for _, m in r['idle']], 'attack': [m for _, m in r['attack']]})
json.dump({'W': A.W, 'H': A.H, 'chars': out}, open(os.path.join(HERE, 'rule6.json'), 'w'), ensure_ascii=False)
print('ok', [o['id'] for o in out])
