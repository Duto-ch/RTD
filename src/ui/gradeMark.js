// 유닛 등급·레벨 표시 (2026-11-18, 시안 A + C — docs/drafts/grade-level/)
//  - 등급: 발밑 탑뷰 받침 고리(등급색). 뒤쪽 반은 캐릭터 뒤, 앞쪽 반은 앞
//  - 레벨: 고리 아래쪽 가운데 둥근 패 안 숫자 (Lv5 금빛) — 방패 모양은 캐릭터가 방패를 찬 것처럼 보여 바꿈
//  - 석판(회색)과 확연히 갈리도록 고리는 채도 높은 색 + 진한 외곽선
// Phaser 없이 도트 목록만 만든다 (칸 중심 = 0,0 · 아트 1px = 화면 MARK_PX)
export const MARK_PX = 2;
const MAX_LEVEL = 5;
const OUT = 0x2b1d2f;
// 등급색 [진함, 기본, 밝음] — 속성색(빨·파·초)과 겹치지 않게: 커먼 동 · 언커먼 은 · 레어 보라 · 유니크 금
export const GRADE_COLORS = {
  1: [0x3e220c, 0x8a5426, 0xb87a40], // 동: 짙은 동색 (2026-11-18)
  2: [0x3c4656, 0xf0f4fa, 0xffffff], // 은: 거의 흰색 (회색 석판보다 확연히 밝게)
  3: [0x3e1670, 0xb36cff, 0xdcc0ff], // 보라
  4: [0x7a4a00, 0xffd23a, 0xfff6b0] // 금
};
const LV5 = 0xffe066;
const DIGIT = { 1: ['.w.', 'ww.', '.w.', '.w.', 'www'], 2: ['ww.', '..w', '.w.', 'w..', 'www'], 3: ['ww.', '..w', '.w.', '..w', 'ww.'], 4: ['w.w', 'w.w', 'www', '..w', '..w'], 5: ['www', 'w..', 'ww.', '..w', 'ww.'] };
const SHIELD = ['ooooooooo', 'olllllllo', 'olbbbbbbo', 'olbbbbbbo', 'olbbbbbbo', 'olbbbbbbo', '.obbbbbo.', '..obbbo..', '...ooo...'];

/** 받침 고리 도트 [[x, y, color]] — part: 'back'(캐릭터 뒤) | 'front'(앞). 2도트 두께 + 진한 외곽선 */
export function ringPixels(grade, part) {
  const g = GRADE_COLORS[grade], rx = 10, ry = 4, ey = 8;
  const ring = new Map();
  for (let t = 0; t < 360; t += 2) {
    const a = (t * Math.PI) / 180;
    const x = Math.round(Math.cos(a) * rx), y = Math.round(ey + Math.sin(a) * ry);
    const c = Math.sin(a) > 0 ? g[1] : g[1]; // 앞뒤 같은 색
    ring.set(`${x},${y}`, [x, y, c]);
    ring.set(`${x},${y + 1}`, [x, y + 1, Math.sin(a) > 0 ? g[1] : g[2]]); // 뒤쪽 아랫줄은 밝게 (빛 받는 면)
  }
  const all = new Map(ring);
  for (const [x, y] of ring.values()) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${x + dx},${y + dy}`;
      if (!ring.has(k) && !all.has(k)) all.set(k, [x + dx, y + dy, OUT]);
    }
  }
  // 고리 위쪽 반(가운데 줄 위) = 뒤, 아래쪽 반 = 앞. 안쪽 외곽선은 위치로 나눈다
  return [...all.values()].filter(([, y]) => (part === 'back' ? y <= ey : y > ey));
}

/** 레벨 패 도트 [[x, y, color]] — 고리 아래쪽 가운데 둥근 패(진한 등급색) 안 숫자 */
export function levelPixels(grade, level) {
  const g = GRADE_COLORS[grade], out = [];
  const x0 = -3, y0 = 9, W = 7, H = 8;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const corner = (x === 0 || x === W - 1) && (y === 0 || y === H - 1);
      if (corner) continue;
      const edge = x === 0 || x === W - 1 || y === 0 || y === H - 1;
      out.push([x0 + x, y0 + y, edge ? OUT : g[0]]);
    }
  }
  const lv = Math.min(level, MAX_LEVEL);
  DIGIT[lv].forEach((row, j) => [...row].forEach((ch, i) => ch === 'w' && out.push([x0 + 2 + i, y0 + 2 + j, lv >= MAX_LEVEL ? LV5 : 0xffffff])));
  return out;
}
