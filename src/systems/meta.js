// 판을 넘어 유지되는 진행 상황 (명성·강화 레벨·최고 기록) — 브라우저 localStorage 에 저장
// 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서도 게임은 돌아가고, 그 경우 이번 접속 동안만 유지된다.
import { UPGRADE_BY_ID, upgradeCost, metaBonus } from '../data/upgrades.js';

const KEY = 'rtd_meta_v1';
const fresh = () => ({ fame: 0, totalFame: 0, levels: {}, best: { normal: 0, hard: 0 }, hardUnlocked: false });

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

  record(difficulty, wave) {
    const k = difficulty ? 'hard' : 'normal';
    this.data.best[k] = Math.max(this.data.best[k] || 0, wave);
    if (difficulty) this.data.hardUnlocked = true;
    this.save();
  },

  /** 테스트·디버그용 초기화 */
  reset() {
    this.data = fresh();
    this.save();
  }
};

meta.load();
