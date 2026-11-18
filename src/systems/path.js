import { FIELD_X, FIELD_Y, FIELD_SIZE, PATH_OFF, GRID, CELL } from '../config.js';

// 필드를 둘러싼 사각 경로 (시계 방향: 위→오른쪽→아래→왼쪽)
const X0 = FIELD_X - PATH_OFF;
const Y0 = FIELD_Y - PATH_OFF;
const SIDE = FIELD_SIZE + PATH_OFF * 2;
export const PATH_LENGTH = SIDE * 4;
export const PATH_START = { x: X0, y: Y0 };

/** 경로 위 거리 d 의 좌표와 진행 방향. lane: 길 가운데에서 바깥(+)·안(-)으로 비켜 걷는 거리 — 한 변이 SIDE+2·lane 인 사각형을 돈다 */
export function pathPoint(d, lane = 0) {
  d = ((d % PATH_LENGTH) + PATH_LENGTH) % PATH_LENGTH;
  const seg = Math.floor(d / SIDE);
  const f = (d - seg * SIDE) / SIDE;
  const x0 = X0 - lane;
  const y0 = Y0 - lane;
  const side = SIDE + lane * 2;
  switch (seg) {
    case 0: return { x: x0 + f * side, y: y0, dir: 'right' };
    case 1: return { x: x0 + side, y: y0 + f * side, dir: 'down' };
    case 2: return { x: x0 + side - f * side, y: y0 + side, dir: 'left' };
    default: return { x: x0, y: y0 + side - f * side, dir: 'up' };
  }
}

export function cellCenter(col, row) {
  return { x: FIELD_X + col * CELL + CELL / 2, y: FIELD_Y + row * CELL + CELL / 2 };
}

export function cellAt(x, y) {
  const col = Math.floor((x - FIELD_X) / CELL);
  const row = Math.floor((y - FIELD_Y) / CELL);
  if (col < 0 || row < 0 || col >= GRID || row >= GRID) return null;
  return { col, row };
}
