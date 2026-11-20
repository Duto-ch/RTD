// 판을 넘어 유지되는 진행 상황 (명성·강화 레벨·최고 기록) — 브라우저 localStorage 에 저장
// 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서도 게임은 돌아가고, 그 경우 이번 접속 동안만 유지된다.
import { UPGRADE_BY_ID, upgradeCost, metaBonus } from '../data/upgrades.js';
import { DEFAULT_DECK, deckValid, ROSTER_BY_ID } from '../data/roster.js';
import { RELICS, RELIC_RULES, relicBonus, addBonus } from '../data/relics.js';
import { TAVERN, hireCost, tavernRerollCost, nextRefresh, rollTavernSlots } from '../data/tavern.js';

// v3 (2026-11-20 룰 v2): 상점·시너지·술집·유물 공방으로 바뀌면서 저장 초기화 (사용자 결정). 예전 v2 저장은 읽지 않는다
const KEY = 'rtd_meta_v3';
// owned: 가진 캐릭터 id → 강화 단계(술집에서 같은 캐릭터를 다시 고용하면 +1). 처음에는 기본 덱 30명을 가진 채로 시작
// stones: 마정석(보스 처치) · relics: 가진 유물 id → 레벨 · equipped: 장착 유물 id · tavern: 술집 칸·다음 갱신 시각·리롤 횟수
const fresh = () => ({
  fame: 0, totalFame: 0, levels: {}, best: { normal: 0 }, tutorial: { seen: {}, off: false },
  deck: [...DEFAULT_DECK], owned: Object.fromEntries(DEFAULT_DECK.map((id) => [id, 0])),
  stones: 0, relics: {}, equipped: [], tavern: null
});

export const meta = {
  data: fresh(),

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = { ...fresh(), ...JSON.parse(raw) };
    } catch {
      /* 저장소 없음: 기본값 */
    }
    return this;
  },

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* 저장 실패: 이번 접속 동안만 유지 */
    }
  },

  // ── 튜토리얼 (기능별 최초 1회) ──
  get tutorialOff() {
    return !!this.data.tutorial?.off;
  },
  tutorialSeen(id) {
    return !!this.data.tutorial?.seen?.[id];
  },
  markTutorial(id) {
    this.data.tutorial = { seen: {}, off: false, ...this.data.tutorial };
    this.data.tutorial.seen = { ...this.data.tutorial.seen, [id]: true };
    this.save();
  },
  setTutorialOff(v) {
    this.data.tutorial = { seen: {}, ...this.data.tutorial, off: v };
    this.save();
  },
  /** 처음부터 다시 보기 */
  resetTutorial() {
    this.data.tutorial = { seen: {}, off: false };
    this.save();
  },

  // ── 가진 캐릭터 (룰 v2 ③ 술집) ──
  owns(id) {
    return this.data.owned?.[id] != null;
  },
  /** 강화 단계 (가지지 않았으면 0) */
  enhance(id) {
    return this.data.owned?.[id] || 0;
  },

  // ── 덱 (가진 캐릭터 중 최대 30명 · 레어 9 · 유니크 3) ──
  get deck() {
    const d = (this.data.deck || []).filter((id) => this.owns(id));
    return deckValid(d) ? d : DEFAULT_DECK.filter((id) => this.owns(id));
  },
  setDeck(ids) {
    if (!deckValid(ids) || !ids.every((id) => this.owns(id))) return false;
    this.data.deck = [...ids];
    this.save();
    return true;
  },

  get fame() {
    return this.data.fame;
  },
  level(id) {
    return this.data.levels[id] || 0;
  },
  /** 명성 강화 + 장착 유물 효과 합계 (유물은 '유물 감정'만큼 커진다) */
  bonus() {
    const b = metaBonus(this.data.levels);
    return addBonus(b, relicBonus(this.equipped, this.data.relics, b.relicPow || 0));
  },

  // ── 마정석 (보스 처치) ──
  get stones() {
    return this.data.stones || 0;
  },
  addStones(n) {
    this.data.stones = Math.max(0, this.stones + n);
    this.save();
  },

  // ── 유물 공방 ──
  relicLevel(id) {
    return this.data.relics?.[id] || 0;
  },
  get relicSlots() {
    return RELIC_RULES.slots + (metaBonus(this.data.levels).relicSlots || 0);
  },
  get equipped() {
    return (this.data.equipped || []).filter((id) => this.relicLevel(id) > 0).slice(0, this.relicSlots);
  },
  /** 유물 생산: 마정석을 내고 무작위 1종 → 새 유물 / 레벨 +1 / 최대 레벨이면 마정석 일부 반환. 마정석 부족이면 null */
  craftRelic(rand = Math.random) {
    if (this.stones < RELIC_RULES.craftCost) return null;
    this.data.stones -= RELIC_RULES.craftCost;
    const r = RELICS[Math.floor(rand() * RELICS.length)];
    const lv = this.relicLevel(r.id);
    this.data.relics = { ...this.data.relics };
    let result = 'new';
    if (lv >= RELIC_RULES.maxLevel) {
      this.data.stones += RELIC_RULES.maxRefund;
      result = 'refund';
    } else {
      this.data.relics[r.id] = lv + 1;
      result = lv ? 'up' : 'new';
      // 빈 칸이 있으면 새 유물을 바로 장착
      if (!lv && this.equipped.length < this.relicSlots) this.data.equipped = [...this.equipped, r.id];
    }
    this.save();
    return { id: r.id, level: this.relicLevel(r.id), result };
  },
  /** 장착 / 해제 토글 — 칸이 가득 차면 false */
  toggleEquip(id) {
    if (!this.relicLevel(id)) return false;
    const eq = this.equipped;
    if (eq.includes(id)) this.data.equipped = eq.filter((x) => x !== id);
    else if (eq.length < this.relicSlots) this.data.equipped = [...eq, id];
    else return false;
    this.save();
    return true;
  },

  // ── 술집 (3칸 · 3시간마다 갱신 · 마정석 고용·리롤) ──
  /** 지금 술집 상태 (갱신 시각이 지났으면 새로 채우고 리롤 값도 원래대로) */
  tavern(now = Date.now(), rand = Math.random) {
    const t = this.data.tavern;
    if (!t || !t.slots?.length || now >= t.refreshAt) {
      this.data.tavern = { slots: rollTavernSlots(rand), refreshAt: nextRefresh(now), rerolls: 0 };
      this.save();
    }
    return this.data.tavern;
  },
  get tavernRerollCost() {
    return tavernRerollCost(this.tavern().rerolls || 0);
  },
  rerollTavern(now = Date.now(), rand = Math.random) {
    const t = this.tavern(now);
    const cost = tavernRerollCost(t.rerolls || 0);
    if (this.stones < cost) return false;
    this.data.stones -= cost;
    this.data.tavern = { ...t, slots: rollTavernSlots(rand), rerolls: (t.rerolls || 0) + 1 };
    this.save();
    return true;
  },
  /**
   * 술집 i 번째 칸 고용 → 'new'(새 캐릭터) | 'enhance'(강화 +1) | 'refund'(강화 최대: 마정석 절반 반환) | null(못 함)
   */
  hireTavern(i, now = Date.now()) {
    const t = this.tavern(now);
    const s = t.slots[i];
    if (!s || s.hired) return null;
    const c = ROSTER_BY_ID[s.id];
    const cost = hireCost(c);
    if (this.stones < cost) return null;
    this.data.stones -= cost;
    this.data.owned = { ...this.data.owned };
    let result;
    if (!this.owns(c.id)) {
      this.data.owned[c.id] = 0;
      result = 'new';
    } else if (this.enhance(c.id) < TAVERN.enhanceMax) {
      this.data.owned[c.id] = this.enhance(c.id) + 1;
      result = 'enhance';
    } else {
      this.data.stones += Math.floor(cost / 2);
      result = 'refund';
    }
    this.data.tavern = { ...t, slots: t.slots.map((x, j) => (j === i ? { ...x, hired: true } : x)) };
    this.save();
    return result;
  },

  /** 강화 상태: 'max' | 'locked' | 'poor' | 'ok' */
  status(id) {
    const u = UPGRADE_BY_ID[id];
    const lv = this.level(id);
    if (lv >= u.max) return 'max';
    if (u.parent && this.level(u.parent) < 1) return 'locked';
    if (this.data.fame < upgradeCost(u, lv)) return 'poor';
    return 'ok';
  },

  buy(id) {
    if (this.status(id) !== 'ok') return false;
    const u = UPGRADE_BY_ID[id];
    this.data.fame -= upgradeCost(u, this.level(id));
    this.data.levels[id] = this.level(id) + 1;
    this.save();
    return true;
  },

  addFame(n) {
    this.data.fame += n;
    this.data.totalFame += n;
    this.save();
  },

  /** 최고 도달 웨이브 (무한 웨이브). 예전 저장의 하드 기록은 쓰지 않는다 */
  record(wave) {
    this.data.best = { ...this.data.best, normal: Math.max(this.data.best?.normal || 0, wave) };
    this.save();
  },

  /** 테스트·디버그용 초기화 */
  reset() {
    this.data = fresh();
    this.save();
  }
};

meta.load();
