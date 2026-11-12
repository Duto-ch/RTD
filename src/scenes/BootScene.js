import Phaser from 'phaser';
import { generateTextures } from '../art/textures.js';

// 모든 픽셀아트 텍스처를 코드로 생성 (외부 이미지 없음)
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    generateTextures(this);
    this.scene.start('Title');
  }
}
