import Phaser from 'phaser';
import { syncRigTexture } from '../art/weaponRig.js';

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
      const cd = scene.textures.get(key).customData;
      cd.artScale = def.scale ?? 1;
      // faceTarget: 공격 대상이 왼쪽이면 좌우 반전. pivotX: 몸 중심(프레임 기준 아트 px) — 반전해도 몸이 제자리
      cd.faceTarget = !!def.faceTarget;
      cd.facesLeft = def.facing === 'left'; // 왼쪽을 보고 그린 그림 (캐릭터 시안: 무기가 왼쪽) → 대상이 오른쪽일 때 뒤집는다
      cd.pivotX = def.pivotX;
      cd.pivotY = def.pivotY; // 몸 중심 y (프레임 기준 아트 px) — 칸 가운데에 몸통을 맞춘다
      cd.frameWidth = def.frameWidth;
      cd.frameHeight = def.frameHeight;
      cd.noDecor = !!def.noDecor; // 배경 그림에 숲·풀이 그려져 있으면 흩뿌리는 나무·꽃을 끈다 (2026-11-25)
      cd.still = def.still; // 무기까지 그린 정지 프레임 (무기 분리 그림 — 로비·병영 그림용)
      cd.rig = def.rig || null; // 무기 분리: 프레임마다 쥐는 점·각도·앞손 (src/art/weaponRig.js)
      applied++;
      cd.hitFrame = {};
      for (const [name, a] of Object.entries(def.animations || {})) {
        const animKey = `${key}:${name}`;
        if (a.hit != null) cd.hitFrame[name] = a.hit; // 타격·발사 프레임 (이때 피해·투사체가 나간다)
        if (scene.anims.exists(animKey)) scene.anims.remove(animKey);
        const frames = scene.anims.generateFrameNumbers(key, { frames: a.frames });
        // ms: 프레임마다 길이(밀리초). 프레임 길이 = 1000/frameRate + duration 이라 frameRate 1000(1ms) + (ms-1)
        if (Array.isArray(a.ms)) frames.forEach((f, i) => (f.duration = Math.max(0, (a.ms[i] ?? a.ms[a.ms.length - 1]) - 1)));
        scene.anims.create({
          key: animKey,
          frames,
          frameRate: Array.isArray(a.ms) ? 1000 : a.fps ?? 8,
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
  setFacing(obj, !!obj.texture?.customData?.facesLeft); // 처음에는 그림을 그린 방향 그대로
  syncRigTexture(obj); // 무기 분리 그림이면 무기·손을 붙여 그린다 (2026-11-24)
  return obj;
}

/**
 * 바라보는 방향 (그림은 오른쪽을 보고 그린다 — manifest facing "left" 면 왼쪽). faceTarget 이 있는 그림만 반전한다.
 * Phaser 는 프레임 가운데를 기준으로 뒤집으므로, 몸 중심(pivotX)이 같은 자리에 오도록 origin 도 함께 바꾼다.
 */
export function setFacing(sprite, left) {
  const cd = sprite.texture?.customData || {};
  const flip = !!(cd.faceTarget && (cd.facesLeft ? !left : left));
  sprite.setFlipX(flip);
  const fw = cd.frameWidth;
  const pv = cd.pivotX;
  const fh = cd.frameHeight;
  sprite.setOrigin(fw && pv != null ? (flip ? fw - pv : pv) / fw : 0.5, fh && cd.pivotY != null ? cd.pivotY / fh : 0.5);
  return sprite;
}

/** 애니메이션이 있으면 재생하고 true, 없으면 false (정지 그림 그대로) */
export function playAnim(sprite, name, ignoreIfPlaying = true) {
  const key = `${sprite.texture.key}:${name}`;
  if (!sprite.scene || !sprite.scene.anims.exists(key)) return false;
  sprite.play({ key }, ignoreIfPlaying);
  return true;
}

/**
 * 애니메이션 실제 길이(ms). Phaser 의 anim.duration 은 frameRate 만 보고 프레임별 길이(manifest ms)를 빼먹는다
 * — 한 프레임 = msPerFrame + frame.duration
 */
export function animMs(anim) {
  return anim.frames.reduce((t, f) => t + anim.msPerFrame + (f.duration || 0), 0);
}

/**
 * 지금 재생 중인 name 애니메이션이 타격·발사 프레임(manifest animations.<name>.hit)에 닿기까지 남은 시간(ms).
 * 장면 시계(time.timeScale = 게임 속도) 기준이라 time.delayedCall 에 그대로 넣는다. hit 가 없거나 재생 중이 아니면 0
 */
export function hitDelay(sprite, name) {
  const hit = sprite.texture?.customData?.hitFrame?.[name];
  const cur = sprite.anims?.currentAnim;
  if (hit == null || !cur || !sprite.anims.isPlaying || cur.key !== `${sprite.texture.key}:${name}`) return 0;
  const from = Math.max(0, (sprite.anims.currentFrame?.index ?? 1) - 1);
  let ms = 0;
  for (let i = from; i < hit && i < cur.frames.length; i++) ms += cur.msPerFrame + (cur.frames[i].duration || 0);
  return ms / (sprite.anims.timeScale || 1);
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
 * maxMs 를 주면 그 길이에 맞춰 재생한다 (공속에 맞춤 — 더 짧으면 빠르게, 길면 최대 1.6배까지 천천히).
 * 이미 같은 애니메이션이 재생 중이면 새로 시작하지 않는다 (true 반환).
 */
export function playOnce(sprite, name, back, maxMs) {
  const key = `${sprite.texture.key}:${name}`;
  if (!sprite.scene || !sprite.scene.anims.exists(key)) return false;
  if (sprite.anims.isPlaying && sprite.anims.currentAnim?.key === key) return true;
  const anim = sprite.scene.anims.get(key);
  // 공속에 맞춤: 빠르면 빨리, 느리면 천천히 (너무 굼뜨지 않게 최대 1.6배까지만 늘림)
  sprite.anims.timeScale = maxMs ? Math.max(0.6, animMs(anim) / maxMs) : 1;
  sprite.play(key);
  sprite.off(Phaser.Animations.Events.ANIMATION_COMPLETE, sprite._onceDone); // 취소된 공격의 남은 리스너 정리
  sprite._onceDone = () => {
    sprite._onceDone = null;
    sprite.anims.timeScale = 1;
    playBase(sprite, back);
  };
  sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, sprite._onceDone);
  return true;
}

/** playOnce 로 재생 중인 동작을 중간에 끊고 기본 동작으로 (공격 취소 — 대상이 발사 전에 죽었을 때, 2026-11-20) */
export function cancelOnce(sprite, back) {
  if (sprite._onceDone) sprite.off(Phaser.Animations.Events.ANIMATION_COMPLETE, sprite._onceDone);
  sprite._onceDone = null;
  sprite.anims.timeScale = 1;
  playBase(sprite, back);
}
