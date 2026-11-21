import Phaser from 'phaser';
import { hiRes } from '../systems/hires.js';
import { GAME_W, GAME_H, WIDE } from '../config.js';
import { Button } from '../ui/Button.js';
import { audio } from '../systems/audio.js';
import { uiText } from '../ui/theme.js';
import { meta } from '../systems/meta.js';

// 타이틀: 사용자가 준 일러스트(public/assets/title/title.webp, 2026-11-15) 한 장 + 깜빡이는 TAP TO START.
// 화면 아무 곳이나 누르면(또는 Space·Enter) 게임 시작, 아래 금색 버튼은 명성 강화
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

    // 일러스트 (도트 2px 통일, 2026-11-21): perfectPixel 로 정리한 그림을 2px 격자 크기(세로 272x482 · 가로 203x360)로 줄인 것을 정확히 2배로.
    // 가로 화면은 가운데 그림 + 양옆 어두운 밤하늘색 (예전엔 같은 그림을 크게 깔았는데 도트 크기가 달라 뺐다)
    if (WIDE) this.add.rectangle(0, 0, GAME_W, GAME_H, 0x22305a).setOrigin(0);
    this.add.image(cx, GAME_H / 2, WIDE ? 'title_bg_wide' : 'title_bg').setScale(2);

    // 제목 그림 아래: 깜빡이는 TAP TO START
    this.tapText = uiText(this, cx, WIDE ? 268 : 352, WIDE ? 'CLICK TO START' : 'TAP TO START', 27.5, '#ffffff', 'bold', { stroke: '#1d2c5a', strokeThickness: 6 }).setOrigin(0.5);
    // 부드러운 숨쉬기: 서서히 흐려졌다 밝아지며 아주 살짝 커졌다 작아진다 (2026-11-15, 이전 뚝뚝 끊기는 깜빡임)
    this.tweens.add({ targets: this.tapText, alpha: { from: 1, to: 0.25 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: this.tapText, scale: { from: 1, to: 1.05 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // 명성 강화 · 최고 기록 (아래쪽)
    const best = meta.data.best?.normal || 0;
    this.fameBtn = new Button(this, cx, GAME_H - (WIDE ? 76 : 92), WIDE ? 384 : GAME_W - 160, 48, `명성 강화  ·  보유 ${meta.fame.toLocaleString()}`, () => {
      audio.init();
      this.scene.start('Upgrade', { from: 'title' });
    }, { variant: 'gold', fontSize: 16.5 });
    uiText(this, cx, GAME_H - (WIDE ? 32 : 40), `최고 기록 W${best} · ESC: 메뉴`, 12, '#ffffff', 'bold', { stroke: '#1d2c5a', strokeThickness: 4 }).setOrigin(0.5);

    // 아무 곳이나 누르면 시작 (버튼 위는 제외)
    const start = () => {
      if (this.starting) return;
      this.starting = true;
      audio.init();
      this.scene.start('Lobby'); // 2026-11-17: 타이틀 → 영지(로비)
    };
    this.input.on('pointerup', (_p, objs) => {
      if (!objs.length) start();
    });
    this.input.keyboard?.on('keydown-SPACE', start);
    this.input.keyboard?.on('keydown-ENTER', start);
  }
}
