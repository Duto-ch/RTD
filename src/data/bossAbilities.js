// 보스 디버프 능력 — 보스가 등장할 때 1~2개 랜덤 보유 (BALANCE.boss.abilityCount)
// 쿨타임(cd)마다 필드의 용병/영웅 중 랜덤 대상들에게 dur 초간 디버프를 건다.
// effect: rate(공격 속도 비율 변화) / dmg(공격력 비율 변화) / cdRate(스킬 쿨타임 회복 속도 배율)
//         silence(스킬 봉쇄) / stun(행동 불가: 공격·스킬 모두 정지)
export const BOSS_ABILITIES = [
  { id: 'sluggish', name: '둔화의 저주', cd: 9, dur: 6, effect: { rate: -0.4 }, desc: '공속 -40%' },
  { id: 'time_rot', name: '시간 부식', cd: 10, dur: 8, effect: { cdRate: 0.5 }, desc: '쿨타임 회복 절반' },
  { id: 'silence', name: '침묵의 포효', cd: 12, dur: 5, effect: { silence: true }, desc: '스킬 봉쇄' },
  { id: 'weaken', name: '쇠약', cd: 9, dur: 6, effect: { dmg: -0.35 }, desc: '공격력 -35%' },
  { id: 'terror', name: '공포', cd: 14, dur: 2.5, effect: { stun: true }, desc: '행동 불가' }
];

export function describeBossAbility(a) {
  return `${a.desc} ${a.dur}초 (${a.cd}초마다)`;
}
