import Phaser from 'phaser';
import { PX, DOT, DEPTH, GAME_W, GAME_H } from '../config.js';
import { dotImage, dotKey } from '../art/textures.js';
import { ATTR_INFO } from '../data/elements.js';
import { FX, FX_SCALE, HIT_FX, fxTexture, fxAnim, FX_SETS, setTexture, setAnim, SET_SCALE, FX_SIG, sigTexture, sigAnim } from '../data/fx.js';

const MAX_SHEET_FX = 48;
const MAX_COIN_FX = 12; // 동전 연출 동시 상한 (몬스터가 몰려 죽어도 필드를 덮지 않게) // 동시에 재생하는 시트 이펙트 상한 (넘으면 명중 이펙트부터 생략)

// 시각 효과 모음 — 클래스마다 다른 공격 모양, 속성마다 다른 파티클, 스킬은 클래스별 고유 연출
// 클래스 키: 용병 cls(archer/mage/sniper/shaman/rogue) 또는 영웅 arch(warlord/archmage/ranger)
export class Vfx {
  constructor(scene) {
    this.s = scene;
    this.em = {};
    this.sheetCount = 0;
    this.coinCount = 0;
    const mk = (key, tex, cfg) => {
      this.em[key] = scene.add.particles(0, 0, tex, { emitting: false, ...cfg }).setDepth(DEPTH.fx);
    };
    // 도트 2px (2026-11-21): 입자 그림은 2배 해상도 텍스처(dotKey)를 배율 2 에서 시작해 줄어든다
    // 레드: 불티가 위로 솟음 / 블루: 얼음 조각이 튐 / 그린: 잎사귀가 흩날림
    mk('red', dotKey(scene, 'p_ember', 2), {
      speed: { min: 30, max: 120 }, angle: { min: 200, max: 340 }, gravityY: -80,
      lifespan: { min: 300, max: 650 }, scale: { start: DOT, end: 0 }, tint: [0xffe066, 0xff8a3d, 0xff3b3b], blendMode: 'ADD'
    });
    mk('blue', dotKey(scene, 'p_shard', 2), {
      speed: { min: 60, max: 170 }, lifespan: { min: 250, max: 500 }, rotate: { min: 0, max: 360 },
      scale: { start: DOT, end: DOT * 0.25 }, alpha: { start: 1, end: 0 }, tint: [0xffffff, 0xbff4ff, 0x5aa2ff]
    });
    mk('green', dotKey(scene, 'p_leaf', 2), {
      speed: { min: 30, max: 110 }, gravityY: 90, rotate: { start: 0, end: 360 },
      lifespan: { min: 400, max: 750 }, scale: { start: DOT, end: DOT * 0.4 }, alpha: { start: 1, end: 0 }, tint: [0xa6e88a, 0x4caf50, 0xf2e14e]
    });
    mk('gold', dotKey(scene, 'p_star', 2), {
      speed: { min: 40, max: 200 }, lifespan: { min: 300, max: 700 }, scale: { start: DOT * 0.8, end: 0 }, tint: [0xffffff, 0xf2c14e], blendMode: 'ADD'
    });
    mk('rise', 'p_spark', {
      speedY: { min: -140, max: -60 }, speedX: { min: -20, max: 20 }, lifespan: { min: 400, max: 800 },
      scale: { start: DOT * 1.5, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xffffff, 0xfff2a0], blendMode: 'ADD'
    });
    // 몬스터 처치 (2026-11-21): 파스텔 별이 위로 톡 튀어 오르며 빙글 돌다 떨어지고 작아진다 + 작은 반짝이 + 퍼지는 고리.
    // 입자 하나하나가 2px 도트 그림(7x7 별), 한 발사기로 모두 처리하고 동시 상한을 둬 물량이 몰려 죽어도 가볍다
    const CUTE = [0xffe066, 0xff8fb1, 0x8fd4ff, 0xb6f09c, 0xffffff];
    mk('cuteStar', 'p_cutestar', {
      speed: { min: 70, max: 170 }, angle: { min: 200, max: 340 }, gravityY: 320, rotate: { start: 0, end: 360 },
      lifespan: { min: 500, max: 750 }, scale: { start: DOT, end: 0.6, ease: 'Expo.easeIn' }, alpha: { start: 1, end: 0, ease: 'Expo.easeIn' }, tint: CUTE, maxParticles: 400
    });
    mk('cuteTwinkle', 'p_twinkle', {
      speed: { min: 30, max: 110 }, lifespan: { min: 300, max: 500 }, scale: { start: DOT * 1.5, end: 0, ease: 'Expo.easeIn' }, tint: CUTE, blendMode: 'ADD', maxParticles: 300
    });
    mk('cutePop', 'p_popring', {
      speed: 0, lifespan: 220, scale: { start: DOT * 0.6, end: DOT * 2 }, alpha: { start: 0.9, end: 0 }, tint: 0xffffff, maxParticles: 120
    });
    mk('curse', 'p_spark', {
      speed: { min: 20, max: 90 }, lifespan: { min: 300, max: 600 }, scale: { start: DOT * 1.5, end: 0 }, tint: [0xb47cff, 0x6a3fb8], blendMode: 'ADD'
    });
  }

  /**
   * PixelLab 시트 이펙트를 한 번 재생하고 지운다. 시트가 없거나 너무 많이 떠 있으면 false.
   * opts: scale(기본 FX_SCALE), tint(속성 키 또는 색), depth, angle, optional(true 면 상한에 걸릴 때 생략)
   */
  play(key, x, y, opts = {}) {
    const d = FX[key];
    const s = this.s;
    if (!d || !s.anims.exists(fxAnim(key))) return false;
    if (this.sheetCount >= MAX_SHEET_FX && opts.optional !== false) return false;
    const spr = s.add.sprite(x, y, fxTexture(key), 0).setOrigin(d.ox, d.oy).setScale(opts.scale ?? d.px ?? FX_SCALE).setDepth(opts.depth ?? DEPTH.fx);
    if (d.tint && opts.tint !== undefined) spr.setTint(typeof opts.tint === 'string' ? this.color(opts.tint) : opts.tint);
    if (opts.angle) spr.setAngle(opts.angle);
    this.sheetCount++;
    spr.once('animationcomplete', () => spr.destroy());
    spr.once('destroy', () => this.sheetCount--);
    spr.play(fxAnim(key));
    return true;
  }

  /**
   * 세트 이펙트 한 장 재생 (커먼·언커먼 공용, 2026-11-18). 바닥 레이어(_back)가 있으면 캐릭터 뒤에 함께 깐다.
   * opts: depth(앞 레이어), backDepth, sx(가로 배율 — 연쇄 번개 늘리기), angle(라디안)
   */
  playSet(k, x, y, opts = {}) {
    return this.playSheet(FX_SETS, setTexture, setAnim, k, x, y, opts);
  }

  /** 시트 표(세트·전용 공통) 한 장 재생 — 바닥 레이어(_back)가 있으면 캐릭터 뒤에 함께 깐다 */
  playSheet(table, texOf, animOf, k, x, y, opts = {}) {
    const d = table[k];
    const s = this.s;
    if (!d || !s.anims.exists(animOf(k))) return false;
    if (this.sheetCount >= MAX_SHEET_FX && opts.optional !== false) return false;
    const one = (back) => {
      const spr = s.add.sprite(x, y, texOf(k, back), 0).setOrigin(d.ax / d.w, d.ay / d.h)
        .setScale(SET_SCALE * (opts.sx ?? 1), SET_SCALE).setDepth(back ? opts.backDepth ?? DEPTH.merc - 0.5 : opts.depth ?? DEPTH.fx);
      if (opts.angle) spr.setRotation(opts.angle);
      this.sheetCount++;
      spr.once('animationcomplete', () => spr.destroy());
      spr.once('destroy', () => this.sheetCount--);
      spr.play(animOf(k, back));
    };
    if (d.back && s.anims.exists(animOf(k, true))) one(true);
    one(false);
    return true;
  }

  /**
   * 레어·유니크 전용 스킬 연출 (2026-11-18): 스킬 def.id 로 그 캐릭터 전용 시트를 고른다. 없으면 false
   */
  sigSkill(unit, def, targets, primary) {
    const d = FX_SIG[def.id];
    if (!d || !this.s.anims.exists(sigAnim(def.id))) return false;
    const P = (x, y, o) => this.playSheet(FX_SIG, sigTexture, sigAnim, def.id, x, y, o);
    const under = { backDepth: DEPTH.monster - 0.5 }; // 몬스터 쪽 바닥 자국은 몬스터 뒤
    const live = targets.filter((t) => t.alive !== false);
    switch (d.kind) {
      case 'target': (def.area?.type === 'single' ? live.slice(0, 1) : live.slice(0, 8)).forEach((t) => P(t.x, t.y, under)); break;
      case 'center': if (primary) P(primary.x, primary.y, under); break;
      case 'self_area': P(unit.x, unit.y); break;
      case 'chain': {
        let from = unit;
        for (const t of live.slice(0, 8)) {
          const dx = t.x - from.x, dy = t.y - from.y, dist = Math.hypot(dx, dy);
          if (dist > 4) P(from.x, from.y, { sx: dist / (64 * SET_SCALE), angle: Math.atan2(dy, dx) });
          from = t;
        }
        break;
      }
      case 'self': P(unit.x, unit.y + 16); break;
      case 'adj': P(unit.x, unit.y); break;
      case 'ally': for (const m of this.s.mercs) P(m.x, m.y + 12); break;
      default: return false;
    }
    return true;
  }

  /**
   * 커먼·언커먼 스킬 연출: 스킬 데이터(범위·효과·버프·골드)로 공용 세트 이펙트를 고른다 (docs/VFX_STYLE.md 등급별 겹침 규칙).
   * 레어·유니크는 전용 이펙트 전까지 예전 연출(skill) 그대로. 그릴 수 없으면 false
   */
  setSkill(unit, def, targets, primary) {
    if (unit.grade > 2) return false;
    const tier = unit.grade === 1 ? 'c' : 'u';
    const key = (n) => `${tier}_${n}_${unit.attr}`;
    if (!FX_SETS[key('hit')] || !this.s.anims.exists(setAnim(key('hit')))) return false;
    const P = (n, x, y, o) => this.playSet(key(n), x, y, o);
    const under = DEPTH.monster - 0.5; // 몬스터 발밑 웅덩이 (몬스터 뒤)
    const each = (n, list, max = 8, o) => list.slice(0, max).forEach((t) => t.alive !== false && P(n, t.x, t.y, o));
    if (def.buff) {
      const sc = def.buff.scope;
      if (sc === 'self') P('buff_self', unit.x, unit.y + 12);
      else if (sc === 'all') for (const m of this.s.mercs) P(FX_SETS[key('buff_all')] ? 'buff_all' : 'buff_self', m.x, m.y + (FX_SETS[key('buff_all')] ? 4 : 12));
      else P('buff_adj', unit.x, unit.y);
    }
    if (def.area && primary) {
      const a = def.area, fx = def.fx || {};
      if (a.type === 'range') {
        P('pulse', unit.x, unit.y);
        each('hit', targets, 6);
      } else if (a.type === 'chain') {
        if (FX_SETS[key('chain')]) {
          let from = unit;
          for (const t of targets.slice(0, 8)) {
            const dx = t.x - from.x, dy = t.y - from.y, dist = Math.hypot(dx, dy);
            if (dist > 4) P('chain', from.x, from.y, { sx: dist / (64 * SET_SCALE), angle: Math.atan2(dy, dx) });
            from = t;
          }
        }
        each('hit', targets);
      } else if (a.type === 'circle') {
        if (fx.slow) P('slow', primary.x, primary.y, { depth: under });
        else if (fx.dot) P('dot', primary.x, primary.y, { depth: under });
        else if (fx.push) P('push', primary.x, primary.y);
        else P('blast', primary.x, primary.y);
        if (fx.stun) P('stun', primary.x, primary.y);
        if (fx.vuln) each('vuln', targets, 5);
      } else {
        each('hit', targets); // single · multi
        if (fx.vuln) each('vuln', targets, 5);
        if (fx.stun) each('stun', targets, 3);
      }
    }
    if (def.gold) P('gold', unit.x, unit.y + 12);
    return true;
  }

  /** 몬스터 사망 (2026-11-21 귀여운 별 터짐): 일반 별 3 + 반짝이 2 · 정예 별 7 · 보스 폭발 시트 + 별 18. 언제나 true */
  death(m) {
    const n = m.isBoss ? 18 : m.kind === 'elite' ? 7 : 3;
    this.em.cutePop.explode(1, m.x, m.y - 6);
    this.em.cuteStar.explode(n, m.x, m.y - 6);
    this.em.cuteTwinkle.explode(m.isBoss ? 10 : 2, m.x, m.y - 6);
    if (m.isBoss) {
      this.s.cameras.main.shake(160, 0.004);
      this.play('boss_death', m.x, m.y, { depth: DEPTH.fx + 1, optional: false });
    }
    return true;
  }

  /** 몬스터 처치 골드 동전 (동시 MAX_COIN_FX 개까지, 넘으면 생략). 몬스터·용병보다 아래(바닥)에 깔린다 */
  coinDrop(x, y) {
    if (this.coinCount >= MAX_COIN_FX) return false;
    const d = FX.coin_drop;
    const s = this.s;
    if (!d || !s.anims.exists(fxAnim('coin_drop'))) return false;
    const spr = s.add.sprite(x, y + 8, fxTexture('coin_drop'), 0).setOrigin(d.ox, d.oy).setScale(d.px).setDepth(DEPTH.coin);
    this.coinCount++;
    spr.once('animationcomplete', () => spr.destroy());
    spr.once('destroy', () => this.coinCount--);
    spr.play(fxAnim('coin_drop'));
    return true;
  }

  /**
   * 용병에 붙는 이펙트: 용병 컨테이너 안(몸 뒤, 발밑 기준)에 넣어서 용병을 옮기면 같이 움직이고,
   * 용병이 사라지면 함께 사라진다. 반복 시트는 남겨 두고, 한 번 재생 시트는 끝나면 지운다.
   */
  attach(merc, key, scale) {
    const d = FX[key];
    if (!d || !this.s.anims.exists(fxAnim(key))) return null;
    const a = this.s.add.sprite(0, 28, fxTexture(key), 0).setOrigin(d.ox, d.oy).setScale(scale ?? d.px ?? FX_SCALE);
    merc.addAt(a, 0);
    a.play(fxAnim(key));
    if (!d.loop) a.once('animationcomplete', () => a.destroy());
    return a;
  }

  /** 레벨 업(0.44초). 영웅 승급도 같은 크기 — 대신 배너·큰 문구로 구분 */
  levelUp(merc, hero = false) {
    this.attach(merc, 'levelup');
  }

  /**
   * 버프·디버프 상태 표시: on 이면 반복 이펙트를 붙이고(이미 있으면 그대로), off 면 뗀다.
   * GameScene.updateMercs 가 매 프레임 버프(st.buffed)·디버프(st.debuff.list) 상태로 부른다.
   */
  setStatus(merc, key, on) {
    const slot = `${key}Fx`;
    if (on && !merc[slot]?.active) merc[slot] = this.attach(merc, key);
    else if (!on && merc[slot]) {
      merc[slot].destroy();
      merc[slot] = null;
    }
  }

  /** 기본 공격 명중: 클래스별 시트 + 속성 색 */
  hitFx(kind, attr, x, y) {
    const key = HIT_FX[kind];
    if (key) this.play(key, x, y, { tint: kind === 'ranger' ? 0xf2c14e : attr });
  }

  /** 속성 스킬 폭발 (레드 화염 · 블루 얼음 · 그린 가시). 반경 r(화면 px)에 맞춰 키운다 */
  elementBlast(x, y, r, attr) {
    const d = FX[`skill_${attr}`];
    if (!d) return false;
    // 플랫 시트(px 4)는 게임 픽셀 굵기 그대로, 촘촘한 시트는 반경에 맞춰 키운다
    const scale = d.px ?? Phaser.Math.Clamp(Math.round(((r * 2) / d.w) * 2) / 2, FX_SCALE, FX_SCALE * 2.5);
    return this.play(`skill_${attr}`, x, y, { scale, optional: false });
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
    const hit = (n = 2) => {
      this.burst(attr, tx, ty, n);
      this.hitFx(kind, attr, tx, ty);
    };

    switch (kind) {
      case 'archer':
      case 'ranger': {
        const a = this.arrow(kind === 'ranger' ? 'gold' : attr, sx, sy, ang, 1);
        s.tweens.add({ targets: a, x: tx, y: ty, duration: 110, onComplete: () => { a.destroy(); hit(kind === 'ranger' ? 3 : 2); } });
        break;
      }
      case 'mage': {
        const o = dotImage(s, sx, sy, `orb_${attr}`, PX).setDepth(DEPTH.projectile).setBlendMode('ADD');
        s.tweens.add({ targets: o, x: tx, y: ty, scale: DOT * 1.5, duration: 150, onComplete: () => { o.destroy(); hit(4); } });
        break;
      }
      case 'sniper': {
        const g = s.add.graphics().setDepth(DEPTH.projectile);
        g.lineStyle(6, this.color(attr), 0.6).lineBetween(sx, sy, tx, ty);
        g.lineStyle(2, 0xffffff, 1).lineBetween(sx, sy, tx, ty);
        this.fade(g, 140);
        const f = s.add.circle(sx, sy, 10, 0xffffff, 0.9).setDepth(DEPTH.fx);
        this.fade(f, 100, { scale: 1.8 });
        hit(3);
        break;
      }
      case 'shaman': {
        const r = dotImage(s, sx, sy, `rune_${attr}`, DOT).setDepth(DEPTH.projectile).setBlendMode('ADD');
        s.tweens.add({ targets: r, x: tx, y: ty, angle: 360, duration: 200, onComplete: () => { r.destroy(); hit(2); } });
        break;
      }
      case 'rogue': {
        const d = dotImage(s, sx, sy, `dagger_${attr}`, PX).setDepth(DEPTH.projectile);
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
        const p = dotImage(s, sx, sy, `proj_${attr}`, PX).setDepth(DEPTH.projectile);
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
        if (area.type === 'chain') {
          this.chain(targets, color);
          for (const t of targets.slice(0, 8)) this.play('hit_magic', t.x, t.y, { tint: attr });
        } else {
          this.magicCircle(cx, cy, area.type === 'single' || area.type === 'multi' ? 36 : r, attr);
          this.elementBlast(cx, cy, area.type === 'single' || area.type === 'multi' ? 40 : r, attr);
        }
        if (area.type === 'multi') for (const t of targets.slice(0, 6)) this.elementBlast(t.x, t.y, 28, attr);
        break;
      case 'sniper':
        for (const t of targets.slice(0, 8)) {
          this.snipe(unit, t, attr);
          s.time.delayedCall(120, () => this.play('hit_snipe', t.x, t.y, { optional: false }));
        }
        break;
      case 'shaman':
        this.totem(cx, cy, area.type === 'single' ? 40 : r, attr);
        this.elementBlast(cx, cy, area.type === 'single' ? 40 : r, attr);
        break;
      case 'rogue':
      case 'warlord':
        // X자 베기(slash) 대신 별 섬광 (2026-11-21 사용자 요청: X자 이펙트 삭제)
        for (const t of targets.slice(0, 10)) this.play('hit_star', t.x, t.y, { tint: attr });
        if (area.type === 'range' || area.type === 'circle') this.shockwave(cx, cy, r, color);
        break;
      default:
        this.shockwave(cx, cy, r, color);
    }
    for (const t of targets.slice(0, 12)) this.burst(attr, t.x, t.y, big ? 6 : 3);
    if (big) this.ultimate(unit, def);
  }

  /**
   * 화살 하나를 만든다 (PixelLab 시트 arrow_<색>, 기준점 = 화살촉). 시트가 없으면 코드 그림 화살.
   * color: red/blue/green/gold · size: 기본 배율(px 3)에 곱하는 값
   */
  arrow(color, x, y, rot, size = 1) {
    const s = this.s;
    const key = `arrow_${color}`;
    const d = FX[key];
    if (d && s.anims.exists(fxAnim(key))) {
      return s.add.sprite(x, y, fxTexture(key), 0).setOrigin(d.ox, d.oy).setScale(d.px).setRotation(rot).setDepth(DEPTH.projectile).play(fxAnim(key));
    }
    return dotImage(s, x, y, key, DOT * Math.max(1, Math.round(1.5 * size))).setRotation(rot).setDepth(DEPTH.projectile);
  }

  bigShot(unit, t, key, attr) {
    const a = this.arrow(key.replace('arrow_', ''), unit.x, unit.y - 8, Phaser.Math.Angle.Between(unit.x, unit.y, t.x, t.y), 4 / 3);
    this.s.tweens.add({ targets: a, x: t.x, y: t.y, duration: 130, onComplete: () => { a.destroy(); this.burst(attr, t.x, t.y, 6); } });
  }

  arrowRain(targets, attr, gold) {
    const key = gold ? 'arrow_gold' : `arrow_${attr}`;
    for (const t of targets.slice(0, 10)) {
      const ox = Phaser.Math.Between(-10, 10);
      const a = this.arrow(key.replace('arrow_', ''), t.x + ox, t.y - 160, Math.PI / 2, 1);
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
    const rune = dotImage(this.s, x, y, `rune_${attr}`, PX * 1.5).setDepth(DEPTH.fx).setBlendMode('ADD');
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
    this.play('ultimate', unit.x, unit.y + 28, { depth: DEPTH.fx + 2, optional: false });
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
    const rocket = dotImage(s, x, GAME_H + 10, 'p_spark', PX).setTint(color).setDepth(DEPTH.overlay + 2);
    s.tweens.add({
      targets: rocket, y, duration: Phaser.Math.Between(500, 800), ease: 'Cubic.easeOut',
      onUpdate: () => { if (Math.random() < 0.5) this.trail(rocket.x, rocket.y, color); },
      onComplete: () => {
        rocket.destroy();
        const n = 44;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const sp = i % 2 ? Phaser.Math.Between(120, 210) : Phaser.Math.Between(60, 110);
          const p = dotImage(s, x, y, 'p_star', PX).setTint(i % 3 ? color : 0xffffff).setDepth(DEPTH.overlay + 2).setBlendMode('ADD');
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
    const p = this.s.add.image(x, y, 'pixel').setScale(DOT * 2).setTint(color).setDepth(DEPTH.overlay + 2); // 2x2 도트 4칸
    this.fade(p, 300);
  }
}
