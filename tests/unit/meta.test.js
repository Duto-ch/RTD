import { describe, it, expect, beforeEach } from 'vitest';
import { UPGRADES, UPGRADE_BY_ID, upgradeCost, metaBonus, formatEffect, FAME } from '../../src/data/upgrades.js';
import { meta } from '../../src/systems/meta.js';
import { BALANCE } from '../../src/config.js';
import { monsterStats } from '../../src/data/waves.js';

describe('명성 강화 트리 (인크리멘탈)', () => {
  beforeEach(() => meta.reset());

  it('강화가 없으면 효과는 전부 0', () => {
    for (const v of Object.values(metaBonus({}))) expect(v).toBe(0);
  });

  it('갈래 3개 × 4칸, 선행 강화는 모두 존재하고 같은 갈래', () => {
    expect(UPGRADES).toHaveLength(12);
    for (const u of UPGRADES) if (u.req) expect(UPGRADE_BY_ID[u.req].branch).toBe(u.branch);
  });

  it('비용은 레벨마다 커진다', () => {
    for (const u of UPGRADES) expect(upgradeCost(u, 5)).toBeGreaterThan(upgradeCost(u, 0));
    expect(formatEffect(UPGRADE_BY_ID.atk, 3)).toBe('+45%');
    expect(formatEffect(UPGRADE_BY_ID.network, 2)).toBe('-2G');
  });

  it('명성으로 사고, 선행 강화가 없으면 잠김, 최대 레벨에서 멈춤', () => {
    expect(meta.buy('atk')).toBe(false); // 명성 0
    meta.addFame(1000);
    expect(meta.status('rate')).toBe('locked');
    expect(meta.buy('atk')).toBe(true);
    expect(meta.fame).toBe(1000 - upgradeCost(UPGRADE_BY_ID.atk, 0));
    expect(meta.status('rate')).toBe('ok');
    expect(meta.bonus().dmg).toBeCloseTo(0.15);
    meta.data.levels.vault = 2;
    expect(meta.status('vault')).toBe('max');
  });

  it('명성: 버틴 웨이브마다 1 + 웨이브/10, 보스 보너스', () => {
    expect(FAME.perWave(1)).toBe(1);
    expect(FAME.perWave(25)).toBe(3);
    expect(FAME.boss).toBeLessThan(FAME.milestoneBoss);
  });
});

describe('하드 난이도', () => {
  it('300골드로 시작, 몬스터 체력은 노멀보다 높다', () => {
    expect(BALANCE.hard.startGold).toBe(300);
    expect(monsterStats('normal', 1, false, 1).hp).toBe(monsterStats('normal', 1).hp * BALANCE.hard.hpMult);
    expect(monsterStats('normal', 1, false, 1).hp).toBeGreaterThan(monsterStats('normal', 1).hp);
  });
});
