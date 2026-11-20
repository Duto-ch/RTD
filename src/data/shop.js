// ── 상점 · 영지 레벨 · 별 승급 (룰 v2, 2026-11-20 사용자 결정 — 수치는 가안) ─────────────
// 고용 대신 상점 6칸: 덱 안 캐릭터가 등급 확률에 따라 나오고 골드로 산다. 웨이브가 시작할 때마다 잠그지 않은 칸이 새로 채워진다.
// 리롤(골드)로 바로 바꿀 수 있고, 잠근 칸은 리롤·갱신에도 남는다 — 잠근 캐릭터의 등급·수만큼 리롤 값이 오른다.
// 영지 레벨(판 안에서 골드로 올림): 놓을 수 있는 인원(Lv1 3명 → Lv10 12명)과 상점 고급 확률이 함께 오른다.
// 같은 캐릭터 3장(같은 별)이 모이면 자동으로 별 승급 (1성 → 2성 → 3성).
import { GRADES, ROSTER_BY_ID } from './roster.js';

export const SHOP = {
  slots: 6,
  unit: 10, // 상점 값 1단위 = 10골드 (등급 값 1·2·3·5 → 10·20·30·50G)
  reroll: 2, // 리롤 기본 2단위
  lockExtra: { 1: 1, 2: 1, 3: 2, 4: 4 }, // 잠근 칸 하나마다 리롤 값 + (등급별 단위)
  sellRefund: 0.7, // 판매: 산 값(별 승급에 들어간 장수 포함)의 70%
  maxLevel: 10,
  /** 영지 레벨별 놓을 수 있는 인원: Lv1 3명 → Lv10 12명 */
  cap: (lv) => Math.min(12, lv + 2),
  /** 다음 레벨로 올리는 값(골드) — 초반 싸게, 후반(Lv9~10) 비싸게 = 후반 골드 소비처 */
  levelCost: [20, 40, 70, 110, 170, 260, 400, 650, 1000], // Lv1→2 … Lv9→10
  /** 영지 레벨별 상점 등급 확률(%) [커먼, 언커먼, 레어, 유니크] — Lv10 유니크 25% (2026-11-20 사용자 결정) */
  odds: [
    [100, 0, 0, 0], [75, 25, 0, 0], [55, 35, 10, 0], [45, 35, 18, 2], [35, 35, 25, 5],
    [26, 35, 31, 8], [19, 31, 38, 12], [13, 27, 44, 16], [9, 22, 48, 21], [6, 19, 50, 25]
  ]
};

/** 캐릭터 한 장의 값(골드) */
export function priceOf(c) {
  return GRADES[c.grade].price * SHOP.unit;
}

/** 리롤 값(골드): 기본 + 잠근 칸마다 등급별 추가 */
export function rerollCost(slots) {
  const locked = slots.filter((s) => s && s.locked && !s.sold);
  return (SHOP.reroll + locked.reduce((t, s) => t + SHOP.lockExtra[ROSTER_BY_ID[s.id].grade], 0)) * SHOP.unit;
}

/** 영지 레벨 업 값 (최고 레벨이면 null). discount: 명성 강화 할인 비율 */
export function levelUpCost(lv, discount = 0) {
  if (lv >= SHOP.maxLevel) return null;
  return Math.max(1, Math.round(SHOP.levelCost[lv - 1] * (1 - discount)));
}

/**
 * 상점 한 칸 굴리기: 영지 레벨의 등급 확률 → 덱 안 그 등급 캐릭터 중 무작위.
 * 덱에 그 등급이 없으면 가까운 등급(아래 먼저). exclude: 나오면 안 되는 캐릭터 id (이미 3성)
 * bonus: { rareChance, uniqueChance } 명성 강화 — 커먼 확률에서 옮겨 온다
 */
export function rollSlot(deckIds, level, rand = Math.random, exclude = new Set(), bonus = {}) {
  const chars = deckIds.map((id) => ROSTER_BY_ID[id]).filter((c) => c && !exclude.has(c.id));
  if (!chars.length) return null;
  const o = [...SHOP.odds[Math.max(1, Math.min(SHOP.maxLevel, level)) - 1]];
  // 명성 강화: 레어·유니크 확률 +%p (그 등급이 이 레벨에서 나올 수 있을 때만, 커먼에서 뺀다)
  const add = (g, p) => {
    if (o[g - 1] <= 0 || !p) return;
    const v = Math.min(o[0], p * 100);
    o[g - 1] += v;
    o[0] -= v;
  };
  add(3, bonus.rareChance);
  add(4, bonus.uniqueChance);
  let r = rand() * 100;
  let grade = 1;
  for (let g = 1; g <= 4; g++) {
    if (r < o[g - 1]) {
      grade = g;
      break;
    }
    r -= o[g - 1];
    grade = g;
  }
  const order = [grade, ...[3, 2, 1].filter((g) => g < grade), ...[2, 3, 4].filter((g) => g > grade)];
  for (const g of order) {
    const pool = chars.filter((c) => c.grade === g);
    if (pool.length) return pool[Math.floor(rand() * pool.length)];
  }
  return null;
}

/**
 * 상점 새로 채우기: 잠근 칸은 그대로, 나머지는 새로 굴린다 (산 칸도 새로).
 * @returns {{id, locked, sold}[]}
 */
export function refillShop(slots, deckIds, level, rand = Math.random, exclude = new Set(), bonus = {}) {
  const out = [];
  for (let i = 0; i < SHOP.slots; i++) {
    const s = slots[i];
    if (s && s.locked && !s.sold) {
      out.push(s);
      continue;
    }
    const c = rollSlot(deckIds, level, rand, exclude, bonus);
    out.push(c ? { id: c.id, locked: false, sold: false } : null);
  }
  return out;
}

/**
 * 별 승급 대상 찾기: 같은 캐릭터·같은 별이 3장 이상이면 [남길 것, 사라질 것 2장]
 * @param {{char: {id}, star: number}[]} units
 */
export function findStarUp(units, maxStar = 3) {
  const groups = {};
  for (const u of units) {
    if (u.star >= maxStar) continue;
    (groups[`${u.char.id}:${u.star}`] ||= []).push(u);
  }
  for (const g of Object.values(groups)) if (g.length >= 3) return g.slice(0, 3);
  return null;
}
