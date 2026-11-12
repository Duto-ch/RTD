import Phaser from 'phaser';
import { PX, CELL, DEPTH, BALANCE } from '../config.js';
import { MERC_CLASSES, MERC_NAMES, HERO_ARCHETYPES } from '../data/heroes.js';
import { ATTR_INFO } from '../data/elements.js';
import { cellCenter } from '../systems/path.js';

export const MAX_LEVEL = 5; // 용병 최고 레벨. 그 다음은 영웅 승급

/** 필드 위 유닛. 1~5레벨은 용병, 승급하면 영웅(hero) */
export class Mercenary extends Phaser.GameObjects.Container {
  constructor(scene, col, row, attr, cls) {
    const c = cellCenter(col, row);
    super(scene, c.x, c.y);
    this.attr = attr;
    this.cls = cls;
    this.level = 1;
    this.hero = null; // 영웅 데이터 (data/heroes.js HEROES)
    this.skills = []; // { def, cd }
    this.buffs = []; // { dmg, rate, range, until }
    this.col = col;
    this.row = row;
    this.cooldown = Math.random() * 0.5;
    this.invested = 0;
    this.kills = 0;

    this.sprite = scene.add.image(0, -PX, this.textureKey).setScale(PX);
    this.pips = scene.add.graphics();
    this.add([this.sprite, this.pips]);
    this.drawPips();

    this.setSize(CELL, CELL);
    this.setDepth(DEPTH.merc);
    this.setInteractive({ draggable: true, useHandCursor: true });
    scene.add.existing(this);
  }

  get isHero() {
    return !!this.hero;
  }
  get textureKey() {
    return this.hero ? `hero_${this.hero.arch}_${this.attr}` : `merc_${this.cls}_${this.attr}`;
  }
  get heroName() {
    return this.hero ? this.hero.name : MERC_NAMES[this.attr][this.cls];
  }
  get roleName() {
    return this.hero ? HERO_ARCHETYPES[this.hero.arch].title : MERC_CLASSES[this.cls].role;
  }
  get baseStats() {
    return this.hero ? HERO_ARCHETYPES[this.hero.arch] : MERC_CLASSES[this.cls];
  }

  drawPips() {
    const g = this.pips;
    g.clear();
    const color = ATTR_INFO[this.attr].color;
    const n = Math.min(this.level, MAX_LEVEL);
    const total = n * 8 - 2;
    const sx = -Math.round(total / 2 / PX) * PX;
    const y = CELL / 2 - 10;
    for (let i = 0; i < n; i++) {
      const x = sx + i * 8;
      g.fillStyle(0x1b1b26).fillRect(x - 2, y - 2, 10, 10);
      g.fillStyle(this.level >= MAX_LEVEL ? 0xf2c14e : color).fillRect(x, y, 6, 6);
    }
    if (this.isHero) {
      // 영웅: 금색 테두리
      g.lineStyle(4, 0xf2c14e, 0.9).strokeRect(-CELL / 2 + 2, -CELL / 2 + 2, CELL - 4, CELL - 4);
    }
  }

  snapToCell() {
    const c = cellCenter(this.col, this.row);
    this.setPosition(c.x, c.y);
  }

  /** 같은 속성·같은 레벨 용병끼리만 합칠 수 있다 (Lv5+Lv5 = 영웅 승급) */
  canMergeWith(other) {
    return other && other !== this && !this.isHero && !other.isHero && other.attr === this.attr && other.level === this.level;
  }

  learn(def) {
    this.skills.push({ def, cd: def.cd * 0.5 });
  }

  levelUp(def) {
    this.level += 1;
    this.learn(def);
    this.drawPips();
  }

  promote(hero, uniqueSkill) {
    this.hero = hero;
    this.level = MAX_LEVEL + 1;
    this.learn(uniqueSkill);
    this.sprite.setTexture(this.textureKey);
    this.drawPips();
  }

  addBuff(b, now) {
    this.buffs.push({ dmg: b.dmg || 0, rate: b.rate || 0, range: b.range || 0, until: now + b.dur });
  }

  /** 유물·버프 반영 최종 능력치 */
  getStats(relics, now) {
    const base = this.baseStats;
    const n = (id) => relics[id] || 0;
    this.buffs = this.buffs.filter((b) => b.until > now);
    const buff = this.buffs.reduce((s, b) => ({ dmg: s.dmg + b.dmg, rate: s.rate + b.rate, range: s.range + b.range }), {
      dmg: 0,
      rate: 0,
      range: 0
    });

    const dmgBonus = 0.2 * n('hero_sword') + 0.4 * n(`${this.attr}_orb`) + buff.dmg;
    const rateBonus = 0.15 * n('war_drum') + buff.rate;
    const rangeBonus = 0.15 * n('hawk_eye') + buff.range;
    const lv = Math.min(this.level, MAX_LEVEL);

    return {
      damage: base.dmg * BALANCE.levelDamage[lv - 1] * (1 + dmgBonus),
      rate: base.rate * (1 + rateBonus),
      range: base.range * (1 + rangeBonus),
      crit: Math.min(1, (base.crit || 0) + 0.1 * n('lucky_coin')),
      critMult: 2,
      targets: base.targets || 1,
      splash: base.splash || 0,
      chain: base.chain || 0,
      slow: base.slow || 0,
      slowDur: base.slowDur || 0,
      buffed: this.buffs.length > 0
    };
  }
}
