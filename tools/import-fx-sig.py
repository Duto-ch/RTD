#!/usr/bin/env python3
"""레어·유니크 전용 스킬 이펙트(docs/drafts/skill-fx/signature/, 136개)를 게임에 넣는다.
- public/assets/fx/sig/<캐릭터id>_<스킬번호>[_back].png 로 복사
- src/data/fxSig.js 생성 (키 = 스킬 def.id, kind = 재생 위치: target·center·self_area·chain·self·adj·ally)
실행: python3 docs/drafts/skill-fx/signature/sig.py && python3 tools/import-fx-sig.py
"""
import json, os, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'docs/drafts/skill-fx/signature')
DST = os.path.join(ROOT, 'public/assets/fx/sig')
os.makedirs(DST, exist_ok=True)
out = {}
for e in json.load(open(os.path.join(SRC, 'index.json'))):
    k = e['key']
    shutil.copyfile(os.path.join(SRC, 'sheets', k + '.png'), os.path.join(DST, k + '.png'))
    if e.get('back'): shutil.copyfile(os.path.join(SRC, 'sheets', k + '_back.png'), os.path.join(DST, k + '_back.png'))
    out[k] = {'kind': e['kind'], 'w': e['w'], 'h': e['h'], 'n': e['n'], 'ms': e['ms'], 'ax': e['ax'], 'ay': e['ay'], 'back': bool(e.get('back'))}
js = ("// 자동 생성 (tools/import-fx-sig.py) — 레어·유니크 전용 스킬 이펙트. 키 = 스킬 def.id(<캐릭터id>_<스킬번호>). 직접 고치지 말 것\n"
      "// kind: target 대상마다 · center 범위 중심 · self_area 캐릭터 둘레 넓게 · chain 대상 사이 · self 자기 · adj 3x3 칸 · ally 아군마다\n"
      "export const FX_SIG = " + json.dumps(out, ensure_ascii=False) + ";\n")
open(os.path.join(ROOT, 'src/data/fxSig.js'), 'w').write(js)
print(len(out), 'effects')
