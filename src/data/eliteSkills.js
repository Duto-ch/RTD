// 스킬 정예 (2026-11-24 사용자 요청): 정예 10마리 중 1마리가 특수 몬스터처럼 스킬을 쓴다 — 수치는 가안 ⚠️
//  debuff: cd 초마다 range 안 가장 가까운 용병 targets 명에게 dur 초 디버프 (보스 디버프와 같은 효과 틀 — Mercenary.debuffState)
//  aura:   range 안 몬스터(자신 포함)에 계속 — guard 받는 피해 감소 · haste 이동 속도 + · regen 초당 최대 체력 비율 회복
export const ELITE_SKILLS = [
  { id: 'elite_weaken', name: '쇠약의 저주', type: 'debuff', cd: 8, range: 260, targets: 2, dur: 5, effect: { dmg: -0.35 }, desc: '공격력 -35%' },
  { id: 'elite_slow', name: '둔화의 저주', type: 'debuff', cd: 8, range: 260, targets: 2, dur: 5, effect: { rate: -0.4 }, desc: '공속 -40%' },
  { id: 'elite_silence', name: '침묵의 저주', type: 'debuff', cd: 10, range: 260, targets: 2, dur: 4, effect: { silence: true }, desc: '스킬 봉쇄' },
  { id: 'aura_guard', name: '수호 오라', type: 'aura', range: 90, effect: { guard: 0.3 }, color: 0x7ab8ff, desc: '주변 몬스터 받는 피해 -30%' },
  { id: 'aura_haste', name: '가속 오라', type: 'aura', range: 90, effect: { haste: 0.3 }, color: 0xffd84a, desc: '주변 몬스터 이동 속도 +30%' },
  { id: 'aura_regen', name: '재생 오라', type: 'aura', range: 90, effect: { regen: 0.03 }, color: 0x7be07b, desc: '주변 몬스터 초당 체력 3% 회복' }
];
