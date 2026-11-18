// PixelLab VFX Creator 로 만든 스프라이트 시트 이펙트 (public/assets/fx/)
// 원본은 사용자의 PixelLab "My effects" 에 저장되어 있어 슬라이더로 다시 고칠 수 있다 (effect 값이 그 id).
// 고친 뒤 같은 이름의 PNG 로 덮어쓰고, 프레임 크기·수가 바뀌었으면 아래 값을 맞춘다.
//
// w,h: 한 프레임 크기(아트 픽셀) · frames: 쓸 프레임 수(뒤쪽 빈 프레임 제외) · fps
// ox,oy: 기준점(0~1, 이펙트의 중심 또는 발밑) · tint: 흰색으로 그려 속성 색을 입히는 이펙트
// start: 첫 프레임이 비어 있으면 건너뛸 번호 · loop: 반복 재생(직접 멈춰야 함)
// px: 기본 화면 배율. 4 = 게임 그림과 같은 픽셀 굵기(아트 1px = 화면 4px)로 그린 플랫 스타일 시트 (없으면 FX_SCALE)
// 화면 배율은 FX_SCALE(아트 1px = 화면 2px). 게임 그림(4px)보다 촘촘해서 이펙트가 섬세하게 보인다.
export const FX_SCALE = 2;

export const FX = {
  // 기본 공격 명중
  hit_star: { file: 'hit_star.png', w: 16, h: 16, frames: 4, fps: 16, ox: 0.5, oy: 0.5, px: 4, tint: true, effect: 'cb18c0a7-20dc-42ff-8042-d7b8aadc3180' },
  hit_magic: { file: 'hit_magic.png', w: 24, h: 24, frames: 5, fps: 16, ox: 0.5, oy: 0.5, px: 4, tint: true, effect: '06be3609-827c-40b3-9a28-282460506470' },
  hit_snipe: { file: 'hit_snipe.png', w: 22, h: 24, frames: 5, fps: 18, ox: 0.45, oy: 0.42, px: 4, tint: false, effect: '1278c012-1ec9-4c48-b906-7ac106902d41' },
  // 스킬
  slash: { file: 'slash.png', w: 24, h: 24, frames: 5, fps: 16, ox: 0.5, oy: 0.5, px: 4, tint: true, effect: '66f75859-b0c6-45f7-a359-c02110cc8abc' },
  skill_red: { file: 'skill_red.png', w: 32, h: 32, frames: 9, fps: 14, ox: 0.53, oy: 0.56, px: 4, tint: false, effect: 'f09e6591-b482-42a1-9c2e-60e498481dd3' },
  skill_blue: { file: 'skill_blue.png', w: 36, h: 28, frames: 10, fps: 14, ox: 0.5, oy: 0.64, px: 4, tint: false, effect: 'cc0f6545-87fd-4364-ae37-11e98d815f1c' },
  skill_green: { file: 'skill_green.png', w: 36, h: 35, frames: 10, fps: 14, ox: 0.5, oy: 0.71, px: 4, tint: false, effect: 'a8f92403-9fd5-4cd6-a735-bf6ba4104703' },
  // 영웅 고유 스킬: 하늘에서 내리꽂는 금빛 기둥 (기준점 = 발밑)
  ultimate: { file: 'ultimate.png', w: 39, h: 65, frames: 8, fps: 14, ox: 0.51, oy: 0.86, px: 4, tint: false, effect: '8b051720-ec2a-4b85-ba9a-e51692484156' },
  // 몬스터 사망: 일반·정예는 속성 색 연기 + 별, 보스는 폭발 + 파편
  death: { file: 'death.png', w: 28, h: 23, frames: 6, fps: 16, ox: 0.54, oy: 0.52, px: 4, tint: true, effect: '957b2d04-341e-4949-bb82-7e608a349ecb' },
  boss_death: { file: 'boss_death.png', w: 44, h: 55, frames: 11, fps: 12, ox: 0.5, oy: 0.42, px: 4, tint: false, effect: '5727caee-3723-4690-9fc0-8ab491a68013' },
  // 상태 표시(반복): 효과가 남아 있는 동안 용병에 붙어 있다 (용병 컨테이너 안, 몸 뒤)
  // 버프: 발밑 금빛 고리 + 양옆으로 솟는 화살표 · 디버프: 보랏빛 웅덩이 + 머리 위 해골 + 양옆으로 가라앉는 화살표
  buff: { file: 'buff.png', w: 27, h: 31, frames: 12, fps: 10, ox: 0.48, oy: 0.81, px: 4, tint: false, loop: true, effect: '163291e6-2eea-4a51-a37c-2721ad11bb56' },
  debuff: { file: 'debuff.png', w: 27, h: 37, frames: 12, fps: 10, ox: 0.48, oy: 0.78, px: 4, tint: false, loop: true, effect: '7baea9af-a227-4fd7-bc79-e4e785df220e' },
  // 레벨 업 (0.44초): 짧은 빛기둥 + 고리 + 위 화살표. 용병 컨테이너에 붙어 옮겨도 따라간다
  // 궁수 화살(반복): 날아가는 동안 꼬리 빛이 흐른다. 기준점 = 화살촉 끝. 아트 1px = 화면 3px (캐릭터와 같은 격자)
  arrow_red: { file: 'arrow_red.png', w: 28, h: 16, frames: 4, fps: 12, ox: 0.93, oy: 0.5, px: 3, loop: true, effect: 'b43efce7-33dc-41de-8932-3d48737d5ed5' },
  arrow_blue: { file: 'arrow_blue.png', w: 28, h: 16, frames: 4, fps: 12, ox: 0.93, oy: 0.5, px: 3, loop: true, effect: '7569d5c6-3b5b-4639-afb6-3971fafc8865' },
  arrow_green: { file: 'arrow_green.png', w: 28, h: 16, frames: 4, fps: 12, ox: 0.93, oy: 0.5, px: 3, loop: true, effect: 'dfcbf61b-be7f-4c71-916a-15cb1bdb8732' },
  // 레인저(영웅) 금빛 화살
  arrow_gold: { file: 'arrow_gold.png', w: 28, h: 16, frames: 4, fps: 12, ox: 0.93, oy: 0.5, px: 3, loop: true, effect: '80acaea6-0b74-47f7-9c5d-86f3b97f9106' },
  // 몬스터 처치 골드: 동전 5개가 사방으로 튀었다 바닥에 멈춰 반짝이고 하나씩 사라짐 (pixelfx 시안 2번, docs/drafts/coin-drop/)
  // 기준점 = 몬스터 발밑. 아트 1px = 화면 3px. pixelfx 로 만든 시트라 PixelLab effect id 는 없다
  coin_drop: { file: 'coin_drop.png', w: 44, h: 50, frames: 46, fps: 24, ox: 0.5, oy: 0.66, px: 3, source: 'pixelfx spawn/rtd-coin-scatter {coins:5, spread:0.5}' },
  levelup: { file: 'levelup.png', w: 34, h: 42, frames: 7, fps: 16, ox: 0.5, oy: 0.81, px: 4, tint: false, effect: '55032163-225f-4e45-83ab-b6d7375d4f91' }
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

import { FX_SETS } from './fxSets.js';
export { FX_SETS };
/** 커먼·언커먼 공용 스킬 이펙트 (2026-11-18, docs/drafts/skill-fx/sets/) — 텍스처·애니메이션 키. back = 캐릭터 뒤 바닥 레이어 */
export const setTexture = (k, back) => `fxs_${k}${back ? '_back' : ''}`;
export const setAnim = (k, back) => `fxs_${k}${back ? '_back' : ''}_play`;
/** 세트 이펙트 화면 배율 (아트 1px = 화면 2px, 필드 배경·캐릭터와 같은 굵기) */
export const SET_SCALE = 2;

export const fxTexture = (key) => `fx_${key}`;
export const fxAnim = (key) => `fx_${key}_play`;

/** BootScene.preload 에서 시트를 읽는다 */
export function preloadFx(scene) {
  for (const [key, d] of Object.entries(FX)) {
    scene.load.spritesheet(fxTexture(key), `assets/fx/${d.file}`, { frameWidth: d.w, frameHeight: d.h });
  }
  for (const [k, d] of Object.entries(FX_SETS)) {
    scene.load.spritesheet(setTexture(k), `assets/fx/sets/${k}.png`, { frameWidth: d.w, frameHeight: d.h });
    if (d.back) scene.load.spritesheet(setTexture(k, true), `assets/fx/sets/${k}_back.png`, { frameWidth: d.w, frameHeight: d.h });
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
  // 세트 이펙트: 프레임마다 길이(ms)가 다르다 → frameRate 1000(1ms) + duration(ms-1)
  for (const [k, d] of Object.entries(FX_SETS)) {
    for (const back of d.back ? [false, true] : [false]) {
      const tex = setTexture(k, back);
      if (!scene.textures.exists(tex) || scene.anims.exists(setAnim(k, back))) continue;
      const frames = scene.anims.generateFrameNumbers(tex, { start: 0, end: d.n - 1 });
      frames.forEach((f, i) => (f.duration = d.ms[i] - 1));
      scene.anims.create({ key: setAnim(k, back), frames, frameRate: 1000, repeat: 0 });
    }
  }
}
