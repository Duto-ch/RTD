import Phaser from 'phaser';
import { Mercenary } from '../../objects/Mercenary.js';
import { ROSTER_BY_ID } from '../../data/roster.js';
import { MAX_STAR } from '../../data/stars.js';
import { SHOP, priceOf, rerollCost, levelUpCost, refillShop, findStarUp } from '../../data/shop.js';
import { ITEM_RULES } from '../../data/items.js';
import { audio } from '../../systems/audio.js';

/** 상점 · 영지 레벨 · 별 승급 · 판매 (룰 v2) */
export class ShopSystem {
  constructor(scene) {
    /** @type {import('../GameScene.js').GameScene} */
    this.scene = scene;
    this.rerollCount = 0; // 이번 웨이브에 돈 내고 리롤한 횟수 (리롤 값이 그만큼 오른다)
  }

  /** 명성 강화 '징집령': 시작할 때 덱에서 무료 용병 배치 ('노련한 신병'이면 언커먼 이상) */
  conscript() {
    for (let i = 0; i < (this.scene.bonus.conscripts || 0); i++) {
      const pool = this.scene.deck.filter((id) => ROSTER_BY_ID[id] && ROSTER_BY_ID[id].grade === (this.scene.bonus.veteran ? 2 : 1));
      const id = Phaser.Utils.Array.GetRandom(pool.length ? pool : this.scene.deck);
      if (id) this.placeChar(ROSTER_BY_ID[id], 0, true);
    }
  }

  /** 놓을 수 있는 인원 (영지 레벨) */
  get cap() {
    return SHOP.cap(this.scene.estate);
  }

  /** 영지 레벨 업 값 (최고 레벨이면 null) */
  get estateCost() {
    return levelUpCost(this.scene.estate, this.scene.bonus.estateDiscount || 0);
  }

  /** 지금 리롤 값 (무료 리롤이 남았으면 0) */
  get rerollPrice() {
    if (this.scene.freeRerolls > 0) return 0;
    return Math.max(0, rerollCost(this.scene.shop, { rerolls: this.rerollCount || 0, wave: this.scene.wave }) - (this.scene.bonus.rerollDiscount || 0));
  }

  /** 판매 환급 비율 (명성 강화 '깔끔한 정산') */
  get sellRefund() {
    return SHOP.sellRefund + (this.scene.bonus.sellRefund || 0);
  }

  /** 이미 3성인 캐릭터 (상점에 더 나오지 않는다) */
  maxedIds() {
    return new Set(this.scene.allUnits.filter((m) => m.star >= MAX_STAR).map((m) => m.char.id));
  }

  /** 이 캐릭터를 사면 별 승급이 되는가 (같은 캐릭터 1성 2장이 이미 있으면) — 인원이 꽉 차도 살 수 있다 */
  completesStar(id) {
    return this.scene.allUnits.filter((m) => m.char.id === id && m.star === 1).length >= 2;
  }

  /** 디버그·테스트용: 덱에서 무작위 캐릭터를 빈 칸에 바로 놓는다 (골드·인원 제한 없음 — 게임 규칙은 상점 buy) */
  hire(id) {
    const pool = this.scene.deck.filter((x) => ROSTER_BY_ID[x]);
    const char = ROSTER_BY_ID[typeof id === 'string' ? id : Phaser.Utils.Array.GetRandom(pool)];
    if (!char || !this.scene.emptyCell(char)) return null;
    return this.placeChar(char, priceOf(char));
  }

  /** 상점 칸 사기 */
  buy(i) {
    if (this.scene.over || this.scene.lockedInWave('용병 구매')) return null;
    const slot = this.scene.shop[i];
    if (!slot || slot.sold) return null;
    const char = ROSTER_BY_ID[slot.id];
    const cost = priceOf(char);
    if (this.scene.gold < cost) {
      this.scene.toast('골드 부족');
      return null;
    }
    // 필드 인원이 가득 차면 대기석으로 (2026-11-21) — 대기석도 차면 못 산다 (별 승급이 되는 3장째는 예외)
    const toBench = this.scene.mercs.length >= this.cap || !this.scene.emptyCell(char);
    if (toBench && this.scene.freeReserve() < 0 && !this.completesStar(char.id)) {
      this.scene.toast(`필드(${this.cap}명)·대기석 가득`, '#ff9a7a');
      this.scene.tut.show('estate');
      return null;
    }
    const merc = this.placeChar(char, cost, false, toBench);
    if (!merc) return null;
    this.scene.gold -= cost;
    slot.sold = true;
    slot.locked = false;
    audio.coin();
    this.scene.refreshShop();
    this.scene.refreshHud();
    return merc;
  }

  /** 캐릭터를 빈 칸에 놓고 별 승급을 확인한다. cost: 들어간 골드 */
  placeChar(char, cost, free = false, toBench = false) {
    let cell = toBench ? null : this.scene.emptyCell(char);
    const slot = toBench ? this.scene.freeReserve() : -1;
    if (!cell && slot < 0) {
      // 칸이 없어도 별 승급이 되면 놓을 수 있게: 승급 재료 한 장 자리를 잠깐 쓴다
      if (!this.completesStar(char.id)) {
        this.scene.toast('빈 칸 없음');
        return null;
      }
      const m0 = this.scene.allUnits.find((m) => m.char.id === char.id && m.star === 1);
      return this.starUpWith(m0, char, cost);
    }
    const merc = new Mercenary(this.scene, cell ? cell.c : 0, cell ? cell.r : 0, char);
    merc.invested = cost;
    merc.mana = Math.round(merc.maxMana * (this.scene.bonus.startMana || 0)); // 명성 강화 '마나 정수'
    if (cell) this.scene.toField(merc, cell.c, cell.r);
    else {
      this.scene.toReserve(merc, slot);
      this.scene.tut.show('reserve');
    }
    // 떨어지며 등장 — 정지 중(트윈 멈춤)에 사면 그대로 놓는다 (안 그러면 다시 움직일 때까지 투명해 안 보였다, 2026-11-22)
    if (!this.scene.tweens.paused) {
      merc.sprite.setY(-40).setAlpha(0);
      this.scene.tweens.add({ targets: merc.sprite, y: 0, alpha: 1, duration: 220, ease: 'Bounce.easeOut' });
    }
    if (free) this.scene.toast(`징집: ${merc.gradeName} ${merc.heroName} 합류!`, '#f2c14e');
    else if (merc.isHero) {
      this.scene.levelUpFx(merc, '유니크!', true);
      this.scene.showBanner(`유니크 ${merc.heroName} 합류!`, `${merc.char.title} · 스킬 「${merc.def.name}」`, '#f2c14e');
      audio.promote();
      this.scene.tut.show('hero');
    }
    const up = this.checkStarUps();
    this.scene.recomputeSynergy();
    return up || merc;
  }

  /** 칸이 꽉 찼을 때: 같은 캐릭터 1성에 바로 합쳐 승급 */
  starUpWith(base, char, cost) {
    base.invested += cost;
    const up = this.checkStarUps(char.id) || base;
    this.scene.recomputeSynergy();
    return up;
  }

  /**
   * 같은 캐릭터·같은 별 3장 → 별 승급 (연쇄로 2성 3장 → 3성까지). 칸이 꽉 차서 바로 합칠 때는 extraId 1장을 더해 센다
   * @returns 승급한 유닛 (없으면 null)
   */
  checkStarUps(extraId) {
    let last = null;
    for (;;) {
      // 필드 유닛을 앞에 — 남는 쪽(keep)이 필드에 있게 (대기석 것만 모이면 대기석에서 승급)
      let group = findStarUp(this.scene.allUnits, MAX_STAR);
      if (!group && extraId) {
        const ones = this.scene.allUnits.filter((m) => m.char.id === extraId && m.star === 1);
        if (ones.length >= 2) group = [ones[0], ones[1], null];
        extraId = null;
      }
      if (!group) return last;
      // 남는 쪽: 아이템·위치는 가장 먼저 놓인(왼쪽 위) 유닛
      const [keep, ...rest] = group;
      for (const o of rest) {
        if (!o) continue;
        // 아이템도 남는 쪽으로 — 3칸을 넘으면 띠로
        for (const id of o.items) {
          if (keep.items.length < ITEM_RULES.slots) keep.items.push(id);
          else this.scene.returnItems([id]);
        }
        keep.invested += o.invested;
        keep.kills += o.kills;
        this.scene.unplace(o);
        if (this.scene.selected === o) this.scene.selected = keep;
        o.destroy();
      }
      keep.starUp();
      keep.mana = 0;
      audio.levelUp();
      this.scene.levelUpFx(keep, keep.star >= MAX_STAR ? '★★★' : '★★', keep.star >= MAX_STAR);
      this.scene.toast(`${keep.heroName} ${keep.star}성 승급! 스킬 「${keep.def.name}」 강화`, '#f2c14e');
      this.scene.tut.show('star');
      last = keep;
    }
  }

  /** 리롤: 잠그지 않은 칸을 새로 굴린다 */
  reroll() {
    if (this.scene.over) return false;
    if (this.scene.selected) this.scene.select(null); // 필드 캐릭터를 고른 채(정보 창)라도 리롤을 누르면 구매 창(상점)으로 (2026-11-21)
    const cost = this.rerollPrice;
    if (this.scene.gold < cost) {
      this.scene.toast(`골드 부족 · 리롤 ${cost}G`);
      return false;
    }
    if (this.scene.freeRerolls > 0) this.scene.freeRerolls -= 1;
    else {
      this.scene.gold -= cost;
      this.rerollCount = (this.rerollCount || 0) + 1; // 돈 내고 돌릴 때마다 다음 리롤 값이 오른다 (무료 리롤은 세지 않음)
    }
    this.scene.shop = refillShop(this.scene.shop, this.scene.deck, this.scene.estate, Math.random, this.maxedIds(), this.scene.bonus);
    audio.reroll();
    this.scene.refreshShop();
    this.scene.refreshHud();
    return true;
  }

  /** 칸 잠금 켜고 끄기 (잠근 칸은 리롤·웨이브 갱신에도 남고, 잠근 등급·수만큼 리롤 값이 오른다) */
  toggleLock(i) {
    const slot = this.scene.shop[i];
    if (!slot || slot.sold) return;
    slot.locked = !slot.locked;
    audio.lock(slot.locked);
    this.scene.tut.show('lock');
    this.scene.refreshShop();
  }

  /** 영지 레벨 업: 놓을 수 있는 인원 +1, 상점 고급 확률 오름 */
  levelUpEstate() {
    const cost = this.estateCost;
    if (cost == null || this.scene.over) return false;
    if (this.scene.gold < cost) {
      this.scene.toast(`골드 부족 · 레벨 업 ${cost}G`);
      return false;
    }
    this.scene.gold -= cost;
    this.scene.estate += 1;
    audio.promote();
    this.scene.showBanner(`영지 Lv.${this.scene.estate}`, `놓을 수 있는 인원 ${this.cap}명 · 상점 확률 ${SHOP.odds[this.scene.estate - 1].map((p, g) => (p ? `${['커먼', '언커먼', '레어', '유니크'][g]} ${p}%` : '')).filter(Boolean).join(' · ')}`, '#f2c14e');
    this.scene.refreshShop();
    this.scene.refreshHud();
    return true;
  }

  sell(merc) {
    this.scene.returnItems(merc.items); // 아이템은 띠로 돌아온다 (조합품은 그대로)
    merc.items = [];
    const refund = Math.floor(merc.invested * this.sellRefund);
    this.scene.gold += refund;
    audio.sell();
    this.scene.unplace(merc);
    this.scene.floatText(merc.x, merc.y - 20, `+${refund}G`, '#f2c14e');
    merc.destroy();
    this.scene.select(null);
    this.scene.recomputeSynergy();
    this.scene.refreshShop();
    this.scene.refreshHud();
  }

  /** 상점의 잠그지 않은 칸을 새로 채운다 (웨이브가 끝날 때 한 번) */
  refillShopNow() {
    this.scene.shopRefreshed = true;
    this.rerollCount = 0; // 웨이브 끝 상점 새로 고침과 함께 리롤 값도 처음으로 (2026-11-22)
    this.scene.shop = refillShop(this.scene.shop, this.scene.deck, this.scene.estate, Math.random, this.maxedIds(), this.scene.bonus);
    this.scene.refreshShop();
    audio.shopRefresh();
  }
}
