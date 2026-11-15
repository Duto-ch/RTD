import { RES } from '../config.js';

/** 장면 카메라를 RES 배로 확대해, 2배 해상도 캔버스에 게임 좌표(544x960)를 그대로 그린다. 각 장면 create() 첫 줄에서 부른다 */
export function hiRes(scene) {
  scene.cameras.main.setOrigin(0, 0).setZoom(RES);
}
