import Phaser from 'phaser';
import { PX, CELL, DEPTH, BALANCE } from '../config.js';
import { HERO_CLASSES, HERO_NAMES } from '../data/heroes.js';
import { ATTR_INFO } from '../data/elements.js';
import { cellCenter } from '../systems/path.js';

export const MAX_LEVEL = 5;

export class Mercenary extends Phaser.GameObjects.Container {
  constructor(scene, col, row, attr, cls) {
    const c = cellCenter(col, row);
    super(scene, c.x, c.y);
    this.attr = attr;
    this.cls = cls;
    this.level = 1;
    this.skills = []; // 레벨 2~5에서 1개씩 획득한 스킬 id
    this.col = col;
    this.row = row;
    this.cooldown = Math.random() * 0.5;
    this.invested = 0;
    this.kills = 0;

    this.sprite = scene.add.image(0, -PX, `hero_${cls}_${attr}`).setScale(PX);
    this.pips = scene.add.graphics();
    this.add([this.sprite, this.pips]);
    this.drawPips();

    this.setSize(CELL, CELL);
    this.setDepth(DEPTH.merc);
    this.setInteractive({ draggable: true, useHandCursor: true });
    scene.add.existing(this);
  }

  get heroName() {
    return HERO_NAMES[this.attr][this.cls];
  }
  get classInfo() {
    return HERO_CLASSES[this.cls];
  }

  drawPips() {
    const g = this.pips;
    g.clear();
    const color = ATTR_INFO[this.attr].color;
    const total = this.level * 8 - 2;
    const sx = -Math.round(total / 2 / PX) * PX;
    const y = CELL / 2 - 10;
    for (let i = 0; i < this.level; i++) {
      const x = sx + i * 8;
      g.fillStyle(0x1b1b26).fillRect(x - 2, y - 2, 10, 10);
      g.fillStyle(this.level === MAX_LEVEL ? 0xf2c14e : color).fillRect(x, y, 6, 6);
    }
  }

  snapToCell() {
    const c = cellCenter(this.col, this.row);
    this.setPosition(c.x, c.y);
  }

  canMergeWith(other) {
    return other && other !== this && other.attr === this.attr && other.level === this.level && this.level < MAX_LEVEL;
  }

  levelUp(skillId) {
    this.level += 1;
    this.skills.push(skillId);
    this.drawPips();
  }

  has(skill) {
    return this.skills.includes(skill);
  }

  /** 스킬·유물 반영 최종 능력치 */
  getStats(relics) {
    const base = HERO_CLASSES[this.cls];
    const n = (id) => relics[id] || 0;

    let dmgBonus = 0.2 * n('hero_sword');
    if (n(`${this.attr}_orb`)) dmgBonus += 0.4 * n(`${this.attr}_orb`);
    if (this.has('power')) dmgBonus += 0.35;

    let rateBonus = 0.15 * n('war_drum');
    if (this.has('haste')) rateBonus += 0.3;
    if (this.has('frenzy')) rateBonus += 0.8;

    let rangeBonus = 0.15 * n('hawk_eye');
    if (this.has('eagle')) rangeBonus += 0.2;

    let crit = (base.crit || 0) + 0.1 * n('lucky_coin');
    let critMult = 2;
    if (this.has('crit')) {
      crit += 0.2;
      critMult = 2.5;
    }

    let splash = base.splash || 0;
    let splashPct = base.splash ? 1 : 0;
    if (this.has('splash')) {
      splash = Math.max(splash, 50);
      splashPct = Math.max(splashPct, 0.5);
    }

    let slow = base.slow || 0;
    let slowDur = base.slowDur || 0;
    if (this.has('chill')) {
      slow = Math.max(slow, 0.25);
      slowDur = Math.max(slowDur, 1.2);
    }

    const damage = base.dmg * BALANCE.levelDamage[this.level - 1] * (1 + dmgBonus);
    return {
      damage,
      rate: base.rate * (1 + rateBonus),
      range: base.range * (1 + rangeBonus),
      crit: Math.min(crit, 1),
      critMult,
      targets: this.has('multishot') ? 2 : 1,
      splash,
      splashPct,
      slow,
      slowDur,
      poison: this.has('poison') ? damage * 0.4 : 0,
      bounty: this.has('bounty') ? 2 : 0,
      execute: this.has('execute') ? 0.12 : 0,
      purity: this.has('purity')
    };
  }
}
