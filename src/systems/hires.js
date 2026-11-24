import { RES, UI_SCALE, DEPTH } from '../config.js';

/**
 * UI 장면(타이틀·영지·병영·술집·유물 공방·강화): UI 좌표(1280x720)를 RES × UI_SCALE 배로 캔버스(1920x1080 × RES)에 그린다.
 * 각 장면 create() 첫 줄에서 부른다
 */
export function hiRes(scene) {
  scene.cameras.main.setOrigin(0, 0).setZoom(RES * UI_SCALE);
}

/**
 * 전투 장면 (2026-11-22 PC 전환): 전장은 월드 좌표(1920x1080, 도트 2px)를 zoom RES 로, UI 는 UI 좌표(1280x720)를 zoom RES × 1.5 로.
 * 카메라 4개를 그리는 순서대로 쌓고, 매 프레임 깊이로 어느 카메라가 그릴지 정한다:
 *  1. world  — 깊이 UI_MIN(100) 미만 (배경·필드·몬스터·용병·이펙트·떠오르는 글자)
 *  2. ui     — 깊이 UI_MIN 이상 (HUD)
 *  3. top    — 월드 물체인데 UI 위에 그릴 것 (worldLayer = true 이고 깊이 UI_MIN 이상: 대기석·끄는 용병)
 *  4. over   — UI 중 창·툴팁 (깊이 DEPTH.overlay - 1 이상)
 * 물체에 worldLayer = true 를 주면 깊이와 상관없이 월드 좌표, uiLayer = true 면 깊이와 상관없이 UI 좌표.
 * 좌표 바꾸기: 월드 = UI × UI_SCALE (두 카메라 모두 왼쪽 위가 0,0)
 */
/** 이 깊이 이상은 UI (HUD 패널이 DEPTH.ui - 1 등으로 조금 아래에 있다 — 전장 물체는 DEPTH.fx + 5 이하) */
export const UI_MIN = 100;

export function splitCams(scene) {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const world = scene.cameras.main.setOrigin(0, 0).setZoom(RES);
  const ui = scene.cameras.add(0, 0, W, H).setOrigin(0, 0).setZoom(RES * UI_SCALE);
  const top = scene.cameras.add(0, 0, W, H).setOrigin(0, 0).setZoom(RES);
  const over = scene.cameras.add(0, 0, W, H).setOrigin(0, 0).setZoom(RES * UI_SCALE);
  const all = world.id | ui.id | top.id | over.id;
  scene.cams = { world, ui, top, over };
  const assign = () => {
    for (const o of scene.children.list) {
      const d = o.depth;
      let cam;
      if (o.worldLayer || (d < UI_MIN && !o.uiLayer)) cam = d >= UI_MIN ? top : world;
      else cam = d >= DEPTH.overlay - 1 ? over : ui;
      o.cameraFilter = all & ~cam.id;
    }
  };
  scene.events.on('prerender', assign);
  scene.events.once('shutdown', () => scene.events.off('prerender', assign));
  scene.assignCams = assign;
  return scene.cams;
}

/** 포인터 → 월드 좌표 (전장) */
export function worldPoint(scene, p) {
  const cam = scene.cams?.world || scene.cameras.main;
  return cam.getWorldPoint(p.x, p.y);
}

/** 포인터 → UI 좌표 */
export function uiPoint(scene, p) {
  const cam = scene.cams?.ui || scene.cameras.main;
  return cam.getWorldPoint(p.x, p.y);
}

/** UI 좌표 → 월드 좌표 */
export const toWorld = (v) => v * UI_SCALE;
/** 월드 좌표 → UI 좌표 */
export const toUi = (v) => v / UI_SCALE;

/** 컨테이너를 거슬러 맨 위 물체 */
export function rootOf(o) {
  while (o.parentContainer) o = o.parentContainer;
  return o;
}

/** 이 물체가 월드 좌표(전장 카메라)로 그려지는가 — 카메라를 나누지 않은 장면은 늘 false */
export function inWorld(scene, o) {
  if (!scene.cams) return false;
  const r = rootOf(o);
  return !!(r.worldLayer || (r.depth < UI_MIN && !r.uiLayer));
}

/** 포인터를 그 물체가 그려지는 좌표로 */
export function pointerFor(scene, o, p) {
  if (!scene.cams) return { x: p.worldX, y: p.worldY };
  return inWorld(scene, o) ? worldPoint(scene, p) : uiPoint(scene, p);
}

/** 물체 (0,0) 의 UI 좌표 (월드 물체면 바꿔서) — 툴팁을 UI 에 띄울 때 */
export function uiPosOf(scene, o) {
  const c = o.getWorldTransformMatrix().transformPoint(0, 0);
  return inWorld(scene, o) ? { x: toUi(c.x), y: toUi(c.y) } : { x: c.x, y: c.y };
}
