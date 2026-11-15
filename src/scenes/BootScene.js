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
  }

  create() {
    hiRes(this);
    generateTextures(this);
    createFxAnims(this);
    loadCustomArt(this, () => this.scene.start('Title'));
  }
}
