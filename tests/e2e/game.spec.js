import { test, expect } from '@playwright/test';

// 실제 게임을 띄워서 핵심 흐름을 조작해 본다. 화면은 test-results/screens/ 에 저장 (작업 루프에서 눈으로 확인용)
const SHOT = (name) => `test-results/screens/${name}.png`;
const game = (page, fn, arg) => page.evaluate(fn, arg);

async function startGame(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/');
  await page.waitForFunction(() => window.game?.scene.isActive('Title'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: SHOT('01-title') });
  await toGame(page, 272, 652);
  return errors;
}

/** 타이틀을 누르면 영지(로비) → Space(출전) 로 전투 시작 (2026-11-17 로비 신설) */
async function toGame(page, x, y) {
  await page.mouse.click(x, y);
  await page.waitForFunction(() => window.game.scene.isActive('Lobby'));
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.game.scene.isActive('Game'));
}

// PC 1080p (2026-11-22): 창 1920x1080 = UI 좌표(1280x720) × 1.5 · 전장(월드 좌표)은 화면 px 그대로
const UI = 1.5;
/** UI 좌표를 눌러 본다 */
const uiClick = (page, x, y) => page.mouse.click(x * UI, y * UI);
/** 게임 안 물체(UI 좌표 x, y 를 돌려주는 함수)를 눌러 본다 */
async function clickAt(page, fn, arg) {
  const p = await page.evaluate(fn, arg);
  await page.mouse.click(p.x * UI, p.y * UI);
}
const NEXT_BTN = () => { const b = window.game.scene.getScene('Game').hud.nextWaveBtn; return { x: b.x, y: b.y }; };
const UPGRADE_BTN = () => { const b = window.game.scene.getScene('Game').hud.upgradeBtn; return { x: b.x, y: b.y }; };
const BUY_BTN = () => { const b = window.game.scene.getScene('Upgrade').buyBtn; return { x: b.x, y: b.y }; }; // 강화 창의 '강화'
// 상점 칸 가운데 (HUD.shop x 172~784, y 622~706, 6칸 · 간격 6) → 화면 px
const SHOP_X = (i) => (172 + i * 103 + 48.5) * UI;
const SHOP_Y = 664 * UI;

test('상점에서 사기 → 웨이브 진행 → 처치', async ({ page }) => {
  const errors = await startGame(page);
  // 상점을 서로 다른 커먼 6명으로 고정 (무작위면 같은 캐릭터가 겹쳐 별 승급으로 인원 수가 흔들린다)
  await game(page, () => {
    const g = window.game.scene.getScene('Game');
    const ids = g.deck.filter((id) => window.__rtd.ROSTER.find((c) => c.id === id).grade === 1).slice(0, 6);
    g.shop = ids.map((id) => ({ id, locked: false, sold: false }));
    g.refreshShop();
  });
  for (let i = 0; i < 3; i++) await page.mouse.click(SHOP_X(i), SHOP_Y); // 상점 칸 (영지 Lv1 = 3명)
  const r0 = await game(page, () => { const g = window.game.scene.getScene('Game'); return { n: g.mercs.length, sold: g.shop.filter((x) => x?.sold).length, gold: g.gold }; });
  expect(r0.n).toBe(3);
  expect(r0.sold).toBe(3);
  expect(r0.gold).toBe(120 - 30); // 커먼 10G × 3 (영지 Lv1 은 커먼만)
  await page.mouse.click(SHOP_X(3), SHOP_Y); // 4번째: 인원이 가득 (영지 레벨을 올려야)
  expect(await game(page, () => window.game.scene.getScene('Game').mercs.length)).toBe(3);
  await clickAt(page, NEXT_BTN); // 바로 시작
  expect(await game(page, () => window.game.scene.getScene('Game').wave)).toBe(1);
  // 첫 처치가 나올 때까지 기다린다 (고정 대기는 느린 환경에서 가끔 실패)
  await page.waitForFunction(() => window.game.scene.getScene('Game').totalKills > 0, null, { timeout: 20000 });
  const s = await game(page, () => { const g = window.game.scene.getScene('Game'); return { kills: g.totalKills, alive: g.monsters.length }; });
  expect(s.kills).toBeGreaterThan(0);
  await page.screenshot({ path: SHOT('02-battle') });
  expect(errors).toEqual([]);
});

test('같은 캐릭터 3장 → 별 승급 (인원이 꽉 차도 3장째는 살 수 있음) · 리롤·잠금 · 영지 레벨 업 · 드래그로 자리 바꾸기', async ({ page }) => {
  const errors = await startGame(page);
  const r = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    g.gold = 1000;
    g.shop = [0, 1, 2, 3, 4, 5].map(() => ({ id: 'helga', locked: false, sold: false }));
    g.refreshShop();
    g.buy(0); g.buy(1);
    g.hire('stein'); // 인원 3/3
    const full = g.mercs.length;
    const third = g.buy(2); // 3장째: 꽉 찼어도 별 승급이면 살 수 있다
    const helga = g.mercs.filter((m) => m.char.id === 'helga');
    const out = { full, n: g.mercs.length, helga: helga.length, star: helga[0].star, dmg2: helga[0].def.fx?.dot?.[0] };
    // 리롤: 잠근 칸은 남고 리롤 값이 오른다
    const before = g.rerollPrice;
    g.toggleLock(3);
    out.lockUp = g.rerollPrice > before;
    g.reroll();
    out.kept = g.shop[3].id === 'helga' && g.shop[3].locked;
    // 영지 레벨 업: 인원 +1
    const cap = g.cap;
    g.levelUpEstate();
    out.cap = [cap, g.cap, g.estate];
    const st = helga[0];
    return { ...out, from: { x: st.x, y: st.y }, cell: { col: st.col, row: st.row } };
  });
  expect(r.full).toBe(3);
  expect(r.n).toBe(2); // 헬가 2성 1장 + 스테인
  expect(r.helga).toBe(1);
  expect(r.star).toBe(2);
  expect(r.dmg2).toBeGreaterThan(0);
  expect(r.lockUp).toBe(true);
  expect(r.kept).toBe(true);
  expect(r.cap).toEqual([3, 4, 2]);
  // 드래그로 빈 칸에 옮기기 (합성 없음 — 자리 교체만)
  await page.mouse.move(r.from.x, r.from.y);
  await page.mouse.down();
  await page.mouse.move(960, 540, { steps: 8 }); // 필드 가운데 칸 (월드 좌표 = 화면 px)
  await page.mouse.up();
  const after = await game(page, () => { const m = window.game.scene.getScene('Game').mercs.find((x) => x.char.id === 'helga'); return { col: m.col, row: m.row, star: m.star }; });
  expect(after).toEqual({ col: 2, row: 2, star: 2 });
  await page.screenshot({ path: SHOT('03-star') });
  expect(errors).toEqual([]);
});

test('바로 시작: 필드의 몬스터를 전부 처치했을 때만 (버튼) · 단축키 Space = 정지/다시 · R = 리롤', async ({ page }) => {
  const errors = await startGame(page);
  const wave = () => game(page, () => window.game.scene.getScene('Game').wave);
  await clickAt(page, NEXT_BTN); // 시작 전 필드는 비어 있음 → 동작
  await clickAt(page, NEXT_BTN); // 몬스터가 나오는 중 → 무시
  expect(await wave()).toBe(1);
  await page.waitForTimeout(700);
  await clickAt(page, NEXT_BTN); // 몬스터가 남아 있음 → 무시
  expect(await wave()).toBe(1);
  // Space = 게임 정지/다시 (2026-11-21, 이전 바로 시작)
  await page.keyboard.press('Space');
  expect(await game(page, () => window.game.scene.getScene('Game').paused)).toBe(true);
  await page.keyboard.press('Space');
  expect(await game(page, () => window.game.scene.getScene('Game').paused)).toBe(false);
  // R = 리롤 (골드가 리롤 값만큼 줄고 상점이 바뀐다)
  const rr = await game(page, () => { const g = window.game.scene.getScene('Game'); g.gold = 500; return { gold: g.gold, price: g.rerollPrice }; });
  await page.keyboard.press('r');
  expect(await game(page, () => window.game.scene.getScene('Game').gold)).toBe(rr.gold - rr.price);
  expect(await game(page, () => window.game.scene.getScene('Game').hud.nextWaveBtn.enabled)).toBe(false);
  // 전부 처치하면 다시 활성화
  await game(page, () => { const g = window.game.scene.getScene('Game'); g.spawnQueue = []; for (const m of [...g.monsters]) g.killMonster(m); g.cleanupMonsters(); g.refreshHud(); });
  expect(await game(page, () => window.game.scene.getScene('Game').hud.nextWaveBtn.enabled)).toBe(true);
  await clickAt(page, NEXT_BTN);
  expect(await wave()).toBe(2);
  expect(errors).toEqual([]);
});

test('ESC 메뉴: 일시정지·볼륨·닫기', async ({ page }) => {
  const errors = await startGame(page);
  await page.keyboard.press('Escape');
  const t0 = await game(page, () => window.game.scene.getScene('Game').gameTime);
  await page.waitForTimeout(500);
  expect(await game(page, () => window.game.scene.getScene('Game').gameTime)).toBe(t0); // 멈춤
  await page.screenshot({ path: SHOT('03-menu') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  expect(await game(page, () => window.game.scene.getScene('Game').gameTime)).toBeGreaterThan(t0);
  expect(errors).toEqual([]);
});

test('보스 처치 → 마정석 (보스 2 · 강화 보스 5, 바로 저장) — 판 안 유물 드랍·3택1 없음', async ({ page }) => {
  const errors = await startGame(page);
  const s0 = await game(page, () => window.__rtd.meta.stones);
  await game(page, () => { const g = window.game.scene.getScene('Game'); g.startWave(10); });
  await page.waitForFunction(() => window.game.scene.getScene('Game').monsters.some((m) => m.isBoss));
  await game(page, () => { const g = window.game.scene.getScene('Game'); g.damageMonster(g.monsters.find((m) => m.isBoss), 1e15, {}); });
  expect(await game(page, () => window.__rtd.meta.stones)).toBe(s0 + 2);
  await game(page, () => window.game.scene.getScene('Game').startWave(30));
  await page.waitForFunction(() => window.game.scene.getScene('Game').monsters.some((m) => m.milestone));
  await game(page, () => { const g = window.game.scene.getScene('Game'); g.damageMonster(g.monsters.find((m) => m.milestone), 1e15, {}); });
  const r = await game(page, () => { const g = window.game.scene.getScene('Game'); return { stones: window.__rtd.meta.stones, earned: g.stonesEarned, relics: g.ownedRelics.length }; });
  expect(r).toEqual({ stones: s0 + 7, earned: 7, relics: 0 });
  await page.screenshot({ path: SHOT('04-boss-stones') });
  expect(errors).toEqual([]);
});

test('최종 보스는 한 번 부활한다', async ({ page }) => {
  const errors = await startGame(page);
  await game(page, () => window.game.scene.getScene('Game').startWave(100));
  await page.waitForFunction(() => window.game.scene.getScene('Game').monsters.some((m) => m.isFinal));
  const r = await game(page, () => {
    const g = window.game.scene.getScene('Game'); const b = g.monsters.find((m) => m.isFinal); const before = b.abilities.length;
    g.damageMonster(b, 1e15, {}); const revived = b.alive && b.revived && b.abilities.length === before + 1;
    g.damageMonster(b, 1e15, {}); return { revived, deadAfter2: !b.alive, over: g.over };
  });
  // 완전히 쓰러뜨리면 축하하고 게임은 계속된다 (무한 웨이브)
  expect(r).toEqual({ revived: true, deadAfter2: true, over: false });
  expect(errors).toEqual([]);
});

test('패배 화면: 도달 웨이브·최고 기록 저장 → 다시 하기', async ({ page }) => {
  const errors = await startGame(page);
  // 성벽 체력 (2026-11-17): 보스가 한 바퀴 돌면 -30 → 아직 패배 아님. 체력이 0 이 되면 패배
  const wall = await game(page, () => { const g = window.game.scene.getScene('Game'); g.wave = 10; g.waveTimer = 999; g.spawnMonster('boss'); g.monsters.at(-1).dist = 1755; return [g.wallHp, g.wallMax]; });
  expect(wall).toEqual([80, 80]);
  await page.waitForFunction(() => window.game.scene.getScene('Game').wallHp === 50);
  expect(await game(page, () => window.game.scene.getScene('Game').over)).toBe(false);
  await game(page, () => { const g = window.game.scene.getScene('Game'); g.wallHp = 0.2; g.spawnMonster('normal'); g.monsters.at(-1).dist = 1755; });
  await page.waitForFunction(() => window.game.scene.getScene('Game').over);
  await page.waitForTimeout(400);
  await page.screenshot({ path: SHOT('06-lose') });
  expect(await game(page, () => window.__rtd.meta.data.best.normal)).toBe(10);
  expect(await game(page, () => window.game.scene.getScene('Game').hud.countText.text)).toBe('0 / 80');
  // 다시 하기 — 결과 창 버튼이 준비되기 전에 누르면 무시되므로, 다시 시작될 때까지 몇 번 눌러 본다
  for (let i = 0; i < 6; i++) {
    await clickAt(page, () => { const b = window.game.scene.getScene('Game').endBtns.retry; return { x: b.x, y: b.y }; });
    const ok = await page.waitForFunction(() => { const g = window.game.scene.getScene('Game'); return !g.over && g.wave === 0; }, null, { timeout: 4000 }).catch(() => null);
    if (ok) break;
  }
  await page.waitForFunction(() => { const g = window.game.scene.getScene('Game'); return !g.over && g.wave === 0; });
  expect(await game(page, () => { const h = window.game.scene.getScene('Game').hud; return `${h.waveTypeText.text} ${h.waveTypeText2?.text || ''}`; })).toContain('최고 W10'); // 안내 두 줄 (2026-11-21)
  expect(errors).toEqual([]);
});

test('화면 비율이 달라도 게임 화면은 정중앙, 여백은 검은색', async ({ page }) => {
  for (const [w, h] of [[1400, 800], [400, 1000]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/');
    await page.waitForFunction(() => window.game?.scene.isActive('Title'));
    await page.waitForTimeout(200);
    const r = await page.evaluate(() => {
      const c = document.querySelector('canvas').getBoundingClientRect();
      return { left: c.left, right: innerWidth - c.right, top: c.top, bottom: innerHeight - c.bottom, bg: getComputedStyle(document.body).backgroundColor };
    });
    expect(Math.abs(r.left - r.right)).toBeLessThanOrEqual(1);
    expect(Math.abs(r.top - r.bottom)).toBeLessThanOrEqual(1);
    expect(r.bg).toBe('rgb(0, 0, 0)');
    await page.screenshot({ path: SHOT(`08-center-${w}x${h}`) });
  }
});

test('시너지: 서로 다른 캐릭터 수로 단계가 켜지고 효과가 붙는다 (전사 2 · 기사단 3 · 북방 분노 · 숲 감속) + 위 줄 칩', async ({ page }) => {
  const errors = await startGame(page);
  const r = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    const st = (m) => m.getStats(g.relics, g.gameTime);
    const leo = g.hire('leo'); // 전사·기사단
    const d0 = st(leo).damage;
    g.hire('leo'); // 같은 캐릭터 2장은 1명
    const one = g.syn.counts.warrior;
    g.hire('gareth'); // 전사·기사단 → 전사 2
    const d1 = st(leo).damage;
    g.hire('claire'); // 지원가·기사단 → 기사단 3
    const wallDmg = g.syn.tiers.knight?.wallDmg;
    for (const id of ['stein', 'einar', 'ingrid']) g.hire(id); // 북방 3
    const north = g.mercs.find((m) => m.char.id === 'stein');
    north.rage = 10;
    const rage = st(north).rate / (window.__rtd.ROSTER.find((c) => c.id === 'stein').trait?.rateMul || 1);
    g.hud.refreshSynergy();
    const chips = g.hud.synRow.list.length;
    return { one, warrior: g.syn.counts.warrior, up: d1 / d0, wallDmg, rageOn: !!g.syn.tiers.north, chips };
  });
  expect(r.one).toBe(1);
  expect(r.warrior).toBeGreaterThanOrEqual(2);
  expect(r.up).toBeGreaterThan(1.1); // 전사 2: 공격력 +15% (전열이면 1.5배)
  expect(r.wallDmg).toBe(0.15); // 기사단 3: 성벽 피해 -15%
  expect(r.rageOn).toBe(true);
  expect(r.chips).toBeGreaterThanOrEqual(4);
  await page.waitForTimeout(2600);
  await page.screenshot({ path: SHOT('08-synergy') });
  expect(errors).toEqual([]);
});

test('아이템 조합: 대장장이에서 재료 구매 → 끌어다 장착 → 같은 캐릭터에 재료 2개면 자동 조합 · 문장으로 시너지 +1 · 해제 도구 · 판매하면 띠로', async ({ page }) => {
  const errors = await startGame(page);
  const r = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    g.gold = 1000;
    const leo = g.hire('leo');
    const helga = g.hire('helga');
    const gold0 = g.gold;
    g.smithBuy(); g.smithBuy();
    const spent = gold0 - g.gold; // 30 + 45
    g.bench = ['whet', 'whet', 'seal', 'seal'];
    g.hud.refreshBench();
    return { spent, at: { x: leo.x, y: leo.y }, helgaAt: { x: helga.x, y: helga.y } };
  });
  expect(r.spent).toBe(30 + 45);
  // 띠의 첫 아이템(숫돌)을 레오에게 실제로 끌어다 놓는다
  const slot = await game(page, () => window.game.scene.getScene('Game').hud.benchPos(0));
  for (let i = 0; i < 2; i++) {
    await page.mouse.move(slot.x * UI, slot.y * UI); // 아이템 띠 = UI 좌표
    await page.mouse.down();
    await page.mouse.move(r.at.x, r.at.y, { steps: 10 }); // 용병 = 월드 좌표
    await page.mouse.up();
  }
  const s = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    const [leo, helga] = g.mercs;
    const knightBefore = g.syn.counts.knight;
    // 인장 2개 → 출신 문장 (기사단으로 골라서) — 헬가(마탑)가 기사단으로도 셈
    g.equip(g.bench.indexOf('seal'), helga, 'knight'); g.equip(g.bench.indexOf('seal'), helga, 'knight');
    const st = leo.getStats(g.relics, g.gameTime);
    const out = { leo: leo.items, helga: helga.items, knight: [knightBefore, g.syn.counts.knight], bench: g.bench.length, dmgItem: st.item.dmg };
    // 해제 도구: 아이템이 띠로
    g.tools = 1;
    out.tool = g.useTool(leo);
    out.afterTool = { leo: leo.items.length, bench: [...g.bench] };
    // 판매: 아이템은 띠로
    g.sell(helga);
    out.afterSell = [...g.bench];
    return out;
  });
  expect(s.leo).toEqual(['giant_sword']);
  expect(s.helga).toEqual(['emblem_knight']);
  expect(s.knight).toEqual([1, 2]);
  expect(s.dmgItem).toBeCloseTo(0.4);
  expect(s.tool).toBe(true);
  expect(s.afterTool).toEqual({ leo: 0, bench: ['giant_sword'] });
  expect(s.afterSell).toEqual(['giant_sword', 'emblem_knight']);
  await page.waitForTimeout(400);
  await page.screenshot({ path: SHOT('07-items') });
  expect(errors).toEqual([]);
});

test('캐릭터마다 그림 + 등급 받침 고리(뒤·앞)와 별 패', async ({ page }) => {
  const errors = await startGame(page);
  const info = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    g.gold = 99999;
    // 15칸을 그림이 다른 15명으로 (무작위 고용은 같은 캐릭터 3장이 겹치면 별 승급으로 수가 줄어 고정 id 로), 별은 1~3 순서로
    const ids = ['helga', 'bridget', 'karsten', 'siri', 'oscar', 'sigrid', 'olaf', 'ingrid', 'leif', 'freya', 'elva', 'ragnar', 'arthur', 'isolde', 'oberon'];
    for (const id of ids) g.hire(id);
    g.mercs.forEach((m, i) => m.setChar(window.__rtd.ROSTER.find((c) => c.id === ids[i]), (i % 3) + 1));
    // 고리 뒤쪽 반은 캐릭터 뒤, 앞쪽 반 + 방패는 앞
    const order = g.mercs.every((m) => m.list.indexOf(m.ringBack) < m.list.indexOf(m.sprite) && m.list.indexOf(m.sprite) < m.list.indexOf(m.pips));
    return { keys: new Set(g.mercs.map((m) => m.sprite.texture.key)).size, n: g.mercs.length, order };
  });
  expect(info).toEqual({ keys: 15, n: 15, order: true });
  await page.waitForTimeout(3000); // 시작 배너가 사라진 뒤 촬영
  await page.screenshot({ path: SHOT('09-mercs') });
  expect(errors).toEqual([]);
});

test('유물 아이콘에 마우스를 올리면 능력 툴팁', async ({ page }) => {
  const errors = await startGame(page);
  await game(page, () => {
    const g = window.game.scene.getScene('Game');
    for (const id of ['war_drum', 'hawk_eye', 'frost_crown', 'contract']) g.addRelic(id);
    g.addRelic('lucky_coin'); // 장착 칸 4칸 — 5번째는 안 들어감
  });
  expect(await game(page, () => window.game.scene.getScene('Game').ownedRelics.length)).toBe(4);
  const tip = () => game(page, () => {
    const t = window.game.scene.getScene('Game').hud.relicTip;
    return t ? t.container.list.filter((o) => o.text).map((o) => o.text) : null;
  });
  expect(await tip()).toBeNull();
  const p0 = await game(page, () => window.game.scene.getScene('Game').hud.relicPos(0, 4));
  await page.mouse.move(p0.x * UI, p0.y * UI); // 첫 유물 (전쟁의 북) — 룰 v2: 유물 칸은 시너지 칩 오른쪽
  await expect.poll(tip).toEqual(['전쟁의 북', 'Lv1', '모든 용병 공격 속도 +8%', '영지 유물 공방에서 바꿔 끼울 수 있어요']);
  await page.waitForTimeout(100);
  await page.screenshot({ path: SHOT('10-relic-tooltip') });
  await page.mouse.move(960, 600); // 아이콘 밖
  await expect.poll(tip).toBeNull();
  expect(errors).toEqual([]);
});

test('캐릭터 그림(시안 104명): 시그리드 대기·공격 모션 · 도트 1px = 화면 2px · 대상 쪽을 바라본다', async ({ page }) => {
  const errors = await startGame(page);
  const s = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    g.hire();
    const m = g.mercs[0];
    m.level = 1; m.setChar(window.__rtd.ROSTER.find((c) => c.id === 'sigrid'));
    // 가운데 열에 둔다 (좌우 양쪽 길이 모두 사거리 안 → 왼쪽·오른쪽 대상이 다 나온다)
    g.grid[m.row][m.col] = null; m.col = 2; m.row = 1; g.grid[1][2] = m; m.snapToCell();
    g.select(m);
    const idle = g.anims.get('char_sigrid:idle');
    return { key: m.sprite.texture.key, w: m.sprite.displayWidth, h: m.sprite.displayHeight, anim: m.sprite.anims.currentAnim?.key,
      idleFrames: idle.frames.length, idleMs: Math.round(idle.frames.reduce((t, f) => t + f.duration + 1, 0)) };
  });
  // 56x40 프레임 × UNIT_PX 3 × scale 2/3 = 화면 112x80 (아트 1px = 화면 2px), 대기 28프레임 × 45ms (합 1.26초, 2026-11-22)
  expect(s).toEqual({ key: 'char_sigrid', w: 112, h: 80, anim: 'char_sigrid:idle', idleFrames: 28, idleMs: 1260 });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: SHOT('11-char-sigrid') });

  // 웨이브를 시작하면 공격 모션 → 끝나면 다시 대기
  await page.keyboard.press('n');
  const atk = () => game(page, () => window.game.scene.getScene('Game').mercs[0].sprite.anims.currentAnim?.key);
  await expect.poll(atk, { timeout: 20000, intervals: [50] }).toBe('char_sigrid:attack');
  await page.screenshot({ path: SHOT('12-char-sigrid-attack') });

  // 그림은 왼쪽을 본다(무기가 왼쪽): 왼쪽 대상이면 그대로, 오른쪽 대상이면 반전. 몸 중심(pivotX 27)은 제자리
  // (전투 중 실제 대상 방향은 몬스터 위치에 따라 늦게 올 수 있어, 방향 전환 자체는 setFacing 으로 바로 확인)
  const face = (left) => game(page, (l) => { const sp = window.game.scene.getScene('Game').mercs[0].sprite; window.__rtd.setFacing(sp, l); return { flip: sp.flipX, ox: Math.round(sp.originX * 56) }; }, left);
  expect(await face(false)).toEqual({ flip: true, ox: 29 });
  await page.screenshot({ path: SHOT('13-char-sigrid-right') });
  expect(await face(true)).toEqual({ flip: false, ox: 27 });
  expect(errors).toEqual([]);
});

test('명성 강화 트리: 노드를 눌러 선택 → 강화 → 게임에 반영, 잠긴 노드는 못 삼', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => window.game?.scene.isActive('Title'));
  await game(page, () => { const m = window.__rtd.meta; m.reset(); m.addFame(50); });
  await clickAt(page, () => { const b = window.game.scene.getScene('Title').fameBtn; return { x: b.x, y: b.y }; }); // 명성 강화 (타이틀 아래 금색 버튼)
  await page.waitForFunction(() => window.game.scene.isActive('Upgrade'));
  await page.waitForTimeout(200);
  const at = async (id) => { const p = await game(page, (id) => window.game.scene.getScene('Upgrade').nodeScreenPos(id), id); return { x: p.x * UI, y: p.y * UI }; };
  const bb = await game(page, () => { const b = window.game.scene.getScene('Upgrade').buyBtn; return { x: b.x, y: b.y }; });
  const buy = { x: bb.x * UI, y: bb.y * UI };
  // 잠긴 노드(단련된 무기)는 뿌리를 배우기 전엔 강화 불가
  let p = await at('atk');
  await page.mouse.click(p.x, p.y);
  await page.mouse.click(buy.x, buy.y);
  expect(await game(page, () => window.__rtd.meta.level('atk'))).toBe(0);
  // 뿌리 → 단련된 무기 순서로 강화
  p = await at('origin');
  await page.mouse.click(p.x, p.y);
  await page.mouse.click(buy.x, buy.y);
  p = await at('atk');
  await page.mouse.click(p.x, p.y);
  await page.mouse.click(buy.x, buy.y);
  const s = await game(page, () => ({ origin: window.__rtd.meta.level('origin'), atk: window.__rtd.meta.level('atk'), fame: window.__rtd.meta.fame }));
  expect(s).toEqual({ origin: 1, atk: 1, fame: 50 - 1 - 3 });
  // 드래그로 트리 이동
  const tx0 = await game(page, () => window.game.scene.getScene('Upgrade').tree.x);
  await page.mouse.move(300 * UI, 200 * UI); await page.mouse.down(); await page.mouse.move(360 * UI, 260 * UI, { steps: 5 }); await page.mouse.up();
  expect(await game(page, () => window.game.scene.getScene('Upgrade').tree.x)).toBeGreaterThan(tx0);
  await page.screenshot({ path: SHOT('14-upgrade-tree') });
  await clickAt(page, () => { const b = window.game.scene.getScene('Upgrade').startBtn; return { x: b.x, y: b.y }; }); // 게임 시작
  await page.waitForFunction(() => window.game.scene.isActive('Game'));
  expect(await game(page, () => window.game.scene.getScene('Game').bonus.dmg)).toBeCloseTo(0.15);
  expect(errors).toEqual([]);
});

test('강화 효과: 징집령(무료 용병, 노련한 신병 = 언커먼)·군량 보급·성벽 체력·실드', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => window.game?.scene.isActive('Title'));
  await game(page, () => { const m = window.__rtd.meta; m.reset(); Object.assign(m.data.levels, { origin: 1, wall: 2, bulwark: 1, conscript: 2, veteran: 1, funds: 1, bounty: 1, stipend: 2 }); m.save(); });
  await toGame(page, 272, 652);
  const s = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    const gold0 = g.gold;
    g.startWave(1);
    return { mercs: g.mercs.length, grade: g.mercs.map((m) => m.grade), gold0, waveGold: g.gold - gold0, wall: [g.wallHp, g.wallMax, g.wallShield] };
  });
  expect(s).toEqual({ mercs: 2, grade: [2, 2], gold0: 140, waveGold: 10, wall: [90, 90, 5] }); // 노련한 신병: 무료 용병이 언커먼 (룰 v2)
  expect(errors).toEqual([]);
});

test('판이 끝나면 버틴 웨이브만큼 명성 적립', async ({ page }) => {
  const errors = await startGame(page);
  const fame = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    window.__rtd.meta.reset();
    for (let w = 1; w <= 4; w++) g.startWave(w); // 1~3웨이브를 버팀
    g.endGame(false, '테스트');
    return { earned: g.fameEarned, saved: window.__rtd.meta.fame };
  });
  expect(fame).toEqual({ earned: 3, saved: 3 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: SHOT('15-fame-result') });
  expect(errors).toEqual([]);
});

test('무한 웨이브: 100웨이브를 넘어 계속 (하드 없음), 지역은 한 바퀴 돌아 초원, 체력은 계속 오른다', async ({ page }) => {
  const errors = await startGame(page);
  const s = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    g.gold = 999; g.hire(); g.addRelic('war_drum'); g.refreshRelics();
    g.wave = 100; g.spawnQueue = [];
    for (const m of [...g.monsters]) m.destroy();
    g.monsters = [];
    g.update(0, 16); // 예전에는 여기서 하드로 넘어갔다
    g.waveTimer = 0;
    g.update(0, 16);
    g.refreshHud();
    return { gold: g.gold >= 900, mercs: g.mercs.length, relics: g.ownedRelics.length, wave: g.wave, over: g.over, tab: g.hud.waveText.text, biome: g.biome.id };
  });
  expect(s).toEqual({ gold: true, mercs: 1, relics: 1, wave: 101, over: false, tab: 'WAVE 101', biome: 'grass' });
  const hp = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    while (g.spawnQueue.length) g.spawnMonster(g.spawnQueue.shift());
    return g.monsters.at(-1).maxHp;
  });
  expect(hp).toBeCloseTo((40 * Math.pow(1.08, 100) * 0.7) / 5, 0); // 물량 ×5: 마리당 체력 1/5
  await page.waitForTimeout(600);
  await page.screenshot({ path: SHOT('16-endless') });
  expect(errors).toEqual([]);
});

test('성탑 삭제: 가운데 칸까지 25칸 모두 용병 자리, 하단 강화 버튼 → 전투가 멈추고 강화 트리 → 강화하면 바로 반영', async ({ page }) => {
  const errors = await startGame(page);
  // 2026-11-18: 필드 성탑 삭제 → 용병 칸 25개 (가운데 칸 포함)
  const slots = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    g.gold = 99999;
    // 서로 다른 캐릭터로 (무작위 고용은 같은 캐릭터 3장이 겹치면 별 승급으로 수가 줄어 흔들렸다)
    for (const c of window.__rtd.ROSTER.slice(0, 30)) g.hire(c.id);
    return { mercs: g.mercs.length, center: !!g.grid[2][2], slots: g.fieldSlots, tower: !!g.tower };
  });
  expect(slots).toEqual({ mercs: 25, center: true, slots: 25, tower: false });
  await page.screenshot({ path: SHOT('17-field-25') });
  // 명성이 있으면 강화 버튼에 "!" 표시
  await game(page, () => { const m = window.__rtd.meta; m.reset(); m.addFame(30); window.game.scene.getScene('Game').refreshHud(); });
  expect(await game(page, () => window.game.scene.getScene('Game').hud.upgradeBadge.visible)).toBe(true);
  await page.screenshot({ path: SHOT('17b-upgrade-button') });
  // 강화 버튼 클릭 → 강화 트리 (전투 일시정지)
  await clickAt(page, UPGRADE_BTN);
  await page.waitForFunction(() => window.game.scene.isActive('Upgrade'));
  expect(await game(page, () => window.game.scene.isPaused('Game'))).toBe(true);
  const at = (id) => game(page, (id) => window.game.scene.getScene('Upgrade').nodeScreenPos(id), id);
  for (const id of ['origin', 'atk']) {
    const p = await at(id);
    await page.mouse.click(p.x * UI, p.y * UI);
    await clickAt(page, BUY_BTN); // 강화
  }
  await page.screenshot({ path: SHOT('18-tower-upgrade') });
  await page.keyboard.press('Escape'); // 닫고 전투로
  await page.waitForFunction(() => !window.game.scene.isActive('Upgrade') && !window.game.scene.isPaused('Game'));
  expect(await game(page, () => window.game.scene.getScene('Game').bonus.dmg)).toBeCloseTo(0.15); // 즉시 반영
  expect(errors).toEqual([]);
});

test('버그 회귀: 전투 중 강화 후 게임 오버 → 명성 강화 → 영지로 정상 이동', async ({ page }) => {
  const errors = await startGame(page);
  await game(page, () => { const m = window.__rtd.meta; m.reset(); m.addFame(50); });
  // 1) 전투 중 강화 버튼으로 강화 창을 열었다 닫는다
  await clickAt(page, UPGRADE_BTN);
  await page.waitForFunction(() => window.game.scene.isActive('Upgrade'));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.game.scene.isActive('Upgrade'));
  // 2) 게임 오버 → 결과 창 "명성 강화"
  await game(page, () => window.game.scene.getScene('Game').endGame(false, '테스트'));
  await page.waitForTimeout(400);
  await clickAt(page, () => { const b = window.game.scene.getScene('Game').endBtns.fame; return { x: b.x, y: b.y }; });
  await page.waitForFunction(() => window.game.scene.isActive('Upgrade'));
  expect(await game(page, () => window.game.scene.getScene('Upgrade').fromGame)).toBe(false); // 일반 화면 (게임 시작·타이틀로 버튼)
  // 3) 포인트 사용 후 타이틀로
  const p = await game(page, () => window.game.scene.getScene('Upgrade').nodeScreenPos('origin'));
  await page.mouse.click(p.x * UI, p.y * UI);
  await clickAt(page, BUY_BTN);
  expect(await game(page, () => window.__rtd.meta.level('origin'))).toBe(1);
  await clickAt(page, () => { const b = window.game.scene.getScene('Upgrade').lobbyBtn; return { x: b.x, y: b.y }; }); // 영지로
  await page.waitForFunction(() => window.game.scene.isActive('Lobby'));
  // 2026-11-22: 옆으로 밀기 전환 동안은 두 장면이 함께 돈다 — 전환이 끝나면 영지만 남아야 한다
  await page.waitForFunction(() => window.game.scene.getScenes(true).length === 1, null, { timeout: 5000 }).catch(() => null);
  expect(await game(page, () => window.game.scene.getScenes(true).map((s) => s.scene.key))).toEqual(['Lobby']);
  expect(errors).toEqual([]);
});

test('PixelLab 이펙트: 시트 8종 로드, 명중·속성 폭발·영웅 기둥 재생', async ({ page }) => {
  const errors = await startGame(page);
  const r = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    const keys = ['hit_star', 'hit_magic', 'hit_snipe', 'slash', 'skill_red', 'skill_blue', 'skill_green', 'ultimate'];
    const missing = keys.filter((k) => !g.anims.exists(`fx_${k}_play`));
    g.tweens.pauseAll();
    g.update = () => {}; // 전투 로직만 멈춰 다른 이펙트(몬스터·성벽 피해 등)가 끼어들지 않게 — 느린 CI 에서 개수가 0 이 안 되던 문제 (정지는 애니메이션까지 멈춘다)
    const v = g.vfx;
    const played = [
      v.elementBlast(140, 330, 60, 'red'),
      v.elementBlast(272, 330, 60, 'blue'),
      v.elementBlast(404, 330, 60, 'green'),
      v.play('slash', 140, 520, { tint: 'blue', scale: 3 }),
      v.play('hit_snipe', 272, 520, { scale: 3 }),
      v.play('hit_magic', 404, 520, { tint: 'green', scale: 3 }),
      v.play('hit_star', 200, 640, { tint: 'red', scale: 3 }),
      v.play('ultimate', 340, 700, { scale: 3 })
    ];
    return { missing, played, live: v.sheetCount };
  });
  expect(r.missing).toEqual([]);
  expect(r.played.every(Boolean)).toBe(true);
  expect(r.live).toBe(8);
  await page.waitForTimeout(260);
  await page.screenshot({ path: SHOT('19-pixellab-fx') });
  // 재생이 끝나면 스스로 지워진다
  await page.waitForFunction(() => window.game.scene.getScene('Game').vfx.sheetCount === 0, null, { timeout: 10000 }); // 느린 CI 에서 5초를 넘긴 적 있음 (2026-11-20)
  expect(errors).toEqual([]);
});

test('PixelLab 이펙트 2: 몬스터 사망·보스 폭발·버프/디버프 상태 표시·레벨 업(용병을 따라감)', async ({ page }) => {
  const errors = await startGame(page);
  const keys = ['death', 'boss_death', 'buff', 'debuff', 'levelup'];
  expect(await game(page, (ks) => ks.filter((k) => !window.game.scene.getScene('Game').anims.exists(`fx_${k}_play`)), keys)).toEqual([]);
  const r = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    g.gold = 9999;
    while (g.mercs.length < 2) g.hire({ free: true });
    const [a, b] = g.mercs;
    // 버프: 걸려 있는 동안 계속 붙어 있다
    a.addBuff({ rate: 0.5, dur: 1 }, g.gameTime);
    g.updateMercs(0);
    const buffOn = !!a.buffFx?.active && a.list.includes(a.buffFx);
    // 디버프 상태 표시
    g.vfx.setStatus(b, 'debuff', true);
    const debuffOn = !!b.debuffFx?.active && b.debuffFx.anims.isPlaying;
    // 레벨 업: 용병 컨테이너의 자식 → 옮기면 같이 움직인다
    g.levelUpFx(a, 'LEVEL UP!', true);
    const lv = a.list.find((o) => o.texture?.key === 'fx_levelup');
    const before = lv.getWorldTransformMatrix().tx;
    a.x += 64;
    const after = lv.getWorldTransformMatrix().tx;
    const d1 = g.vfx.death({ x: 140, y: 330, attr: 'red', kind: 'normal', isBoss: false });
    const d2 = g.vfx.death({ x: 400, y: 330, attr: 'blue', kind: 'boss', isBoss: true });
    return { buffOn, debuffOn, follows: after - before === 64, d1, d2 };
  });
  expect(r).toEqual({ buffOn: true, debuffOn: true, follows: true, d1: true, d2: true });
  await page.waitForTimeout(200);
  await page.screenshot({ path: SHOT('20-pixellab-fx2') });
  // 효과가 끝나면 상태 표시가 떨어지고, 레벨 업 이펙트는 스스로 지워진다
  // 고정 대기 대신 레벨 업 이펙트가 실제로 끝날 때까지 기다린다 (느린 환경에서는 프레임이 적다)
  await page.waitForFunction(() => !window.game.scene.getScene('Game').mercs[0].list.some((o) => o.texture?.key === 'fx_levelup'), null, { timeout: 8000 });
  const after = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    g.gameTime += 5;
    g.updateMercs(0);
    const [a, b] = g.mercs;
    return { buff: !!a.buffFx, debuff: !!b.debuffFx, levelup: a.list.some((o) => o.texture?.key === 'fx_levelup') };
  });
  expect(after).toEqual({ buff: false, debuff: false, levelup: false });
  expect(errors).toEqual([]);
});

test('배너·토스트는 필드와 몬스터 길을 가리지 않는다 (PC: 배너는 위 · 토스트는 아래 띠)', async ({ page }) => {
  const errors = await startGame(page);
  await game(page, () => {
    const g = window.game.scene.getScene('Game');
    g.showBanner('보스: 아주 긴 이름의 강화 보스', '공속 감소(공격 속도 -40% 8초) / 스킬 봉쇄(스킬 사용 불가 6초) / 쿨타임 증가(쿨타임 회복 -50% 10초)', '#d6a8ff');
    g.toast('골드가 부족합니다 — 아주 긴 안내 문구가 들어와도 화면 밖으로 넘치지 않아야 합니다', '#ff9a7a');
  });
  await page.waitForTimeout(300);
  const b = await game(page, () => {
    const h = window.game.scene.getScene('Game').hud;
    const r = (c) => { const k = c.getBounds(); return { top: k.top, bottom: k.bottom, left: k.left, right: k.right }; };
    return { banner: r(h.bannerObj), toast: r(h.toastObj), bannerHidden: !h.bannerObj.visible };
  });
  // PC (UI 좌표): 몬스터 길 사각형 = 필드(월드 820~1100, 400~680) ± 90 → UI y 206.7 ~ 513.3
  // 배너 = 위 알약 바(아래 68)와 위쪽 길 사이 · 토스트 = 아래쪽 길과 아래 독(616) 사이
  expect(b.banner.top).toBeGreaterThanOrEqual(68);
  expect(b.banner.bottom).toBeLessThanOrEqual(207);
  expect(b.toast.top).toBeGreaterThanOrEqual(513);
  expect(b.toast.bottom).toBeLessThanOrEqual(616);
  for (const k of ['banner', 'toast']) {
    expect(b[k].left).toBeGreaterThanOrEqual(0);
    expect(b[k].right).toBeLessThanOrEqual(1280);
  }
  await page.screenshot({ path: SHOT('21-notice-bands') });
  expect(errors).toEqual([]);
});

test('필드 도트(플랫 스타일): 지역 10종 배경이 모두 그려지고 장식은 보이는 땅에만', async ({ page }) => {
  const errors = await startGame(page);
  const r = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    const ids = ['grass', 'desert', 'autumn', 'volcano', 'snow', 'swamp', 'crystal', 'graveyard', 'sky', 'void'];
    const missing = ids.filter((id) => !g.textures.exists(`bg_${id}`));
    // 잡티 대신 덩어리: 땅 한 줄에서 옆 픽셀과 색이 바뀌는 횟수가 적어야 한다 (예전 흩뿌림은 약 30%)
    const src = g.textures.get('bg_grass').getSourceImage();
    const ctx = src.getContext('2d');
    const row = ctx.getImageData(0, 50, src.width, 1).data;
    let changes = 0;
    for (let x = 1; x < src.width; x++) if (row[x * 4] !== row[(x - 1) * 4] || row[x * 4 + 1] !== row[(x - 1) * 4 + 1]) changes++;
    return { missing, changeRate: changes / src.width };
  });
  expect(r.missing).toEqual([]);
  expect(r.changeRate).toBeLessThan(0.25);
  await page.screenshot({ path: SHOT('22-field-flat') });
  expect(errors).toEqual([]);
});

test('캐릭터 그림: 70명 모두 게임 그림이 있다', async ({ page }) => {
  const errors = await startGame(page);
  const s = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    const R = window.__rtd.ROSTER;
    return { n: R.length, withArt: R.filter((c) => g.textures.exists(`char_${c.id}`) && g.anims.exists(`char_${c.id}:attack`)).length };
  });
  expect(s).toEqual({ n: 70, withArt: 70 }); // 룰 v2: 34명 삭제
  expect(errors).toEqual([]);
});

test('PixelLab 화살: 궁수 속성별·레인저 금빛 화살이 시트 애니메이션으로 날아간다', async ({ page }) => {
  const errors = await startGame(page);
  const colors = ['red', 'blue', 'green', 'gold'];
  expect(await game(page, (cs) => cs.filter((c) => !window.game.scene.getScene('Game').anims.exists(`fx_arrow_${c}_play`)), colors)).toEqual([]);
  const r = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    g.scene.pause();
    const t = { x: 272, y: 300 };
    const shots = [];
    ['red', 'blue', 'green'].forEach((attr, i) => {
      g.vfx.attack({ x: 120 + i * 150, y: 600, attr }, t, 'archer');
    });
    g.vfx.attack({ x: 420, y: 450, attr: 'red' }, t, 'ranger');
    g.vfx.arrowRain([{ x: 150, y: 400 }, { x: 400, y: 420 }], 'blue', false);
    for (const o of g.children.list) if (o.texture?.key?.startsWith('fx_arrow_')) shots.push({ key: o.texture.key, playing: !!o.anims?.isPlaying, scale: o.scaleX });
    return shots;
  });
  expect(r.map((s) => s.key).sort()).toEqual(['fx_arrow_blue', 'fx_arrow_blue', 'fx_arrow_blue', 'fx_arrow_gold', 'fx_arrow_green', 'fx_arrow_red']);
  expect(r.every((s) => s.playing && s.scale === 2)).toBe(true); // 도트 2px 통일 (2026-11-21, 이전 3)
  await page.screenshot({ path: SHOT('23-arrows') });
  // 명중하면 사라진다
  await game(page, () => window.game.scene.getScene('Game').scene.resume());
  await page.waitForFunction(() => !window.game.scene.getScene('Game').children.list.some((o) => o.texture?.key?.startsWith('fx_arrow_')), null, { timeout: 5000 });
  expect(errors).toEqual([]);
});

test('동전 드랍: 몬스터를 처치하면 골드 동전이 흩뿌려지고 끝나면 사라진다 (동시 12개 상한)', async ({ page }) => {
  const errors = await startGame(page);
  expect(await game(page, () => window.game.scene.getScene('Game').anims.exists('fx_coin_drop_play'))).toBe(true);
  const r = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    g.startWave(1);
    const before = g.gold;
    // 필드에 나온 몬스터 하나를 바로 처치
    return new Promise((res) => {
      const tick = () => {
        const ms = g.monsters.filter((x) => x.active);
        if (ms.length < 5) return setTimeout(tick, 50);
        for (const m of ms.slice(0, 5)) g.damageMonster(m, 1e9); // 물량: 마리당 0.4골드 → 5마리 = 2골드
        setTimeout(() => res({ gold: g.gold - before, coins: g.children.list.filter((o) => o.texture?.key === 'fx_coin_drop').length }), 120);
      };
      tick();
    });
  });
  expect(r.gold).toBeGreaterThan(0);
  expect(r.coins).toBeGreaterThanOrEqual(1);
  await page.screenshot({ path: SHOT('24-coin-drop') });
  // 상한: 한꺼번에 많이 불러도 12개까지만
  const capped = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    for (let i = 0; i < 30; i++) g.vfx.coinDrop(100 + i * 10, 260);
    return g.vfx.coinCount;
  });
  expect(capped).toBe(12);
  await page.waitForFunction(() => window.game.scene.getScene('Game').vfx.coinCount === 0, null, { timeout: 15000 });
  expect(errors).toEqual([]);
});

test('배속 버튼 하나로: x1 → x2 → x3 → 정지 → x1 (정지 버튼 없음) · 단축키 1·2·3', async ({ page }) => {
  const errors = await startGame(page);
  const step = async () => {
    const b = await game(page, () => { const b = window.game.scene.getScene('Game').hud.speedBtn; return { x: b.x, y: b.y }; });
    await page.mouse.click(b.x * UI, b.y * UI);
    return game(page, () => { const g = window.game.scene.getScene('Game'); return `${g.paused ? '정지' : 'x' + g.speed}:${g.hud.speedBtn.label.text}`; });
  };
  expect(await game(page, () => window.game.scene.getScene('Game').hud.pauseBtn)).toBeUndefined();
  expect(await step()).toBe('x2:x2');
  expect(await step()).toBe('x3:x3');
  expect(await step()).toBe('정지:정지');
  const t0 = await game(page, () => window.game.scene.getScene('Game').gameTime);
  await page.waitForTimeout(300);
  expect(await game(page, () => window.game.scene.getScene('Game').gameTime)).toBe(t0); // 정지 중에는 시간이 멈춤
  await page.screenshot({ path: SHOT('35-speed-paused') });
  expect(await step()).toBe('x1:x1');
  // 단축키 1·2·3: 속도 바로 선택, 정지 중이면 풀린다
  const now = () => game(page, () => { const g = window.game.scene.getScene('Game'); return `${g.paused ? '정지' : 'x' + g.speed}:${g.hud.speedBtn.label.text}`; });
  await page.keyboard.press('3'); expect(await now()).toBe('x3:x3');
  await page.keyboard.press('1'); expect(await now()).toBe('x1:x1');
  await step(); await step(); await step(); expect(await now()).toBe('정지:정지');
  await page.keyboard.press('2'); expect(await now()).toBe('x2:x2');
  expect(errors).toEqual([]);
});

test('정지하면 캐릭터 애니메이션도 멈춤 · 공격 모션은 공속에 맞춤 · 배속은 애니메이션에도 · 칸 56px', async ({ page }) => {
  const errors = await startGame(page);
  const r = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    g.gold = 9999; g.hire();
    const { cellCenter } = window.__rtd;
    const a = cellCenter(0, 0), b = cellCenter(1, 0);
    return { slots: g.fieldSlots, gap: b.x - a.x };
  });
  expect(r.slots).toBe(25);
  expect(r.gap).toBe(56); // 칸 56px (2026-11-19, 캐릭터 사이를 넓게)
  // 배속 → 애니메이션 시간도 빨라짐
  await page.keyboard.press('3');
  await page.waitForTimeout(100);
  expect(await game(page, () => window.game.anims.globalTimeScale)).toBe(3);
  await page.keyboard.press('1');
  // 정지 → 대기 애니메이션 프레임이 그대로
  const sb = await game(page, () => { const b = window.game.scene.getScene('Game').hud.speedBtn; return { x: b.x, y: b.y }; });
  for (let i = 0; i < 3; i++) await page.mouse.click(sb.x * UI, sb.y * UI);
  await page.waitForTimeout(100);
  const f0 = await game(page, () => { const m = window.game.scene.getScene('Game').mercs[0]; return { paused: window.game.anims.paused, prog: m.sprite.anims.getProgress(), time: window.game.scene.getScene('Game').time.paused }; });
  await page.waitForTimeout(500);
  const f1 = await game(page, () => window.game.scene.getScene('Game').mercs[0].sprite.anims.getProgress());
  expect(f0.paused).toBe(true);
  expect(f0.time).toBe(true);
  expect(f1).toBe(f0.prog);
  await page.mouse.click(sb.x * UI, sb.y * UI); // x1 로 풀림
  await page.waitForTimeout(100);
  expect(await game(page, () => window.game.anims.paused)).toBe(false);
  // 공격 모션 길이 = 공격 간격 × 0.85 (빠른 공속은 빨리, 느린 공속은 최대 1.6배까지 천천히)
  const ts = await game(page, () => {
    const { playOnce, animMs } = window.__rtd;
    const g = window.game.scene.getScene('Game');
    const spr = g.mercs[0].sprite;
    const anim = g.anims.get(`${spr.texture.key}:attack`);
    const out = [];
    for (const rate of [4, 1, 0.3]) { spr.anims.stop(); playOnce(spr, 'attack', 'idle', 0.85 * (1000 / rate)); out.push(+(spr.anims.timeScale * 0.85 * (1000 / rate) / animMs(anim)).toFixed(2)); }
    return out;
  });
  expect(ts[0]).toBe(1); // 빠르게 재생해 간격 안에 딱 맞춤
  expect(ts[1]).toBe(1);
  expect(ts[2]).toBeGreaterThan(1); // 아주 느린 공속은 1.6배까지만 늘림
  expect(errors).toEqual([]);
});

test('타격 프레임: 기본 공격·스킬의 피해·투사체는 공격 동작의 휘두름·발사 프레임에 나간다 (시작 프레임이 아니라) · 대상이 먼저 죽으면 공격 취소', async ({ page }) => {
  const errors = await startGame(page);
  const r = await game(page, () => {
    const { hitDelay, animMs } = window.__rtd;
    const g = window.game.scene.getScene('Game');
    g.gold = 9999; g.hire();
    const m = g.mercs[0];
    const st = m.getStats(g.relics, g.gameTime);
    let fired = false;
    g.atHitFrame(m, st, () => { fired = true; });
    const anim = g.anims.get(`${m.sprite.texture.key}:attack`);
    const hit = m.sprite.texture.customData.hitFrame.attack;
    const wait = hitDelay(m.sprite, 'attack');
    window.__hitTest = () => fired;
    return { firedNow: fired, hit, wait, total: animMs(anim) / m.sprite.anims.timeScale };
  });
  expect(r.hit).toBeGreaterThanOrEqual(2); // 첫 프레임이 아님
  expect(r.firedNow).toBe(false); // 동작 시작과 동시에 나가지 않는다
  expect(r.wait).toBeGreaterThan(r.total * 0.25); // 예비 동작이 끝난 뒤
  expect(r.wait).toBeLessThan(r.total);
  await page.waitForFunction(() => window.__hitTest(), null, { timeout: 5000 });
  // 무기별 타격 프레임이 manifest 에 있다
  const hits = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    return ['char_arthur', 'char_isolde', 'char_robin'].map((k) => g.textures.get(k).customData.hitFrame.attack);
  });
  expect(hits).toEqual([15, 13, 15]); // 28프레임 공격 (2026-11-21): 검 = 내려친 타격, 지팡이 = 고리가 퍼지는 시전, 활 = 시위를 놓음
  // 발사 전에 노린 몬스터가 모두 죽으면 공격 동작을 끊고 대기로 (피해·투사체도 안 나감, 바로 다음 대상을 노릴 수 있게 쿨타임 0)
  const c = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    const m = g.mercs[0];
    const st = m.getStats(g.relics, g.gameTime);
    const target = { alive: true };
    let fired = false;
    m.sprite.anims.stop(); // 앞 단계의 공격 동작이 끝나지 않았을 수 있다 — 새로 시작
    const timer = g.atHitFrame(m, st, () => { fired = true; });
    if (!timer) return { noTimer: true };
    m.pendingHit = { timer, targets: [target] };
    m.cooldown = 1;
    const playing = m.sprite.anims.currentAnim.key;
    target.alive = false;
    g.updateMercs(0.016);
    window.__cancelFired = () => fired;
    return { playing, after: m.sprite.anims.currentAnim?.key, pending: m.pendingHit, cd: m.cooldown };
  });
  expect(c.noTimer).toBeUndefined();
  expect(c.playing.endsWith(':attack')).toBe(true);
  expect(c.after.endsWith(':idle')).toBe(true);
  expect(c.pending).toBe(null);
  expect(c.cd).toBeLessThanOrEqual(0);
  await page.waitForTimeout(1200);
  expect(await game(page, () => window.__cancelFired())).toBe(false);
  expect(errors).toEqual([]);
});

test('유물 아이콘 그림(12px 전용 모양) · 툴팁 스프링 등장 · 강화 버튼 느낌표 스케일 팝', async ({ page }) => {
  const errors = await startGame(page);
  const r = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    for (const id of ['war_drum', 'hero_sword', 'golden_grail']) g.addRelic(id);
    g.refreshRelics();
    const t = g.textures.get('relic_hero_sword').getSourceImage();
    return { w: t.width, h: t.height };
  });
  expect(r).toEqual({ w: 12, h: 12 });
  const pos = await game(page, () => window.game.scene.getScene('Game').hud.relicPos(1, 3));
  await page.mouse.move(pos.x * UI, pos.y * UI);
  await page.waitForTimeout(40);
  const early = await game(page, () => window.game.scene.getScene('Game').hud.relicTip.container.scale);
  await page.waitForTimeout(700);
  const late = await game(page, () => window.game.scene.getScene('Game').hud.relicTip.container.scale);
  expect(early).toBeLessThan(1);
  expect(late).toBe(1);
  await page.screenshot({ path: SHOT('37-relic-icons-tip') });
  // 느낌표: 실제 시간으로 커졌다 돌아온다 (정지 중에도)
  const scales = await game(page, async () => {
    const g = window.game.scene.getScene('Game');
    g.hud.upgradeBadge.setVisible(true);
    g.togglePause();
    const seen = new Set();
    for (let i = 0; i < 30; i++) { seen.add(+g.hud.upgradeBadge.scale.toFixed(2)); await new Promise((res) => setTimeout(res, 50)); }
    return [...seen];
  });
  expect(Math.max(...scales)).toBeGreaterThan(1.15);
  expect(Math.min(...scales)).toBeLessThan(1);
  expect(errors).toEqual([]);
});

test('스킬 이펙트: 커먼·언커먼은 공용 세트(속성색 · 바닥 레이어는 캐릭터 뒤 · 연쇄는 대상 사이), 레어·유니크는 전용 시트', async ({ page }) => {
  const errors = await startGame(page);
  const r = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    g.gold = 9999; g.hire(); g.hire();
    const R = window.__rtd.ROSTER;
    const [a, b] = g.mercs;
    a.setChar(R.find((c) => c.grade === 1 && c.attr === 'red'));
    b.setChar(R.find((c) => c.grade === 2 && c.attr === 'blue'));
    const fake = [{ x: 120, y: 330, alive: true }, { x: 170, y: 320, alive: true }, { x: 220, y: 330, alive: true }];
    const v = g.vfx;
    v.setSkill(a, { buff: { scope: 'self' } }, [], null);
    v.setSkill(a, { area: { type: 'circle' }, fx: { slow: [0.3, 2] } }, fake, fake[0]);
    v.setSkill(b, { area: { type: 'chain', n: 3 } }, fake, fake[0]);
    v.setSkill(b, { buff: { scope: 'adjacent' } }, [], null);
    const spr = g.children.list.filter((o) => o.texture?.key?.startsWith('fxs_'));
    const keys = [...new Set(spr.map((o) => o.texture.key))].sort();
    const back = spr.filter((o) => o.texture.key.endsWith('_back')).every((o) => o.depth < a.depth);
    const rare = R.find((c) => c.grade === 3); a.setChar(rare);
    const rareUsesSet = v.setSkill(a, { buff: { scope: 'self' } }, [], null);
    // 레어·유니크는 캐릭터 전용 시트 (스킬 def.id 별)
    const uni = R.find((c) => c.grade === 4); b.setChar(uni);
    const sig = [[a, a.def], [b, b.def]].map(([u, d]) => v.sigSkill(u, d, fake, fake[0]));
    const sigKeys = new Set(g.children.list.filter((o) => o.texture?.key?.startsWith('fxg_')).map((o) => o.texture.key.replace(/_back$/, '')));
    return { keys, back, rareUsesSet, sig, sigKinds: sigKeys.size };
  });
  expect(r.sig.every(Boolean)).toBe(true);
  expect(r.sigKinds).toBe(2); // 룰 v2 스킬 1개: 레어 1명 + 유니크 1명, 서로 다른 시트
  expect(r.keys).toEqual(expect.arrayContaining(['fxs_c_buff_self_red', 'fxs_c_buff_self_red_back', 'fxs_c_slow_red', 'fxs_u_chain_blue', 'fxs_u_hit_blue', 'fxs_u_buff_adj_blue_back']));
  expect(r.back).toBe(true);
  expect(r.rareUsesSet).toBe(false); // 레어·유니크는 공용 세트를 쓰지 않는다
  await page.waitForTimeout(250);
  await page.screenshot({ path: SHOT('36-fx-sets') });
  expect(errors).toEqual([]);
});

test('단축키 S: 선택한 용병 판매', async ({ page }) => {
  const errors = await startGame(page);
  await game(page, () => { const g = window.game.scene.getScene('Game'); g.gold = 999; g.hire('helga'); g.select(g.mercs[0]); });
  const g0 = await game(page, () => window.game.scene.getScene('Game').gold);
  await page.keyboard.press('s');
  const r = await game(page, () => { const g = window.game.scene.getScene('Game'); return { n: g.mercs.length, gold: g.gold, sel: !!g.selected }; });
  expect(r).toEqual({ n: 0, gold: g0 + 7, sel: false }); // 커먼 10G × 70% (룰 v2)
  await page.keyboard.press('s'); // 선택이 없으면 아무 일도 없다
  expect(errors).toEqual([]);
});

test('스킬 1개 · 마나 시전 · 별마다 강해짐 · 유니크', async ({ page }) => {
  const errors = await startGame(page);
  const r = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    g.gold = 99999;
    const m = g.hire('bridget');
    const R = (id) => window.__rtd.ROSTER.find((c) => c.id === id);
    const one = m.def.fx?.dmg || 0;
    m.starUp();
    const two = m.def.fx?.dmg || 0;
    g.select(m);
    g.hud.showSkillPopup(m);
    const popup = g.hud.popup.list.filter((o) => o.text).map((o) => o.text).join('\n');
    // 마나가 가득 차면 다음 공격 대신 스킬 (몬스터 하나를 사거리 안에)
    g.startWave(1);
    for (let i = 0; i < 400 && !g.monsters.length; i++) g.updateWaves(0.05);
    const mon = g.monsters[0];
    mon.x = m.x + 40; mon.y = m.y; mon.hp = 1e9; mon.maxHp = 1e9;
    m.mana = m.maxMana; m.cooldown = 0;
    g.updateMercs(0.016);
    const u = g.hire('isolde');
    return { name: m.def.name, last: R('bridget').skills.at(-1).name, one, two, manaAfter: m.mana, max: m.maxMana, popup, unique: u.isHero, uname: u.def.name };
  });
  expect(r.name).toBe(r.last); // 대표 스킬 = 예전 마지막(Lv5) 스킬
  expect(r.two).toBeGreaterThan(r.one); // 2성이 더 세다
  expect(r.manaAfter).toBe(0); // 시전하고 마나 0
  expect(r.max).toBeGreaterThanOrEqual(40);
  expect(r.popup).toContain('★★★');
  expect(r.unique).toBe(true);
  expect(r.uname).toBe('초신성'); // 유니크도 마지막 스킬이 대표 (룰 v2)
  await page.screenshot({ path: SHOT('25-fixed-skills') });
  expect(errors).toEqual([]);
});
test('유니크·레어 스킬 = 궁극기 소리 + 다른 소리 잠깐 낮춤 (2026-11-22)', async ({ page }) => {
  const errors = await startGame(page);
  const r = await game(page, () => {
    const a = window.__rtd.audio;
    const g = window.game.scene.getScene('Game');
    const calls = [];
    for (const k of ['ult', 'skill']) {
      const o = a[k].bind(a);
      a[k] = (...x) => { calls.push(k); o(...x); };
    }
    g.gold = 99999;
    const u = g.hire('isolde');
    const c = g.hire('bridget');
    const rare = g.hire('elva');
    g.startWave(1);
    for (let i = 0; i < 400 && !g.monsters.length; i++) g.updateWaves(0.05);
    const cast = (m) => {
      const st = m.getStats(g.relics, g.gameTime);
      const mon = g.monsters[0];
      mon.x = m.x + 40; mon.y = m.y; mon.hp = 1e9; mon.maxHp = 1e9;
      return g.castSkill(m, m.def, st, g.monstersInRange(m.x, m.y, st.range));
    };
    cast(c);
    const afterCommon = [...calls];
    a.last.ult = -9;
    cast(rare);
    const afterRare = [...calls];
    a.last.ult = -9;
    cast(u);
    return { afterCommon, afterRare, rareGrade: rare.grade, calls, level: u.def.level, hasDuck: !!a.duck };
  });
  expect(r.level).toBe(6);
  expect(r.afterCommon).toEqual(['skill']); // 커먼은 일반 스킬 소리
  expect(r.rareGrade).toBe(3);
  expect(r.afterRare).toEqual(['skill', 'ult']); // 레어도 궁극기 소리 (2026-11-22)
  expect(r.calls).toEqual(['skill', 'ult', 'ult']); // 유니크는 궁극기 소리
  expect(r.hasDuck).toBe(true);
  await page.waitForTimeout(150);
  // 궁극기가 울리는 동안 배경음·효과음(덕 게인)이 낮아졌다가
  expect(await game(page, () => window.__rtd.audio.duck.gain.value)).toBeLessThan(0.6);
  await page.waitForTimeout(1200);
  // 1초쯤 뒤 원래대로
  expect(await game(page, () => window.__rtd.audio.duck.gain.value)).toBeGreaterThan(0.95);
  expect(errors).toEqual([]);
});
test('웨이브 끝 상점 갱신 소리 + 배경음 50% = 예전 20% 크기 (2026-11-22)', async ({ page }) => {
  const errors = await startGame(page);
  const r = await game(page, () => {
    const a = window.__rtd.audio;
    const g = window.game.scene.getScene('Game');
    let n = 0;
    const o = a.shopRefresh.bind(a);
    a.shopRefresh = () => { n += 1; o(); };
    g.startWave(1);
    for (let i = 0; i < 400 && (g.spawnQueue.length || !g.monsters.length); i++) g.updateWaves(0.05);
    for (const m of g.monsters) { m.hp = 0; m.alive = false; }
    g.cleanupMonsters();
    g.update(0, 16); // 웨이브 클리어 판정 → 상점 새로 고침
    const before = n;
    a.setMusicVolume(0.5);
    return { n: before, refreshed: g.shopRefreshed, gain50: a.music.gain.value };
  });
  expect(r.refreshed).toBe(true);
  expect(r.n).toBe(1);
  await page.waitForTimeout(200);
  expect(await game(page, () => window.__rtd.audio.music.gain.value)).toBeCloseTo(0.28 * 0.2, 3); // 예전 MUSIC_GAIN 0.28 × 20%
  expect(errors).toEqual([]);
});
test('영지(로비) → 병영에서 덱 편성 (가진 캐릭터 중 30명 · 레어 9 · 유니크 3) → 저장 → 출전하면 그 덱에서만 상점에 나옴', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => window.game?.scene.isActive('Title'));
  await game(page, () => {
    const m = window.__rtd.meta;
    m.reset();
    Object.assign(m.data.owned, { isolde: 0, arthur: 0 }); // 술집에서 고용했다고 치고 유니크 2명 더
    m.save();
  });
  await page.mouse.click(272, 652);
  await page.waitForFunction(() => window.game.scene.isActive('Lobby'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: SHOT('32-lobby') });
  // 병영 이름표를 눌러 덱 편성으로
  await game(page, () => window.game.scene.getScene('Lobby').openSpot('barracks'));
  await page.waitForFunction(() => window.game.scene.isActive('Deck'));
  const r = await game(page, () => {
    const d = window.game.scene.getScene('Deck');
    const n0 = d.deck.length;
    const R = (id) => window.__rtd.ROSTER.find((c) => c.id === id);
    d.toggle(R('isolde')); // 30명이라 못 넣음
    const full = d.deck.includes('isolde');
    d.toggle(R('helga')); // 빼기
    d.toggle(R('bridget'));
    d.toggle(R('isolde')); // 유니크 3명째
    d.toggle(R('arthur')); // 유니크 4명째 → 거부
    d.toggle(R('william')); // 가지지 않은 캐릭터 → 거부
    return { n0, full, n: d.deck.length, isolde: d.deck.includes('isolde'), arthur: d.deck.includes('arthur'), william: d.deck.includes('william') };
  });
  expect(r).toEqual({ n0: 30, full: false, n: 29, isolde: true, arthur: false, william: false });
  await page.screenshot({ path: SHOT('33-deck') });
  await game(page, () => window.game.scene.getScene('Deck').leave());
  await page.waitForFunction(() => window.game.scene.isActive('Lobby'));
  expect(await game(page, () => window.__rtd.meta.deck.length)).toBe(29);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.game.scene.isActive('Game'));
  const shopOk = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    g.gold = 99999;
    for (let i = 0; i < 20; i++) g.reroll();
    for (let i = 0; i < 9; i++) g.levelUpEstate();
    for (let i = 0; i < 20; i++) g.reroll();
    return g.shop.every((x) => !x || g.deck.includes(x.id)) && !g.deck.includes('helga');
  });
  expect(shopOk).toBe(true);
  expect(errors).toEqual([]);
});
test('영지 화면: 재화 2종 오른쪽 위 · 메뉴 버튼 4개(성문 없음) · 출전 덱은 출전 버튼과 한 판, 한 줄로 밀어서 보기 → 누르면 병영', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => window.game?.scene.isActive('Title'));
  await game(page, () => window.__rtd.meta.reset());
  await page.mouse.click(272, 652);
  await page.waitForFunction(() => window.game.scene.isActive('Lobby'));
  const r = await game(page, () => {
    const l = window.game.scene.getScene('Lobby');
    const ys = new Set(l.deckStrip.list.filter((o) => o.type === 'Graphics').map((o) => o.y));
    return { spots: Object.keys(l.spots).sort(), cards: l.deckStrip.list.filter((o) => o.type === 'Graphics').length, oneRow: ys.size === 1 };
  });
  expect(r).toEqual({ spots: ['barracks', 'forge', 'tent', 'tower'], cards: 30, oneRow: true });
  // 밀기: 덱 줄을 왼쪽으로 끌면 넘어가고 병영으로 가지 않는다
  // 덱 줄 = UI y 650 (아래 판 572~704 안 카드 줄)
  await page.mouse.move(600 * UI, 650 * UI);
  await page.mouse.down();
  await page.mouse.move(480 * UI, 650 * UI, { steps: 5 });
  await page.mouse.move(360 * UI, 650 * UI, { steps: 5 });
  await page.mouse.up();
  const moved = await game(page, () => ({ s: window.game.scene.getScene('Lobby').deckScroll, lobby: window.game.scene.isActive('Lobby') }));
  expect(moved.s).toBeGreaterThan(100);
  expect(moved.lobby).toBe(true);
  await page.screenshot({ path: SHOT('32c-lobby-deck-scroll') });
  // 누르기: 병영
  await page.mouse.click(300 * UI, 650 * UI);
  await page.waitForFunction(() => window.game.scene.isActive('Deck'));
  expect(errors).toEqual([]);
});

test('관성 스크롤: 밀다 놓으면 미끄러지다 멈추고, 끝을 넘겨 끌면 고무줄처럼 돌아온다 (영지 덱 줄 · 병영 격자)', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => window.game?.scene.isActive('Title'));
  await game(page, () => window.__rtd.meta.reset());
  await page.mouse.click(272, 652);
  await page.waitForFunction(() => window.game.scene.isActive('Lobby'));
  const kin = () => game(page, () => { const k = window.game.scene.getScene('Lobby').deckKin; return { v: k.value, max: k.max, moving: k.moving }; });
  // 빠르게 밀고 놓기 → 놓은 뒤에도 더 간다. 자동화 브라우저는 마우스 이동이 0.3초씩 늦게 와서 '튕기기'가 안 되므로
  // 손가락 움직임(시각 포함)을 직접 넣는다: 0.1초에 120px 밀고 바로 놓기
  const atRelease = await game(page, () => {
    const k = window.game.scene.getScene('Lobby').deckKin;
    const t0 = performance.now();
    k.down(t0);
    for (let i = 1; i <= 6; i++) k.drag(i * 20, t0 + i * 16);
    k.up(t0 + 100);
    return { v: k.value, vel: k.v };
  });
  expect(atRelease.vel).toBeGreaterThan(0.5);
  await page.waitForTimeout(300);
  const later = await kin();
  expect(later.v).toBeGreaterThan(atRelease.v + 30);
  await page.waitForTimeout(1500);
  expect((await kin()).moving).toBe(false);
  // 끝을 넘겨 끌기 → 끄는 동안 끝 밖, 놓으면 끝으로 돌아온다
  await game(page, () => window.game.scene.getScene('Lobby').setDeckScroll(9999));
  await page.mouse.move(400 * UI, 650 * UI);
  await page.mouse.down();
  await page.mouse.move(250 * UI, 650 * UI, { steps: 4 });
  await page.mouse.move(100 * UI, 650 * UI, { steps: 4 });
  const over = await kin();
  expect(over.v).toBeGreaterThan(over.max + 10);
  await page.mouse.up();
  await page.waitForTimeout(1200);
  const back = await kin();
  expect(Math.abs(back.v - back.max)).toBeLessThan(1);
  expect(await game(page, () => window.game.scene.isActive('Lobby'))).toBe(true);
  // 병영 격자도 같은 관성 (세로)
  await game(page, () => window.game.scene.getScene('Lobby').go('Deck'));
  await page.waitForFunction(() => window.game.scene.isActive('Deck'));
  const d0 = await game(page, () => {
    const d = window.game.scene.getScene('Deck');
    const t0 = performance.now();
    d.kin.down(t0);
    for (let i = 1; i <= 6; i++) d.kin.drag(i * 20, t0 + i * 16);
    d.kin.up(t0 + 100);
    return d.scrollY;
  });
  await page.waitForTimeout(250);
  const d1 = await game(page, () => window.game.scene.getScene('Deck').scrollY);
  expect(d1).toBeGreaterThan(d0);
  expect(errors).toEqual([]);
});

test('2026-11-21 다듬기: 캐릭터 선택 중 리롤 → 상점으로 · 아이템 그림 40종 · 시너지 상징 그림 · 전열 밝게/후열 어둡게 · 처치 별 · 툴팁 스프링', async ({ page }) => {
  const errors = await startGame(page);
  const r = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    g.gold = 999;
    const m = g.hire('helga');
    g.select(m);
    const before = { info: g.hud.infoBox.visible, shop: g.hud.shopBox.visible };
    g.reroll();
    const after = { info: g.hud.infoBox.visible, shop: g.hud.shopBox.visible, selected: !!g.selected };
    const items = ['whet', 'seal', 'giant_sword', 'guild_vault', 'emblem_knight', 'emblem_guild'].every((id) => g.textures.exists(`item_${id}`) && g.textures.get(`item_${id}`).getSourceImage().width === 12);
    // 전열(바깥 줄) 칸은 틴트 없음, 후열(가운데 3x3)은 어둡게
    const t = g.fieldTiles;
    const tint = { front: t[0].tintTopLeft, back: t[2 * 5 + 2].tintTopLeft };
    // 처치 별
    const before2 = g.vfx.em.cuteStar.getAliveParticleCount();
    g.vfx.death({ x: 200, y: 200, kind: 'normal' });
    const stars = g.vfx.em.cuteStar.getAliveParticleCount() - before2;
    return { before, after, items, tint, stars };
  });
  expect(r.before).toEqual({ info: true, shop: false });
  expect(r.after).toEqual({ info: false, shop: true, selected: false });
  expect(r.items).toBe(true);
  expect(r.tint.front).toBe(0xffffff);
  expect(r.tint.back).not.toBe(0xffffff);
  expect(r.stars).toBe(3);
  // 아이템 툴팁도 유물 툴팁처럼 0.6 → 1 스프링
  await game(page, () => { const g = window.game.scene.getScene('Game'); g.giveItem('whet'); });
  const p = await game(page, () => window.game.scene.getScene('Game').hud.benchPos(0));
  await page.mouse.move(p.x * UI, p.y * UI);
  await page.waitForTimeout(40);
  const early = await game(page, () => window.game.scene.getScene('Game').hud.relicTip?.container.scale);
  await page.waitForTimeout(700);
  const late = await game(page, () => window.game.scene.getScene('Game').hud.relicTip?.container.scale);
  expect(early).toBeLessThan(0.75);
  expect(late).toBe(0.75); // 아이템 툴팁은 원래 배치 그대로 0.75배 (2026-11-22)
  await page.screenshot({ path: SHOT('40-polish-1121') });
  expect(errors).toEqual([]);
});

test('PC 화면 맞춤 (2026-11-22): 1920x1080 을 정수 배율로 + 남는 곳 검정 · 4K 는 2배 · 작은 창은 부드럽게 줄임', async ({ browser }) => {
  const size = async (vp, dpr = 1) => {
    const p = await browser.newPage({ viewport: vp, deviceScaleFactor: dpr });
    await p.goto('/');
    await p.waitForFunction(() => window.game?.scene.isActive('Title'));
    const r = await p.evaluate(() => { const c = window.game.canvas; const b = c.getBoundingClientRect(); return { w: c.width, cssW: Math.round(b.width), left: Math.round(b.left) }; });
    await p.close();
    return r;
  };
  expect(await size({ width: 1920, height: 1080 })).toEqual({ w: 1920, cssW: 1920, left: 0 });
  expect(await size({ width: 2560, height: 1440 })).toEqual({ w: 1920, cssW: 1920, left: 320 }); // 1.33배는 1배 + 검은 테두리
  expect(await size({ width: 1920, height: 1080 }, 2)).toEqual({ w: 3840, cssW: 1920, left: 0 }); // 4K 화면(배율 2)은 캔버스 2배
  const small = await size({ width: 1366, height: 768 });
  expect(small.w).toBe(1920);
  expect(Math.abs(small.cssW - 1366)).toBeLessThanOrEqual(1); // 1080p 보다 작은 창은 맞춰 줄인다
});

test('영지 술집: 3명 · 마정석 고용(새 캐릭터 → 보유, 중복 → 강화) · 리롤 값 상승 / 유물 공방: 생산 → 장착 → 출전하면 효과', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => window.game?.scene.isActive('Title'));
  await game(page, () => { const m = window.__rtd.meta; m.reset(); m.addStones(60); });
  await page.mouse.click(272, 652);
  await page.waitForFunction(() => window.game.scene.isActive('Lobby'));
  await game(page, () => window.game.scene.getScene('Lobby').openSpot('tent'));
  await page.waitForFunction(() => window.game.scene.isActive('Tavern'));
  await page.waitForTimeout(200);
  await page.screenshot({ path: SHOT('38-tavern') });
  const t = await game(page, () => {
    const m = window.__rtd.meta;
    const s = window.game.scene.getScene('Tavern');
    const slots = m.tavern().slots.map((x) => x.id);
    const id = slots[0];
    const wasOwned = m.owns(id);
    const enh0 = m.enhance(id);
    s.hire(0);
    const r1 = m.rerollTavern(); // 3
    const r2 = m.rerollTavern(); // 5
    s.refresh();
    return { n: slots.length, owned: m.owns(id), up: wasOwned ? m.enhance(id) - enh0 : 0, hired: !wasOwned || m.enhance(id) === enh0 + 1, r1, r2, next: m.tavernRerollCost };
  });
  expect(t).toMatchObject({ n: 3, owned: true, hired: true, r1: true, r2: true, next: 7 });
  await game(page, () => window.game.scene.getScene('Tavern').leave());
  await page.waitForFunction(() => window.game.scene.isActive('Lobby') && !window.game.scene.getScene('Lobby').sliding); // 옆으로 밀기 전환이 끝난 뒤 (2026-11-22)
  await game(page, () => window.game.scene.getScene('Lobby').openSpot('forge'));
  await page.waitForFunction(() => window.game.scene.isActive('Workshop'));
  const w = await game(page, () => {
    const m = window.__rtd.meta;
    const s = window.game.scene.getScene('Workshop');
    for (let i = 0; i < 6; i++) s.craft();
    const have = Object.keys(m.data.relics);
    return { have: have.length > 0, equipped: m.equipped.length, levels: Object.values(m.data.relics).reduce((a, b) => a + b, 0) };
  });
  expect(w.have).toBe(true);
  expect(w.equipped).toBeGreaterThan(0);
  expect(w.equipped).toBeLessThanOrEqual(4);
  expect(w.levels).toBe(6);
  await page.waitForTimeout(800);
  await page.screenshot({ path: SHOT('39-workshop') });
  await game(page, () => window.game.scene.getScene('Workshop').leave());
  await page.waitForFunction(() => window.game.scene.isActive('Lobby'));
  await page.screenshot({ path: SHOT('32b-lobby-stones') });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.game.scene.isActive('Game'));
  const g = await game(page, () => { const g = window.game.scene.getScene('Game'); return { relics: g.ownedRelics.map((r) => r.id), eq: window.__rtd.meta.equipped }; });
  expect(g.relics).toEqual(g.eq);
  expect(errors).toEqual([]);
});

test('튜토리얼: 기능을 처음 만나면 한 번만 뜨고 전투가 멈춘다 · 확인 · 끄기 · 다시 보기', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('rtd_tutorial_test', '1'));
  const errors = await startGame(page);
  const tut = () => game(page, () => window.game.scene.getScene('Game').tut.open);
  await page.waitForFunction(() => window.game.scene.getScene('Game').tut.open === 'shop', null, { timeout: 5000 });
  // 떠 있는 동안 전투 시간이 멈춘다
  const t0 = await game(page, () => window.game.scene.getScene('Game').gameTime);
  await page.waitForTimeout(400);
  expect(await game(page, () => window.game.scene.getScene('Game').gameTime)).toBe(t0);
  await page.screenshot({ path: SHOT('26-tutorial') });
  // 확인 버튼을 실제로 누른다
  const ok = await game(page, () => { const b = window.game.scene.getScene('Game').tut.okBtn; return { x: b.x, y: b.y }; });
  await page.mouse.click(ok.x * UI, ok.y * UI);
  expect(await tut()).toBe(null);
  expect(await game(page, () => JSON.parse(localStorage.getItem('rtd_meta_v3')).tutorial.seen.shop)).toBe(true);
  // 용병을 처음 선택 → 정보 창 안내. 같은 단계는 다시 뜨지 않는다
  // 커먼으로 고정 — 무작위 고용이 유니크면 '유니크 합류' 안내가 먼저 떠서 가끔 실패하던 문제 (2026-11-21)
  await game(page, () => { const g = window.game.scene.getScene('Game'); g.gold = 999; g.hire('helga'); g.select(g.mercs[0]); });
  expect(await tut()).toBe('select');
  await page.screenshot({ path: SHOT('27-tutorial-select') });
  // 끄기 → 이후 단계는 뜨지 않는다
  const off = await game(page, () => { const b = window.game.scene.getScene('Game').tut.offBtn; return { x: b.x, y: b.y }; });
  await page.mouse.click(off.x * UI, off.y * UI);
  await game(page, () => { const g = window.game.scene.getScene('Game'); g.select(null); g.startWave(1); });
  expect(await tut()).toBe(null);
  // 메뉴의 '다시 보기' → 다시 켜진다
  expect(await game(page, () => { window.__rtd.meta.resetTutorial(); const g = window.game.scene.getScene('Game'); g.select(g.mercs[0]); return g.tut.open; })).toBe('select');
  expect(errors).toEqual([]);
});

test('타이틀: 일러스트 + 깜빡이는 CLICK TO START, 아무 곳이나 누르면 영지(로비)', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.game?.scene.isActive('Title'));
  const t = await page.evaluate(() => { const s = window.game.scene.getScene('Title'); return { tap: s.tapText.text, bg: s.textures.exists('title_bg') }; });
  expect(t).toEqual({ tap: 'CLICK TO START', bg: true }); // PC (2026-11-22)
  // 깜빡임: 시간에 따라 투명도가 바뀐다
  const alphas = new Set();
  for (let i = 0; i < 8; i++) {
    alphas.add(await page.evaluate(() => window.game.scene.getScene('Title').tapText.alpha.toFixed(2)));
    await page.waitForTimeout(150);
  }
  expect(alphas.size).toBeGreaterThan(1);
  await page.screenshot({ path: SHOT('28-title') });
  await toGame(page, 120, 500); // 빈 곳 → 영지 → 출전
});

test('물량: 1웨이브 167기(2026-11-20 1/3 감소)가 길 폭에 퍼져 나오고, 남는 피해는 옆 몬스터로 넘어간다 (관통)', async ({ page }) => {
  const errors = await startGame(page);
  const r = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    g.gold = 999; g.hire();
    g.startWave(1);
    const queued = g.spawnQueue.length;
    while (g.spawnQueue.length > 117) g.spawnMonster(g.spawnQueue.shift());
    const ms = g.monsters;
    for (const [i, m] of ms.entries()) { m.dist = 300 + i * 2; m.place(); } // 한 줄로 촘촘히
    const lanes = new Set(ms.map((m) => Math.round(m.lane)));
    const before = ms.filter((m) => m.alive).length;
    const merc = g.mercs[0];
    // 마리당 체력의 6.5배 피해 한 방 → 6마리 처치 + 7번째는 다침
    const st = { ...merc.getStats(g.relics, g.gameTime), damage: ms[0].hp * 6.5 };
    const elem = ms[0].attr; merc.attr = elem; // 상성 배율 1
    g.hit(merc, st, ms[0], 1);
    const dead = before - ms.filter((m) => m.alive).length;
    return { queued, scale: ms[0].scaleX, lanes: lanes.size, dead, hurt: ms.filter((m) => m.alive && m.hp < m.maxHp).length };
  });
  expect(r.queued).toBe(167);
  expect(r.scale).toBe(2); // 일반 몬스터는 작게
  expect(r.lanes).toBeGreaterThan(8); // 길 폭 전체에 퍼진다
  expect(r.dead).toBe(6);
  expect(r.hurt).toBe(1);
  await page.waitForTimeout(300);
  await page.screenshot({ path: SHOT('31-horde') });
  expect(errors).toEqual([]);
});

test('PC 1080p 배치 (2026-11-22): 전장은 1배(도트 2px) · UI 는 1.5배 · HUD 가 필드·몬스터 길을 가리지 않는다 · 대기석은 오른쪽 칸 · 위·아래 바는 화면 끝까지', async ({ page }) => {
  const errors = await startGame(page);
  expect(await page.evaluate(() => [window.game.config.width, window.game.config.height])).toEqual([1920, 1080]);
  const r = await page.evaluate(() => {
    const g = window.game.scene.getScene('Game');
    g.gold = 999; g.hire(); g.select(g.mercs[0]); g.startWave(1);
    const ring = { x0: 486.6, y0: 206.6, x1: 793.4, y1: 513.4 }; // 필드 + 몬스터 길 (UI 좌표 = 월드 ÷ 1.5)
    const boxes = [g.hud.estateBtn, g.hud.rerollBtn, g.hud.nextWaveBtn, g.hud.skillBtn, g.hud.sellBtn, g.hud.menuBtn].map((b) => ({ x0: b.x - b.w / 2, x1: b.x + b.w / 2, y0: b.y - b.h / 2, y1: b.y + b.h / 2 }));
    const hit = boxes.filter((b) => b.x0 < ring.x1 && b.x1 > ring.x0 && b.y0 < ring.y1 && b.y1 > ring.y0);
    const m = g.mercs[0];
    return {
      zoom: [g.cams.world.zoom, g.cams.ui.zoom],
      hit: hit.length,
      banner: g.hud.bannerObj?.y,
      field: [m.x / 1.5 > ring.x0, m.x / 1.5 < ring.x1],
      dock: [g.hud.estateBtn.y > ring.y1, g.hud.nextWaveBtn.y < ring.y0],
      reserveRight: g.hud.reservePos(0).x > ring.x1 && g.hud.reservePos(7).x > ring.x1,
      unitScale: m.sprite.scaleX
    };
  });
  expect(r.zoom).toEqual([1, 1.5]);
  expect(r.hit).toBe(0);
  expect(r.banner).toBeLessThan(207); // 배너는 필드 위 빈 띠
  expect(r.field).toEqual([true, true]);
  expect(r.dock).toEqual([true, true]);
  expect(r.reserveRight).toBe(true);
  // 위·아래 바는 화면 좌우 끝까지, 화면 끝에 붙는다 (2026-11-22 사용자 요청)
  // WebGL 캔버스는 바로 읽을 수 없어 화면 캡처를 그림으로 읽는다
  const shot = (await page.screenshot()).toString('base64');
  const bars = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
    const px = (x, y) => [...ctx.getImageData(x, y, 1, 1).data.slice(0, 3)];
    return { tl: px(1, 1), tr: px(1918, 1), bl: px(1, 1078), br: px(1918, 1078) };
  }, shot);
  for (const k of ['tl', 'tr', 'bl', 'br']) expect(bars[k]).toEqual([251, 247, 236]); // 네 귀퉁이까지 크림색 (둥근 모서리 없음)
  // 대기석: 필드가 차면 산 용병은 오른쪽 대기석 칸 위 (월드 좌표 = UI × 1.5)
  const res = await page.evaluate(() => {
    const g = window.game.scene.getScene('Game');
    while (g.mercs.length < g.cap) g.hire('stein');
    g.shop[0] = { id: 'helga', locked: false, sold: false };
    g.buy(0);
    const u = g.reserve.find(Boolean);
    const p = g.hud.reservePos(u.slot);
    return { dx: Math.abs(u.x - p.x * 1.5), dy: Math.abs(u.y - p.y * 1.5) };
  });
  expect(res.dx).toBeLessThan(1);
  expect(res.dy).toBeLessThan(1);
  await page.waitForTimeout(300);
  await page.screenshot({ path: SHOT('30-pc-battle') });
  expect(errors).toEqual([]);
});

test('HUD 다듬기 (2026-11-21 Stitch 시안 점검): 진한 주 버튼 글자 · 체력 수치 흰 글자+외곽(알약 없음) · 판매 빨강 · 상점 가격이 이름과 따로', async ({ page }) => {
  const errors = await startGame(page);
  const r = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    const h = g.hud;
    const texts = h.shopBox.list.flatMap((c) => c.list || []).filter((o) => o.type === 'Text').map((o) => o.text);
    g.gold = 999;
    g.hire('isolde');
    g.select(g.mercs[0]);
    return {
      nextColor: h.nextWaveBtn.label.style.color,
      rerollColor: h.rerollBtn.label.style.color,
      sellVariant: h.sellBtn.variant,
      pill: !!h.hpPill, // 2026-11-21 사용자 요청: 숫자 뒤 크림 알약 없앰 → 흰 글자 + 진한 외곽
      hpStroke: h.countText.style.stroke,
      prices: texts.filter((t) => /^\d+G$/.test(t)).length,
      namesWithPrice: texts.filter((t) => /\d+G$/.test(t) && !/^\d+G$/.test(t)).length
    };
  });
  expect(r.nextColor).toBe('#0d2000');
  expect(r.rerollColor).toBe('#0d2000');
  expect(r.sellVariant).toBe('danger');
  expect(r.pill).toBe(false);
  expect(r.hpStroke).toBe('#2b1d12');
  expect(r.prices).toBe(6); // 6칸 모두 가격이 따로
  expect(r.namesWithPrice).toBe(0);
  await page.waitForTimeout(300);
  await page.screenshot({ path: SHOT('31-hud-polish') });
  expect(errors).toEqual([]);
});

test('UI 여백 (2026-11-21 필수 규칙): 아이콘 버튼은 아이콘·글자 사이와 위아래에 여백 · 병영 카드 체크는 이름과 떨어져 등급 앞 · 아이템 띠 버튼은 띠 안쪽', async ({ page }) => {
  await startGame(page);
  await page.waitForTimeout(400);
  const r = await game(page, () => {
    const h = window.game.scene.getScene('Game').hud;
    const btns = [h.estateBtn, h.menuBtn, h.smithBtn];
    const tile = btns.map((b) => {
      const lb = b.label.getBounds();
      const bx = b.getBounds();
      const ir = b.iconRect;
      const iconBottom = bx.centerY + ir.y + ir.h;
      const iconRight = bx.centerX + ir.x + ir.w;
      return b.iconLeft ? { gap: lb.x - iconRight, top: lb.y - bx.y, bottom: bx.bottom - lb.bottom } : { gap: lb.y - iconBottom, top: bx.centerY + ir.y - bx.y, bottom: bx.bottom - lb.bottom };
    });
    const strip = h.smithBtn.getBounds();
    return { tile, smithLeft: strip.x - 12 };
  });
  for (const t of r.tile) {
    expect(t.gap).toBeGreaterThanOrEqual(4);
    expect(t.top).toBeGreaterThanOrEqual(2);
    expect(t.bottom).toBeGreaterThanOrEqual(2);
  }
  expect(r.smithLeft).toBeGreaterThanOrEqual(4); // 세로 아이템 띠(x 12) 왼쪽 가장자리와 4px 이상
  await game(page, () => {
    for (const s of window.game.scene.getScenes(true)) s.scene.stop();
    window.game.scene.start('Deck');
  });
  await page.waitForFunction(() => window.game.scene.isActive('Deck'));
  await page.waitForTimeout(300);
  const d = await game(page, () => {
    const g = window.game.scene.getScene('Deck').gridC;
    const marks = g.list.filter((o) => o.auditBox);
    const names = g.list.filter((o) => o.type === 'Text');
    let minGap = 99;
    for (const m of marks) {
      const b = m.auditBox;
      for (const t of names) {
        const tb = t.getBounds();
        const dx = Math.max(tb.x - (b.x + b.w), b.x - tb.right);
        const dy = Math.max(tb.y - (b.y + b.h), b.y - tb.bottom);
        if (Math.abs(tb.centerY - (b.y + b.h / 2)) < 60 && Math.abs(tb.centerX - (b.x + b.w / 2)) < 120) minGap = Math.min(minGap, Math.max(dx, dy));
      }
    }
    return { marks: marks.length, minGap };
  });
  expect(d.marks).toBeGreaterThan(0);
  expect(d.minGap).toBeGreaterThanOrEqual(4);
  await page.screenshot({ path: SHOT('46-ui-spacing-deck') });
});

test('2026-11-21 상점·아이템 다듬기: 상점 상징 배지는 이름 띠와 4px 이상 · 용병 카드에도 상징 배지 · 아이템 그림 뒤 칸 없음 · 끄는 아이템은 UI 위', async ({ page }) => {
  const errors = await startGame(page);
  await page.waitForTimeout(400);
  const r = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    const h = g.hud;
    // 상점 카드 0번: 배지(auditBox 컨테이너) 아래와 이름 띠(카드 아래 20px) 사이
    const card = h.shopBox.list[0];
    const badges = card.list.filter((o) => o.auditBox);
    const cardH = 96;
    const bandGap = Math.min(...badges.map((b) => cardH - 20 - (b.y + b.auditBox.y + b.auditBox.h)));
    const between = badges.length === 2 ? Math.abs(badges[1].x - badges[0].x) - badges[0].auditBox.w : -1;
    g.gold = 999;
    g.bench.push('whet');
    h.refreshBench();
    const icon = h.benchRow.list.find((o) => o.input?.draggable);
    const hasBg = icon.list.some((o) => o.type === 'Graphics');
    icon.emit('dragstart');
    const dragDepth = icon.depth;
    const uiDepth = h.smithBtn.depth;
    icon.emit('dragend', { worldX: -999, worldY: -999 });
    g.hire('isolde');
    g.select(g.mercs[0]);
    return { badges: badges.length, bandGap, between, hasBg, dragDepth, uiDepth, infoBadges: h.infoBadges?.list.length };
  });
  expect(r.badges).toBe(2);
  expect(r.bandGap).toBeGreaterThanOrEqual(4);
  expect(r.between).toBeGreaterThanOrEqual(4);
  expect(r.hasBg).toBe(false);
  expect(r.dragDepth).toBeGreaterThan(r.uiDepth);
  expect(r.infoBadges).toBe(2);
  await page.waitForTimeout(200);
  await page.screenshot({ path: SHOT('47-shop-badges-info') });
  expect(errors).toEqual([]);
});

test('성문 (2026-11-21): 성벽 동서남북 가운데에 나무 문 + 탑 깃발, 성벽 두께 안에만', async ({ page }) => {
  const errors = await startGame(page);
  const r = await game(page, () => {
    const cv = window.game.textures.get('field_wall').getSourceImage();
    const ctx = cv.getContext('2d');
    const S = cv.width, SZ = S - 1, c = Math.floor(SZ / 2 + 0.5);
    const px = (x, y) => Array.from(ctx.getImageData(x, y, 1, 1).data);
    const wood = (p) => p[3] === 255 && p[0] > p[2] + 30 && p[0] > 80; // 갈색 나무
    // 문 가운데 (바깥에서 6도트 안쪽): 위 · 아래 · 왼 · 오른
    const doors = [[c - 3, 6], [c - 3, SZ - 7], [6, c - 3], [SZ - 7, c - 3]].map(([x, y]) => wood(px(x, y)));
    // 성벽 바깥(텍스처 밖 여백)은 그대로 투명, 바닥 자리 안쪽도 투명
    return { doors, inner: px(c, c)[3] };
  });
  expect(r.doors).toEqual([true, true, true, true]);
  expect(r.inner).toBe(0);
  await page.screenshot({ path: SHOT('48-wall-gates'), clip: { x: 40, y: 236, width: 464, height: 488 } });
  expect(errors).toEqual([]);
});

test('배경 나무·꽃 (2026-11-22): 초원 화면 전체에 나무 3종(바람에 흔들림 28프레임·박자 다름) 22그루 + 꽃 6종 · 지역이 바뀌면 사라짐', async ({ page }) => {
  const errors = await startGame(page);
  const r = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    const anim = g.anims.get('deco_tree_1:sway');
    const trees = g.decor.filter((s) => s.texture.key.startsWith('deco_tree_'));
    const flowers = g.decor.filter((s) => s.texture.key.startsWith('deco_flower_'));
    return { trees: trees.length, flowers: flowers.length, frames: anim.frames.length, loop: anim.repeat, playing: trees.every((s) => s.anims.isPlaying),
      phases: new Set(trees.map((s) => s.anims.currentFrame.index)).size, w: trees[0].displayWidth,
      belowMonsters: g.decor.every((s) => s.depth < 10), top: trees.some((s) => s.y < 480), bottom: trees.some((s) => s.y > 480),
      treeKinds: new Set(trees.map((s) => s.texture.key)).size, flowerKinds: new Set(flowers.map((s) => s.texture.key)).size,
      flipped: trees.some((s) => s.flipX) };
  });
  expect(r.trees).toBeGreaterThanOrEqual(15); // 나무 22그루 (2026-11-22 줄임)
  expect(r.flowers).toBeGreaterThanOrEqual(30); // 꽃 50송이
  expect(r.frames).toBe(28);
  expect(r.loop).toBe(-1);
  expect(r.playing).toBe(true);
  expect(r.phases).toBeGreaterThan(2); // 나무끼리 같은 박자로 흔들리지 않게
  expect(r.w).toBe(100); // 50px 그림 × 아트 1px = 화면 2px
  expect(r.belowMonsters).toBe(true);
  expect(r.top && r.bottom).toBe(true);
  expect(r.treeKinds).toBe(3); // 나무 3종 (deco_tree_1~3, 사용자 그림)
  expect(r.flowerKinds).toBe(6); // 꽃 6종 (deco_flower_1~6, 사용자 그림)
  expect(r.flipped).toBe(true); // 일부는 좌우 뒤집기
  await page.screenshot({ path: SHOT('49-grass-trees') });
  // 사막(11웨이브)으로 바뀌면 초원 나무는 서서히 사라진다
  await game(page, () => window.game.scene.getScene('Game').changeBiome({ id: 'desert', name: '사막' }));
  await page.waitForTimeout(1500);
  expect(await game(page, () => window.game.scene.getScene('Game').decor.length)).toBe(0);
  expect(errors).toEqual([]);
});

test('대기석 (2026-11-21): 필드가 차면 산 용병은 대기석으로 · 대기석은 시너지·인원 제외 · 끌어서 필드와 자리 바꿈 · 별 승급에 함께 셈', async ({ page }) => {
  const errors = await startGame(page);
  const r = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    const h = g.hud;
    g.gold = 9999;
    const ids = window.__rtd.ROSTER.filter((c) => c.grade === 1).map((c) => c.id);
    // 필드 3명(영지 Lv1)을 서로 다른 캐릭터로 채운다
    ids.slice(0, 3).forEach((id) => g.hire(id));
    const field0 = g.mercs.length;
    // 상점 0번을 4번째 캐릭터로 바꿔 산다 → 대기석
    g.shop[0] = { id: ids[3], sold: false, locked: false };
    const bought = g.buy(0);
    const res = g.reserve.filter(Boolean);
    const inSyn = Object.values(g.syn.counts || {}).reduce((a, b) => a + b, 0);
    // 대기석 → 필드(가득) 끌어 놓기: 빈 칸이면 거절, 필드 유닛 위면 자리 바꿈
    const u = res[0];
    const empty = g.emptyCell(u.char);
    const ec = window.__rtd.cellCenter(empty.c, empty.r);
    g.handleDrop(u, ec.x, ec.y); // 빈 칸 (필드 가득이라 거절)
    const stillReserved = u.reserved;
    const target = g.mercs[0];
    const tPos = { x: target.x, y: target.y };
    g.handleDrop(u, tPos.x, tPos.y); // 필드 유닛과 자리 바꿈
    const swapped = !u.reserved && target.reserved;
    // 별 승급: 필드 1장 + 대기석 1장 + 상점 3장째
    const starId = u.char.id;
    g.shop[1] = { id: starId, sold: false, locked: false };
    g.shop[2] = { id: starId, sold: false, locked: false };
    g.buy(1); // 대기석으로 (필드 가득)
    const before = g.allUnits.filter((m) => m.char.id === starId).length;
    g.buy(2); // 3장째 → 2성
    const after = g.allUnits.filter((m) => m.char.id === starId);
    return {
      field0, bought: !!bought, reserved: res.length, fieldAfter: g.mercs.length, inSyn,
      stillReserved, swapped, before, afterN: after.length, afterStar: after[0]?.star, info: h.waveTypeText.text
    };
  });
  expect(r.field0).toBe(3);
  expect(r.bought).toBe(true);
  expect(r.reserved).toBe(1);
  expect(r.fieldAfter).toBe(3);
  expect(r.inSyn).toBeLessThanOrEqual(6); // 대기석 캐릭터는 시너지에 안 들어감 (필드 3명 × 2)
  expect(r.stillReserved).toBe(true); // 필드 가득 → 빈 칸으로 못 올림
  expect(r.swapped).toBe(true);
  expect(r.before).toBe(2);
  expect(r.afterN).toBe(1);
  expect(r.afterStar).toBe(2);
  expect(r.info).toContain('최고 W');
  await page.waitForTimeout(300);
  await page.screenshot({ path: SHOT('48-reserve') });
  expect(errors).toEqual([]);
});

test('2026-11-22: 상점은 웨이브가 끝날 때 새로 고침 · 아이템 툴팁은 아이콘을 가리지 않고 화면 안 + 조합식 그림 · 정지 중에도 툴팁 · 필드 캐릭터마다 켜진 시너지 상징', async ({ page }) => {
  const errors = await startGame(page);
  // 1) 상점: 웨이브 시작 때는 그대로, 몬스터를 다 잡으면 새로 고침
  const r1 = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    g.startWave(1);
    const before = g.shop;
    g.startWave(2); // 다 잡기 전에 다음 웨이브 → 그때 새로 고침 (웨이브마다 한 번)
    const fallback = g.shop !== before;
    const atStart = g.shop;
    return { fallback, refreshed: g.shopRefreshed, sameAfterStart: g.shop === atStart, atStart: !!atStart };
  });
  expect(r1.fallback).toBe(true);
  expect(r1.refreshed).toBe(false);
  const s0 = await game(page, () => { const g = window.game.scene.getScene('Game'); window.__shop0 = g.shop; g.spawnQueue = []; for (const m of [...g.monsters]) g.killMonster(m); g.cleanupMonsters(); return g.shopRefreshed; });
  expect(s0).toBe(false);
  await page.waitForTimeout(300);
  const s1 = await game(page, () => { const g = window.game.scene.getScene('Game'); return { refreshed: g.shopRefreshed, changed: g.shop !== window.__shop0 }; });
  expect(s1).toEqual({ refreshed: true, changed: true });

  // 2) 정지한 채로 아이템 툴팁: 아이콘 아래에 뜨고, 화면 안, 다 보인다(alpha 1·scale 1), 조합식 줄마다 그림
  await game(page, () => { const g = window.game.scene.getScene('Game'); g.giveItem('whet'); if (!g.paused) g.togglePause(); });
  const p = await game(page, () => window.game.scene.getScene('Game').hud.benchPos(0));
  await page.mouse.move(p.x * UI, p.y * UI);
  await page.waitForTimeout(700);
  const tip = await game(page, (px) => {
    const g = window.game.scene.getScene('Game');
    const c = g.hud.relicTip?.container;
    const b = c.getBounds();
    const imgs = [];
    const walk = (o) => (o.type === 'Image' ? imgs.push(o.texture.key) : o.each?.(walk));
    c.each(walk);
    return { paused: g.paused, alpha: c.alpha, scale: c.scale, top: b.y, bottom: b.bottom, right: b.x > px + 12, imgs: imgs.length, sword: imgs.includes('item_giant_sword') };
  }, p.x);
  expect(tip.paused).toBe(true);
  expect(tip.alpha).toBe(1);
  expect(tip.scale).toBe(0.75); // 원래 배치 그대로 작게 (2026-11-22)
  expect(tip.right).toBe(true); // PC: 아이템 띠(왼쪽 아래) 오른쪽에 — 아이콘을 가리지 않고 화면 안
  expect(tip.top).toBeGreaterThanOrEqual(0);
  expect(tip.bottom).toBeLessThanOrEqual(720); // UI 좌표 높이
  expect(tip.imgs).toBeGreaterThanOrEqual(10); // 머리 1 + 조합 줄마다 재료·결과
  expect(tip.sword).toBe(true);
  await page.screenshot({ path: SHOT('49-item-tip-paused') });

  // 3) 정지 중에 산 캐릭터도 바로 보인다 + 켜진 시너지 상징
  const r3 = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    for (const m of [...g.allUnits]) g.sell(m);
    const R = window.__rtd.ROSTER;
    const a = R.find((c) => g.deck.includes(c.id));
    const b = R.find((c) => c.id !== a.id && c.cls === a.cls && c.origin !== a.origin);
    const solo = g.hire(a.id);
    const marks0 = solo.synMarks.length;
    const m2 = g.hire(b.id);
    return { marks0, marks1: solo.synMarks.length, marks2: m2.synMarks.length, alpha: m2.sprite.alpha, y: m2.sprite.y, on: !!g.syn.tiers[a.cls] };
  });
  expect(r3.marks0).toBe(0);
  expect(r3.on).toBe(true);
  expect(r3.marks1).toBeGreaterThanOrEqual(1);
  expect(r3.marks2).toBeGreaterThanOrEqual(1);
  expect(r3.alpha).toBe(1); // 정지 중에 사도 투명하게 멈춰 있지 않다
  expect(r3.y).toBe(0);
  await page.mouse.move(272, 480);
  await page.screenshot({ path: SHOT('50-syn-marks') });
  expect(errors).toEqual([]);
});

test('성벽 체력 피해 자국 (2026-11-22): 맞으면 줄어든 만큼 붉게 남았다가 천천히 새 위치까지 줄어든다 · 회복은 바로', async ({ page }) => {
  const errors = await startGame(page);
  const r0 = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    g.wallHp -= 30;
    g.refreshHud();
    const h = g.hud;
    return { shown: h.hpShown, trail: h.hpTrail, tween: !!h.hpTrailTween };
  });
  expect(r0.shown).toBeCloseTo(50 / 80, 3);
  expect(r0.trail).toBe(1); // 바로는 붉은 자국이 남는다
  expect(r0.tween).toBe(true);
  await page.waitForFunction(() => !window.game.scene.getScene('Game').hud.hpTrailTween, null, { timeout: 5000 });
  const r1 = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    const h = g.hud;
    const after = h.hpTrail;
    g.wallHp = 80;
    g.refreshHud();
    return { after, healed: h.hpTrail };
  });
  expect(r1.after).toBeCloseTo(50 / 80, 3); // 자국이 새 위치까지 따라왔다
  expect(r1.healed).toBe(1); // 회복은 자국 없이 바로
  expect(errors).toEqual([]);
});

test('2026-11-22 화면 점검: 용병 카드 아이템은 상징 배지와 안 겹침 · 카드가 닫히면 아이템 툴팁도 닫힘 · 대기석 캐릭터는 칸 테두리로 등급 표시', async ({ page }) => {
  const errors = await startGame(page);
  const r = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    const h = g.hud;
    g.gold = 999;
    g.hire('isolde');
    const m = g.mercs[0];
    m.items = ['whet', 'feath'];
    g.select(m);
    const icons = h.itemRow.list;
    const firstLeft = icons[0].x - 6; // 아이템 그림 12x12 (툴팁과 같은 크기, 2026-11-22)
    const badgeRight = h.infoBadgeRight;
    // 아이템 아이콘에 마우스 → 툴팁, 화면을 여러 번 새로 그려도 아이콘이 그대로 (툴팁이 남지 않게)
    icons[0].emit('pointerover');
    const tip1 = !!h.relicTip;
    for (let i = 0; i < 5; i++) g.refreshHud();
    const same = h.itemRow.list[0] === icons[0];
    g.select(null); // 카드 닫기
    const tipAfter = !!h.relicTip;
    return { gap: firstLeft - badgeRight, tip1, same, tipAfter };
  });
  expect(r.gap).toBeGreaterThanOrEqual(4);
  expect(r.tip1).toBe(true);
  expect(r.same).toBe(true);
  expect(r.tipAfter).toBe(false);
  // 대기석: 필드를 채우고 하나 더 사면 대기석 — 발밑 고리 대신 칸 테두리
  const q = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    const ids = window.__rtd.ROSTER.filter((c) => c.grade === 1).map((c) => c.id);
    ids.slice(0, 3).forEach((id) => g.hire(id));
    g.shop[0] = { id: ids[4], sold: false, locked: false };
    g.buy(0);
    const u = g.reserve.find(Boolean);
    return { reserved: !!u?.reserved, drawn: u?.drawnReserved };
  });
  expect(q.reserved).toBe(true);
  expect(q.drawn).toBe(true);
  expect(errors).toEqual([]);
});

test('병영 (2026-11-22): 고른 카드는 등급색과 다른 자홍 테두리 · 카드마다 계열·출신 상징 · 고른 카드를 한 번 더 누르면 덱에서 빼기/넣기', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => window.game?.scene.isActive('Title'));
  await game(page, () => { window.__rtd.meta.reset(); window.game.scene.getScene('Title').scene.start('Deck'); });
  await page.waitForFunction(() => window.game.scene.isActive('Deck'));
  await page.waitForTimeout(400);
  // 첫 카드 자리 (격자 왼쪽 위)
  const pos = await game(page, () => { const d = window.game.scene.getScene('Deck'); const c = d.visible[0]; return { id: c.id, inDeck: d.deck.includes(c.id), badges: d.gridC.list.filter((o) => o.auditBox && o.type === 'Container').length }; });
  expect(pos.badges).toBeGreaterThanOrEqual(2 * 8); // 보이는 카드마다 상징 2개
  const tap = () => uiClick(page, 16 + 60, 160 + 6 + 40); // 격자 왼쪽 위 카드 (UI 좌표)
  await tap(); // 고르기
  const s1 = await game(page, () => { const d = window.game.scene.getScene('Deck'); return { sel: d.selected?.id, n: d.deck.length }; });
  expect(s1.sel).toBe(pos.id);
  await tap(); // 한 번 더 → 덱에서 빼기
  const s2 = await game(page, (id) => window.game.scene.getScene('Deck').deck.includes(id), pos.id);
  expect(s2).toBe(!pos.inDeck);
  await tap(); // 또 한 번 → 다시 넣기
  const s3 = await game(page, (id) => window.game.scene.getScene('Deck').deck.includes(id), pos.id);
  expect(s3).toBe(pos.inDeck);
  await page.screenshot({ path: SHOT('50-deck-select') });
  expect(errors).toEqual([]);
});

test('영지 (2026-11-22): 배경 그림이 화면을 채움 · 메뉴 버튼 오른쪽 정렬 세로 줄 · 누르면 옆으로 밀어 넘어가고 돌아올 때도 반대로', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => window.game?.scene.isActive('Title'));
  await page.mouse.click(272, 652);
  await page.waitForFunction(() => window.game.scene.isActive('Lobby'));
  await page.waitForTimeout(300);
  const r = await game(page, () => {
    const l = window.game.scene.getScene('Lobby');
    const rights = Object.values(l.spots).map((c) => Math.round(c.getBounds().right));
    const ys = Object.values(l.spots).map((c) => Math.round(c.y));
    const bg = l.children.list.find((o) => o.type === 'Image' && o.texture.key === 'lobby_wide');
    return { rights, ys, bgFull: !!bg && bg.displayWidth >= 1280 && bg.displayHeight >= 720 };
  });
  expect(new Set(r.rights).size).toBe(1); // 오른쪽 끝이 모두 같다
  expect(r.rights[0]).toBeGreaterThanOrEqual(1280 - 20);
  expect([...r.ys].sort((a, b) => a - b)).toEqual(r.ys); // 위에서 아래로 한 줄
  expect(r.bgFull).toBe(true); // 가로 영지 그림(도트)이 화면을 꽉 채움 — 사용자 세로 그림은 가로 화면에 맞지 않아 PC 에서는 안 씀
  await page.screenshot({ path: SHOT('49-lobby-right-menu') });
  // 병영으로: 잠깐 두 장면이 함께 보이며 새 화면 카메라가 오른쪽에서 들어온다
  // 매 프레임 두 장면 카메라 위치를 모아 본다 (전환은 실제 시간 0.36초라 한 번 읽어서는 놓친다)
  const watch = (key) => game(page, (key) => {
    window.__xs = [];
    const f = () => { const s = window.game.scene.getScene(key); if (window.game.scene.isActive(key)) window.__xs.push(s.cameras.main.x); };
    window.__xsOff?.();
    window.game.events.on('poststep', f);
    window.__xsOff = () => window.game.events.off('poststep', f);
  }, key);
  await watch('Deck');
  await game(page, () => window.game.scene.getScene('Lobby').openSpot('barracks'));
  await page.waitForFunction(() => !window.game.scene.isActive('Lobby') && window.game.scene.isActive('Deck') && !window.game.scene.getScene('Deck').sliding, null, { timeout: 8000 });
  const into = await game(page, () => window.__xs);
  expect(into.some((x) => x > 0)).toBe(true); // 오른쪽에서 들어왔다
  expect(into[into.length - 1]).toBe(0);
  // 돌아가기: 영지가 왼쪽에서 들어온다
  await watch('Lobby');
  await game(page, () => window.game.scene.getScene('Deck').leave());
  await page.waitForFunction(() => !window.game.scene.isActive('Deck') && window.game.scene.isActive('Lobby') && !window.game.scene.getScene('Lobby').sliding, null, { timeout: 8000 });
  const back = await game(page, () => { window.__xsOff(); return window.__xs; });
  expect(back.some((x) => x < 0)).toBe(true);
  expect(back[back.length - 1]).toBe(0);
  expect(errors).toEqual([]);
});

test('2026-11-22: 시너지 아이콘에 마우스 → 이름 툴팁 · 병영 시너지 필터 · 영지 ESC 메뉴 → 게임 종료는 완전히 끝냄', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => window.game?.scene.isActive('Title'));
  await game(page, () => { window.__rtd.meta.reset(); window.game.scene.getScene('Title').scene.start('Deck'); });
  await page.waitForFunction(() => window.game.scene.isActive('Deck'));
  await page.waitForTimeout(400);
  // 병영 시너지 필터: 전사를 누르면 전사 계열만, 다시 누르면 해제
  const all = await game(page, () => window.game.scene.getScene('Deck').visible.length);
  await uiClick(page, 16 + 13, 136); // 시너지 필터 첫 상징 (UI 좌표)
  const r = await game(page, () => { const d = window.game.scene.getScene('Deck'); return { n: d.visible.length, ok: d.visible.every((c) => c.cls === 'warrior' || c.origin === 'warrior'), f: d.filter.trait }; });
  expect(r.f).toBe('warrior');
  expect(r.ok).toBe(true);
  expect(r.n).toBeLessThan(all);
  // 마우스를 올리면 이름 툴팁
  await page.mouse.move((16 + 13 + 42) * UI, 136 * UI);
  const tip = await game(page, () => { const st = window.game.scene.getScene('Deck').__traitTips; return st?.tip ? st.tip.list.find((o) => o.type === 'Text').text : null; });
  expect(tip).toBe('사수 · 계열');
  await page.mouse.move(400 * UI, 700 * UI);
  expect(await game(page, () => !!window.game.scene.getScene('Deck').__traitTips?.tip)).toBe(false);
  await uiClick(page, 16 + 13, 136);
  expect(await game(page, () => window.game.scene.getScene('Deck').filter.trait)).toBe(null);
  // 영지 ESC 메뉴
  await game(page, () => { window.game.scene.getScene('Deck').scene.start('Lobby'); });
  await page.waitForFunction(() => window.game.scene.isActive('Lobby'));
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  expect(await game(page, () => !!window.game.scene.getScene('Lobby').menu)).toBe(true);
  await page.screenshot({ path: SHOT('51-lobby-menu') });
  await page.keyboard.press('Escape');
  expect(await game(page, () => !!window.game.scene.getScene('Lobby').menu)).toBe(false);
  await page.keyboard.press('Escape');
  // 게임 종료: 두 번 눌러야 — 끝나면 게임이 멈추고 안내 화면
  const q = await game(page, () => { const b = window.game.scene.getScene('Lobby').menu.quitBtn; return { x: b.x, y: b.y }; });
  await page.mouse.click(q.x * UI, q.y * UI);
  expect(await page.locator('#rtd-quit').count()).toBe(0);
  await page.mouse.click(q.x * UI, q.y * UI);
  await page.waitForSelector('#rtd-quit', { timeout: 3000 });
  expect(errors).toEqual([]);
});

test('리롤 값 (2026-11-22): 리롤할 때마다 +10G · 웨이브 끝 상점 새로 고침 때 처음 값 · 10웨이브마다 기본 +10G', async ({ page }) => {
  const errors = await startGame(page);
  const r = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    g.gold = 9999;
    g.freeRerolls = 0;
    const p0 = g.rerollPrice;
    g.reroll();
    const p1 = g.rerollPrice;
    g.reroll();
    const p2 = g.rerollPrice;
    const label = g.hud.rerollBtn.label.text;
    g.refillShopNow(); // 웨이브 끝 새로 고침
    const p3 = g.rerollPrice;
    g.wave = 10;
    const p4 = g.rerollPrice;
    return { p0, p1, p2, p3, p4, label };
  });
  expect([r.p0, r.p1, r.p2, r.p3, r.p4]).toEqual([20, 30, 40, 20, 30]);
  expect(r.label).toContain('40');
  expect(errors).toEqual([]);
});
