import json, base64, os
HERE = os.path.dirname(os.path.abspath(__file__))
idx = json.load(open(os.path.join(HERE, 'index.json')))
def uri(p): return 'data:image/png;base64,' + base64.b64encode(open(p, 'rb').read()).decode()
for e in idx:
    e['src'] = uri(os.path.join(HERE, 'sheets', e.pop('file')))
    if e.get('back'): e['backSrc'] = uri(os.path.join(HERE, 'sheets', e.pop('back')))
ch = uri(os.path.join(HERE, '../../../../public/assets/custom/chars/kaira.png'))
DESC = {'hit': '단일·다수 공격 — 맞은 몬스터마다 터진다', 'blast': '원형 범위 피해', 'slow': '원형 + 감속: 끈적한 웅덩이', 'stun': '원형 + 기절: 충격 고리 + 머리 위 별',
        'push': '원형 + 밀치기: 바깥으로 밀어내는 화살촉', 'dot': '원형 + 지속 피해: 끓는 웅덩이', 'vuln': '약화: 깨지는 방패 표시', 'pulse': '사거리 안 전체: 넓게 퍼지는 고리',
        'buff_adj': '주변 아군 버프: 3×3 칸이 가운데부터 차례로 밝아짐', 'buff_self': '자기 버프: 발밑 고리 + 오르는 화살표', 'gold': '골드 획득: 동전이 튀어 오름',
        'chain': '연쇄: 대상 사이를 잇는 번개 (언커먼 전용)', 'buff_all': '아군 전체 버프: 각 아군에게 빛 화살 (언커먼 전용)'}
html = open(os.path.join(HERE, 'page_tpl.html')).read().replace('__DATA__', json.dumps({'fx': idx, 'char': ch, 'desc': DESC}, ensure_ascii=False))
open('/tmp/claude-0/-home-user-rtd/5413c952-d8c2-5a72-ae63-36cb90a211c9/scratchpad/fxsets.html', 'w').write(html)
print(len(html))
