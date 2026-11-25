// 전투 화면 UI — 상단 상태 창·유물 줄, 하단 버튼·정보 창, 토스트·배너, 스킬 정보 팝업, ESC 메뉴
// GameScene 은 게임 진행만 맡고, 화면 표시는 이 클래스에 맡긴다 (scene.hud).
// 게임 상태는 읽기만 하고, 버튼을 누르면 scene 의 동작(hire, sell, callNextWave …)을 부른다.
import Phaser from 'phaser';
import { GAME_W, GAME_H, PX, UI_PX, UI_SCALE, COZY, FIELD_X, FIELD_Y, FIELD_SIZE, PATH_OFF, PATH_WIDTH, DEPTH } from '../config.js';
import { charImage } from '../objects/Mercenary.js';
import { Button } from './Button.js';
import { meta } from '../systems/meta.js';
import { panel, panelKey, panelImage, titleTab, closeButton, uiText, drawIcon, onLight, traitBadge, edgeBar, tabBar, discImage, pillImage, C, CSS, ATTR_CSS_DARK } from './theme.js';
export { traitBadge };
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
import { vhs } from '../systems/vhs.js';
import { worldPoint, uiPoint, toUi } from '../systems/hires.js';

// 몬스터 길 바깥 가장자리 (필드를 둘러싼 사각형)
// 위·아래 바 = 화면 좌우 끝까지, 화면 끝은 각지게 (2026-11-22 사용자 요청)
const HUD_TOP_H = 48; // 2026-11-24 사용자 요청: 위 바를 1/3 얇게 (이전 72)
const HUD_DOCK_Y = 610;
// 월드 좌표(전장) → UI 좌표 (2026-11-22 PC 전환: HUD 는 UI 좌표 1280x720)
const RING = { x0: (FIELD_X - PATH_OFF - PATH_WIDTH / 2) / UI_SCALE, y0: (FIELD_Y - PATH_OFF - PATH_WIDTH / 2) / UI_SCALE, x1: (FIELD_X + FIELD_SIZE + PATH_OFF + PATH_WIDTH / 2) / UI_SCALE, y1: (FIELD_Y + FIELD_SIZE + PATH_OFF + PATH_WIDTH / 2) / UI_SCALE };
// 알림 띠 위치: 필드·몬스터 길 바깥의 빈 공간 가운데
//  세로: 유물 줄 아래 ~ 위쪽 길 / 아래쪽 길 ~ 하단 패널 · 가로: 화면 위 ~ 위쪽 길 / 아래쪽 길 ~ 화면 아래
//  가로(B-2): 위 알약 바(y 16~68)와 위쪽 길 사이 / 아래쪽 길과 아래 독(y 643~) 사이
// 가운데 탭 (2026-11-24 사용자 시안): 위 바 탭 = 시너지 상징 한 줄, 아래 독 탭 = 대기석 한 줄 (양옆 S 곡선 폭 slope)
export const TOP_TAB = { x0: 392, x1: 888, depth: 38, slope: 52 }; // 2026-11-25 시안: 상징 작게 → 탭 얇게 (이전 깊이 46)
export const BOTTOM_TAB = { x0: 478, x1: 802, depth: 44, slope: 52 };
const TOP_BAND = [HUD_TOP_H + TOP_TAB.depth, RING.y0];
const BOTTOM_BAND = [RING.y1 - 8, HUD_DOCK_Y - BOTTOM_TAB.depth];
export const BANNER_Y = (TOP_BAND[0] + TOP_BAND[1]) / 2;
// 세로 토스트 (2026-11-21): 아래 길 밑은 대기석 자리라 위 알림 띠(배너와 같은 줄)에 — 토스트가 떠 있는 동안 배너는 잠깐 숨는다
export const TOAST_Y = BOTTOM_BAND ? (BOTTOM_BAND[0] + BOTTOM_BAND[1]) / 2 : BANNER_Y;
/** 배너·토스트 최대 너비: 세로는 화면 폭, 가로는 몬스터 길 사각형 폭 (가로 토스트는 독 바로 위) */
const NOTICE_W = RING.x1 - RING.x0 + 24;

/** HUD 배치. 세로 = 위 상태 창·유물 줄 + 아래 버튼·정보 창.
 *  가로(2026-11-15 B-2 포근한 카드형) = 위 가운데 알약 바(웨이브·타이머·골드·몬스터·유물) + 아래 가운데 독(용병 카드·고용·x1/정지/메뉴) */
export const HUD = {
      top: { x: 0, y: 0, w: GAME_W, h: HUD_TOP_H }, // 위 바 (화면 위·좌우 끝에 붙음, 내용은 가운데 150~1130)
      cy: HUD_TOP_H / 2, // 위 바 가운데 y
      relic: { x: 990, y: HUD_TOP_H / 2 - 18, w: 132 }, // 유물 칸 4개 자리 (위 바 내용 오른쪽 끝)
      hp: { x: 836, y: HUD_TOP_H / 2 - 13, w: 144, h: 26 }, // 성벽 체력 막대 (골드 오른쪽 ~ 유물 칸 왼쪽)
      dark: { x: 0, y: HUD_DOCK_Y, w: GAME_W, h: GAME_H - HUD_DOCK_Y }, // 아래 독: 상점 6칸 + 영지·리롤 + 배속·메뉴·강화 (화면 아래·좌우 끝에 붙음, 내용은 가운데 150~1130)
      shop: { x: 172, y: 622, w: 612, h: 84 }, // 상점 칸 (선택한 용병이 있으면 그 자리에 용병 카드)
      estate: { x: 871, y: 645, w: 150, h: 42 }, // 버튼 가운데
      reroll: { x: 871, y: 690, w: 150, h: 34 },
      small: { y: 664, xs: [980, 1032, 1084], w: 46, h: 64 }, // 배속(→정지) · 메뉴 · 강화
      // 시너지 (2026-11-24 사용자 시안): 위 바 가운데 탭 안에 상징 한 줄 + 아래 숫자 — 왼쪽 세로 목록 대신
      syn: { x: TOP_TAB.x0, y: HUD_TOP_H, w: TOP_TAB.x1 - TOP_TAB.x0, h: TOP_TAB.depth, cx: GAME_W / 2, iy: HUD_TOP_H + 10, step: 34 },
      // 아이템 띠 5×2 (2026-11-24 사용자 시안: 오른쪽 아래, 아래 독 바로 위)
      bench: { x: 1054, y: 448, w: 210, h: 140, smith: { x: 1206, y: 469, w: 96, h: 30 }, tool: { x: 1159, y: 572 } },
      // 대기석 8칸 (2026-11-22 PC 전환): 오른쪽 칸(시너지 목록과 마주 보게) 4×2 — 칸 44x48 (월드 66x72, 용병 그림 48px)
      // 대기석 8칸 (2026-11-24 사용자 시안): 아래 독 가운데 탭 안에 한 줄 — 칸 34x34 (화면 51px, 캐릭터는 칸 모양으로 잘림)
      reserve: { x: BOTTOM_TAB.x0, y: HUD_DOCK_Y - BOTTOM_TAB.depth, w: BOTTOM_TAB.x1 - BOTTOM_TAB.x0, h: BOTTOM_TAB.depth, cols: 8, tab: true, slot: { x0: GAME_W / 2 - 151, y0: HUD_DOCK_Y - 36, step: 38, stepY: 0, w: 34, h: 34, style: 'slotSq', r: 9 } }
    };
/** 가운데 창(스킬 정보·메뉴·보상) 최대 너비 — 가로 화면에서 끝까지 늘어나지 않게 */
export const MODAL_W = 520;

/** 상점 카드 (2026-11-25 시안): 화면 밖으로 더 그린 길이 · 쉬는 자리 내림 · 올렸을 때 원래 자리보다 더 뜨는 양 · 밀려 올라오기·스프링 시간 */
const CARD = { ext: 48, sink: 8, lift: 3, slideMs: 110, springMs: 400 };

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
    return this.createTopWide();
  }

  /** 가로 B-2: 위 가운데 알약 바 한 줄 — [WAVE n] [지역·다음·최고] | [시계 타이머] [바로 시작] [골드] [몬스터 수] [유물 칸] */
  createTopWide() {
    const s = this.s;
    const D = DEPTH.ui;
    const T = HUD.top;
    const cy = HUD.cy;
    tabBar(s, 'top', T.h, TOP_TAB).setDepth(D - 1); // 2026-11-24: 가운데 탭(시너지 한 줄)이 달린 위 바
    const X0 = 150; // 내용 시작 (바는 화면 끝까지, 내용은 예전 알약 바 자리 150~1130)
    this.waveText = uiText(s, X0 + 28, cy, 'WAVE 0', 22, CSS.primary, 'bold').setOrigin(0, 0.5).setDepth(D);
    this.waveTypeText = uiText(s, X0 + 140, cy, '', 12, CSS.sub, '600').setOrigin(0, 0.5).setDepth(D);
    const sep = s.add.graphics().setDepth(D);
    sep.fillStyle(C.line, 1).fillRect(X0 + 364, cy - 14, 2, 28);
    const clock = s.add.graphics().setDepth(D);
    drawIcon(clock, 'clock', X0 + 388, cy, 14, C.sub);
    this.timerText = uiText(s, X0 + 402, cy, '', 12, CSS.ink, '600').setOrigin(0, 0.5).setDepth(D);
    this.nextWaveBtn = new Button(s, X0 + 512, cy, 70, 26, '바로 시작', () => s.callNextWave(), { variant: 'primary', fontSize: 12 }); // 2026-11-21 작게 (이전 88x32, 74x30 은 되돌림)
    const coin = s.add.graphics().setDepth(D);
    drawIcon(coin, 'coin', X0 + 586, cy, 16, 0x6a4a10);
    this.goldText = uiText(s, X0 + 600, cy, '', 16.5, CSS.ink, 'bold').setOrigin(0, 0.5).setDepth(D);
    this.createHpBar(D, 13);
    this.relicLabel = null;
    this.relicRow = s.add.container(0, 0).setDepth(D);
    // 빈 유물 자리 4칸 (점선 대신 옅은 칸)
    // 2026-11-24: 빈 칸·장착 칸 모두 같은 원(지름 28, 테두리 2) — 장착 칸이 입술 달린 금색 판이라 빈 칸보다 커 보였다
    this.relicEmpty = [0, 1, 2, 3].map((i) => discImage(s, this.relicPos(i, 4).x, cy, { r: 13, fill: 0xf3ead2, line: 0xe3d6b6, lw: 2 }).setDepth(D - 1));
    this.noRelicText = { setVisible: () => {} };
    // 시너지 (2026-11-24 사용자 시안): 위 바 가운데 탭 안에 상징 한 줄
    const SY = HUD.syn;
    this.synRow = s.add.container(0, 0).setDepth(D);
    this.noSynText = uiText(s, SY.cx, SY.y + SY.h / 2 - 4, '', 12, CSS.sub, 'bold') // 2026-11-25: 안내 문장 없음 (빈 탭 = 시너지 없음).setOrigin(0.5).setDepth(D);
  }

  /** 성벽 체력 막대: 둥근 바탕 + 채움(많을수록 초록 → 노랑 → 빨강) + 실드(하늘색 윗줄) + 가운데 하트·수치 */
  createHpBar(D, fontSize) {
    const s = this.s;
    const B = HUD.hp;
    // 외곽 4px (2026-11-21 사용자 요청: 더 두껍게, 이전 2px) — 2026-11-23: 바탕은 미리 그린 알약 (곡선이 고르게)
    this.hpBg = pillImage(s, B.x + B.w / 2, B.y + B.h / 2, B.w, B.h, 0x6b5320, 0xb7923b, HP_LINE).setDepth(D); // 2026-11-25 시안: 금갈색 테두리 · 빈 곳 진한 금색
    this.hpBg.layerName = '체력 막대 바탕';
    this.hpFill = s.add.graphics().setDepth(D);
    // 채움·실드·피해 자국을 막대 안쪽 알약 모양으로 잘라 그린다 (2026-11-25: 실드 줄 왼쪽 끝이 각지게 삐져나왔다)
    const iw = B.w - HP_LINE * 2;
    const ih = B.h - HP_LINE * 2;
    const clip = s.make.graphics({ add: false }).fillStyle(0xffffff, 1).fillRoundedRect(B.x + HP_LINE, B.y + HP_LINE, iw, ih, ih / 2);
    this.hpFill.setMask(clip.createGeometryMask());
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
      // 2026-11-25 시안(사용자 그림): 노랑 채움 + 밝은 노랑 윗줄 — 30% 이하만 빨강(위험)
      const low = pct <= 0.3;
      const w = Math.max(ih, fill); // 둥근 끝이 뭉개지지 않게 최소 높이만큼
      g.fillStyle(low ? 0xd2473a : 0xffdd4a, 1).fillRoundedRect(x, y, w, ih, ih / 2);
      g.fillStyle(low ? 0xe8766a : 0xffe47d, 1).fillRoundedRect(x + 3, y + 2, Math.max(0, w - 6), Math.max(2, Math.round(ih * 0.4)), 3);
    }
    // 실드 하늘색 윗줄은 없앰 (2026-11-25 사용자 요청) — 실드 양은 수치 '80+20' 로만
  }

  /** 유물 칸 위치: 세로는 유물 줄에 36px 간격, 가로는 알약 바 오른쪽 132px 안에 (많으면 좁혀 겹친다) */
  relicPos(i, n) {
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
      this.fitText(this.waveTypeText, 210);
    }
    this.goldText.setText(`${s.gold.toLocaleString()} G`);
    // 가로 알약 바: 골드가 길어지면(수만 G) 체력 막대에 닿지 않게 글자를 줄인다
    this.goldText.setFontSize(this.goldText.text.length > 8 ? 13 : 16.5);

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
      const slot = discImage(s, x, y, { r: 13, fill: 0xe2b54a, line: 0xa8801c, lw: 2 });
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
    const pad = 16;
    const w = Math.ceil((Math.max(title.width + state.width + 12, desc.width) + pad * 2) / UI_PX) * UI_PX;
    const h = 72; // 2026-11-25: 안내 줄 삭제 (이전 96)
    const left = Phaser.Math.Clamp(Math.round((x - w / 2) / UI_PX) * UI_PX, 8, GAME_W - 8 - w);
    const top = y + 24;
    const bg = panel(s, left, top, w, h, 'card');
    title.setPosition(left + pad, top + 14);
    state.setPosition(left + pad + title.width + 12, top + 17);
    desc.setPosition(left + pad, top + 42);
    c.add([bg, title, state, desc]);
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
    tabBar(s, 'bottom', K.y, BOTTOM_TAB).setDepth(D - 2); // 화면 아래·좌우 끝까지 붙는 크림 바 + 가운데 탭(대기석 한 줄) (2026-11-24)
    const SM = HUD.small;
    const v = 'outline';
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
      // 2026-11-25 시안: 카드 아래를 화면 밖까지 넉넉히 그리고 살짝 내려 둔다 — 마우스가 오면 위로 밀려 올라와 톡 튄다
      const c = s.add.container(x, y + CARD.sink);
      const g = s.add.graphics();
      c.add(g);
      if (!slot || slot.sold) {
        g.fillStyle(0xe7dcbb, 0.7).fillRoundedRect(0, 0, w, h + CARD.ext, { tl: 10, tr: 10, bl: 0, br: 0 });
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
      // 2026-11-25 시안: 아래 모서리 직각 (위만 둥글게)
      g.fillStyle(gc, 1).fillRoundedRect(0, 0, w, h + CARD.ext, { tl: 10, tr: 10, bl: 0, br: 0 });
      g.fillStyle(slot.locked ? 0xfff1c8 : 0xfffaf0, 1).fillRoundedRect(3, 3, w - 6, h - 6, { tl: 7, tr: 7, bl: 0, br: 0 });
      g.fillStyle(gc, 1).fillRect(0, h - 20, w, 20 + CARD.ext); // 이름 띠가 화면 밖까지 이어진다
      const img = charImage(s, w / 2, 32, ch);
      // 이름(왼쪽) + 가격(오른쪽)을 띠 한 줄에 나눠 — 이름이 길면 이름만 줄여 가격은 늘 보인다 (2026-11-21)
      const tc = ch.grade === 2 ? CSS.white : '#2b1d2f';
      const pt = uiText(s, w - 5, h - 10, `${price}G`, 12, tc, 'bold').setOrigin(1, 0.5);
      const nm = uiText(s, 5, h - 10, ch.name, 12, tc, 'bold').setOrigin(0, 0.5);
      this.fitText(nm, w - 10 - pt.width - 4);
      c.add([img, nm, pt]);
      // 계열·출신 상징 (2026-11-21: 아래 가운데 · 글자 대신 모양 그림) — 이름 띠·서로 4px 이상 띄운다 (여백 필수 규칙)
      [ch.cls, ch.origin].forEach((k, j) => c.add(traitBadge(s, w / 2 + (j ? 13 : -13), h - 20 - 5 - 10, k, 9)));
      // 같은 캐릭터가 이미 있으면 몇 장인지 (별 승급까지)
      if (owned) c.add(uiText(s, 5, 5, `${owned}장`, 12, CSS.primary, 'bold').setOrigin(0, 0)); // 2026-11-24: 잠금이 오른쪽 위로 가서 왼쪽 위로
      if (!afford) c.add(s.add.rectangle(0, 0, w, h + CARD.ext, 0x2b1d2f, 0.28).setOrigin(0));
      const hit = s.add.rectangle(0, 0, w, h - 4, 0xffffff, 0.001).setOrigin(0).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => c.setScale(0.96));
      hit.on('pointerout', () => c.setScale(1));
      hit.on('pointerup', () => {
        c.setScale(1);
        s.buy(i);
      });
      c.add(hit);
      // 잠금 (2026-11-24 사용자 요청: 위 가운데 → 오른쪽 위)
      const lk = s.add.graphics();
      lk.fillStyle(slot.locked ? 0xe0a32a : 0xffffff, slot.locked ? 1 : 0.85).fillRoundedRect(w - 25, 7, 18, 18, 5);
      drawIcon(lk, slot.locked ? 'lock' : 'unlock', w - 16, 16, 12, slot.locked ? 0x3a2608 : 0x8c7b60);
      const lz = s.add.rectangle(w - 30, 2, 28, 28, 0xffffff, 0.001).setOrigin(0).setInteractive({ useHandCursor: true });
      lz.on('pointerup', () => s.toggleLock(i));
      c.add([lk, lz]);
      c.slotIndex = i;
      this.cardHover(c, [hit, lz], x, y, w, h);
      this.shopBox.add(c);
    });
    this.refreshShopButtons();
  }

  /**
   * 상점 카드 마우스 반응 (2026-11-25 시안): 올리면 쉬는 자리(살짝 아래)에서 위로 밀려 올라온 뒤 0.4초 스프링으로 톡 튄다,
   * 카드 밖으로 나가면 다시 내려간다. 카드 안의 잠금 단추로 옮겨 가도 올라간 그대로
   */
  cardHover(c, zones, x, y, w, h) {
    const s = this.s;
    const up = () => {
      if (c.hovered) return;
      c.hovered = true;
      s.tweens.killTweensOf(c);
      s.tweens.add({
        targets: c, y: y + 1, duration: CARD.slideMs, ease: 'Quad.easeOut',
        onComplete: () => s.tweens.add({ targets: c, y: y - CARD.lift, duration: CARD.springMs, ease: 'Elastic.easeOut', easeParams: [1.2, 0.45] })
      });
    };
    const down = (p) => {
      const u = uiPoint(s, p);
      if (u.x >= x && u.x <= x + w && u.y >= y - CARD.lift && u.y <= y + h + CARD.sink) return; // 카드 안 다른 단추로 옮겨 감
      c.hovered = false;
      s.tweens.killTweensOf(c);
      s.tweens.add({ targets: c, y: y + CARD.sink, duration: 160, ease: 'Quad.easeOut' });
    };
    for (const z of zones) {
      z.on('pointerover', up);
      z.on('pointerout', down);
    }
  }

  // ───────────────────────── 아이템 띠 (룰 v2 ②, 2026-11-20) ─────────────────────────
  /** 아이템 띠: 세로는 아래쪽 몬스터 길과 하단 시트 사이, 가로는 왼쪽 시너지 목록 아래 */
  createBench() {
    const s = this.s;
    const D = DEPTH.ui;
    const B = HUD.bench;
    if (!B.inCard) panel(s, B.x, B.y, B.w, B.h, 'card').setDepth(D - 1);
    uiText(s, B.x + 18, B.y + 16, '아이템', 15, CSS.primary, 'bold').setDepth(D);
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
    if (!R.tab) panel(s, R.x, R.y, R.w, R.h, 'card').setDepth(D - 1);
    this.reserveLabel = R.tab ? null : R.title
      ? uiText(s, R.x + 18, R.y + 16, '대기석', 15, CSS.primary, 'bold').setDepth(D)
      : uiText(s, R.x + 28, R.y + R.h / 2, '대기', 12, CSS.sub, 'bold').setOrigin(0.5).setDepth(D);
    for (let i = 0; i < SHOP.reserve; i++) {
      const p = this.reservePos(i);
      (this.reserveImgs ||= [])[i] = panelImage(s, p.x, p.y, R.slot.style || 'soft', R.slot.w, R.slot.h).setDepth(D);
    }
  }

  /** 대기석 칸 (2026-11-24 사용자 요청): 캐릭터가 있는 칸은 상점 카드처럼 테두리 = 등급색 · 안쪽 = 밝은 바탕 — 칸 모양 그대로라 빈 칸과 맞는다. 매 프레임 바뀐 칸만 */
  paintReserve() {
    const R = HUD.reserve;
    if (!R || !this.reserveImgs) return;
    this.s.reserve.forEach((u, i) => {
      const g = u && u.active && !u.dragging ? u.grade : 0;
      const img = this.reserveImgs[i];
      if (img.gradeShown === g) return;
      img.gradeShown = g;
      img.setTexture(panelKey(this.s, g ? `grade${g}` : R.slot.style || 'soft', R.slot.w, R.slot.h));
    });
  }

  /** 대기석 칸 크기 (Mercenary 가 등급색 테두리를 그릴 때) */
  get reserveSlot() {
    return HUD.reserve?.slot;
  }

  /** 대기석 i 칸 가운데 */
  reservePos(i) {
    const R = HUD.reserve;
    if (R.cols) {
      const col = i % R.cols;
      const row = Math.floor(i / R.cols);
      return { x: R.slot.x0 + col * R.slot.step + R.slot.w / 2, y: R.slot.y0 + row * R.slot.stepY + R.slot.h / 2 };
    }
    return { x: R.slot.x0 + i * R.slot.step + R.slot.w / 2, y: R.y + R.h / 2 };
  }

  /** (x, y) 가 대기석 몇 번 칸 위인지 (아니면 -1) */
  reserveSlotAt(x, y) {
    const R = HUD.reserve;
    if (!R || y < R.y || y > R.y + R.h || x < R.x || x > R.x + R.w) return -1;
    for (let i = 0; i < SHOP.reserve; i++) {
      const p = this.reservePos(i);
      if (Math.abs(x - p.x) <= R.slot.step / 2 && Math.abs(y - p.y) <= (R.slot.stepY || R.h) / 2) return i;
    }
    return -1;
  }

  benchPos(i) {
    const B = HUD.bench;
    return { x: B.x + 29 + (i % 5) * 38, y: B.y + 58 + Math.floor(i / 5) * 38 };
  }

  /** 아이템 그림: 재료는 색 칸 + 글자, 조합품은 두 재료 색 반반 + 금 테두리, 문장은 시너지 색 방패 */
  itemIcon(id, x, y, size = 30, px = UI_PX) {
    // 아이템 그림 (2026-11-21): 12x12 전용 도트 그림(docs/drafts/item-icons/items.py → item_<id>)을 2px 로. 칸 배경: 조합품은 금 테두리
    const s = this.s;
    const it = ITEM_BY_ID[id];
    const c = s.add.container(x, y);
    // 2026-11-21 사용자 요청: 아이콘 외곽(칸 배경·테두리) 제거 — 그림만. 누르는 영역은 그림 크기
    c.setSize(size, size);
    if (s.textures.exists(`item_${id}`)) c.add(s.add.image(0, 0, `item_${id}`).setScale(px));
    else c.add(uiText(s, 0, 0, it.glyph || it.name[0], 13, CSS.ink, 'bold').setOrigin(0.5));
    return c;
  }


  refreshBench() {
    const s = this.s;
    if (!this.benchRow) return;
    this.benchRow.removeAll(true);
    for (let i = 0; i < ITEM_RULES.bench; i++) {
      const p = this.benchPos(i);
      this.benchRow.add(panelImage(s, p.x, p.y, 'round', 32, 32)); // 동그란 칸 (2026-11-23: 반지름 14 의 둥근 네모 → 원)
    }
    s.bench.forEach((id, i) => {
      const p = this.benchPos(i);
      const ic = this.itemIcon(id, p.x, p.y, 28);
      ic.setSize(32, 32).setInteractive({ draggable: true, useHandCursor: true });
      ic.on('pointerover', () => this.showItemTip(id, p.x, p.y, 16));
      ic.on('pointerout', () => this.hideRelicTip());
      ic.on('dragstart', () => {
        audio.pick();
        this.hideRelicTip();
        this.benchRow.remove(ic);
        ic.setDepth(DEPTH.drag); // UI(200) 위 — 끌고 가는 그림이 상점·시트 아래로 숨지 않게
        s.add.existing(ic);
      });
      ic.on('drag', (ptr) => {
        const u = uiPoint(s, ptr);
        ic.setPosition(u.x, u.y);
      });
      ic.on('dragend', (ptr) => {
        const w = worldPoint(s, ptr); // 용병은 월드 좌표 (2026-11-22 PC 전환)
        const m = s.allUnits.find((u) => Math.abs(u.x - w.x) < 28 && Math.abs(u.y - w.y) < 28); // 대기석 캐릭터에도 장착
        ic.destroy();
        if (!m || !s.equip(i, m)) this.refreshBench();
      });
      this.benchRow.add(ic);
    });
    this.smithBtn?.setLabel(`재료 ${s.smithCost}G`).setEnabled(s.gold >= s.smithCost && s.bench.length < ITEM_RULES.bench);
    this.toolText?.setText(`해제 도구 ${s.tools}개`);
  }

  /**
   * 아이템 툴팁: 이름·효과 (재료는 조합표 — 줄마다 재료·결과 그림, 2026-11-22)
   * (x, y) = 아이콘 가운데, half = 아이콘 반 높이. 세로는 아이콘 아래에 띄우고(위로 띄우면 위 카드에서 화면 밖으로 잘림),
   * 아래 자리가 모자라면 위로 뒤집는다
   */
  showItemTip(id, x, y, half = 16) {
    const s = this.s;
    this.hideRelicTip();
    const it = ITEM_BY_ID[id];
    const c = s.add.container(0, 0).setDepth(DEPTH.overlay - 0.5);
    // 툴팁 속 아이템 그림은 화면에서 아트 1px = 1px (2026-11-22 사용자 요청) — 툴팁 전체 배율(ITEM_TIP_SCALE)을 되돌려 놓는다
    const icon = (k) => (s.textures.exists(`item_${k}`) ? s.add.image(0, 0, `item_${k}`).setScale(1 / ITEM_TIP_SCALE).setOrigin(0, 0.5) : null);
    /** 한 줄 = [{obj, w}] 를 왼쪽부터 4px 간격으로 */
    const row = (parts) => {
      const r = s.add.container(0, 0);
      let rx = 0;
      let rh = 0;
      for (const o of parts.filter(Boolean)) {
        o.setOrigin(0, 0.5).setPosition(rx, 0);
        r.add(o);
        rx += o.displayWidth + 4;
        rh = Math.max(rh, o.displayHeight);
      }
      r.width = Math.max(0, rx - 4);
      r.height = rh;
      return r;
    };
    const lines = [
      row([icon(id), uiText(s, 0, 0, it.name, 15, CSS.ink, 'bold')]),
      row([uiText(s, 0, 0, it.text, 12, CSS.primary, '600', { wordWrap: { width: 300 } })])
    ];
    if (isComponent(id)) {
      lines.push(row([uiText(s, 0, 0, '같은 캐릭터에 재료 2개 → 자동 조합', 12, CSS.sub, '600')]));
      for (const r of recipesWith(id)) {
        const res = ITEM_BY_ID[r.result];
        const w2 = ITEM_BY_ID[r.with];
        lines.push(
          row([
            uiText(s, 0, 0, '+', 12, CSS.sub, 'bold'),
            icon(r.with),
            uiText(s, 0, 0, w2.name, 12, CSS.ink, '600'),
            uiText(s, 0, 0, '→', 12, CSS.sub, 'bold'),
            res ? icon(r.result) : null,
            uiText(s, 0, 0, res ? res.name : '출신 문장(출신을 고름)', 12, res ? CSS.primary : CSS.ink, 'bold')
          ])
        );
      }
    }
    const pad = 12;
    const w = Math.ceil((Math.max(...lines.map((l) => l.width)) + pad * 2) / UI_PX) * UI_PX;
    let h = pad;
    for (const l of lines) h += l.height + 4;
    h += pad - 4;
    // 아이콘 오른쪽에 — 자리가 없으면(2026-11-24: 아이템 띠가 오른쪽 아래) 왼쪽에. 줄어든 크기(ITEM_TIP_SCALE)로 판단
    const sw = w * ITEM_TIP_SCALE;
    const toLeft = x + 30 + sw > GAME_W - 8;
    const left = toLeft ? x - 30 - w : Math.max(8, x + 30); // 오른쪽은 줄어든 폭으로 이미 화면 안 (원래 폭으로 맞추면 아이콘 위로 당겨졌다)
    let top;
    top = Phaser.Math.Clamp(y - h / 2, 80, GAME_H - h - 8);
    c.add(panel(s, left, top, w, h, 'card'));
    let cy = top + pad;
    for (const l of lines) {
      l.setPosition(left + pad, cy + l.height / 2);
      cy += l.height + 4;
      c.add(l);
    }
    // 유물 툴팁과 같은 스프링 등장 (2026-11-21) — 아이콘 쪽 가장자리가 축.
    // 크기는 배치 그대로 비율만 ITEM_TIP_SCALE 로 줄인다 (2026-11-22 사용자 요청) — 축 쪽으로 줄어 아이콘과 간격 유지
    springTip(s, c, toLeft ? left + w : left, Phaser.Math.Clamp(y, top, top + h), true, ITEM_TIP_SCALE); // 축 = 아이콘 쪽 가장자리
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
    // 2026-11-24 사용자 시안: 위 바 탭 안 가로 한 줄 — 상징(켜진 것은 색, 꺼진 것은 옅게) + 아래 '모은 수/다음 단계'
    const SY = HUD.syn;
    const max = Math.floor((SY.w - 24) / SY.step);
    const shown = list.slice(0, max);
    const x0 = SY.cx - ((shown.length - 1) * SY.step) / 2;
    shown.forEach((k, i) => {
      const t = TRAITS[k];
      const n = counts[k];
      const ti = tierIndex(k, n);
      const next = t.tiers.find((x) => x.n > n);
      const on = ti >= 0;
      const x = Math.round(x0 + i * SY.step);
      const y = SY.iy;
      const c = s.add.container(x, y);
      c.add(traitBadge(s, 0, 0, k, 9, on, { tip: false })); // 자기 시너지 툴팁이 따로 있다 (2026-11-25 시안: r 11 → 9)
      const label = next ? `${n}/${next.n}` : `${n}`;
      c.add(uiText(s, 0, 14, label, 10, on ? CSS.primary : CSS.sub, 'bold').setOrigin(0.5, 0)); // 상징(지름 20)과 4px
      const hit = s.add.rectangle(0, 7, SY.step - 4, 34, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
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
    // 2026-11-24: 위 바 탭의 상징 바로 아래에 (탭 아래 끝에서 6px)
    const left = Phaser.Math.Clamp(x - w / 2, 8, GAME_W - 8 - w);
    const top = HUD.syn.y + HUD.syn.h + 6;
    c.add(panel(s, left, top, w, h, 'card'));
    let cy = top + pad;
    for (const l of lines) {
      l.setPosition(left + pad, cy);
      cy += l.height + 6;
      c.add(l);
    }
    // 유물 툴팁과 같은 스프링 등장 (2026-11-21) — 칩 쪽 가장자리가 축
    springTip(s, c, Phaser.Math.Clamp(x, left, left + w), top); // 상징 쪽(위 가운데)이 축
    this.relicTip = { index: -1, x, y, container: c };
  }

  /** 명성 강화 버튼 (2026-11-18: 필드 성탑 대신). 살 수 있는 노드가 있으면 "!" 가 통통 튄다 */
  createUpgradeButton(SM, variant, fontSize) {
    const s = this.s;
    const x = SM.xs[2], y = SM.y;
    this.upgradeBtn = new Button(s, x, y, SM.w, SM.h, '강화', () => s.openUpgrades(), { variant, icon: 'tower', fontSize });
    // 쉬는 크기에서 오른쪽 이웃(영지 버튼)·위 상점 칸과 4px 이상 (2026-11-22) — 톡 커질 때만 잠깐 가까워진다
    this.upgradeBadge = s.add.container(x + SM.w / 2 - 10, y - SM.h / 2 + 2).setDepth(DEPTH.ui + 2).setVisible(false);
    this.upgradeBadge.auditBox = { x: -13.5, y: -13.5, w: 27, h: 27 }; // tools/ui-audit.cjs 여백 검사 (쉬는 크기 기준)
    this.upgradeBadge.auditRest = true;
    // 느낌표 배지 (2026-11-21: 더 크게 r 12, 느낌표는 글자 대신 굵은 도형 — 막대 4x10 + 점 4x4)
    // 2026-11-23: 원·느낌표를 미리 그린 그림 하나로 (곡선이 고르게)
    const disc = discImage(s, 0, 0, {
      id: 'upgrade_badge', r: 12, fill: 0xffd36a, line: 0x3a2608, lw: 8 / 3,
      draw: (ctx) => { ctx.fillStyle = '#3a2608'; ctx.beginPath(); ctx.roundRect(-2, -9, 4, 11, 1.5); ctx.fill(); ctx.fillRect(-2, 4, 4, 4); }
    });
    disc.layerName = '느낌표 배지';
    this.upgradeBadge.add(disc);
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
    this.infoTitle = uiText(s, B.x + 80, B.y + 5, '', 15, CSS.ink, 'bold');
    this.infoSub = uiText(s, B.x + 80, B.y + 27, '', 12, CSS.sub, 'bold');
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
    if (!m) {
      // 카드가 닫히면 카드 아이템 툴팁도 닫는다 (pointerout 없이 남아 상점 칸을 가리던 문제, 2026-11-22)
      if (this.infoItemKey) this.hideRelicTip();
      this.infoItemKey = null;
      return;
    }
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
      this.infoBadgeRight = bx0 + 22 + 9; // 두 번째 배지 오른쪽 끝 (외곽선 포함)
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
    this.infoBody.setY(B.y + 45); // 가로(높이 84)는 줄마다 4px 여백이 남게 촘촘히
    if (!this.manaText) {
      this.manaText = uiText(s, 0, 0, '', 12, CSS.sub, 'bold').setOrigin(0, 0.5);
      this.infoBox.add(this.manaText);
    }
    this.manaText.setPosition(mx + mw + 8, my + 4).setText(`${Math.floor(m.mana)}/${m.maxMana} 「${m.def.name}」`);
    this.fitText(this.manaText, textW - mw - 8);
    this.sellBtn.setLabel(`판매 +${Math.floor(m.invested * s.sellRefund)}G`);
    // 아이템 칸 (최대 3) — 마우스를 올리면 효과. 상징 배지 오른쪽(4px 이상)에, 바뀔 때만 다시 만든다
    //   (매번 다시 만들면 올려 둔 아이콘이 사라져 pointerout 이 안 와 툴팁이 남았다, 2026-11-22)
    const iKey = `${m.char.id}|${m.star}|${this.infoTitle.text}|${m.items.join(',')}|${m.x},${m.y}`;
    if (this.infoItemKey === iKey) {
      this.toolBtn.setVisible(s.tools > 0 && m.items.length > 0);
      return;
    }
    this.infoItemKey = iKey;
    this.hideRelicTip();
    this.itemRow.removeAll(true);
    const badgeRight = this.infoBadgeRight ?? this.infoTitle.x + this.infoTitle.width;
    m.items.forEach((id, i) => {
      // 2026-11-22 사용자 요청: 툴팁 속 그림과 같은 크기(12x12, 아트 1px = 화면 1px)로, 상징 배지와 12px 띄움
      const ic = this.itemIcon(id, Math.round(badgeRight + 12 + 6 + i * 18), Math.round(this.infoTitle.y + this.infoTitle.height / 2), 12, 1);
      ic.setSize(18, 18).setInteractive();
      ic.auditBox = { x: -6, y: -6, w: 12, h: 12 }; // tools/ui-audit.cjs 여백 검사
      ic.on('pointerover', () => this.showItemTip(id, ic.x, ic.y, 6));
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
    const y = 96;
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
    add(`같은 캐릭터 3장 → 별 +1 (최대 ${MAX_STAR}성)`, 12, CSS.sub, '600', 4);
    const h = Math.min(GAME_H - y - 24, cy - y + 40);
    const card = panel(s, x, y, w, h, 'card').setInteractive();
    c.addAt(card, 1);
    c.add(titleTab(s, x + w / 2, y, '스킬 정보', 180));
    c.add(closeButton(s, x + w - 6, y + 6, close));
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
    const pw = 440;
    const px = (GAME_W - pw) / 2;
    const py = 80;
    const ph = 560;
    const c = this.modal(DEPTH.overlay - 0.3, px, py, pw, ph, () => this.closeMenu(), '메뉴');
    this.menu = c;
    c.add(uiText(s, GAME_W / 2, py + 52, '일시정지', 13, CSS.sub, '600').setOrigin(0.5));

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
    // 음소거 · VHS 효과(2026-11-24 시험판)를 한 줄에 반씩
    const hw = (bw - 8) / 2;
    const muteBtn = new Button(s, GAME_W / 2 - hw / 2 - 4, py + 252, hw, 50, '', () => {
      audio.toggleMute();
      muteBtn.setLabel(`음소거 ${audio.muted ? '켜짐' : '꺼짐'}`);
    }, { variant: 'outline', fontSize: 16 });
    muteBtn.setLabel(`음소거 ${audio.muted ? '켜짐' : '꺼짐'}`);
    const vhsBtn = new Button(s, GAME_W / 2 + hw / 2 + 4, py + 252, hw, 50, '', () => {
      vhs.toggle();
      vhsBtn.setLabel(`VHS 효과 ${vhs.enabled ? '켜짐' : '꺼짐'}`);
    }, { variant: 'outline', fontSize: 16 });
    vhsBtn.setLabel(`VHS 효과 ${vhs.enabled ? '켜짐' : '꺼짐'}`);
    this.vhsBtn = vhsBtn;
    const resume = new Button(s, GAME_W / 2, py + 322, bw, 56, '계속하기', () => this.closeMenu(), { variant: 'primary', fontSize: 18 });
    let confirmQuit = false;
    const quit = new Button(s, GAME_W / 2, py + 394, bw, 56, '게임 종료', () => {
      if (!confirmQuit) {
        confirmQuit = true;
        quit.setLabel('한 번 더 → 종료');
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
      tutBtn.setLabel('튜토리얼 켜짐');
    }, { variant: 'outline', fontSize: 11 });
    c.add([muteBtn, vhsBtn, resume, quit, tutBtn]);
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


/** 아이템 툴팁 크기 비율 (2026-11-22 사용자 요청: 원래 배치 그대로 작게) */
export const ITEM_TIP_SCALE = 0.75;

/**
 * 툴팁 스프링 등장 (유물 툴팁 2026-11-19 → 모든 툴팁 2026-11-21): (ax, ay) 를 축으로 0.6 → 1, 살짝 넘쳤다 출렁이며 멈춘다 + 0.12초 페이드.
 * 컨테이너 c 안의 것들은 화면 좌표로 넣어 두면 축 기준으로 옮겨 준다
 */
export function springTip(s, c, ax, ay, animate = true, to = 1) {
  c.setPosition(ax, ay);
  c.each((o) => o.setPosition(o.x - ax, o.y - ay));
  if (!animate) return c.setScale(to);
  // 실제 시간으로 직접 돌린다 (2026-11-22): 트윈으로 하면 게임 정지(tweens.pauseAll) 중에 툴팁이 투명한 채로 멈춰 안 보였다
  c.setScale(0.6 * to).setAlpha(0);
  const t0 = performance.now();
  const step = () => {
    if (!c.active) return s.events.off('update', step);
    const t = performance.now() - t0;
    c.setAlpha(Math.min(1, t / 120));
    c.setScale(to * (0.6 + 0.4 * springEase(Math.min(1, t / 520))));
    if (t >= 520) s.events.off('update', step);
  };
  s.events.on('update', step);
  c.once('destroy', () => s.events.off('update', step));
}

