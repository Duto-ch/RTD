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
  await page.mouse.click(272, 652); // 게임 시작
  await page.waitForFunction(() => window.game.scene.isActive('Game'));
  return errors;
}

test('고용 → 웨이브 진행 → 처치', async ({ page }) => {
  const errors = await startGame(page);
  for (let i = 0; i < 4; i++) await page.mouse.click(100, 824); // 용병 고용 버튼
  expect(await game(page, () => window.game.scene.getScene('Game').mercs.length)).toBe(4);
  await page.mouse.click(544 - 68, 56); // 바로 시작
  expect(await game(page, () => window.game.scene.getScene('Game').wave)).toBe(1);
  // 첫 처치가 나올 때까지 기다린다 (고정 대기는 느린 환경에서 가끔 실패)
  await page.waitForFunction(() => window.game.scene.getScene('Game').totalKills > 0, null, { timeout: 20000 });
  const s = await game(page, () => { const g = window.game.scene.getScene('Game'); return { kills: g.totalKills, alive: g.monsters.length }; });
  expect(s.kills).toBeGreaterThan(0);
  await page.screenshot({ path: SHOT('02-battle') });
  expect(errors).toEqual([]);
});

test('같은 속성·레벨 용병을 끌어다 놓으면 레벨 업', async ({ page }) => {
  const errors = await startGame(page);
  const pos = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    g.gold = 500; g.hire(); g.hire();
    const [a, b] = g.mercs;
    // 5% 행운 Lv2 고용이 섞이지 않도록 둘 다 Lv1 로 맞춘다
    for (const m of [a, b]) { m.level = 1; m.skills = []; m.drawPips(); }
    b.attr = a.attr; b.cls = a.cls; b.sprite.setTexture(b.textureKey);
    return { ax: a.x, ay: a.y, bx: b.x, by: b.y };
  });
  await page.mouse.move(pos.ax, pos.ay);
  await page.mouse.down();
  await page.mouse.move(pos.bx, pos.by, { steps: 8 });
  await page.mouse.up();
  const r = await game(page, () => { const g = window.game.scene.getScene('Game'); return { n: g.mercs.length, lv: g.mercs[0].level, skills: g.mercs[0].skills.length }; });
  expect(r).toEqual({ n: 1, lv: 2, skills: 1 });
  expect(errors).toEqual([]);
});

test('바로 시작 버튼: 연타는 한 번만, N 키도 동작', async ({ page }) => {
  const errors = await startGame(page);
  await page.mouse.click(544 - 68, 56);
  await page.mouse.click(544 - 68, 56);
  expect(await game(page, () => window.game.scene.getScene('Game').wave)).toBe(1);
  await page.waitForTimeout(700);
  await page.keyboard.press('n');
  expect(await game(page, () => window.game.scene.getScene('Game').wave)).toBe(2);
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

test('보스 처치 → 유물, 강화 보스 → 유물 3택1', async ({ page }) => {
  const errors = await startGame(page);
  await game(page, () => { const g = window.game.scene.getScene('Game'); g.startWave(10); });
  await page.waitForFunction(() => window.game.scene.getScene('Game').monsters.some((m) => m.isBoss));
  await game(page, () => { const g = window.game.scene.getScene('Game'); g.damageMonster(g.monsters.find((m) => m.isBoss), 1e15, {}); });
  expect(await game(page, () => window.game.scene.getScene('Game').ownedRelics.length)).toBe(1);

  await game(page, () => window.game.scene.getScene('Game').startWave(30));
  await page.waitForFunction(() => window.game.scene.getScene('Game').monsters.some((m) => m.milestone));
  await game(page, () => { const g = window.game.scene.getScene('Game'); g.damageMonster(g.monsters.find((m) => m.milestone), 1e15, {}); });
  expect(await game(page, () => !!window.game.scene.getScene('Game').relicChoice)).toBe(true);
  await page.screenshot({ path: SHOT('04-relic-choice') });
  await page.mouse.click(272, 250 + 140); // 첫 번째 유물 선택
  const r = await game(page, () => { const g = window.game.scene.getScene('Game'); return { open: !!g.relicChoice, owned: g.ownedRelics.length }; });
  expect(r).toEqual({ open: false, owned: 2 });
  expect(errors).toEqual([]);
});

test('최종 보스는 한 번 부활한다', async ({ page }) => {
  const errors = await startGame(page);
  await game(page, () => window.game.scene.getScene('Game').startWave(100));
  await page.waitForFunction(() => window.game.scene.getScene('Game').monsters.some((m) => m.isFinal));
  const r = await game(page, () => {
    const g = window.game.scene.getScene('Game'); const b = g.monsters.find((m) => m.isFinal); const before = b.abilities.length;
    g.damageMonster(b, 1e15, {}); const revived = b.alive && b.revived && b.abilities.length === before + 1;
    g.damageMonster(b, 1e15, {}); return { revived, deadAfter2: !b.alive };
  });
  expect(r).toEqual({ revived: true, deadAfter2: true });
  expect(errors).toEqual([]);
});

test('승리·패배 화면', async ({ page }) => {
  const errors = await startGame(page);
  await game(page, () => { const g = window.game.scene.getScene('Game'); g.wave = 100; g.endGame(true); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: SHOT('05-win') });
  await page.mouse.click(272, 262 + 320); // 다시 하기
  await page.waitForTimeout(500);
  await game(page, () => { const g = window.game.scene.getScene('Game'); g.wave = 10; g.spawnMonster('boss'); g.monsters.at(-1).dist = 1755; });
  await page.waitForFunction(() => window.game.scene.getScene('Game').over);
  await page.screenshot({ path: SHOT('06-lose') });
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

test('용병 15명 개별 그림, 레벨은 별로 표시', async ({ page }) => {
  const errors = await startGame(page);
  const info = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    g.gold = 99999;
    for (let i = 0; i < 15; i++) g.hire();
    const classes = ['archer', 'mage', 'sniper', 'shaman', 'rogue'];
    const attrs = ['red', 'blue', 'green'];
    // 15칸을 15명 서로 다른 용병으로, 레벨은 1~5 순서로
    g.mercs.forEach((m, i) => {
      m.cls = classes[i % 5]; m.attr = attrs[Math.floor(i / 5)];
      m.level = (i % 5) + 1; m.skills = [];
      m.sprite.setTexture(m.textureKey); m.drawPips();
    });
    return { keys: new Set(g.mercs.map((m) => m.sprite.texture.key)).size, n: g.mercs.length };
  });
  expect(info).toEqual({ keys: 15, n: 15 });
  await page.waitForTimeout(3000); // 시작 배너가 사라진 뒤 촬영
  await page.screenshot({ path: SHOT('09-mercs-stars') });
  expect(errors).toEqual([]);
});

test('유물 아이콘에 마우스를 올리면 능력 툴팁', async ({ page }) => {
  const errors = await startGame(page);
  await game(page, () => {
    const g = window.game.scene.getScene('Game');
    g.addRelic('war_drum'); g.addRelic('hawk_eye'); g.addRelic('frost_crown'); g.addRelic('contract'); g.addRelic('lucky_coin');
    g.refreshRelics();
  });
  const tip = () => game(page, () => {
    const t = window.game.scene.getScene('Game').relicTip;
    return t ? t.container.list.filter((o) => o.text).map((o) => o.text) : null;
  });
  expect(await tip()).toBeNull();
  await page.mouse.move(108, 160); // 첫 유물 (전쟁의 북)
  await expect.poll(tip).toEqual(['전쟁의 북', '활성', '모든 용병 공격 속도 +15%', '클릭: 비활성으로 전환']);
  await page.waitForTimeout(100);
  await page.screenshot({ path: SHOT('10-relic-tooltip') });
  await page.mouse.move(108 + 4 * 36, 160); // 다섯 번째 (슬롯이 가득 차 비활성)
  await expect.poll(async () => (await tip())?.[1]).toBe('비활성');
  await page.mouse.move(272, 500); // 아이콘 밖
  await expect.poll(tip).toBeNull();
  expect(errors).toEqual([]);
});
