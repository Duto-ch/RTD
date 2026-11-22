"""tools/export-psd.cjs 가 뽑은 레이어 PNG 를 PSD 하나로 묶는다 (전장 · UI 두 그룹). pip install psd-tools"""
import json, os, sys
from PIL import Image
from psd_tools import PSDImage
from psd_tools.api.layers import PixelLayer

out = sys.argv[1]
shots = json.load(open(os.path.join(out, 'layers.json'), encoding='utf-8'))
psd = PSDImage.new(mode='RGBA', size=(1920, 1080))
groups = {}
for s in shots:
    img = Image.open(s['file']).convert('RGBA')
    box = img.getbbox()
    if not box:
        continue
    crop = img.crop(box)
    layer = PixelLayer.frompil(crop, psd, 'layer', top=box[1], left=box[0])
    layer.name = s['name']  # 한글 이름은 유니코드 이름 칸에 (옛 이름 칸은 '?')
    key = 'UI' if s['name'].startswith('UI') else '전장'
    groups.setdefault(key, []).append(layer)
for key in ['전장', 'UI']:
    if key in groups:
        grp = psd.create_group(groups[key], 'group')
        grp.name = key
path = os.path.join(out, 'rtd-battle.psd')
psd.save(path)
print('saved', path, sum(len(v) for v in groups.values()), 'layers')
