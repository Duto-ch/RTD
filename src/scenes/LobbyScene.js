import Phaser from 'phaser';
import { hiRes } from '../systems/hires.js';
import { GAME_W, GAME_H, UI_PX, PX } from '../config.js';
import { Button } from '../ui/Button.js';
import { panel, uiText, drawIcon, CSS, C, coverImage, discImage, tabBar } from '../ui/theme.js';
import { audio } from '../systems/audio.js';
import { meta } from '../systems/meta.js';
import { UPGRADES } from '../data/upgrades.js';
import { ROSTER_BY_ID, GRADES, DECK_RULES } from '../data/roster.js';
import { charImage } from '../objects/Mercenary.js';
import { Kinetic } from '../ui/kinetic.js';
import { dissolveTo } from '../ui/dissolve.js';
import { openSettingsMenu, quitApp } from '../ui/settingsMenu.js';

// 로비 = 용병단 영지. 메뉴: 성탑(스킬 노드) · 병영(덱 편성) · 술집(마정석 고용) · 유물 공방(마정석 유물 생산·장착). 출전은 아래 덱 줄의 버튼
// 2026-11-22 사용자 결정: 배경 = 사용자 그림(해 질 녘 호숫가 성, public/assets/lobby/lobby_bg.webp — 원본 941x1672 그대로, 도트로 줄이지 않음)
//   메뉴 버튼은 그림 위 건물 자리 대신 **오른쪽 정렬 세로 줄**, 누르면 디졸브로 넘어간다(src/ui/dissolve.js, 2026-11-23 — 이전 옆으로 밀기)

/** 메뉴 버튼 순서 (오른쪽 세로 줄 위 → 아래) */
const SPOTS = ['tower', 'barracks', 'tent', 'forge'];
const MENU = { right: GAME_W - 16, top: 92, w: 188, h: 52, gap: 12 };
// 위 바·아래 독 (2026-11-24 사용자 시안: 전투 화면과 같은 가운데 탭 바)
const TOP = { h: 48, tab: { x0: 508, x1: 772, depth: 28, slope: 44 } };
const DOCK = { y: 598, tab: { x0: 380, x1: 900, depth: 28, slope: 44 } };

const LABELS = {
  tower: ['성탑', '스킬 노드', 'tower'],
  tent: ['술집', '용병 고용', 'userplus'],
  barracks: ['병영', '덱 편성', 'sword'],
  forge: ['유물 공방', '유물 생산·장착', 'gem']
};

export class LobbyScene extends Phaser.Scene {
  constructor() {
    super('Lobby');
  }

  create() {
    hiRes(this);
    meta.load();
    this.leaving = false;
    audio.playMusic('title');
    const bg = this.add.image(0, 0, 'lobby_wide').setOrigin(0).setScale(UI_PX);
    bg.setX(Math.round((GAME_W - bg.displayWidth) / 2)); // 사용자 그림 원본 그대로 (2026-11-22)

    this.createTop();
    SPOTS.forEach((id, i) => this.createSpot(id, i));
    this.createDeckStrip();
    this.input.keyboard?.on('keydown-ENTER', () => !this.menu && this.go('Game'));
    this.input.keyboard?.on('keydown-SPACE', () => !this.menu && this.go('Game'));
    // ESC 메뉴 (2026-11-22 사용자 요청): 볼륨·음소거·튜토리얼 + 게임 종료(영지에서는 게임을 완전히 끝냄)
    this.menu = null;
    this.input.keyboard?.on('keydown-ESC', () => this.toggleMenu());
  }

  toggleMenu() {
    if (this.menu) return this.closeMenu();
    if (this.leaving || this.transitioning) return;
    audio.init();
    this.menu = openSettingsMenu(this, { onClose: () => this.closeMenu(), onQuit: () => quitApp(this.game) });
  }

  closeMenu() {
    this.menu?.destroy(true);
    this.menu = null;
  }

  go(scene, data) {
    if (this.menu) return;
    if (this.leaving || this.transitioning) return; // 영지가 아직 디졸브로 나타나는 중이면 무시
    this.leaving = true;
    audio.init();
    if (!dissolveTo(this, scene, data)) this.leaving = false; // 출전(전투)도 디졸브 (2026-11-23)
  }

  /** 위: 왼쪽 용병단 이름·최고 기록 / 오른쪽 재화 2종 (2026-11-21: 같은 높이로 오른쪽 위에) */
  createTop() {
    const best = meta.data.best?.normal || 0;
    // 2026-11-24 사용자 시안: 전투 화면처럼 화면 위에 붙은 크림 바 + 가운데 탭(최고 기록). 이름·재화는 바 위에 바로
    const H = TOP.h;
    tabBar(this, 'top', H, TOP.tab);
    discImage(this, 40, H / 2, { r: 16, fill: 0xf2c14e, line: 0xa8801c, lw: 2, icon: 'crown', iconColor: 0x6b4505 }); // 미리 그린 원 (2026-11-23)
    uiText(this, 64, H / 2, '용병단 영지', 18, CSS.ink, 'bold').setOrigin(0, 0.5);
    uiText(this, GAME_W / 2, H + TOP.tab.depth / 2 - 2, `최고 기록 WAVE ${best}`, 13, CSS.primary, 'bold').setOrigin(0.5);

    // 재화: 명성(노드) · 마정석(보스 처치 → 술집·유물 공방, 룰 v2)
    const cur = [
      ['명성', meta.fame, 0xf2c14e, 'crown'],
      ['마정석', meta.stones, 0x2fbfb2, 'gem']
    ];
    const w = 150;
    const gap = 12;
    cur.forEach(([label, n, col, icon], i) => {
      const x = GAME_W - 16 - (cur.length - i) * w - (cur.length - 1 - i) * gap;
      discImage(this, x + 18, H / 2, { r: 15, fill: col, icon });
      uiText(this, x + 40, 4, n.toLocaleString(), 16.5, CSS.ink, 'bold');
      uiText(this, x + 40, 28, label, 11, CSS.sub, '600');
    });
  }

  /** 메뉴 버튼 (진한 테두리 menu 스타일) — 2026-11-22: 오른쪽 정렬 세로 줄, 폭은 모두 같게 */
  createSpot(id, i) {
    const [name, sub, icon] = LABELS[id];
    const action = () => this.openSpot(id);
    const t1 = uiText(this, 0, 0, name, 16.5, CSS.ink, 'bold');
    const t2 = uiText(this, 0, 0, sub, 11, CSS.sub, '600');
    const w = MENU.w;
    const h = MENU.h;
    const tx = MENU.right - w / 2;
    const ty = MENU.top + h / 2 + i * (h + MENU.gap);
    const c = this.add.container(Math.round(tx), Math.round(ty)); // 가운데 기준 (눌림 효과가 가운데로 줄어들게)
    c.add(panel(this, -w / 2, -h / 2, w, h, 'menu'));
    const ix = -w / 2 + 26;
    c.add(discImage(this, ix, 0, { r: 16.5, fill: 0x1f6f66, line: 0x6b4e2a, lw: 3, icon, iconColor: 0xfff3c4 })); // 바깥 18 · 안 15 (2026-11-23 미리 그린 원)
    t1.setPosition(ix + 24, -h / 2 + 7);
    t2.setPosition(ix + 24, -h / 2 + 30);
    c.add([t1, t2]);
    // 살 수 있는 노드 수 (성탑)
    if (id === 'tower') {
      const n = UPGRADES.filter((u) => meta.status(u.id) === 'ok').length;
      if (n) {
        const b = discImage(this, w / 2 - 4, -h / 2 + 4, { r: 11, fill: 0xd9603f, line: 0xfff3dc, lw: 2 });
        c.add([b, uiText(this, w / 2 - 4, -h / 2 + 4, String(n), 11, '#ffffff', 'bold').setOrigin(0.5)]);
      }
    }
    const hit = this.add.zone(-w / 2, -h / 2, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => c.setScale(0.96));
    hit.on('pointerout', () => c.setScale(1));
    hit.on('pointerup', () => {
      c.setScale(1);
      action();
    });
    c.add(hit);
    this.spots = { ...this.spots, [id]: c };
  }

  openSpot(id) {
    if (id === 'tower') return this.go('Upgrade', { from: 'lobby' });
    if (id === 'barracks') return this.go('Deck');
    if (id === 'tent') return this.go('Tavern');
    if (id === 'forge') return this.go('Workshop');
  }

  toast(msg) {
    this.toastObj?.destroy();
    const t = uiText(this, 0, 0, msg, 13, CSS.ink, 'bold').setOrigin(0.5);
    const w = Math.ceil(t.width + 40);
    const c = this.add.container(GAME_W / 2, 528, [panel(this, -w / 2, -18, w, 36, 'strip'), t]).setDepth(50); // 아래 독 탭 위로 (2026-11-24)
    this.toastObj = c;
    this.tweens.add({ targets: c, alpha: 0, delay: 1600, duration: 300, onComplete: () => c.destroy() });
  }

  /**
   * 아래 독 (2026-11-21): 출전 버튼과 한 판에 붙인 출전 덱 — 큰 카드 한 줄, 좌우로 밀어서 본다. 카드를 누르면 병영(덱 편성)
   * 세로: 화면 아래 시트(덱 줄 위 + 출전 버튼 아래) / 가로: 아래 띠(덱 줄 왼쪽 + 출전 버튼 오른쪽)
   */
  createDeckStrip() {
    const ids = [...meta.deck].sort((a, b) => ROSTER_BY_ID[b].grade - ROSTER_BY_ID[a].grade);
    const goW = 280;
    const goH = 92;
    // 2026-11-24 사용자 시안: 화면 아래에 붙은 크림 독 + 가운데 탭(출전 덱 제목)
    const D = { x: 0, y: DOCK.y, w: GAME_W, h: GAME_H - DOCK.y };
    tabBar(this, 'bottom', D.y, DOCK.tab);
    // 카드 줄 (가려지는 영역)
    const row = { x: 24, y: D.y + 12, w: D.w - goW - 72, h: 80 };
    uiText(this, GAME_W / 2, D.y - DOCK.tab.depth / 2 + 2, `출전 덱 ${ids.length} / ${DECK_RULES.max}명  ·  밀어서 보기 · 누르면 병영`, 13, CSS.ink, 'bold').setOrigin(0.5);
    const cw = 64;
    const ch = 76;
    const step = cw + 8;
    const strip = this.add.container(row.x, row.y);
    ids.forEach((id, i) => {
      const c = ROSTER_BY_ID[id];
      const x = i * step + 2; // 테두리(3) 가 가림 영역 왼쪽 끝에 잘리지 않게
      const g = this.add.graphics();
      g.fillStyle(0xf3ead2, 1).fillRoundedRect(x, 2, cw, ch, 10);
      g.lineStyle(3, Phaser.Display.Color.HexStringToColor(GRADES[c.grade].color).color, 1).strokeRoundedRect(x, 2, cw, ch, 10);
      const img = charImage(this, x + cw / 2, 2 + ch / 2 - 6, c, 3);
      const nm = uiText(this, x + cw / 2, 2 + ch - 6, c.name, 11, CSS.ink, 'bold').setOrigin(0.5, 1);
      strip.add([g, img, nm]);
    });
    const shape = this.make.graphics({}, false).fillRect(row.x, row.y, row.w, row.h);
    strip.setMask(shape.createGeometryMask());
    strip.maskRect = row; // 보이는 영역 (tools/ui-audit.cjs)
    const maxScroll = Math.max(0, ids.length * step - 8 + 4 - row.w);
    // 관성 스크롤 (2026-11-21): 밀다 놓으면 미끄러지고, 끝을 넘기면 고무줄처럼 돌아온다
    const kin = new Kinetic(this, {
      min: 0,
      max: maxScroll,
      onChange: (v) => {
        this.deckScroll = v;
        strip.x = Math.round(row.x - v); // 정수 위치 (자글거림 방지)
      }
    });
    this.deckScroll = 0;
    this.deckKin = kin;
    this.setDeckScroll = (v) => kin.scrollBy(v - kin.value);
    this.deckStrip = strip;
    // 밀기 · 휠 · 누르기 (미끄러지는 중에 누르면 멈추기만)
    const zone = this.add.zone(row.x, row.y, row.w, row.h).setOrigin(0).setInteractive({ useHandCursor: true });
    let drag = null;
    zone.on('pointerdown', (p) => {
      drag = { x: p.worldX, moved: kin.moving };
      kin.down(p.downTime);
    });
    this.input.on('pointermove', (p) => {
      if (!drag || !p.isDown) return;
      const dx = p.worldX - drag.x;
      if (Math.abs(dx) > 6) drag.moved = true;
      if (drag.moved) kin.drag(-dx, p.moveTime);
    });
    this.input.on('pointerup', (p) => {
      const d = drag;
      drag = null;
      kin.up(p.upTime);
      if (d && !d.moved) this.go('Deck');
    });
    this.input.on('wheel', (p, _o, dx, dy) => {
      if (p.worldX >= row.x && p.worldX <= row.x + row.w && p.worldY >= row.y && p.worldY <= row.y + row.h) kin.scrollBy((dx || dy) * 0.6);
    });
    // 남은 카드가 있으면 오른쪽 끝에 흐림 표시
    if (maxScroll > 0) {
      const f = this.add.graphics();
      for (let k = 0; k < 6; k++) f.fillStyle(0xfbf7ec, 0.16 * (k + 1)).fillRect(row.x + row.w - 24 + k * 4, row.y, 4, row.h);
    }

    const gx = D.x + D.w - 24 - goW / 2;
    const gy = D.y + D.h / 2;
    this.goBtn = new Button(this, gx, gy, goW, goH, '출 전', () => this.go('Game'), { variant: 'gold', fontSize: 33 });
    uiText(this, gx, gy + 24, 'WAVE 1부터 · Space', 11, '#3a2a10', '600').setOrigin(0.5).setDepth(this.goBtn.depth + 1);
    this.goBtn.label.setY(-8);
    this.goBtn.auditOk = true; // 글자를 위로 올리고 아래에 작은 안내 (의도 — tools/ui-audit.cjs 에서 제외)
  }
}
