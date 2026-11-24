import Phaser from 'phaser';
import { hiRes } from '../systems/hires.js';
import { GAME_W, GAME_H } from '../config.js';
import { audio } from '../systems/audio.js';
import { uiText, coverImage } from '../ui/theme.js';
import { meta } from '../systems/meta.js';
import { dissolveTo } from '../ui/dissolve.js';

// 타이틀 (2026-11-24 사용자 그림): 가로 키 아트 한 장(로고 'Slop Mercenaries' 포함) + 로고 아래 숨쉬는 CLICK TO START.
// 화면 아무 곳이나 누르면(또는 Space·Enter) 영지로. 명성 강화(성탑) 버튼은 없앰 — 성탑은 영지 메뉴에서
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    hiRes(this);
    this.starting = false; // 장면 객체는 다시 쓰이므로 매번 초기화
    const cx = GAME_W / 2;
    audio.playMusic('title');
    meta.load();

    // 키 아트 (1920x1080 원본 그대로 화면을 채움)
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x2a6fd8).setOrigin(0);
    if (this.textures.exists('title_key')) coverImage(this, 'title_key', GAME_W, GAME_H);

    // 로고 아래(로고 밑줄 = 그림 y 400 → UI 267, 로고 가운데 x 505 → UI 337): 숨쉬는 CLICK TO START
    this.tapText = uiText(this, 337, 296, 'CLICK TO START', 27.5, '#ffffff', 'bold', { stroke: '#1d2c5a', strokeThickness: 6 }).setOrigin(0.5);
    // 부드러운 숨쉬기: 서서히 흐려졌다 밝아지며 아주 살짝 커졌다 작아진다 (2026-11-15, 이전 뚝뚝 끊기는 깜빡임)
    this.tweens.add({ targets: this.tapText, alpha: { from: 1, to: 0.25 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: this.tapText, scale: { from: 1, to: 1.05 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // 최고 기록 (아래쪽) — 명성 강화 버튼은 없앰 (2026-11-24 사용자 요청)
    const best = meta.data.best?.normal || 0;
    uiText(this, cx, GAME_H - 32, `최고 기록 W${best} · ESC: 메뉴`, 12, '#ffffff', 'bold', { stroke: '#1d2c5a', strokeThickness: 4 }).setOrigin(0.5);

    // 아무 곳이나 누르면 시작 (버튼 위는 제외)
    const start = () => {
      if (this.starting) return;
      this.starting = true;
      audio.init();
      dissolveTo(this, 'Lobby'); // 2026-11-17: 타이틀 → 영지(로비), 디졸브 (2026-11-23)
    };
    this.input.on('pointerup', (_p, objs) => {
      if (!objs.length) start();
    });
    this.input.keyboard?.on('keydown-SPACE', start);
    this.input.keyboard?.on('keydown-ENTER', start);
  }
}
