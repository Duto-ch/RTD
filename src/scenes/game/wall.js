import { BALANCE } from '../../config.js';
import { PATH_LENGTH } from '../../systems/path.js';
import { audio } from '../../systems/audio.js';

/** 성벽: 최대 체력 · 한 바퀴 돈 몬스터의 성벽 피해 */
export class Wall {
  constructor(scene) {
    /** @type {import('../GameScene.js').GameScene} */
    this.scene = scene;
    this.lakeRevived = false; // 호수의 성역 9: 성벽 부활 1회
  }

  /** 성벽 최대 체력 (명성 강화 '성벽 보강' + 유물 돌 심장) */
  get wallMax() {
    return BALANCE.wall.hp + (this.scene.bonus.wallHp || 0);
  }

  /** 성벽이 0 이 됐는지 — 호수의 성역 9 면 한 판에 한 번 되살리고, 아니면 패배 */
  checkBreach() {
    const s = this.scene;
    const lake = s.syn.tiers.lake;
    if (s.wallHp <= 0 && lake?.revive && !this.lakeRevived) {
      this.lakeRevived = true;
      s.wallHp = Math.round(this.wallMax * lake.revive);
      s.showBanner('호수의 성역', `성벽 ${Math.round(lake.revive * 100)}% 부활`, '#3a8fb0');
      s.cameras.main.flash(300, 120, 200, 255);
    }
    if (s.wallHp <= 0) {
      s.refreshHud(); // 성벽 체력 0 을 화면에 반영하고 끝낸다
      s.endGame(false, '성벽 붕괴');
    }
  }

  /** 한 바퀴를 돈 몬스터가 성벽을 때린다 (몬스터는 계속 돈다) */
  checkLaps() {
    for (const m of this.scene.monsters) {
      if (!m.alive) continue;
      const laps = Math.floor(m.dist / PATH_LENGTH);
      if (laps > m.lapHits) {
        m.lapHits = laps;
        this.hitWall(m);
      }
    }
  }

  hitWall(m) {
    const D = BALANCE.wall.dmg;
    let dmg = m.isBoss ? (m.isFinal ? D.final : m.milestone ? D.milestone : D.boss) : D[m.kind] ?? D.normal;
    dmg *= 1 - (this.scene.syn.tiers.knight?.wallDmg || 0); // 왕국 기사단: 성벽 피해 -
    if (this.scene.wallShield > 0) {
      const used = Math.min(this.scene.wallShield, dmg);
      this.scene.wallShield -= used;
      dmg -= used;
    }
    this.scene.wallHp = Math.max(0, this.scene.wallHp - dmg);
    // 연출: 출발점(성문)에서 붉은 번쩍임 — 물량이 많으니 0.15초에 한 번만. 정예·보스는 숫자와 흔들림
    if (m.kind !== 'normal') {
      this.scene.floatText(m.x, m.y - 30, `성벽 -${Math.round(dmg)}`, '#ff6a55', 20, true);
      this.scene.cameras.main.shake(m.isBoss ? 300 : 120, m.isBoss ? 0.01 : 0.004);
    }
    if (this.scene.gameTime - this.scene.wallFxAt > 0.15) {
      this.scene.wallFxAt = this.scene.gameTime;
      this.scene.circleFx(m.x, m.y, 26, 0xff5040);
      audio.wallHit(false);
    }
    if (m.kind !== 'normal') audio.wallHit(true);
    audio.wallHealth(this.scene.wallHp, this.wallMax); // 위험하면 경고음
  }
}
