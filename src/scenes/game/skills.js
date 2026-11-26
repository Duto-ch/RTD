import { ATTR_INFO } from '../../data/elements.js';
import { audio } from '../../systems/audio.js';
import { d2 } from './util.js';

/** 스킬 시전: 데이터(area·fx·buff·gold)로 정의된 스킬 실행 */
export class SkillCaster {
  constructor(scene) {
    /** @type {import('../GameScene.js').GameScene} */
    this.scene = scene;
  }

  /** 스킬 시전. 대상이 없어 시전하지 못하면 false (쿨타임 유지, 다음 프레임 재시도) */
  castSkill(merc, def, st, inRange) {
    const now = this.scene.gameTime;
    if (st.skillArea && def.area?.r) def = { ...def, area: { ...def.area, r: Math.round(def.area.r * (1 + st.skillArea)) } }; // 별빛 망원경
    const live = inRange.filter((m) => m.alive);
    let targets = [];
    let primary = null;

    if (def.area) {
      if (!live.length) return false;
      primary = def.pick === 'strongest' ? live.reduce((a, b) => (b.hp > a.hp ? b : a)) : live[0];
      const a = def.area;
      if (a.type === 'single') targets = [primary];
      else if (a.type === 'multi') targets = live.slice(0, a.n);
      else if (a.type === 'range') targets = live;
      else if (a.type === 'circle') targets = this.scene.monsters.filter((m) => m.alive && d2(m, primary) <= a.r * a.r);
      else if (a.type === 'chain') targets = this.scene.chainFrom(primary, a.n);
    } else if (def.buff && !live.length) {
      return false;
    }
    // 레어·유니크는 캐릭터 전용 이펙트, 커먼·언커먼은 공용 세트 이펙트 (2026-11-18). 시트가 없으면 예전 연출
    if (!this.scene.vfx.sigSkill(merc, def, targets, primary) && !this.scene.vfx.setSkill(merc, def, targets, primary)) this.scene.vfx.skill(merc, def, this.scene.kindOf(merc), targets, primary, st.range);
    if (def.level > 5 || merc.grade === 3) audio.ult(); // 궁극기 소리: 유니크 + 레어 (2026-11-22 사용자 요청)
    else audio.skill(def.level, merc.attr);

    const fx = def.fx || {};
    // 스킬 피해: 마탑·호수 시너지 + 명성 강화 '비전 연구' (룰 v2: 속성 추가 효과 없음)
    const flavorMul = 1 + (st.skillDmg || 0);
    const hex = st.hex || 1; // 주술사 시너지: 지속 피해·약화·감속 강화
    for (const t of targets) {
      if (!t.alive) continue;
      if (fx.stun) t.applyStun(fx.stun, now);
      if (fx.slow) t.applySlow(Math.min(0.85, fx.slow[0] * hex), fx.slow[1], now);
      if (fx.vuln) t.applyVuln(fx.vuln[0] * hex, fx.vuln[1], now);
      if (fx.push) t.push(fx.push);
      if (fx.dot) t.applyDot(st.damage * fx.dot[0] * flavorMul * hex, fx.dot[1], now, merc);

      let mult = fx.dmg || 0;
      if (fx.execute) {
        if (!t.isBoss && t.hp / t.maxHp <= fx.execute[0]) {
          this.scene.floatText(t.x, t.y - 24, '처형!', '#ff5050');
          this.scene.killMonster(t, merc);
          continue;
        }
        mult = t.isBoss ? fx.execute[1] : 1;
      }
      if (fx.bossMult && t.isBoss) mult *= fx.bossMult;
      const sc = st.item?.skillCrit && Math.random() < st.crit; // 룬 각인 검: 스킬 치명타
      if (mult) this.scene.hit(merc, st, t, mult * flavorMul * (sc ? st.critMult : 1), sc, targets.length <= 3); // 범위 스킬은 관통 없음 (이미 여럿을 때린다)
    }

    if (def.buff) {
      const b = def.buff;
      const who =
        b.scope === 'self' ? [merc] :
        b.scope === 'all' ? this.scene.mercs :
        this.scene.mercs.filter((o) => Math.abs(o.col - merc.col) <= 1 && Math.abs(o.row - merc.row) <= 1);
      const durMult = this.scene.syn.tiers.support?.buffDur || 1; // 지원가 5: 버프 지속 1.5배
      for (const o of who) {
        o.addBuff(b, now, durMult);
        o.buffFlashUntil = now + 0.25;
      }
    }
    // 아이템: 폭주 마도서(같은 자리 한 번 더 폭발) · 연금술 플라스크(골드)
    if (st.item?.afterBlast && primary) {
      const at = { x: primary.x, y: primary.y };
      this.scene.time.delayedCall(300, () => {
        if (this.scene.over) return;
        for (const o of this.scene.monsters) if (o.alive && d2(o, at) <= 60 * 60) this.scene.hit(merc, st, o, st.item.afterBlast, false, false);
        this.scene.circleFx(at.x, at.y, 60, 0x8a4fb5);
      });
    }
    if (st.item?.skillGold) {
      this.scene.gold += st.item.skillGold;
      this.scene.floatText(merc.x + 14, merc.y - 30, `+${st.item.skillGold}G`, '#f2c14e');
    }
    if (def.gold) {
      const g = def.gold + Math.floor(this.scene.wave * (def.goldPerWave || 0));
      this.scene.gold += g;
      this.scene.floatText(merc.x, merc.y - 40, `+${g}G`, '#f2c14e');
    }
    if (def.level <= 5) this.scene.floatText(merc.x, merc.y - 40 - (merc.col % 2) * 20, def.name, ATTR_INFO[merc.attr].css, def.level >= 4 ? 22 : 16, def.level >= 4);
    return true;
  }
}
