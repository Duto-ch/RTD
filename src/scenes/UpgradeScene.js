import Phaser from 'phaser';
import { hiRes } from '../systems/hires.js';
import { Kinetic } from '../ui/kinetic.js';
import { GAME_W, GAME_H, WIDE } from '../config.js';
import { Button } from '../ui/Button.js';
import { panel, uiText, drawIcon, CSS, coverImage } from '../ui/theme.js';
import { UPGRADES, UPGRADE_BY_ID, BRANCH_BY_ID, START_ONLY, childrenOf, upgradeCost, formatEffect } from '../data/upgrades.js';
import { meta } from '../systems/meta.js';
import { audio } from '../systems/audio.js';
import { slideTo } from '../ui/slide.js';

// 명성 강화 화면: 가운데 뿌리에서 4갈래(공격 위·경제 오른쪽·전술 아래·방어 왼쪽)로 가지가 뻗는 스킬 노드 트리.
// 노드를 누르면 아래 창에 정보가 나오고 "강화" 버튼으로 명성을 써서 1레벨 올린다.
// 드래그로 이동, 마우스 휠·+/- 버튼으로 확대·축소.

const ARMS = ['attack', 'economy', 'tactics', 'defense']; // 시계 방향 (위 → 오른쪽 → 아래 → 왼쪽)
const RADIUS = [0, 76, 138, 196, 248]; // 깊이별 거리
const STAGGER = 30; // 형제가 많을 때 엇갈려 놓는 거리
const HEX = 17; // 노드 육각형 반지름
// 세로: 위 머리 창 · 가운데 트리 · 아래 정보 창 / 가로(2026-11-15): 왼쪽 트리 · 오른쪽 칸에 머리 창·정보 창·버튼
const VIEW = WIDE ? { top: 24, bottom: GAME_H - 24, right: 872 } : { top: 108, bottom: 676, right: GAME_W }; // 트리가 보이는 영역
const CENTER = { x: WIDE ? 436 : GAME_W / 2, y: (VIEW.top + VIEW.bottom) / 2 };
const SIDE = WIDE ? { x: 888, w: 380 } : { x: 12, w: GAME_W - 24 }; // 머리 창·정보 창이 놓이는 칸

/**
 * 방사형 배치: 4갈래가 위·오른쪽·아래·왼쪽을 향하고 각 갈래는 같은 90° 구역(양옆 여백 제외)을 쓴다.
 * 구역 안에서 잎 노드마다 각도를 똑같이 나누고, 가지 노드는 자식들 각도의 평균. 거리는 깊이로 정한다.
 * 형제가 4개 이상이면 홀수 번째를 조금 더 바깥에 두어 겹치지 않게 한다.
 */
export function layoutTree() {
  const pos = {};
  const leaves = (id) => {
    const ch = childrenOf(id);
    return ch.length ? ch.reduce((s, c) => s + leaves(c.id), 0) : 1;
  };
  const SECTOR = (Math.PI / 2) * 0.88;
  const place = (id, depth, cursor, per, stagger) => {
    const ch = childrenOf(id);
    let angle;
    if (!ch.length) {
      angle = cursor.a + per / 2;
      cursor.a += per;
    } else {
      const angles = ch.map((c, i) => place(c.id, depth + 1, cursor, per, ch.length >= 4 && i % 2 === 1));
      angle = angles.reduce((x, y) => x + y, 0) / angles.length;
    }
    const r = RADIUS[Math.min(depth, RADIUS.length - 1)] + (stagger ? STAGGER : 0);
    pos[id] = { angle, depth, r };
    return angle;
  };
  ARMS.forEach((arm, i) => {
    const center = -Math.PI / 2 + (i * Math.PI) / 2;
    const trunk = UPGRADES.find((u) => u.parent === 'origin' && u.branch === arm);
    const n = leaves(trunk.id);
    place(trunk.id, 1, { a: center - SECTOR / 2 }, SECTOR / n, false);
    pos[trunk.id].angle = center; // 줄기는 갈래 방향으로 곧게
  });
  for (const p of Object.values(pos)) {
    p.x = Math.cos(p.angle) * p.r;
    p.y = Math.sin(p.angle) * p.r;
  }
  pos.origin = { x: 0, y: 0, angle: 0, depth: 0, r: 0 };
  return pos;
}

export class UpgradeScene extends Phaser.Scene {
  constructor() {
    super('Upgrade');
  }

  /**
   * from: 'game' 이면 전투 중 성탑에서 연 것 (닫으면 전투로 돌아감), 'title'·'result' 면 일반 화면.
   * 주의: Phaser 는 데이터 없이 다시 시작하면 지난번 데이터를 그대로 쓰므로, 여는 곳마다 from 을 꼭 넘긴다.
   * (멈춰 있는 전투가 없는데 '닫기'를 누르면 close() 가 타이틀로 보낸다)
   */
  init(data) {
    this.fromGame = data?.from === 'game';
  }

  create() {
    hiRes(this);
    meta.load();
    if (!this.fromGame) audio.playMusic('title');
    this.pos = layoutTree();
    this.selected = 'origin';
    this.zoom = 1;
    this.drag = null;
    this.moved = false;

    // 밤하늘 배경: 사용자 그림(별·은하수 밤하늘)을 원본 그대로 (2026-11-22, 도트로 줄이지 않음). 가로 배치는 예전 그린 별
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x12101e).setOrigin(0);
    if (!WIDE && this.textures.exists('upgrade_bg')) coverImage(this, 'upgrade_bg', GAME_W, GAME_H);
    else {
      const stars = this.add.graphics();
      for (let i = 0; i < 70; i++) {
        stars.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.08, 0.3));
        stars.fillRect(Phaser.Math.Between(0, GAME_W), Phaser.Math.Between(0, GAME_H), 2, 2);
      }
      for (const [x, y, r] of [[90, 260, 90], [470, 560, 70], [430, 180, 40]]) this.add.circle(x, y, r, 0x2a2147, 0.5);
    }

    // 트리 (이동·확대되는 컨테이너)
    this.tree = this.add.container(CENTER.x, CENTER.y).setDepth(1);
    this.lines = this.add.graphics();
    this.nodeLayer = this.add.container(0, 0);
    this.ring = this.add.graphics();
    this.tree.add([this.lines, this.nodeLayer, this.ring]);
    this.tweens.add({ targets: this.ring, alpha: 0.35, duration: 500, yoyo: true, repeat: -1 });

    this.createHeader();
    this.createDetail();
    this.createControls();
    this.setupPan();
    this.redraw();
  }

  // ───────────── 머리 창 ─────────────
  createHeader() {
    const D = 10;
    const X = SIDE.x;
    const R = SIDE.x + SIDE.w;
    panel(this, X, 12, SIDE.w, 84, 'card').setDepth(D);
    const g = this.add.graphics().setDepth(D);
    drawIcon(g, 'crown', X + 28, 44, 21, 0xa8700c);
    this.fameText = uiText(this, X + 48, 44, '', 22, CSS.gold, 'bold').setOrigin(0, 0.5).setDepth(D);
    this.bestText = uiText(this, R - 20, 38, '', 12, CSS.sub, 'bold').setOrigin(1, 0.5).setDepth(D);
    this.countText = uiText(this, R - 20, 58, '', 12, CSS.sub, 'bold').setOrigin(1, 0.5).setDepth(D);
    uiText(this, X + 20, 74, '웨이브를 버틸 때마다 명성 · 강화는 영구 유지', 11, CSS.sub, 'bold').setOrigin(0, 0.5).setDepth(D);
  }

  // ───────────── 아래 정보 창 ─────────────
  createDetail() {
    const D = 10;
    const y = WIDE ? 108 : 688;
    const X = SIDE.x;
    const R = SIDE.x + SIDE.w;
    const wrap = { wordWrap: { width: SIDE.w - 40 } };
    panel(this, X, y, SIDE.w, WIDE ? 232 : 176, 'card').setDepth(D);
    this.dBranch = uiText(this, X + 20, y + 22, '', 13, CSS.sub, 'bold').setDepth(D);
    this.dName = uiText(this, X + 20, y + 42, '', 20, CSS.ink, 'bold').setDepth(D);
    this.dLevel = uiText(this, R - 20, y + 24, '', 14, CSS.sub, 'bold').setOrigin(1, 0).setDepth(D);
    this.dEffect = uiText(this, X + 20, y + 80, '', 15, CSS.ink, 'bold', wrap).setDepth(D);
    this.dNote = uiText(this, X + 20, y + (WIDE ? 130 : 108), '', 13, CSS.sub, 'bold', wrap).setDepth(D);
    this.buyBtn = new Button(this, R - 110, y + (WIDE ? 188 : 132), 168, 44, '강화', () => this.buySelected(), { variant: 'primary', fontSize: 16 }).setDepth(D);
  }

  createControls() {
    const D = 10;
    const bx = WIDE ? SIDE.x + SIDE.w / 2 : GAME_W / 2;
    if (this.fromGame) {
      new Button(this, bx, WIDE ? GAME_H - 54 : 916, WIDE ? SIDE.w : GAME_W - 48, 60, '닫고 전투로 (ESC)', () => this.close(), { variant: 'primary', fontSize: 20 }).setDepth(D);
      this.input.keyboard?.on('keydown-ESC', () => this.close());
    } else if (WIDE) {
      new Button(this, bx, GAME_H - 124, SIDE.w, 60, '게임 시작', () => this.scene.start('Game'), { variant: 'primary', fontSize: 20 }).setDepth(D);
      new Button(this, bx, GAME_H - 52, SIDE.w, 48, '영지로', () => slideTo(this, 'Lobby', undefined, -1), { variant: 'outline', fontSize: 16 }).setDepth(D);
    } else {
      new Button(this, GAME_W / 2 - 92, 916, 236, 60, '게임 시작', () => this.scene.start('Game'), { variant: 'primary', fontSize: 20 }).setDepth(D);
      new Button(this, GAME_W / 2 + 140, 916, 200, 60, '영지로', () => slideTo(this, 'Lobby', undefined, -1), { variant: 'outline', fontSize: 16 }).setDepth(D);
    }
    // 확대·축소·가운데로
    const zx = VIEW.right - 36;
    new Button(this, zx, VIEW.top + 24, 40, 40, '+', () => this.setZoom(this.zoom + 0.2), { variant: 'outline', fontSize: 20 }).setDepth(D);
    new Button(this, zx, VIEW.top + 70, 40, 40, '-', () => this.setZoom(this.zoom - 0.2), { variant: 'outline', fontSize: 20 }).setDepth(D);
    new Button(this, zx, VIEW.top + 116, 40, 40, '◎', () => this.recenter(), { variant: 'outline', fontSize: 16 }).setDepth(D);
  }

  /** 성탑에서 연 경우: 닫고 전투 재개 (GameScene 이 'resume' 에서 강화 효과를 다시 읽는다) */
  close() {
    if (!this.scene.isPaused('Game')) return slideTo(this, 'Lobby', undefined, -1); // 돌아갈 전투가 없으면 영지로 (옆으로 밀기)
    this.scene.stop();
    this.scene.resume('Game');
  }

  setZoom(z) {
    this.zoom = Phaser.Math.Clamp(z, 0.6, 1.8);
    this.tree.setScale(this.zoom);
    this.clampPan();
  }

  recenter() {
    this.tree.setPosition(CENTER.x, CENTER.y);
    this.setZoom(1);
  }

  get panLim() {
    return 160 + 200 * (this.zoom - 0.6);
  }

  clampPan() {
    const lim = this.panLim;
    this.tree.x = Phaser.Math.Clamp(this.tree.x, CENTER.x - lim, CENTER.x + lim);
    this.tree.y = Phaser.Math.Clamp(this.tree.y, CENTER.y - lim, CENTER.y + lim);
    this.kx?.sync(this.tree.x);
    this.ky?.sync(this.tree.y);
  }

  /** 끌어서 옮기기 — 관성 (2026-11-21): 놓으면 미끄러지고, 끝을 넘기면 고무줄처럼 돌아온다 */
  setupPan() {
    const axis = (key, c) =>
      new Kinetic(this, { min: () => c - this.panLim, max: () => c + this.panLim, value: this.tree[key], onChange: (v) => (this.tree[key] = Math.round(v)) });
    this.kx = axis('x', CENTER.x);
    this.ky = axis('y', CENTER.y);
    this.input.on('pointerdown', (p) => {
      this.moved = this.kx.moving || this.ky.moving; // 미끄러지는 중에 누르면 멈추기만 (노드 선택 안 함)
      if (p.worldY < VIEW.top || p.worldY > VIEW.bottom || p.worldX > VIEW.right) return;
      this.drag = { x: p.worldX, y: p.worldY };
      this.kx.down(p.downTime);
      this.ky.down(p.downTime);
    });
    this.input.on('pointermove', (p) => {
      if (!this.drag || !p.isDown) return;
      const dx = p.worldX - this.drag.x;
      const dy = p.worldY - this.drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 8) this.moved = true;
      if (!this.moved) return;
      this.kx.drag(dx, p.moveTime);
      this.ky.drag(dy, p.moveTime);
    });
    this.input.on('pointerup', (p) => {
      this.drag = null;
      this.kx.up(p.upTime);
      this.ky.up(p.upTime);
    });
    this.input.on('wheel', (_p, _o, _dx, dy) => this.setZoom(this.zoom - Math.sign(dy) * 0.1));
  }

  // ───────────── 트리 그리기 ─────────────
  /** 노드 상태: learned(배움) / max / open(배울 수 있음) / locked */
  nodeState(u) {
    const lv = meta.level(u.id);
    if (lv >= u.max) return 'max';
    if (lv > 0) return 'learned';
    return meta.status(u.id) === 'locked' ? 'locked' : 'open';
  }

  redraw() {
    this.fameText.setText(`명성 ${meta.fame.toLocaleString()}`);
    const best = meta.data.best;
    this.bestText.setText(`최고 기록 W${best.normal || 0}`);
    const learnedCount = UPGRADES.filter((u) => meta.level(u.id) > 0).length;
    this.countText.setText(`배운 노드 ${learnedCount} / ${UPGRADES.length}`);

    // 연결선
    const L = this.lines;
    L.clear();
    for (const u of UPGRADES) {
      if (!u.parent) continue;
      const a = this.pos[u.parent];
      const b = this.pos[u.id];
      const st = this.nodeState(u);
      const color = BRANCH_BY_ID[u.branch].color;
      if (st === 'locked') L.lineStyle(2, 0x3a3f55, 1);
      else if (st === 'open') L.lineStyle(2, color, 0.45);
      else L.lineStyle(3, color, 1);
      L.lineBetween(a.x, a.y, b.x, b.y);
    }

    // 노드
    this.nodeLayer.removeAll(true);
    for (const u of UPGRADES) this.drawNode(u);
    this.drawRing();
    this.refreshDetail();
  }

  drawNode(u) {
    const p = this.pos[u.id];
    const st = this.nodeState(u);
    const color = BRANCH_BY_ID[u.branch].color;
    const g = this.add.graphics();
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i * Math.PI) / 3;
      pts.push(new Phaser.Geom.Point(p.x + Math.cos(a) * HEX, p.y + Math.sin(a) * HEX));
    }
    const fill = st === 'locked' ? 0x1a1c2a : st === 'open' ? 0x222a3c : color;
    const stroke = st === 'locked' ? 0x3a3f55 : st === 'max' ? 0xffd36a : st === 'open' ? color : 0xeaf6ff;
    g.fillStyle(0x000000, 0.4).fillPoints(pts.map((q) => new Phaser.Geom.Point(q.x, q.y + 3)), true);
    g.fillStyle(fill, 1).fillPoints(pts, true);
    g.lineStyle(st === 'max' ? 3 : 2, stroke, 1).strokePoints(pts, true);
    const glyphColor = st === 'locked' ? '#4a5068' : st === 'open' ? '#' + color.toString(16).padStart(6, '0') : '#ffffff';
    const t = uiText(this, p.x, p.y, u.glyph, 13, glyphColor, 'bold', st === 'learned' || st === 'max' ? { stroke: '#10101a', strokeThickness: 3 } : {}).setOrigin(0.5);
    const parts = [g, t];
    const lv = meta.level(u.id);
    if (lv > 0) {
      parts.push(
        uiText(this, p.x + HEX - 2, p.y + HEX - 4, st === 'max' ? 'M' : `${lv}`, 10, st === 'max' ? '#ffd36a' : '#ffffff', 'bold', { stroke: '#10101a', strokeThickness: 3 }).setOrigin(0.5)
      );
    }
    const hit = this.add.zone(p.x, p.y, HEX * 2.4, HEX * 2.4).setInteractive({ useHandCursor: true });
    hit.on('pointerup', () => {
      if (this.moved) return;
      this.select(u.id);
    });
    parts.push(hit);
    this.nodeLayer.add(parts);
  }

  drawRing() {
    const p = this.pos[this.selected];
    this.ring.clear().lineStyle(3, 0xffffff, 1).strokeCircle(p.x, p.y, HEX + 7);
  }

  select(id) {
    this.selected = id;
    audio.init();
    this.drawRing();
    this.refreshDetail();
  }

  refreshDetail() {
    const u = UPGRADE_BY_ID[this.selected];
    const br = BRANCH_BY_ID[u.branch];
    const lv = meta.level(u.id);
    const status = meta.status(u.id);
    this.dBranch.setText(`${br.name} 갈래`).setColor(br.css);
    this.dName.setText(u.name);
    this.dLevel.setText(`Lv ${lv} / ${u.max}`);
    const now = lv ? formatEffect(u, lv) : '없음';
    const next = status === 'max' ? '최대' : formatEffect(u, lv + 1);
    this.dEffect.setText(`${u.label}: ${now}  ▶  ${next}`);
    const cost = upgradeCost(u, lv);
    if (status === 'max') {
      this.dNote.setText('최대 레벨입니다').setColor(CSS.gold);
      this.buyBtn.setLabel('MAX').setEnabled(false);
    } else if (status === 'locked') {
      this.dNote.setText(`먼저 「${UPGRADE_BY_ID[u.parent].name}」을(를) 배워야 열립니다`).setColor(CSS.red);
      this.buyBtn.setLabel(`잠김 · 명성 ${cost}`).setEnabled(false);
    } else {
      const hint = START_ONLY.has(u.id) ? '판을 시작할 때 적용 (전투 중이면 다음 판부터)' : '강화 버튼을 누르면 1레벨 올라갑니다 · 즉시 적용';
      this.dNote.setText(status === 'poor' ? `명성이 ${cost - meta.fame} 부족합니다` : hint).setColor(status === 'poor' ? CSS.red : CSS.sub);
      this.buyBtn.setLabel(`강화 · 명성 ${cost}`).setEnabled(status === 'ok');
    }
  }

  buySelected() {
    if (meta.buy(this.selected)) {
      audio.levelUp();
      const p = this.pos[this.selected];
      const flash = this.add.circle(p.x, p.y, HEX + 4, 0xffffff, 0.8);
      this.tree.add(flash);
      this.tweens.add({ targets: flash, scale: 2.2, alpha: 0, duration: 380, onComplete: () => flash.destroy() });
      this.redraw();
    }
  }

  /** 테스트용: 노드의 화면 좌표 */
  nodeScreenPos(id) {
    const p = this.pos[id];
    return { x: this.tree.x + p.x * this.zoom, y: this.tree.y + p.y * this.zoom };
  }
}
