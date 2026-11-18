// 유닛 등급·레벨 표시 (2026-11-18, 시안 A + C — docs/drafts/grade-level/)
//  - 등급: 발밑 탑뷰 받침 고리(등급색). 뒤쪽 반은 캐릭터 뒤, 앞쪽 반은 앞
//  - 레벨: 오른쪽 아래 등급색 방패 안 숫자 (Lv5 금빛 숫자)
// Phaser 없이 도트 목록만 만든다 (칸 중심 = 0,0 · 아트 1px = 화면 MARK_PX)
export const MARK_PX = 2;
const MAX_LEVEL = 5;
const OUT = 0x2b1d2f;
// 등급색 [진함, 기본, 밝음] — 속성색(빨·파·초)과 겹치지 않게: 커먼 동 · 언커먼 은 · 레어 보라 · 유니크 금
export const GRADE_COLORS = {
  1: [0x6e4a2a, 0xb07a48, 0xe0b07a],
  2: [0x6a7280, 0xb8c0cc, 0xeef2f8],
  3: [0x4a2a7a, 0x9a5ae0, 0xd6b4ff],
  4: [0x8a5a10, 0xf5c542, 0xfff2a0]
};
const LV5 = 0xffe066;
const DIGIT = { 1: ['.w.', 'ww.', '.w.', '.w.', 'www'], 2: ['ww.', '..w', '.w.', 'w..', 'www'], 3: ['ww.', '..w', '.w.', '..w', 'ww.'], 4: ['w.w', 'w.w', 'www', '..w', '..w'], 5: ['www', 'w..', 'ww.', '..w', 'ww.'] };
const SHIELD = ['ooooooooo', 'olllllllo', 'olbbbbbbo', 'olbbbbbbo', 'olbbbbbbo', 'olbbbbbbo', '.obbbbbo.', '..obbbo..', '...ooo...'];

/** 받침 고리 도트 [[x, y, color]] — part: 'back'(캐릭터 뒤) | 'front'(앞) */
export function ringPixels(grade, part) {
  const g = GRADE_COLORS[grade], rx = 10, ry = 4, ey = 8, px = new Map();
  for (let t = 0; t < 360; t += 2) {
    const a = (t * Math.PI) / 180, front = Math.sin(a) > 0;
    if ((part === 'back') === front) continue;
    const x = Math.round(Math.cos(a) * rx), y = Math.round(ey + Math.sin(a) * ry);
    const c = front && grade === 4 ? g[2] : g[1];
    px.set(`${x},${y}`, [x, y, c]);
    px.set(`${x},${y + 1}`, [x, y + 1, c]);
  }
  return [...px.values()];
}

/** 레벨 방패 도트 [[x, y, color]] — 칸 중심 기준 오른쪽 아래 */
export function shieldPixels(grade, level) {
  const g = GRADE_COLORS[grade], ox = 3, oy = 2, out = [];
  const cm = { o: OUT, l: g[2], b: g[0] };
  SHIELD.forEach((row, j) => [...row].forEach((ch, i) => ch in cm && out.push([ox + i, oy + j, cm[ch]])));
  const lv = Math.min(level, MAX_LEVEL);
  DIGIT[lv].forEach((row, j) => [...row].forEach((ch, i) => ch === 'w' && out.push([ox + 3 + i, oy + 2 + j, lv >= MAX_LEVEL ? LV5 : 0xffffff])));
  return out;
}
