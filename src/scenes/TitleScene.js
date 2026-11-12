import Phaser from 'phaser';
import { GAME_W, GAME_H, PX } from '../config.js';
import { Button } from '../ui/Button.js';
import { audio } from '../systems/audio.js';
import { MERC_CLASS_IDS, HEROES } from '../data/heroes.js';
import { ATTRS } from '../data/elements.js';
import { panel, panelKey, backdropKey, uiText, CSS } from '../ui/theme.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const cx = GAME_W / 2;
    audio.playMusic('title');
    this.add.image(0, 0, backdropKey(this, GAME_W, GAME_H)).setOrigin(0);

    // 로고: 보라 원 안의 영웅
    this.add.image(cx, 150, panelKey(this, 'primary', 116, 116, 58));
    const logoHero = this.add.image(cx, 146, 'hero_arthur').setScale(PX + 1);
    this.tweens.add({ targets: logoHero, y: 140, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    uiText(this, cx, 256, '용병단 디펜스', 40, CSS.ink, '700').setOrigin(0.5);
    uiText(this, cx, 298, 'PROJECT RTD · 랜덤 타워 디펜스', 15, CSS.sub, '600').setOrigin(0.5);

    // 영웅·용병 카드
    const cardX = 40;
    const cardY = 340;
    const cardW = GAME_W - 80;
    panel(this, cardX, cardY, cardW, 236, 'card', 28);
    uiText(this, cardX + 24, cardY + 22, '영웅', 14, CSS.primary, '700');
    ATTRS.flatMap((attr) => HEROES[attr]).forEach((h, i) => {
      this.add.image(cardX + 44 + i * 47, cardY + 84, `hero_${h.id}`).setScale(PX - 1);
    });
    this.add.rectangle(cx, cardY + 128, cardW - 48, 1, 0xe6e0fa);
    uiText(this, cardX + 24, cardY + 142, '용병', 14, CSS.primary, '700');
    MERC_CLASS_IDS.forEach((cls, i) => {
      const attr = ATTRS[i % 3];
      const img = this.add.image(cardX + 70 + i * 82, cardY + 196, `merc_${cls}_${attr}`).setScale(PX - 1);
      this.tweens.add({ targets: img, y: cardY + 190, duration: 300, yoyo: true, repeat: -1, delay: i * 120, ease: 'Stepped' });
    });

    new Button(
      this,
      cx,
      652,
      GAME_W - 120,
      60,
      '게임 시작',
      () => {
        audio.init();
        this.scene.start('Game');
      },
      { variant: 'primary', fontSize: 20 }
    );

    uiText(
      this,
      cx,
      770,
      '용병을 고용하고, 같은 속성·같은 레벨끼리 합쳐 강화하세요.\n몬스터가 100마리 쌓이거나 보스가 한 바퀴 돌면 패배!\n100웨이브를 버티면 승리합니다.',
      14,
      CSS.sub,
      '600',
      { align: 'center', lineSpacing: 8 }
    ).setOrigin(0.5);
    uiText(this, cx, GAME_H - 30, 'ESC: 메뉴 · 소리는 화면을 누른 뒤 재생돼요', 12, '#b0a8d0', '600').setOrigin(0.5);
  }
}
