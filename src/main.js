import { waveInfo, monsterStats } from './data/waves.js';
import Phaser from 'phaser';
import { WORLD_W, WORLD_H, FONT, BALANCE, RES, TEXT_RES, crispFontSize, displayScale } from './config.js';
import { skillOptions } from './data/skills.js';
import { setArt, setFacing, playOnce, animMs, hitDelay } from './systems/customArt.js';
import { cellCenter } from './systems/path.js';
import { audio } from './systems/audio.js';
import { HEROES } from './data/heroes.js';
import { BootScene } from './scenes/BootScene.js';
import { GateScene } from './scenes/GateScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UpgradeScene } from './scenes/UpgradeScene.js';
import { ROSTER } from './data/roster.js';
import { LobbyScene } from './scenes/LobbyScene.js';
import { DeckScene } from './scenes/DeckScene.js';
import { TavernScene } from './scenes/TavernScene.js';
import { WorkshopScene } from './scenes/WorkshopScene.js';
import { meta } from './systems/meta.js';
import { storage } from './systems/storage.js';
import { vhs } from './systems/vhs.js';

async function loadFonts() {
  const faces = [
    // 픽셀 글꼴 (UI·게임 월드 공통)
    new FontFace(FONT, 'url(assets/fonts/Galmuri11.woff2)'),
    new FontFace(FONT, 'url(assets/fonts/Galmuri11-Bold.woff2)', { weight: 'bold' }),
    // 포근한 카드형 UI 글꼴 (OFL, 게임에 쓰는 글자만 남긴 부분 글꼴)
    new FontFace('Sunflower', 'url(assets/fonts/Sunflower-Medium.woff2)'),
    new FontFace('Sunflower', 'url(assets/fonts/Sunflower-Bold.woff2)', { weight: 'bold' }),
    new FontFace('Gowun Dodum', 'url(assets/fonts/GowunDodum-Regular.woff2)'), // 기호 채움용
  ];
  try {
    for (const f of await Promise.all(faces.map((f) => f.load()))) document.fonts.add(f);
  } catch (e) {
    console.warn('폰트 로드 실패, 기본 폰트 사용', e);
  }
}

await loadFonts();
// 저장 한 곳 (2026-11-23): 데스크톱 판은 파일 저장을 먼저 읽어 둔다 — 그 뒤 진행 상황·소리 설정을 다시 읽음
await storage.init();
meta.load();
audio.loadSettings();

// 브라우저 정책: 첫 터치/클릭 후에만 소리를 낼 수 있다
window.addEventListener('pointerdown', () => audio.init());

// 모든 글자: 크기를 픽셀 글꼴 격자에 맞추고 RES 배 해상도로 그린다 (흐림·뭉개짐 없이 선명하게)
const addText = Phaser.GameObjects.GameObjectFactory.prototype.text;
Phaser.GameObjects.GameObjectFactory.prototype.text = function (x, y, text, style = {}) {
  const st = { ...style, resolution: TEXT_RES };
  const px = parseFloat(st.fontSize);
  // 픽셀 글꼴(Galmuri11)만 격자 크기로 맞춘다 (고운 글꼴은 어떤 크기든 매끈하다)
  if (px && (!st.fontFamily || st.fontFamily === FONT)) st.fontSize = `${crispFontSize(px)}px`;
  return addText.call(this, x, y, text, st);
};

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WORLD_W * RES, // 실제 캔버스 해상도. 장면 카메라가 월드(1920x1080)는 zoom RES, UI(1280x720)는 zoom RES×1.5 로 채운다
  height: WORLD_H * RES,
  backgroundColor: '#2b1810',
  // ?transparent=1: 캔버스 바탕을 투명하게 (화면을 레이어별 PNG·PSD 로 뽑을 때, tools/export-psd.cjs)
  transparent: new URLSearchParams(window.location.search).has('transparent'),
  // 도트는 nearest 로 반듯하게(antialias false = pixelArt 의 텍스처 설정), 도형(Graphics: 시너지 알약·동그란 배지·체력 막대) 가장자리는
  // WebGL 안티에일리어싱으로 매끈하게 (2026-11-22 — pixelArt: true 는 antialiasGL 까지 꺼서 도형 테두리가 계단졌다)
  pixelArt: false,
  antialias: false,
  antialiasGL: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    zoom: displayScale() / RES
  },
  scene: [BootScene, GateScene, TitleScene, LobbyScene, DeckScene, TavernScene, WorkshopScene, GameScene, UpgradeScene]
});
// 창 크기가 바뀌면 다시 정수 배율로 (1080p 보다 작으면 부드럽게 줄임) — 남는 곳은 검정 (2026-11-22)
window.addEventListener('resize', () => game.scale.setZoom(displayScale() / RES));

// 디버그용 (브라우저 콘솔에서 window.game 으로 접근)
window.game = game;
vhs.init(game); // VHS 홈비디오 효과 시험판 (2026-11-24, ESC 메뉴·?vhs=1)
window.BALANCE = BALANCE; // 밸런스 실험용 (tools/balance-sim.cjs)
window.__rtd = { skillOptions, HEROES, ROSTER, audio, setArt, setFacing, playOnce, animMs, hitDelay, cellCenter, meta, storage, vhs, waves: { waveInfo, monsterStats } }; // 디버그·테스트용 (waves: 밸런스 봇이 웨이브 체력 계산)
