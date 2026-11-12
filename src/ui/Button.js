import Phaser from 'phaser';
import { DEPTH } from '../config.js';
import { panelKey, uiText, drawIcon, CSS, C } from './theme.js';

// 버튼 종류: primary(보라 그라데이션) / outline(흰 바탕 보라 테두리) / card(흰 카드 타일)
//           soft(연보라) / danger(빨강) / gold
const TEXT_COLOR = {
  primary: CSS.white,
  danger: CSS.white,
  gold: CSS.white,
  outline: CSS.primary,
  card: CSS.primary,
  soft: CSS.primary
};

// 예전 color 옵션 → variant (호환용)
const FROM_COLOR = { 0x2f7d4a: 'primary', 0x8c2b25: 'danger' };

/** 둥근 버튼. h 가 작으면 알약형, icon 이 있으면 아이콘 위 + 글자 아래의 타일형 */
export class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, w, h, label, onClick, { variant, color, fontSize = 18, icon, radius } = {}) {
    super(scene, x, y);
    this.w = w;
    this.h = h;
    this.variant = variant || FROM_COLOR[color] || 'outline';
    this.enabled = true;
    const r = radius ?? Math.min(h / 2, 22);
    this.bg = scene.add.image(0, 0, panelKey(scene, this.variant, w, h, r));
    const tc = TEXT_COLOR[this.variant];
    this.icon = null;
    if (icon) {
      this.icon = scene.add.graphics();
      drawIcon(this.icon, icon, 0, -h * 0.16, Math.min(22, h * 0.32), Phaser.Display.Color.HexStringToColor(tc).color);
    }
    this.label = uiText(scene, 0, icon ? h * 0.22 : 0, label, fontSize, tc, '700', { align: 'center' }).setOrigin(0.5);
    this.add([this.bg, ...(this.icon ? [this.icon] : []), this.label]);
    this.setSize(w, h);
    this.setInteractive({ useHandCursor: true });
    this.setDepth(DEPTH.ui);
    this.pressed = false;
    this.on('pointerdown', () => {
      this.pressed = true;
      this.setScale(0.96);
    });
    this.on('pointerout', () => {
      this.pressed = false;
      this.setScale(1);
    });
    this.on('pointerup', () => {
      if (this.pressed && this.enabled) onClick();
      this.pressed = false;
      this.setScale(1);
    });
    scene.add.existing(this);
  }

  setLabel(t) {
    this.label.setText(t);
    return this;
  }

  setIcon(type) {
    if (!this.icon) return this;
    this.icon.clear();
    drawIcon(this.icon, type, 0, -this.h * 0.16, Math.min(22, this.h * 0.32), C.primary);
    return this;
  }

  setEnabled(v) {
    if (this.enabled !== v) {
      this.enabled = v;
      this.setAlpha(v ? 1 : 0.45);
    }
    return this;
  }
}
