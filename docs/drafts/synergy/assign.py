"""시너지 시안 데이터 (2026-11-20) — 60명 = 계열 1 + 출신 1. 결과: synergy.json"""
import json, os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
roster = json.loads(subprocess.check_output(['node', '-e', "import('./src/data/roster.js').then(({ROSTER})=>console.log(JSON.stringify(ROSTER.map(r=>({id:r.id,name:r.name,grade:r.grade,style:r.style,title:r.title,original:!!r.original})))))"], cwd=ROOT))
DROP = ['karsten', 'bern', 'edda', 'fergus']   # 언커먼 30명 중 빼는 4명 (출신 숫자 맞춤)
ORIGIN = {
    'north': ['ragnar', 'brynhild', 'halvard', 'bjorn', 'ulf', 'atle', 'einar', 'stein', 'ylva'],
    'knight': ['arthur', 'eleanor', 'kristin', 'adel', 'claire', 'henrik', 'leo', 'kaira', 'sigurd', 'gareth'],
    'tower': ['isolde', 'solveig', 'elva', 'verona', 'celeste', 'aidan', 'bridget', 'olaf', 'gilbert', 'greta'],
    'grove': ['oberon', 'freydis', 'rowena', 'elias', 'gwen', 'thorn', 'freya', 'thea', 'elin', 'marit'],
    'lake': ['vivian', 'serena', 'william', 'rosalind', 'haakon', 'theodore', 'asta', 'liv', 'agnes', 'sigrid'],
    'guild': ['richard', 'winston', 'thorsten', 'ivar', 'cecilia', 'oscar', 'jonathan', 'colin', 'siri', 'nora', 'nix'],
}
CLASS_OF_STYLE = {'brawl': 'warrior', 'bow': 'ranger', 'heavy': 'ranger', 'rapid': 'assassin', 'blast': 'gunner', 'hex': 'hexer', 'aid': 'support'}
o_of = {cid: o for o, ids in ORIGIN.items() for cid in ids}
chars = []
for r in roster:
    if r['grade'] < 2 or r['id'] in DROP:
        continue
    assert r['id'] in o_of, r['id']
    chars.append({**r, 'cls': CLASS_OF_STYLE[r['style']], 'origin': o_of[r['id']]})
assert len(chars) == 60, len(chars)
from collections import Counter
print(Counter(c['cls'] for c in chars), Counter(c['origin'] for c in chars), Counter(c['grade'] for c in chars))
TRAITS = {
    # 계열 (공격 특징 6가지) — 그 계열 캐릭터만 강화, 마지막 단계만 팀 전체
    'warrior': {'kind': 'class', 'name': '전사', 'color': '#c0563c', 'glyph': '검', 'desc': '길 가까이에서 베는 근접 계열. 바깥 줄(전열)에 있으면 효과 1.5배',
                'tiers': [[2, '전사 공격력 +15%'], [4, '전사 공격력 +35%, 3번째 공격마다 주변 베기'], [6, '전사 공격력 +60%, 모든 공격이 주변 베기'], [8, '팀 전체 공격력 +20%']]},
    'ranger': {'kind': 'class', 'name': '사수', 'color': '#5f8f3e', 'glyph': '활', 'desc': '활·석궁·총. 멀리서 한 마리씩 정확하게. 가운데 3×3(후열)이면 사거리 +1칸',
               'tiers': [[2, '사수 사거리 +10%'], [4, '사거리 +20%, 관통 +2'], [6, '사거리 +30%, 정예·보스 피해 +40%']]},
    'assassin': {'kind': 'class', 'name': '암살자', 'color': '#6b4a8f', 'glyph': '단', 'desc': '단검·쌍검으로 빠르게. 치명타가 핵심',
                 'tiers': [[2, '암살자 치명타 +15%, 치명 피해 +30%'], [4, '치명타 +30%, 치명 피해 +60%'], [6, '치명타 시 30% 확률로 즉시 한 번 더 공격']]},
    'gunner': {'kind': 'class', 'name': '포격수', 'color': '#d9822b', 'glyph': '폭', 'desc': '폭발·범위 공격. 물량(250기) 담당',
               'tiers': [[2, '포격수 폭발 범위 +15%'], [4, '범위 +30%, 폭발 자리에 불길 1초'], [6, '범위 +50%, 폭발이 두 번 터짐']]},
    'hexer': {'kind': 'class', 'name': '주술사', 'color': '#3f7f86', 'glyph': '술', 'desc': '지속 피해·약화·감속을 거는 계열',
              'tiers': [[2, '주술 효과(지속 피해·약화·감속) +30%'], [4, '주술 효과 +70%, 주술 걸린 적이 죽으면 옆 적에게 옮음'], [6, '모든 아군 공격에 약화(받는 피해 +15%) 부여']]},
    'support': {'kind': 'class', 'name': '지원가', 'color': '#c9a227', 'glyph': '깃', 'desc': '오라·버프·골드. 혼자 약하지만 팀을 키움',
                'tiers': [[2, '팀 전체 공격 속도 +8%'], [4, '공격 속도 +18%, 버프 지속 2배'], [6, '공격 속도 +30%, 웨이브마다 골드 +5']]},
    # 출신 6가지 — 그 출신 캐릭터만 강화 (3·6·9)
    'north': {'kind': 'origin', 'name': '북방 전사단', 'color': '#a8432f', 'glyph': '북', 'desc': '뿔투구·도끼·곰가죽. 싸울수록 분노가 쌓인다',
              'tiers': [[3, '공격할 때마다 분노 1중첩(최대 10), 중첩당 공격 속도 +2%'], [6, '중첩당 +4%, 10중첩이면 공격력 +20%'], [9, '중첩당 +6%, 분노가 웨이브 사이에도 유지']]},
    'knight': {'kind': 'origin', 'name': '왕국 기사단', 'color': '#4a6fa8', 'glyph': '방', 'desc': '판금·방패·창. 성벽을 지킨다',
               'tiers': [[3, '성벽이 받는 피해 -15%'], [6, '성벽 피해 -30%, 웨이브 시작 때 성벽 실드 10'], [9, '성벽 피해 -50%, 실드 25, 기사단 공격력 +25%']]},
    'tower': {'kind': 'origin', 'name': '마탑', 'color': '#8a4fb5', 'glyph': '탑', 'desc': '로브·지팡이·연금술. 스킬이 자주 터진다',
              'tiers': [[3, '마탑 스킬 쿨타임 -10%'], [6, '쿨타임 -20%, 스킬 피해 +20%'], [9, '쿨타임 -35%, 25% 확률로 스킬 두 번 시전']]},
    'grove': {'kind': 'origin', 'name': '숲의 수호자', 'color': '#3e8a50', 'glyph': '숲', 'desc': '나무·꽃·요정. 길을 덩굴로 묶는다',
              'tiers': [[3, '길 위 모든 몬스터 이동 속도 -5%'], [6, '-10%, 8초마다 무작위 지점 덩굴 속박 1.5초'], [9, '-18%, 속박 범위 2배, 정예도 묶임']]},
    'lake': {'kind': 'origin', 'name': '호수의 성역', 'color': '#3a8fb0', 'glyph': '물', 'desc': '물·얼음·성녀. 성벽을 회복시킨다',
             'tiers': [[3, '웨이브를 깰 때 성벽 체력 +2'], [6, '+5, 성역 캐릭터 스킬 피해 +20%'], [9, '+10, 성벽이 0이 되면 한 판에 한 번 50%로 되살아남']]},
    'guild': {'kind': 'origin', 'name': '용병 길드', 'color': '#9a7a3a', 'glyph': '금', 'desc': '총·석궁·도적. 돈을 번다',
              'tiers': [[3, '처치 골드 +10%'], [6, '처치 골드 +25%, 웨이브 끝에 가진 골드의 5% 이자(최대 20)'], [9, '처치 골드 +50%, 이자 10%(최대 50), 상점 리롤 1회 무료/웨이브']]},
}
json.dump({'chars': chars, 'drop': DROP, 'traits': TRAITS}, open(os.path.join(HERE, 'synergy.json'), 'w'), ensure_ascii=False, indent=1)
