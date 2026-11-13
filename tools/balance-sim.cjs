// 밸런스 시뮬레이터: 봇(빈 칸 있으면 고용, 가득 차면 낮은 레벨부터 머지)으로 게임 로직을 고속 실행해 도달 웨이브를 출력
// 사용법: npm run build && npx vite preview --port 4173 &  →  node tools/balance-sim.cjs ['{"hpGrowth":1.08}'] ['{"atk":10}']
//   1번째 인자(JSON): BALANCE 덮어쓰기 실험. BALANCE.monster 의 키는 monster 에, 나머지(baseDamageMult 등)는 BALANCE 에 적용
//   2번째 인자(JSON): 명성 강화 레벨 (예: {"atk":10,"funds":5}). 없으면 강화 0 (기본 밸런스: 10~15웨이브가 한계)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 544, height: 960 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const levels = JSON.parse(process.argv[3] || '{}');
  await p.addInitScript((levels) => { try { localStorage.setItem('rtd_meta_v1', JSON.stringify({ fame: 0, levels })); } catch {} }, levels);
  await p.goto('http://localhost:4173'); await p.waitForTimeout(1200);
  await p.mouse.click(272, 650); await p.waitForTimeout(300);
  const override = JSON.parse(process.argv[2] || '{}');
  const res = await p.evaluate((override) => {
    for (const [k, v] of Object.entries(override)) {
      if (k in window.BALANCE.monster) window.BALANCE.monster[k] = v;
      else window.BALANCE[k] = v;
    }
    const game = window.game; game.loop.sleep();
    const g = game.scene.getScene('Game');
    g.toast = () => {}; g.showBanner = () => {}; g.floatText = () => {};
    const log = [];
    let lastWave = 0, maxAlive = 0; const bossMax = {};
    for (let step = 0; step < 200000 && !g.over; step++) {
      // 봇: 머지 가능하면 머지(낮은 레벨 우선), 아니면 고용
      let acted = true;
      while (acted) {
        acted = false;
        // 빈 칸이 있으면 고용 우선, 필드가 차면 낮은 레벨부터 합치기
        if (g.gold >= g.hireCost && g.mercs.length < g.fieldSlots) { g.hire(); acted = true; continue; }
        const ms = g.mercs.sort((a, b) => a.level - b.level);
        outer: for (const a of ms) for (const c of ms) if (a.canMergeWith(c) && g.gold >= g.mergeCostFor(c.level)) { g.merge(a, c); acted = true; break outer; }
      }
      if (g.relicChoice) g.pickRelic(0); // 강화 보스 보상: 첫 번째 선택
      g.update(0, 100); // 0.1초
      maxAlive = Math.max(maxAlive, g.monsters.length);
      const boss = g.monsters.find(m => m.isBoss);
      if (boss) bossMax[g.wave - g.wave % 10 || 10] = Math.max(bossMax[g.wave - g.wave % 10] || 0, Math.round(boss.dist / 17.6));
      if (g.wave !== lastWave) {
        if (g.wave % 5 === 0) log.push(`W${g.wave} gold=${g.gold} alive=${g.monsters.length} boss=${(g.monsters.find(m=>m.isBoss)?.dist/1760*100|0)}% lvls=${JSON.stringify(g.mercs.reduce((o,m)=>(o[m.level]=(o[m.level]||0)+1,o),{}))} relics=${Object.values(g.relics).reduce((a,b)=>a+b,0)}`);
        lastWave = g.wave;
      }
    }
    const reason = g.children.list.filter(o => o.type === 'Text').map(o => o.text).find(t => /쌓였습니다|돌았습니다/.test(t));
    return { wave: g.wave, fame: g.fameEarned, kills: g.totalKills, over: g.over, log: [...log, 'boss max lap%: ' + JSON.stringify(bossMax), 'reason: ' + reason] };
  }, override);
  console.log(res.log.join('\n')); console.log('END wave', res.wave, 'fame', res.fame, 'kills', res.kills, 'errors', JSON.stringify(errs));
  await b.close();
})();
