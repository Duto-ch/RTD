import Phaser from 'phaser';
import { GAME_W, GAME_H, FONT, BALANCE } from './config.js';
import { skillOptions } from './data/skills.js';
import { setArt } from './systems/customArt.js';
import { audio } from './systems/audio.js';
import { HEROES } from './data/heroes.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UpgradeScene } from './scenes/UpgradeScene.js';
import { meta } from './systems/meta.js';

async function loadFonts() {
  const faces = [
    // 픽셀 글꼴 (UI·게임 월드 공통)
    new FontFace(FONT, 'url(assets/fonts/Galmuri11.woff2)'),
    new FontFace(FONT, 'url(assets/fonts/Galmuri11-Bold.woff2)', { weight: 'bold' }),
  ];
  try {
    for (const f of await Promise.all(faces.map((f) => f.load()))) document.fonts.add(f);
  } catch (e) {
    console.warn('폰트 로드 실패, 기본 폰트 사용', e);
  }
}

await loadFonts();

// 브라우저 정책: 첫 터치/클릭 후에만 소리를 낼 수 있다
window.addEventListener('pointerdown', () => audio.init());

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#2b1810',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, TitleScene, GameScene, UpgradeScene]
});

// 디버그용 (브라우저 콘솔에서 window.game 으로 접근)
window.game = game;
window.BALANCE = BALANCE; // 밸런스 실험용 (tools/balance-sim.cjs)
window.__rtd = { skillOptions, HEROES, audio, setArt, meta }; // 디버그·테스트용
