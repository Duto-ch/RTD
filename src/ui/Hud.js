// 전투 화면 UI — 상단 상태 창·유물 줄, 하단 버튼·정보 창, 토스트·배너, 스킬 정보 팝업, ESC 메뉴
// GameScene 은 게임 진행만 맡고, 화면 표시는 이 클래스에 맡긴다 (scene.hud).
// 게임 상태는 읽기만 하고, 버튼을 누르면 scene 의 동작(hire, sell, callNextWave …)을 부른다.
import Phaser from 'phaser';
import { GAME_W, GAME_H, PX, UI_PX, WIDE, COZY, FIELD_X, FIELD_Y, FIELD_SIZE, PATH_OFF, PATH_WIDTH, DEPTH } from '../config.js';
import { MAX_LEVEL } from '../objects/Mercenary.js';
import { Button } from './Button.js';
import { meta } from '../systems/meta.js';
import { panel, panelKey, panelImage, titleTab, closeButton, uiText, drawIcon, onLight, C, CSS, ATTR_CSS_DARK } from './theme.js';
import { ATTR_INFO, strongAgainst, weakAgainst } from '../data/elements.js';
import { describeSkill, ELEMENT_FLAVOR } from '../data/skills.js';
import { STYLES, TRAIT_TEXT } from '../data/roster.js';
import { RELIC_BY_ID } from '../data/relics.js';
import { waveInfo } from '../data/waves.js';
import { PATH_LENGTH } from '../systems/path.js';
import { setArt, playBase } from '../systems/customArt.js';
import { audio } from '../systems/audio.js';

// 몬스터 길 바깥 가장자리 (필드를 둘러싼 사각형)
const RING = { x0: FIELD_X - PATH_OFF - PATH_WIDTH / 2, y0: FIELD_Y - PATH_OFF - PATH_WIDTH / 2, x1: FIELD_X + FIELD_SIZE + PATH_OFF + PATH_WIDTH / 2, y1: FIELD_Y + FIELD_SIZE + PATH_OFF + PATH_WIDTH / 2 };
// 알림 띠 위치: 필드·몬스터 길 바깥의 빈 공간 가운데
//  세로: 유물 줄 아래 ~ 위쪽 길 / 아래쪽 길 ~ 하단 패널 · 가로: 화면 위 ~ 위쪽 길 / 아래쪽 길 ~ 화면 아래
//  가로(B-2): 위 알약 바(y 16~68)와 위쪽 길 사이 / 아래쪽 길과 아래 독(y 643~) 사이
const TOP_BAND = WIDE ? [68, RING.y0] : [180, RING.y0];
const BOTTOM_BAND = WIDE ? [RING.y1, 643] : [RING.y1, 776];
export const BANNER_Y = (TOP_BAND[0] + TOP_BAND[1]) / 2;
export const TOAST_Y = (BOTTOM_BAND[0] + BOTTOM_BAND[1]) / 2;
/** 배너·토스트 최대 너비: 세로는 화면 폭, 가로는 몬스터 길 사각형 폭 */
const NOTICE_W = WIDE ? RING.x1 - RING.x0 + 24 : GAME_W - 24;

/** HUD 배치. 세로 = 위 상태 창·유물 줄 + 아래 버튼·정보 창.
 *  가로(2026-11-15 B-2 포근한 카드형) = 위 가운데 알약 바(웨이브·타이머·골드·몬스터·유물) + 아래 가운데 독(용병 카드·고용·x1/정지/메뉴) */
export const HUD = WIDE
  ? {
      top: { x: 150, y: 16, w: 980, h: 52 }, // 알약 바
      cy: 42, // 알약 바 가운데 y
      relic: { x: 990, y: 24, w: 132 }, // 유물 칸 4개 자리 (알약 바 오른쪽 끝)
      dark: { x: 290, y: 643, w: 700, h: 68 }, // 아래 독
      hire: { x: 732, y: 677, w: 200, h: 50 },
      small: { y: 677, xs: [864, 914, 964], w: 46, h: 52 },
      info: { x: 300, y: 649, w: 320, h: 56 } // 용병 카드
    }
  : {
      top: { x: 12, y: 16, w: GAME_W - 24, h: 120 },
      // B-2 세로(2026-11-16): 1줄 WAVE·타이머·바로 시작 / 2줄 골드·몬스터 수 / 진행 막대 / 맨 아래 지역·다음·최고 안내
      line1: COZY ? 44 : 56, line2: COZY ? 44 : 56, line3: COZY ? 74 : 88, subY: 120,
      timer: { x: GAME_W - 236, w: 108 }, next: { x: GAME_W - 72, w: 84 },
      gauge: { x: 32, y: COZY ? 92 : 104, w: GAME_W - 64 },
      relic: { x: 12, y: 142, w: GAME_W - 24 },
      dark: { x: 4, y: 776, w: GAME_W - 8, h: 176 },
      hire: { x: 100, y: 824, w: 168, h: 80 },
      small: { y: 906, xs: [40, 100, 160], w: 52, h: 64 },
      info: { x: 196, y: 788, w: GAME_W - 196 - 16, h: 160 }
    };
/** 가운데 창(스킬 정보·메뉴·보상) 최대 너비 — 가로 화면에서 끝까지 늘어나지 않게 */
export const MODAL_W = WIDE ? 520 : GAME_W;

export class Hud {
  /** @param {Phaser.Scene} scene GameScene */
  constructor(scene) {
    this.s = scene;
    this.menu = null; // 열린 ESC 메뉴 (열려 있으면 전투가 멈춘다)
    this.popup = null; // 스킬 정보 팝업
    this.relicTip = null; // 유물 툴팁
    this.toastObj = null;
    this.bannerObj = null;
    this.createTop();
    this.createBottom();
  }

  // ───────────────────────── 잠깐 뜨는 알림 ─────────────────────────
  // 전장을 가리지 않도록 필드·몬스터 길 바깥의 빈 띠에만 띄운다.
  //  배너(웨이브 시작·보스 등장·유물 획득 등): 유물 줄과 위쪽 몬스터 길 사이 (세로 칸 48px 기준 y 180~272)
  //  토스트(고용·골드 부족 등 짧은 안내): 아래쪽 몬스터 길과 하단 패널 사이 (y 688~776)

  /** 글자가 maxW 를 넘으면 뒤를 줄이고 … 를 붙인다 */
  fitText(t, maxW) {
    if (t.width <= maxW) return t;
    let str = t.text;
    while (str.length > 1 && t.width > maxW) {
      str = str.slice(0, -1);
      t.setText(`${str.trimEnd()}…`);
    }
    return t;
  }

  toast(msg, color = '#ffffff') {
    const s = this.s;
    if (this.toastObj) this.toastObj.destroy();
    const t = uiText(s, 0, 0, msg, 13, color === '#ffffff' ? (COZY ? CSS.ink : CSS.white) : COZY ? onLight(color) : color, 'bold').setOrigin(0.5);
    this.fitText(t, NOTICE_W - 32);
    const w = Math.min(NOTICE_W, Math.ceil((t.width + 32) / UI_PX) * UI_PX);
    const bg = panelImage(s, 0, 0, 'dark', w, 36);
    const c = s.add.container(GAME_W / 2, TOAST_Y, [bg, t]).setDepth(DEPTH.overlay - 1);
    this.toastObj = c;
    c.setAlpha(0);
    s.tweens.add({ targets: c, alpha: 1, duration: 120 });
    s.tweens.add({ targets: c, alpha: 0, delay: 1700, duration: 300, onComplete: () => c.destroy() });
  }

  showBanner(title, sub, color = '#ffffff') {
    const s = this.s;
    if (this.bannerObj) this.bannerObj.destroy();
    const w = NOTICE_W;
    const h = 40; // 테두리 그림자 포함 48px → 띠(52px) 안에 들어간다
    // 얇은 테두리(strip): 두꺼운 card 테두리는 안쪽이 16px 뿐이라 글자가 테두리에 걸쳤다 (2026-11-15)
    const bg = panelImage(s, 0, 0, 'strip', w, h);
    // 한 줄: [제목(색)]  [부제(회색)] — 가운데 정렬, 넘치면 부제 뒤를 줄인다
    const t1 = this.fitText(uiText(s, 0, 2, title, 15, onLight(color), 'bold').setOrigin(0, 0.5), w - 32);
    const items = [bg, t1];
    let total = t1.width;
    if (sub) {
      const t2 = this.fitText(uiText(s, 0, 3, sub, 11, CSS.ink, 'bold').setOrigin(0, 0.5), w - 32 - t1.width - 12);
      items.push(t2);
      total += 12 + t2.width;
      t2.x = Math.round(-total / 2 + t1.width + 12);
    }
    t1.x = Math.round(-total / 2);
    const c = s.add.container(GAME_W / 2, BANNER_Y, items).setDepth(DEPTH.overlay - 2);
    this.bannerObj = c;
    c.setScale(1, 0);
    s.tweens.add({ targets: c, scaleY: 1, duration: 120, ease: 'Stepped', easeParams: [3] });
    s.tweens.add({ targets: c, alpha: 0, delay: 2200, duration: 300, onComplete: () => c.destroy() });
  }

  /** 배너·토스트 즉시 지우기 (보상 선택 창·게임 종료 창이 뜰 때) */
  clearNotices() {
    this.bannerObj?.destroy();
    this.toastObj?.destroy();
  }

  /** 게임 종료: 알림·팝업·메뉴·툴팁을 모두 닫는다 */
  closeAll() {
    this.clearNotices();
    this.popup?.destroy();
    this.popup = null;
    this.menu?.destroy(true);
    this.menu = null;
    this.hideRelicTip();
  }

  // ───────────────────────── 상단: 상태 창 + 유물 줄 ─────────────────────────
  createTop() {
    if (WIDE) return this.createTopWide();
    const s = this.s;
    const D = DEPTH.ui;
    // 상태 창 (높이 120) + 초록 제목 탭(웨이브)
    const T = HUD.top;
    const R = T.x + T.w; // 상태 창 오른쪽 끝
    panel(s, T.x, T.y, T.w, T.h, 'card').setDepth(D - 1);
    if (COZY) {
      // 포근한 카드형: 제목 탭 대신 창 안 왼쪽 위에 큰 WAVE 글자, 안내 줄은 맨 아래
      this.waveText = uiText(s, T.x + 20, HUD.line1, 'WAVE 0', 22, CSS.primary, 'bold').setOrigin(0, 0.5).setDepth(D);
      this.waveTypeText = uiText(s, T.x + 20, HUD.subY, '', 12, CSS.sub, '600').setOrigin(0, 0.5).setDepth(D);
    } else {
      const [tabImg, tabText] = titleTab(s, T.x + T.w / 2, T.y, 'WAVE 0', 220);
      tabImg.setDepth(D);
      this.waveText = tabText.setDepth(D);
      this.waveTypeText = uiText(s, T.x + 20, HUD.line1, '', 12, CSS.sub, 'bold').setOrigin(0, 0.5).setDepth(D);
    }

    // 타이머 슬롯 + 바로 시작 버튼
    // 타이머 칸과 버튼 사이 14px 띄움 (2026-11-15 간격 확보)
    panel(s, HUD.timer.x, HUD.line2 - 13, HUD.timer.w, 26, 'soft').setDepth(D);
    const clock = s.add.graphics().setDepth(D);
    drawIcon(clock, 'clock', HUD.timer.x + 16, HUD.line2, 12, C.ink);
    this.timerText = uiText(s, HUD.timer.x + 28, HUD.line2, '', 12, CSS.ink, 'bold').setOrigin(0, 0.5).setDepth(D);
    this.nextWaveBtn = new Button(s, HUD.next.x, HUD.line2, HUD.next.w, 28, '바로 시작', () => s.callNextWave(), { variant: 'primary', fontSize: 12 });

    // 골드 / 몬스터 수
    const coin = s.add.graphics().setDepth(D);
    drawIcon(coin, 'coin', T.x + 30, HUD.line3, 18, 0x6a4a10);
    this.goldText = uiText(s, T.x + 46, HUD.line3, '', 22, CSS.ink, 'bold').setOrigin(0, 0.5).setDepth(D);
    const skull = s.add.graphics().setDepth(D);
    drawIcon(skull, 'heart', R - 140, HUD.line3 + 1, 18, 0xc2453a);
    this.countText = uiText(s, R - 20, HUD.line3, '', 22, CSS.ink, 'bold').setOrigin(1, 0.5).setDepth(D);
    // 진행 막대: 창 아래 테두리와 띄우고 조금 얇게 (위 숫자와도 간격)
    panel(s, HUD.gauge.x, HUD.gauge.y, HUD.gauge.w, 15, 'soft').setDepth(D);
    this.countBar = s.add.graphics().setDepth(D);

    // 유물 줄 (높이 36)
    const RL = HUD.relic;
    panel(s, RL.x, RL.y, RL.w, 40, 'strip').setDepth(D - 1); // 얇은 테두리 → 아이콘 위아래 여백 (2026-11-15)
    this.relicLabel = uiText(s, RL.x + 18, RL.y + 20, '유물', 13, CSS.ink, 'bold').setOrigin(0, 0.5).setDepth(D);
    this.relicRow = s.add.container(0, 0).setDepth(D);
    this.noRelicText = uiText(s, RL.x + 84, RL.y + 20, `보스를 처치하면 유물을 얻어요 (최대 ${s.maxRelics}개 활성)`, 12, CSS.sub, 'bold')
      .setOrigin(0, 0.5)
      .setDepth(D);
    this.fitText(this.noRelicText, RL.w - 84 - 16);
  }

  /** 가로 B-2: 위 가운데 알약 바 한 줄 — [WAVE n] [지역·다음·최고] | [시계 타이머] [바로 시작] [골드] [몬스터 수] [유물 칸] */
  createTopWide() {
    const s = this.s;
    const D = DEPTH.ui;
    const T = HUD.top;
    const cy = HUD.cy;
    panel(s, T.x, T.y, T.w, T.h, 'strip').setDepth(D - 1);
    this.waveText = uiText(s, T.x + 28, cy, 'WAVE 0', 22, CSS.primary, 'bold').setOrigin(0, 0.5).setDepth(D);
    this.waveTypeText = uiText(s, T.x + 140, cy, '', 12, CSS.sub, '600').setOrigin(0, 0.5).setDepth(D);
    const sep = s.add.graphics().setDepth(D);
    sep.fillStyle(C.line, 1).fillRect(T.x + 404, cy - 14, 2, 28);
    const clock = s.add.graphics().setDepth(D);
    drawIcon(clock, 'clock', T.x + 428, cy, 14, C.sub);
    this.timerText = uiText(s, T.x + 442, cy, '', 12, CSS.ink, '600').setOrigin(0, 0.5).setDepth(D);
    this.nextWaveBtn = new Button(s, T.x + 566, cy, 88, 32, '바로 시작', () => s.callNextWave(), { variant: 'primary', fontSize: 12 });
    const coin = s.add.graphics().setDepth(D);
    drawIcon(coin, 'coin', T.x + 634, cy, 16, 0x6a4a10);
    this.goldText = uiText(s, T.x + 648, cy, '', 16.5, CSS.ink, 'bold').setOrigin(0, 0.5).setDepth(D);
    const skull = s.add.graphics().setDepth(D);
    drawIcon(skull, 'heart', T.x + 752, cy + 1, 16, 0xc2453a);
    this.countText = uiText(s, T.x + 830, cy, '', 16.5, CSS.ink, 'bold').setOrigin(1, 0.5).setDepth(D);
    this.relicLabel = null;
    this.relicRow = s.add.container(0, 0).setDepth(D);
    // 빈 유물 자리 4칸 (점선 대신 옅은 칸)
    this.relicEmpty = [0, 1, 2, 3].map((i) => panelImage(s, this.relicPos(i, 4).x, cy, 'soft', 28, 28).setDepth(D - 1));
    this.noRelicText = { setVisible: () => {} };
  }

  /** 유물 칸 위치: 세로는 유물 줄에 36px 간격, 가로는 알약 바 오른쪽 132px 안에 (많으면 좁혀 겹친다) */
  relicPos(i, n) {
    if (!WIDE) return { x: HUD.relic.x + 112 + i * 36, y: HUD.relic.y + 19 };
    const gap = n > 4 ? (HUD.relic.w - 28) / (n - 1) : 34;
    return { x: HUD.relic.x + 14 + i * gap, y: HUD.cy };
  }

  /** 상단·하단 숫자와 버튼 상태를 게임 상태에 맞춘다 (0.1초마다 + 상태가 바뀔 때) */
  refresh() {
    const s = this.s;
    const nextWave = s.wave + 1;
    // 무한 웨이브: 목표 없이 계속 올라간다. 최고 기록을 함께 보여 준다
    this.waveText.setText(`WAVE ${s.wave}`);
    const label = s.wave === 0 ? '시작' : '다음';
    this.timerText.setText(`${label} ${Math.ceil(Math.max(0, s.waveTimer))}초`);
    const ni = waveInfo(nextWave);
    const extra = { elite: '+정예', boss: '+보스', milestone: '+정예+강화보스', final: '+최종보스' }[ni.type] || '';
    // 보스가 있으면 왼쪽 안내 줄을 보스 상태(빨강)로 바꾼다 — 예전엔 오른쪽 몬스터 수 위에 겹쳐 떴다 (2026-11-15)
    const boss = s.monsters.find((m) => m.isBoss && m.alive);
    if (boss) {
      const debuffs = boss.abilities.length > 2 ? `디버프 ${boss.abilities.length}종` : boss.abilities.map((a) => a.def.name).join(', ');
      this.waveTypeText
        .setText(`${boss.revived ? '부활 ' : ''}${boss.enraged ? '분노 ' : ''}보스 ${Math.floor(Math.max(0, boss.dist / PATH_LENGTH) * 100)}% · ${debuffs}`)
        .setColor(CSS.red);
    } else {
      this.waveTypeText.setText(`${s.biome.name} · 필드 ${s.monsters.length}기 · 다음 ${ni.normal}기${extra} · 최고 W${Math.max(s.bestWave || 0, s.wave)}`).setColor(CSS.sub);
    }
    this.fitText(this.waveTypeText, WIDE ? 250 : COZY ? GAME_W - 64 : GAME_W - 236 - 48);
    this.goldText.setText(`${s.gold.toLocaleString()} G`);

    // 성벽 체력 (2026-11-17: 몬스터 수 한도 대신). 실드가 있으면 +n 으로 덧붙인다. 30% 이하면 빨강
    const n = Math.ceil(s.wallHp);
    const max = s.wallMax;
    this.countText.setText(`${n}${s.wallShield > 0 ? `+${Math.ceil(s.wallShield)}` : ''} / ${max}`).setColor(n <= max * 0.3 ? CSS.red : CSS.ink);
    this.nextWaveBtn.setEnabled(s.canCallNextWave);
    this.hireBtn.setLabel(WIDE ? `+ 용병 고용 · ${s.hireCost} G` : `용병 고용\n${s.hireCost} G${s.relics.contract ? ' (-20%)' : ''}`);
    this.hireBtn.setEnabled(s.gold >= s.hireCost);
    if (s.selected) this.refreshInfo();
    if (WIDE) return; // 가로 B-2 는 진행 막대 없음 (몬스터 수 숫자가 80% 넘으면 빨강)
    // 막대: 4px 단위 칸 채우기
    const g = this.countBar;
    const bx = HUD.gauge.x + 8;
    const bw = HUD.gauge.w - 16;
    const by = HUD.gauge.y + 4;
    g.clear();
    const pct = Math.max(0, Math.min(1, n / max));
    const fill = Math.round((bw * pct) / UI_PX) * UI_PX;
    if (fill > 0) {
      const col = pct > 0.5 ? 0x3f9a52 : pct > 0.3 ? 0xe0a32a : 0xc2453a; // 성벽 체력: 많을수록 초록
      g.fillStyle(col, 1).fillRect(bx, by, fill, 7);
      g.fillStyle(0xffffff, 0.35).fillRect(bx, by, fill, 3);
    }
  }

  refreshRelics() {
    const s = this.s;
    this.relicRow.removeAll(true);
    this.noRelicText.setVisible(s.ownedRelics.length === 0);
    this.relicLabel?.setText(s.ownedRelics.length ? `유물 ${s.activeRelicCount}/${s.maxRelics}` : '유물');
    this.relicEmpty?.forEach((e, i) => e.setVisible(i >= s.ownedRelics.length));
    s.ownedRelics.forEach((r, i) => {
      // 칸 27px, 칸 사이 9px (예전 32px 칸이 4px 간격으로 붙고 띠 테두리에 닿았다)
      const { x, y } = this.relicPos(i, s.ownedRelics.length);
      const slot = panelImage(s, x, y, r.active ? 'gold' : 'soft', WIDE ? 28 : 27, WIDE ? 28 : 27);
      const icon = s.add.image(x, y, `relic_${r.id}`).setScale(PX - 2).setInteractive({ useHandCursor: true });
      icon.on('pointerdown', () => s.toggleRelic(i));
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
    const s = this.s;
    this.hideRelicTip();
    const owned = s.ownedRelics[index];
    if (!owned) return;
    const relic = RELIC_BY_ID[owned.id];
    const D = DEPTH.ui + 50;
    const c = s.add.container(0, 0).setDepth(D);
    const title = uiText(s, 0, 0, relic.name, 15, CSS.ink, 'bold');
    const state = uiText(s, 0, 0, owned.active ? '활성' : '비활성', 12, owned.active ? CSS.green : CSS.sub, 'bold');
    const desc = uiText(s, 0, 0, relic.desc, 13, CSS.ink);
    const hint = uiText(s, 0, 0, owned.active ? '클릭: 비활성으로 전환' : `클릭: 활성으로 전환 (최대 ${s.maxRelics}개)`, 11, CSS.sub);
    const pad = 16;
    const w = Math.ceil((Math.max(title.width + state.width + 12, desc.width, hint.width) + pad * 2) / UI_PX) * UI_PX;
    const h = 96;
    const left = Phaser.Math.Clamp(Math.round((x - w / 2) / UI_PX) * UI_PX, 8, GAME_W - 8 - w);
    const top = y + 24;
    const bg = panel(s, left, top, w, h, 'card');
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

  // ───────────────────────── 하단: 버튼 + 정보 창 ─────────────────────────
  createBottom() {
    if (WIDE) return this.createBottomWide();
    const s = this.s;
    const D = DEPTH.ui;
    // 하단 나무 받침 (높이 176)
    const K = HUD.dark;
    panel(s, K.x, K.y, K.w, K.h, COZY ? 'card' : 'dark').setDepth(D - 2); // 포근한 카드형: 둥근 크림 시트
    this.hireBtn = new Button(s, HUD.hire.x, HUD.hire.y, HUD.hire.w, HUD.hire.h, '', () => s.hire(), { variant: 'primary', fontSize: 18 });
    const SM = HUD.small;
    this.speedBtn = new Button(s, SM.xs[0], SM.y, SM.w, SM.h, 'x1', () => {
      s.speed = s.speed >= 3 ? 1 : s.speed + 1;
      this.speedBtn.setLabel(`x${s.speed}`);
      s.tweens.timeScale = s.speed;
    }, { variant: 'card', icon: 'speed', fontSize: 12 });
    this.pauseBtn = new Button(s, SM.xs[1], SM.y, SM.w, SM.h, '정지', () => s.togglePause(), { variant: 'card', icon: 'pause', fontSize: 12 });
    this.menuBtn = new Button(s, SM.xs[2], SM.y, SM.w, SM.h, '메뉴', () => this.toggleMenu(), { variant: 'card', icon: 'menu', fontSize: 12 });

    // 정보 창
    const { x: px, y: py, w: pw, h: ph } = HUD.info;
    panel(s, px, py, pw, ph, COZY ? 'soft' : 'card').setDepth(D - 1);
    this.infoAvatar = panelImage(s, px + 44, py + 42, 'soft', 48, 48).setDepth(D).setVisible(false);
    this.infoPortrait = s.add.sprite(px + 44, py + 42, 'pixel').setScale(PX - 1).setDepth(D).setVisible(false);
    this.infoTitle = uiText(s, px + 20, py + 16, '', 16, CSS.ink, 'bold').setDepth(D);
    this.infoSub = uiText(s, px + 78, py + 44, '', 11, CSS.sub, 'bold').setDepth(D);
    this.infoBody = uiText(s, px + 20, py + 44, '', 11, CSS.ink, 'bold', { lineSpacing: 2, wordWrap: { width: pw - 40 } }).setDepth(D);
    this.skillBtn = new Button(s, px + 80, py + ph - 40, 112, 30, '스킬 정보', () => s.selected && this.showSkillPopup(s.selected), {
      variant: 'primary',
      fontSize: 12
    });
    this.sellBtn = new Button(s, px + pw - 80, py + ph - 40, 112, 30, '판매', () => s.selected && s.sell(s.selected), {
      variant: 'outline',
      fontSize: 12
    });
    this.infoBox = { px, py, pw, ph };
  }

  /** 가로 B-2: 아래 가운데 독 — [용병 카드(초상·이름·부제·능력치 + 스킬/판매)] [+ 용병 고용] [x1] [정지] [메뉴] */
  createBottomWide() {
    const s = this.s;
    const D = DEPTH.ui;
    const K = HUD.dark;
    panel(s, K.x, K.y, K.w, K.h, 'card').setDepth(D - 2);
    this.hireBtn = new Button(s, HUD.hire.x, HUD.hire.y, HUD.hire.w, HUD.hire.h, '', () => s.hire(), { variant: 'primary', fontSize: 16.5 });
    const SM = HUD.small;
    this.speedBtn = new Button(s, SM.xs[0], SM.y, SM.w, SM.h, 'x1', () => {
      s.speed = s.speed >= 3 ? 1 : s.speed + 1;
      this.speedBtn.setLabel(`x${s.speed}`);
      s.tweens.timeScale = s.speed;
    }, { variant: 'outline', icon: 'speed', fontSize: 11 });
    this.pauseBtn = new Button(s, SM.xs[1], SM.y, SM.w, SM.h, '정지', () => s.togglePause(), { variant: 'outline', icon: 'pause', fontSize: 11 });
    this.menuBtn = new Button(s, SM.xs[2], SM.y, SM.w, SM.h, '메뉴', () => this.toggleMenu(), { variant: 'outline', icon: 'menu', fontSize: 11 });

    const { x: px, y: py, w: pw, h: ph } = HUD.info;
    panel(s, px, py, pw, ph, 'soft').setDepth(D - 1);
    const ax = px + 30;
    const ay = py + ph / 2;
    this.infoAvatar = s.add.circle(ax, ay, 22, C.card).setStrokeStyle(2, C.line).setDepth(D).setVisible(false);
    this.infoAvatar.setTexture = () => this.infoAvatar; // 세로 배치와 같은 호출을 받는다
    this.infoPortrait = s.add.sprite(ax, ay, 'pixel').setScale(PX - 1.5).setDepth(D).setVisible(false);
    this.infoTitle = uiText(s, px + 62, py + 7, '', 13, CSS.ink, 'bold').setDepth(D);
    this.infoSub = uiText(s, px + 62, py + 24, '', 11, CSS.sub, '600').setDepth(D);
    this.infoBody = uiText(s, px + 62, py + 39, '', 11, CSS.ink, '600').setDepth(D);
    const bx = px + pw - 42;
    this.skillBtn = new Button(s, bx, py + 15, 72, 24, '스킬', () => s.selected && this.showSkillPopup(s.selected), { variant: 'primary', fontSize: 11 });
    this.sellBtn = new Button(s, bx, py + 41, 72, 24, '판매', () => s.selected && s.sell(s.selected), { variant: 'outline', fontSize: 11 });
    this.infoBox = { px, py, pw, ph };
  }

  /** 가로 B-2 용병 카드 */
  refreshInfoWide(m) {
    const s = this.s;
    const { px, py, pw } = this.infoBox;
    const textW = pw - 62 - 90;
    if (!m) {
      this.infoAvatar.setVisible(false);
      this.infoPortrait.setVisible(false);
      this.sellBtn.setVisible(false);
      this.skillBtn.setVisible(false);
      this.infoTitle.setPosition(px + 18, py + 9).setColor(CSS.primary).setText('용병단 지휘');
      this.infoSub.setPosition(px + 18, py + 30).setText('용병을 누르면 정보가 보여요 · 같은 속성·등급·레벨끼리 겹치면 레벨 업');
      this.fitText(this.infoSub, pw - 36);
      this.infoBody.setText('');
      return;
    }
    const st = m.getStats(s.relics, s.gameTime);
    const info = ATTR_INFO[m.attr];
    this.infoAvatar.setFillStyle(m.isHero ? 0xf3dc94 : C.card).setVisible(true);
    setArt(this.infoPortrait, m.textureKey, PX - 1.5).setVisible(true);
    playBase(this.infoPortrait, 'idle');
    const next = m.level < MAX_LEVEL ? `레벨업 ${s.mergeCostFor(m.level)}G` : '최고 레벨';
    this.infoTitle.setPosition(px + 62, py + 7).setColor(m.isHero ? CSS.gold : ATTR_CSS_DARK[m.attr]).setText(m.heroName);
    this.infoSub.setPosition(px + 62, py + 24).setText(`Lv.${m.level} ${m.roleName} · ${info.name} · ${next}`);
    this.fitText(this.infoSub, textW);
    const body = st.debuff.list.length
      ? `디버프: ${st.debuff.list.map((d) => `${d.def.name} ${Math.ceil(d.until - s.gameTime)}초`).join(', ')}`
      : `공격 ${Math.round(st.damage)} · 공속 ${st.rate.toFixed(2)} · 사거리 ${Math.round(st.range)}${st.buffed ? ' (버프)' : ''}`;
    this.infoBody.setColor(st.debuff.list.length ? CSS.red : CSS.ink).setText(body);
    this.fitText(this.infoBody, textW);
    this.sellBtn.setVisible(true).setLabel(`판매 +${Math.floor(m.invested * s.sellRefund)}G`);
    this.skillBtn.setVisible(true);
  }

  setPaused(paused) {
    this.pauseBtn.setLabel(paused ? '재개' : '정지');
  }

  /** 정보 창: 선택한 용병의 능력치, 선택이 없으면 기본 안내 */
  refreshInfo() {
    const s = this.s;
    const m = s.selected && s.selected.active ? s.selected : null;
    const { px, py } = this.infoBox;
    if (!m) s.selected = null;
    if (WIDE) return this.refreshInfoWide(m);
    if (!m) {
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
            '· 같은 속성·등급·레벨끼리 겹치면 레벨 업',
            '· 레벨마다 정해진 스킬이 하나씩 열림',
            '· 상성: 블루>레드>그린>블루',
            '· 패배: 성벽 체력 0 (몬스터가 한 바퀴 돌 때마다 깎임)'
          ].join('\n')
        );
      return;
    }
    const st = m.getStats(s.relics, s.gameTime);
    const info = ATTR_INFO[m.attr];
    this.infoAvatar.setTexture(panelKey(s, m.isHero ? 'gold' : 'soft', 48, 48)).setVisible(true);
    setArt(this.infoPortrait, m.textureKey, PX - 1).setVisible(true);
    playBase(this.infoPortrait, 'idle');
    this.infoTitle.setPosition(px + 78, py + 20).setColor(m.isHero ? CSS.gold : ATTR_CSS_DARK[m.attr]).setText(m.heroName);
    const strong = ATTR_INFO[strongAgainst(m.attr)].name;
    const weak = ATTR_INFO[weakAgainst(m.attr)].name;
    const next = m.level < MAX_LEVEL ? `레벨업 ${s.mergeCostFor(m.level)}G` : '최고 레벨';
    this.infoSub.setText(`Lv.${m.level} ${m.roleName} · ${info.name} · ${next}`);
    // 본문은 2줄: 능력치 / (디버프 또는 상성·스킬 수)
    const lines = [
      `공격 ${Math.round(st.damage)} · 공속 ${st.rate.toFixed(2)} · 사거리 ${Math.round(st.range)}${st.buffed && !st.debuff.list.length ? ' (버프)' : ''}`,
      st.debuff.list.length
        ? `디버프: ${st.debuff.list.map((d) => `${d.def.name} ${Math.ceil(d.until - s.gameTime)}초`).join(', ')}`
        : `강함 ${strong} · 약함 ${weak} · 스킬 ${m.skills.length}개`
    ];
    this.infoBody.setPosition(px + 22, py + 68).setColor(CSS.ink).setText(lines.join('\n'));
    this.sellBtn.setVisible(true).setLabel(`판매 +${Math.floor(m.invested * s.sellRefund)}G`);
    this.skillBtn.setVisible(true);
  }

  // ───────────────────────── 창 ─────────────────────────
  /** 양피지 창 모달: 어두운 바탕 + 창 + 초록 제목 탭 (+ 닫기 버튼) */
  modal(depth, x, y, w, h, onClose, title) {
    const s = this.s;
    const c = s.add.container(0, 0).setDepth(depth);
    const shade = s.add.rectangle(0, 0, GAME_W, GAME_H, 0x1a0f08, 0.55).setOrigin(0).setInteractive();
    if (onClose) shade.on('pointerdown', onClose);
    const card = panel(s, x, y, w, h, 'card');
    card.setInteractive(); // 창 위 클릭은 닫히지 않게
    c.add([shade, card]);
    if (title) c.add(titleTab(s, x + w / 2, y, title, 180));
    if (onClose) c.add(closeButton(s, x + w - 6, y + 6, onClose));
    return c;
  }

  showSkillPopup(m) {
    const s = this.s;
    this.popup?.destroy();
    this.bannerObj?.destroy(); // 가로 배치에선 배너 띠가 창 위쪽과 겹친다
    const w = Math.min(GAME_W, MODAL_W) - 40;
    const x = (GAME_W - w) / 2;
    const y = WIDE ? 96 : 240;
    // 카드 높이는 내용에 맞춘다: 먼저 글자를 놓고, 마지막에 카드를 뒤에 끼운다
    const c = s.add.container(0, 0).setDepth(DEPTH.overlay - 5);
    const close = () => {
      c.destroy();
      this.popup = null;
    };
    const shade = s.add.rectangle(0, 0, GAME_W, GAME_H, 0x1a1238, 0.5).setOrigin(0).setInteractive();
    shade.on('pointerdown', close);
    c.add(shade);
    this.popup = c;
    let cy = y + 36;
    const add = (str, size, color, weight = '600', gap = 6) => {
      const t = uiText(s, x + 24, cy, str, size, color, weight, { wordWrap: { width: w - 48 }, lineSpacing: 4 });
      c.add(t);
      cy += t.height + gap;
      return t;
    };
    // 2026-11-17: 확정 스킬 — 레벨이 오를 때마다 정해진 스킬이 하나씩 열린다 (리롤 폐지)
    add(`${m.heroName} · Lv.${m.level} ${m.gradeName}`, 20, m.isHero ? CSS.gold : ATTR_CSS_DARK[m.attr], '700', 2);
    add(`${m.char.title} · ${STYLES[m.char.style].name} — ${TRAIT_TEXT(m.trait)}`, 13, CSS.ink, '600', 2);
    add(`${ELEMENT_FLAVOR[m.attr].desc} (피해 스킬에 추가 적용)`, 12, CSS.sub, '600', 10);
    this.rerollBtns = [];
    for (const d of m.defs) {
      const open = m.skills.some((sk) => sk.def.id === d.id);
      add(`Lv${d.unlock}  ${d.name}  ·  쿨타임 ${d.cd}초${open ? '' : '  · 잠김'}`, 15, !open ? CSS.sub : d.level > MAX_LEVEL ? CSS.gold : CSS.primary, '700', 2);
      add(describeSkill(d), 13, open ? CSS.ink : CSS.sub, '600', 9);
    }
    const h = Math.min(GAME_H - y - 24, cy - y + 40);
    const card = panel(s, x, y, w, h, 'card').setInteractive();
    c.addAt(card, 1);
    c.add(titleTab(s, x + w / 2, y, '스킬 정보', 180));
    c.add(closeButton(s, x + w - 6, y + 6, close));
    c.add(uiText(s, x + w - 24, y + h - 14, '바깥을 누르면 닫혀요', 12, CSS.sub, '600').setOrigin(1, 1));
    s.tut?.show('skill');
  }

  // ───────────────────────── ESC 메뉴 ─────────────────────────
  toggleMenu() {
    if (this.s.over) return;
    if (this.menu) this.closeMenu();
    else this.openMenu();
  }

  openMenu() {
    const s = this.s;
    audio.init();
    this.popup?.destroy();
    this.popup = null;
    this.bannerObj?.destroy();
    if (!s.paused) s.tweens.pauseAll();
    const pw = WIDE ? 440 : GAME_W - 104;
    const px = (GAME_W - pw) / 2;
    const py = WIDE ? 80 : 236;
    const ph = 560;
    const c = this.modal(DEPTH.overlay - 0.3, px, py, pw, ph, () => this.closeMenu(), '메뉴');
    this.menu = c;
    c.add(uiText(s, GAME_W / 2, py + 52, '게임이 일시정지되었습니다', 13, CSS.sub, '600').setOrigin(0.5));

    // 볼륨 조절 줄: 이름 [-] 막대 [+] 퍼센트
    const volRow = (y, label, get, set) => {
      c.add(uiText(s, px + 28, y, label, 16, CSS.ink, '700').setOrigin(0, 0.5));
      const bar = s.add.graphics();
      const pct = uiText(s, px + pw - 26, y, '', 15, CSS.primary, '700').setOrigin(1, 0.5);
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
          if (on) bar.fillStyle(0xf08c3a, 1).fillRect(bx + i * 15 + 2, y - 8, 8, 4);
        }
        pct.setText(`${Math.round(v * 100)}%`);
      };
      const step = (d) => () => {
        set(get() + d);
        draw();
        audio.coin();
      };
      const minus = new Button(s, px + 120, y, 40, 40, '-', step(-0.1), { variant: 'outline', fontSize: 20 });
      const plus = new Button(s, bx + bw + 30, y, 40, 40, '+', step(0.1), { variant: 'outline', fontSize: 20 });
      c.add([bar, pct, minus, plus]);
      draw();
    };
    volRow(py + 128, '배경음', () => audio.musicVol, (v) => audio.setMusicVolume(v));
    volRow(py + 184, '효과음', () => audio.sfxVol, (v) => audio.setSfxVolume(v));

    const bw = pw - 56;
    const muteBtn = new Button(s, GAME_W / 2, py + 252, bw, 50, '', () => {
      audio.toggleMute();
      muteBtn.setLabel(`전체 음소거 ${audio.muted ? '켜짐' : '꺼짐'}`);
    }, { variant: 'outline', fontSize: 16 });
    muteBtn.setLabel(`전체 음소거 ${audio.muted ? '켜짐' : '꺼짐'}`);
    const resume = new Button(s, GAME_W / 2, py + 322, bw, 56, '계속하기', () => this.closeMenu(), { variant: 'primary', fontSize: 18 });
    let confirmQuit = false;
    const quit = new Button(s, GAME_W / 2, py + 394, bw, 56, '게임 종료', () => {
      if (!confirmQuit) {
        confirmQuit = true;
        quit.setLabel('정말 종료할까요? 한 번 더 누르세요');
        s.time.delayedCall(2500, () => {
          if (quit.active) {
            confirmQuit = false;
            quit.setLabel('게임 종료');
          }
        });
        return;
      }
      s.quitToTitle();
    }, { variant: 'danger', fontSize: 16 });
    const tutBtn = new Button(s, GAME_W / 2, py + 458, bw, 44, '튜토리얼 처음부터 다시 보기', () => {
      meta.resetTutorial();
      tutBtn.setLabel('튜토리얼이 다시 켜졌어요');
    }, { variant: 'outline', fontSize: 11 });
    c.add([muteBtn, resume, quit, tutBtn]);
    c.add(uiText(s, GAME_W / 2, py + ph - 26, 'ESC 를 누르면 닫혀요', 12, CSS.sub, '600').setOrigin(0.5));
  }

  closeMenu() {
    if (!this.menu) return;
    this.menu.destroy(true);
    this.menu = null;
    if (!this.s.paused) this.s.tweens.resumeAll();
  }
}
