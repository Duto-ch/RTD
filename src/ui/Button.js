import Phaser from 'phaser';
import { DEPTH, UI_PX as PX, COZY } from '../config.js';
import { panelKey, panelScale, uiText, drawIcon, CSS, C } from './theme.js';

// 버튼 종류: primary(초록) / danger(빨강) / gold(금) / outline·card(양피지) / soft(오목 슬롯)
const STYLE = { card: 'outline' };
const TEXT = COZY ? {
  // 포근한 카드형: 테두리 없는 크림 글자
  primary: { color: '#fffbea' },
  danger: { color: '#fffbea' },
  gold: { color: '#3a2a10' },
  outline: { color: CSS.ink },
  card: { color: CSS.ink },
  soft: { color: CSS.ink }
} : {
  primary: { color: CSS.white, stroke: '#3a1606' },
  danger: { color: CSS.white, stroke: '#3a1210' },
  gold: { color: CSS.white, stroke: '#3a2608' },
  outline: { color: CSS.ink },
  card: { color: CSS.ink },
  soft: { color: CSS.ink }
};
const ICON_COLOR = COZY ? { primary: 0xfffbea, danger: 0xfffbea, gold: 0x3a2a10, outline: 0x56743f, card: 0x56743f } : { primary: 0xffffff, danger: 0xffffff, gold: 0xffffff };

// 예전 color 옵션 → variant (호환용)
const FROM_COLOR = { 0x2f7d4a: 'primary', 0x8c2b25: 'danger' };

/** 픽셀 버튼. icon 이 있으면 아이콘 위 + 글자 아래의 타일형 */
export class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, w, h, label, onClick, { variant, color, fontSize = 16, icon } = {}) {
    super(scene, x, y);
    this.w = w;
    this.h = h;
    this.variant = variant || FROM_COLOR[color] || 'outline';
    this.enabled = true;
    this.bg = scene.add.image(0, COZY ? 0 : PX / 2, panelKey(scene, STYLE[this.variant] || this.variant, w, h)).setScale(panelScale());
    const t = TEXT[this.variant] || TEXT.outline;
    this.iconColor = ICON_COLOR[this.variant] ?? C.ink;
    this.icon = null;
    if (icon) {
      this.icon = scene.add.graphics();
      drawIcon(this.icon, icon, 0, -h * 0.16, Math.min(21, h * 0.3), this.iconColor);
    }
    const extra = t.stroke ? { stroke: t.stroke, strokeThickness: 4, align: 'center' } : { align: 'center' };
    this.label = uiText(scene, 0, icon ? h * 0.22 : 0, label, fontSize, t.color, 'bold', extra).setOrigin(0.5);
    this.add([this.bg, ...(this.icon ? [this.icon] : []), this.label]);
    this.setSize(w, h);
    this.setInteractive({ useHandCursor: true });
    this.setDepth(DEPTH.ui);
    this.pressed = false;
    // 누르면 1픽셀 내려앉는다
    const down = (v) => {
      this.bg.setY((COZY ? 0 : PX / 2) + (v ? PX : 0));
      this.label.setY((icon ? h * 0.22 : 0) + (v ? PX : 0));
      if (this.icon) this.icon.setY(v ? PX : 0);
    };
    this.on('pointerdown', () => {
      this.pressed = true;
      down(true);
    });
    this.on('pointerout', () => {
      this.pressed = false;
      down(false);
    });
    this.on('pointerup', () => {
      if (this.pressed && this.enabled) onClick();
      this.pressed = false;
      down(false);
    });
    scene.add.existing(this);
  }

  setLabel(t) {
    this.label.setText(t);
    return this;
  }

  /** 아이콘 바꾸기 (아이콘 타일 버튼만) */
  setIcon(name) {
    if (!this.icon) return this;
    this.icon.clear();
    drawIcon(this.icon, name, 0, -this.h * 0.16, Math.min(21, this.h * 0.3), this.iconColor);
    return this;
  }

  setIcon(type) {
    if (!this.icon) return this;
    this.icon.clear();
    drawIcon(this.icon, type, 0, -this.h * 0.16, Math.min(21, this.h * 0.3), this.iconColor);
    return this;
  }

  setEnabled(v) {
    if (this.enabled !== v) {
      this.enabled = v;
      this.setAlpha(v ? 1 : 0.5);
    }
    return this;
  }
}
