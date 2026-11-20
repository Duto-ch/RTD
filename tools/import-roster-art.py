#!/usr/bin/env python3
"""캐릭터 그림 시안(docs/drafts/roster-art/sheets/<id>.png, 104명)을 게임에 넣는다.

- public/assets/custom/chars/<id>.png 로 복사
- public/assets/custom/manifest.json 의 sprites 에 char_<id> 항목을 쓴다 (다른 항목은 그대로)
  프레임 56x40 · 대기 idle / 공격 attack (프레임마다 길이 ms) · 도트 1px = 화면 2px (UNIT_PX 3 × scale 2/3)
  몸 중심 = 프레임 (27, 23) → 칸 가운데. 그림은 왼쪽을 본다(무기가 왼쪽) → facing "left"
실행: python3 docs/drafts/roster-art/roster_art.py && python3 tools/import-roster-art.py
"""
import json, os, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'docs/drafts/roster-art')
DST = os.path.join(ROOT, 'public/assets/custom')
art = json.load(open(os.path.join(SRC, 'roster-art.json')))
W, H, OX, OY = art['W'], art['H'], art['OX'], art['OY']
os.makedirs(os.path.join(DST, 'chars'), exist_ok=True)
mf_path = os.path.join(DST, 'manifest.json')
mf = json.load(open(mf_path))
sprites = {k: v for k, v in mf['sprites'].items() if not k.startswith('char_')}
# 타격·발사 프레임 (공격 애니메이션 몇 번째 프레임에 피해·투사체가 나가는지, 2026-11-20) — char-13/anim.py 의 공격 키프레임 기준
#  검·도끼·망치: 4 = 내려친 타격(섬광) · 창·단검: 2 = 앞으로 찌름 · 지팡이: 2 = 들어 올려 구슬 섬광 · 활: 4 = 시위를 놓음 · 총·석궁: 2 = 발사 섬광
HIT = {'sword': 4, 'axe': 4, 'hammer': 4, 'spear': 2, 'dagger': 2, 'staff': 2, 'staff_ice': 2, 'staff_leaf': 2, 'bow': 4, 'gun': 2, 'crossbow': 2}
for c in art['chars']:
    shutil.copyfile(os.path.join(SRC, 'sheets', f"{c['id']}.png"), os.path.join(DST, 'chars', f"{c['id']}.png"))
    n_i, n_a = c['idle']['n'], c['attack']['n']
    sprites[f"char_{c['id']}"] = {
        'file': f"chars/{c['id']}.png", 'frameWidth': W, 'frameHeight': H, 'scale': 2 / 3,
        'faceTarget': True, 'facing': 'left', 'pivotX': OX + 11, 'pivotY': OY + 17,
        'animations': {
            'idle': {'frames': list(range(n_i)), 'ms': c['idle']['ms'], 'loop': True},
            'attack': {'frames': list(range(n_i, n_i + n_a)), 'ms': c['attack']['ms'], 'hit': HIT[c['weapon']]},
        },
    }
mf['sprites'] = sprites
json.dump(mf, open(mf_path, 'w'), ensure_ascii=False, indent=1)
print('chars', len(art['chars']), 'sprites', len(sprites))
