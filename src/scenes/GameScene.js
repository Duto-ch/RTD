import Phaser from 'phaser';
import { GAME_W, GAME_H, PX, GRID, CELL, FIELD_X, FIELD_Y, FIELD_SIZE, FONT, DEPTH, BALANCE } from '../config.js';
import { Monster } from '../objects/Monster.js';
import { Mercenary, MAX_LEVEL } from '../objects/Mercenary.js';
import { Button } from '../ui/Button.js';
import { ATTRS, ATTR_INFO, elementMultiplier, strongAgainst, weakAgainst } from '../data/elements.js';
import { HERO_CLASS_IDS } from '../data/heroes.js';
import { SKILLS, SKILL_BY_ID } from '../data/skills.js';
import { RELICS, RELIC_BY_ID } from '../data/relics.js';
import { TOTAL_WAVES, waveInfo } from '../data/waves.js';
import { cellAt } from '../systems/path.js';

const WAVE_TYPE_NAME = { normal: '일반', elite: '정예', boss: '보스' };

const text = (scene, x, y, str, size = 22, color = '#ffffff', extra = {}) =>
  scene.add.text(x, y, str, { fontFamily: FONT, fontSize: `${size}px`, color, ...extra }).setDepth(DEPTH.ui);

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
    this.relics = {}; // id → 보유 개수
    this.selected = null;
    this.totalKills = 0;
    this.hudTimer = 0;
    this.activeNumbers = 0;

    this.add.image(0, 0, 'background').setOrigin(0).setScale(PX).setDepth(DEPTH.bg);
    this.rangeGfx = this.add.graphics().setDepth(DEPTH.merc - 1);
    this.hintGfx = this.add.graphics().setDepth(DEPTH.merc - 1);
    this.hpGfx = this.add.graphics().setDepth(DEPTH.hpbar);

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
    const dt = this.paused ? 0 : Math.min(delta / 1000, 0.1) * this.speed;
    this.gameTime += dt;

    if (dt > 0) {
      this.updateWaves(dt);
      const speedMul = 1 - 0.1 * (this.relics.frost_crown || 0);
      for (const m of this.monsters) if (m.alive) m.tick(dt, this.gameTime, Math.max(speedMul, 0.4));
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

    if (this.monsters.length >= BALANCE.maxAlive) this.endGame(false);
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
    this.spawnQueue.push(...Array(info.count).fill(info.type));
    this.spawnInterval = info.count > 1 ? BALANCE.spawnWindow / info.count : 0;
    this.spawnTimer = 0;
    this.waveTimer = BALANCE.waveDuration;
    const sub = info.type === 'boss' ? '보스 등장!' : info.type === 'elite' ? '정예 몬스터 10기 출현!' : `몬스터 ${info.count}기`;
    this.showBanner(`WAVE ${w}`, sub, info.type === 'boss' ? '#ff6a55' : info.type === 'elite' ? '#f2c14e' : '#ffffff');
  }

  spawnMonster(kind) {
    const attr = Phaser.Utils.Array.GetRandom(ATTRS);
    const m = new Monster(this, kind, attr, this.wave);
    this.monsters.push(m);
  }

  cleanupMonsters() {
    if (this.monsters.some((m) => !m.alive)) {
      this.monsters = this.monsters.filter((m) => m.alive);
    }
  }

  // ───────────────────────── 전투 ─────────────────────────
  get mercs() {
    return this.grid.flat().filter(Boolean);
  }

  updateMercs(dt) {
    for (const merc of this.mercs) {
      merc.cooldown -= dt;
      if (merc.dragging || merc.cooldown > 0) continue;
      const st = merc.getStats(this.relics);
      const r2 = st.range * st.range;
      const inRange = [];
      for (const m of this.monsters) {
        if (!m.alive) continue;
        const d2 = (m.x - merc.x) ** 2 + (m.y - merc.y) ** 2;
        if (d2 <= r2) inRange.push({ m, d2 });
      }
      if (!inRange.length) {
        merc.cooldown = 0;
        continue;
      }
      inRange.sort((a, b) => a.d2 - b.d2);
      merc.cooldown = 1 / st.rate;
      for (const { m } of inRange.slice(0, st.targets)) this.attack(merc, st, m);
      this.tweens.add({ targets: merc.sprite, y: -PX * 2, duration: 60, yoyo: true });
    }
  }

  attack(merc, st, target) {
    this.fireProjectile(merc, target);
    const elemOpts = { ignoreDisadvantage: st.purity, advantage: st.purity ? 2 : undefined };
    const crit = Math.random() < st.crit;
    let dmg = st.damage * elementMultiplier(merc.attr, target.attr, elemOpts) * (crit ? st.critMult : 1);

    if (st.slow) target.applySlow(st.slow, st.slowDur, this.gameTime);
    if (st.poison) target.applyPoison(st.poison, 3, this.gameTime, merc);
    if (st.execute && !target.isBoss && (target.hp - dmg) / target.maxHp <= st.execute) {
      dmg = target.hp;
      this.floatText(target.x, target.y - 24, '처형!', '#ff5050');
    }
    const tx = target.x;
    const ty = target.y;
    this.damageMonster(target, dmg, { source: merc, crit });

    if (st.splash) {
      const r2 = st.splash * st.splash;
      for (const o of this.monsters) {
        if (!o.alive || o === target) continue;
        if ((o.x - tx) ** 2 + (o.y - ty) ** 2 > r2) continue;
        const sd = st.damage * elementMultiplier(merc.attr, o.attr, elemOpts) * st.splashPct;
        this.damageMonster(o, sd, { source: merc });
      }
      this.splashFx(tx, ty, st.splash, ATTR_INFO[merc.attr].color);
    }
  }

  damageMonster(m, amount, { source, crit = false, silent = false } = {}) {
    if (!m.alive) return;
    m.hp -= amount;
    if (!silent) m.flashUntil = this.gameTime + 0.06;
    if (crit) this.floatText(m.x, m.y - 20, `${Math.round(amount)}!`, '#ffd84a');
    if (m.hp <= 0) this.killMonster(m, source);
  }

  killMonster(m, source) {
    m.alive = false;
    this.totalKills += 1;
    let gold = Math.round(m.gold * (1 + 0.25 * (this.relics.golden_grail || 0)));
    if (source && source.active && source.has('bounty')) gold += 2;
    if (source && source.active) source.kills += 1;
    this.gold += gold;
    this.deathFx(m);
    if (m.isBoss) this.dropRelic(m.x, m.y);
    if (m.kind !== 'normal') this.floatText(m.x, m.y - 30, `+${gold}G`, '#f2c14e');
    m.destroy();
  }

  dropRelic(x, y) {
    const relic = Phaser.Utils.Array.GetRandom(RELICS);
    this.relics[relic.id] = (this.relics[relic.id] || 0) + 1;
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
    this.showBanner(`유물 획득: ${relic.name}`, relic.desc, '#f2c14e');
    this.refreshInfo();
  }

  // ───────────────────────── 용병 ─────────────────────────
  get hireCost() {
    return Math.max(5, Math.round(BALANCE.hireCost * (1 - 0.2 * (this.relics.contract || 0))));
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
    const cls = Phaser.Utils.Array.GetRandom(HERO_CLASS_IDS);
    this.gold -= cost;
    const merc = new Mercenary(this, c, r, attr, cls);
    merc.invested = cost;
    this.grid[r][c] = merc;
    merc.sprite.setY(-40).setAlpha(0);
    this.tweens.add({ targets: merc.sprite, y: -PX, alpha: 1, duration: 220, ease: 'Bounce.easeOut' });
    this.toast(`${merc.heroName} 합류!`, ATTR_INFO[attr].css);
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
    const nextLevel = dst.level + 1;
    const cost = BALANCE.mergeCost[nextLevel];
    if (this.gold < cost) {
      this.toast(`골드 부족 (레벨 업 ${cost}G 필요)`);
      return false;
    }
    this.gold -= cost;
    const skill = Phaser.Utils.Array.GetRandom(SKILLS[nextLevel]);
    dst.invested += src.invested + cost;
    dst.kills += src.kills;
    dst.levelUp(skill.id);
    this.grid[src.row][src.col] = null;
    src.destroy();

    this.levelUpFx(dst);
    this.toast(`Lv.${dst.level} ${dst.heroName} — 스킬 「${skill.name}」 획득`, '#f2c14e');
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
    if (other.attr === merc.attr && other.level === merc.level && merc.level >= MAX_LEVEL) {
      this.toast('이미 최고 레벨입니다');
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
      const x = FIELD_X + o.col * CELL;
      const y = FIELD_Y + o.row * CELL;
      g.lineStyle(4, 0xf2c14e, 1).strokeRect(x + 2, y + 2, CELL - 4, CELL - 4);
    }
  }

  drawRange() {
    const g = this.rangeGfx;
    g.clear();
    const m = this.selected;
    if (!m || !m.active) return;
    const st = m.getStats(this.relics);
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
      const pct = Math.max(0, m.hp / m.maxHp);
      g.fillStyle(0x1b1b26).fillRect(x - 2, y - 2, w + 4, h + 4);
      g.fillStyle(m.isBoss ? 0xff4d4d : 0x6fd36a).fillRect(x, y, Math.round(w * pct), h);
    }
  }

  // ───────────────────────── 이펙트 ─────────────────────────
  fireProjectile(merc, target) {
    const p = this.add.image(merc.x, merc.y - 8, `proj_${merc.attr}`).setScale(PX).setDepth(DEPTH.projectile);
    this.tweens.add({ targets: p, x: target.x, y: target.y, duration: 90, onComplete: () => p.destroy() });
  }

  splashFx(x, y, r, color) {
    const c = this.add.circle(x, y, r, color, 0.25).setDepth(DEPTH.fx);
    this.tweens.add({ targets: c, alpha: 0, scale: 1.2, duration: 200, onComplete: () => c.destroy() });
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

  levelUpFx(merc) {
    const ring = this.add.circle(merc.x, merc.y, 20).setStrokeStyle(4, 0xf2c14e).setDepth(DEPTH.fx);
    this.tweens.add({ targets: ring, scale: 2.4, alpha: 0, duration: 400, onComplete: () => ring.destroy() });
    this.floatText(merc.x, merc.y - 30, 'LEVEL UP!', '#f2c14e', 22);
    this.tweens.add({ targets: merc.sprite, scale: PX * 1.3, duration: 120, yoyo: true });
  }

  floatText(x, y, str, color = '#ffffff', size = 16) {
    if (this.activeNumbers > 30) return;
    this.activeNumbers++;
    const t = text(this, x, y, str, size, color, { stroke: '#1b1b26', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(DEPTH.fx + 1);
    this.tweens.add({
      targets: t,
      y: y - 28,
      alpha: 0,
      duration: 700,
      onComplete: () => {
        t.destroy();
        this.activeNumbers--;
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
    this.tweens.add({ targets: t, alpha: 0, delay: 1400, duration: 400, onComplete: () => t.destroy() });
  }

  showBanner(title, sub, color = '#ffffff') {
    if (this.bannerObj) this.bannerObj.destroy();
    const cx = GAME_W / 2;
    const cy = FIELD_Y + FIELD_SIZE / 2;
    const bg = this.add.rectangle(0, 0, GAME_W, 96, 0x0d0d14, 0.75);
    const t1 = text(this, 0, -16, title, 33, color, { stroke: '#1b1b26', strokeThickness: 6 }).setOrigin(0.5);
    const t2 = text(this, 0, 26, sub, 16, '#e0e0e0').setOrigin(0.5);
    const c = this.add.container(cx, cy, [bg, t1, t2]).setDepth(DEPTH.overlay - 2);
    this.bannerObj = c;
    c.setScale(1, 0);
    this.tweens.add({ targets: c, scaleY: 1, duration: 160, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, alpha: 0, delay: 1800, duration: 400, onComplete: () => c.destroy() });
  }

  // ───────────────────────── UI ─────────────────────────
  createHud() {
    const g = this.add.graphics().setDepth(DEPTH.ui - 1);
    g.fillStyle(0x0d0d14, 0.82).fillRect(0, 0, GAME_W, 224);
    g.fillStyle(0x1b1b26).fillRect(0, 224, GAME_W, 4);

    this.waveText = text(this, 16, 12, '', 33, '#ffffff', { fontStyle: 'bold' });
    this.timerText = text(this, GAME_W - 16, 18, '', 22, '#cfd8ff').setOrigin(1, 0);
    this.waveTypeText = text(this, 16, 56, '', 16, '#9aa3b8');

    this.add.image(28, 98, 'icon_coin').setScale(PX).setDepth(DEPTH.ui);
    this.goldText = text(this, 52, 86, '', 22, '#f2c14e');
    this.add.image(GAME_W - 28, 98, 'icon_skull').setScale(PX).setDepth(DEPTH.ui);
    this.countText = text(this, GAME_W - 52, 86, '', 22).setOrigin(1, 0);

    this.countBar = this.add.graphics().setDepth(DEPTH.ui);

    text(this, 16, 148, '유물', 16, '#9aa3b8');
    this.relicRow = this.add.container(0, 0).setDepth(DEPTH.ui);
    this.noRelicText = text(this, 64, 148, '보스를 처치하면 유물을 얻습니다', 16, '#5d6577');
  }

  refreshHud() {
    const nextWave = this.wave + 1;
    this.waveText.setText(`WAVE ${this.wave} / ${TOTAL_WAVES}`);
    if (this.wave < TOTAL_WAVES) {
      const label = this.wave === 0 ? '시작까지' : '다음 웨이브';
      this.timerText.setText(`${label} ${Math.ceil(Math.max(0, this.waveTimer))}초`);
      const ni = waveInfo(nextWave);
      this.waveTypeText.setText(`다음: ${WAVE_TYPE_NAME[ni.type]} 웨이브 (${ni.type === 'normal' ? `${ni.count}기` : ni.type === 'elite' ? '정예 10기' : '보스'})`);
    } else {
      this.timerText.setText('최종 웨이브!');
      this.waveTypeText.setText('남은 몬스터를 모두 처치하세요');
    }
    this.goldText.setText(`${this.gold} G`);

    const n = this.monsters.length;
    const max = BALANCE.maxAlive;
    this.countText.setText(`${n} / ${max}`).setColor(n >= max * 0.8 ? '#ff6a55' : '#ffffff');
    const g = this.countBar;
    const bx = 16;
    const by = 122;
    const bw = GAME_W - 32;
    g.clear();
    g.fillStyle(0x1b1b26).fillRect(bx, by, bw, 16);
    const pct = Math.min(1, n / max);
    const col = pct < 0.5 ? 0x6fd36a : pct < 0.8 ? 0xf2c14e : 0xff4d4d;
    g.fillStyle(col).fillRect(bx + 4, by + 4, Math.round((bw - 8) * pct), 8);

    if (this.hireBtn) {
      this.hireBtn.setLabel(`용병 고용\n${this.hireCost} G`);
      this.hireBtn.setEnabled(this.gold >= this.hireCost);
    }
    if (this.selected) this.refreshInfo();
  }

  refreshRelics() {
    this.relicRow.removeAll(true);
    const owned = RELICS.filter((r) => this.relics[r.id]);
    this.noRelicText.setVisible(owned.length === 0);
    owned.forEach((r, i) => {
      const x = 36 + i * 52;
      const y = 196;
      const icon = this.add.image(x, y, `relic_${r.id}`).setScale(PX).setInteractive({ useHandCursor: true });
      icon.on('pointerdown', () => this.toast(`${r.name}: ${r.desc}`, '#f2c14e'));
      this.relicRow.add(icon);
      if (this.relics[r.id] > 1) {
        this.relicRow.add(text(this, x + 16, y + 6, `x${this.relics[r.id]}`, 16, '#ffffff', { stroke: '#1b1b26', strokeThickness: 4 }));
      }
    });
  }

  createBottomPanel() {
    const top = 744;
    const g = this.add.graphics().setDepth(DEPTH.ui - 1);
    g.fillStyle(0x1b1b26).fillRect(0, top - 4, GAME_W, 4);
    g.fillStyle(0x0d0d14, 0.9).fillRect(0, top, GAME_W, GAME_H - top);

    this.hireBtn = new Button(this, 108, 800, 184, 88, '', () => this.hire(), { color: 0x2f7d4a, fontSize: 22 });
    this.speedBtn = new Button(this, 60, 900, 88, 64, 'x1', () => {
      this.speed = this.speed >= 3 ? 1 : this.speed + 1;
      this.speedBtn.setLabel(`x${this.speed}`);
      this.tweens.timeScale = this.speed;
    });
    this.pauseBtn = new Button(this, 156, 900, 88, 64, '정지', () => this.togglePause(), { fontSize: 20 });

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
    this.sellBtn = new Button(this, px + pw - 58, py + 26, 100, 40, '판매', () => this.selected && this.sell(this.selected), {
      color: 0x8c2b25,
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
      this.infoSub.setText('');
      this.infoTitle.setPosition(px + 16, py + 12).setColor('#ffffff').setText('용병단 지휘');
      this.infoBody
        .setPosition(px + 16, py + 46)
        .setText(
          [
            '· 고용: 빈 칸에 랜덤 용병 배치',
            '· 같은 속성·같은 레벨 용병을 끌어',
            '  겹치면 레벨 업 (골드 소모)',
            '· 상성: 블루>레드>그린>블루',
            `· 몬스터 ${BALANCE.maxAlive}기가 쌓이면 패배`
          ].join('\n')
        );
      return;
    }
    const st = m.getStats(this.relics);
    const info = ATTR_INFO[m.attr];
    this.infoPortrait.setTexture(`hero_${m.cls}_${m.attr}`).setVisible(true);
    this.infoTitle.setPosition(px + 72, py + 12).setColor(info.css).setText(`${m.heroName}`);
    const strong = ATTR_INFO[strongAgainst(m.attr)].name;
    const weak = ATTR_INFO[weakAgainst(m.attr)].name;
    const next = m.level < MAX_LEVEL ? `레벨 업 ${BALANCE.mergeCost[m.level + 1]}G` : '최고 레벨';
    this.infoSub.setText(`Lv.${m.level} ${m.classInfo.role} · ${info.name}`);
    const lines = [
      `강함 ${strong} · 약함 ${weak} · ${next}`,
      `공격 ${Math.round(st.damage)} · 공속 ${st.rate.toFixed(2)} · 사거리 ${Math.round(st.range)}`,
      m.skills.length ? `스킬: ${m.skills.map((id) => `★${SKILL_BY_ID[id].name}`).join(' ')}` : '스킬 없음 (레벨 업 시 랜덤 획득)'
    ];
    this.infoBody.setPosition(px + 16, py + 84).setText(lines.join('\n'));
    this.sellBtn.setVisible(true).setLabel(`판매 +${Math.floor(m.invested * BALANCE.sellRefund)}G`);
  }

  togglePause() {
    this.paused = !this.paused;
    this.pauseBtn.setLabel(this.paused ? '재개' : '정지');
    if (this.paused) this.tweens.pauseAll();
    else this.tweens.resumeAll();
  }

  endGame(victory) {
    if (this.over) return;
    this.over = true;
    this.tweens.timeScale = 1;
    this.bannerObj?.destroy();
    this.toastObj?.destroy();
    this.select(null);
    const o = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.75).setOrigin(0).setDepth(DEPTH.overlay).setInteractive();
    const cx = GAME_W / 2;
    const title = victory ? '승리!' : '게임 오버';
    text(this, cx, 340, title, 44, victory ? '#f2c14e' : '#ff6a55', { stroke: '#1b1b26', strokeThickness: 8 })
      .setOrigin(0.5)
      .setDepth(DEPTH.overlay + 1);
    const relicCount = Object.values(this.relics).reduce((a, b) => a + b, 0);
    text(
      this,
      cx,
      440,
      [`도달 웨이브: ${this.wave} / ${TOTAL_WAVES}`, `처치한 몬스터: ${this.totalKills}`, `획득한 유물: ${relicCount}개`].join('\n'),
      22,
      '#ffffff',
      { align: 'center', lineSpacing: 10 }
    )
      .setOrigin(0.5)
      .setDepth(DEPTH.overlay + 1);
    new Button(this, cx, 580, 240, 72, '다시 하기', () => this.scene.restart(), { color: 0x2f7d4a }).setDepth(DEPTH.overlay + 1);
    new Button(this, cx, 670, 240, 64, '타이틀로', () => this.scene.start('Title')).setDepth(DEPTH.overlay + 1);
    void o;
  }
}
