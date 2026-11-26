import Phaser from 'phaser';
import { hiRes } from '../systems/hires.js';
import { GAME_W, GAME_H, DOT } from '../config.js';
import { Button } from '../ui/Button.js';
import { panel, panelImage, uiText, drawIcon, CSS, discImage } from '../ui/theme.js';
import { audio } from '../systems/audio.js';
import { meta } from '../systems/meta.js';
import { metaBonus } from '../data/upgrades.js';
import { RELICS, RELIC_RULES, RELIC_CATS, relicText } from '../data/relics.js';
import { dissolveTo } from '../ui/dissolve.js';

// 유물 공방 (룰 v2 ③, 2026-11-20 — 대장간 대체): 마정석으로 유물 30종 중 하나를 무작위 생산.
// 같은 유물이 또 나오면 레벨 +1 (최대 5). 장착 4칸(+명성 강화 '유물 보관함') — 장착한 유물은 매 판 팀 전체에 적용.

const L = { slots: { x: 16, y: 84, w: 840, h: 76 }, grid: { x: 16, y: 172, w: 840, h: 284 }, cols: 10, cell: 84, info: { x: 872, y: 84, w: 392, h: 300 }, craft: { x: 1068, y: 440 }, foot: 668 };

export class WorkshopScene extends Phaser.Scene {
  constructor() {
    super('Workshop');
  }

  create() {
    hiRes(this);
    meta.load();
    this.selected = meta.equipped[0] || RELICS.find((r) => meta.relicLevel(r.id))?.id || RELICS[0].id;
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x2a2438).setOrigin(0);
    uiText(this, 20, 18, '유물 공방', 22, '#fff3c4', 'bold');
    uiText(this, 20, 50, `생산 마정석 ${RELIC_RULES.craftCost} · 중복 → 레벨 업 (최대 ${RELIC_RULES.maxLevel})`, 12, '#d8c8f0', '600');
    this.stoneBox = this.add.container(0, 0);
    this.slotBox = this.add.container(0, 0);
    this.gridBox = this.add.container(0, 0);
    this.info = this.add.container(0, 0);
    this.craftBtn = new Button(this, L.craft.x, L.craft.y, 300, 52, '', () => this.craft(), { variant: 'gold', icon: 'gem', fontSize: 14 });
    new Button(this, 1068, L.foot, 300, 52, '영지로', () => this.leave(), { variant: 'primary', fontSize: 16.5 });
    this.input.keyboard?.on('keydown-ESC', () => this.leave());
    this.refresh();
  }

  get pow() {
    return metaBonus(meta.data.levels).relicPow || 0;
  }

  drawStones() {
    this.stoneBox.removeAll(true);
    const w = 150;
    const x = GAME_W - 16 - w;
    const y = 16;
    this.stoneBox.add(panel(this, x, y, w, 40, 'strip'));
    const g = discImage(this, x + 22, y + 20, { r: 13, fill: 0x2fbfb2, icon: 'gem' }); // 미리 그린 원 (2026-11-23)
    this.stoneBox.add([g, uiText(this, x + 42, y + 20, meta.stones.toLocaleString(), 16.5, CSS.ink, 'bold').setOrigin(0, 0.5), uiText(this, x + w - 14, y + 20, '마정석', 11, CSS.sub, '600').setOrigin(1, 0.5)]);
  }

  /** 장착 칸 */
  drawSlots() {
    const S = L.slots;
    this.slotBox.removeAll(true);
    this.slotBox.add(panel(this, S.x, S.y, S.w, S.h, 'card'));
    const eq = meta.equipped;
    const n = meta.relicSlots;
    this.slotBox.add(uiText(this, S.x + 16, S.y + 12, `장착 ${eq.length}/${n}`, 13, CSS.ink, 'bold'));
    for (let i = 0; i < n; i++) {
      const x = S.x + 170 + i * 64;
      const y = S.y + S.h / 2;
      const id = eq[i];
      this.slotBox.add(panelImage(this, x, y, id ? 'gold' : 'soft', 52, 52));
      if (id) {
        const icon = this.add.image(x, y, `relic_${id}`).setScale(DOT).setInteractive({ useHandCursor: true });
        icon.on('pointerup', () => {
          audio.click(); // 클릭음 (2026-11-26)
          this.select(id);
        });
        this.slotBox.add(icon);
      }
    }
  }

  drawGrid() {
    const G = L.grid;
    this.gridBox.removeAll(true);
    this.gridBox.add(panel(this, G.x, G.y, G.w, G.h, 'soft'));
    const cw = G.w / L.cols;
    const eq = meta.equipped;
    RELICS.forEach((r, i) => {
      const x = G.x + (i % L.cols) * cw + cw / 2;
      const y = G.y + 12 + Math.floor(i / L.cols) * (L.cell + 2) + L.cell / 2;
      const lv = meta.relicLevel(r.id);
      const sel = this.selected === r.id;
      const g = this.add.graphics();
      g.fillStyle(lv ? 0xfff6dc : 0xd9cfe6, 1).fillRoundedRect(x - cw / 2 + 4, y - L.cell / 2 + 2, cw - 8, L.cell - 4, 10);
      g.lineStyle(sel ? 4 : 2, sel ? 0xf2c14e : eq.includes(r.id) ? 0x3f9a5a : 0xb8a8cc, 1).strokeRoundedRect(x - cw / 2 + 4, y - L.cell / 2 + 2, cw - 8, L.cell - 4, 10);
      const icon = this.add.image(x, y - 10, `relic_${r.id}`).setScale(DOT);
      if (!lv) icon.setTint(0x403850).setAlpha(0.6);
      const t = uiText(this, x, y + 24, lv ? `Lv${lv}` : '?', 11, lv >= RELIC_RULES.maxLevel ? '#b47a12' : CSS.sub, 'bold').setOrigin(0.5);
      const hit = this.add.zone(x - cw / 2 + 4, y - L.cell / 2 + 2, cw - 8, L.cell - 4).setOrigin(0).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => {
        audio.click(); // 클릭음 (2026-11-26)
        this.select(r.id);
      });
      this.gridBox.add([g, icon, t, hit]);
      if (eq.includes(r.id)) {
        this.gridBox.add(discImage(this, x + cw / 2 - 14, y - L.cell / 2 + 14, { r: 8, fill: 0x3f9a5a })); // 미리 그린 원 (2026-11-23)
      }
    });
  }

  drawInfo() {
    const I = L.info;
    const r = RELICS.find((x) => x.id === this.selected);
    const lv = meta.relicLevel(r.id);
    this.info.removeAll(true);
    this.info.add(panel(this, I.x, I.y, I.w, I.h, 'card'));
    this.info.add(panelImage(this, I.x + 44, I.y + 44, 'soft', 60, 60));
    const icon = this.add.image(I.x + 44, I.y + 44, `relic_${r.id}`).setScale(DOT);
    if (!lv) icon.setTint(0x403850).setAlpha(0.6);
    const cat = RELIC_CATS.find((c) => c.id === r.cat).name;
    this.info.add([
      icon,
      uiText(this, I.x + 86, I.y + 18, lv ? r.name : '???', 17, CSS.ink, 'bold'),
      uiText(this, I.x + 86, I.y + 46, `${cat} 유물 · ${lv ? `Lv${lv}/${RELIC_RULES.maxLevel}` : '미보유'}`, 12, CSS.sub, '600')
    ]);
    let y = I.y + 88;
    const line = (s, col = CSS.ink, size = 13) => {
      const t = uiText(this, I.x + 18, y, s, size, col, 'bold', { wordWrap: { width: I.w - 36 } });
      this.info.add(t);
      y += t.height + 8;
    };
    line(`지금: ${lv ? relicText(r, lv, this.pow) : '—'}`);
    if (lv < RELIC_RULES.maxLevel) line(`다음 Lv${lv + 1}: ${relicText(r, lv + 1, this.pow)}`, CSS.primary, 12);
    else line('최대 레벨 — 또 나오면 마정석 2개 반환', CSS.primary, 12);
    if (lv) {
      const on = meta.equipped.includes(r.id);
      const btn = new Button(this, I.x + I.w - 86, I.y + I.h - 30, 152, 40, on ? '해제' : '장착', () => this.toggle(r.id), { variant: on ? 'outline' : 'primary', fontSize: 13 });
      this.info.add(btn);
    }
  }

  select(id) {
    this.selected = id;
    audio.init();
    this.refresh();
  }

  toggle(id) {
    const on = meta.equipped.includes(id);
    if (!meta.toggleEquip(id)) return this.toast(`장착 칸 가득 (${meta.relicSlots})`);
    audio.toggle(!on);
    this.toast(on ? '해제' : '장착 · 다음 판부터');
    this.refresh();
  }

  craft() {
    audio.init();
    const r = meta.craftRelic();
    if (!r) return this.toast(`마정석 부족 (${RELIC_RULES.craftCost} 필요)`);
    const relic = RELICS.find((x) => x.id === r.id);
    audio.promote?.();
    this.selected = r.id;
    this.toast(r.result === 'new' ? `새 유물: ${relic.name}!` : r.result === 'up' ? `${relic.name} Lv${r.level}!` : `${relic.name}은(는) 최대 레벨 — 마정석 ${RELIC_RULES.maxRefund}개 반환`);
    this.refresh();
    // 나온 유물 강조 (튀어 오름)
    const img = this.add.image(GAME_W / 2, GAME_H / 2, `relic_${r.id}`).setScale(DOT).setDepth(60);
    this.tweens.add({ targets: img, scale: DOT * 4, alpha: 0, duration: 700, ease: 'Cubic.easeOut', onComplete: () => img.destroy() });
  }

  refresh() {
    this.drawStones();
    this.drawSlots();
    this.drawGrid();
    this.drawInfo();
    this.craftBtn.setLabel(`유물 생산  마정석 ${RELIC_RULES.craftCost}`);
    this.craftBtn.setAlpha(meta.stones >= RELIC_RULES.craftCost ? 1 : 0.55);
  }

  leave() {
    audio.init();
    dissolveTo(this, 'Lobby'); // 영지로 디졸브 (2026-11-23, 이전 옆으로 밀기)
  }

  toast(msg) {
    this.toastObj?.destroy();
    const t = uiText(this, 0, 0, msg, 13, CSS.ink, 'bold').setOrigin(0.5);
    const w = Math.ceil(t.width + 40);
    const c = this.add.container(436, 660, [panel(this, -w / 2, -18, w, 36, 'strip'), t]).setDepth(50);
    this.toastObj = c;
    this.tweens.add({ targets: c, alpha: 0, delay: 1600, duration: 300, onComplete: () => c.destroy() });
  }
}
