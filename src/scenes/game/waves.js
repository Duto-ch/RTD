import Phaser from 'phaser';
import { BALANCE } from '../../config.js';
import { Monster } from '../../objects/Monster.js';
import { ATTRS } from '../../data/elements.js';
import { waveInfo, spawnList, isMilestoneWave, specialCounts } from '../../data/waves.js';
import { biomeForWave } from '../../data/biomes.js';
import { audio } from '../../systems/audio.js';
import { FAME } from '../../data/upgrades.js';

/** 웨이브 진행: 정비 시간 ↔ 웨이브 · 몬스터 출현 · 바로 시작 */
export class WaveDirector {
  constructor(scene) {
    /** @type {import('../GameScene.js').GameScene} */
    this.scene = scene;
    this.spawnTimer = 0;
    this.spawnInterval = 0;
    this.lastCall = null;
    this.waveAttrs = ATTRS; // 몬스터 그림 색만 (룰 v2: 속성 상성 없음)
  }

  updateWaves(dt) {
    // 정비 시간이 끝나면 다음 웨이브 (웨이브 중에는 시간이 흐르지 않는다 — 몬스터를 다 잡아야 끝)
    if (!this.inWave) {
      this.scene.waveTimer -= dt;
      if (this.scene.waveTimer <= 0) this.startWave(this.scene.wave + 1);
    }
    if (this.scene.spawnQueue.length) {
      this.spawnTimer -= dt;
      // 성능 보호: 필드가 꽉 차면 출현을 잠시 멈춘다 (패배 조건 아님)
      if (this.scene.monsters.length >= BALANCE.horde.maxAlive) this.spawnTimer = Math.max(this.spawnTimer, 0);
      while (this.spawnTimer <= 0 && this.scene.spawnQueue.length && this.scene.monsters.length < BALANCE.horde.maxAlive) {
        this.spawnMonster(this.scene.spawnQueue.shift());
        this.spawnTimer += this.spawnInterval;
      }
    }
  }

  startWave(w) {
    if (w >= 2) this.scene.earnFame(FAME.perWave(w - 1)); // 앞 웨이브를 버텼으니 명성
    // 명성 강화: 군량 보급(웨이브마다 골드) + 이자 수익(보유 골드의 %, 최대 웨이브×20G)
    const b = this.scene.bonus;
    const income = b.waveGold + Math.min(Math.floor(this.scene.gold * b.interest), w * 20);
    if (income > 0) {
      this.scene.gold += income;
      this.scene.floatText(300, 128, `+${income}G`, '#f2c14e', 16, false, true);
    }
    // 명성 강화 '성벽 수리': 웨이브마다 성벽 회복
    if (b.wallRegen && w >= 2) this.scene.wallHp = Math.min(this.scene.wallMax, this.scene.wallHp + b.wallRegen);
    this.scene.waveSynergy(w);
    this.scene.waveItems(w);
    // 상점 (2026-11-22 사용자 결정): 웨이브가 끝날 때(몬스터를 다 잡았을 때) 새로 채운다 — 테스트·디버그로 웨이브를 건너뛰면 여기서
    if (w >= 2 && !this.scene.shopRefreshed) this.scene.refillShopNow();
    this.scene.shopRefreshed = false;
    this.scene.wave = w;
    this.scene.phase = 'wave'; // 웨이브 중: 용병 구매·배치·아이템 장착 금지 (2026-11-24)
    const info = waveInfo(w);
    if (info.type === 'normal' || info.type === 'elite') audio.waveStart(info.type, w); // 보스 웨이브는 보스가 나올 때 전쟁나팔
    const list = spawnList(w);
    this.scene.spawnQueue.push(...list);
    // 몬스터 그림 색 (룰 v2: 속성 상성 없음 — 색만 섞는다)
    this.waveAttrs = Phaser.Utils.Array.Shuffle([...ATTRS]).slice(0, BALANCE.monster.attrsPerWave);
    this.spawnInterval = BALANCE.spawnWindow / list.length;
    this.spawnTimer = 0;
    this.scene.waveTimer = 0;
    this.scene.changeBiome(biomeForWave(w));
    const sub =
      info.type === 'final' ? `최종 보스 출현 · 1회 부활` :
      info.type === 'milestone' ? `강화 보스 + 정예 ${info.elite}기! 분노 주의` :
      info.type === 'boss' ? `보스 등장! 한 바퀴 돌 때마다 성벽 -${BALANCE.wall.dmg.boss}` :
      info.type === 'elite' ? `몬스터 ${info.normal}기 + 정예 ${info.elite}기` : `몬스터 ${info.normal}기`;
    // 특수 몬스터 (2026-11-24): 배너 아래 줄에 종류·수 (예: '빠름 7 · 방어력 5')
    const sp = Object.entries(specialCounts(w)).filter(([, n]) => n > 0).map(([id, n]) => `${BALANCE.special.types[id].name} ${n}`);
    const subLine = sp.length ? `${sub} · ${sp.join(' · ')}` : sub;
    const color = info.type === 'final' ? '#ff4dd2' : info.type === 'milestone' ? '#d6a8ff' : info.type === 'boss' ? '#ff6a55' : info.type === 'elite' ? '#f2c14e' : '#ffffff';
    this.scene.showBanner(`WAVE ${w}`, subLine, color);
    if (w === 1) {
      this.scene.tut.show('wave');
      this.scene.tut.show('prep');
    }
    // 끌고 있던 용병은 제자리로 (배치는 정비 시간에만)
    for (const u of this.scene.allUnits) {
      if (!u.dragging) continue;
      u.dragging = false;
      u.snapToCell();
    }
    this.scene.refreshShop();
  }

  /** 웨이브 중인가 — 용병 구매·배치(필드 안 이동·대기석 바꾸기)·아이템 장착은 정비 시간에만 (2026-11-24 사용자 결정) */
  get inWave() {
    return this.scene.phase === 'wave';
  }

  /** 웨이브 중이면 막고 알린다 (막았으면 true) */
  lockedInWave(what) {
    if (!this.inWave) return false;
    this.scene.toast(`웨이브 중 ${what} 불가 → 정비 시간에`);
    return true;
  }

  /** 웨이브 몬스터를 모두 잡았다 → 상점 새로 고침 + 정비 시간 */
  endWave() {
    this.scene.phase = 'prep';
    this.scene.waveTimer = BALANCE.prepTime;
    if (!this.scene.shopRefreshed) this.scene.refillShopNow();
    this.scene.toast(`웨이브 클리어 · 정비 시간 ${BALANCE.prepTime}초`);
    this.scene.refreshShop();
    this.scene.refreshHud();
  }

  /** 필드의 몬스터를 전부 처치했다 (나올 몬스터도 남아 있지 않다) — 웨이브가 끝나는 조건 */
  get canCallNextWave() {
    return !this.scene.over && this.scene.monsters.length === 0 && this.scene.spawnQueue.length === 0;
  }

  /** 바로 시작: 정비 시간에 남은 시간을 건너뛰고 다음 웨이브 (실수 연타 방지 0.6초) */
  callNextWave() {
    if (this.scene.menuOpen || this.scene.tut.open || this.inWave || !this.canCallNextWave) return;
    const now = this.scene.time.now;
    if (now - (this.lastCall || 0) < 600) return;
    this.lastCall = now;
    this.startWave(this.scene.wave + 1);
    audio.coin();
    this.scene.refreshHud();
  }

  spawnMonster(entry) {
    const [kind, variant = null] = entry.split(':'); // 특수 몬스터는 'normal:<종류>' (2026-11-24)
    const m = new Monster(this.scene, kind, Phaser.Utils.Array.GetRandom(this.waveAttrs), this.scene.wave, kind === 'boss' && isMilestoneWave(this.scene.wave), variant);
    this.scene.monsters.push(m);
    if (variant && kind === 'normal') this.scene.tut.show('special');
    if (m.eliteSkill) {
      this.scene.floatText(m.x, m.y - 40, m.eliteSkill.name, '#d6a8ff', 16, true);
      this.scene.tut.show('eliteSkill');
    }
    if (m.isBoss) {
      audio.bossAppear(); // 전쟁나팔(audio.warHorn)은 2026-11-24 사용자 결정으로 보류 — 예전 우르릉 소리
      this.scene.tut.show('boss');
      this.scene.showBanner(m.isFinal ? `최종 보스: ${m.design.name}` : `${m.milestone ? '강화 보스' : '보스'}: ${m.design.name}`, m.abilities.map((a) => `${a.def.name}(${a.def.desc} ${a.def.dur}초)`).join(' / '), '#d6a8ff');
    }
  }

  cleanupMonsters() {
    if (this.scene.monsters.some((m) => !m.alive)) this.scene.monsters = this.scene.monsters.filter((m) => m.alive);
  }
}
