import { describe, it, expect } from 'vitest';
import { normalCount, waveInfo, spawnList, speedMultiplier, monsterStats, isFinalWave, earlyHpMult, specialTypes, specialCounts, eliteCount, eliteCasters } from '../../src/data/waves.js';
import { variantDesign, monsterDesign } from '../../src/data/monsters.js';
import { STYLES } from '../../src/data/roster.js';
import { biomeForWave, BIOMES } from '../../src/data/biomes.js';
import { monsterDesign } from '../../src/data/monsters.js';
import { BALANCE } from '../../src/config.js';

// 사용자가 확정한 웨이브 규칙 (CLAUDE.md "확정 규칙 — 전투")
describe('웨이브 규칙', () => {
  it('1웨이브 50기 → 70웨이브 200기 → 이후 200기 고정 (× 물량 1.8 × 출현 배율 2/3)', () => {
    // 물량 ×1.8 (2026-11-24, 이전 ×5) + 출현 수 1/3 감소 (2026-11-20, countScale 2/3): 1웨이브 60기 · 70웨이브부터 240기
    expect(BALANCE.horde.mult).toBe(1.8);
    expect(BALANCE.horde.countScale).toBeCloseTo(2 / 3);
    expect(normalCount(1)).toBe(60);
    expect(normalCount(70)).toBe(240);
    expect(normalCount(100)).toBe(240);
    for (let w = 2; w <= 70; w++) expect(normalCount(w)).toBeGreaterThanOrEqual(normalCount(w - 1));
    // countScale 은 출현 수만 바꾼다 — 마리당 체력은 그대로
    const hp = monsterStats('normal', 10).hp;
    BALANCE.horde.countScale = 1;
    expect(normalCount(1)).toBe(90);
    expect(monsterStats('normal', 10).hp).toBe(hp);
    BALANCE.horde.countScale = 2 / 3;
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
    expect(waveInfo(250).normal).toBe(240);
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

  it('출현 목록: 보스가 맨 앞, 정예 수가 맞다 (2026-11-24: 정예 5웨이브 10 → 75웨이브 30, 10마리마다 스킬 정예 1)', () => {
    const l = spawnList(30);
    const elites = (w) => spawnList(w).filter((k) => k.startsWith('elite'));
    expect(l[0]).toBe('boss');
    expect(elites(5)).toHaveLength(10);
    expect(elites(15)).toHaveLength(13);
    expect(elites(30)).toHaveLength(17); // 강화 보스 웨이브도 같은 식
    expect(elites(75)).toHaveLength(30);
    expect(elites(95)).toHaveLength(30); // 그 뒤 30 고정
    for (let w = 15; w <= 75; w += 10) expect(eliteCount(w)).toBeGreaterThan(eliteCount(w - 10));
    // 스킬 정예: 정예 10마리마다 1마리
    expect(spawnList(5).filter((k) => k === 'elite:caster')).toHaveLength(1);
    expect(spawnList(45).filter((k) => k === 'elite:caster')).toHaveLength(2);
    expect(spawnList(75).filter((k) => k === 'elite:caster')).toHaveLength(3);
    expect(eliteCasters(75)).toBe(3);
    expect(spawnList(3)).toHaveLength(normalCount(3));
  });

  it('일반·정예 이동 속도는 20웨이브마다 10%씩 (보스 제외)', () => {
    expect(speedMultiplier(19)).toBe(1);
    expect(speedMultiplier(20)).toBeCloseTo(1.1);
    expect(speedMultiplier(100)).toBeCloseTo(1.1 ** 5);
    expect(speedMultiplier(400)).toBe(BALANCE.monster.speedMaxMult); // 무한 웨이브: 상한
    expect(monsterStats('boss', 100).speed).toBe(BALANCE.monster.bossSpeed);
  });

  it('패배 조건: 성벽 체력 80, 한 바퀴마다 일반 1(2026-11-24 사용자 결정)·정예 3·보스 30·강화 보스 40·최종 보스 80', () => {
    expect(BALANCE.wall.hp).toBe(80);
    expect(BALANCE.wall.dmg).toEqual({ normal: 1, elite: 3, boss: 30, milestone: 40, final: 80 });
  });

  it('1웨이브 체력 34 (예외), 2웨이브부터 40×1.08^(w-1), 전체 배율 ×1.0(2026-11-24, 이전 ×0.7), 강화 보스 체력 1.5배', () => {
    expect(BALANCE.monster.hpScale).toBe(1.0);
    // 물량: 일반 몬스터 마리당 체력은 1/1.8 (2026-11-24, 이전 1/5 — 웨이브 전체 체력 총량은 그대로). 정예·보스는 기준 체력의 10배·110배 그대로
    // 초반 내구성 (2026-11-24): 일반 몬스터만 1웨이브 ×4 → 60웨이브 ×1
    expect(monsterStats('normal', 1).hp).toBeCloseTo(((34 * 1.0) / 1.8) * 4);
    expect(monsterStats('normal', 2).hp).toBeCloseTo(((40 * 1.08 * 1.0) / 1.8) * earlyHpMult(2));
    expect(monsterStats('normal', 10).hp).toBeCloseTo(((40 * Math.pow(1.08, 9) * 1.0) / 1.8) * earlyHpMult(10));
    expect(monsterStats('normal', 70).hp).toBeCloseTo(((40 * Math.pow(1.08, 69) * 1.0) / 1.8) * 1.5); // 11웨이브부터 ×1.5
    expect(monsterStats('elite', 2).hp).toBeCloseTo(40 * 1.08 * 1.0 * 15); // 정예 스펙 ×1.5 (2026-11-24, 이전 10배)
    expect(monsterStats('boss', 10).hp).toBeCloseTo(40 * Math.pow(1.08, 9) * 1.0 * 110);
    expect(normalCount(2) * monsterStats('normal', 2).gold).toBeCloseTo((normalCount(2) / 1.8) * 2); // 골드 총량 유지
    expect(monsterStats('normal', 71).hp / monsterStats('normal', 70).hp).toBeCloseTo(1.08);
    expect(monsterStats('boss', 30, true).hp / monsterStats('boss', 30).hp).toBeCloseTo(1.5);
  });

  it('초반 내구성 (2026-11-24): 1웨이브 ×4 → 60웨이브 ×1 로 줄고, 웨이브마다 일반 몬스터 체력은 줄지 않는다', () => {
    expect(earlyHpMult(1)).toBe(4);
    expect(earlyHpMult(30)).toBeCloseTo(Math.pow(4, 30 / 59));
    expect(earlyHpMult(60)).toBe(1);
    expect(earlyHpMult(80)).toBe(1);
    for (let w = 2; w <= 70; w++) expect(monsterStats('normal', w).hp).toBeGreaterThanOrEqual(monsterStats('normal', w - 1).hp);
    expect(monsterStats('elite', 5).hp).toBeCloseTo(40 * Math.pow(1.08, 4) * 1.0 * 15); // 정예·보스는 초반 배율 없음
  });

  it('특수 몬스터 (2026-11-24): 웨이브 안에 섞기 — 빠름 2·방어력 5·물리 저항 8·마법 저항 11웨이브부터, 한 웨이브 최대 2종, 15% → 40%', () => {
    expect(specialTypes(1)).toEqual([]);
    expect(specialTypes(2)).toEqual(['swift']);
    for (let w = 1; w <= 200; w++) {
      const types = specialTypes(w);
      expect(types.length).toBeLessThanOrEqual(2);
      expect(new Set(types).size).toBe(types.length);
      const ww = ((w - 1) % 100) + 1;
      for (const id of types) expect(ww).toBeGreaterThanOrEqual(BALANCE.special.types[id].from);
      // 출현 목록: 총 수는 그대로, 특수 몬스터 수 = specialCounts
      const list = spawnList(w);
      const sp = list.filter((k) => k.startsWith('normal:')).length;
      expect(list.filter((k) => k.startsWith('normal')).length).toBe(normalCount(w));
      expect(sp).toBe(Object.values(specialCounts(w)).reduce((a, b) => a + b, 0));
    }
    // 다섯 종류 모두 언젠가 나온다 (기절 2026-11-24)
    const seen = new Set();
    for (let w = 1; w <= 100; w++) for (const id of specialTypes(w)) seen.add(id);
    expect([...seen].sort()).toEqual(['armored', 'magicResist', 'physResist', 'stunner', 'swift']);
    // 비율: 처음 15%, 33웨이브부터 40%
    expect(spawnList(2).filter((k) => k.startsWith('normal:')).length).toBe(Math.round(normalCount(2) * 0.15));
    expect(spawnList(40).filter((k) => k.startsWith('normal:')).length).toBe(Math.round(normalCount(40) * 0.4));
    // 특수 몬스터는 웨이브 앞쪽에 몰리지 않고 고르게 섞인다
    const l = spawnList(40);
    const firstHalf = l.slice(0, l.length / 2).filter((k) => k.startsWith('normal:')).length;
    expect(firstHalf / l.filter((k) => k.startsWith('normal:')).length).toBeGreaterThan(0.35);
  });

  it('특수 몬스터 능력치: 빠름(속도 ×1.6·체력 ×0.7) · 방어력(체력 ×1.3, 방어력 = 일반 체력의 12%) · 저항(그 공격 35%) — 체력은 모두 ×1.5 (2026-11-24)', () => {
    const base = monsterStats('normal', 20);
    const swift = monsterStats('normal', 20, false, 'swift');
    expect(swift.speed).toBeCloseTo(base.speed * 1.6);
    expect(swift.hp).toBeCloseTo(base.hp * 0.7 * 1.5); // 특수 몬스터 스펙 ×1.5 (2026-11-24)
    const arm = monsterStats('normal', 20, false, 'armored');
    expect(arm.hp).toBeCloseTo(base.hp * 1.3 * 1.5);
    expect(arm.armor).toBeCloseTo(base.hp * 0.12);
    expect(monsterStats('normal', 20, false, 'physResist').resist).toBe('phys');
    expect(monsterStats('normal', 20, false, 'magicResist').resist).toBe('magic');
    expect(BALANCE.special.resist).toBe(0.35);
    // 공격 스타일 피해 종류: 물리 = 연사·속공·저격·근접, 마법 = 주술·지원, 폭발은 따로
    expect(Object.fromEntries(Object.entries(STYLES).map(([k, v]) => [k, v.type]))).toEqual({ bow: 'phys', rapid: 'phys', heavy: 'phys', blast: 'blast', hex: 'magic', brawl: 'phys', aid: 'magic' });
    // 외형: 종류마다 정해진 외형, 그 웨이브 기본 외형과 겹치면 다음 후보
    expect(variantDesign('swift', 10).id).toBe('wolf');
    expect(monsterDesign('normal', 28).id).toBe('wolf');
    expect(variantDesign('swift', 28).id).toBe('hound');
  });

  it('정비 시간 (2026-11-24 사용자 결정): 웨이브마다 시작 전 15초 · 웨이브 간격 타이머(waveDuration)는 없다 — 몬스터를 다 잡아야 끝', () => {
    expect(BALANCE.prepTime).toBe(15);
    expect(BALANCE.waveDuration).toBeUndefined();
  });

  it('11웨이브부터 상향 (2026-11-24 사용자 결정): 모든 몬스터 체력 ×1.5 · 기절 몬스터는 11웨이브부터', () => {
    expect(BALANCE.monster.midHp).toEqual({ from: 11, mult: 1.5 });
    const raw = (w) => 40 * Math.pow(1.08, w - 1) * BALANCE.monster.hpScale;
    expect(monsterStats('elite', 5).hp).toBeCloseTo(raw(5) * 15);
    expect(monsterStats('elite', 15).hp).toBeCloseTo(raw(15) * 15 * 1.5);
    expect(monsterStats('boss', 10).hp).toBeCloseTo(raw(10) * 110);
    expect(monsterStats('boss', 20).hp).toBeCloseTo(raw(20) * 110 * 1.5);
    expect(monsterStats('normal', 11).hp / monsterStats('normal', 10).hp).toBeGreaterThan(1.5);
    expect(BALANCE.special.types.stunner.from).toBe(11);
    expect(specialTypes(10)).not.toContain('stunner');
    expect(monsterStats('normal', 14, false, 'stunner').stun).toEqual({ cd: 10, dur: 1.2, range: 220 });
  });
});
