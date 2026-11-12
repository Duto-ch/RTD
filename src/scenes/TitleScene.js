import Phaser from 'phaser';
import { GAME_W, GAME_H, PX } from '../config.js';
import { Button } from '../ui/Button.js';
import { audio } from '../systems/audio.js';
import { MERC_CLASS_IDS, HEROES } from '../data/heroes.js';
import { ATTRS } from '../data/elements.js';
import { panel, panelImage, titleTab, uiText, CSS } from '../ui/theme.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const cx = GAME_W / 2;
    audio.playMusic('title');
    this.add.image(0, 0, 'bg_grass').setOrigin(0).setScale(PX);

    // 제목 창
    const wx = 40;
    const wy = 120;
    const ww = GAME_W - 80;
    panel(this, wx, wy, ww, 196, 'card');
    titleTab(this, cx, wy, 'PROJECT RTD', 200);
    uiText(this, cx, wy + 76, '용병단 디펜스', 44, CSS.ink, 'bold', { stroke: '#f2dfb0', strokeThickness: 2 }).setOrigin(0.5);
    uiText(this, cx, wy + 126, '랜덤 타워 디펜스', 16, CSS.sub, 'bold').setOrigin(0.5);
    const hero = this.add.image(cx, wy + 196, 'hero_arthur').setScale(PX + 1);
    this.tweens.add({ targets: hero, y: wy + 190, duration: 420, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [2] });

    // 인벤토리 창: 영웅 9 · 용병 5
    const iy = 360;
    panel(this, wx, iy, ww, 232, 'card');
    titleTab(this, cx, iy, '용병단', 160);
    uiText(this, wx + 28, iy + 34, '영웅', 14, CSS.primary, 'bold');
    ATTRS.flatMap((attr) => HEROES[attr]).forEach((h, i) => {
      const x = wx + 44 + i * 48;
      panelImage(this, x, iy + 84, 'soft', 44, 44);
      this.add.image(x, iy + 84, `hero_${h.id}`).setScale(PX - 2);
    });
    uiText(this, wx + 28, iy + 124, '용병', 14, CSS.primary, 'bold');
    MERC_CLASS_IDS.forEach((cls, i) => {
      const x = wx + 76 + i * 76;
      panelImage(this, x, iy + 176, 'soft', 56, 56);
      const img = this.add.image(x, iy + 176, `merc_${cls}_${ATTRS[i % 3]}`).setScale(PX - 1);
      this.tweens.add({ targets: img, y: iy + 172, duration: 300, yoyo: true, repeat: -1, delay: i * 120, ease: 'Stepped' });
    });

    new Button(
      this,
      cx,
      652,
      GAME_W - 120,
      64,
      '게임 시작',
      () => {
        audio.init();
        this.scene.start('Game');
      },
      { variant: 'primary', fontSize: 22 }
    );

    // 규칙 창
    panel(this, wx, 714, ww, 156, 'card');
    uiText(
      this,
      cx,
      792,
      '용병을 고용하고, 같은 속성·같은 레벨끼리\n합쳐서 강화하세요.\n몬스터 100마리가 쌓이거나 보스가 한 바퀴 돌면 패배!\n100웨이브를 버티면 승리합니다.',
      13,
      CSS.ink,
      'bold',
      { align: 'center', lineSpacing: 8 }
    ).setOrigin(0.5);
    uiText(this, cx, GAME_H - 40, 'ESC: 메뉴 · 소리는 화면을 누른 뒤 재생돼요', 12, '#ffffff', 'bold', { stroke: '#2b1810', strokeThickness: 4 }).setOrigin(0.5);
  }
}
