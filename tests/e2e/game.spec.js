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
  await page.waitForTimeout(6000);
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
