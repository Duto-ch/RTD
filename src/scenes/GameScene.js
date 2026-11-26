import Phaser from 'phaser';
import { splitCams } from '../systems/hires.js';
import { GRID, DEPTH, BALANCE } from '../config.js';
import { Tutorial } from '../ui/Tutorial.js';
import { Hud } from '../ui/Hud.js';
import { SHOP, refillShop } from '../data/shop.js';
import { dissolveTo } from '../ui/dissolve.js';
import { Vfx } from '../systems/vfx.js';
import { audio } from '../systems/audio.js';
import { meta } from '../systems/meta.js';
import { Wall } from './game/wall.js';
import { WaveDirector } from './game/waves.js';
import { BattlefieldView } from './game/field.js';
import { Formation } from './game/formation.js';
import { Combat } from './game/combat.js';
import { SkillCaster } from './game/skills.js';
import { MonsterAbilities } from './game/monsterAbilities.js';
import { ShopSystem } from './game/shop.js';
import { ItemSystem } from './game/items.js';
import { SynergySystem } from './game/synergy.js';
import { RunProgress } from './game/progress.js';
import { TimeControl } from './game/timeControl.js';
import { BattleInput } from './game/input.js';
import { BattleFx } from './game/fx.js';
import { ResultScreen } from './game/result.js';
import { delegate } from './game/delegate.js';

/**
 * 전투 장면 — 한 판의 상태(골드·웨이브·몬스터·필드…)를 들고, 역할별 시스템(`src/scenes/game/`)을 조립해 매 프레임 돌린다.
 * 규칙은 시스템에 있다: 웨이브(WaveDirector) · 전투(Combat) · 스킬(SkillCaster) · 몬스터 능력(MonsterAbilities) ·
 * 편성(Formation) · 상점(ShopSystem) · 아이템(ItemSystem) · 시너지(SynergySystem) · 성벽(Wall) · 명성·유물(RunProgress) ·
 * 시간(TimeControl) · 조작(BattleInput) · 연출(BattleFx) · 전장 그림(BattlefieldView) · 결과 창(ResultScreen).
 * 시스템 메서드는 파일 끝 `delegate` 로 장면에서도 그대로 부를 수 있다 (`g.buy(0)` — Hud·테스트·밸런스 봇).
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    splitCams(this); // 전장(월드 1920x1080) + UI(1280x720 × 1.5) 카메라 (2026-11-22 PC 전환)
    // 시스템 (판마다 새로 — 다시 하기는 create 를 다시 부른다)
    this.wall = new Wall(this);
    this.waveDir = new WaveDirector(this);
    this.field = new BattlefieldView(this);
    this.formation = new Formation(this);
    this.combat = new Combat(this);
    this.skills = new SkillCaster(this);
    this.foes = new MonsterAbilities(this);
    this.store = new ShopSystem(this);
    this.forge = new ItemSystem(this);
    this.synergy = new SynergySystem(this);
    this.progress = new RunProgress(this);
    this.clock = new TimeControl(this);
    this.controls = new BattleInput(this);
    this.fx = new BattleFx(this);
    this.result = new ResultScreen(this);

    // 한 판의 상태
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
    this.phase = 'prep'; // 정비 시간(prep) ↔ 웨이브(wave) (2026-11-24 사용자 결정)
    this.waveTimer = BALANCE.prepTime; // 정비 시간 남은 초
    this.spawnQueue = [];
    this.monsters = [];
    this.grid = Array.from({ length: GRID }, () => Array(GRID).fill(null));
    // 룰 v2 (2026-11-20): 상점 6칸 · 영지 레벨(놓을 수 있는 인원·상점 확률) · 시너지
    this.estate = Math.min(SHOP.maxLevel, 1 + (this.bonus.startEstate || 0));
    this.shop = [];
    this.freeRerolls = 0; // 황금 길드 9: 웨이브마다 무료 리롤
    this.syn = { counts: {}, tiers: {} };
    // 아이템 조합 (룰 v2 ②): 아이템 띠 · 해제 도구 · 판 안 대장장이
    this.bench = [];
    this.reserve = Array(SHOP.reserve).fill(null); // 대기석 (필드 아래 8칸) — Mercenary, reserved = true
    this.tools = 0;
    // 유물 (룰 v2 ③): 영지 유물 공방에서 장착한 것 — 판 안에서는 바뀌지 않는다 (효과는 meta.bonus 가 this.bonus 에 합쳐 둠)
    this.ownedRelics = meta.equipped.map((id) => ({ id, level: meta.relicLevel(id), active: true }));
    this.relics = {};
    this.enhanceMap = { ...meta.data.owned }; // 술집 강화 (캐릭터 id → 단계)
    this.stonesEarned = 0; // 이번 판에서 얻은 마정석 (얻을 때 바로 저장)
    this.selected = null;
    this.totalKills = 0;
    this.hudTimer = 0;
    this.tweens.timeScale = 1;

    this.field.build(); // 지역 배경 · 석판 · 성벽 · 나무·꽃
    this.rangeGfx = this.add.graphics().setDepth(DEPTH.merc - 1);
    this.hintGfx = this.add.graphics().setDepth(DEPTH.merc - 1);
    this.hpGfx = this.add.graphics().setDepth(DEPTH.hpbar);
    this.vfx = new Vfx(this);
    audio.playMusic('battle');
    this.events.on('firework-pop', () => audio.firework());

    this.progress.watchUpgrades();
    this.hud = new Hud(this);
    this.tut = new Tutorial(this);
    this.time.delayedCall(400, () => this.tut.show('shop'));
    if (this.ownedRelics.length) this.time.delayedCall(500, () => this.tut.show('relic'));
    this.controls.setupInput();
    this.shop = refillShop([], this.deck, this.estate, Math.random, this.maxedIds(), this.bonus);
    this.shopRefreshed = true; // 웨이브가 끝날 때 한 번 새로 고침 (refillShopNow)
    this.store.conscript();
    this.recomputeSynergy();
    this.refreshShop();
    this.refreshRelics();
    this.refreshHud();
    this.refreshInfo();
    this.showBanner('용병단 디펜스', `${BALANCE.prepTime}초 후 1웨이브`);
  }

  // ───────────────────────── 루프 ─────────────────────────
  update(_t, delta) {
    this.hud?.paintReserve(); // 대기석 칸 등급색 (바뀐 칸만, 2026-11-24)
    this.hud?.tickHp(); // 체력 30% 이하 깜빡임 (2026-11-25)
    if (this.over) return;
    const frozen = !!(this.paused || this.menuOpen || this.tut.open);
    this.clock.syncFreeze(frozen);
    const dt = frozen ? 0 : Math.min(delta / 1000, 0.1) * this.speed;
    this.gameTime += dt;

    if (dt > 0) {
      this.waveDir.updateWaves(dt);
      this.foes.updateAuras(); // 스킬 정예의 오라 (몬스터가 움직이기 전에)
      const mul = this.moveMult();
      for (const m of this.monsters) if (m.alive) m.tick(dt, this.gameTime, mul[m.kind] ?? mul.normal);
      this.wall.checkLaps();
      this.foes.updateBosses(dt);
      this.foes.updateStunners(dt);
      this.foes.updateEliteSkills(dt);
      this.synergy.updateRoots(dt);
      this.combat.updateMercs(dt);
      this.waveDir.cleanupMonsters();
      // 웨이브 클리어 → 상점 새로 고침 + 정비 시간 (2026-11-24: 웨이브는 몬스터를 모두 잡으면 끝난다)
      if (this.inWave && this.canCallNextWave) this.waveDir.endWave();
    }

    this.fx.drawHpBars();
    this.controls.drawRange();

    this.hudTimer -= delta;
    if (this.hudTimer <= 0) {
      this.hudTimer = 100;
      this.refreshHud();
    }
    this.wall.checkBreach();
  }

  /** 몬스터 이동 속도 배율: 명성 강화(서릿길·늪지 함정·족쇄) + 유물 서리 왕관(monsterSlow 에 합쳐 있음) + 숲의 일족 */
  moveMult() {
    const b = this.bonus;
    const relicSlow = this.syn.tiers.grove?.slow || 0;
    return {
      normal: Math.max(0.4, 1 - relicSlow - b.monsterSlow),
      elite: Math.max(0.4, 1 - relicSlow - b.monsterSlow - b.eliteSlow),
      boss: Math.max(0.4, 1 - relicSlow - b.bossSlow)
    };
  }

  /** 상황이 처음 생겼을 때 튜토리얼 (HUD 를 새로 그릴 때마다 확인) */
  checkTutorials() {
    if (!this.tut?.enabled || this.over) return;
    if (this.wave >= 2 && this.estateCost != null && this.gold >= this.estateCost) this.tut.show('estate');
    if (this.wave >= 1 && this.canCallNextWave) this.tut.show('next');
    if (this.canUpgrade && this.wave >= 1) this.tut.show('tower');
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

  // ───────────────────────── 판 끝 ─────────────────────────
  quitToTitle() {
    this.creditFame();
    this.hud.closeAll();
    this.tweens.resumeAll();
    this.tweens.timeScale = 1;
    this.resetAnimClock();
    audio.playMusic(null);
    dissolveTo(this, 'Lobby'); // 게임 종료 → 영지(로비), 디졸브
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
    this.endBtns = this.result.show(victory, reason); // 테스트가 누를 자리
  }
}

// 시스템 메서드를 장면에서도 그대로 부를 수 있게 (Hud·Mercenary·테스트·밸런스 봇이 g.buy() 처럼 쓴다)
delegate(GameScene, 'wall', Wall, ['wallMax', 'checkLaps', 'hitWall']);
delegate(GameScene, 'waveDir', WaveDirector, ['updateWaves', 'startWave', 'inWave', 'lockedInWave', 'endWave', 'canCallNextWave', 'callNextWave', 'spawnMonster', 'cleanupMonsters']);
delegate(GameScene, 'field', BattlefieldView, ['createFieldLayers', 'changeBiome']);
delegate(GameScene, 'formation', Formation, ['fieldSlots', 'mercs', 'allUnits', 'freeReserve', 'unplace', 'toReserve', 'toField', 'emptyCell', 'handleDrop']);
delegate(GameScene, 'combat', Combat, ['monstersInRange', 'updateMercs', 'atHitFrame', 'hit', 'kindOf', 'chainFrom', 'damageMonster', 'killMonster']);
delegate(GameScene, 'skills', SkillCaster, ['castSkill']);
delegate(GameScene, 'foes', MonsterAbilities, ['updateAuras', 'updateEliteSkills', 'updateStunners', 'updateBosses']);
delegate(GameScene, 'store', ShopSystem, ['conscript', 'cap', 'estateCost', 'rerollPrice', 'sellRefund', 'maxedIds', 'completesStar', 'hire', 'buy', 'reroll', 'toggleLock', 'levelUpEstate', 'sell', 'refillShopNow']);
delegate(GameScene, 'forge', ItemSystem, ['giveItem', 'returnItems', 'equip', 'smithCost', 'smithBuy', 'useTool', 'dropItems', 'waveItems']);
delegate(GameScene, 'synergy', SynergySystem, ['recomputeSynergy', 'waveSynergy', 'updateRoots']);
delegate(GameScene, 'progress', RunProgress, ['watchUpgrades', 'canUpgrade', 'openUpgrades', 'applyBonus', 'maxRelics', 'activeRelicCount', 'addRelic', 'earnStones', 'enhanceOf', 'earnFame', 'creditFame', 'celebrateCycle']);
delegate(GameScene, 'clock', TimeControl, ['setSpeed', 'cycleSpeed', 'syncFreeze', 'resetAnimClock', 'togglePause']);
delegate(GameScene, 'controls', BattleInput, ['setupInput', 'select', 'drawRange']);
delegate(GameScene, 'fx', BattleFx, ['circleFx', 'deathFx', 'levelUpFx', 'floatText', 'drawHpBars']);
