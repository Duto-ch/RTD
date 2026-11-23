// 화면 전환: 디졸브 (2026-11-23 사용자 요청 — 모든 화면 전환을 디졸브로, 이전 옆으로 밀기 slideTo 대체)
// 새 장면을 위에 띄워 그 장면 카메라들의 투명도를 0 → 1 로 올리고(아래는 지금 장면 그대로), 끝나면 지금 장면을 멈춘다(scene.start 와 같음)
// 시간은 실제 시간(performance.now) — 장면 시간은 화면이 느리면 늘어져 전환이 겹쳤다(옆으로 밀기 때 겪음)
export const DISSOLVE_MS = 400;

const ease = (t) => t * t * (3 - 2 * t); // 부드럽게 시작·끝 (smoothstep)

/** 장면의 모든 카메라 투명도 (전투 장면은 카메라 4개) */
function setSceneAlpha(scene, a) {
  for (const c of scene.cameras?.cameras || []) c.setAlpha(a);
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

/**
 * 지금 장면 → 다른 장면 (디졸브). 넘어가는 중이면 무시
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
  // 새 장면은 create() 직후(첫 그림 전) 투명하게
  target.events.once('create', () => setSceneAlpha(target, 0));
  mgr.launch(key, data);
  mgr.bringToTop(key);
  run(
    from.game,
    DISSOLVE_MS,
    (e) => mgr.isActive(key) && setSceneAlpha(target, e),
    () => {
      if (mgr.isActive(key)) setSceneAlpha(target, 1);
      target.transitioning = false;
      mgr.stop(from.scene.key);
    }
  );
  return true;
}

/** 위에 겹쳐 띄우는 장면(전투 중 강화 창)을 서서히 나타나게 — launch 직후에 부른다 */
export function dissolveIn(mgr, key) {
  const s = mgr.get(key);
  s.transitioning = true;
  s.events.once('create', () => setSceneAlpha(s, 0));
  run(
    s.game,
    DISSOLVE_MS,
    (e) => mgr.isActive(key) && setSceneAlpha(s, e),
    () => {
      if (mgr.isActive(key)) setSceneAlpha(s, 1);
      s.transitioning = false;
    },
    s
  );
}

/** 겹친 장면을 서서히 지운 뒤 done (멈추기·아래 장면 재개는 done 에서). 나타나는 중이면 지금 투명도에서 바로 사라지기 시작 */
export function dissolveOut(scene, done) {
  if (scene.closing) return false;
  scene.closing = true;
  scene.transitioning = true;
  scene.input.enabled = false;
  scene.events.once('shutdown', () => (scene.closing = false));
  const a0 = scene.cameras.main.alpha;
  run(
    scene.game,
    Math.max(1, DISSOLVE_MS * a0),
    (e) => setSceneAlpha(scene, a0 * (1 - e)),
    () => {
      scene.transitioning = false;
      done();
    },
    scene
  );
  return true;
}
