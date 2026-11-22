// 나무·꽃 배치 시안 찍기 (2026-11-22): variants.json 의 배치로 전투 화면의 장식을 바꿔 끼우고 UI 있음·없음 두 장씩
// 먼저: npm run build && npx vite preview --port 4173 · 실행: node docs/drafts/tree-sway/variants.cjs → variant-<이름>.png (왼쪽 UI 있음 · 오른쪽 없음)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const V = JSON.parse(fs.readFileSync(path.join(__dirname, 'variants.json'), 'utf8'));
(async () => {
  const b = await chromium.launch();
  for (const [name, list] of Object.entries(V)) {
    const p = await b.newPage({ viewport: { width: 544, height: 960 }, deviceScaleFactor: 1 });
    await p.goto('http://localhost:4173/');
    await p.waitForFunction(() => window.game?.scene.isActive('Title'));
    await p.waitForTimeout(300);
    await p.mouse.click(272, 652);
    await p.waitForFunction(() => window.game.scene.isActive('Lobby'));
    await p.keyboard.press('Space');
    await p.waitForFunction(() => window.game.scene.isActive('Game'));
    await p.waitForTimeout(3500);
    await p.evaluate((list) => {
      const g = window.game.scene.getScene('Game');
      g.decor.forEach((s) => s.destroy());
      g.decor = list.map((d) => {
        const s = g.add.sprite(d.x, d.y, d.key).setScale(2).setDepth(0.8 + d.y / 100000);
        const cd = s.texture.customData;
        s.setFlipX(!!d.flip).setOrigin((d.flip ? cd.frameWidth - cd.pivotX : cd.pivotX) / cd.frameWidth, cd.pivotY / cd.frameHeight);
        if (g.anims.exists(`${d.key}:sway`)) { s.play(`${d.key}:sway`); s.anims.setProgress(d.phase || 0); }
        return s;
      });
    }, list);
    await p.waitForTimeout(300);
    const a = path.join(__dirname, `_v-${name}-ui.png`), c = path.join(__dirname, `_v-${name}-noui.png`);
    await p.screenshot({ path: a });
    await p.evaluate(() => window.game.scene.getScene('Game').children.list.forEach((o) => { if (o.depth >= 100) o.setVisible(false); }));
    await p.waitForTimeout(200);
    await p.screenshot({ path: c });
    await p.close();
  }
  await b.close();
})();
