import Phaser from 'phaser';
import { hiRes } from '../systems/hires.js';
import { generateTextures } from '../art/textures.js';
import { preloadManifest, loadCustomArt } from '../systems/customArt.js';
import { preloadFx, createFxAnims } from '../data/fx.js';

// 1) 모든 픽셀아트 텍스처를 코드로 생성
// 2) PixelLab 이펙트 시트(public/assets/fx/) 읽기 + 애니메이션 등록
// 3) public/assets/custom/manifest.json 에 적힌 직접 그린 이미지가 있으면 같은 키를 교체 (+애니메이션 등록)
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    preloadManifest(this);
    preloadFx(this);
    this.load.image('title_bg', 'assets/title/title.png'); // 도트 2px: 세로용 272x482
    this.load.image('title_bg_wide', 'assets/title/title_wide.png'); // 가로용 203x360 (화면 높이 720 = 2px)
    // 로비(영지) 배경 — 동화풍 일러스트를 2px 도트로 정리한 그림 (2026-11-21, 세로 272x480 · 가로 640x360) (아트 해상도, 화면엔 UI_PX 배)
    this.load.image('lobby_wide', 'assets/lobby/lobby_wide.png');
    // 2026-11-22 사용자 결정: 세로 영지·성탑(강화) 배경은 사용자 그림을 도트로 줄이지 않고 원본 그대로(941x1672, 부드럽게 맞춤 — 2px 도트 규칙 예외)
    this.load.image('lobby_bg', 'assets/lobby/lobby_bg.webp');
    this.load.image('upgrade_bg', 'assets/upgrade/upgrade_bg.webp');
  }

  create() {
    hiRes(this);
    generateTextures(this);
    createFxAnims(this);
    loadCustomArt(this, () => this.scene.start('Title'));
  }
}
