// ── 아이템 조합 (룰 v2 ②, 2026-11-20 사용자 확정 — 수치는 가안) ─────────────
// 판 안 캐릭터 강화 수단: 재료 6종 + 왕실 인장 → 같은 캐릭터에 재료 2개가 모이면 자동 조합(21종), 인장 + 재료 = 계열 문장, 인장 2개 = 출신 문장.
// 캐릭터마다 3칸. 장착한 아이템은 「해제 도구」로만 뺄 수 있고, 캐릭터를 팔면 띠로 돌아온다. 유물 = 팀 전체 영구 / 아이템 = 캐릭터 한 명·판 안.
// 설계: docs/drafts/rules-v2/ITEMS.md · docs/drafts/items/
import { TRAITS, CLASS_IDS, ORIGIN_IDS } from './synergy.js';

/** 아이템 띠·대장장이·떨어지는 곳 (가안) */
export const ITEM_RULES = {
  slots: 3, // 캐릭터마다
  bench: 10, // 아이템 띠 칸 수
  smith: { base: 30, step: 15 }, // 판 안 대장장이: 무작위 재료 값 30G, 살 때마다 +15 (판마다 처음부터)
  eliteMat: 0.15, // 정예 처치: 재료 확률
  bossMats: 2, // 보스 처치: 재료 2개
  bossSeal: 0.1, // 보스 처치: 왕실 인장 확률 (강화 보스는 확정)
  bossTool: 0.2, // 보스 처치: 해제 도구 확률 (강화 보스는 확정)
  waveMatEvery: 5 // 5웨이브마다 재료 1개
};

// 재료: 하나만 껴도 작은 효과 (fx 키는 Mercenary.getStats·GameScene 이 읽는다)
const M = (id, name, glyph, color, text, fx) => ({ id, kind: 'mat', name, glyph, color, text, fx });
export const MATS = [
  M('whet', '숫돌', '숫', '#a8432f', '공격력 +10%', { dmg: 0.1 }),
  M('feath', '깃털', '깃', '#5f8f3e', '공격 속도 +10%', { rate: 0.1 }),
  M('mana', '마력석', '마', '#3a6fd0', '시작 마나 +15', { startMana: 15 }),
  M('lens', '렌즈', '렌', '#3f7f86', '사거리 +10%', { range: 0.1 }),
  M('powd', '화약', '화', '#d9822b', '범위(폭발·스킬) +15%', { area: 0.15 }),
  M('coin', '금화 주머니', '금', '#c9a227', '처치 골드 +5%', { gold: 0.05 })
];
export const SEAL = { id: 'seal', kind: 'seal', name: '왕실 인장', glyph: '인', color: '#8a4fb5', text: '혼자서는 효과 없음 — 재료와 합치면 계열 문장, 인장끼리는 출신 문장', fx: {} };

// 조합 21종 [재료 a, 재료 b, id, 이름, 효과 글, 효과]
const X = (a, b, id, name, text, fx) => ({ id, kind: 'combo', parts: [a, b], name, text, fx });
export const COMBOS = [
  X('whet', 'whet', 'giant_sword', '거인의 대검', '공격력 +40%, 정예·보스 피해 +15%', { dmg: 0.4, eliteDmg: 0.15 }),
  X('whet', 'feath', 'twin_dagger', '쌍날 단검', '공격 2번마다 한 번 더 찌름 (50% 피해)', { extraEvery: 2 }),
  X('whet', 'mana', 'rune_sword', '룬 각인 검', '스킬 피해 +30%, 스킬도 치명타가 터짐', { skillDmg: 0.3, skillCrit: true }),
  X('whet', 'lens', 'marksman_scope', '명사수 조준경', '사거리 +20%, 멀리 있는 적일수록 피해 최대 +30%', { range: 0.2, farDmg: 0.3 }),
  X('whet', 'powd', 'scatter', '산탄 장치', '기본 공격이 주변 30px 에도 50% 피해', { scatter: 30 }),
  X('whet', 'coin', 'bounty_mark', '현상금 표식', '체력 15% 이하 일반 몬스터 즉사, 처치 골드 +20%', { execute: 0.15, gold: 0.2 }),
  X('feath', 'feath', 'gale_boots', '질풍 장화', '공격 속도 +35%', { rate: 0.35 }),
  X('feath', 'mana', 'mana_quill', '마나 깃펜', '공격당 마나 +5 (스킬이 더 자주)', { manaGain: 5 }),
  X('feath', 'lens', 'repeater', '연발 석궁', '기본 공격 대상 +1', { targets: 1 }),
  X('feath', 'powd', 'fire_quiver', '불꽃 화살통', '공격 3번마다 작은 폭발 (80% 피해, 반경 40)', { burstEvery: 3 }),
  X('feath', 'coin', 'horseshoe', '행운의 편자', '치명타 +20%, 치명타로 처치하면 10% 확률 골드 +1', { crit: 0.2, critGold: 0.1 }),
  X('mana', 'mana', 'archmage_orb', '대마법사의 구슬', '최대 마나 -25%', { maxMana: 0.25 }),
  X('mana', 'lens', 'star_scope', '별빛 망원경', '스킬 범위·사거리 +25%', { skillArea: 0.25 }),
  X('mana', 'powd', 'mad_grimoire', '폭주 마도서', '스킬이 끝나면 같은 자리에 한 번 더 폭발 (공격력 150%)', { afterBlast: 1.5 }),
  X('mana', 'coin', 'alchemy_flask', '연금술 플라스크', '스킬을 쓸 때마다 골드 +2', { skillGold: 2 }),
  X('lens', 'lens', 'eagle_scope', '독수리 망원경', '사거리 +40%, 후열(가운데 3x3)이면 1칸 더', { range: 0.4, backRange: 56 }),
  X('lens', 'powd', 'siege_sight', '공성 조준기', '체력이 가장 많은 적을 노림, 보스 피해 +25%', { strongest: true, bossDmg: 0.25 }),
  X('lens', 'coin', 'merchant_scale', '상인의 저울', '웨이브를 깰 때 이 캐릭터가 처치한 수 × 0.1 골드', { killWaveGold: 0.1 }),
  X('powd', 'powd', 'cannonball', '대포알', '폭발 범위 +50%', { area: 0.5 }),
  X('powd', 'coin', 'treasure_bomb', '보물 폭탄', '처치 시 10% 확률로 골드 +3', { treasure: 0.1 }),
  X('coin', 'coin', 'guild_vault', '길드 금고', '웨이브를 깰 때 골드 +3, 10웨이브마다 +3 씩 늘어남', { vault: 3 })
];

// 문장: 왕실 인장 + 재료 → 계열 문장 (그 계열로도 셈 = 시너지 +1). 인장 2개 → 출신 문장 (출신은 만들 때 고른다)
const EMBLEM_MAT = { warrior: 'whet', ranger: 'lens', assassin: 'feath', gunner: 'powd', hexer: 'mana', support: 'coin' };
const emblem = (trait, mat) => ({
  id: `emblem_${trait}`,
  kind: 'emblem',
  trait,
  parts: mat ? ['seal', mat] : ['seal', 'seal'],
  name: `${TRAITS[trait].name} 문장`,
  text: `장착한 캐릭터가 ${TRAITS[trait].name}(으)로도 셈 — 시너지 +1`,
  fx: {}
});
export const EMBLEMS = [...CLASS_IDS.map((k) => emblem(k, EMBLEM_MAT[k])), ...ORIGIN_IDS.map((k) => emblem(k, null))];

export const ITEMS = [...MATS, SEAL, ...COMBOS, ...EMBLEMS];
export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const MAT_IDS = MATS.map((m) => m.id);

/** 조합 재료인가 (재료 6종 + 왕실 인장) */
export const isComponent = (id) => ITEM_BY_ID[id]?.kind === 'mat' || id === 'seal';

/**
 * 두 재료를 합친 결과 id. 인장 2개는 출신 문장이라 origin 이 필요하다 (없으면 null)
 * @returns {string|null}
 */
export function combine(a, b, origin = null) {
  if (!isComponent(a) || !isComponent(b)) return null;
  if (a === 'seal' && b === 'seal') return origin ? `emblem_${origin}` : null;
  if (a === 'seal' || b === 'seal') {
    const mat = a === 'seal' ? b : a;
    const cls = Object.keys(EMBLEM_MAT).find((k) => EMBLEM_MAT[k] === mat);
    return `emblem_${cls}`;
  }
  return COMBOS.find((c) => (c.parts[0] === a && c.parts[1] === b) || (c.parts[0] === b && c.parts[1] === a))?.id || null;
}

/** 이 재료로 만들 수 있는 것 (조합표) */
export function recipesWith(id) {
  if (id === 'seal') return EMBLEMS.slice(0, CLASS_IDS.length).map((e) => ({ with: e.parts[1], result: e.id })).concat([{ with: 'seal', result: 'emblem_origin' }]);
  return COMBOS.filter((c) => c.parts.includes(id)).map((c) => ({ with: c.parts[0] === id ? c.parts[1] : c.parts[0], result: c.id }))
    .concat([{ with: 'seal', result: `emblem_${Object.keys(EMBLEM_MAT).find((k) => EMBLEM_MAT[k] === id)}` }]);
}

/** 아이템 효과 합계 (숫자는 더하고 참·거짓은 하나라도 있으면 참) */
export function itemFx(ids) {
  const out = {};
  for (const id of ids) {
    const fx = ITEM_BY_ID[id]?.fx || {};
    for (const [k, v] of Object.entries(fx)) out[k] = typeof v === 'boolean' ? out[k] || v : (out[k] || 0) + v;
  }
  return out;
}

/** 문장으로 더해지는 시너지 (trait id 목록) */
export function emblemTraits(ids) {
  return ids.map((id) => ITEM_BY_ID[id]).filter((i) => i?.kind === 'emblem').map((i) => i.trait);
}
