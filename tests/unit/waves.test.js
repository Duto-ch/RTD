import { describe, it, expect } from 'vitest';
import { normalCount, waveInfo, spawnList, speedMultiplier, monsterStats, TOTAL_WAVES } from '../../src/data/waves.js';
import { BALANCE } from '../../src/config.js';

// 사용자가 확정한 웨이브 규칙 (CLAUDE.md "확정된 결정")
describe('웨이브 규칙', () => {
  it('1웨이브 50기 → 70웨이브 200기 → 이후 200기 고정', () => {
    expect(normalCount(1)).toBe(50);
    expect(normalCount(70)).toBe(200);
    expect(normalCount(100)).toBe(200);
    for (let w = 2; w <= 70; w++) expect(normalCount(w)).toBeGreaterThanOrEqual(normalCount(w - 1));
  });

  it('정예 5·15…95 / 보스 10·20… / 강화 보스 30·60·90 / 최종 보스 100', () => {
    expect(waveInfo(5).type).toBe('elite');
    expect(waveInfo(95).type).toBe('elite');
    expect(waveInfo(10).type).toBe('boss');
    for (const w of [30, 60, 90]) expect(waveInfo(w).type).toBe('milestone');
    expect(waveInfo(TOTAL_WAVES).type).toBe('final');
    expect(waveInfo(7).type).toBe('normal');
  });

  it('정예·보스 웨이브에도 일반 몬스터가 함께 나온다', () => {
    for (const w of [5, 10, 30, 100]) expect(waveInfo(w).normal).toBe(normalCount(w));
  });

  it('출현 목록: 보스가 맨 앞, 정예 수가 맞다', () => {
    const l = spawnList(30);
    expect(l[0]).toBe('boss');
    expect(l.filter((k) => k === 'elite')).toHaveLength(BALANCE.milestone.extraElites);
    expect(spawnList(15).filter((k) => k === 'elite')).toHaveLength(10);
    expect(spawnList(3)).toHaveLength(normalCount(3));
  });

  it('일반·정예 이동 속도는 20웨이브마다 10%씩 (보스 제외)', () => {
    expect(speedMultiplier(19)).toBe(1);
    expect(speedMultiplier(20)).toBeCloseTo(1.1);
    expect(speedMultiplier(100)).toBeCloseTo(1.1 ** 5);
    expect(monsterStats('boss', 100).speed).toBe(BALANCE.monster.bossSpeed);
  });

  it('1웨이브 체력 34 (예외), 2웨이브부터 40×1.08^(w-1), 강화 보스 체력 1.5배', () => {
    expect(monsterStats('normal', 1).hp).toBe(34);
    expect(monsterStats('normal', 2).hp).toBeCloseTo(40 * 1.08);
    expect(monsterStats('normal', 10).hp).toBeCloseTo(40 * Math.pow(1.08, 9));
    expect(monsterStats('normal', 3).hp / monsterStats('normal', 2).hp).toBeCloseTo(1.08);
    expect(monsterStats('boss', 30, true).hp / monsterStats('boss', 30).hp).toBeCloseTo(1.5);
  });
});
