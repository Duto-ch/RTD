// 스킬 1개 + 별 단계별 강화 시안 (2026-11-20) — TFT 처럼 캐릭터마다 스킬 1개, 1·2·3성마다 수치가 커진다.
// 대표 스킬 = 지금 4개 중 마지막(Lv5) 스킬 (가장 강하고 그 캐릭터다운 것).
// 1성 수치는 Lv5 수치의 절반에서 시작 (가안 — 밸런스 봇으로 다시 맞춤).
// 사용: node skillstar.mjs id1 id2 ... → JSON {id: {name, cd, stars: [def1, def2, def3], desc: [..]}}
import { ROSTER } from '../../../src/data/roster.js';
import { describeSkill } from '../../../src/data/skills.js';

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

const ids = process.argv.slice(2);
const out = {};
for (const id of ids) {
  const c = ROSTER.find((r) => r.id === id);
  const def = c.skills[c.skills.length - 1];
  const stars = [1, 2, 3].map((n) => starSkill(def, n));
  out[id] = { name: def.name, cd: def.cd, desc: stars.map(describeSkill), dropped: c.skills.slice(0, -1).map((s) => s.name) };
}
console.log(JSON.stringify(out));
