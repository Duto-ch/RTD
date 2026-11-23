"""성탑 우주 배경 — 16비트(SNES 풍) 픽셀아트를 코드로 새로 그림 (2026-11-23 사용자 요청)
- 배경 640x360: 화면 1920x1080 에서 아트 1px = 3x3. 색은 모두 RGB555(채널당 5비트 = 16비트 색) 팔레트
  하늘 그라데이션(4x4 바이어 디더 띠) · 성운 2줄기(노이즈 → 색 단계) · 나선 은하 · 고리 행성 · 달 · 별(1px·십자·큰 반짝이)
- 별똥별 28프레임 시트(프레임 140x80, 오른쪽 위 → 왼쪽 아래) · 반짝이 별 8프레임 — 같은 3px 격자
실행: python3 docs/drafts/space-bg/space.py → public/assets/upgrade/space_bg.png · meteor.png · twinkle.png
"""
import math, os

# 2026-11-23 사용자 요청: 고리 행성·나선 은하·달은 뺌 (켜려면 True)
DRAW_GALAXY = False
DRAW_PLANET = False
DRAW_MOON = False
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', '..', 'public', 'assets', 'upgrade')
W, H = 640, 360
rng = np.random.default_rng(23)

def c555(h):
    h = h.lstrip('#')
    return tuple((int(h[i:i + 2], 16) >> 3) * 255 // 31 for i in (0, 2, 4))

SKY = [c555(h) for h in ['#07061a', '#0b0a26', '#100f34', '#161645', '#1d1c56']]
NEB = [c555(h) for h in ['#1d1c56', '#2a2470', '#3a2d88', '#4f389e', '#6a44b0', '#8a56bc', '#ad6cc4', '#cf8ccc', '#eab4d6']]
BLU = [c555(h) for h in ['#1d1c56', '#1f2a78', '#25409a', '#3058b6', '#4a78cc', '#74a0e0']]
GAL = [c555(h) for h in ['#2a2470', '#3a3a9c', '#5a52bc', '#8a6ad0', '#c48ad8', '#f0b8d8', '#fde0e8', '#ffffff']]
PLA = [c555(h) for h in ['#241c4c', '#3a2c6c', '#58448c', '#7a62aa', '#9c84c4', '#c0aadc', '#e0d0ee']]
MOON = [c555(h) for h in ['#2a2850', '#46426e', '#66608c', '#8c86ac', '#b4aecc', '#d8d4e8']]
STAR = [c555(h) for h in ['#ffffff', '#e8e8ff', '#c8d0ff', '#a0a8f0', '#ffd8f0', '#b8f0ff']]

BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16 + 1 / 32
YY, XX = np.mgrid[0:H, 0:W]
DITH = BAYER[YY % 4, XX % 4]

img = np.zeros((H, W, 3), np.uint8)

def ramp(v, pal, mask=None):
    """0~1 값 → 팔레트 단계 (단계 사이는 바이어 디더)"""
    v = np.clip(v, 0, 1) * (len(pal) - 1)
    i = np.floor(v + DITH - 0.5).clip(0, len(pal) - 1).astype(int)
    arr = np.array(pal, np.uint8)[i]
    m = np.ones((H, W), bool) if mask is None else mask
    img[m] = arr[m]

def ramp_fade(v, pal, lo):
    """lo 아래는 바이어 디더로 성기게 — 가장자리가 하늘로 녹아든다"""
    edge = (v > 0) & (v < lo) & (DITH < v / lo * 0.85)
    img[edge] = np.array(pal[1], np.uint8)
    m = v >= lo
    ramp((v - lo) / (1 - lo), pal[1:], m)

def noise(scale, octaves=4, seed=0):
    r = np.random.default_rng(seed)
    out = np.zeros((H, W))
    amp, tot = 1.0, 0
    for o in range(octaves):
        s = max(2, int(scale / 2 ** o))
        g = r.random((H // s + 2, W // s + 2))
        up = np.array(Image.fromarray((g * 255).astype(np.uint8)).resize(((W // s + 2) * s, (H // s + 2) * s), Image.BICUBIC))[:H, :W] / 255
        out += up * amp
        tot += amp
        amp *= 0.5
    return out / tot

# 1) 하늘: 가운데가 가장 어둡고 가장자리로 갈수록 밝아짐
cx, cy = W * 0.47, H * 0.5
d = np.sqrt(((XX - cx) / W) ** 2 + ((YY - cy) / H * 0.8) ** 2)
ramp(d * 1.5 + noise(60, 3, 1) * 0.25 - 0.1, SKY)

# 2) 성운: 왼쪽 위 → 아래 가운데로 휘는 큰 줄기 + 오른쪽 아래 작은 줄기
def band(px, py, wid):
    """곡선(점 목록)까지 거리로 만든 띠 세기"""
    dist = np.full((H, W), 1e9)
    for (x0, y0), (x1, y1) in zip(zip(px, py), zip(px[1:], py[1:])):
        vx, vy = x1 - x0, y1 - y0
        t = np.clip(((XX - x0) * vx + (YY - y0) * vy) / (vx * vx + vy * vy), 0, 1)
        dist = np.minimum(dist, np.hypot(XX - (x0 + t * vx), YY - (y0 + t * vy)))
    return np.clip(1 - dist / wid, 0, 1)

n1 = noise(48, 5, 2)
n2 = noise(20, 4, 3)
b1 = band([-20, 40, 90, 150, 210, 250], [40, 110, 190, 260, 330, 380], 95)
b2 = band([660, 600, 530, 470, 420], [200, 270, 320, 350, 390], 70)
neb = np.maximum(b1, b2 * 0.9) * (0.35 + n1 * 0.9) + (n2 - 0.5) * 0.35
neb = np.clip(neb - 0.18, 0, 1) * 1.35
blue = np.clip((b1 * 0.8 + b2 * 0.6) * (n2 * 1.2) - 0.25, 0, 1) * 1.5  # 성운 가장자리의 푸른 기운
ramp_fade(np.clip(blue * 0.9, 0, 1), BLU, 0.3)
ramp_fade(np.clip(neb, 0, 1), NEB, 0.28)
# 성운 속 밝은 알갱이 (작은 별 무리)
dust = (rng.random((H, W)) > 0.985) & (neb > 0.35)
img[dust] = np.array(NEB[-1], np.uint8)

# 3) 나선 은하 (트리와 오른쪽 정보 창 사이 위쪽 — 오른쪽 1/3 은 창에 가려진다)
gx, gy = 352, 58
if DRAW_GALAXY:
    ang = -0.45
    dx, dy = XX - gx, YY - gy
    rx = dx * math.cos(ang) + dy * math.sin(ang)
    ry = (-dx * math.sin(ang) + dy * math.cos(ang)) / 0.55
    r = np.hypot(rx, ry)
    th = np.arctan2(ry, rx)
    arm = np.cos(2 * (th - np.log(r + 1) * 2.2)) * 0.5 + 0.5
    env = np.clip(1 - r / 60, 0, 1)
    gal = env ** 1.1 * (0.1 + 0.95 * arm ** 4) + np.clip(1 - r / 12, 0, 1) ** 1.4 * 1.0 + env ** 3 * 0.15
    gal = np.clip(gal * (0.75 + noise(8, 3, 5) * 0.5), 0, 1)
    ramp_fade(gal, GAL, 0.3)
    gdust = (rng.random((H, W)) > 0.97) & (gal > 0.3) & (gal < 0.8)
    img[gdust] = np.array(GAL[-2], np.uint8)

# 4) 고리 행성 (왼쪽 위) — 고리 뒤쪽 → 행성 → 고리 앞쪽
px0, py0, pr = 78, 38, 22
if DRAW_PLANET:
    rt = -0.28
    def ring_mask(front):
        ddx, ddy = XX - px0, YY - py0
        u = ddx * math.cos(rt) + ddy * math.sin(rt)
        v = (-ddx * math.sin(rt) + ddy * math.cos(rt)) / 0.26
        rr = np.hypot(u, v)
        mm = ((rr > 30) & (rr < 34)) | ((rr > 35.5) & (rr < 41))
        return mm & ((v > 0) if front else (v <= 0)), rr
    rm, rr = ring_mask(False)
    ringv = np.where(rr < 34.5, 0.75, 0.5)
    ramp(ringv, PLA, rm)
    pd = np.hypot(XX - px0, YY - py0)
    pm = pd <= pr
    lx, ly = -0.55, -0.6
    nz = np.sqrt(np.clip(1 - (pd / pr) ** 2, 0, 1))
    shade = np.clip(((XX - px0) / pr * lx + (YY - py0) / pr * ly + nz * 0.6) * 0.7 + 0.35, 0, 1)
    stripes = np.sin((YY - py0 + (XX - px0) * 0.28) * 0.55) * 0.08
    ramp(np.clip(shade + stripes, 0, 1), PLA, pm)
    rm, rr = ring_mask(True)
    ramp(np.where(rr < 34.5, 0.85, 0.62), PLA, rm)

# 5) 달 (아래 가운데 오른쪽, 창에 안 가리는 곳)
mx0, my0, mr = 372, 318, 13
if DRAW_MOON:
    md = np.hypot(XX - mx0, YY - my0)
    mm = md <= mr
    nz = np.sqrt(np.clip(1 - (md / mr) ** 2, 0, 1))
    sh = np.clip(((XX - mx0) / mr * -0.6 + (YY - my0) / mr * -0.5 + nz * 0.5) * 0.8 + 0.3, 0, 1)
    for (cx_, cy_, cr) in [(-4, -3, 3), (4, 2, 2.5), (-1, 6, 2), (5, -6, 1.6)]:
        cd = np.hypot(XX - mx0 - cx_, YY - my0 - cy_)
        sh = np.where(cd < cr, sh - 0.22, sh)
    ramp(sh, MOON, mm)

# 6) 별 (행성·달·은하 중심 피해서)
def free(x, y):
    return (not DRAW_PLANET or np.hypot(x - px0, y - py0) > 48) and (not DRAW_MOON or np.hypot(x - mx0, y - my0) > 20) and (not DRAW_GALAXY or np.hypot(x - gx, y - gy) > 24)
def put(x, y, c):
    if 0 <= x < W and 0 <= y < H:
        img[y, x] = c
for _ in range(520):  # 1px 별 (어두운 것 위주)
    x, y = int(rng.integers(0, W)), int(rng.integers(0, H))
    if free(x, y):
        put(x, y, STAR[int(rng.choice([1, 2, 3, 3, 3, 4, 5]))] if rng.random() < 0.55 else np.array(SKY[-1]) + 40)
for _ in range(34):  # 십자 별 (3x3)
    x, y = int(rng.integers(4, W - 4)), int(rng.integers(4, H - 4))
    if free(x, y):
        c = STAR[int(rng.choice([0, 1, 2, 4, 5]))]
        put(x, y, STAR[0])
        for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            put(x + ox, y + oy, c if c != STAR[0] else STAR[2])
for _ in range(9):  # 큰 반짝이 (팔 길이 3)
    x, y = int(rng.integers(8, W - 8)), int(rng.integers(8, H - 8))
    if free(x, y):
        put(x, y, STAR[0])
        for k, ci in ((1, 1), (2, 2), (3, 3)):
            for ox, oy in ((k, 0), (-k, 0), (0, k), (0, -k)):
                put(x + ox, y + oy, STAR[ci])
        for ox, oy in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
            put(x + ox, y + oy, STAR[3])

Image.fromarray(img).save(os.path.join(OUT, 'space_bg.png'), optimize=True)

# ---- 별똥별 28프레임 ----
TRAIL = [c555(h) for h in ['#ffffff', '#eeecff', '#ced6ff', '#aabaff', '#8c96f0', '#7470d6', '#5c54b4', '#463e8c']]
FW, FH, N = 140, 80, 28
sheet = Image.new('RGBA', (FW * N, FH), (0, 0, 0, 0))
a = math.radians(152)
ux, uy = math.cos(a), math.sin(a)
sx, sy, travel = FW - 10, 8, 132
for f in range(N):
    p = f / (N - 1)
    fr = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
    dd = travel * (1 - (1 - p) ** 1.6)
    hx, hy = sx + ux * dd, sy + uy * dd
    grow = min(1, f / 6)
    fade = 1 if f < 20 else max(0, (N - 1 - f) / 7)
    L = 32 * grow * (0.4 + 0.6 * fade)
    dim = 0 if f < 20 else f - 20
    pts = {}
    steps = int(L) + 1
    for i in range(steps):
        t = i / max(1, steps - 1)
        x, y = round(hx - ux * i), round(hy - uy * i)
        ci = min(7, int(t * 7) + dim)
        pts[(x, y)] = min(ci, pts.get((x, y), 9))
        if t < 0.3:
            pts[(x, y + 1)] = min(min(7, ci + 2), pts.get((x, y + 1), 9))
    if fade > 0:
        for (x, y), ci in pts.items():
            if 0 <= x < FW and 0 <= y < FH:
                fr.putpixel((x, y), TRAIL[ci] + (255,))
        hx, hy = round(hx), round(hy)
        arm = 0 if f >= 24 or grow < 0.3 else (2 if f % 4 < 2 else 1)
        for k in range(1, arm + 1):
            for ox, oy in ((k, 0), (-k, 0), (0, k), (0, -k)):
                if 0 <= hx + ox < FW and 0 <= hy + oy < FH:
                    fr.putpixel((hx + ox, hy + oy), TRAIL[min(7, k + 1 + dim)] + (255,))
    sheet.paste(fr, (f * FW, 0))
sheet.save(os.path.join(OUT, 'meteor.png'), optimize=True)

# ---- 반짝이 별 8프레임 (9x9) ----
FS = 9
tw = Image.new('RGBA', (FS * 8, FS), (0, 0, 0, 0))
for f, ar in enumerate([0, 1, 2, 3, 4, 3, 2, 1]):
    fr = Image.new('RGBA', (FS, FS), (0, 0, 0, 0))
    c = FS // 2
    fr.putpixel((c, c), TRAIL[0] + (255,))
    for k in range(1, ar + 1):
        for ox, oy in ((k, 0), (-k, 0), (0, k), (0, -k)):
            fr.putpixel((c + ox, c + oy), TRAIL[min(6, k + 1)] + (255,))
    if ar >= 3:
        for ox, oy in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
            fr.putpixel((c + ox, c + oy), TRAIL[4] + (255,))
    tw.paste(fr, (f * FS, 0))
tw.save(os.path.join(OUT, 'twinkle.png'), optimize=True)
print('ok', len(Image.open(os.path.join(OUT, 'space_bg.png')).getcolors(99999)), 'colors')
