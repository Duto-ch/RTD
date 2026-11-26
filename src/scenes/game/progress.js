import Phaser from 'phaser';
import { GAME_W } from '../../config.js';
import { RELIC_BY_ID, relicBonus, addBonus } from '../../data/relics.js';
import { dissolveIn } from '../../ui/dissolve.js';
import { audio } from '../../systems/audio.js';
import { meta } from '../../systems/meta.js';
import { UPGRADES } from '../../data/upgrades.js';

/** 판 밖 성장과의 연결: 명성 강화 반영 · 유물 · 명성 · 마정석 · 술집 강화 */
export class RunProgress {
  constructor(scene) {
    /** @type {import('../GameScene.js').GameScene} */
    this.scene = scene;
    this.debugRelics = null;
  }

  /** 강화 창을 닫고 돌아오면 효과를 바로 반영 */
  watchUpgrades() {
    const onResume = () => this.applyBonus();
    this.scene.events.on('resume', onResume);
    this.scene.events.once('shutdown', () => {
      this.scene.events.off('resume', onResume);
      this.scene.resetAnimClock();
    });
  }

  /** 살 수 있는 강화 노드가 있는가 ('강화' 버튼의 "!" 표시) */
  get canUpgrade() {
    return !this.scene.over && UPGRADES.some((u) => meta.status(u.id) === 'ok');
  }

  openUpgrades() {
    if (this.scene.over || this.scene.menuOpen || this.scene.tut.open) return;
    this.scene.select(null);
    this.scene.hud.hideRelicTip();
    this.scene.scene.launch('Upgrade', { from: 'game' });
    this.scene.scene.bringToTop('Upgrade');
    dissolveIn(this.scene.scene, 'Upgrade'); // 강화 창이 서서히 나타남 (2026-11-23)
    this.scene.scene.pause();
  }

  /** 강화 효과 다시 읽기 (시작 골드·징집령처럼 판 시작 때만 쓰는 효과는 다음 판부터) */
  applyBonus() {
    const before = this.scene.wallMax;
    this.scene.bonus = meta.bonus();
    if (this.debugRelics) this.scene.bonus = addBonus(this.scene.bonus, relicBonus(Object.keys(this.debugRelics), this.debugRelics, this.scene.bonus.relicPow || 0));
    this.scene.wallHp += this.scene.wallMax - before; // 성벽 보강을 판 도중에 찍으면 늘어난 만큼 바로 더한다
    this.scene.refreshRelics();
    this.scene.refreshHud();
    this.scene.refreshInfo();
  }

  get maxRelics() {
    return meta.relicSlots;
  }

  get activeRelicCount() {
    return this.scene.ownedRelics.length;
  }

  /** 디버그·테스트용: 이번 판에만 유물 하나 더 장착 (저장 안 함, 칸이 가득 차면 false) */
  addRelic(id, level = 1) {
    if (!RELIC_BY_ID[id] || this.scene.ownedRelics.length >= this.maxRelics) return false;
    this.scene.ownedRelics.push({ id, level, active: true });
    this.debugRelics = { ...this.debugRelics, [id]: level };
    this.scene.bonus = addBonus(this.scene.bonus, relicBonus([id], { [id]: level }, this.scene.bonus.relicPow || 0));
    this.scene.refreshRelics();
    return true;
  }

  /** 마정석 (보스 처치): 바로 저장 — 영지 술집·유물 공방에서 쓴다 */
  earnStones(n, x, y) {
    if (!n) return;
    meta.addStones(n);
    audio.gem();
    this.scene.stonesEarned += n;
    this.scene.floatText(x, y - 54, `마정석 +${n}`, '#6fe0d6');
    this.scene.toast(`마정석 +${n} (보유 ${meta.stones})`, '#6fe0d6');
    this.scene.tut.show('stones');
  }

  /** 술집 강화 단계 (Mercenary.getStats) */
  enhanceOf(id) {
    return this.scene.enhanceMap[id] || 0;
  }

  /** 명성 적립 — 바로 저장해서 판 도중에도 성탑에서 쓸 수 있다 */
  earnFame(n) {
    const v = Math.round(n * (1 + this.scene.bonus.fameMult));
    this.scene.fameEarned += v;
    meta.addFame(v);
  }

  /** 판이 끝날 때 최고 기록 저장 (한 번만) */
  creditFame() {
    if (this.scene.fameCredited) return;
    this.scene.fameCredited = true;
    meta.record(this.scene.wave);
  }

  /** 최종 보스(100웨이브마다)를 완전히 쓰러뜨리면 축하하고 그대로 다음 웨이브로 이어진다 */
  celebrateCycle() {
    audio.victory();
    this.scene.time.delayedCall(1200, () => !this.scene.over && audio.playMusic('battle'));
    for (let i = 0; i < 8; i++) this.scene.time.delayedCall(i * 180, () => this.scene.vfx.firework(Phaser.Math.Between(60, GAME_W - 60), Phaser.Math.Between(160, 600)));
    this.scene.cameras.main.flash(500, 255, 220, 120);
    this.scene.showBanner(`${this.scene.wave} 웨이브 돌파!`, '최종 보스 격파 · 웨이브 계속', '#f2c14e');
  }
}
