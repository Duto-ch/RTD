import Phaser from 'phaser';
import { BALANCE } from '../../config.js';
import { audio } from '../../systems/audio.js';
import { d2 } from './util.js';

/** 기절 몬스터가 거는 디버프 (보스 디버프와 같은 틀 — stun: 공격·스킬 정지) */
const STUN_GAZE = (dur) => ({ id: 'stun_gaze', name: '기절', dur, effect: { stun: true }, desc: '행동 불가' });

/** 몬스터 능력: 스킬 정예 오라·디버프 · 기절 몬스터 · 보스 디버프·분노 */
export class MonsterAbilities {
  constructor(scene) {
    /** @type {import('../GameScene.js').GameScene} */
    this.scene = scene;
  }

  /** 보스 디버프 능력: 쿨타임마다 랜덤 용병/영웅에게 시전 */
  /** 스킬 정예 오라 (2026-11-24): 매 프레임 범위 안 몬스터(자신 포함)에 수호·가속·재생 — 여러 오라가 겹치면 큰 값 */
  updateAuras() {
    const casters = this.scene.monsters.filter((m) => m.alive && m.eliteSkill?.type === 'aura');
    for (const m of this.scene.monsters) m.auraGuard = m.auraHaste = m.auraRegen = 0;
    for (const c of casters) {
      const { range, effect } = c.eliteSkill;
      const r2 = range * range;
      for (const m of this.scene.monsters) {
        if (!m.alive || d2(m, c) > r2) continue;
        if (effect.guard) m.auraGuard = Math.max(m.auraGuard, effect.guard);
        if (effect.haste) m.auraHaste = Math.max(m.auraHaste, effect.haste);
        if (effect.regen) m.auraRegen = Math.max(m.auraRegen, effect.regen);
      }
    }
  }

  /** 스킬 정예 디버프 (2026-11-24): cd 초마다 가까운 용병 targets 명에게 (그 디버프가 아직 없는 용병 먼저) */
  updateEliteSkills(dt) {
    const now = this.scene.gameTime;
    for (const m of this.scene.monsters) {
      const sk = m.eliteSkill;
      if (!m.alive || sk?.type !== 'debuff') continue;
      m.skillCd -= dt;
      if (m.skillCd > 0) continue;
      const r2 = sk.range * sk.range;
      const near = this.scene.mercs
        .map((u) => ({ u, d: d2(u, m), has: u.debuffs.some((x) => x.def.id === sk.id && x.until > now) }))
        .filter((o) => o.d <= r2)
        .sort((a, b) => a.has - b.has || a.d - b.d)
        .slice(0, sk.targets)
        .map((o) => o.u);
      if (!near.length) {
        m.skillCd = 0.5;
        continue;
      }
      m.skillCd = sk.cd;
      for (const u of near) {
        u.addDebuff(sk, now, Math.max(0.2, 1 - this.scene.bonus.debuffDur));
        this.scene.floatText(u.x, u.y - 36, sk.name, '#d6a8ff', 14);
      }
      this.scene.vfx.curse(m, near);
      audio.debuff();
    }
  }

  /** 기절 몬스터 (2026-11-24): cd 초마다 가까운 용병 1명을 잠깐 행동 불가 (이미 기절한 용병은 건너뜀) */
  updateStunners(dt) {
    const now = this.scene.gameTime;
    for (const m of this.scene.monsters) {
      if (!m.alive || !m.stun) continue;
      m.stunCd -= dt;
      if (m.stunCd > 0) continue;
      const r2 = m.stun.range * m.stun.range;
      let best = null;
      let bd = r2;
      for (const u of this.scene.mercs) {
        if (u.debuffState?.(now)?.stun) continue;
        const dd = d2(u, m);
        if (dd < bd) {
          bd = dd;
          best = u;
        }
      }
      if (!best) {
        m.stunCd = 0.5; // 가까이 올 때까지 자주 본다
        continue;
      }
      m.stunCd = m.stun.cd;
      best.addDebuff(STUN_GAZE(m.stun.dur), now, Math.max(0.2, 1 - this.scene.bonus.debuffDur));
      this.scene.vfx.curse(m, [best]);
      this.scene.floatText(best.x, best.y - 36, '기절', '#d6a8ff', 14);
      audio.debuff();
    }
  }

  updateBosses(dt) {
    const now = this.scene.gameTime;
    for (const boss of this.scene.monsters) {
      if (!boss.alive || !boss.isBoss) continue;
      const MS = BALANCE.milestone;
      if (boss.canEnrage) {
        // 분노: 체력이 enrageAt 이하로 떨어지면 빨라지고 디버프를 더 자주 쓴다
        if (!boss.enraged && boss.hp / boss.maxHp <= MS.enrageAt) {
          boss.enraged = true;
          for (const a of boss.abilities) a.cd = Math.min(a.cd, 0.5);
          this.scene.showBanner('보스 분노!', `이동 속도 +${Math.round((MS.enrageSpeed - 1) * 100)}%, 디버프 쿨타임 절반`, '#ff5050');
          this.scene.cameras.main.shake(300, 0.008);
          audio.bossAppear();
        }
      }
      for (const a of boss.abilities) {
        a.cd -= dt;
        if (a.cd > 0) continue;
        a.cd = a.def.cd * (boss.enraged ? MS.enrageCdMult : 1);
        const mercs = this.scene.mercs.filter((m) => !m.dragging);
        if (!mercs.length) continue;
        const n =
          BALANCE.boss.targetsBase + Math.floor(this.scene.wave / BALANCE.boss.targetsPerWaves) + (boss.milestone ? MS.extraTargets : 0) - this.scene.bonus.debuffTargets;
        const targets = Phaser.Utils.Array.Shuffle([...mercs]).slice(0, Math.max(1, n));
        for (const t of targets) {
          t.addDebuff(a.def, now, Math.max(0.2, 1 - this.scene.bonus.debuffDur));
          this.scene.floatText(t.x, t.y - 36, a.def.name, '#d6a8ff', 16);
        }
        this.scene.vfx.curse(boss, targets);
        audio.debuff();
        this.scene.floatText(boss.x, boss.y - 48, a.def.name, '#d6a8ff', 22, true);
      }
    }
  }
}
