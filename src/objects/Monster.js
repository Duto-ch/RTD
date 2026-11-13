import Phaser from 'phaser';
import { PX, DEPTH } from '../config.js';
import { pathPoint } from '../systems/path.js';
import { monsterStats, TOTAL_WAVES } from '../data/waves.js';
import { monsterDesign } from '../data/monsters.js';
import { playBase, setArt } from '../systems/customArt.js';
import { BOSS_ABILITIES } from '../data/bossAbilities.js';
import { BALANCE } from '../config.js';

export class Monster extends Phaser.GameObjects.Sprite {
  constructor(scene, kind, attr, wave, milestone = false, difficulty = 0) {
    const design = monsterDesign(kind, wave);
    super(scene, 0, 0, `mon_${design.id}_${attr}`);
    this.design = design; // { id, name } — 웨이브별 전용 외형
    const s = monsterStats(kind, wave, milestone, difficulty);
    this.milestone = milestone; // 강화 보스 (30·60·90)
    this.isFinal = kind === 'boss' && wave >= TOTAL_WAVES; // 최종 보스 (100)
    this.revived = false;
    this.enraged = false;
    this.shiftTimer = BALANCE.milestone.shiftEvery;
    this.kind = kind;
    this.attr = attr;
    this.maxHp = s.hp;
    this.hp = s.hp;
    this.baseSpeed = s.speed;
    this.gold = s.gold;
    this.dist = 0; // 출발점부터 이동한 거리 (보스는 PATH_LENGTH 도달 시 게임 오버)
    this.phase = Math.random() * 2;
    this.slowPct = 0;
    this.slowUntil = 0;
    this.stunUntil = 0;
    this.vulnPct = 0;
    this.vulnUntil = 0;
    this.dots = [];
    this.flashUntil = 0;
    this.alive = true;
    this.abilities = []; // 보스 디버프 능력 { def, cd }
    if (kind === 'boss') {
      const [min, max] = BALANCE.boss.abilityCount;
      const n = this.isFinal ? BALANCE.final.abilityCount : milestone ? BALANCE.milestone.abilityCount : Phaser.Math.Between(min, max);
      this.abilities = Phaser.Utils.Array.Shuffle([...BOSS_ABILITIES])
        .slice(0, n)
        .map((def) => ({ def, cd: def.cd * 0.5 }));
    }

    this.baseScale = kind === 'boss' ? PX + 1 : PX;
    setArt(this, this.texture.key, this.baseScale);
    this.setDepth(DEPTH.monster + (kind === 'boss' ? 2 : kind === 'elite' ? 1 : 0));
    scene.add.existing(this);
    playBase(this, 'walk');
    this.place();
  }

  get isBoss() {
    return this.kind === 'boss';
  }

  applySlow(pct, dur, now) {
    if (pct >= this.slowPct || now > this.slowUntil) this.slowPct = pct;
    this.slowUntil = Math.max(this.slowUntil, now + dur);
  }

  applyStun(dur, now) {
    this.stunUntil = Math.max(this.stunUntil, now + (this.isBoss ? dur / 2 : dur));
  }

  applyVuln(pct, dur, now) {
    if (pct >= this.vulnPct || now > this.vulnUntil) this.vulnPct = pct;
    this.vulnUntil = Math.max(this.vulnUntil, now + dur);
  }

  applyDot(dps, dur, now, source) {
    this.dots.push({ dps, until: now + dur, source });
  }

  push(px) {
    if (this.isBoss) return; // 보스는 넉백 면역
    this.dist -= px;
  }

  damageTakenMult(now) {
    return now < this.vulnUntil ? 1 + this.vulnPct : 1;
  }

  place() {
    const p = pathPoint(this.dist);
    // 2프레임 깡충 애니메이션 (픽셀 격자 유지). 기절 중엔 멈춤
    const stunned = this.scene.gameTime < this.stunUntil;
    const animated = this.anims.isPlaying;
    const hop = animated || stunned || Math.floor(this.scene.gameTime * 4 + this.phase) % 2 === 0 ? 0 : -PX;
    this.setPosition(Math.round(p.x), Math.round(p.y) + hop);
    if (p.dir === 'left') this.setFlipX(true);
    else if (p.dir === 'right') this.setFlipX(false);
  }

  /** 분노 패턴이 있는 보스 (강화 보스·최종 보스) */
  get canEnrage() {
    return this.milestone || this.isFinal;
  }

  /** 최종 보스 부활: 체력 회복 + 아직 없는 디버프 능력 추가 */
  revive() {
    this.revived = true;
    this.hp = this.maxHp * BALANCE.final.reviveHp;
    const extra = Phaser.Utils.Array.Shuffle(BOSS_ABILITIES.filter((d) => !this.abilities.some((a) => a.def.id === d.id)))
      .slice(0, BALANCE.final.reviveExtraAbilities)
      .map((def) => ({ def, cd: 1 }));
    this.abilities.push(...extra);
    return extra.map((a) => a.def);
  }

  /** 속성 변환 (강화 보스) */
  setAttr(attr) {
    this.attr = attr;
    setArt(this, `mon_${this.design.id}_${attr}`, this.baseScale);
    playBase(this, 'walk');
  }

  tick(dt, now, speedMul) {
    if (now > this.slowUntil) this.slowPct = 0;
    const rage = this.enraged ? BALANCE.milestone.enrageSpeed : 1;
    if (now >= this.stunUntil) this.dist += this.baseSpeed * rage * (1 - this.slowPct) * speedMul * dt;
    this.place();

    // 지속 피해
    if (this.dots.length) {
      this.dots = this.dots.filter((d) => d.until > now);
      let total = 0;
      for (const d of this.dots) total += d.dps * dt;
      if (total > 0) this.scene.damageMonster(this, total, { source: this.dots[0]?.source, silent: true });
    }

    // 상태 표시 틴트
    if (now < this.flashUntil) this.setTintFill(0xffffff);
    else if (now < this.stunUntil) this.setTint(0xfff27a);
    else if (this.slowPct > 0) this.setTint(0x9fd4ff);
    else if (this.dots.length) this.setTint(0xb6ff8a);
    else if (now < this.vulnUntil) this.setTint(0xff9cf0);
    else if (this.enraged) this.setTint(Math.floor(now * 4) % 2 ? 0xff6060 : 0xffb0b0);
    else this.clearTint();
  }
}
