// 스킬 리밸런싱 안 (2026-11-26, 사용자 요청: '너무 강력한 스킬이 많다' — 안만 만들어 보여주기, 게임 미적용)
// 실행: node docs/drafts/skill-rebalance/propose.mjs  →  같은 폴더 PROPOSAL.md
// 세기 = 1성에서 '스킬이 더하는 초당 피해 ÷ 기본 공격 초당 피해' (마나가 차는 속도로 시전 빈도, 범위는 길 위 몬스터 밀도로 맞는 수 추정)
import { writeFileSync } from 'node:fs';
import { ROSTER, STYLES, GRADES } from '../../../src/data/roster.js';
import { starSkill, maxMana } from '../../../src/data/stars.js';

const DENS = 0.1; // 길 위 몬스터 밀도(1px 당) — 중반 웨이브 추정 ⚠️
const TARGET = { 1: 1.5, 2: 2, 3: 2.5, 4: 3.5 }; // 등급별 목표 세기 (1성)
const CAP = { 1: 6, 2: 8, 3: 10, 4: 12 }; // '사거리 안 전부'·원 범위 최대 대상 수
const EXEC_N = { 1: 4, 2: 5, 3: 6, 4: 8 }; // 처형 여러 명 최대
const BUFF = { 1: 0.14, 2: 0.2, 3: 0.26, 4: 0.34 }; // 팀 버프 점수 목표 ((공격력+공속+사거리/2+치명) × 지속/8초)
const CLAMP = [0.25, 5]; // 피해 계수 조정 폭

const est = (a, range, cap) => {
  if (!a) return 0;
  if (a.type === 'single') return 1;
  if (a.type === 'multi' || a.type === 'chain') return a.n;
  const raw = a.type === 'circle' ? Math.max(1, Math.round(2 * a.r * DENS)) : Math.round(2 * range * DENS);
  return Math.min(cap ?? 40, raw, 40);
};
const pct = (v) => `${Math.round(v * 100)}%`;
const buffScore = (b) => (((b.dmg || 0) + (b.rate || 0) + (b.range || 0) / 2 + (b.crit || 0)) * b.dur) / 8;

const rows = ROSTER.map((c) => {
  const st = STYLES[c.style], t = c.trait || {}, g = c.grade;
  const dmg = st.dmg * GRADES[g].mult * (t.dmgMul || 1), rate = st.rate * (t.rateMul || 1), range = st.range * (t.rangeMul || 1);
  const basic = dmg * rate * (t.targets || 1);
  const mana = maxMana(st, t, c.skill), cps = rate / (mana / 10);
  const s1 = starSkill(c.skill, 1), fx = s1.fx || {}, a = c.skill.area;
  const wide = a && (a.type === 'range' || a.type === 'circle');
  const perTarget = (f) => (f.dmg || 0) + (f.dot ? f.dot[0] * f.dot[1] : 0);
  const nNow = est(s1.area, range), nNew = est(s1.area, range, wide ? CAP[g] : undefined);
  const now = (dmg * perTarget(fx) * nNow * cps) / basic;
  const utility = fx.stun || fx.slow || fx.vuln || fx.push;
  const target = TARGET[g] * (utility ? 0.8 : 1);
  const capped = (dmg * perTarget(fx) * nNew * cps) / basic;
  const k = perTarget(fx) && !fx.execute ? Math.min(CLAMP[1], Math.max(CLAMP[0], target / capped)) : 1;
  const after = capped * k;
  const notes = [];
  if (wide && nNow > nNew) notes.push(`대상 최대 ${CAP[g]}`);
  if (perTarget(fx) && !fx.execute && Math.abs(k - 1) > 0.05) notes.push(`피해 ×${k.toFixed(2)}`);
  if (fx.stun) notes.push(`기절 ${fx.stun}초 × ${nNow} → ${nNew}명`);
  if (fx.execute && a?.n && a.n > EXEC_N[g]) notes.push(`처형 대상 ${a.n} → ${EXEC_N[g]}`);
  let buffTxt = '';
  if (s1.buff) {
    const b = s1.buff, sc = buffScore(b), kb = BUFF[g] / sc;
    const f = (x) => ['dmg', 'rate', 'range', 'crit'].filter((q) => x[q]).map((q) => ({ dmg: '공격력', rate: '공속', range: '사거리', crit: '치명' }[q]) + ' +' + pct(x[q])).join(' ');
    const nb = Object.fromEntries(Object.entries(b).map(([q, v]) => [q, ['dmg', 'rate', 'range', 'crit'].includes(q) ? Math.round(v * kb * 100) / 100 : v]));
    buffTxt = `${b.scope === 'all' ? '모두' : b.scope === 'self' ? '자신' : '주변'} ${f(b)} ${b.dur}초` + (Math.abs(kb - 1) > 0.08 ? ` → ${f(nb)}` : ' (그대로)');
  }
  return { c, g, area: a ? a.type + (a.n || a.r || '') : '-', mana, nNow, nNew, now, after, notes, buffTxt, dmgOnly: perTarget(fx) > 0 };
});

const G = { 1: '커먼', 2: '언커먼', 3: '레어', 4: '유니크' };
const AREA = (s) => s.replace(/^range/, '사거리 안 전부').replace(/^circle/, '원 r').replace(/^multi/, '여러 명 ').replace(/^chain/, '연쇄 ').replace(/^single/, '한 명');
const med = (arr) => { const a = [...arr].sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : 0; };
let md = `# 스킬 리밸런싱 안 (2026-11-26) — 게임 미적용\n\n`;
md += `**세기** = 1성 기준 '스킬이 더하는 초당 피해 ÷ 기본 공격 초당 피해'. 시전 빈도는 마나(공격마다 +10)로, 범위 스킬의 맞는 수는 길 위 몬스터 밀도 ${DENS}/px 로 추정(중반 물량 기준, ⚠️ 웨이브마다 다름). 3성은 1성의 약 2.6배.\n\n`;
md += `## 기준\n- 목표 세기(1성): 커먼 ${TARGET[1]} · 언커먼 ${TARGET[2]} · 레어 ${TARGET[3]} · 유니크 ${TARGET[4]} (기절·감속·약화·밀치기가 있으면 ×0.8)\n- '사거리 안 전부'·원 범위 최대 대상: 커먼 ${CAP[1]} · 언커먼 ${CAP[2]} · 레어 ${CAP[3]} · 유니크 ${CAP[4]}\n- 처형 여러 명 최대: ${Object.entries(EXEC_N).map(([k, v]) => G[k] + ' ' + v).join(' · ')}\n- 팀 버프 점수 = (공격력+공속+사거리/2+치명) × 지속/8초 → 커먼 ${BUFF[1]} · 언커먼 ${BUFF[2]} · 레어 ${BUFF[3]} · 유니크 ${BUFF[4]}\n- 그대로: 마나·별 성장(1:1.6:2.6)·스킬 범위 모양·효과 종류·이펙트\n\n`;
const dm = rows.filter((r) => r.dmgOnly);
for (const g of [1, 2, 3, 4]) { const a = dm.filter((r) => r.g === g); md += `- ${G[g]} 피해 스킬 세기 중앙값: **${med(a.map((r) => r.now)).toFixed(2)} → ${med(a.map((r) => r.after)).toFixed(2)}** (가장 셈 ${Math.max(...a.map((r) => r.now)).toFixed(1)})\n`; }
md += `\n## 70명 (지금 세기 순)\n\n| 캐릭터 | 등급 | 스킬 | 범위 | 세기 지금 → 안 | 바꾸는 것 |\n|---|---|---|---|---|---|\n`;
for (const r of [...rows].sort((x, y) => y.now - x.now)) {
  const what = [...r.notes, r.buffTxt].filter(Boolean).join(' · ') || '그대로';
  md += `| ${r.c.name} | ${G[r.g]} | ${r.c.skill.name} | ${AREA(r.area)} | ${r.dmgOnly ? `${r.now.toFixed(1)} → **${r.after.toFixed(1)}**` : '-'} | ${what} |\n`;
}
md += `\n## 그 밖에 짚을 것\n- '사거리 안 전부' 스킬은 물량 웨이브에서 30~40마리를 한 번에 때려 기본 공격의 5~16배 — 대상 상한이 핵심\n- 유니크 피해 스킬(라그나르·윌리엄·오베론 등)이 레어(세실리아·엘바)보다 약함 → 유니크를 올리고 레어 광역을 내림\n- 범위 기절(길버트 2초×40명, 아스타·테오도르·브륀힐드)은 보스·정예 웨이브를 통째로 묶음 → 대상 상한으로 줄임\n- 적용하려면: area 에 최대 대상 수(\`max\`) 추가 · fx.dmg/dot 계수 바꾸기 · buff 수치 바꾸기 (\`src/data/roster.js\`), 그 뒤 봇으로 확인\n`;
writeFileSync(new URL('./PROPOSAL.md', import.meta.url), md);
console.log(md.split('\n').slice(0, 16).join('\n'));
