// UI 테마 — 픽셀아트 RPG 풍: 크림색 창 + 금빛 테두리 + 주황 제목 탭/버튼 + 픽셀 글꼴 (2026-11-15 사용자 참고 이미지)
// 패널은 아트 해상도(화면 1/3)로 그려서 UI_PX(3)배 확대 → 캐릭터·배경과 같은 픽셀 격자
import { UI_PX as PX, FONT, COZY, COZY_FONT, COZY_HEAD, RES } from '../config.js';

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

/** panelKey 텍스처를 화면에 놓을 배율 — 픽셀 패널은 아트 해상도 ×PX, 포근한 카드형은 캔버스 해상도 ×1/RES */
export function panelScale() {
  return COZY ? 1 / RES : PX;
}

// ── 포근한 카드형 패널 (B-2): 둥근 모서리 · 얇은 테두리 · 부드러운 그림자, 캔버스 해상도(RES 배)로 매끈하게 ──
const COZY_STYLES = {
  card: { fill: '#fbf7ec', line: '#e3d6b6', lip: 'rgba(120,95,50,0.14)', r: 22 },
  header: { fill: '#fbf7ec', line: '#e3d6b6', lip: 'rgba(120,95,50,0.14)', r: 22 },
  strip: { fill: '#fbf7ec', line: '#e3d6b6', lip: 'rgba(120,95,50,0.14)', r: 99 },
  dark: { fill: '#fbf7ec', line: '#e3d6b6', lip: 'rgba(120,95,50,0.14)', r: 99 },
  primary: { fill: '#7a9a5c', line: '#56743f', lip: '#56743f', r: 18 },
  danger: { fill: '#c8644f', line: '#9a4636', lip: '#9a4636', r: 18 },
  gold: { fill: '#e2b54a', line: '#a8801c', lip: '#a8801c', r: 18 },
  outline: { fill: '#fbf7ec', line: '#e3d6b6', lip: 'rgba(120,95,50,0.16)', r: 18 },
  soft: { fill: '#f3ead2', line: '#e3d6b6', lip: null, r: 14 },
  ghost: { fill: '#f3ead2', line: '#e3d6b6', lip: null, r: 14 },
  // 영지 메뉴 버튼 (2026-11-21): 진한 갈색 굵은 테두리 + 아래 입술로 '누르는 버튼' 느낌을 강조
  menu: { fill: '#fbf7ec', line: '#6b4e2a', lip: '#6b4e2a', r: 16, lw: 3, lipH: 3 }
};

function cozyKey(scene, style, w, h) {
  const key = `cozy_${style}_${Math.round(w)}x${Math.round(h)}`;
  if (scene.textures.exists(key)) return key;
  const S = COZY_STYLES[style] || COZY_STYLES.card;
  const pad = SHADOW_PAD; // 픽셀 패널과 같은 여백 (그림자 자리)
  const tex = scene.textures.createCanvas(key, Math.round((w + pad * 2) * RES), Math.round((h + pad * 2) * RES));
  const ctx = tex.getContext();
  ctx.scale(RES, RES);
  const r = Math.min(S.r, h / 2, w / 2);
  const shape = (x, y, ww, hh) => {
    ctx.beginPath();
    ctx.roundRect(x, y, ww, hh, r);
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
  ctx.fillStyle = S.fill;
  shape(pad, pad, w, h);
  ctx.fill();
  const lw = S.lw || 2;
  ctx.lineWidth = lw;
  ctx.strokeStyle = S.line;
  shape(pad + lw / 2, pad + lw / 2, w - lw, h - lw);
  ctx.stroke();
  tex.refresh();
  return key;
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
export function uiText(scene, x, y, str, size = 16, color = CSS.ink, weight = '600', extra = {}) {
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
