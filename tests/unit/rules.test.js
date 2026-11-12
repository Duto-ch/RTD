import { describe, it, expect } from 'vitest';
import { BALANCE } from '../../src/config.js';
import { elementMultiplier, BEATS, ATTRS } from '../../src/data/elements.js';
import { MERC_CLASS_IDS, HEROES } from '../../src/data/heroes.js';
import { skillOptions, describeSkill } from '../../src/data/skills.js';
import { RELICS } from '../../src/data/relics.js';
import { BOSS_ABILITIES } from '../../src/data/bossAbilities.js';

describe('상성', () => {
  it('블루 > 레드 > 그린 > 블루', () => {
    expect(BEATS).toEqual({ blue: 'red', green: 'blue', red: 'green' });
    expect(elementMultiplier('blue', 'red')).toBe(BALANCE.elementAdvantage);
    expect(elementMultiplier('red', 'blue')).toBe(BALANCE.elementDisadvantage);
    expect(elementMultiplier('red', 'red')).toBe(1);
  });
});

describe('비용', () => {
  it('레벨 업 비용 Lv3부터 2배, 영웅 승급 1800G', () => {
    expect(BALANCE.mergeCost).toEqual({ 2: 20, 3: 100, 4: 240, 5: 600 });
    expect(BALANCE.promoteCost).toBe(1800);
    expect(BALANCE.maxActiveRelics).toBe(4);
    expect(BALANCE.hireLv2Chance).toBe(0.05);
  });
});

describe('스킬', () => {
  it('용병 15명 × Lv2~5 × 3종 = 180개, 모두 고유 id·설명 있음', () => {
    const ids = new Set();
    for (const a of ATTRS)
      for (const cls of MERC_CLASS_IDS)
        for (let lv = 2; lv <= 5; lv++) {
          const opts = skillOptions(a, cls, lv);
          expect(opts).toHaveLength(3);
          for (const s of opts) {
            ids.add(s.id);
            expect(describeSkill(s).length).toBeGreaterThan(4);
          }
        }
    expect(ids.size).toBe(180);
  });

  it('영웅은 속성별 3명, 모두 고유 스킬 보유', () => {
    for (const a of ATTRS) {
      expect(HEROES[a]).toHaveLength(3);
      for (const h of HEROES[a]) expect(describeSkill(h.unique).length).toBeGreaterThan(4);
    }
  });
});

describe('유물·보스 능력', () => {
  it('유물 id 중복 없음, 보스 디버프 5종', () => {
    expect(new Set(RELICS.map((r) => r.id)).size).toBe(RELICS.length);
    expect(BOSS_ABILITIES).toHaveLength(5);
  });
});
