import { BALANCE } from '../config.js';

// 웨이브 규칙
// - 무한 웨이브 (2026-11-15 사용자 결정: 100웨이브 목표·하드 난이도 폐지). 지거나 그만둘 때까지 계속
// - 일반 몬스터 수: 1웨이브 50기 → 70웨이브 200기까지 선형 증가 → 이후 200기 고정
// - 정예 웨이브: 5, 15, 25 … (일반 몬스터 + 정예 10기)
// - 보스 웨이브: 10, 20, 30 … (일반 몬스터 + 보스 1기)
// - 강화 보스 웨이브: 30의 배수 (100의 배수 제외) (일반 몬스터 + 정예 10기 + 강화 보스) — BALANCE.milestone
// - 최종 보스 웨이브: 100의 배수 (100, 200 …) (일반 몬스터 + 최종 보스: 디버프 3개·분노·첫 사망 시 50% 부활+디버프 1개 추가) — BALANCE.final
// - 패배: 성벽 체력 0 (2026-11-17). 몬스터가 한 바퀴 돌 때마다 성벽 피해 — BALANCE.wall (이전: 100기 쌓임·보스 한 바퀴 즉시 패배)
// - 물량: 일반 몬스터 수 ×BALANCE.horde.mult, 마리당 체력·골드 ÷mult (총량 유지)
// - 한 웨이브의 몬스터 속성은 최대 BALANCE.monster.attrsPerWave 종류
/** 이 웨이브마다 최종 보스가 나오고, 몬스터·지역 디자인이 한 바퀴 돈다 */
export const CYCLE_WAVES = 100;

export function isFinalWave(w) {
  return w > 0 && w % CYCLE_WAVES === 0;
}

export function isEliteWave(w) {
  return w % 10 === 5;
}
export function isBossWave(w) {
  return w % 10 === 0;
}
export function isMilestoneWave(w) {
  return w % BALANCE.milestone.every === 0 && !isFinalWave(w);
}

export function normalCount(w) {
  const M = BALANCE.monster;
  const k = BALANCE.horde.mult;
  const base = w >= M.maxCountWave ? M.maxCount : Math.round(M.firstWaveCount + ((w - 1) * (M.maxCount - M.firstWaveCount)) / (M.maxCountWave - 1));
  // countScale: 출현 수만 줄이거나 늘린다 (마리당 체력·골드는 그대로, 2026-11-20 시험용 — 기본 1)
  return Math.round(base * k * (BALANCE.horde.countScale ?? 1));
}

export function waveInfo(w) {
  const normal = normalCount(w);
  if (isFinalWave(w)) return { type: 'final', normal, elite: 0, boss: 1 };
  if (isMilestoneWave(w)) return { type: 'milestone', normal, elite: BALANCE.milestone.extraElites, boss: 1 };
  if (isBossWave(w)) return { type: 'boss', normal, elite: 0, boss: 1 };
  if (isEliteWave(w)) return { type: 'elite', normal, elite: 10, boss: 0 };
  return { type: 'normal', normal, elite: 0, boss: 0 };
}

/** 초반 내구성 배율 (2026-11-24): 1웨이브 earlyHp.mult → untilWave 에서 1 — 같은 비율로 줄어(웨이브당 약 4.7%) 체력 증가(8%)보다 작아 체력은 늘 오른다 */
export function earlyHpMult(w) {
  const E = BALANCE.monster.earlyHp;
  if (!E || w >= E.untilWave) return 1;
  return Math.pow(E.mult, (E.untilWave - w) / (E.untilWave - 1));
}

/** 이 웨이브에 섞이는 특수 몬스터 종류 (열린 것 중 typesPerWave 개, 웨이브 번호로 정해져 늘 같다) */
export function specialTypes(w) {
  const S = BALANCE.special;
  const ww = ((w - 1) % 100) + 1; // 무한 웨이브: 100웨이브마다 처음부터
  const open = Object.keys(S.types).filter((id) => ww >= S.types[id].from);
  if (!open.length) return [];
  if (open.length <= S.typesPerWave) return open;
  // 시작 칸은 웨이브마다 한 칸씩, 간격은 몇 웨이브마다 바뀐다 → 짝이 고르게 돌아간다
  const n = open.length;
  const start = ww % n;
  const step = 1 + (Math.floor(ww / n) % (n - 1));
  const out = [];
  for (let k = 0; k < n && out.length < S.typesPerWave; k++) {
    const id = open[(start + k * step) % n];
    if (!out.includes(id)) out.push(id);
  }
  for (const id of open) if (out.length < S.typesPerWave && !out.includes(id)) out.push(id);
  return out;
}

/** 일반 몬스터 중 특수 몬스터 수 (종류마다) */
export function specialCounts(w) {
  const S = BALANCE.special;
  const types = specialTypes(w);
  if (!types.length) return {};
  const ww = ((w - 1) % 100) + 1;
  const first = Math.min(...Object.values(S.types).map((t) => t.from));
  const t = Math.min(1, Math.max(0, (ww - first) / Math.max(1, S.fullWave - first)));
  const total = Math.round(normalCount(w) * (S.share[0] + (S.share[1] - S.share[0]) * t));
  const out = {};
  types.forEach((id, i) => (out[id] = Math.floor(total / types.length) + (i < total % types.length ? 1 : 0)));
  return out;
}

/** 출현 순서: 보스가 맨 앞, 정예·특수 몬스터('normal:<종류>')는 일반 몬스터 사이에 고르게 */
export function spawnList(w) {
  const info = waveInfo(w);
  // 특수 몬스터는 종류를 번갈아 (빠름, 방어력, 빠름, 방어력 …) 일반 몬스터 사이에 고르게 끼운다
  const groups = Object.entries(specialCounts(w)).map(([id, n]) => Array(n).fill(`normal:${id}`));
  const sp = [];
  for (let i = 0; groups.some((g) => i < g.length); i++) for (const g of groups) if (i < g.length) sp.push(g[i]);
  const list = Array(info.normal - sp.length).fill('normal');
  for (let i = 0; i < sp.length; i++) list.splice(Math.floor(((i + 0.5) * (list.length + 1)) / (sp.length + 1)) + i, 0, sp[i]);
  for (let i = 0; i < info.elite; i++) {
    list.splice(Math.floor(((i + 0.5) * list.length) / info.elite) + i, 0, 'elite');
  }
  if (info.boss) list.unshift('boss');
  return list;
}

/** 일반·정예 이동 속도 배율: 20웨이브마다 10%씩 (복리), 상한 speedMaxMult */
export function speedMultiplier(w) {
  const M = BALANCE.monster;
  return Math.min(M.speedMaxMult, Math.pow(M.speedStepMult, Math.floor(w / M.speedStepWaves)));
}

/** 몬스터 능력치 (수치는 config.js BALANCE.monster) */
export function monsterStats(kind, w, milestone = false, variant = null) {
  const M = BALANCE.monster;
  const hp = (w === 1 && M.firstWaveHp ? M.firstWaveHp : M.hpBase * Math.pow(M.hpGrowth, w - 1)) * M.hpScale;
  if (kind === 'normal' && variant) {
    // 특수 몬스터 (2026-11-24): 체력·속도 배율 · 방어력(그 웨이브 일반 몬스터 체력의 비율) · 저항
    const base = monsterStats('normal', w);
    const v = BALANCE.special.types[variant];
    return {
      hp: base.hp * (v.hp || 1),
      speed: base.speed * (v.speed || 1),
      gold: base.gold * Math.max(1, v.hp || 1),
      armor: base.hp * (v.armor || 0),
      resist: v.resist || null
    };
  }
  switch (kind) {
    case 'boss':
      return { hp: hp * M.bossHpMult * (milestone ? BALANCE.milestone.hpMult : 1), speed: M.bossSpeed, gold: 150 + w * 5 };
    case 'elite':
      return { hp: hp * M.eliteHpMult, speed: M.eliteSpeed * speedMultiplier(w), gold: 20 + w };
    default:
      // 물량: 마리당 체력·골드는 1/mult (골드는 소수 — GameScene 이 모아서 정수로 지급)
      return { hp: (hp * earlyHpMult(w)) / BALANCE.horde.mult, speed: M.normalSpeed * speedMultiplier(w), gold: (2 + Math.floor(w / 15)) / BALANCE.horde.mult };
  }
}
