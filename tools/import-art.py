#!/usr/bin/env python3
"""새 그림 넣기 — 캐릭터·배경 이미지를 게임 사양으로 정리해 manifest.json 에 등록한다.

  배경(필드):  python3 tools/import-art.py bg  IN.png --biome grass --layout wide [--erase x,y,w,h] [--ring x0,y0,x1,y1] [--px 3]
  캐릭터 시트: python3 tools/import-art.py sprite IN.png --key merc_mage_red --frame 28x24 [--colors 12]
  공통:        --dry-run (파일·manifest 를 바꾸지 않고 미리보기만)

순서
  1. 이미 진짜 픽셀 격자인지 검사 (PixelLab·pixelfx 시트·직접 찍은 도트) → 그렇다면 perfectPixel 을 건너뛴다 (돌리면 망가짐)
  2. AI "픽셀 풍" 이미지면 perfectPixel 로 격자 정리. 자동 감지 픽셀이 게임 밀도(아트 1px = 화면 --px 3)보다 많이 크면
     디테일이 뭉개진 것이므로 게임 밀도에 맞춘 격자 수를 힌트로 다시 정리한다
  3. --erase 영역(원본 px, 워터마크 등)을 주변 색으로 메운다
  4. 배경: 몬스터 길 바깥 테두리(원본 px, --ring 없으면 흙길 색으로 자동 검출)를 게임의 길 테두리에 맞춰 위치·배율 계산
     캐릭터: 프레임 크기로 나누어떨어지는지 검사
  5. public/assets/custom/ 에 PNG 저장 + manifest 등록, scratchpad 용 전후 비교 미리보기(OUT_compare.png) 저장
"""
import argparse, json, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CUSTOM = os.path.join(ROOT, 'public', 'assets', 'custom')
MANIFEST = os.path.join(CUSTOM, 'manifest.json')
# 게임의 몬스터 길 바깥 테두리 (config.js: FIELD_X/Y·FIELD_SIZE·PATH_OFF·PATH_WIDTH 로 계산한 값)
RING = {'wide': (392, 112, 888, 608), 'tall': (24, 232, 520, 728)}
SCREEN = {'wide': (1280, 720), 'tall': (544, 960)}


def is_exact_pixel(img):
    """이미 1칸 = 1픽셀인 그림인가: 색 수가 적고(≤256) 이웃 픽셀 사이의 '중간색'이 거의 없다"""
    a = np.asarray(img.convert('RGB'))
    colors = len(np.unique(a.reshape(-1, 3), axis=0))
    return colors <= 256, colors


def snap(img, px_hint=None):
    """perfectPixel 로 격자 정리. px_hint(원본 px) 보다 감지 픽셀이 1.6배 넘게 크면 힌트 격자로 다시"""
    import cv2
    from perfect_pixel import get_perfect_pixel
    rgb = np.asarray(img.convert('RGB'))
    w, h, out = get_perfect_pixel(rgb)
    cell = img.width / w
    print(f'  perfectPixel 자동: {w}x{h} (원본 {cell:.2f}px = 1칸)')
    if px_hint and cell > px_hint * 1.6:
        gw, gh = round(img.width / px_hint), round(img.height / px_hint)
        w, h, out = get_perfect_pixel(rgb, grid_size=(gw, gh))
        print(f'  자동 감지가 너무 거칠어 게임 밀도 힌트로 다시: {w}x{h} (원본 {img.width / w:.2f}px = 1칸)')
    return Image.fromarray(out.astype(np.uint8)).convert('RGBA')


def erase(img, box, scale):
    """원본 좌표 box(x,y,w,h) 를 정리된 그림 좌표로 옮겨, 바깥 테두리 색으로 안쪽을 채운다 (워터마크 지우기)"""
    x, y, w, h = [int(round(v / scale)) for v in box]
    a = np.asarray(img).copy()
    H, W = a.shape[:2]
    x0, y0, x1, y1 = max(0, x), max(0, y), min(W, x + w + 1), min(H, y + h + 1)
    mask = np.zeros((H, W), bool)
    mask[y0:y1, x0:x1] = True
    while mask.any():  # 바깥에서 안쪽으로 한 겹씩: 이웃 중 채워진 픽셀 색을 복사
        nxt = mask.copy()
        for yy, xx in zip(*np.where(mask)):
            for dy, dx in ((0, -1), (-1, 0), (0, 1), (1, 0)):
                ny, nx = yy + dy, xx + dx
                if 0 <= ny < H and 0 <= nx < W and not mask[ny, nx]:
                    a[yy, xx] = a[ny, nx]
                    nxt[yy, xx] = False
                    break
        if (nxt == mask).all():
            break
        mask = nxt
    return Image.fromarray(a)


def detect_ring(img):
    """흙길(갈색·황토) 픽셀이 가장 많이 몰린 사각 테두리를 찾는다 → (x0,y0,x1,y1)"""
    a = np.asarray(img.convert('RGB')).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    tan = (r - b > 50) & (r > 120) & (g > 90)
    cs, rs = tan.sum(0), tan.sum(1)
    c = np.where(cs > 0.5 * cs.max())[0]
    rr = np.where(rs > 0.5 * rs.max())[0]
    return c.min(), rr.min(), c.max() + 1, rr.max() + 1


def compare(src, out, path):
    """전후 비교: 왼쪽 원본, 오른쪽 정리 결과(원본 크기로 nearest 확대)"""
    o = out.convert('RGB').resize(src.size, Image.NEAREST)
    c = Image.new('RGB', (src.width * 2 + 16, src.height), 'white')
    c.paste(src.convert('RGB'), (0, 0))
    c.paste(o, (src.width + 16, 0))
    c.save(path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('kind', choices=['bg', 'sprite'])
    ap.add_argument('inp')
    ap.add_argument('--biome'); ap.add_argument('--layout', default='wide', choices=['wide', 'tall'])
    ap.add_argument('--key'); ap.add_argument('--frame'); ap.add_argument('--colors', type=int, default=0)
    ap.add_argument('--erase', action='append', default=[], help='x,y,w,h (원본 px) — 워터마크 등')
    ap.add_argument('--ring', help='x0,y0,x1,y1 (원본 px) — 몬스터 길 바깥 테두리')
    ap.add_argument('--px', type=float, default=3, help='게임 화면에서 아트 1px 크기 (배경·캐릭터 3)')
    ap.add_argument('--out-preview', default=None)
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()

    src = Image.open(a.inp).convert('RGBA')
    exact, n = is_exact_pixel(src)
    print(f'[1] 입력 {src.width}x{src.height}, 색 {n}개 → {"이미 픽셀 격자: perfectPixel 건너뜀" if exact else "AI 픽셀풍: perfectPixel 정리"}')

    if a.kind == 'bg':
        assert a.biome, '--biome 필요 (예: grass)'
        ring = tuple(map(float, a.ring.split(','))) if a.ring else detect_ring(src)
        gx0, gy0, gx1, gy1 = RING[a.layout]
        k = (gx1 - gx0) / (ring[2] - ring[0])  # 원본 px → 게임 px
        ky = (gy1 - gy0) / (ring[3] - ring[1])
        print(f'[2] 길 테두리(원본) {tuple(int(v) for v in ring)} → 게임 {RING[a.layout]}, 배율 {k:.4f} (세로 {ky:.4f})')
        out = src if exact else snap(src, px_hint=a.px / k)
        cell = src.width / out.width  # 원본 px / 아트 px
        for e in a.erase:
            out = erase(out, tuple(map(float, e.split(','))), cell)
            print(f'[3] 지움: {e}')
        scale = cell * k  # 게임 px / 아트 px
        x = gx0 - ring[0] * k
        y = gy0 - ring[1] * k
        W, H = SCREEN[a.layout]
        cover = x <= 0 and y <= 0 and x + out.width * scale >= W and y + out.height * scale >= H
        print(f'[4] 아트 {out.width}x{out.height}, 1칸 = 화면 {scale:.2f}px (목표 {a.px}), 위치 ({x:.1f}, {y:.1f}), 화면 덮음: {cover}')
        if not cover:
            print('    ⚠️ 화면을 다 덮지 못함 — 가장자리는 기본 배경이 보인다')
        key = f'bg_{a.biome}@{a.layout}'
        rel = f'fields/{a.biome}_{a.layout}.png'
        entry = {'file': rel, 'x': round(x, 2), 'y': round(y, 2), 'scale': round(scale, 4)}
    else:
        assert a.key and a.frame, '--key, --frame 28x24 필요'
        fw, fh = map(int, a.frame.lower().split('x'))
        out = src if exact else snap(src)
        if a.colors:
            alpha = out.split()[-1]
            out = out.convert('RGB').quantize(colors=a.colors, method=Image.Quantize.MEDIANCUT).convert('RGBA')
            out.putalpha(alpha)
        ok = out.width % fw == 0 and out.height % fh == 0
        print(f'[4] {out.width}x{out.height}, 프레임 {fw}x{fh} → {"나누어떨어짐" if ok else "⚠️ 프레임 크기와 맞지 않음 — 여백 정리 필요"}')
        if not ok:
            sys.exit(1)
        frames = (out.width // fw) * (out.height // fh)
        key = a.key
        rel = f'mercs/{a.key}.png'
        entry = {'file': rel, 'frameWidth': fw, 'frameHeight': fh, 'scale': 0.75,
                 'animations': {'idle': {'frames': list(range(frames)), 'fps': 6, 'loop': True}}}

    prev = a.out_preview or os.path.splitext(a.inp)[0] + '_compare.png'
    compare(src, out, prev)
    print(f'[5] 전후 비교: {prev}')
    if a.dry_run:
        print('    (--dry-run: 저장·등록 안 함)')
        return
    dst = os.path.join(CUSTOM, rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    out.save(dst)
    m = json.load(open(MANIFEST, encoding='utf-8'))
    section = 'backgrounds' if a.kind == 'bg' else 'sprites'
    m.setdefault(section, {})[key] = {**m.get(section, {}).get(key, {}), **entry}
    json.dump(m, open(MANIFEST, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f'    저장 {os.path.relpath(dst, ROOT)} · manifest {section}.{key} 등록')


if __name__ == '__main__':
    main()
