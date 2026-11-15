import Phaser from 'phaser';
import { hiRes } from '../systems/hires.js';
import { GAME_W, GAME_H } from '../config.js';
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

    // 일러스트: 화면을 꽉 채우게(비율이 거의 같아 위아래 몇 px 만 잘림). 픽셀 격자가 아닌 그림이라 부드럽게 확대
    const bg = this.add.image(cx, GAME_H / 2, 'title_bg');
    this.textures.get('title_bg').setFilter(Phaser.Textures.FilterMode.LINEAR);
    bg.setScale(Math.max(GAME_W / bg.width, GAME_H / bg.height));

    // 제목 그림 아래: 깜빡이는 TAP TO START
    this.tapText = uiText(this, cx, 352, 'TAP TO START', 27.5, '#ffffff', 'bold', { stroke: '#1d2c5a', strokeThickness: 6 }).setOrigin(0.5);
    this.tweens.add({ targets: this.tapText, alpha: 0.15, duration: 520, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [2] });

    // 명성 강화 · 최고 기록 (아래쪽)
    const best = meta.data.best?.normal || 0;
    this.fameBtn = new Button(this, cx, GAME_H - 92, GAME_W - 160, 48, `명성 강화  ·  보유 ${meta.fame.toLocaleString()}`, () => {
      audio.init();
      this.scene.start('Upgrade', { from: 'title' });
    }, { variant: 'gold', fontSize: 16.5 });
    uiText(this, cx, GAME_H - 40, `최고 기록 W${best} · ESC: 메뉴`, 12, '#ffffff', 'bold', { stroke: '#1d2c5a', strokeThickness: 4 }).setOrigin(0.5);

    // 아무 곳이나 누르면 시작 (버튼 위는 제외)
    const start = () => {
      if (this.starting) return;
      this.starting = true;
      audio.init();
      this.scene.start('Game');
    };
    this.input.on('pointerup', (_p, objs) => {
      if (!objs.length) start();
    });
    this.input.keyboard?.on('keydown-SPACE', start);
    this.input.keyboard?.on('keydown-ENTER', start);
  }
}
