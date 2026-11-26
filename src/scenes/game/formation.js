import { toUi } from '../../systems/hires.js';
import { GRID } from '../../config.js';
import { cellAt } from '../../systems/path.js';
import { audio } from '../../systems/audio.js';

/** 편성: 필드 5x5 칸 · 대기석 · 끌어 놓기 */
export class Formation {
  constructor(scene) {
    /** @type {import('../GameScene.js').GameScene} */
    this.scene = scene;
  }

  /** 용병을 놓을 수 있는 칸 수 (2026-11-18: 성탑 삭제 → 25칸 모두) */
  get fieldSlots() {
    return GRID * GRID;
  }

  /** 필드에 놓인 용병 (전투·시너지·인원은 이것만) */
  get mercs() {
    return this.scene.grid.flat().filter(Boolean);
  }

  /** 필드 + 대기석 (별 승급·3성 판정은 대기석도 센다) */
  get allUnits() {
    return [...this.mercs, ...this.scene.reserve.filter(Boolean)];
  }

  /** 빈 대기석 칸 번호 (없으면 -1) */
  freeReserve() {
    return this.scene.reserve.findIndex((u) => !u);
  }

  /** 유닛을 지금 자리(필드 칸·대기석)에서 뺀다 */
  unplace(u) {
    if (u.reserved) this.scene.reserve[u.slot] = null;
    else if (this.scene.grid[u.row]?.[u.col] === u) this.scene.grid[u.row][u.col] = null;
  }

  /** 유닛을 대기석 slot 에 */
  toReserve(u, slot) {
    u.reserved = true;
    u.slot = slot;
    u.col = u.row = -1;
    this.scene.reserve[slot] = u;
    u.snapToCell();
  }

  /** 유닛을 필드 칸에 */
  toField(u, col, row) {
    u.reserved = false;
    u.slot = -1;
    u.col = col;
    u.row = row;
    this.scene.grid[row][col] = u;
    u.snapToCell();
  }

  /** 빈 칸 (후열·가운데부터, 전사는 전열 먼저) */
  emptyCell(char) {
    const cells = [];
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) if (!this.scene.grid[r][c]) cells.push({ c, r });
    if (!cells.length) return null;
    const front = (p) => p.r === 0 || p.c === 0 || p.r === GRID - 1 || p.c === GRID - 1;
    const want = char?.cls === 'warrior' ? cells.filter(front) : cells.filter((p) => !front(p));
    return (want.length ? want : cells)[0];
  }

  /** 끌어 놓기: 필드 칸 ↔ 필드 칸 · 필드 ↔ 대기석 · 대기석 ↔ 대기석 (2026-11-21 대기석) */
  /** 끌어 놓기 (x, y 는 월드 좌표 — 대기석은 UI 좌표로 바꿔 찾는다) */
  handleDrop(merc, x, y) {
    const slot = this.scene.hud.reserveSlotAt?.(toUi(x), toUi(y)) ?? -1;
    const cell = slot < 0 ? cellAt(x, y) : null;
    if (slot < 0 && !cell) return merc.snapToCell();
    if (slot >= 0 && merc.reserved && merc.slot === slot) return merc.snapToCell();
    if (cell && !merc.reserved && cell.col === merc.col && cell.row === merc.row) return merc.snapToCell();
    const other = slot >= 0 ? this.scene.reserve[slot] : this.scene.grid[cell.row][cell.col];
    // 대기석 → 빈 필드 칸: 필드 인원이 가득이면 못 올린다
    if (cell && merc.reserved && !other && this.mercs.length >= this.scene.cap) {
      this.scene.toast(`필드 가득 (${this.scene.cap}명)`, '#ff9a7a');
      return merc.snapToCell();
    }
    const from = merc.reserved ? { slot: merc.slot } : { col: merc.col, row: merc.row };
    this.unplace(merc);
    if (other) this.unplace(other);
    if (slot >= 0) this.toReserve(merc, slot);
    else this.toField(merc, cell.col, cell.row);
    audio.place();
    if (other) {
      if (from.slot != null) this.toReserve(other, from.slot);
      else this.toField(other, from.col, from.row);
    }
    this.scene.recomputeSynergy();
    this.scene.refreshHud();
  }
}
