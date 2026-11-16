import Phaser from 'phaser';
import { GAME_W, GAME_H, FONT, BALANCE, RES, crispFontSize, COZY_FONT, COZY_HEAD } from './config.js';
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
    // 포근한 카드형 UI 글꼴 (OFL, 게임에 쓰는 글자만 남긴 부분 글꼴)
    new FontFace(COZY_FONT, 'url(assets/fonts/GowunDodum-Regular.woff2)'),
    new FontFace(COZY_HEAD, 'url(assets/fonts/GowunBatang-Regular.woff2)'),
    new FontFace(COZY_HEAD, 'url(assets/fonts/GowunBatang-Bold.woff2)', { weight: 'bold' }),
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

// 모든 글자: 크기를 픽셀 글꼴 격자에 맞추고 RES 배 해상도로 그린다 (흐림·뭉개짐 없이 선명하게)
const addText = Phaser.GameObjects.GameObjectFactory.prototype.text;
Phaser.GameObjects.GameObjectFactory.prototype.text = function (x, y, text, style = {}) {
  const st = { ...style, resolution: RES };
  const px = parseFloat(st.fontSize);
  // 픽셀 글꼴(Galmuri11)만 격자 크기로 맞춘다 (고운 글꼴은 어떤 크기든 매끈하다)
  if (px && (!st.fontFamily || st.fontFamily === FONT)) st.fontSize = `${crispFontSize(px)}px`;
  return addText.call(this, x, y, text, st);
};

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W * RES, // 실제 캔버스 해상도. 각 장면 카메라가 zoom RES 로 게임 좌표(GAME_W x GAME_H)를 채운다
  height: GAME_H * RES,
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
