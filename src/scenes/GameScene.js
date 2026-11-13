import Phaser from 'phaser';
import { GAME_W, GAME_H, PX, GRID, CELL, FIELD_X, FIELD_Y, FIELD_SIZE, FONT, DEPTH, BALANCE } from '../config.js';
import { Monster } from '../objects/Monster.js';
import { Mercenary, MAX_LEVEL } from '../objects/Mercenary.js';
import { Button } from '../ui/Button.js';
import { panel, panelKey, panelImage, titleTab, closeButton, uiText, drawIcon, onLight, C, CSS, ATTR_CSS_DARK } from '../ui/theme.js';
import { ATTRS, ATTR_INFO, elementMultiplier, strongAgainst, weakAgainst } from '../data/elements.js';
import { MERC_CLASS_IDS, HEROES } from '../data/heroes.js';
import { skillOptions, describeSkill, isDamaging, ELEMENT_FLAVOR } from '../data/skills.js';
import { RELICS, RELIC_BY_ID } from '../data/relics.js';
import { TOTAL_WAVES, waveInfo, spawnList, isMilestoneWave } from '../data/waves.js';
import { cellAt, PATH_LENGTH } from '../systems/path.js';
import { Vfx } from '../systems/vfx.js';
import { playOnce, playBase, setArt, setFacing } from '../systems/customArt.js';
import { biomeForWave } from '../data/biomes.js';
import { audio } from '../systems/audio.js';
import { meta } from '../systems/meta.js';
import { FAME } from '../data/upgrades.js';

const WAVE_TYPE_NAME = { normal: '일반', elite: '정예', boss: '보스', milestone: '강화 보스', final: '최종 보스' };

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
    this.bonus = meta.load().bonus(); // 명성 강화 효과 (판 시작 시 고정)
    this.difficulty = 0; // 0 노멀, 1 하드
    this.fameEarned = 0; // 이번 판에서 얻은 명성 (판이 끝날 때 저장)
    this.fameCredited = false;
    this.gold = BALANCE.startGold + this.bonus.startGold;
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
    this.menu = null;
    this.relicTip = null;
    this.popup = null;
    this.selected = null;
    this.totalKills = 0;
    this.hudTimer = 0;
    this.activeTexts = 0;
    this.tweens.timeScale = 1;

    this.biome = biomeForWave(1);
    this.bgImage = this.add.image(0, 0, `bg_${this.biome.id}`).setOrigin(0).setScale(PX).setDepth(DEPTH.bg);
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
    const dt = this.paused || this.relicChoice || this.menu ? 0 : Math.min(delta / 1000, 0.1) * this.speed;
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
    else if (this.wave >= TOTAL_WAVES && this.spawnQueue.length === 0 && this.monsters.length === 0) {
      this.earnFame(FAME.perWave(TOTAL_WAVES));
      if (this.difficulty === 0) this.enterHard();
      else this.endGame(true);
    }
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
    if (w >= 2) this.earnFame(FAME.perWave(w - 1)); // 앞 웨이브를 버텼으니 명성
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
      info.type === 'boss' ? `보스 등장! 한 바퀴 돌기 전에 처치하세요` :
      info.type === 'elite' ? `몬스터 ${info.normal}기 + 정예 10기` : `몬스터 ${info.normal}기`;
    const attrNames = this.waveAttrs.map((a) => ATTR_INFO[a].name).join('·');
    const color = info.type === 'final' ? '#ff4dd2' : info.type === 'milestone' ? '#d6a8ff' : info.type === 'boss' ? '#ff6a55' : info.type === 'elite' ? '#f2c14e' : '#ffffff';
    this.showBanner(`WAVE ${w}`, `${sub} · ${attrNames}`, color);
  }

  /** 다음 웨이브를 바로 시작 (실수 연타 방지 0.6초) */
  callNextWave() {
    if (this.over || this.menu || this.relicChoice || this.wave >= TOTAL_WAVES) return;
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
    this.bgImage = this.add.image(0, 0, `bg_${biome.id}`).setOrigin(0).setScale(PX).setDepth(DEPTH.bg + 0.5).setAlpha(0);
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
    const m = new Monster(this, kind, Phaser.Utils.Array.GetRandom(this.waveAttrs), this.wave, kind === 'boss' && isMilestoneWave(this.wave), this.difficulty);
    this.monsters.push(m);
    if (m.isBoss) {
      audio.bossAppear();
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
          BALANCE.boss.targetsBase + Math.floor(this.wave / BALANCE.boss.targetsPerWaves) + (boss.milestone ? MS.extraTargets : 0);
        const targets = Phaser.Utils.Array.Shuffle([...mercs]).slice(0, n);
        for (const t of targets) {
          t.addDebuff(a.def, now);
          this.floatText(t.x, t.y - 36, a.def.name, '#d6a8ff', 16);
        }
        this.vfx.curse(boss, targets);
        audio.debuff();
        this.floatText(boss.x, boss.y - 48, a.def.name, '#d6a8ff', 22, true);
      }
    }
  }

  hit(merc, st, target, mult, crit = false) {
    const giant = target.kind === 'normal' ? 1 : BALANCE.bossDamageMult + this.bonus.bossDmg; // 명성 강화: 보스·정예 피해
    const dmg = st.damage * mult * giant * elementMultiplier(merc.attr, target.attr);
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
    if (m.isFinal && !m.revived) return this.reviveFinalBoss(m);
    m.alive = false;
    this.totalKills += 1;
    const gold = Math.round(m.gold * (1 + 0.25 * (this.relics.golden_grail || 0) + this.bonus.bounty));
    if (source && source.active) source.kills += 1;
    this.gold += gold;
    this.deathFx(m);
    if (m.isBoss) {
      this.earnFame(m.isFinal ? FAME.finalBoss : m.milestone ? FAME.milestoneBoss : FAME.boss);
      audio.bossKill();
      if (m.milestone) this.offerRelicChoice();
      else this.dropRelic(m.x, m.y);
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
    this.bannerObj?.destroy();
    this.toastObj?.destroy();
    const px = 36;
    const py = 250;
    const pw = GAME_W - 72;
    const ph = 470;
    const c = this.modal(DEPTH.overlay - 0.5, px, py, pw, ph, null, '보상 선택'); // 배너·토스트보다 위
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
    const base = level >= MAX_LEVEL ? BALANCE.promoteCost : BALANCE.mergeCost[level + 1];
    return Math.round(base * (1 - this.bonus.mergeDiscount));
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
    if (Math.random() < BALANCE.hireLv2Chance + this.bonus.lv2Chance) {
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
    this.input.keyboard?.on('keydown-ESC', () => this.toggleMenu());
    this.input.keyboard?.on('keydown-N', () => this.callNextWave()); // N: 다음 웨이브 바로 시작
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
    this.tweens.add({ targets: merc.sprite, scale: merc.sprite.scaleX * 1.3, duration: 120, yoyo: true });
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
    const t = uiText(this, 0, 0, msg, 14, color === '#ffffff' ? CSS.white : color, 'bold').setOrigin(0.5);
    const w = Math.min(GAME_W - 40, Math.ceil((t.width + 40) / PX) * PX);
    const bg = panelImage(this, 0, 0, 'dark', w, 40);
    const c = this.add.container(GAME_W / 2, FIELD_Y + FIELD_SIZE + 52, [bg, t]).setDepth(DEPTH.overlay - 1);
    this.toastObj = c;
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 120 });
    this.tweens.add({ targets: c, alpha: 0, delay: 1700, duration: 300, onComplete: () => c.destroy() });
  }

  showBanner(title, sub, color = '#ffffff') {
    if (this.bannerObj) this.bannerObj.destroy();
    const w = 456;
    const h = 108;
    const bg = panelImage(this, 0, 0, 'card', w, h);
    const t1 = uiText(this, 0, -14, title, 26, onLight(color), 'bold').setOrigin(0.5);
    const t2 = uiText(this, 0, 22, sub, 13, CSS.sub, 'bold', { align: 'center', wordWrap: { width: w - 48 } }).setOrigin(0.5);
    const c = this.add.container(GAME_W / 2, FIELD_Y + FIELD_SIZE / 2, [bg, t1, t2]).setDepth(DEPTH.overlay - 2);
    this.bannerObj = c;
    c.setScale(1, 0);
    this.tweens.add({ targets: c, scaleY: 1, duration: 140, ease: 'Stepped', easeParams: [4] });
    this.tweens.add({ targets: c, alpha: 0, delay: 2000, duration: 300, onComplete: () => c.destroy() });
  }

  // ───────────────────────── UI ─────────────────────────
  createHud() {
    const D = DEPTH.ui;
    // 상태 창 (높이 120) + 초록 제목 탭(웨이브)
    panel(this, 12, 16, GAME_W - 24, 120, 'card').setDepth(D - 1);
    const [tabImg, tabText] = titleTab(this, GAME_W / 2, 16, 'WAVE 0 / 100', 220);
    tabImg.setDepth(D);
    this.waveText = tabText.setDepth(D);
    this.waveTypeText = uiText(this, 32, 56, '', 12, CSS.sub, 'bold').setOrigin(0, 0.5).setDepth(D);

    // 타이머 슬롯 + 바로 시작 버튼
    panel(this, GAME_W - 220, 44, 108, 24, 'soft').setDepth(D);
    const clock = this.add.graphics().setDepth(D);
    drawIcon(clock, 'clock', GAME_W - 204, 56, 12, C.ink);
    this.timerText = uiText(this, GAME_W - 192, 56, '', 12, CSS.ink, 'bold').setOrigin(0, 0.5).setDepth(D);
    this.nextWaveBtn = new Button(this, GAME_W - 68, 56, 84, 28, '바로 시작', () => this.callNextWave(), { variant: 'primary', fontSize: 12 });
    this.bossText = uiText(this, GAME_W - 32, 78, '', 12, CSS.red, 'bold').setOrigin(1, 0.5).setDepth(D);

    // 골드 / 몬스터 수
    const coin = this.add.graphics().setDepth(D);
    drawIcon(coin, 'coin', 42, 94, 18, 0x6a4a10);
    this.goldText = uiText(this, 58, 94, '', 22, CSS.ink, 'bold').setOrigin(0, 0.5).setDepth(D);
    const skull = this.add.graphics().setDepth(D);
    drawIcon(skull, 'monster', GAME_W - 152, 96, 18, C.ink);
    this.countText = uiText(this, GAME_W - 32, 96, '', 22, CSS.ink, 'bold').setOrigin(1, 0.5).setDepth(D);
    // 진행 막대
    panel(this, 32, 108, GAME_W - 64, 16, 'soft').setDepth(D);
    this.countBar = this.add.graphics().setDepth(D);

    // 유물 줄 (높이 36)
    panel(this, 12, 144, GAME_W - 24, 36, 'card').setDepth(D - 1);
    this.relicLabel = uiText(this, 30, 162, '유물', 13, CSS.ink, 'bold').setOrigin(0, 0.5).setDepth(D);
    this.relicRow = this.add.container(0, 0).setDepth(D);
    this.noRelicText = uiText(this, 96, 162, `보스를 처치하면 유물을 얻어요 (최대 ${this.maxRelics}개 활성)`, 12, CSS.sub, 'bold')
      .setOrigin(0, 0.5)
      .setDepth(D);
  }


  refreshHud() {
    const nextWave = this.wave + 1;
    this.waveText.setText(`${this.difficulty ? 'HARD' : 'WAVE'} ${this.wave} / ${TOTAL_WAVES}`);
    if (this.wave < TOTAL_WAVES) {
      const label = this.wave === 0 ? '시작' : '다음';
      this.timerText.setText(`${label} ${Math.ceil(Math.max(0, this.waveTimer))}초`);
      const ni = waveInfo(nextWave);
      const extra = { elite: '+정예', boss: '+보스', milestone: '+정예+강화보스', final: '+최종보스' }[ni.type] || '';
      this.waveTypeText.setText(`${this.biome.name} · 다음 ${ni.normal}기${extra}`);
    } else {
      this.timerText.setText('최종 웨이브');
      this.waveTypeText.setText(`${this.biome.name} · 모두 처치하세요`);
    }
    const boss = this.monsters.find((m) => m.isBoss && m.alive);
    if (!this.over) audio.playMusic(boss ? (boss.isFinal ? 'final' : 'boss') : 'battle');
    this.bossText.setText(
      boss
        ? `${boss.revived ? '부활 ' : ''}${boss.enraged ? '분노 ' : ''}보스 ${Math.floor(Math.max(0, boss.dist / PATH_LENGTH) * 100)}% · ${
            boss.abilities.length > 2 ? `디버프 ${boss.abilities.length}종` : boss.abilities.map((a) => a.def.name).join(', ')
          }`
        : ''
    );
    this.goldText.setText(`${this.gold.toLocaleString()} G`);

    const n = this.monsters.length;
    const max = BALANCE.maxAlive;
    this.countText.setText(`${n} / ${max}`).setColor(n >= max * 0.8 ? CSS.red : CSS.ink);
    // 막대: 4px 단위 칸 채우기
    const g = this.countBar;
    const bx = 40;
    const bw = GAME_W - 80;
    g.clear();
    const pct = Math.min(1, n / max);
    const fill = Math.round((bw * pct) / PX) * PX;
    if (fill > 0) {
      const col = pct < 0.5 ? 0x3f9a52 : pct < 0.8 ? 0xe0a32a : 0xc2453a;
      g.fillStyle(col, 1).fillRect(bx, 112, fill, 8);
      g.fillStyle(0xffffff, 0.35).fillRect(bx, 112, fill, 4);
    }

    this.nextWaveBtn?.setEnabled(this.wave < TOTAL_WAVES && !this.over);
    if (this.hireBtn) {
      this.hireBtn.setLabel(`용병 고용\n${this.hireCost} G${this.relics.contract ? ' (-20%)' : ''}`);
      this.hireBtn.setEnabled(this.gold >= this.hireCost);
    }
    if (this.selected) this.refreshInfo();
  }

  refreshRelics() {
    this.relicRow.removeAll(true);
    this.noRelicText.setVisible(this.ownedRelics.length === 0);
    this.relicLabel.setText(this.ownedRelics.length ? `유물 ${this.activeRelicCount}/${this.maxRelics}` : '유물');
    this.ownedRelics.forEach((r, i) => {
      const x = 108 + i * 36;
      const y = 160;
      const slot = panelImage(this, x, y, r.active ? 'gold' : 'soft', 32, 32);
      const icon = this.add.image(x, y, `relic_${r.id}`).setScale(PX - 2).setInteractive({ useHandCursor: true });
      icon.on('pointerdown', () => this.toggleRelic(i));
      icon.on('pointerover', () => this.showRelicTip(i, x, y));
      icon.on('pointerout', () => this.hideRelicTip());
      if (!r.active) icon.setAlpha(0.4).setTint(0xb8a07a);
      this.relicRow.add([slot, icon]);
    });
    // 아이콘이 다시 그려졌으니, 마우스가 올라가 있던 툴팁은 새 상태로 갱신
    if (this.relicTip) this.showRelicTip(this.relicTip.index, this.relicTip.x, this.relicTip.y);
  }

  /** 유물 툴팁: 이름·활성 상태·능력. 아이콘 아래에 띄우고 화면 밖으로 나가지 않게 맞춘다 */
  showRelicTip(index, x, y) {
    this.hideRelicTip();
    const owned = this.ownedRelics[index];
    if (!owned) return;
    const relic = RELIC_BY_ID[owned.id];
    const D = DEPTH.ui + 50;
    const c = this.add.container(0, 0).setDepth(D);
    const title = uiText(this, 0, 0, relic.name, 15, CSS.ink, 'bold');
    const state = uiText(this, 0, 0, owned.active ? '활성' : '비활성', 12, owned.active ? CSS.green : CSS.sub, 'bold');
    const desc = uiText(this, 0, 0, relic.desc, 13, CSS.ink);
    const hint = uiText(this, 0, 0, owned.active ? '클릭: 비활성으로 전환' : `클릭: 활성으로 전환 (최대 ${this.maxRelics}개)`, 11, CSS.sub);
    const pad = 16;
    const w = Math.ceil((Math.max(title.width + state.width + 12, desc.width, hint.width) + pad * 2) / PX) * PX;
    const h = 96;
    const left = Phaser.Math.Clamp(Math.round((x - w / 2) / PX) * PX, 8, GAME_W - 8 - w);
    const top = y + 24;
    const bg = panel(this, left, top, w, h, 'card');
    title.setPosition(left + pad, top + 14);
    state.setPosition(left + pad + title.width + 12, top + 17);
    desc.setPosition(left + pad, top + 42);
    hint.setPosition(left + pad, top + 66);
    c.add([bg, title, state, desc, hint]);
    this.relicTip = { index, x, y, container: c };
  }

  hideRelicTip() {
    this.relicTip?.container.destroy();
    this.relicTip = null;
  }

  createBottomPanel() {
    const D = DEPTH.ui;
    // 하단 나무 받침 (높이 176)
    panel(this, 4, 776, GAME_W - 8, 176, 'dark').setDepth(D - 2);
    this.hireBtn = new Button(this, 100, 824, 168, 80, '', () => this.hire(), { variant: 'primary', fontSize: 18 });
    this.speedBtn = new Button(this, 40, 906, 52, 64, 'x1', () => {
      this.speed = this.speed >= 3 ? 1 : this.speed + 1;
      this.speedBtn.setLabel(`x${this.speed}`);
      this.tweens.timeScale = this.speed;
    }, { variant: 'card', icon: 'speed', fontSize: 12 });
    this.pauseBtn = new Button(this, 100, 906, 52, 64, '정지', () => this.togglePause(), { variant: 'card', icon: 'pause', fontSize: 12 });
    this.menuBtn = new Button(this, 160, 906, 52, 64, '메뉴', () => this.toggleMenu(), { variant: 'card', icon: 'menu', fontSize: 12 });

    // 정보 창
    const px = 196;
    const py = 788;
    const pw = GAME_W - px - 16;
    const ph = 160;
    panel(this, px, py, pw, ph, 'card').setDepth(D - 1);
    this.infoAvatar = panelImage(this, px + 44, py + 42, 'soft', 48, 48).setDepth(D).setVisible(false);
    this.infoPortrait = this.add.sprite(px + 44, py + 42, 'pixel').setScale(PX - 1).setDepth(D).setVisible(false);
    this.infoTitle = uiText(this, px + 20, py + 16, '', 16, CSS.ink, 'bold').setDepth(D);
    this.infoSub = uiText(this, px + 78, py + 44, '', 11, CSS.sub, 'bold').setDepth(D);
    this.infoBody = uiText(this, px + 20, py + 44, '', 11, CSS.ink, 'bold', { lineSpacing: 2, wordWrap: { width: pw - 40 } }).setDepth(D);
    this.skillBtn = new Button(this, px + 80, py + ph - 34, 112, 32, '스킬 정보', () => this.selected && this.showSkillPopup(this.selected), {
      variant: 'primary',
      fontSize: 12
    });
    this.sellBtn = new Button(this, px + pw - 80, py + ph - 34, 112, 32, '판매', () => this.selected && this.sell(this.selected), {
      variant: 'outline',
      fontSize: 12
    });
    this.infoBox = { px, py, pw, ph };
  }


  refreshInfo() {
    const m = this.selected && this.selected.active ? this.selected : null;
    const { px, py } = this.infoBox;
    if (!m) {
      this.selected = null;
      this.infoAvatar.setVisible(false);
      this.infoPortrait.setVisible(false);
      this.sellBtn.setVisible(false);
      this.skillBtn.setVisible(false);
      this.infoSub.setText('');
      this.infoTitle.setPosition(px + 22, py + 20).setColor(CSS.ink).setText('용병단 지휘');
      this.infoBody
        .setPosition(px + 22, py + 48)
        .setColor(CSS.sub)
        .setText(
          [
            '· 고용: 빈 칸에 랜덤 용병 배치',
            '· 같은 속성·레벨끼리 겹치면 레벨 업',
            '· Lv5 + Lv5 = 영웅 승급',
            '· 상성: 블루>레드>그린>블루',
            '· 패배: 몬스터 100기·보스 1바퀴'
          ].join('\n')
        );
      return;
    }
    const st = m.getStats(this.relics, this.gameTime);
    const info = ATTR_INFO[m.attr];
    this.infoAvatar.setTexture(panelKey(this, m.isHero ? 'gold' : 'soft', 48, 48)).setVisible(true);
    setArt(this.infoPortrait, m.textureKey, PX - 1).setVisible(true);
    playBase(this.infoPortrait, 'idle');
    this.infoTitle.setPosition(px + 78, py + 20).setColor(m.isHero ? CSS.gold : ATTR_CSS_DARK[m.attr]).setText(m.heroName);
    const strong = ATTR_INFO[strongAgainst(m.attr)].name;
    const weak = ATTR_INFO[weakAgainst(m.attr)].name;
    const next = m.isHero ? '최종 단계' : m.level < MAX_LEVEL ? `레벨업 ${this.mergeCostFor(m.level)}G` : `승급 ${this.mergeCostFor(MAX_LEVEL)}G`;
    this.infoSub.setText(m.isHero ? `영웅 · ${m.roleName} · ${next}` : `Lv.${m.level} ${m.roleName} · ${info.name} · ${next}`);
    // 본문은 2줄: 능력치 / (디버프 또는 상성·스킬 수)
    const lines = [
      `공격 ${Math.round(st.damage)} · 공속 ${st.rate.toFixed(2)} · 사거리 ${Math.round(st.range)}${st.buffed && !st.debuff.list.length ? ' (버프)' : ''}`,
      st.debuff.list.length
        ? `디버프: ${st.debuff.list.map((d) => `${d.def.name} ${Math.ceil(d.until - this.gameTime)}초`).join(', ')}`
        : `강함 ${strong} · 약함 ${weak} · 스킬 ${m.skills.length}개`
    ];
    this.infoBody.setPosition(px + 22, py + 72).setColor(CSS.ink).setText(lines.join('\n'));
    this.sellBtn.setVisible(true).setLabel(`판매 +${Math.floor(m.invested * BALANCE.sellRefund)}G`);
    this.skillBtn.setVisible(true);
  }

  /** 양피지 창 모달: 어두운 바탕 + 창 + 초록 제목 탭 (+ 닫기 버튼) */
  modal(depth, x, y, w, h, onClose, title) {
    const c = this.add.container(0, 0).setDepth(depth);
    const shade = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x1a0f08, 0.55).setOrigin(0).setInteractive();
    if (onClose) shade.on('pointerdown', onClose);
    const card = panel(this, x, y, w, h, 'card');
    card.setInteractive(); // 창 위 클릭은 닫히지 않게
    c.add([shade, card]);
    if (title) c.add(titleTab(this, x + w / 2, y, title, 180));
    if (onClose) c.add(closeButton(this, x + w - 6, y + 6, onClose));
    return c;
  }


  showSkillPopup(m) {
    this.popup?.destroy();
    const x = 20;
    const y = 240;
    const w = GAME_W - 40;
    // 카드 높이는 내용에 맞춘다: 먼저 글자를 놓고, 마지막에 카드를 뒤에 끼운다
    const c = this.add.container(0, 0).setDepth(DEPTH.overlay - 5);
    const shade = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x1a1238, 0.5).setOrigin(0).setInteractive();
    shade.on('pointerdown', () => {
      c.destroy();
      this.popup = null;
    });
    c.add(shade);
    this.popup = c;
    let cy = y + 36;
    const add = (str, size, color, weight = '600', gap = 6) => {
      const t = uiText(this, x + 24, cy, str, size, color, weight, { wordWrap: { width: w - 48 }, lineSpacing: 4 });
      c.add(t);
      cy += t.height + gap;
      return t;
    };
    add(`${m.heroName} · ${m.isHero ? `영웅 ${m.roleName}` : `Lv.${m.level} ${m.roleName}`}`, 20, m.isHero ? CSS.gold : ATTR_CSS_DARK[m.attr], '700', 4);
    add(`${ELEMENT_FLAVOR[m.attr].desc} (피해 스킬에 추가 적용)`, 13, CSS.sub, '600', 12);
    if (!m.skills.length) add('아직 스킬이 없습니다.', 14, CSS.ink);
    for (const s of m.skills) {
      const d = s.def;
      const tag = d.level > MAX_LEVEL ? '영웅 고유' : `Lv${d.level}`;
      add(`${tag}  ${d.name}  ·  쿨타임 ${d.cd}초`, 15, d.level > MAX_LEVEL ? CSS.gold : CSS.primary, '700', 2);
      add(describeSkill(d), 13, CSS.ink, '600', 10);
    }
    if (!m.isHero && m.level < MAX_LEVEL) {
      cy += 4;
      add(`다음 레벨(Lv${m.level + 1}) 후보 — 이 중 1개 랜덤 습득`, 13, CSS.sub, '700', 4);
      for (const o of skillOptions(m.attr, m.cls, m.level + 1)) add(`· ${o.name}: ${describeSkill(o)}`, 12, CSS.sub, '600', 3);
    } else if (!m.isHero) {
      cy += 4;
      add(`영웅 승급 후보: ${HEROES[m.attr].map((hh) => hh.name).join(' / ')}`, 13, CSS.sub, '700');
    }
    const h = Math.min(GAME_H - y - 24, cy - y + 40);
    const card = panel(this, x, y, w, h, 'card').setInteractive();
    c.addAt(card, 1);
    const close = () => {
      c.destroy();
      this.popup = null;
    };
    c.add(titleTab(this, x + w / 2, y, '스킬 정보', 180));
    c.add(closeButton(this, x + w - 6, y + 6, close));
    c.add(uiText(this, x + w - 24, y + h - 14, '바깥을 누르면 닫혀요', 12, CSS.sub, '600').setOrigin(1, 1));
  }


  // ───────────────────────── ESC 메뉴 ─────────────────────────
  toggleMenu() {
    if (this.over) return;
    if (this.menu) this.closeMenu();
    else this.openMenu();
  }

  openMenu() {
    audio.init();
    this.popup?.destroy();
    this.popup = null;
    if (!this.paused) this.tweens.pauseAll();
    const px = 52;
    const py = 236;
    const pw = GAME_W - 104;
    const ph = 500;
    const c = this.modal(DEPTH.overlay - 0.3, px, py, pw, ph, () => this.closeMenu(), '메뉴');
    this.menu = c;
    c.add(uiText(this, GAME_W / 2, py + 52, '게임이 일시정지되었습니다', 13, CSS.sub, '600').setOrigin(0.5));

    // 볼륨 조절 줄: 이름 [-] 막대 [+] 퍼센트
    const volRow = (y, label, get, set) => {
      c.add(uiText(this, px + 28, y, label, 16, CSS.ink, '700').setOrigin(0, 0.5));
      const bar = this.add.graphics();
      const pct = uiText(this, px + pw - 26, y, '', 15, CSS.primary, '700').setOrigin(1, 0.5);
      const bx = px + 150;
      const bw = 150;
      const draw = () => {
        const v = get();
        bar.clear();
        // 10칸짜리 픽셀 막대
        for (let i = 0; i < 10; i++) {
          const on = i < Math.round(v * 10);
          bar.fillStyle(0x2b1810, 1).fillRect(bx + i * 15, y - 10, 12, 20);
          bar.fillStyle(on ? C.primary : C.soft, 1).fillRect(bx + i * 15 + 2, y - 8, 8, 16);
          if (on) bar.fillStyle(0x6ccc7c, 1).fillRect(bx + i * 15 + 2, y - 8, 8, 4);
        }
        pct.setText(`${Math.round(v * 100)}%`);
      };
      const step = (d) => () => {
        set(get() + d);
        draw();
        audio.coin();
      };
      const minus = new Button(this, px + 120, y, 40, 40, '-', step(-0.1), { variant: 'outline', fontSize: 20 });
      const plus = new Button(this, bx + bw + 30, y, 40, 40, '+', step(0.1), { variant: 'outline', fontSize: 20 });
      c.add([bar, pct, minus, plus]);
      draw();
    };
    volRow(py + 128, '배경음', () => audio.musicVol, (v) => audio.setMusicVolume(v));
    volRow(py + 184, '효과음', () => audio.sfxVol, (v) => audio.setSfxVolume(v));

    const bw = pw - 56;
    const muteBtn = new Button(this, GAME_W / 2, py + 252, bw, 50, '', () => {
      audio.toggleMute();
      muteBtn.setLabel(`전체 음소거 ${audio.muted ? '켜짐' : '꺼짐'}`);
    }, { variant: 'outline', fontSize: 16 });
    muteBtn.setLabel(`전체 음소거 ${audio.muted ? '켜짐' : '꺼짐'}`);
    const resume = new Button(this, GAME_W / 2, py + 322, bw, 56, '계속하기', () => this.closeMenu(), { variant: 'primary', fontSize: 18 });
    let confirmQuit = false;
    const quit = new Button(this, GAME_W / 2, py + 394, bw, 56, '게임 종료', () => {
      if (!confirmQuit) {
        confirmQuit = true;
        quit.setLabel('정말 종료할까요? 한 번 더 누르세요');
        this.time.delayedCall(2500, () => {
          if (quit.active) {
            confirmQuit = false;
            quit.setLabel('게임 종료');
          }
        });
        return;
      }
      this.quitToTitle();
    }, { variant: 'danger', fontSize: 16 });
    c.add([muteBtn, resume, quit]);
    c.add(uiText(this, GAME_W / 2, py + ph - 26, 'ESC 를 누르면 닫혀요', 12, CSS.sub, '600').setOrigin(0.5));
  }


  closeMenu() {
    if (!this.menu) return;
    this.menu.destroy(true);
    this.menu = null;
    if (!this.paused) this.tweens.resumeAll();
  }

  // ───────────────────────── 명성 · 하드 ─────────────────────────
  /** 명성 적립 (하드는 배율) — 판이 끝날 때 creditFame 으로 저장 */
  earnFame(n) {
    this.fameEarned += Math.round(n * (this.difficulty ? BALANCE.hard.fameMult : 1));
  }

  /** 이번 판 명성·최고 기록 저장 (한 번만) */
  creditFame() {
    if (this.fameCredited) return;
    this.fameCredited = true;
    meta.addFame(this.fameEarned);
    meta.record(this.difficulty, this.wave);
  }

  /** 노멀 100웨이브 클리어 → 하드 1웨이브: 용병·유물 초기화, 300골드로 다시 시작 */
  enterHard() {
    meta.record(0, TOTAL_WAVES);
    this.difficulty = 1;
    this.select(null);
    this.hideRelicTip();
    for (const m of this.mercs) {
      this.grid[m.row][m.col] = null;
      m.destroy();
    }
    this.ownedRelics = [];
    this.recomputeRelics();
    this.refreshRelics();
    this.gold = BALANCE.hard.startGold;
    this.wave = 0;
    this.waveTimer = BALANCE.prepTime;
    this.spawnQueue = [];
    this.changeBiome(biomeForWave(1));
    audio.victory();
    this.time.delayedCall(1200, () => !this.over && audio.playMusic('battle'));
    for (let i = 0; i < 8; i++) this.time.delayedCall(i * 180, () => this.vfx.firework(Phaser.Math.Between(60, GAME_W - 60), Phaser.Math.Between(160, 600)));
    this.cameras.main.flash(500, 255, 220, 120);
    this.showBanner('HARD 난이도 시작!', `용병·유물 초기화 · ${BALANCE.hard.startGold}골드로 1웨이브부터 · 몬스터 체력 ${BALANCE.hard.hpMult}배`, '#ff4dd2');
    this.refreshHud();
    this.refreshInfo();
  }

  quitToTitle() {
    this.creditFame();
    this.menu?.destroy(true);
    this.menu = null;
    this.tweens.resumeAll();
    this.tweens.timeScale = 1;
    audio.playMusic(null);
    this.scene.start('Title');
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
    this.creditFame();
    this.tweens.timeScale = 1;
    if (this.paused) this.tweens.resumeAll();
    this.bannerObj?.destroy();
    this.toastObj?.destroy();
    this.popup?.destroy();
    this.relicChoice?.container.destroy();
    this.relicChoice = null;
    this.menu?.destroy(true);
    this.menu = null;
    this.select(null);
    audio.playMusic(null);
    if (victory) audio.victory();
    else audio.defeat();

    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x1a0f08, victory ? 0.4 : 0.55).setOrigin(0).setDepth(DEPTH.overlay).setInteractive();
    const top = DEPTH.overlay + 3; // 폭죽(overlay+2) 위에 창
    const cw = 440;
    const ch = 480;
    const cx = GAME_W / 2;
    const cy0 = 262;
    panel(this, cx - cw / 2, cy0, cw, ch, 'card').setDepth(top);
    for (const o of titleTab(this, cx, cy0, victory ? 'WIN!' : 'TRY AGAIN', 200)) o.setDepth(top);
    // 승리: 별 3개 (가운데 큰 별) / 패배: 큰 X
    const ico = this.add.graphics().setDepth(top);
    if (victory) {
      for (const [dx, dy, size] of [[-74, 52, 42], [0, 40, 63], [74, 52, 42]]) {
        drawIcon(ico, 'star', cx + dx + 3, cy0 + dy + 3, size, 0x6a4a10); // 그림자
        drawIcon(ico, 'star', cx + dx, cy0 + dy, size, 0xf2b33a);
      }
    } else {
      drawIcon(ico, 'cross', cx + 3, cy0 + 53, 56, 0x2b1810);
      drawIcon(ico, 'cross', cx, cy0 + 50, 56, 0x3a4fa8);
    }
    const title = uiText(this, cx, cy0 + 100, victory ? (this.difficulty ? 'HARD 100 웨이브 클리어!' : '100 웨이브 클리어!') : '게임 오버', 26, victory ? CSS.primary : CSS.red, '700')
      .setOrigin(0.5)
      .setDepth(top);
    const sub = victory ? '축하합니다! 용병단이 성을 지켜냈어요' : reason;
    if (sub) uiText(this, cx, cy0 + 132, sub, 13, CSS.sub, '600').setOrigin(0.5).setDepth(top);
    if (victory) {
      this.tweens.add({ targets: title, scale: 1.06, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const launch = () => this.vfx.firework(Phaser.Math.Between(60, GAME_W - 60), Phaser.Math.Between(120, 640));
      for (let i = 0; i < 6; i++) this.time.delayedCall(i * 150, launch);
      this.time.addEvent({ delay: 300, loop: true, callback: launch });
    }
    // 기록 줄 (거래 내역처럼)
    const heroes = this.mercs.filter((m) => m.isHero).length;
    const rows = [
      ['도달 웨이브', `${this.difficulty ? 'HARD ' : ''}${this.wave} / ${TOTAL_WAVES}`],
      ['처치한 몬스터', this.totalKills.toLocaleString()],
      ['영웅 · 유물', `${heroes}명 · ${this.ownedRelics.length}개`],
      ['획득 명성', `+${this.fameEarned} (보유 ${meta.fame})`]
    ];
    rows.forEach(([k, v], i) => {
      const y = cy0 + 168 + i * 38;
      if (i) this.add.rectangle(cx, y - 19, cw - 64, 4, C.line).setDepth(top);
      uiText(this, cx - cw / 2 + 36, y, k, 15, CSS.sub, '600').setOrigin(0, 0.5).setDepth(top);
      uiText(this, cx + cw / 2 - 36, y, v, 17, CSS.ink, '700').setOrigin(1, 0.5).setDepth(top);
    });
    new Button(this, cx, cy0 + 348, cw - 64, 56, '다시 하기', () => this.scene.restart(), { variant: 'primary', fontSize: 18 }).setDepth(top);
    const bw = (cw - 64 - 12) / 2;
    new Button(this, cx - bw / 2 - 6, cy0 + 416, bw, 52, '명성 강화', () => this.scene.start('Upgrade'), { variant: 'gold', fontSize: 16 }).setDepth(top);
    new Button(this, cx + bw / 2 + 6, cy0 + 416, bw, 52, '타이틀로', () => this.scene.start('Title'), { variant: 'outline', fontSize: 16 }).setDepth(top);
  }

}
