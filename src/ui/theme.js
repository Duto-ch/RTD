// UI 테마 — 픽셀아트 RPG 풍: 양피지 창 + 갈색 나무 테두리 + 초록 제목 탭/버튼 + 픽셀 글꼴
// 패널은 아트 해상도(화면 1/4)로 그려서 PX(4)배 확대 → 게임 월드와 같은 픽셀 격자
import { PX, FONT } from '../config.js';

export const UI_FONT = FONT; // Galmuri11 (픽셀 글꼴)

export const C = {
  primary: 0x3f9a52, // 초록 버튼·탭
  primaryDeep: 0x2c7a3e,
  bg: 0x2b1810,
  soft: 0xe7d2a0, // 슬롯(오목한 칸)
  card: 0xf2dfb0, // 양피지
  ink: 0x4a2a14, // 본문 글자 (진갈색)
  sub: 0x8a6a48,
  line: 0xc9a96a,
  green: 0x3f9a52,
  red: 0xc2453a,
  gold: 0xe0a32a
};

export const CSS = {
  primary: '#2f7a3e',
  ink: '#4a2a14',
  sub: '#8a6a48',
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
  card: { layers: ['#2b1810', '#a86b34', '#7a4a22', '#f2dfb0'], hi: '#c98a48', shade: '#e2c890', nails: '#5a3618', cut: 2 },
  header: { layers: ['#2b1810', '#a86b34', '#7a4a22', '#f2dfb0'], hi: '#c98a48', shade: '#e2c890', nails: '#5a3618', cut: 2 },
  // 버튼
  primary: { layers: ['#1e3a20', '#3f9a52'], hi: '#6ccc7c', shade: '#2c7a3e', cut: 1 },
  danger: { layers: ['#3a1210', '#c2453a'], hi: '#e8735f', shade: '#8e2a24', cut: 1 },
  gold: { layers: ['#3a2608', '#e0a32a'], hi: '#ffd36a', shade: '#a8741a', cut: 1 },
  outline: { layers: ['#2b1810', '#f2dfb0'], hi: '#fff3d0', shade: '#d6b97c', cut: 1 },
  // 슬롯 (오목): 위·왼쪽이 어둡다
  soft: { layers: ['#9a7448', '#e7d2a0'], inset: '#cdb27a', cut: 1 },
  ghost: { layers: ['#9a7448', '#e7d2a0'], inset: '#cdb27a', cut: 1 },
  // 어두운 나무 (토스트)
  dark: { layers: ['#1a0f08', '#5a3618'], hi: '#7a4e26', shade: '#43280f', cut: 1 }
};
STYLES.card_tile = STYLES.outline;

export const SHADOW_PAD = PX; // 그림자 1 아트픽셀

/** 픽셀 패널 텍스처 (아트 해상도, 그림자 1px 포함). 화면에는 PX 배로 확대해서 쓴다 */
export function panelKey(scene, style, w, h) {
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
  if (S.nails && aw > 10 && ah > 10) {
    for (const [x, y] of [[2, 2], [aw - 3, 2], [2, ah - 3], [aw - 3, ah - 3]]) px(x, y, S.nails);
  }
  tex.refresh();
  return key;
}

/** 패널 이미지 (x, y 는 패널 왼쪽 위) */
export function panel(scene, x, y, w, h, style = 'card') {
  return scene.add.image(x - SHADOW_PAD, y - SHADOW_PAD, panelKey(scene, style, w, h)).setOrigin(0).setScale(PX);
}

/** 패널 이미지 (가운데 기준) */
export function panelImage(scene, x, y, style, w, h) {
  return scene.add.image(x, y + PX / 2, panelKey(scene, style, w, h)).setScale(PX);
}

/** 초록 제목 탭 (패널 위쪽 가장자리에 걸친다). [이미지, 글자] 반환 */
export function titleTab(scene, cx, cy, label, minW = 160) {
  const t = uiText(scene, cx, cy, label, 16, CSS.white, 'bold', { stroke: '#1e3a20', strokeThickness: 4 }).setOrigin(0.5);
  const w = Math.max(minW, Math.ceil((t.width + 40) / PX) * PX);
  const img = panelImage(scene, cx, cy, 'primary', w, 36);
  scene.children.bringToTop(t); // 글자를 탭 이미지 위로
  return [img, t];
}

/** X 닫기 버튼 (픽셀) */
export function closeButton(scene, x, y, onClick) {
  const c = scene.add.container(x, y);
  const bg = scene.add.image(0, PX / 2, panelKey(scene, 'danger', 28, 28)).setScale(PX);
  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 1);
  for (let i = -2; i <= 2; i++) {
    g.fillRect(i * 3 - 1.5, i * 3 - 1.5, 3, 3);
    g.fillRect(i * 3 - 1.5, -i * 3 - 1.5, 3, 3);
  }
  c.add([bg, g]);
  c.setSize(28, 28).setInteractive({ useHandCursor: true });
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
    fontFamily: UI_FONT,
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
  monster: ['.xxxxx.', 'xxxxxxx', 'x.xxx.x', 'x..x..x', 'xxxxxxx', '.x.x.x.', '.......'],
  speed: ['x..x...', 'xx.xx..', 'xxxxxx.', 'xxxxxxx', 'xxxxxx.', 'xx.xx..', 'x..x...'],
  pause: ['xx..xx.', 'xx..xx.', 'xx..xx.', 'xx..xx.', 'xx..xx.', 'xx..xx.', 'xx..xx.'],
  play: ['x......', 'xxx....', 'xxxxx..', 'xxxxxxx', 'xxxxx..', 'xxx....', 'x......'],
  menu: ['xxxxxxx', '.......', 'xxxxxxx', '.......', 'xxxxxxx', '.......', '.......'],
  userplus: ['.xx....', 'xxxx...', '.xx..x.', '....xxx', 'xxxx.x.', 'xxxx...', 'xxxx...'],
  crown: ['x..x..x', 'xx.x.xx', 'xxxxxxx', 'xxxxxxx', 'xyxyxyx', 'xxxxxxx', '.......'],
  star: ['...x...', '..xxx..', 'xxxxxxx', '.xxxxx.', '..xxx..', '.xx.xx.', 'x.....x'],
  cross: ['xx...xx', 'xxx.xxx', '.xxxxx.', '..xxx..', '.xxxxx.', 'xxx.xxx', 'xx...xx']
};

/** 픽셀 아이콘 그리기 (s = 대략적인 크기 px) */
export function drawIcon(g, type, x, y, s, color) {
  const map = ICONS[type];
  if (!map) return;
  const b = Math.max(2, Math.round(s / 7));
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
