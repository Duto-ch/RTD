import { NORMAL_DESIGNS, ELITE_DESIGNS, BOSS_DESIGNS } from '../art/monsters.js';

// 웨이브 → 몬스터 디자인
// 일반: 5웨이브마다 교체 (1~5 슬라임, 6~10 박쥐 …)
// 정예: 정예 웨이브(5, 15 … 95)마다 전용 디자인. 강화 보스 웨이브(30·60·90)의 정예는 직전 정예 디자인
// 보스: 보스 웨이브(10, 20 … 100)마다 전용 디자인. 100웨이브는 최종 보스
const clamp = (i, list) => list[Math.max(0, Math.min(list.length - 1, i))];

export function monsterDesign(kind, w) {
  if (kind === 'boss') return clamp(Math.round(w / 10) - 1, BOSS_DESIGNS);
  if (kind === 'elite') return clamp(Math.floor((w - 5) / 10), ELITE_DESIGNS);
  return clamp(Math.floor((w - 1) / 5), NORMAL_DESIGNS);
}

export const ALL_MONSTER_DESIGNS = [...NORMAL_DESIGNS, ...ELITE_DESIGNS, ...BOSS_DESIGNS];
