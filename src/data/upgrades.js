// ── 명성 강화 트리 (인크리멘탈 요소) ─────────────────────────
// 판이 끝날 때 얻는 "명성"으로 영구 강화. 골드(판 안 레벨 업 재화)와는 별개의 재화.
// 강화를 하나도 안 하면 10~15웨이브가 한계가 되도록 기본 전투력을 낮춰 두었다 (BALANCE.baseDamageMult).
//
// per: 레벨당 효과, max: 최대 레벨, cost: [기본 비용, 레벨마다 곱해지는 배율], req: 먼저 찍어야 하는 강화(1레벨 이상)

export const UPGRADE_BRANCHES = [
  { id: 'attack', name: '공격', color: '#c0362c' },
  { id: 'economy', name: '경제', color: '#a8700c' },
  { id: 'tactics', name: '전술', color: '#2f62c4' }
];

export const UPGRADES = [
  // 공격
  { id: 'atk', branch: 'attack', name: '단련된 무기', stat: 'dmg', per: 0.15, max: 60, cost: [3, 1.18], fmt: 'pct', label: '공격력' },
  { id: 'rate', branch: 'attack', name: '날랜 손놀림', stat: 'rate', per: 0.04, max: 25, cost: [6, 1.25], fmt: 'pct', label: '공격 속도', req: 'atk' },
  { id: 'crit', branch: 'attack', name: '급소 노리기', stat: 'crit', per: 0.02, max: 15, cost: [8, 1.3], fmt: 'pct', label: '치명타 확률', req: 'rate' },
  { id: 'giant', branch: 'attack', name: '거인 사냥꾼', stat: 'bossDmg', per: 0.12, max: 30, cost: [10, 1.22], fmt: 'pct', label: '보스·정예 피해', req: 'atk' },
  // 경제
  { id: 'funds', branch: 'economy', name: '군자금', stat: 'startGold', per: 20, max: 25, cost: [2, 1.2], fmt: 'gold', label: '시작 골드' },
  { id: 'bounty', branch: 'economy', name: '현상금', stat: 'bounty', per: 0.06, max: 25, cost: [5, 1.22], fmt: 'pct', label: '처치 골드', req: 'funds' },
  { id: 'network', branch: 'economy', name: '용병 인맥', stat: 'hireDiscount', per: 1, max: 10, cost: [6, 1.3], fmt: 'goldMinus', label: '고용 비용', req: 'funds' },
  { id: 'pedigree', branch: 'economy', name: '명문가 출신', stat: 'lv2Chance', per: 0.02, max: 10, cost: [12, 1.3], fmt: 'pct', label: 'Lv2 고용 확률', req: 'network' },
  // 전술
  { id: 'tower', branch: 'tactics', name: '망루', stat: 'range', per: 0.03, max: 15, cost: [4, 1.25], fmt: 'pct', label: '사거리' },
  { id: 'manual', branch: 'tactics', name: '전술 교범', stat: 'cdr', per: 0.02, max: 15, cost: [6, 1.25], fmt: 'pctMinus', label: '스킬 쿨타임', req: 'tower' },
  { id: 'merger', branch: 'tactics', name: '합병 협약', stat: 'mergeDiscount', per: 0.03, max: 10, cost: [8, 1.28], fmt: 'pctMinus', label: '레벨 업 비용', req: 'tower' },
  { id: 'vault', branch: 'tactics', name: '유물 보관함', stat: 'relicSlots', per: 1, max: 2, cost: [40, 3], fmt: 'count', label: '유물 활성 슬롯', req: 'manual' }
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

/** lv 레벨에서 다음 레벨로 올리는 데 드는 명성 */
export function upgradeCost(u, lv) {
  return Math.round(u.cost[0] * Math.pow(u.cost[1], lv));
}

/** 강화 레벨 → 효과 합계 (강화가 없으면 전부 0) */
export function metaBonus(levels = {}) {
  const b = { dmg: 0, rate: 0, crit: 0, bossDmg: 0, startGold: 0, bounty: 0, hireDiscount: 0, lv2Chance: 0, range: 0, cdr: 0, mergeDiscount: 0, relicSlots: 0 };
  for (const u of UPGRADES) b[u.stat] += (levels[u.id] || 0) * u.per;
  return b;
}

/** 효과 수치를 글자로 (예: +45%, +60G, -3G) */
export function formatEffect(u, lv) {
  const v = lv * u.per;
  switch (u.fmt) {
    case 'pct': return `+${Math.round(v * 100)}%`;
    case 'pctMinus': return `-${Math.round(v * 100)}%`;
    case 'gold': return `+${v}G`;
    case 'goldMinus': return `-${v}G`;
    default: return `+${v}`;
  }
}

/** 판 하나에서 얻는 명성: 클리어한 웨이브마다 1 + 웨이브/10, 보스 보너스, 하드는 배율 */
export const FAME = {
  perWave: (w) => 1 + Math.floor(w / 10),
  boss: 5,
  milestoneBoss: 15,
  finalBoss: 50
};
