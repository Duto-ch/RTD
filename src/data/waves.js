import { BALANCE } from '../config.js';

// 웨이브 규칙
// - 총 100웨이브
// - 일반 몬스터 수: 1웨이브 50기 → 70웨이브 200기까지 선형 증가 → 이후 200기 고정
// - 정예 웨이브: 5, 15, 25 … 95 (일반 몬스터 + 정예 10기)
// - 보스 웨이브: 10, 20, 30 … 100 (일반 몬스터 + 보스 1기)
// - 강화 보스 웨이브: 30, 60, 90 (일반 몬스터 + 정예 10기 + 강화 보스) — BALANCE.milestone
// - 보스는 느리게 이동하며, 성벽을 한 바퀴 다 돌면 즉시 게임 오버
// - 한 웨이브의 몬스터 속성은 최대 BALANCE.monster.attrsPerWave 종류
export const TOTAL_WAVES = 100;

export function isEliteWave(w) {
  return w % 10 === 5;
}
export function isBossWave(w) {
  return w % 10 === 0;
}
export function isMilestoneWave(w) {
  return BALANCE.milestone.waves.includes(w);
}

export function normalCount(w) {
  const M = BALANCE.monster;
  if (w >= M.maxCountWave) return M.maxCount;
  return Math.round(M.firstWaveCount + ((w - 1) * (M.maxCount - M.firstWaveCount)) / (M.maxCountWave - 1));
}

export function waveInfo(w) {
  const normal = normalCount(w);
  if (isMilestoneWave(w)) return { type: 'milestone', normal, elite: BALANCE.milestone.extraElites, boss: 1 };
  if (isBossWave(w)) return { type: 'boss', normal, elite: 0, boss: 1 };
  if (isEliteWave(w)) return { type: 'elite', normal, elite: 10, boss: 0 };
  return { type: 'normal', normal, elite: 0, boss: 0 };
}

/** 출현 순서: 보스가 맨 앞, 정예는 일반 몬스터 사이에 고르게 */
export function spawnList(w) {
  const info = waveInfo(w);
  const list = Array(info.normal).fill('normal');
  for (let i = 0; i < info.elite; i++) {
    list.splice(Math.floor(((i + 0.5) * list.length) / info.elite) + i, 0, 'elite');
  }
  if (info.boss) list.unshift('boss');
  return list;
}

/** 일반·정예 이동 속도 배율: 20웨이브마다 10%씩 (복리) */
export function speedMultiplier(w) {
  const M = BALANCE.monster;
  return Math.pow(M.speedStepMult, Math.floor(w / M.speedStepWaves));
}

/** 몬스터 능력치 (수치는 config.js BALANCE.monster) */
export function monsterStats(kind, w, milestone = false) {
  const M = BALANCE.monster;
  const hp = M.hpBase * Math.pow(M.hpGrowth, w - 1);
  switch (kind) {
    case 'boss':
      return { hp: hp * M.bossHpMult * (milestone ? BALANCE.milestone.hpMult : 1), speed: M.bossSpeed, gold: 150 + w * 5 };
    case 'elite':
      return { hp: hp * M.eliteHpMult, speed: M.eliteSpeed * speedMultiplier(w), gold: 20 + w };
    default:
      return { hp, speed: M.normalSpeed * speedMultiplier(w), gold: 2 + Math.floor(w / 15) };
  }
}
