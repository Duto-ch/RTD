import Phaser from 'phaser';
import { hiRes } from '../systems/hires.js';
import { GAME_W, GAME_H, WIDE, UI_PX, PX } from '../config.js';
import { Button } from '../ui/Button.js';
import { panel, uiText, drawIcon, CSS, C } from '../ui/theme.js';
import { audio } from '../systems/audio.js';
import { meta } from '../systems/meta.js';
import { UPGRADES } from '../data/upgrades.js';
import { ROSTER_BY_ID, GRADES, DECK_POINTS, deckPoints } from '../data/roster.js';
import { charImage } from '../objects/Mercenary.js';

// 로비 = 용병단 영지 (2026-11-17, 시안 A '영지 지도형'). 건물이 곧 메뉴:
//   성탑(스킬 노드) · 병영(덱 편성) · 모집 천막(가챠, 3단계) · 대장간(장비, 4단계) · 성문/출전(전투 시작)
// 배경은 동화풍 일러스트를 캐릭터와 같은 3px 도트로 정리한 그림 (public/assets/lobby/lobby_<wide|tall>.png, 아트 1px = 화면 3px)

/** 건물 이름표 위치 (게임 좌표) · 누를 수 있는 건물 영역 */
const SPOTS = WIDE
  ? {
      tower: { tag: [622, 92], hit: [570, 110, 110, 190] },
      tent: { tag: [350, 150], hit: [270, 170, 160, 130] },
      barracks: { tag: [876, 196], hit: [780, 210, 180, 130] },
      forge: { tag: [342, 424], hit: [260, 430, 160, 120] },
      gate: { tag: [176, 268], hit: [90, 280, 150, 150] }
    }
  : {
      tower: { tag: [392, 236], hit: [222, 230, 110, 160] },
      tent: { tag: [118, 232], hit: [56, 250, 130, 110] },
      barracks: { tag: [392, 350], hit: [300, 370, 150, 110] },
      forge: { tag: [108, 536], hit: [40, 540, 120, 110] },
      gate: null
    };

const LABELS = {
  tower: ['성탑', '스킬 노드', 'tower'],
  tent: ['모집 천막', '용병 모집 · 준비 중', 'ticket'],
  barracks: ['병영', '덱 편성', 'userplus'],
  forge: ['대장간', '장비 강화 · 준비 중', 'anvil'],
  gate: ['성문', '출전', 'sword']
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
    const bg = this.add.image(0, 0, WIDE ? 'lobby_wide' : 'lobby_tall').setOrigin(0).setScale(UI_PX);
    if (WIDE) bg.setX(Math.round((GAME_W - bg.displayWidth) / 2));

    this.createTop();
    for (const id of Object.keys(SPOTS)) if (SPOTS[id]) this.createSpot(id);
    this.createDeckStrip();
    this.input.keyboard?.on('keydown-ENTER', () => this.go('Game'));
    this.input.keyboard?.on('keydown-SPACE', () => this.go('Game'));
  }

  go(scene, data) {
    if (this.leaving) return;
    this.leaving = true;
    audio.init();
    this.scene.start(scene, data);
  }

  /** 위: 용병단 이름·최고 기록 + 재화 3종 */
  createTop() {
    const best = meta.data.best?.normal || 0;
    const nameW = WIDE ? 230 : 200;
    panel(this, 16, 14, nameW, 52, 'strip');
    const crest = this.add.graphics();
    crest.fillStyle(0xf2c14e, 1).fillCircle(44, 40, 18).lineStyle(2, 0xa8801c, 1).strokeCircle(44, 40, 18);
    drawIcon(crest, 'crown', 44, 40, 14, 0x6b4505);
    uiText(this, 70, 27, '용병단 영지', 16.5, CSS.ink, 'bold');
    uiText(this, 70, 47, `최고 기록 WAVE ${best}`, 11, CSS.sub, '600');

    // 재화: 명성(노드) · 소환권(가챠, 3단계) · 강화석(장비, 4단계)
    const cur = [
      ['명성', meta.fame, 0xf2c14e, 'crown'],
      ['소환권', meta.data.tickets || 0, 0x9a6fe0, 'ticket'],
      ['강화석', meta.data.stones || 0, 0x2fbfb2, 'gem']
    ];
    const w = WIDE ? 150 : 162;
    cur.forEach(([label, n, col, icon], i) => {
      const x = WIDE ? GAME_W - 16 - (3 - i) * (w + 8) + 8 : 16 + i * (w + 8);
      const y = WIDE ? 14 : 74;
      panel(this, x, y, w, 40, 'strip');
      const g = this.add.graphics();
      g.fillStyle(col, 1).fillCircle(x + 22, y + 20, 13);
      drawIcon(g, icon, x + 22, y + 20, 10, 0xffffff);
      uiText(this, x + 42, y + 20, n.toLocaleString(), 16.5, CSS.ink, 'bold').setOrigin(0, 0.5);
      uiText(this, x + w - 14, y + 20, label, 11, CSS.sub, '600').setOrigin(1, 0.5);
    });
  }

  /** 건물 이름표 + 누르는 영역 */
  createSpot(id) {
    const S = SPOTS[id];
    const [name, sub, icon] = LABELS[id];
    const [tx, ty] = S.tag;
    const action = () => this.openSpot(id);
    // 건물 영역 (보이지 않음)
    const [hx, hy, hw, hh] = S.hit;
    this.add.zone(hx, hy, hw, hh).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerup', action);
    // 이름표 (알약)
    const t1 = uiText(this, 0, 0, name, 15, CSS.ink, 'bold');
    const t2 = uiText(this, 0, 0, sub, 11, CSS.sub, '600');
    const w = Math.ceil(Math.max(t1.width, t2.width) + 62);
    const h = 44;
    const x = Math.round(tx - w / 2);
    const y = Math.round(ty - h / 2);
    const c = this.add.container(0, 0);
    c.add(panel(this, x, y, w, h, 'strip'));
    const g = this.add.graphics();
    g.fillStyle(0x1f6f66, 1).fillCircle(x + 22, y + h / 2, 15);
    drawIcon(g, icon, x + 22, y + h / 2, 12, 0xfff3c4);
    c.add(g);
    t1.setPosition(x + 44, y + 5);
    t2.setPosition(x + 44, y + 24);
    c.add([t1, t2]);
    // 살 수 있는 노드 수 (성탑)
    if (id === 'tower') {
      const n = UPGRADES.filter((u) => meta.status(u.id) === 'ok').length;
      if (n) {
        const b = this.add.graphics();
        b.fillStyle(0xd9603f, 1).fillCircle(x + w - 4, y + 4, 11).lineStyle(2, 0xfff3dc, 1).strokeCircle(x + w - 4, y + 4, 11);
        c.add([b, uiText(this, x + w - 4, y + 4, String(n), 11, '#ffffff', 'bold').setOrigin(0.5)]);
      }
    }
    const hit = this.add.zone(x, y, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
    hit.on('pointerup', action);
    c.add(hit);
    this.tweens.add({ targets: c, y: -3, duration: 1200 + (tx % 5) * 80, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  openSpot(id) {
    if (id === 'tower') return this.go('Upgrade', { from: 'lobby' });
    if (id === 'barracks') return this.go('Deck');
    if (id === 'gate') return this.go('Game');
    this.toast(id === 'tent' ? '용병 모집(가챠)은 다음 단계에서 열립니다' : '장비 강화는 다음 단계에서 열립니다');
  }

  toast(msg) {
    this.toastObj?.destroy();
    const t = uiText(this, 0, 0, msg, 13, CSS.ink, 'bold').setOrigin(0.5);
    const w = Math.ceil(t.width + 40);
    const c = this.add.container(GAME_W / 2, WIDE ? 560 : 640, [panel(this, -w / 2, -18, w, 36, 'strip'), t]).setDepth(50);
    this.toastObj = c;
    this.tweens.add({ targets: c, alpha: 0, delay: 1600, duration: 300, onComplete: () => c.destroy() });
  }

  /** 아래: 출전 덱 (병영으로) + 출전 버튼 */
  createDeckStrip() {
    const ids = meta.deck;
    const pts = deckPoints(ids);
    const per = WIDE ? 22 : 11; // 한 줄에 놓는 수
    const step = WIDE ? 33 : 46;
    const rows = Math.ceil(ids.length / per);
    const pw = WIDE ? per * step + 24 : GAME_W - 32;
    const ph = 34 + rows * (step + 2) + 8;
    const px = 16;
    const py = WIDE ? GAME_H - 16 - ph : GAME_H - 108 - ph;
    panel(this, px, py, pw, ph, 'card');
    uiText(this, px + 16, py + 10, `출전 덱 ${ids.length}명`, 13, CSS.ink, 'bold');
    uiText(this, px + pw - 16, py + 10, `${pts} / ${DECK_POINTS} 포인트 · 병영에서 편성`, 11, CSS.sub, '600').setOrigin(1, 0);
    ids.forEach((id, i) => {
      const ch = ROSTER_BY_ID[id];
      const x = px + 12 + (i % per) * step + step / 2;
      const y = py + 34 + Math.floor(i / per) * (step + 2) + step / 2;
      const r = this.add.graphics();
      r.fillStyle(0xf3ead2, 1).fillRoundedRect(x - step / 2 + 2, y - step / 2 + 2, step - 4, step - 4, 7);
      r.lineStyle(2, Phaser.Display.Color.HexStringToColor(GRADES[ch.grade].color).color, 1).strokeRoundedRect(x - step / 2 + 2, y - step / 2 + 2, step - 4, step - 4, 7);
      charImage(this, x, y, ch, WIDE ? 1.5 : PX / 2 + 0.5);
    });
    const zone = this.add.zone(px, py, pw, ph).setOrigin(0).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => this.go('Deck'));

    const goW = WIDE ? 300 : GAME_W - 32;
    const goH = WIDE ? 84 : 76;
    const gx = WIDE ? GAME_W - 16 - goW / 2 : GAME_W / 2;
    const gy = GAME_H - 16 - goH / 2;
    this.goBtn = new Button(this, gx, gy, goW, goH, '출 전', () => this.go('Game'), { variant: 'gold', fontSize: 33 });
    uiText(this, gx, gy + 26, 'WAVE 1부터 · Space', 11, '#3a2a10', '600').setOrigin(0.5).setDepth(this.goBtn.depth + 1);
    this.goBtn.label.setY(-8);
  }
}
