import { BALANCE } from '../config.js';

// 웨이브 규칙
// - 총 100웨이브
// - 일반 몬스터 수: 1웨이브 40기 → 70웨이브 200기까지 선형 증가 → 이후 200기 고정
// - 정예 웨이브: 5, 15, 25 … 95 (일반 몬스터 + 정예 10기)
// - 보스 웨이브: 10, 20, 30 … 100 (일반 몬스터 + 보스 1기)
// - 보스는 느리게 이동하며, 성벽을 한 바퀴 다 돌면 즉시 게임 오버
export const TOTAL_WAVES = 100;

export function isEliteWave(w) {
  return w % 10 === 5;
}
export function isBossWave(w) {
  return w % 10 === 0;
}

export function normalCount(w) {
  if (w >= 70) return 200;
  return Math.round(40 + ((w - 1) * 160) / 69);
}

export function waveInfo(w) {
  const normal = normalCount(w);
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

/** 몬스터 능력치 (수치는 config.js BALANCE.monster) */
export function monsterStats(kind, w) {
  const M = BALANCE.monster;
  const hp = M.hpBase * Math.pow(M.hpGrowth, w - 1);
  switch (kind) {
    case 'boss':
      return { hp: hp * M.bossHpMult, speed: M.bossSpeed, gold: 150 + w * 5 };
    case 'elite':
      return { hp: hp * M.eliteHpMult, speed: M.eliteSpeed, gold: 20 + w };
    default:
      return { hp, speed: M.normalSpeed, gold: 2 + Math.floor(w / 15) };
  }
}
