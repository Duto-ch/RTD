import { describe, it, expect, beforeEach } from 'vitest';
import { RELICS, RELIC_RULES, RELIC_BY_ID, relicValue, relicBonus } from '../../src/data/relics.js';
import { TAVERN, hireCost, tavernRerollCost, nextRefresh, rollTavernSlots } from '../../src/data/tavern.js';
import { ROSTER_BY_ID } from '../../src/data/roster.js';
import { meta } from '../../src/systems/meta.js';
import manifest from '../../public/assets/custom/manifest.json';

// 룰 v2 ③ (2026-11-20 사용자 확정): 술집(3명 · 3시간 갱신 · 마정석 고용·리롤) · 유물 공방(30종 · 장착 4칸)
const seq = (vals) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

describe('유물 30종', () => {
  it('30종, id 고유, 아이콘 그림이 모두 있다', () => {
    expect(RELICS).toHaveLength(30);
    expect(new Set(RELICS.map((r) => r.id)).size).toBe(30);
    for (const r of RELICS) expect(manifest.sprites[`relic_${r.id}`], r.id).toBeTruthy();
  });
  it('레벨마다 1레벨 값의 +50%, 5레벨 = 3배', () => {
    const r = RELIC_BY_ID.hero_sword;
    expect(relicValue(r, 1)).toBeCloseTo(0.12);
    expect(relicValue(r, 5)).toBeCloseTo(0.36);
    expect(relicValue(r, 9)).toBeCloseTo(0.36); // 최대 5
  });
  it('장착한 유물만 효과 키로 합쳐진다', () => {
    const b = relicBonus(['hero_sword', 'stone_heart'], { hero_sword: 2, stone_heart: 1, war_drum: 3 });
    expect(b.dmg).toBeCloseTo(0.18);
    expect(b.wallHp).toBe(8);
    expect(b.rate).toBeUndefined();
  });
});

describe('술집', () => {
  it('3칸 · 3시간 갱신 · 고용값 등급별 1·2·4·8 · 리롤 3부터 ×1.5', () => {
    expect(TAVERN.slots).toBe(3);
    expect(TAVERN.refreshMs).toBe(3 * 3600 * 1000);
    expect([1, 2, 3, 4].map((g) => hireCost({ grade: g }))).toEqual([1, 2, 4, 8]);
    expect([0, 1, 2, 3].map(tavernRerollCost)).toEqual([3, 5, 7, 11]);
    const slots = rollTavernSlots(seq([0.1, 0.5, 0.9, 0.3, 0.99, 0.7]));
    expect(slots).toHaveLength(3);
    expect(new Set(slots.map((s) => s.id)).size).toBe(3);
  });
  it('갱신 시각 = 다음 3시간 경계', () => {
    const t = 5 * TAVERN.refreshMs + 1234;
    expect(nextRefresh(t)).toBe(6 * TAVERN.refreshMs);
  });
});

describe('meta: 마정석 · 술집 · 유물 공방', () => {
  beforeEach(() => meta.reset());

  it('새 캐릭터 고용 → 보유, 중복 → 강화 +1(최대 3) → 그 뒤 마정석 절반 반환', () => {
    const now = 1000;
    const t = meta.tavern(now);
    const id = t.slots[0].id;
    const c = ROSTER_BY_ID[id];
    meta.data.owned = { ...meta.data.owned };
    delete meta.data.owned[id];
    meta.addStones(100);
    expect(meta.hireTavern(0, now)).toBe('new');
    expect(meta.owns(id)).toBe(true);
    expect(meta.stones).toBe(100 - hireCost(c));
    expect(meta.hireTavern(0, now)).toBeNull(); // 이미 고용한 칸
    for (let k = 1; k <= 3; k++) {
      meta.data.tavern.slots[0].hired = false;
      expect(meta.hireTavern(0, now)).toBe('enhance');
      expect(meta.enhance(id)).toBe(k);
    }
    meta.data.tavern.slots[0].hired = false;
    const before = meta.stones;
    expect(meta.hireTavern(0, now)).toBe('refund');
    expect(meta.stones).toBe(before - hireCost(c) + Math.floor(hireCost(c) / 2));
  });

  it('마정석이 부족하면 고용·리롤 못 함, 리롤 값은 오르고 시간 갱신 때 원래대로', () => {
    const now = 1000;
    meta.tavern(now);
    expect(meta.rerollTavern(now)).toBe(false);
    meta.addStones(8);
    expect(meta.rerollTavern(now)).toBe(true);
    expect(meta.stones).toBe(5);
    expect(meta.rerollTavern(now)).toBe(true); // 2번째 5
    expect(meta.stones).toBe(0);
    expect(meta.tavern(now).rerolls).toBe(2);
    expect(meta.tavern(now + TAVERN.refreshMs).rerolls).toBe(0);
  });

  it('유물 생산: 새 유물은 빈 칸에 자동 장착, 중복은 레벨 업, 최대면 마정석 반환', () => {
    expect(meta.craftRelic()).toBeNull();
    meta.addStones(RELIC_RULES.craftCost * 7);
    const r0 = () => 0; // 언제나 첫 유물
    expect(meta.craftRelic(r0)).toMatchObject({ id: RELICS[0].id, level: 1, result: 'new' });
    expect(meta.equipped).toEqual([RELICS[0].id]);
    for (let lv = 2; lv <= 5; lv++) expect(meta.craftRelic(r0).level).toBe(lv);
    const before = meta.stones;
    expect(meta.craftRelic(r0).result).toBe('refund');
    expect(meta.stones).toBe(before - RELIC_RULES.craftCost + RELIC_RULES.maxRefund);
    // 장착 효과가 bonus 에 합쳐진다 (용사의 검 Lv5 = +36%, 뿌리 노드 없음)
    expect(meta.bonus().dmg).toBeCloseTo(0.36);
  });

  it('장착 칸은 4칸, 가득 차면 장착 못 함', () => {
    for (const r of RELICS.slice(0, 5)) meta.data.relics[r.id] = 1;
    for (const r of RELICS.slice(0, 4)) expect(meta.toggleEquip(r.id)).toBe(true);
    expect(meta.toggleEquip(RELICS[4].id)).toBe(false);
    expect(meta.toggleEquip(RELICS[0].id)).toBe(true); // 해제
    expect(meta.toggleEquip(RELICS[4].id)).toBe(true);
    expect(meta.equipped).toHaveLength(4);
  });
});
