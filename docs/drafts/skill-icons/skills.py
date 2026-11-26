"""스킬 아이콘 시안 6개 (2026-11-26 사용자 요청: 시험 삼아 여섯 개만) — 16x16 아트 px (UI 에서 3px 도트 → 48px)
규칙은 유물 아이콘(docs/drafts/relic-icons/relics.py)과 같다: 16비트(RGB555) 색 5~6개, 그라데이션·반투명 없음,
외곽선은 그 아이콘 계열의 진한 색(검은 선 금지, 빈칸과 닿는 칸에 자동으로 두름), 빛은 왼쪽 위.
유물(12x12)보다 한 칸 크게 — 스킬은 움직임(불길·낙하·회오리)을 담아야 해서
실행: python3 docs/drafts/skill-icons/skills.py → preview.png (8배 + 게임 크기 3배 카드 위)
"""
import os, math
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
N = 16


def c555(h):
    h = h.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    q = lambda v: round(v / 255 * 31) * 255 // 31
    return (q(r), q(g), q(b), 255)


def grid():
    return [['.'] * N for _ in range(N)]


def put(g, x, y, ch):
    if 0 <= x < N and 0 <= y < N:
        g[y][x] = ch


def rows(lines):
    assert len(lines) == N and all(len(l) == N for l in lines), [len(l) for l in lines]
    return [list(l) for l in lines]


def outline(g, ch='o'):
    """빈칸 중 위아래좌우로 칠한 칸(외곽선 아님)과 닿는 칸 → 외곽선"""
    add = []
    for y in range(N):
        for x in range(N):
            if g[y][x] != '.':
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                X, Y = x + dx, y + dy
                if 0 <= X < N and 0 <= Y < N and g[Y][X] not in '.' + ch:
                    add.append((x, y))
                    break
    for x, y in add:
        g[y][x] = ch
    return g


# ── 1. 대화재 (헬가): 크게 일어난 불길, 안쪽이 하얗게 달아오름 ──
def fire():
    g = rows([
        '......R.........',
        '.....RR.....R...',
        '.....RRR...RR...',
        '....RROR...RRR..',
        '...RROOR..RROR..',
        '...ROOYOR.ROOR..',
        '..RROYYORRROOR..',
        '..ROYYYYOROORR..',
        '.RROYWWYYOROOR..',
        '.ROOYWWWYYOOOR..',
        '.ROYYWWWWYYOOR..',
        '.ROYYWWWWYYOOR..',
        '.RROYYWWYYOORR..',
        '..RROOYYOORRR...',
        '...RRRRRRRRR....',
        '................'])
    return outline(g), {'o': '#6a1a0c', 'R': '#d8402a', 'O': '#f08a2a', 'Y': '#ffd84a', 'W': '#fff4c8'}


# ── 2. 메테오 (브리짓): 오른쪽 위에서 불꼬리를 끌고 떨어지는 바위 ──
def meteor():
    g = grid()
    for i in range(8):                      # 불꼬리 (굵기 3 → 1, 끝은 노랑·흰)
        x, y = 13 - i, 1 + i
        put(g, x, y, 'F')
        put(g, x + 1, y, 'Y' if i < 5 else 'F')
        if i < 5:
            put(g, x + 1, y - 1, 'W' if i < 2 else 'Y')
    rock = [
        '..KKKK..',
        '.KWKKKk.',
        'KWKKKKkk',
        'KKKkKKkk',
        'KKKKKkKk',
        'kKKKKkkk',
        '.kkkkkk.']
    for j, l in enumerate(rock):
        for i, ch in enumerate(l):
            if ch != '.':
                put(g, 2 + i, 7 + j, ch)
    return outline(g), {'o': '#3a1a10', 'K': '#8a5a44', 'k': '#5a3426', 'F': '#f07a2a', 'Y': '#ffd84a', 'W': '#fff4c8'}


# ── 3. 명검 단조 (카르스텐): 모루 위로 달아오른 검 (날은 주황 + 왼쪽 위 흰 빛) + 튀는 불티 ──
def forge():
    g = grid()
    for i in range(8):                      # 날: 2칸 굵기 사선 (오른쪽 위 끝 → 왼쪽 아래)
        x, y = 12 - i, 1 + i
        put(g, x, y, 'W' if i < 6 else 'B')
        put(g, x + 1, y, 'B')
    put(g, 13, 0, 'B')
    for x, y in ((2, 8), (3, 9), (4, 10), (5, 11)):   # 가드: 날에 수직
        put(g, x, y, 'G')
    for x, y in ((3, 11), (2, 12)):         # 손잡이 + 끝 장식
        put(g, x, y, 'H')
    put(g, 1, 13, 'G')
    for y, (x0, x1) in zip(range(12, 16), ((8, 14), (9, 13), (10, 12), (8, 14))):   # 모루
        for x in range(x0, x1 + 1):
            put(g, x, y, 'A')
    for x, y in ((15, 2), (10, 0), (15, 6)):   # 불티
        put(g, x, y, 'W')
    return outline(g), {'o': '#3a2418', 'B': '#ff8a2a', 'W': '#fff4c8', 'G': '#e3b23c', 'H': '#8a5426', 'A': '#7a8490'}


# ── 4. 달빛 사냥 (울프): 초승달 + 세 줄기 발톱 자국 ──
def moon():
    g = grid()
    cx, cy, r = 5.0, 5.0, 4.6
    for y in range(N):
        for x in range(N):
            d1 = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            d2 = math.hypot(x + 0.5 - (cx + 2.4), y + 0.5 - (cy - 1.6))
            if d1 <= r and d2 > r - 0.6:
                put(g, x, y, 'm' if d1 > r - 1.2 or x + y > 9 else 'M')
    for k, (x0, y0, L) in enumerate(((8, 5, 9), (11, 4, 11), (14, 5, 9))):   # 발톱: 가파른 사선 3줄, 끝은 가늘게
        for i in range(L):
            x, y = x0 - i // 2, y0 + i
            put(g, x, y, 'C')
            if 1 < i < L - 2:
                put(g, x + 1, y, 'c')
    return outline(g), {'o': '#1a2240', 'M': '#fff6d0', 'm': '#d8c88a', 'C': '#e6f0ff', 'c': '#8ea6d8'}


# ── 5. 일출 (클레어): 물결 위로 떠오르는 해 + 빛살 ──
def sunrise():
    g = grid()
    cx, cy, r = 7.5, 10.5, 4.8
    for y in range(N):
        for x in range(N):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            if d <= r and y <= 10:
                put(g, x, y, 'W' if d < r - 2.6 and x + y < 16 else ('Y' if d < r - 1.1 else 'y'))
    for a in (-90, -55, -125, -20, -160):   # 빛살 5줄
        t = math.radians(a)
        for s in (6.6, 7.6):
            put(g, round(cx - 0.5 + math.cos(t) * s), round(cy - 0.5 + math.sin(t) * s), 'Y')
    for x in range(1, 15):                  # 물결 2줄
        put(g, x, 11, 'H')
        put(g, x, 12, 'h' if x % 4 else 'H')
    for x in range(3, 13):
        put(g, x, 13, 'h')
    for x in (4, 5, 9, 10):                 # 물에 비친 해
        put(g, x, 12, 'y')
    return outline(g), {'o': '#7a3410', 'W': '#fff4c8', 'Y': '#ffd84a', 'y': '#f09a2a', 'H': '#4a8ad8', 'h': '#2a5aa0'}


# ── 6. 사막 폭풍 (베른): 아래로 가늘어지며 휘는 모래 회오리 ──
def storm():
    g = grid()
    for y in range(1, 15):
        t = (y - 1) / 13
        w = 13.5 * (1 - t) + 2.2 * t
        cx = 7.5 + math.sin(t * 3.2) * 2.0 * t
        for x in range(N):
            dx = x + 0.5 - cx
            if abs(dx) <= w / 2:
                band = (y + (1 if dx > 0 else 0)) % 3 == 0
                light = dx < -w / 4
                put(g, x, y, 'D' if band else ('W' if light and y < 6 else ('S' if light or dx < w / 6 else 's')))
    for x, y in ((1, 9), (14, 6), (13, 11), (2, 13)):   # 날리는 모래알
        put(g, x, y, 's')
    return outline(g), {'o': '#5a3418', 'W': '#fff0c0', 'S': '#e8c070', 's': '#c0904a', 'D': '#8a5a2a'}


ICONS = [('helga', '대화재', fire), ('bridget', '메테오', meteor), ('karsten', '명검 단조', forge),
         ('ulf', '달빛 사냥', moon), ('claire', '일출', sunrise), ('bern', '사막 폭풍', storm)]


def render(g, pal):
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    for y in range(N):
        for x in range(N):
            if g[y][x] != '.':
                im.putpixel((x, y), c555(pal[g[y][x]]))
    return im


if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'icons'), exist_ok=True)
    font = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 18)
    small = ImageFont.truetype('/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc', 15)
    Z, cw = 8, 16 * 8 + 40
    out = Image.new('RGB', (len(ICONS) * cw + 20, 16 * Z + 150), (246, 241, 228))
    d = ImageDraw.Draw(out)
    for i, (cid, name, fn) in enumerate(ICONS):
        g, pal = fn()
        assert len(set(ch for r in g for ch in r) - {'.'}) <= 6, name
        im = render(g, pal)
        im.save(os.path.join(HERE, 'icons', f'{cid}.png'))
        x0 = 20 + i * cw
        big = im.resize((N * Z, N * Z), Image.NEAREST)
        out.paste(big, (x0, 14), big)
        d.text((x0, 16 * Z + 22), f'{name}', fill=(70, 50, 35), font=font)
        d.text((x0, 16 * Z + 46), f'({cid})', fill=(120, 100, 80), font=small)
        # 게임 크기: UI 3px 도트 (48px) — 크림 카드 위
        d.rounded_rectangle([x0, 16 * Z + 74, x0 + 64, 16 * Z + 138], 10, fill=(251, 247, 236), outline=(214, 200, 170), width=2)
        g3 = im.resize((48, 48), Image.NEAREST)
        out.paste(g3, (x0 + 8, 16 * Z + 82), g3)
    out.save(os.path.join(HERE, 'preview.png'))
    print('icons', len(ICONS), out.size)
