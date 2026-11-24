import Phaser from 'phaser';
import { splitCams, worldPoint, toUi } from '../systems/hires.js';
import { GAME_W, GAME_H, WORLD_W, WORLD_H, PX, UNIT_PX, UI_PX, BG_PX, GRID, CELL, FIELD_X, FIELD_Y, FIELD_SIZE, WALL, FONT, DEPTH, BALANCE } from '../config.js';
import { TILE_KEYS } from '../art/textures.js';
import { Monster } from '../objects/Monster.js';
import { Mercenary } from '../objects/Mercenary.js';
import { Button } from '../ui/Button.js';
import { Tutorial } from '../ui/Tutorial.js';
import { Hud } from '../ui/Hud.js';
import { panel, panelImage, titleTab, uiText, drawIcon, C, CSS } from '../ui/theme.js';
import { ATTRS, ATTR_INFO } from '../data/elements.js';
import { ROSTER_BY_ID } from '../data/roster.js';
import { MAX_STAR } from '../data/stars.js';
import { SHOP, priceOf, rerollCost, levelUpCost, refillShop, findStarUp } from '../data/shop.js';
import { countTraits, activeTier, TRAIT_IDS, RAGE_MAX, ORIGIN_IDS, TRAITS } from '../data/synergy.js';
import { ITEM_RULES, ITEM_BY_ID, MAT_IDS, isComponent, combine } from '../data/items.js';
import { STONES } from '../data/tavern.js';
import { RELIC_BY_ID, relicBonus, addBonus } from '../data/relics.js';
import { waveInfo, spawnList, isMilestoneWave } from '../data/waves.js';
import { cellAt, cellCenter, PATH_LENGTH } from '../systems/path.js';
import { dissolveTo, dissolveIn } from '../ui/dissolve.js';
import { Vfx } from '../systems/vfx.js';
import { playOnce, playBase, setArt, setFacing, hitDelay, cancelOnce } from '../systems/customArt.js';
import { biomeForWave } from '../data/biomes.js';
import { addBiomeDecor, swapBiomeDecor } from '../art/decor.js';
import { audio } from '../systems/audio.js';
import { meta } from '../systems/meta.js';
import { FAME, UPGRADES } from '../data/upgrades.js';

const text = (scene, x, y, str, size = 22, color = '#ffffff', extra = {}) =>
  scene.add.text(x, y, str, { fontFamily: FONT, fontSize: `${size}px`, color, ...extra }).setDepth(DEPTH.ui);

const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
/** 전열·후열 칸 대비 (2026-11-21 사용자 결정): 전열 밝게(흰빛 겹침), 후열 어둡게(틴트) */
const FIELD_ROWS = { frontLift: 0.14, backTint: 0x7c7c8c }; // 2026-11-21: 후열 더 어둡게 (이전 0x9c9ca8)

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    splitCams(this); // 전장(월드 1920x1080) + UI(1280x720 × 1.5) 카메라 (2026-11-22 PC 전환)
    this.gameTime = 0;
    this.speed = 1;
    this.paused = false;
    this.over = false;
    this.bonus = meta.load().bonus(); // 명성 강화 효과 (판 시작 시 고정)
    this.deck = meta.deck; // 출전 덱 (캐릭터 id 목록, 로비 병영에서 편성)
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
    // 룰 v2 (2026-11-20): 상점 6칸 · 영지 레벨(놓을 수 있는 인원·상점 확률) · 시너지
    this.estate = Math.min(SHOP.maxLevel, 1 + (this.bonus.startEstate || 0));
    this.shop = [];
    this.freeRerolls = 0; // 황금 길드 9: 웨이브마다 무료 리롤
    this.rerollCount = 0; // 이번 웨이브에 돈 내고 리롤한 횟수 (리롤 값이 그만큼 오른다)
    this.syn = { counts: {}, tiers: {} };
    this.rootTimer = 0; // 숲의 일족: 덩굴 속박 주기
    this.lakeRevived = false; // 호수의 성역 9: 성벽 부활 1회
    // 아이템 조합 (룰 v2 ②): 아이템 띠 · 해제 도구 · 판 안 대장장이
    this.bench = [];
    this.reserve = Array(SHOP.reserve).fill(null); // 대기석 (필드 아래 8칸) — Mercenary, reserved = true
    this.tools = 0;
    this.smithBought = 0;
    // 유물 (룰 v2 ③): 영지 유물 공방에서 장착한 것 — 판 안에서는 바뀌지 않는다 (효과는 meta.bonus 가 this.bonus 에 합쳐 둠)
    this.ownedRelics = meta.equipped.map((id) => ({ id, level: meta.relicLevel(id), active: true }));
    this.relics = {};
    this.enhanceMap = { ...meta.data.owned }; // 술집 강화 (캐릭터 id → 단계)
    this.stonesEarned = 0; // 이번 판에서 얻은 마정석 (얻을 때 바로 저장)
    this.waveAttrs = ATTRS; // 몬스터 그림 색만 (룰 v2: 속성 상성 없음)
    this.selected = null;
    this.totalKills = 0;
    this.hudTimer = 0;
    this.activeTexts = 0;
    this.tweens.timeScale = 1;

    this.biome = biomeForWave(1);
    this.bgImage = this.add.image(0, 0, `bg_${this.biome.id}`).setOrigin(0).setDisplaySize(WORLD_W, WORLD_H).setDepth(DEPTH.bg);
    this.createFieldLayers();
    this.decor = addBiomeDecor(this, this.biome.id); // 바람에 흔들리는 나무 등 (2026-11-21)
    this.rangeGfx = this.add.graphics().setDepth(DEPTH.merc - 1);
    this.hintGfx = this.add.graphics().setDepth(DEPTH.merc - 1);
    this.hpGfx = this.add.graphics().setDepth(DEPTH.hpbar);
    this.vfx = new Vfx(this);
    audio.playMusic('battle');
    this.events.on('firework-pop', () => audio.firework());

    this.watchUpgrades();
    this.hud = new Hud(this);
    this.tut = new Tutorial(this);
    this.time.delayedCall(400, () => this.tut.show('shop'));
    if (this.ownedRelics.length) this.time.delayedCall(500, () => this.tut.show('relic'));
    this.setupInput();
    this.shop = refillShop([], this.deck, this.estate, Math.random, this.maxedIds(), this.bonus);
    this.shopRefreshed = true; // 웨이브가 끝날 때 한 번 새로 고침 (refillShopNow)
    this.conscript();
    this.recomputeSynergy();
    this.refreshShop();
    this.refreshRelics();
    this.refreshHud();
    this.refreshInfo();
    this.showBanner('용병단 디펜스', `${BALANCE.prepTime}초 후 1웨이브 시작 · 상점에서 용병을 사서 시너지를 맞추세요`);
  }

  // ───────────────────────── 명성 강화 (2026-11-18: 필드 성탑 삭제 → 하단 '강화' 버튼, Hud) ─────────────────────────
  /** 강화 창을 닫고 돌아오면 효과를 바로 반영 */
  watchUpgrades() {
    const onResume = () => this.applyBonus();
    this.events.on('resume', onResume);
    this.events.once('shutdown', () => {
      this.events.off('resume', onResume);
      this.resetAnimClock();
    });
  }

  /** 용병을 놓을 수 있는 칸 수 (2026-11-18: 성탑 삭제 → 25칸 모두) */
  get fieldSlots() {
    return GRID * GRID;
  }

  /** 살 수 있는 강화 노드가 있는가 ('강화' 버튼의 "!" 표시) */
  get canUpgrade() {
    return !this.over && UPGRADES.some((u) => meta.status(u.id) === 'ok');
  }

  openUpgrades() {
    if (this.over || this.menuOpen || this.tut.open) return;
    this.select(null);
    this.hud.hideRelicTip();
    this.scene.launch('Upgrade', { from: 'game' });
    this.scene.bringToTop('Upgrade');
    dissolveIn(this.scene, 'Upgrade'); // 강화 창이 서서히 나타남 (2026-11-23)
    this.scene.pause();
  }

  /** 강화 효과 다시 읽기 (시작 골드·징집령처럼 판 시작 때만 쓰는 효과는 다음 판부터) */
  applyBonus() {
    const before = this.wallMax;
    this.bonus = meta.bonus();
    if (this.debugRelics) this.bonus = addBonus(this.bonus, relicBonus(Object.keys(this.debugRelics), this.debugRelics, this.bonus.relicPow || 0));
    this.wallHp += this.wallMax - before; // 성벽 보강을 판 도중에 찍으면 늘어난 만큼 바로 더한다
    this.refreshRelics();
    this.refreshHud();
    this.refreshInfo();
  }

  /** 명성 강화 '징집령': 시작할 때 덱에서 무료 용병 배치 ('노련한 신병'이면 언커먼 이상) */
  conscript() {
    for (let i = 0; i < (this.bonus.conscripts || 0); i++) {
      const pool = this.deck.filter((id) => ROSTER_BY_ID[id] && ROSTER_BY_ID[id].grade === (this.bonus.veteran ? 2 : 1));
      const id = Phaser.Utils.Array.GetRandom(pool.length ? pool : this.deck);
      if (id) this.placeChar(ROSTER_BY_ID[id], 0, true);
    }
  }

  // ───────────────────────── 루프 ─────────────────────────
  update(_t, delta) {
    this.hud?.paintReserve(); // 대기석 칸 등급색 (바뀐 칸만, 2026-11-24)
    if (this.over) return;
    const frozen = !!(this.paused || this.menuOpen || this.tut.open);
    this.syncFreeze(frozen);
    const dt = frozen ? 0 : Math.min(delta / 1000, 0.1) * this.speed;
    this.gameTime += dt;

    if (dt > 0) {
      this.updateWaves(dt);
      // 이동 속도: 명성 강화(서릿길·늪지 함정·족쇄) + 유물 서리 왕관(monsterSlow 에 합쳐 있음) + 숲의 일족
      const b = this.bonus;
      const relicSlow = this.syn.tiers.grove?.slow || 0;
      const mul = {
        normal: Math.max(0.4, 1 - relicSlow - b.monsterSlow),
        elite: Math.max(0.4, 1 - relicSlow - b.monsterSlow - b.eliteSlow),
        boss: Math.max(0.4, 1 - relicSlow - b.bossSlow)
      };
      for (const m of this.monsters) if (m.alive) m.tick(dt, this.gameTime, mul[m.kind] ?? mul.normal);
      this.checkLaps();
      this.updateBosses(dt);
      this.updateRoots(dt);
      this.updateMercs(dt);
      this.cleanupMonsters();
      // 웨이브 클리어 → 상점 새로 고침 (2026-11-22)
      if (this.wave >= 1 && !this.shopRefreshed && this.canCallNextWave) {
        this.refillShopNow();
        this.toast('웨이브 클리어 · 상점 새로 고침');
      }
    }

    this.drawHpBars();
    this.drawRange();

    this.hudTimer -= delta;
    if (this.hudTimer <= 0) {
      this.hudTimer = 100;
      this.refreshHud();
    }

    // 호수의 성역 9: 성벽이 0이 되면 한 판에 한 번 50% 로 되살아남
    const lake = this.syn.tiers.lake;
    if (this.wallHp <= 0 && lake?.revive && !this.lakeRevived) {
      this.lakeRevived = true;
      this.wallHp = Math.round(this.wallMax * lake.revive);
      this.showBanner('호수의 성역', `성벽이 ${Math.round(lake.revive * 100)}% 로 되살아났습니다`, '#3a8fb0');
      this.cameras.main.flash(300, 120, 200, 255);
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
    dmg *= 1 - (this.syn.tiers.knight?.wallDmg || 0); // 왕국 기사단: 성벽 피해 -
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
      audio.wallHit(false);
    }
    if (m.kind !== 'normal') audio.wallHit(true);
    audio.wallHealth(this.wallHp, this.wallMax); // 위험하면 경고음
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
      this.floatText(300, 128, `+${income}G`, '#f2c14e', 16, false, true);
    }
    // 명성 강화 '성벽 수리': 웨이브마다 성벽 회복
    if (b.wallRegen && w >= 2) this.wallHp = Math.min(this.wallMax, this.wallHp + b.wallRegen);
    this.waveSynergy(w);
    this.waveItems(w);
    // 상점 (2026-11-22 사용자 결정): 웨이브가 끝날 때(몬스터를 다 잡았을 때) 새로 채운다 — 다 잡기 전에 다음 웨이브가
    // 시작되면 그때 새로 채운다 (웨이브마다 한 번)
    if (w >= 2 && !this.shopRefreshed) this.refillShopNow();
    this.shopRefreshed = false;
    this.wave = w;
    const info = waveInfo(w);
    if (info.type === 'normal' || info.type === 'elite') audio.waveStart(info.type, w); // 보스 웨이브는 보스가 나올 때 전쟁나팔
    const list = spawnList(w);
    this.spawnQueue.push(...list);
    // 몬스터 그림 색 (룰 v2: 속성 상성 없음 — 색만 섞는다)
    this.waveAttrs = Phaser.Utils.Array.Shuffle([...ATTRS]).slice(0, BALANCE.monster.attrsPerWave);
    this.spawnInterval = BALANCE.spawnWindow / list.length;
    this.spawnTimer = 0;
    this.waveTimer = BALANCE.waveDuration;
    this.changeBiome(biomeForWave(w));
    const sub =
      info.type === 'final' ? `최종 보스 출현! 쓰러뜨려도 한 번 되살아납니다` :
      info.type === 'milestone' ? `강화 보스 + 정예 ${info.elite}기! 분노 주의` :
      info.type === 'boss' ? `보스 등장! 한 바퀴 돌 때마다 성벽 -${BALANCE.wall.dmg.boss}` :
      info.type === 'elite' ? `몬스터 ${info.normal}기 + 정예 10기` : `몬스터 ${info.normal}기`;
    const color = info.type === 'final' ? '#ff4dd2' : info.type === 'milestone' ? '#d6a8ff' : info.type === 'boss' ? '#ff6a55' : info.type === 'elite' ? '#f2c14e' : '#ffffff';
    this.showBanner(`WAVE ${w}`, sub, color);
    if (w === 1) this.tut.show('wave');
  }

  /** 상점의 잠그지 않은 칸을 새로 채운다 (웨이브가 끝날 때 한 번) */
  refillShopNow() {
    this.shopRefreshed = true;
    this.rerollCount = 0; // 웨이브 끝 상점 새로 고침과 함께 리롤 값도 처음으로 (2026-11-22)
    this.shop = refillShop(this.shop, this.deck, this.estate, Math.random, this.maxedIds(), this.bonus);
    this.refreshShop();
    audio.shopRefresh();
  }

  /** 바로 시작은 필드의 몬스터를 전부 처치했을 때만 (나올 몬스터도 남아 있지 않을 때) */
  get canCallNextWave() {
    return !this.over && this.monsters.length === 0 && this.spawnQueue.length === 0;
  }

  /** 다음 웨이브를 바로 시작 (실수 연타 방지 0.6초) */
  callNextWave() {
    if (this.menuOpen || this.tut.open || !this.canCallNextWave) return;
    const now = this.time.now;
    if (now - (this.lastCall || 0) < 600) return;
    this.lastCall = now;
    this.startWave(this.wave + 1);
    audio.coin();
    this.refreshHud();
  }

  /**
   * 필드 레이어 (2026-11-17): 지역 배경(bg_<지역>) 위에 석판 25칸 → 성벽 링을 따로 쌓는다.
   * 각 레이어는 텍스처 키라 manifest 로 스킨을 씌우면 그대로 바뀐다 (크기는 화면 크기에 맞춰 늘림 — 스킨 해상도 자유).
   * 석판 변형(_b, _c)은 기본 키에만 스킨이 있으면 기본 키 하나로 통일한다.
   */
  createFieldLayers() {
    const skinned = (key) => this.textures.get(key).customData?.artScale !== undefined;
    this.fieldTiles = [];
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        const keys = TILE_KEYS[(gx + gy) % 2 === 0 ? 'light' : 'dark'];
        const key = skinned(keys[0]) ? keys[0] : keys[(gx * 7 + gy * 3) % keys.length];
        const tile = this.add.image(FIELD_X + gx * CELL, FIELD_Y + gy * CELL, key).setOrigin(0).setDisplaySize(CELL, CELL).setDepth(DEPTH.bg + 1);
        // 전열(바깥 줄 16칸)·후열(가운데 3x3) 구분 (2026-11-21): 후열은 어둡게
        const front = gx === 0 || gy === 0 || gx === GRID - 1 || gy === GRID - 1;
        if (!front) tile.setTint(FIELD_ROWS.backTint);
        this.fieldTiles.push(tile);
      }
    }
    // 전열은 밝게: 바깥 줄 위에 흰빛 얇게
    const lift = this.add.graphics().setDepth(DEPTH.bg + 1.5);
    lift.fillStyle(0xffffff, FIELD_ROWS.frontLift);
    lift.fillRect(FIELD_X, FIELD_Y, FIELD_SIZE, CELL).fillRect(FIELD_X, FIELD_Y + FIELD_SIZE - CELL, FIELD_SIZE, CELL);
    lift.fillRect(FIELD_X, FIELD_Y + CELL, CELL, FIELD_SIZE - 2 * CELL).fillRect(FIELD_X + FIELD_SIZE - CELL, FIELD_Y + CELL, CELL, FIELD_SIZE - 2 * CELL);
    this.fieldRowLift = lift;
    // 성벽: 텍스처 (0,0) = 성벽 바깥 테두리에서 아트 1px 바깥
    const wall = this.textures.get('field_wall').getSourceImage();
    const size = FIELD_SIZE + 2 * WALL + 3 * BG_PX;
    this.fieldWall = this.add.image(FIELD_X - WALL - BG_PX, FIELD_Y - WALL - BG_PX, 'field_wall').setOrigin(0).setDisplaySize(size, size).setDepth(DEPTH.bg + 2);
    if (!wall) console.warn('field_wall 텍스처 없음');
  }

  /** 지역(배경) 전환: 새 배경이 서서히 덮인다 */
  changeBiome(biome) {
    if (biome.id === this.biome.id) return;
    this.biome = biome;
    audio.regionChange();
    const old = this.bgImage;
    this.bgImage = this.add.image(0, 0, `bg_${biome.id}`).setOrigin(0).setDisplaySize(WORLD_W, WORLD_H).setDepth(DEPTH.bg + 0.5).setAlpha(0);
    this.tweens.add({
      targets: this.bgImage,
      alpha: 1,
      duration: 1200,
      onComplete: () => {
        old.destroy();
        this.bgImage.setDepth(DEPTH.bg);
      }
    });
    this.decor = swapBiomeDecor(this, this.decor, biome.id);
    this.time.delayedCall(2300, () => !this.over && this.toast(`새로운 지역: ${biome.name}`));
  }

  spawnMonster(kind) {
    const m = new Monster(this, kind, Phaser.Utils.Array.GetRandom(this.waveAttrs), this.wave, kind === 'boss' && isMilestoneWave(this.wave));
    this.monsters.push(m);
    if (m.isBoss) {
      audio.bossAppear(); // 전쟁나팔(audio.warHorn)은 2026-11-24 사용자 결정으로 보류 — 예전 우르릉 소리
      this.tut.show('boss');
      this.showBanner(m.isFinal ? `최종 보스: ${m.design.name}` : `${m.milestone ? '강화 보스' : '보스'}: ${m.design.name}`, m.abilities.map((a) => `${a.def.name}(${a.def.desc} ${a.def.dur}초)`).join(' / '), '#d6a8ff');
    }
  }

  cleanupMonsters() {
    if (this.monsters.some((m) => !m.alive)) this.monsters = this.monsters.filter((m) => m.alive);
  }

  // ───────────────────────── 전투 ─────────────────────────
  /** 필드에 놓인 용병 (전투·시너지·인원은 이것만) */
  get mercs() {
    return this.grid.flat().filter(Boolean);
  }

  /** 필드 + 대기석 (별 승급·3성 판정은 대기석도 센다) */
  get allUnits() {
    return [...this.mercs, ...this.reserve.filter(Boolean)];
  }

  /** 빈 대기석 칸 번호 (없으면 -1) */
  freeReserve() {
    return this.reserve.findIndex((u) => !u);
  }

  /** 유닛을 지금 자리(필드 칸·대기석)에서 뺀다 */
  unplace(u) {
    if (u.reserved) this.reserve[u.slot] = null;
    else if (this.grid[u.row]?.[u.col] === u) this.grid[u.row][u.col] = null;
  }

  /** 유닛을 대기석 slot 에 */
  toReserve(u, slot) {
    u.reserved = true;
    u.slot = slot;
    u.col = u.row = -1;
    this.reserve[slot] = u;
    u.snapToCell();
  }

  /** 유닛을 필드 칸에 */
  toField(u, col, row) {
    u.reserved = false;
    u.slot = -1;
    u.col = col;
    u.row = row;
    this.grid[row][col] = u;
    u.snapToCell();
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

      // 기본 공격 — 휘두름·발사 전에 노린 몬스터가 모두 죽으면 공격 동작을 끊고 바로 다음 대상을 노린다 (2026-11-20)
      const p = merc.pendingHit;
      if (p && p.targets.every((m) => !m.alive)) {
        p.timer.remove(false);
        merc.pendingHit = null;
        cancelOnce(merc.sprite, 'idle');
        merc.cooldown = 0;
      }
      merc.cooldown -= dt;
      if (merc.cooldown > 0) continue;
      const live = inRange.filter((m) => m.alive);
      if (!live.length) {
        merc.cooldown = 0;
        continue;
      }
      merc.cooldown = 1 / st.rate;
      // 대상 쪽을 바라본다 (거의 위·아래에 있으면 방향 유지)
      const dx = live[0].x - merc.x;
      if (Math.abs(dx) > 8) setFacing(merc.sprite, dx < 0);
      // 스킬: 마나가 가득 차면 이번 공격 대신 스킬 (룰 v2, TFT 식 — 침묵 중엔 못 쓰고 마나는 그대로)
      if (merc.mana >= merc.maxMana && !deb.silence && this.canCast(merc.def, inRange)) {
        merc.mana = 0;
        this.atHitFrame(merc, st, () => {
          const st2 = merc.getStats(this.relics, this.gameTime);
          const inR = this.monstersInRange(merc.x, merc.y, st2.range);
          if (!this.castSkill(merc, merc.def, st2, inR)) return;
          // 마탑 9: 확률로 스킬 두 번
          if (st2.doubleCast && Math.random() < st2.doubleCast) this.time.delayedCall(250, () => this.mercs.includes(merc) && this.castSkill(merc, merc.def, st2, this.monstersInRange(merc.x, merc.y, st2.range)));
        });
        continue;
      }
      const picked = st.item.strongest ? [...live].sort((a, b) => b.hp - a.hp).slice(0, st.targets) : live.slice(0, st.targets); // 공성 조준기
      // 피해·투사체는 휘두름·발사 프레임에 나간다 (2026-11-20). 노린 대상 중 살아 있는 것만 — 모두 죽으면 위에서 공격 취소
      const timer = this.atHitFrame(merc, st, () => {
        if (merc.pendingHit?.timer === timer) merc.pendingHit = null;
        let hitAny = false;
        for (const m of picked) {
          if (!m.alive) continue;
          this.basicAttack(merc, st, m);
          hitAny = true;
        }
        if (!hitAny) return;
        merc.attacks += 1;
        merc.mana = Math.min(merc.maxMana, merc.mana + st.manaGain * deb.cdRate); // 마나 (시간 부식 디버프면 덜 찬다)
        if (merc.origin === 'north' && this.syn.tiers.north) merc.rage = Math.min(RAGE_MAX, merc.rage + 1); // 북방 부족 분노
      });
      if (timer) merc.pendingHit = { timer, targets: picked };
    }
  }

  /** 스킬을 쓸 수 있는지 (castSkill 이 false 를 내는 조건과 같게 — 시전 동작을 헛되이 하지 않게) */
  canCast(def, inRange) {
    return !(def.area || def.buff) || inRange.some((m) => m.alive);
  }

  /**
   * 공격 동작을 재생하고, 타격·발사 프레임(manifest attack.hit)에 fn 을 부른다.
   * 공격 모션 길이는 공속에 맞춘다 — 공격 간격의 85% 동안 한 번 휘두른다 (배속은 anims.globalTimeScale, 2026-11-19).
   * 애니메이션이 없으면 살짝 튀어오르고 바로 fn. 기다리는 동안 판이 끝나거나 용병이 필드를 떠나면 취소.
   * 기다리면 타이머를 돌려준다 (바로 부르면 null) — 공격 취소용
   */
  atHitFrame(merc, st, fn) {
    if (!playOnce(merc.sprite, 'attack', 'idle', BALANCE.attackAnim.share * (1000 / st.rate))) {
      this.tweens.add({ targets: merc.sprite, y: -PX * 2, duration: 60, yoyo: true });
      fn();
      return null;
    }
    const wait = hitDelay(merc.sprite, 'attack');
    if (wait <= 0) {
      fn();
      return null;
    }
    return this.time.delayedCall(wait, () => {
      if (this.over || !merc.sprite.active || !this.mercs.includes(merc)) return;
      fn();
    });
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
    const slayer = target.kind !== 'normal' && merc.trait?.bossMult ? merc.trait.bossMult : 1; // 특성: 보스·정예 특화
    const elite = target.kind !== 'normal' ? 1 + (st.eliteDmg || 0) + (target.isBoss ? st.bossDmg || 0 : 0) : 1; // 사수 시너지·아이템: 정예·보스 피해
    const far = st.item?.farDmg ? 1 + st.item.farDmg * Math.min(1, Math.sqrt(d2(target, merc)) / st.range) : 1; // 명사수 조준경
    const dmg = st.damage * mult * giant * slayer * elite * far;
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
    return merc.kind;
  }

  basicAttack(merc, st, target) {
    this.vfx.attack(merc, target, this.kindOf(merc));
    audio.shoot(this.kindOf(merc));
    const crit = Math.random() < st.crit;
    if (crit) audio.crit();
    const now = this.gameTime;
    if (st.slow) target.applySlow(Math.min(0.85, st.slow * st.hex), st.slowDur, now);
    // 고유 특성 (data/roster.js): 지속 피해·약화·밀치기·확률 기절·처형 — 주술 효과는 주술사 시너지만큼 세진다
    const t = merc.trait || {};
    const ix = st.item || {};
    const exe = Math.max(t.execute || 0, ix.execute || 0); // 특성·현상금 표식: 처형
    if (exe && target.kind === 'normal' && target.hp / target.maxHp <= exe) {
      this.killMonster(target, merc);
      return;
    }
    if (t.dot) target.applyDot(st.damage * t.dot[0] * st.hex, t.dot[1], now, merc);
    if (t.vuln) target.applyVuln(t.vuln[0] * st.hex, t.vuln[1], now);
    const teamVuln = this.syn.tiers.hexer?.teamVuln; // 주술사 8: 모든 아군 공격에 약화
    if (teamVuln) target.applyVuln(teamVuln, 2, now);
    if (t.push) target.push(t.push);
    if (t.stun && Math.random() < t.stun[0]) target.applyStun(t.stun[1], now);
    const pos = { x: target.x, y: target.y };
    this.hit(merc, st, target, crit ? st.critMult : 1, crit);
    // 암살자 8: 치명타 때 확률로 한 번 더
    if (crit && st.critExtra && Math.random() < st.critExtra && target.alive) this.hit(merc, st, target, st.critMult, true);
    // 아이템: 쌍날 단검(2번마다 한 번 더) · 산탄 장치(주변 30px) · 불꽃 화살통(3번마다 폭발)
    if (ix.extraEvery && (merc.attacks + 1) % ix.extraEvery === 0 && target.alive) this.hit(merc, st, target, 0.5, false);
    if (ix.scatter) for (const o of this.monsters) if (o.alive && o !== target && d2(o, pos) <= ix.scatter ** 2) this.hit(merc, st, o, 0.5, false, false);
    if (ix.burstEvery && (merc.attacks + 1) % ix.burstEvery === 0) {
      for (const o of this.monsters) if (o.alive && d2(o, pos) <= 40 * 40) this.hit(merc, st, o, 0.8, false, false);
      this.circleFx(pos.x, pos.y, 40, 0xd9822b);
    }
    if (st.splash) {
      const blast = () => {
        for (const o of this.monsters) {
          if (o.alive && o !== target && d2(o, pos) <= st.splash ** 2) {
            this.hit(merc, st, o, 1, false, false);
            if (st.burn) o.applyDot(st.damage * 0.3, st.burn, this.gameTime, merc); // 포격수 5: 불길
          }
        }
        this.circleFx(pos.x, pos.y, st.splash, ATTR_INFO[merc.attr].color);
      };
      blast();
      if (st.doubleBlast) this.time.delayedCall(180, () => !this.over && blast()); // 포격수 8: 두 번 터짐
    }
    // 전사 5·8: N번째 공격마다 주변 베기 (반경 44, 60% 피해)
    if (st.cleaveEvery && (merc.attacks + 1) % st.cleaveEvery === 0) {
      for (const o of this.monsters) if (o.alive && o !== target && d2(o, pos) <= 44 * 44) this.hit(merc, st, o, 0.6, false, false);
      this.circleFx(pos.x, pos.y, 44, 0xc0563c);
    }
    // 사수: 관통 — 대상 뒤 가까운 몬스터 n마리에 60% 피해
    if (st.pierce) {
      const near = this.monsters.filter((o) => o.alive && o !== target && d2(o, pos) <= 56 * 56).sort((a, b) => d2(a, pos) - d2(b, pos));
      for (const o of near.slice(0, st.pierce)) this.hit(merc, st, o, 0.6, false, false);
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
    if (st.skillArea && def.area?.r) def = { ...def, area: { ...def.area, r: Math.round(def.area.r * (1 + st.skillArea)) } }; // 별빛 망원경
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
    // 레어·유니크는 캐릭터 전용 이펙트, 커먼·언커먼은 공용 세트 이펙트 (2026-11-18). 시트가 없으면 예전 연출
    if (!this.vfx.sigSkill(merc, def, targets, primary) && !this.vfx.setSkill(merc, def, targets, primary)) this.vfx.skill(merc, def, this.kindOf(merc), targets, primary, st.range);
    if (def.level > 5 || merc.grade === 3) audio.ult(); // 궁극기 소리: 유니크 + 레어 (2026-11-22 사용자 요청)
    else audio.skill(def.level, merc.attr);

    const fx = def.fx || {};
    // 스킬 피해: 마탑·호수 시너지 + 명성 강화 '비전 연구' (룰 v2: 속성 추가 효과 없음)
    const flavorMul = 1 + (st.skillDmg || 0);
    const hex = st.hex || 1; // 주술사 시너지: 지속 피해·약화·감속 강화
    for (const t of targets) {
      if (!t.alive) continue;
      if (fx.stun) t.applyStun(fx.stun, now);
      if (fx.slow) t.applySlow(Math.min(0.85, fx.slow[0] * hex), fx.slow[1], now);
      if (fx.vuln) t.applyVuln(fx.vuln[0] * hex, fx.vuln[1], now);
      if (fx.push) t.push(fx.push);
      if (fx.dot) t.applyDot(st.damage * fx.dot[0] * flavorMul * hex, fx.dot[1], now, merc);

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
      const sc = st.item?.skillCrit && Math.random() < st.crit; // 룬 각인 검: 스킬 치명타
      if (mult) this.hit(merc, st, t, mult * flavorMul * (sc ? st.critMult : 1), sc, targets.length <= 3); // 범위 스킬은 관통 없음 (이미 여럿을 때린다)
    }

    if (def.buff) {
      const b = def.buff;
      const who =
        b.scope === 'self' ? [merc] :
        b.scope === 'all' ? this.mercs :
        this.mercs.filter((o) => Math.abs(o.col - merc.col) <= 1 && Math.abs(o.row - merc.row) <= 1);
      const durMult = this.syn.tiers.support?.buffDur || 1; // 지원가 5: 버프 지속 1.5배
      for (const o of who) {
        o.addBuff(b, now, durMult);
        o.buffFlashUntil = now + 0.25;
      }
    }
    // 아이템: 폭주 마도서(같은 자리 한 번 더 폭발) · 연금술 플라스크(골드)
    if (st.item?.afterBlast && primary) {
      const at = { x: primary.x, y: primary.y };
      this.time.delayedCall(300, () => {
        if (this.over) return;
        for (const o of this.monsters) if (o.alive && d2(o, at) <= 60 * 60) this.hit(merc, st, o, st.item.afterBlast, false, false);
        this.circleFx(at.x, at.y, 60, 0x8a4fb5);
      });
    }
    if (st.item?.skillGold) {
      this.gold += st.item.skillGold;
      this.floatText(merc.x + 14, merc.y - 30, `+${st.item.skillGold}G`, '#f2c14e');
    }
    if (def.gold) {
      const g = def.gold + Math.floor(this.wave * (def.goldPerWave || 0));
      this.gold += g;
      this.floatText(merc.x, merc.y - 40, `+${g}G`, '#f2c14e');
    }
    if (def.level <= 5) this.floatText(merc.x, merc.y - 40 - (merc.col % 2) * 20, def.name, ATTR_INFO[merc.attr].css, def.level >= 4 ? 22 : 16, def.level >= 4);
    return true;
  }

  damageMonster(m, amount, { source, crit = false, silent = false } = {}) {
    if (!m.alive) return;
    amount *= m.damageTakenMult(this.gameTime);
    m.hp -= amount;
    if (!silent) m.flashUntil = this.gameTime + 0.06;
    if (crit) this.floatText(m.x, m.y - 20, `${Math.round(amount)}!`, '#ffd84a');
    if (m.hp <= 0) this.killMonster(m, source, crit);
  }

  killMonster(m, source, crit = false) {
    if (!m.alive) return;
    if (m.isFinal && !m.revived) return this.reviveFinalBoss(m);
    m.alive = false;
    this.totalKills += 1;
    // 물량: 일반 몬스터 골드는 소수 → 모았다가 정수가 될 때마다 지급
    const bounty = source?.trait?.bounty || 0; // 특성: 처치 골드 증가
    const guild = this.syn.tiers.guild?.gold || 0; // 황금 길드: 처치 골드 +
    const ix = source?.items?.length ? source.ifx : {};
    this.goldFrac += m.gold * (1 + this.bonus.bounty + bounty + guild + (ix.gold || 0));
    // 아이템: 행운의 편자(치명타 처치 10% +1G) · 보물 폭탄(10% +3G)
    if ((crit && ix.critGold && Math.random() < ix.critGold) || (ix.treasure && Math.random() < ix.treasure)) this.goldFrac += ix.treasure && !crit ? 3 : 1;
    if (source) source.waveKills = (source.waveKills || 0) + 1;
    // 주술사 5: 지속 피해가 걸린 적이 죽으면 가장 가까운 적에게 옮는다
    if (this.syn.tiers.hexer?.spread && m.dots?.length) {
      const next = this.monsters.find((o) => o.alive && o !== m && d2(o, m) <= 80 * 80);
      if (next) for (const d of m.dots) next.applyDot(d.dps, Math.max(1, d.until - this.gameTime), this.gameTime, d.source);
    }
    const gold = Math.floor(this.goldFrac + 1e-9);
    this.goldFrac -= gold;
    if (source && source.active) source.kills += 1;
    this.gold += gold;
    this.deathFx(m);
    this.vfx.coinDrop(m.x, m.y);
    this.dropItems(m);
    if (m.isBoss) {
      this.earnFame((m.isFinal ? FAME.finalBoss : m.milestone ? FAME.milestoneBoss : FAME.boss) + this.bonus.bossFame);
      audio.bossKill();
      this.earnStones(m.isFinal ? STONES.final : m.milestone ? STONES.milestone : STONES.boss, m.x, m.y);
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

  /** 마정석 (보스 처치): 바로 저장 — 영지 술집·유물 공방에서 쓴다 */
  earnStones(n, x, y) {
    if (!n) return;
    meta.addStones(n);
    audio.gem();
    this.stonesEarned += n;
    this.floatText(x, y - 54, `마정석 +${n}`, '#6fe0d6');
    this.toast(`마정석 +${n} (보유 ${meta.stones}) — 영지 술집·유물 공방에서 사용`, '#6fe0d6');
    this.tut.show('stones');
  }

  /** 술집 강화 단계 (Mercenary.getStats) */
  enhanceOf(id) {
    return this.enhanceMap[id] || 0;
  }

  // ───────────────────────── 유물 (영지에서 장착한 것, 판 안 고정) ─────────────────────────
  /** 성벽 최대 체력 (명성 강화 '성벽 보강' + 유물 돌 심장) */
  get wallMax() {
    return BALANCE.wall.hp + (this.bonus.wallHp || 0);
  }

  get maxRelics() {
    return meta.relicSlots;
  }

  get activeRelicCount() {
    return this.ownedRelics.length;
  }

  /** 디버그·테스트용: 이번 판에만 유물 하나 더 장착 (저장 안 함, 칸이 가득 차면 false) */
  addRelic(id, level = 1) {
    if (!RELIC_BY_ID[id] || this.ownedRelics.length >= this.maxRelics) return false;
    this.ownedRelics.push({ id, level, active: true });
    this.debugRelics = { ...this.debugRelics, [id]: level };
    this.bonus = addBonus(this.bonus, relicBonus([id], { [id]: level }, this.bonus.relicPow || 0));
    this.refreshRelics();
    return true;
  }

  // ───────────────────────── 상점 · 영지 레벨 · 별 승급 (룰 v2, 2026-11-20) ─────────────────────────
  /** 놓을 수 있는 인원 (영지 레벨) */
  get cap() {
    return SHOP.cap(this.estate);
  }

  /** 영지 레벨 업 값 (최고 레벨이면 null) */
  get estateCost() {
    return levelUpCost(this.estate, this.bonus.estateDiscount || 0);
  }

  /** 지금 리롤 값 (무료 리롤이 남았으면 0) */
  get rerollPrice() {
    if (this.freeRerolls > 0) return 0;
    return Math.max(0, rerollCost(this.shop, { rerolls: this.rerollCount || 0, wave: this.wave }) - (this.bonus.rerollDiscount || 0));
  }

  /** 판매 환급 비율 (명성 강화 '깔끔한 정산') */
  get sellRefund() {
    return SHOP.sellRefund + (this.bonus.sellRefund || 0);
  }

  /** 이미 3성인 캐릭터 (상점에 더 나오지 않는다) */
  maxedIds() {
    return new Set(this.allUnits.filter((m) => m.star >= MAX_STAR).map((m) => m.char.id));
  }

  /** 이 캐릭터를 사면 별 승급이 되는가 (같은 캐릭터 1성 2장이 이미 있으면) — 인원이 꽉 차도 살 수 있다 */
  completesStar(id) {
    return this.allUnits.filter((m) => m.char.id === id && m.star === 1).length >= 2;
  }

  /** 빈 칸 (후열·가운데부터, 전사는 전열 먼저) */
  emptyCell(char) {
    const cells = [];
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) if (!this.grid[r][c]) cells.push({ c, r });
    if (!cells.length) return null;
    const front = (p) => p.r === 0 || p.c === 0 || p.r === GRID - 1 || p.c === GRID - 1;
    const want = char?.cls === 'warrior' ? cells.filter(front) : cells.filter((p) => !front(p));
    return (want.length ? want : cells)[0];
  }

  /** 디버그·테스트용: 덱에서 무작위 캐릭터를 빈 칸에 바로 놓는다 (골드·인원 제한 없음 — 게임 규칙은 상점 buy) */
  hire(id) {
    const pool = this.deck.filter((x) => ROSTER_BY_ID[x]);
    const char = ROSTER_BY_ID[typeof id === 'string' ? id : Phaser.Utils.Array.GetRandom(pool)];
    if (!char || !this.emptyCell(char)) return null;
    return this.placeChar(char, priceOf(char));
  }

  /** 상점 칸 사기 */
  buy(i) {
    if (this.over) return null;
    const slot = this.shop[i];
    if (!slot || slot.sold) return null;
    const char = ROSTER_BY_ID[slot.id];
    const cost = priceOf(char);
    if (this.gold < cost) {
      this.toast('골드가 부족합니다');
      return null;
    }
    // 필드 인원이 가득 차면 대기석으로 (2026-11-21) — 대기석도 차면 못 산다 (별 승급이 되는 3장째는 예외)
    const toBench = this.mercs.length >= this.cap || !this.emptyCell(char);
    if (toBench && this.freeReserve() < 0 && !this.completesStar(char.id)) {
      this.toast(`필드(${this.cap}명)와 대기석이 가득 찼어요 — 팔거나 영지 레벨을 올리세요`, '#ff9a7a');
      this.tut.show('estate');
      return null;
    }
    const merc = this.placeChar(char, cost, false, toBench);
    if (!merc) return null;
    this.gold -= cost;
    slot.sold = true;
    slot.locked = false;
    audio.coin();
    this.refreshShop();
    this.refreshHud();
    return merc;
  }

  /** 캐릭터를 빈 칸에 놓고 별 승급을 확인한다. cost: 들어간 골드 */
  placeChar(char, cost, free = false, toBench = false) {
    let cell = toBench ? null : this.emptyCell(char);
    const slot = toBench ? this.freeReserve() : -1;
    if (!cell && slot < 0) {
      // 칸이 없어도 별 승급이 되면 놓을 수 있게: 승급 재료 한 장 자리를 잠깐 쓴다
      if (!this.completesStar(char.id)) {
        this.toast('빈 칸이 없습니다');
        return null;
      }
      const m0 = this.allUnits.find((m) => m.char.id === char.id && m.star === 1);
      return this.starUpWith(m0, char, cost);
    }
    const merc = new Mercenary(this, cell ? cell.c : 0, cell ? cell.r : 0, char);
    merc.invested = cost;
    merc.mana = Math.round(merc.maxMana * (this.bonus.startMana || 0)); // 명성 강화 '마나 정수'
    if (cell) this.toField(merc, cell.c, cell.r);
    else {
      this.toReserve(merc, slot);
      this.tut.show('reserve');
    }
    // 떨어지며 등장 — 정지 중(트윈 멈춤)에 사면 그대로 놓는다 (안 그러면 다시 움직일 때까지 투명해 안 보였다, 2026-11-22)
    if (!this.tweens.paused) {
      merc.sprite.setY(-40).setAlpha(0);
      this.tweens.add({ targets: merc.sprite, y: 0, alpha: 1, duration: 220, ease: 'Bounce.easeOut' });
    }
    if (free) this.toast(`징집: ${merc.gradeName} ${merc.heroName} 합류!`, '#f2c14e');
    else if (merc.isHero) {
      this.levelUpFx(merc, '유니크!', true);
      this.showBanner(`유니크 ${merc.heroName} 합류!`, `${merc.char.title} · 스킬 「${merc.def.name}」`, '#f2c14e');
      audio.promote();
      this.tut.show('hero');
    }
    const up = this.checkStarUps();
    this.recomputeSynergy();
    return up || merc;
  }

  /** 칸이 꽉 찼을 때: 같은 캐릭터 1성에 바로 합쳐 승급 */
  starUpWith(base, char, cost) {
    base.invested += cost;
    const up = this.checkStarUps(char.id) || base;
    this.recomputeSynergy();
    return up;
  }

  /**
   * 같은 캐릭터·같은 별 3장 → 별 승급 (연쇄로 2성 3장 → 3성까지). 칸이 꽉 차서 바로 합칠 때는 extraId 1장을 더해 센다
   * @returns 승급한 유닛 (없으면 null)
   */
  checkStarUps(extraId) {
    let last = null;
    for (;;) {
      // 필드 유닛을 앞에 — 남는 쪽(keep)이 필드에 있게 (대기석 것만 모이면 대기석에서 승급)
      let group = findStarUp(this.allUnits, MAX_STAR);
      if (!group && extraId) {
        const ones = this.allUnits.filter((m) => m.char.id === extraId && m.star === 1);
        if (ones.length >= 2) group = [ones[0], ones[1], null];
        extraId = null;
      }
      if (!group) return last;
      // 남는 쪽: 아이템·위치는 가장 먼저 놓인(왼쪽 위) 유닛
      const [keep, ...rest] = group;
      for (const o of rest) {
        if (!o) continue;
        // 아이템도 남는 쪽으로 — 3칸을 넘으면 띠로
        for (const id of o.items) {
          if (keep.items.length < ITEM_RULES.slots) keep.items.push(id);
          else this.returnItems([id]);
        }
        keep.invested += o.invested;
        keep.kills += o.kills;
        this.unplace(o);
        if (this.selected === o) this.selected = keep;
        o.destroy();
      }
      keep.starUp();
      keep.mana = 0;
      audio.levelUp();
      this.levelUpFx(keep, keep.star >= MAX_STAR ? '★★★' : '★★', keep.star >= MAX_STAR);
      this.toast(`${keep.heroName} ${keep.star}성 승급! 스킬 「${keep.def.name}」 강화`, '#f2c14e');
      this.tut.show('star');
      last = keep;
    }
  }

  /** 리롤: 잠그지 않은 칸을 새로 굴린다 */
  reroll() {
    if (this.over) return false;
    if (this.selected) this.select(null); // 필드 캐릭터를 고른 채(정보 창)라도 리롤을 누르면 구매 창(상점)으로 (2026-11-21)
    const cost = this.rerollPrice;
    if (this.gold < cost) {
      this.toast(`골드가 부족합니다 (리롤 ${cost}G)`);
      return false;
    }
    if (this.freeRerolls > 0) this.freeRerolls -= 1;
    else {
      this.gold -= cost;
      this.rerollCount = (this.rerollCount || 0) + 1; // 돈 내고 돌릴 때마다 다음 리롤 값이 오른다 (무료 리롤은 세지 않음)
    }
    this.shop = refillShop(this.shop, this.deck, this.estate, Math.random, this.maxedIds(), this.bonus);
    audio.reroll();
    this.refreshShop();
    this.refreshHud();
    return true;
  }

  /** 칸 잠금 켜고 끄기 (잠근 칸은 리롤·웨이브 갱신에도 남고, 잠근 등급·수만큼 리롤 값이 오른다) */
  toggleLock(i) {
    const slot = this.shop[i];
    if (!slot || slot.sold) return;
    slot.locked = !slot.locked;
    audio.lock(slot.locked);
    this.tut.show('lock');
    this.refreshShop();
  }

  /** 영지 레벨 업: 놓을 수 있는 인원 +1, 상점 고급 확률 오름 */
  levelUpEstate() {
    const cost = this.estateCost;
    if (cost == null || this.over) return false;
    if (this.gold < cost) {
      this.toast(`골드가 부족합니다 (영지 레벨 업 ${cost}G)`);
      return false;
    }
    this.gold -= cost;
    this.estate += 1;
    audio.promote();
    this.showBanner(`영지 Lv.${this.estate}`, `놓을 수 있는 인원 ${this.cap}명 · 상점 확률 ${SHOP.odds[this.estate - 1].map((p, g) => (p ? `${['커먼', '언커먼', '레어', '유니크'][g]} ${p}%` : '')).filter(Boolean).join(' · ')}`, '#f2c14e');
    this.refreshShop();
    this.refreshHud();
    return true;
  }

  sell(merc) {
    this.returnItems(merc.items); // 아이템은 띠로 돌아온다 (조합품은 그대로)
    merc.items = [];
    const refund = Math.floor(merc.invested * this.sellRefund);
    this.gold += refund;
    audio.sell();
    this.unplace(merc);
    this.floatText(merc.x, merc.y - 20, `+${refund}G`, '#f2c14e');
    merc.destroy();
    this.select(null);
    this.recomputeSynergy();
    this.refreshShop();
    this.refreshHud();
  }

  // ───────────────────────── 아이템 조합 (룰 v2 ②, 2026-11-20) ─────────────────────────
  /** 아이템을 띠에 더한다 (가득 차면 false) */
  giveItem(id, x, y) {
    if (this.bench.length >= ITEM_RULES.bench) {
      this.toast('아이템 띠가 가득 찼어요 — 캐릭터에게 장착하세요', '#ff9a7a');
      return false;
    }
    this.bench.push(id);
    audio.itemGet();
    if (x != null) this.floatText(x, y - 30, ITEM_BY_ID[id].name, '#d6a8ff', 16, true);
    this.tut.show('item');
    this.hud?.refreshBench?.();
    return true;
  }

  returnItems(ids) {
    for (const id of ids) this.giveItem(id);
  }

  /**
   * 띠의 아이템을 캐릭터에게 장착: 재료끼리는 같은 캐릭터에서 자동 조합, 그 밖엔 빈 칸(3칸)에.
   * 인장 2개(출신 문장)는 그 캐릭터 출신이 아닌 출신 중 지금 가장 많이 모인 출신으로 (origin 을 주면 그것)
   */
  equip(benchIndex, merc, origin = null) {
    const id = this.bench[benchIndex];
    if (!id || !merc || !this.mercs.includes(merc)) return false;
    let result = null;
    let slot = -1;
    if (isComponent(id)) {
      slot = merc.items.findIndex((x) => isComponent(x));
      if (slot >= 0) {
        const other = merc.items[slot];
        let org = origin;
        if (id === 'seal' && other === 'seal' && !org) {
          org = ORIGIN_IDS.filter((k) => k !== merc.origin && !merc.extraTraits.includes(k)).sort((a, b) => (this.syn.counts[b] || 0) - (this.syn.counts[a] || 0))[0];
        }
        result = combine(other, id, org);
      }
    }
    const emblemOf = (rid) => ITEM_BY_ID[rid]?.kind === 'emblem' && ITEM_BY_ID[rid].trait;
    const trait = emblemOf(result || id);
    if (trait && (trait === merc.cls || trait === merc.origin || merc.extraTraits.includes(trait))) {
      this.toast(`${merc.heroName}는 이미 ${TRAITS[trait].name}이에요`, '#ff9a7a');
      return false;
    }
    if (result) merc.items[slot] = result;
    else if (merc.items.length < ITEM_RULES.slots) merc.items.push(id);
    else {
      this.toast(`${merc.heroName}의 아이템 칸(${ITEM_RULES.slots})이 가득 찼어요`, '#ff9a7a');
      return false;
    }
    this.bench.splice(benchIndex, 1);
    if (ITEM_BY_ID[id].kind === 'mat' && !result) merc.mana = Math.max(merc.mana, merc.ifx.startMana || 0); // 마력석: 시작 마나
    merc.drawPips();
    if (result) audio.itemCombine();
    else audio.itemEquip();
    if (result) {
      this.levelUpFx(merc, ITEM_BY_ID[result].name);
      this.toast(`조합: ${ITEM_BY_ID[result].name} — ${ITEM_BY_ID[result].text}`, '#f2c14e');
    }
    this.recomputeSynergy();
    this.hud?.refreshBench?.();
    if (this.selected === merc) this.refreshInfo();
    return true;
  }

  /** 판 안 대장장이: 골드로 무작위 재료 1개 (값은 살 때마다 오른다) */
  get smithCost() {
    return Math.round((ITEM_RULES.smith.base + ITEM_RULES.smith.step * this.smithBought) * (1 - (this.bonus.smithDiscount || 0))); // 유물 모루 부적
  }
  smithBuy() {
    const cost = this.smithCost;
    if (this.gold < cost) {
      this.toast(`골드가 부족합니다 (재료 ${cost}G)`);
      return false;
    }
    if (this.bench.length >= ITEM_RULES.bench) return this.giveItem(null) && false;
    this.gold -= cost;
    this.smithBought += 1;
    this.giveItem(Phaser.Utils.Array.GetRandom(MAT_IDS));
    this.refreshHud();
    return true;
  }

  /** 해제 도구: 캐릭터의 아이템을 모두 띠로 */
  useTool(merc) {
    if (this.tools <= 0 || !merc?.items.length) return false;
    if (this.bench.length + merc.items.length > ITEM_RULES.bench) {
      this.toast('아이템 띠에 자리가 모자라요', '#ff9a7a');
      return false;
    }
    this.tools -= 1;
    audio.itemRemove();
    this.returnItems(merc.items);
    merc.items = [];
    merc.mana = Math.min(merc.mana, merc.maxMana);
    merc.drawPips();
    this.recomputeSynergy();
    this.refreshInfo();
    return true;
  }

  /** 처치 보상 아이템: 정예 확률 재료 · 보스 재료 2(+인장·해제 도구 확률) · 강화 보스 인장·해제 도구 확정 */
  dropItems(m) {
    const R = ITEM_RULES;
    const mat = () => Phaser.Utils.Array.GetRandom(MAT_IDS);
    if (m.kind === 'elite' && Math.random() < R.eliteMat) this.giveItem(mat(), m.x, m.y);
    if (!m.isBoss) return;
    for (let i = 0; i < R.bossMats; i++) this.giveItem(mat(), m.x, m.y);
    const big = m.milestone || m.isFinal;
    if (big || Math.random() < R.bossSeal + (this.bonus.sealChance || 0)) this.giveItem('seal', m.x, m.y);
    if (big || Math.random() < R.bossTool) {
      this.tools += 1;
      this.floatText(m.x, m.y - 50, '해제 도구 +1', '#d6a8ff', 16, true);
      this.hud?.refreshBench?.();
    }
  }

  /** 웨이브 시작 때 아이템: 5웨이브마다 재료 · 상인의 저울 · 길드 금고 · 시작 마나 */
  waveItems(w) {
    if (w > 1 && w % ITEM_RULES.waveMatEvery === 1) this.giveItem(Phaser.Utils.Array.GetRandom(MAT_IDS));
    let gold = 0;
    for (const m of this.mercs) {
      const ix = m.ifx;
      if (w >= 2 && ix.killWaveGold) gold += Math.floor((m.waveKills || 0) * ix.killWaveGold);
      if (w >= 2 && ix.vault) gold += ix.vault * (1 + Math.floor(w / 10));
      if (ix.startMana) m.mana = Math.max(m.mana, ix.startMana);
      m.waveKills = 0;
    }
    if (gold) {
      this.gold += gold;
      this.floatText(300, 170, `+${gold}G 아이템`, '#f2c14e', 16, false, true);
    }
  }

  /** 시너지 다시 세기 (필드가 바뀔 때마다) */
  recomputeSynergy() {
    const counts = countTraits(this.mercs.filter((m) => !m.dragging));
    const tiers = {};
    for (const k of TRAIT_IDS) {
      const t = activeTier(k, counts[k]);
      if (t) tiers[k] = t;
    }
    const before = this.syn?.tiers || {};
    this.syn = { counts, tiers };
    // 필드 캐릭터마다 켜진 시너지 상징 (2026-11-22)
    for (const m of this.mercs) m.setSynMarks(m.dragging ? [] : [...new Set([m.cls, m.origin, ...m.extraTraits])].filter((k) => tiers[k]));
    for (const m of this.reserve || []) m?.setSynMarks?.([]);
    // 시너지 단계가 올라가면 소리 (끄는 중엔 세지 않고, 놓은 뒤 끌기 전과 비교)
    if (!this.mercs.some((m) => m.dragging)) {
      const idx = (k, t) => (t ? TRAITS[k].tiers.indexOf(t) : -1);
      const up = TRAIT_IDS.some((k) => idx(k, tiers[k]) > idx(k, this.synHeard?.[k]));
      if (up && this.synHeard) audio.synergy();
      this.synHeard = tiers;
    }
    // 새로 켜진 시너지 알림
    for (const k of TRAIT_IDS) if (tiers[k] && tiers[k] !== before[k]) this.tut.show('synergy');
    this.hud?.refreshSynergy?.();
  }

  /** 웨이브 시작 때 시너지 효과: 기사단 실드 · 호수 성벽 회복 · 지원가 골드 · 길드 이자·무료 리롤 · 북방 분노 초기화 */
  waveSynergy(w) {
    const T = this.syn.tiers;
    if (T.knight?.shield) this.wallShield = Math.max(this.wallShield, T.knight.shield);
    if (w >= 2 && T.lake?.wallHeal) this.wallHp = Math.min(this.wallMax, this.wallHp + T.lake.wallHeal);
    let gold = 0;
    if (w >= 2 && T.support?.waveGold) gold += T.support.waveGold;
    if (w >= 2 && T.guild?.interest) gold += Math.min(T.guild.interestMax, Math.floor(this.gold * T.guild.interest));
    if (gold) {
      this.gold += gold;
      this.floatText(300, 150, `+${gold}G 시너지`, '#f2c14e', 16, false, true);
    }
    this.freeRerolls = (T.guild?.freeReroll || 0) + (this.bonus.waveFreeReroll || 0);
    if (!T.north?.keepRage) for (const m of this.mercs) m.rage = 0;
  }

  /** 숲의 일족 6·9: 주기마다 무작위 지점 덩굴 속박 */
  updateRoots(dt) {
    const root = this.syn.tiers.grove?.root;
    if (!root) return;
    this.rootTimer -= dt;
    if (this.rootTimer > 0) return;
    this.rootTimer = root.every;
    const live = this.monsters.filter((m) => m.alive && !m.isBoss);
    if (!live.length) return;
    const c = Phaser.Utils.Array.GetRandom(live);
    for (const m of live) if ((root.elite || m.kind === 'normal') && d2(m, c) <= root.r * root.r) m.applyStun(root.dur, this.gameTime);
    this.circleFx(c.x, c.y, root.r, 0x3e8a50);
  }

  /** 끌어 놓기: 필드 칸 ↔ 필드 칸 · 필드 ↔ 대기석 · 대기석 ↔ 대기석 (2026-11-21 대기석) */
  /** 끌어 놓기 (x, y 는 월드 좌표 — 대기석은 UI 좌표로 바꿔 찾는다) */
  handleDrop(merc, x, y) {
    const slot = this.hud.reserveSlotAt?.(toUi(x), toUi(y)) ?? -1;
    const cell = slot < 0 ? cellAt(x, y) : null;
    if (slot < 0 && !cell) return merc.snapToCell();
    if (slot >= 0 && merc.reserved && merc.slot === slot) return merc.snapToCell();
    if (cell && !merc.reserved && cell.col === merc.col && cell.row === merc.row) return merc.snapToCell();
    const other = slot >= 0 ? this.reserve[slot] : this.grid[cell.row][cell.col];
    // 대기석 → 빈 필드 칸: 필드 인원이 가득이면 못 올린다
    if (cell && merc.reserved && !other && this.mercs.length >= this.cap) {
      this.toast(`필드 인원이 가득 찼어요 (${this.cap}명) — 영지 레벨을 올리세요`, '#ff9a7a');
      return merc.snapToCell();
    }
    const from = merc.reserved ? { slot: merc.slot } : { col: merc.col, row: merc.row };
    this.unplace(merc);
    if (other) this.unplace(other);
    if (slot >= 0) this.toReserve(merc, slot);
    else this.toField(merc, cell.col, cell.row);
    audio.place();
    if (other) {
      if (from.slot != null) this.toReserve(other, from.slot);
      else this.toField(other, from.col, from.row);
    }
    this.recomputeSynergy();
    this.refreshHud();
  }

  setupInput() {
    this.input.dragDistanceThreshold = 6;
    this.input.keyboard?.on('keydown-ESC', () => !this.tut.open && this.hud.toggleMenu());
    // Space: 게임 정지/다시 (2026-11-21 사용자 결정 — 이전 '바로 시작'은 버튼으로만) · R: 상점 리롤 · S: 선택한 용병 판매
    this.input.keyboard?.addCapture('SPACE');
    const free = () => !(this.over || this.menuOpen || this.tut.open || this.hud.popup);
    this.input.keyboard?.on('keydown-SPACE', () => free() && this.togglePause());
    this.input.keyboard?.on('keydown-R', () => free() && this.reroll());
    // PC 단축키 (2026-11-22): E 영지 레벨 업 · F 바로 시작 (다음 웨이브)
    this.input.keyboard?.on('keydown-E', () => free() && this.levelUpEstate());
    this.input.keyboard?.on('keydown-F', () => free() && this.callNextWave());
    this.input.keyboard?.on('keydown-S', () => {
      if (this.over || this.menuOpen || this.tut.open || this.hud.popup) return;
      if (this.selected?.active) this.sell(this.selected);
    });
    // 1·2·3: 게임 속도 바로 선택 (정지 중이면 풀고 그 속도로, 2026-11-18). 숫자패드도 같음
    [['ONE', 'NUMPAD_ONE', 1], ['TWO', 'NUMPAD_TWO', 2], ['THREE', 'NUMPAD_THREE', 3]].forEach(([k, n, v]) => {
      const go = () => !(this.over || this.menuOpen || this.tut.open) && this.setSpeed(v);
      this.input.keyboard?.on(`keydown-${k}`, go);
      this.input.keyboard?.on(`keydown-${n}`, go);
    });
    // 마우스 (PC, 2026-11-22): 왼쪽 = 고르기 · 오른쪽 = 고르기 풀기·툴팁 닫기 (브라우저 메뉴 대신) · 올리면 사거리
    this.input.mouse?.disableContextMenu();
    this.input.on('gameobjectdown', (p, obj) => {
      if (p.rightButtonDown()) return;
      if (obj instanceof Mercenary) this.select(obj);
    });
    this.input.on('pointerdown', (p, objs) => {
      if (p.rightButtonDown()) {
        this.select(null);
        this.hud.hideRelicTip();
        return;
      }
      if (!objs.length) this.select(null);
    });
    this.input.on('gameobjectover', (_p, obj) => {
      if (obj instanceof Mercenary) this.hovered = obj;
    });
    this.input.on('gameobjectout', (_p, obj) => {
      if (this.hovered === obj) this.hovered = null;
    });
    // 용병 끌기: 월드 좌표로 (포인터의 worldX 는 마지막에 맞은 카메라 좌표라 UI 위에서는 다르다 — 직접 바꾼다)
    this.input.on('dragstart', (p, obj) => {
      if (!(obj instanceof Mercenary) || this.over) return;
      const w = worldPoint(this, p);
      obj.dragging = true;
      audio.pick();
      obj.setReserveClip(null); // 대기석에서 끌어내면 칸 모양 자르기 풀기 (2026-11-24)
      obj.dragOff = { x: obj.x - w.x, y: obj.y - w.y };
      obj.setDepth(DEPTH.drag);
    });
    this.input.on('drag', (p, obj) => {
      if (!obj.dragging) return;
      const w = worldPoint(this, p);
      obj.setPosition(w.x + obj.dragOff.x, w.y + obj.dragOff.y);
    });
    this.input.on('dragend', (p, obj) => {
      if (!obj.dragging) return;
      obj.dragging = false;
      const w = worldPoint(this, p);
      this.handleDrop(obj, w.x, w.y);
    });
  }

  select(merc) {
    this.selected = merc;
    this.refreshInfo();
    if (merc) this.tut.show('select');
  }

  /** 상황이 처음 생겼을 때 튜토리얼 (HUD 를 새로 그릴 때마다 확인) */
  checkTutorials() {
    if (!this.tut?.enabled || this.over) return;
    if (this.wave >= 2 && this.estateCost != null && this.gold >= this.estateCost) this.tut.show('estate');
    if (this.wave >= 1 && this.canCallNextWave) this.tut.show('next');
    if (this.canUpgrade && this.wave >= 1) this.tut.show('tower');
  }

  drawRange() {
    const g = this.rangeGfx;
    g.clear();
    // PC (2026-11-22): 고른 용병이 없으면 마우스를 올린 용병의 사거리
    const m = this.selected?.active ? this.selected : this.hovered;
    if (!m || !m.active || m.reserved || m.dragging) return;
    const st = m.getStats(this.relics, this.gameTime);
    const color = ATTR_INFO[m.attr].color;
    g.fillStyle(color, 0.08).fillCircle(m.x, m.y, st.range);
    g.lineStyle(2, color, 0.6).strokeCircle(m.x, m.y, st.range);
    g.lineStyle(4, 0xffffff, 0.9).strokeRect(m.x - CELL / 2 + 2, m.y - CELL / 2 + 2, CELL - 4, CELL - 4);
  }

  drawHpBars() {
    const g = this.hpGfx;
    g.clear();
    // 용병 마나 막대 (머리 위, 마나가 있을 때만)
    for (const u of this.mercs) {
      if (u.dragging || u.mana <= 0) continue;
      const w = 26, x = Math.round(u.x - w / 2), y = Math.round(u.y - 34);
      const full = u.mana >= u.maxMana;
      g.fillStyle(0x1b1b26, 0.85).fillRect(x - 1, y - 1, w + 2, 5);
      g.fillStyle(full ? 0x9fe0ff : 0x4a8fe8).fillRect(x, y, Math.round((w * Math.min(u.mana, u.maxMana)) / u.maxMana), 3);
    }
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
    this.vfx.death(m); // 귀여운 별 터짐 (2026-11-21, vfx.death)
  }

  /** 레벨 업 연출(약 0.5초): 이펙트와 문구 모두 용병 컨테이너에 붙어 옮겨도 따라간다 */
  levelUpFx(merc, label, hero = false) {
    this.vfx.levelUp(merc, hero);
    const t = text(this, 0, -30, label, hero ? 22 : 18, '#f2c14e', { stroke: '#1b1b26', strokeThickness: 4 }).setOrigin(0.5);
    merc.add(t);
    this.tweens.add({ targets: t, y: -52, alpha: 0, delay: 150, duration: 400, onComplete: () => t.destroy() });
    this.tweens.add({ targets: merc.sprite, scale: merc.sprite.scaleX * 1.2, duration: 90, yoyo: true });
  }

  /** 떠오르는 글자. 기본은 전장(월드 좌표), ui = true 면 HUD 위(UI 좌표) */
  floatText(x, y, str, color = '#ffffff', size = 16, force = false, ui = false) {
    if (this.activeTexts > 30 && !force) return;
    this.activeTexts++;
    const t = text(this, x, y, str, size, color, { stroke: '#1b1b26', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(ui ? DEPTH.ui + 5 : DEPTH.fx + 1);
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

  /** 배경음(보스 여부)·강화 버튼 "!" 표시를 맞추고 HUD 숫자를 갱신 */
  refreshHud() {
    const boss = this.monsters.find((m) => m.isBoss && m.alive);
    if (!this.over) audio.playMusic(boss ? (boss.isFinal ? 'final' : 'boss') : 'battle');
    this.hud.refresh();
    this.checkTutorials();
  }

  refreshRelics() {
    this.hud.refreshRelics();
  }

  refreshShop() {
    this.hud?.refreshShop?.();
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
    this.resetAnimClock();
    audio.playMusic(null);
    dissolveTo(this, 'Lobby'); // 게임 종료 → 영지(로비), 디졸브
  }

  /** 게임 속도를 바로 정한다 (단축키 1·2·3). 정지 중이면 정지를 푼다 */
  setSpeed(v) {
    if (this.paused) this.togglePause();
    this.speed = v;
    this.tweens.timeScale = v;
    this.hud.setPaused(false);
  }

  /** 배속 버튼: x1 → x2 → x3 → 정지 → (다시 누르면) x1 */
  cycleSpeed() {
    if (this.paused) {
      this.speed = 1;
      this.tweens.timeScale = 1;
      this.togglePause();
    } else if (this.speed >= 3) {
      this.togglePause();
    } else {
      this.speed += 1;
      this.tweens.timeScale = this.speed;
      this.hud.setPaused(false);
    }
  }

  /**
   * 일시정지(정지 버튼·ESC 메뉴·유물 선택·튜토리얼) 동안 캐릭터·몬스터·이펙트 애니메이션과 전투 타이머도 멈춘다 (2026-11-19).
   * 배속은 애니메이션·타이머에도 그대로 걸린다
   */
  syncFreeze(frozen) {
    const sp = frozen ? 0 : this.speed;
    if (this._animSpeed === sp) return;
    this._animSpeed = sp;
    if (frozen) this.anims.pauseAll();
    else {
      this.anims.resumeAll();
      this.anims.globalTimeScale = this.speed;
    }
    this.time.timeScale = this.speed;
    this.time.paused = frozen;
  }

  /** 애니메이션 시계는 게임 전체 공용(game.anims) — 판이 끝나거나 장면을 떠날 때 원래대로 */
  resetAnimClock() {
    this._animSpeed = null;
    this.anims.resumeAll();
    this.anims.globalTimeScale = 1;
    this.time.paused = false;
    this.time.timeScale = 1;
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
    this.resetAnimClock();
    if (this.paused) this.tweens.resumeAll();
    this.hud.closeAll();
    this.select(null);
    audio.playMusic(null);
    if (victory) audio.victory();
    else audio.defeat();

    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x1a0f08, victory ? 0.4 : 0.55).setOrigin(0).setDepth(DEPTH.overlay).setInteractive();
    const top = DEPTH.overlay + 3; // 폭죽(overlay+2) 위에 창
    const cw = 440;
    const ch = 510; // X·별 아이콘이 제목 탭에서 떨어지도록 위 여백 확보 (2026-11-15)
    const cx = GAME_W / 2;
    const cy0 = (GAME_H - ch) / 2;
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
    const heroes = this.mercs.filter((m) => m.isHero).length; // 유니크
    const rows = [
      ['도달 웨이브', `W${this.wave} (최고 W${Math.max(this.bestWave, this.wave)})`],
      ['처치한 몬스터', this.totalKills.toLocaleString()],
      ['유니크 · 마정석', `${heroes}명 · +${this.stonesEarned} (보유 ${meta.stones})`],
      ['획득 명성', `+${this.fameEarned} (보유 ${meta.fame})`]
    ];
    rows.forEach(([k, v], i) => {
      const y = cy0 + 196 + i * 38;
      if (i) this.add.rectangle(cx, y - 19, cw - 64, 4, C.line).setDepth(top);
      uiText(this, cx - cw / 2 + 36, y, k, 15, CSS.sub, '600').setOrigin(0, 0.5).setDepth(top);
      uiText(this, cx + cw / 2 - 36, y, v, 17, CSS.ink, '700').setOrigin(1, 0.5).setDepth(top);
    });
    this.endBtns = {}; // 테스트가 누를 자리
    this.endBtns.retry = new Button(this, cx, cy0 + 376, cw - 64, 56, '다시 하기', () => this.scene.restart(), { variant: 'primary', fontSize: 18 }).setDepth(top);
    const bw = (cw - 64 - 12) / 2;
    this.endBtns.fame = new Button(this, cx - bw / 2 - 6, cy0 + 444, bw, 52, '명성 강화', () => dissolveTo(this, 'Upgrade', { from: 'result' }), { variant: 'gold', fontSize: 16 }).setDepth(top);
    this.endBtns.lobby = new Button(this, cx + bw / 2 + 6, cy0 + 444, bw, 52, '영지로', () => dissolveTo(this, 'Lobby'), { variant: 'outline', fontSize: 16 }).setDepth(top);
  }

}
