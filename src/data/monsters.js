import { NORMAL_DESIGNS, ELITE_DESIGNS, BOSS_DESIGNS } from '../art/monsters.js';
import { BALANCE } from '../config.js';

// 웨이브 → 몬스터 디자인
// 일반: 5웨이브마다 교체 (1~5 슬라임, 6~10 박쥐 …)
// 정예: 정예 웨이브(5, 15 … 95)마다 전용 디자인. 강화 보스 웨이브(30·60·90)의 정예는 직전 정예 디자인
// 보스: 보스 웨이브(10, 20 … 100)마다 전용 디자인. 100웨이브는 최종 보스
const clamp = (i, list) => list[Math.max(0, Math.min(list.length - 1, i))];

export function monsterDesign(kind, wave) {
  const w = ((wave - 1) % 100) + 1; // 무한 웨이브: 100웨이브마다 디자인이 한 바퀴 돈다
  if (kind === 'boss') return clamp(Math.round(w / 10) - 1, BOSS_DESIGNS);
  if (kind === 'elite') return clamp(Math.floor((w - 5) / 10), ELITE_DESIGNS);
  return clamp(Math.floor((w - 1) / 5), NORMAL_DESIGNS);
}

export const ALL_MONSTER_DESIGNS = [...NORMAL_DESIGNS, ...ELITE_DESIGNS, ...BOSS_DESIGNS];

/** 특수 몬스터 외형 (2026-11-24): 종류마다 정해진 외형 — 그 웨이브 기본 외형과 같으면 다음 후보 */
export function variantDesign(variant, wave) {
  const base = monsterDesign('normal', wave);
  const ids = BALANCE.special.types[variant]?.design || [];
  const id = ids.find((x) => x !== base.id);
  return NORMAL_DESIGNS.find((d) => d.id === id) || base;
}
