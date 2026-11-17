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
    this.load.image('title_bg', 'assets/title/title.png');
    // 로비(영지) 배경 — 동화풍 일러스트를 3px 도트로 정리한 그림 (아트 해상도, 화면엔 UI_PX 배)
    this.load.image('lobby_wide', 'assets/lobby/lobby_wide.png');
    this.load.image('lobby_tall', 'assets/lobby/lobby_tall.png'); // 타이틀 일러스트 (perfectPixel 로 격자 정리: 312x553, 그림 1px = 원본 약 3px)
  }

  create() {
    hiRes(this);
    generateTextures(this);
    createFxAnims(this);
    loadCustomArt(this, () => this.scene.start('Title'));
  }
}
