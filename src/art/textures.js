import { BASE_PALETTE, ATTR_PALETTES, MERC_SPRITES, HERO_SPRITES, ICON_SPRITES, BUILDING_SPRITES } from './sprites.js';
import { BOSS_EXTRA_PALETTE } from './monsters.js';
import { ALL_MONSTER_DESIGNS } from '../data/monsters.js';
import { GAME_W, GAME_H, PX, UI_PX, FIELD_X, FIELD_Y, FIELD_SIZE, WALL, PATH_OFF, PATH_WIDTH, GRID, CELL } from '../config.js';

// 배경은 UI_PX(3) 해상도로 그린다. 화면 좌표 → 배경 아트 좌표 (가장 가까운 픽셀 경계로 맞춤)
const BP = UI_PX;
const toArt = (v) => Math.round(v / BP);
import { RELICS } from '../data/relics.js';
import { HEROES } from '../data/heroes.js';
import { BIOMES } from '../data/biomes.js';

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

/** 저주파 값 노이즈 (0~1): 땅·길의 큰 얼룩을 만든다. 한 칸에 하나씩 찍는 잡티 대신 덩어리로 묶는다 */
function valueNoise(rand, W, H, cell) {
  const gw = Math.ceil(W / cell) + 2;
  const gh = Math.ceil(H / cell) + 2;
  const g = Array.from({ length: gw * gh }, () => rand());
  const at = (x, y) => g[y * gw + x];
  const s = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = x / cell;
    const fy = y / cell;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const tx = s(fx - ix);
    const ty = s(fy - iy);
    const a = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * tx;
    const b = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * tx;
    return a + (b - a) * ty;
  };
}

/** 색 밝기 조절 (#rrggbb, k > 1 밝게) */
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * 지역(biome)별 배경 — 플랫 픽셀 스타일 (2026-11-15 개편, 같은 날 3px 밀도로 재작업)
 * 땅·길은 한 픽셀씩 흩뿌린 잡티 대신 큰 얼룩(2~3톤) + 손으로 찍은 듯한 작은 무늬(풀 포기·돌멩이)로,
 * 성벽은 벽돌마다 위 밝은 줄·아래 그림자, 바깥엔 성가퀴, 바닥은 모서리가 빛나는 석판 + 금 몇 줄.
 */
function paintBackground(scene, biome) {
  const W = Math.ceil(GAME_W / BP);
  const H = Math.ceil(GAME_H / BP);
  const tex = scene.textures.createCanvas(`bg_${biome.id}`, W, H);
  const ctx = tex.getContext();
  const rand = rng(1234 + biome.id.length * 97 + biome.id.charCodeAt(0));
  const [g0, g1, g2] = biome.ground;
  const [p0, p1, p2, pEdge] = biome.path;
  const px = (x, y, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  };
  const rect = (x, y, w, h, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };

  // ── 땅: 큰 얼룩 3톤 + 작은 무늬 ──
  const n1 = valueNoise(rand, W, H, 19);
  const n2 = valueNoise(rand, W, H, 7);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = n1(x, y) * 0.75 + n2(x, y) * 0.25;
      px(x, y, v < 0.36 ? g1 : v > 0.64 ? g2 : g0);
    }
  }
  // 풀 포기·잔무늬: 어두운 V 자 + 밝은 끝 (땅 색만 써서 지역마다 자연스럽게)
  for (let i = 0; i < 300; i++) {
    const x = Math.floor(rand() * W);
    const y = Math.floor(rand() * H);
    px(x, y, g1);
    px(x + 2, y, g1);
    px(x + 1, y + 1, g1);
    if (rand() < 0.5) px(x + 1, y - 1, g2);
  }
  paintDecorations(px, rect, rand, W, H, biome);

  const fx = toArt(FIELD_X);
  const fy = toArt(FIELD_Y);
  const fs = toArt(FIELD_X + FIELD_SIZE) - fx;

  // ── 흙길 (사각 링): 얼룩 2톤 + 자갈, 바깥 모서리는 둥글게 ──
  const ox = toArt(FIELD_X - PATH_OFF - PATH_WIDTH / 2);
  const oy = toArt(FIELD_Y - PATH_OFF - PATH_WIDTH / 2);
  const os = toArt(FIELD_X + FIELD_SIZE + PATH_OFF + PATH_WIDTH / 2) - ox;
  const ix = toArt(FIELD_X - PATH_OFF + PATH_WIDTH / 2);
  const iy = toArt(FIELD_Y - PATH_OFF + PATH_WIDTH / 2);
  const is = toArt(FIELD_X + FIELD_SIZE + PATH_OFF - PATH_WIDTH / 2) - ix;
  const inPath = (x, y) => x >= ox && x < ox + os && y >= oy && y < oy + os && !(x >= ix && x < ix + is && y >= iy && y < iy + is);
  const corner = (x, y) => (x === ox || x === ox + os - 1) && (y === oy || y === oy + os - 1);
  const pn = valueNoise(rand, W, H, 8);
  for (let y = oy; y < oy + os; y++) {
    for (let x = ox; x < ox + os; x++) {
      if (!inPath(x, y) || corner(x, y)) continue;
      const v = pn(x, y);
      px(x, y, v < 0.3 ? p1 : v > 0.72 ? p2 : p0);
    }
  }
  // 자갈: 2x1 어두운 돌 + 위 밝은 점
  for (let i = 0; i < 150; i++) {
    const x = ox + Math.floor(rand() * os);
    const y = oy + Math.floor(rand() * os);
    if (!inPath(x, y) || !inPath(x + 1, y) || !inPath(x, y - 1)) continue;
    rect(x, y, 2, 1, pEdge);
    px(x, y - 1, p2);
  }
  // 가장자리: 바깥은 진한 테두리 + 그 안쪽 한 줄 그림자, 바깥 테두리에 풀이 살짝 걸침
  for (let t = 1; t < os - 1; t++) {
    for (const [x, y] of [[ox + t, oy], [ox + t, oy + os - 1], [ox, oy + t], [ox + os - 1, oy + t]]) px(x, y, pEdge);
  }
  for (let t = 1; t < is + 1; t++) {
    for (const [x, y] of [[ix - 1 + t, iy - 1], [ix - 1 + t, iy + is], [ix - 1, iy - 1 + t], [ix + is, iy - 1 + t]]) px(x, y, pEdge);
  }
  for (let t = 2; t < os - 2; t++) {
    if (rand() < 0.18) px(ox + t, oy, g0);
    if (rand() < 0.18) px(ox + t, oy + os - 1, g1);
    if (rand() < 0.18) px(ox, oy + t, g0);
    if (rand() < 0.18) px(ox + os - 1, oy + t, g1);
  }
  rect(ox + 1, oy + 1, os - 2, 1, p1); // 위쪽 안 그림자 (바깥 둑에서 드리움)

  // ── 성벽 ──
  const w = toArt(WALL);
  const wx = fx - w;
  const wy = fy - w;
  const ws = fs + 2 * w;
  const STONE = ['#8a8f99', '#7f848e', '#949aa4'];
  // 벽 그림자: 오른쪽·아래로 1px 길 위에 드리움
  rect(wx + 1, wy + ws, ws, 1, shade(p1, 0.7));
  rect(wx + ws, wy + 1, 1, ws, shade(p1, 0.7));
  rect(wx - 1, wy - 1, ws + 2, ws + 2, '#2a2c33');
  // 벽돌: 6x3 (줄마다 반 칸 어긋남) — 위 밝은 줄 / 가운데 / 아래 줄눈
  for (let by = 0; by < ws; by += 3) {
    const row = by / 3;
    for (let bx = -3 * (row % 2); bx < ws; bx += 6) {
      const c = STONE[Math.floor(rand() * STONE.length)];
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 6; x++) {
          const X = wx + bx + x;
          const Y = wy + by + y;
          if (X < wx || X >= wx + ws || Y >= wy + ws) continue;
          if (X >= fx && X < fx + fs && Y >= fy && Y < fy + fs) continue;
          const mortar = y === 2 || x === 5;
          px(X, Y, mortar ? '#555963' : y === 0 ? shade(c, 1.12) : c);
        }
      }
    }
  }
  // 성가퀴: 바깥 테두리 2px 띠에 3칸 간격 요철 (위 밝음·옆 그림자)
  for (let i = 0; i < ws; i++) {
    const on = Math.floor(i / 4) % 2 === 0;
    const top = on ? '#c3c8d0' : '#44474f';
    const sub = on ? '#a7acb5' : '#5b5f68';
    px(wx + i, wy, top);
    px(wx + i, wy + 1, sub);
    px(wx + i, wy + ws - 1, on ? '#a7acb5' : '#3a3d45');
    px(wx, wy + i, top);
    px(wx + 1, wy + i, sub);
    px(wx + ws - 1, wy + i, on ? '#a7acb5' : '#3a3d45');
  }

  // ── 성벽 위 바닥: 5x5 석판 (모서리 빛·그림자, 금 몇 줄, 이끼 약간) ──
  const tileRand = rng(77);
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const sx = toArt(FIELD_X + gx * CELL);
      const sy = toArt(FIELD_Y + gy * CELL);
      const cs = toArt(FIELD_X + (gx + 1) * CELL) - sx; // 21 또는 22 (64/3 이 나누어떨어지지 않음)
      const base = (gx + gy) % 2 === 0 ? '#6e7380' : '#696e7a';
      rect(sx, sy, cs, cs, base);
      // 석판 안 큰 얼룩 한두 개 (같은 계열 밝은/어두운 톤)
      for (let k = 0; k < 2; k++) {
        const bx = sx + 2 + Math.floor(tileRand() * (cs - 7));
        const by = sy + 2 + Math.floor(tileRand() * (cs - 6));
        const c = k ? '#737885' : '#656a76';
        rect(bx, by, 3, 2, c);
        rect(bx + 1, by + 2, 2, 1, c);
      }
      // 금: 짧은 대각선 3~4px
      if (tileRand() < 0.55) {
        let cx = sx + 3 + Math.floor(tileRand() * (cs - 8));
        let cy = sy + 3 + Math.floor(tileRand() * (cs - 8));
        const dir = tileRand() < 0.5 ? 1 : -1;
        for (let k = 0; k < 4; k++) {
          px(cx, cy, '#555a65');
          cx += dir;
          cy += k % 2;
        }
      }
      // 모서리 빛(위·왼쪽) / 그림자(아래·오른쪽) / 줄눈
      rect(sx + 1, sy + 1, cs - 2, 1, '#858b97');
      rect(sx + 1, sy + 1, 1, cs - 2, '#7c8290');
      rect(sx + 1, sy + cs - 2, cs - 2, 1, '#5b606b');
      rect(sx + cs - 2, sy + 1, 1, cs - 2, '#5b606b');
      rect(sx, sy, cs, 1, '#454953');
      rect(sx, sy, 1, cs, '#454953');
      // 귀퉁이 닳음
      px(sx + 1, sy + 1, '#959ba6');
    }
  }
  // 성벽이 바닥 위쪽·왼쪽에 드리우는 그림자 1px
  rect(fx, fy, fs, 1, '#3a3d45');
  rect(fx, fy, 1, fs, '#3a3d45');
  rect(fx, fy + fs - 1, fs, 1, '#454953');
  rect(fx + fs - 1, fy, 1, fs, '#454953');

  tex.refresh();
}

/** 지역별 땅 장식 — 작은 픽셀 그림(그림자 포함). 길·성벽은 그 위에 덮어 그린다 */
function paintDecorations(px, rect, rand, W, H, biome) {
  const [c1, c2, c3] = biome.decoColors;
  const g1 = biome.ground[1];
  const dark = shade(g1, 0.8);
  // 보이는 땅에만 놓는다: 몬스터 길 바깥 + 상단 HUD(y 180)와 하단 패널(y 776) 사이. 길·HUD 에 가려질 자리는 건너뜀
  const ox = toArt(FIELD_X - PATH_OFF - PATH_WIDTH / 2);
  const oy = toArt(FIELD_Y - PATH_OFF - PATH_WIDTH / 2);
  const os = toArt(FIELD_SIZE + 2 * PATH_OFF + PATH_WIDTH);
  const top = toArt(180);
  const bottom = toArt(776);
  const visible = (x, y) => y - 2 >= top && y + 9 <= bottom && x >= 1 && x + 5 < W && !(x + 5 >= ox && x - 3 < ox + os && y + 9 >= oy && y - 2 < oy + os);
  const spots = (n0, fn) => {
    const n = Math.round(n0 * 1.5); // 3px 밀도: 같은 땅에 픽셀이 1.8배 → 장식을 조금 더 촘촘히
    let placed = 0;
    for (let tries = 0; placed < n && tries < n * 60; tries++) {
      const x = Math.floor(rand() * W);
      const y = Math.floor(rand() * H);
      if (!visible(x, y)) continue;
      fn(x, y, rand());
      placed++;
    }
  };
  const rock = (x, y) => {
    rect(x, y + 2, 4, 1, dark); // 그림자
    rect(x, y, 4, 2, '#8a8a84');
    rect(x + 1, y - 1, 2, 1, '#8a8a84');
    rect(x + 1, y - 1, 1, 1, '#b4b4ac');
    px(x, y, '#b4b4ac');
    px(x + 3, y + 1, '#6a6a64');
  };
  switch (biome.deco) {
    case 'flowers':
      // 꽃: 십자 꽃잎 + 가운데 노랑 + 줄기
      spots(26, (x, y, r) => {
        const pet = r < 0.45 ? c2 : r < 0.8 ? c3 : '#8ab4ff';
        px(x, y + 2, dark);
        px(x, y - 1, pet);
        px(x - 1, y, pet);
        px(x + 1, y, pet);
        px(x, y + 1, pet);
        px(x, y, c1);
      });
      spots(4, rock);
      break;
    case 'cactus':
      // 선인장: 2px 몸통 + 양팔 + 밝은 줄 + 그림자
      spots(7, (x, y) => {
        rect(x + 1, y + 6, 3, 1, dark);
        rect(x, y, 2, 6, c1);
        rect(x, y, 1, 6, shade(c1, 1.25));
        rect(x - 2, y + 2, 2, 1, c1);
        rect(x - 2, y + 1, 1, 1, c1);
        rect(x + 2, y + 3, 2, 1, c2);
        rect(x + 3, y + 2, 1, 1, c2);
      });
      spots(5, rock);
      break;
    case 'leaves':
      // 낙엽 더미: 3~5장 겹친 덩어리
      spots(24, (x, y, r) => {
        const cs = [c1, c2, c3];
        for (let k = 0; k < 4; k++) {
          const c = cs[Math.floor(rand() * 3)];
          const dx = Math.floor(rand() * 4) - 1;
          const dy = Math.floor(rand() * 3) - 1;
          rect(x + dx, y + dy, 2, 1, c);
        }
        if (r < 0.3) px(x + 1, y + 2, dark);
      });
      break;
    case 'lava':
      // 용암 균열: 어두운 테두리 안에 밝은 줄
      spots(7, (x, y) => {
        let cx = x;
        for (let i = 0; i < 7; i++) {
          px(cx - 1, y + i, c3);
          px(cx, y + i, i % 3 === 0 ? c2 : c1);
          px(cx + 1, y + i, c3);
          cx += Math.floor(rand() * 3) - 1;
        }
      });
      spots(5, rock);
      break;
    case 'pines':
      // 소나무: 3단 삼각형 + 눈 덮인 끝 + 줄기 + 그림자
      spots(7, (x, y) => {
        rect(x - 1, y + 8, 5, 1, '#b9c6d6');
        rect(x, y + 6, 1, 2, '#6a4a2a');
        rect(x - 1, y + 1, 3, 1, c1);
        rect(x - 2, y + 3, 5, 1, c1);
        rect(x - 3, y + 5, 7, 1, c2);
        rect(x - 1, y + 2, 3, 1, c2);
        rect(x - 2, y + 4, 5, 1, c2);
        px(x, y, c3);
        px(x - 1, y + 1, c3);
        px(x - 2, y + 3, c3);
        px(x - 3, y + 5, c3);
      });
      break;
    case 'puddles':
      // 물웅덩이(타원 + 반사광) + 갈대
      spots(7, (x, y) => {
        rect(x + 1, y, 4, 1, c1);
        rect(x, y + 1, 6, 1, c1);
        rect(x + 1, y + 2, 4, 1, c1);
        rect(x + 1, y + 1, 2, 1, c2);
      });
      spots(14, (x, y) => {
        rect(x, y, 1, 3, c3);
        px(x + 1, y + 1, c3);
        px(x, y - 1, '#6a5a32');
      });
      break;
    case 'crystals':
      // 수정: 왼쪽 밝은 면 / 오른쪽 어두운 면 + 꼭대기 반짝
      spots(10, (x, y, r) => {
        const c = r < 0.5 ? c1 : c2;
        rect(x - 1, y + 5, 4, 1, dark);
        rect(x, y + 1, 1, 4, shade(c, 1.15));
        rect(x + 1, y + 1, 1, 4, shade(c, 0.75));
        px(x, y, c3);
        rect(x + 2, y + 3, 1, 2, shade(c, 0.75));
      });
      break;
    case 'tombs':
      // 묘비: 둥근 윗면 + 십자 새김 + 그림자
      spots(7, (x, y) => {
        rect(x, y + 5, 5, 1, dark);
        rect(x + 1, y, 3, 1, c1);
        rect(x, y + 1, 5, 4, c1);
        rect(x + 4, y + 1, 1, 4, c2);
        px(x + 2, y + 1, c2);
        rect(x + 1, y + 2, 3, 1, c2);
        px(x + 2, y + 3, c2);
      });
      spots(14, (x, y) => px(x, y, c3));
      break;
    case 'clouds':
      // 구름: 둥근 덩어리 + 아래 그림자 띠
      spots(6, (x, y) => {
        rect(x + 2, y - 1, 3, 1, c1);
        rect(x + 1, y, 6, 1, c1);
        rect(x, y + 1, 8, 1, c1);
        rect(x, y + 2, 8, 1, c2);
        rect(x + 1, y + 3, 6, 1, shade(c2, 0.9));
      });
      spots(16, (x, y) => {
        px(x, y, c3);
        px(x + 1, y + 1, c3);
      });
      break;
    case 'stars':
      // 별: 큰 십자 별 + 작은 점별
      spots(14, (x, y, r) => {
        const c = r < 0.5 ? c1 : c3;
        px(x, y, c2);
        px(x - 1, y, c);
        px(x + 1, y, c);
        px(x, y - 1, c);
        px(x, y + 1, c);
      });
      spots(60, (x, y, r) => px(x, y, r < 0.5 ? c1 : c2));
      break;
  }
}

export function generateTextures(scene) {
  // 용병: 15명 개별 디자인 (속성색 + 용병 전용 색)
  for (const [key, spr] of Object.entries(MERC_SPRITES)) {
    const attr = key.split('_')[1];
    paintMap(scene, `merc_${key}`, spr.rows, { ...BASE_PALETTE, ...ATTR_PALETTES[attr], ...spr.palette });
  }
  // 영웅: 9명 개별 디자인 (속성색 + 영웅 전용 색)
  for (const [attr, list] of Object.entries(HEROES)) {
    for (const h of list) {
      const spr = HERO_SPRITES[h.id];
      paintMap(scene, `hero_${h.id}`, spr.rows, { ...BASE_PALETTE, ...ATTR_PALETTES[attr], ...spr.palette });
    }
  }
  // 몬스터: 종류 × 속성
  // 몬스터: 디자인 40종 × 속성
  for (const d of ALL_MONSTER_DESIGNS) {
    for (const attr of ATTRS) {
      paintMap(scene, `mon_${d.id}_${attr}`, d.rows, { ...BASE_PALETTE, ...BOSS_EXTRA_PALETTE, ...ATTR_PALETTES[attr] });
    }
  }
  paintMap(scene, 'bld_tower', BUILDING_SPRITES.tower.rows, { ...BASE_PALETTE, ...BUILDING_SPRITES.tower.palette });
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

  for (const b of BIOMES) paintBackground(scene, b);
}
