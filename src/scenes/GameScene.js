import Phaser from 'phaser';
import { hiRes } from '../systems/hires.js';
import { GAME_W, GAME_H, WIDE, PX, UI_PX, GRID, CELL, FIELD_X, FIELD_Y, FONT, DEPTH, BALANCE, TOWER_CELL } from '../config.js';
import { Monster } from '../objects/Monster.js';
import { Mercenary, MAX_LEVEL } from '../objects/Mercenary.js';
import { Button } from '../ui/Button.js';
import { Tutorial } from '../ui/Tutorial.js';
import { Hud } from '../ui/Hud.js';
import { panel, panelImage, titleTab, uiText, drawIcon, C, CSS } from '../ui/theme.js';
import { ATTRS, ATTR_INFO, elementMultiplier } from '../data/elements.js';
import { MERC_CLASS_IDS, HEROES } from '../data/heroes.js';
import { skillOptions, isDamaging } from '../data/skills.js';
import { RELICS, RELIC_BY_ID } from '../data/relics.js';
import { waveInfo, spawnList, isMilestoneWave } from '../data/waves.js';
import { cellAt, cellCenter, PATH_LENGTH } from '../systems/path.js';
import { Vfx } from '../systems/vfx.js';
import { playOnce, playBase, setArt, setFacing } from '../systems/customArt.js';
import { biomeForWave } from '../data/biomes.js';
import { audio } from '../systems/audio.js';
import { meta } from '../systems/meta.js';
import { FAME, UPGRADES } from '../data/upgrades.js';

const text = (scene, x, y, str, size = 22, color = '#ffffff', extra = {}) =>
  scene.add.text(x, y, str, { fontFamily: FONT, fontSize: `${size}px`, color, ...extra }).setDepth(DEPTH.ui);

const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    hiRes(this);
    this.gameTime = 0;
    this.speed = 1;
    this.paused = false;
    this.over = false;
    this.bonus = meta.load().bonus(); // 명성 강화 효과 (판 시작 시 고정)
    this.bestWave = meta.data.best.normal || 0; // 지금까지 최고 도달 웨이브 (무한 웨이브)
    this.fameEarned = 0; // 이번 판에서 얻은 명성 (판이 끝날 때 저장)
    this.fameCredited = false;
    this.gold = BALANCE.startGold + this.bonus.startGold;
    this.goldFrac = 0; // 물량: 일반 몬스터 골드는 소수라 모아서 정수로 지급
    // 성벽 체력: 몬스터가 한 바퀴 돌 때마다 깎이고 0이면 패배. 실드는 판 시작 때만 주어지고 먼저 깎인다
    this.wallHp = this.wallMax;
    this.wallShield = this.bonus.wallShield || 0;
    this.wallFxAt = 0;
    this.wave = 0;
    this.waveTimer = BALANCE.prepTime;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.spawnInterval = 0;
    this.monsters = [];
    this.grid = Array.from({ length: GRID }, () => Array(GRID).fill(null));
    this.ownedRelics = []; // { id, active } — 활성 유물만 효과 (최대 BALANCE.maxActiveRelics + 명성 강화)
    this.relics = {}; // 활성 유물 id → 개수 (능력치 계산용, recomputeRelics 가 갱신)
    this.waveAttrs = ATTRS;
    this.relicChoice = null;
    this.selected = null;
    this.totalKills = 0;
    this.hudTimer = 0;
    this.activeTexts = 0;
    this.tweens.timeScale = 1;

    this.biome = biomeForWave(1);
    this.bgImage = this.add.image(0, 0, `bg_${this.biome.id}`).setOrigin(0).setScale(UI_PX).setDepth(DEPTH.bg);
    this.rangeGfx = this.add.graphics().setDepth(DEPTH.merc - 1);
    this.hintGfx = this.add.graphics().setDepth(DEPTH.merc - 1);
    this.hpGfx = this.add.graphics().setDepth(DEPTH.hpbar);
    this.vfx = new Vfx(this);
    audio.playMusic('battle');
    this.events.on('firework-pop', () => audio.firework());

    this.createTower();
    this.hud = new Hud(this);
    this.tut = new Tutorial(this);
    this.time.delayedCall(400, () => this.tut.show('hire'));
    this.setupInput();
    this.refreshHud();
    this.refreshInfo();
    this.showBanner('용병단 디펜스', `${BALANCE.prepTime}초 후 1웨이브 시작`);
    this.conscript();
  }

  // ───────────────────────── 성탑 (명성 강화) ─────────────────────────
  /** 필드 가운데 성탑: 누르면 전투를 멈추고 강화 트리를 연다. 살 수 있는 노드가 있으면 "!" 표시 */
  createTower() {
    const c = cellCenter(TOWER_CELL.col, TOWER_CELL.row);
    this.tower = setArt(this.add.sprite(c.x, c.y + CELL / 2 - PX, 'bld_tower'), 'bld_tower', PX).setOrigin(0.5, 1).setDepth(DEPTH.merc - 0.5);
    playBase(this.tower, 'idle');
    this.tower.setInteractive({ useHandCursor: true });
    this.tower.on('pointerover', () => this.tower.setTint(0xfff1c0));
    this.tower.on('pointerout', () => this.tower.clearTint());
    this.tower.on('pointerup', () => this.openUpgrades());
    // "!" 말풍선 (살 수 있는 노드가 있을 때)
    this.towerBadge = this.add.container(c.x + 20, c.y - 18).setDepth(DEPTH.merc + 1).setVisible(false);
    this.towerBadge.add([
      this.add.circle(0, 0, 11, 0xffd36a).setStrokeStyle(3, 0x3a2608),
      uiText(this, 0, 0, '!', 14, '#3a2608', 'bold').setOrigin(0.5)
    ]);
    this.tweens.add({ targets: this.towerBadge, y: c.y - 24, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // 강화 창을 닫고 돌아오면 효과를 바로 반영
    const onResume = () => this.applyBonus();
    this.events.on('resume', onResume);
    this.events.once('shutdown', () => this.events.off('resume', onResume));
  }

  isTowerCell(col, row) {
    return col === TOWER_CELL.col && row === TOWER_CELL.row;
  }

  /** 용병을 놓을 수 있는 칸 수 (성탑 칸 제외) */
  get fieldSlots() {
    return GRID * GRID - 1;
  }

  openUpgrades() {
    if (this.over || this.menuOpen || this.relicChoice || this.tut.open) return;
    this.select(null);
    this.hud.hideRelicTip();
    this.scene.launch('Upgrade', { from: 'game' });
    this.scene.bringToTop('Upgrade');
    this.scene.pause();
  }

  /** 강화 효과 다시 읽기 (시작 골드·징집령처럼 판 시작 때만 쓰는 효과는 다음 판부터) */
  applyBonus() {
    const before = this.wallMax;
    this.bonus = meta.bonus();
    this.wallHp += this.wallMax - before; // 성벽 보강을 판 도중에 찍으면 늘어난 만큼 바로 더한다
    this.refreshRelics();
    this.refreshHud();
    this.refreshInfo();
  }

  /** 명성 강화 '징집령': 시작할 때 무료 용병 배치 */
  conscript() {
    for (let i = 0; i < this.bonus.conscripts; i++) this.hire({ free: true, minLevel: this.bonus.veteran ? 2 : 1 });
  }

  // ───────────────────────── 루프 ─────────────────────────
  update(_t, delta) {
    if (this.over) return;
    const dt = this.paused || this.relicChoice || this.menuOpen || this.tut.open ? 0 : Math.min(delta / 1000, 0.1) * this.speed;
    this.gameTime += dt;

    if (dt > 0) {
      this.updateWaves(dt);
      // 이동 속도: 서리 왕관(유물) + 명성 강화(서릿길·늪지 함정·족쇄)
      const b = this.bonus;
      const relicSlow = 0.1 * (this.relics.frost_crown || 0) * (1 + b.relicPow);
      const mul = {
        normal: Math.max(0.4, 1 - relicSlow - b.monsterSlow),
        elite: Math.max(0.4, 1 - relicSlow - b.monsterSlow - b.eliteSlow),
        boss: Math.max(0.4, 1 - relicSlow - b.bossSlow)
      };
      for (const m of this.monsters) if (m.alive) m.tick(dt, this.gameTime, mul[m.kind] ?? mul.normal);
      this.checkLaps();
      this.updateBosses(dt);
      this.updateMercs(dt);
      this.cleanupMonsters();
    }

    this.drawHpBars();
    this.drawRange();

    this.hudTimer -= delta;
    if (this.hudTimer <= 0) {
      this.hudTimer = 100;
      this.refreshHud();
    }

    if (this.wallHp <= 0) {
      this.refreshHud(); // 성벽 체력 0 을 화면에 반영하고 끝낸다
      this.endGame(false, '성벽이 무너졌습니다');
    }
  }

  /** 한 바퀴를 돈 몬스터가 성벽을 때린다 (몬스터는 계속 돈다) */
  checkLaps() {
    for (const m of this.monsters) {
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
    if (this.wallShield > 0) {
      const used = Math.min(this.wallShield, dmg);
      this.wallShield -= used;
      dmg -= used;
    }
    this.wallHp = Math.max(0, this.wallHp - dmg);
    // 연출: 출발점(성문)에서 붉은 번쩍임 — 물량이 많으니 0.15초에 한 번만. 정예·보스는 숫자와 흔들림
    if (m.kind !== 'normal') {
      this.floatText(m.x, m.y - 30, `성벽 -${Math.round(dmg)}`, '#ff6a55', 20, true);
      this.cameras.main.shake(m.isBoss ? 300 : 120, m.isBoss ? 0.01 : 0.004);
    }
    if (this.gameTime - this.wallFxAt > 0.15) {
      this.wallFxAt = this.gameTime;
      this.circleFx(m.x, m.y, 26, 0xff5040);
      audio.debuff?.();
    }
  }

  // ───────────────────────── 웨이브 ─────────────────────────
  updateWaves(dt) {
    this.waveTimer -= dt;
    if (this.waveTimer <= 0) this.startWave(this.wave + 1);
    if (this.spawnQueue.length) {
      this.spawnTimer -= dt;
      // 성능 보호: 필드가 꽉 차면 출현을 잠시 멈춘다 (패배 조건 아님)
      if (this.monsters.length >= BALANCE.horde.maxAlive) this.spawnTimer = Math.max(this.spawnTimer, 0);
      while (this.spawnTimer <= 0 && this.spawnQueue.length && this.monsters.length < BALANCE.horde.maxAlive) {
        this.spawnMonster(this.spawnQueue.shift());
        this.spawnTimer += this.spawnInterval;
      }
    }
  }

  startWave(w) {
    if (w >= 2) this.earnFame(FAME.perWave(w - 1)); // 앞 웨이브를 버텼으니 명성
    // 명성 강화: 군량 보급(웨이브마다 골드) + 이자 수익(보유 골드의 %, 최대 웨이브×20G)
    const b = this.bonus;
    const income = b.waveGold + Math.min(Math.floor(this.gold * b.interest), w * 20);
    if (income > 0) {
      this.gold += income;
      this.floatText(WIDE ? 300 : GAME_W - 120, WIDE ? 128 : 100, `+${income}G`, '#f2c14e');
    }
    // 명성 강화 '성벽 수리': 웨이브마다 성벽 회복
    if (b.wallRegen && w >= 2) this.wallHp = Math.min(this.wallMax, this.wallHp + b.wallRegen);
    this.wave = w;
    const info = waveInfo(w);
    const list = spawnList(w);
    this.spawnQueue.push(...list);
    // 이번 웨이브 몬스터 속성: 최대 attrsPerWave 종류
    this.waveAttrs = Phaser.Utils.Array.Shuffle([...ATTRS]).slice(0, BALANCE.monster.attrsPerWave);
    this.spawnInterval = BALANCE.spawnWindow / list.length;
    this.spawnTimer = 0;
    this.waveTimer = BALANCE.waveDuration;
    this.changeBiome(biomeForWave(w));
    const sub =
      info.type === 'final' ? `최종 보스 출현! 쓰러뜨려도 한 번 되살아납니다` :
      info.type === 'milestone' ? `강화 보스 + 정예 ${info.elite}기! 분노·속성 변환 주의` :
      info.type === 'boss' ? `보스 등장! 한 바퀴 돌 때마다 성벽 -${BALANCE.wall.dmg.boss}` :
      info.type === 'elite' ? `몬스터 ${info.normal}기 + 정예 10기` : `몬스터 ${info.normal}기`;
    const attrNames = this.waveAttrs.map((a) => ATTR_INFO[a].name).join('·');
    const color = info.type === 'final' ? '#ff4dd2' : info.type === 'milestone' ? '#d6a8ff' : info.type === 'boss' ? '#ff6a55' : info.type === 'elite' ? '#f2c14e' : '#ffffff';
    this.showBanner(`WAVE ${w}`, `${sub} · ${attrNames}`, color);
    if (w === 1) this.tut.show('wave');
  }

  /** 바로 시작은 필드의 몬스터를 전부 처치했을 때만 (나올 몬스터도 남아 있지 않을 때) */
  get canCallNextWave() {
    return !this.over && this.monsters.length === 0 && this.spawnQueue.length === 0;
  }

  /** 다음 웨이브를 바로 시작 (실수 연타 방지 0.6초) */
  callNextWave() {
    if (this.menuOpen || this.relicChoice || this.tut.open || !this.canCallNextWave) return;
    const now = this.time.now;
    if (now - (this.lastCall || 0) < 600) return;
    this.lastCall = now;
    this.startWave(this.wave + 1);
    audio.coin();
    this.refreshHud();
  }

  /** 지역(배경) 전환: 새 배경이 서서히 덮인다 */
  changeBiome(biome) {
    if (biome.id === this.biome.id) return;
    this.biome = biome;
    const old = this.bgImage;
    this.bgImage = this.add.image(0, 0, `bg_${biome.id}`).setOrigin(0).setScale(UI_PX).setDepth(DEPTH.bg + 0.5).setAlpha(0);
    this.tweens.add({
      targets: this.bgImage,
      alpha: 1,
      duration: 1200,
      onComplete: () => {
        old.destroy();
        this.bgImage.setDepth(DEPTH.bg);
      }
    });
    this.time.delayedCall(2300, () => !this.over && this.toast(`새로운 지역: ${biome.name}`));
  }

  spawnMonster(kind) {
    const m = new Monster(this, kind, Phaser.Utils.Array.GetRandom(this.waveAttrs), this.wave, kind === 'boss' && isMilestoneWave(this.wave));
    this.monsters.push(m);
    if (m.isBoss) {
      audio.bossAppear();
      this.tut.show('boss');
      this.showBanner(m.isFinal ? `최종 보스: ${m.design.name}` : `${m.milestone ? '강화 보스' : '보스'}: ${m.design.name}`, m.abilities.map((a) => `${a.def.name}(${a.def.desc} ${a.def.dur}초)`).join(' / '), '#d6a8ff');
    }
  }

  cleanupMonsters() {
    if (this.monsters.some((m) => !m.alive)) this.monsters = this.monsters.filter((m) => m.alive);
  }

  // ───────────────────────── 전투 ─────────────────────────
  get mercs() {
    return this.grid.flat().filter(Boolean);
  }

  monstersInRange(x, y, range) {
    const r2 = range * range;
    const out = [];
    for (const m of this.monsters) {
      if (!m.alive) continue;
      const dd = (m.x - x) ** 2 + (m.y - y) ** 2;
      if (dd <= r2) out.push({ m, dd });
    }
    return out.sort((a, b) => a.dd - b.dd).map((o) => o.m);
  }

  updateMercs(dt) {
    const now = this.gameTime;
    for (const merc of this.mercs) {
      if (merc.dragging) continue;
      const st = merc.getStats(this.relics, now);
      const deb = st.debuff;
      merc.sprite.setTint(deb.list.length ? (deb.stun ? 0x7a6a9a : 0xc89cff) : now < (merc.buffFlashUntil || 0) ? 0xfff2a0 : 0xffffff);
      // 상태 표시: 버프·디버프가 남아 있는 동안 계속 붙어 있고, 끝나면 떨어진다
      this.vfx.setStatus(merc, 'buff', st.buffed);
      this.vfx.setStatus(merc, 'debuff', deb.list.length > 0);
      if (deb.stun) continue; // 공포: 공격·스킬·쿨타임 모두 정지
      const inRange = this.monstersInRange(merc.x, merc.y, st.range);

      // 스킬: 쿨타임이 끝나면 자동 시전 (침묵 중엔 시전 불가, 시간 부식은 쿨타임 회복 저하)
      for (const s of merc.skills) {
        s.cd -= dt * deb.cdRate;
        if (!deb.silence && s.cd <= 0 && this.castSkill(merc, s.def, st, inRange)) s.cd = s.def.cd * (1 - this.bonus.cdr);
      }

      // 기본 공격
      merc.cooldown -= dt;
      if (merc.cooldown > 0) continue;
      const live = inRange.filter((m) => m.alive);
      if (!live.length) {
        merc.cooldown = 0;
        continue;
      }
      merc.cooldown = 1 / st.rate;
      for (const m of live.slice(0, st.targets)) this.basicAttack(merc, st, m);
      // 대상 쪽을 바라본다 (거의 위·아래에 있으면 방향 유지)
      const dx = live[0].x - merc.x;
      if (Math.abs(dx) > 8) setFacing(merc.sprite, dx < 0);
      // 공격 애니메이션이 있으면 재생, 없으면 살짝 튀어오르는 기본 동작
      // 애니메이션은 다음 공격 전에 끝나도록 (배속 반영) 공격 간격의 90% 안에 맞춘다
      if (!playOnce(merc.sprite, 'attack', 'idle', (900 / st.rate) / this.speed)) this.tweens.add({ targets: merc.sprite, y: -PX * 2, duration: 60, yoyo: true });
    }
  }

  /** 보스 디버프 능력: 쿨타임마다 랜덤 용병/영웅에게 시전 */
  updateBosses(dt) {
    const now = this.gameTime;
    for (const boss of this.monsters) {
      if (!boss.alive || !boss.isBoss) continue;
      const MS = BALANCE.milestone;
      if (boss.canEnrage) {
        // 분노: 체력이 enrageAt 이하로 떨어지면 빨라지고 디버프를 더 자주 쓴다
        if (!boss.enraged && boss.hp / boss.maxHp <= MS.enrageAt) {
          boss.enraged = true;
          for (const a of boss.abilities) a.cd = Math.min(a.cd, 0.5);
          this.showBanner('보스 분노!', `이동 속도 +${Math.round((MS.enrageSpeed - 1) * 100)}%, 디버프 쿨타임 절반`, '#ff5050');
          this.cameras.main.shake(300, 0.008);
          audio.bossAppear();
        }
      }
      if (boss.milestone) {
        // 속성 변환: 주기마다 다른 속성으로
        boss.shiftTimer -= dt;
        if (boss.shiftTimer <= 0) {
          boss.shiftTimer = MS.shiftEvery;
          const next = Phaser.Utils.Array.GetRandom(ATTRS.filter((a) => a !== boss.attr));
          boss.setAttr(next);
          this.vfx.burst(next, boss.x, boss.y, 24);
          this.floatText(boss.x, boss.y - 56, `속성 변환: ${ATTR_INFO[next].name}`, ATTR_INFO[next].css, 22, true);
        }
      }
      for (const a of boss.abilities) {
        a.cd -= dt;
        if (a.cd > 0) continue;
        a.cd = a.def.cd * (boss.enraged ? MS.enrageCdMult : 1);
        const mercs = this.mercs.filter((m) => !m.dragging);
        if (!mercs.length) continue;
        const n =
          BALANCE.boss.targetsBase + Math.floor(this.wave / BALANCE.boss.targetsPerWaves) + (boss.milestone ? MS.extraTargets : 0) - this.bonus.debuffTargets;
        const targets = Phaser.Utils.Array.Shuffle([...mercs]).slice(0, Math.max(1, n));
        for (const t of targets) {
          t.addDebuff(a.def, now, Math.max(0.2, 1 - this.bonus.debuffDur));
          this.floatText(t.x, t.y - 36, a.def.name, '#d6a8ff', 16);
        }
        this.vfx.curse(boss, targets);
        audio.debuff();
        this.floatText(boss.x, boss.y - 48, a.def.name, '#d6a8ff', 22, true);
      }
    }
  }

  hit(merc, st, target, mult, crit = false, carry = true) {
    const b = this.bonus;
    // 보스·정예: 기본 피해 배율 + 거인 사냥꾼, 그리고 왕/정예 사냥꾼
    const giant = target.kind === 'normal' ? 1 : (BALANCE.bossDamageMult + b.bossDmg) * (1 + (target.isBoss ? b.bossOnly : b.eliteOnly));
    let elem = elementMultiplier(merc.attr, target.attr);
    if (elem > 1) elem += b.advantage; // 속성 공명: 상성 우위 피해
    const dmg = st.damage * mult * giant * elem;
    const need = carry && target.kind === 'normal' ? target.hp / target.damageTakenMult(this.gameTime) : Infinity;
    this.damageMonster(target, dmg, { source: merc, crit });
    if (dmg > need) this.carryDamage(merc, target, dmg - need);
  }

  /** 물량 관통: 일반 몬스터를 죽이고 남은 피해가 가까운 다음 일반 몬스터로 넘어간다 (피해 총량이 낭비되지 않게) */
  carryDamage(merc, from, left) {
    const H = BALANCE.horde;
    const r2 = H.carryRadius * H.carryRadius;
    let x = from.x;
    let y = from.y;
    for (let hop = 0; hop < H.carryHops && left > 0.01; hop++) {
      let best = null;
      let bd = r2;
      for (const o of this.monsters) {
        if (!o.alive || o.kind !== 'normal') continue;
        const dd = (o.x - x) * (o.x - x) + (o.y - y) * (o.y - y);
        if (dd < bd) {
          bd = dd;
          best = o;
        }
      }
      if (!best) break;
      const need = best.hp / best.damageTakenMult(this.gameTime);
      x = best.x;
      y = best.y;
      this.damageMonster(best, left, { source: merc });
      left -= need;
    }
  }

  /** 연출·사운드용 유닛 종류: 용병 클래스 또는 영웅 원형 */
  kindOf(merc) {
    return merc.isHero ? merc.hero.arch : merc.cls;
  }

  basicAttack(merc, st, target) {
    this.vfx.attack(merc, target, this.kindOf(merc));
    audio.shoot(this.kindOf(merc));
    const crit = Math.random() < st.crit;
    if (st.slow) target.applySlow(st.slow, st.slowDur, this.gameTime);
    const pos = { x: target.x, y: target.y };
    this.hit(merc, st, target, crit ? st.critMult : 1, crit);
    if (st.splash) {
      for (const o of this.monsters) {
        if (o.alive && o !== target && d2(o, pos) <= st.splash ** 2) this.hit(merc, st, o, 1, false, false);
      }
      this.circleFx(pos.x, pos.y, st.splash, ATTR_INFO[merc.attr].color);
    }
    if (st.chain) {
      const chain = this.chainFrom(target, st.chain + 1);
      this.vfx.chain(chain, ATTR_INFO[merc.attr].color);
      for (const o of chain.slice(1)) this.hit(merc, st, o, 0.6, false, false);
    }
  }

  chainFrom(start, n) {
    const out = [start];
    let cur = start;
    while (out.length < n) {
      let best = null;
      let bd = 140 * 140;
      for (const m of this.monsters) {
        if (!m.alive || out.includes(m)) continue;
        const dd = d2(m, cur);
        if (dd < bd) {
          bd = dd;
          best = m;
        }
      }
      if (!best) break;
      out.push(best);
      cur = best;
    }
    return out;
  }

  /** 스킬 시전. 대상이 없어 시전하지 못하면 false (쿨타임 유지, 다음 프레임 재시도) */
  castSkill(merc, def, st, inRange) {
    const now = this.gameTime;
    const live = inRange.filter((m) => m.alive);
    let targets = [];
    let primary = null;

    if (def.area) {
      if (!live.length) return false;
      primary = def.pick === 'strongest' ? live.reduce((a, b) => (b.hp > a.hp ? b : a)) : live[0];
      const a = def.area;
      if (a.type === 'single') targets = [primary];
      else if (a.type === 'multi') targets = live.slice(0, a.n);
      else if (a.type === 'range') targets = live;
      else if (a.type === 'circle') targets = this.monsters.filter((m) => m.alive && d2(m, primary) <= a.r * a.r);
      else if (a.type === 'chain') targets = this.chainFrom(primary, a.n);
    } else if (def.buff && !live.length) {
      return false;
    }
    this.vfx.skill(merc, def, this.kindOf(merc), targets, primary, st.range);
    if (def.level > MAX_LEVEL) audio.ult();
    else audio.skill(def.level, merc.attr);

    const fx = def.fx || {};
    const damaging = isDamaging(def);
    const flavorMul = (damaging && merc.attr === 'red' ? 1.25 : 1) * (1 + this.bonus.skillDmg); // 비전 연구: 스킬 피해
    for (const t of targets) {
      if (!t.alive) continue;
      if (fx.stun) t.applyStun(fx.stun, now);
      if (fx.slow) t.applySlow(fx.slow[0], fx.slow[1], now);
      if (fx.vuln) t.applyVuln(fx.vuln[0], fx.vuln[1], now);
      if (fx.push) t.push(fx.push);
      const elem = elementMultiplier(merc.attr, t.attr);
      if (fx.dot) t.applyDot(st.damage * fx.dot[0] * elem * flavorMul, fx.dot[1], now, merc);
      if (damaging && merc.attr === 'blue') t.applySlow(0.2, 1.2, now);
      if (damaging && merc.attr === 'green') t.applyDot(st.damage * 0.4 * elem, 2, now, merc);

      let mult = fx.dmg || 0;
      if (fx.execute) {
        if (!t.isBoss && t.hp / t.maxHp <= fx.execute[0]) {
          this.floatText(t.x, t.y - 24, '처형!', '#ff5050');
          this.killMonster(t, merc);
          continue;
        }
        mult = t.isBoss ? fx.execute[1] : 1;
      }
      if (fx.bossMult && t.isBoss) mult *= fx.bossMult;
      if (mult) this.hit(merc, st, t, mult * flavorMul, false, targets.length <= 3); // 범위 스킬은 관통 없음 (이미 여럿을 때린다)
    }

    if (def.buff) {
      const b = def.buff;
      const who =
        b.scope === 'self' ? [merc] :
        b.scope === 'all' ? this.mercs :
        this.mercs.filter((o) => Math.abs(o.col - merc.col) <= 1 && Math.abs(o.row - merc.row) <= 1);
      for (const o of who) {
        o.addBuff(b, now);
        o.buffFlashUntil = now + 0.25;
      }
    }
    if (def.gold) {
      const g = def.gold + Math.floor(this.wave * (def.goldPerWave || 0));
      this.gold += g;
      this.floatText(merc.x, merc.y - 40, `+${g}G`, '#f2c14e');
    }
    if (def.level <= MAX_LEVEL) this.floatText(merc.x, merc.y - 40 - (merc.col % 2) * 20, def.name, ATTR_INFO[merc.attr].css, def.level >= 4 ? 22 : 16, def.level >= 4);
    return true;
  }

  damageMonster(m, amount, { source, crit = false, silent = false } = {}) {
    if (!m.alive) return;
    amount *= m.damageTakenMult(this.gameTime);
    m.hp -= amount;
    if (!silent) m.flashUntil = this.gameTime + 0.06;
    if (crit) this.floatText(m.x, m.y - 20, `${Math.round(amount)}!`, '#ffd84a');
    if (m.hp <= 0) this.killMonster(m, source);
  }

  killMonster(m, source) {
    if (!m.alive) return;
    if (m.isFinal && !m.revived) return this.reviveFinalBoss(m);
    m.alive = false;
    this.totalKills += 1;
    // 물량: 일반 몬스터 골드는 소수 → 모았다가 정수가 될 때마다 지급
    this.goldFrac += m.gold * (1 + 0.25 * (this.relics.golden_grail || 0) * (1 + this.bonus.relicPow) + this.bonus.bounty);
    const gold = Math.floor(this.goldFrac + 1e-9);
    this.goldFrac -= gold;
    if (source && source.active) source.kills += 1;
    this.gold += gold;
    this.deathFx(m);
    this.vfx.coinDrop(m.x, m.y);
    if (m.isBoss) {
      this.earnFame((m.isFinal ? FAME.finalBoss : m.milestone ? FAME.milestoneBoss : FAME.boss) + this.bonus.bossFame);
      audio.bossKill();
      if (m.milestone) this.offerRelicChoice();
      else this.dropRelic(m.x, m.y);
      if (m.isFinal) this.celebrateCycle();
    } else audio.kill();
    if (m.kind !== 'normal') this.floatText(m.x, m.y - 30, `+${gold}G`, '#f2c14e');
    m.destroy();
  }

  /** 최종 보스 첫 사망: 50% 체력으로 부활하고 디버프 능력이 하나 늘어난다 */
  reviveFinalBoss(m) {
    const added = m.revive();
    m.dots = [];
    this.cameras.main.flash(400, 120, 40, 160);
    this.cameras.main.shake(500, 0.01);
    this.vfx.burst('curse', m.x, m.y, 40);
    this.vfx.shockwave(m.x, m.y, 160, 0xb47cff);
    this.showBanner(`${m.design.name} 부활!`, `체력 ${Math.round(BALANCE.final.reviveHp * 100)}% 회복 · 새 디버프: ${added.map((d) => d.name).join(', ')}`, '#ff4dd2');
    audio.bossAppear();
  }

  dropRelic(x, y) {
    const relic = Phaser.Utils.Array.GetRandom(RELICS);
    const active = this.addRelic(relic.id);
    const icon = this.add.image(x, y, `relic_${relic.id}`).setScale(PX).setDepth(DEPTH.fx);
    this.tweens.add({
      targets: icon,
      x: 108,
      y: 160,
      duration: 700,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        icon.destroy();
        this.refreshRelics();
      }
    });
    this.showBanner(`유물 획득: ${relic.name}`, `${relic.desc}${active ? '' : ' (슬롯이 가득 차 비활성)'}`, '#f2c14e');
    this.refreshInfo();
  }

  // ───────────────────────── 유물 ─────────────────────────
  /** 성벽 최대 체력 (명성 강화 '성벽 보강') */
  get wallMax() {
    return BALANCE.wall.hp + (this.bonus.wallHp || 0);
  }

  /** 판매 환급 비율 (명성 강화 '깔끔한 정산') */
  get sellRefund() {
    return BALANCE.sellRefund + this.bonus.sellRefund;
  }

  /** 활성 유물 최대 수 (명성 강화 '유물 보관함'으로 늘어남) */
  get maxRelics() {
    return BALANCE.maxActiveRelics + this.bonus.relicSlots;
  }

  get activeRelicCount() {
    return this.ownedRelics.filter((r) => r.active).length;
  }

  /** 유물 추가. 빈 슬롯이 있으면 자동 활성. 활성 여부 반환 */
  addRelic(id) {
    const active = this.activeRelicCount < this.maxRelics;
    this.ownedRelics.push({ id, active });
    this.recomputeRelics();
    this.tut.show('relic');
    return active;
  }

  recomputeRelics() {
    this.relics = {};
    for (const r of this.ownedRelics) if (r.active) this.relics[r.id] = (this.relics[r.id] || 0) + 1;
  }

  toggleRelic(index) {
    const r = this.ownedRelics[index];
    const info = RELIC_BY_ID[r.id];
    if (!r.active && this.activeRelicCount >= this.maxRelics) {
      this.toast(`활성 유물은 최대 ${this.maxRelics}개입니다. 다른 유물을 먼저 끄세요`, '#ff9a7a');
      return;
    }
    r.active = !r.active;
    this.recomputeRelics();
    this.refreshRelics();
    this.refreshHud();
    this.toast(`${info.name} ${r.active ? '활성' : '비활성'} — ${info.desc}`, r.active ? '#f2c14e' : '#9aa3b8');
  }

  /** 강화 보스 처치 보상: 유물 3개 중 1개 선택 (선택하는 동안 게임 정지) */
  offerRelicChoice() {
    const options = Phaser.Utils.Array.Shuffle([...RELICS]).slice(0, BALANCE.milestone.relicChoices);
    this.hud.clearNotices();
    const pw = WIDE ? 472 : GAME_W - 72;
    const px = (GAME_W - pw) / 2;
    const ph = 470;
    const py = WIDE ? (GAME_H - ph) / 2 : 250;
    const c = this.hud.modal(DEPTH.overlay - 0.5, px, py, pw, ph, null, '보상 선택'); // 배너·토스트보다 위
    this.relicChoice = { options, container: c };
    c.add(uiText(this, GAME_W / 2, py + 40, '강화 보스 처치!', 24, CSS.primary, '700').setOrigin(0.5));
    c.add(uiText(this, GAME_W / 2, py + 72, '유물 하나를 골라주세요', 14, CSS.sub, '600').setOrigin(0.5));
    options.forEach((r, i) => {
      const y = py + 140 + i * 96;
      const row = this.add.container(GAME_W / 2, y);
      const bg = panelImage(this, 0, 0, 'outline', pw - 40, 80);
      const circle = panelImage(this, -pw / 2 + 64, 0, 'soft', 56, 56);
      const icon = this.add.image(-pw / 2 + 64, 0, `relic_${r.id}`).setScale(PX);
      const name = uiText(this, -pw / 2 + 104, -14, r.name, 17, CSS.ink, '700').setOrigin(0, 0.5);
      const desc = uiText(this, -pw / 2 + 104, 12, r.desc, 13, CSS.sub, '600').setOrigin(0, 0.5);
      const pick = uiText(this, pw / 2 - 40, 0, '선택', 14, CSS.primary, '700').setOrigin(1, 0.5);
      row.add([bg, circle, icon, name, desc, pick]);
      row.setSize(pw - 40, 80).setInteractive({ useHandCursor: true });
      row.on('pointerdown', () => row.setScale(0.97));
      row.on('pointerout', () => row.setScale(1));
      row.on('pointerup', () => this.pickRelic(i));
      c.add(row);
    });
    c.add(
      uiText(this, GAME_W / 2, py + ph - 26, `활성 유물 ${this.activeRelicCount}/${this.maxRelics} · 가득 차면 비활성으로 보관돼요`, 12, CSS.sub, '600').setOrigin(0.5)
    );
  }


  pickRelic(i) {
    if (!this.relicChoice) return;
    const relic = this.relicChoice.options[i];
    this.relicChoice.container.destroy();
    this.relicChoice = null;
    const active = this.addRelic(relic.id);
    this.refreshRelics();
    audio.promote();
    this.showBanner(`유물 획득: ${relic.name}`, `${relic.desc}${active ? '' : ' (슬롯이 가득 차 비활성)'}`, '#f2c14e');
    this.refreshInfo();
  }

  // ───────────────────────── 용병 ─────────────────────────
  get hireCost() {
    // 용병 계약서는 중복 효과 없음 (예전엔 중복될수록 계속 싸져서 버그처럼 보였음)
    return Math.max(1, Math.round((BALANCE.hireCost - this.bonus.hireDiscount) * (this.relics.contract ? 0.8 : 1)));
  }

  /** level 의 유닛을 합칠 때 드는 골드 (Lv5 → 영웅 승급) */
  mergeCostFor(level) {
    if (level >= MAX_LEVEL) return Math.round(BALANCE.promoteCost * (1 - this.bonus.promoteDiscount));
    return Math.round(BALANCE.mergeCost[level + 1] * (1 - this.bonus.mergeDiscount));
  }

  /** free: 명성 강화 '징집령'으로 시작 시 무료 배치 (minLevel: '노련한 신병'이면 2) */
  hire({ free = false, minLevel = 1 } = {}) {
    if (this.over) return;
    const cost = free ? 0 : this.hireCost;
    if (this.gold < cost) return this.toast('골드가 부족합니다');
    const empty = [];
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) if (!this.grid[r][c] && !this.isTowerCell(c, r)) empty.push({ c, r });
    if (!empty.length) return this.toast('빈 자리가 없습니다');
    const { c, r } = Phaser.Utils.Array.GetRandom(empty);
    const attr = Phaser.Utils.Array.GetRandom(ATTRS);
    const cls = Phaser.Utils.Array.GetRandom(MERC_CLASS_IDS);
    this.gold -= cost;
    const merc = new Mercenary(this, c, r, attr, cls);
    merc.invested = cost;
    this.grid[r][c] = merc;
    merc.sprite.setY(-40).setAlpha(0);
    this.tweens.add({ targets: merc.sprite, y: -PX, alpha: 1, duration: 220, ease: 'Bounce.easeOut' });
    // 낮은 확률로 2·3레벨 용병 (레벨마다 그 레벨 스킬 1개 랜덤 습득). 명성 강화로 확률 증가
    const roll = Math.random();
    const lucky = roll < this.bonus.lv3Chance ? 3 : roll < this.bonus.lv3Chance + BALANCE.hireLv2Chance + this.bonus.lv2Chance ? 2 : 1;
    const target = Math.max(lucky, minLevel);
    const learned = [];
    while (merc.level < target) {
      const skill = Phaser.Utils.Array.GetRandom(skillOptions(attr, cls, merc.level + 1));
      merc.levelUp(skill);
      learned.push(skill.name);
    }
    if (free) {
      this.toast(`징집: ${merc.roleName} ${merc.heroName} (Lv.${merc.level}) 합류!`, ATTR_INFO[attr].css);
    } else if (lucky > 1) {
      this.levelUpFx(merc, `행운! Lv.${merc.level}`);
      this.toast(`행운! Lv.${merc.level} ${merc.roleName} ${merc.heroName} 합류 — 스킬 「${learned.join('」「')}」`, '#f2c14e');
      audio.levelUp();
    } else {
      this.toast(`${merc.roleName} ${merc.heroName} 합류!`, ATTR_INFO[attr].css);
      audio.coin();
    }
    this.refreshHud();
  }

  sell(merc) {
    const refund = Math.floor(merc.invested * this.sellRefund);
    this.gold += refund;
    this.grid[merc.row][merc.col] = null;
    this.floatText(merc.x, merc.y - 20, `+${refund}G`, '#f2c14e');
    merc.destroy();
    this.select(null);
    this.refreshHud();
  }

  /** 스킬 리롤 비용 (영웅 고유 스킬 등 표에 없는 레벨은 null = 리롤 불가) */
  rerollCost(def) {
    return BALANCE.skillReroll[def.level] ?? null;
  }

  /** 용병의 i번째 스킬을 같은 레벨의 다른 후보로 바꾼다 (골드 소비, 판매 환급에는 넣지 않음) */
  rerollSkill(merc, i) {
    const sk = merc.skills[i];
    const cost = sk && this.rerollCost(sk.def);
    if (!cost || this.over || !merc.active) return false;
    if (this.gold < cost) {
      this.toast(`골드 부족 (스킬 리롤 ${cost}G 필요)`);
      return false;
    }
    const [attr, cls] = sk.def.id.split('_'); // id = attr_cls_level_i (영웅이 되어도 원래 병과 스킬 후보에서 고른다)
    const pool = skillOptions(attr, cls, sk.def.level).filter((o) => o.id !== sk.def.id);
    const def = Phaser.Utils.Array.GetRandom(pool);
    this.gold -= cost;
    merc.skills[i] = { def, cd: def.cd * 0.5 };
    audio.levelUp();
    this.toast(`${merc.heroName} — 「${sk.def.name}」 → 「${def.name}」`, '#f2c14e');
    this.refreshHud();
    return def;
  }

  merge(src, dst) {
    const promoting = dst.level >= MAX_LEVEL;
    const cost = this.mergeCostFor(dst.level);
    if (this.gold < cost) {
      this.toast(`골드 부족 (${promoting ? '영웅 승급' : '레벨 업'} ${cost}G 필요)`);
      return false;
    }
    this.gold -= cost;
    dst.invested += src.invested + cost;
    dst.kills += src.kills;
    this.grid[src.row][src.col] = null;
    src.destroy();

    if (promoting) {
      const hero = Phaser.Utils.Array.GetRandom(HEROES[dst.attr]);
      const unique = { ...hero.unique, id: `hero_${hero.id}`, level: MAX_LEVEL + 1, attr: dst.attr };
      dst.promote(hero, unique);
      audio.promote();
      this.levelUpFx(dst, '영웅 승급!', true);
      this.showBanner(`영웅 ${hero.name} 탄생!`, `${dst.roleName} · 고유 스킬 「${unique.name}」`, '#f2c14e');
    } else {
      const skill = Phaser.Utils.Array.GetRandom(skillOptions(dst.attr, dst.cls, dst.level + 1));
      dst.levelUp(skill);
      audio.levelUp();
      this.levelUpFx(dst, 'LEVEL UP!');
      this.toast(`Lv.${dst.level} ${dst.heroName} — 스킬 「${skill.name}」 습득`, '#f2c14e');
    }
    this.select(dst);
    this.refreshHud();
    return true;
  }

  handleDrop(merc, x, y) {
    const cell = cellAt(x, y);
    if (!cell || (cell.col === merc.col && cell.row === merc.row) || this.isTowerCell(cell.col, cell.row)) return merc.snapToCell();
    const other = this.grid[cell.row][cell.col];

    if (!other) {
      this.grid[merc.row][merc.col] = null;
      merc.col = cell.col;
      merc.row = cell.row;
      this.grid[merc.row][merc.col] = merc;
      return merc.snapToCell();
    }
    if (merc.canMergeWith(other)) {
      if (!this.merge(merc, other)) merc.snapToCell();
      return;
    }
    // 합칠 수 없으면 자리 교체
    const { col, row } = merc;
    merc.col = other.col;
    merc.row = other.row;
    other.col = col;
    other.row = row;
    this.grid[merc.row][merc.col] = merc;
    this.grid[other.row][other.col] = other;
    merc.snapToCell();
    other.snapToCell();
  }

  setupInput() {
    this.input.dragDistanceThreshold = 6;
    this.input.keyboard?.on('keydown-ESC', () => !this.tut.open && this.hud.toggleMenu());
    // Space: 다음 웨이브 바로 시작 · S: 선택한 용병 판매
    this.input.keyboard?.addCapture('SPACE');
    this.input.keyboard?.on('keydown-SPACE', () => this.callNextWave());
    this.input.keyboard?.on('keydown-S', () => {
      if (this.over || this.menuOpen || this.relicChoice || this.tut.open || this.hud.popup) return;
      if (this.selected?.active) this.sell(this.selected);
    });
    this.input.on('gameobjectdown', (_p, obj) => {
      if (obj instanceof Mercenary) this.select(obj);
    });
    this.input.on('pointerdown', (_p, objs) => {
      if (!objs.length) this.select(null);
    });
    this.input.on('dragstart', (_p, obj) => {
      if (!(obj instanceof Mercenary) || this.over) return;
      obj.dragging = true;
      obj.setDepth(DEPTH.drag);
      this.drawMergeHints(obj);
    });
    this.input.on('drag', (_p, obj, dx, dy) => {
      if (obj.dragging) obj.setPosition(dx, dy);
    });
    this.input.on('dragend', (p, obj) => {
      if (!obj.dragging) return;
      obj.dragging = false;
      obj.setDepth(DEPTH.merc);
      this.hintGfx.clear();
      this.handleDrop(obj, p.worldX, p.worldY);
    });
  }

  select(merc) {
    this.selected = merc;
    this.refreshInfo();
    if (merc) this.tut.show('select');
  }

  /** 머지할 수 있는 용병 한 쌍 (level 을 주면 그 레벨만) — 튜토리얼이 비출 곳 */
  mergePair(level) {
    for (const a of this.mercs) {
      if (level && a.level !== level) continue;
      const b = this.mercs.find((o) => a.canMergeWith(o));
      if (b) return [a, b];
    }
    return null;
  }

  /** 상황이 처음 생겼을 때 튜토리얼 (HUD 를 새로 그릴 때마다 확인) */
  checkTutorials() {
    if (!this.tut?.enabled || this.over) return;
    if (this.mergePair(5)) this.tut.show('hero');
    else if (this.mergePair()) this.tut.show('merge');
    if (this.wave >= 1 && this.canCallNextWave) this.tut.show('next');
    if (this.towerBadge?.visible && this.wave >= 1) this.tut.show('tower');
  }

  drawMergeHints(merc) {
    const g = this.hintGfx;
    g.clear();
    for (const o of this.mercs) {
      if (!merc.canMergeWith(o)) continue;
      g.lineStyle(4, 0xf2c14e, 1).strokeRect(FIELD_X + o.col * CELL + 2, FIELD_Y + o.row * CELL + 2, CELL - 4, CELL - 4);
    }
  }

  drawRange() {
    const g = this.rangeGfx;
    g.clear();
    const m = this.selected;
    if (!m || !m.active) return;
    const st = m.getStats(this.relics, this.gameTime);
    const color = ATTR_INFO[m.attr].color;
    g.fillStyle(color, 0.08).fillCircle(m.x, m.y, st.range);
    g.lineStyle(2, color, 0.6).strokeCircle(m.x, m.y, st.range);
    g.lineStyle(4, 0xffffff, 0.9).strokeRect(m.x - CELL / 2 + 2, m.y - CELL / 2 + 2, CELL - 4, CELL - 4);
  }

  drawHpBars() {
    const g = this.hpGfx;
    g.clear();
    for (const m of this.monsters) {
      // 물량: 일반 몬스터는 체력 막대 없음 (정예·보스만)
      if (!m.alive || m.kind === 'normal' || (m.hp >= m.maxHp && !m.isBoss)) continue;
      const w = m.isBoss ? 72 : m.kind === 'elite' ? 48 : 36;
      const h = m.isBoss ? 8 : 4;
      const x = Math.round(m.x - w / 2);
      const y = Math.round(m.y - m.displayHeight / 2 - h - 6);
      g.fillStyle(0x1b1b26).fillRect(x - 2, y - 2, w + 4, h + 4);
      g.fillStyle(m.isBoss ? 0xff4d4d : 0x6fd36a).fillRect(x, y, Math.round(w * Math.max(0, m.hp / m.maxHp)), h);
    }
  }

  // ───────────────────────── 이펙트 ─────────────────────────

  circleFx(x, y, r, color) {
    const c = this.add.circle(x, y, r, color, 0.25).setDepth(DEPTH.fx);
    this.tweens.add({ targets: c, alpha: 0, scale: 1.2, duration: 220, onComplete: () => c.destroy() });
  }



  deathFx(m) {
    if (this.vfx.death(m) && !m.isBoss) return; // PixelLab 시트 (보스는 파편도 함께)
    if (m.kind === 'normal') return; // 물량: 시트가 꽉 찼으면 일반 몬스터는 연출 생략 (파편을 수백 개 만들지 않는다)
    const color = ATTR_INFO[m.attr].color;
    const n = m.isBoss ? 16 : 5;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const d = (m.isBoss ? 60 : 24) + Math.random() * 12;
      const p = this.add.image(m.x, m.y, 'pixel').setScale(PX).setTint(color).setDepth(DEPTH.fx);
      this.tweens.add({
        targets: p,
        x: m.x + Math.cos(a) * d,
        y: m.y + Math.sin(a) * d,
        alpha: 0,
        duration: 260,
        onComplete: () => p.destroy()
      });
    }
  }

  /** 레벨 업 연출(약 0.5초): 이펙트와 문구 모두 용병 컨테이너에 붙어 옮겨도 따라간다 */
  levelUpFx(merc, label, hero = false) {
    this.vfx.levelUp(merc, hero);
    const t = text(this, 0, -30, label, hero ? 22 : 18, '#f2c14e', { stroke: '#1b1b26', strokeThickness: 4 }).setOrigin(0.5);
    merc.add(t);
    this.tweens.add({ targets: t, y: -52, alpha: 0, delay: 150, duration: 400, onComplete: () => t.destroy() });
    this.tweens.add({ targets: merc.sprite, scale: merc.sprite.scaleX * 1.2, duration: 90, yoyo: true });
  }

  floatText(x, y, str, color = '#ffffff', size = 16, force = false) {
    if (this.activeTexts > 30 && !force) return;
    this.activeTexts++;
    const t = text(this, x, y, str, size, color, { stroke: '#1b1b26', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(DEPTH.fx + 1);
    this.tweens.add({
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

  // ───────────────────────── 화면 (src/ui/Hud.js) ─────────────────────────
  // 게임 로직에서 자주 부르는 화면 갱신은 짧게 쓰도록 hud 로 넘긴다.
  toast(msg, color) {
    this.hud.toast(msg, color);
  }

  showBanner(title, sub, color) {
    this.hud.showBanner(title, sub, color);
  }

  /** 배경음(보스 여부)·성탑 "!" 표시를 맞추고 HUD 숫자를 갱신 */
  refreshHud() {
    const boss = this.monsters.find((m) => m.isBoss && m.alive);
    if (!this.over) audio.playMusic(boss ? (boss.isFinal ? 'final' : 'boss') : 'battle');
    this.towerBadge?.setVisible(!this.over && UPGRADES.some((u) => meta.status(u.id) === 'ok'));
    this.hud.refresh();
    this.checkTutorials();
  }

  refreshRelics() {
    this.hud.refreshRelics();
  }

  refreshInfo() {
    this.hud.refreshInfo();
  }

  /** ESC 메뉴가 열려 있는지 (열려 있으면 전투가 멈춘다) */
  get menuOpen() {
    return !!this.hud.menu;
  }

  // ───────────────────────── 명성 ─────────────────────────
  /** 명성 적립 — 바로 저장해서 판 도중에도 성탑에서 쓸 수 있다 */
  earnFame(n) {
    const v = Math.round(n * (1 + this.bonus.fameMult));
    this.fameEarned += v;
    meta.addFame(v);
  }

  /** 판이 끝날 때 최고 기록 저장 (한 번만) */
  creditFame() {
    if (this.fameCredited) return;
    this.fameCredited = true;
    meta.record(this.wave);
  }

  /** 최종 보스(100웨이브마다)를 완전히 쓰러뜨리면 축하하고 그대로 다음 웨이브로 이어진다 */
  celebrateCycle() {
    audio.victory();
    this.time.delayedCall(1200, () => !this.over && audio.playMusic('battle'));
    for (let i = 0; i < 8; i++) this.time.delayedCall(i * 180, () => this.vfx.firework(Phaser.Math.Between(60, GAME_W - 60), Phaser.Math.Between(160, 600)));
    this.cameras.main.flash(500, 255, 220, 120);
    this.showBanner(`${this.wave} 웨이브 돌파!`, '최종 보스 격파 — 웨이브는 계속됩니다', '#f2c14e');
  }

  quitToTitle() {
    this.creditFame();
    this.hud.closeAll();
    this.tweens.resumeAll();
    this.tweens.timeScale = 1;
    audio.playMusic(null);
    this.scene.start('Title');
  }

  togglePause() {
    this.paused = !this.paused;
    this.hud.setPaused(this.paused);
    if (this.paused) this.tweens.pauseAll();
    else this.tweens.resumeAll();
  }

  /** 패배 (무한 웨이브라 승리 종료는 없다. victory 는 디버그용으로만 남김) */
  endGame(victory, reason = '') {
    if (this.over) return;
    this.over = true;
    this.creditFame();
    this.tweens.timeScale = 1;
    if (this.paused) this.tweens.resumeAll();
    this.hud.closeAll();
    this.relicChoice?.container.destroy();
    this.relicChoice = null;
    this.select(null);
    audio.playMusic(null);
    if (victory) audio.victory();
    else audio.defeat();

    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x1a0f08, victory ? 0.4 : 0.55).setOrigin(0).setDepth(DEPTH.overlay).setInteractive();
    const top = DEPTH.overlay + 3; // 폭죽(overlay+2) 위에 창
    const cw = 440;
    const ch = 510; // X·별 아이콘이 제목 탭에서 떨어지도록 위 여백 확보 (2026-11-15)
    const cx = GAME_W / 2;
    const cy0 = WIDE ? (GAME_H - ch) / 2 : 248;
    panel(this, cx - cw / 2, cy0, cw, ch, 'card').setDepth(top);
    for (const o of titleTab(this, cx, cy0, victory ? 'WIN!' : 'TRY AGAIN', 200)) o.setDepth(top);
    // 승리: 별 3개 (가운데 큰 별) / 패배: 큰 X
    const ico = this.add.graphics().setDepth(top);
    if (victory) {
      for (const [dx, dy, size] of [[-74, 74, 42], [0, 62, 63], [74, 74, 42]]) {
        drawIcon(ico, 'star', cx + dx + 3, cy0 + dy + 3, size, 0x6a4a10); // 그림자
        drawIcon(ico, 'star', cx + dx, cy0 + dy, size, 0xf2b33a);
      }
    } else {
      drawIcon(ico, 'cross', cx + 3, cy0 + 75, 56, 0x2b1810);
      drawIcon(ico, 'cross', cx, cy0 + 72, 56, 0x3a4fa8);
    }
    const title = uiText(this, cx, cy0 + 128, victory ? '용병단 해산' : '게임 오버', 26, victory ? CSS.primary : CSS.red, '700')
      .setOrigin(0.5)
      .setDepth(top);
    const newBest = this.wave > this.bestWave;
    const sub = victory ? '수고했어요! 용병단이 성을 지켜냈어요' : `${reason}${newBest ? ' · 최고 기록 갱신!' : ''}`;
    if (sub) uiText(this, cx, cy0 + 160, sub, 13, CSS.sub, '600').setOrigin(0.5).setDepth(top);
    if (victory) {
      this.tweens.add({ targets: title, scale: 1.06, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const launch = () => this.vfx.firework(Phaser.Math.Between(60, GAME_W - 60), Phaser.Math.Between(120, 640));
      for (let i = 0; i < 6; i++) this.time.delayedCall(i * 150, launch);
      this.time.addEvent({ delay: 300, loop: true, callback: launch });
    }
    // 기록 줄 (거래 내역처럼)
    const heroes = this.mercs.filter((m) => m.isHero).length;
    const rows = [
      ['도달 웨이브', `W${this.wave} (최고 W${Math.max(this.bestWave, this.wave)})`],
      ['처치한 몬스터', this.totalKills.toLocaleString()],
      ['영웅 · 유물', `${heroes}명 · ${this.ownedRelics.length}개`],
      ['획득 명성', `+${this.fameEarned} (보유 ${meta.fame})`]
    ];
    rows.forEach(([k, v], i) => {
      const y = cy0 + 196 + i * 38;
      if (i) this.add.rectangle(cx, y - 19, cw - 64, 4, C.line).setDepth(top);
      uiText(this, cx - cw / 2 + 36, y, k, 15, CSS.sub, '600').setOrigin(0, 0.5).setDepth(top);
      uiText(this, cx + cw / 2 - 36, y, v, 17, CSS.ink, '700').setOrigin(1, 0.5).setDepth(top);
    });
    new Button(this, cx, cy0 + 376, cw - 64, 56, '다시 하기', () => this.scene.restart(), { variant: 'primary', fontSize: 18 }).setDepth(top);
    const bw = (cw - 64 - 12) / 2;
    new Button(this, cx - bw / 2 - 6, cy0 + 444, bw, 52, '명성 강화', () => this.scene.start('Upgrade', { from: 'result' }), { variant: 'gold', fontSize: 16 }).setDepth(top);
    new Button(this, cx + bw / 2 + 6, cy0 + 444, bw, 52, '타이틀로', () => this.scene.start('Title'), { variant: 'outline', fontSize: 16 }).setDepth(top);
  }

}
