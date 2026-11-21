// UI 글자 정렬 점검 (2026-11-21 사용자 요청: UI 디자인이 바뀔 때마다 글자 좌우·상하 간격 정렬을 확인)
// 사용법: npm run build && npx vite preview --port 4173 &  →  node tools/ui-audit.cjs [tall|wide|all]
// 장면마다 보이는 글자(Text)를 모두 훑어서 알린다:
//   off    화면 밖으로 나감
//   overlap 다른 글자와 겹침
//   pad    글자를 감싼 패널(카드·알약·버튼) 안 여백이 한쪽만 좁음 (가장자리에 닿음 < 4px)
//   center 버튼 글자가 버튼 가운데에서 벗어남 (> 3px)
//   icon   아이콘 버튼: 아이콘과 글자가 겹치거나 버튼 밖으로 나감
// 결과: 표 + ui-audit/<배치>-<장면>.png (모든 장면, 문제 글자에 빨간 상자) — 자동 점검 뒤 화면을 눈으로도 본다
const { chromium } = require('playwright');
const fs = require('fs');

const which = process.argv[2] || 'all';
const OUT = 'ui-audit';
fs.mkdirSync(OUT, { recursive: true });

async function audit(page) {
  return page.evaluate(() => {
    const g = window.game;
    const scenes = g.scene.getScenes(true);
    const issues = [];
    const texts = [];
    const panels = [];
    const buttons = [];
    const visible = (o) => {
      for (let p = o; p; p = p.parentContainer) if (!p.visible || p.alpha === 0) return false;
      return true;
    };
    // 스크롤 목록(마스크) 밖으로 가려진 글자는 안 본다 — 마스크를 쓰는 컨테이너는 maskRect {x,y,w,h} 를 달아 둔다
    const maskBounds = (o) => {
      for (let p = o.parentContainer; p; p = p.parentContainer) if (p.maskRect) { const r = p.maskRect; return new Phaser.Geom.Rectangle(r.x, r.y, r.w, r.h); }
      return null;
    };
    const walk = (list, sceneKey) => {
      for (const o of list) {
        if (!visible(o)) continue;
        if (o.type === 'Container') {
          if (o.label && o.bg && o.list?.includes(o.label) && !o.auditOk) buttons.push({ o, sceneKey });
          walk(o.list, sceneKey);
        } else if (o.type === 'Text' && o.text.trim() && !o.auditOk) {
          const b = o.getBounds();
          const m = maskBounds(o);
          if (m && !Phaser.Geom.Rectangle.ContainsRect(m, b)) continue;
          texts.push({ o, sceneKey, b });
        }
        else if (o.type === 'Image' && /^cozy_/.test(o.texture.key)) {
          const b = o.getBounds();
          const pad = 3; // SHADOW_PAD
          panels.push({ o, sceneKey, b: new Phaser.Geom.Rectangle(b.x + pad, b.y + pad, b.width - pad * 2, b.height - pad * 2) });
        }
      }
    };
    for (const s of scenes) walk(s.children.list, s.scene.key);
    const W = scenes[0].scale.width / scenes[0].cameras.main.zoom;
    const H = scenes[0].scale.height / scenes[0].cameras.main.zoom;
    // 그려지는 깊이: 가장 바깥 컨테이너의 depth
    const depthOf = (o) => {
      let r = o;
      while (r.parentContainer) r = r.parentContainer;
      return r.depth || 0;
    };
    const name = (t) => `${t.sceneKey}:"${t.o.text.replace(/\n/g, ' ').slice(0, 24)}"`;
    const R = (b) => [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)];
    for (const t of texts) {
      const b = t.b;
      if (b.x < -1 || b.y < -1 || b.right > W + 1 || b.bottom > H + 1) issues.push({ kind: 'off', at: name(t), box: R(b) });
      // 가장 작은 감싸는 패널
      // 글자 바로 아래 깔린 패널: 글자보다 위에 있지 않은 것 중 가장 위(깊이) → 그중 가장 작은 것
      const under = panels.filter((p) => p.sceneKey === t.sceneKey && p.b.contains(b.centerX, b.centerY) && p.b.width * p.b.height > b.width * b.height && depthOf(p.o) <= depthOf(t.o));
      const top = Math.max(...under.map((p) => depthOf(p.o)));
      const host = under.filter((p) => depthOf(p.o) === top).sort((a, c) => a.b.width * a.b.height - c.b.width * c.b.height)[0];
      if (host) {
        const p = host.b;
        const l = b.x - p.x, r = p.right - b.right, tp = b.y - p.y, bt = p.bottom - b.bottom;
        if (Math.min(l, r) < 4 || Math.min(tp, bt) < 1) issues.push({ kind: 'pad', at: name(t), gap: [l, r, tp, bt].map(Math.round), box: R(b) });
        // 가운데 정렬 글자는 패널 가운데와 비교 (패널 안에 혼자 있을 때만 의미가 있어 버튼에서 따로 본다)
      }
      for (const u of texts) {
        if (u === t || u.sceneKey !== t.sceneKey || u.o.depth !== t.o.depth) continue;
        const inter = Phaser.Geom.Rectangle.Intersection(b, u.b);
        if (inter.width > 3 && inter.height > 3 && texts.indexOf(u) > texts.indexOf(t)) issues.push({ kind: 'overlap', at: `${name(t)} × ${name(u)}`, box: R(inter) });
      }
    }
    for (const { o, sceneKey } of buttons) {
      const lb = o.label.getBounds();
      const bx = o.getBounds();
      if (o.icon && o.iconRect) {
        // 아이콘 버튼: 아이콘과 글자가 겹치지 않고, 둘 다 버튼 안에 (아이콘 위 타일형은 가로 가운데만 본다)
        const r = o.iconRect;
        const ib = new Phaser.Geom.Rectangle(bx.centerX + r.x, bx.centerY + r.y, r.w, r.h);
        const inner = new Phaser.Geom.Rectangle(bx.x + 2, bx.y + 2, bx.width - 4, bx.height - 4);
        const hit = Phaser.Geom.Rectangle.Intersection(ib, lb);
        if (o.label.text.trim() && hit.width > 1 && hit.height > 1) issues.push({ kind: 'icon', at: `${sceneKey}:[${o.label.text.replace(/\n/g, ' ')}] 아이콘·글자 겹침`, box: R(lb) });
        for (const [k, q] of [['아이콘', ib], ['글자', lb]]) if (o.label.text.trim() && !Phaser.Geom.Rectangle.ContainsRect(inner, q)) issues.push({ kind: 'icon', at: `${sceneKey}:[${o.label.text.replace(/\n/g, ' ')}] ${k}가 버튼 밖`, box: R(q) });
        if (!o.iconLeft && Math.abs(lb.centerX - bx.centerX) > 3) issues.push({ kind: 'center', at: `${sceneKey}:[${o.label.text}]`, d: [Math.round(lb.centerX - bx.centerX), 0], box: R(lb) });
        continue;
      }
      const dx = lb.centerX - bx.centerX;
      const dy = lb.centerY - bx.centerY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) issues.push({ kind: 'center', at: `${sceneKey}:[${o.label.text}]`, d: [Math.round(dx), Math.round(dy)], box: R(lb) });
    }
    return { issues, count: texts.length };
  });
}

async function mark(page, issues, file) {
  await page.evaluate((boxes) => {
    const s = window.game.scene.getScenes(true).slice(-1)[0];
    window.__auditG?.destroy();
    const gfx = s.add.graphics().setDepth(99999);
    gfx.lineStyle(2, 0xff0000, 1);
    for (const [x, y, w, h] of boxes) gfx.strokeRect(x, y, w, h);
    window.__auditG = gfx;
  }, issues.map((i) => i.box));
  await page.waitForTimeout(80);
  await page.screenshot({ path: file });
}

// 다른 장면을 모두 멈추고 하나만 띄운다 (겹쳐 세지 않게)
const go = (p, key, data) =>
  p.evaluate(([key, data]) => {
    for (const s of window.game.scene.getScenes(false)) if (s.scene.key !== key && (s.sys.isActive() || s.sys.isPaused() || s.sys.isSleeping())) s.scene.stop();
    window.game.scene.start(key, data);
  }, [key, data]);
const SCREENS = [
  ['title', async (p) => {}],
  ['lobby', (p) => go(p, 'Lobby')],
  ['deck', (p) => go(p, 'Deck')],
  ['tavern', (p) => go(p, 'Tavern')],
  ['workshop', async (p) => { await p.evaluate(() => { const m = window.__rtd.meta; m.data.relics = { hero_sword: 2, war_drum: 1 }; m.data.equipped = ['hero_sword']; }); await go(p, 'Workshop'); }],
  ['game', async (p) => { await go(p, 'Game'); await p.waitForTimeout(3500); }],
  ['game-select', (p) => p.evaluate(() => { const g = window.game.scene.getScene('Game'); g.gold = 999; g.hire('isolde'); g.select(g.mercs[0]); })],
  ['game-menu', (p) => p.evaluate(() => { const g = window.game.scene.getScene('Game'); g.select(null); g.hud.toggleMenu(); })],
  ['upgrade', async (p) => { await p.evaluate(() => window.__rtd.meta.addFame(500)); await go(p, 'Upgrade', { from: 'lobby' }); }]
];

(async () => {
  const b = await chromium.launch();
  let total = 0;
  for (const [layout, vp] of [['tall', { width: 544, height: 960 }], ['wide', { width: 1280, height: 720 }]]) {
    if (which !== 'all' && which !== layout) continue;
    const p = await b.newPage({ viewport: vp });
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(`http://localhost:4173/?layout=${layout}`);
    await p.waitForFunction(() => window.game?.scene.isActive('Title'));
    await p.evaluate(() => { window.__rtd.meta.reset(); window.__rtd.meta.addStones(20); });
    await p.waitForTimeout(400);
    for (const [name, go] of SCREENS) {
      await go(p);
      await p.waitForTimeout(700);
      const { issues, count } = await audit(p);
      total += issues.length;
      console.log(`\n[${layout}] ${name}: 글자 ${count}개, 문제 ${issues.length}개`);
      for (const i of issues) console.log(`  ${i.kind.padEnd(7)} ${i.at}${i.gap ? ` 여백(좌·우·위·아래)=${i.gap}` : ''}${i.d ? ` 어긋남=${i.d}` : ''}`);
      await mark(p, issues, `${OUT}/${layout}-${name}.png`); // 문제가 없어도 눈으로 볼 수 있게 저장
    }
    if (errs.length) console.log('page errors', errs);
    await p.close();
  }
  await b.close();
  console.log(`\n합계 문제 ${total}개 · 표시한 화면: ${OUT}/`);
})();
