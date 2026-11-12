import Phaser from 'phaser';
import { FONT, DEPTH } from '../config.js';

/** 픽셀 스타일 버튼 */
export class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, w, h, label, onClick, { color = 0x3b4a6b, fontSize = 22 } = {}) {
    super(scene, x, y);
    this.w = w;
    this.h = h;
    this.color = color;
    this.enabled = true;
    this.bg = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, label, { fontFamily: FONT, fontSize: `${fontSize}px`, color: '#ffffff', align: 'center' })
      .setOrigin(0.5);
    this.add([this.bg, this.label]);
    this.setSize(w, h);
    this.setInteractive({ useHandCursor: true });
    this.setDepth(DEPTH.ui);
    this.pressed = false;
    this.on('pointerdown', () => {
      this.pressed = true;
      this.draw();
    });
    this.on('pointerout', () => {
      this.pressed = false;
      this.draw();
    });
    this.on('pointerup', () => {
      if (this.pressed && this.enabled) onClick();
      this.pressed = false;
      this.draw();
    });
    this.draw();
    scene.add.existing(this);
  }

  setLabel(t) {
    this.label.setText(t);
    return this;
  }

  setEnabled(v) {
    if (this.enabled !== v) {
      this.enabled = v;
      this.draw();
    }
    return this;
  }

  draw() {
    const { w, h } = this;
    const g = this.bg;
    const fill = this.enabled ? this.color : 0x3a3a44;
    const oy = this.pressed ? 4 : 0;
    g.clear();
    g.fillStyle(0x0d0d14).fillRect(-w / 2, -h / 2 + 4, w, h);
    g.fillStyle(0x1b1b26).fillRect(-w / 2, -h / 2 + oy, w, h - 4);
    g.fillStyle(fill).fillRect(-w / 2 + 4, -h / 2 + 4 + oy, w - 8, h - 12);
    g.fillStyle(0xffffff, 0.18).fillRect(-w / 2 + 4, -h / 2 + 4 + oy, w - 8, 4);
    this.label.setY(-2 + oy).setAlpha(this.enabled ? 1 : 0.5);
  }
}
