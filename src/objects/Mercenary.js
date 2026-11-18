import Phaser from 'phaser';
import { UNIT_PX, CELL, DEPTH, BALANCE } from '../config.js';
import { GRADES, STYLES, skillLevels } from '../data/roster.js';
import { cellCenter } from '../systems/path.js';
import { playBase, setArt, artScale } from '../systems/customArt.js';
import { ringPixels, levelPixels, MARK_PX } from '../ui/gradeMark.js';

export const MAX_LEVEL = 5; // 최고 레벨 (2026-11-17: 영웅 승급 폐지 — 유니크는 고용으로만)

/** 필드 위 유닛 = 캐릭터 104명(data/roster.js) 중 하나. 등급·속성·레벨·고유 특성·확정 스킬 */
const NO_BONUS = {};

// 아직 전용 그림이 없는 캐릭터의 임시 그림 (ChatGPT 그림을 manifest 에 `char_<id>` 로 넣으면 그게 우선)
const OLD_SPRITE = {
  eric: 'merc_archer_red', rowan: 'merc_rogue_red', helga: 'merc_shaman_red', gunnar: 'merc_sniper_red', bridget: 'merc_mage_red',
  sigrid: 'merc_archer_blue', olaf: 'merc_mage_blue', edmund: 'merc_sniper_blue', ingrid: 'merc_shaman_blue', finn: 'merc_rogue_blue',
  robin: 'merc_archer_green', freya: 'merc_mage_green', torvald: 'merc_sniper_green', astrid: 'merc_shaman_green', leif: 'merc_rogue_green',
  ragnar: 'hero_ragnar', isolde: 'hero_isolde', bjorn: 'hero_bjorn', arthur: 'hero_arthur', solveig: 'hero_solveig', william: 'hero_william',
  halvard: 'hero_halvard', freydis: 'hero_freydis', richard: 'hero_richard', brynhild: 'hero_ragnar', vivian: 'hero_solveig', oberon: 'hero_freydis',
  verona: 'merc_mage_red', elin: 'merc_archer_green', thorn: 'merc_shaman_green', serena: 'hero_solveig', nix: 'merc_rogue_blue'
};
const STYLE_SPRITE = { bow: 'archer', rapid: 'rogue', heavy: 'sniper', blast: 'mage', hex: 'shaman', aid: 'shaman', brawl: 'rogue' };
/** 연출·효과음용 종류 (예전 병과 이름을 그대로 쓴다) */
export const STYLE_KIND = { bow: 'archer', rapid: 'rogue', heavy: 'sniper', blast: 'mage', hex: 'shaman', aid: 'shaman', brawl: 'warlord' };

/** 캐릭터 그림 텍스처 키: 직접 넣은 그림(manifest `char_<id>`)이 있으면 그것, 없으면 임시 그림 */
export function charTexture(scene, c) {
  const own = `char_${c.id}`;
  if (scene?.textures.exists(own)) return own;
  return OLD_SPRITE[c.id] || `merc_${STYLE_SPRITE[c.style]}_${c.attr}`;
}

/** 로비·병영의 캐릭터 그림 (직접 그린 시트는 첫 프레임 + manifest 배율) */
export function charImage(scene, x, y, c, base) {
  const key = charTexture(scene, c);
  const tex = scene.textures.get(key);
  const frame = tex.frameTotal > 2 && tex.has(0) ? 0 : undefined;
  const img = scene.add.image(x, y, key, frame).setScale(base * artScale(scene, key));
  const cd = tex.customData || {};
  if (cd.frameWidth && cd.pivotX != null) img.setOrigin(cd.pivotX / cd.frameWidth, cd.pivotY != null ? cd.pivotY / cd.frameHeight : 0.5); // 몸 중심을 자리에
  return img;
}

/** 캐릭터 스킬 → 게임 스킬 정의 (id·습득 레벨·속성). 유니크 Lv1 대표 스킬은 영웅 궁극기 연출(level 6) */
export function skillDefs(c) {
  const lv = skillLevels(c);
  return c.skills.map((s, i) => ({ ...s, id: `${c.id}_${i}`, unlock: lv[i], level: c.grade === 4 && i === 0 ? MAX_LEVEL + 1 : lv[i], attr: c.attr }));
}

export class Mercenary extends Phaser.GameObjects.Container {
  /** @param {object} char data/roster.js 의 캐릭터 */
  constructor(scene, col, row, char) {
    const c = cellCenter(col, row);
    super(scene, c.x, c.y);
    this.char = char;
    this.attr = char.attr;
    this.grade = char.grade;
    this.level = 1;
    this.defs = skillDefs(char);
    this.skills = []; // { def, cd }
    this.buffs = []; // { dmg, rate, range, crit, until }
    this.debuffs = []; // 보스 디버프 { def, until }
    this.col = col;
    this.row = row;
    this.cooldown = Math.random() * 0.5;
    this.invested = 0;
    this.kills = 0;
    this.learnUpTo(1);

    // 몸통이 칸 가운데에 오도록 (그림의 몸 중심 = manifest pivotX/pivotY, 없으면 그림 가운데)
    this.sprite = setArt(scene.add.sprite(0, 0, this.textureKey), this.textureKey, UNIT_PX);
    scene.sys.updateList.add(this.sprite); // 컨테이너 안 스프라이트도 애니메이션이 돌도록
    playBase(this.sprite, 'idle');
    this.ringBack = scene.add.graphics(); // 받침 고리 뒤쪽 반 (캐릭터 뒤)
    this.pips = scene.add.graphics(); // 받침 고리 앞쪽 반 + 레벨 패 (캐릭터 앞)
    this.add([this.ringBack, this.sprite, this.pips]);
    this.drawPips();

    this.setSize(CELL, CELL);
    this.setDepth(DEPTH.merc);
    this.setInteractive({ draggable: true, useHandCursor: true });
    scene.add.existing(this);
  }

  /** 최고 등급(유니크) — 예전 '영웅' 자리 (금색 표시) */
  get isHero() {
    return this.grade === 4;
  }
  get textureKey() {
    return charTexture(this.scene, this.char);
  }
  get heroName() {
    return this.char.name;
  }
  get gradeName() {
    return GRADES[this.grade].name;
  }
  get roleName() {
    return `${GRADES[this.grade].name} ${STYLES[this.char.style].name}`;
  }
  get kind() {
    return STYLE_KIND[this.char.style];
  }
  get trait() {
    return this.char.trait;
  }
  /** 1레벨 기본 능력치 = 공격 스타일 × 등급 배율 */
  get baseStats() {
    const st = STYLES[this.char.style];
    return { ...st, dmg: st.dmg * GRADES[this.grade].mult };
  }

  drawPips() {
    // 등급 = 발밑 받침 고리(등급색 + 진한 외곽선), 레벨 = 고리 아래쪽 가운데 패 숫자 (2026-11-18)
    const P = MARK_PX;
    const paint = (g, list) => list.forEach(([x, y, c]) => g.fillStyle(c).fillRect(x * P, y * P, P, P));
    this.ringBack.clear();
    this.pips.clear();
    paint(this.ringBack, ringPixels(this.grade, 'back'));
    paint(this.pips, ringPixels(this.grade, 'front'));
    paint(this.pips, levelPixels(this.grade, this.level));
  }

  preDestroy() {
    this.scene?.sys.updateList.remove(this.sprite);
    super.preDestroy(); // 컨테이너 기본 정리(자식 제거)도 반드시 실행
  }

  snapToCell() {
    const c = cellCenter(this.col, this.row);
    this.setPosition(c.x, c.y);
  }

  /** 같은 속성 + 같은 등급 + 같은 레벨끼리 합친다 (2026-11-17). 최고 레벨이면 더 못 합친다 */
  canMergeWith(other) {
    return !!other && other !== this && other.attr === this.attr && other.grade === this.grade && other.level === this.level && this.level < MAX_LEVEL;
  }

  /** 다른 캐릭터로 바꾼다 (테스트·디버그용): 지금 레벨까지의 스킬을 다시 익히고 그림을 바꾼다 */
  setChar(char) {
    this.char = char;
    this.attr = char.attr;
    this.grade = char.grade;
    this.defs = skillDefs(char);
    this.skills = [];
    this.learnUpTo(this.level);
    setArt(this.sprite, this.textureKey, UNIT_PX);
    playBase(this.sprite, 'idle');
    this.drawPips();
    return this;
  }

  /** level 까지 열리는 확정 스킬을 모두 익힌다 (이미 익힌 것은 건너뛴다) */
  learnUpTo(level) {
    const out = [];
    for (const def of this.defs) {
      if (def.unlock > level || this.skills.some((s) => s.def.id === def.id)) continue;
      this.skills.push({ def, cd: def.cd * 0.5 });
      out.push(def);
    }
    return out;
  }

  /** 레벨 업 → 그 레벨에 열리는 스킬을 익힌다. 새로 익힌 스킬 목록을 돌려준다 */
  levelUp() {
    this.level += 1;
    const learned = this.learnUpTo(this.level);
    this.drawPips();
    return learned;
  }

  addBuff(b, now) {
    this.buffs.push({ dmg: b.dmg || 0, rate: b.rate || 0, range: b.range || 0, crit: b.crit || 0, until: now + b.dur });
  }

  addDebuff(def, now, durMult = 1) {
    const dur = def.dur * durMult;
    const cur = this.debuffs.find((d) => d.def.id === def.id);
    if (cur) cur.until = Math.max(cur.until, now + dur);
    else this.debuffs.push({ def, until: now + dur });
  }

  /** 현재 걸린 보스 디버프 요약 */
  debuffState(now) {
    this.debuffs = this.debuffs.filter((d) => d.until > now);
    const s = { rate: 0, dmg: 0, cdRate: 1, silence: false, stun: false, list: this.debuffs };
    for (const { def } of this.debuffs) {
      const e = def.effect;
      if (e.rate) s.rate += e.rate;
      if (e.dmg) s.dmg += e.dmg;
      if (e.cdRate) s.cdRate = Math.min(s.cdRate, e.cdRate);
      if (e.silence) s.silence = true;
      if (e.stun) s.stun = true;
    }
    return s;
  }

  /** 유물·버프·디버프 반영 최종 능력치 */
  getStats(relics, now) {
    const base = this.baseStats;
    const t = this.trait;
    const n = (id) => relics[id] || 0;
    this.buffs = this.buffs.filter((b) => b.until > now);
    const buff = this.buffs.reduce((s, b) => ({ dmg: s.dmg + b.dmg, rate: s.rate + b.rate, range: s.range + b.range, crit: s.crit + b.crit }), {
      dmg: 0,
      rate: 0,
      range: 0,
      crit: 0
    });
    // 주변 8칸 아군의 상시 오라 (특성 aura)
    const aura = { dmg: 0, rate: 0, range: 0 };
    for (const o of this.scene?.mercs || []) {
      const a = o.trait?.aura;
      if (!a || o === this || o.dragging || Math.abs(o.col - this.col) > 1 || Math.abs(o.row - this.row) > 1) continue;
      aura.dmg += a.dmg || 0;
      aura.rate += a.rate || 0;
      aura.range += a.range || 0;
    }

    const deb = this.debuffState(now);
    // 명성 강화(영구) — 유물·버프와 따로 곱한다. 유물 효과는 '유물 감정'만큼 커진다
    const mb = this.scene?.bonus || NO_BONUS;
    const v = (k) => mb[k] || 0;
    const rp = 1 + v('relicPow');
    const dmgBonus = (0.2 * n('hero_sword') + 0.4 * n(`${this.attr}_orb`)) * rp + buff.dmg + aura.dmg + deb.dmg;
    const rateBonus = 0.15 * n('war_drum') * rp + buff.rate + aura.rate + deb.rate;
    const rangeBonus = 0.15 * n('hawk_eye') * rp + buff.range + aura.range;
    // 속성·등급 전용 강화
    const special = 1 + v(`attr_${this.attr}`) + v(`grade_${this.grade}`);
    const lv = Math.min(this.level, MAX_LEVEL);

    return {
      damage: base.dmg * (t.dmgMul || 1) * BALANCE.levelDamage[lv - 1] * BALANCE.baseDamageMult * (1 + v('dmg')) * special * Math.max(0.1, 1 + dmgBonus),
      rate: base.rate * (t.rateMul || 1) * (1 + v('rate')) * Math.max(0.1, 1 + rateBonus),
      range: base.range * (t.rangeMul || 1) * (1 + v('range')) * (1 + rangeBonus),
      crit: Math.min(1, (t.crit || 0) + 0.1 * n('lucky_coin') * rp + v('crit') + buff.crit),
      critMult: 2 + v('critDmg'),
      targets: (t.targets || 1) + v('targets'),
      splash: ((base.splash || 0) + (t.splash || 0)) * (1 + v('splash')),
      chain: t.chain || 0,
      slow: t.slow ? t.slow[0] : 0,
      slowDur: t.slow ? t.slow[1] : 0,
      buffed: this.buffs.length > 0,
      aura: aura.dmg + aura.rate + aura.range > 0,
      debuff: deb
    };
  }
}
