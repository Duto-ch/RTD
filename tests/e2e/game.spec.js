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

// 세로 상점 칸 가운데 (룰 v2 하단 시트: x 12~532, y 786~882, 6칸)
const SHOP_X = (i) => 12 + ((520 - 30) / 6) * (i + 0.5) + 6 * i;
const SHOP_Y = 820;

test('상점에서 사기 → 웨이브 진행 → 처치', async ({ page }) => {
  const errors = await startGame(page);
  for (let i = 0; i < 3; i++) await page.mouse.click(SHOP_X(i), SHOP_Y); // 상점 칸 (영지 Lv1 = 3명)
  const r0 = await game(page, () => { const g = window.game.scene.getScene('Game'); return { n: g.mercs.length, sold: g.shop.filter((x) => x?.sold).length, gold: g.gold }; });
  expect(r0.n).toBe(3);
  expect(r0.sold).toBe(3);
  expect(r0.gold).toBe(120 - 30); // 커먼 10G × 3 (영지 Lv1 은 커먼만)
  await page.mouse.click(SHOP_X(3), SHOP_Y); // 4번째: 인원이 가득 (영지 레벨을 올려야)
  expect(await game(page, () => window.game.scene.getScene('Game').mercs.length)).toBe(3);
  await page.mouse.click(544 - 68, 56); // 바로 시작
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
  await page.mouse.move(272, 480, { steps: 8 });
  await page.mouse.up();
  const after = await game(page, () => { const m = window.game.scene.getScene('Game').mercs.find((x) => x.char.id === 'helga'); return { col: m.col, row: m.row, star: m.star }; });
  expect(after).toEqual({ col: 2, row: 2, star: 2 });
  await page.screenshot({ path: SHOT('03-star') });
  expect(errors).toEqual([]);
});

test('바로 시작: 필드의 몬스터를 전부 처치했을 때만 (버튼·Space 키)', async ({ page }) => {
  const errors = await startGame(page);
  const wave = () => game(page, () => window.game.scene.getScene('Game').wave);
  await page.mouse.click(544 - 68, 56); // 시작 전 필드는 비어 있음 → 동작
  await page.mouse.click(544 - 68, 56); // 몬스터가 나오는 중 → 무시
  expect(await wave()).toBe(1);
  await page.waitForTimeout(700);
  await page.keyboard.press('Space'); // 몬스터가 남아 있음 → 무시
  expect(await wave()).toBe(1);
  expect(await game(page, () => window.game.scene.getScene('Game').hud.nextWaveBtn.enabled)).toBe(false);
  // 전부 처치하면 다시 활성화
  await game(page, () => { const g = window.game.scene.getScene('Game'); g.spawnQueue = []; for (const m of [...g.monsters]) g.killMonster(m); g.cleanupMonsters(); g.refreshHud(); });
  expect(await game(page, () => window.game.scene.getScene('Game').hud.nextWaveBtn.enabled)).toBe(true);
  await page.keyboard.press('Space');
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
    await page.mouse.click(272, 248 + 376);
    const ok = await page.waitForFunction(() => { const g = window.game.scene.getScene('Game'); return !g.over && g.wave === 0; }, null, { timeout: 4000 }).catch(() => null);
    if (ok) break;
  }
  await page.waitForFunction(() => { const g = window.game.scene.getScene('Game'); return !g.over && g.wave === 0; });
  expect(await game(page, () => window.game.scene.getScene('Game').hud.waveTypeText.text)).toContain('최고 W10');
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
    await page.mouse.move(slot.x, slot.y);
    await page.mouse.down();
    await page.mouse.move(r.at.x, r.at.y, { steps: 10 });
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
  await page.mouse.move(p0.x, p0.y); // 첫 유물 (전쟁의 북) — 룰 v2: 유물 칸은 시너지 칩 오른쪽
  await expect.poll(tip).toEqual(['전쟁의 북', 'Lv1', '모든 용병 공격 속도 +8%', '영지 유물 공방에서 바꿔 끼울 수 있어요']);
  await page.waitForTimeout(100);
  await page.screenshot({ path: SHOT('10-relic-tooltip') });
  await page.mouse.move(272, 500); // 아이콘 밖
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
  // 56x40 프레임 × UNIT_PX 3 × scale 2/3 = 화면 112x80 (아트 1px = 화면 2px), 대기 8프레임 · 프레임마다 길이(합 1.2초)
  expect(s).toEqual({ key: 'char_sigrid', w: 112, h: 80, anim: 'char_sigrid:idle', idleFrames: 8, idleMs: 1240 });
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
  await page.mouse.click(272, 960 - 92); // 명성 강화 (타이틀 아래 금색 버튼)
  await page.waitForFunction(() => window.game.scene.isActive('Upgrade'));
  await page.waitForTimeout(200);
  const at = (id) => game(page, (id) => window.game.scene.getScene('Upgrade').nodeScreenPos(id), id);
  const buy = { x: 544 - 112, y: 688 + 140 };
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
  await page.mouse.move(272, 300); await page.mouse.down(); await page.mouse.move(330, 360, { steps: 5 }); await page.mouse.up();
  expect(await game(page, () => window.game.scene.getScene('Upgrade').tree.x)).toBeGreaterThan(272);
  await page.screenshot({ path: SHOT('14-upgrade-tree') });
  await page.mouse.click(272 - 92, 916); // 게임 시작
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
  const t = await game(page, () => { const b = window.game.scene.getScene('Game').hud.upgradeBtn; return { x: b.x, y: b.y }; });
  await page.mouse.click(t.x, t.y);
  await page.waitForFunction(() => window.game.scene.isActive('Upgrade'));
  expect(await game(page, () => window.game.scene.isPaused('Game'))).toBe(true);
  const at = (id) => game(page, (id) => window.game.scene.getScene('Upgrade').nodeScreenPos(id), id);
  for (const id of ['origin', 'atk']) {
    const p = await at(id);
    await page.mouse.click(p.x, p.y);
    await page.mouse.click(544 - 112, 688 + 140); // 강화
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
  const t = await game(page, () => { const b = window.game.scene.getScene('Game').hud.upgradeBtn; return { x: b.x, y: b.y }; });
  await page.mouse.click(t.x, t.y);
  await page.waitForFunction(() => window.game.scene.isActive('Upgrade'));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.game.scene.isActive('Upgrade'));
  // 2) 게임 오버 → 결과 창 "명성 강화"
  await game(page, () => window.game.scene.getScene('Game').endGame(false, '테스트'));
  await page.waitForTimeout(400);
  await page.mouse.click(272 - 108, 248 + 444);
  await page.waitForFunction(() => window.game.scene.isActive('Upgrade'));
  expect(await game(page, () => window.game.scene.getScene('Upgrade').fromGame)).toBe(false); // 일반 화면 (게임 시작·타이틀로 버튼)
  // 3) 포인트 사용 후 타이틀로
  const p = await game(page, () => window.game.scene.getScene('Upgrade').nodeScreenPos('origin'));
  await page.mouse.click(p.x, p.y);
  await page.mouse.click(544 - 112, 688 + 140);
  expect(await game(page, () => window.__rtd.meta.level('origin'))).toBe(1);
  await page.mouse.click(272 + 140, 916); // 영지로
  await page.waitForFunction(() => window.game.scene.isActive('Lobby'));
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

test('배너·토스트는 필드와 몬스터 길(칸 48px: y 272~688)을 가리지 않는다', async ({ page }) => {
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
    return { banner: r(h.bannerObj), toast: r(h.toastObj) };
  });
  expect(b.banner.bottom).toBeLessThanOrEqual(272);
  expect(b.banner.top).toBeGreaterThanOrEqual(180);
  expect(b.toast.top).toBeGreaterThanOrEqual(688);
  expect(b.toast.bottom).toBeLessThanOrEqual(776);
  for (const k of ['banner', 'toast']) {
    expect(b[k].left).toBeGreaterThanOrEqual(0);
    expect(b[k].right).toBeLessThanOrEqual(544);
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
    await page.mouse.click(b.x, b.y);
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
  for (let i = 0; i < 3; i++) await page.mouse.click(sb.x, sb.y);
  await page.waitForTimeout(100);
  const f0 = await game(page, () => { const m = window.game.scene.getScene('Game').mercs[0]; return { paused: window.game.anims.paused, prog: m.sprite.anims.getProgress(), time: window.game.scene.getScene('Game').time.paused }; });
  await page.waitForTimeout(500);
  const f1 = await game(page, () => window.game.scene.getScene('Game').mercs[0].sprite.anims.getProgress());
  expect(f0.paused).toBe(true);
  expect(f0.time).toBe(true);
  expect(f1).toBe(f0.prog);
  await page.mouse.click(sb.x, sb.y); // x1 로 풀림
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
  expect(hits).toEqual([4, 2, 4]); // 검 = 내려친 타격, 지팡이 = 구슬 섬광, 활 = 시위를 놓음
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
  await page.mouse.move(pos.x, pos.y);
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
  await page.mouse.move(420, 812);
  await page.mouse.down();
  await page.mouse.move(300, 812, { steps: 5 });
  await page.mouse.move(180, 812, { steps: 5 });
  await page.mouse.up();
  const moved = await game(page, () => ({ s: window.game.scene.getScene('Lobby').deckScroll, lobby: window.game.scene.isActive('Lobby') }));
  expect(moved.s).toBeGreaterThan(100);
  expect(moved.lobby).toBe(true);
  await page.screenshot({ path: SHOT('32c-lobby-deck-scroll') });
  // 누르기: 병영
  await page.mouse.click(272, 812);
  await page.waitForFunction(() => window.game.scene.isActive('Deck'));
  expect(errors).toEqual([]);
});

test('렌더 해상도: 화면 실제 픽셀에 맞춰 정수 배율(폰 3배) · 캔버스는 부드럽게 맞춤 (자글거림 방지)', async ({ browser }) => {
  const p = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  await p.goto('/');
  await p.waitForFunction(() => window.game?.scene.isActive('Title'));
  const r = await p.evaluate(() => ({ w: window.game.canvas.width, ir: getComputedStyle(window.game.canvas).imageRendering }));
  expect(r).toEqual({ w: 544 * 3, ir: 'auto' });
  await p.close();
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
  await page.waitForFunction(() => window.game.scene.isActive('Lobby'));
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
  await page.mouse.click(ok.x, ok.y);
  expect(await tut()).toBe(null);
  expect(await game(page, () => JSON.parse(localStorage.getItem('rtd_meta_v3')).tutorial.seen.shop)).toBe(true);
  // 용병을 처음 선택 → 정보 창 안내. 같은 단계는 다시 뜨지 않는다
  await game(page, () => { const g = window.game.scene.getScene('Game'); g.gold = 999; g.hire(); g.select(g.mercs[0]); });
  expect(await tut()).toBe('select');
  await page.screenshot({ path: SHOT('27-tutorial-select') });
  // 끄기 → 이후 단계는 뜨지 않는다
  const off = await game(page, () => { const b = window.game.scene.getScene('Game').tut.offBtn; return { x: b.x, y: b.y }; });
  await page.mouse.click(off.x, off.y);
  await game(page, () => { const g = window.game.scene.getScene('Game'); g.select(null); g.startWave(1); });
  expect(await tut()).toBe(null);
  // 메뉴의 '다시 보기' → 다시 켜진다
  expect(await game(page, () => { window.__rtd.meta.resetTutorial(); const g = window.game.scene.getScene('Game'); g.select(g.mercs[0]); return g.tut.open; })).toBe('select');
  expect(errors).toEqual([]);
});

test('타이틀: 일러스트 + 깜빡이는 TAP TO START, 아무 곳이나 누르면 영지(로비)', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.game?.scene.isActive('Title'));
  const t = await page.evaluate(() => { const s = window.game.scene.getScene('Title'); return { tap: s.tapText.text, bg: s.textures.exists('title_bg') }; });
  expect(t).toEqual({ tap: 'TAP TO START', bg: true });
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

test('가로 16:9 배치: 1280x720 화면에서 HUD 가 필드·몬스터 길을 가리지 않는다', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => window.game?.scene.isActive('Title'));
  expect(await page.evaluate(() => [window.game.config.width, window.game.config.height])).toEqual([2560, 1440]);
  await page.screenshot({ path: SHOT('29-wide-title') });
  await toGame(page, 640, 420); // 빈 곳 → 영지 → 출전
  const r = await page.evaluate(() => {
    const g = window.game.scene.getScene('Game');
    g.gold = 999; g.hire(); g.select(g.mercs[0]); g.startWave(1);
    const ring = { x0: 392, y0: 112, x1: 888, y1: 608 }; // 필드 + 몬스터 길
    const boxes = [g.hud.estateBtn, g.hud.rerollBtn, g.hud.nextWaveBtn, g.hud.skillBtn, g.hud.sellBtn, g.hud.menuBtn].map((b) => ({ x0: b.x - b.w / 2, x1: b.x + b.w / 2, y0: b.y - b.h / 2, y1: b.y + b.h / 2 }));
    const hit = boxes.filter((b) => b.x0 < ring.x1 && b.x1 > ring.x0 && b.y0 < ring.y1 && b.y1 > ring.y0);
    return { hit: hit.length, banner: g.hud.bannerObj?.y, field: [g.mercs[0].x > ring.x0, g.mercs[0].x < ring.x1], reroll: g.hud.rerollBtn.label.text, dock: [g.hud.estateBtn.y > 608, g.hud.nextWaveBtn.y < 112] };
  });
  expect(r.hit).toBe(0);
  expect(r.banner).toBeLessThan(112); // 배너는 필드 위 빈 띠
  expect(r.field).toEqual([true, true]);
  // B-2 포근한 카드형: 위 알약 바(바로 시작) + 아래 독(상점 6칸·영지·리롤)
  expect(r.reroll).toMatch(/^리롤 \d+G$/);
  expect(r.dock).toEqual([true, true]);
  await page.waitForTimeout(300);
  await page.screenshot({ path: SHOT('30-wide-battle') });
  expect(errors).toEqual([]);
  await page.close();
});
