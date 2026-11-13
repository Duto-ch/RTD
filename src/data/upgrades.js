// ── 명성 강화 트리 (인크리멘탈 요소) ─────────────────────────
// 판이 끝날 때 얻는 "명성"으로 영구 강화. 골드(판 안 레벨 업 재화)와는 별개의 재화.
// 강화를 하나도 안 하면 10~15웨이브가 한계가 되도록 기본 전투력을 낮춰 두었다 (BALANCE.levelDamage, bossDamageMult).
//
// 가운데 뿌리(용병단 결성)에서 4갈래(공격·경제·전술·방어)로 가지가 뻗는 구조.
// parent: 부모 노드 — 부모를 1레벨 이상 배워야 열린다. glyph: 노드 안에 표시할 글자.
// per: 레벨당 효과, max: 최대 레벨, cost: [기본 비용, 레벨마다 곱해지는 배율]
// 이전 버전(12종)과 같은 id 는 그대로 유지 → 저장된 강화가 이어진다.

export const UPGRADE_BRANCHES = [
  { id: 'root', name: '근본', color: 0x36d6c8, css: '#1f9e93' },
  { id: 'attack', name: '공격', color: 0xe0533f, css: '#c0362c' },
  { id: 'economy', name: '경제', color: 0xe0a32a, css: '#a8700c' },
  { id: 'tactics', name: '전술', color: 0x3a8ee6, css: '#2f62c4' },
  { id: 'defense', name: '방어', color: 0x3fb06a, css: '#2a8a3e' }
];
export const BRANCH_BY_ID = Object.fromEntries(UPGRADE_BRANCHES.map((b) => [b.id, b]));

// [id, 부모, 갈래, 이름, 글자, 효과 키, 레벨당, 최대, [기본 비용, 배율], 표시 형식, 효과 이름]
const N = (id, parent, branch, name, glyph, stat, per, max, cost, fmt, label) => ({ id, parent, branch, name, glyph, stat, per, max, cost, fmt, label });

export const UPGRADES = [
  N('origin', null, 'root', '용병단 결성', '단', 'dmg', 0.05, 1, [1, 1], 'pct', '모든 용병 공격력'),

  // 공격 (위)
  N('atk', 'origin', 'attack', '단련된 무기', '공', 'dmg', 0.1, 50, [3, 1.16], 'pct', '모든 용병 공격력'),
  N('rate', 'atk', 'attack', '날랜 손놀림', '속', 'rate', 0.03, 25, [6, 1.22], 'pct', '공격 속도'),
  N('crit', 'rate', 'attack', '급소 노리기', '치', 'crit', 0.02, 15, [8, 1.28], 'pct', '치명타 확률'),
  N('critDmg', 'crit', 'attack', '치명적 일격', '격', 'critDmg', 0.15, 20, [12, 1.25], 'pct', '치명타 피해'),
  N('volley', 'rate', 'attack', '연사', '연', 'targets', 1, 2, [120, 4], 'count', '기본 공격 대상 수'),
  N('giant', 'atk', 'attack', '거인 사냥꾼', '거', 'bossDmg', 0.1, 30, [10, 1.2], 'pctp', '보스·정예 피해 (기본 40%)'),
  N('kingslayer', 'giant', 'attack', '왕 사냥꾼', '왕', 'bossOnly', 0.1, 20, [18, 1.22], 'pct', '보스에게 주는 피해'),
  N('eliteBane', 'giant', 'attack', '정예 사냥꾼', '예', 'eliteOnly', 0.12, 20, [14, 1.22], 'pct', '정예에게 주는 피해'),
  N('attune', 'atk', 'attack', '속성 공명', '상', 'advantage', 0.05, 10, [15, 1.3], 'pctp', '상성 우위 피해 (기본 150%)'),
  N('redPow', 'attune', 'attack', '홍염 숙련', '홍', 'attr_red', 0.08, 25, [8, 1.2], 'pct', '레드 용병 공격력'),
  N('bluePow', 'attune', 'attack', '창해 숙련', '창', 'attr_blue', 0.08, 25, [8, 1.2], 'pct', '블루 용병 공격력'),
  N('greenPow', 'attune', 'attack', '녹림 숙련', '녹', 'attr_green', 0.08, 25, [8, 1.2], 'pct', '그린 용병 공격력'),

  // 경제 (오른쪽)
  N('funds', 'origin', 'economy', '군자금', '금', 'startGold', 20, 25, [2, 1.2], 'gold', '시작 골드'),
  N('bounty', 'funds', 'economy', '현상금', '현', 'bounty', 0.05, 25, [5, 1.2], 'pct', '처치 골드'),
  N('interest', 'bounty', 'economy', '이자 수익', '이', 'interest', 0.01, 10, [20, 1.35], 'pct', '웨이브마다 보유 골드 이자 (최대 웨이브×20G)'),
  N('stipend', 'bounty', 'economy', '군량 보급', '보', 'waveGold', 5, 20, [6, 1.22], 'gold', '웨이브 시작 시 골드'),
  N('network', 'funds', 'economy', '용병 인맥', '인', 'hireDiscount', 1, 10, [6, 1.3], 'goldMinus', '고용 비용'),
  N('pedigree', 'network', 'economy', '명문가 출신', '명', 'lv2Chance', 0.02, 10, [12, 1.3], 'pct', 'Lv2 고용 확률'),
  N('noble', 'pedigree', 'economy', '기사 가문', '기', 'lv3Chance', 0.01, 5, [40, 1.5], 'pct', 'Lv3 고용 확률'),
  N('refund', 'network', 'economy', '깔끔한 정산', '환', 'sellRefund', 0.05, 8, [6, 1.3], 'pctp', '판매 환급 (기본 50%)'),
  N('renown', 'funds', 'economy', '명성 관리', '성', 'fameMult', 0.05, 20, [10, 1.25], 'pct', '명성 획득'),
  N('legend', 'renown', 'economy', '전설의 용병단', '전', 'bossFame', 2, 10, [25, 1.3], 'count', '보스 처치 명성'),

  // 전술 (아래)
  N('tower', 'origin', 'tactics', '망루', '망', 'range', 0.03, 15, [4, 1.25], 'pct', '사거리'),
  N('manual', 'tower', 'tactics', '전술 교범', '교', 'cdr', 0.02, 15, [6, 1.25], 'pctMinus', '스킬 쿨타임'),
  N('arcana', 'manual', 'tactics', '비전 연구', '비', 'skillDmg', 0.08, 25, [8, 1.22], 'pct', '스킬 피해'),
  N('vault', 'manual', 'tactics', '유물 보관함', '함', 'relicSlots', 1, 2, [40, 3], 'count', '유물 활성 슬롯'),
  N('appraise', 'vault', 'tactics', '유물 감정', '감', 'relicPow', 0.1, 10, [20, 1.3], 'pct', '유물 효과'),
  N('merger', 'tower', 'tactics', '합병 협약', '합', 'mergeDiscount', 0.03, 10, [8, 1.28], 'pctMinus', '레벨 업 비용'),
  N('ascend', 'merger', 'tactics', '영웅의 길', '승', 'promoteDiscount', 0.05, 8, [20, 1.3], 'pctMinus', '영웅 승급 비용'),
  N('heroPow', 'ascend', 'tactics', '영웅 전승', '영', 'heroDmg', 0.1, 20, [25, 1.25], 'pct', '영웅 공격력'),
  N('drill', 'tower', 'tactics', '병과 훈련', '병', 'splash', 0.06, 10, [8, 1.25], 'pct', '범위 공격 반경'),
  N('archerPow', 'drill', 'tactics', '궁술', '궁', 'cls_archer', 0.1, 20, [6, 1.2], 'pct', '궁수 공격력'),
  N('magePow', 'drill', 'tactics', '마도', '마', 'cls_mage', 0.1, 20, [6, 1.2], 'pct', '마법사 공격력'),
  N('sniperPow', 'drill', 'tactics', '저격술', '저', 'cls_sniper', 0.1, 20, [6, 1.2], 'pct', '저격수 공격력'),
  N('shamanPow', 'drill', 'tactics', '주술', '주', 'cls_shaman', 0.1, 20, [6, 1.2], 'pct', '주술사 공격력'),
  N('roguePow', 'drill', 'tactics', '암살술', '암', 'cls_rogue', 0.1, 20, [6, 1.2], 'pct', '도적 공격력'),

  // 방어 (왼쪽)
  N('wall', 'origin', 'defense', '성벽 보강', '벽', 'maxAlive', 3, 10, [6, 1.3], 'count', '몬스터 한도'),
  N('frost', 'wall', 'defense', '서릿길', '서', 'monsterSlow', 0.02, 10, [8, 1.25], 'pctMinus', '일반·정예 이동 속도'),
  N('mire', 'frost', 'defense', '늪지 함정', '늪', 'eliteSlow', 0.03, 10, [10, 1.25], 'pctMinus', '정예 이동 속도'),
  N('shackle', 'frost', 'defense', '족쇄', '족', 'bossSlow', 0.03, 10, [14, 1.28], 'pctMinus', '보스 이동 속도'),
  N('ward', 'wall', 'defense', '수호 부적', '부', 'debuffDur', 0.05, 10, [10, 1.25], 'pctMinus', '보스 디버프 지속 시간'),
  N('purify', 'ward', 'defense', '정화 의식', '화', 'debuffTargets', 1, 2, [60, 3], 'countMinus', '보스 디버프 대상 수'),
  N('conscript', 'wall', 'defense', '징집령', '징', 'conscripts', 1, 3, [15, 2], 'count', '시작 시 무료 용병'),
  N('veteran', 'conscript', 'defense', '노련한 신병', '노', 'veteran', 1, 1, [80, 1], 'flag', '무료 용병이 Lv2로 시작')
];

// 판을 시작할 때만 쓰는 효과 — 판 도중(성탑)에 사면 다음 판(또는 하드 진입)부터 적용
export const START_ONLY = new Set(['funds', 'conscript', 'veteran']);

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
export const childrenOf = (id) => UPGRADES.filter((u) => u.parent === id);

/** lv 레벨에서 다음 레벨로 올리는 데 드는 명성 */
export function upgradeCost(u, lv) {
  return Math.round(u.cost[0] * Math.pow(u.cost[1], lv));
}

/** 강화 레벨 → 효과 합계 (강화가 없으면 전부 0) */
export function metaBonus(levels = {}) {
  const b = {};
  for (const u of UPGRADES) b[u.stat] = (b[u.stat] || 0) + (levels[u.id] || 0) * u.per;
  return b;
}

/** 효과 수치를 글자로 (예: +45%, +60G, -3G) */
export function formatEffect(u, lv) {
  const v = lv * u.per;
  switch (u.fmt) {
    case 'pct': return `+${Math.round(v * 100)}%`;
    case 'pctp': return `+${Math.round(v * 100)}%p`;
    case 'pctMinus': return `-${Math.round(v * 100)}%`;
    case 'gold': return `+${v}G`;
    case 'goldMinus': return `-${v}G`;
    case 'countMinus': return `-${v}`;
    case 'flag': return v ? '적용' : '없음';
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
