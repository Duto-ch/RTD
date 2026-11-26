import Phaser from 'phaser';
import { GAME_W, GAME_H, DEPTH } from '../../config.js';
import { Button } from '../../ui/Button.js';
import { panel, titleTab, uiText, drawIcon, C, CSS } from '../../ui/theme.js';
import { dissolveTo } from '../../ui/dissolve.js';
import { meta } from '../../systems/meta.js';

/** 판이 끝났을 때의 결과 창: 기록 줄 + 다시 하기·명성 강화·영지로 */
export class ResultScreen {
  constructor(scene) {
    /** @type {import('../GameScene.js').GameScene} */
    this.scene = scene;
  }

  show(victory, reason = '') {
    const s = this.scene;
    s.add.rectangle(0, 0, GAME_W, GAME_H, 0x1a0f08, victory ? 0.4 : 0.55).setOrigin(0).setDepth(DEPTH.overlay).setInteractive();
    const top = DEPTH.overlay + 3; // 폭죽(overlay+2) 위에 창
    const cw = 440;
    const ch = 510; // X·별 아이콘이 제목 탭에서 떨어지도록 위 여백 확보 (2026-11-15)
    const cx = GAME_W / 2;
    const cy0 = (GAME_H - ch) / 2;
    panel(s, cx - cw / 2, cy0, cw, ch, 'card').setDepth(top);
    for (const o of titleTab(s, cx, cy0, victory ? 'WIN!' : 'TRY AGAIN', 200)) o.setDepth(top);
    // 승리: 별 3개 (가운데 큰 별) / 패배: 큰 X
    const ico = s.add.graphics().setDepth(top);
    if (victory) {
      for (const [dx, dy, size] of [[-74, 74, 42], [0, 62, 63], [74, 74, 42]]) {
        drawIcon(ico, 'star', cx + dx + 3, cy0 + dy + 3, size, 0x6a4a10); // 그림자
        drawIcon(ico, 'star', cx + dx, cy0 + dy, size, 0xf2b33a);
      }
    } else {
      drawIcon(ico, 'cross', cx + 3, cy0 + 75, 56, 0x2b1810);
      drawIcon(ico, 'cross', cx, cy0 + 72, 56, 0x3a4fa8);
    }
    const title = uiText(s, cx, cy0 + 128, victory ? '용병단 해산' : '게임 오버', 26, victory ? CSS.primary : CSS.red, '700')
      .setOrigin(0.5)
      .setDepth(top);
    const newBest = s.wave > s.bestWave;
    const sub = victory ? '성 방어 성공' : `${reason}${newBest ? ' · 최고 기록 갱신!' : ''}`;
    if (sub) uiText(s, cx, cy0 + 160, sub, 13, CSS.sub, '600').setOrigin(0.5).setDepth(top);
    if (victory) {
      s.tweens.add({ targets: title, scale: 1.06, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const launch = () => s.vfx.firework(Phaser.Math.Between(60, GAME_W - 60), Phaser.Math.Between(120, 640));
      for (let i = 0; i < 6; i++) s.time.delayedCall(i * 150, launch);
      s.time.addEvent({ delay: 300, loop: true, callback: launch });
    }
    // 기록 줄 (거래 내역처럼)
    const heroes = s.mercs.filter((m) => m.isHero).length; // 유니크
    const rows = [
      ['도달 웨이브', `W${s.wave} (최고 W${Math.max(s.bestWave, s.wave)})`],
      ['처치한 몬스터', s.totalKills.toLocaleString()],
      ['유니크 · 마정석', `${heroes}명 · +${s.stonesEarned} (보유 ${meta.stones})`],
      ['획득 명성', `+${s.fameEarned} (보유 ${meta.fame})`]
    ];
    rows.forEach(([k, v], i) => {
      const y = cy0 + 196 + i * 38;
      if (i) s.add.rectangle(cx, y - 19, cw - 64, 4, C.line).setDepth(top);
      uiText(s, cx - cw / 2 + 36, y, k, 15, CSS.sub, '600').setOrigin(0, 0.5).setDepth(top);
      uiText(s, cx + cw / 2 - 36, y, v, 17, CSS.ink, '700').setOrigin(1, 0.5).setDepth(top);
    });
    const btns = {}; // 테스트가 누를 자리 (scene.endBtns)
    btns.retry = new Button(s, cx, cy0 + 376, cw - 64, 56, '다시 하기', () => s.scene.restart(), { variant: 'primary', fontSize: 18 }).setDepth(top);
    const bw = (cw - 64 - 12) / 2;
    btns.fame = new Button(s, cx - bw / 2 - 6, cy0 + 444, bw, 52, '명성 강화', () => dissolveTo(s, 'Upgrade', { from: 'result' }), { variant: 'gold', fontSize: 16 }).setDepth(top);
    btns.lobby = new Button(s, cx + bw / 2 + 6, cy0 + 444, bw, 52, '영지로', () => dissolveTo(s, 'Lobby'), { variant: 'outline', fontSize: 16 }).setDepth(top);
    return btns;
  }
}
