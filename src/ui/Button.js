import Phaser from 'phaser';
import { DEPTH, UI_PX as PX, COZY } from '../config.js';
import { audio } from '../systems/audio.js';
import { panelKey, panelScale, uiText, drawIcon, CSS, C } from './theme.js';

// 버튼 종류: primary(초록) / danger(빨강) / gold(금) / outline·card(양피지) / soft(오목 슬롯)
const STYLE = { card: 'outline' };
const TEXT = COZY ? {
  // 포근한 카드형: 테두리 없는 크림 글자
  primary: { color: '#0d2000' }, // 2026-11-21 디자인 시스템: 세이지 위 진한 글자 (흰 글자는 대비 3.2:1)
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
const ICON_COLOR = COZY ? { primary: 0x0d2000, danger: 0xfffbea, gold: 0x3a2a10, outline: 0x56743f, card: 0x56743f } : { primary: 0xffffff, danger: 0xffffff, gold: 0xffffff };

// 예전 color 옵션 → variant (호환용)
const FROM_COLOR = { 0x2f7d4a: 'primary', 0x8c2b25: 'danger' };

/**
 * 버튼. icon 이 있으면 — 높이 44 이상: 아이콘 위 + 글자 아래 타일형 / 그보다 낮으면: 아이콘 왼쪽 + 글자 오른쪽 한 줄(묶어서 가운데)
 * (2026-11-21 정렬 점검: 낮은 버튼에서 아이콘과 글자가 겹치던 문제)
 */
export class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, w, h, label, onClick, { variant, color, fontSize = 16, icon, iconLeft } = {}) {
    super(scene, x, y);
    this.w = w;
    this.h = h;
    this.variant = variant || FROM_COLOR[color] || 'outline';
    this.enabled = true;
    this.bg = scene.add.image(0, COZY ? 0 : PX / 2, panelKey(scene, STYLE[this.variant] || this.variant, w, h)).setScale(panelScale());
    const t = TEXT[this.variant] || TEXT.outline;
    this.iconColor = ICON_COLOR[this.variant] ?? C.ink;
    this.icon = icon ? scene.add.graphics() : null;
    this.iconName = icon;
    this.forceIconLeft = iconLeft; // true 면 높이·글자와 상관없이 아이콘 왼쪽 (영지·리롤)
    const extra = t.stroke ? { stroke: t.stroke, strokeThickness: 4, align: 'center' } : { align: 'center' };
    this.label = uiText(scene, 0, 0, label, fontSize, t.color, 'bold', extra).setOrigin(0.5);
    this.add([this.bg, ...(this.icon ? [this.icon] : []), this.label]);
    this.layout();
    this.setSize(w, h);
    this.setInteractive({ useHandCursor: true });
    this.setDepth(DEPTH.ui);
    this.pressed = false;
    // 누르면 1픽셀 내려앉는다
    const down = (v) => {
      this.bg.setY((COZY ? 0 : PX / 2) + (v ? PX : 0));
      this.label.setY(this.labelY + (v ? PX : 0));
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
      if (this.pressed && this.enabled) {
        audio.click(); // 버튼 클릭음 (2026-11-22)
        onClick();
      }
      this.pressed = false;
      down(false);
    });
    scene.add.existing(this);
  }

  setLabel(t) {
    this.label.setText(t);
    this.layout();
    return this;
  }

  /** 아이콘·글자 자리 (글자가 바뀌면 다시) — iconRect: 아이콘 칸(버튼 기준, tools/ui-audit.cjs 가 겹침 확인) */
  layout() {
    const h = this.h;
    if (!this.icon) {
      this.labelY = 0;
      this.label.setPosition(0, 0);
      return;
    }
    this.icon.clear();
    // 아이콘 위·글자 아래(타일형)는 둘 사이 4px·위아래 4px 이상 남을 때만 — 모자라면 아이콘 왼쪽 한 줄 (여백 필수 규칙)
    const s = 14; // 아이콘 실제 크기 (7칸 × 2px)
    const lh = this.label.text ? this.label.height : 0;
    this.iconLeft = this.forceIconLeft ?? (h < 44 || s + 4 + lh + 8 > h);
    if (this.iconLeft) {
      const iw = 14; // 7칸 × 2px
      const gap = 6;
      const total = iw + (this.label.text ? gap + this.label.width : 0);
      const left = Math.round(-total / 2);
      drawIcon(this.icon, this.iconName, left + iw / 2, 0, iw, this.iconColor);
      this.iconRect = { x: left, y: -iw / 2, w: iw, h: iw };
      this.labelY = 0;
      this.label.setPosition(left + iw + gap + this.label.width / 2, 0);
    } else {
      // 아이콘·글자 묶음을 버튼 세로 가운데에
      const top = -(s + (lh ? 4 + lh : 0)) / 2;
      drawIcon(this.icon, this.iconName, 0, top + s / 2, s, this.iconColor);
      this.iconRect = { x: -s / 2, y: Math.round(top), w: s, h: s };
      this.labelY = top + s + 4 + lh / 2;
      this.label.setPosition(0, this.labelY);
    }
  }

  /** 아이콘 바꾸기 (아이콘 버튼만) */
  setIcon(name) {
    if (!this.icon) return this;
    this.iconName = name;
    this.layout();
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
