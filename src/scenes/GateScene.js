import Phaser from 'phaser';
import { hiRes } from '../systems/hires.js';
import { GAME_W, GAME_H } from '../config.js';
import { audio } from '../systems/audio.js';
import { pillImage } from '../ui/theme.js';

// 시작 화면 (2026-11-26 사용자 요청): 타이틀 앞 검은 화면 — 가운데 깜빡이는 도트 글자 'Plan_D' + 아래 캡슐 버튼 'Start'(도트 글자).
// 웹 브라우저는 사람이 직접 누르기 전엔 소리를 막는다 → 이 버튼을 누르는 순간 소리를 켜고 타이틀을 띄워 타이틀 곡이 처음부터 들린다.
// 누르면 타이틀이 페이드 인 + 16x16(화면 px) 블록 디졸브로 나타난다 (검은 가림막을 가운데부터 원형으로 걷어 냄)
export const GATE_MS = 1100; // 디졸브 시간 (페이드 인은 조금 더 길게)
const FADE_MS = 1300;
const BLOCK = 16; // 디졸브 블록 = 화면(캔버스) 16x16 px (2026-11-26, 이전 4)

// 5x7 도트 글자 (아래 줄 = 밑줄 '_' 자리)
const GLYPHS = {
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  l: ['01100', '00100', '00100', '00100', '00100', '00100', '01110'],
  a: ['00000', '00000', '01110', '00001', '01111', '10001', '01111'],
  n: ['00000', '00000', '10110', '11001', '10001', '10001', '10001'],
  _: ['00000', '00000', '00000', '00000', '00000', '00000', '11111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  t: ['00100', '00100', '11111', '00100', '00100', '00100', '00011'],
  r: ['00000', '00000', '10110', '11001', '10000', '10000', '10000']
};
const LOGO = 'Plan_D';
const DOT_PX = 4; // 'Plan_D' 도트 한 칸 (UI 좌표 — 화면 6px, 2026-11-26 절반으로)
const BTN_PX = 3; // 'Start' 도트 한 칸 (UI 좌표 — 화면 4.5px)
const CREAM = 0xfbf7ec;
const HOVER = 0xd8f0c0;
const BLINK_MS = 530; // 'Plan_D' 깜빡임 (켜짐·꺼짐 각각)

/** 도트 글자를 (cx, cy) 가운데에 그린다 */
function dotWord(g, word, cx, cy, px, color) {
  const cols = word.length * 6 - 1;
  const x0 = Math.round(cx - (cols * px) / 2);
  const y0 = Math.round(cy - (7 * px) / 2);
  g.clear().fillStyle(color, 1);
  [...word].forEach((ch, k) => {
    GLYPHS[ch].forEach((row, j) => {
      for (let i = 0; i < 5; i++) if (row[i] === '1') g.fillRect(x0 + (k * 6 + i) * px, y0 + j * px, px, px);
    });
  });
  return g;
}

export class GateScene extends Phaser.Scene {
  constructor() {
    super('Gate');
  }

  create() {
    hiRes(this);
    this.starting = false;
    this.veil = null;
    const cx = GAME_W / 2;
    const cy = GAME_H / 2;
    this.bg = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000).setOrigin(0);

    // 도트 글자 'Plan_D' — 뚝뚝 깜빡임 (실제 시간)
    this.logo = dotWord(this.add.graphics(), LOGO, cx, cy - 40 - (7 * DOT_PX) / 2, DOT_PX, CREAM);
    this.blinkT0 = performance.now();

    // 캡슐 버튼 'Start' (도트 글자, 깜빡임 없음)
    const bw = 140;
    const bh = 44;
    const by = cy + 40;
    const pill = pillImage(this, cx, by, bw, bh, 0x15151c, CREAM, 2);
    const label = dotWord(this.add.graphics(), 'Start', cx, by, BTN_PX, CREAM);
    const hit = this.add.zone(cx, by, bw, bh).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { pill.setTint(HOVER); dotWord(label, 'Start', cx, by, BTN_PX, HOVER); });
    hit.on('pointerout', () => { pill.clearTint(); dotWord(label, 'Start', cx, by, BTN_PX, CREAM); });
    hit.on('pointerup', () => this.begin());
    this.button = { pill, label, hit };

    this.input.keyboard?.on('keydown-SPACE', () => this.begin());
    this.input.keyboard?.on('keydown-ENTER', () => this.begin());
  }

  /** 버튼을 누름 (사람이 직접 누른 입력 안에서 소리를 켠다) */
  begin() {
    if (this.starting) return;
    this.starting = true;
    audio.init();
    audio.click();
    this.tweens.killAll();
    this.bg.destroy();
    this.logo.destroy();
    Object.values(this.button).forEach((o) => o.destroy());

    // 검은 가림막: 캔버스 1/4 해상도 그림 1장 — 한 칸 = 화면 4x4 px
    const W = this.scale.width;
    const H = this.scale.height;
    const cw = Math.ceil(W / BLOCK);
    const ch = Math.ceil(H / BLOCK);
    if (this.textures.exists('gate_veil')) this.textures.remove('gate_veil');
    const tex = this.textures.createCanvas('gate_veil', cw, ch);
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    const ctx = tex.getContext();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cw, ch);
    const img = ctx.getImageData(0, 0, cw, ch);
    // 걷어 낼 순서 = 가운데에서 먼 순 (가장자리는 블록 1~2개만큼 들쭉날쭉 — 둥글게 번지는 도트 원)
    const n = cw * ch;
    const dist = new Float32Array(n);
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) dist[j * cw + i] = Math.hypot(i + 0.5 - cw / 2, j + 0.5 - ch / 2) + Math.random() * 1.5;
    const order = Uint32Array.from({ length: n }, (_, i) => i).sort((a, b) => dist[a] - dist[b]);
    this.veil = { tex, ctx, img, order, n, done: 0, t0: performance.now() };
    this.veilImg = this.add.image(0, 0, 'gate_veil').setOrigin(0).setDisplaySize((cw * BLOCK * GAME_W) / W, (ch * BLOCK * GAME_H) / H);

    // 타이틀을 아래에 띄우고(타이틀 곡 시작) 페이드 인
    this.scene.launch('Title');
    this.scene.bringToTop();
    const title = this.scene.get('Title');
    title.events.once('create', () => title.cameras.main.fadeIn(FADE_MS, 0, 0, 0));
  }

  update() {
    if (!this.starting) this.logo.setVisible(Math.floor((performance.now() - this.blinkT0) / BLINK_MS) % 2 === 0);
    const v = this.veil;
    if (!v) return;
    const p = Math.min(1, (performance.now() - v.t0) / GATE_MS);
    // 원 반지름이 일정하게 커지도록 (넓이 ∝ p²)
    const target = Math.floor(v.n * p * p);
    const d = v.img.data;
    for (let k = v.done; k < target; k++) d[v.order[k] * 4 + 3] = 0;
    v.done = target;
    v.ctx.putImageData(v.img, 0, 0);
    v.tex.refresh();
    if (p >= 1) {
      this.veil = null;
      this.veilImg.destroy();
      this.textures.remove('gate_veil');
      this.scene.stop();
    }
  }
}
