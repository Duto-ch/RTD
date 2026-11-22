// 지금 전투 화면을 레이어별 투명 PNG 로 뽑고 PSD 로 묶는다 (2026-11-22 사용자 요청: UI 작업물을 레이어로 나눈 PSD)
// 사용법: npm run build && npx vite preview --port 4173 &  →  node tools/export-psd.cjs [출력 폴더]
//   → <폴더>/layers/*.png + <폴더>/rtd-battle.psd (tools/make-psd.py, pip install psd-tools)
// 화면은 1920x1080 (PC). 게임을 ?transparent=1 로 띄워 캔버스 바탕을 투명하게 하고, 물체를 층마다 하나씩 보이게 해서 찍는다
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const OUT = path.resolve(process.argv[2] || 'psd-export');
fs.mkdirSync(path.join(OUT, 'layers'), { recursive: true });

// 아래 → 위 순서 (PSD 레이어 순서)
const ORDER = [
  '전장 · 땅', '전장 · 나무·꽃', '전장 · 필드(석판·성벽·성문)', '몬스터', '용병', '전장 · 이펙트·표시',
  'UI · 위 바', 'UI · 시너지', 'UI · 아이템', 'UI · 대기석', 'UI · 대기석 용병', 'UI · 아래 독(상점·버튼)', 'UI · 알림', 'UI · 기타'
];

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:4173/?transparent=1');
  await p.addStyleTag({ content: 'html,body,#game{background:transparent !important}' });
  await p.waitForFunction(() => window.game?.scene.isActive('Title'));
  await p.evaluate(() => { window.game.scene.stop('Title'); window.game.scene.start('Game'); }); // 타이틀이 뒤에 남지 않게
  await p.waitForFunction(() => window.game.scene.getScene('Game')?.hud);
  // 보기 좋은 판 상태: 영지 Lv7 · 용병 9 + 대기석 · 아이템 · 3웨이브 몬스터
  await p.evaluate(() => {
    const g = window.game.scene.getScene('Game');
    g.gold = 9999;
    for (let i = 0; i < 6; i++) g.levelUpEstate();
    for (let k = 0; k < 3; k++) { for (let i = 0; i < 6; i++) g.buy(i); g.reroll(); }
    g.giveItem('whet'); g.giveItem('feath');
    g.startWave(3);
  });
  await p.waitForTimeout(3500); // 몬스터가 길에 퍼져 있을 때
  await p.evaluate(() => window.game.scene.pause('Game')); // 멈춘 장면도 그려진다 (움직임만 멈춤)
  await p.waitForTimeout(300);

  const layers = await p.evaluate(() => {
    const g = window.game.scene.getScene('Game');
    const mons = new Set(g.monsters);
    // 도형(Graphics)은 getBounds 가 없다 → 그리기 명령에서 상자를 구한다 (Phaser graphics/Commands.js)
    const ARGS = { 0: 7, 1: 0, 2: 0, 3: 4, 4: 2, 5: 2, 6: 3, 7: 2, 8: 0, 9: 0, 10: 6, 11: 6, 14: 0, 15: 0, 16: 2, 17: 2, 18: 1, 21: 8, 22: 9 };
    const gfxBounds = (o) => {
      const c = o.commandBuffer;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      const add = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
      for (let i = 0; i < c.length;) {
        const cmd = c[i];
        const n = ARGS[cmd];
        if (n === undefined) break;
        const a = c.slice(i + 1, i + 1 + n);
        if (cmd === 3) { add(a[0], a[1]); add(a[0] + a[2], a[1] + a[3]); }
        else if (cmd === 4 || cmd === 5) add(a[0], a[1]);
        else if (cmd === 0) { add(a[0] - a[2], a[1] - a[2]); add(a[0] + a[2], a[1] + a[2]); }
        else if (cmd === 10 || cmd === 11) { add(a[0], a[1]); add(a[2], a[3]); add(a[4], a[5]); }
        i += 1 + n;
      }
      if (x0 === Infinity) return null;
      return { left: o.x + x0, top: o.y + y0, right: o.x + x1, bottom: o.y + y1, width: x1 - x0, centerX: o.x + (x0 + x1) / 2, centerY: o.y + (y0 + y1) / 2 };
    };
    // 컨테이너는 원점(0,0)까지 상자에 들어가 위치가 틀어진다 → 보이는 자식 상자를 합친다
    const boundsOf = (o, dx = 0, dy = 0) => {
      if (o.type === 'Container') {
        let u = null;
        for (const c of o.list) {
          if (!c.visible) continue;
          const b = c.type === 'Container' || c.commandBuffer ? boundsOf(c, dx + o.x, dy + o.y) : c.getBounds?.();
          if (!b || !b.width) continue;
          u = u ? { left: Math.min(u.left, b.left), top: Math.min(u.top, b.top), right: Math.max(u.right, b.right), bottom: Math.max(u.bottom, b.bottom) } : { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
        }
        return u && { ...u, width: u.right - u.left, centerX: (u.left + u.right) / 2, centerY: (u.top + u.bottom) / 2 };
      }
      if (o.commandBuffer) {
        const b = gfxBounds(o);
        return b && { left: b.left + dx, top: b.top + dy, right: b.right + dx, bottom: b.bottom + dy, width: b.width, centerX: b.centerX + dx, centerY: b.centerY + dy };
      }
      return o.getBounds?.();
    };
    const name = (o) => {
      const ui = !(o.worldLayer || (o.depth < 100 && !o.uiLayer));
      if (o.char && o.synMarks) return o.reserved ? 'UI · 대기석 용병' : '용병';
      if (mons.has(o)) return '몬스터';
      if (!ui) {
        const key = o.texture?.key || '';
        if (key.startsWith('bg_')) return '전장 · 땅';
        if (key.startsWith('deco_')) return '전장 · 나무·꽃';
        if (key.startsWith('field') || key.startsWith('gate') || o.depth < 10) return '전장 · 필드(석판·성벽·성문)';
        return '전장 · 이펙트·표시';
      }
      const bb = boundsOf(o);
      if (!bb || !bb.width) return 'UI · 기타';
      const cx = bb.centerX, cy = bb.centerY;
      if (bb.bottom <= 84) return 'UI · 위 바';
      if (bb.top >= 600 || cy >= 610) return 'UI · 아래 독(상점·버튼)';
      if (cx < 360 && cy < 460) return 'UI · 시너지';
      if (cx < 360) return 'UI · 아이템';
      if (cx > 1040 && cy < 300) return 'UI · 대기석';
      return 'UI · 알림';
    };
    window.__psd = g.children.list.filter((o) => o.visible).map((o) => ({ o, n: name(o) }));
    const count = {};
    for (const { n } of window.__psd) count[n] = (count[n] || 0) + 1;
    return count;
  });
  console.log(layers);

  const shots = [];
  for (const [i, n] of ORDER.entries()) {
    if (!layers[n]) continue;
    await p.evaluate((n) => { for (const { o, n: k } of window.__psd) o.setVisible(k === n); }, n);
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const file = path.join(OUT, 'layers', `${String(i).padStart(2, '0')}.png`);
    await p.screenshot({ path: file, omitBackground: true });
    shots.push({ name: n, file });
  }
  // 전체 (참고용)
  await p.evaluate(() => { for (const { o } of window.__psd) o.setVisible(true); });
  await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await p.screenshot({ path: path.join(OUT, 'preview.png') });
  await b.close();
  fs.writeFileSync(path.join(OUT, 'layers.json'), JSON.stringify(shots, null, 1));
  if (errs.length) console.log('page errors', errs);
  execFileSync('python3', [path.join(__dirname, 'make-psd.py'), OUT], { stdio: 'inherit' });
})();
