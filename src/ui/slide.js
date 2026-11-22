// 화면 전환: 옆으로 밀기 (2026-11-22 사용자 요청 — 영지 메뉴 버튼을 누르면 슬라이드로 넘어간다)
// dir 1: 새 화면이 오른쪽에서 들어오고 지금 화면은 왼쪽으로 나간다 (영지 → 메뉴) / -1: 반대 (메뉴 → 영지)
// 카메라 뷰포트(캔버스 픽셀)를 옮기므로 장면 안 좌표·RES 배율과 상관없다. 끝나면 떠나는 장면은 멈춘다(scene.start 와 같음)
// 시간은 실제 시간(performance.now) 기준 — 장면 시간은 화면이 느리면 늘어져 전환이 끝나지 않은 채 다음 전환이 겹쳤다
export const SLIDE_MS = 360;

const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/**
 * @param {Phaser.Scene} from 지금 장면
 * @param {string} key 갈 장면
 * @param {object} [data] 갈 장면에 넘길 값
 * @param {1|-1} [dir]
 * @returns {boolean} 시작했으면 true (넘어가는 중이면 false)
 */
export function slideTo(from, key, data, dir = 1) {
  if (from.sliding) return false;
  const mgr = from.scene;
  const target = mgr.get(key);
  if (!target || mgr.isActive(key) || mgr.isSleeping(key)) {
    mgr.start(key, data);
    return true;
  }
  const game = from.game;
  const W = from.scale.width;
  from.sliding = true;
  target.sliding = true; // 들어오는 동안 그 장면에서 또 전환하지 못하게
  from.input.enabled = false;
  from.events.once('shutdown', () => (from.sliding = false));
  // 새 장면은 create() 직후(첫 그림 전) 화면 밖에서 출발
  target.events.once('create', () => target.cameras.main.setPosition(dir * W, 0));
  mgr.launch(key, data);
  const t0 = performance.now();
  const step = () => {
    const p = Math.min(1, (performance.now() - t0) / SLIDE_MS);
    const e = easeOut(p);
    from.cameras.main?.setPosition(Math.round(-dir * W * e), 0);
    if (mgr.isActive(key)) target.cameras.main.setPosition(Math.round(dir * W * (1 - e)), 0);
    if (p < 1) return;
    game.events.off('step', step);
    if (mgr.isActive(key)) target.cameras.main.setPosition(0, 0);
    target.sliding = false;
    mgr.stop(from.scene.key);
  };
  game.events.on('step', step);
  return true;
}
