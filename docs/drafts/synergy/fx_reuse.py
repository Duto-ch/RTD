"""쓰지 않게 된 레어·유니크 전용 스킬 이펙트 102개 재활용 배정 (2026-11-20) → FX_REUSE.md
스킬 1개(TFT 식)가 되면서 캐릭터마다 4개 중 Lv5 스킬(_3) 1개만 쓴다. 남는 _0·_1·_2 를 여러 곳에 나눠 쓴다.
"""
import json, os
from collections import defaultdict
HERE = os.path.dirname(os.path.abspath(__file__))
fx = json.load(open(os.path.join(HERE, 'fx-reuse.json')))
syn = json.load(open(os.path.join(HERE, 'synergy.json')))
T = syn['traits']
left = [f for f in fx if not f['used']]
by_char = defaultdict(list)
for f in left:
    by_char[f['id']].append(f)
main_kind = {f['id']: f['kind'] for f in fx if f['used']}
use = {}
# 1) 3성 추가 연출: 캐릭터마다 1개 — 대표 스킬과 같은 모양이면 우선 (3성이 되면 대표 스킬 위에 겹쳐 터짐)
for cid, lst in by_char.items():
    pick = next((f for f in lst if f['kind'] == main_kind[cid]), None) or next((f for f in lst if f['kind'] in ('center', 'self_area', 'target')), lst[0])
    use[pick['k']] = ('3성 추가 연출', f"{pick['name']} 3성 스킬")
# 2) 시너지 발동 연출 12개: 출신은 그 출신 캐릭터의 버프형(adj·ally·self_area), 계열은 그 계열 캐릭터의
buffy = ('adj', 'ally', 'self_area', 'self')
for tid, t in T.items():
    key = 'origin' if t['kind'] == 'origin' else 'cls'
    cand = [f for f in left if f['k'] not in use and f[key] == tid and f['kind'] in buffy]
    cand = cand or [f for f in left if f['k'] not in use and f[key] == tid]
    if cand:
        use[cand[0]['k']] = ('시너지 발동', f"{t['name']} 단계가 오를 때")
# 3) 별 승급 연출: self 1개
cand = [f for f in left if f['k'] not in use and f['kind'] == 'self']
if cand:
    use[cand[0]['k']] = ('별 승급', '같은 캐릭터 3장 → 별이 오를 때')
# 4) 아이템 조합 효과 21개: 공격형(target·center·chain)
items = [f for f in left if f['k'] not in use and f['kind'] in ('target', 'center', 'chain')]
for n, f in enumerate(items[:21]):
    use[f['k']] = ('조합 아이템', f'조합 아이템 {n + 1} 발동')
# 5) 유물 발동 표시: 버프형 남은 것 10개
rel = [f for f in left if f['k'] not in use and f['kind'] in buffy]
for n, f in enumerate(rel[:10]):
    use[f['k']] = ('유물', f'유물 발동 {n + 1}')
# 6) 보스·정예 능력: 남은 공격형
for n, f in enumerate([f for f in left if f['k'] not in use][:10]):
    use[f['k']] = ('보스·정예 능력', f'몬스터 능력 {n + 1}')
for f in left:
    use.setdefault(f['k'], ('예비', '공용 세트 보강 (커먼·언커먼끼리 겹쳐도 되는 규칙)'))
cnt = defaultdict(int)
for v in use.values():
    cnt[v[0]] += 1
md = ['# 남는 스킬 이펙트 재활용 (2026-11-20)', '',
      '> 스킬 1개(TFT 식)가 되면서 레어·유니크 전용 이펙트 136개 중 대표 스킬(Lv5 = `_3`) 34개만 쓰고 102개가 남는다.',
      '> 사용자 결정: 여러 곳에 쓸 수 있는 것은 재활용. 아래는 가안 배정 (`docs/drafts/synergy/fx_reuse.py`) — 구현할 때 실제 연출을 보고 바꾼다.', '',
      '| 쓰임 | 개수 | 고르는 기준 |', '|---|---|---|',
      f"| 3성 추가 연출 | {cnt['3성 추가 연출']} | 캐릭터마다 1개. 3성이 되면 대표 스킬 위에 같은 캐릭터의 다른 연출이 겹쳐 터짐 (같은 모양 우선) — 캐릭터다움 유지 |",
      f"| 시너지 발동 | {cnt['시너지 발동']} | 12종마다 1개. 그 계열·출신 캐릭터의 버프형(3x3·아군·둘레) 연출 |",
      f"| 별 승급 | {cnt['별 승급']} | 자기 몸 연출 1개 |",
      f"| 조합 아이템 | {cnt['조합 아이템']} | 21종. 공격형(대상·범위 중심·연쇄) |",
      f"| 유물 발동 | {cnt['유물']} | 버프형 — 발동형 유물만 |",
      f"| 보스·정예 능력 | {cnt['보스·정예 능력']} | 남은 공격형 |",
      f"| 예비 | {cnt['예비']} | 커먼·언커먼 공용 세트 보강용 |", '',
      '| 이펙트 키 | 원래 캐릭터 | 모양 | 쓰임 | 자리 |', '|---|---|---|---|---|']
for f in sorted(left, key=lambda f: (use[f['k']][0], f['k'])):
    u = use[f['k']]
    md.append(f"| `{f['k']}` | {f['name']} | {f['kind']} | {u[0]} | {u[1]} |")
open(os.path.join(HERE, '..', 'rules-v2', 'FX_REUSE.md'), 'w', encoding='utf8').write('\n'.join(md) + '\n')
print(dict(cnt))
