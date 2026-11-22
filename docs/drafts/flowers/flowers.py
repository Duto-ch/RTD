"""초원 꽃 (2026-11-22 사용자 그림 flowers_a.png · flowers_b.png, 각 50x50 에 꽃 여러 송이)
- 그림 안에서 서로 떨어진 덩어리(8방향 연결)마다 한 송이로 잘라 낸다 (여백 1px) → 꽃 6종 (첫 장은 네모 꽃과 분홍 꽃잎이 붙어 한 덩어리 꽃밭)
- 정지 그림 (흔들림 없음), 밑동(pivot) = 아래 가운데. 도트 1px = 화면 2px
실행: python3 docs/drafts/flowers/flowers.py → flower_<n>.png · sheet.png
      + public/assets/custom/deco/flower_<n>.png · manifest `deco_flower_<n>`. 놓는 자리는 docs/drafts/tree-sway/scatter.py
"""
import os, json
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))


def pieces(path):
    im = Image.open(path).convert('RGBA')
    W, H = im.size
    on = {(x, y) for x in range(W) for y in range(H) if im.getpixel((x, y))[3] > 0}
    seen, out = set(), []
    for p in sorted(on, key=lambda q: (q[1], q[0])):
        if p in seen:
            continue
        st, comp = [p], []
        seen.add(p)
        while st:
            x, y = st.pop()
            comp.append((x, y))
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    q = (x + dx, y + dy)
                    if q in on and q not in seen:
                        seen.add(q)
                        st.append(q)
        xs, ys = [c[0] for c in comp], [c[1] for c in comp]
        x0, y0, x1, y1 = min(xs) - 1, min(ys) - 1, max(xs) + 2, max(ys) + 2
        piece = Image.new('RGBA', (x1 - x0, y1 - y0), (0, 0, 0, 0))
        for (x, y) in comp:
            piece.putpixel((x - x0, y - y0), im.getpixel((x, y)))
        out.append(piece)
    return out


if __name__ == '__main__':
    flowers = pieces(os.path.join(HERE, 'flowers_a.png')) + pieces(os.path.join(HERE, 'flowers_b.png'))
    dst = os.path.join(ROOT, 'public', 'assets', 'custom', 'deco')
    os.makedirs(dst, exist_ok=True)
    mf_path = os.path.join(ROOT, 'public', 'assets', 'custom', 'manifest.json')
    mf = json.load(open(mf_path))
    for k in [k for k in mf['sprites'] if k.startswith('deco_flower_')]:
        mf['sprites'].pop(k)
    sizes = {}
    for i, f in enumerate(flowers, 1):
        f.save(os.path.join(HERE, f'flower_{i}.png'))
        f.save(os.path.join(dst, f'flower_{i}.png'))
        mf['sprites'][f'deco_flower_{i}'] = {'file': f'deco/flower_{i}.png', 'frameWidth': f.width, 'frameHeight': f.height, 'scale': 1,
                                             'pivotX': f.width // 2, 'pivotY': f.height - 1}
        sizes[f'deco_flower_{i}'] = f.size
    json.dump(mf, open(mf_path, 'w'), ensure_ascii=False, indent=1)
    json.dump(sizes, open(os.path.join(HERE, 'sizes.json'), 'w'))
    z = 6
    sheet = Image.new('RGBA', (sum(f.width * z + 12 for f in flowers) + 12, max(f.height for f in flowers) * z + 24), (35, 63, 46, 255))
    x = 12
    for f in flowers:
        sheet.alpha_composite(f.resize((f.width * z, f.height * z), Image.NEAREST), (x, 12))
        x += f.width * z + 12
    sheet.save(os.path.join(HERE, 'sheet.png'))
    print('flowers', sizes)
