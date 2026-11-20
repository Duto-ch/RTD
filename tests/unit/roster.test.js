import { describe, it, expect } from 'vitest';
import { ROSTER, ROSTER_BY_ID, GRADES, DECK_RULES, DEFAULT_DECK, deckValid } from '../../src/data/roster.js';
import { STAR_STAT, starSkill, maxMana, MANA, regradeSkill } from '../../src/data/stars.js';
import { STYLES } from '../../src/data/roster.js';

// 룰 v2 (2026-11-20 사용자 결정): 70명 = 언커먼 이상 64명 + 커먼 6명 (34명 삭제), 등급 재배분 커먼 22·언커먼 20·레어 16·유니크 12,
// 계열 6 × 출신 6, 덱 최대 30명(레어 9·유니크 3), 스킬 1개(마나 시전) + 별마다 강해짐
describe('캐릭터 70명 · 등급 재배분 · 덱 30', () => {
  it('70명, 등급 22·20·16·12, 출신마다 유니크 2명, id·이름 중복 없음', () => {
    expect(ROSTER).toHaveLength(70);
    expect([1, 2, 3, 4].map((g) => ROSTER.filter((c) => c.grade === g).length)).toEqual([22, 20, 16, 12]);
    for (const o of ['north', 'knight', 'tower', 'grove', 'lake', 'guild']) expect(ROSTER.filter((c) => c.origin === o && c.grade === 4)).toHaveLength(2);
    expect(new Set(ROSTER.map((c) => c.id)).size).toBe(70);
    expect(new Set(ROSTER.map((c) => c.name)).size).toBe(70);
    // 빠진 캐릭터는 없다 (예: 에릭·로빈·브록)
    for (const id of ['eric', 'robin', 'brock']) expect(ROSTER_BY_ID[id]).toBeUndefined();
  });

  it('계열 6·출신 6이 모두 있고, 캐릭터마다 스킬 1개(예전 마지막 스킬)', () => {
    expect(new Set(ROSTER.map((c) => c.cls)).size).toBe(6);
    expect(new Set(ROSTER.map((c) => c.origin)).size).toBe(6);
    for (const c of ROSTER) {
      expect(c.skill.name).toBe(c.skills[c.skills.length - 1].name);
      expect(c.skill.id).toBe(`${c.id}_${c.skills.length - 1}`);
    }
  });

  it('등급 배율 1·1.35·1.8·2.5, 상점 값 1·2·3·5단위', () => {
    expect([1, 2, 3, 4].map((g) => GRADES[g].mult)).toEqual([1, 1.35, 1.8, 2.5]);
    expect([1, 2, 3, 4].map((g) => GRADES[g].price)).toEqual([1, 2, 3, 5]);
  });

  it('덱: 1~30명, 레어 9명·유니크 3명까지, 기본 덱은 30명', () => {
    expect(DECK_RULES).toEqual({ max: 30, rare: 9, unique: 3 });
    expect(DEFAULT_DECK).toHaveLength(30);
    expect(deckValid(DEFAULT_DECK)).toBe(true);
    expect(deckValid([])).toBe(false);
    expect(deckValid(ROSTER.filter((c) => c.grade === 4).slice(0, 4).map((c) => c.id))).toBe(false); // 유니크 4명
    expect(deckValid(ROSTER.filter((c) => c.grade === 3).slice(0, 10).map((c) => c.id))).toBe(false); // 레어 10명
    expect(deckValid(ROSTER.filter((c) => c.grade === 1).map((c) => c.id).concat(ROSTER.filter((c) => c.grade === 2).slice(0, 9).map((c) => c.id)))).toBe(false); // 31명
  });
});

describe('별 승급 · 스킬 1개 · 마나', () => {
  it('별 능력 배율 1·1.8·3.2, 스킬 피해 1성 = Lv5 의 절반 → 1 : 1.6 : 2.6', () => {
    expect(STAR_STAT).toEqual([1, 1.8, 3.2]);
    const def = { name: 't', cd: 10, area: { type: 'multi', n: 3 }, fx: { dmg: 4 } };
    expect([1, 2, 3].map((n) => starSkill(def, n).fx.dmg)).toEqual([2, 3.2, 5.2]);
    expect([1, 2, 3].map((n) => starSkill(def, n).area.n)).toEqual([3, 4, 5]);
  });

  it('최대 마나 = 쿨타임의 60% 동안 공격 수 × 10 (40~150)', () => {
    expect(MANA.perAttack).toBe(10);
    expect(maxMana(STYLES.rapid, {}, { cd: 10 })).toBe(130); // 10 × 0.6 × 2.2 × 10 = 132 → 130
    expect(maxMana(STYLES.heavy, {}, { cd: 10 })).toBe(40); // 최소 40
    expect(maxMana(STYLES.rapid, {}, { cd: 30 })).toBe(150); // 최대 150
  });

  it('등급이 바뀐 캐릭터는 스킬 % 를 새/옛 등급 세기 비율만큼', () => {
    const def = { fx: { dmg: 4.45 } };
    expect(regradeSkill(def, 2, 4).fx.dmg).toBeCloseTo(7.2, 1);
    expect(regradeSkill(def, 3, 3)).toBe(def);
  });
});
