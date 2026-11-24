/**
 * 무기 따로 그리기 (2026-11-24 사용자 결정 — 무기는 게임이 원본 그림을 돌려 그린다)
 *
 * manifest 의 char_<id>.rig 가 있는 캐릭터는 시트에 무기·앞손이 없다. 대신 프레임마다
 *   [쥐는 점 x, y (프레임 기준 아트 px, 소수), 무기 각도(도, 시계 방향 +), 몸 뒤인지, [[앞손 x, y], ...]]
 * 를 읽어 원본 무기 그림(rig.weapon)과 손(rig.hand)을 스프라이트 옆에 붙여 그린다.
 * 화면 해상도에서 돌리므로 도트를 다시 고르지 않는다 → PSD 로 고친 무기 모양이 어느 각도에서도 그대로.
 * 프레임 사이는 무기 각도·손 자리를 이어 붙여 부드럽게 돈다 (뒤로 돌아가는 프레임·몸 뒤 무기는 끊어서).
 * 스프라이트의 위치·배율·좌우 반전·투명도·색조·보이기를 매 프레임 따라간다 (scene postupdate).
 * 쓰는 곳: customArt.setArt — 전투 용병·용병 정보 카드 그림이 setArt 를 거치면 자동으로 붙는다.
 */

/** 그림이 바뀔 때 (customArt.setArt 가 부른다) — 무기 분리 그림이면 붙이고, 아니면 뗀다 */
export function syncRigTexture(sprite) {
  const rig = sprite.texture?.customData?.rig;
  if (!rig || !sprite.anims) {
    if (sprite._rig) sprite._rig.hide();
    return;
  }
  if (!sprite._rig) sprite._rig = new WeaponRig(sprite);
  sprite._rig.use(rig);
}

class WeaponRig {
  constructor(sprite) {
    this.sprite = sprite;
    this.scene = sprite.scene;
    this.parts = [];
    this.update = () => this.sync();
    this.scene.events.on('postupdate', this.update);
    sprite.once('destroy', () => this.destroy());
  }

  use(rig) {
    if (this.rig === rig) return this.sync();
    this.rig = rig;
    this.parts.forEach((p) => p.destroy());
    const sc = this.scene;
    this.weapon = sc.add.image(0, 0, rig.weapon);
    const nHands = Math.max(0, ...rig.frames.map((f) => f[4].length));
    this.hands = rig.hand ? Array.from({ length: nHands }, () => sc.add.image(0, 0, rig.hand)) : [];
    this.parts = [this.weapon, ...this.hands];
    this.where = null;
    this.sync();
  }

  hide() {
    this.rig = null;
    this.parts.forEach((p) => p.destroy());
    this.parts = [];
  }

  destroy() {
    this.scene?.events.off('postupdate', this.update);
    this.parts.forEach((p) => p.destroy());
    this.parts = [];
    this.rig = null;
  }

  /** 스프라이트와 같은 곳(컨테이너 또는 장면)에, 무기는 몸 앞/뒤 · 손은 무기 앞 */
  place(behind) {
    const s = this.sprite;
    const box = s.parentContainer;
    if (this.where === behind && this.box === box && this.parts.every((p) => p.parentContainer === box)) return;
    this.where = behind;
    this.box = box;
    for (const p of this.parts) {
      if (p.parentContainer && p.parentContainer !== box) p.parentContainer.remove(p);
      if (!box && !p.displayList) this.scene.add.existing(p);
    }
    if (box) {
      for (const p of this.parts) if (!p.parentContainer) box.add(p);
      // 순서: (몸 뒤 무기) 몸 (몸 앞 무기) 손…
      const at = box.getIndex(s);
      box.moveTo(this.weapon, behind ? Math.max(0, at) : at + 1);
      let idx = box.getIndex(behind ? s : this.weapon);
      for (const h of this.hands) box.moveTo(h, ++idx);
    } else {
      const d = s.depth;
      this.weapon.setDepth(behind ? d - 0.002 : d + 0.001);
      this.hands.forEach((h) => h.setDepth(d + 0.002));
    }
  }

  sync() {
    const s = this.sprite;
    const rig = this.rig;
    if (!rig || !s.active || !this.parts.length) return;
    const fi = s.frame?.name;
    const f = rig.frames[fi];
    if (!f) {
      this.parts.forEach((p) => p.setVisible(false));
      return;
    }
    // 다음 프레임과 이어 붙이기 (같은 애니메이션 안에서 앞으로 갈 때만)
    let [x, y, deg, behind, hands] = f;
    const st = s.anims;
    if (st?.isPlaying && !st.isPaused && st.currentFrame) {
      const nf = st.currentFrame.nextFrame;
      const n = nf && !(nf.index <= st.currentFrame.index && !st.currentAnim?.repeat) ? rig.frames[nf.frame.name] : null;
      if (n && n[3] === behind) {
        const t = Math.min(1, Math.max(0, st.nextTick > 0 ? st.accumulator / st.nextTick : 0));
        let dd = n[2] - deg;
        if (dd > 180) dd -= 360;
        if (dd < -180) dd += 360;
        if (Math.abs(dd) < 120) {
          x += (n[0] - x) * t;
          y += (n[1] - y) * t;
          deg += dd * t;
          hands = hands.map((h, i) => (n[4][i] ? [h[0] + (n[4][i][0] - h[0]) * t, h[1] + (n[4][i][1] - h[1]) * t] : h));
        }
      }
    }
    this.place(behind);
    const cd = s.texture.customData;
    const flip = s.flipX;
    const sg = flip ? -1 : 1;
    const sx = s.scaleX;
    const sy = s.scaleY;
    const pvx = cd.pivotX ?? cd.frameWidth / 2;
    const pvy = cd.pivotY ?? cd.frameHeight / 2;
    // 프레임 아트 좌표 → 스프라이트 기준 화면 좌표 (setFacing 이 몸 중심을 고정한 것과 같은 식)
    const at = (ax, ay) => [s.x + sg * (ax - pvx) * sx, s.y + (ay - pvy) * sy];
    const tint = s.isTinted ? s.tintTopLeft : null;
    const common = (p) => {
      p.setVisible(s.visible).setAlpha(s.alpha).setScale(sx, sy).setFlipX(flip);
      if (tint != null) p.setTint(tint);
      else p.clearTint();
    };
    const w = this.weapon;
    const [wx, wy] = at(x, y);
    const fw = w.frame.width;
    const fh = w.frame.height;
    common(w);
    w.setOrigin((flip ? fw - rig.pivot[0] : rig.pivot[0]) / fw, rig.pivot[1] / fh);
    w.setPosition(wx, wy).setRotation((sg * deg * Math.PI) / 180);
    this.hands.forEach((h, i) => {
      const p = hands[i];
      if (!p) return h.setVisible(false);
      common(h);
      const hw = h.frame.width;
      const hh = h.frame.height;
      const [hx, hy] = at(p[0] + hw / 2, p[1] + hh / 2);
      h.setOrigin(0.5).setRotation(0).setPosition(hx, hy);
    });
  }
}
