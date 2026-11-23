import Phaser from 'phaser';
import { hiRes } from '../systems/hires.js';
import { GAME_W, GAME_H } from '../config.js';
import { Button } from '../ui/Button.js';
import { panel, uiText, CSS, traitBadge, ringImage, discImage } from '../ui/theme.js';
import { audio } from '../systems/audio.js';
import { meta } from '../systems/meta.js';
import { ROSTER, ROSTER_BY_ID, GRADES, STYLES, DECK_RULES, DEFAULT_DECK, TRAIT_TEXT, deckValid } from '../data/roster.js';
import { describeSkill } from '../data/skills.js';
import { starSkill } from '../data/stars.js';
import { TRAITS, CLASS_IDS, ORIGIN_IDS } from '../data/synergy.js';
import { charImage } from '../objects/Mercenary.js';
import { Kinetic } from '../ui/kinetic.js';
import { slideTo } from '../ui/slide.js';

// 병영 = 덱 편성 (룰 v2, 2026-11-20). 가진 캐릭터(술집에서 고용) 중 최대 30명 — 레어 9명·유니크 3명까지.
// 판 안 상점은 이 덱의 캐릭터만 내놓는다. 카드를 누르면 정보 창에 계열·출신·특성·스킬(별마다), '덱에 넣기/빼기'.

// 시너지 필터 줄(synY 136) 아래부터 격자 (2026-11-22)
const L = { grid: { x: 16, y: 160, w: 840, h: 544 }, cols: 6, cardH: 86, info: { x: 872, y: 72, w: 392, h: 356 }, deck: { x: 872, y: 440, w: 392, h: 196 }, synY: 136 };
const GRADE_COLOR = (g) => Phaser.Display.Color.HexStringToColor(GRADES[g].color).color;

/** 덱 편성에서 고른 카드의 바깥 테두리 색 (등급색 — 동·은/초록·파랑·금 — 과 겹치지 않게 자홍) */
const SELECT_COLOR = 0xd94fa0;

export class DeckScene extends Phaser.Scene {
  constructor() {
    super('Deck');
  }

  create() {
    hiRes(this);
    meta.load();
    this.deck = [...meta.deck];
    this.filter = { show: 'all', grade: 0, trait: null };
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

  owned(id) {
    return meta.owns(id);
  }

  createHeader() {
    uiText(this, 20, 18, '병영 · 덱 편성', 22, '#fff3c4', 'bold');
    this.ptText = uiText(this, 856, 22, '', 16.5, '#fff3c4', 'bold').setOrigin(1, 0);
    this.ptSub = uiText(this, 20, 48, '', 12, '#bfe1d4', '600');
    this.ptBar = this.add.graphics();
  }

  createFilters() {
    const y = 92;
    const chips = [
      ['all', '전체'], ['owned', '보유'], ['deck', '덱']
    ];
    const grades = [[0, '전 등급'], [1, '커먼'], [2, '언커먼'], [3, '레어'], [4, '유니크']];
    this.chipBtns = [];
    let x = 16;
    for (const [v, label] of chips) {
      const w = 64;
      const b = new Button(this, x + w / 2, y, w, 30, label, () => {
        this.filter.show = v;
        this.scrollY = 0;
        this.refresh();
      }, { variant: 'outline', fontSize: 12 });
      b.kind = ['show', v];
      this.chipBtns.push(b);
      x += w + 6;
    }
    let gx = x + 14;
    const gy = y;
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
    this.createTraitFilter();
  }

  /** 시너지(계열 6 · 출신 6) 상징으로 거르기 (2026-11-22 사용자 요청) — 누르면 그 시너지 캐릭터만, 한 번 더 누르면 해제 */
  createTraitFilter() {
    // PC (2026-11-22): 등급 줄 아래 한 줄 (격자는 그만큼 아래)
    const y = L.synY;
    const r = 12;
    const step = 42;
    this.traitBtns = [];
    [...CLASS_IDS, ...ORIGIN_IDS].forEach((k, i) => {
      const x = 16 + r + 1 + i * step + (i >= CLASS_IDS.length ? 14 : 0); // 계열 6 | 출신 6 사이를 조금 더 띄움
      const holder = this.add.container(x, y);
      holder.setSize(2 * r + 6, 2 * r + 6).setInteractive({ useHandCursor: true });
      holder.on('pointerup', () => {
        this.filter.trait = this.filter.trait === k ? null : k;
        this.scrollY = 0;
        this.refresh();
      });
      holder.traitId = k;
      this.traitBtns.push(holder);
    });
  }

  /** 시너지 필터 상징 다시 그리기: 고른 것은 자홍 고리, 하나를 고르면 나머지는 옅게 */
  drawTraitFilter() {
    if (!this.traitBtns) return;
    for (const h of this.traitBtns) {
      h.removeAll(true);
      const k = h.traitId;
      const on = !this.filter.trait || this.filter.trait === k;
      h.add(traitBadge(this, 0, 0, k, 12, on));
      if (this.filter.trait === k) {
        h.add(ringImage(this, 0, 0, 16, 3, SELECT_COLOR)); // 미리 그린 고리 (2026-11-23)
      }
    }
  }

  /** 카드 격자 (마스크 + 휠·드래그 스크롤) */
  createGrid() {
    const G = L.grid;
    panel(this, G.x - 4, G.y - 6, G.w + 8, G.h + 12, 'soft');
    this.gridC = this.add.container(0, 0);
    const shape = this.make.graphics({}, false).fillRect(G.x, G.y, G.w, G.h);
    this.gridC.setMask(shape.createGeometryMask());
    this.gridC.maskRect = { x: G.x, y: G.y, w: G.w, h: G.h }; // 보이는 영역, 화면 기준 (tools/ui-audit.cjs)
    this.dragging = null;
    // 관성 스크롤 (2026-11-21): 밀다 놓으면 미끄러지고, 끝을 넘기면 고무줄처럼 돌아온다
    this.kin = new Kinetic(this, {
      min: 0,
      max: () => Math.max(0, (this.contentH || 0) - L.grid.h),
      onChange: (v) => {
        this.scrollY = v;
        this.gridC.y = -Math.round(v);
      }
    });
    const zone = this.add.zone(G.x, G.y, G.w, G.h).setOrigin(0).setInteractive();
    zone.on('pointerdown', (p) => {
      this.dragging = { y: p.worldY, moved: this.kin.moving }; // 미끄러지는 중에 누르면 멈추기만
      this.kin.down(p.downTime);
    });
    this.input.on('pointermove', (p) => {
      if (!this.dragging || !p.isDown) return;
      const dy = p.worldY - this.dragging.y;
      if (Math.abs(dy) > 6) this.dragging.moved = true;
      if (this.dragging.moved) this.kin.drag(-dy, p.moveTime);
    });
    this.input.on('pointerup', (p) => {
      const d = this.dragging;
      this.dragging = null;
      this.kin.up(p.upTime);
      if (!d || d.moved) return;
      const card = this.cardAt(p.worldX, p.worldY);
      // 고른 카드를 한 번 더 누르면 덱에 넣기·빼기 (2026-11-22 사용자 요청)
      if (card && card === this.selected) this.toggle(card);
      else if (card) this.select(card);
    });
    this.input.on('wheel', (p, _o, _dx, dy) => {
      if (p.worldX >= G.x && p.worldX <= G.x + G.w && p.worldY >= G.y && p.worldY <= G.y + G.h) this.kin.scrollBy(dy * 0.6);
    });
  }

  /** 스크롤 위치를 바로 정한다 (끝 안으로 자름, 미끄러짐 멈춤) */
  setScroll(v) {
    this.kin.scrollBy(v - this.kin.value);
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
    const f = this.filter.show;
    const tf = this.filter.trait;
    const list = ROSTER.filter((c) => (f === 'all' || (f === 'owned' ? this.owned(c.id) : this.deck.includes(c.id))) && (!this.filter.grade || c.grade === this.filter.grade) && (!tf || c.cls === tf || c.origin === tf))
      .sort((a, b) => (this.owned(b.id) ? 1 : 0) - (this.owned(a.id) ? 1 : 0) || b.grade - a.grade || a.cls.localeCompare(b.cls) || a.origin.localeCompare(b.origin));
    this.visible = list;
    const cw = G.w / L.cols;
    list.forEach((c, i) => {
      const x = G.x + (i % L.cols) * cw + 4;
      const y = G.y + 6 + Math.floor(i / L.cols) * (L.cardH + 8);
      const w = cw - 8;
      const inDeck = this.deck.includes(c.id);
      const own = this.owned(c.id);
      const sel = this.selected === c;
      const g = this.add.graphics();
      g.fillStyle(inDeck ? 0xfff6dc : 0xe7dcbb, 1).fillRoundedRect(x, y, w, L.cardH, 12);
      g.lineStyle(3, GRADE_COLOR(c.grade), 1).strokeRoundedRect(x, y, w, L.cardH, 12);
      // 고른 카드 (2026-11-22): 등급 테두리는 그대로 두고 바깥에 자홍 테두리 — 금색이면 유니크 등급 테두리와 구분이 안 됐다
      if (sel) g.lineStyle(3, SELECT_COLOR, 1).strokeRoundedRect(x - 2.5, y - 2.5, w + 5, L.cardH + 5, 14);
      if (!inDeck) g.fillStyle(0x0b2f2e, own ? 0.22 : 0.5).fillRoundedRect(x, y, w, L.cardH, 12);
      const img = charImage(this, x + 28, y + L.cardH / 2 + 2, c, 2.5);
      if (!own) img.setTint(0x30403c);
      const nm = uiText(this, x + 52, y + 14, c.name, 13, CSS.ink, 'bold');
      const gr = uiText(this, x + 52 + (inDeck ? 18 : 0), y + 34, GRADES[c.grade].name, 11, GRADES[c.grade].color, 'bold');
      this.gridC.add([g, img, nm, gr]);
      // 계열·출신 상징 (2026-11-22 사용자 요청: 상점 카드와 같은 시너지 그림 — 글자 줄 대신). 고용 전이면 옅게
      [c.cls, c.origin].forEach((k, j) => this.gridC.add(traitBadge(this, x + 52 + 9 + j * 22, y + 63, k, 8, own)));
      const enh = meta.enhance(c.id);
      if (enh) this.gridC.add(uiText(this, x + w - 10, y + L.cardH - 10, `+${enh}`, 11, CSS.primary, 'bold').setOrigin(1, 1));
      if (inDeck) {
        // 덱 표시 = 등급 글자 앞 작은 체크 (2026-11-21: 오른쪽 위에 두면 이름과 붙어 이름 줄 앞으로 옮김) — 2026-11-23 미리 그린 원
        const cx = x + 59, cy = Math.round(gr.y + gr.height / 2);
        const chk = this.add.container(cx, cy, [discImage(this, 0, 0, {
          id: 'deck_check', r: 7, fill: 0x3f9a5a,
          draw: (ctx) => { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-1, 3); ctx.lineTo(4, -3); ctx.stroke(); }
        })]);
        chk.auditBox = { x: -7, y: -7, w: 14, h: 14 }; // tools/ui-audit.cjs 여백 검사용
        this.gridC.add(chk);
      }
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
      if (!this.owned(c.id)) return this.toast('아직 고용하지 않은 캐릭터예요 — 영지의 술집에서 고용하세요');
      const next = [...this.deck, c.id];
      if (next.length > DECK_RULES.max) return this.toast(`덱은 최대 ${DECK_RULES.max}명입니다`);
      if (!deckValid(next)) return this.toast(`레어는 최대 ${DECK_RULES.rare}명, 유니크는 최대 ${DECK_RULES.unique}명입니다`);
      this.deck.push(c.id);
    }
    this.refresh();
  }

  drawInfo() {
    const I = L.info;
    const c = this.selected;
    this.info.removeAll(true);
    this.info.add(panel(this, I.x, I.y, I.w, I.h, 'card'));
    const col = c.grade === 4 ? '#b47a12' : CSS.primary;
    const head = charImage(this, I.x + 34, I.y + 36, c, 3);
    const nm = uiText(this, I.x + 64, I.y + 14, `${c.name}  ·  ${c.title}`, 16.5, col, 'bold');
    this.fit(nm, I.w - 80 - 52); // 오른쪽에 상징 배지 2개 자리
    const by = Math.round(nm.y + nm.height / 2);
    [c.cls, c.origin].forEach((k, j) => this.info.add(traitBadge(this, Math.round(nm.x + nm.width + 8 + 9 + j * 22), by, k, 8)));
    const enh = meta.enhance(c.id);
    const sub = uiText(this, I.x + 64, I.y + 38, `${GRADES[c.grade].name} · ${TRAITS[c.cls].name} · ${TRAITS[c.origin].name} · ${STYLES[c.style].name} (공격력 ${+(STYLES[c.style].dmg * GRADES[c.grade].mult).toFixed(1)} · 공속 ${STYLES[c.style].rate} · 사거리 ${STYLES[c.style].range})${enh ? ` · 강화 +${enh}` : ''}`, 11, CSS.sub, '600');
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
    line(`스킬 「${c.skill.name}」 — 마나가 가득 차면 시전`, 12, CSS.primary, 'bold', 4);
    [1, 2, 3].forEach((n) => line(`${'★'.repeat(n)} ${describeSkill(starSkill(c.skill, n))}`, 11, CSS.ink, '600', 4)); // 줄 사이 여백 4px 이상 (필수 규칙)
    const inDeck = this.deck.includes(c.id);
    const btn = new Button(this, I.x + I.w - 86, I.y + I.h - 28, 152, 36, inDeck ? '덱에서 빼기' : this.owned(c.id) ? '덱에 넣기' : '미보유', () => this.toggle(c), {
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
    const step = 40;
    const per = Math.floor((D.w - 24) / step);
    const sorted = [...this.deck].map((id) => ROSTER_BY_ID[id]).sort((a, b) => b.grade - a.grade || a.cls.localeCompare(b.cls));
    sorted.forEach((c, i) => {
      const x = D.x + 12 + (i % per) * step + step / 2;
      const y = D.y + 34 + Math.floor(i / per) * step + step / 2;
      const g = this.add.graphics();
      g.fillStyle(0xf3ead2, 1).fillRoundedRect(x - 18, y - 18, 36, 36, 8);
      g.lineStyle(2, GRADE_COLOR(c.grade), 1).strokeRoundedRect(x - 18, y - 18, 36, 36, 8);
      const img = charImage(this, x, y, c, 'head').setInteractive({ useHandCursor: true });
      img.on('pointerup', () => this.select(c));
      this.deckBox.add([g, img]);
    });
  }

  createFooter() {
    const y = GAME_H - 40;
    new Button(this, 872 + 70, y, 140, 48, '기본 덱', () => this.resetDeck(), { variant: 'outline', fontSize: 13 });
    new Button(this, 872 + 140 + 12 + 120, y, 240, 52, '저장하고 영지로', () => this.leave(), { variant: 'primary', fontSize: 16.5 });
  }

  resetDeck() {
    this.deck = DEFAULT_DECK.filter((id) => this.owned(id));
    this.refresh();
  }

  leave() {
    if (!meta.setDeck(this.deck)) return this.toast(`덱을 저장할 수 없습니다 (1~${DECK_RULES.max}명 · 레어 ${DECK_RULES.rare} · 유니크 ${DECK_RULES.unique} 이하)`);
    audio.init();
    slideTo(this, 'Lobby', undefined, -1); // 영지로 옆으로 밀어 돌아간다 (2026-11-22)
  }

  refresh() {
    const n = this.deck.length;
    const cnt = (g) => this.deck.filter((id) => ROSTER_BY_ID[id].grade === g).length;
    this.ptText.setText(`${n} / ${DECK_RULES.max}명`).setColor(n > DECK_RULES.max ? '#ff8a7a' : '#fff3c4');
    const by = [1, 2, 3, 4].map((g) => `${GRADES[g].name} ${cnt(g)}${g === 3 ? `/${DECK_RULES.rare}` : g === 4 ? `/${DECK_RULES.unique}` : ''}`).join(' · ');
    this.ptSub.setText(`${by} · 보유 ${ROSTER.filter((c) => this.owned(c.id)).length}명`);
    // 인원 막대
    const bx = 560;
    const bw = 160;
    const byy = 30;
    this.ptBar.clear().fillStyle(0x0b2f2e, 1).fillRoundedRect(bx, byy, bw, 10, 5);
    this.ptBar.fillStyle(n >= DECK_RULES.max ? 0xf2c14e : 0x58c096, 1).fillRoundedRect(bx, byy, Math.max(10, (bw * Math.min(n, DECK_RULES.max)) / DECK_RULES.max), 10, 5);
    for (const b of this.chipBtns) {
      const [k, v] = b.kind;
      const on = k === 'show' ? this.filter.show === v : this.filter.grade === v;
      b.setAlpha(on ? 1 : 0.62);
      b.bg.setTint(on ? 0xd9f0c8 : 0xffffff);
    }
    this.drawTraitFilter();
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
    const c = this.add.container(436, 680, [panel(this, -w / 2, -18, w, 36, 'strip'), t]).setDepth(50);
    this.toastObj = c;
    this.tweens.add({ targets: c, alpha: 0, delay: 1600, duration: 300, onComplete: () => c.destroy() });
  }
}
