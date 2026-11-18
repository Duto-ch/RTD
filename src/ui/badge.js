// 유닛 발밑 이름표 — Phaser 없이 도트 목록만 만든다 (단위 테스트 가능)
// 레벨·속성 이름표 (2026-11-18, 시안 E): 속성 아이콘 + 레벨 숫자, 테두리 = 등급색. 아트 1px = 화면 BADGE_PX
// 시안 docs/drafts/badge/ — 17x10, 유닛 발밑 앞(칸 중심에서 아래로 5도트)
export const BADGE_PX = 2;
const MAX_LEVEL = 5;
const B_OUT = 0x2b1d2f;
const B_ATTR = { red: [0x9c2622, 0xe0533f, 0xffb347], blue: [0x1f4380, 0x3a7fe0, 0x9fd4ff], green: [0x1f6a34, 0x45a83f, 0xb8ec7a] };
const B_GRADE = { 1: 0x8a6a4a, 2: 0xc8ccd4, 3: 0x7ad0e8, 4: 0xf5c542 }; // 커먼 나무 · 언커먼 은 · 레어 하늘 · 유니크 금
const B_GOLD = 0xf5c542;
const B_ICON = {
  red: ['..o.o..', '.obo.o.', '.obbobo', 'obcbbbo', 'obcwcbo', 'obccbbo', '.obcbo.', '..ooo..'], // 불꽃
  blue: ['...o...', '..obo..', '.obbbo.', 'obcbbbo', 'obwbbbo', 'obcbbbo', '.obbbo.', '..ooo..'], // 물방울
  green: ['...ooo.', '..obbbo', '.obbcbo', 'obbcbbo', 'obcbbo.', 'occbo..', '.ooo...', 'o......'] // 잎
};
const B_DIGIT = { 1: ['.w.', 'ww.', '.w.', '.w.', 'www'], 2: ['ww.', '..w', '.w.', 'w..', 'www'], 3: ['ww.', '..w', '.w.', '..w', 'ww.'], 4: ['w.w', 'w.w', 'www', '..w', '..w'], 5: ['www', 'w..', 'ww.', '..w', 'ww.'] };

/** 이름표 도트 목록 [[x, y, color], ...] (왼쪽 위 = 0,0) */
export function badgePixels(attr, grade, level) {
  const W = 17, H = 10, a = B_ATTR[attr], px = new Map();
  const put = (x, y, c) => px.set(`${x},${y}`, [x, y, c]);
  const rounded = (x0, y0, x1, y1, c, r) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = Math.max(x0 + r - x, 0, x - (x1 - r)), dy = Math.max(y0 + r - y, 0, y - (y1 - r));
      if (dx + dy <= r) put(x, y, c);
    }
  };
  rounded(0, 0, W - 1, H - 1, B_OUT, 2);
  rounded(1, 1, W - 2, H - 2, B_GRADE[grade], 2);
  rounded(2, 2, W - 3, H - 3, a[0], 1);
  const cm = { o: B_OUT, b: a[1], c: a[2], w: 0xffffff };
  B_ICON[attr].forEach((row, j) => [...row].forEach((ch, i) => ch !== '.' && put(1 + i, 1 + j, cm[ch])));
  const lv = Math.min(level, MAX_LEVEL);
  B_DIGIT[lv].forEach((row, j) => [...row].forEach((ch, i) => ch === 'w' && put(10 + i, 2 + j, lv >= MAX_LEVEL ? B_GOLD : 0xffffff)));
  return [...px.values()];
}

