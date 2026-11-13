import Phaser from 'phaser';

// 직접 그린 이미지·애니메이션으로 코드 그림을 바꾸는 장치
// public/assets/custom/manifest.json 에 적힌 이미지만 교체하고, 나머지는 코드 그림을 그대로 쓴다.
// 형식은 docs/CUSTOM_ART.md 참고.
export const MANIFEST_KEY = 'customManifest';
export const MANIFEST_URL = 'assets/custom/manifest.json';
const BASE = 'assets/custom/';
const TMP = '__custom';

/** BootScene.preload 에서 호출: 매니페스트 읽기 (없어도 게임은 정상 동작) */
export function preloadManifest(scene) {
  scene.load.json(MANIFEST_KEY, MANIFEST_URL);
  scene.load.on('loaderror', (file) => {
    if (file.key === MANIFEST_KEY) console.info('[custom art] manifest 없음 — 기본 그림 사용');
    else console.warn(`[custom art] 이미지를 불러오지 못함: ${file.url}`);
  });
}

/** 매니페스트에 적힌 이미지를 불러와 같은 키의 코드 그림을 교체하고 애니메이션을 등록한다 */
export function loadCustomArt(scene, onDone) {
  const manifest = scene.cache.json.get(MANIFEST_KEY);
  const sprites = manifest?.sprites || {};
  const entries = Object.entries(sprites).filter(([key]) => !key.startsWith('_'));
  if (!entries.length) return onDone();

  for (const [key, def] of entries) {
    const url = BASE + def.file;
    if (def.frameWidth && def.frameHeight) {
      scene.load.spritesheet(key + TMP, url, { frameWidth: def.frameWidth, frameHeight: def.frameHeight });
    } else {
      scene.load.image(key + TMP, url);
    }
  }
  scene.load.once('complete', () => {
    let applied = 0;
    for (const [key, def] of entries) {
      const tmp = key + TMP;
      if (!scene.textures.exists(tmp)) continue;
      if (scene.textures.exists(key)) scene.textures.remove(key);
      scene.textures.renameTexture(tmp, key);
      // 더 촘촘하게 그린 그림(예: 32x32)은 scale 0.5 로 기본 그림과 같은 크기에 맞춘다
      scene.textures.get(key).customData.artScale = def.scale ?? 1;
      applied++;
      for (const [name, a] of Object.entries(def.animations || {})) {
        const animKey = `${key}:${name}`;
        if (scene.anims.exists(animKey)) scene.anims.remove(animKey);
        scene.anims.create({
          key: animKey,
          frames: scene.anims.generateFrameNumbers(key, { frames: a.frames }),
          frameRate: a.fps ?? 8,
          repeat: a.loop ? -1 : 0
        });
      }
    }
    console.info(`[custom art] ${applied}/${entries.length}개 이미지 교체`);
    onDone();
  });
  scene.load.start();
}

/** 텍스처의 표시 배율 (manifest 의 scale, 기본 1). 실제 크기 = 기본 확대 배율 × 이 값 */
export function artScale(scene, key) {
  return scene.textures.exists(key) ? scene.textures.get(key).customData?.artScale ?? 1 : 1;
}

/** 그림을 바꾸고 크기(기본 배율 × artScale)도 함께 맞춘다 */
export function setArt(obj, key, base) {
  // 다른 그림의 애니메이션이 돌고 있으면 멈춘다 (그대로 두면 이전 그림 프레임이 계속 나온다)
  const cur = obj.anims?.currentAnim;
  if (cur && !cur.key.startsWith(`${key}:`)) {
    obj.anims.stop();
    obj.anims.timeScale = 1;
  }
  obj.setTexture(key);
  obj.setScale(base * artScale(obj.scene, key));
  return obj;
}

/** 애니메이션이 있으면 재생하고 true, 없으면 false (정지 그림 그대로) */
export function playAnim(sprite, name, ignoreIfPlaying = true) {
  const key = `${sprite.texture.key}:${name}`;
  if (!sprite.scene || !sprite.scene.anims.exists(key)) return false;
  sprite.play({ key }, ignoreIfPlaying);
  return true;
}

/** 텍스처가 바뀐 뒤 기본 동작(대기/걷기)으로 맞춘다 */
export function playBase(sprite, name) {
  if (!playAnim(sprite, name)) {
    if (sprite.anims?.isPlaying) sprite.anims.stop();
    sprite.setFrame(0);
  }
}

/**
 * 공격처럼 한 번 재생하고 기본 동작으로 돌아가는 애니메이션.
 * maxMs 를 주면 그 시간 안에 끝나도록 빠르게 재생한다 (다음 공격 전에 끝나게).
 * 이미 같은 애니메이션이 재생 중이면 새로 시작하지 않는다 (true 반환).
 */
export function playOnce(sprite, name, back, maxMs) {
  const key = `${sprite.texture.key}:${name}`;
  if (!sprite.scene || !sprite.scene.anims.exists(key)) return false;
  if (sprite.anims.isPlaying && sprite.anims.currentAnim?.key === key) return true;
  const anim = sprite.scene.anims.get(key);
  sprite.anims.timeScale = maxMs && anim.duration > maxMs ? anim.duration / maxMs : 1;
  sprite.play(key);
  sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
    sprite.anims.timeScale = 1;
    playBase(sprite, back);
  });
  return true;
}
