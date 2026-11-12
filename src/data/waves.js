// 웨이브 규칙
// - 총 100웨이브
// - 일반 몬스터 수: 1웨이브 40기 → 70웨이브 200기까지 선형 증가 → 이후 200기 고정
// - 정예 웨이브: 5, 15, 25 … 95 (정예 10기)
// - 보스 웨이브: 10, 20, 30 … 100 (보스 1기)
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
  if (isBossWave(w)) return { type: 'boss', count: 1 };
  if (isEliteWave(w)) return { type: 'elite', count: 10 };
  return { type: 'normal', count: normalCount(w) };
}

/** 몬스터 능력치 (밸런스 조정 포인트) */
export function monsterStats(kind, w) {
  const hp = 22 * Math.pow(1.068, w - 1);
  switch (kind) {
    case 'boss':
      return { hp: hp * 100, speed: 40, gold: 150 + w * 5 };
    case 'elite':
      return { hp: hp * 10, speed: 55, gold: 20 + w };
    default:
      return { hp, speed: 70, gold: 2 + Math.floor(w / 15) };
  }
}
