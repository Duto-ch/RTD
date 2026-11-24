import Phaser from 'phaser';
import { PX, DEPTH } from '../config.js';
import { pathPoint } from '../systems/path.js';
import { monsterStats, isFinalWave } from '../data/waves.js';
import { monsterDesign, variantDesign } from '../data/monsters.js';
import { playBase, setArt } from '../systems/customArt.js';
import { dotKey } from '../art/textures.js';
import { BOSS_ABILITIES } from '../data/bossAbilities.js';
import { ELITE_SKILLS } from '../data/eliteSkills.js';
import { BALANCE } from '../config.js';

export class Monster extends Phaser.GameObjects.Sprite {
  constructor(scene, kind, attr, wave, milestone = false, variant = null) {
    const design = variant && kind === 'normal' ? variantDesign(variant, wave) : monsterDesign(kind, wave);
    super(scene, 0, 0, Monster.texKey(scene, design, attr, kind));
    this.design = design; // { id, name } — 웨이브별 전용 외형 (특수 몬스터는 종류별 외형)
    const s = monsterStats(kind, wave, milestone, variant);
    // 특수 몬스터 (2026-11-24): 빠름·방어력·물리 저항·마법 저항
    this.variant = variant;
    this.armor = s.armor || 0; // 한 대마다 이만큼 피해가 줄어든다 (최소 BALANCE.special.minDmg, 지속 피해는 무시)
    this.resist = s.resist || null; // 'phys' | 'magic' — 그 종류 피해를 BALANCE.special.resist 만큼만 받는다
    this.stun = s.stun || null; // 기절: { cd, dur, range } — GameScene.updateStunners
    this.stunCd = this.stun ? 2 + Math.random() * 3 : 0; // 처음엔 2~5초 뒤
    // 스킬 정예 (2026-11-24): 용병 디버프 또는 주변 몬스터 오라 — GameScene.updateEliteSkills
    this.eliteSkill = kind === 'elite' && variant === 'caster' ? Phaser.Utils.Array.GetRandom(ELITE_SKILLS) : null;
    this.skillCd = this.eliteSkill ? 2 + Math.random() * 2 : 0;
    this.auraGuard = 0; // 오라를 받는 중: 받는 피해 감소
    this.auraHaste = 0; // 이동 속도 +
    this.auraRegen = 0; // 초당 최대 체력 비율 회복
    this.milestone = milestone; // 강화 보스 (30·60·90)
    this.isFinal = kind === 'boss' && isFinalWave(wave); // 최종 보스 (100웨이브마다)
    this.revived = false;
    this.enraged = false;
    this.shiftTimer = BALANCE.milestone.shiftEvery;
    this.kind = kind;
    this.attr = attr;
    this.maxHp = s.hp;
    this.hp = s.hp;
    this.baseSpeed = s.speed;
    this.gold = s.gold;
    this.dist = 0; // 출발점부터 이동한 거리 (PATH_LENGTH 를 넘을 때마다 성벽을 때린다)
    this.lapHits = 0; // 성벽을 때린 바퀴 수 (넉백으로 되돌아가도 같은 바퀴는 다시 세지 않는다)
    // 물량: 일반 몬스터는 길 폭 전체에 퍼져 걷는다 (정예는 조금만, 보스는 가운데)
    const H = BALANCE.horde;
    this.lane = kind === 'boss' ? 0 : (Math.random() * 2 - 1) * (kind === 'elite' ? H.laneSpread * 0.4 : H.laneSpread);
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

    // 도트 2px (2026-11-21): 정예 배율 4 = 2배 해상도 텍스처, 보스 배율 6(이전 5) = 3배 해상도 텍스처 (dotKey)
    this.baseScale = kind === 'boss' ? 6 : kind === 'elite' ? PX : H.normalScale;
    setArt(this, this.texture.key, this.baseScale);
    this.setDepth(DEPTH.monster + (kind === 'boss' ? 2 : kind === 'elite' ? 1 : 0));
    scene.add.existing(this);
    playBase(this, 'walk');
    this.place();
  }

  /** 몬스터 텍스처 키 — 정예·보스는 도트 2px 가 되도록 n배 해상도 (dotKey) */
  static texKey(scene, design, attr, kind) {
    return dotKey(scene, `mon_${design.id}_${attr}`, kind === 'boss' ? 3 : kind === 'elite' ? 2 : 1);
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
    return (now < this.vulnUntil ? 1 + this.vulnPct : 1) * (1 - this.auraGuard);
  }

  /** 저항 배율: 공격한 용병의 피해 종류(물리·마법·폭발)가 이 몬스터의 저항과 같으면 BALANCE.special.resist */
  resistMult(source) {
    return this.resist && source?.dmgType === this.resist ? BALANCE.special.resist : 1;
  }

  /** 받는 피해: 약화·저항 배율 → 방어력(한 대마다 armor 만큼, 최소 minDmg 비율 · 지속 피해는 방어력 무시) */
  mitigate(amount, now, source, dot = false) {
    let a = amount * this.damageTakenMult(now) * this.resistMult(source);
    if (this.armor && !dot) a = Math.max(a * BALANCE.special.minDmg, a - this.armor);
    return a;
  }

  /** 이 몬스터를 죽이는 데 드는 (줄기 전) 피해 — 관통이 남는 피해를 계산할 때 */
  rawToKill(now, source) {
    const m = this.damageTakenMult(now) * this.resistMult(source);
    if (!this.armor) return this.hp / m;
    return Math.min((this.hp + this.armor) / m, this.hp / (m * BALANCE.special.minDmg));
  }

  place() {
    const p = pathPoint(this.dist, this.lane);
    // 2프레임 깡충 애니메이션 (픽셀 격자 유지). 기절 중엔 멈춤
    const stunned = this.scene.gameTime < this.stunUntil;
    const animated = this.anims.isPlaying;
    const hop = animated || stunned || Math.floor(this.scene.gameTime * 4 + this.phase) % 2 === 0 ? 0 : -Math.min(PX, this.baseScale);
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
    setArt(this, Monster.texKey(this.scene, this.design, attr, this.kind), this.baseScale);
    playBase(this, 'walk');
  }

  tick(dt, now, speedMul) {
    if (now > this.slowUntil) this.slowPct = 0;
    const rage = this.enraged ? BALANCE.milestone.enrageSpeed : 1;
    if (now >= this.stunUntil) this.dist += this.baseSpeed * rage * (1 - this.slowPct) * (1 + this.auraHaste) * speedMul * dt;
    if (this.auraRegen > 0 && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + this.maxHp * this.auraRegen * dt); // 재생 오라
    this.place();

    // 지속 피해
    if (this.dots.length) {
      this.dots = this.dots.filter((d) => d.until > now);
      let total = 0;
      for (const d of this.dots) total += d.dps * dt;
      if (total > 0) this.scene.damageMonster(this, total, { source: this.dots[0]?.source, silent: true, dot: true });
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
