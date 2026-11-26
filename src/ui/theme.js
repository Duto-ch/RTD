// UI 테마 — 픽셀아트 RPG 풍: 크림색 창 + 금빛 테두리 + 주황 제목 탭/버튼 + 픽셀 글꼴 (2026-11-15 사용자 참고 이미지)
// 패널은 아트 해상도(화면 1/3)로 그려서 UI_PX(3)배 확대 → 캐릭터·배경과 같은 픽셀 격자
import { TRAITS } from '../data/synergy.js';
import { GRADES } from '../data/roster.js';
import { pointerFor, uiPosOf, inWorld } from '../systems/hires.js';
import { UI_PX as PX, FONT, COZY, COZY_FONT, COZY_HEAD, RES, GAME_W, GAME_H, UI_SCALE } from '../config.js';

export const UI_FONT = COZY ? COZY_FONT : FONT; // 포근한 카드형: 썬플라워 · 픽셀 UI: Galmuri11

export const C = {
  primary: COZY ? 0x7a9a5c : 0xd0661a, // 주황 버튼·탭 (포근한 카드형: 세이지)
  primaryDeep: COZY ? 0x56743f : 0xa84a10,
  bg: 0x2b1810,
  soft: COZY ? 0xf3ead2 : 0xeedcb0, // 슬롯(오목한 칸)
  card: COZY ? 0xfbf7ec : 0xfff4d9, // 크림
  ink: COZY ? 0x4a3a28 : 0x4a2a14, // 본문 글자 (진갈색)
  sub: COZY ? 0x8c7b60 : 0x8a6a48,
  line: COZY ? 0xe3d6b6 : 0xc9a96a,
  green: 0x3f9a52,
  red: 0xc2453a,
  gold: 0xe0a32a
};

export const CSS = {
  primary: COZY ? '#56743f' : '#b4500f',
  ink: COZY ? '#4a3a28' : '#4a2a14',
  sub: COZY ? '#8c7b60' : '#8a6a48',
  white: '#ffffff',
  onPrimary: '#ffffff',
  green: '#2f7a3e',
  red: '#b8322a',
  gold: '#a8700c',
  outline: '#2b1810'
};

// 양피지 위에서 읽히는 속성색
export const ATTR_CSS_DARK = { red: '#c0362c', blue: '#2f62c4', green: '#2a8a3e' };

// 아트 픽셀 단위 스타일. layers: 바깥→안쪽 순서로 1px씩 채움
const STYLES = {
  // 양피지 창: 검은 외곽 · 나무 테두리 · 어두운 안쪽 선 · 양피지
  card: { layers: ['#2a1608', '#ffc84d', '#ffc84d', '#8a4f22', '#fff4d9'], hi: '#ffe08a', shade: '#f3e3be', grain: '#f0a830', cut: 2 },
  header: { layers: ['#2a1608', '#ffc84d', '#ffc84d', '#8a4f22', '#fff4d9'], hi: '#ffe08a', shade: '#f3e3be', grain: '#f0a830', cut: 2 },
  // 얇은 금빛 띠 (유물 줄처럼 낮은 줄: 테두리를 얇게 해 안쪽 높이 확보)
  strip: { layers: ['#2a1608', '#ffc84d', '#fff4d9'], hi: '#ffe08a', shade: '#f3e3be', cut: 1 },
  // 버튼
  primary: { layers: ['#3a1606', '#d0661a'], hi: '#f08c3a', shade: '#a84a10', cut: 1 },
  danger: { layers: ['#3a1210', '#c2453a'], hi: '#e8735f', shade: '#8e2a24', cut: 1 },
  gold: { layers: ['#3a2608', '#e0a32a'], hi: '#ffd36a', shade: '#a8741a', cut: 1 },
  outline: { layers: ['#2a1608', '#fff2d4'], hi: '#ffffff', shade: '#d9c08a', cut: 1 },
  // 슬롯 (오목): 위·왼쪽이 어둡다
  soft: { layers: ['#a8875a', '#eedcb0'], inset: '#ceb37b', cut: 1 },
  ghost: { layers: ['#a8875a', '#eedcb0'], inset: '#ceb37b', cut: 1 },
  // 어두운 나무 (토스트)
  dark: { layers: ['#1a0f08', '#5a3618'], hi: '#7a4e26', shade: '#43280f', cut: 1 }
};
STYLES.card_tile = STYLES.outline;

export const SHADOW_PAD = 3; // 패널 그림자 여백 (배치 기준이라 UI_PX 가 2 로 바뀌어도 3 그대로)

/** 픽셀 패널 텍스처 (아트 해상도, 그림자 1px 포함). 화면에는 PX 배로 확대해서 쓴다 */
export function panelKey(scene, style, w, h) {
  if (COZY) return cozyKey(scene, style, w, h);
  const aw = Math.max(3, Math.round(w / PX));
  const ah = Math.max(3, Math.round(h / PX));
  const key = `pui_${style}_${aw}x${ah}`;
  if (scene.textures.exists(key)) return key;
  const S = STYLES[style] || STYLES.card;
  const tex = scene.textures.createCanvas(key, aw + 2, ah + 2);
  const ctx = tex.getContext();
  const px = (x, y, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(x + 1, y + 1, 1, 1);
  };
  // 모서리를 깎은 사각형 채우기
  const fillCut = (inset, color, cut) => {
    ctx.fillStyle = color;
    for (let y = inset; y < ah - inset; y++) {
      const dy = Math.min(y - inset, ah - 1 - inset - y);
      const c = Math.max(0, cut - dy);
      ctx.fillRect(1 + inset + c, 1 + y, aw - 2 * inset - 2 * c, 1);
    }
  };
  // 그림자 (아래로 1px)
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#000000';
  for (let y = 0; y < ah; y++) {
    const dy = Math.min(y, ah - 1 - y);
    const c = Math.max(0, S.cut - dy);
    ctx.fillRect(1 + c, 2 + y, aw - 2 * c, 1);
  }
  ctx.globalAlpha = 1;
  S.layers.forEach((color, i) => fillCut(i, color, Math.max(0, S.cut - i)));
  const L = S.layers.length - 1; // 가장 안쪽 칸의 시작
  if (S.hi) for (let x = 2; x < aw - 2; x++) px(x, 1, S.hi); // 테두리 위쪽 밝은 선
  if (S.shade) {
    for (let x = L + 1; x < aw - L - 1; x++) px(x, ah - 1 - L, S.shade); // 안쪽 아래 그림자
    for (let y = L + 1; y < ah - L - 1; y++) px(aw - 1 - L, y, S.shade);
  }
  if (S.inset) {
    for (let x = L; x < aw - L; x++) px(x, L, S.inset); // 오목: 위·왼쪽 어둡게
    for (let y = L; y < ah - L; y++) px(L, y, S.inset);
  }
  // 나뭇결: 나무 테두리(1~2번째 겹)에 결 방향 짧은 어두운 줄을 띄엄띄엄 (같은 크기면 늘 같은 무늬)
  if (S.grain && aw > 12 && ah > 12) {
    let seed = aw * 31 + ah * 17;
    const r = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let x = 4; x < aw - 6; x += 3 + Math.floor(r() * 4)) {
      const len = 2 + Math.floor(r() * 3);
      const row = r() < 0.5 ? 1 : 2;
      for (let k = 0; k < len && x + k < aw - 4; k++) {
        px(x + k, row, S.grain);
        px(x + k, ah - 1 - row, S.grain);
      }
    }
    for (let y = 4; y < ah - 6; y += 3 + Math.floor(r() * 4)) {
      const len = 2 + Math.floor(r() * 3);
      const col = r() < 0.5 ? 1 : 2;
      for (let k = 0; k < len && y + k < ah - 4; k++) {
        px(col, y + k, S.grain);
        px(aw - 1 - col, y + k, S.grain);
      }
    }
  }
  if (S.nails && aw > 10 && ah > 10) {
    for (const [x, y] of [[2, 2], [aw - 3, 2], [2, ah - 3], [aw - 3, ah - 3]]) px(x, y, S.nails);
  }
  tex.refresh();
  return key;
}

/** 패널 이미지 (x, y 는 패널 왼쪽 위) */
export function panel(scene, x, y, w, h, style = 'card') {
  return scene.add.image(x - SHADOW_PAD, y - SHADOW_PAD, panelKey(scene, style, w, h)).setOrigin(0).setScale(panelScale());
}

/** panelKey 텍스처를 화면에 놓을 배율 — 픽셀 패널은 아트 해상도 ×PX, 포근한 카드형은 화면 해상도 ×1/PANEL_RES */
export function panelScale() {
  return COZY ? 1 / PANEL_RES : PX;
}

// ── 포근한 카드형 패널 (B-2): 둥근 모서리 · 얇은 테두리 · 부드러운 그림자, 화면 해상도로 매끈하게 ──
// PC (2026-11-22): UI 는 RES × UI_SCALE(1.5)배로 그려지므로 그 해상도로 만든다 — RES 로 만들어 1.5배로 늘리면 흐릿하고 모서리가 고르지 않았다
const PANEL_RES = RES * UI_SCALE;
const COZY_STYLES = {
  card: { fill: '#fbf7ec', line: '#e3d6b6', lip: 'rgba(120,95,50,0.14)', r: 22 },
  header: { fill: '#fbf7ec', line: '#e3d6b6', lip: 'rgba(120,95,50,0.14)', r: 22 },
  strip: { fill: '#fbf7ec', line: '#e3d6b6', lip: 'rgba(120,95,50,0.14)', r: 99 },
  dark: { fill: '#fbf7ec', line: '#e3d6b6', lip: 'rgba(120,95,50,0.14)', r: 99 },
  primary: { fill: '#7a9a5c', line: '#56743f', lip: '#56743f', r: 18 },
  danger: { fill: '#c2453a', line: '#8e2f26', lip: '#8e2f26', r: 18 },
  gold: { fill: '#e2b54a', line: '#a8801c', lip: '#a8801c', r: 18 },
  outline: { fill: '#fbf7ec', line: '#e3d6b6', lip: 'rgba(120,95,50,0.16)', r: 18 },
  soft: { fill: '#f3ead2', line: '#e3d6b6', lip: null, r: 14 },
  round: { fill: '#f3ead2', line: '#e3d6b6', lip: null, r: 999 }, // 동그란 칸 (정사각이면 원 — 2026-11-23)
  ghost: { fill: '#f3ead2', line: '#e3d6b6', lip: null, r: 14 },
  // 영지 메뉴 버튼 (2026-11-21): 진한 갈색 굵은 테두리 + 아래 입술로 '누르는 버튼' 느낌을 강조
  menu: { fill: '#fbf7ec', line: '#6b4e2a', lip: '#6b4e2a', r: 16, lw: 3, lipH: 3 }
};
// 대기석 칸 등급 테두리 (2026-11-24 사용자 요청: 상점 카드 테두리처럼) — 'soft' 칸과 같은 모양, 테두리 3 = 등급색, 안쪽 = 상점 카드 바탕 (Hud.paintReserve)
// 2026-11-25: 테두리는 등급 그라데이션(위 밝게 → 아래 진하게, gradeGradient)
for (const g of [1, 2, 3, 4]) COZY_STYLES[`grade${g}`] = { fill: '#fffaf0', line: GRADES[g].color, grade: g, lip: null, r: 9, lw: 3 };
// 대기석 빈 칸 (2026-11-24 아래 독 탭 한 줄): 작은 칸이라 둥근 네모(반지름 9)
COZY_STYLES.slotSq = { fill: '#f3ead2', line: '#e3d6b6', lip: null, r: 9 };

function cozyKey(scene, style, w, h) {
  const key = `cozy_${style}_${Math.round(w)}x${Math.round(h)}`;
  if (scene.textures.exists(key)) return key;
  const S = COZY_STYLES[style] || COZY_STYLES.card;
  const pad = SHADOW_PAD; // 픽셀 패널과 같은 여백 (그림자 자리)
  const tex = scene.textures.createCanvas(key, Math.round((w + pad * 2) * PANEL_RES), Math.round((h + pad * 2) * PANEL_RES));
  const ctx = tex.getContext();
  ctx.scale(PANEL_RES, PANEL_RES);
  const r = Math.min(S.r, h / 2, w / 2);
  const shape = (x, y, ww, hh, rr = r) => {
    ctx.beginPath();
    ctx.roundRect(x, y, ww, hh, Math.max(0, rr));
  };
  // 아래로 깔리는 그림자(입술) + 은은한 바깥 그림자
  ctx.shadowColor = 'rgba(60,45,20,0.18)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  if (S.lip) {
    ctx.fillStyle = S.lip;
    shape(pad, pad + (S.lipH || 3), w, h);
    ctx.fill();
  }
  ctx.shadowColor = 'transparent';
  // 테두리 = 바깥 모양을 테두리색으로 채우고, 안쪽(lw 만큼 들어가고 반지름도 lw 줄인 모양)을 바탕색으로 채운다.
  // 예전처럼 바탕 위에 같은 반지름의 선(stroke)을 그리면 모서리에서 선이 바깥선과 어긋나고 가장자리에 바탕색이 비쳐,
  // 아래 입술과 사이에 밝은 실선·모서리 틈이 생겨 '찐빠'처럼 보였다 (2026-11-21)
  const lw = S.lw || 2;
  ctx.fillStyle = S.grade ? gradeGradient(ctx, S.grade, pad, pad + h) : S.line;
  shape(pad, pad, w, h);
  ctx.fill();
  ctx.fillStyle = S.fill;
  shape(pad + lw, pad + lw, w - lw * 2, h - lw * 2, r - lw);
  ctx.fill();
  tex.refresh();
  return key;
}

/**
 * 화면을 꽉 채우는 원본 해상도 그림 (2026-11-22: 영지·성탑 배경 — 도트로 줄이지 않은 사용자 그림).
 * 게임은 pixelArt(가까운 점) 설정이라 이 텍스처만 부드럽게(LINEAR) 거르고, 비율을 지켜 화면을 덮도록(남는 쪽은 가운데 기준 잘림) 맞춘다
 */
export function coverImage(scene, key, W, H) {
  scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
  const img = scene.add.image(W / 2, H / 2, key);
  const k = Math.max(W / img.width, H / img.height);
  return img.setScale(k);
}

/** 패널 이미지 (가운데 기준) */
export function panelImage(scene, x, y, style, w, h) {
  return scene.add.image(x, y + (COZY ? 0 : PX / 2), panelKey(scene, style, w, h)).setScale(panelScale());
}

/** 초록 제목 탭 (패널 위쪽 가장자리에 걸친다). [이미지, 글자] 반환 */
export function titleTab(scene, cx, cy, label, minW = 160) {
  const t = (COZY ? uiText(scene, cx, cy, label, 16.5, '#fffbea', 'bold') : uiText(scene, cx, cy, label, 16, CSS.white, 'bold', { stroke: '#3a1606', strokeThickness: 4 })).setOrigin(0.5);
  const w = Math.max(minW, Math.ceil((t.width + 40) / PX) * PX);
  const img = panelImage(scene, cx, cy, 'primary', w, 36);
  scene.children.bringToTop(t); // 글자를 탭 이미지 위로
  img.gapOk = t.gapOk = true; // 카드 윗변에 일부러 걸친 장식 (ui-audit 여백 검사 제외)
  return [img, t];
}

/** X 닫기 버튼 (픽셀) */
export function closeButton(scene, x, y, onClick) {
  const c = scene.add.container(x, y);
  const bg = scene.add.image(0, COZY ? 0 : PX / 2, panelKey(scene, 'danger', 28, 28)).setScale(panelScale());
  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 1);
  for (let i = -2; i <= 2; i++) {
    g.fillRect(i * 3 - 1.5, i * 3 - 1.5, 3, 3);
    g.fillRect(i * 3 - 1.5, -i * 3 - 1.5, 3, 3);
  }
  c.add([bg, g]);
  c.setSize(28, 28).setInteractive({ useHandCursor: true });
  c.gapOk = true; // 카드 모서리에 일부러 걸친 장식 (ui-audit 여백 검사 제외)
  c.on('pointerup', onClick);
  return c;
}

/** 화면 배경: 픽셀 UI 에선 월드 배경이 그대로 보이게 투명 */
export function backdropKey(scene, w, h) {
  const key = `pui_backdrop_${w}x${h}`;
  if (!scene.textures.exists(key)) scene.textures.createCanvas(key, 1, 1).refresh();
  return key;
}

/** UI 글자 (픽셀 글꼴). weight: '700' / 'bold' 는 굵게 */
// 글자 크기 한 단계 작게 (2026-11-25 사용자 결정: 글자 최소 10) — 본문 크기(16.5 이하)를 한 단계 아래로. ?fontstep=0 이면 예전 크기
const FONT_STEPS = [10, 11, 12, 13, 14, 15, 16.5];
export const FONT_STEP = (() => {
  try {
    const q = new URLSearchParams(globalThis.location?.search || '').get('fontstep');
    return q == null ? 1 : Number(q);
  } catch {
    return 1;
  }
})();
function stepSize(size) {
  if (!FONT_STEP || size > 16.5) return size;
  let i = FONT_STEPS.findIndex((v) => v >= size);
  if (i < 0) i = FONT_STEPS.length - 1;
  return FONT_STEPS[Math.max(0, i - FONT_STEP)];
}

export function uiText(scene, x, y, str, size = 16, color = CSS.ink, weight = '600', extra = {}) {
  size = stepSize(size);
  const bold = weight === '700' || weight === 'bold';
  return scene.add.text(x, y, str, {
    fontFamily: COZY && bold ? COZY_HEAD : UI_FONT, // 포근한 카드형: 굵은 글자도 같은 글꼴의 Bold
    fontSize: `${size}px`,
    fontStyle: bold ? 'bold' : 'normal',
    color,
    ...extra
  });
}

// 7x7 픽셀 아이콘
const ICONS = {
  // 확대·축소·가운데로 (2026-11-23: 글꼴 기호 '+ - ◎' 는 글꼴 여백 탓에 1~2.5px 어긋나 7x7 대칭 도트로)
  plus: ['.......', '...x...', '...x...', '.xxxxx.', '...x...', '...x...', '.......'],
  minus: ['.......', '.......', '.......', '.xxxxx.', '.......', '.......', '.......'],
  target: ['..xxx..', '.x...x.', 'x.....x', 'x..x..x', 'x.....x', '.x...x.', '..xxx..'],
  clock: ['..xxx..', '.x...x.', 'x..x..x', 'x..xx.x', 'x.....x', '.x...x.', '..xxx..'],
  coin: ['..xxx..', '.xyyyx.', 'xyyxyyx', 'xyxyyyx', 'xyyxyyx', '.xyyyx.', '..xxx..'],
  heart: ['.xx.xx.', 'xxxxxxx', 'xxxxxxx', 'xxxxxxx', '.xxxxx.', '..xxx..', '...x...'],
  monster: ['.xxxxx.', 'xxxxxxx', 'x.xxx.x', 'x..x..x', 'xxxxxxx', '.x.x.x.', '.......'],
  speed: ['x..x...', 'xx.xx..', 'xxxxxx.', 'xxxxxxx', 'xxxxxx.', 'xx.xx..', 'x..x...'],
  pause: ['xx..xx.', 'xx..xx.', 'xx..xx.', 'xx..xx.', 'xx..xx.', 'xx..xx.', 'xx..xx.'],
  play: ['x......', 'xxx....', 'xxxxx..', 'xxxxxxx', 'xxxxx..', 'xxx....', 'x......'],
  menu: ['xxxxxxx', '.......', 'xxxxxxx', '.......', 'xxxxxxx', '.......', '.......'],
  userplus: ['.xx....', 'xxxx...', '.xx..x.', '....xxx', 'xxxx.x.', 'xxxx...', 'xxxx...'],
  crown: ['x..x..x', 'xx.x.xx', 'xxxxxxx', 'xxxxxxx', 'xyxyxyx', 'xxxxxxx', '.......'],
  star: ['...x...', '..xxx..', 'xxxxxxx', '.xxxxx.', '..xxx..', '.xx.xx.', 'x.....x'],
  tower: ['..x.x..', '..xxx..', '..x.x..', '..xxx..', '..xxx..', '.xxxxx.', '.......'],
  ticket: ['.......', 'xxxxxxx', 'x.x.x.x', 'xxxxxxx', 'x.x.x.x', 'xxxxxxx', '.......'],
  gem: ['.xxxxx.', 'x.x.x.x', 'xxxxxxx', '.x...x.', '..x.x..', '...x...', '.......'],
  anvil: ['.......', 'xxxxxx.', '.xxxxxx', '..xxx..', '..xxx..', '.xxxxx.', '.......'],
  sword: ['......x', '.....x.', '....x..', 'x..x...', '.xx....', '.xx....', 'x..x...'],
  cross: ['xx...xx', 'xxx.xxx', '.xxxxx.', '..xxx..', '.xxxxx.', 'xxx.xxx', 'xx...xx'],
  lock: ['..xxx..', '.x...x.', '.x...x.', 'xxxxxxx', 'xxx.xxx', 'xxx.xxx', 'xxxxxxx'],
  unlock: ['..xxx..', '.x...x.', '.x.....', 'xxxxxxx', 'xxx.xxx', 'xxx.xxx', 'xxxxxxx'],
  reroll: ['..xxxx.', '.x...xx', 'x...xxx', 'x......', 'xxx...x', 'xx...x.', '.xxxx..'],
  house: ['...x...', '..xxx..', '.xxxxx.', 'xxxxxxx', '.x...x.', '.x.x.x.', '.xxxxx.'],
  // 시너지 12종 상징 (2026-11-21: 글자 대신 간단한 모양) — 계열 6 · 출신 6. 이름 = trait_<id>
  trait_warrior: ['......x', '.....x.', '....x..', 'x..x...', '.xx....', '.xx....', 'x..x...'],
  trait_ranger: ['...xxxx', '.....xx', '....x.x', '...x..x', '..x....', 'xx.....', 'xx.....'],
  trait_assassin: ['..xxx..', '.xx....', 'xx.....', 'xx.....', 'xx.....', '.xx....', '..xxx..'],
  trait_gunner: ['.....xy', '....x..', '..xxx..', '.xxxxx.', 'xxxxxxx', '.xxxxx.', '..xxx..'],
  trait_hexer: ['.xxxxx.', 'xxxxxxx', 'x..x..x', 'xxxxxxx', '.xxxxx.', '.x.x.x.', '.......'],
  trait_support: ['..xxx..', '..xxx..', 'xxxxxxx', 'xxxxxxx', 'xxxxxxx', '..xxx..', '..xxx..'],
  trait_north: ['x.....x', 'xx...xx', '.xxxxx.', 'xxxxxxx', 'xxxxxxx', 'xx.x.xx', '.......'],
  trait_knight: ['xxxxxxx', 'xxxyxxx', 'xxyyyxx', 'xxxyxxx', '.xxxxx.', '..xxx..', '...x...'],
  trait_tower: ['...x...', '..xx...', '..xxx..', '.xxyx..', '.xxxxx.', 'xxxxxxx', '.......'],
  trait_grove: ['....xxx', '..xxxxx', '.xxxx.x', '.xxx.xx', '.xx.xxx', '.x.xxx.', 'x......'],
  trait_lake: ['...x...', '..xxx..', '.xxxxx.', 'xxxxxxx', 'xyxxxxx', '.xxxxx.', '..xxx..'],
  trait_guild: ['..x.x..', '...x...', '.xxxxx.', 'xxxxxxx', 'xxxyxxx', 'xxxxxxx', '.xxxxx.']
};

/** 픽셀 아이콘 그리기 (s = 대략적인 크기 px) */
export function drawIcon(g, type, x, y, s, color) {
  const map = ICONS[type];
  if (!map) return;
  g.iconName ||= type; // 이름표 (tools/export-psd.cjs 레이어 이름)
  // 아이콘 1칸 = 2px (도트 2px 통일, 2026-11-21) — 7칸 = 14px. s 는 예전 크기 인자(무시)
  const b = 2;
  const ox = Math.round(x - (7 * b) / 2);
  const oy = Math.round(y - (7 * b) / 2);
  map.forEach((row, j) =>
    [...row].forEach((ch, i) => {
      if (ch === '.') return;
      g.fillStyle(ch === 'y' ? 0xffd36a : color, 1);
      g.fillRect(ox + i * b, oy + j * b, b, b);
    })
  );
}

/** 어두운 배경용 색을 양피지 위에서 읽히게 바꾼다 */
export function onLight(color) {
  const map = {
    '#ffffff': CSS.primary,
    '#f2c14e': CSS.gold,
    '#d6a8ff': '#6a3fb0',
    '#ff6a55': CSS.red,
    '#ff5050': CSS.red,
    '#ff4dd2': '#a0207e',
    '#ff9a7a': CSS.red,
    '#9aa3b8': CSS.sub,
    '#6fd36a': '#2a8a3e',
    '#5aa2ff': '#2f62c4'
  };
  return map[color] || color;
}

/**
 * 시너지 상징 배지 (2026-11-21): 시너지 색 원 + 하얀 모양 그림(theme trait_<id>, 7칸 × 2px). off 면 옅은 원 + 갈색 모양
 * @returns {Phaser.GameObjects.Container}
 */
export function traitBadge(s, x, y, k, r = 10, on = true, { tip = true, world = false } = {}) {
  const t = TRAITS[k];
  const col = Phaser.Display.Color.HexStringToColor(t.color).color;
  const c = s.add.container(x, y);
  // 2026-11-23: 도형 명령 대신 화면 해상도로 미리 그린 원 (곡선이 고르게) — world = 필드 캐릭터 위(전장 해상도)
  const img = discImage(s, 0, 0, { r, fill: on ? col : 0xd9cdb2, line: on ? 0x2b1d2f : 0xa8875a, lw: 2, icon: `trait_${k}`, iconColor: on ? 0xffffff : 0x8c6f45, world });
  img.layerName = '배지 원·상징';
  c.add(img);
  c.auditBox = { x: -r - 1, y: -r - 1, w: 2 * r + 2, h: 2 * r + 2 }; // tools/ui-audit.cjs 여백 검사 (외곽선 포함)
  // 마우스를 올리면 시너지 이름 툴팁 (2026-11-22 사용자 요청: 모든 곳의 시너지 아이콘)
  if (tip) registerTraitTip(s, c, k, r);
  return c;
}

/**
 * 시너지 아이콘 이름 툴팁 (2026-11-22): 장면마다 배지를 모아 두고 포인터 위치로 찾는다.
 * 배지 위를 덮는 누르기 영역(상점 카드 등)이 있어도 뜨도록 입력 이벤트 대신 pointermove·pointerdown 으로 직접 확인한다
 */
function registerTraitTip(s, badge, k, r) {
  badge.tipKey = k;
  badge.tipR = r + 1;
  let st = s.__traitTips;
  if (!st) {
    st = s.__traitTips = { list: new Set(), tip: null, badge: null };
    const hide = () => {
      st.tip?.destroy();
      st.tip = null;
      st.badge = null;
    };
    const visible = (o) => {
      for (let p = o; p; p = p.parentContainer) if (!p.visible || p.alpha === 0) return false;
      return true;
    };
    const inMask = (o, x, y) => {
      for (let p = o.parentContainer; p; p = p.parentContainer) if (p.maskRect) { const m = p.maskRect; return x >= m.x && x <= m.x + m.w && y >= m.y && y <= m.y + m.h; }
      return true;
    };
    const blocked = () => s.tut?.open || s.hud?.menu || s.hud?.popup || s.menu;
    const check = (p) => {
      let hit = null;
      if (!blocked()) {
        for (const b of st.list) {
          if (!b.active) { st.list.delete(b); continue; }
          if (!visible(b)) continue;
          const { x, y } = pointerFor(s, b, p); // 전장(월드) 배지·UI 배지 좌표가 다르다 (2026-11-22 PC 전환)
          const c = b.getWorldTransformMatrix().transformPoint(0, 0);
          if ((x - c.x) ** 2 + (y - c.y) ** 2 <= b.tipR * b.tipR && inMask(b, x, y)) hit = b; // 나중에 만든 것(위에 그려진 것) 우선
        }
      }
      if (hit === st.badge) return;
      hide();
      if (hit) {
        st.badge = hit;
        st.tip = traitTipBox(s, hit);
      }
    };
    s.input.on('pointermove', check);
    s.input.on('pointerdown', check);
    s.events.once('shutdown', () => {
      hide();
      s.__traitTips = null;
    });
    st.check = check;
  }
  st.list.add(badge);
}

/** 이름 툴팁 상자: 배지 위(자리가 없으면 아래) — '전사 · 계열' */
function traitTipBox(s, badge) {
  const t = TRAITS[badge.tipKey];
  const c0 = uiPosOf(s, badge);
  const r = inWorld(s, badge) ? badge.tipR / UI_SCALE : badge.tipR;
  const label = uiText(s, 0, 0, `${t.name} · ${t.kind === 'class' ? '계열' : '출신'}`, 12, CSS.ink, 'bold').setOrigin(0.5);
  const w = Math.ceil(label.width + 24);
  const h = 28;
  const W = GAME_W;
  const x = Math.round(Math.min(W - 6 - w / 2, Math.max(6 + w / 2, c0.x)));
  let y = Math.round(c0.y - r - 6 - h / 2);
  if (y - h / 2 < 4) y = Math.round(c0.y + r + 6 + h / 2);
  const box = s.add.container(x, y, [panelImage(s, 0, 0, 'strip', w, h), label]).setDepth(5000);
  box.auditOk = true; // 잠깐 뜨는 툴팁 (ui-audit 제외)
  return box;
}

/**
 * 화면 끝에 붙는 바 (2026-11-22 사용자 요청: 위·아래 UI 바를 좌우 끝까지, 화면 끝은 둥근 모서리 없이).
 * 크림 판 + 화면 안쪽 가장자리에만 테두리 선과 옅은 그림자. edge = 'top'(화면 위에 붙음) | 'bottom'
 */
export function edgeBar(scene, x, y, w, h, edge = 'top') {
  const g = scene.add.graphics();
  g.layerName = edge === 'top' ? '위 바 판' : '아래 바 판'; // 이름표 (tools/export-psd.cjs)
  g.fillStyle(0xfbf7ec, 1).fillRect(x, y, w, h);
  if (edge === 'top') {
    g.fillStyle(0x785f32, 0.14).fillRect(x, y + h, w, 3); // 아래 그림자
    g.fillStyle(0xe3d6b6, 1).fillRect(x, y + h - 2, w, 2);
  } else {
    g.fillStyle(0x785f32, 0.1).fillRect(x, y - 3, w, 3); // 위 그림자
    g.fillStyle(0xe3d6b6, 1).fillRect(x, y, w, 2);
  }
  return g;
}


// ── 화면 위·아래 바 (2026-11-25 시안: 성탑·병영·술집을 영지처럼) ──
export const SCREEN_TOP_H = 48;
/**
 * 영지와 같은 위 바 (일직선, 높이 48): 왼쪽 원 아이콘 + 화면 이름 + 작은 글자(sub), 오른쪽 재화·수치 칸들.
 * right: [[이름, 값(문자열/숫자), 원 색, 아이콘]] — 영지 재화와 같은 모양(작은 원 + '이름 값' 한 줄).
 * 돌려줌: { sub, right: [글자…] } (값을 바꿀 때 setText)
 */
export function screenTop(scene, { icon, title, sub = '', right = [], iconFill = 0x1f6f66, depth = 0 }) {
  const H = SCREEN_TOP_H;
  const out = { objs: [] };
  const add = (o) => (out.objs.push(o.setDepth?.(depth) || o), o);
  add(tabBar(scene, 'top', H, { x0: GAME_W / 2, x1: GAME_W / 2, depth: 0, slope: 0 }));
  add(discImage(scene, 40, H / 2, { r: 16, fill: iconFill, line: 0x6b4e2a, lw: 2, icon, iconColor: 0xfff3c4 }));
  const nm = add(uiText(scene, 64, H / 2, title, 18, CSS.ink, 'bold').setOrigin(0, 0.5));
  out.sub = add(uiText(scene, nm.x + nm.width + 12, H / 2, sub, 13, CSS.primary, 'bold').setOrigin(0, 0.5));
  const w = 150;
  const gap = 12;
  out.right = right.map(([label, n, col, ic], i) => {
    const x = GAME_W - 16 - (right.length - i) * w - (right.length - 1 - i) * gap;
    add(discImage(scene, x + 14, H / 2, { r: 11, fill: col, icon: ic }));
    const t = add(uiText(scene, x + 32, H / 2, `${label} ${typeof n === 'number' ? n.toLocaleString() : n}`, 15, CSS.ink, 'bold').setOrigin(0, 0.5));
    t.label = label;
    return t;
  });
  return out;
}

/** 영지와 같은 아래 독 (y 부터 화면 아래까지) + 가운데 탭(tab: {x0, x1, depth, slope}) · 탭 안 글자(label, 없으면 '') */
export function screenDock(scene, y, tab, label = '', depth = 0) {
  const bar = tabBar(scene, 'bottom', y, tab).setDepth(depth);
  const t = label != null ? uiText(scene, (tab.x0 + tab.x1) / 2, y - tab.depth / 2 + 2, label, 13, CSS.ink, 'bold').setOrigin(0.5).setDepth(depth) : null;
  return { bar, label: t };
}

/**
 * 가운데 탭이 달린 가장자리 바 (2026-11-24 사용자 시안): 화면 좌우 끝까지 붙은 크림 바 + 가운데가 화면 안쪽으로 튀어나온 탭.
 * 탭 양옆은 부드러운 S 곡선, 안쪽 가장자리를 따라 금갈색 선 + 그림자. 캔버스로 UI 해상도 그대로 그려 곡선이 고르다
 * @param {'top'|'bottom'} edge  top: 화면 위에 붙고 탭이 아래로 / bottom: 화면 아래에 붙고 탭이 위로
 * @param {number} y  top: 바 아래 끝 y(탭 제외) / bottom: 바 위 끝 y(탭 제외)
 * @param {{x0:number, x1:number, depth:number, slope?:number}} tab 탭 바닥(가장 튀어나온 곳)의 좌우 x · 튀어나온 깊이 · 양옆 곡선 폭
 */
export function tabBar(scene, edge, y, tab, { w = GAME_W, line = '#b8913f', fill = '#fbf7ec' } = {}) {
  const top = edge === 'top';
  const slope = tab.slope ?? 48;
  const H = top ? y + tab.depth : GAME_H - y + tab.depth; // 그림 높이 (탭 포함)
  const pad = 8; // 그림자 자리
  const id = `tabbar_${edge}_${y}_${tab.x0}_${tab.x1}_${tab.depth}_${slope}_${w}`;
  const draw = (ctx) => {
    ctx.translate(-w / 2, -(H + pad * 2) / 2 + pad);
    // 위 바 기준으로 그리고, 아래 바는 뒤집는다
    if (!top) {
      ctx.translate(0, H);
      ctx.scale(1, -1);
    }
    const b = top ? y : GAME_H - y; // 바 두께
    const d = b + tab.depth;
    // 안쪽 가장자리: 바 끝 → 탭 왼쪽 S 곡선 → 탭 바닥 → 오른쪽 S 곡선 → 바 끝
    const edge = (start) => {
      ctx[start ? 'moveTo' : 'lineTo'](-4, b);
      ctx.lineTo(tab.x0 - slope, b);
      ctx.bezierCurveTo(tab.x0 - slope / 2, b, tab.x0 - slope / 2, d, tab.x0, d);
      ctx.lineTo(tab.x1, d);
      ctx.bezierCurveTo(tab.x1 + slope / 2, d, tab.x1 + slope / 2, b, tab.x1 + slope, b);
      ctx.lineTo(w + 4, b);
    };
    const outline = () => {
      ctx.beginPath();
      ctx.moveTo(-4, -4);
      edge(false);
      ctx.lineTo(w + 4, -4);
      ctx.closePath();
    };
    ctx.fillStyle = fill;
    ctx.save();
    ctx.shadowColor = 'rgba(60,45,20,0.28)'; // 안쪽으로 살짝 그림자
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = top ? 3 : -3; // 그림자 방향은 변환과 상관없이 화면 기준
    outline();
    ctx.fill();
    ctx.restore();
    outline();
    ctx.fill();
    // 안쪽 가장자리 선: 금갈색 선 + 그 안쪽 밝은 실선
    ctx.beginPath();
    edge(true);
    ctx.lineWidth = 3;
    ctx.strokeStyle = line;
    ctx.stroke();
    ctx.save();
    ctx.translate(0, -2.5);
    ctx.beginPath();
    edge(true);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.stroke();
    ctx.restore();
  };
  const img = shapeImage(scene, w / 2, top ? (H + pad * 2) / 2 - pad : GAME_H - (H + pad * 2) / 2 + pad, id, w, H + pad * 2, draw);
  img.layerName = top ? '위 바 판' : '아래 바 판';
  return img;
}

// ── 곡선 UI 를 그림으로 (2026-11-23 사용자 요청: 원형 UI 곡선이 어긋나던 문제) ──
// 도형 명령(Graphics)의 원은 다각형 + 4배 표본 안티에일리어싱이라 작은 원일수록 곡선이 고르지 않고, 1.5배 확대에서
// 선 두께·중심이 픽셀과 어긋났다 → 캔버스로 화면 해상도 그대로 미리 그려 1:1 로 놓는다 (roundPixels 로 픽셀 경계에 맞음).
// 텍스처 크기의 짝·홀은 안에 든 도트 아이콘(7칸 × 2 = 14 논리 px)이 픽셀 경계에 맞게 고른다 → 좌우·상하 대칭

/** 캔버스 텍스처 (가운데가 원점인 논리 좌표로 draw(ctx)). world = 전장 해상도(RES), 아니면 UI 해상도(RES × 1.5) */
export function shapeKey(scene, id, w, h, draw, { world = false, odd = null } = {}) {
  const R = world ? RES : PANEL_RES;
  const key = `shape_${world ? 'w' : 'u'}_${id}`;
  if (scene.textures.exists(key)) return key;
  const fit = (v, wantOdd) => {
    let n = Math.ceil(v * R) + 2;
    if (wantOdd !== null && n % 2 !== (wantOdd ? 1 : 0)) n += 1;
    return n;
  };
  const cw = fit(w, odd);
  const ch = fit(h, odd);
  const tex = scene.textures.createCanvas(key, cw, ch);
  const ctx = tex.getContext();
  ctx.translate(cw / 2, ch / 2);
  ctx.scale(R, R);
  draw(ctx);
  tex.refresh();
  return key;
}

/** shapeKey 그림을 (x, y) 가운데에 화면 1:1 로 놓는다 */
export function shapeImage(scene, x, y, id, w, h, draw, opts = {}) {
  const R = opts.world ? RES : PANEL_RES;
  const img = scene.add.image(x, y, shapeKey(scene, id, w, h, draw, opts)).setScale(1 / R);
  img.shapeR = R;
  return img;
}


// ── 등급 테두리 그라데이션 (2026-11-25 사용자 결정: 영지 마름모 버튼처럼 — 전투 상점 카드·대기석, 영지 덱 줄, 병영 카드) ──
// 등급색(GRADES[g].color)을 위는 흰색 쪽으로, 아래는 검정 쪽으로 — 가운데가 원래 등급색
export const GRADE_GRAD = { top: 0.3, bottom: -0.2 };
const shadeCss = (c, t) => {
  const f = (v) => Math.round(t > 0 ? v + (255 - v) * t : v * (1 + t));
  return `rgb(${f((c >> 16) & 255)},${f((c >> 8) & 255)},${f(c & 255)})`;
};
/** 캔버스 세로 그라데이션 (y0 = 위 밝음 → y1 = 아래 진함) */
export function gradeGradient(ctx, grade, y0, y1) {
  const c = parseInt(GRADES[grade].color.slice(1), 16);
  const gr = ctx.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, shadeCss(c, GRADE_GRAD.top));
  gr.addColorStop(0.5, shadeCss(c, 0));
  gr.addColorStop(1, shadeCss(c, GRADE_GRAD.bottom));
  return gr;
}

/**
 * 등급 테두리 카드 그림 (바깥 모양 x, y, w, h — 왼쪽 위 기준). 테두리 lw = 등급 그라데이션, 안쪽 = fill.
 * radii {tl,tr,bl,br} 로 모서리마다, band = 아래 등급색 띠가 시작하는 y(카드 안 좌표, 바닥까지), gradH = 그라데이션 높이(기본 h), side = 오른쪽 몫 채움
 */
export function gradeFrame(scene, x, y, w, h, grade, { r = 10, lw = 3, fill = '#fffaf0', radii = null, band = null, gradH = h, side = 0 } = {}) {
  const R = radii || { tl: r, tr: r, bl: r, br: r };
  const id = `gframe_${grade}_${w}x${h}_${lw}_${fill}_${R.tl}_${R.tr}_${R.bl}_${R.br}_${band}_${gradH}_${side}`;
  const img = shapeImage(scene, x + w / 2, y + h / 2, id, w, h, (ctx) => {
    ctx.translate(-w / 2, -h / 2);
    const grad = gradeGradient(ctx, grade, 0, gradH);
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, [R.tl, R.tr, R.br, R.bl]);
    ctx.fillStyle = grad;
    ctx.fill();
    const ir = (v) => Math.max(0, v - lw);
    // side: 오른쪽 몫(0~1)은 테두리와 같은 그라데이션 그대로 두고, 안쪽 바탕은 왼쪽만 — 경계 모서리도 둥글게 (2026-11-25 병영 카드)
    const sx = side ? Math.round(w * (1 - side)) : w - lw;
    const sr = side ? Math.min(10, (h - lw * 2) / 2) : null;
    ctx.beginPath();
    ctx.roundRect(lw, lw, sx - lw, h - lw * 2, [ir(R.tl), side ? sr : ir(R.tr), side ? sr : ir(R.br), ir(R.bl)]);
    ctx.fillStyle = fill;
    ctx.fill();
    if (band != null) {
      ctx.fillStyle = grad;
      ctx.fillRect(0, band, w, h - band);
    }
  });
  return img;
}

const hex = (c) => `#${(c >>> 0).toString(16).padStart(6, '0')}`;

/** 캔버스에 도트 아이콘(theme ICONS, 7칸 × 2 논리 px)을 가운데 (0,0) 에 */
export function paintIcon(ctx, type, color) {
  const map = ICONS[type];
  if (!map) return;
  map.forEach((row, j) =>
    [...row].forEach((ch, i) => {
      if (ch === '.') return;
      ctx.fillStyle = ch === 'y' ? '#ffd36a' : hex(color);
      ctx.fillRect(-7 + i * 2, -7 + j * 2, 2, 2);
    })
  );
}

/** 아이콘이 든 원 텍스처의 짝·홀: 아이콘 폭(14 × 해상도)이 홀수면 홀수 */
const iconOdd = (world) => (Math.round(14 * (world ? RES : PANEL_RES)) % 2 === 1);

/**
 * 거리로 직접 칠한 모양 텍스처 (2026-11-23): 픽셀 가운데에서 모양 가장자리까지 거리로 덮임 정도(0~1)를 계산해
 * 가장자리를 부드럽게 — 브라우저 캔버스 곡선은 그래픽 카드 표본 위치 탓에 좌우·상하가 조금씩 달랐다(최대 알파 67 차이).
 * layers: [{ sdf(x, y) → 화면 px 거리(안쪽 음수), color }] 아래부터. top(ctx) = 맨 위 덧그림(아이콘 등, 논리 좌표·가운데 원점),
 * clip(x, y) = 덧그림을 자를 모양의 거리. 크기는 논리 w×h, odd = 텍스처 픽셀 수 홀수(가운데가 픽셀 한가운데)
 */
function sdfKey(scene, id, w, h, { layers, top, clip, world = false, odd = false }) {
  const R = world ? RES : PANEL_RES;
  const key = `shape_${world ? 'w' : 'u'}_${id}`;
  if (scene.textures.exists(key)) return key;
  const fit = (v) => { let n = Math.ceil(v * R) + 2; if (n % 2 !== (odd ? 1 : 0)) n += 1; return n; };
  const cw = fit(w);
  const ch = fit(h);
  const tex = scene.textures.createCanvas(key, cw, ch);
  const ctx = tex.getContext();
  const img = ctx.createImageData(cw, ch);
  const d = img.data;
  const cx = cw / 2;
  const cy = ch / 2;
  const cover = (dist) => Math.max(0, Math.min(1, 0.5 - dist));
  // 겹 칠하기 (src-over)
  for (const L of layers) {
    const r = (L.color >> 16) & 255, g = (L.color >> 8) & 255, b = L.color & 255;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const a = cover(L.sdf(x + 0.5 - cx, y + 0.5 - cy));
      if (!a) continue;
      const i = (y * cw + x) * 4;
      const da = d[i + 3] / 255;
      const oa = a + da * (1 - a);
      d[i] = (r * a + d[i] * da * (1 - a)) / oa;
      d[i + 1] = (g * a + d[i + 1] * da * (1 - a)) / oa;
      d[i + 2] = (b * a + d[i + 2] * da * (1 - a)) / oa;
      d[i + 3] = oa * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  if (top) {
    // 덧그림은 따로 그려 clip 모양 덮임만큼만 얹는다
    const t = document.createElement('canvas');
    t.width = cw;
    t.height = ch;
    const tc = t.getContext('2d');
    tc.translate(cx, cy);
    tc.scale(R, R);
    top(tc);
    const td = tc.getImageData(0, 0, cw, ch);
    const q = td.data;
    if (clip) for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) q[(y * cw + x) * 4 + 3] *= cover(clip(x + 0.5 - cx, y + 0.5 - cy));
    tc.setTransform(1, 0, 0, 1, 0, 0);
    tc.putImageData(td, 0, 0);
    ctx.drawImage(t, 0, 0);
  }
  tex.refresh();
  return key;
}

const circleSdf = (rad) => (x, y) => Math.hypot(x, y) - rad;

/**
 * 원(테두리 선택) + 가운데 도트 아이콘 + 덧그리기. 테두리는 바깥 원을 선 색으로, 안쪽 원을 바탕색으로 (선 겹침 흐림 없음).
 * 아이콘·덧그림은 안쪽 원으로 잘라 그린다(7칸 아이콘 모서리가 작은 원 밖으로 삐져나오던 것)
 * @param {{ r: number, fill: number, line?: number, lw?: number, ring?: { color: number, w: number }, icon?: string, iconColor?: number, draw?: (ctx) => void, world?: boolean, id?: string }} o
 */
export function discImage(scene, x, y, o) {
  const R = o.world ? RES : PANEL_RES;
  const lw = o.line != null ? o.lw ?? 2 : 0;
  const ring = o.ring ? o.ring.w : 0;
  const outer = o.r + lw / 2 + ring;
  const id = o.id || `disc_${o.r}_${o.fill}_${o.line}_${lw}_${o.ring?.color}_${ring}_${o.icon}_${o.iconColor}`;
  const layers = [];
  if (ring) layers.push({ sdf: circleSdf(outer * R), color: o.ring.color });
  if (lw) layers.push({ sdf: circleSdf((o.r + lw / 2) * R), color: o.line });
  layers.push({ sdf: circleSdf((o.r - lw / 2) * R), color: o.fill });
  const top = o.icon || o.draw ? (ctx) => { if (o.icon) paintIcon(ctx, o.icon, o.iconColor ?? 0xffffff); o.draw?.(ctx); } : null;
  const key = sdfKey(scene, id, outer * 2, outer * 2, { layers, top, clip: circleSdf((o.r - lw / 2) * R), world: o.world, odd: o.icon ? iconOdd(o.world) : false });
  const img = scene.add.image(x, y, key).setScale(1 / R);
  if (o.icon) img.iconName = o.icon;
  return img;
}

/** 알약(가로로 긴 둥근 판) — 테두리 lw 는 화면에서 정수 px 이 되게 (UI 1.5배: 4/3 → 2px) */
export function pillImage(scene, x, y, w, h, fill, line, lw = 4 / 3) {
  const R = PANEL_RES;
  const capsule = (ww, hh) => (px, py) => Math.hypot(Math.max(Math.abs(px) - (ww - hh) / 2, 0), py) - hh / 2;
  const key = sdfKey(scene, `pill_${w}x${h}_${fill}_${line}_${lw.toFixed(2)}`, w, h, {
    layers: [{ sdf: capsule(w * R, h * R), color: line }, { sdf: capsule((w - lw * 2) * R, (h - lw * 2) * R), color: fill }],
    odd: Math.round(h * R) % 2 === 1
  });
  return scene.add.image(x, y, key).setScale(1 / R);
}

/** 고리(속이 빈 원) */
export function ringImage(scene, x, y, r, lw, color) {
  const R = PANEL_RES;
  const key = sdfKey(scene, `ring_${r}_${lw}_${color}`, (r + lw) * 2, (r + lw) * 2, {
    layers: [{ sdf: (px, py) => Math.abs(Math.hypot(px, py) - r * R) - (lw * R) / 2, color }]
  });
  return scene.add.image(x, y, key).setScale(1 / R);
}
