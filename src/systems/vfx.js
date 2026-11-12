import Phaser from 'phaser';
import { PX, DEPTH, GAME_W, GAME_H } from '../config.js';
import { ATTR_INFO } from '../data/elements.js';

// 시각 효과 모음 — 클래스마다 다른 공격 모양, 속성마다 다른 파티클, 스킬은 클래스별 고유 연출
// 클래스 키: 용병 cls(archer/mage/sniper/shaman/rogue) 또는 영웅 arch(warlord/archmage/ranger)
export class Vfx {
  constructor(scene) {
    this.s = scene;
    this.em = {};
    const mk = (key, tex, cfg) => {
      this.em[key] = scene.add.particles(0, 0, tex, { emitting: false, ...cfg }).setDepth(DEPTH.fx);
    };
    // 레드: 불티가 위로 솟음 / 블루: 얼음 조각이 튐 / 그린: 잎사귀가 흩날림
    mk('red', 'p_ember', {
      speed: { min: 30, max: 120 }, angle: { min: 200, max: 340 }, gravityY: -80,
      lifespan: { min: 300, max: 650 }, scale: { start: PX, end: 0 }, tint: [0xffe066, 0xff8a3d, 0xff3b3b], blendMode: 'ADD'
    });
    mk('blue', 'p_shard', {
      speed: { min: 60, max: 170 }, lifespan: { min: 250, max: 500 }, rotate: { min: 0, max: 360 },
      scale: { start: PX * 0.9, end: PX * 0.2 }, alpha: { start: 1, end: 0 }, tint: [0xffffff, 0xbff4ff, 0x5aa2ff]
    });
    mk('green', 'p_leaf', {
      speed: { min: 30, max: 110 }, gravityY: 90, rotate: { start: 0, end: 360 },
      lifespan: { min: 400, max: 750 }, scale: { start: PX, end: PX * 0.4 }, alpha: { start: 1, end: 0 }, tint: [0xa6e88a, 0x4caf50, 0xf2e14e]
    });
    mk('gold', 'p_star', {
      speed: { min: 40, max: 200 }, lifespan: { min: 300, max: 700 }, scale: { start: PX * 0.8, end: 0 }, tint: [0xffffff, 0xf2c14e], blendMode: 'ADD'
    });
    mk('rise', 'p_spark', {
      speedY: { min: -140, max: -60 }, speedX: { min: -20, max: 20 }, lifespan: { min: 400, max: 800 },
      scale: { start: PX * 0.7, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xffffff, 0xfff2a0], blendMode: 'ADD'
    });
    mk('curse', 'p_spark', {
      speed: { min: 20, max: 90 }, lifespan: { min: 300, max: 600 }, scale: { start: PX * 0.7, end: 0 }, tint: [0xb47cff, 0x6a3fb8], blendMode: 'ADD'
    });
  }

  burst(kind, x, y, n) {
    this.em[kind]?.explode(n, x, y);
  }

  color(attr) {
    return ATTR_INFO[attr].color;
  }

  fade(obj, duration, extra = {}) {
    this.s.tweens.add({ targets: obj, alpha: 0, duration, ...extra, onComplete: () => obj.destroy() });
  }

  // ───────────── 기본 공격 ─────────────
  /** 클래스별 기본 공격 투사체 + 명중 파티클 */
  attack(unit, target, kind) {
    const s = this.s;
    const sx = unit.x;
    const sy = unit.y - 8;
    const tx = target.x;
    const ty = target.y;
    const attr = unit.attr;
    const ang = Phaser.Math.Angle.Between(sx, sy, tx, ty);
    const hit = (n = 2) => this.burst(attr, tx, ty, n);

    switch (kind) {
      case 'archer':
      case 'ranger': {
        const key = kind === 'ranger' ? 'arrow_gold' : `arrow_${attr}`;
        const a = s.add.image(sx, sy, key).setScale(PX * 0.75).setRotation(ang).setDepth(DEPTH.projectile);
        s.tweens.add({ targets: a, x: tx, y: ty, duration: 110, onComplete: () => { a.destroy(); hit(kind === 'ranger' ? 3 : 2); } });
        break;
      }
      case 'mage': {
        const o = s.add.image(sx, sy, `orb_${attr}`).setScale(PX).setDepth(DEPTH.projectile).setBlendMode('ADD');
        s.tweens.add({ targets: o, x: tx, y: ty, scale: PX * 1.4, duration: 150, onComplete: () => { o.destroy(); hit(4); } });
        break;
      }
      case 'sniper': {
        const g = s.add.graphics().setDepth(DEPTH.projectile);
        g.lineStyle(6, this.color(attr), 0.6).lineBetween(sx, sy, tx, ty);
        g.lineStyle(2, 0xffffff, 1).lineBetween(sx, sy, tx, ty);
        this.fade(g, 140);
        const f = s.add.circle(sx, sy, 10, 0xffffff, 0.9).setDepth(DEPTH.fx);
        this.fade(f, 100, { scale: 1.8 });
        hit(4);
        break;
      }
      case 'shaman': {
        const r = s.add.image(sx, sy, `rune_${attr}`).setScale(PX * 0.6).setDepth(DEPTH.projectile).setBlendMode('ADD');
        s.tweens.add({ targets: r, x: tx, y: ty, angle: 360, duration: 200, onComplete: () => { r.destroy(); hit(2); } });
        break;
      }
      case 'rogue': {
        const d = s.add.image(sx, sy, `dagger_${attr}`).setScale(PX * 0.7).setDepth(DEPTH.projectile);
        s.tweens.add({ targets: d, x: tx, y: ty, angle: 720, duration: 90, onComplete: () => { d.destroy(); hit(1); } });
        break;
      }
      case 'warlord': {
        const ring = s.add.circle(tx, ty, 16).setStrokeStyle(6, this.color(attr)).setDepth(DEPTH.fx);
        this.fade(ring, 260, { scale: 4 });
        hit(6);
        break;
      }
      case 'archmage': {
        this.lightning(sx, sy, tx, ty, this.color(attr), 4);
        hit(4);
        break;
      }
      default: {
        const p = s.add.image(sx, sy, `proj_${attr}`).setScale(PX).setDepth(DEPTH.projectile);
        s.tweens.add({ targets: p, x: tx, y: ty, duration: 90, onComplete: () => p.destroy() });
      }
    }
  }

  /** 지그재그 번개 */
  lightning(x1, y1, x2, y2, color, width = 4) {
    const g = this.s.add.graphics().setDepth(DEPTH.fx);
    const pts = [[x1, y1]];
    const n = 5;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      pts.push([x1 + (x2 - x1) * t + Phaser.Math.Between(-12, 12), y1 + (y2 - y1) * t + Phaser.Math.Between(-12, 12)]);
    }
    pts.push([x2, y2]);
    for (const [w, c, a] of [[width + 6, color, 0.4], [width, 0xffffff, 1]]) {
      g.lineStyle(w, c, a).beginPath().moveTo(pts[0][0], pts[0][1]);
      for (const [x, y] of pts.slice(1)) g.lineTo(x, y);
      g.strokePath();
    }
    this.fade(g, 200);
  }

  chain(list, color) {
    for (let i = 1; i < list.length; i++) this.lightning(list[i - 1].x, list[i - 1].y, list[i].x, list[i].y, color, 3);
  }

  // ───────────── 스킬 ─────────────
  /**
   * 스킬 시전 연출. 클래스마다 시그니처 연출이 다르고, 그 위에 속성 파티클이 얹힌다.
   * @param area 스킬 범위 정보 { type, r }, primary 주 대상, targets 피해 대상들
   */
  skill(unit, def, kind, targets, primary, range) {
    const s = this.s;
    const attr = unit.attr;
    const color = this.color(attr);
    const big = def.level > 5; // 영웅 고유 스킬
    const area = def.area;

    // 시전자 오라: 발밑 원 + 솟아오르는 빛
    const aura = s.add.circle(unit.x, unit.y + 8, 24).setStrokeStyle(4, color).setDepth(DEPTH.fx);
    this.fade(aura, 380, { scale: big ? 3 : 2 });
    this.burst('rise', unit.x, unit.y, big ? 14 : 6);

    // 버프·골드 스킬
    if (def.buff) this.buffBeam(def.buff.scope === 'all' ? s.mercs : null, unit, def);
    if (def.gold) this.burst('gold', unit.x, unit.y - 10, 14);
    if (!area || !targets.length) return big && this.ultimate(unit, def);

    const cx = area.type === 'range' ? unit.x : primary.x;
    const cy = area.type === 'range' ? unit.y : primary.y;
    const r = area.type === 'range' ? range : area.r || 40;

    switch (kind) {
      case 'archer':
      case 'ranger':
        if (area.type === 'circle' || area.type === 'range') this.arrowRain(targets, attr, kind === 'ranger');
        else for (const t of targets) this.bigShot(unit, t, kind === 'ranger' ? 'arrow_gold' : `arrow_${attr}`, attr);
        break;
      case 'mage':
      case 'archmage':
        if (area.type === 'chain') this.chain(targets, color);
        else this.magicCircle(cx, cy, area.type === 'single' || area.type === 'multi' ? 36 : r, attr);
        if (area.type === 'multi') for (const t of targets) this.magicCircle(t.x, t.y, 28, attr);
        break;
      case 'sniper':
        for (const t of targets.slice(0, 8)) this.snipe(unit, t, attr);
        break;
      case 'shaman':
        this.totem(cx, cy, area.type === 'single' ? 40 : r, attr);
        break;
      case 'rogue':
      case 'warlord':
        for (const t of targets.slice(0, 10)) this.slash(t.x, t.y, color, kind === 'warlord');
        if (area.type === 'range' || area.type === 'circle') this.shockwave(cx, cy, r, color);
        break;
      default:
        this.shockwave(cx, cy, r, color);
    }
    for (const t of targets.slice(0, 12)) this.burst(attr, t.x, t.y, big ? 6 : 3);
    if (big) this.ultimate(unit, def);
  }

  bigShot(unit, t, key, attr) {
    const a = this.s.add
      .image(unit.x, unit.y - 8, key)
      .setScale(PX * 1.6)
      .setRotation(Phaser.Math.Angle.Between(unit.x, unit.y, t.x, t.y))
      .setDepth(DEPTH.projectile)
      .setBlendMode('ADD');
    this.s.tweens.add({ targets: a, x: t.x, y: t.y, duration: 130, onComplete: () => { a.destroy(); this.burst(attr, t.x, t.y, 6); } });
  }

  arrowRain(targets, attr, gold) {
    const key = gold ? 'arrow_gold' : `arrow_${attr}`;
    for (const t of targets.slice(0, 10)) {
      const ox = Phaser.Math.Between(-10, 10);
      const a = this.s.add.image(t.x + ox, t.y - 160, key).setScale(PX * 0.9).setRotation(Math.PI / 2).setDepth(DEPTH.projectile);
      this.s.tweens.add({
        targets: a, y: t.y, duration: 180, delay: Phaser.Math.Between(0, 120),
        onComplete: () => { a.destroy(); this.burst(attr, t.x, t.y, 2); }
      });
    }
  }

  magicCircle(x, y, r, attr) {
    const color = this.color(attr);
    const g = this.s.add.graphics({ x, y }).setDepth(DEPTH.fx);
    g.lineStyle(4, color, 0.9).strokeCircle(0, 0, r);
    g.lineStyle(2, 0xffffff, 0.8).strokeCircle(0, 0, r * 0.7);
    const pts = [];
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
      pts.push(new Phaser.Math.Vector2(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7));
    }
    g.lineStyle(2, color, 0.9).strokePoints(pts, true);
    g.setScale(0.2);
    this.s.tweens.add({ targets: g, scale: 1, angle: 90, duration: 160, ease: 'Back.easeOut' });
    this.s.tweens.add({ targets: g, alpha: 0, delay: 200, duration: 220, onComplete: () => g.destroy() });
    const flash = this.s.add.circle(x, y, r, color, 0.45).setDepth(DEPTH.fx).setBlendMode('ADD').setAlpha(0);
    this.s.tweens.add({ targets: flash, alpha: 0.6, delay: 150, duration: 60, yoyo: true, onComplete: () => flash.destroy() });
    this.burst(attr, x, y, 10);
  }

  snipe(unit, t, attr) {
    const s = this.s;
    const color = this.color(attr);
    const g = s.add.graphics({ x: t.x, y: t.y }).setDepth(DEPTH.fx);
    g.lineStyle(3, 0xff4d4d, 1).strokeCircle(0, 0, 14);
    g.lineBetween(-22, 0, -8, 0).lineBetween(8, 0, 22, 0).lineBetween(0, -22, 0, -8).lineBetween(0, 8, 0, 22);
    g.setScale(1.8);
    s.tweens.add({ targets: g, scale: 1, angle: 90, duration: 120, onComplete: () => this.fade(g, 150) });
    const beam = s.add.graphics().setDepth(DEPTH.projectile);
    beam.lineStyle(12, color, 0.5).lineBetween(unit.x, unit.y - 8, t.x, t.y);
    beam.lineStyle(4, 0xffffff, 1).lineBetween(unit.x, unit.y - 8, t.x, t.y);
    beam.setAlpha(0);
    s.tweens.add({ targets: beam, alpha: 1, delay: 110, duration: 30, onComplete: () => this.fade(beam, 200) });
    s.time.delayedCall(120, () => this.burst(attr, t.x, t.y, 8));
  }

  totem(x, y, r, attr) {
    const color = this.color(attr);
    const g = this.s.add.graphics({ x, y }).setDepth(DEPTH.fx);
    g.fillStyle(color, 0.18).fillCircle(0, 0, r);
    g.lineStyle(3, color, 0.9).strokeCircle(0, 0, r);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      g.fillStyle(0xffffff, 0.9).fillRect(Math.cos(a) * r - 3, Math.sin(a) * r - 3, 6, 6);
    }
    g.setScale(0.6);
    this.s.tweens.add({ targets: g, scale: 1, angle: -45, duration: 300 });
    this.s.tweens.add({ targets: g, alpha: 0, delay: 300, duration: 300, onComplete: () => g.destroy() });
    const rune = this.s.add.image(x, y, `rune_${attr}`).setScale(PX * 1.5).setDepth(DEPTH.fx).setBlendMode('ADD');
    this.s.tweens.add({ targets: rune, y: y - 40, alpha: 0, angle: 180, duration: 600, onComplete: () => rune.destroy() });
    this.burst('rise', x, y, 8);
  }

  slash(x, y, color, heavy) {
    const g = this.s.add.graphics({ x, y }).setDepth(DEPTH.fx);
    const L = heavy ? 30 : 20;
    g.lineStyle(heavy ? 8 : 5, color, 0.7).lineBetween(-L, -L, L, L).lineBetween(L, -L, -L, L);
    g.lineStyle(2, 0xffffff, 1).lineBetween(-L, -L, L, L).lineBetween(L, -L, -L, L);
    g.setScale(0.3);
    this.s.tweens.add({ targets: g, scale: 1.1, duration: 90, onComplete: () => this.fade(g, 160) });
  }

  shockwave(x, y, r, color) {
    const c = this.s.add.circle(x, y, r).setStrokeStyle(8, color, 0.9).setDepth(DEPTH.fx).setScale(0.15);
    this.s.tweens.add({ targets: c, scale: 1, alpha: 0, duration: 380, ease: 'Cubic.easeOut', onComplete: () => c.destroy() });
    const c2 = this.s.add.circle(x, y, r, color, 0.2).setDepth(DEPTH.fx).setScale(0.15);
    this.s.tweens.add({ targets: c2, scale: 1, alpha: 0, duration: 300, onComplete: () => c2.destroy() });
  }

  buffBeam(list, unit, def) {
    const targets = list || [unit];
    for (const m of targets) {
      const col = this.s.add.rectangle(m.x, m.y, 40, 64, 0xfff2a0, 0.35).setDepth(DEPTH.fx).setBlendMode('ADD');
      this.s.tweens.add({ targets: col, scaleX: 0.2, scaleY: 1.6, y: m.y - 30, alpha: 0, duration: 450, onComplete: () => col.destroy() });
      this.burst('gold', m.x, m.y, 4);
    }
    if (def.buff.scope === 'adjacent') {
      const sq = this.s.add.rectangle(unit.x, unit.y, 64 * 3, 64 * 3).setStrokeStyle(4, 0xfff2a0, 0.9).setDepth(DEPTH.fx);
      this.fade(sq, 400, { scale: 1.1 });
    }
  }

  /** 영웅 고유 스킬: 화면 섬광 + 흔들림 + 대형 문구 */
  ultimate(unit, def) {
    const s = this.s;
    const c = ATTR_INFO[unit.attr].color;
    s.cameras.main.flash(180, (c >> 16) & 255, (c >> 8) & 255, c & 255, true);
    s.cameras.main.shake(220, 0.006);
    const t = s.add
      .text(GAME_W / 2, unit.y - 70, def.name, {
        fontFamily: 'Galmuri11', fontSize: '33px', color: '#f2c14e', stroke: '#1b1b26', strokeThickness: 8, fontStyle: 'bold'
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.fx + 5)
      .setScale(0.4);
    s.tweens.add({ targets: t, scale: 1, duration: 180, ease: 'Back.easeOut' });
    s.tweens.add({ targets: t, alpha: 0, y: t.y - 30, delay: 700, duration: 400, onComplete: () => t.destroy() });
    this.burst('gold', unit.x, unit.y, 24);
    this.burst(unit.attr, unit.x, unit.y, 20);
  }

  /** 보스 디버프: 보라색 저주 */
  curse(boss, targets) {
    for (const t of targets) {
      this.lightning(boss.x, boss.y, t.x, t.y, 0xb47cff, 3);
      this.burst('curse', t.x, t.y, 8);
    }
  }

  /** 승리 폭죽 */
  firework(x, y) {
    const s = this.s;
    const colors = [0xff6a55, 0x5aa2ff, 0x6fd36a, 0xf2c14e, 0xff6f91, 0xbff4ff];
    const color = Phaser.Utils.Array.GetRandom(colors);
    const rocket = s.add.image(x, GAME_H + 10, 'p_spark').setScale(PX).setTint(color).setDepth(DEPTH.overlay + 2);
    s.tweens.add({
      targets: rocket, y, duration: Phaser.Math.Between(500, 800), ease: 'Cubic.easeOut',
      onUpdate: () => { if (Math.random() < 0.5) this.trail(rocket.x, rocket.y, color); },
      onComplete: () => {
        rocket.destroy();
        const n = 44;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const sp = i % 2 ? Phaser.Math.Between(120, 210) : Phaser.Math.Between(60, 110);
          const p = s.add.image(x, y, 'p_star').setScale(PX * 1.1).setTint(i % 3 ? color : 0xffffff).setDepth(DEPTH.overlay + 2).setBlendMode('ADD');
          s.tweens.add({
            targets: p, x: x + Math.cos(a) * sp, y: y + Math.sin(a) * sp + 40, alpha: 0, scale: 0,
            duration: Phaser.Math.Between(900, 1300), ease: 'Quad.easeOut', onComplete: () => p.destroy()
          });
        }
        const ring = s.add.circle(x, y, 24, color, 0.5).setDepth(DEPTH.overlay + 2).setBlendMode('ADD');
        s.tweens.add({ targets: ring, scale: 5, alpha: 0, duration: 400, onComplete: () => ring.destroy() });
        s.events.emit('firework-pop');
      }
    });
  }

  trail(x, y, color) {
    const p = this.s.add.image(x, y, 'pixel').setScale(PX).setTint(color).setDepth(DEPTH.overlay + 2);
    this.fade(p, 300);
  }
}
