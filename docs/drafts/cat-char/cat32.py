"""고양이 '미샤' 32비트 컬러 시안 (2026-11-21)
16비트 판(cat.py, 몸 14색·재질마다 2톤)과 같은 그림·애니메이션에 색 단계를 늘려 다시 칠한다:
- 재질마다 5단계 램프 (밝음2·밝음1·기본·그늘1·그늘2) — 밝을수록 노랑 쪽, 어두울수록 보라 쪽으로 색조를 옮긴다 (hue shift)
- 빛은 왼쪽 위: 외곽선에 닿은 위·왼쪽 가장자리는 밝게, 아래·오른쪽 가장자리는 어둡게
- 셀아웃: 바깥 외곽선은 짙은 보라 그대로, 안쪽 선(두 색 사이)은 이웃 색을 어둡게 한 색으로
- 몸 색 수 제한 없음 (등급별 색 수 규칙은 16비트 판 기준이라 이 시안에선 풀었다)
실행: python3 docs/drafts/cat-char/cat32.py → sheet32.png · body32.png · compare.png · anim32.gif
"""
import os, sys, colorsys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import cat as C
R, A = C.R, C.A

OUT = (0x2b, 0x1d, 0x2f)
KEEP = {A.rgba(C.PAL[k])[:3] for k in ('I', 's', 'N', 'W')} | {OUT, A.SMEAR[:3], A.SMEAR2[:3]}


def shift(rgb, dv, ds, dh):
    """dh > 0: 노랑(60°) 쪽, dh < 0: 보라(270°) 쪽으로 |dh| 도"""
    h, s, v = colorsys.rgb_to_hsv(*(c / 255 for c in rgb))
    target = 60 / 360 if dh > 0 else 270 / 360
    d = ((target - h + 0.5) % 1) - 0.5
    step = min(abs(dh) / 360, abs(d))
    h = (h + (step if d > 0 else -step)) % 1
    if dv > 0:                 # 원래 밝은 색은 하이라이트를 약하게 (흰색으로 날아가지 않게)
        dv *= min(1, (1 - v) * 2.2)
        ds *= min(1, (1 - v) * 2.2)
    s = min(1, max(0, s + ds))
    v = min(1, max(0, v + dv))
    return tuple(round(c * 255) for c in colorsys.hsv_to_rgb(h, s, v))


RAMP = {2: (0.16, -0.10, 14), 1: (0.08, -0.04, 7), 0: (0, 0, 0), -1: (-0.13, 0.08, -10), -2: (-0.24, 0.12, -18)}


def keep(rgb):
    if rgb in KEEP:
        return True
    h, s, v = colorsys.rgb_to_hsv(*(c / 255 for c in rgb))
    return v > 0.93 and s < 0.12          # 흰 섬광·잔상·속도선은 그대로


def parts(src, W, H):
    """외곽선·투명으로 나뉜 덩어리(머리·귀·몸·꼬리·손·무기)마다 상자를 구한다"""
    comp, boxes = {}, []
    for (x, y), p in src.items():
        if not p[3] or p[:3] == OUT or (x, y) in comp:
            continue
        k, st, pts = len(boxes), [(x, y)], []
        comp[(x, y)] = k
        while st:
            a, b = st.pop()
            pts.append((a, b))
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                q = (a + dx, b + dy)
                if q in src and q not in comp and src[q][3] and src[q][:3] != OUT:
                    comp[q] = k
                    st.append(q)
        xs, ys = [q[0] for q in pts], [q[1] for q in pts]
        boxes.append((min(xs), min(ys), max(xs) + 1, max(ys) + 1))
    return comp, boxes


def recolor(img):
    W, H = img.size
    px = img.load()
    src = {(x, y): px[x, y] for x in range(W) for y in range(H)}
    edge = lambda x, y: (x, y) not in src or src[(x, y)][3] == 0 or src[(x, y)][:3] == OUT
    comp, boxes = parts(src, W, H)
    out = img.copy()
    o = out.load()
    N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
    for (x, y), p in src.items():
        if not p[3]:
            continue
        rgb = p[:3]
        if rgb == OUT:   # 셀아웃: 투명에 닿지 않은 안쪽 선 중 두 색 사이만 (눈동자·입은 그대로)
            nb = [src.get((x + dx, y + dy)) for dx, dy in N4]
            if all(q and q[3] for q in nb):
                cols = [q[:3] for q in nb]
                fill = [c for c in cols if c != OUT and not keep(c)]
                if len(set(fill)) >= 2 and not any(c in KEEP and c != OUT for c in cols):
                    avg = tuple(sum(c[i] for c in fill) // len(fill) for i in range(3))
                    o[x, y] = shift(avg, -0.42, 0.15, -24) + (255,)
            continue
        if keep(rgb):
            continue
        # 덩어리 안 위치로 둥근 명암: 빛 중심은 왼쪽 위 (0.3, 0.25)
        x0, y0, x1, y1 = boxes[comp[(x, y)]]
        u = (x + 0.5 - x0) / (x1 - x0) - 0.3
        v = (y + 0.5 - y0) / (y1 - y0) - 0.25
        d = (u * u + v * v) ** 0.5
        lvl = 2 if d < 0.12 else 1 if d < 0.32 else 0 if d < 0.66 else -1 if d < 0.9 else -2
        # 가장자리 보정: 외곽선에 닿은 아래·오른쪽은 한 단계 더 어둡게, 위·왼쪽은 한 단계 밝게
        lvl += (edge(x, y - 1) or edge(x - 1, y)) - (edge(x, y + 1) or edge(x + 1, y))
        if (x1 - x0) * (y1 - y0) <= 6:      # 아주 작은 덩어리(손·귀 끝)는 2단계만
            lvl = 1 if lvl > 0 else -1 if lvl < 0 else 0
        o[x, y] = shift(rgb, *RAMP[max(-2, min(2, lvl))]) + (255,)
    return out


def ncolors(img):
    return len({p[:3] for p in img.get_flattened_data() if p[3]})


if __name__ == '__main__':
    r = R.animate(C.CAT)
    frames = r['idle'] + r['attack']
    f32 = [(recolor(f), ms) for f, ms in frames]
    R.sheet(f32).save(os.path.join(HERE, 'sheet32.png'))
    b16 = r['body']
    b32 = recolor(b16)
    b32.save(os.path.join(HERE, 'body32.png'))
    bg = (246, 241, 228)
    # 비교: 위 16비트 / 아래 32비트 — 몸 12배 · 대기 6배 · 공격 타격 6배 · 게임 크기(2px)
    z, fz = 12, 6
    hit = 13
    rowh = 24 * z + 20
    cmp_ = Image.new('RGB', (24 * z + 2 * (56 * fz) + 56 * 2 + 80, rowh * 2), bg)
    for row, (body, fr) in enumerate(((b16, frames), (b32, f32))):
        y0 = row * rowh + 10
        bb = body.resize((24 * z, 24 * z), Image.NEAREST)
        cmp_.paste(bb, (10, y0), bb)
        for i, k in enumerate((0, hit)):
            f = fr[k][0].resize((56 * fz, 40 * fz), Image.NEAREST)
            cmp_.paste(f, (24 * z + 20 + i * 56 * fz, y0 + 24), f)
        g = fr[0][0].resize((112, 80), Image.NEAREST)
        cmp_.paste(g, (24 * z + 20 + 2 * 56 * fz + 10, y0 + 24 * z - 90), g)
    cmp_.save(os.path.join(HERE, 'compare.png'))
    gif = []
    for f, _ in f32:
        c = Image.new('RGBA', (56 * 6, 40 * 6), bg + (255,))
        c.alpha_composite(f.resize((56 * 6, 40 * 6), Image.NEAREST))
        gif.append(c.convert('RGB'))
    gif[0].save(os.path.join(HERE, 'anim32.gif'), save_all=True, append_images=gif[1:], duration=[ms for _, ms in f32], loop=0)
    print('body colors 16bit', ncolors(b16), '→ 32bit', ncolors(b32))
