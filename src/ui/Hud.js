// 전투 화면 UI — 상단 상태 창·유물 줄, 하단 버튼·정보 창, 토스트·배너, 스킬 정보 팝업, ESC 메뉴
// GameScene 은 게임 진행만 맡고, 화면 표시는 이 클래스에 맡긴다 (scene.hud).
// 게임 상태는 읽기만 하고, 버튼을 누르면 scene 의 동작(hire, sell, callNextWave …)을 부른다.
import Phaser from 'phaser';
import { GAME_W, GAME_H, PX, UI_PX, WIDE, COZY, FIELD_X, FIELD_Y, FIELD_SIZE, PATH_OFF, PATH_WIDTH, DEPTH } from '../config.js';
import { charImage } from '../objects/Mercenary.js';
import { Button } from './Button.js';
import { meta } from '../systems/meta.js';
import { panel, panelKey, panelImage, titleTab, closeButton, uiText, drawIcon, onLight, C, CSS, ATTR_CSS_DARK } from './theme.js';
import { describeSkill } from '../data/skills.js';
import { STYLES, TRAIT_TEXT, GRADES, ROSTER_BY_ID } from '../data/roster.js';
import { starSkill, MAX_STAR } from '../data/stars.js';
import { TRAITS, tierIndex, sortedTraits } from '../data/synergy.js';
import { SHOP, priceOf } from '../data/shop.js';
import { ITEM_RULES, ITEM_BY_ID, isComponent, recipesWith } from '../data/items.js';
import { RELIC_BY_ID, relicText } from '../data/relics.js';
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
const BOTTOM_BAND = WIDE ? [RING.y1 - 8, 616] : null;
export const BANNER_Y = (TOP_BAND[0] + TOP_BAND[1]) / 2;
// 세로 토스트 (2026-11-21): 아래 길 밑은 대기석 자리라 위 알림 띠(배너와 같은 줄)에 — 토스트가 떠 있는 동안 배너는 잠깐 숨는다
export const TOAST_Y = BOTTOM_BAND ? (BOTTOM_BAND[0] + BOTTOM_BAND[1]) / 2 : BANNER_Y;
/** 배너·토스트 최대 너비: 세로는 화면 폭, 가로는 몬스터 길 사각형 폭 (가로 토스트는 독 바로 위) */
const NOTICE_W = WIDE ? RING.x1 - RING.x0 + 24 : GAME_W - 24;

/** HUD 배치. 세로 = 위 상태 창·유물 줄 + 아래 버튼·정보 창.
 *  가로(2026-11-15 B-2 포근한 카드형) = 위 가운데 알약 바(웨이브·타이머·골드·몬스터·유물) + 아래 가운데 독(용병 카드·고용·x1/정지/메뉴) */
export const HUD = WIDE
  ? {
      top: { x: 150, y: 16, w: 980, h: 52 }, // 알약 바
      cy: 42, // 알약 바 가운데 y
      relic: { x: 990, y: 24, w: 132 }, // 유물 칸 4개 자리 (알약 바 오른쪽 끝)
      hp: { x: 836, y: 29, w: 144, h: 26 }, // 성벽 체력 막대 (골드 오른쪽 ~ 유물 칸 왼쪽)
      dark: { x: 150, y: 616, w: 980, h: 96 }, // 아래 독: 상점 6칸 + 영지·리롤 + 배속·메뉴·강화 (2026-11-21: 위 알약 바와 같은 폭 150~1130)
      shop: { x: 172, y: 622, w: 612, h: 84 }, // 상점 칸 (선택한 용병이 있으면 그 자리에 용병 카드)
      estate: { x: 871, y: 645, w: 150, h: 42 }, // 버튼 가운데
      reroll: { x: 871, y: 690, w: 150, h: 34 },
      small: { y: 664, xs: [980, 1032, 1084], w: 46, h: 64 }, // 배속(→정지) · 메뉴 · 강화
      syn: { x: 16, y: 84, w: 210, h: 372 }, // 시너지 목록 (왼쪽 세로)
      bench: { x: 16, y: 466, w: 210, h: 140, smith: { x: 168, y: 487, w: 96, h: 30 }, tool: { x: 121, y: 590 } } // 아이템 띠 (5×2)
    }
  : {
      top: { x: 12, y: 16, w: GAME_W - 24, h: 120 },
      // B-2 세로(2026-11-16): 1줄 WAVE·타이머·바로 시작 / 2줄 골드·몬스터 수 / 진행 막대 / 맨 아래 지역·다음·최고 안내
      line1: COZY ? 44 : 56, line2: COZY ? 44 : 56, line3: COZY ? 80 : 88, info: [34, 53], // 안내 두 줄 (남은 시간 알약 왼쪽, 2026-11-21)
      hp: { x: 236, y: 66, w: GAME_W - 12 - 20 - 236, h: 28 }, // 성벽 체력 막대 (2026-11-21: 하트·숫자 + 얇은 막대 → 숫자를 가운데에 넣은 막대 하나)
      timer: { x: GAME_W - 198, w: 86, h: 24 }, next: { x: GAME_W - 66, w: 68, h: 24 }, // 2026-11-21 작게 (Stitch 점검 뒤 76x30 으로 키웠다가 사용자 결정으로 다시 작게, 글자 12 유지)
      relic: { x: 12, y: 142, w: GAME_W - 24 }, // 시너지 칩(왼쪽) + 유물 4칸(오른쪽)
      // 2026-11-21 사용자 요청: 아래 시트 폭 = 위 카드 폭(12~532), 버튼 줄 높이 56 → 46 (위아래 여백 12)
      dark: { x: 12, y: 776, w: GAME_W - 24, h: 176 },
      shop: { x: 20, y: 786, w: GAME_W - 40, h: 96 }, // 상점 6칸 (선택한 용병이 있으면 그 자리에 용병 카드)
      estate: { x: 280, y: 917, w: 188, h: 46 }, // 버튼 가운데
      reroll: { x: 453, y: 917, w: 142, h: 46 },
      small: { y: 917, xs: [45, 99, 153], w: 50, h: 46 }, // 배속(→정지) · 메뉴 · 강화
      // 아이템 띠 (2026-11-21 사용자 결정: 위 카드 안 골드 줄 밑으로 — 원래 자리 몬스터 길 아래는 대기석)
      bench: { x: 12, y: 94, w: GAME_W - 24, h: 40, inCard: true, smith: { x: 60, y: 114, w: 76, h: 26 }, tool: { x: 502, y: 114 } },
      reserve: { x: 12, y: 712, w: GAME_W - 24, h: 58, slot: { x0: 64, step: 58, w: 54, h: 50 } } // 대기석 8칸 (몬스터 길 아래)
    };
/** 가운데 창(스킬 정보·메뉴·보상) 최대 너비 — 가로 화면에서 끝까지 늘어나지 않게 */
export const MODAL_W = WIDE ? 520 : GAME_W;

/** 성벽 체력 막대 외곽 두께 */
const HP_LINE = 4;
// 성벽 체력 피해 자국 (2026-11-22 사용자 요청): 줄어든 만큼 붉게 남았다가 delay 뒤 duration 동안 따라 줄어든다
const HP_TRAIL = { color: 0xff5a4a, delay: 400, duration: 700 };

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
    this.createBench();
    this.createReserve();
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
    const shared = TOAST_Y === BANNER_Y;
    if (shared && this.bannerObj?.active) this.bannerObj.setVisible(false); // 같은 띠: 토스트 동안 배너 숨김
    c.setAlpha(0);
    s.tweens.add({ targets: c, alpha: 1, duration: 120 });
    s.tweens.add({
      targets: c,
      alpha: 0,
      delay: 1700,
      duration: 300,
      onComplete: () => {
        c.destroy();
        if (shared && this.toastObj === c && this.bannerObj?.active) this.bannerObj.setVisible(true);
      }
    });
  }

  showBanner(title, sub, color = '#ffffff') {
    const s = this.s;
    if (this.bannerObj) this.bannerObj.destroy();
    if (TOAST_Y === BANNER_Y) this.toastObj?.destroy(); // 같은 띠: 새 배너가 앞선 토스트를 밀어낸다
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
      // 안내 두 줄 (2026-11-21 사용자 결정): 남은 시간 알약 왼쪽에 붙여 두 줄, 글자는 왼쪽 정렬 — 자리는 refresh 에서 맞춘다
      this.waveTypeText = uiText(s, 0, HUD.info[0], '', 12, CSS.sub, '600').setOrigin(0, 0.5).setDepth(D);
      this.waveTypeText2 = uiText(s, 0, HUD.info[1], '', 12, CSS.sub, '600').setOrigin(0, 0.5).setDepth(D);
    } else {
      const [tabImg, tabText] = titleTab(s, T.x + T.w / 2, T.y, 'WAVE 0', 220);
      tabImg.setDepth(D);
      this.waveText = tabText.setDepth(D);
      this.waveTypeText = uiText(s, T.x + 20, HUD.line1, '', 12, CSS.sub, 'bold').setOrigin(0, 0.5).setDepth(D);
    }

    // 타이머 슬롯 + 바로 시작 버튼
    // 타이머 칸과 버튼 사이 14px 띄움 (2026-11-15 간격 확보)
    panel(s, HUD.timer.x, HUD.line2 - HUD.timer.h / 2, HUD.timer.w, HUD.timer.h, 'soft').setDepth(D);
    const clock = s.add.graphics().setDepth(D);
    drawIcon(clock, 'clock', HUD.timer.x + 15, HUD.line2, 12, C.ink);
    this.timerText = uiText(s, HUD.timer.x + 27, HUD.line2, '', 12, CSS.ink, 'bold').setOrigin(0, 0.5).setDepth(D);
    this.nextWaveBtn = new Button(s, HUD.next.x, HUD.line2, HUD.next.w, HUD.next.h, '바로 시작', () => s.callNextWave(), { variant: 'primary', fontSize: 12 });

    // 골드 / 몬스터 수
    const coin = s.add.graphics().setDepth(D);
    drawIcon(coin, 'coin', T.x + 30, HUD.line3, 18, 0x6a4a10);
    this.goldText = uiText(s, T.x + 46, HUD.line3, '', 22, CSS.ink, 'bold').setOrigin(0, 0.5).setDepth(D);
    this.createHpBar(D, 16.5);

    // 시너지·유물 줄 (높이 40): 왼쪽 시너지 칩, 오른쪽 유물 4칸 (룰 v2)
    const RL = HUD.relic;
    panel(s, RL.x, RL.y, RL.w, 40, 'strip').setDepth(D - 1); // 얇은 테두리 → 아이콘 위아래 여백 (2026-11-15)
    this.relicLabel = null;
    this.relicRow = s.add.container(0, 0).setDepth(D);
    this.relicEmpty = [0, 1, 2, 3].map((i) => panelImage(s, this.relicPos(i, 4).x, this.relicPos(i, 4).y, 'soft', 27, 27).setDepth(D - 1));
    this.noRelicText = { setVisible: () => {} };
    this.synRow = s.add.container(0, 0).setDepth(D);
    this.noSynText = uiText(s, RL.x + 16, RL.y + 20, '시너지: 같은 계열·출신을 모으면 켜져요', 12, CSS.sub, 'bold').setOrigin(0, 0.5).setDepth(D);
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
    sep.fillStyle(C.line, 1).fillRect(T.x + 364, cy - 14, 2, 28);
    const clock = s.add.graphics().setDepth(D);
    drawIcon(clock, 'clock', T.x + 388, cy, 14, C.sub);
    this.timerText = uiText(s, T.x + 402, cy, '', 12, CSS.ink, '600').setOrigin(0, 0.5).setDepth(D);
    this.nextWaveBtn = new Button(s, T.x + 512, cy, 70, 26, '바로 시작', () => s.callNextWave(), { variant: 'primary', fontSize: 12 }); // 2026-11-21 작게 (이전 88x32, 74x30 은 되돌림)
    const coin = s.add.graphics().setDepth(D);
    drawIcon(coin, 'coin', T.x + 586, cy, 16, 0x6a4a10);
    this.goldText = uiText(s, T.x + 600, cy, '', 16.5, CSS.ink, 'bold').setOrigin(0, 0.5).setDepth(D);
    this.createHpBar(D, 13);
    this.relicLabel = null;
    this.relicRow = s.add.container(0, 0).setDepth(D);
    // 빈 유물 자리 4칸 (점선 대신 옅은 칸)
    this.relicEmpty = [0, 1, 2, 3].map((i) => panelImage(s, this.relicPos(i, 4).x, cy, 'soft', 28, 28).setDepth(D - 1));
    this.noRelicText = { setVisible: () => {} };
    // 시너지 목록 (왼쪽 세로 카드)
    const SY = HUD.syn;
    panel(s, SY.x, SY.y, SY.w, SY.h, 'card').setDepth(D - 1);
    uiText(s, SY.x + 18, SY.y + 18, '시너지', 15, CSS.primary, 'bold').setDepth(D);
    this.synRow = s.add.container(0, 0).setDepth(D);
    this.noSynText = uiText(s, SY.x + 18, SY.y + 50, '같은 계열·출신을\n모으면 켜져요', 12, CSS.sub, 'bold', { lineSpacing: 4 }).setDepth(D);
  }

  /** 성벽 체력 막대: 둥근 홈 + 채움(많을수록 초록 → 노랑 → 빨강) + 실드(하늘색 윗줄) + 가운데 하트·수치 */
  createHpBar(D, fontSize) {
    const s = this.s;
    const B = HUD.hp;
    this.hpBg = s.add.graphics().setDepth(D);
    // 외곽 4px (2026-11-21 사용자 요청: 더 두껍게, 이전 2px)
    this.hpBg.fillStyle(0x5a3f20, 1).fillRoundedRect(B.x, B.y, B.w, B.h, B.h / 2);
    this.hpBg.fillStyle(0x3a2a18, 1).fillRoundedRect(B.x + HP_LINE, B.y + HP_LINE, B.w - HP_LINE * 2, B.h - HP_LINE * 2, (B.h - HP_LINE * 2) / 2);
    this.hpFill = s.add.graphics().setDepth(D);
    this.hpLabel = s.add.container(B.x + B.w / 2, B.y + B.h / 2).setDepth(D + 1);
    this.hpHeart = s.add.graphics();
    // 수치 = 흰 글자 + 진한 외곽 (2026-11-21 사용자 요청: 숫자를 감싸던 크림 알약은 없앰 — 막대 색이 바뀌어도 외곽선으로 읽힌다)
    this.countText = uiText(s, 0, 0, '', fontSize, '#ffffff', 'bold').setOrigin(0, 0.5).setStroke('#2b1d12', 4);
    this.hpLabel.add([this.hpHeart, this.countText]);
  }

  /** 막대 다시 그리기 (refresh 에서) — 피해를 입으면 줄어든 만큼 붉게 남았다가 천천히 따라 줄어든다 (2026-11-22) */
  drawHpBar(n, max, shield) {
    const pct = Math.max(0, Math.min(1, n / max));
    if (this.hpShown == null || pct >= this.hpTrail) {
      // 처음·회복: 붉은 자국 없이 바로
      this.hpTrailTween?.stop();
      this.hpTrailTween = null;
      this.hpTrail = pct;
    } else if (pct < this.hpShown) {
      // 피해: 붉은 자국은 그대로 두고 잠깐 뒤 새 위치까지 천천히 줄인다 (연달아 맞으면 다시 기다렸다 줄어듦)
      this.hpTrailTween?.stop();
      this.hpTrailTween = this.s.tweens.addCounter({
        from: this.hpTrail,
        to: pct,
        delay: HP_TRAIL.delay,
        duration: HP_TRAIL.duration,
        ease: 'Quad.easeOut',
        onUpdate: (tw) => {
          this.hpTrail = tw.getValue();
          this.paintHpBar();
        },
        onComplete: () => {
          this.hpTrailTween = null;
        }
      });
    }
    this.hpShown = pct;
    this.hpShield = shield;
    this.hpMax = max;
    this.paintHpBar();
    // 가운데: 하트 + 수치 (함께 가운데 정렬)
    this.countText.setText(`${Math.ceil(n)}${shield > 0 ? `+${Math.ceil(shield)}` : ''} / ${max}`);
    const hw = 14; // 하트 7칸 × 2px
    const gap = 6;
    const total = hw + gap + this.countText.width;
    const left = Math.round(-total / 2);
    this.hpHeart.clear();
    drawIcon(this.hpHeart, 'heart', left + hw / 2, 1, 14, 0xd2473a);
    this.countText.setPosition(left + hw + gap, 0);
  }

  /** 막대 칠하기: 붉은 자국(hpTrail) → 지금 체력(hpShown) → 실드 */
  paintHpBar() {
    const B = HUD.hp;
    const g = this.hpFill;
    g.clear();
    const iw = B.w - HP_LINE * 2;
    const ih = B.h - HP_LINE * 2;
    const x = B.x + HP_LINE;
    const y = B.y + HP_LINE;
    const px = (p) => Math.round((iw * p) / UI_PX) * UI_PX;
    const pct = this.hpShown;
    const fill = px(pct);
    const trail = px(this.hpTrail);
    if (trail > fill) {
      const tw = Math.max(ih, trail);
      g.fillStyle(HP_TRAIL.color, 1).fillRoundedRect(x, y, tw, ih, ih / 2);
      g.fillStyle(0xffffff, 0.22).fillRoundedRect(x + 4, y + 2, Math.max(0, tw - 8), Math.max(2, Math.round(ih * 0.28)), 2);
    }
    if (fill > 0) {
      const col = pct > 0.5 ? 0x4fae5c : pct > 0.3 ? 0xe0a32a : 0xd2473a;
      const w = Math.max(ih, fill); // 둥근 끝이 깨지지 않게 최소 높이만큼
      g.fillStyle(col, 1).fillRoundedRect(x, y, w, ih, ih / 2);
      g.fillStyle(0xffffff, 0.28).fillRoundedRect(x + 4, y + 2, Math.max(0, w - 8), Math.max(2, Math.round(ih * 0.28)), 2);
    }
    const shield = this.hpShield || 0;
    if (shield > 0) {
      const sw = px(Math.min(1, shield / this.hpMax));
      g.fillStyle(0x8fd4ff, 1).fillRoundedRect(x, y, Math.max(6, sw), 4, 2);
    }
  }

  /** 유물 칸 위치: 세로는 유물 줄에 36px 간격, 가로는 알약 바 오른쪽 132px 안에 (많으면 좁혀 겹친다) */
  relicPos(i, n) {
    if (!WIDE) {
      // 오른쪽 4칸 (많으면 좁혀 겹친다)
      const right = HUD.relic.x + HUD.relic.w - 20;
      const gap = n > 4 ? 120 / (n - 1) : 32;
      return { x: right - (Math.max(4, n) - 1 - i) * gap, y: HUD.relic.y + 19 };
    }
    const gap = n > 4 ? (HUD.relic.w - 28) / (n - 1) : 34;
    return { x: HUD.relic.x + 14 + i * gap, y: HUD.cy };
  }

  /** 상단·하단 숫자와 버튼 상태를 게임 상태에 맞춘다 (0.1초마다 + 상태가 바뀔 때) */
  refresh() {
    this.upgradeBadge?.setVisible(this.s.canUpgrade);
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
    let lines;
    if (boss) {
      const debuffs = boss.abilities.length > 2 ? `디버프 ${boss.abilities.length}종` : boss.abilities.map((a) => a.def.name).join(', ');
      lines = [`${boss.revived ? '부활 ' : ''}${boss.enraged ? '분노 ' : ''}보스 ${Math.floor(Math.max(0, boss.dist / PATH_LENGTH) * 100)}%`, debuffs];
    } else {
      lines = [`${s.biome.name} · 필드 ${s.monsters.length}기`, `다음 ${ni.normal}기${extra} · 최고 W${Math.max(s.bestWave || 0, s.wave)}`];
    }
    const col = boss ? CSS.red : CSS.sub;
    if (this.waveTypeText2) {
      // 세로: 두 줄 블록을 남은 시간 알약 왼쪽(8px)에 붙이고, 줄은 왼쪽 정렬. WAVE 글자와는 8px 이상
      this.waveTypeText.setText(lines[0]).setColor(col);
      this.waveTypeText2.setText(lines[1]).setColor(col);
      const right = HUD.timer.x - 8;
      const minX = this.waveText.x + this.waveText.width + 8;
      for (const t of [this.waveTypeText, this.waveTypeText2]) this.fitText(t, right - minX);
      const x = Math.round(right - Math.max(this.waveTypeText.width, this.waveTypeText2.width));
      this.waveTypeText.setX(x);
      this.waveTypeText2.setX(x);
    } else {
      this.waveTypeText.setText(lines.join(' · ')).setColor(col);
      this.fitText(this.waveTypeText, WIDE ? 210 : GAME_W - 236 - 48);
    }
    this.goldText.setText(`${s.gold.toLocaleString()} G`);
    // 가로 알약 바: 골드가 길어지면(수만 G) 체력 막대에 닿지 않게 글자를 줄인다
    if (WIDE) this.goldText.setFontSize(this.goldText.text.length > 8 ? 13 : 16.5);

    // 성벽 체력 막대 (2026-11-21: 가운데에 수치). 실드가 있으면 +n
    const hpN = Math.ceil(s.wallHp);
    if (this._hpKey !== `${hpN}/${s.wallMax}/${Math.ceil(s.wallShield)}`) {
      this._hpKey = `${hpN}/${s.wallMax}/${Math.ceil(s.wallShield)}`;
      this.drawHpBar(hpN, s.wallMax, s.wallShield);
    }
    this.nextWaveBtn.setEnabled(s.canCallNextWave);
    this.refreshShopButtons();
    if (s.selected) this.refreshInfo();
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
      // 영지 유물 공방에서 장착한 유물 (판 안에서는 끄고 켜기 없음 — 룰 v2 ③). 누르거나 올리면 툴팁
      const slot = panelImage(s, x, y, 'gold', WIDE ? 28 : 27, WIDE ? 28 : 27);
      const icon = s.add.image(x, y, `relic_${r.id}`).setScale(UI_PX).setInteractive({ useHandCursor: true });
      icon.on('pointerdown', () => (this.relicTip?.index === i ? this.hideRelicTip() : this.showRelicTip(i, x, y, true)));
      icon.on('pointerover', () => this.showRelicTip(i, x, y, true));
      icon.on('pointerout', () => this.hideRelicTip());
      this.relicRow.add([slot, icon]);
    });
    // 아이콘이 다시 그려졌으니, 마우스가 올라가 있던 툴팁은 새 상태로 갱신
    if (this.relicTip) this.showRelicTip(this.relicTip.index, this.relicTip.x, this.relicTip.y);
  }

  /** 유물 툴팁: 이름·활성 상태·능력. 아이콘 아래에 띄우고 화면 밖으로 나가지 않게 맞춘다 */
  showRelicTip(index, x, y, animate = false) {
    const s = this.s;
    this.hideRelicTip();
    const owned = s.ownedRelics[index];
    if (!owned) return;
    const relic = RELIC_BY_ID[owned.id];
    const D = DEPTH.overlay - 0.5; // 배너·토스트(overlay -2·-1) 위에 뜬다
    const c = s.add.container(0, 0).setDepth(D);
    const title = uiText(s, 0, 0, relic.name, 15, CSS.ink, 'bold');
    const state = uiText(s, 0, 0, `Lv${owned.level}`, 12, CSS.green, 'bold');
    const desc = uiText(s, 0, 0, relicText(relic, owned.level, s.bonus.relicPow || 0), 13, CSS.ink);
    const hint = uiText(s, 0, 0, '영지 유물 공방에서 바꿔 끼울 수 있어요', 11, CSS.sub);
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
    // 스프링 등장 (2026-11-19): 아이콘 쪽(위 가운데)을 축으로 0.6 → 1, 살짝 넘쳤다가 출렁이며 멈춘다
    springTip(s, c, Phaser.Math.Clamp(x, left, left + w), top, animate);
    this.relicTip = { index, x, y, container: c };
  }

  hideRelicTip() {
    this.relicTip?.container.destroy();
    this.relicTip = null;
  }

  // ───────────────────────── 하단: 상점 6칸 + 영지·리롤 + 배속·메뉴·강화 (룰 v2, 2026-11-20) ─────────────────────────
  createBottom() {
    const s = this.s;
    const D = DEPTH.ui;
    const K = HUD.dark;
    panel(s, K.x, K.y, K.w, K.h, 'card').setDepth(D - 2); // 포근한 카드형: 둥근 크림 시트
    const SM = HUD.small;
    const v = WIDE ? 'outline' : 'card';
    const fs = 12;
    // 배속 버튼 하나로: x1 → x2 → x3 → 정지 → x1 (2026-11-18, 정지 버튼 합침)
    this.speedBtn = new Button(s, SM.xs[0], SM.y, SM.w, SM.h, 'x1', () => s.cycleSpeed(), { variant: v, icon: 'speed', fontSize: fs });
    this.menuBtn = new Button(s, SM.xs[1], SM.y, SM.w, SM.h, '메뉴', () => this.toggleMenu(), { variant: v, icon: 'menu', fontSize: fs });
    this.createUpgradeButton(SM, v, fs);
    const E = HUD.estate;
    this.estateBtn = new Button(s, E.x, E.y, E.w, E.h, '', () => s.levelUpEstate(), { variant: 'gold', icon: 'house', iconLeft: true, fontSize: 12 }); // 아이콘 왼쪽 + 두 줄
    const R = HUD.reroll;
    this.rerollBtn = new Button(s, R.x, R.y, R.w, R.h, '', () => s.reroll(), { variant: 'primary', icon: 'reroll', iconLeft: true, fontSize: 12 });
    // 상점 칸 / 용병 카드 (같은 자리)
    this.shopBox = s.add.container(0, 0).setDepth(D);
    this.infoBox = s.add.container(0, 0).setDepth(D).setVisible(false);
    this.createInfoCard();
  }

  /** 상점 칸 다시 그리기 (사거나 리롤·갱신·잠금할 때) */
  refreshShop() {
    const s = this.s;
    const B = HUD.shop;
    this.shopBox.removeAll(true);
    const gap = 6;
    const w = (B.w - gap * (SHOP.slots - 1)) / SHOP.slots;
    const h = B.h;
    s.shop.forEach((slot, i) => {
      const x = B.x + i * (w + gap);
      const y = B.y;
      const c = s.add.container(x, y);
      const g = s.add.graphics();
      c.add(g);
      if (!slot || slot.sold) {
        g.fillStyle(0xe7dcbb, 0.7).fillRoundedRect(0, 0, w, h, 10);
        c.add(uiText(s, w / 2, h / 2, slot?.sold ? '구매' : '-', 12, CSS.sub, '600').setOrigin(0.5));
        this.shopBox.add(c);
        return;
      }
      const ch = ROSTER_BY_ID[slot.id];
      const price = priceOf(ch);
      const gc = Phaser.Display.Color.HexStringToColor(GRADES[ch.grade].color).color;
      const owned = s.mercs.filter((m) => m.char.id === ch.id).length;
      const afford = s.gold >= price;
      // 테두리 = 등급색 바깥 모양 + 안쪽 바탕 (선을 겹쳐 그리면 모서리에 틈이 생겼다, 2026-11-21)
      g.fillStyle(gc, 1).fillRoundedRect(0, 0, w, h, 10);
      g.fillStyle(slot.locked ? 0xfff1c8 : 0xfffaf0, 1).fillRoundedRect(3, 3, w - 6, h - 6, 7);
      g.fillStyle(gc, 1).fillRoundedRect(0, h - 20, w, 20, { tl: 0, tr: 0, bl: 10, br: 10 });
      const img = charImage(s, w / 2, WIDE ? 32 : 40, ch);
      // 이름(왼쪽) + 가격(오른쪽)을 띠 한 줄에 나눠 — 이름이 길면 이름만 줄여 가격은 늘 보인다 (2026-11-21)
      const tc = ch.grade === 2 ? CSS.white : '#2b1d2f';
      const pt = uiText(s, w - 5, h - 10, `${price}G`, 12, tc, 'bold').setOrigin(1, 0.5);
      const nm = uiText(s, 5, h - 10, ch.name, 12, tc, 'bold').setOrigin(0, 0.5);
      this.fitText(nm, w - 10 - pt.width - 4);
      c.add([img, nm, pt]);
      // 계열·출신 상징 (2026-11-21: 아래 가운데 · 글자 대신 모양 그림) — 이름 띠·서로 4px 이상 띄운다 (여백 필수 규칙)
      [ch.cls, ch.origin].forEach((k, j) => c.add(traitBadge(s, w / 2 + (j ? 13 : -13), h - 20 - 5 - 10, k, 9)));
      // 같은 캐릭터가 이미 있으면 몇 장인지 (별 승급까지)
      if (owned) c.add(uiText(s, w - 5, 5, `${owned}장`, 12, CSS.primary, 'bold').setOrigin(1, 0));
      if (!afford) c.add(s.add.rectangle(0, 0, w, h, 0x2b1d2f, 0.28).setOrigin(0));
      const hit = s.add.rectangle(0, 0, w, h - 4, 0xffffff, 0.001).setOrigin(0).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => c.setScale(0.96));
      hit.on('pointerout', () => c.setScale(1));
      hit.on('pointerup', () => {
        c.setScale(1);
        s.buy(i);
      });
      c.add(hit);
      // 잠금 (2026-11-21: 위 가운데)
      const lk = s.add.graphics();
      lk.fillStyle(slot.locked ? 0xe0a32a : 0xffffff, slot.locked ? 1 : 0.85).fillRoundedRect(w / 2 - 9, 3, 18, 18, 5);
      drawIcon(lk, slot.locked ? 'lock' : 'unlock', w / 2, 12, 12, slot.locked ? 0x3a2608 : 0x8c7b60);
      const lz = s.add.rectangle(w / 2 - 13, 0, 26, 24, 0xffffff, 0.001).setOrigin(0).setInteractive({ useHandCursor: true });
      lz.on('pointerup', () => s.toggleLock(i));
      c.add([lk, lz]);
      c.slotIndex = i;
      this.shopBox.add(c);
    });
    this.refreshShopButtons();
  }

  // ───────────────────────── 아이템 띠 (룰 v2 ②, 2026-11-20) ─────────────────────────
  /** 아이템 띠: 세로는 아래쪽 몬스터 길과 하단 시트 사이, 가로는 왼쪽 시너지 목록 아래 */
  createBench() {
    const s = this.s;
    const D = DEPTH.ui;
    const B = HUD.bench;
    if (!B.inCard) panel(s, B.x, B.y, B.w, B.h, WIDE ? 'card' : 'strip').setDepth(D - 1);
    if (WIDE) uiText(s, B.x + 18, B.y + 16, '아이템', 15, CSS.primary, 'bold').setDepth(D);
    const sb = B.smith;
    this.smithBtn = new Button(s, sb.x, sb.y, sb.w, sb.h, '', () => s.smithBuy(), { variant: 'gold', icon: 'anvil', fontSize: 12 });
    this.toolText = uiText(s, B.tool.x, B.tool.y, '', 12, CSS.ink, 'bold').setOrigin(0.5).setDepth(D);
    this.benchRow = s.add.container(0, 0).setDepth(D + 1);
    this.refreshBench();
  }

  // ───────────────────────── 대기석 (2026-11-21 사용자 결정: 필드 아래 8칸) ─────────────────────────
  /** 대기석 판 + 빈 칸 (세로만 — 가로 배치는 꺼져 있다) */
  createReserve() {
    const R = HUD.reserve;
    if (!R) return;
    const s = this.s;
    const D = DEPTH.ui;
    panel(s, R.x, R.y, R.w, R.h, 'card').setDepth(D - 1);
    this.reserveLabel = uiText(s, R.x + 28, R.y + R.h / 2, '대기', 12, CSS.sub, 'bold').setOrigin(0.5).setDepth(D);
    for (let i = 0; i < SHOP.reserve; i++) {
      const p = this.reservePos(i);
      panelImage(s, p.x, p.y, 'soft', R.slot.w, R.slot.h).setDepth(D);
    }
  }

  /** 대기석 i 칸 가운데 */
  reservePos(i) {
    const R = HUD.reserve;
    return { x: R.slot.x0 + i * R.slot.step + R.slot.w / 2, y: R.y + R.h / 2 };
  }

  /** (x, y) 가 대기석 몇 번 칸 위인지 (아니면 -1) */
  reserveSlotAt(x, y) {
    const R = HUD.reserve;
    if (!R || y < R.y || y > R.y + R.h) return -1;
    for (let i = 0; i < SHOP.reserve; i++) {
      const p = this.reservePos(i);
      if (Math.abs(x - p.x) <= R.slot.step / 2) return i;
    }
    return -1;
  }

  benchPos(i) {
    const B = HUD.bench;
    if (WIDE) return { x: B.x + 29 + (i % 5) * 38, y: B.y + 58 + Math.floor(i / 5) * 38 };
    return { x: B.x + 118 + i * 36, y: B.y + B.h / 2 };
  }

  /** 아이템 그림: 재료는 색 칸 + 글자, 조합품은 두 재료 색 반반 + 금 테두리, 문장은 시너지 색 방패 */
  itemIcon(id, x, y, size = 30) {
    // 아이템 그림 (2026-11-21): 12x12 전용 도트 그림(docs/drafts/item-icons/items.py → item_<id>)을 2px 로. 칸 배경: 조합품은 금 테두리
    const s = this.s;
    const it = ITEM_BY_ID[id];
    const c = s.add.container(x, y);
    // 2026-11-21 사용자 요청: 아이콘 외곽(칸 배경·테두리) 제거 — 그림만. 누르는 영역은 그림 크기
    c.setSize(size, size);
    if (s.textures.exists(`item_${id}`)) c.add(s.add.image(0, 0, `item_${id}`).setScale(UI_PX));
    else c.add(uiText(s, 0, 0, it.glyph || it.name[0], 13, CSS.ink, 'bold').setOrigin(0.5));
    return c;
  }


  refreshBench() {
    const s = this.s;
    if (!this.benchRow) return;
    this.benchRow.removeAll(true);
    for (let i = 0; i < ITEM_RULES.bench; i++) {
      const p = this.benchPos(i);
      this.benchRow.add(panelImage(s, p.x, p.y, 'soft', 32, 32));
    }
    s.bench.forEach((id, i) => {
      const p = this.benchPos(i);
      const ic = this.itemIcon(id, p.x, p.y, 28);
      ic.setSize(32, 32).setInteractive({ draggable: true, useHandCursor: true });
      ic.on('pointerover', () => this.showItemTip(id, p.x, p.y));
      ic.on('pointerout', () => this.hideRelicTip());
      ic.on('dragstart', () => {
        this.hideRelicTip();
        this.benchRow.remove(ic);
        ic.setDepth(DEPTH.drag); // UI(200) 위 — 끌고 가는 그림이 상점·시트 아래로 숨지 않게
        s.add.existing(ic);
      });
      ic.on('drag', (_p, x, y) => ic.setPosition(x, y));
      ic.on('dragend', (ptr) => {
        const m = s.allUnits.find((u) => Math.abs(u.x - ptr.worldX) < 28 && Math.abs(u.y - ptr.worldY) < 28); // 대기석 캐릭터에도 장착
        ic.destroy();
        if (!m || !s.equip(i, m)) this.refreshBench();
      });
      this.benchRow.add(ic);
    });
    this.smithBtn?.setLabel(`재료 ${s.smithCost}G`).setEnabled(s.gold >= s.smithCost && s.bench.length < ITEM_RULES.bench);
    this.toolText?.setText(WIDE ? `해제 도구 ${s.tools}개` : `해제 도구\n${s.tools}개`);
  }

  /** 아이템 툴팁: 이름·효과 (재료는 조합표) */
  showItemTip(id, x, y) {
    const s = this.s;
    this.hideRelicTip();
    const it = ITEM_BY_ID[id];
    const c = s.add.container(0, 0).setDepth(DEPTH.overlay - 0.5);
    const lines = [uiText(s, 0, 0, it.name, 15, CSS.ink, 'bold'), uiText(s, 0, 0, it.text, 12, CSS.primary, '600', { wordWrap: { width: 300 } })];
    if (isComponent(id)) {
      lines.push(uiText(s, 0, 0, '같은 캐릭터에 재료 2개 → 자동 조합', 11, CSS.sub, '600'));
      for (const r of recipesWith(id)) {
        const res = ITEM_BY_ID[r.result];
        lines.push(uiText(s, 0, 0, `+ ${ITEM_BY_ID[r.with].name} → ${res ? res.name : '출신 문장(출신을 고름)'}`, 11, CSS.ink, '600'));
      }
    }
    const pad = 12;
    const w = Math.ceil((Math.max(...lines.map((l) => l.width)) + pad * 2) / UI_PX) * UI_PX;
    let h = pad;
    for (const l of lines) h += l.height + 4;
    h += pad - 4;
    const left = Phaser.Math.Clamp(WIDE ? x + 30 : x - w / 2, 8, GAME_W - 8 - w);
    const top = WIDE ? Phaser.Math.Clamp(y - h / 2, 80, GAME_H - h - 8) : y - 24 - h;
    c.add(panel(s, left, top, w, h, 'card'));
    let cy = top + pad;
    for (const l of lines) {
      l.setPosition(left + pad, cy);
      cy += l.height + 4;
      c.add(l);
    }
    // 유물 툴팁과 같은 스프링 등장 (2026-11-21) — 아이콘 쪽 가장자리가 축
    if (WIDE) springTip(s, c, left, Phaser.Math.Clamp(y, top, top + h));
    else springTip(s, c, Phaser.Math.Clamp(x, left, left + w), top + h);
    this.relicTip = { index: -1, x, y, container: c };
  }

  /** 영지·리롤 버튼 글자·활성 */
  refreshShopButtons() {
    const s = this.s;
    if (!this.estateBtn) return;
    const cost = s.estateCost;
    this.estateBtn.setLabel(cost == null ? `영지 Lv.${s.estate} 최고 · ${s.mercs.length}/${s.cap}명` : `영지 Lv.${s.estate} · ${s.mercs.length}/${s.cap}명\n레벨 업 ${cost}G`);
    this.estateBtn.setEnabled(cost != null && s.gold >= cost);
    const rc = s.rerollPrice;
    this.rerollBtn.setLabel(rc === 0 ? '리롤 무료' : `리롤 ${rc}G`);
    this.rerollBtn.setEnabled(s.gold >= rc);
    this.smithBtn?.setLabel(`재료 ${s.smithCost}G`).setEnabled(s.gold >= s.smithCost && s.bench.length < ITEM_RULES.bench);
  }

  /** 시너지 칩: 세로는 위 줄 왼쪽, 가로는 왼쪽 목록. 누르면 단계별 효과 */
  refreshSynergy() {
    const s = this.s;
    if (!this.synRow) return;
    this.synRow.removeAll(true);
    const counts = s.syn.counts || {};
    const list = sortedTraits(counts);
    this.noSynText.setVisible(!list.length);
    list.forEach((k, i) => {
      const t = TRAITS[k];
      const n = counts[k];
      const ti = tierIndex(k, n);
      const next = t.tiers.find((x) => x.n > n);
      const col = Phaser.Display.Color.HexStringToColor(t.color).color;
      const on = ti >= 0;
      let x, y;
      if (WIDE) {
        x = HUD.syn.x + 30;
        y = HUD.syn.y + 54 + i * 38;
        if (y > HUD.syn.y + HUD.syn.h - 20) return;
      } else {
        x = HUD.relic.x + 22 + i * 62;
        y = HUD.relic.y + 20;
        if (x > HUD.relic.x + HUD.relic.w - 160) return; // 유물 4칸 자리
      }
      const c = s.add.container(x, y);
      // 켜진 시너지는 연두 알약으로 강조 (2026-11-21 Stitch 시안)
      if (on) {
        const pill = s.add.graphics();
        const pw = WIDE ? 188 : 56;
        pill.fillStyle(0xd8fcb4, 1).fillRoundedRect(-15, -15, pw, 30, 15).lineStyle(1.5, 0x56743f, 1).strokeRoundedRect(-15, -15, pw, 30, 15);
        pill.auditBox = { x: -15, y: -15, w: pw, h: 30 }; // tools/ui-audit.cjs 여백 검사
        c.add(pill);
      }
      c.add(traitBadge(s, 0, 0, k, 10, on)); // r10: 알약 안쪽·숫자와 4px 이상 (여백 필수 규칙)
      const label = next ? `${n}/${next.n}` : `${n}`;
      if (WIDE) {
        c.add(uiText(s, 20, -1, `${t.name}`, 13, on ? CSS.ink : CSS.sub, 'bold').setOrigin(0, 0.5));
        c.add(uiText(s, 168, -1, label, 13, on ? CSS.primary : CSS.sub, 'bold').setOrigin(1, 0.5));
      } else {
        c.add(uiText(s, 15, 1, label, 12, on ? CSS.primary : CSS.sub, 'bold').setOrigin(0, 0.5));
      }
      const hit = s.add.rectangle(WIDE ? 80 : 10, 0, WIDE ? 180 : 46, 30, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => this.showSynergyTip(k, x, y));
      hit.on('pointerout', () => this.hideRelicTip());
      hit.on('pointerup', () => this.showSynergyTip(k, x, y));
      c.add(hit);
      this.synRow.add(c);
    });
  }

  /** 시너지 툴팁: 이름·설명·단계별 효과 (켜진 단계 진하게) */
  showSynergyTip(k, x, y) {
    const s = this.s;
    this.hideRelicTip();
    const t = TRAITS[k];
    const n = s.syn.counts[k] || 0;
    const ti = tierIndex(k, n);
    const c = s.add.container(0, 0).setDepth(DEPTH.overlay - 0.5);
    const lines = [
      uiText(s, 0, 0, `${t.name}  ${n}명 · ${t.kind === 'class' ? '계열' : '출신'}`, 15, CSS.ink, 'bold'),
      uiText(s, 0, 0, t.desc, 11, CSS.sub, '600', { wordWrap: { width: 300 } }),
      ...t.tiers.map((x, i) => uiText(s, 0, 0, `${x.n}명 — ${x.text}`, 12, i === ti ? CSS.primary : CSS.sub, i === ti ? 'bold' : '600', { wordWrap: { width: 300 } }))
    ];
    const pad = 14;
    const w = Math.ceil((Math.max(...lines.map((l) => l.width)) + pad * 2) / UI_PX) * UI_PX;
    let h = pad;
    for (const l of lines) h += l.height + 6;
    h += pad - 6;
    const left = Phaser.Math.Clamp(WIDE ? x + 196 : x - 20, 8, GAME_W - 8 - w);
    const top = WIDE ? Phaser.Math.Clamp(y - 20, 80, GAME_H - h - 8) : y + 24;
    c.add(panel(s, left, top, w, h, 'card'));
    let cy = top + pad;
    for (const l of lines) {
      l.setPosition(left + pad, cy);
      cy += l.height + 6;
      c.add(l);
    }
    // 유물 툴팁과 같은 스프링 등장 (2026-11-21) — 칩 쪽 가장자리가 축
    if (WIDE) springTip(s, c, left, Phaser.Math.Clamp(y, top, top + h));
    else springTip(s, c, Phaser.Math.Clamp(x, left, left + w), top);
    this.relicTip = { index: -1, x, y, container: c };
  }

  /** 명성 강화 버튼 (2026-11-18: 필드 성탑 대신). 살 수 있는 노드가 있으면 "!" 가 통통 튄다 */
  createUpgradeButton(SM, variant, fontSize) {
    const s = this.s;
    const x = SM.xs[2], y = SM.y;
    this.upgradeBtn = new Button(s, x, y, SM.w, SM.h, '강화', () => s.openUpgrades(), { variant, icon: 'tower', fontSize });
    this.upgradeBadge = s.add.container(x + SM.w / 2 - 4, y - SM.h / 2 + 2).setDepth(DEPTH.ui + 2).setVisible(false);
    // 느낌표 배지 (2026-11-21: 더 크게 r 12, 느낌표는 글자 대신 굵은 도형 — 막대 4x10 + 점 4x4)
    const mark = s.add.graphics();
    mark.fillStyle(0x3a2608, 1).fillRoundedRect(-2, -9, 4, 11, 1.5).fillRect(-2, 4, 4, 4);
    this.upgradeBadge.add([s.add.circle(0, 0, 12, 0xffd36a).setStrokeStyle(3, 0x3a2608), mark]);
    // 스케일 팝 반복 (2026-11-19): 1.3초마다 톡 커졌다 돌아온다. 배속·정지와 상관없이 실제 시간으로 돈다
    const badge = this.upgradeBadge;
    const pop = () => {
      if (!badge.active) return s.events.off('update', pop);
      badge.setScale(badgePop((s.game.loop.time % 1300) / 1300));
    };
    s.events.on('update', pop);
  }

  /** 용병 카드 (상점 칸 자리에 뜬다): 초상·이름·별·계열·출신·능력치·마나·스킬 + 스킬 정보·판매 */
  createInfoCard() {
    const s = this.s;
    const B = HUD.shop;
    const c = this.infoBox;
    c.add(panel(s, B.x, B.y, B.w, B.h, 'soft'));
    this.infoAvatar = panelImage(s, B.x + 40, B.y + B.h / 2, 'soft', 56, 56);
    this.infoPortrait = s.add.sprite(B.x + 40, B.y + B.h / 2, 'pixel').setScale(PX - 1);
    this.infoTitle = uiText(s, B.x + 80, B.y + (WIDE ? 5 : 8), '', 15, CSS.ink, 'bold');
    this.infoSub = uiText(s, B.x + 80, B.y + (WIDE ? 27 : 31), '', 12, CSS.sub, 'bold');
    this.infoBody = uiText(s, B.x + 80, B.y + 52, '', 12, CSS.ink, 'bold');
    this.manaBar = s.add.graphics();
    const bx = B.x + B.w - 64;
    this.skillBtn = new Button(s, bx, B.y + B.h / 2 - 20, 108, 32, '스킬 정보', () => s.selected && this.showSkillPopup(s.selected), { variant: 'primary', fontSize: 12 });
    this.sellBtn = new Button(s, bx, B.y + B.h / 2 + 20, 108, 32, '판매', () => s.selected && s.sell(s.selected), { variant: 'danger', fontSize: 12 });
    this.toolBtn = new Button(s, bx - 108, B.y + B.h / 2 - 20, 92, 32, '해제 도구', () => s.selected && s.useTool(s.selected), { variant: 'gold', fontSize: 12 });
    this.itemRow = s.add.container(0, 0);
    c.add([this.infoAvatar, this.infoPortrait, this.infoTitle, this.infoSub, this.infoBody, this.manaBar, this.skillBtn, this.sellBtn, this.toolBtn, this.itemRow]);
  }

  /** 배속 버튼 표시: 정지 중이면 '정지'(정지 아이콘), 아니면 'x1~x3' */
  setPaused(paused) {
    this.speedBtn.setLabel(paused ? '정지' : `x${this.s.speed}`).setIcon(paused ? 'pause' : 'speed');
  }

  /** 용병을 고르면 상점 칸 자리에 용병 카드, 아니면 상점 */
  refreshInfo() {
    const s = this.s;
    const m = s.selected && s.selected.active ? s.selected : null;
    if (!m) s.selected = null;
    this.shopBox.setVisible(!m);
    this.infoBox.setVisible(!!m);
    if (!m) return;
    const B = HUD.shop;
    const st = m.getStats(s.relics, s.gameTime);
    this.infoAvatar.setTexture(panelKey(s, m.isHero ? 'gold' : 'soft', 56, 56));
    setArt(this.infoPortrait, m.textureKey, PX - 1);
    playBase(this.infoPortrait, 'idle');
    this.infoTitle.setColor(m.isHero ? CSS.gold : CSS.ink).setText(`${m.heroName} ${'★'.repeat(m.star)}`);
    // 계열·출신 상징 배지 (2026-11-21 사용자 요청: 상점 카드와 같은 그림을 이름 오른쪽에)
    const bKey = `${m.char.id}|${this.infoTitle.text}`;
    if (this.infoBadgeKey !== bKey) {
      this.infoBadgeKey = bKey;
      this.infoBadges?.destroy();
      const by = Math.round(this.infoTitle.y + this.infoTitle.height / 2);
      const bx0 = this.infoTitle.x + this.infoTitle.width + 6 + 9;
      this.infoBadges = s.add.container(0, 0);
      [m.char.cls, m.char.origin].forEach((k, j) => this.infoBadges.add(traitBadge(s, bx0 + j * 22, by, k, 8)));
      this.infoBox.add(this.infoBadges);
    }
    this.infoSub.setText(`${m.gradeName} · ${m.roleName} · ${STYLES[m.char.style].name}${m.reserved ? ' · 대기석' : m.isFront ? ' · 전열' : ' · 후열'}`);
    const textW = B.w - 80 - 128;
    this.fitText(this.infoSub, textW);
    const body = st.debuff.list.length
      ? `디버프: ${st.debuff.list.map((d) => `${d.def.name} ${Math.ceil(d.until - s.gameTime)}초`).join(', ')}`
      : `공격 ${Math.round(st.damage)} · 공속 ${st.rate.toFixed(2)} · 사거리 ${Math.round(st.range)}${st.buffed ? ' (버프)' : ''}`;
    this.infoBody.setColor(st.debuff.list.length ? CSS.red : CSS.ink).setText(body);
    this.fitText(this.infoBody, textW);
    // 마나 막대 + 스킬 이름
    const g = this.manaBar.clear();
    const mx = B.x + 80, my = B.y + B.h - 18, mw = Math.min(200, textW - 4);
    g.fillStyle(0xd9cdb2, 1).fillRoundedRect(mx, my, mw, 8, 4);
    g.fillStyle(0x4a8fe8, 1).fillRoundedRect(mx, my, Math.max(8, (mw * m.mana) / m.maxMana), 8, 4);
    this.infoBody.setY(B.y + (WIDE ? 45 : 50)); // 가로(높이 84)는 줄마다 4px 여백이 남게 촘촘히
    if (!this.manaText) {
      this.manaText = uiText(s, 0, 0, '', 12, CSS.sub, 'bold').setOrigin(0, 0.5);
      this.infoBox.add(this.manaText);
    }
    this.manaText.setPosition(mx + mw + 8, my + 4).setText(`${Math.floor(m.mana)}/${m.maxMana} 「${m.def.name}」`);
    this.fitText(this.manaText, textW - mw - 8);
    this.sellBtn.setLabel(`판매 +${Math.floor(m.invested * s.sellRefund)}G`);
    // 아이템 칸 (최대 3) — 마우스를 올리면 효과
    this.itemRow.removeAll(true);
    m.items.forEach((id, i) => {
      const ic = this.itemIcon(id, this.infoTitle.x + this.infoTitle.width + 18 + i * 26, B.y + 21, 22);
      ic.setSize(24, 24).setInteractive();
      ic.on('pointerover', () => this.showItemTip(id, ic.x, ic.y + 40));
      ic.on('pointerout', () => this.hideRelicTip());
      this.itemRow.add(ic);
    });
    this.toolBtn.setVisible(s.tools > 0 && m.items.length > 0);
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
    // 룰 v2 (2026-11-20): 스킬 1개 — 마나가 가득 차면 시전, 별이 오를수록 강해진다
    add(`${m.heroName} ${'★'.repeat(m.star)} · ${m.gradeName}`, 20, m.isHero ? CSS.gold : CSS.primary, '700', 2);
    add(`${m.char.title} · ${TRAITS[m.cls].name} · ${TRAITS[m.origin].name} · ${STYLES[m.char.style].name} — ${TRAIT_TEXT(m.trait)}`, 13, CSS.ink, '600', 10);
    add(`스킬 「${m.def.name}」 · 최대 마나 ${m.maxMana} (공격마다 마나가 차고, 가득 차면 시전)`, 15, CSS.primary, '700', 4);
    for (let n = 1; n <= MAX_STAR; n++) add(`${'★'.repeat(n)}${n === m.star ? ' (지금)' : ''}  ${describeSkill(starSkill(m.char.skill, n))}`, 13, n === m.star ? CSS.ink : CSS.sub, n === m.star ? '700' : '600', 6);
    add(`같은 캐릭터 3장을 모으면 별이 오릅니다 (최대 ${MAX_STAR}성)`, 12, CSS.sub, '600', 4);
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

/** 감쇠 스프링 이징: 0 → 1 로 가며 한 번 넘쳤다가 출렁이며 멈춘다 */
export function springEase(t) {
  return t >= 1 ? 1 : 1 - Math.exp(-6.5 * t) * Math.cos(11 * t);
}

/** 스케일 팝 곡선 (주기 0~1): 앞 30% 동안 1 → 1.35 → 0.92 → 1, 나머지는 쉼 */
export function badgePop(p) {
  if (p >= 0.3) return 1;
  const t = p / 0.3;
  if (t < 0.35) return 1 + 0.35 * Math.sin((t / 0.35) * (Math.PI / 2));
  if (t < 0.7) return 1.35 - 0.43 * ((t - 0.35) / 0.35);
  return 0.92 + 0.08 * ((t - 0.7) / 0.3);
}

/**
 * 시너지 상징 배지 (2026-11-21): 시너지 색 원 + 하얀 모양 그림(theme trait_<id>, 7칸 × 2px). off 면 옅은 원 + 갈색 모양
 * @returns {Phaser.GameObjects.Container}
 */
export function traitBadge(s, x, y, k, r = 10, on = true) {
  const t = TRAITS[k];
  const col = Phaser.Display.Color.HexStringToColor(t.color).color;
  const c = s.add.container(x, y);
  const g = s.add.graphics();
  g.fillStyle(on ? col : 0xd9cdb2, 1).fillCircle(0, 0, r);
  g.lineStyle(2, on ? 0x2b1d2f : 0xa8875a, 1).strokeCircle(0, 0, r);
  drawIcon(g, `trait_${k}`, 0, 0, 14, on ? 0xffffff : 0x8c6f45);
  c.add(g);
  c.auditBox = { x: -r - 1, y: -r - 1, w: 2 * r + 2, h: 2 * r + 2 }; // tools/ui-audit.cjs 여백 검사 (외곽선 포함)
  return c;
}

/**
 * 툴팁 스프링 등장 (유물 툴팁 2026-11-19 → 모든 툴팁 2026-11-21): (ax, ay) 를 축으로 0.6 → 1, 살짝 넘쳤다 출렁이며 멈춘다 + 0.12초 페이드.
 * 컨테이너 c 안의 것들은 화면 좌표로 넣어 두면 축 기준으로 옮겨 준다
 */
export function springTip(s, c, ax, ay, animate = true) {
  c.setPosition(ax, ay);
  c.each((o) => o.setPosition(o.x - ax, o.y - ay));
  if (!animate) return;
  c.setScale(0.6).setAlpha(0);
  uiTween(s, { targets: c, scale: 1, duration: 520, ease: springEase });
  uiTween(s, { targets: c, alpha: 1, duration: 120 });
}

/** UI 트윈: 전투 배속(tweens.timeScale)과 상관없이 실제 시간으로 재생 */
function uiTween(s, cfg) {
  const t = s.tweens.add(cfg);
  t.timeScale = 1 / (s.tweens.timeScale || 1);
  return t;
}
