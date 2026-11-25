import Phaser from 'phaser';
import { hiRes } from '../systems/hires.js';
import { GAME_W, GAME_H } from '../config.js';
import { Button } from '../ui/Button.js';
import { panel, uiText, drawIcon, CSS, discImage, coverImage } from '../ui/theme.js';
import { audio } from '../systems/audio.js';
import { meta } from '../systems/meta.js';
import { ROSTER_BY_ID, GRADES, STYLES, TRAIT_TEXT } from '../data/roster.js';
import { TRAITS } from '../data/synergy.js';
import { TAVERN, hireCost } from '../data/tavern.js';
import { charImage } from '../objects/Mercenary.js';
import { dissolveTo } from '../ui/dissolve.js';

// 술집 (룰 v2 ③, 2026-11-20): 캐릭터 3명이 걸려 있고 3시간마다 새로 바뀐다. 마정석으로 고용 → 가진 캐릭터(병영에서 덱에 넣기).
// 이미 가진 캐릭터면 강화 +1 (공격력 +10%, 최대 +3), 그 뒤에는 마정석 절반을 돌려받는다. 리롤도 마정석 — 할수록 비싸진다.

const TAVERN_DIM = 0.35; // 배경 그림 위 어둡게 (글자·카드 읽히게)
const OUTLINE = { stroke: '#1a0f08', strokeThickness: 4 }; // 그림 위 글자 외곽선
// 카드 25% 작게 (2026-11-25 사용자 요청: 320x420 → 240x315), 가운데 정렬
const CARD_W = 240;
const L = { card: { x: (GAME_W - CARD_W * 3 - 20 * 2) / 2, y: 196, w: CARD_W, h: 315, gap: 20 }, foot: 650 };
const GRADE_COLOR = (g) => Phaser.Display.Color.HexStringToColor(GRADES[g].color).color;

export class TavernScene extends Phaser.Scene {
  constructor() {
    super('Tavern');
  }

  create() {
    hiRes(this);
    meta.load();
    // 배경 = 사용자 그림 술집 (2026-11-25), 글자·카드가 읽히게 살짝 어둡게
    if (this.textures.exists('tavern_bg')) {
      coverImage(this, 'tavern_bg', GAME_W, GAME_H);
      this.add.rectangle(0, 0, GAME_W, GAME_H, 0x1a0f08, TAVERN_DIM).setOrigin(0);
    } else this.add.rectangle(0, 0, GAME_W, GAME_H, 0x3a2416).setOrigin(0);
    uiText(this, 20, 18, '술집 · 용병 고용', 22, '#fff3c4', 'bold', OUTLINE);
    uiText(this, 20, 52, `${TAVERN.refreshMs / 3600000}시간마다 갱신 · 마정석 고용`, 12, '#e8cfa8', '600', OUTLINE);
    this.stoneBox = this.add.container(0, 0);
    this.cards = this.add.container(0, 0);
    this.timerText = uiText(this, GAME_W / 2, 112, '', 14, '#fff3c4', 'bold', OUTLINE).setOrigin(0.5);
    const fy = L.foot;
    this.rerollBtn = new Button(this, GAME_W / 2 - 150, fy, 260, 52, '', () => this.reroll(), { variant: 'gold', icon: 'reroll', fontSize: 14 });
    new Button(this, GAME_W / 2 + 150, fy, 260, 52, '영지로', () => this.leave(), { variant: 'primary', fontSize: 16.5 });
    this.input.keyboard?.on('keydown-ESC', () => this.leave());
    this.refresh();
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tick() });
  }

  /** 오른쪽 위 마정석 */
  drawStones() {
    this.stoneBox.removeAll(true);
    const w = 150;
    const x = GAME_W - 16 - w;
    const y = 16;
    this.stoneBox.add(panel(this, x, y, w, 40, 'strip'));
    const g = discImage(this, x + 22, y + 20, { r: 13, fill: 0x2fbfb2, icon: 'gem' }); // 미리 그린 원 (2026-11-23)
    this.stoneBox.add([g, uiText(this, x + 42, y + 20, meta.stones.toLocaleString(), 16.5, CSS.ink, 'bold').setOrigin(0, 0.5), uiText(this, x + w - 14, y + 20, '마정석', 11, CSS.sub, '600').setOrigin(1, 0.5)]);
  }

  tick() {
    const t = meta.tavern();
    const left = Math.max(0, t.refreshAt - Date.now());
    if (left <= 0) return this.refresh();
    const h = Math.floor(left / 3600000);
    const m = Math.floor((left % 3600000) / 60000);
    const s = Math.floor((left % 60000) / 1000);
    this.timerText.setText(`새 손님까지 ${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
  }

  refresh() {
    const t = meta.tavern();
    this.drawStones();
    this.drawCards(t);
    const cost = meta.tavernRerollCost;
    this.rerollBtn.setLabel(`리롤  마정석 ${cost}`);
    this.rerollBtn.setAlpha(meta.stones >= cost ? 1 : 0.55);
    this.tick();
  }

  drawCards(t) {
    const C = L.card;
    this.cards.removeAll(true);
    t.slots.forEach((slot, i) => {
      const c = ROSTER_BY_ID[slot.id];
      const x = C.x + i * (C.w + C.gap);
      const y = C.y;
      const g = this.add.graphics();
      g.fillStyle(slot.hired ? 0xcfc2a0 : 0xfbf7ec, 1).fillRoundedRect(x, y, C.w, C.h, 12);
      g.lineStyle(4, GRADE_COLOR(c.grade), 1).strokeRoundedRect(x, y, C.w, C.h, 12);
      this.cards.add(g);
      const cx = x + C.w / 2;
      const img = charImage(this, cx, y + 66, c, 4);
      if (slot.hired) img.setAlpha(0.45);
      const own = meta.owns(c.id);
      const enh = meta.enhance(c.id);
      const wrap = C.w - 20;
      const name = uiText(this, cx, y + 116, c.name, 16.5, c.grade === 4 ? '#b47a12' : CSS.ink, 'bold').setOrigin(0.5, 0);
      // 등급 띠 (2026-11-25 사용자 요청): 등급 글자 뒤에 등급색 띠를 카드 양 끝까지
      const band = this.add.rectangle(x - 2, y + 142, C.w + 4, 20, GRADE_COLOR(c.grade)).setOrigin(0); // 테두리(4) 바깥 끝까지
      const grade = uiText(this, cx, y + 152, GRADES[c.grade].name, 12, c.grade === 2 || c.grade === 3 ? '#ffffff' : '#2b1d2f', 'bold').setOrigin(0.5);
      const tr = uiText(this, cx, y + 168, `${TRAITS[c.cls].name} · ${TRAITS[c.origin].name}`, 12, CSS.sub, '600').setOrigin(0.5, 0);
      const st = uiText(this, x + 10, y + 188, `${STYLES[c.style].name} · ${TRAIT_TEXT(c.trait)}\n스킬 「${c.skill.name}」`, 11, CSS.ink, '600', { wordWrap: { width: wrap }, lineSpacing: 2 });
      this.cards.add([img, band, grade, name, tr, st]);
      // 상태: 새 캐릭터 / 강화 / 강화 최대
      const status = !own ? '새 캐릭터' : enh < TAVERN.enhanceMax ? `보유 · 강화 +${enh} → +${enh + 1}` : `강화 최대 · 고용 시 마정석 ${Math.floor(hireCost(c) / 2)} 반환`;
      this.cards.add(uiText(this, cx, y + C.h - 70, status, 11, own ? CSS.primary : CSS.green, 'bold', { wordWrap: { width: wrap }, align: 'center' }).setOrigin(0.5, 0));
      const cost = hireCost(c);
      const label = slot.hired ? '고용 완료' : `고용  마정석 ${cost}`;
      const btn = new Button(this, cx, y + C.h - 26, C.w - 20, 36, label, () => this.hire(i), { variant: slot.hired ? 'outline' : 'primary', fontSize: 14 });
      if (slot.hired || meta.stones < cost) btn.setAlpha(0.55);
      this.cards.add(btn);
    });
  }

  hire(i) {
    const t = meta.tavern();
    const slot = t.slots[i];
    if (!slot || slot.hired) return;
    const c = ROSTER_BY_ID[slot.id];
    const r = meta.hireTavern(i);
    audio.init();
    if (!r) return this.toast(`마정석 부족 (${hireCost(c)} 필요)`);
    audio.promote?.();
    this.toast(r === 'new' ? `${c.name} 고용 · 병영에 추가` : r === 'enhance' ? `${c.name} 강화 +${meta.enhance(c.id)} (공격력 +${Math.round(meta.enhance(c.id) * TAVERN.enhanceDmg * 100)}%)` : `${c.name}은(는) 이미 최대 강화 — 마정석 ${Math.floor(hireCost(c) / 2)}개 반환`);
    this.refresh();
  }

  reroll() {
    audio.init();
    const cost = meta.tavernRerollCost;
    if (!meta.rerollTavern()) return this.toast(`마정석 부족 · 리롤 ${cost}`);
    audio.reroll();
    this.toast(`새 손님 · 다음 리롤 마정석 ${meta.tavernRerollCost}`); // 개조식 (2026-11-25)
    this.refresh();
  }

  leave() {
    audio.init();
    dissolveTo(this, 'Lobby'); // 영지로 디졸브 (2026-11-23, 이전 옆으로 밀기)
  }

  toast(msg) {
    this.toastObj?.destroy();
    const t = uiText(this, 0, 0, msg, 13, CSS.ink, 'bold').setOrigin(0.5);
    const w = Math.ceil(t.width + 40);
    const c = this.add.container(GAME_W / 2, L.foot - 56, [panel(this, -w / 2, -18, w, 36, 'strip'), t]).setDepth(50);
    this.toastObj = c;
    this.tweens.add({ targets: c, alpha: 0, delay: 1600, duration: 300, onComplete: () => c.destroy() });
  }
}
