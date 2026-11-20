// ── 술집 (룰 v2 ③, 2026-11-20 사용자 확정 — 값은 가안 ⚠️) ─────────────
// 영지의 술집에 캐릭터 3명이 걸려 있고 3시간(실제 시간)마다 새로 바뀐다. 마정석으로 고용 → 가진 캐릭터(덱에 넣을 수 있음).
// 이미 가진 캐릭터를 고용하면 그 캐릭터 강화 +1 (공격력 +10%, 최대 +3), 그 뒤 중복은 마정석 절반을 돌려받는다.
// 리롤도 마정석: 기본 3 에서 할 때마다 ×1.5, 시간 갱신 때 원래 값으로.
import { ROSTER, GRADES } from './roster.js';

export const TAVERN = {
  slots: 3,
  refreshMs: 3 * 60 * 60 * 1000, // 3시간
  cost: { 1: 1, 2: 2, 3: 4, 4: 8 }, // 등급별 고용값(마정석)
  reroll: { base: 3, mult: 1.5 },
  odds: [45, 30, 18, 7], // 걸리는 등급 확률(%) 커먼·언커먼·레어·유니크
  enhanceMax: 3,
  enhanceDmg: 0.1 // 강화 +1 당 공격력 +10%
};

/** 마정석 획득 — 보스 처치 (가안) */
export const STONES = { boss: 2, milestone: 5, final: 10 };

export const hireCost = (c) => TAVERN.cost[c.grade];
/** n 번째(0부터) 리롤 값 */
export const tavernRerollCost = (n) => Math.ceil(TAVERN.reroll.base * Math.pow(TAVERN.reroll.mult, n));
/** 이 시각이 속한 갱신 구간의 끝 (3시간 경계) */
export const nextRefresh = (now) => (Math.floor(now / TAVERN.refreshMs) + 1) * TAVERN.refreshMs;

/** 술집 한 칸: 등급 확률 → 그 등급 중 무작위 (exclude: 이미 걸린 캐릭터) */
export function rollTavern(rand = Math.random, exclude = new Set()) {
  let r = rand() * 100;
  let grade = 4;
  for (let g = 1; g <= 4; g++) {
    if (r < TAVERN.odds[g - 1]) {
      grade = g;
      break;
    }
    r -= TAVERN.odds[g - 1];
  }
  const pool = ROSTER.filter((c) => c.grade === grade && !exclude.has(c.id));
  const all = pool.length ? pool : ROSTER.filter((c) => !exclude.has(c.id));
  return all[Math.floor(rand() * all.length)];
}

/** 술집 3칸 새로 */
export function rollTavernSlots(rand = Math.random) {
  const ex = new Set();
  const out = [];
  for (let i = 0; i < TAVERN.slots; i++) {
    const c = rollTavern(rand, ex);
    ex.add(c.id);
    out.push({ id: c.id, hired: false });
  }
  return out;
}

export { GRADES };
