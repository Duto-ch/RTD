// 스킬 1개 + 별 단계별 강화 시안 (2026-11-20) — TFT 처럼 캐릭터마다 스킬 1개, 1·2·3성마다 수치가 커진다.
// 대표 스킬 = 지금 4개 중 마지막(Lv5) 스킬 (가장 강하고 그 캐릭터다운 것).
// 1성 수치는 Lv5 수치의 절반에서 시작 (가안 — 밸런스 봇으로 다시 맞춤).
// 사용: node skillstar.mjs id1 id2 ... → JSON {id: {name, cd, stars: [def1, def2, def3], desc: [..]}}
import { ROSTER, STYLES } from '../../../src/data/roster.js';
import { describeSkill } from '../../../src/data/skills.js';

// 마나 시전 (2026-11-20 사용자 결정, TFT 식): 기본 공격 1번마다 마나 +10, 가득 차면 스킬 시전 후 0 으로.
// 최대 마나 = 지금 쿨타임의 60% 동안 하는 공격 횟수 × 10 (10 단위 반올림, 40~150 — TFT 와 비슷한 범위).
// 1성 수치가 Lv5 의 절반이라 시전은 지금보다 조금 자주.
// 공속이 오르면 스킬도 자주 터진다 (쿨타임 방식과 가장 큰 차이). 별이 올라도 최대 마나는 그대로.
export const MANA = { perAttack: 10, cdShare: 0.6, min: 40, max: 150, start: 0 };
export function maxMana(c, def) {
  const rate = STYLES[c.style].rate * (c.trait?.rateMul || 1);
  const v = Math.round((def.cd * MANA.cdShare * rate * MANA.perAttack) / 10) * 10;
  return Math.max(MANA.min, Math.min(MANA.max, v));
}

export const STAR = {
  dmg: [0.5, 0.8, 1.3], // 피해·지속 피해 배율 (Lv5 수치 기준) — 1 : 1.6 : 2.6
  buff: [0.6, 0.9, 1.35], // 버프 수치(공격력·공속·사거리·치명)
  gold: [0.5, 0.8, 1.3],
  dur: [0, 1, 2], // 버프·기절·감속 지속 +초
  count: [0, 1, 2], // 연쇄·다중 대상 수 +
  radius: [1, 1.1, 1.2], // 원형 범위 배율
};

const r2 = (v) => Math.round(v * 100) / 100;
export function starSkill(def, star) {
  const i = star - 1;
  const s = JSON.parse(JSON.stringify(def));
  if (s.area) {
    if (s.area.n) s.area.n += STAR.count[i];
    if (s.area.r) s.area.r = Math.round(s.area.r * STAR.radius[i]);
  }
  if (s.fx) {
    const f = s.fx;
    if (f.dmg) f.dmg = r2(f.dmg * STAR.dmg[i]);
    if (f.dot) f.dot = [r2(f.dot[0] * STAR.dmg[i]), f.dot[1]];
    if (f.stun) f.stun = r2(f.stun + STAR.dur[i] * 0.25);
    if (f.slow) f.slow = [r2(Math.min(0.8, f.slow[0] + 0.05 * i)), f.slow[1] + STAR.dur[i]];
    if (f.vuln) f.vuln = [r2(f.vuln[0] * STAR.buff[i] / 0.9), f.vuln[1] + STAR.dur[i]];
    if (f.push) f.push = Math.round(f.push * STAR.radius[i]);
  }
  if (s.buff) {
    for (const k of ['dmg', 'rate', 'range', 'crit']) if (s.buff[k]) s.buff[k] = r2(s.buff[k] * STAR.buff[i]);
    s.buff.dur += STAR.dur[i];
  }
  if (s.gold) s.gold = Math.round(s.gold * STAR.gold[i]);
  if (s.goldPerWave) s.goldPerWave = r2(s.goldPerWave * STAR.gold[i]);
  return s;
}

// ── 등급 재배분 (2026-11-20) ──
// 기본 능력 = 공격 스타일 기본값 × 등급 배율 × 특성. 상점에서 사는 구조라 예전(랜덤 고용 1·1.6·2.5·4)보다 완만하게.
// 별 단계 능력 배율은 TFT 와 비슷하게 1·1.8·3.2.
export const GRADE_V2 = { mult: { 1: 1, 2: 1.35, 3: 1.8, 4: 2.5 }, price: { 1: 1, 2: 2, 3: 3, 4: 5 } };
export const STAR_STAT = [1, 1.8, 3.2];
// 스킬 세기(공격력 대비 %)도 등급마다 다르다 — 지금 로스터의 등급별 Lv5 스킬 평균 피해(3.9·4.45·4.95·7.2 배)를 기준으로,
// 등급이 바뀐 캐릭터는 스킬 % 수치(피해·지속 피해·버프·골드)를 새 등급/옛 등급 비율만큼 고친다 (대상 수·범위·시간은 그대로)
export const SKILL_GRADE = { 1: 3.9, 2: 4.45, 3: 4.95, 4: 7.2 };
export function regradeSkill(def, oldG, newG) {
  const k = SKILL_GRADE[newG] / SKILL_GRADE[oldG];
  if (k === 1) return def;
  const s = JSON.parse(JSON.stringify(def));
  if (s.fx?.dmg) s.fx.dmg = r2(s.fx.dmg * k);
  if (s.fx?.dot) s.fx.dot = [r2(s.fx.dot[0] * k), s.fx.dot[1]];
  if (s.buff) for (const b of ['dmg', 'rate', 'range', 'crit']) if (s.buff[b]) s.buff[b] = r2(s.buff[b] * Math.sqrt(k)); // 버프는 팀 전체에 걸려 완만하게
  if (s.gold) s.gold = Math.round(s.gold * k);
  return s;
}
export function baseStats(c, g) {
  const st = STYLES[c.style], t = c.trait || {};
  const m = GRADE_V2.mult[g];
  return STAR_STAT.map((sm) => ({ atk: Math.round(st.dmg * m * sm * (t.dmgMul || 1)), rate: r2(st.rate * (t.rateMul || 1)), range: Math.round(st.range * (t.rangeMul || 1)) }));
}

// 인자: id:새등급 …
const out = {};
for (const arg of process.argv.slice(2)) {
  const [id, gs] = arg.split(':');
  const c = ROSTER.find((r) => r.id === id);
  const g = +(gs || c.grade);
  const def = regradeSkill(c.skills[c.skills.length - 1], c.grade, g);
  const stars = [1, 2, 3].map((n) => starSkill(def, n));
  out[id] = { name: def.name, cd: def.cd, mana: maxMana(c, def), desc: stars.map(describeSkill), stats: baseStats(c, g), dropped: c.skills.slice(0, -1).map((s) => s.name) };
}
console.log(JSON.stringify(out));
