// 보스 처치 시 랜덤 드랍되는 유물 — 필드 전체 버프, 중복 획득 시 효과 누적
export const RELICS = [
  { id: 'war_drum', name: '전쟁의 북', desc: '모든 용병 공격 속도 +15%', palette: { A: '#c0392b', a: '#7b241c', L: '#f1948a' } },
  { id: 'hero_sword', name: '용사의 검', desc: '모든 용병 공격력 +20%', palette: { A: '#bdc3c7', a: '#707b7c', L: '#ffffff' } },
  { id: 'hawk_eye', name: '매의 눈', desc: '모든 용병 사거리 +15%', palette: { A: '#d4ac0d', a: '#7d6608', L: '#f9e79f' } },
  { id: 'golden_grail', name: '황금 성배', desc: '처치 골드 +25%', palette: { A: '#f1c40f', a: '#9a7d0a', L: '#fdf2b3' } },
  { id: 'red_orb', name: '홍염의 보주', desc: '레드 용병 공격력 +40%', palette: { A: '#e74c3c', a: '#922b21', L: '#ffb4a8' } },
  { id: 'blue_orb', name: '창해의 보주', desc: '블루 용병 공격력 +40%', palette: { A: '#3498db', a: '#1a5276', L: '#aed6f1' } },
  { id: 'green_orb', name: '녹림의 보주', desc: '그린 용병 공격력 +40%', palette: { A: '#2ecc71', a: '#196f3d', L: '#abebc6' } },
  { id: 'frost_crown', name: '서리 왕관', desc: '모든 몬스터 이동 속도 -10%', palette: { A: '#76d7ea', a: '#2e86ab', L: '#e0f7fa' } },
  { id: 'contract', name: '용병 계약서', desc: '고용 비용 -20% (중복 효과 없음)', palette: { A: '#d7bde2', a: '#7d3c98', L: '#f5eef8' } },
  { id: 'lucky_coin', name: '행운의 동전', desc: '모든 용병 치명타 확률 +10%', palette: { A: '#58d68d', a: '#1d8348', L: '#d5f5e3' } }
];

export const RELIC_BY_ID = Object.fromEntries(RELICS.map((r) => [r.id, r]));
