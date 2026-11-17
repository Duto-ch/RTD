import { describe, it, expect } from 'vitest';
import { normalCount, waveInfo, spawnList, speedMultiplier, monsterStats, isFinalWave } from '../../src/data/waves.js';
import { biomeForWave, BIOMES } from '../../src/data/biomes.js';
import { monsterDesign } from '../../src/data/monsters.js';
import { BALANCE } from '../../src/config.js';

// 사용자가 확정한 웨이브 규칙 (CLAUDE.md "확정 규칙 — 전투")
describe('웨이브 규칙', () => {
  it('1웨이브 50기 → 70웨이브 200기 → 이후 200기 고정', () => {
    expect(normalCount(1)).toBe(50);
    expect(normalCount(70)).toBe(200);
    expect(normalCount(100)).toBe(200);
    for (let w = 2; w <= 70; w++) expect(normalCount(w)).toBeGreaterThanOrEqual(normalCount(w - 1));
  });

  it('정예 5·15… / 보스 10·20… / 강화 보스 30의 배수 / 최종 보스 100의 배수 (무한 웨이브)', () => {
    expect(waveInfo(5).type).toBe('elite');
    expect(waveInfo(95).type).toBe('elite');
    expect(waveInfo(105).type).toBe('elite');
    expect(waveInfo(10).type).toBe('boss');
    for (const w of [30, 60, 90, 120, 150, 180, 210]) expect(waveInfo(w).type).toBe('milestone');
    for (const w of [100, 200, 300]) expect(waveInfo(w).type).toBe('final');
    expect(isFinalWave(150)).toBe(false);
    expect(waveInfo(7).type).toBe('normal');
    expect(waveInfo(250).normal).toBe(200);
  });

  it('무한 웨이브: 지역·몬스터 디자인은 100웨이브마다 한 바퀴 돈다', () => {
    expect(biomeForWave(101)).toBe(BIOMES[0]);
    expect(biomeForWave(195)).toBe(biomeForWave(95));
    expect(monsterDesign('boss', 200)).toBe(monsterDesign('boss', 100));
    expect(monsterDesign('normal', 133)).toBe(monsterDesign('normal', 33));
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
    expect(speedMultiplier(400)).toBe(BALANCE.monster.speedMaxMult); // 무한 웨이브: 상한
    expect(monsterStats('boss', 100).speed).toBe(BALANCE.monster.bossSpeed);
  });

  it('1웨이브 체력 34 (예외), 2웨이브부터 40×1.08^(w-1), 전체 30% 완화(×0.7), 강화 보스 체력 1.5배', () => {
    expect(BALANCE.monster.hpScale).toBe(0.7);
    expect(monsterStats('normal', 1).hp).toBeCloseTo(34 * 0.7);
    expect(monsterStats('normal', 2).hp).toBeCloseTo(40 * 1.08 * 0.7);
    expect(monsterStats('normal', 10).hp).toBeCloseTo(40 * Math.pow(1.08, 9) * 0.7);
    expect(monsterStats('normal', 3).hp / monsterStats('normal', 2).hp).toBeCloseTo(1.08);
    expect(monsterStats('boss', 30, true).hp / monsterStats('boss', 30).hp).toBeCloseTo(1.5);
  });
});
