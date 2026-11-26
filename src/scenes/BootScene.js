import Phaser from 'phaser';
import { hiRes } from '../systems/hires.js';
import { generateTextures } from '../art/textures.js';
import { preloadManifest, loadCustomArt } from '../systems/customArt.js';
import { preloadFx, createFxAnims } from '../data/fx.js';
import { dissolveTo } from '../ui/dissolve.js';

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
    this.load.image('title_key', 'assets/title/title_key.webp'); // 2026-11-24 사용자 그림: 가로 1920x1080 키 아트 (영문 로고 포함, 원본 그대로)
    // 로비(영지) 배경 — 동화풍 일러스트를 2px 도트로 정리한 그림 (2026-11-21, 세로 272x480 · 가로 640x360) (아트 해상도, 화면엔 UI_PX 배)
    this.load.image('lobby_wide', 'assets/lobby/lobby_wide.png');
    this.load.image('lobby_wind', 'assets/lobby/lobby_wind.png'); // 영지 배경 바람 마스크 (R 구름 · G 꽃 · B 깃발)
    this.load.image('lobby_key', 'assets/lobby/lobby_key.webp'); // 2026-11-25 시안: 타이틀 키 아트에서 로고만 지운 그림
    this.load.image('tavern_bg', 'assets/tavern/tavern_bg.webp'); // 술집 배경 (2026-11-25 사용자 그림 1920x1080)
    // 2026-11-22 사용자 결정: 세로 영지·성탑(강화) 배경은 사용자 그림을 도트로 줄이지 않고 원본 그대로(941x1672, 부드럽게 맞춤 — 2px 도트 규칙 예외)
    this.load.image('lobby_bg', 'assets/lobby/lobby_bg.webp');
    this.load.image('space_bg', 'assets/upgrade/space_bg.png');
    this.load.spritesheet('space_meteor', 'assets/upgrade/meteor.png', { frameWidth: 140, frameHeight: 80 });
    this.load.spritesheet('space_twinkle', 'assets/upgrade/twinkle.png', { frameWidth: 9, frameHeight: 9 });
  }

  create() {
    hiRes(this);
    generateTextures(this);
    createFxAnims(this);
    loadCustomArt(this, () => dissolveTo(this, 'Title')); // 로딩 → 타이틀도 디졸브 (2026-11-23)
  }
}
