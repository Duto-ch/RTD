// ── 룰 v2 (2026-11-20 확정): 별 승급 · 스킬 1개 + 마나 시전 · 등급 재배분 ─────────────
// 같은 캐릭터 3장 → 별 승급 (1성 → 2성 → 3성). 스킬은 캐릭터마다 1개(지금 4개 중 마지막 Lv5 스킬)이고 별마다 강해진다.
// 기본 공격마다 마나가 차고, 가득 차면 스킬을 쓰고 0 으로 (TFT 식). 수치는 가안 — 밸런스 봇으로 다시 맞춘다.
// 시안·근거: docs/drafts/synergy/skillstar.mjs, docs/drafts/rules-v2/DECISIONS.md

export const MAX_STAR = 3;

/** 별 단계 기본 능력 배율 (TFT 와 비슷하게) */
export const STAR_STAT = [1, 1.8, 3.2];

/** 마나: 공격마다 +perAttack, 최대 마나 = 지금 쿨타임의 cdShare 동안 하는 공격 수 × perAttack (10 단위, min~max) */
export const MANA = { perAttack: 10, cdShare: 0.6, min: 40, max: 150 };

export function maxMana(style, trait, def) {
  const rate = style.rate * (trait?.rateMul || 1);
  const v = Math.round((def.cd * MANA.cdShare * rate * MANA.perAttack) / 10) * 10;
  return Math.max(MANA.min, Math.min(MANA.max, v));
}

/** 별 단계별 스킬 세기: 1성 = Lv5 수치의 절반에서 시작 (1 : 1.6 : 2.6) */
export const STAR_SKILL = {
  dmg: [0.5, 0.8, 1.3], // 피해·지속 피해
  buff: [0.6, 0.9, 1.35], // 버프(공격력·공속·사거리·치명)
  gold: [0.5, 0.8, 1.3],
  dur: [0, 1, 2], // 버프·기절·감속 지속 +초
  count: [0, 1, 2], // 연쇄·다중 대상 수 +
  radius: [1, 1.1, 1.2] // 원형 범위 배율
};

const r2 = (v) => Math.round(v * 100) / 100;
const clone = (o) => JSON.parse(JSON.stringify(o));

/** star 단계(1~3)의 스킬 정의 */
export function starSkill(def, star) {
  const i = Math.max(1, Math.min(MAX_STAR, star)) - 1;
  const S = STAR_SKILL;
  const s = clone(def);
  if (s.area) {
    if (s.area.n) s.area.n += S.count[i];
    if (s.area.r) s.area.r = Math.round(s.area.r * S.radius[i]);
  }
  if (s.fx) {
    const f = s.fx;
    if (f.dmg) f.dmg = r2(f.dmg * S.dmg[i]);
    if (f.dot) f.dot = [r2(f.dot[0] * S.dmg[i]), f.dot[1]];
    if (f.stun) f.stun = r2(f.stun + S.dur[i] * 0.25);
    if (f.slow) f.slow = [r2(Math.min(0.8, f.slow[0] + 0.05 * i)), f.slow[1] + S.dur[i]];
    if (f.vuln) f.vuln = [r2((f.vuln[0] * S.buff[i]) / 0.9), f.vuln[1] + S.dur[i]];
    if (f.push) f.push = Math.round(f.push * S.radius[i]);
  }
  if (s.buff) {
    for (const k of ['dmg', 'rate', 'range', 'crit']) if (s.buff[k]) s.buff[k] = r2(s.buff[k] * S.buff[i]);
    s.buff.dur += S.dur[i];
  }
  if (s.gold) s.gold = Math.round(s.gold * S.gold[i]);
  if (s.goldPerWave) s.goldPerWave = r2(s.goldPerWave * S.gold[i]);
  return s;
}

/**
 * 등급 재배분 (2026-11-20): 등급이 바뀐 캐릭터는 스킬 % 수치(피해·지속 피해·버프·골드)를 새/옛 등급 스킬 세기 비율만큼 고친다.
 * 등급별 Lv5 스킬 평균 피해(3.9·4.45·4.95·7.2 배) 기준. 버프는 팀 전체에 걸려 제곱근만큼 완만하게
 */
export const SKILL_GRADE = { 1: 3.9, 2: 4.45, 3: 4.95, 4: 7.2 };
export function regradeSkill(def, oldGrade, newGrade) {
  const k = SKILL_GRADE[newGrade] / SKILL_GRADE[oldGrade];
  if (k === 1) return def;
  const s = clone(def);
  if (s.fx?.dmg) s.fx.dmg = r2(s.fx.dmg * k);
  if (s.fx?.dot) s.fx.dot = [r2(s.fx.dot[0] * k), s.fx.dot[1]];
  if (s.buff) for (const b of ['dmg', 'rate', 'range', 'crit']) if (s.buff[b]) s.buff[b] = r2(s.buff[b] * Math.sqrt(k));
  if (s.gold) s.gold = Math.round(s.gold * k);
  return s;
}
