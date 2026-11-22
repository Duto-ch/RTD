"""tools/export-psd.cjs 가 뽑은 레이어 PNG 를 PSD 하나로 묶는다. pip install psd-tools
layers.json: [{name, path: [그룹, 하위 그룹, ...], file}] — 아래(먼저 그려짐) → 위 순서. 같은 path 는 같은 그룹으로 묶는다"""
import json, os, sys
from PIL import Image
from psd_tools import PSDImage
from psd_tools.api.layers import PixelLayer

out = sys.argv[1]
shots = json.load(open(os.path.join(out, 'layers.json'), encoding='utf-8'))
psd = PSDImage.new(mode='RGBA', size=(1920, 1080))


def node():
    return {'items': [], 'groups': {}}


root = node()
n_layers = 0
for s in shots:
    img = Image.open(s['file']).convert('RGBA')
    box = img.getbbox()
    if not box:
        continue
    layer = PixelLayer.frompil(img.crop(box), psd, 'layer', top=box[1], left=box[0])
    layer.name = s['name'][:250]  # 한글 이름은 유니코드 이름 칸에 (옛 이름 칸은 '?')
    n_layers += 1
    cur = root
    for g in s['path']:
        if g not in cur['groups']:
            cur['groups'][g] = node()
            cur['items'].append(('group', g))
        cur = cur['groups'][g]
    cur['items'].append(('layer', layer))


def build(n):
    """그룹 트리를 아래에서부터 만든다 (자식 그룹 먼저)"""
    out_items = []
    for kind, v in n['items']:
        if kind == 'layer':
            out_items.append(v)
        else:
            kids = build(n['groups'][v])
            if not kids:
                continue
            grp = psd.create_group(kids, 'group')
            grp.name = v.split('§')[0][:250]  # '이름§번호' — 번호는 같은 이름 묶음을 나누는 데만 쓴다
            out_items.append(grp)
    return out_items


build(root)
path = os.path.join(out, 'rtd-battle.psd')
psd.save(path)
print('saved', path, n_layers, 'layers')
