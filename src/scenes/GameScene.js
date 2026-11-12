import Phaser from 'phaser';
import { GAME_W, GAME_H, PX, GRID, CELL, FIELD_X, FIELD_Y, FIELD_SIZE, FONT, DEPTH, BALANCE } from '../config.js';
import { Monster } from '../objects/Monster.js';
import { Mercenary, MAX_LEVEL } from '../objects/Mercenary.js';
import { Button } from '../ui/Button.js';
import { ATTRS, ATTR_INFO, elementMultiplier, strongAgainst, weakAgainst } from '../data/elements.js';
import { MERC_CLASS_IDS, HEROES } from '../data/heroes.js';
import { skillOptions, describeSkill, isDamaging, ELEMENT_FLAVOR } from '../data/skills.js';
import { RELICS, RELIC_BY_ID } from '../data/relics.js';
import { TOTAL_WAVES, waveInfo, spawnList, isMilestoneWave } from '../data/waves.js';
import { cellAt, PATH_LENGTH } from '../systems/path.js';
import { Vfx } from '../systems/vfx.js';
import { audio } from '../systems/audio.js';

const WAVE_TYPE_NAME = { normal: '일반', elite: '정예', boss: '보스', milestone: '강화 보스' };

const text = (scene, x, y, str, size = 22, color = '#ffffff', extra = {}) =>
  scene.add.text(x, y, str, { fontFamily: FONT, fontSize: `${size}px`, color, ...extra }).setDepth(DEPTH.ui);

const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.gameTime = 0;
    this.speed = 1;
    this.paused = false;
    this.over = false;
    this.gold = BALANCE.startGold;
    this.wave = 0;
    this.waveTimer = BALANCE.prepTime;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.spawnInterval = 0;
    this.monsters = [];
    this.grid = Array.from({ length: GRID }, () => Array(GRID).fill(null));
    this.ownedRelics = []; // { id, active } — 활성 유물만 효과 (최대 BALANCE.maxActiveRelics)
    this.relics = {}; // 활성 유물 id → 개수 (능력치 계산용, recomputeRelics 가 갱신)
    this.waveAttrs = ATTRS;
    this.relicChoice = null;
    this.selected = null;
    this.totalKills = 0;
    this.hudTimer = 0;
    this.activeTexts = 0;
    this.tweens.timeScale = 1;

    this.add.image(0, 0, 'background').setOrigin(0).setScale(PX).setDepth(DEPTH.bg);
    this.rangeGfx = this.add.graphics().setDepth(DEPTH.merc - 1);
    this.hintGfx = this.add.graphics().setDepth(DEPTH.merc - 1);
    this.hpGfx = this.add.graphics().setDepth(DEPTH.hpbar);
    this.vfx = new Vfx(this);
    audio.playMusic('battle');
    this.events.on('firework-pop', () => audio.firework());

    this.createHud();
    this.createBottomPanel();
    this.setupInput();
    this.refreshHud();
    this.refreshInfo();
    this.showBanner('용병단 디펜스', `${BALANCE.prepTime}초 후 1웨이브 시작`);
  }

  // ───────────────────────── 루프 ─────────────────────────
  update(_t, delta) {
    if (this.over) return;
    const dt = this.paused || this.relicChoice ? 0 : Math.min(delta / 1000, 0.1) * this.speed;
    this.gameTime += dt;

    if (dt > 0) {
      this.updateWaves(dt);
      const speedMul = Math.max(0.4, 1 - 0.1 * (this.relics.frost_crown || 0));
      for (const m of this.monsters) if (m.alive) m.tick(dt, this.gameTime, speedMul);
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

    const boss = this.monsters.find((m) => m.isBoss && m.dist >= PATH_LENGTH);
    if (boss) this.endGame(false, '보스가 성벽을 한 바퀴 돌았습니다');
    else if (this.monsters.length >= BALANCE.maxAlive) this.endGame(false, `몬스터가 ${BALANCE.maxAlive}기 쌓였습니다`);
    else if (this.wave >= TOTAL_WAVES && this.spawnQueue.length === 0 && this.monsters.length === 0) this.endGame(true);
  }

  // ───────────────────────── 웨이브 ─────────────────────────
  updateWaves(dt) {
    if (this.wave < TOTAL_WAVES) {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) this.startWave(this.wave + 1);
    }
    if (this.spawnQueue.length) {
      this.spawnTimer -= dt;
      while (this.spawnTimer <= 0 && this.spawnQueue.length) {
        this.spawnMonster(this.spawnQueue.shift());
        this.spawnTimer += this.spawnInterval;
      }
    }
  }

  startWave(w) {
    this.wave = w;
    const info = waveInfo(w);
    const list = spawnList(w);
    this.spawnQueue.push(...list);
    // 이번 웨이브 몬스터 속성: 최대 attrsPerWave 종류
    this.waveAttrs = Phaser.Utils.Array.Shuffle([...ATTRS]).slice(0, BALANCE.monster.attrsPerWave);
    this.spawnInterval = BALANCE.spawnWindow / list.length;
    this.spawnTimer = 0;
    this.waveTimer = BALANCE.waveDuration;
    const sub =
      info.type === 'milestone' ? `강화 보스 + 정예 ${info.elite}기! 분노·속성 변환 주의` :
      info.type === 'boss' ? `보스 등장! 한 바퀴 돌기 전에 처치하세요` :
      info.type === 'elite' ? `몬스터 ${info.normal}기 + 정예 10기` : `몬스터 ${info.normal}기`;
    const attrNames = this.waveAttrs.map((a) => ATTR_INFO[a].name).join('·');
    const color = info.type === 'milestone' ? '#d6a8ff' : info.type === 'boss' ? '#ff6a55' : info.type === 'elite' ? '#f2c14e' : '#ffffff';
    this.showBanner(`WAVE ${w}`, `${sub} · ${attrNames}`, color);
  }

  spawnMonster(kind) {
    const m = new Monster(this, kind, Phaser.Utils.Array.GetRandom(this.waveAttrs), this.wave, kind === 'boss' && isMilestoneWave(this.wave));
    this.monsters.push(m);
    if (m.isBoss) {
      audio.bossAppear();
      this.showBanner(m.milestone ? '강화 보스 등장!' : '보스 등장!', m.abilities.map((a) => `${a.def.name}(${a.def.desc} ${a.def.dur}초)`).join(' / '), '#d6a8ff');
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
      if (deb.stun) continue; // 공포: 공격·스킬·쿨타임 모두 정지
      const inRange = this.monstersInRange(merc.x, merc.y, st.range);

      // 스킬: 쿨타임이 끝나면 자동 시전 (침묵 중엔 시전 불가, 시간 부식은 쿨타임 회복 저하)
      for (const s of merc.skills) {
        s.cd -= dt * deb.cdRate;
        if (!deb.silence && s.cd <= 0 && this.castSkill(merc, s.def, st, inRange)) s.cd = s.def.cd;
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
      this.tweens.add({ targets: merc.sprite, y: -PX * 2, duration: 60, yoyo: true });
    }
  }

  /** 보스 디버프 능력: 쿨타임마다 랜덤 용병/영웅에게 시전 */
  updateBosses(dt) {
    const now = this.gameTime;
    for (const boss of this.monsters) {
      if (!boss.alive || !boss.isBoss) continue;
      const MS = BALANCE.milestone;
      if (boss.milestone) {
        // 분노: 체력이 enrageAt 이하로 떨어지면 빨라지고 디버프를 더 자주 쓴다
        if (!boss.enraged && boss.hp / boss.maxHp <= MS.enrageAt) {
          boss.enraged = true;
          for (const a of boss.abilities) a.cd = Math.min(a.cd, 0.5);
          this.showBanner('보스 분노!', `이동 속도 +${Math.round((MS.enrageSpeed - 1) * 100)}%, 디버프 쿨타임 절반`, '#ff5050');
          this.cameras.main.shake(300, 0.008);
          audio.bossAppear();
        }
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
          BALANCE.boss.targetsBase + Math.floor(this.wave / BALANCE.boss.targetsPerWaves) + (boss.milestone ? MS.extraTargets : 0);
        const targets = Phaser.Utils.Array.Shuffle([...mercs]).slice(0, n);
        for (const t of targets) {
          t.addDebuff(a.def, now);
          this.floatText(t.x, t.y - 36, a.def.name, '#d6a8ff', 16, true);
        }
        this.vfx.curse(boss, targets);
        audio.debuff();
        this.floatText(boss.x, boss.y - 48, a.def.name, '#d6a8ff', 22, true);
      }
    }
  }

  hit(merc, st, target, mult, crit = false) {
    const dmg = st.damage * mult * elementMultiplier(merc.attr, target.attr);
    this.damageMonster(target, dmg, { source: merc, crit });
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
        if (o.alive && o !== target && d2(o, pos) <= st.splash ** 2) this.hit(merc, st, o, 1);
      }
      this.circleFx(pos.x, pos.y, st.splash, ATTR_INFO[merc.attr].color);
    }
    if (st.chain) {
      const chain = this.chainFrom(target, st.chain + 1);
      this.vfx.chain(chain, ATTR_INFO[merc.attr].color);
      for (const o of chain.slice(1)) this.hit(merc, st, o, 0.6);
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
    const flavorMul = damaging && merc.attr === 'red' ? 1.25 : 1;
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
      if (mult) this.hit(merc, st, t, mult * flavorMul);
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
    m.alive = false;
    this.totalKills += 1;
    const gold = Math.round(m.gold * (1 + 0.25 * (this.relics.golden_grail || 0)));
    if (source && source.active) source.kills += 1;
    this.gold += gold;
    this.deathFx(m);
    if (m.isBoss) {
      audio.bossKill();
      if (m.milestone) this.offerRelicChoice();
      else this.dropRelic(m.x, m.y);
    } else audio.kill();
    if (m.kind !== 'normal') this.floatText(m.x, m.y - 30, `+${gold}G`, '#f2c14e');
    m.destroy();
  }

  dropRelic(x, y) {
    const relic = Phaser.Utils.Array.GetRandom(RELICS);
    const active = this.addRelic(relic.id);
    const icon = this.add.image(x, y, `relic_${relic.id}`).setScale(PX).setDepth(DEPTH.fx);
    this.tweens.add({
      targets: icon,
      x: 36,
      y: 196,
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
  get activeRelicCount() {
    return this.ownedRelics.filter((r) => r.active).length;
  }

  /** 유물 추가. 빈 슬롯이 있으면 자동 활성. 활성 여부 반환 */
  addRelic(id) {
    const active = this.activeRelicCount < BALANCE.maxActiveRelics;
    this.ownedRelics.push({ id, active });
    this.recomputeRelics();
    return active;
  }

  recomputeRelics() {
    this.relics = {};
    for (const r of this.ownedRelics) if (r.active) this.relics[r.id] = (this.relics[r.id] || 0) + 1;
  }

  toggleRelic(index) {
    const r = this.ownedRelics[index];
    const info = RELIC_BY_ID[r.id];
    if (!r.active && this.activeRelicCount >= BALANCE.maxActiveRelics) {
      this.toast(`활성 유물은 최대 ${BALANCE.maxActiveRelics}개입니다. 다른 유물을 먼저 끄세요`, '#ff9a7a');
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
    this.bannerObj?.destroy();
    this.toastObj?.destroy();
    const c = this.add.container(0, 0).setDepth(DEPTH.overlay - 0.5); // 배너·토스트보다 위
    this.relicChoice = { options, container: c };
    c.add(this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.65).setOrigin(0).setInteractive());
    c.add(text(this, GAME_W / 2, 300, '강화 보스 처치!', 33, '#f2c14e', { stroke: '#1b1b26', strokeThickness: 6 }).setOrigin(0.5));
    c.add(text(this, GAME_W / 2, 344, '유물 하나를 고르세요', 22, '#ffffff').setOrigin(0.5));
    options.forEach((r, i) => {
      const y = 430 + i * 104;
      const card = this.add.container(GAME_W / 2, y);
      const bg = this.add.graphics();
      bg.fillStyle(0x1b1b26).fillRect(-230, -44, 460, 88);
      bg.fillStyle(0x2f3550).fillRect(-226, -40, 452, 80);
      const icon = this.add.image(-190, 0, `relic_${r.id}`).setScale(PX + 1);
      const name = text(this, -150, -28, r.name, 22, '#f2c14e');
      const desc = text(this, -150, 4, r.desc, 16, '#d6dbea');
      card.add([bg, icon, name, desc]);
      card.setSize(460, 88).setInteractive({ useHandCursor: true });
      card.on('pointerup', () => this.pickRelic(i));
      c.add(card);
    });
    c.add(text(this, GAME_W / 2, 760, `활성 유물 ${this.activeRelicCount}/${BALANCE.maxActiveRelics} — 가득 차면 비활성으로 보관됩니다`, 16, '#9aa3b8').setOrigin(0.5));
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
    return Math.round(BALANCE.hireCost * (this.relics.contract ? 0.8 : 1));
  }

  /** level 의 유닛을 합칠 때 드는 골드 (Lv5 → 영웅 승급) */
  mergeCostFor(level) {
    return level >= MAX_LEVEL ? BALANCE.promoteCost : BALANCE.mergeCost[level + 1];
  }

  hire() {
    if (this.over) return;
    const cost = this.hireCost;
    if (this.gold < cost) return this.toast('골드가 부족합니다');
    const empty = [];
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) if (!this.grid[r][c]) empty.push({ c, r });
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
    // 낮은 확률로 2레벨 용병 (2레벨 스킬 1개 랜덤 습득)
    if (Math.random() < BALANCE.hireLv2Chance) {
      const skill = Phaser.Utils.Array.GetRandom(skillOptions(attr, cls, 2));
      merc.levelUp(skill);
      this.levelUpFx(merc, '행운! Lv.2');
      this.toast(`행운! Lv.2 ${merc.roleName} ${merc.heroName} 합류 — 스킬 「${skill.name}」`, '#f2c14e');
      audio.levelUp();
    } else {
      this.toast(`${merc.roleName} ${merc.heroName} 합류!`, ATTR_INFO[attr].css);
      audio.coin();
    }
    this.refreshHud();
  }

  sell(merc) {
    const refund = Math.floor(merc.invested * BALANCE.sellRefund);
    this.gold += refund;
    this.grid[merc.row][merc.col] = null;
    this.floatText(merc.x, merc.y - 20, `+${refund}G`, '#f2c14e');
    merc.destroy();
    this.select(null);
    this.refreshHud();
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
      this.levelUpFx(dst, '영웅 승급!');
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
    if (!cell || (cell.col === merc.col && cell.row === merc.row)) return merc.snapToCell();
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
      if (!m.alive || (m.hp >= m.maxHp && !m.isBoss)) continue;
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

  levelUpFx(merc, label) {
    const ring = this.add.circle(merc.x, merc.y, 20).setStrokeStyle(4, 0xf2c14e).setDepth(DEPTH.fx);
    this.tweens.add({ targets: ring, scale: 2.4, alpha: 0, duration: 400, onComplete: () => ring.destroy() });
    this.floatText(merc.x, merc.y - 30, label, '#f2c14e', 22, true);
    this.tweens.add({ targets: merc.sprite, scale: PX * 1.3, duration: 120, yoyo: true });
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

  toast(msg, color = '#ffffff') {
    if (this.toastObj) this.toastObj.destroy();
    const t = text(this, GAME_W / 2, FIELD_Y + FIELD_SIZE + 52, msg, 16, color, {
      backgroundColor: '#1b1b26dd',
      padding: { x: 10, y: 6 }
    })
      .setOrigin(0.5)
      .setDepth(DEPTH.overlay - 1);
    this.toastObj = t;
    this.tweens.add({ targets: t, alpha: 0, delay: 1600, duration: 400, onComplete: () => t.destroy() });
  }

  showBanner(title, sub, color = '#ffffff') {
    if (this.bannerObj) this.bannerObj.destroy();
    const bg = this.add.rectangle(0, 0, GAME_W, 96, 0x0d0d14, 0.75);
    const t1 = text(this, 0, -16, title, 33, color, { stroke: '#1b1b26', strokeThickness: 6 }).setOrigin(0.5);
    const t2 = text(this, 0, 26, sub, 16, '#e0e0e0').setOrigin(0.5);
    const c = this.add.container(GAME_W / 2, FIELD_Y + FIELD_SIZE / 2, [bg, t1, t2]).setDepth(DEPTH.overlay - 2);
    this.bannerObj = c;
    c.setScale(1, 0);
    this.tweens.add({ targets: c, scaleY: 1, duration: 160, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, alpha: 0, delay: 2000, duration: 400, onComplete: () => c.destroy() });
  }

  // ───────────────────────── UI ─────────────────────────
  createHud() {
    const g = this.add.graphics().setDepth(DEPTH.ui - 1);
    g.fillStyle(0x0d0d14, 0.82).fillRect(0, 0, GAME_W, 224);
    g.fillStyle(0x1b1b26).fillRect(0, 224, GAME_W, 4);

    this.waveText = text(this, 16, 12, '', 33, '#ffffff', { fontStyle: 'bold' });
    this.timerText = text(this, GAME_W - 16, 18, '', 22, '#cfd8ff').setOrigin(1, 0);
    this.waveTypeText = text(this, 16, 56, '', 16, '#9aa3b8');
    this.bossText = text(this, GAME_W - 16, 56, '', 16, '#ff6a55').setOrigin(1, 0);

    this.add.image(28, 98, 'icon_coin').setScale(PX).setDepth(DEPTH.ui);
    this.goldText = text(this, 52, 86, '', 22, '#f2c14e');
    this.add.image(GAME_W - 28, 98, 'icon_skull').setScale(PX).setDepth(DEPTH.ui);
    this.countText = text(this, GAME_W - 52, 86, '', 22).setOrigin(1, 0);
    this.countBar = this.add.graphics().setDepth(DEPTH.ui);

    this.relicLabel = text(this, 16, 148, '유물', 16, '#9aa3b8');
    this.relicRow = this.add.container(0, 0).setDepth(DEPTH.ui);
    this.noRelicText = text(this, 64, 148, '보스를 처치하면 유물을 얻습니다 (최대 4개 활성)', 16, '#5d6577');
  }

  refreshHud() {
    const nextWave = this.wave + 1;
    this.waveText.setText(`WAVE ${this.wave} / ${TOTAL_WAVES}`);
    if (this.wave < TOTAL_WAVES) {
      const label = this.wave === 0 ? '시작까지' : '다음 웨이브';
      this.timerText.setText(`${label} ${Math.ceil(Math.max(0, this.waveTimer))}초`);
      const ni = waveInfo(nextWave);
      const extra = ni.type === 'elite' ? ' + 정예 10' : ni.type === 'boss' ? ' + 보스' : ni.type === 'milestone' ? ' + 정예 10 + 강화 보스' : '';
      this.waveTypeText.setText(`다음: ${WAVE_TYPE_NAME[ni.type]} 웨이브 (${ni.normal}기${extra})`);
    } else {
      this.timerText.setText('최종 웨이브!');
      this.waveTypeText.setText('남은 몬스터를 모두 처치하세요');
    }
    const boss = this.monsters.find((m) => m.isBoss && m.alive);
    if (!this.over) audio.playMusic(boss ? 'boss' : 'battle');
    this.bossText.setText(
      boss
        ? `${boss.enraged ? '분노 ' : ''}보스 ${Math.floor(Math.max(0, boss.dist / PATH_LENGTH) * 100)}% · ${boss.abilities.map((a) => a.def.name).join(', ')}`
        : ''
    );
    this.goldText.setText(`${this.gold} G`);

    const n = this.monsters.length;
    const max = BALANCE.maxAlive;
    this.countText.setText(`${n} / ${max}`).setColor(n >= max * 0.8 ? '#ff6a55' : '#ffffff');
    const g = this.countBar;
    const bw = GAME_W - 32;
    g.clear();
    g.fillStyle(0x1b1b26).fillRect(16, 122, bw, 16);
    const pct = Math.min(1, n / max);
    g.fillStyle(pct < 0.5 ? 0x6fd36a : pct < 0.8 ? 0xf2c14e : 0xff4d4d).fillRect(20, 126, Math.round((bw - 8) * pct), 8);

    if (this.hireBtn) {
      this.hireBtn.setLabel(`용병 고용\n${this.hireCost} G${this.relics.contract ? ' (-20%)' : ''}`);
      this.hireBtn.setEnabled(this.gold >= this.hireCost);
    }
    if (this.selected) this.refreshInfo();
  }

  refreshRelics() {
    this.relicRow.removeAll(true);
    this.noRelicText.setVisible(this.ownedRelics.length === 0);
    this.relicLabel.setText(this.ownedRelics.length ? `유물 ${this.activeRelicCount}/${BALANCE.maxActiveRelics}` : '유물');
    this.ownedRelics.forEach((r, i) => {
      const x = 36 + i * 50;
      const y = 196;
      const icon = this.add.image(x, y, `relic_${r.id}`).setScale(PX).setInteractive({ useHandCursor: true });
      icon.on('pointerdown', () => this.toggleRelic(i));
      if (r.active) {
        const frame = this.add.rectangle(x, y, 48, 48).setStrokeStyle(4, 0xf2c14e);
        this.relicRow.add(frame);
      } else {
        icon.setAlpha(0.35).setTint(0x8890a0);
      }
      this.relicRow.add(icon);
    });
  }


  createBottomPanel() {
    const top = 744;
    const g = this.add.graphics().setDepth(DEPTH.ui - 1);
    g.fillStyle(0x1b1b26).fillRect(0, top - 4, GAME_W, 4);
    g.fillStyle(0x0d0d14, 0.9).fillRect(0, top, GAME_W, GAME_H - top);

    this.hireBtn = new Button(this, 108, 800, 184, 88, '', () => this.hire(), { color: 0x2f7d4a, fontSize: 22 });
    this.speedBtn = new Button(this, 44, 900, 56, 64, 'x1', () => {
      this.speed = this.speed >= 3 ? 1 : this.speed + 1;
      this.speedBtn.setLabel(`x${this.speed}`);
      this.tweens.timeScale = this.speed;
    });
    this.pauseBtn = new Button(this, 108, 900, 56, 64, '정지', () => this.togglePause(), { fontSize: 16 });
    this.soundBtn = new Button(this, 172, 900, 56, 64, audio.muted ? '무음' : '소리', () => {
      audio.init();
      this.soundBtn.setLabel(audio.toggleMute() ? '무음' : '소리');
    }, { fontSize: 16 });

    // 정보 패널
    const px = 216;
    const py = 756;
    const pw = GAME_W - px - 12;
    const ph = GAME_H - py - 12;
    const ig = this.add.graphics().setDepth(DEPTH.ui - 1);
    ig.fillStyle(0x1b1b26).fillRect(px, py, pw, ph);
    ig.fillStyle(0x262a3a).fillRect(px + 4, py + 4, pw - 8, ph - 8);
    this.infoPortrait = this.add.image(px + 36, py + 36, 'pixel').setScale(PX).setDepth(DEPTH.ui).setVisible(false);
    this.infoTitle = text(this, px + 16, py + 12, '', 22);
    this.infoSub = text(this, px + 72, py + 48, '', 16, '#9aa3b8');
    this.infoBody = text(this, px + 16, py + 46, '', 16, '#d6dbea', { lineSpacing: 5, wordWrap: { width: pw - 28 } });
    const btnX = px + pw - 58;
    this.sellBtn = new Button(this, btnX, py + 24, 100, 36, '판매', () => this.selected && this.sell(this.selected), {
      color: 0x8c2b25,
      fontSize: 16
    });
    this.skillBtn = new Button(this, btnX, py + 64, 100, 36, '스킬 정보', () => this.selected && this.showSkillPopup(this.selected), {
      color: 0x3b4a6b,
      fontSize: 16
    });
    this.infoBox = { px, py, pw, ph };
  }

  refreshInfo() {
    const m = this.selected && this.selected.active ? this.selected : null;
    const { px, py } = this.infoBox;
    if (!m) {
      this.selected = null;
      this.infoPortrait.setVisible(false);
      this.sellBtn.setVisible(false);
      this.skillBtn.setVisible(false);
      this.infoSub.setText('');
      this.infoTitle.setPosition(px + 16, py + 12).setColor('#ffffff').setText('용병단 지휘');
      this.infoBody
        .setPosition(px + 16, py + 46)
        .setText(
          [
            '· 고용: 빈 칸에 랜덤 용병 배치',
            '· 같은 속성·레벨 용병을 겹치면',
            '  레벨 업 (Lv5끼리 = 영웅 승급)',
            '· 상성: 블루>레드>그린>블루',
            '· 패배: 몬스터 100기, 보스 1바퀴'
          ].join('\n')
        );
      return;
    }
    const st = m.getStats(this.relics, this.gameTime);
    const info = ATTR_INFO[m.attr];
    this.infoPortrait.setTexture(m.textureKey).setVisible(true);
    this.infoTitle.setPosition(px + 72, py + 12).setColor(m.isHero ? '#f2c14e' : info.css).setText(m.heroName);
    this.infoSub.setText(m.isHero ? m.roleName : `Lv.${m.level} ${m.roleName} · ${info.name}`);
    const strong = ATTR_INFO[strongAgainst(m.attr)].name;
    const weak = ATTR_INFO[weakAgainst(m.attr)].name;
    const next = m.isHero ? '최종 단계' : m.level < MAX_LEVEL ? `레벨 업 ${this.mergeCostFor(m.level)}G` : `영웅 승급 ${BALANCE.promoteCost}G`;
    const lines = [
      `강함 ${strong} · 약함 ${weak} · ${next}`,
      `공격 ${Math.round(st.damage)} · 공속 ${st.rate.toFixed(2)}${st.debuff.list.length ? ' (디버프)' : st.buffed ? ' (버프 중)' : ''}`,
      st.debuff.list.length
        ? `디버프: ${st.debuff.list.map((d) => `${d.def.name} ${Math.ceil(d.until - this.gameTime)}초`).join(', ')}`
        : `사거리 ${Math.round(st.range)} · ${m.skills.length ? `스킬 ${m.skills.length}개 보유` : '스킬 없음'}`
    ];
    this.infoBody.setPosition(px + 16, py + 90).setText(lines.join('\n'));
    this.sellBtn.setVisible(true).setLabel(`판매 +${Math.floor(m.invested * BALANCE.sellRefund)}G`);
    this.skillBtn.setVisible(true);
  }

  showSkillPopup(m) {
    this.popup?.destroy();
    const c = this.add.container(0, 0).setDepth(DEPTH.overlay - 5);
    this.popup = c;
    const shade = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.5).setOrigin(0).setInteractive();
    shade.on('pointerdown', () => {
      c.destroy();
      this.popup = null;
    });
    const x = 16;
    const y = 236;
    const w = GAME_W - 32;
    const h = 500;
    const bg = this.add.graphics();
    bg.fillStyle(0x1b1b26).fillRect(x, y, w, h);
    bg.fillStyle(0x262a3a).fillRect(x + 4, y + 4, w - 8, h - 8);
    c.add([shade, bg]);

    const info = ATTR_INFO[m.attr];
    let cy = y + 16;
    const add = (str, size, color, extra = {}) => {
      const t = text(this, x + 20, cy, str, size, color, { wordWrap: { width: w - 40 }, lineSpacing: 4, ...extra });
      c.add(t);
      cy += t.height + 6;
      return t;
    };
    add(`${m.heroName} · ${m.isHero ? `영웅 ${m.roleName}` : `Lv.${m.level} ${m.roleName}`}`, 22, m.isHero ? '#f2c14e' : info.css);
    add(`${ELEMENT_FLAVOR[m.attr].desc} (피해를 주는 스킬에 추가 적용)`, 16, '#9aa3b8');
    cy += 6;
    if (!m.skills.length) add('아직 스킬이 없습니다.', 16, '#d6dbea');
    for (const s of m.skills) {
      const d = s.def;
      const tag = d.level > MAX_LEVEL ? '[영웅 고유]' : `[Lv${d.level}]`;
      add(`${tag} ${d.name}  · 쿨타임 ${d.cd}초`, 16, d.level > MAX_LEVEL ? '#f2c14e' : '#ffffff');
      add(describeSkill(d), 16, '#b9c0d4');
      cy += 2;
    }
    if (!m.isHero && m.level < MAX_LEVEL) {
      cy += 8;
      const opts = skillOptions(m.attr, m.cls, m.level + 1);
      add(`다음 레벨(Lv${m.level + 1}) 후보 — 이 중 1개 랜덤 습득`, 16, '#9aa3b8');
      for (const o of opts) add(`· ${o.name}: ${describeSkill(o)}`, 16, '#7d859a');
    } else if (!m.isHero) {
      cy += 8;
      add(`영웅 승급 후보: ${HEROES[m.attr].map((h) => h.name).join(' / ')}`, 16, '#9aa3b8');
    }
    const close = text(this, x + w - 20, y + h - 16, '화면을 누르면 닫힘', 16, '#5d6577').setOrigin(1, 1);
    c.add(close);
  }

  togglePause() {
    this.paused = !this.paused;
    this.pauseBtn.setLabel(this.paused ? '재개' : '정지');
    if (this.paused) this.tweens.pauseAll();
    else this.tweens.resumeAll();
  }

  endGame(victory, reason = '') {
    if (this.over) return;
    this.over = true;
    this.tweens.timeScale = 1;
    if (this.paused) this.tweens.resumeAll();
    this.bannerObj?.destroy();
    this.toastObj?.destroy();
    this.popup?.destroy();
    this.relicChoice?.container.destroy();
    this.relicChoice = null;
    this.select(null);
    audio.playMusic(null);
    if (victory) audio.victory();
    else audio.defeat();

    const top = DEPTH.overlay + 3; // 폭죽(overlay+2) 위에 글자
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, victory ? 0.55 : 0.75).setOrigin(0).setDepth(DEPTH.overlay).setInteractive();
    const cx = GAME_W / 2;
    const title = text(this, cx, 320, victory ? '100 웨이브 클리어!' : '게임 오버', 44, victory ? '#f2c14e' : '#ff6a55', {
      stroke: '#1b1b26',
      strokeThickness: 8
    })
      .setOrigin(0.5)
      .setDepth(top);
    if (victory) {
      text(this, cx, 376, '축하합니다! 용병단이 성을 지켜냈습니다', 22, '#ffffff', { stroke: '#1b1b26', strokeThickness: 6 })
        .setOrigin(0.5)
        .setDepth(top);
      this.tweens.add({ targets: title, scale: 1.08, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      // 폭죽: 화면 이곳저곳에서 계속 터진다
      const launch = () => this.vfx.firework(Phaser.Math.Between(60, GAME_W - 60), Phaser.Math.Between(120, 640));
      for (let i = 0; i < 6; i++) this.time.delayedCall(i * 150, launch);
      this.time.addEvent({ delay: 300, loop: true, callback: launch });
    } else if (reason) {
      text(this, cx, 372, reason, 16, '#ffb4a8').setOrigin(0.5).setDepth(top);
    }
    const relicCount = this.ownedRelics.length;
    const heroes = this.mercs.filter((m) => m.isHero).length;
    text(
      this,
      cx,
      470,
      [`도달 웨이브: ${this.wave} / ${TOTAL_WAVES}`, `처치한 몬스터: ${this.totalKills}`, `영웅: ${heroes}명 · 유물: ${relicCount}개`].join('\n'),
      22,
      '#ffffff',
      { align: 'center', lineSpacing: 10, stroke: '#1b1b26', strokeThickness: 4 }
    )
      .setOrigin(0.5)
      .setDepth(top);
    new Button(this, cx, 600, 240, 72, '다시 하기', () => this.scene.restart(), { color: 0x2f7d4a }).setDepth(top);
    new Button(this, cx, 690, 240, 64, '타이틀로', () => this.scene.start('Title')).setDepth(top);
  }
}
