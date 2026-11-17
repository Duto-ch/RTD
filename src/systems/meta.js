// 판을 넘어 유지되는 진행 상황 (명성·강화 레벨·최고 기록) — 브라우저 localStorage 에 저장
// 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서도 게임은 돌아가고, 그 경우 이번 접속 동안만 유지된다.
import { UPGRADE_BY_ID, upgradeCost, metaBonus } from '../data/upgrades.js';
import { DEFAULT_DECK, deckValid } from '../data/roster.js';

// v2 (2026-11-17): 캐릭터·덱 개편과 함께 저장 초기화 (사용자 결정). 예전 v1 저장은 읽지 않는다
const KEY = 'rtd_meta_v2';
const fresh = () => ({ fame: 0, totalFame: 0, levels: {}, best: { normal: 0 }, tutorial: { seen: {}, off: false }, deck: [...DEFAULT_DECK] });

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

  // ── 덱 (등급 포인트 합 40 이하) ──
  get deck() {
    return deckValid(this.data.deck) ? this.data.deck : [...DEFAULT_DECK];
  },
  setDeck(ids) {
    if (!deckValid(ids)) return false;
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
  bonus() {
    return metaBonus(this.data.levels);
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
