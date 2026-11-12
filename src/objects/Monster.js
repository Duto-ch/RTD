import Phaser from 'phaser';
import { PX, DEPTH } from '../config.js';
import { pathPoint } from '../systems/path.js';
import { monsterStats } from '../data/waves.js';

export class Monster extends Phaser.GameObjects.Image {
  constructor(scene, kind, attr, wave) {
    super(scene, 0, 0, `mon_${kind}_${attr}`);
    const s = monsterStats(kind, wave);
    this.kind = kind;
    this.attr = attr;
    this.maxHp = s.hp;
    this.hp = s.hp;
    this.baseSpeed = s.speed;
    this.gold = s.gold;
    this.dist = 0;
    this.phase = Math.random() * 2;
    this.slowPct = 0;
    this.slowUntil = 0;
    this.poisons = [];
    this.flashUntil = 0;
    this.alive = true;

    this.setScale(kind === 'boss' ? PX + 1 : PX);
    this.setDepth(DEPTH.monster + (kind === 'boss' ? 2 : kind === 'elite' ? 1 : 0));
    scene.add.existing(this);
    this.place();
  }

  get isBoss() {
    return this.kind === 'boss';
  }

  applySlow(pct, dur, now) {
    if (pct >= this.slowPct || now > this.slowUntil) this.slowPct = pct;
    this.slowUntil = Math.max(this.slowUntil, now + dur);
  }

  applyPoison(dps, dur, now, source) {
    this.poisons.push({ dps, until: now + dur, source });
  }

  place() {
    const p = pathPoint(this.dist);
    // 2프레임 깡충 애니메이션 (픽셀 격자 유지)
    const hop = Math.floor(this.scene.gameTime * 4 + this.phase) % 2 === 0 ? 0 : -PX;
    this.setPosition(Math.round(p.x), Math.round(p.y) + hop);
    if (p.dir === 'left') this.setFlipX(true);
    else if (p.dir === 'right') this.setFlipX(false);
  }

  tick(dt, now, speedMul) {
    if (now > this.slowUntil) this.slowPct = 0;
    this.dist += this.baseSpeed * (1 - this.slowPct) * speedMul * dt;
    this.place();

    // 독
    if (this.poisons.length) {
      let total = 0;
      this.poisons = this.poisons.filter((p) => p.until > now);
      for (const p of this.poisons) total += p.dps * dt;
      if (total > 0) this.scene.damageMonster(this, total, { source: this.poisons[0]?.source, silent: true });
    }

    // 상태 표시 틴트
    if (now < this.flashUntil) this.setTintFill(0xffffff);
    else if (this.slowPct > 0) this.setTint(0x9fd4ff);
    else if (this.poisons.length) this.setTint(0xb6ff8a);
    else this.clearTint();
  }
}
