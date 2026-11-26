import Phaser from 'phaser';
import { hiRes } from '../systems/hires.js';
import { GAME_W, GAME_H } from '../config.js';
import { Button } from '../ui/Button.js';
import { panel, uiText, CSS, traitBadge, ringImage, discImage, gradeFrame, screenTop, screenDock } from '../ui/theme.js';
import { audio } from '../systems/audio.js';
import { meta } from '../systems/meta.js';
import { ROSTER, ROSTER_BY_ID, GRADES, STYLES, DECK_RULES, DEFAULT_DECK, TRAIT_TEXT, deckValid } from '../data/roster.js';
import { describeSkill } from '../data/skills.js';
import { starSkill } from '../data/stars.js';
import { TRAITS, CLASS_IDS, ORIGIN_IDS } from '../data/synergy.js';
import { charImage } from '../objects/Mercenary.js';
import { Kinetic } from '../ui/kinetic.js';
import { dissolveTo } from '../ui/dissolve.js';

// 병영 = 덱 편성 (룰 v2, 2026-11-20). 가진 캐릭터(술집에서 고용) 중 최대 30명 — 레어 9명·유니크 3명까지.
// 판 안 상점은 이 덱의 캐릭터만 내놓는다. 카드를 누르면 정보 창에 계열·출신·특성·스킬(별마다), '덱에 넣기/빼기'.

// 시너지 필터 줄(synY 136) 아래부터 격자 (2026-11-22)
// 2026-11-25 시안: 영지처럼 위 바(이름·등급 수·보유) + 아래 바(일직선, 덱 머리 2줄 + 기본 덱·저장) · '출전 덱 n / 30' + 인원 막대는 오른쪽 정보 칸 아래 왼쪽
const DOCK = { y: 604, tab: { x0: GAME_W / 2, x1: GAME_W / 2, depth: 0, slope: 0 } };
// 격자 판 아래 끝 = 오른쪽 정보 칸 아래 끝 (2026-11-25 사용자 요청: 아래 바와 붙어 있었다) — 판은 격자보다 위아래 6 크다
const INFO_BOTTOM = DOCK.y - 12;
const L = { grid: { x: 16, y: 136, w: 840, h: INFO_BOTTOM - 6 - 136 }, cols: 6, cardH: 116, info: { x: 872, y: 60, w: 392, h: INFO_BOTTOM - 60 }, deck: { x: 24, y: DOCK.y + 14, step: 42, per: 15 }, chipY: 70, synY: 106 };

/** 덱 편성에서 고른 카드의 바깥 테두리 색 (등급색 — 동·은/초록·파랑·금 — 과 겹치지 않게 자홍) */
const SELECT_COLOR = 0xd94fa0;
const CHIP_H = 23; // 필터 버튼 높이 (2026-11-25 사용자 요청: 30 → 25% 얇게)
const SIDE_FILL = 0.6; // 카드 오른쪽 60% = 등급색 (이름·등급·시너지 오른쪽 정렬)

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
    this.top = screenTop(this, { icon: 'sword', title: '병영', right: [['보유', '', 0x58c096, 'userplus']] });
    this.ptSub = this.top.sub;
    screenDock(this, DOCK.y, DOCK.tab, null);
    // 출전 인원: 오른쪽 정보 칸 아래 왼쪽 (덱에서 빼기 버튼과 같은 줄) — 정보 칸 위에 그리게 깊이 5
    const I = L.info;
    this.ptText = uiText(this, I.x + 16, I.y + I.h - 38, '', 13, CSS.ink, 'bold').setOrigin(0, 0.5).setDepth(5);
    this.ptBar = this.add.graphics().setDepth(5);
  }

  createFilters() {
    const y = L.chipY;
    const chips = [
      ['all', '전체'], ['owned', '보유'], ['deck', '덱']
    ];
    const grades = [[0, '전 등급'], [1, '커먼'], [2, '언커먼'], [3, '레어'], [4, '유니크']];
    this.chipBtns = [];
    let x = 16;
    for (const [v, label] of chips) {
      const w = 64;
      const b = new Button(this, x + w / 2, y, w, CHIP_H, label, () => {
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
      const b = new Button(this, gx + w / 2, gy, w, CHIP_H, label, () => {
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
      // 등급 테두리 = 그라데이션 (2026-11-25 사용자 결정) — 예전 선(3)처럼 바깥으로 1.5 걸친다
      // 2026-11-25 사용자 요청: 테두리 안쪽 오른쪽 60% 를 테두리와 같은 색으로 채우고 이름·등급·시너지를 오른쪽 정렬
      const frame = gradeFrame(this, x - 1.5, y - 1.5, w + 3, L.cardH + 3, c.grade, { r: 13.5, fill: inDeck ? '#fff6dc' : '#e7dcbb', side: SIDE_FILL });
      const g = this.add.graphics();
      // 고른 카드 (2026-11-22): 등급 테두리는 그대로 두고 바깥에 자홍 테두리 — 금색이면 유니크 등급 테두리와 구분이 안 됐다
      if (sel) g.lineStyle(3, SELECT_COLOR, 1).strokeRoundedRect(x - 2.5, y - 2.5, w + 5, L.cardH + 5, 14);
      if (!inDeck) g.fillStyle(0x0b2f2e, own ? 0.22 : 0.5).fillRoundedRect(x, y, w, L.cardH, 12);
      const img = charImage(this, x + 26, y + L.cardH / 2 + 2, c, 2.5);
      if (!own) img.setTint(0x30403c);
      const tc = c.grade === 2 || c.grade === 3 ? '#ffffff' : '#2b1d2f'; // 등급색 위 글자
      const R = x + w - 8; // 오른쪽 정렬 끝
      const zoneW = w * SIDE_FILL - 12;
      const nm = uiText(this, R, y + 14, c.name, 13, tc, 'bold').setOrigin(1, 0);
      this.fit(nm, zoneW);
      const gr = uiText(this, R, y + 40, GRADES[c.grade].name, 11, tc, 'bold').setOrigin(1, 0);
      this.gridC.add([frame, g, img, nm, gr]);
      // 계열·출신 상징 — 오른쪽 정렬 (고용 전이면 옅게)
      const bx = (j) => R - 9 - (1 - j) * 22;
      [c.cls, c.origin].forEach((k, j) => this.gridC.add(traitBadge(this, bx(j), y + L.cardH - 22, k, 8, own)));
      const enh = meta.enhance(c.id);
      if (enh) this.gridC.add(uiText(this, bx(0) - 9 - 4, y + L.cardH - 22, `+${enh}`, 11, tc, 'bold').setOrigin(1, 0.5));
      if (inDeck) {
        // 덱 표시 = 등급 글자 앞 작은 체크 — 2026-11-23 미리 그린 원
        const cx = Math.round(gr.x - gr.width - 4 - 7), cy = Math.round(gr.y + gr.height / 2);
        const chk = this.add.container(cx, cy, [discImage(this, 0, 0, {
          id: 'deck_check', r: 7, fill: 0x3f9a5a, line: 0xffffff, lw: 1.5,
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
      if (this.deck.length <= 1) return this.toast('덱 최소 1명');
      this.deck.splice(i, 1);
    } else {
      if (!this.owned(c.id)) return this.toast('미고용 · 술집에서 고용');
      const next = [...this.deck, c.id];
      if (next.length > DECK_RULES.max) return this.toast(`덱 최대 ${DECK_RULES.max}명`);
      if (!deckValid(next)) return this.toast(`레어 최대 ${DECK_RULES.rare} · 유니크 최대 ${DECK_RULES.unique}`);
      this.deck.push(c.id);
    }
    audio.toggle(i < 0);
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

  /** 아래 독: 지금 덱 머리 15명 × 2줄 (누르면 그 캐릭터 정보) — 2026-11-25 시안 */
  drawDeck() {
    this.deckBox.removeAll(true);
    const D = L.deck;
    const sorted = [...this.deck].map((id) => ROSTER_BY_ID[id]).sort((a, b) => b.grade - a.grade || a.cls.localeCompare(b.cls));
    sorted.forEach((c, i) => {
      const x = D.x + (i % D.per) * D.step + D.step / 2;
      const y = D.y + Math.floor(i / D.per) * D.step + D.step / 2;
      const g = gradeFrame(this, x - 19, y - 19, 38, 38, c.grade, { r: 9, lw: 2, fill: '#f3ead2' });
      const img = charImage(this, x, y, c, 'head').setInteractive({ useHandCursor: true });
      img.on('pointerup', () => this.toggle(c)); // 누르면 덱에서 빼기 (2026-11-25 사용자 요청)
      this.deckBox.add([g, img]);
    });
  }

  createFooter() {
    const y = DOCK.y + 58;
    new Button(this, 872 + 60, y, 120, 44, '기본 덱', () => this.resetDeck(), { variant: 'outline', fontSize: 13 });
    new Button(this, 872 + 120 + 12 + 130, y, 260, 48, '저장하고 영지로', () => this.leave(), { variant: 'primary', fontSize: 16.5 });
  }

  resetDeck() {
    this.deck = DEFAULT_DECK.filter((id) => this.owned(id));
    this.refresh();
  }

  leave() {
    if (!meta.setDeck(this.deck)) return this.toast(`덱을 저장할 수 없습니다 (1~${DECK_RULES.max}명 · 레어 ${DECK_RULES.rare} · 유니크 ${DECK_RULES.unique} 이하)`);
    audio.init();
    dissolveTo(this, 'Lobby'); // 영지로 디졸브 (2026-11-23, 이전 옆으로 밀기)
  }

  refresh() {
    const n = this.deck.length;
    const cnt = (g) => this.deck.filter((id) => ROSTER_BY_ID[id].grade === g).length;
    this.ptText.setText(`출전 덱 ${n} / ${DECK_RULES.max}`).setColor(n > DECK_RULES.max ? CSS.red : CSS.ink);
    const by = [1, 2, 3, 4].map((g) => `${GRADES[g].name} ${cnt(g)}${g === 3 ? `/${DECK_RULES.rare}` : g === 4 ? `/${DECK_RULES.unique}` : ''}`).join(' · ');
    this.ptSub.setText(by);
    this.top.right[0].setText(`보유 ${ROSTER.filter((c) => this.owned(c.id)).length} / ${ROSTER.length}`);
    // 인원 막대: 글자 아래
    const bw = 160;
    const bx = L.info.x + 16;
    const byy = L.info.y + L.info.h - 22;
    this.ptBar.clear().fillStyle(0xe3d6b6, 1).fillRoundedRect(bx, byy, bw, 6, 3);
    this.ptBar.fillStyle(n >= DECK_RULES.max ? 0xe2b54a : 0x58c096, 1).fillRoundedRect(bx, byy, Math.max(6, (bw * Math.min(n, DECK_RULES.max)) / DECK_RULES.max), 6, 3);
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
    const c = this.add.container(436, DOCK.y - DOCK.tab.depth - 30, [panel(this, -w / 2, -18, w, 36, 'strip'), t]).setDepth(50);
    this.toastObj = c;
    this.tweens.add({ targets: c, alpha: 0, delay: 1600, duration: 300, onComplete: () => c.destroy() });
  }
}
