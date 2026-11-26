import { WORLD_W, WORLD_H, BG_PX, GRID, CELL, FIELD_X, FIELD_Y, FIELD_SIZE, WALL, DEPTH } from '../../config.js';
import { TILE_KEYS } from '../../art/textures.js';
import { addBiomeDecor, swapBiomeDecor } from '../../art/decor.js';
import { biomeForWave } from '../../data/biomes.js';
import { audio } from '../../systems/audio.js';

/** 전열·후열 칸 대비 (2026-11-21 사용자 결정): 전열 밝게(흰빛 겹침), 후열 어둡게(틴트) */
const FIELD_ROWS = { frontLift: 0.14, backTint: 0x7c7c8c }; // 2026-11-21: 후열 더 어둡게 (이전 0x9c9ca8)

/** 전장 그림: 필드 레이어(석판·성벽) · 지역 배경 전환 */
export class BattlefieldView {
  constructor(scene) {
    /** @type {import('../GameScene.js').GameScene} */
    this.scene = scene;
    this.bg = null; // 지역 배경 그림 (bg_<지역>)
    this.tiles = []; // 석판 25칸 (gy * 5 + gx)
    this.rowLift = null; // 전열 흰빛
    this.wall = null; // 성벽 링
  }

  /** 판 시작: 지역 배경 → 필드 레이어 → 나무·꽃 */
  build() {
    const s = this.scene;
    s.biome = biomeForWave(1);
    this.bg = s.add.image(0, 0, `bg_${s.biome.id}`).setOrigin(0).setDisplaySize(WORLD_W, WORLD_H).setDepth(DEPTH.bg);
    this.createFieldLayers();
    s.decor = addBiomeDecor(s, s.biome.id); // 바람에 흔들리는 나무 등 (2026-11-21)
  }

  /**
   * 필드 레이어 (2026-11-17): 지역 배경(bg_<지역>) 위에 석판 25칸 → 성벽 링을 따로 쌓는다.
   * 각 레이어는 텍스처 키라 manifest 로 스킨을 씌우면 그대로 바뀐다 (크기는 화면 크기에 맞춰 늘림 — 스킨 해상도 자유).
   * 석판 변형(_b, _c)은 기본 키에만 스킨이 있으면 기본 키 하나로 통일한다.
   */
  createFieldLayers() {
    const skinned = (key) => this.scene.textures.get(key).customData?.artScale !== undefined;
    this.tiles = [];
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        const keys = TILE_KEYS[(gx + gy) % 2 === 0 ? 'light' : 'dark'];
        const key = skinned(keys[0]) ? keys[0] : keys[(gx * 7 + gy * 3) % keys.length];
        const tile = this.scene.add.image(FIELD_X + gx * CELL, FIELD_Y + gy * CELL, key).setOrigin(0).setDisplaySize(CELL, CELL).setDepth(DEPTH.bg + 1);
        // 전열(바깥 줄 16칸)·후열(가운데 3x3) 구분 (2026-11-21): 후열은 어둡게
        const front = gx === 0 || gy === 0 || gx === GRID - 1 || gy === GRID - 1;
        if (!front) tile.setTint(FIELD_ROWS.backTint);
        this.tiles.push(tile);
      }
    }
    // 전열은 밝게: 바깥 줄 위에 흰빛 얇게
    const lift = this.scene.add.graphics().setDepth(DEPTH.bg + 1.5);
    lift.fillStyle(0xffffff, FIELD_ROWS.frontLift);
    lift.fillRect(FIELD_X, FIELD_Y, FIELD_SIZE, CELL).fillRect(FIELD_X, FIELD_Y + FIELD_SIZE - CELL, FIELD_SIZE, CELL);
    lift.fillRect(FIELD_X, FIELD_Y + CELL, CELL, FIELD_SIZE - 2 * CELL).fillRect(FIELD_X + FIELD_SIZE - CELL, FIELD_Y + CELL, CELL, FIELD_SIZE - 2 * CELL);
    this.rowLift = lift;
    // 성벽: 텍스처 (0,0) = 성벽 바깥 테두리에서 아트 1px 바깥
    const wall = this.scene.textures.get('field_wall').getSourceImage();
    const size = FIELD_SIZE + 2 * WALL + 3 * BG_PX;
    this.wall = this.scene.add.image(FIELD_X - WALL - BG_PX, FIELD_Y - WALL - BG_PX, 'field_wall').setOrigin(0).setDisplaySize(size, size).setDepth(DEPTH.bg + 2);
    if (!wall) console.warn('field_wall 텍스처 없음');
  }

  /** 지역(배경) 전환: 새 배경이 서서히 덮인다 */
  changeBiome(biome) {
    if (biome.id === this.scene.biome.id) return;
    this.scene.biome = biome;
    audio.regionChange();
    const old = this.bg;
    this.bg = this.scene.add.image(0, 0, `bg_${biome.id}`).setOrigin(0).setDisplaySize(WORLD_W, WORLD_H).setDepth(DEPTH.bg + 0.5).setAlpha(0);
    this.scene.tweens.add({
      targets: this.bg,
      alpha: 1,
      duration: 1200,
      onComplete: () => {
        old.destroy();
        this.bg.setDepth(DEPTH.bg);
      }
    });
    this.scene.decor = swapBiomeDecor(this.scene, this.scene.decor, biome.id);
    this.scene.time.delayedCall(2300, () => !this.scene.over && this.scene.toast(`새로운 지역: ${biome.name}`));
  }
}
