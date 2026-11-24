// 화면 전환: 카드 뒤집기 디졸브 (2026-11-23 사용자 요청 — 모든 화면 전환, 이전 옆으로 밀기 slideTo 대체)
// 화면을 150x150(1080p 기준) 정사각형 칸으로 나누고, 왼쪽 위 → 오른쪽 아래 대각선 순서로 칸마다 카드처럼 뒤집힌다.
// 뒤집히는 축은 전환 방향(↘)에 수직인 대각선 — 칸이 ↘ 방향으로 납작해졌다가(앞면 = 지금 화면) 다시 펴지며(뒷면 = 새 화면) 나타난다.
// 구현
//  - 위 장면(들어오는 새 장면, 또는 닫히는 겹친 창)의 카메라들에 기하 마스크: 그 장면이 보일 칸·카드 모양만 칠한다
//  - 맨 위 'Wipe' 장면(캔버스 픽셀 좌표 1배)이 뒤집히는 칸의 카드 바깥(뒤 바닥)을 어둡게, 카드 면은 기울수록 어둡게 칠한다
//  - 카드 모양: 칸 중심 기준 ↘ 성분만 |cos θ| 배로 줄인 마름모 (−k·h,−k·h)·(h,−h)·(k·h,k·h)·(−h,h)
// 시간은 실제 시간(performance.now) — 장면 시간은 화면이 느리면 늘어져 전환이 겹쳤다(옆으로 밀기 때 겪음)
import Phaser from 'phaser';

export const DISSOLVE_MS = 900;
export const TILE = 150; // 1080p 화면 px 기준 칸 크기
const FLIP = 0.32; // 칸 하나가 뒤집히는 데 쓰는 몫 (전체 진행 0~1 중)
const BACK = 0x0b0a14; // 뒤집히는 동안 보이는 바닥
const ease = (t) => t * t * (3 - 2 * t);

/** 맨 위에서 바닥·그늘을 그리는 장면 (처음 쓸 때 만든다) */
class WipeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Wipe' });
  }
  create() {
    this.g = this.add.graphics();
  }
}

function wipeLayer(game) {
  const mgr = game.scene;
  if (!mgr.getScene('Wipe')) mgr.add('Wipe', WipeScene, false);
  if (!mgr.isActive('Wipe')) mgr.run('Wipe');
  mgr.bringToTop('Wipe');
  return mgr.getScene('Wipe');
}

/** 칸 격자 (캔버스 px) */
function grid(game) {
  const W = game.scale.width;
  const H = game.scale.height;
  const c = TILE * (W / 1920);
  const nx = Math.ceil(W / c);
  const ny = Math.ceil(H / c);
  return { W, H, c, nx, ny, S: nx + ny - 2 };
}

/** 칸 (i, j) 의 뒤집기 진행 0~1 (전체 진행 p) */
function tileT(G, i, j, p) {
  const start = G.S ? ((i + j) / G.S) * (1 - FLIP) : 0;
  return Math.min(1, Math.max(0, (p - start) / FLIP));
}

/** 카드 모양 (칸 중심 cx, cy · 반 크기 h · θ) */
function card(cx, cy, h, t) {
  const th = ease(t) * Math.PI;
  const k = Math.abs(Math.cos(th));
  const a = h;
  return {
    pts: [
      { x: cx - k * a, y: cy - k * a },
      { x: cx + a, y: cy - a },
      { x: cx + k * a, y: cy + k * a },
      { x: cx - a, y: cy + a },
    ],
    front: th < Math.PI / 2,
    shade: (1 - k) * 0.55,
  };
}

/**
 * 한 프레임 그리기
 * @param {object} m 위 장면 마스크 { g }
 * @param {Phaser.GameObjects.Graphics} wg 맨 위 바닥·그늘
 * @param {number} p 전체 진행
 * @param {boolean} topIsNew 위 장면이 새 화면이면 true(들어옴), 지금 화면이면 false(닫힘)
 */
function drawFrame(G, m, wg, p, topIsNew) {
  const mg = m.g;
  mg.clear().fillStyle(0xffffff, 1);
  wg?.clear();
  const h = G.c / 2;
  for (let j = 0; j < G.ny; j++) {
    for (let i = 0; i < G.nx; i++) {
      const t = tileT(G, i, j, p);
      const x = i * G.c;
      const y = j * G.c;
      if (t <= 0 || t >= 1) {
        // 다 끝난 칸은 새 화면, 아직인 칸은 지금 화면
        const showsNew = t >= 1;
        if (showsNew === topIsNew) mg.fillRect(x, y, G.c, G.c);
        continue;
      }
      const cd = card(x + h, y + h, h, t);
      // 카드 면: 앞면이면 지금 화면, 뒷면이면 새 화면
      if (!cd.front === topIsNew) mg.fillPoints(cd.pts, true);
      if (!wg) continue;
      // 카드 바깥(칸 안 빈 곳)은 바닥색 — 칸 사각형에서 카드를 뺀 두 삼각형
      const [p0, p1, p2, p3] = cd.pts;
      wg.fillStyle(BACK, 1);
      wg.fillTriangle(x, y, x + G.c, y, p0.x, p0.y);
      wg.fillTriangle(x, y, p0.x, p0.y, x, y + G.c);
      wg.fillTriangle(x + G.c, y + G.c, x + G.c, y, p2.x, p2.y);
      wg.fillTriangle(x + G.c, y + G.c, p2.x, p2.y, x, y + G.c);
      // 카드 면은 기울수록 어둡게
      if (cd.shade > 0.01) wg.fillStyle(0x000000, cd.shade).fillPoints([p0, p1, p2, p3], true);
    }
  }
}

function attachMask(scene) {
  const g = scene.make.graphics({ add: false });
  const mask = g.createGeometryMask();
  for (const c of scene.cameras?.cameras || []) c.setMask(mask, true);
  return { g, mask };
}

function detachMask(scene, m) {
  if (!m) return;
  for (const c of scene.cameras?.cameras || []) c.clearMask();
  m.mask.destroy();
  m.g.destroy();
}

/** 실제 시간으로 0 → 1 진행을 돌린다. owner 에 새 진행이 걸리면 앞 진행은 그 자리에서 멈춘다(나타나는 중에 닫기) */
function run(game, ms, onStep, onDone, owner) {
  const t0 = performance.now();
  const token = {};
  if (owner) owner.__fade = token;
  const step = () => {
    if (owner && owner.__fade !== token) return game.events.off('step', step);
    const p = Math.min(1, (performance.now() - t0) / ms);
    onStep(p);
    if (p < 1) return;
    game.events.off('step', step);
    onDone?.();
  };
  game.events.on('step', step);
}

/** 들어오는 장면을 칸 뒤집기로 드러낸다. 돌려주는 함수 = 지금 마스크(닫기가 이어받음) */
function revealScene(mgr, key, s, owner, onDone) {
  let m = null;
  const game = s.game;
  const G = grid(game);
  const wipe = wipeLayer(game);
  s.wipeProgress = 0;
  s.events.once('create', () => {
    m = attachMask(s);
    drawFrame(G, m, null, 0, true);
    mgr.bringToTop('Wipe');
  });
  run(
    game,
    DISSOLVE_MS,
    (p) => {
      s.wipeProgress = p;
      if (m && mgr.isActive(key)) drawFrame(G, m, wipe.g, p, true);
    },
    () => {
      s.wipeProgress = 1;
      if (mgr.isActive(key)) detachMask(s, m);
      m = null;
      wipe.g?.clear();
      mgr.stop('Wipe');
      onDone();
    },
    owner
  );
  return () => {
    const cur = m;
    m = null;
    return cur;
  };
}

/**
 * 지금 장면 → 다른 장면 (카드 뒤집기 디졸브). 넘어가는 중이면 무시
 * @param {Phaser.Scene} from
 * @param {string} key
 * @param {object} [data]
 * @returns {boolean} 시작했으면 true
 */
export function dissolveTo(from, key, data) {
  if (from.transitioning) return false;
  const mgr = from.scene;
  const target = mgr.get(key);
  if (!target || mgr.isActive(key) || mgr.isSleeping(key) || mgr.isPaused(key)) {
    mgr.start(key, data);
    return true;
  }
  from.transitioning = true;
  target.transitioning = true; // 들어오는 동안 그 장면에서 또 전환하지 못하게
  from.input.enabled = false;
  from.events.once('shutdown', () => (from.transitioning = false));
  revealScene(mgr, key, target, null, () => {
    target.transitioning = false;
    mgr.stop(from.scene.key);
  });
  mgr.launch(key, data);
  mgr.bringToTop(key);
  mgr.bringToTop('Wipe');
  return true;
}

/** 위에 겹쳐 띄우는 장면(전투 중 강화 창)을 칸 뒤집기로 나타나게 — launch 직후에 부른다 */
export function dissolveIn(mgr, key) {
  const s = mgr.get(key);
  s.transitioning = true;
  s.takeMask = revealScene(mgr, key, s, s, () => {
    s.transitioning = false;
    s.takeMask = null;
  });
  mgr.bringToTop('Wipe');
}

/** 겹친 장면을 같은 방향(↘)으로 칸마다 뒤집어 아래 장면을 드러낸 뒤 done. 나타나는 중이면 그 마스크를 이어받는다 */
export function dissolveOut(scene, done) {
  if (scene.closing) return false;
  scene.closing = true;
  scene.transitioning = true;
  scene.input.enabled = false;
  scene.events.once('shutdown', () => (scene.closing = false));
  const game = scene.game;
  const G = grid(game);
  const wipe = wipeLayer(game);
  const m = scene.takeMask?.() || attachMask(scene);
  scene.takeMask = null;
  run(
    game,
    DISSOLVE_MS,
    (p) => {
      scene.wipeProgress = 1 - p;
      drawFrame(G, m, wipe.g, p, false);
    },
    () => {
      detachMask(scene, m);
      wipe.g?.clear();
      game.scene.stop('Wipe');
      scene.transitioning = false;
      done();
    },
    scene
  );
  return true;
}
