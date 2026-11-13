import Phaser from 'phaser';
import { GAME_W, GAME_H, PX } from '../config.js';
import { Button } from '../ui/Button.js';
import { panel, panelImage, titleTab, uiText, drawIcon, CSS } from '../ui/theme.js';
import { UPGRADES, UPGRADE_BRANCHES, UPGRADE_BY_ID, upgradeCost, formatEffect } from '../data/upgrades.js';
import { meta } from '../systems/meta.js';
import { audio } from '../systems/audio.js';

// 명성 강화 화면: 공격·경제·전술 3갈래 × 4칸. 칸을 누르면 명성을 써서 1레벨 올린다.
const COL_W = 168;
const COL_X = (i) => 12 + i * (COL_W + 6);
const NODE_H = 140;
const NODE_Y = (j) => 196 + j * (NODE_H + 8);

export class UpgradeScene extends Phaser.Scene {
  constructor() {
    super('Upgrade');
  }

  create() {
    meta.load();
    audio.playMusic('title');
    this.add.image(0, 0, 'bg_grass').setOrigin(0).setScale(PX);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x1a0f08, 0.35).setOrigin(0);

    // 머리 창: 보유 명성·최고 기록
    panel(this, 16, 28, GAME_W - 32, 112, 'card');
    titleTab(this, GAME_W / 2, 28, '명성 강화', 200);
    const g = this.add.graphics();
    drawIcon(g, 'crown', 48, 78, 21, 0xa8700c);
    this.fameText = uiText(this, 68, 78, '', 22, CSS.gold, 'bold').setOrigin(0, 0.5);
    this.bestText = uiText(this, GAME_W - 40, 78, '', 13, CSS.sub, 'bold').setOrigin(1, 0.5);
    uiText(this, GAME_W / 2, 114, '판이 끝나면 버틴 웨이브만큼 명성을 얻어요 · 강화는 영구 유지', 12, CSS.sub, 'bold').setOrigin(0.5);

    // 갈래 이름
    UPGRADE_BRANCHES.forEach((b, i) => {
      panelImage(this, COL_X(i) + COL_W / 2, 168, 'dark', COL_W, 32);
      uiText(this, COL_X(i) + COL_W / 2, 168, b.name, 15, '#ffffff', 'bold', { stroke: '#1a0f08', strokeThickness: 4 }).setOrigin(0.5);
    });

    this.nodes = this.add.container(0, 0);
    this.drawNodes();

    new Button(this, GAME_W / 2 - 92, 892, 236, 64, '게임 시작', () => this.scene.start('Game'), { variant: 'primary', fontSize: 20 });
    new Button(this, GAME_W / 2 + 140, 892, 200, 64, '타이틀로', () => this.scene.start('Title'), { variant: 'outline', fontSize: 16 });
  }

  drawNodes() {
    this.nodes.removeAll(true);
    this.fameText.setText(`명성 ${meta.fame.toLocaleString()}`);
    const best = meta.data.best;
    this.bestText.setText(`최고 기록 W${best.normal || 0}${meta.data.hardUnlocked ? ` · HARD W${best.hard || 0}` : ''}`);

    UPGRADE_BRANCHES.forEach((b, i) => {
      UPGRADES.filter((u) => u.branch === b.id).forEach((u, j) => this.drawNode(u, COL_X(i), NODE_Y(j)));
    });
  }

  drawNode(u, x, y) {
    const lv = meta.level(u.id);
    const status = meta.status(u.id);
    const style = status === 'max' ? 'gold' : status === 'locked' ? 'soft' : 'card';
    const parts = [panel(this, x, y, COL_W, NODE_H, style)];
    const ink = status === 'max' ? '#ffffff' : CSS.ink;
    const sub = status === 'max' ? '#fff3d0' : CSS.sub;
    const stroke = status === 'max' ? { stroke: '#3a2608', strokeThickness: 4 } : {};
    parts.push(uiText(this, x + 14, y + 14, u.name, 15, ink, 'bold', stroke));
    parts.push(uiText(this, x + COL_W - 14, y + 16, `${lv}/${u.max}`, 12, sub, 'bold', stroke).setOrigin(1, 0));
    parts.push(uiText(this, x + 14, y + 44, u.label, 13, sub, 'bold', stroke));
    // 현재 → 다음 효과
    const now = lv ? formatEffect(u, lv) : '없음';
    const next = status === 'max' ? '최대' : formatEffect(u, lv + 1);
    parts.push(uiText(this, x + 14, y + 66, `${now}  ▶  ${next}`, 13, ink, 'bold', stroke));
    // 아래 줄: 비용 / 잠금 조건 / 최대
    let foot;
    let footColor = CSS.gold;
    if (status === 'max') {
      foot = 'MAX';
      footColor = '#ffffff';
    } else if (status === 'locked') {
      foot = `필요: ${UPGRADE_BY_ID[u.req].name}`;
      footColor = CSS.sub;
    } else {
      foot = `명성 ${upgradeCost(u, lv)}`;
      if (status === 'poor') footColor = CSS.red;
    }
    parts.push(uiText(this, x + COL_W / 2, y + NODE_H - 30, foot, 14, footColor, 'bold', status === 'max' ? stroke : {}).setOrigin(0.5));
    if (status === 'locked') parts.forEach((p) => p.setAlpha(0.75));

    const hit = this.add.zone(x, y, COL_W, NODE_H).setOrigin(0).setInteractive({ useHandCursor: status === 'ok' });
    hit.on('pointerup', () => this.tryBuy(u.id));
    this.nodes.add([...parts, hit]);
  }

  tryBuy(id) {
    const st = meta.status(id);
    if (meta.buy(id)) {
      audio.levelUp();
      this.drawNodes();
      return;
    }
    audio.init();
    const msg = st === 'max' ? '이미 최대 레벨입니다' : st === 'locked' ? `먼저 「${UPGRADE_BY_ID[UPGRADE_BY_ID[id].req].name}」을 배우세요` : '명성이 부족합니다';
    this.toast(msg);
  }

  toast(msg) {
    this.toastObj?.destroy();
    const t = uiText(this, GAME_W / 2, 832, msg, 14, '#ffffff', 'bold', { stroke: '#1a0f08', strokeThickness: 4 }).setOrigin(0.5);
    this.toastObj = t;
    this.tweens.add({ targets: t, alpha: 0, delay: 1200, duration: 400, onComplete: () => t.destroy() });
  }
}

