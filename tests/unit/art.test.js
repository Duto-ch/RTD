import { describe, it, expect } from 'vitest';
import { HERO_SPRITES, MERC_SPRITES } from '../../src/art/sprites.js';
import { NORMAL_DESIGNS, ELITE_DESIGNS, BOSS_DESIGNS } from '../../src/art/monsters.js';
import { HEROES, MERC_CLASS_IDS } from '../../src/data/heroes.js';
import { monsterDesign } from '../../src/data/monsters.js';
import { BIOMES, biomeForWave } from '../../src/data/biomes.js';

const square = (rows, size) => rows.length === size && rows.every((r) => r.length === size);

describe('픽셀아트 데이터', () => {
  it('용병 15명은 모두 개별 그림 (16×16)', () => {
    const keys = MERC_CLASS_IDS.flatMap((cls) => ['red', 'blue', 'green'].map((a) => `${cls}_${a}`));
    expect(Object.keys(MERC_SPRITES).sort()).toEqual(keys.sort());
    for (const k of keys) expect(square(MERC_SPRITES[k].rows, 16)).toBe(true);
    expect(new Set(keys.map((k) => MERC_SPRITES[k].rows.join(''))).size).toBe(15);
  });

  it('영웅 스프라이트는 16×16, 영웅 9명 모두 개별 그림', () => {
    for (const list of Object.values(HEROES)) for (const h of list) expect(square(HERO_SPRITES[h.id].rows, 16)).toBe(true);
  });

  it('몬스터 40종: 일반·정예 12×12, 보스 16×16, 최종 보스 20×20', () => {
    expect(NORMAL_DESIGNS).toHaveLength(20);
    expect(ELITE_DESIGNS).toHaveLength(10);
    expect(BOSS_DESIGNS).toHaveLength(10);
    for (const d of [...NORMAL_DESIGNS, ...ELITE_DESIGNS]) expect(square(d.rows, 12)).toBe(true);
    for (const d of BOSS_DESIGNS.slice(0, 9)) expect(square(d.rows, 16)).toBe(true);
    expect(square(BOSS_DESIGNS[9].rows, 20)).toBe(true);
  });

  it('일반 몬스터는 5웨이브마다, 정예·보스는 웨이브마다 다른 디자인', () => {
    expect(monsterDesign('normal', 1).id).toBe(monsterDesign('normal', 5).id);
    expect(monsterDesign('normal', 5).id).not.toBe(monsterDesign('normal', 6).id);
    expect(new Set([5, 15, 25, 35, 45, 55, 65, 75, 85, 95].map((w) => monsterDesign('elite', w).id)).size).toBe(10);
    expect(new Set([10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((w) => monsterDesign('boss', w).id)).size).toBe(10);
    expect(monsterDesign('boss', 100).id).toBe('b_voidemperor');
  });

  it('지역 배경은 10웨이브마다 바뀐다', () => {
    expect(BIOMES).toHaveLength(10);
    expect(biomeForWave(1).id).toBe(biomeForWave(10).id);
    expect(biomeForWave(11).id).not.toBe(biomeForWave(10).id);
    expect(biomeForWave(100).id).toBe('void');
  });
});
