import Phaser from 'phaser';
import { ORIGIN_IDS, TRAITS } from '../../data/synergy.js';
import { ITEM_RULES, ITEM_BY_ID, MAT_IDS, isComponent, combine } from '../../data/items.js';
import { audio } from '../../systems/audio.js';

/** 아이템 조합: 아이템 띠 · 장착·조합 · 대장장이 · 해제 도구 · 드랍 */
export class ItemSystem {
  constructor(scene) {
    /** @type {import('../GameScene.js').GameScene} */
    this.scene = scene;
    this.smithBought = 0;
  }

  /** 아이템을 띠에 더한다 (가득 차면 false) */
  giveItem(id, x, y) {
    if (this.scene.bench.length >= ITEM_RULES.bench) {
      this.scene.toast('아이템 띠 가득', '#ff9a7a');
      return false;
    }
    this.scene.bench.push(id);
    audio.itemGet();
    if (x != null) this.scene.floatText(x, y - 30, ITEM_BY_ID[id].name, '#d6a8ff', 16, true);
    this.scene.tut.show('item');
    this.scene.hud?.refreshBench?.();
    return true;
  }

  returnItems(ids) {
    for (const id of ids) this.giveItem(id);
  }

  /**
   * 띠의 아이템을 캐릭터에게 장착: 재료끼리는 같은 캐릭터에서 자동 조합, 그 밖엔 빈 칸(3칸)에.
   * 인장 2개(출신 문장)는 그 캐릭터 출신이 아닌 출신 중 지금 가장 많이 모인 출신으로 (origin 을 주면 그것)
   */
  equip(benchIndex, merc, origin = null) {
    const id = this.scene.bench[benchIndex];
    if (!id || !merc || !this.scene.mercs.includes(merc)) return false;
    if (this.scene.lockedInWave('아이템 장착')) return false;
    let result = null;
    let slot = -1;
    if (isComponent(id)) {
      slot = merc.items.findIndex((x) => isComponent(x));
      if (slot >= 0) {
        const other = merc.items[slot];
        let org = origin;
        if (id === 'seal' && other === 'seal' && !org) {
          org = ORIGIN_IDS.filter((k) => k !== merc.origin && !merc.extraTraits.includes(k)).sort((a, b) => (this.scene.syn.counts[b] || 0) - (this.scene.syn.counts[a] || 0))[0];
        }
        result = combine(other, id, org);
      }
    }
    const emblemOf = (rid) => ITEM_BY_ID[rid]?.kind === 'emblem' && ITEM_BY_ID[rid].trait;
    const trait = emblemOf(result || id);
    if (trait && (trait === merc.cls || trait === merc.origin || merc.extraTraits.includes(trait))) {
      this.scene.toast(`${merc.heroName} · 이미 ${TRAITS[trait].name}`, '#ff9a7a');
      return false;
    }
    if (result) merc.items[slot] = result;
    else if (merc.items.length < ITEM_RULES.slots) merc.items.push(id);
    else {
      this.scene.toast(`${merc.heroName} · 아이템 칸 가득 (${ITEM_RULES.slots})`, '#ff9a7a');
      return false;
    }
    this.scene.bench.splice(benchIndex, 1);
    if (ITEM_BY_ID[id].kind === 'mat' && !result) merc.mana = Math.max(merc.mana, merc.ifx.startMana || 0); // 마력석: 시작 마나
    merc.drawPips();
    if (result) audio.itemCombine();
    else audio.itemEquip();
    if (result) {
      this.scene.levelUpFx(merc, ITEM_BY_ID[result].name);
      this.scene.toast(`조합: ${ITEM_BY_ID[result].name} — ${ITEM_BY_ID[result].text}`, '#f2c14e');
    }
    this.scene.recomputeSynergy();
    this.scene.hud?.refreshBench?.();
    if (this.scene.selected === merc) this.scene.refreshInfo();
    return true;
  }

  /** 판 안 대장장이: 골드로 무작위 재료 1개 (값은 살 때마다 오른다) */
  get smithCost() {
    return Math.round((ITEM_RULES.smith.base + ITEM_RULES.smith.step * this.smithBought) * (1 - (this.scene.bonus.smithDiscount || 0))); // 유물 모루 부적
  }

  smithBuy() {
    const cost = this.smithCost;
    if (this.scene.gold < cost) {
      this.scene.toast(`골드 부족 · 재료 ${cost}G`);
      return false;
    }
    if (this.scene.bench.length >= ITEM_RULES.bench) return this.giveItem(null) && false;
    this.scene.gold -= cost;
    this.smithBought += 1;
    this.giveItem(Phaser.Utils.Array.GetRandom(MAT_IDS));
    this.scene.refreshHud();
    return true;
  }

  /** 해제 도구: 캐릭터의 아이템을 모두 띠로 */
  useTool(merc) {
    if (this.scene.tools <= 0 || !merc?.items.length) return false;
    if (this.scene.bench.length + merc.items.length > ITEM_RULES.bench) {
      this.scene.toast('아이템 띠 자리 부족', '#ff9a7a');
      return false;
    }
    this.scene.tools -= 1;
    audio.itemRemove();
    this.returnItems(merc.items);
    merc.items = [];
    merc.mana = Math.min(merc.mana, merc.maxMana);
    merc.drawPips();
    this.scene.recomputeSynergy();
    this.scene.refreshInfo();
    return true;
  }

  /** 처치 보상 아이템: 정예 확률 재료 · 보스 재료 2(+인장·해제 도구 확률) · 강화 보스 인장·해제 도구 확정 */
  dropItems(m) {
    const R = ITEM_RULES;
    const mat = () => Phaser.Utils.Array.GetRandom(MAT_IDS);
    if (m.kind === 'elite' && Math.random() < R.eliteMat) this.giveItem(mat(), m.x, m.y);
    if (!m.isBoss) return;
    for (let i = 0; i < R.bossMats; i++) this.giveItem(mat(), m.x, m.y);
    const big = m.milestone || m.isFinal;
    if (big || Math.random() < R.bossSeal + (this.scene.bonus.sealChance || 0)) this.giveItem('seal', m.x, m.y);
    if (big || Math.random() < R.bossTool) {
      this.scene.tools += 1;
      this.scene.floatText(m.x, m.y - 50, '해제 도구 +1', '#d6a8ff', 16, true);
      this.scene.hud?.refreshBench?.();
    }
  }

  /** 웨이브 시작 때 아이템: 5웨이브마다 재료 · 상인의 저울 · 길드 금고 · 시작 마나 */
  waveItems(w) {
    if (w > 1 && w % ITEM_RULES.waveMatEvery === 1) this.giveItem(Phaser.Utils.Array.GetRandom(MAT_IDS));
    let gold = 0;
    for (const m of this.scene.mercs) {
      const ix = m.ifx;
      if (w >= 2 && ix.killWaveGold) gold += Math.floor((m.waveKills || 0) * ix.killWaveGold);
      if (w >= 2 && ix.vault) gold += ix.vault * (1 + Math.floor(w / 10));
      if (ix.startMana) m.mana = Math.max(m.mana, ix.startMana);
      m.waveKills = 0;
    }
    if (gold) {
      this.scene.gold += gold;
      this.scene.floatText(300, 170, `+${gold}G 아이템`, '#f2c14e', 16, false, true);
    }
  }
}
