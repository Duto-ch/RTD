import Phaser from 'phaser';
import { countTraits, activeTier, TRAIT_IDS, TRAITS } from '../../data/synergy.js';
import { audio } from '../../systems/audio.js';
import { d2 } from './util.js';

/** 시너지: 계열·출신 단계 세기 · 웨이브 시작 효과 · 숲의 일족 덩굴 */
export class SynergySystem {
  constructor(scene) {
    /** @type {import('../GameScene.js').GameScene} */
    this.scene = scene;
    this.rootTimer = 0; // 숲의 일족: 덩굴 속박 주기
    this.synHeard = null;
  }

  /** 시너지 다시 세기 (필드가 바뀔 때마다) */
  recomputeSynergy() {
    const counts = countTraits(this.scene.mercs.filter((m) => !m.dragging));
    const tiers = {};
    for (const k of TRAIT_IDS) {
      const t = activeTier(k, counts[k]);
      if (t) tiers[k] = t;
    }
    const before = this.scene.syn?.tiers || {};
    this.scene.syn = { counts, tiers };
    // 필드 캐릭터마다 켜진 시너지 상징 (2026-11-22)
    for (const m of this.scene.mercs) m.setSynMarks(m.dragging ? [] : [...new Set([m.cls, m.origin, ...m.extraTraits])].filter((k) => tiers[k]));
    for (const m of this.scene.reserve || []) m?.setSynMarks?.([]);
    // 시너지 단계가 올라가면 소리 (끄는 중엔 세지 않고, 놓은 뒤 끌기 전과 비교)
    if (!this.scene.mercs.some((m) => m.dragging)) {
      const idx = (k, t) => (t ? TRAITS[k].tiers.indexOf(t) : -1);
      const up = TRAIT_IDS.some((k) => idx(k, tiers[k]) > idx(k, this.synHeard?.[k]));
      if (up && this.synHeard) audio.synergy();
      this.synHeard = tiers;
    }
    // 새로 켜진 시너지 알림
    for (const k of TRAIT_IDS) if (tiers[k] && tiers[k] !== before[k]) this.scene.tut.show('synergy');
    this.scene.hud?.refreshSynergy?.();
  }

  /** 웨이브 시작 때 시너지 효과: 기사단 실드 · 호수 성벽 회복 · 지원가 골드 · 길드 이자·무료 리롤 · 북방 분노 초기화 */
  waveSynergy(w) {
    const T = this.scene.syn.tiers;
    if (T.knight?.shield) this.scene.wallShield = Math.max(this.scene.wallShield, T.knight.shield);
    if (w >= 2 && T.lake?.wallHeal) this.scene.wallHp = Math.min(this.scene.wallMax, this.scene.wallHp + T.lake.wallHeal);
    let gold = 0;
    if (w >= 2 && T.support?.waveGold) gold += T.support.waveGold;
    if (w >= 2 && T.guild?.interest) gold += Math.min(T.guild.interestMax, Math.floor(this.scene.gold * T.guild.interest));
    if (gold) {
      this.scene.gold += gold;
      this.scene.floatText(300, 150, `+${gold}G 시너지`, '#f2c14e', 16, false, true);
    }
    this.scene.freeRerolls = (T.guild?.freeReroll || 0) + (this.scene.bonus.waveFreeReroll || 0);
    if (!T.north?.keepRage) for (const m of this.scene.mercs) m.rage = 0;
  }

  /** 숲의 일족 6·9: 주기마다 무작위 지점 덩굴 속박 */
  updateRoots(dt) {
    const root = this.scene.syn.tiers.grove?.root;
    if (!root) return;
    this.rootTimer -= dt;
    if (this.rootTimer > 0) return;
    this.rootTimer = root.every;
    const live = this.scene.monsters.filter((m) => m.alive && !m.isBoss);
    if (!live.length) return;
    const c = Phaser.Utils.Array.GetRandom(live);
    for (const m of live) if ((root.elite || m.kind === 'normal') && d2(m, c) <= root.r * root.r) m.applyStun(root.dur, this.scene.gameTime);
    this.scene.circleFx(c.x, c.y, root.r, 0x3e8a50);
  }
}
