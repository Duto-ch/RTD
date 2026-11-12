import { FIELD_X, FIELD_Y, FIELD_SIZE, PATH_OFF, GRID, CELL } from '../config.js';

// 필드를 둘러싼 사각 경로 (시계 방향: 위→오른쪽→아래→왼쪽)
const X0 = FIELD_X - PATH_OFF;
const Y0 = FIELD_Y - PATH_OFF;
const SIDE = FIELD_SIZE + PATH_OFF * 2;
export const PATH_LENGTH = SIDE * 4;
export const PATH_START = { x: X0, y: Y0 };

/** 경로 위 거리 d 의 좌표와 진행 방향 */
export function pathPoint(d) {
  d = ((d % PATH_LENGTH) + PATH_LENGTH) % PATH_LENGTH;
  const seg = Math.floor(d / SIDE);
  const t = d - seg * SIDE;
  switch (seg) {
    case 0: return { x: X0 + t, y: Y0, dir: 'right' };
    case 1: return { x: X0 + SIDE, y: Y0 + t, dir: 'down' };
    case 2: return { x: X0 + SIDE - t, y: Y0 + SIDE, dir: 'left' };
    default: return { x: X0, y: Y0 + SIDE - t, dir: 'up' };
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
