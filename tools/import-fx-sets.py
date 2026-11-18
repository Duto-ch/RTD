#!/usr/bin/env python3
"""커먼·언커먼 공용 스킬 이펙트 세트(docs/drafts/skill-fx/sets/)를 게임에 넣는다.
- public/assets/fx/sets/<tier>_<key>_<attr>[_back].png 로 복사
- src/data/fxSets.js 생성 (시트 크기·프레임 길이·기준점·바닥 레이어 여부)
실행: python3 docs/drafts/skill-fx/sets/fxset.py && python3 tools/import-fx-sets.py
"""
import json, os, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'docs/drafts/skill-fx/sets')
DST = os.path.join(ROOT, 'public/assets/fx/sets')
os.makedirs(DST, exist_ok=True)
idx = json.load(open(os.path.join(SRC, 'index.json')))
out = {}
for e in idx:
    k = f"{'c' if e['tier'] == 1 else 'u'}_{e['key']}_{e['attr']}"
    shutil.copyfile(os.path.join(SRC, 'sheets', e['file']), os.path.join(DST, k + '.png'))
    if e.get('back'): shutil.copyfile(os.path.join(SRC, 'sheets', e['back']), os.path.join(DST, k + '_back.png'))
    out[k] = {'w': e['w'], 'h': e['h'], 'n': e['n'], 'ms': e['ms'], 'ax': e['ax'], 'ay': e['ay'], 'back': bool(e.get('back'))}
js = ("// 자동 생성 (tools/import-fx-sets.py) — 커먼(c_)·언커먼(u_) 공용 스킬 이펙트 시트. 직접 고치지 말 것\n"
      "// 키: <c|u>_<이펙트>_<속성>. w·h 프레임 크기(아트 px, 화면 2배), ms 프레임별 길이, ax·ay 기준점, back = 캐릭터 뒤 바닥 레이어 시트(_back) 있음\n"
      "export const FX_SETS = " + json.dumps(out, ensure_ascii=False) + ";\n")
open(os.path.join(ROOT, 'src/data/fxSets.js'), 'w').write(js)
print(len(out), 'effects,', sum(1 for v in out.values() if v['back']), 'with back layer')
