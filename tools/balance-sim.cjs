// 밸런스 시뮬레이터 (룰 v2, 2026-11-20): 봇이 상점에서 사고(별 승급 > 같은 캐릭터 > 높은 등급·시너지), 칸이 차면 영지 레벨 업,
// 약한 1성을 팔아 더 센 캐릭터로 바꾸고, 남는 골드로 리롤, 아이템은 가장 센 캐릭터에 끼운다. 게임 로직을 고속 실행해 도달 웨이브를 출력.
// 사용법: npm run build && npx vite preview --port 4173 &  →  node tools/balance-sim.cjs ['{"baseDamageMult":3}'] ['{"atk":10}'] ['{"hero_sword":3}']
//   1번째 인자(JSON): BALANCE 덮어쓰기 실험. BALANCE.monster 의 키는 monster 에, 나머지(baseDamageMult 등)는 BALANCE 에 적용
//   성벽·물량: '{"wall":{"hp":80,"dmg":{"normal":0.2}},"horde":{"carryHops":10}}' (물량 배수 mult 는 빌드 때 정해져 덮어쓸 수 없다)
//   2번째 인자(JSON): 명성 강화 레벨 (예: {"atk":10,"funds":5}). 없으면 강화 0
//   환경 변수 RESERVE=0: 대기석을 쓰지 않는 예전 봇 (기본은 필드가 차면 같은 캐릭터 카드를 대기석에 모아 별 승급)
//   3번째 인자(JSON): 장착 유물 id → 레벨 (예: {"hero_sword":3,"war_drum":1}, 최대 4개). 없으면 유물 없음
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const levels = JSON.parse(process.argv[3] || '{}');
  const relics = JSON.parse(process.argv[4] || '{}');
  await p.addInitScript(([levels, relics]) => {
    try { localStorage.setItem('rtd_meta_v3', JSON.stringify({ fame: 0, levels, relics, equipped: Object.keys(relics) })); } catch {}
  }, [levels, relics]);
  // 고정 대기 대신 화면 준비를 기다린다 (여러 개를 동시에 돌리면 로딩이 늦어져 게임 시작 전에 봇이 움직이던 문제)
  await p.goto('http://localhost:4173');
  await p.waitForFunction(() => window.game?.scene.isActive('Title'), null, { timeout: 60000 });
  await p.evaluate(() => window.game.scene.start('Game'));
  await p.waitForFunction(() => window.game.scene.isActive('Game') && window.game.scene.getScene('Game').hud, null, { timeout: 60000 });
  await p.waitForTimeout(300);
  const override = JSON.parse(process.argv[2] || '{}');
  const useReserveArg = process.env.RESERVE !== '0'; // 대기석 활용 (기본 켬, RESERVE=0 이면 예전 봇)
  const res = await p.evaluate(([override, useReserve, every]) => {
    for (const [k, v] of Object.entries(override)) {
      if (k in window.BALANCE.monster) window.BALANCE.monster[k] = v;
      else if (k === 'wall') { const { dmg, ...rest } = v; Object.assign(window.BALANCE.wall, rest); Object.assign(window.BALANCE.wall.dmg, dmg || {}); }
      else if (k === 'horde') Object.assign(window.BALANCE.horde, v);
      else window.BALANCE[k] = v;
    }
    const game = window.game; game.loop.sleep();
    const g = game.scene.getScene('Game');
    g.wallHp = g.wallMax; // 덮어쓴 성벽 체력 반영
    g.toast = () => {}; g.showBanner = () => {}; g.floatText = () => {};
    const R = Object.fromEntries(window.__rtd.ROSTER.map((c) => [c.id, c]));
    const GM = [0, 1, 1.35, 1.8, 2.5]; // 등급 배율 (data/roster.js GRADES)
    const SM = [0, 1, 1.8, 3.2]; // 별 배율 (data/stars.js STAR_STAT)
    const power = (m) => GM[m.grade] * SM[m.star] * (1 + 0.15 * m.items.length);
    const price = (c) => [0, 10, 20, 30, 50][c.grade];
    // 시너지 점수: 필드에 같은 계열·출신이 있으면 + (서로 다른 캐릭터라야 단계가 오른다)
    const synScore = (c) => {
      const ids = new Set(g.mercs.map((m) => m.char.id));
      if (ids.has(c.id)) return 0;
      return g.mercs.filter((m) => m.cls === c.cls).length * 0.15 + g.mercs.filter((m) => m.origin === c.origin).length * 0.1;
    };
    const slotValue = (s) => {
      const c = R[s.id];
      const same = g.mercs.filter((m) => m.char.id === s.id && m.star === 1).length;
      const two = g.mercs.filter((m) => m.char.id === s.id && m.star === 2).length; // 3성을 노린다
      return GM[c.grade] * (1 + synScore(c)) + (same ? 1.2 * same : 0) + (two ? 0.8 * GM[c.grade] : 0);
    };
    let wave = -1, rerolls = 0;
    const act = () => {
      if (g.wave !== wave) { wave = g.wave; rerolls = 0; }
      if (g.inWave) return; // 정비 시간(2026-11-24)에만 사고·놓고·장착한다
      for (let guard = 0; guard < 40; guard++) {
        const open = g.shop.map((s, i) => ({ s, i })).filter(({ s }) => s && !s.sold && g.gold >= price(R[s.id]));
        // 1) 별 승급이 되는 칸
        const star = open.find(({ s }) => g.completesStar(s.id));
        if (star && g.buy(star.i)) continue;
        // 2) 빈 자리: 가장 좋은 칸
        if (g.mercs.length < g.cap && open.length) {
          const best = open.sort((a, b) => slotValue(b.s) - slotValue(a.s))[0];
          if (g.buy(best.i)) continue;
        }
        // 2b) 대기석 (2026-11-21): 필드가 차면 필드·대기석에 있는 캐릭터와 같은 카드를 대기석에 모아 별 승급을 노린다 (RESERVE=0 이면 안 씀)
        if (useReserve && g.mercs.length >= g.cap && g.freeReserve() >= 0) {
          const ec2 = g.estateCost || 0;
          const dup = open.find(({ s }) => g.allUnits.some((m) => m.char.id === s.id && m.star < 3) && g.gold - price(R[s.id]) >= ec2 * 0.5);
          if (dup && g.buy(dup.i)) continue;
        }
        // 3) 자리가 차면 영지 레벨 업
        const ec = g.estateCost;
        if (g.mercs.length >= g.cap && ec != null && g.gold >= ec) { g.levelUpEstate(); continue; }
        // 4) 약한 1성을 팔고 더 센 캐릭터로 (같은 캐릭터가 2장 이상이면 남긴다)
        if (g.mercs.length >= g.cap && open.length) {
          const weak = g.mercs.filter((m) => m.star === 1 && g.mercs.filter((o) => o.char.id === m.char.id).length < 2).sort((a, b) => power(a) - power(b))[0];
          const best = open.sort((a, b) => slotValue(b.s) - slotValue(a.s))[0];
          if (weak && slotValue(best.s) > power(weak) * 1.3 && g.gold + Math.floor(weak.invested * g.sellRefund) >= price(R[best.s.id])) {
            g.sell(weak);
            if (g.buy(best.i)) continue;
          }
        }
        // 5) 아이템: 띠의 아이템을 가장 센(아이템 칸이 남은) 캐릭터에
        if (g.bench.length) {
          const tgt = [...g.mercs].filter((m) => m.items.length < 3 || m.items.some((x) => ['whet', 'feath', 'mana', 'lens', 'powd', 'coin', 'seal'].includes(x))).sort((a, b) => power(b) - power(a))[0];
          if (tgt && g.equip(0, tgt)) continue;
        }
        // 6) 남는 골드로 리롤 (영지 레벨 업 몫은 남긴다, 웨이브마다 최대 30번)
        const keep = ec != null ? ec : 0;
        if (g.mercs.length >= g.cap && rerolls < 30 && g.gold >= g.rerollPrice + keep + 20) { g.reroll(); rerolls++; continue; }
        break;
      }
    };
    const log = [];
    let lastWave = 0, maxAlive = 0; const bossMax = {};
    for (let step = 0; step < (window.__simSteps || 800000) && !g.over; step++) {
      if (step % 5 === 0) act(); // 0.5초마다 봇 판단
      // 루프를 재웠으니 장면 시계(타격 프레임 타이머)·트윈도 손으로 0.1초씩 돌린다
      const t = (step + 1) * 100;
      g.time.preUpdate(t, 100); g.time.update(t, 100);
      g.tweens.preUpdate?.(); g.tweens.update(t, 100);
      g.update(0, 100); // 0.1초
      maxAlive = Math.max(maxAlive, g.monsters.length);
      const boss = g.monsters.find(m => m.isBoss);
      if (boss) bossMax[g.wave - g.wave % 10 || 10] = Math.max(bossMax[g.wave - g.wave % 10] || 0, Math.round(boss.dist / 17.6));
      if (g.wave !== lastWave) {
        if (g.wave % 5 === 0 || g.wave <= 4 || every) {
          // 팀 화력 (2026-11-25): 필드 용병의 초당 기대 피해 합 (한 방 × 공속 × 치명 기대 × 동시 대상) · 웨이브 전체 체력
          const powr = g.mercs.reduce((t, m) => { const s = m.getStats(g.relics, g.gameTime); return t + s.damage * s.rate * (1 + (s.crit || 0) * ((s.critMult || 2) - 1)) * (s.targets || 1); }, 0);
          const wi = window.__rtd.waves?.waveInfo?.(g.wave);
          const hpTot = wi ? wi.normal * window.__rtd.waves.monsterStats('normal', g.wave).hp + wi.elite * window.__rtd.waves.monsterStats('elite', g.wave).hp + (wi.boss ? window.__rtd.waves.monsterStats('boss', g.wave, wi.type === 'milestone').hp : 0) : 0;
          log.push(`P${g.wave} pow=${Math.round(powr)} hp=${Math.round(hpTot)} ratio=${powr ? (hpTot / powr).toFixed(1) : '-'}`);
          const stars = g.mercs.reduce((o, m) => (o[m.star] = (o[m.star] || 0) + 1, o), {});
          const grades = g.mercs.reduce((o, m) => (o[m.grade] = (o[m.grade] || 0) + 1, o), {});
          const syn = Object.entries(g.syn.tiers).filter(([, t]) => t).map(([k]) => k).join(',');
          log.push(`W${g.wave} wall=${g.wallHp.toFixed(1)} gold=${g.gold} estate=${g.estate} units=${g.mercs.length} alive=${g.monsters.length} stars=${JSON.stringify(stars)} grades=${JSON.stringify(grades)} items=${g.mercs.reduce((t, m) => t + m.items.length, 0)} syn=${syn}`);
        }
        lastWave = g.wave;
      }
    }
    const reason = g.children.list.filter(o => o.type === 'Text').map(o => o.text).find(t => /성벽 붕괴|무너졌습니다/.test(t));
    return { wave: g.wave, fame: g.fameEarned, stones: g.stonesEarned, kills: g.totalKills, over: g.over, log: [...log, 'boss max lap%: ' + JSON.stringify(bossMax), 'reason: ' + reason] };
  }, [override, useReserveArg, !!process.env.EVERY]); // EVERY=1: 웨이브마다 팀 화력·웨이브 체력 기록
  console.log(res.log.join('\n')); console.log('END wave', res.wave, res.over ? '(패배)' : '(시간 한도 — 아직 살아 있음)', 'fame', res.fame, 'stones', res.stones, 'kills', res.kills, 'errors', JSON.stringify(errs));
  await b.close();
})();
