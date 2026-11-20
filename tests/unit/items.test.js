import { describe, it, expect } from 'vitest';
import { MATS, SEAL, COMBOS, EMBLEMS, ITEM_RULES, combine, recipesWith, itemFx, emblemTraits, isComponent } from '../../src/data/items.js';

// 룰 v2 ② 아이템 조합 (2026-11-20 사용자 확정): 재료 6종 + 왕실 인장 → 조합 21종 · 문장 7종(계열 6 + 출신 문장), 캐릭터 3칸, 해제 도구
describe('아이템 조합', () => {
  it('재료 6 + 인장, 조합 21종(같은 재료 2개 포함), 문장 계열 6 + 출신 6', () => {
    expect(MATS.map((m) => m.name)).toEqual(['숫돌', '깃털', '마력석', '렌즈', '화약', '금화 주머니']);
    expect(SEAL.name).toBe('왕실 인장');
    expect(COMBOS).toHaveLength(21);
    const pairs = new Set(COMBOS.map((c) => [...c.parts].sort().join('+')));
    expect(pairs.size).toBe(21); // 모든 짝이 서로 다름 (6C2 + 6)
    expect(EMBLEMS).toHaveLength(12);
    expect(ITEM_RULES.slots).toBe(3);
    expect(ITEM_RULES.smith).toEqual({ base: 30, step: 15 });
  });

  it('조합: 순서 상관없음, 인장 + 재료 = 계열 문장, 인장 2개 = 출신 문장(출신을 골라야)', () => {
    expect(combine('whet', 'whet')).toBe('giant_sword');
    expect(combine('feath', 'whet')).toBe(combine('whet', 'feath'));
    expect(combine('seal', 'lens')).toBe('emblem_ranger');
    expect(combine('whet', 'seal')).toBe('emblem_warrior');
    expect(combine('seal', 'seal')).toBe(null);
    expect(combine('seal', 'seal', 'lake')).toBe('emblem_lake');
    expect(combine('giant_sword', 'whet')).toBe(null); // 완성품은 더 못 합침
    expect(isComponent('seal')).toBe(true);
    expect(isComponent('giant_sword')).toBe(false);
  });

  it('조합표: 재료마다 6 + 문장 1', () => {
    expect(recipesWith('whet')).toHaveLength(7);
    expect(recipesWith('seal')).toHaveLength(7);
  });

  it('효과 합계 · 문장 시너지', () => {
    const fx = itemFx(['whet', 'giant_sword', 'rune_sword']);
    expect(fx.dmg).toBeCloseTo(0.5);
    expect(fx.skillCrit).toBe(true);
    expect(emblemTraits(['whet', 'emblem_lake', 'emblem_gunner'])).toEqual(['lake', 'gunner']);
  });
});
