// ── 유물 30종 (룰 v2 ③, 2026-11-20 — 효과·수치는 Claude 가안 ⚠️) ─────────────
// 영지의 「유물 공방」에서 마정석으로 무작위 생산 → 장착 4칸(+명성 강화 '유물 보관함'). 장착한 유물은 매 판 팀 전체에 영구 적용.
// 같은 유물이 또 나오면 그 유물 레벨 +1 (최대 5) — 효과 = 1레벨 값 × (1 + 0.5 × (레벨-1)), 5레벨이면 3배. 최대 레벨에서 또 나오면 마정석 일부를 돌려준다.
// fx 키는 명성 강화(metaBonus)와 같은 효과 키 — GameScene 이 this.bonus 에 더한다 (relicBonus). 판 안 유물 드랍·선택·끄고 켜기는 폐지.
// 아이콘: docs/drafts/relic-icons/relics.py → public/assets/custom/relics/<id>.png (manifest relic_<id>)

export const RELIC_RULES = {
  maxLevel: 5,
  levelStep: 0.5, // 레벨마다 1레벨 값의 +50%
  slots: 4, // 기본 장착 칸 (명성 강화 relicSlots 로 +)
  craftCost: 4, // 유물 생산 1회 마정석
  maxRefund: 2 // 최대 레벨 유물이 또 나오면 돌려주는 마정석
};

export const RELIC_CATS = [
  { id: 'global', name: '전체' },
  { id: 'class', name: '계열' },
  { id: 'origin', name: '출신' },
  { id: 'economy', name: '경제' },
  { id: 'wall', name: '성벽' },
  { id: 'special', name: '특수' }
];

// fmt: pct(+%) · pctp(+%p) · pctMinus(-%) · count(+n) · gold(+nG) · goldMinus(-nG)
const R = (id, cat, name, key, per, fmt, label) => ({ id, cat, name, key, per, fmt, label });
export const RELICS = [
  // 전체 6
  R('hero_sword', 'global', '용사의 검', 'dmg', 0.12, 'pct', '모든 용병 공격력'),
  R('war_drum', 'global', '전쟁의 북', 'rate', 0.08, 'pct', '모든 용병 공격 속도'),
  R('hawk_eye', 'global', '매의 눈', 'range', 0.08, 'pct', '모든 용병 사거리'),
  R('lucky_coin', 'global', '행운의 동전', 'crit', 0.05, 'pctp', '모든 용병 치명타 확률'),
  R('red_orb', 'global', '홍염의 보주', 'skillDmg', 0.15, 'pct', '스킬 피해'),
  R('mana_chalice', 'global', '마나 성배', 'manaGain', 2, 'count', '공격당 마나'),
  // 계열 6
  R('warrior_banner', 'class', '전사의 깃발', 'cls_warrior', 0.2, 'pct', '전사 공격력'),
  R('ranger_quiver', 'class', '사수의 화살통', 'cls_ranger', 0.2, 'pct', '사수 공격력'),
  R('assassin_mask', 'class', '암살자의 가면', 'cls_assassin', 0.2, 'pct', '암살자 공격력'),
  R('gunner_keg', 'class', '포격수의 화약통', 'cls_gunner', 0.2, 'pct', '포격수 공격력'),
  R('hexer_doll', 'class', '주술 인형', 'cls_hexer', 0.2, 'pct', '주술사 공격력'),
  R('support_harp', 'class', '음유시인의 하프', 'cls_support', 0.2, 'pct', '지원가 공격력'),
  // 출신 6
  R('north_horn', 'origin', '북방의 뿔피리', 'org_north', 0.2, 'pct', '북방 부족 공격력'),
  R('knight_shield', 'origin', '기사단 방패', 'org_knight', 0.2, 'pct', '왕국 기사단 공격력'),
  R('blue_orb', 'origin', '창해의 보주', 'org_tower', 0.2, 'pct', '마탑 공격력'),
  R('green_orb', 'origin', '녹림의 보주', 'org_grove', 0.2, 'pct', '숲의 일족 공격력'),
  R('lake_pearl', 'origin', '호수의 진주', 'org_lake', 0.2, 'pct', '호수의 성역 공격력'),
  R('guild_ledger', 'origin', '길드 장부', 'org_guild', 0.2, 'pct', '황금 길드 공격력'),
  // 경제 5
  R('golden_grail', 'economy', '황금 성배', 'bounty', 0.1, 'pct', '처치 골드'),
  R('merchant_seal', 'economy', '상인의 인장', 'rerollDiscount', 2, 'goldMinus', '리롤 값'),
  R('estate_deed', 'economy', '영지 문서', 'estateDiscount', 0.05, 'pctMinus', '영지 레벨 업 값'),
  R('treasure_map', 'economy', '보물 지도', 'startGold', 30, 'gold', '시작 골드'),
  R('contract', 'economy', '용병 계약서', 'sellRefund', 0.04, 'pctp', '판매 환급'),
  // 성벽 4
  R('stone_heart', 'wall', '돌 심장', 'wallHp', 8, 'count', '성벽 체력'),
  R('aegis', 'wall', '수호의 방패', 'wallShield', 8, 'count', '시작 시 성벽 실드'),
  R('mason_hammer', 'wall', '석공의 망치', 'wallRegen', 1, 'count', '웨이브마다 성벽 회복'),
  R('frost_crown', 'wall', '서리 왕관', 'monsterSlow', 0.04, 'pctMinus', '일반·정예 이동 속도'),
  // 특수 3
  R('royal_seal_box', 'special', '왕실 인장함', 'sealChance', 0.08, 'pctp', '보스 처치 왕실 인장 확률'),
  R('anvil_charm', 'special', '모루 부적', 'smithDiscount', 0.08, 'pctMinus', '판 안 대장장이 값'),
  R('star_dust', 'special', '별가루 병', 'startMana', 0.1, 'pct', '시작 마나 (최대 마나 대비)')
];

export const RELIC_BY_ID = Object.fromEntries(RELICS.map((r) => [r.id, r]));
const INT_FMT = new Set(['count', 'gold', 'goldMinus']);

/** 레벨 lv 의 효과 값 (pow: 명성 강화 '유물 감정' 배율 +) */
export function relicValue(r, lv, pow = 0) {
  if (!lv) return 0;
  const v = r.per * (1 + RELIC_RULES.levelStep * (Math.min(RELIC_RULES.maxLevel, lv) - 1)) * (1 + pow);
  return INT_FMT.has(r.fmt) ? Math.round(v) : Math.round(v * 1000) / 1000;
}

/** 효과 글자 (예: 모든 용병 공격력 +18%) */
export function relicText(r, lv, pow = 0) {
  const v = relicValue(r, Math.max(1, lv), pow);
  const p = Math.round(v * 100);
  const s = { pct: `+${p}%`, pctp: `+${p}%p`, pctMinus: `-${p}%`, count: `+${v}`, gold: `+${v}G`, goldMinus: `-${v}G` }[r.fmt];
  return `${r.label} ${s}`;
}

/** 장착한 유물 → 효과 키 합계 (equipped: id 목록, levels: id → 레벨) */
export function relicBonus(equipped = [], levels = {}, pow = 0) {
  const b = {};
  for (const id of equipped) {
    const r = RELIC_BY_ID[id];
    if (r && levels[id]) b[r.key] = (b[r.key] || 0) + relicValue(r, levels[id], pow);
  }
  return b;
}

/** 두 효과 합계를 더한다 */
export function addBonus(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = (out[k] || 0) + v;
  return out;
}
