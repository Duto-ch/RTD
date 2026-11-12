import Phaser from 'phaser';
import { GAME_W, GAME_H, PX, FONT } from '../config.js';
import { Button } from '../ui/Button.js';
import { MERC_CLASS_IDS, HEROES } from '../data/heroes.js';
import { ATTRS } from '../data/elements.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const cx = GAME_W / 2;
    this.add.image(0, 0, 'background').setOrigin(0).setScale(PX);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0d0d14, 0.6).setOrigin(0);

    this.add
      .text(cx, 230, '용병단 디펜스', { fontFamily: FONT, fontSize: '55px', color: '#f2c14e', stroke: '#1b1b26', strokeThickness: 10 })
      .setOrigin(0.5);
    this.add.text(cx, 296, 'PROJECT RTD', { fontFamily: FONT, fontSize: '22px', color: '#cfd8ff' }).setOrigin(0.5);

    // 영웅 (뒷줄) + 용병 행렬 (앞줄)
    ATTRS.forEach((attr, i) => {
      const h = HEROES[attr][i];
      this.add.image(cx + (i - 1) * 96, 400, `hero_${h.arch}_${attr}`).setScale(PX + 1);
    });
    MERC_CLASS_IDS.forEach((cls, i) => {
      const attr = ATTRS[i % 3];
      const img = this.add.image(cx + (i - 2) * 80, 510, `merc_${cls}_${attr}`).setScale(PX);
      this.tweens.add({ targets: img, y: 502, duration: 300, yoyo: true, repeat: -1, delay: i * 120, ease: 'Stepped' });
    });

    new Button(this, cx, 650, 280, 84, '게임 시작', () => this.scene.start('Game'), { color: 0x2f7d4a, fontSize: 33 });

    this.add
      .text(
        cx,
        780,
        '용병을 고용하고, 같은 속성·같은 레벨끼리 합쳐 강화하세요.\n몬스터가 100마리 쌓이거나 보스가 한 바퀴 돌면 패배!\n100웨이브를 버티면 승리합니다.',
        { fontFamily: FONT, fontSize: '16px', color: '#d6dbea', align: 'center', lineSpacing: 8 }
      )
      .setOrigin(0.5);
  }
}
