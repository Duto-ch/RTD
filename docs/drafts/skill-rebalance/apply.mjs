// 스킬 리밸런싱 v2 적용 (2026-11-26 사용자 결정 '적용해') — propose.mjs 와 같은 계산으로 src/data/skillTune.js 의 표(SKILL_TUNE)를 만든다
// 실행: node docs/drafts/skill-rebalance/apply.mjs  (기준은 조정 전 스킬 c.baseSkill — 여러 번 돌려도 같은 결과)
import { writeFileSync, readFileSync } from 'node:fs';
import { ROSTER, STYLES, GRADES } from '../../../src/data/roster.js';
import { starSkill, maxMana } from '../../../src/data/stars.js';

const DENS = 0.1;
const TARGET = { aoe: { 1: 3, 2: 4, 3: 5, 4: 7 }, multi: { 1: 2, 2: 2.5, 3: 3.5, 4: 5 }, single: { 1: 1.5, 2: 2, 3: 2.5, 4: 3.5 } };
const basicMul = (t, st) => (t.targets ? 1 + 0.35 * (t.targets - 1) : 1) * (t.splash || st.splash ? 1 + Math.min(0.4, (t.splash || st.splash) / 100) : 1) * (t.chain ? 1 + 0.2 * t.chain : 1);
const CAP = { 1: 8, 2: 10, 3: 12, 4: 15 };
const EXEC_N = { 1: 4, 2: 5, 3: 6, 4: 8 };
const BUFF = { 1: 0.14, 2: 0.2, 3: 0.26, 4: 0.34 };
const CLAMP = [0.25, 5];
const est = (a, range, cap) => {
  if (!a) return 0;
  if (a.type === 'single') return 1;
  if (a.type === 'multi' || a.type === 'chain') return a.n;
  const raw = a.type === 'circle' ? Math.max(1, Math.round(2 * a.r * DENS)) : Math.round(2 * range * DENS);
  return Math.min(cap ?? 40, raw, 40);
};
const buffScore = (b) => (((b.dmg || 0) + (b.rate || 0) + (b.range || 0) / 2 + (b.crit || 0)) * b.dur) / 8;
const r2 = (v) => Math.round(v * 100) / 100;

const out = {};
for (const c of ROSTER) {
  const sk = c.baseSkill, st = STYLES[c.style], t = c.trait || {}, g = c.grade;
  const dmg = st.dmg * GRADES[g].mult * (t.dmgMul || 1), rate = st.rate * (t.rateMul || 1), range = st.range * (t.rangeMul || 1);
  const basic = dmg * rate * basicMul(t, st);
  const cps = rate / (maxMana(st, t, sk) / 10);
  const s1 = starSkill(sk, 1), fx = s1.fx || {}, a = sk.area;
  const wide = a && (a.type === 'range' || a.type === 'circle');
  const perTarget = (f) => (f.dmg || 0) + (f.dot ? f.dot[0] * f.dot[1] : 0);
  const nNew = est(s1.area, range, wide ? CAP[g] : undefined);
  const utility = fx.stun || fx.slow || fx.vuln || fx.push;
  const kind = wide ? 'aoe' : a && (a.type === 'multi' || a.type === 'chain') ? 'multi' : 'single';
  const target = TARGET[kind][g] * (utility ? 0.8 : 1);
  const capped = (dmg * perTarget(fx) * nNew * cps) / basic;
  const k = perTarget(fx) && !fx.execute ? Math.min(CLAMP[1], Math.max(CLAMP[0], target / capped)) : 1;
  const tune = {};
  if (wide) tune.max = CAP[g];
  if (perTarget(fx) && !fx.execute && Math.abs(k - 1) > 0.05) tune.dmg = r2(k);
  if (fx.execute && a?.n && a.n > EXEC_N[g]) tune.n = EXEC_N[g];
  if (s1.buff) {
    const kb = BUFF[g] / buffScore(s1.buff);
    if (Math.abs(kb - 1) > 0.08) tune.buff = r2(kb);
  }
  if (Object.keys(tune).length) out[c.id] = tune;
}
const p = new URL('../../../src/data/skillTune.js', import.meta.url);
const src = readFileSync(p, 'utf8');
const body = Object.entries(out).map(([id, v]) => `  ${id}: ${JSON.stringify(v).replace(/"(\w+)":/g, '$1: ').replace(/,/g, ', ').replace(/^\{/, '{ ').replace(/\}$/, ' }')}`).join(',\n');
writeFileSync(p, src.replace(/export const SKILL_TUNE = \{[\s\S]*?\n\};/, `export const SKILL_TUNE = {\n${body}\n};`));
console.log(Object.keys(out).length, '명 조정');
