import Phaser from 'phaser';
import { hiRes } from '../systems/hires.js';
import { GAME_W, GAME_H } from '../config.js';
import { audio } from '../systems/audio.js';
import { uiText, pillImage } from '../ui/theme.js';

// 시작 화면 (2026-11-26 사용자 요청): 타이틀 앞 검은 화면 — 가운데 도트 글자 'Plan_D' + 아래 캡슐 버튼 '시작합니다'.
// 웹 브라우저는 사람이 직접 누르기 전엔 소리를 막는다 → 이 버튼을 누르는 순간 소리를 켜고 타이틀을 띄워 타이틀 곡이 처음부터 들린다.
// 누르면 타이틀이 페이드 인 + 4x4(화면 px) 블록 디졸브로 나타난다 (검은 가림막을 블록 단위로 무작위로 걷어 냄)
export const GATE_MS = 1100; // 디졸브 시간 (페이드 인은 조금 더 길게)
const FADE_MS = 1300;
const BLOCK = 4; // 디졸브 블록 = 화면(캔버스) 4x4 px

// 5x7 도트 글자 (아래 줄 = 밑줄 '_' 자리)
const GLYPHS = {
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  l: ['01100', '00100', '00100', '00100', '00100', '00100', '01110'],
  a: ['00000', '00000', '01110', '00001', '01111', '10001', '01111'],
  n: ['00000', '00000', '10110', '11001', '10001', '10001', '10001'],
  _: ['00000', '00000', '00000', '00000', '00000', '00000', '11111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110']
};
const LOGO = 'Plan_D';
const DOT_PX = 8; // 글자 도트 한 칸 (UI 좌표 — 화면 12px)

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

    // 도트 글자 'Plan_D'
    const cols = LOGO.length * 6 - 1;
    const x0 = Math.round(cx - (cols * DOT_PX) / 2);
    const y0 = Math.round(cy - 40 - 7 * DOT_PX);
    const g = this.add.graphics();
    g.fillStyle(0xfbf7ec, 1);
    [...LOGO].forEach((ch, k) => {
      GLYPHS[ch].forEach((row, j) => {
        for (let i = 0; i < 5; i++) if (row[i] === '1') g.fillRect(x0 + (k * 6 + i) * DOT_PX, y0 + j * DOT_PX, DOT_PX, DOT_PX);
      });
    });
    this.logo = g;

    // 캡슐 버튼 '시작합니다'
    const bw = 180;
    const bh = 44;
    const by = cy + 40;
    const pill = pillImage(this, cx, by, bw, bh, 0x15151c, 0xfbf7ec, 2);
    const label = uiText(this, cx, by, '시작합니다', 18, '#fbf7ec', 'bold').setOrigin(0.5);
    const hit = this.add.zone(cx, by, bw, bh).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { pill.setTint(0xd8f0c0); label.setColor('#d8f0c0'); });
    hit.on('pointerout', () => { pill.clearTint(); label.setColor('#fbf7ec'); });
    hit.on('pointerup', () => this.begin());
    this.button = { pill, label, hit };
    this.tweens.add({ targets: [pill, label], alpha: { from: 1, to: 0.6 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

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
    // 걷어 낼 순서 = 무작위 순열
    const n = cw * ch;
    const order = new Uint32Array(n);
    for (let i = 0; i < n; i++) order[i] = i;
    for (let i = n - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = order[i]; order[i] = order[j]; order[j] = t;
    }
    this.veil = { tex, ctx, img, order, n, done: 0, t0: performance.now() };
    this.veilImg = this.add.image(0, 0, 'gate_veil').setOrigin(0).setDisplaySize((cw * BLOCK * GAME_W) / W, (ch * BLOCK * GAME_H) / H);

    // 타이틀을 아래에 띄우고(타이틀 곡 시작) 페이드 인
    this.scene.launch('Title');
    this.scene.bringToTop();
    const title = this.scene.get('Title');
    title.events.once('create', () => title.cameras.main.fadeIn(FADE_MS, 0, 0, 0));
  }

  update() {
    const v = this.veil;
    if (!v) return;
    const p = Math.min(1, (performance.now() - v.t0) / GATE_MS);
    // 처음엔 천천히, 뒤로 갈수록 빠르게 걷힌다
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
