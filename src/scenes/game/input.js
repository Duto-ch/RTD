import { worldPoint } from '../../systems/hires.js';
import { CELL, DEPTH } from '../../config.js';
import { Mercenary } from '../../objects/Mercenary.js';
import { ATTR_INFO } from '../../data/elements.js';
import { audio } from '../../systems/audio.js';

/** 조작: 단축키 · 마우스 고르기·끌기 · 사거리 표시 */
export class BattleInput {
  constructor(scene) {
    /** @type {import('../GameScene.js').GameScene} */
    this.scene = scene;
    this.hovered = null;
  }

  setupInput() {
    this.scene.input.dragDistanceThreshold = 6;
    this.scene.input.keyboard?.on('keydown-ESC', () => !this.scene.tut.open && this.scene.hud.toggleMenu());
    // Space: 게임 정지/다시 (2026-11-21 사용자 결정 — 이전 '바로 시작'은 버튼으로만) · R: 상점 리롤 · S: 선택한 용병 판매
    this.scene.input.keyboard?.addCapture('SPACE');
    const free = () => !(this.scene.over || this.scene.menuOpen || this.scene.tut.open || this.scene.hud.popup);
    this.scene.input.keyboard?.on('keydown-SPACE', () => free() && this.scene.togglePause());
    this.scene.input.keyboard?.on('keydown-R', () => free() && this.scene.reroll());
    // PC 단축키 (2026-11-22): E 영지 레벨 업 · F 바로 시작 (다음 웨이브)
    this.scene.input.keyboard?.on('keydown-E', () => free() && this.scene.levelUpEstate());
    this.scene.input.keyboard?.on('keydown-F', () => free() && this.scene.callNextWave());
    this.scene.input.keyboard?.on('keydown-S', () => {
      if (this.scene.over || this.scene.menuOpen || this.scene.tut.open || this.scene.hud.popup) return;
      if (this.scene.selected?.active) this.scene.sell(this.scene.selected);
    });
    // 1·2·3: 게임 속도 바로 선택 (정지 중이면 풀고 그 속도로, 2026-11-18). 숫자패드도 같음
    [['ONE', 'NUMPAD_ONE', 1], ['TWO', 'NUMPAD_TWO', 2], ['THREE', 'NUMPAD_THREE', 3]].forEach(([k, n, v]) => {
      const go = () => !(this.scene.over || this.scene.menuOpen || this.scene.tut.open) && this.scene.setSpeed(v);
      this.scene.input.keyboard?.on(`keydown-${k}`, go);
      this.scene.input.keyboard?.on(`keydown-${n}`, go);
    });
    // 마우스 (PC, 2026-11-22): 왼쪽 = 고르기 · 오른쪽 = 고르기 풀기·툴팁 닫기 (브라우저 메뉴 대신) · 올리면 사거리
    this.scene.input.mouse?.disableContextMenu();
    this.scene.input.on('gameobjectdown', (p, obj) => {
      if (p.rightButtonDown()) return;
      if (obj instanceof Mercenary) {
        audio.click(); // 용병 고르기 클릭음 (2026-11-26)
        this.select(obj);
      }
    });
    this.scene.input.on('pointerdown', (p, objs) => {
      if (p.rightButtonDown()) {
        if (this.scene.selected) audio.click(); // 오른쪽 클릭으로 고르기 풀기 (2026-11-26)
        this.select(null);
        this.scene.hud.hideRelicTip();
        return;
      }
      if (!objs.length) this.select(null);
    });
    this.scene.input.on('gameobjectover', (_p, obj) => {
      if (obj instanceof Mercenary) this.hovered = obj;
    });
    this.scene.input.on('gameobjectout', (_p, obj) => {
      if (this.hovered === obj) this.hovered = null;
    });
    // 용병 끌기: 월드 좌표로 (포인터의 worldX 는 마지막에 맞은 카메라 좌표라 UI 위에서는 다르다 — 직접 바꾼다)
    this.scene.input.on('dragstart', (p, obj) => {
      if (!(obj instanceof Mercenary) || this.scene.over) return;
      const w = worldPoint(this.scene, p);
      obj.dragging = true;
      audio.pick();
      obj.setReserveClip(null); // 대기석에서 끌어내면 칸 모양 자르기 풀기 (2026-11-24)
      obj.dragOff = { x: obj.x - w.x, y: obj.y - w.y };
      obj.setDepth(DEPTH.drag);
    });
    this.scene.input.on('drag', (p, obj) => {
      if (!obj.dragging) return;
      const w = worldPoint(this.scene, p);
      obj.setPosition(w.x + obj.dragOff.x, w.y + obj.dragOff.y);
    });
    this.scene.input.on('dragend', (p, obj) => {
      if (!obj.dragging) return;
      obj.dragging = false;
      const w = worldPoint(this.scene, p);
      this.scene.handleDrop(obj, w.x, w.y);
    });
  }

  select(merc) {
    this.scene.selected = merc;
    this.scene.refreshInfo();
    if (merc) this.scene.tut.show('select');
  }

  drawRange() {
    const g = this.scene.rangeGfx;
    g.clear();
    // PC (2026-11-22): 고른 용병이 없으면 마우스를 올린 용병의 사거리
    const m = this.scene.selected?.active ? this.scene.selected : this.hovered;
    if (!m || !m.active || m.reserved || m.dragging) return;
    const st = m.getStats(this.scene.relics, this.scene.gameTime);
    const color = ATTR_INFO[m.attr].color;
    g.fillStyle(color, 0.08).fillCircle(m.x, m.y, st.range);
    g.lineStyle(2, color, 0.6).strokeCircle(m.x, m.y, st.range);
    g.lineStyle(4, 0xffffff, 0.9).strokeRect(m.x - CELL / 2 + 2, m.y - CELL / 2 + 2, CELL - 4, CELL - 4);
  }
}
