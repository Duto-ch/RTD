// PixelLab VFX Creator 로 만든 스프라이트 시트 이펙트 (public/assets/fx/)
// 원본은 사용자의 PixelLab "My effects" 에 저장되어 있어 슬라이더로 다시 고칠 수 있다 (effect 값이 그 id).
// 고친 뒤 같은 이름의 PNG 로 덮어쓰고, 프레임 크기·수가 바뀌었으면 아래 값을 맞춘다.
//
// w,h: 한 프레임 크기(아트 픽셀) · frames: 쓸 프레임 수(뒤쪽 빈 프레임 제외) · fps
// ox,oy: 기준점(0~1, 이펙트의 중심 또는 발밑) · tint: 흰색으로 그려 속성 색을 입히는 이펙트
// 화면 배율은 FX_SCALE(아트 1px = 화면 2px). 게임 그림(4px)보다 촘촘해서 이펙트가 섬세하게 보인다.
export const FX_SCALE = 2;

export const FX = {
  // 기본 공격 명중
  hit_star: { file: 'hit_star.png', w: 30, h: 28, frames: 5, fps: 16, ox: 0.47, oy: 0.5, tint: true, effect: 'cb18c0a7-20dc-42ff-8042-d7b8aadc3180' },
  hit_magic: { file: 'hit_magic.png', w: 31, h: 35, frames: 8, fps: 16, ox: 0.52, oy: 0.51, tint: true, effect: '06be3609-827c-40b3-9a28-282460506470' },
  hit_snipe: { file: 'hit_snipe.png', w: 36, h: 39, frames: 8, fps: 16, ox: 0.53, oy: 0.44, tint: false, effect: '1278c012-1ec9-4c48-b906-7ac106902d41' },
  // 스킬
  slash: { file: 'slash.png', w: 33, h: 38, frames: 12, fps: 20, ox: 0.48, oy: 0.37, tint: true, effect: '66f75859-b0c6-45f7-a359-c02110cc8abc' },
  skill_red: { file: 'skill_red.png', w: 47, h: 46, frames: 12, fps: 14, ox: 0.49, oy: 0.5, tint: false, effect: 'f09e6591-b482-42a1-9c2e-60e498481dd3' },
  skill_blue: { file: 'skill_blue.png', w: 48, h: 70, frames: 14, fps: 14, ox: 0.52, oy: 0.44, tint: false, effect: 'cc0f6545-87fd-4364-ae37-11e98d815f1c' },
  skill_green: { file: 'skill_green.png', w: 65, h: 70, frames: 15, fps: 14, ox: 0.52, oy: 0.47, tint: false, effect: 'a8f92403-9fd5-4cd6-a735-bf6ba4104703' },
  // 영웅 고유 스킬: 하늘에서 내리꽂는 금빛 기둥 (기준점 = 발밑)
  ultimate: { file: 'ultimate.png', w: 58, h: 99, frames: 9, fps: 14, ox: 0.5, oy: 0.86, tint: false, effect: '8b051720-ec2a-4b85-ba9a-e51692484156' }
};

/** 기본 공격 명중 이펙트 (클래스·영웅 계열 → FX 키) */
export const HIT_FX = {
  archer: 'hit_star',
  ranger: 'hit_star',
  rogue: 'hit_star',
  shaman: 'hit_magic',
  mage: 'hit_magic',
  archmage: 'hit_magic',
  sniper: 'hit_snipe',
  warlord: 'slash'
};

export const fxTexture = (key) => `fx_${key}`;
export const fxAnim = (key) => `fx_${key}_play`;

/** BootScene.preload 에서 시트를 읽는다 */
export function preloadFx(scene) {
  for (const [key, d] of Object.entries(FX)) {
    scene.load.spritesheet(fxTexture(key), `assets/fx/${d.file}`, { frameWidth: d.w, frameHeight: d.h });
  }
}

/** BootScene.create 에서 애니메이션을 등록한다 (시트를 못 읽었으면 건너뜀 → 코드 이펙트만 나온다) */
export function createFxAnims(scene) {
  for (const [key, d] of Object.entries(FX)) {
    const tex = fxTexture(key);
    if (!scene.textures.exists(tex) || scene.anims.exists(fxAnim(key))) continue;
    scene.anims.create({
      key: fxAnim(key),
      frames: scene.anims.generateFrameNumbers(tex, { start: 0, end: d.frames - 1 }),
      frameRate: d.fps,
      repeat: 0
    });
  }
}
