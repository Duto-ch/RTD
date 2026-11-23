import Phaser from 'phaser';
import { hiRes } from '../systems/hires.js';
import { GAME_W, GAME_H } from '../config.js';
import { Button } from '../ui/Button.js';
import { panel, uiText, drawIcon, CSS, discImage } from '../ui/theme.js';
import { audio } from '../systems/audio.js';
import { meta } from '../systems/meta.js';
import { ROSTER_BY_ID, GRADES, STYLES, TRAIT_TEXT } from '../data/roster.js';
import { TRAITS } from '../data/synergy.js';
import { TAVERN, hireCost } from '../data/tavern.js';
import { charImage } from '../objects/Mercenary.js';
import { dissolveTo } from '../ui/dissolve.js';

// 술집 (룰 v2 ③, 2026-11-20): 캐릭터 3명이 걸려 있고 3시간마다 새로 바뀐다. 마정석으로 고용 → 가진 캐릭터(병영에서 덱에 넣기).
// 이미 가진 캐릭터면 강화 +1 (공격력 +10%, 최대 +3), 그 뒤에는 마정석 절반을 돌려받는다. 리롤도 마정석 — 할수록 비싸진다.

const L = { card: { x: 140, y: 150, w: 320, h: 420, gap: 20 }, foot: 650 };
const GRADE_COLOR = (g) => Phaser.Display.Color.HexStringToColor(GRADES[g].color).color;

export class TavernScene extends Phaser.Scene {
  constructor() {
    super('Tavern');
  }

  create() {
    hiRes(this);
    meta.load();
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x3a2416).setOrigin(0);
    uiText(this, 20, 18, '술집 · 용병 고용', 22, '#fff3c4', 'bold');
    uiText(this, 20, 50, `${TAVERN.refreshMs / 3600000}시간마다 새 손님 · 보스를 쓰러뜨려 얻은 마정석으로 고용`, 12, '#e8cfa8', '600');
    this.stoneBox = this.add.container(0, 0);
    this.cards = this.add.container(0, 0);
    this.timerText = uiText(this, GAME_W / 2, 112, '', 14, '#fff3c4', 'bold').setOrigin(0.5);
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
      g.fillStyle(slot.hired ? 0xcfc2a0 : 0xfbf7ec, 1).fillRoundedRect(x, y, C.w, C.h, 16);
      g.lineStyle(4, GRADE_COLOR(c.grade), 1).strokeRoundedRect(x, y, C.w, C.h, 16);
      this.cards.add(g);
      const cx = x + C.w / 2;
      const img = charImage(this, cx, y + 110, c, 5);
      if (slot.hired) img.setAlpha(0.45);
      const own = meta.owns(c.id);
      const enh = meta.enhance(c.id);
      const wrap = C.w - 24;
      const name = uiText(this, cx, y + 206, c.name, 18, c.grade === 4 ? '#b47a12' : CSS.ink, 'bold').setOrigin(0.5, 0);
      const grade = uiText(this, cx, y + 234, GRADES[c.grade].name, 12, GRADES[c.grade].color, 'bold').setOrigin(0.5, 0);
      const tr = uiText(this, cx, y + 256, `${TRAITS[c.cls].name} · ${TRAITS[c.origin].name}`, 12, CSS.sub, '600').setOrigin(0.5, 0);
      const st = uiText(this, x + 12, y + 282, `${STYLES[c.style].name} · ${TRAIT_TEXT(c.trait)}\n스킬 「${c.skill.name}」`, 11, CSS.ink, '600', { wordWrap: { width: wrap }, lineSpacing: 2 });
      this.cards.add([img, name, grade, tr, st]);
      // 상태: 새 캐릭터 / 강화 / 강화 최대
      const status = !own ? '새 캐릭터' : enh < TAVERN.enhanceMax ? `보유 · 강화 +${enh} → +${enh + 1}` : `강화 최대 · 고용 시 마정석 ${Math.floor(hireCost(c) / 2)} 반환`;
      this.cards.add(uiText(this, cx, y + C.h - 84, status, 11, own ? CSS.primary : CSS.green, 'bold', { wordWrap: { width: wrap }, align: 'center' }).setOrigin(0.5, 0));
      const cost = hireCost(c);
      const label = slot.hired ? '고용 완료' : `고용  마정석 ${cost}`;
      const btn = new Button(this, cx, y + C.h - 32, C.w - 20, 44, label, () => this.hire(i), { variant: slot.hired ? 'outline' : 'primary', fontSize: 14 });
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
    if (!r) return this.toast(`마정석이 부족합니다 (${hireCost(c)}개 필요)`);
    audio.promote?.();
    this.toast(r === 'new' ? `${c.name} 고용! 병영에서 덱에 넣을 수 있어요` : r === 'enhance' ? `${c.name} 강화 +${meta.enhance(c.id)} (공격력 +${Math.round(meta.enhance(c.id) * TAVERN.enhanceDmg * 100)}%)` : `${c.name}은(는) 이미 최대 강화 — 마정석 ${Math.floor(hireCost(c) / 2)}개 반환`);
    this.refresh();
  }

  reroll() {
    audio.init();
    const cost = meta.tavernRerollCost;
    if (!meta.rerollTavern()) return this.toast(`마정석이 부족합니다 (리롤 ${cost}개)`);
    this.toast(`새 손님이 들어왔어요 — 다음 리롤 마정석 ${meta.tavernRerollCost}`);
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
