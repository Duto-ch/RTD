"""도끼·망치 실루엣 시안 (2026-11-20) — '검게 칠해도 무엇인지 알 수 있게' 모양 자체를 크게 다르게.
세로로 세운 그림(손잡이 아래)으로 그리고, 게임에 넣을 때는 각도별로 다시 찍는다 (지금 규칙: 비스듬한 무기는 각도마다 새로 찍기).
기호: M 금속 · L 밝은 금속 · D 어두운 금속 · W 나무 · w 나무 그늘 · K 가죽 감개 · G 금 장식 · R 보석/수정 · r 수정 그늘 · S 가시 · o 사슬
실행: python3 docs/drafts/chibi-test/axe_hammer.py → axe_hammer.json
"""
import os, json, io, base64
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = (0x2b, 0x1d, 0x2f, 255)

AXES = [
    ('반달 외날 도끼', '한쪽으로만 크게 둥근 날 — 기본형', [
        "......KK.......",
        "......Ww.LL....",
        "......WwLMML...",
        "......WwMMMML..",
        "......WwMMMMML.",
        "......WwMMMMMML",
        "......WwMMMMMML",
        "......WwMMMMMML",
        "......WwMMMMML.",
        "......WwDMMML..",
        "......WwDDDL...",
        "......Ww.......",
        "......Ww.......",
        "......Ww.......",
        "......Ww.......",
        "......KK.......",
        "......KK.......",
        "......Ww.......",
        "......GG......."]),
    ('나비 양날 도끼', '양쪽 대칭 초승달 — 좌우로 넓은 실루엣', [
        "......GG.......",
        ".LL...Ww...LL..",
        "LMML..Ww..LMML.",
        "LMMMMLWwLMMMML.",
        "LMMMMMWwMMMMML.",
        "LMMMMMWwMMMMML.",
        "LMMMMDWwDMMMML.",
        "DMMD..Ww..DMMD.",
        ".DD...Ww...DD..",
        "......Ww.......",
        "......Ww.......",
        "......KK.......",
        "......KK.......",
        "......Ww.......",
        "......Ww.......",
        "......Ww.......",
        "......GG......."]),
    ('수염 도끼', '날이 아래로 길게 늘어진 갈고리 — 위는 좁고 아래가 김', [
        "......Ww.LL....",
        "......WwLMML...",
        "......WwMMMML..",
        "......WwMMMMML.",
        "......Ww.DMMML.",
        "......Ww..DMML.",
        "......Ww...DML.",
        "......Ww...DML.",
        "......Ww..DMML.",
        "......Ww.DMMD..",
        "......WwDDD....",
        "......Ww.......",
        "......Ww.......",
        "......KK.......",
        "......KK.......",
        "......Ww.......",
        "......Ww.......",
        "......Ww......."]),
    ('손도끼', '짧은 자루 + 작은 네모 날 — 전체가 작다', [
        ".....LLL.......",
        "....WMMMML.....",
        "....WMMMMML....",
        "....WMMMML.....",
        "....W.DDD......",
        "....W..........",
        "....K..........",
        "....K..........",
        "....W.........."]),
    ('처형인 대도끼', '거대한 네모 날 + 긴 자루 — 위가 무거운 직사각형', [
        ".......LLLLLLL.",
        "......WMMMMMMML",
        "......WMMMMMMML",
        "......WMMMMMMML",
        "......WMMMRMMML",
        "......WMMMMMMML",
        "......WMMMMMMML",
        "......WMMMMMMML",
        "......WDDDDDDDD",
        "......Ww.......",
        "......Ww.......",
        "......Ww.......",
        "......Ww.......",
        "......Ww.......",
        "......Ww.......",
        "......KK.......",
        "......KK.......",
        "......Ww.......",
        "......Ww.......",
        "......GG......."]),
    ('곡괭이 도끼', '앞은 날, 뒤는 길게 뻗은 송곳 — T 자', [
        "......Ww.LL....",
        "..SS..WwLMML...",
        "SSSSSSWwMMMML..",
        ".SSSSSWwMMMML..",
        "......WwDMML...",
        "......Ww.DD....",
        "......Ww.......",
        "......Ww.......",
        "......Ww.......",
        "......KK.......",
        "......KK.......",
        "......Ww.......",
        "......Ww.......",
        "......Ww......."]),
    ('수정 도끼', '들쭉날쭉 깨진 수정 날 — 가장자리가 톱니', [
        "........R......",
        "......WwRR.R...",
        "......WwRRrRR..",
        "......WwRRRRRR.",
        "......WwRrRR...",
        "......WwRRRRRR.",
        "......WwRRrR...",
        "......WwRRRRR..",
        "......WwR..R...",
        "......Ww.......",
        "......Ww.......",
        "......KK.......",
        "......KK.......",
        "......Ww.......",
        "......Ww.......",
        "......Ww......."]),
    ('낫 도끼', '자루 끝에서 뒤로 크게 휘어 내려오는 날', [
        "..LLLLL........",
        ".LMMMMMLL......",
        "LMMDDDMMMWw....",
        "LMD....DMWw....",
        "LD.......Ww....",
        "L........Ww....",
        "L........Ww....",
        ".........Ww....",
        ".........KK....",
        ".........KK....",
        ".........Ww....",
        ".........Ww....",
        ".........Ww....",
        ".........Ww....",
        ".........GG...."]),
]

HAMMERS = [
    ('사각 망치', '가로로 긴 네모 머리 — 기본형', [
        "...LLLLLLLLL...",
        "...MMMMMMMMMD..",
        "...MMMMMMMMMD..",
        "...MMMMMMMMMD..",
        "...DDDDDDDDDD..",
        "......Ww.......",
        "......Ww.......",
        "......Ww.......",
        "......Ww.......",
        "......Ww.......",
        "......KK.......",
        "......KK.......",
        "......Ww.......",
        "......Ww.......",
        "......GG......."]),
    ('큰 해머', '몸만 한 거대 블록 + 짧고 굵은 자루', [
        ".LLLLLLLLLLLL..",
        ".MMMMMMMMMMMMD.",
        ".MMGMMMMMMGMMD.",
        ".MMMMMMMMMMMMD.",
        ".MMMMMMMMMMMMD.",
        ".MMMMMMMMMMMMD.",
        ".DDDDDDDDDDDDD.",
        ".....WWww......",
        ".....WWww......",
        ".....KKKK......",
        ".....KKKK......",
        ".....WWww......"]),
    ('가시 철퇴', '둥근 머리 + 사방 가시 — 동그란 별', [
        "......SS.......",
        "...S..LL..S....",
        "....SLMMLS.....",
        "..SLMMMMMMLS...",
        "SSLMMMMMMMMLSS.",
        "..DMMMMMMMMD...",
        "....SDMMDS.....",
        "...S..WW..S....",
        "......Ww.......",
        "......Ww.......",
        "......Ww.......",
        "......KK.......",
        "......KK.......",
        "......Ww.......",
        "......GG......."]),
    ('전쟁 망치', '한쪽은 작은 망치, 반대쪽은 긴 송곳 + 위 창끝', [
        "......LL.......",
        "......LD.......",
        "......Ww.LLL...",
        "SSSSSSWwMMMMD..",
        ".SSSSSWwMMMMD..",
        "......WwMMMMD..",
        "......Ww.DDD...",
        "......Ww.......",
        "......Ww.......",
        "......Ww.......",
        "......KK.......",
        "......KK.......",
        "......Ww.......",
        "......Ww.......",
        "......GG......."]),
    ('도리깨', '자루 + 사슬 + 매달린 쇠공 — 머리가 떨어져 있음', [
        ".........S.....",
        "........SLLS...",
        ".......SLMMLS..",
        "........MMMD...",
        ".......S.DD.S..",
        "..........o....",
        ".........o.....",
        "........o......",
        ".......o.......",
        "......GG.......",
        "......Ww.......",
        "......Ww.......",
        "......KK.......",
        "......KK.......",
        "......Ww.......",
        "......GG......."]),
    ('나무 메', '통나무 머리 + 쇠 띠 두 줄 — 둥근 원통', [
        "..wWWWWWWWWw...",
        ".wWWWWWWWWWWw..",
        ".WWGWWWWWWGWW..",
        ".WWGWWWWWWGWW..",
        ".wWWWWWWWWWWw..",
        "..wwwwwwwwww...",
        "......Ww.......",
        "......Ww.......",
        "......Ww.......",
        "......Ww.......",
        "......Ww.......",
        "......KK.......",
        "......Ww......."]),
    ('모루 망치', '한쪽으로 뾰족한 뿔이 난 모루 모양', [
        "..LLLLLLLLLL...",
        "LLMMMMMMMMMMD..",
        ".LLMMMMMMMMMD..",
        "...DMMMMMMMD...",
        "....DMMMMMD....",
        "...DDDDDDDDD...",
        "......Ww.......",
        "......Ww.......",
        "......Ww.......",
        "......Ww.......",
        "......KK.......",
        "......KK.......",
        "......Ww.......",
        "......GG......."]),
    ('수정 해머', '육각 수정 머리 — 각진 다이아몬드', [
        "....RRRRR......",
        "...RrRRRRR.....",
        "..RRrRRRRRR....",
        "..RRrRRRRRR....",
        "...RRRRRRR.....",
        "....RRRRR......",
        "......Ww.......",
        "......Ww.......",
        "......Ww.......",
        "......Ww.......",
        "......KK.......",
        "......KK.......",
        "......Ww.......",
        "......GG......."]),
]

MATS = {
    'steel': {'M': '#a9b8cc', 'L': '#eef6ff', 'D': '#6d7a90', 'W': '#9a6235', 'w': '#6b3f1f', 'K': '#5a3a2a', 'G': '#c9a227', 'R': '#8cc8f0', 'r': '#4a8fe8', 'S': '#7d8590', 'o': '#9aa3b0'},
    'gold': {'M': '#ffd04a', 'L': '#fff4c0', 'D': '#c98f1a', 'W': '#c98f2a', 'w': '#8a5a1a', 'K': '#7a3a2a', 'G': '#ffffff', 'R': '#ff8ab0', 'r': '#c8507a', 'S': '#c98f1a', 'o': '#e0b070'},
}


def render(rows, mat, silhouette=False):
    w = max(len(r) for r in rows)
    img = Image.new('RGBA', (w + 2, len(rows) + 2), (0, 0, 0, 0))
    solid = set()
    for y, r in enumerate(rows):
        for x, k in enumerate(r):
            if k != '.':
                solid.add((x + 1, y + 1))
                c = (40, 32, 44, 255) if silhouette else tuple(int(mat[k].lstrip('#')[i:i + 2], 16) for i in (0, 2, 4)) + (255,)
                img.putpixel((x + 1, y + 1), c)
    if not silhouette:
        for (x, y) in list(solid):
            for q in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if q not in solid:
                    img.putpixel(q, OUT)
    return img


def uri(img):
    b = io.BytesIO(); img.save(b, 'PNG')
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


out = {}
for kind, lst in (('axe', AXES), ('hammer', HAMMERS)):
    out[kind] = [{'name': n, 'desc': d, 'sil': uri(render(r, None, True)), 'steel': uri(render(r, MATS['steel'])), 'gold': uri(render(r, MATS['gold']))} for n, d, r in lst]
json.dump(out, open(os.path.join(HERE, 'axe_hammer.json'), 'w'), ensure_ascii=False)
print({k: len(v) for k, v in out.items()})
