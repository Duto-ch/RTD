import { describe, it, expect } from 'vitest';
import { SHOP, priceOf, rerollCost, levelUpCost, rollSlot, refillShop, findStarUp } from '../../src/data/shop.js';
import { ROSTER_BY_ID } from '../../src/data/roster.js';
import { TRAITS, countTraits, tierIndex, activeTier, CLASS_IDS, ORIGIN_IDS } from '../../src/data/synergy.js';

// 룰 v2 (2026-11-20 사용자 결정): 상점 6칸 · 리롤·잠금 · 영지 레벨(인원 3→12, 상점 확률 — Lv10 유니크 25%) · 3장 → 별 승급
describe('상점 · 영지 레벨', () => {
  it('6칸, 값 = 등급 단위 × 10골드, 영지 Lv1 3명 → Lv10 12명', () => {
    expect(SHOP.slots).toBe(6);
    expect([1, 2, 3, 4].map((g) => priceOf({ grade: g }))).toEqual([10, 20, 30, 50]);
    expect(SHOP.cap(1)).toBe(3);
    expect(SHOP.cap(10)).toBe(12);
    expect(levelUpCost(1)).toBe(20);
    expect(levelUpCost(10)).toBe(null);
    expect(levelUpCost(9)).toBeGreaterThan(levelUpCost(5));
  });

  it('영지 레벨별 확률 합 100%, Lv1 커먼만, Lv10 유니크 25%', () => {
    for (const o of SHOP.odds) expect(o.reduce((a, b) => a + b, 0)).toBe(100);
    expect(SHOP.odds[0]).toEqual([100, 0, 0, 0]);
    expect(SHOP.odds[9][3]).toBe(25);
  });

  it('리롤 값: 기본 2단위 + 잠근 칸마다 등급별 추가', () => {
    expect(rerollCost([])).toBe(20);
    const slots = [{ id: 'ragnar', locked: true }, { id: 'helga', locked: true }, { id: 'elva', locked: false }];
    expect(rerollCost(slots)).toBe((2 + 4 + 1) * 10); // 유니크 +4, 커먼 +1
  });

  it('굴리기: 등급 확률 → 덱 안 그 등급 중 하나, 없으면 아래 등급 → 위 등급', () => {
    const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };
    const deck = ['helga', 'siri', 'elva', 'ragnar'];
    expect(rollSlot(deck, 10, seq([0.99, 0])).id).toBe('ragnar'); // Lv10: 75%~ 유니크
    expect(rollSlot(deck, 10, seq([0.5, 0])).id).toBe('elva'); // 25~75% 레어
    expect(rollSlot(deck, 1, seq([0.5, 0])).id).toBe('helga'); // Lv1: 커먼만
    expect(rollSlot(['ragnar'], 1, seq([0.5, 0])).id).toBe('ragnar'); // 덱에 커먼이 없으면 위 등급
    expect(rollSlot(deck, 1, seq([0.5, 0]), new Set(['helga'])).id).not.toBe('helga'); // 3성은 안 나옴
  });

  it('새로 채우기: 잠근 칸은 남고 나머지는 새로', () => {
    const slots = [{ id: 'ragnar', locked: true, sold: false }, { id: 'helga', locked: false, sold: false }];
    const out = refillShop(slots, ['helga'], 1);
    expect(out).toHaveLength(6);
    expect(out[0].id).toBe('ragnar');
    expect(out.slice(1).every((s) => s.id === 'helga' && !s.locked)).toBe(true);
  });

  it('별 승급: 같은 캐릭터·같은 별 3장', () => {
    const u = (id, star) => ({ char: { id }, star });
    expect(findStarUp([u('a', 1), u('a', 1)])).toBe(null);
    expect(findStarUp([u('a', 1), u('a', 2), u('a', 1)])).toBe(null);
    expect(findStarUp([u('a', 1), u('b', 1), u('a', 1), u('a', 1)])).toHaveLength(3);
    expect(findStarUp([u('a', 3), u('a', 3), u('a', 3)])).toBe(null); // 최대 3성
  });
});

// 시너지 12종 (2026-11-20 이름·수치 확정): 계열 2·5·8 · 출신 3·6·9, 서로 다른 캐릭터만 센다
describe('시너지', () => {
  it('계열 6 · 출신 6, 단계 2·5·8 / 3·6·9', () => {
    expect(CLASS_IDS.map((k) => TRAITS[k].name)).toEqual(['전사', '사수', '암살자', '포격수', '주술사', '지원가']);
    expect(ORIGIN_IDS.map((k) => TRAITS[k].name)).toEqual(['북방 부족', '왕국 기사단', '마탑', '숲의 일족', '호수의 성역', '황금 길드']);
    for (const k of CLASS_IDS) expect(TRAITS[k].tiers.map((t) => t.n)).toEqual([2, 5, 8]);
    for (const k of ORIGIN_IDS) expect(TRAITS[k].tiers.map((t) => t.n)).toEqual([3, 6, 9]);
  });

  it('같은 캐릭터 여러 장은 1명으로 센다', () => {
    const u = (id) => ({ char: ROSTER_BY_ID[id] });
    const c = countTraits([u('ragnar'), u('ragnar'), u('stein'), u('einar')]); // 전사·북방 3명
    expect(c.warrior).toBe(3);
    expect(c.north).toBe(3);
    expect(tierIndex('warrior', c.warrior)).toBe(0);
    expect(activeTier('north', c.north).rage).toBe(0.02);
    expect(activeTier('knight', 2)).toBe(null);
    expect(countTraits([], { knight: 3 }).knight).toBe(3); // 문장 등으로 +
  });
});
