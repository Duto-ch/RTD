import { DOT, DEPTH } from '../config.js';
import { DECOR } from '../data/decor.js';
import Phaser from 'phaser';
import { setArt } from '../systems/customArt.js';

/** 그림 배경 위 꽃 (2026-11-25 사용자 요청: 예전보다 살짝 작게 · 너무 많지 않게) */
const PAINTED_FLOWERS = { count: 50, scale: 0.6 }; // 2026-11-25 사용자 결정: 50송이 · 0.6배

/**
 * 지역 배경 장식(바람에 흔들리는 나무 등, 2026-11-21)을 놓는다. 그림이 없으면(manifest 미적용) 아무것도 안 한다.
 * 정지·배속은 장면의 anims(pauseAll·globalTimeScale)를 따른다. 반환: 놓은 스프라이트 배열
 */
export function addBiomeDecor(scene, biomeId, alpha = 1) {
  const out = [];
  // 배경 그림에 숲이 그려져 있으면(2026-11-25 시안) 나무는 빼고 꽃만 — 자리 160곳 중 무작위 일부 · 크기 살짝 작게
  const painted = scene.textures.exists(`bg_${biomeId}`) && scene.textures.get(`bg_${biomeId}`).customData?.noDecor;
  let list = DECOR[biomeId] || [];
  if (painted) list = Phaser.Utils.Array.Shuffle(list.filter((d) => d.key.startsWith('deco_flower'))).slice(0, PAINTED_FLOWERS.count);
  for (const d of list) {
    if (!scene.textures.exists(d.key)) continue;
    const s = scene.add.sprite(d.x, d.y, d.key);
    setArt(s, d.key, DOT);
    if (painted) s.setScale(s.scaleX * PAINTED_FLOWERS.scale, s.scaleY * PAINTED_FLOWERS.scale);
    if (d.flip) { // 좌우 뒤집기 — 밑동(pivot)이 같은 자리에 오도록 origin 도 뒤집는다
      const cd = s.texture.customData || {};
      s.setFlipX(true);
      if (cd.frameWidth && cd.pivotX != null) s.setOrigin((cd.frameWidth - cd.pivotX) / cd.frameWidth, s.originY);
    }
    s.setDepth(DEPTH.bg + 0.8 + d.y / 100000).setAlpha(alpha); // 아래쪽 나무가 앞에
    const anim = `${d.key}:sway`;
    if (scene.anims.exists(anim)) {
      s.play(anim);
      s.anims.setProgress(d.phase || 0);
    }
    out.push(s);
  }
  return out;
}

/** 지역이 바뀔 때: 옛 장식은 서서히 사라지고 새 장식이 서서히 나타난다 */
export function swapBiomeDecor(scene, old, biomeId, duration = 1200) {
  for (const s of old || []) scene.tweens.add({ targets: s, alpha: 0, duration, onComplete: () => s.destroy() });
  const next = addBiomeDecor(scene, biomeId, 0);
  if (next.length) scene.tweens.add({ targets: next, alpha: 1, duration });
  return next;
}
