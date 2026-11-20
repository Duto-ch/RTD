"""큰 두상 치비 화풍 시험 6명 (2026-11-20) — 사용자 참고 그림의 '화풍'만 따름 (특정 캐릭터를 옮기지 않음).
특징: 두상이 몸의 2/3 · 머리카락·장식으로 실루엣을 가름 · 큰 세로눈(어두운 윗칸 + 흰 반짝임 + 눈동자색) · 볼터치 · 바깥 외곽선만.
24x24 캔버스, 팔 없음 + 둥근 손 + 무기 레이어(왼쪽)는 지금 규칙 그대로. 무기는 weapons_v3.
실행: python3 docs/drafts/chibi-test/chibi.py → sheets/<id>.png (대기 4프레임), chibi.json
"""
import os, sys, json, io, base64
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'roster-v2-art'))
sys.path.insert(0, os.path.join(HERE, '..', 'char-13'))
import roster_v2 as R   # A.geo_weapon → v3
import weapons_v3 as W3
A = R.A

OUT = (0x2b, 0x1d, 0x2f)
COMMON = {'S': '#ffe2c8', 's': '#f6c8a8', 'b': '#f7a0a0', 'E': '#2b1d2f', 'W': '#ffffff', 'm': '#c0505a', 'B': '#4a3020', 'O': '#2b1d2f'}

CHARS = [
    {'id': 'isolde', 'name': '이졸데', 'note': '태양 왕관 · 넓게 퍼진 금발', 'weapon': ('staff', 'flame', 'amber'),
     'pal': {'H': '#ffd66b', 'h': '#e0a83a', 'L': '#fff1b0', 'C': '#e8762a', 'c': '#a84e18', 'A': '#f5c542', 'a': '#c98f2a', 'G': '#ff4a5a', 'I': '#e0602a'},
     'rows': [
        "..........A..A..........",
        ".....A...AAAAAA...A.....",
        "......A.AGAAAAGA.A......",
        ".......AAAAAAAAAA.......",
        ".....HHHHHHHHHHHHHH.....",
        "....HHLLHHHHHHHHHHHH....",
        "...HHLHHHHHHHHHHHHHHH...",
        "...HHHHHHHHHHHHHHHHHH...",
        "...HHHhHHHhHHhHHHhHHh...",
        "...HHSShHSSSSSShHSSHh...",
        "...HHSSSSSSSSSSSSSSHh...",
        "...HHSSEESSSSSSEESSHh...",
        "...HhSSEWSSSSSSEWSSHh...",
        "...HhSbIISSSSSSIIbSHh...",
        "...HhSSSSSSmmSSSSSSHh...",
        "..HHhhSSSSSSSSSSSShHHh..",
        "..HHh..CCCAACCC...hHH...",
        "..Hh...CCCGGCCC....hH...",
        ".hH...cCCCCCCCCc....Hh..",
        ".h...cCCCCCCCCCCc...h...",
        ".....cCCCCAACCCCc.......",
        "......ccccccccccc.......",
        "........BB...BB.........",
        "........................"]},
    {'id': 'brynhild', 'name': '브륀힐드', 'note': '날개 투구 · 은발 땋은 머리', 'weapon': ('spear', 'winged', 'crimson'),
     'pal': {'H': '#d4d8e0', 'h': '#9aa0ac', 'L': '#ffffff', 'K': '#c9d3e0', 'k': '#8a97ad', 'w': '#ffffff', 'v': '#b8c8f0', 'C': '#c8323c', 'c': '#8a1e28', 'A': '#f5c542', 'G': '#4ab0ff', 'I': '#3a6fd8'},
     'rows': [
        "........................",
        "..w.......KKKK.......w..",
        ".wwv....KKKKKKKK....vww.",
        "wwwvv..KKKKAAKKKK..vvwww",
        ".wwvvKKKKKKAAKKKKKKvvww.",
        "..wvKKkkkkkkkkkkkkkKvw..",
        "...HHHHHHHHHHHHHHHHHH...",
        "...HHHHhHHHHHHhHHHHHH...",
        "...HHSShHHSSSHhSSHHHh...",
        "...HHSSSSSSSSSSSSSSHh...",
        "...HHSSSSSSSSSSSSSSHh...",
        "...HHSSEESSSSSSEESSHh...",
        "...HhSSEWSSSSSSEWSSHh...",
        "...HhSbIISSSSSSIIbSHh...",
        "...HhSSSSSSmmSSSSSSHh...",
        "...HHhSSSSSSSSSSSShHH...",
        "...hH..CCAAAACC...Hh....",
        "...HH..CCCGGCCC...HH....",
        "...hA.cCCCCCCCCc..Ah....",
        "...H..cCCCCCCCCc...H....",
        "......cCCCCCCCCc........",
        "......ccccccccccc.......",
        "........BB...BB.........",
        "........................"]},
    {'id': 'oberon', 'name': '오베론', 'note': '나비 날개 · 덩굴 꽃관 · 삐친 청록 머리', 'weapon': ('staff', 'branch', 'emerald'),
     'pal': {'H': '#5ad8a8', 'h': '#1a8a60', 'L': '#d0fff0', 'V': '#4fae3a', 'F': '#ff8ab0', 'Y': '#ffe066', 'w': '#ffd8f4', 'v': '#e070c8', 'u': '#8a2a78',
             'C': '#1f9a6a', 'c': '#136a48', 'A': '#f5c542', 'G': '#ff8ab0', 'I': '#1a8a60'},
     'rows': [
        "........................",
        ".........H....H.........",
        "........HH.HH.HH........",
        "......HHHHHHHHHHHH......",
        ".....HHVFVVVVVVFVHH.....",
        "....HHVVVYVVVVYVVVHH....",
        "...HHHHHHHHHHHHHHHHHH...",
        "...HHLHHHhHHHHhHHHHHH...",
        "...HHHShHHSSShHHShHHH...",
        "..hHHSSSSSSSSSSSSSSHHh..",
        "...HHSSSSSSSSSSSSSSHH...",
        "vv.HHSSEESSSSSSEESSHH.vv",
        "wvv.HSSEWSSSSSSEWSSH.vvw",
        "wwvvhSbIISSSSSSIIbSh.vww",
        "wuwv.SSSSSSmmSSSSSS.vwuw",
        "wwwvv.SSSSSSSSSSSS.vvwww",
        ".wwwv..CCCAACCC...vwww..",
        "..wuwv.CCCGGCCC..vwuw...",
        "..wwwvcCCCCCCCCcvwww....",
        "...wwvcCCCCCCCCcvww.....",
        "....v.cCCCCCCCCc.v......",
        "......ccccccccccc.......",
        "........BB...BB.........",
        "........................"]},
    {'id': 'ivar', 'name': '이바르', 'note': '뾰족 귀 두건 · 에메랄드 가면', 'weapon': ('dagger', 'kris', 'navy'),
     'pal': {'P': '#2e3a6e', 'p': '#1c2448', 'H': '#3a2a3a', 'h': '#241826', 'X': '#1f9a6a', 'x': '#136a48', 'C': '#4a4650', 'c': '#2e2b34',
             'A': '#f5c542', 'G': '#3ae0a0', 'I': '#7ae05a'},
     'rows': [
        "...P................P...",
        "...PP..............PP...",
        "...PpP............PpP...",
        "...PppPPPPPPPPPPPPppP...",
        "...PPPPPPPPPPPPPPPPPP...",
        "..PPPPPPPPPPPPPPPPPPPP..",
        "..PPPHHHHHHHHHHHHHHPPP..",
        "..PPHHHhHHHHHHhHHHHHPP..",
        "..PPHHShHSSSSShHSSHHPP..",
        "..PPHSSSSSSSSSSSSSSHPP..",
        "..PPXXXXXXXXXXXXXXXXPP..",
        "..PPXXEEXXXXXXXXEEXXPP..",
        "..PPXXIWXXXXXXXXIWXXPP..",
        "..PPxxxxxxxxxxxxxxxxPP..",
        "..PPSSSSSSSmmSSSSSSSPP..",
        "..ppPSSSSSSSSSSSSSSPpp..",
        "...pPPPPPPPPPPPPPPPPp...",
        "....PcCCCCCAACCCCCcP....",
        ".....cCCCCCGGCCCCCc.....",
        ".....cCCCCCCCCCCCCc.....",
        ".....cCCCCCCCCCCCCc.....",
        "......ccccccccccccc.....",
        "........BB...BB.........",
        "........................"]},
    {'id': 'asta', 'name': '아스타', 'note': '큰 오로라 리본 · 단발 앞머리 긴 흑발 · 방울', 'weapon': ('staff', 'bell', 'violet'),
     'pal': {'H': '#3a2a3a', 'h': '#241826', 'L': '#6a5a7a', 'R': '#b48aff', 'r': '#6a3ab8', 'T': '#60d0d0', 'Y': '#ffd23a', 'C': '#f4f0e8', 'c': '#c8c0b0',
             'A': '#c8323c', 'G': '#ffd23a', 'I': '#b48aff'},
     'rows': [
        "....RRR........RRR......",
        "...RrRRR......RRRrR.....",
        "...RRrRRRTTTTRRRrRR.....",
        "....RRRRRTrrTRRRRR......",
        ".....HHHHHHHHHHHHHH.....",
        "....HHLHHHHHHHHHHHHH....",
        "...HHHHHHHHHHHHHHHHHH...",
        "...HHHHHHHHHHHHHHHHHH...",
        "...HHHHHHHHHHHHHHHHHH...",
        "...HHSSSSSSSSSSSSSSHH...",
        "..YHHSSSSSSSSSSSSSSHHY..",
        "..YHHSSEESSSSSSEESSHHY..",
        "...HHSSEWSSSSSSEWSSHH...",
        "...HHSbIISSSSSSIIbSHH...",
        "...HHSSSSSSmmSSSSSSHH...",
        "...HHHSSSSSSSSSSSSHHH...",
        "...HHH.CCCAACCC..HHH....",
        "...HHH.CCCAACCC..HHH....",
        "...HhH.cCCCCCCc..HhH....",
        "...Hhh.AAAAAAAAA.hhH....",
        "...hh..AAAAAAAAA..hh....",
        "......cAAAAAAAAAc.......",
        "........BB...BB.........",
        "........................"]},
    {'id': 'ragnar', 'name': '라그나르', 'note': '큰 뿔 투구 · 얼굴을 덮는 주황 수염 · 털 망토', 'weapon': ('axe', 'great', 'crimson'),
     'pal': {'K': '#f3e6c8', 'k': '#c9b48a', 'M': '#c9d3e0', 'N': '#8a97ad', 'H': '#e8a25a', 'h': '#b8702e', 'F': '#8a5a32', 'f': '#5e3a1e',
             'C': '#c8323c', 'c': '#8a1e28', 'A': '#f5c542', 'G': '#ff4a5a', 'I': '#3a6fd8'},
     'rows': [
        "K......................K",
        "KK....................KK",
        ".KK......NNNNNN......KK.",
        ".KKk...NMMMMMMMMN...kKK.",
        "..KkkNMMMMMMMMMMMMNkkK..",
        "...kkMMMMMMAAMMMMMMkk...",
        "....NMMMMMMAAMMMMMMN....",
        "...NNNNNNNNNNNNNNNNNN...",
        "...HHSSSSSSSSSSSSSSHH...",
        "...HHSSSSSSSSSSSSSSHH...",
        "...HHSSEESSSSSSEESSHH...",
        "...HHSSEWSSSSSSEWSSHH...",
        "...HHSSIISSSSSSIISSHH...",
        "...HHHHSSSSSSSSSSHHHH...",
        "...HHHHHHHHmmHHHHHHHH...",
        "...hHHHHHHHHHHHHHHHHh...",
        "..FFhHHHHHHHHHHHHHHhFF..",
        ".FFfFhHHHhHHhHHHHhFfFF..",
        ".FffFCChHHHHHHHhCCFfFF..",
        "..FF.CCCChHHHHhCCCC.FF..",
        ".....cCCCCAAAACCCCc.....",
        "......cccccccccccc......",
        "........BB...BB.........",
        "........................"]},
]


def rgba(hx):
    hx = hx.lstrip('#')
    return tuple(int(hx[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def body_img(c, dy=0, blink=False):
    pal = {**COMMON, **c['pal']}
    rows = [r.ljust(24, '.')[:24] for r in c['rows']]
    img = Image.new('RGBA', (24, 24), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, k in enumerate(row):
            if k == '.':
                continue
            if blink and k in 'EWI' and 10 <= y <= 13:
                k = 'E' if y == 12 else 'S'
            yy = y + (dy if y >= 8 else 0)   # 숨쉬기: 머리 아래쪽(얼굴·몸)은 그대로, 위(머리카락·모자)만 살짝
            yy = y + dy if y < 16 else y
            if 0 <= yy < 24:
                img.putpixel((x, yy), rgba(pal[k]))
    # 바깥 외곽선
    px = img.load()
    solid = {(x, y) for x in range(24) for y in range(24) if px[x, y][3]}
    for (x, y) in list(solid):
        for q in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if q not in solid and 0 <= q[0] < 24 and 0 <= q[1] < 24:
                px[q] = OUT + (255,)
    return img


def weapon_layer(c, frame_w=40, frame_h=34, ox=12, oy=6):
    wt, var, key = c['weapon']
    W3.CTX.update(grade=4 if c['id'] in ('isolde', 'ragnar', 'brynhild', 'oberon') else 3, key=key, var={wt: var})
    A.GEO_LEN.clear(); A.GEO_LEN.update(R.BASE_LEN)
    if (wt, var) in W3.GEO_LEN_V:
        A.GEO_LEN[wt] = W3.GEO_LEN_V[(wt, var)]
    deg = {'staff': -22, 'spear': -30, 'dagger': -40, 'axe': -30}[wt]   # 왼쪽 위로 비스듬히 (대기 자세)
    img, grip = W3.geo(wt, deg)
    return img, grip


HAND = [".OO.", "OSSO", "OSSO", ".OO."]   # 둥근 손 4x4 (외곽선 포함)


def put_hand(F, x0, y0):
    for y, row in enumerate(HAND):
        for x, k in enumerate(row):
            if k != '.':
                F.putpixel((x0 + x, y0 + y), OUT + (255,) if k == 'O' else rgba(COMMON['S']))


def frame(c, dy=0, blink=False):
    F = Image.new('RGBA', (40, 34), (0, 0, 0, 0))
    ox, oy = 12, 6
    F.alpha_composite(body_img(c, dy, blink), (ox, oy))
    wimg, grip = weapon_layer(c)
    hx, hy = ox + 1, oy + 18      # 왼손(그림 왼쪽) — 무기를 쥐는 점
    F.alpha_composite(wimg, (hx - grip[0], hy - grip[1]))
    put_hand(F, hx - 2, hy - 2)
    put_hand(F, ox + 19, oy + 17)  # 빈손
    return F


def uri(img):
    b = io.BytesIO(); img.save(b, 'PNG')
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


os.makedirs(os.path.join(HERE, 'sheets'), exist_ok=True)
v2 = {x['id']: x for x in json.load(open(os.path.join(HERE, '..', 'roster-v2-art', 'v2.json')))['chars']}
out = []
for c in CHARS:
    frames = [frame(c, 0), frame(c, 0), frame(c, 1), frame(c, 1, blink=True)]
    sh = Image.new('RGBA', (40 * len(frames), 34), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        sh.alpha_composite(f, (i * 40, 0))
    sh.save(os.path.join(HERE, 'sheets', f"{c['id']}.png"))
    out.append({'id': c['id'], 'name': c['name'], 'note': c['note'], 'src': uri(sh), 'n': len(frames), 'ms': [500, 300, 450, 120],
                'v2': v2.get(c['id'], {}).get('src'), 'v2idle': v2.get(c['id'], {}).get('idle')})
json.dump({'chars': out}, open(os.path.join(HERE, 'chibi.json'), 'w'), ensure_ascii=False)
print('ok', len(out))
