// UI 테마 — 보라색 그라데이션 카드 + 흰 패널 + 알약형 버튼 (모바일 금융앱 풍)
// 게임 월드(필드·유닛·몬스터)는 픽셀아트 그대로, 그 위의 UI 만 이 테마를 쓴다.
export const UI_FONT = 'Pretendard';

export const C = {
  primary: 0x6c4cf1,
  primaryDeep: 0x4f33cf,
  bg: 0xf1edff, // 화면 바탕 (연보라)
  soft: 0xe9e3ff,
  card: 0xffffff,
  ink: 0x2b2350, // 본문 글자
  sub: 0x8a84a8, // 보조 글자
  line: 0xe6e0fa,
  green: 0x2ecc8f,
  red: 0xff5c7a,
  gold: 0xffb547
};

export const CSS = {
  primary: '#6c4cf1',
  ink: '#2b2350',
  sub: '#8a84a8',
  white: '#ffffff',
  onPrimary: '#e9e3ff', // 보라 카드 위 보조 글자
  green: '#1fae76',
  red: '#ff4f6e',
  gold: '#e59a00'
};

// 흰 바탕에서 잘 읽히는 속성색
export const ATTR_CSS_DARK = { red: '#e0473a', blue: '#3b74e0', green: '#21a052' };

const STYLES = {
  primary: { fill: ['#8b6dff', '#5b3fd9'], shadow: 'rgba(91,63,217,0.38)' },
  header: { fill: ['#7d5fff', '#4f33cf'], shadow: 'rgba(79,51,207,0.35)', blobs: true },
  card: { fill: ['#ffffff', '#ffffff'], shadow: 'rgba(76,52,170,0.16)' },
  soft: { fill: ['#f5f2ff', '#ebe5ff'], border: '#ddd4fb' },
  outline: { fill: ['#ffffff', '#ffffff'], shadow: 'rgba(76,52,170,0.12)', border: '#6c4cf1', borderW: 2 },
  danger: { fill: ['#ff8aa0', '#ff4f6e'], shadow: 'rgba(255,79,110,0.32)' },
  ghost: { fill: ['rgba(255,255,255,0.24)', 'rgba(255,255,255,0.14)'] },
  dark: { fill: ['rgba(43,35,80,0.94)', 'rgba(43,35,80,0.94)'], shadow: 'rgba(0,0,0,0.2)' },
  gold: { fill: ['#ffd27a', '#ffa928'], shadow: 'rgba(255,169,40,0.35)' }
};

export const SHADOW_PAD = 16;

function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 둥근 패널 텍스처 (그림자 여백 SHADOW_PAD 포함). 같은 크기·스타일은 재사용 */
export function panelKey(scene, style, w, h, r = 20) {
  w = Math.round(w);
  h = Math.round(h);
  const key = `ui_${style}_${w}x${h}_${r}`;
  if (scene.textures.exists(key)) return key;
  const S = STYLES[style];
  const pad = SHADOW_PAD;
  const tex = scene.textures.createCanvas(key, w + pad * 2, h + pad * 2);
  const ctx = tex.getContext();
  if (S.shadow) {
    ctx.save();
    ctx.shadowColor = S.shadow;
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = '#ffffff';
    roundRectPath(ctx, pad, pad, w, h, r);
    ctx.fill();
    ctx.restore();
  }
  const grad = ctx.createLinearGradient(pad, pad, pad + w, pad + h);
  grad.addColorStop(0, S.fill[0]);
  grad.addColorStop(1, S.fill[1]);
  ctx.fillStyle = grad;
  roundRectPath(ctx, pad, pad, w, h, r);
  ctx.fill();
  if (S.blobs) {
    // 헤더 카드의 은은한 원형 장식
    ctx.save();
    roundRectPath(ctx, pad, pad, w, h, r);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.arc(pad + w * 0.88, pad + h * 0.05, h * 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pad + w * 0.62, pad + h * 1.15, h * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  if (S.border) {
    ctx.lineWidth = S.borderW || 1.5;
    ctx.strokeStyle = S.border;
    roundRectPath(ctx, pad + 0.75, pad + 0.75, w - 1.5, h - 1.5, r);
    ctx.stroke();
  }
  tex.refresh();
  return key;
}

/** 패널 이미지 (x, y 는 패널 왼쪽 위) */
export function panel(scene, x, y, w, h, style = 'card', r = 20) {
  return scene.add.image(x - SHADOW_PAD, y - SHADOW_PAD, panelKey(scene, style, w, h, r)).setOrigin(0);
}

/** 화면 전체 배경 그라데이션 텍스처 */
export function backdropKey(scene, w, h) {
  const key = `ui_backdrop_${w}x${h}`;
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#f6f3ff');
  g.addColorStop(1, '#e4dcff');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(108,76,241,0.07)';
  ctx.beginPath();
  ctx.arc(w * 0.9, h * 0.08, w * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(w * 0.05, h * 0.92, w * 0.5, 0, Math.PI * 2);
  ctx.fill();
  tex.refresh();
  return key;
}

/** UI 글자 (Pretendard) */
export function uiText(scene, x, y, str, size = 16, color = CSS.ink, weight = '600', extra = {}) {
  return scene.add.text(x, y, str, { fontFamily: UI_FONT, fontSize: `${size}px`, fontStyle: weight, color, ...extra });
}

/** 간단한 선 아이콘 */
export function drawIcon(g, type, x, y, s, color) {
  g.lineStyle(Math.max(2, s / 9), color, 1);
  g.fillStyle(color, 1);
  const h = s / 2;
  switch (type) {
    case 'clock':
      g.strokeCircle(x, y, h);
      g.lineBetween(x, y, x, y - h * 0.6);
      g.lineBetween(x, y, x + h * 0.45, y + h * 0.2);
      break;
    case 'coin':
      g.fillStyle(0xffc84a, 1).fillCircle(x, y, h);
      g.lineStyle(2, 0xe59a00, 1).strokeCircle(x, y, h * 0.6);
      break;
    case 'monster':
      g.fillCircle(x, y - h * 0.15, h * 0.75);
      g.fillRect(x - h * 0.75, y - h * 0.15, h * 1.5, h * 0.8);
      g.fillStyle(0xffffff, 1).fillCircle(x - h * 0.3, y - h * 0.2, h * 0.18).fillCircle(x + h * 0.3, y - h * 0.2, h * 0.18);
      break;
    case 'speed':
      g.fillTriangle(x - h, y - h * 0.7, x - h, y + h * 0.7, x, y);
      g.fillTriangle(x, y - h * 0.7, x, y + h * 0.7, x + h, y);
      break;
    case 'pause':
      g.fillRect(x - h * 0.7, y - h * 0.75, h * 0.5, h * 1.5);
      g.fillRect(x + h * 0.2, y - h * 0.75, h * 0.5, h * 1.5);
      break;
    case 'play':
      g.fillTriangle(x - h * 0.6, y - h * 0.8, x - h * 0.6, y + h * 0.8, x + h * 0.8, y);
      break;
    case 'menu':
      for (const dy of [-0.6, 0, 0.6]) g.fillRect(x - h * 0.8, y + dy * h - 1.5, h * 1.6, 3);
      break;
    case 'userplus':
      g.fillCircle(x - h * 0.25, y - h * 0.35, h * 0.38);
      g.fillEllipse(x - h * 0.25, y + h * 0.55, h * 1.3, h * 0.9);
      g.fillRect(x + h * 0.55, y - h * 0.15, h * 0.7, 3);
      g.fillRect(x + h * 0.9 - 1.5, y - h * 0.5, 3, h * 0.7);
      break;
    case 'crown':
      g.fillTriangle(x - h, y + h * 0.5, x - h, y - h * 0.5, x - h * 0.4, y);
      g.fillTriangle(x - h * 0.5, y + h * 0.5, x, y - h * 0.7, x + h * 0.5, y + h * 0.5);
      g.fillTriangle(x + h, y + h * 0.5, x + h, y - h * 0.5, x + h * 0.4, y);
      g.fillRect(x - h, y + h * 0.3, h * 2, h * 0.35);
      break;
  }
}

/** 어두운 배경용 색을 흰 카드 위에서 읽히게 바꾼다 */
export function onLight(color) {
  const map = {
    '#ffffff': CSS.primary,
    '#f2c14e': CSS.gold,
    '#d6a8ff': '#7b4fe0',
    '#ff6a55': CSS.red,
    '#ff5050': CSS.red,
    '#ff4dd2': '#c0279a',
    '#ff9a7a': CSS.red,
    '#9aa3b8': CSS.sub,
    '#6fd36a': '#21a052',
    '#5aa2ff': '#3b74e0'
  };
  return map[color] || color;
}
