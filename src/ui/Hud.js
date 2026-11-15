// 전투 화면 UI — 상단 상태 창·유물 줄, 하단 버튼·정보 창, 토스트·배너, 스킬 정보 팝업, ESC 메뉴
// GameScene 은 게임 진행만 맡고, 화면 표시는 이 클래스에 맡긴다 (scene.hud).
// 게임 상태는 읽기만 하고, 버튼을 누르면 scene 의 동작(hire, sell, callNextWave …)을 부른다.
import Phaser from 'phaser';
import { GAME_W, GAME_H, PX, FIELD_Y, FIELD_SIZE, PATH_OFF, PATH_WIDTH, DEPTH } from '../config.js';
import { MAX_LEVEL } from '../objects/Mercenary.js';
import { Button } from './Button.js';
import { panel, panelKey, panelImage, titleTab, closeButton, uiText, drawIcon, onLight, C, CSS, ATTR_CSS_DARK } from './theme.js';
import { ATTR_INFO, strongAgainst, weakAgainst } from '../data/elements.js';
import { HEROES } from '../data/heroes.js';
import { skillOptions, describeSkill, ELEMENT_FLAVOR } from '../data/skills.js';
import { RELIC_BY_ID } from '../data/relics.js';
import { TOTAL_WAVES, waveInfo } from '../data/waves.js';
import { PATH_LENGTH } from '../systems/path.js';
import { setArt, playBase } from '../systems/customArt.js';
import { audio } from '../systems/audio.js';

// 알림 띠 위치: 필드·몬스터 길 바깥의 빈 공간 가운데
const TOP_BAND = [180, FIELD_Y - PATH_OFF - PATH_WIDTH / 2]; // 유물 줄 아래 ~ 위쪽 길 바깥 가장자리
const BOTTOM_BAND = [FIELD_Y + FIELD_SIZE + PATH_OFF + PATH_WIDTH / 2, 776]; // 아래쪽 길 바깥 가장자리 ~ 하단 패널
export const BANNER_Y = (TOP_BAND[0] + TOP_BAND[1]) / 2;
export const TOAST_Y = (BOTTOM_BAND[0] + BOTTOM_BAND[1]) / 2;

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
  //  배너(웨이브 시작·보스 등장·유물 획득 등): 유물 줄과 위쪽 몬스터 길 사이 (y 180~232)
  //  토스트(고용·골드 부족 등 짧은 안내): 아래쪽 몬스터 길과 하단 패널 사이 (y 728~776)

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
    const t = uiText(s, 0, 0, msg, 13, color === '#ffffff' ? CSS.white : color, 'bold').setOrigin(0.5);
    this.fitText(t, GAME_W - 64);
    const w = Math.min(GAME_W - 32, Math.ceil((t.width + 32) / PX) * PX);
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
    const w = GAME_W - 24;
    const h = 40; // 테두리 그림자 포함 48px → 띠(52px) 안에 들어간다
    const bg = panelImage(s, 0, 0, 'card', w, h);
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
    const s = this.s;
    const D = DEPTH.ui;
    // 상태 창 (높이 120) + 초록 제목 탭(웨이브)
    panel(s, 12, 16, GAME_W - 24, 120, 'card').setDepth(D - 1);
    const [tabImg, tabText] = titleTab(s, GAME_W / 2, 16, 'WAVE 0 / 100', 220);
    tabImg.setDepth(D);
    this.waveText = tabText.setDepth(D);
    this.waveTypeText = uiText(s, 32, 56, '', 12, CSS.sub, 'bold').setOrigin(0, 0.5).setDepth(D);

    // 타이머 슬롯 + 바로 시작 버튼
    panel(s, GAME_W - 220, 44, 108, 24, 'soft').setDepth(D);
    const clock = s.add.graphics().setDepth(D);
    drawIcon(clock, 'clock', GAME_W - 204, 56, 12, C.ink);
    this.timerText = uiText(s, GAME_W - 192, 56, '', 12, CSS.ink, 'bold').setOrigin(0, 0.5).setDepth(D);
    this.nextWaveBtn = new Button(s, GAME_W - 68, 56, 84, 28, '바로 시작', () => s.callNextWave(), { variant: 'primary', fontSize: 12 });
    this.bossText = uiText(s, GAME_W - 32, 78, '', 12, CSS.red, 'bold').setOrigin(1, 0.5).setDepth(D);

    // 골드 / 몬스터 수
    const coin = s.add.graphics().setDepth(D);
    drawIcon(coin, 'coin', 42, 94, 18, 0x6a4a10);
    this.goldText = uiText(s, 58, 94, '', 22, CSS.ink, 'bold').setOrigin(0, 0.5).setDepth(D);
    const skull = s.add.graphics().setDepth(D);
    drawIcon(skull, 'monster', GAME_W - 152, 96, 18, C.ink);
    this.countText = uiText(s, GAME_W - 32, 96, '', 22, CSS.ink, 'bold').setOrigin(1, 0.5).setDepth(D);
    // 진행 막대
    panel(s, 32, 108, GAME_W - 64, 16, 'soft').setDepth(D);
    this.countBar = s.add.graphics().setDepth(D);

    // 유물 줄 (높이 36)
    panel(s, 12, 144, GAME_W - 24, 36, 'card').setDepth(D - 1);
    this.relicLabel = uiText(s, 30, 162, '유물', 13, CSS.ink, 'bold').setOrigin(0, 0.5).setDepth(D);
    this.relicRow = s.add.container(0, 0).setDepth(D);
    this.noRelicText = uiText(s, 96, 162, `보스를 처치하면 유물을 얻어요 (최대 ${s.maxRelics}개 활성)`, 12, CSS.sub, 'bold')
      .setOrigin(0, 0.5)
      .setDepth(D);
  }

  /** 상단·하단 숫자와 버튼 상태를 게임 상태에 맞춘다 (0.1초마다 + 상태가 바뀔 때) */
  refresh() {
    const s = this.s;
    const nextWave = s.wave + 1;
    this.waveText.setText(`${s.difficulty ? 'HARD' : 'WAVE'} ${s.wave} / ${TOTAL_WAVES}`);
    if (s.wave < TOTAL_WAVES) {
      const label = s.wave === 0 ? '시작' : '다음';
      this.timerText.setText(`${label} ${Math.ceil(Math.max(0, s.waveTimer))}초`);
      const ni = waveInfo(nextWave);
      const extra = { elite: '+정예', boss: '+보스', milestone: '+정예+강화보스', final: '+최종보스' }[ni.type] || '';
      this.waveTypeText.setText(`${s.biome.name} · 다음 ${ni.normal}기${extra}`);
    } else {
      this.timerText.setText('최종 웨이브');
      this.waveTypeText.setText(`${s.biome.name} · 모두 처치하세요`);
    }
    const boss = s.monsters.find((m) => m.isBoss && m.alive);
    this.bossText.setText(
      boss
        ? `${boss.revived ? '부활 ' : ''}${boss.enraged ? '분노 ' : ''}보스 ${Math.floor(Math.max(0, boss.dist / PATH_LENGTH) * 100)}% · ${
            boss.abilities.length > 2 ? `디버프 ${boss.abilities.length}종` : boss.abilities.map((a) => a.def.name).join(', ')
          }`
        : ''
    );
    this.goldText.setText(`${s.gold.toLocaleString()} G`);

    const n = s.monsters.length;
    const max = s.maxAlive;
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

    this.nextWaveBtn.setEnabled(s.canCallNextWave);
    this.hireBtn.setLabel(`용병 고용\n${s.hireCost} G${s.relics.contract ? ' (-20%)' : ''}`);
    this.hireBtn.setEnabled(s.gold >= s.hireCost);
    if (s.selected) this.refreshInfo();
  }

  refreshRelics() {
    const s = this.s;
    this.relicRow.removeAll(true);
    this.noRelicText.setVisible(s.ownedRelics.length === 0);
    this.relicLabel.setText(s.ownedRelics.length ? `유물 ${s.activeRelicCount}/${s.maxRelics}` : '유물');
    s.ownedRelics.forEach((r, i) => {
      const x = 108 + i * 36;
      const y = 160;
      const slot = panelImage(s, x, y, r.active ? 'gold' : 'soft', 32, 32);
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
    const w = Math.ceil((Math.max(title.width + state.width + 12, desc.width, hint.width) + pad * 2) / PX) * PX;
    const h = 96;
    const left = Phaser.Math.Clamp(Math.round((x - w / 2) / PX) * PX, 8, GAME_W - 8 - w);
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
    const s = this.s;
    const D = DEPTH.ui;
    // 하단 나무 받침 (높이 176)
    panel(s, 4, 776, GAME_W - 8, 176, 'dark').setDepth(D - 2);
    this.hireBtn = new Button(s, 100, 824, 168, 80, '', () => s.hire(), { variant: 'primary', fontSize: 18 });
    this.speedBtn = new Button(s, 40, 906, 52, 64, 'x1', () => {
      s.speed = s.speed >= 3 ? 1 : s.speed + 1;
      this.speedBtn.setLabel(`x${s.speed}`);
      s.tweens.timeScale = s.speed;
    }, { variant: 'card', icon: 'speed', fontSize: 12 });
    this.pauseBtn = new Button(s, 100, 906, 52, 64, '정지', () => s.togglePause(), { variant: 'card', icon: 'pause', fontSize: 12 });
    this.menuBtn = new Button(s, 160, 906, 52, 64, '메뉴', () => this.toggleMenu(), { variant: 'card', icon: 'menu', fontSize: 12 });

    // 정보 창
    const px = 196;
    const py = 788;
    const pw = GAME_W - px - 16;
    const ph = 160;
    panel(s, px, py, pw, ph, 'card').setDepth(D - 1);
    this.infoAvatar = panelImage(s, px + 44, py + 42, 'soft', 48, 48).setDepth(D).setVisible(false);
    this.infoPortrait = s.add.sprite(px + 44, py + 42, 'pixel').setScale(PX - 1).setDepth(D).setVisible(false);
    this.infoTitle = uiText(s, px + 20, py + 16, '', 16, CSS.ink, 'bold').setDepth(D);
    this.infoSub = uiText(s, px + 78, py + 44, '', 11, CSS.sub, 'bold').setDepth(D);
    this.infoBody = uiText(s, px + 20, py + 44, '', 11, CSS.ink, 'bold', { lineSpacing: 2, wordWrap: { width: pw - 40 } }).setDepth(D);
    this.skillBtn = new Button(s, px + 80, py + ph - 34, 112, 32, '스킬 정보', () => s.selected && this.showSkillPopup(s.selected), {
      variant: 'primary',
      fontSize: 12
    });
    this.sellBtn = new Button(s, px + pw - 80, py + ph - 34, 112, 32, '판매', () => s.selected && s.sell(s.selected), {
      variant: 'outline',
      fontSize: 12
    });
    this.infoBox = { px, py, pw, ph };
  }

  setPaused(paused) {
    this.pauseBtn.setLabel(paused ? '재개' : '정지');
  }

  /** 정보 창: 선택한 용병의 능력치, 선택이 없으면 기본 안내 */
  refreshInfo() {
    const s = this.s;
    const m = s.selected && s.selected.active ? s.selected : null;
    const { px, py } = this.infoBox;
    if (!m) {
      s.selected = null;
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
    const st = m.getStats(s.relics, s.gameTime);
    const info = ATTR_INFO[m.attr];
    this.infoAvatar.setTexture(panelKey(s, m.isHero ? 'gold' : 'soft', 48, 48)).setVisible(true);
    setArt(this.infoPortrait, m.textureKey, PX - 1).setVisible(true);
    playBase(this.infoPortrait, 'idle');
    this.infoTitle.setPosition(px + 78, py + 20).setColor(m.isHero ? CSS.gold : ATTR_CSS_DARK[m.attr]).setText(m.heroName);
    const strong = ATTR_INFO[strongAgainst(m.attr)].name;
    const weak = ATTR_INFO[weakAgainst(m.attr)].name;
    const next = m.isHero ? '최종 단계' : m.level < MAX_LEVEL ? `레벨업 ${s.mergeCostFor(m.level)}G` : `승급 ${s.mergeCostFor(MAX_LEVEL)}G`;
    this.infoSub.setText(m.isHero ? `영웅 · ${m.roleName} · ${next}` : `Lv.${m.level} ${m.roleName} · ${info.name} · ${next}`);
    // 본문은 2줄: 능력치 / (디버프 또는 상성·스킬 수)
    const lines = [
      `공격 ${Math.round(st.damage)} · 공속 ${st.rate.toFixed(2)} · 사거리 ${Math.round(st.range)}${st.buffed && !st.debuff.list.length ? ' (버프)' : ''}`,
      st.debuff.list.length
        ? `디버프: ${st.debuff.list.map((d) => `${d.def.name} ${Math.ceil(d.until - s.gameTime)}초`).join(', ')}`
        : `강함 ${strong} · 약함 ${weak} · 스킬 ${m.skills.length}개`
    ];
    this.infoBody.setPosition(px + 22, py + 72).setColor(CSS.ink).setText(lines.join('\n'));
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
    const x = 20;
    const y = 240;
    const w = GAME_W - 40;
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
    add(`${m.heroName} · ${m.isHero ? `영웅 ${m.roleName}` : `Lv.${m.level} ${m.roleName}`}`, 20, m.isHero ? CSS.gold : ATTR_CSS_DARK[m.attr], '700', 4);
    add(`${ELEMENT_FLAVOR[m.attr].desc} (피해 스킬에 추가 적용)`, 13, CSS.sub, '600', 12);
    if (!m.skills.length) add('아직 스킬이 없습니다.', 14, CSS.ink);
    for (const sk of m.skills) {
      const d = sk.def;
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
    const card = panel(s, x, y, w, h, 'card').setInteractive();
    c.addAt(card, 1);
    c.add(titleTab(s, x + w / 2, y, '스킬 정보', 180));
    c.add(closeButton(s, x + w - 6, y + 6, close));
    c.add(uiText(s, x + w - 24, y + h - 14, '바깥을 누르면 닫혀요', 12, CSS.sub, '600').setOrigin(1, 1));
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
    if (!s.paused) s.tweens.pauseAll();
    const px = 52;
    const py = 236;
    const pw = GAME_W - 104;
    const ph = 500;
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
          if (on) bar.fillStyle(0x6ccc7c, 1).fillRect(bx + i * 15 + 2, y - 8, 8, 4);
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
    c.add([muteBtn, resume, quit]);
    c.add(uiText(s, GAME_W / 2, py + ph - 26, 'ESC 를 누르면 닫혀요', 12, CSS.sub, '600').setOrigin(0.5));
  }

  closeMenu() {
    if (!this.menu) return;
    this.menu.destroy(true);
    this.menu = null;
    if (!this.s.paused) this.s.tweens.resumeAll();
  }
}
