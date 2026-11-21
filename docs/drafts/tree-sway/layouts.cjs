// 나무 배치 시안 찍기 (2026-11-21): 위 3 · 왼쪽 1 · 오른쪽 2 · 아래 5, 규칙적인 간격을 피하고 일부는 좌우 뒤집기, 아래는 서로 겹쳐도 됨
// 'alt' 나무 2그루는 다른 녹색(잎 색 변형 deco_tree_<색>) — 2026-11-21
// 먼저: npm run build && npx vite preview --port 4173 · 실행: node docs/drafts/tree-sway/layouts.cjs [teal|spring] → layout-<A..D>[-색].png
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ALT = process.argv[2]; // 없으면 모두 기본 나무
const FILE = process.argv[3] || 'layouts.json'; // layouts_plus.json = 무작위 나무를 더한 판 (add_random.py)
const TAG = FILE === 'layouts.json' ? '' : '-' + FILE.replace('layouts_', '').replace('.json', '');
const L = JSON.parse(fs.readFileSync(path.join(__dirname, FILE), 'utf8'));
(async () => {
  const b = await chromium.launch();
  for (const [name, trees] of Object.entries(L)) {
    const p = await b.newPage({ viewport: { width: 544, height: 960 }, deviceScaleFactor: 1 });
    await p.goto('http://localhost:4173/');
    await p.waitForFunction(() => window.game?.scene.isActive('Title'));
    await p.waitForTimeout(300);
    await p.mouse.click(272, 652);
    await p.waitForFunction(() => window.game.scene.isActive('Lobby'));
    await p.keyboard.press('Space');
    await p.waitForFunction(() => window.game.scene.isActive('Game'));
    await p.waitForTimeout(3500); // 시작 배너가 사라질 때까지
    await p.evaluate(([trees, ALT]) => {
      const g = window.game.scene.getScene('Game');
      g.decor.forEach((s) => s.destroy());
      g.decor = trees.map((d, i) => {
        const key = d.alt && ALT ? `deco_tree_${ALT}` : 'deco_tree';
        const s = g.add.sprite(d.x, d.y, key).setScale(2).setDepth(0.8 + d.y / 100000);
        const cd = s.texture.customData;
        s.setFlipX(!!d.flip).setOrigin((d.flip ? cd.frameWidth - cd.pivotX : cd.pivotX) / cd.frameWidth, cd.pivotY / cd.frameHeight);
        s.play(`${key}:sway`); s.anims.setProgress((i * 0.37) % 1);
        return s;
      });
    }, [trees, ALT]);
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(__dirname, `layout-${name}${ALT ? '-' + ALT : ''}${TAG}.png`) });
    await p.close();
  }
  await b.close();
})();
