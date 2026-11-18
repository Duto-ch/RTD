import { BASE_PALETTE, ATTR_PALETTES, MERC_SPRITES, HERO_SPRITES, ICON_SPRITES, BUILDING_SPRITES } from './sprites.js';
import { BOSS_EXTRA_PALETTE } from './monsters.js';
import { ALL_MONSTER_DESIGNS } from '../data/monsters.js';
import { GAME_W, GAME_H, PX, UI_PX, BG_PX, HUD_RECTS, FIELD_X, FIELD_Y, FIELD_SIZE, WALL, PATH_OFF, PATH_WIDTH, GRID, CELL } from '../config.js';

// 배경은 BG_PX(2) 해상도로 그린다. 화면 좌표 → 배경 아트 좌표 (가장 가까운 픽셀 경계로 맞춤)
// 무늬 크기는 3px 시절 디자인을 기준으로 K 배 (화면에서 보이는 크기는 그대로, 도트만 가늘게)
const BP = BG_PX;
const K = 3 / BP;
const kk = (v) => Math.round(v * K);
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
/**
 * 필드 배경은 레이어로 나뉜다 (2026-11-17) — 각 레이어는 텍스처 키 하나라 manifest 로 스킨을 씌워 바꿀 수 있다
 *   bg_<지역>          땅 + 장식 + 흙길 (지역마다)
 *   field_tile_light   밝은 석판 한 칸 (32x32 아트 px) — field_tile_light_b/_c 는 무늬만 다른 변형
 *   field_tile_dark    어두운 석판 한 칸 (+ _b/_c)
 *   field_wall         성벽 링 (가운데는 투명, 바닥 가장자리 그림자 포함)
 * GameScene.createFieldLayers() 가 bg → 석판 25칸 → 성벽 순서로 쌓는다
 */
const PATH_JITTER = 2.5; // 몬스터 길 가장자리 들쭉날쭉 폭 (아트 px, ±)
const WALL_RADIUS = 20;
const FLOOR_RADIUS = 8; // 바닥(석판) 네 모서리 반지름 (아트 px) — 성벽이 그만큼 안쪽을 덮는다 // 성벽 바깥 모서리 반지름 (아트 px)
/** 둥근 사각형까지의 부호 거리 (안쪽 음수). x,y,w,h = 사각형, r = 모서리 반지름 */
function sdRoundRect(px0, py0, x, y, w, h, r) {
  const qx = Math.abs(px0 - (x + w / 2)) - (w / 2 - r);
  const qy = Math.abs(py0 - (y + h / 2)) - (h / 2 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

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
  const n1 = valueNoise(rand, W, H, kk(19));
  const n2 = valueNoise(rand, W, H, kk(7));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = n1(x, y) * 0.75 + n2(x, y) * 0.25;
      px(x, y, v < 0.36 ? g1 : v > 0.64 ? g2 : g0);
    }
  }
  // 풀 포기·잔무늬: 어두운 V 자 + 밝은 끝 (땅 색만 써서 지역마다 자연스럽게)
  for (let i = 0; i < Math.round(300 * K * K); i++) {
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

  // ── 흙길 (둥근 사각 링, 2026-11-18): 가장자리가 저주파 노이즈로 들쭉날쭉 + 얼룩 2톤 + 자갈 ──
  const ox = toArt(FIELD_X - PATH_OFF - PATH_WIDTH / 2);
  const oy = toArt(FIELD_Y - PATH_OFF - PATH_WIDTH / 2);
  const os = toArt(FIELD_X + FIELD_SIZE + PATH_OFF + PATH_WIDTH / 2) - ox;
  const J = PATH_JITTER; // 가장자리 들쭉날쭉 폭(아트 px, ±)
  const jo = valueNoise(rand, W, H, kk(6));
  const sdOut = (x, y) => sdRoundRect(x + 0.5, y + 0.5, ox, oy, os, os, kk(6));
  const outside = (x, y) => sdOut(x, y) >= (jo(x, y) - 0.5) * 2 * J; // 길 바깥쪽 땅
  // 길 안쪽은 성벽 바로 밑까지 흙으로 덮는다 (2026-11-18): 구멍 = 성벽 자리(둥근 모서리 포함)보다 2도트 안쪽
  const wx0 = toArt(FIELD_X - WALL), wy0 = toArt(FIELD_Y - WALL), wsz = toArt(FIELD_X + FIELD_SIZE + WALL) - wx0;
  const hole = (x, y) => sdRoundRect(x + 0.5, y + 0.5, wx0, wy0, wsz, wsz, WALL_RADIUS) < -2;
  const inPath = (x, y) => !outside(x, y) && !hole(x, y);
  const pn = valueNoise(rand, W, H, kk(8));
  const x0 = ox - J - 1, y0 = oy - J - 1, x1 = ox + os + J + 1, y1 = oy + os + J + 1;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (!inPath(x, y)) continue;
      const v = pn(x, y);
      px(x, y, v < 0.3 ? p1 : v > 0.72 ? p2 : p0);
    }
  }
  // 자갈: 2x1 어두운 돌 + 위 밝은 점
  for (let i = 0; i < Math.round(150 * K * K); i++) {
    const x = ox + Math.floor(rand() * os);
    const y = oy + Math.floor(rand() * os);
    if (!inPath(x, y) || !inPath(x + 1, y) || !inPath(x, y - 1)) continue;
    rect(x, y, 2, 1, pEdge);
    px(x, y - 1, p2);
  }
  // 가장자리: 길과 땅이 맞닿은 줄은 진한 테두리, 바깥 위쪽 둑 아래는 그림자 한 줄, 바깥 테두리에 풀이 살짝 걸침
  const edge = (x, y) => inPath(x, y) && (!inPath(x - 1, y) || !inPath(x + 1, y) || !inPath(x, y - 1) || !inPath(x, y + 1));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (!inPath(x, y)) continue;
      const outer = outside(x - 1, y) || outside(x + 1, y) || outside(x, y - 1) || outside(x, y + 1);
      if (edge(x, y) && outer) px(x, y, rand() < 0.15 ? (y < oy + os / 2 ? g0 : g1) : pEdge); // 안쪽(성벽 밑)은 테두리 없이 흙 그대로 else if (outside(x, y - 2) && edge(x, y - 1)) px(x, y, p1); // 위쪽 둑에서 드리운 그림자
    }
  }

  tex.refresh();
}

/** 지역별 땅 장식 — 작은 픽셀 그림(그림자 포함). 길·성벽은 그 위에 덮어 그린다 */
function paintDecorations(px, rect, rand, W, H, biome) {
  const [c1, c2, c3] = biome.decoColors;
  const g1 = biome.ground[1];
  const dark = shade(g1, 0.8);
  // 보이는 땅에만 놓는다: 몬스터 길 바깥 + HUD 가 덮지 않는 곳. 길·HUD 에 가려질 자리는 건너뜀
  const ox = toArt(FIELD_X - PATH_OFF - PATH_WIDTH / 2) - Math.ceil(PATH_JITTER); // 들쭉날쭉한 길 가장자리까지 비운다
  const oy = toArt(FIELD_Y - PATH_OFF - PATH_WIDTH / 2) - Math.ceil(PATH_JITTER);
  const os = toArt(FIELD_SIZE + 2 * PATH_OFF + PATH_WIDTH) + 2 * Math.ceil(PATH_JITTER);
  // HUD 가 덮는 칸 (config HUD_RECTS: 세로는 위·아래 띠, 가로는 양옆 칸)
  const huds = HUD_RECTS.map((r) => ({ x0: toArt(r.x), y0: toArt(r.y), x1: toArt(r.x + r.w), y1: toArt(r.y + r.h) }));
  const underHud = (x, y) => huds.some((r) => x + 5 >= r.x0 && x - 3 < r.x1 && y + 9 >= r.y0 && y - 2 < r.y1);
  const visible = (x, y) => y >= 2 && y + 9 < H && x >= 1 && x + 5 < W && !underHud(x, y) && !(x + 5 >= ox && x - 3 < ox + os && y + 9 >= oy && y - 2 < oy + os);
  const spots = (n0, fn) => {
    const n = Math.round(n0 * 1.5 * ((W * H) / (182 * 320))); // 3px 밀도로 1.5배, 화면 넓이(가로 배치)에 비례
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

/** 성벽 레이어 (field_wall): 링 모양, 가운데 바닥 자리는 투명. 텍스처 (0,0) = 성벽 바깥 테두리 1px 바깥 */
function paintWall(scene) {
  // 2026-11-18: 둥근 바깥 모서리에 맞춰 다시 찍음 — 벽돌 줄·성가퀴가 모서리 곡선을 따라 돈다. 돌 색은 한 단계 밝게
  const fs = toArt(FIELD_X + FIELD_SIZE) - toArt(FIELD_X);
  const w = toArt(WALL);
  const ws = fs + 2 * w;
  const S = ws + 3;
  const tex = scene.textures.createCanvas('field_wall', S, S);
  const ctx = tex.getContext();
  const rand = rng(4242);
  const rect = (x, y, ww, hh, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, ww, hh); };
  const wx = 1;
  const wy = 1;
  const fx = wx + w;
  const fy = wy + w;
  const R = WALL_RADIUS;
  const STONE = ['#9aa0aa', '#8f949e', '#a5abb5'];
  const MORTAR = '#62666f';
  const OUTLINE = [0x2e, 0x30, 0x38];
  // 바깥 둘레(외곽선 포함) 둥근 사각형
  const X0 = wx - 1, Y0 = wy - 1, SZ = ws + 2;
  const cx = X0 + SZ / 2, cy = Y0 + SZ / 2, half = SZ / 2;
  const sd = (x, y) => sdRoundRect(x + 0.5, y + 0.5, X0, Y0, SZ, SZ, R);
  const inWall = (x, y) => sd(x, y) < 0;
  // 둘레를 따라 잰 위치 u (벽돌 칸·성가퀴 간격용): 곧은 변은 길이, 모서리는 호 길이
  const L = 2 * (half - R);
  const RM = R - 3; // 벽돌 띠 가운데쯤의 곡률 반지름 (호 길이 기준)
  const perim = (x, y) => {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
    const qx = Math.abs(dx) - (half - R), qy = Math.abs(dy) - (half - R);
    const arc = (RM * Math.PI) / 2;
    if (qx > 0 && qy > 0) {
      // 모서리: 위→오른→아래→왼 순서로 0~90° 를 호 길이로
      const a = Math.atan2(qy, qx); // 0 = 옆, π/2 = 위/아래
      if (dx > 0 && dy < 0) return L + RM * (Math.PI / 2 - a);
      if (dx > 0 && dy > 0) return 2 * L + arc + RM * a;
      if (dx < 0 && dy > 0) return 3 * L + 2 * arc + RM * (Math.PI / 2 - a);
      return 4 * L + 3 * arc + RM * a;
    }
    if (qy > qx) return dy < 0 ? dx + L / 2 : 2 * L + 2 * arc + (L / 2 - dx); // 위 · 아래 변
    return dx > 0 ? L + arc + dy + L / 2 : 3 * L + 3 * arc + (L / 2 - dy); // 오른 · 왼 변
  };
  // 빛은 왼쪽 위에서: 바깥 방향(법선)이 위·왼쪽이면 밝은 면
  const lit = (x, y) => {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
    const qx = Math.max(Math.abs(dx) - (half - R), 0) * Math.sign(dx), qy = Math.max(Math.abs(dy) - (half - R), 0) * Math.sign(dy);
    const nx = Math.abs(qx) > 0 || Math.abs(qy) > 0 ? qx : 0, ny = qy;
    const n = Math.abs(dx) - (half - R) > Math.abs(dy) - (half - R) && !(qx && qy) ? [Math.sign(dx), 0] : !(qx && qy) ? [0, Math.sign(dy)] : [nx, ny];
    return -(n[0] + n[1]) > 0.01;
  };
  const BW = kk(6);
  const BH = Math.floor(3 * K);
  const T = kk(2); // 성가퀴 띠 두께
  const P = kk(4); // 성가퀴 간격
  const stoneOf = new Map();
  const img = ctx.createImageData(S, S);
  const d = img.data;
  const set = (x, y, c, a = 255) => {
    const i = (y * S + x) * 4;
    const v = typeof c === 'string' ? [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)] : c;
    [d[i], d[i + 1], d[i + 2], d[i + 3]] = [v[0], v[1], v[2], a];
  };
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (!inWall(x, y)) {
        if (inWall(x - 1, y - 1)) set(x, y, [0, 0, 0], 71); // 오른쪽·아래 그림자 (반투명 0.28)
        continue;
      }
      if (!inWall(x - 1, y) || !inWall(x + 1, y) || !inWall(x, y - 1) || !inWall(x, y + 1)) { set(x, y, OUTLINE); continue; }
      const depth = -sd(x, y) - 1; // 외곽선 안쪽부터 0
      const u = perim(x, y);
      const bright = lit(x, y);
      if (depth < T) {
        // 성가퀴: 밝은 돌출부(merlon)와 어두운 틈이 번갈아, 바깥 줄은 하이라이트
        const on = Math.floor(u / P) % 2 === 0;
        const top = on ? (bright ? '#d4d9e0' : '#b4b9c2') : bright ? '#50535b' : '#454850';
        const sub = on ? (bright ? '#b7bcc4' : '#a0a5ae') : bright ? '#686c75' : '#5a5e67';
        set(x, y, depth < 1 ? top : sub);
        continue;
      }
      // 벽돌: 깊이로 줄, 둘레 위치로 칸 (줄마다 반 칸 어긋남)
      const row = Math.floor((depth - T) / BH);
      const ry = (depth - T) - row * BH;
      const uu = u + (row % 2) * (BW / 2);
      const col = Math.floor(uu / BW);
      const rx = uu - col * BW;
      const key = row * 10000 + col;
      if (!stoneOf.has(key)) stoneOf.set(key, STONE[Math.floor(rand() * STONE.length)]);
      const c = stoneOf.get(key);
      const mortar = ry >= BH - 1 || rx >= BW - 1;
      set(x, y, mortar ? MORTAR : ry < 1 ? shade(c, 1.12) : c);
    }
  }
  // 바닥 자리는 비우되 네 모서리는 둥글게 (2026-11-18, 반지름 FLOOR_RADIUS) — 모서리 석판이 성벽 아래로 둥글게 깎여 보인다.
  // 성벽이 바닥 가장자리에 드리우는 그림자: 위·왼쪽 진하게, 아래·오른쪽 옅게
  const FR = FLOOR_RADIUS;
  const inFloor = (x, y) => sdRoundRect(x + 0.5, y + 0.5, fx, fy, fs, fs, FR) < 0;
  for (let y = fy; y < fy + fs; y++) {
    for (let x = fx; x < fx + fs; x++) {
      if (!inFloor(x, y)) continue;
      const i = (y * S + x) * 4;
      const up = !inFloor(x, y - 1), left = !inFloor(x - 1, y), down = !inFloor(x, y + 1), right = !inFloor(x + 1, y);
      if (up || left) set(x, y, [0x3a, 0x3d, 0x45]);
      else if (down || right) set(x, y, [0x45, 0x49, 0x53]);
      else d[i + 3] = 0;
    }
  }
  ctx.putImageData(img, 0, 0);
  tex.refresh();
}

/** 석판 레이어: 밝은/어두운 석판 한 칸씩 (CELL / BG_PX = 24 아트 px). 변형 _b·_c 는 얼룩·금 위치만 다르다 */
export const TILE_KEYS = { light: ['field_tile_light', 'field_tile_light_b', 'field_tile_light_c'], dark: ['field_tile_dark', 'field_tile_dark_b', 'field_tile_dark_c'] };
function paintTiles(scene) {
  const cs = Math.round(CELL / BP);
  const TONES = {
    light: { base: '#adafb7', spot: ['#a3a5ae', '#b6b8bf'], crack: '#8e919b', hi: '#c3c5cc', hi2: '#bbbdc4', sh: '#93959f', worn: '#cfd1d6' },
    dark: { base: '#696e7a', spot: ['#656a76', '#737885'], crack: '#555a65', hi: '#858b97', hi2: '#7c8290', sh: '#5b606b', worn: '#959ba6' }
  };
  for (const [tone, keys] of Object.entries(TILE_KEYS)) {
    keys.forEach((key, vi) => {
      const T = TONES[tone];
      const tex = scene.textures.createCanvas(key, cs, cs);
      const ctx = tex.getContext();
      const tileRand = rng(77 + vi * 31 + (tone === 'dark' ? 500 : 0));
      const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };
      const rect = (x, y, ww, hh, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, ww, hh); };
      rect(0, 0, cs, cs, T.base);
      // 큰 얼룩 두 개 (같은 계열 밝은/어두운 톤)
      const sw = kk(3);
      const sh = kk(2);
      for (let k = 0; k < 2; k++) {
        const bx = 3 + Math.floor(tileRand() * (cs - sw - 7));
        const by = 3 + Math.floor(tileRand() * (cs - sh - 7));
        rect(bx, by, sw, sh, T.spot[k]);
        rect(bx + 1, by + sh, sw - 2, 1, T.spot[k]);
      }
      // 금: 짧은 대각선
      if (vi !== 1) {
        let cx = 4 + Math.floor(tileRand() * (cs - 12));
        let cy = 4 + Math.floor(tileRand() * (cs - 12));
        const dir = tileRand() < 0.5 ? 1 : -1;
        for (let k = 0; k < kk(4); k++) {
          px(cx, cy, T.crack);
          cx += dir;
          cy += k % 2;
        }
      }
      // 모서리 빛(위·왼쪽) / 그림자(아래·오른쪽) / 줄눈(위·왼쪽)
      rect(1, 1, cs - 2, 1, T.hi);
      rect(1, 1, 1, cs - 2, T.hi2);
      rect(1, cs - 2, cs - 2, 1, T.sh);
      rect(cs - 2, 1, 1, cs - 2, T.sh);
      rect(0, 0, cs, 1, '#454953');
      rect(0, 0, 1, cs, '#454953');
      px(1, 1, T.worn);
      tex.refresh();
    });
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
  paintWall(scene);
  paintTiles(scene);
}
