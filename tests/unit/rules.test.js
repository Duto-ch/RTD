import { describe, it, expect } from 'vitest';
import { BALANCE } from '../../src/config.js';
import { ATTRS } from '../../src/data/elements.js';
import { MERC_CLASS_IDS, HEROES } from '../../src/data/heroes.js';
import { skillOptions, describeSkill } from '../../src/data/skills.js';
import { BOSS_ABILITIES } from '../../src/data/bossAbilities.js';

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
  it('보스 디버프 5종', () => {
    expect(BOSS_ABILITIES).toHaveLength(5);
  });
});
