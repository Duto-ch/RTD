import Phaser from 'phaser';
import { hiRes } from '../systems/hires.js';
import { GAME_W, GAME_H, WIDE } from '../config.js';
import { Button } from '../ui/Button.js';
import { panel, uiText, CSS } from '../ui/theme.js';
import { audio } from '../systems/audio.js';
import { meta } from '../systems/meta.js';
import { ROSTER, ROSTER_BY_ID, GRADES, STYLES, DECK_POINTS, DEFAULT_DECK, TRAIT_TEXT, deckPoints, skillLevels } from '../data/roster.js';
import { describeSkill } from '../data/skills.js';
import { ATTR_INFO } from '../data/elements.js';
import { charImage } from '../objects/Mercenary.js';

// 병영 = 덱 편성 (2026-11-17). 캐릭터 96명 중 등급 포인트 합 40 이하로 출전 덱을 짠다 (커먼 1·언커먼 2·레어 3·유니크 4).
// 카드를 누르면 오른쪽(세로는 아래) 정보 창에 특성·레벨별 스킬, '덱에 넣기/빼기'. 3색 조합 자유.
// 지금은 모든 캐릭터를 쓸 수 있다 — 가챠(3단계)가 들어오면 가진 캐릭터만

const L = WIDE
  ? { grid: { x: 16, y: 128, w: 840, h: 576 }, cols: 6, cardH: 86, info: { x: 872, y: 72, w: 392, h: 356 }, deck: { x: 872, y: 440, w: 392, h: 196 } }
  : { grid: { x: 12, y: 158, w: 520, h: 470 }, cols: 4, cardH: 86, info: { x: 12, y: 640, w: 520, h: 252 }, deck: null };
const GRADE_COLOR = (g) => Phaser.Display.Color.HexStringToColor(GRADES[g].color).color;

export class DeckScene extends Phaser.Scene {
  constructor() {
    super('Deck');
  }

  create() {
    hiRes(this);
    meta.load();
    this.deck = [...meta.deck];
    this.filter = { attr: 'all', grade: 0 };
    this.selected = ROSTER_BY_ID[this.deck[0]] || ROSTER[0];
    this.scrollY = 0;
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x123b3a).setOrigin(0);
    this.createHeader();
    this.createFilters();
    this.createGrid();
    this.info = this.add.container(0, 0);
    this.deckBox = this.add.container(0, 0);
    this.createFooter();
    this.refresh();
    this.input.keyboard?.on('keydown-ESC', () => this.leave());
  }

  get points() {
    return deckPoints(this.deck);
  }

  createHeader() {
    uiText(this, 20, WIDE ? 18 : 16, '병영 · 덱 편성', 22, '#fff3c4', 'bold');
    this.ptText = uiText(this, WIDE ? 856 : GAME_W - 20, WIDE ? 22 : 20, '', 16.5, '#fff3c4', 'bold').setOrigin(1, 0);
    this.ptSub = uiText(this, 20, WIDE ? 48 : 46, '', 12, '#bfe1d4', '600');
    this.ptBar = this.add.graphics();
  }

  createFilters() {
    const y = WIDE ? 92 : 82;
    const chips = [
      ['all', '전체'], ['red', '레드'], ['blue', '블루'], ['green', '그린']
    ];
    const grades = [[0, '전 등급'], [1, '커먼'], [2, '언커먼'], [3, '레어'], [4, '유니크']];
    this.chipBtns = [];
    let x = 16;
    for (const [v, label] of chips) {
      const w = 64;
      const b = new Button(this, x + w / 2, y, w, 30, label, () => {
        this.filter.attr = v;
        this.scrollY = 0;
        this.refresh();
      }, { variant: 'outline', fontSize: 12 });
      b.kind = ['attr', v];
      this.chipBtns.push(b);
      x += w + 6;
    }
    let gx = WIDE ? x + 14 : 16;
    const gy = WIDE ? y : y + 38;
    for (const [v, label] of grades) {
      const w = v === 2 ? 70 : 62;
      const b = new Button(this, gx + w / 2, gy, w, 30, label, () => {
        this.filter.grade = v;
        this.scrollY = 0;
        this.refresh();
      }, { variant: 'outline', fontSize: 12 });
      b.kind = ['grade', v];
      this.chipBtns.push(b);
      gx += w + 6;
    }
  }

  /** 카드 격자 (마스크 + 휠·드래그 스크롤) */
  createGrid() {
    const G = L.grid;
    panel(this, G.x - 4, G.y - 6, G.w + 8, G.h + 12, 'soft');
    this.gridC = this.add.container(0, 0);
    const shape = this.make.graphics({}, false).fillRect(G.x, G.y, G.w, G.h);
    this.gridC.setMask(shape.createGeometryMask());
    this.dragging = null;
    const zone = this.add.zone(G.x, G.y, G.w, G.h).setOrigin(0).setInteractive();
    zone.on('pointerdown', (p) => (this.dragging = { y: p.worldY, s: this.scrollY, moved: false }));
    this.input.on('pointermove', (p) => {
      if (!this.dragging || !p.isDown) return;
      const dy = p.worldY - this.dragging.y;
      if (Math.abs(dy) > 6) this.dragging.moved = true;
      if (this.dragging.moved) this.setScroll(this.dragging.s - dy);
    });
    this.input.on('pointerup', (p) => {
      const d = this.dragging;
      this.dragging = null;
      if (!d || d.moved) return;
      const card = this.cardAt(p.worldX, p.worldY);
      if (card) this.select(card);
    });
    this.input.on('wheel', (p, _o, _dx, dy) => {
      if (p.worldX >= G.x && p.worldX <= G.x + G.w && p.worldY >= G.y && p.worldY <= G.y + G.h) this.setScroll(this.scrollY + dy * 0.6);
    });
  }

  setScroll(v) {
    const max = Math.max(0, this.contentH - L.grid.h);
    this.scrollY = Phaser.Math.Clamp(v, 0, max);
    this.gridC.y = -this.scrollY;
  }

  cardAt(x, y) {
    const G = L.grid;
    if (x < G.x || x > G.x + G.w || y < G.y || y > G.y + G.h) return null;
    const cw = G.w / L.cols;
    const col = Math.floor((x - G.x) / cw);
    const row = Math.floor((y - G.y + this.scrollY - 6) / (L.cardH + 8));
    return this.visible[row * L.cols + col] || null;
  }

  drawGrid() {
    const G = L.grid;
    this.gridC.removeAll(true);
    const list = ROSTER.filter((c) => (this.filter.attr === 'all' || c.attr === this.filter.attr) && (!this.filter.grade || c.grade === this.filter.grade))
      .sort((a, b) => b.grade - a.grade || ['red', 'blue', 'green'].indexOf(a.attr) - ['red', 'blue', 'green'].indexOf(b.attr));
    this.visible = list;
    const cw = G.w / L.cols;
    list.forEach((c, i) => {
      const x = G.x + (i % L.cols) * cw + 4;
      const y = G.y + 6 + Math.floor(i / L.cols) * (L.cardH + 8);
      const w = cw - 8;
      const inDeck = this.deck.includes(c.id);
      const sel = this.selected === c;
      const g = this.add.graphics();
      g.fillStyle(inDeck ? 0xfff6dc : 0xe7dcbb, 1).fillRoundedRect(x, y, w, L.cardH, 12);
      g.lineStyle(sel ? 4 : 3, sel ? 0xf2c14e : GRADE_COLOR(c.grade), 1).strokeRoundedRect(x, y, w, L.cardH, 12);
      if (!inDeck) g.fillStyle(0x0b2f2e, 0.28).fillRoundedRect(x, y, w, L.cardH, 12);
      g.fillStyle(ATTR_INFO[c.attr].color, 1).fillCircle(x + 12, y + 12, 6);
      const img = charImage(this, x + 28, y + L.cardH / 2 + 2, c, true);
      const nm = uiText(this, x + 52, y + 14, c.name, 13, CSS.ink, 'bold');
      const gr = uiText(this, x + 52, y + 34, GRADES[c.grade].name, 11, GRADES[c.grade].color, 'bold');
      const st = uiText(this, x + 52, y + 52, STYLES[c.style].name, 11, CSS.sub, '600');
      this.gridC.add([g, img, nm, gr, st]);
      if (inDeck) {
        const chk = this.add.graphics();
        chk.fillStyle(0x3f9a5a, 1).fillCircle(x + w - 14, y + 14, 10);
        chk.lineStyle(3, 0xffffff, 1).beginPath().moveTo(x + w - 19, y + 14).lineTo(x + w - 15, y + 18).lineTo(x + w - 8, y + 10).strokePath();
        this.gridC.add(chk);
      }
      this.gridC.add(uiText(this, x + w - 10, y + L.cardH - 10, `${GRADES[c.grade].pt}pt`, 11, CSS.sub, '600').setOrigin(1, 1));
    });
    this.contentH = Math.ceil(list.length / L.cols) * (L.cardH + 8) + 8;
    this.setScroll(this.scrollY);
  }

  select(c) {
    this.selected = c;
    audio.init();
    this.refresh();
  }

  toggle(c) {
    const i = this.deck.indexOf(c.id);
    if (i >= 0) {
      if (this.deck.length <= 1) return this.toast('덱에는 1명 이상 있어야 합니다');
      this.deck.splice(i, 1);
    } else {
      const pt = GRADES[c.grade].pt;
      if (this.points + pt > DECK_POINTS) return this.toast(`포인트가 모자랍니다 (${this.points} + ${pt} > ${DECK_POINTS})`);
      this.deck.push(c.id);
    }
    this.refresh();
  }

  drawInfo() {
    const I = L.info;
    const c = this.selected;
    this.info.removeAll(true);
    this.info.add(panel(this, I.x, I.y, I.w, I.h, 'card'));
    const lv = skillLevels(c);
    const col = c.grade === 4 ? '#b47a12' : ATTR_INFO[c.attr].css;
    const head = charImage(this, I.x + 34, I.y + 36, c, true);
    const nm = uiText(this, I.x + 64, I.y + 14, `${c.name}  ·  ${c.title}`, 16.5, col, 'bold');
    const sub = uiText(this, I.x + 64, I.y + 38, `${GRADES[c.grade].name} ${GRADES[c.grade].pt}pt · ${ATTR_INFO[c.attr].name} · ${STYLES[c.style].name} (공격력 ${+(STYLES[c.style].dmg * GRADES[c.grade].mult).toFixed(1)} · 공속 ${STYLES[c.style].rate} · 사거리 ${STYLES[c.style].range})`, 11, CSS.sub, '600');
    this.fit(nm, I.w - 80);
    this.fit(sub, I.w - 80);
    this.info.add([head, nm, sub]);
    let y = I.y + 64;
    const wrap = I.w - 32;
    const line = (str, size, color, weight = '600', gap = 4) => {
      const t = uiText(this, I.x + 16, y, str, size, color, weight, { wordWrap: { width: wrap }, lineSpacing: 2 });
      this.info.add(t);
      y += t.height + gap;
    };
    line(`특성 — ${TRAIT_TEXT(c.trait)}`, 12, CSS.ink, 'bold', 6);
    c.skills.forEach((s, i) => {
      line(`Lv${lv[i]} ${s.name} (${s.cd}초)`, 12, CSS.primary, 'bold', 0);
      line(describeSkill(s), 11, CSS.ink, '600', WIDE ? 5 : 3);
    });
    const inDeck = this.deck.includes(c.id);
    const btn = new Button(this, I.x + I.w - 86, I.y + I.h - 28, 152, 36, inDeck ? '덱에서 빼기' : `덱에 넣기 (+${GRADES[c.grade].pt})`, () => this.toggle(c), {
      variant: inDeck ? 'outline' : 'primary',
      fontSize: 12
    });
    this.info.add(btn);
  }

  /** 가로: 오른쪽 아래에 지금 덱 (아이콘을 누르면 그 캐릭터 정보) */
  drawDeck() {
    this.deckBox.removeAll(true);
    if (!L.deck) return;
    const D = L.deck;
    this.deckBox.add(panel(this, D.x, D.y, D.w, D.h, 'card'));
    this.deckBox.add(uiText(this, D.x + 16, D.y + 10, `출전 덱 ${this.deck.length}명`, 13, CSS.ink, 'bold'));
    const step = 46;
    const per = Math.floor((D.w - 24) / step);
    const sorted = [...this.deck].map((id) => ROSTER_BY_ID[id]).sort((a, b) => b.grade - a.grade || a.attr.localeCompare(b.attr));
    sorted.forEach((c, i) => {
      const x = D.x + 12 + (i % per) * step + step / 2;
      const y = D.y + 34 + Math.floor(i / per) * step + step / 2;
      const g = this.add.graphics();
      g.fillStyle(0xf3ead2, 1).fillRoundedRect(x - 22, y - 20, 44, 40, 8);
      g.lineStyle(2, GRADE_COLOR(c.grade), 1).strokeRoundedRect(x - 22, y - 20, 44, 40, 8);
      const img = charImage(this, x, y, c, true).setInteractive({ useHandCursor: true });
      img.on('pointerup', () => this.select(c));
      this.deckBox.add([g, img]);
    });
  }

  createFooter() {
    const y = GAME_H - (WIDE ? 40 : 32);
    if (WIDE) {
      new Button(this, 872 + 70, y, 140, 48, '기본 덱', () => this.resetDeck(), { variant: 'outline', fontSize: 13 });
      new Button(this, 872 + 140 + 12 + 120, y, 240, 52, '저장하고 영지로', () => this.leave(), { variant: 'primary', fontSize: 16.5 });
    } else {
      new Button(this, 12 + 70, y, 140, 48, '기본 덱', () => this.resetDeck(), { variant: 'outline', fontSize: 13 });
      new Button(this, GAME_W - 12 - 170, y, 340, 52, '저장하고 영지로', () => this.leave(), { variant: 'primary', fontSize: 16.5 });
    }
  }

  resetDeck() {
    this.deck = [...DEFAULT_DECK];
    this.refresh();
  }

  leave() {
    if (!meta.setDeck(this.deck)) return this.toast('덱을 저장할 수 없습니다 (1명 이상 · 40포인트 이하)');
    audio.init();
    this.scene.start('Lobby');
  }

  refresh() {
    const pts = this.points;
    this.ptText.setText(`${pts} / ${DECK_POINTS} 포인트`).setColor(pts > DECK_POINTS ? '#ff8a7a' : '#fff3c4');
    const by = [1, 2, 3, 4].map((g) => `${GRADES[g].name} ${this.deck.filter((id) => ROSTER_BY_ID[id].grade === g).length}`).join(' · ');
    const attrs = ['red', 'blue', 'green'].filter((a) => this.deck.some((id) => ROSTER_BY_ID[id].attr === a)).map((a) => ATTR_INFO[a].name).join('·');
    this.ptSub.setText(`${this.deck.length}명 (${by}) · ${attrs || '-'}`);
    // 포인트 막대
    const bx = WIDE ? 560 : GAME_W - 200;
    const bw = WIDE ? 160 : 180;
    const byy = WIDE ? 30 : 56;
    this.ptBar.clear().fillStyle(0x0b2f2e, 1).fillRoundedRect(bx, byy, bw, 10, 5);
    this.ptBar.fillStyle(pts >= DECK_POINTS ? 0xf2c14e : 0x58c096, 1).fillRoundedRect(bx, byy, Math.max(10, (bw * Math.min(pts, DECK_POINTS)) / DECK_POINTS), 10, 5);
    for (const b of this.chipBtns) {
      const [k, v] = b.kind;
      const on = k === 'attr' ? this.filter.attr === v : this.filter.grade === v;
      b.setAlpha(on ? 1 : 0.62);
      b.bg.setTint(on ? 0xd9f0c8 : 0xffffff);
    }
    this.drawGrid();
    this.drawInfo();
    this.drawDeck();
  }

  fit(t, maxW) {
    let s = t.text;
    while (s.length > 1 && t.width > maxW) {
      s = s.slice(0, -1);
      t.setText(`${s.trimEnd()}…`);
    }
  }

  toast(msg) {
    this.toastObj?.destroy();
    const t = uiText(this, 0, 0, msg, 13, CSS.ink, 'bold').setOrigin(0.5);
    const w = Math.ceil(t.width + 40);
    const c = this.add.container(WIDE ? 436 : GAME_W / 2, WIDE ? 680 : 612, [panel(this, -w / 2, -18, w, 36, 'strip'), t]).setDepth(50);
    this.toastObj = c;
    this.tweens.add({ targets: c, alpha: 0, delay: 1600, duration: 300, onComplete: () => c.destroy() });
  }
}
