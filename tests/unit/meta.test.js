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

  it('뿌리 1개에서 4갈래로 뻗는 트리, 부모는 같은 갈래(줄기는 뿌리), id 중복 없음', () => {
    expect(UPGRADES.length).toBeGreaterThanOrEqual(40);
    expect(UPGRADES.filter((u) => !u.parent).map((u) => u.id)).toEqual(['origin']);
    expect(new Set(UPGRADES.map((u) => u.id)).size).toBe(UPGRADES.length);
    for (const u of UPGRADES) {
      if (!u.parent) continue;
      const p = UPGRADE_BY_ID[u.parent];
      expect(p).toBeTruthy();
      if (p.id !== 'origin') expect(p.branch).toBe(u.branch);
    }
    expect(UPGRADES.filter((u) => u.parent === 'origin').map((u) => u.branch).sort()).toEqual(['attack', 'defense', 'economy', 'tactics']);
    // 예전 저장(12종)의 id 는 모두 남아 있다
    for (const id of ['atk', 'rate', 'crit', 'giant', 'funds', 'bounty', 'network', 'pedigree', 'tower', 'manual', 'merger', 'vault']) expect(UPGRADE_BY_ID[id]).toBeTruthy();
  });

  it('비용은 레벨마다 커진다', () => {
    for (const u of UPGRADES.filter((x) => x.max > 1)) expect(upgradeCost(u, 5)).toBeGreaterThan(upgradeCost(u, 0)); // 1레벨짜리(뿌리 등)는 제외
    expect(formatEffect(UPGRADE_BY_ID.atk, 3)).toBe('+30%');
    expect(formatEffect(UPGRADE_BY_ID.network, 2)).toBe('-2G');
  });

  it('명성으로 사고, 선행 강화가 없으면 잠김, 최대 레벨에서 멈춤', () => {
    expect(meta.buy('atk')).toBe(false); // 명성 0
    meta.addFame(1000);
    expect(meta.status('atk')).toBe('locked'); // 뿌리를 먼저
    expect(meta.buy('origin')).toBe(true);
    expect(meta.status('rate')).toBe('locked');
    expect(meta.buy('atk')).toBe(true);
    expect(meta.fame).toBe(1000 - upgradeCost(UPGRADE_BY_ID.origin, 0) - upgradeCost(UPGRADE_BY_ID.atk, 0));
    expect(meta.status('rate')).toBe('ok');
    expect(meta.bonus().dmg).toBeCloseTo(0.15); // 뿌리 5% + 단련된 무기 10%
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
