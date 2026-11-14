// PixelLab VFX Creator 로 만든 스프라이트 시트 이펙트 (public/assets/fx/)
// 원본은 사용자의 PixelLab "My effects" 에 저장되어 있어 슬라이더로 다시 고칠 수 있다 (effect 값이 그 id).
// 고친 뒤 같은 이름의 PNG 로 덮어쓰고, 프레임 크기·수가 바뀌었으면 아래 값을 맞춘다.
//
// w,h: 한 프레임 크기(아트 픽셀) · frames: 쓸 프레임 수(뒤쪽 빈 프레임 제외) · fps
// ox,oy: 기준점(0~1, 이펙트의 중심 또는 발밑) · tint: 흰색으로 그려 속성 색을 입히는 이펙트
// start: 첫 프레임이 비어 있으면 건너뛸 번호 · loop: 반복 재생(직접 멈춰야 함)
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
  ultimate: { file: 'ultimate.png', w: 58, h: 99, frames: 9, fps: 14, ox: 0.5, oy: 0.86, tint: false, effect: '8b051720-ec2a-4b85-ba9a-e51692484156' },
  // 몬스터 사망: 일반·정예는 속성 색 연기 + 별, 보스는 폭발 + 파편
  death: { file: 'death.png', w: 38, h: 42, frames: 8, fps: 16, ox: 0.53, oy: 0.43, tint: true, effect: '957b2d04-341e-4949-bb82-7e608a349ecb' },
  boss_death: { file: 'boss_death.png', w: 45, h: 47, frames: 11, fps: 12, ox: 0.53, oy: 0.62, tint: false, effect: '5727caee-3723-4690-9fc0-8ab491a68013' },
  // 보스 디버프가 걸린 용병 발밑: 그림자 웅덩이 + 촉수 + 해골
  curse: { file: 'curse.png', w: 36, h: 34, frames: 20, fps: 14, ox: 0.5, oy: 0.71, tint: false, effect: '7baea9af-a227-4fd7-bc79-e4e785df220e' },
  // 버프 오라: 버프가 걸려 있는 동안 반복 (용병 몸 뒤에서 금빛 화살표가 솟음)
  buff: { file: 'buff.png', w: 36, h: 41, frames: 12, fps: 12, ox: 0.47, oy: 0.71, tint: false, loop: true, effect: '163291e6-2eea-4a51-a37c-2721ad11bb56' },
  // 머지: 빛 알갱이가 모여듦(속성 색) → 레벨 업 빛기둥
  merge: { file: 'merge.png', w: 37, h: 37, start: 1, frames: 10, fps: 24, ox: 0.49, oy: 0.49, tint: true, effect: 'fc188907-bc40-4d04-9d84-edd504bdf2b1' },
  levelup: { file: 'levelup.png', w: 36, h: 57, frames: 13, fps: 14, ox: 0.5, oy: 0.84, tint: false, effect: '55032163-225f-4e45-83ab-b6d7375d4f91' }
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
      frames: scene.anims.generateFrameNumbers(tex, { start: d.start || 0, end: d.frames - 1 }),
      frameRate: d.fps,
      repeat: d.loop ? -1 : 0
    });
  }
}
