import { BASE_PALETTE, ATTR_PALETTES, MERC_SPRITES, HERO_SPRITES, MONSTER_SPRITES, ICON_SPRITES } from './sprites.js';
import { GAME_W, GAME_H, PX, FIELD_X, FIELD_Y, FIELD_SIZE, WALL, PATH_OFF, PATH_WIDTH, GRID } from '../config.js';
import { RELICS } from '../data/relics.js';
import { HEROES } from '../data/heroes.js';

const ATTRS = ['red', 'blue', 'green'];

function paintMap(scene, key, rows, palette) {
  const h = rows.length;
  const w = rows[0].length;
  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = palette[rows[y][x]];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  tex.refresh();
}

// 재현 가능한 의사난수 (배경이 매번 같게)
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paintBackground(scene) {
  const W = GAME_W / PX;
  const H = GAME_H / PX;
  const tex = scene.textures.createCanvas('background', W, H);
  const ctx = tex.getContext();
  const rand = rng(1234);
  const px = (x, y, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  };
  const rect = (x, y, w, h, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };

  // 잔디
  rect(0, 0, W, H, '#3d7a3a');
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const r = rand();
      if (r < 0.12) px(x, y, '#356b33');
      else if (r < 0.2) px(x, y, '#4a8a44');
      else if (r < 0.205) px(x, y, '#e8d86a');
    }
  }

  const fx = FIELD_X / PX;
  const fy = FIELD_Y / PX;
  const fs = FIELD_SIZE / PX;
  const off = PATH_OFF / PX;
  const half = PATH_WIDTH / PX / 2;

  // 흙길 (사각 링)
  const ox = fx - off - half;
  const oy = fy - off - half;
  const os = fs + 2 * (off + half);
  const ix = fx - off + half;
  const iy = fy - off + half;
  const is = fs + 2 * (off - half);
  for (let y = oy; y < oy + os; y++) {
    for (let x = ox; x < ox + os; x++) {
      if (x >= ix && x < ix + is && y >= iy && y < iy + is) continue;
      const r = rand();
      px(x, y, r < 0.15 ? '#7a5c3c' : r < 0.22 ? '#a3825a' : '#8d6c48');
    }
  }
  // 길 가장자리
  ctx.strokeStyle = '#5e4630';
  ctx.lineWidth = 1;
  ctx.strokeRect(ox + 0.5, oy + 0.5, os - 1, os - 1);
  ctx.strokeRect(ix - 0.5, iy - 0.5, is + 1, is + 1);

  // 성벽
  const w = WALL / PX;
  const wx = fx - w;
  const wy = fy - w;
  const ws = fs + 2 * w;
  rect(wx - 1, wy - 1, ws + 2, ws + 2, '#2a2c33'); // 그림자/외곽
  rect(wx, wy, ws, ws, '#8a8f99');
  // 벽돌 패턴
  for (let y = wy; y < wy + ws; y++) {
    for (let x = wx; x < wx + ws; x++) {
      const inner = x >= fx && x < fx + fs && y >= fy && y < fy + fs;
      if (inner) continue;
      const row = Math.floor((y - wy) / 3);
      const mortarY = (y - wy) % 3 === 2;
      const mortarX = (x - wx + (row % 2) * 3) % 6 === 5;
      if (mortarY || mortarX) px(x, y, '#5b5f68');
      else if (rand() < 0.15) px(x, y, '#9da2ab');
    }
  }
  // 성가퀴 (바깥 테두리 요철)
  for (let i = 0; i < ws; i++) {
    const on = Math.floor(i / 3) % 2 === 0;
    const c = on ? '#b4b9c2' : '#4a4d55';
    px(wx + i, wy, c);
    px(wx + i, wy + ws - 1, c);
    px(wx, wy + i, c);
    px(wx + ws - 1, wy + i, c);
  }

  // 성벽 위 바닥 (5x5 석판)
  const cs = fs / GRID;
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const sx = fx + gx * cs;
      const sy = fy + gy * cs;
      const base = (gx + gy) % 2 === 0 ? '#6e7380' : '#676c78';
      rect(sx, sy, cs, cs, base);
      for (let y = 1; y < cs - 1; y++) {
        for (let x = 1; x < cs - 1; x++) {
          if (rand() < 0.08) px(sx + x, sy + y, '#5d626d');
        }
      }
      rect(sx, sy, cs, 1, '#7f8592');
      rect(sx, sy, 1, cs, '#7f8592');
      rect(sx, sy + cs - 1, cs, 1, '#4b4f59');
      rect(sx + cs - 1, sy, 1, cs, '#4b4f59');
    }
  }
  // 안쪽 테두리 그림자
  ctx.strokeStyle = '#3a3d45';
  ctx.strokeRect(fx - 0.5, fy - 0.5, fs + 1, fs + 1);

  tex.refresh();
}

export function generateTextures(scene) {
  // 용병: 클래스 × 속성
  for (const [cls, rows] of Object.entries(MERC_SPRITES)) {
    for (const attr of ATTRS) {
      paintMap(scene, `merc_${cls}_${attr}`, rows, { ...BASE_PALETTE, ...ATTR_PALETTES[attr] });
    }
  }
  // 영웅: 9명 개별 디자인 (속성색 + 영웅 전용 색)
  for (const [attr, list] of Object.entries(HEROES)) {
    for (const h of list) {
      const spr = HERO_SPRITES[h.id];
      paintMap(scene, `hero_${h.id}`, spr.rows, { ...BASE_PALETTE, ...ATTR_PALETTES[attr], ...spr.palette });
    }
  }
  // 몬스터: 종류 × 속성
  for (const [kind, rows] of Object.entries(MONSTER_SPRITES)) {
    for (const attr of ATTRS) {
      paintMap(scene, `mon_${kind}_${attr}`, rows, { ...BASE_PALETTE, ...ATTR_PALETTES[attr] });
    }
  }
  paintMap(scene, 'icon_coin', ICON_SPRITES.coin, BASE_PALETTE);
  paintMap(scene, 'icon_skull', ICON_SPRITES.skull, BASE_PALETTE);
  for (const relic of RELICS) {
    paintMap(scene, `relic_${relic.id}`, ICON_SPRITES.relic, { ...BASE_PALETTE, ...relic.palette });
  }

  // 투사체 (속성별 3x3)
  for (const attr of ATTRS) {
    const p = ATTR_PALETTES[attr];
    paintMap(scene, `proj_${attr}`, ['.L.', 'LwL', '.L.'], { w: '#ffffff', L: p.L });
  }
  // 1px 흰색 (파티클/틴트용)
  paintMap(scene, 'pixel', ['w'], { w: '#ffffff' });

  // ── 이펙트용 텍스처 ──
  const W = { w: '#ffffff' };
  paintMap(scene, 'p_spark', ['.w.', 'www', '.w.'], W);
  paintMap(scene, 'p_ember', ['w', 'w'], W);
  paintMap(scene, 'p_shard', ['.w.', 'www', 'www', '.w.'], W);
  paintMap(scene, 'p_leaf', ['.ww', 'www', 'ww.'], W);
  paintMap(scene, 'p_star', ['..w..', '..w..', 'wwwww', '..w..', '..w..'], W);
  for (const attr of ATTRS) {
    const pal = { ...BASE_PALETTE, ...ATTR_PALETTES[attr] };
    paintMap(scene, `arrow_${attr}`, ['L......k.', '.Lbbbbbwk', 'L......k.'], pal);
    paintMap(scene, `orb_${attr}`, ['.LL.', 'LwwL', 'LwwL', '.LL.'], pal);
    paintMap(scene, `dagger_${attr}`, ['.....', 'bAwww', '.....'], pal);
    paintMap(scene, `rune_${attr}`, ['..LLL..', '.L...L.', 'L..w..L', 'L.www.L', 'L..w..L', '.L...L.', '..LLL..'], pal);
  }
  paintMap(scene, 'arrow_gold', ['y......k.', '.ybbbbbwk', 'y......k.'], BASE_PALETTE);

  paintBackground(scene);
}
