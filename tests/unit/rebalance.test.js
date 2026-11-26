import { describe, it, expect } from 'vitest';
import { ROSTER_BY_ID, basicMul, TRAIT_TEXT } from '../../src/data/roster.js';
import { SKILL_TUNE } from '../../src/data/skillTune.js';
import { TRAITS } from '../../src/data/synergy.js';

describe('스킬 리밸런싱 v2 (2026-11-26 사용자 결정)', () => {
  it('기본 공격 = 단일 대상 — 동시 공격·범위·연쇄는 피해 배율로 (동시 1명당 +35% · 범위 r100당 +100% 최대 +40% · 연쇄 1회당 +20%)', () => {
    expect(basicMul()).toBe(1);
    expect(basicMul(3)).toBeCloseTo(1.7);
    expect(basicMul(1, 30)).toBeCloseTo(1.3);
    expect(basicMul(1, 200)).toBeCloseTo(1.4); // 범위 몫은 최대 +40%
    expect(basicMul(1, 0, 4)).toBeCloseTo(1.8);
    expect(TRAIT_TEXT({ targets: 3 })).toContain('기본 공격 피해 +70%');
  });

  it('광역 스킬 대상 상한 커먼 8 · 언커먼 10 · 레어 12 · 유니크 15 — 세실리아 불사조 강하는 12명 · 피해 ×0.3', () => {
    const cap = { 1: 8, 2: 10, 3: 12, 4: 15 };
    for (const [id, t] of Object.entries(SKILL_TUNE)) if (t.max) expect(t.max).toBe(cap[ROSTER_BY_ID[id].grade]);
    const ce = ROSTER_BY_ID.cecilia;
    expect(ce.skill.area.max).toBe(12);
    expect(ce.skill.fx.dmg).toBeCloseTo(ce.baseSkill.fx.dmg * 0.3, 1);
  });

  it('처형 여러 명 상한 (이바르 12 → 8 · 리처드 20 → 8)', () => {
    expect(ROSTER_BY_ID.ivar.skill.area.n).toBe(8);
    expect(ROSTER_BY_ID.richard.skill.area.n).toBe(8);
  });

  it('포격수 시너지 = 공격력 +15·35·60% (폭발 범위 대신)', () => {
    expect(TRAITS.gunner.tiers.map((t) => t.dmg)).toEqual([0.15, 0.35, 0.6]);
    expect(TRAITS.gunner.tiers.some((t) => t.splash)).toBe(false);
  });
});

describe('퍼거스 → 앤 (2026-11-26 사용자 요청)', () => {
  it('이름 앤 · 괴수 사냥꾼 · 스킬 「강렬한 한방」 (id fergus 그대로 — 그림·이펙트 키)', () => {
    const c = ROSTER_BY_ID.fergus;
    expect(c.name).toBe('앤');
    expect(c.title).toBe('괴수 사냥꾼');
    expect(c.skill.name).toBe('강렬한 한방');
  });
});
