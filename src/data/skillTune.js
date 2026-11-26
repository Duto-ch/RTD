// 스킬 리밸런싱 v2 (2026-11-26 사용자 결정 — 안: docs/drafts/skill-rebalance/PROPOSAL.md, 표 만들기: apply.mjs)
// 캐릭터 id → 조정: max = '사거리 안 전부'·원 범위 최대 대상 수 · dmg = 피해·지속 피해 계수 배율 · n = 처형 여러 명 최대 · buff = 버프 수치 배율
// 수치는 가안 ⚠️ — 밸런스 봇으로 다시 맞춘다

export const SKILL_TUNE = {
  helga: { max: 8, dmg: 1.37 },
  bridget: { max: 8, dmg: 1.58 },
  siri: { max: 10, dmg: 5 },
  oscar: { max: 10 },
  greta: { max: 10, dmg: 1.17 },
  leo: { dmg: 4.77 },
  bern: { max: 10, dmg: 5 },
  claire: { buff: 1.11 },
  einar: { max: 10, dmg: 4.6 },
  elva: { max: 12, dmg: 1.22 },
  thorsten: { max: 12, dmg: 2.82 },
  cecilia: { max: 12, dmg: 0.3 },
  aidan: { buff: 1.44 },
  rosalind: { max: 10, dmg: 2.31 },
  ragnar: { dmg: 4.1 },
  isolde: { max: 15, dmg: 1.22 },
  bjorn: { max: 15, dmg: 3.15 },
  brynhild: { max: 12, dmg: 2.74 },
  ingrid: { max: 8, dmg: 5 },
  emma: { buff: 1.56 },
  aud: { max: 10, dmg: 4.09 },
  lucy: { dmg: 3.43 },
  sigrid: { max: 8, dmg: 5 },
  olaf: { max: 8, dmg: 2.61 },
  henrik: { max: 10, dmg: 3.99 },
  liv: { max: 8 },
  jonathan: { dmg: 1.14 },
  agnes: { buff: 0.64 },
  stein: { max: 8, dmg: 4.61 },
  nora: { dmg: 2.5 },
  gilbert: { max: 8 },
  kristin: { dmg: 1.25 },
  haakon: { max: 10, dmg: 3.33 },
  eleanor: { buff: 1.24 },
  theodore: { max: 12, dmg: 3.29 },
  asta: { max: 15, dmg: 2.23 },
  winston: { max: 12, dmg: 4.25 },
  arthur: { buff: 0.84 },
  solveig: { max: 15, dmg: 1.4 },
  william: { dmg: 2.27 },
  vivian: { buff: 0.52 },
  leif: { dmg: 1.83 },
  freya: { max: 8, dmg: 1.59 },
  sigurd: { dmg: 4.46 },
  edda: { max: 8, dmg: 2.5 },
  colin: { dmg: 3.86 },
  thea: { buff: 1.33 },
  gareth: { max: 8, dmg: 5 },
  marit: { max: 8, dmg: 5 },
  fergus: { dmg: 1.43 },
  ylva: { max: 8, dmg: 1.89 },
  elias: { max: 12, dmg: 5 },
  rowena: { max: 12, dmg: 0.93 },
  atle: { max: 10, dmg: 3 },
  gwen: { buff: 0.87 },
  ivar: { n: 8 },
  celeste: { max: 10, dmg: 4.38 },
  halvard: { max: 12, dmg: 2.36 },
  freydis: { buff: 0.91 },
  richard: { n: 8 },
  oberon: { max: 15, dmg: 1.88 },
  kaira: { max: 8, dmg: 1.51 },
  verona: { max: 10, dmg: 1.22 },
  elin: { dmg: 3.42 },
  thorn: { max: 10, dmg: 1.22 },
  adel: { max: 12, dmg: 4.16 },
  serena: { max: 12, dmg: 2.09, buff: 2 },
  nix: { dmg: 5 }
};

const r2 = (v) => Math.round(v * 100) / 100;

/** 기준 스킬에 조정을 입힌다 (없으면 그대로) */
export function tuneSkill(skill, t) {
  if (!t) return skill;
  const s = structuredClone(skill);
  if (t.max && s.area) s.area.max = t.max;
  if (t.n && s.area?.n) s.area.n = t.n;
  if (t.dmg && s.fx) {
    if (s.fx.dmg) s.fx.dmg = r2(s.fx.dmg * t.dmg);
    if (s.fx.dot) s.fx.dot = [r2(s.fx.dot[0] * t.dmg), s.fx.dot[1]];
  }
  if (t.buff && s.buff) for (const k of ['dmg', 'rate', 'range', 'crit']) if (s.buff[k]) s.buff[k] = r2(s.buff[k] * t.buff);
  return s;
}
