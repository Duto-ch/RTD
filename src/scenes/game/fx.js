import { FONT, DEPTH } from '../../config.js';

const text = (scene, x, y, str, size = 22, color = '#ffffff', extra = {}) =>
  scene.add.text(x, y, str, { fontFamily: FONT, fontSize: `${size}px`, color, ...extra }).setDepth(DEPTH.ui);

/** 전장 연출: 원 번쩍임 · 레벨 업 · 떠오르는 글자 · 체력·마나 막대 */
export class BattleFx {
  constructor(scene) {
    /** @type {import('../GameScene.js').GameScene} */
    this.scene = scene;
    this.activeTexts = 0;
  }

  circleFx(x, y, r, color) {
    const c = this.scene.add.circle(x, y, r, color, 0.25).setDepth(DEPTH.fx);
    this.scene.tweens.add({ targets: c, alpha: 0, scale: 1.2, duration: 220, onComplete: () => c.destroy() });
  }

  deathFx(m) {
    this.scene.vfx.death(m); // 귀여운 별 터짐 (2026-11-21, vfx.death)
  }

  /** 레벨 업 연출(약 0.5초): 이펙트와 문구 모두 용병 컨테이너에 붙어 옮겨도 따라간다 */
  levelUpFx(merc, label, hero = false) {
    this.scene.vfx.levelUp(merc, hero);
    const t = text(this.scene, 0, -30, label, hero ? 22 : 18, '#f2c14e', { stroke: '#1b1b26', strokeThickness: 4 }).setOrigin(0.5);
    merc.add(t);
    this.scene.tweens.add({ targets: t, y: -52, alpha: 0, delay: 150, duration: 400, onComplete: () => t.destroy() });
    this.scene.tweens.add({ targets: merc.sprite, scale: merc.sprite.scaleX * 1.2, duration: 90, yoyo: true });
  }

  /** 떠오르는 글자. 기본은 전장(월드 좌표), ui = true 면 HUD 위(UI 좌표) */
  floatText(x, y, str, color = '#ffffff', size = 16, force = false, ui = false) {
    if (this.activeTexts > 30 && !force) return;
    this.activeTexts++;
    const t = text(this.scene, x, y, str, size, color, { stroke: '#1b1b26', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(ui ? DEPTH.ui + 5 : DEPTH.fx + 1);
    this.scene.tweens.add({
      targets: t,
      y: y - 28,
      alpha: 0,
      duration: 800,
      onComplete: () => {
        t.destroy();
        this.activeTexts--;
      }
    });
  }

  drawHpBars() {
    const g = this.scene.hpGfx;
    g.clear();
    // 용병 마나 막대 (머리 위, 마나가 있을 때만)
    for (const u of this.scene.mercs) {
      if (u.dragging || u.mana <= 0) continue;
      const w = 26, x = Math.round(u.x - w / 2), y = Math.round(u.y - 34);
      const full = u.mana >= u.maxMana;
      g.fillStyle(0x1b1b26, 0.85).fillRect(x - 1, y - 1, w + 2, 5);
      g.fillStyle(full ? 0x9fe0ff : 0x4a8fe8).fillRect(x, y, Math.round((w * Math.min(u.mana, u.maxMana)) / u.maxMana), 3);
    }
    for (const m of this.scene.monsters) {
      // 물량: 일반 몬스터는 체력 막대 없음 (정예·보스만)
      // 스킬 정예 (2026-11-24): 오라는 범위 원(종류 색), 디버프 정예는 보라 고리
      if (m.alive && m.eliteSkill) {
        const sk = m.eliteSkill;
        if (sk.type === 'aura') g.fillStyle(sk.color, 0.1).fillCircle(m.x, m.y, sk.range).lineStyle(2, sk.color, 0.55).strokeCircle(m.x, m.y, sk.range);
        else g.lineStyle(3, 0xb47cff, 0.9).strokeCircle(m.x, m.y, 26);
      }
      if (!m.alive || m.kind === 'normal' || (m.hp >= m.maxHp && !m.isBoss)) continue;
      const w = m.isBoss ? 72 : m.kind === 'elite' ? 48 : 36;
      const h = m.isBoss ? 8 : 4;
      const x = Math.round(m.x - w / 2);
      const y = Math.round(m.y - m.displayHeight / 2 - h - 6);
      g.fillStyle(0x1b1b26).fillRect(x - 2, y - 2, w + 4, h + 4);
      g.fillStyle(m.isBoss ? 0xff4d4d : 0x6fd36a).fillRect(x, y, Math.round(w * Math.max(0, m.hp / m.maxHp)), h);
    }
  }
}
