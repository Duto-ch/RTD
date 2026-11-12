// 밸런스 시뮬레이터: 탐욕 봇(가능하면 머지, 아니면 고용)으로 게임 로직을 고속 실행해 도달 웨이브를 출력
// 사용법: npm run build && npx vite preview --port 4173 &  →  node tools/balance-sim.cjs
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 544, height: 960 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:4173'); await p.waitForTimeout(1200);
  await p.mouse.click(272, 650); await p.waitForTimeout(300);
  const res = await p.evaluate(() => {
    const game = window.game; game.loop.sleep();
    const g = game.scene.getScene('Game');
    g.toast = () => {}; g.showBanner = () => {}; g.floatText = () => {};
    const log = [];
    let lastWave = 0, maxAlive = 0;
    for (let step = 0; step < 200000 && !g.over; step++) {
      // 봇: 머지 가능하면 머지(낮은 레벨 우선), 아니면 고용
      let acted = true;
      while (acted) {
        acted = false;
        const ms = g.mercs.sort((a, b) => a.level - b.level);
        outer: for (const a of ms) for (const c of ms) if (a.canMergeWith(c) && g.gold >= 20 && g.gold >= ({2:20,3:50,4:120,5:300})[c.level+1]) { g.merge(a, c); acted = true; break outer; }
        if (!acted && g.gold >= g.hireCost && g.mercs.length < 25) { g.hire(); acted = true; }
      }
      g.update(0, 100); // 0.1초
      maxAlive = Math.max(maxAlive, g.monsters.length);
      if (g.wave !== lastWave) {
        if (g.wave % 5 === 0) log.push(`W${g.wave} gold=${g.gold} alive=${g.monsters.length} lvls=${JSON.stringify(g.mercs.reduce((o,m)=>(o[m.level]=(o[m.level]||0)+1,o),{}))} relics=${Object.values(g.relics).reduce((a,b)=>a+b,0)}`);
        lastWave = g.wave;
      }
    }
    return { wave: g.wave, kills: g.totalKills, over: g.over, log };
  });
  console.log(res.log.join('\n')); console.log('END wave', res.wave, 'kills', res.kills, 'errors', JSON.stringify(errs));
  await b.close();
})();
