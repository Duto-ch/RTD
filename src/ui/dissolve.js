// 화면 전환: 대각선 디졸브 (2026-11-23 사용자 요청 — 모든 화면 전환, 이전 옆으로 밀기 slideTo 대체)
// 새 장면이 왼쪽 위 → 오른쪽 아래로 대각선을 따라 밀려오며 나타난다. 경계는 바이어 디더 도트 띠로 점점이 녹아든다(픽셀 디졸브)
// 구현: 새 장면 카메라들에 기하 마스크(GeometryMask)를 씌우고, 마스크를 매 프레임 x + y < d 영역 + 디더 띠로 다시 그린다
//       (마스크는 캔버스 픽셀 좌표 — 카메라 확대와 상관없이 고정)
// 시간은 실제 시간(performance.now) — 장면 시간은 화면이 느리면 늘어져 전환이 겹쳤다(옆으로 밀기 때 겪음)
export const DISSOLVE_MS = 520;

const ease = (t) => t * t * (3 - 2 * t); // 부드럽게 시작·끝 (smoothstep)
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/** 장면 카메라 모두에 마스크 (전투 장면은 카메라 4개) */
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

/**
 * 마스크 그리기: x + y 가 띠 뒤쪽이면 모두 칠하고, 띠(폭 B) 안은 바이어 값이 진행 정도보다 작은 칸만 칠한다
 * @param {number} p 0 → 1 진행도 (1 이면 화면 전체)
 */
function drawWipe(g, W, H, p) {
  const cell = Math.max(4, Math.round(W / 160)); // 1080p 에서 12px 도트
  const B = cell * 12; // 디더 띠 폭
  const d = p * (W + H + B); // 띠 앞 끝(x + y)
  const full = d - B; // 여기까지는 다 보임
  g.clear().fillStyle(0xffffff, 1);
  if (full > 0) g.fillTriangle(0, 0, full, 0, 0, full);
  const nx = Math.ceil(W / cell);
  const ny = Math.ceil(H / cell);
  const s0 = Math.max(0, Math.floor(full / cell) - 1);
  const s1 = Math.min(nx + ny - 2, Math.ceil(d / cell));
  for (let s = s0; s <= s1; s++) {
    // 칸 (i, j) 에서 i + j = s 인 대각선 한 줄
    for (let i = Math.max(0, s - ny + 1); i <= Math.min(nx - 1, s); i++) {
      const j = s - i;
      const t = (d - (i + j + 1) * cell) / B; // 1 이상이면 다 보이는 쪽, 0 이하면 아직
      if (t <= 0) continue;
      if (t < 1 && BAYER[(j & 3) * 4 + (i & 3)] >= t) continue;
      g.fillRect(i * cell, j * cell, cell, cell);
    }
  }
}

/** 실제 시간으로 0 → 1 진행을 돌린다. owner 에 새 진행이 걸리면 앞 진행은 그 자리에서 멈춘다(나타나는 중에 닫기) */
function run(game, ms, onStep, onDone, owner) {
  const t0 = performance.now();
  const token = {};
  if (owner) owner.__fade = token;
  const step = () => {
    if (owner && owner.__fade !== token) return game.events.off('step', step);
    const p = Math.min(1, (performance.now() - t0) / ms);
    onStep(ease(p));
    if (p < 1) return;
    game.events.off('step', step);
    onDone?.();
  };
  game.events.on('step', step);
}

/** 들어오는 장면을 대각선으로 드러낸다 (create 직후 마스크, 끝나면 걷는다). 돌려주는 함수 = 지금 마스크(닫기가 이어받음) */
function revealScene(mgr, key, s, owner, onDone) {
  let m = null;
  const W = s.game.scale.width;
  const H = s.game.scale.height;
  s.wipeProgress = 0;
  s.events.once('create', () => {
    m = attachMask(s);
    drawWipe(m.g, W, H, 0);
  });
  run(
    s.game,
    DISSOLVE_MS,
    (e) => {
      s.wipeProgress = e;
      if (m && mgr.isActive(key)) drawWipe(m.g, W, H, e);
    },
    () => {
      s.wipeProgress = 1;
      if (mgr.isActive(key)) detachMask(s, m);
      m = null;
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
 * 지금 장면 → 다른 장면 (대각선 디졸브). 넘어가는 중이면 무시
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
  return true;
}

/** 위에 겹쳐 띄우는 장면(전투 중 강화 창)을 대각선으로 나타나게 — launch 직후에 부른다 */
export function dissolveIn(mgr, key) {
  const s = mgr.get(key);
  s.transitioning = true;
  s.takeMask = revealScene(mgr, key, s, s, () => {
    s.transitioning = false;
    s.takeMask = null;
  });
}

/** 겹친 장면을 같은 방향(왼쪽 위 → 오른쪽 아래)으로 지운 뒤 done. 나타나는 중이면 그 마스크를 이어받는다 */
export function dissolveOut(scene, done) {
  if (scene.closing) return false;
  scene.closing = true;
  scene.transitioning = true;
  scene.input.enabled = false;
  scene.events.once('shutdown', () => (scene.closing = false));
  const W = scene.game.scale.width;
  const H = scene.game.scale.height;
  const m = scene.takeMask?.() || attachMask(scene);
  scene.takeMask = null;
  m.mask.setInvertAlpha(true); // 칠한 곳(띠가 지나간 곳)이 사라진다
  run(
    scene.game,
    DISSOLVE_MS,
    (e) => {
      scene.wipeProgress = 1 - e;
      drawWipe(m.g, W, H, e);
    },
    () => {
      detachMask(scene, m);
      scene.transitioning = false;
      done();
    },
    scene
  );
  return true;
}
