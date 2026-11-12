// 레벨 업 시 해당 레벨의 3종 중 1개를 랜덤 획득 (2~5레벨, 총 12종)
// 실제 효과는 Mercenary.getStats() 에서 적용된다.
export const SKILLS = {
  2: [
    { id: 'power', name: '맹공', desc: '공격력 +35%' },
    { id: 'haste', name: '속사', desc: '공격 속도 +30%' },
    { id: 'eagle', name: '독수리 눈', desc: '사거리 +20%' }
  ],
  3: [
    { id: 'crit', name: '급소 노리기', desc: '치명타 확률 +20%, 치명타 피해 2.5배' },
    { id: 'multishot', name: '다중 사격', desc: '대상 1명 추가 공격' },
    { id: 'chill', name: '냉기', desc: '공격 시 대상 25% 감속' }
  ],
  4: [
    { id: 'poison', name: '맹독', desc: '3초간 초당 공격력 40% 독 피해' },
    { id: 'splash', name: '폭발 화살', desc: '주변 적에게 50% 범위 피해' },
    { id: 'bounty', name: '현상금 사냥', desc: '처치 시 골드 +2' }
  ],
  5: [
    { id: 'execute', name: '처형', desc: '체력 12% 이하 적 즉사 (보스 제외)' },
    { id: 'frenzy', name: '광란', desc: '공격 속도 +80%' },
    { id: 'purity', name: '속성 지배', desc: '불리 상성 무시, 유리 상성 피해 2배' }
  ]
};

export const SKILL_BY_ID = Object.fromEntries(Object.values(SKILLS).flat().map((s) => [s.id, s]));
