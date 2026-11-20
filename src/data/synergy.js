// ── 시너지 12종 (룰 v2, 2026-11-20 이름·수치 확정 — 수치는 가안, 밸런스 봇으로 다시 맞춤) ─────────────
// 캐릭터마다 계열 1개 + 출신 1개. 필드에 놓인 '서로 다른 캐릭터' 수로 단계를 센다 (같은 캐릭터 여러 장·별 단계는 1명).
// 계열(공격 방식) 단계 2·5·8 — 그 계열 캐릭터만 강해지고, 8단계만 팀 전체에도 / 출신(세력) 단계 3·6·9.
// 시안: docs/drafts/synergy/ (https://claude.ai/artifact/8ne2r2KfY6X1BGz6q8MvKc)

const T = (kind, name, color, glyph, desc, tiers) => ({ kind, name, color, glyph, desc, tiers });

export const TRAITS = {
  // ── 계열 6 ──
  warrior: T('class', '전사', '#c0563c', '검', '길 가까이에서 베는 근접 계열. 바깥 줄(전열)에 있으면 효과 1.5배', [
    { n: 2, text: '전사 공격력 +15%', dmg: 0.15 },
    { n: 5, text: '전사 공격력 +35%, 3번째 공격마다 주변 베기', dmg: 0.35, cleaveEvery: 3 },
    { n: 8, text: '전사 공격력 +60%, 모든 공격이 주변 베기 + 팀 전체 공격력 +10%', dmg: 0.6, cleaveEvery: 1, teamDmg: 0.1 }
  ]),
  ranger: T('class', '사수', '#5f8f3e', '활', '활·석궁·총. 멀리서 한 마리씩 정확하게. 가운데 3×3(후열)이면 사거리 +1칸', [
    { n: 2, text: '사수 사거리 +15%, 관통 +1', range: 0.15, pierce: 1 },
    { n: 5, text: '사거리 +30%, 관통 +2, 정예·보스 피해 +20%', range: 0.3, pierce: 2, eliteDmg: 0.2 },
    { n: 8, text: '사거리 +45%, 관통 +4, 정예·보스 피해 +50%', range: 0.45, pierce: 4, eliteDmg: 0.5 }
  ]),
  assassin: T('class', '암살자', '#6b4a8f', '단', '단검·쌍검으로 빠르게. 치명타가 핵심', [
    { n: 2, text: '암살자 치명타 확률 +15%, 치명 피해 +30%', crit: 0.15, critDmg: 0.3 },
    { n: 5, text: '치명타 +30%, 치명 피해 +60%', crit: 0.3, critDmg: 0.6 },
    { n: 8, text: '치명타 +45%, 치명 피해 +100%, 치명타 때 40% 확률로 한 번 더 공격', crit: 0.45, critDmg: 1, critExtra: 0.4 }
  ]),
  gunner: T('class', '포격수', '#d9822b', '폭', '폭발·범위 공격. 몰려오는 물량 담당', [
    { n: 2, text: '포격수 폭발 범위 +15%', splash: 0.15 },
    { n: 5, text: '폭발 범위 +35%, 터진 자리에 불길 1초', splash: 0.35, burn: 1 },
    { n: 8, text: '폭발 범위 +60%, 폭발이 두 번 터짐', splash: 0.6, burn: 1, double: true }
  ]),
  hexer: T('class', '주술사', '#3f7f86', '술', '지속 피해·약화·감속을 거는 계열', [
    { n: 2, text: '주술 효과(지속 피해·약화·감속) +30%', hex: 0.3 },
    { n: 5, text: '주술 효과 +70%, 걸린 적이 죽으면 옆 적에게 옮음', hex: 0.7, spread: true },
    { n: 8, text: '주술 효과 +120%, 모든 아군 공격에 약화(받는 피해 +15%)', hex: 1.2, spread: true, teamVuln: 0.15 }
  ]),
  support: T('class', '지원가', '#c9a227', '깃', '오라·버프·골드. 혼자 약하지만 팀을 키움', [
    { n: 2, text: '팀 전체 공격 속도 +8%', teamRate: 0.08 },
    { n: 5, text: '팀 전체 공격 속도 +18%, 버프 지속 1.5배', teamRate: 0.18, buffDur: 1.5 },
    { n: 8, text: '팀 전체 공격 속도 +30%, 웨이브마다 골드 +10', teamRate: 0.3, buffDur: 1.5, waveGold: 10 }
  ]),
  // ── 출신 6 ──
  north: T('origin', '북방 부족', '#a8432f', '북', '뿔투구·도끼·곰가죽. 싸울수록 분노가 쌓인다', [
    { n: 3, text: '공격할 때마다 분노 1중첩(최대 10), 중첩당 공격 속도 +2%', rage: 0.02 },
    { n: 6, text: '중첩당 공격 속도 +3%, 10중첩이면 공격력 +20%', rage: 0.03, rageDmg: 0.2 },
    { n: 9, text: '중첩당 +4%, 10중첩이면 공격력 +40%, 분노가 웨이브 사이에도 유지', rage: 0.04, rageDmg: 0.4, keepRage: true }
  ]),
  knight: T('origin', '왕국 기사단', '#4a6fa8', '방', '판금·방패·창. 성벽을 지킨다', [
    { n: 3, text: '성벽이 받는 피해 -15%', wallDmg: 0.15 },
    { n: 6, text: '성벽 피해 -30%, 웨이브 시작 때 성벽 실드 10', wallDmg: 0.3, shield: 10 },
    { n: 9, text: '성벽 피해 -45%, 실드 25, 기사단 공격력 +25%', wallDmg: 0.45, shield: 25, dmg: 0.25 }
  ]),
  tower: T('origin', '마탑', '#8a4fb5', '탑', '로브·지팡이·연금술. 마나가 빨리 차서 스킬이 자주 터진다', [
    { n: 3, text: '마탑 공격당 마나 +3', mana: 3 },
    { n: 6, text: '공격당 마나 +6, 스킬 피해 +20%', mana: 6, skillDmg: 0.2 },
    { n: 9, text: '공격당 마나 +10, 스킬 피해 +40%, 25% 확률로 스킬 두 번 시전', mana: 10, skillDmg: 0.4, doubleCast: 0.25 }
  ]),
  grove: T('origin', '숲의 일족', '#3e8a50', '숲', '엘프·드루이드·요정. 길을 덩굴로 묶는다', [
    { n: 3, text: '길 위 모든 몬스터 이동 속도 -6%', slow: 0.06 },
    { n: 6, text: '이동 속도 -12%, 8초마다 무작위 지점 덩굴 속박 1.5초', slow: 0.12, root: { every: 8, dur: 1.5, r: 70, elite: false } },
    { n: 9, text: '이동 속도 -18%, 속박 범위 2배, 정예도 묶임', slow: 0.18, root: { every: 8, dur: 1.5, r: 140, elite: true } }
  ]),
  lake: T('origin', '호수의 성역', '#3a8fb0', '물', '물·얼음·성녀. 성벽을 회복시킨다', [
    { n: 3, text: '웨이브를 깰 때 성벽 체력 +2', wallHeal: 2 },
    { n: 6, text: '성벽 체력 +5, 성역 캐릭터 스킬 피해 +20%', wallHeal: 5, skillDmg: 0.2 },
    { n: 9, text: '성벽 체력 +10, 성벽이 0이 되면 한 판에 한 번 50%로 되살아남', wallHeal: 10, skillDmg: 0.2, revive: 0.5 }
  ]),
  guild: T('origin', '황금 길드', '#9a7a3a', '금', '총·석궁·도적·상인. 돈을 번다', [
    { n: 3, text: '처치 골드 +10%', gold: 0.1 },
    { n: 6, text: '처치 골드 +25%, 웨이브 끝에 가진 골드의 5% 이자(최대 20)', gold: 0.25, interest: 0.05, interestMax: 20 },
    { n: 9, text: '처치 골드 +50%, 이자 10%(최대 50), 웨이브마다 상점 리롤 1회 무료', gold: 0.5, interest: 0.1, interestMax: 50, freeReroll: 1 }
  ])
};

export const TRAIT_IDS = Object.keys(TRAITS);
export const CLASS_IDS = TRAIT_IDS.filter((k) => TRAITS[k].kind === 'class');
export const ORIGIN_IDS = TRAIT_IDS.filter((k) => TRAITS[k].kind === 'origin');
/** 분노(북방 부족) 최대 중첩 */
export const RAGE_MAX = 10;

/**
 * 시너지별 인원: 필드의 서로 다른 캐릭터 수 (+ 문장 아이템으로 늘어난 수)
 * @param {{char: {id, cls, origin}}[]} units 필드 위 유닛
 * @param {Record<string, number>} extra 문장 등으로 더하는 수 (trait id → n)
 */
export function countTraits(units, extra = {}) {
  const seen = {};
  for (const u of units) {
    const c = u.char || u;
    // 문장 아이템(u.extraTraits)으로 그 계열·출신으로도 센다
    for (const k of [c.cls, c.origin, ...(u.extraTraits || [])]) (seen[k] ||= new Set()).add(c.id);
  }
  const out = {};
  for (const k of TRAIT_IDS) out[k] = (seen[k]?.size || 0) + (extra[k] || 0);
  return out;
}

/** 켜진 단계 (0부터, 꺼져 있으면 -1) */
export function tierIndex(id, count) {
  const tiers = TRAITS[id].tiers;
  let t = -1;
  tiers.forEach((x, i) => {
    if (count >= x.n) t = i;
  });
  return t;
}

/** 켜진 단계의 효과 (꺼져 있으면 null) */
export function activeTier(id, count) {
  const i = tierIndex(id, count);
  return i < 0 ? null : TRAITS[id].tiers[i];
}

/** 표시 순서: 켜진 것(높은 단계 먼저) → 사람이 있는 것 → 나머지 */
export function sortedTraits(counts) {
  return TRAIT_IDS.filter((k) => counts[k] > 0).sort((a, b) => tierIndex(b, counts[b]) - tierIndex(a, counts[a]) || counts[b] - counts[a]);
}
