import Phaser from 'phaser';
import { UNIT_PX, CELL, DEPTH, BALANCE } from '../config.js';
import { GRADES, STYLES } from '../data/roster.js';
import { STAR_STAT, MAX_STAR, starSkill, maxMana } from '../data/stars.js';
import { TAVERN } from '../data/tavern.js';
import { TRAITS, RAGE_MAX } from '../data/synergy.js';
import { ITEM_BY_ID, itemFx, emblemTraits } from '../data/items.js';
import { cellCenter } from '../systems/path.js';
import { playBase, setArt, artScale } from '../systems/customArt.js';
import { ringPixels, starPixels, MARK_PX } from '../ui/gradeMark.js';
import { GRID } from '../config.js';

/** 필드 위 유닛 = 캐릭터 70명(data/roster.js) 중 하나 (룰 v2, 2026-11-20).
 *  등급·별(1~3, 같은 캐릭터 3장 → 승급)·계열·출신·고유 특성·스킬 1개(마나가 차면 시전) */
const NO_BONUS = {};
const NO_SYN = { tiers: {} };

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

/** 캐릭터 스킬 → 게임 스킬 정의 (별 단계 수치). level: 연출·효과음 세기 (유니크는 궁극기 연출 6, 나머지는 별+2) */
export function skillDef(c, star) {
  return { ...starSkill(c.skill, star), id: c.skill.id, level: c.grade === 4 ? 6 : Math.min(5, star + 2), attr: c.attr, star };
}

export class Mercenary extends Phaser.GameObjects.Container {
  /** @param {object} char data/roster.js 의 캐릭터 */
  constructor(scene, col, row, char, star = 1) {
    const c = cellCenter(col, row);
    super(scene, c.x, c.y);
    this.char = char;
    this.attr = char.attr; // 그림·이펙트 색만 (규칙에서 속성은 없다)
    this.grade = char.grade;
    this.star = star;
    this.def = skillDef(char, star);
    this.mana = 0;
    this.rage = 0; // 북방 부족 분노 중첩
    this.attacks = 0; // 공격 횟수 (전사 베기 주기)
    this.buffs = []; // { dmg, rate, range, crit, until }
    this.debuffs = []; // 보스 디버프 { def, until }
    this.col = col;
    this.row = row;
    this.cooldown = Math.random() * 0.5;
    this.invested = 0; // 이 유닛에 들어간 골드 (판매 환급 기준)
    this.kills = 0;
    this.waveKills = 0; // 이번 웨이브 처치 수 (상인의 저울)
    this.items = []; // 아이템 id (최대 3칸, data/items.js)

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
    return `${TRAITS[this.char.cls].name} · ${TRAITS[this.char.origin].name}`;
  }
  get cls() {
    return this.char.cls;
  }
  get origin() {
    return this.char.origin;
  }
  /** 바깥 16칸 = 전열 (전사 효과 1.5배) / 가운데 3×3 = 후열 (사수 사거리 +1칸) */
  get isFront() {
    return this.row === 0 || this.col === 0 || this.row === GRID - 1 || this.col === GRID - 1;
  }
  /** 최대 마나 (명성 강화 '전술 교범'·대마법사의 구슬만큼 줄어든다) */
  get maxMana() {
    const mb = this.scene?.bonus || NO_BONUS;
    return Math.max(20, Math.round(maxMana(STYLES[this.char.style], this.char.trait, this.char.skill) * (1 - (mb.cdr || 0) - (this.ifx.maxMana || 0))));
  }
  /** 아이템 효과 합계 */
  get ifx() {
    return itemFx(this.items);
  }
  /** 문장으로 더해진 계열·출신 (자기 계열·출신과 같은 문장은 효과 없음) */
  get extraTraits() {
    return emblemTraits(this.items).filter((k) => k !== this.char.cls && k !== this.char.origin);
  }
  get kind() {
    return STYLE_KIND[this.char.style];
  }
  get trait() {
    return this.char.trait;
  }
  /** 기본 능력치 = 공격 스타일 × 등급 배율 × 별 배율 */
  get baseStats() {
    const st = STYLES[this.char.style];
    return { ...st, dmg: st.dmg * GRADES[this.grade].mult * STAR_STAT[this.star - 1] };
  }

  drawPips() {
    // 등급 = 발밑 받침 고리(등급색 + 진한 외곽선), 별 = 고리 아래쪽 가운데 패 안 별 (2026-11-20)
    const P = MARK_PX;
    const paint = (g, list) => list.forEach(([x, y, c]) => g.fillStyle(c).fillRect(x * P, y * P, P, P));
    this.ringBack.clear();
    this.pips.clear();
    paint(this.ringBack, ringPixels(this.grade, 'back'));
    paint(this.pips, ringPixels(this.grade, 'front'));
    paint(this.pips, starPixels(this.grade, this.star));
    // 아이템: 고리 오른쪽 아래에 작은 칸 (재료는 테두리만)
    this.items.forEach((id, i) => {
      const it = ITEM_BY_ID[id];
      const col = Phaser.Display.Color.HexStringToColor(it?.color || TRAITS[it?.trait]?.color || '#ffffff').color;
      const x = 7 + i * 4, y = 11;
      this.pips.fillStyle(0x2b1d2f).fillRect(x * P, y * P, 4 * P, 4 * P);
      this.pips.fillStyle(col).fillRect((x + 1) * P, (y + 1) * P, 2 * P, 2 * P);
      if (it?.kind !== 'mat' && it?.kind !== 'seal') this.pips.fillStyle(0xffe066).fillRect((x + 1) * P, (y + 1) * P, P, P);
    });
  }

  preDestroy() {
    this.scene?.sys.updateList.remove(this.sprite);
    super.preDestroy(); // 컨테이너 기본 정리(자식 제거)도 반드시 실행
  }

  snapToCell() {
    const c = cellCenter(this.col, this.row);
    this.setPosition(c.x, c.y);
  }

  /** 별 승급 (같은 캐릭터 3장 → 다음 별). 스킬 수치도 그 별로 */
  starUp() {
    if (this.star >= MAX_STAR) return false;
    this.star += 1;
    this.def = skillDef(this.char, this.star);
    this.drawPips();
    return true;
  }

  /** 다른 캐릭터로 바꾼다 (테스트·디버그용) */
  setChar(char, star = this.star) {
    this.char = char;
    this.attr = char.attr;
    this.grade = char.grade;
    this.star = star;
    this.def = skillDef(char, star);
    setArt(this.sprite, this.textureKey, UNIT_PX);
    playBase(this.sprite, 'idle');
    this.drawPips();
    return this;
  }

  addBuff(b, now, durMult = 1) {
    this.buffs.push({ dmg: b.dmg || 0, rate: b.rate || 0, range: b.range || 0, crit: b.crit || 0, until: now + b.dur * durMult });
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

  /** 버프·디버프·시너지·아이템·명성 강화·유물(this.scene.bonus 에 합쳐 있음)·술집 강화 반영 최종 능력치 */
  getStats(_unused, now) {
    const base = this.baseStats;
    const t = this.trait;
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

    // 시너지 (data/synergy.js) — 내 계열·출신 단계 + 팀 전체 효과
    const syn = this.scene?.syn || NO_SYN;
    const my = syn.tiers[this.cls] || {};
    const org = syn.tiers[this.origin] || {};
    const front = this.cls === 'warrior' && this.isFront ? 1.5 : 1; // 전사는 전열에서 1.5배
    const rageOn = !!syn.tiers.north && this.origin === 'north';
    const rage = rageOn ? this.rage : 0;
    const synDmg = (my.dmg || 0) * front + (org.dmg || 0) + (syn.tiers.warrior?.teamDmg || 0) + (rageOn && rage >= RAGE_MAX ? org.rageDmg || 0 : 0);
    const synRate = (syn.tiers.support?.teamRate || 0) + rage * (org.rage || 0);
    const synRange = (my.range || 0) * front;

    const deb = this.debuffState(now);
    const ix = this.ifx; // 아이템 (data/items.js)
    // 명성 강화 + 장착 유물(영구) — 버프와 따로 곱한다 (meta.bonus 가 둘을 합쳐 둔다)
    const mb = this.scene?.bonus || NO_BONUS;
    const v = (k) => mb[k] || 0;
    const dmgBonus = buff.dmg + aura.dmg + deb.dmg + synDmg + (ix.dmg || 0);
    const rateBonus = buff.rate + aura.rate + deb.rate + synRate + (ix.rate || 0);
    const rangeBonus = buff.range + aura.range + synRange + (ix.range || 0);
    // 등급·자리·계열·출신 전용 강화(명성·유물) + 술집 강화(+10%씩)
    const enh = this.scene?.enhanceOf?.(this.char.id) || 0;
    const special = (1 + v(`grade_${this.grade}`) + (this.isFront ? v('frontline') : v('backline')) + v(`cls_${this.cls}`) + v(`org_${this.origin}`)) * (1 + TAVERN.enhanceDmg * enh);
    const backRange = (this.cls === 'ranger' && syn.tiers.ranger && !this.isFront ? 56 : 0) + (!this.isFront ? ix.backRange || 0 : 0); // 사수 후열·독수리 망원경: 사거리 +1칸

    return {
      damage: base.dmg * (t.dmgMul || 1) * BALANCE.baseDamageMult * (1 + v('dmg')) * special * Math.max(0.1, 1 + dmgBonus),
      rate: base.rate * (t.rateMul || 1) * (1 + v('rate')) * Math.max(0.1, 1 + rateBonus),
      range: base.range * (t.rangeMul || 1) * (1 + v('range')) * (1 + rangeBonus) + backRange,
      crit: Math.min(1, (t.crit || 0) + v('crit') + buff.crit + (my.crit || 0) + (ix.crit || 0)),
      critMult: 2 + v('critDmg') + (my.critDmg || 0),
      critExtra: my.critExtra || 0,
      targets: (t.targets || 1) + v('targets') + (ix.targets || 0),
      splash: ((base.splash || 0) + (t.splash || 0)) * (1 + v('splash') + (my.splash || 0) + (ix.area || 0)),
      burn: my.burn || 0,
      doubleBlast: !!my.double,
      cleaveEvery: my.cleaveEvery || 0,
      pierce: my.pierce || 0,
      eliteDmg: (my.eliteDmg || 0) + (ix.eliteDmg || 0),
      bossDmg: ix.bossDmg || 0,
      hex: 1 + (my.hex || 0),
      chain: t.chain || 0,
      slow: t.slow ? t.slow[0] : 0,
      slowDur: t.slow ? t.slow[1] : 0,
      manaGain: 10 + (org.mana || 0) + v('manaGain') + (ix.manaGain || 0),
      skillDmg: (org.skillDmg || 0) + v('skillDmg') + (ix.skillDmg || 0),
      skillArea: ix.skillArea || 0,
      item: ix,
      doubleCast: org.doubleCast || 0,
      buffed: this.buffs.length > 0,
      aura: aura.dmg + aura.rate + aura.range > 0,
      debuff: deb
    };
  }
}
