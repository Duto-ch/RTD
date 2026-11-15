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
  await page.mouse.click(272, 262 + 348); // 다시 하기
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
      window.__rtd.setArt(m.sprite, m.textureKey, 4); m.drawPips();
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
    const t = window.game.scene.getScene('Game').hud.relicTip;
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

test('직접 그린 그림: 시그리드 기본 스탠딩·공격 모션', async ({ page }) => {
  const errors = await startGame(page);
  const s = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    g.hire();
    const m = g.mercs[0];
    m.cls = 'archer'; m.attr = 'blue'; m.level = 1; m.skills = []; m.drawPips();
    // 가운데 열에 둔다 (좌우 양쪽 길이 모두 사거리 안 → 왼쪽·오른쪽 대상이 다 나온다. 정가운데는 성탑)
    g.grid[m.row][m.col] = null; m.col = 2; m.row = 1; g.grid[1][2] = m; m.snapToCell();
    window.__rtd.setArt(m.sprite, m.textureKey, 4);
    m.sprite.play('merc_archer_blue:idle');
    g.select(m);
    return { key: m.sprite.texture.key, w: m.sprite.displayWidth, h: m.sprite.displayHeight, frames: m.sprite.texture.frameTotal - 1, anim: m.sprite.anims.currentAnim?.key };
  });
  // 28x24 프레임 × 0.75 배율(아트 1px = 화면 3px) → 화면 84x72, 18프레임 = 대기 9 + 공격 9
  expect(s).toEqual({ key: 'merc_archer_blue', w: 84, h: 72, frames: 18, anim: 'merc_archer_blue:idle' });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: SHOT('11-custom-sigrid') });

  // 웨이브를 시작하면 공격 모션 재생 → 끝나면 다시 대기 모션
  await page.keyboard.press('n');
  // 공격 모션과 그 재생 속도를 같은 순간에 읽는다 (모션이 끝나면 속도가 1로 돌아가므로)
  const atk = () => game(page, () => { const sp = window.game.scene.getScene('Game').mercs[0].sprite; return sp.anims.currentAnim?.key === 'merc_archer_blue:attack' ? sp.anims.timeScale : 0; });
  await expect.poll(atk, { timeout: 20000, intervals: [50] }).toBeGreaterThan(1); // 1.8초짜리 모션을 공격 간격 안에 맞춰 빠르게 재생
  await page.screenshot({ path: SHOT('12-custom-sigrid-attack') });

  // 왼쪽 대상을 공격하면 좌우 반전, 오른쪽이면 원래대로. 반전해도 몸 중심(pivotX 12)은 제자리
  const face = () => game(page, () => { const sp = window.game.scene.getScene('Game').mercs[0].sprite; return { flip: sp.flipX, ox: Math.round(sp.originX * 28) }; });
  await expect.poll(face, { timeout: 30000, intervals: [50] }).toEqual({ flip: true, ox: 16 });
  await page.screenshot({ path: SHOT('13-custom-sigrid-left') });
  await expect.poll(face, { timeout: 30000, intervals: [50] }).toEqual({ flip: false, ox: 12 });
  expect(errors).toEqual([]);
});

test('명성 강화 트리: 노드를 눌러 선택 → 강화 → 게임에 반영, 잠긴 노드는 못 삼', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => window.game?.scene.isActive('Title'));
  await game(page, () => { const m = window.__rtd.meta; m.reset(); m.addFame(50); });
  await page.mouse.click(272, 724); // 명성 강화
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

test('강화 효과: 징집령(무료 용병)·군량 보급·몬스터 한도', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => window.game?.scene.isActive('Title'));
  await game(page, () => { const m = window.__rtd.meta; m.reset(); Object.assign(m.data.levels, { origin: 1, wall: 2, conscript: 2, veteran: 1, funds: 1, bounty: 1, stipend: 2 }); m.save(); });
  await page.mouse.click(272, 652);
  await page.waitForFunction(() => window.game.scene.isActive('Game'));
  const s = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    const gold0 = g.gold;
    g.startWave(1);
    return { mercs: g.mercs.length, lv: g.mercs.map((m) => m.level), gold0, waveGold: g.gold - gold0, maxAlive: g.maxAlive };
  });
  expect(s).toEqual({ mercs: 2, lv: [2, 2], gold0: 140, waveGold: 10, maxAlive: 106 });
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

test('노멀 100웨이브 클리어 → 하드 1웨이브 (용병·유물 초기화, 300골드)', async ({ page }) => {
  const errors = await startGame(page);
  const s = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    g.gold = 999; g.hire(); g.hire(); g.addRelic('war_drum'); g.refreshRelics();
    g.wave = 100; g.spawnQueue = [];
    for (const m of [...g.monsters]) m.destroy();
    g.monsters = [];
    g.update(0, 16);
    return { diff: g.difficulty, gold: g.gold, mercs: g.mercs.length, relics: g.ownedRelics.length, wave: g.wave, over: g.over, tab: g.hud.waveText.text };
  });
  expect(s).toEqual({ diff: 1, gold: 300, mercs: 0, relics: 0, wave: 0, over: false, tab: 'HARD 0 / 100' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: SHOT('16-hard-start') });
  // 하드 1웨이브 몬스터 체력은 노멀의 hpMult 배
  const hp = await game(page, () => { const g = window.game.scene.getScene('Game'); g.startWave(1); g.spawnMonster(g.spawnQueue.shift()); return g.monsters.at(-1).maxHp; });
  expect(hp).toBe(34 * 4);
  expect(errors).toEqual([]);
});

test('필드 가운데 성탑: 용병은 못 놓고, 누르면 전투가 멈추고 강화 트리 → 강화하면 바로 반영', async ({ page }) => {
  const errors = await startGame(page);
  // 성탑 칸에는 고용·이동 불가 → 용병 칸은 24개
  const slots = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    g.gold = 99999;
    for (let i = 0; i < 30; i++) g.hire();
    return { mercs: g.mercs.length, center: g.grid[2][2], slots: g.fieldSlots };
  });
  expect(slots).toEqual({ mercs: 24, center: null, slots: 24 });
  await page.screenshot({ path: SHOT('17-tower-field') });
  // 명성이 있으면 "!" 표시
  await game(page, () => { const m = window.__rtd.meta; m.reset(); m.addFame(30); window.game.scene.getScene('Game').refreshHud(); });
  expect(await game(page, () => window.game.scene.getScene('Game').towerBadge.visible)).toBe(true);
  // 성탑 클릭 → 강화 트리 (전투 일시정지)
  const t = await game(page, () => { const tw = window.game.scene.getScene('Game').tower; return { x: tw.x, y: tw.y - 30 }; });
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

test('버그 회귀: 성탑 강화 후 게임 오버 → 명성 강화 → 타이틀로 정상 이동', async ({ page }) => {
  const errors = await startGame(page);
  await game(page, () => { const m = window.__rtd.meta; m.reset(); m.addFame(50); });
  // 1) 전투 중 성탑으로 강화 창을 열었다 닫는다
  const t = await game(page, () => { const tw = window.game.scene.getScene('Game').tower; return { x: tw.x, y: tw.y - 30 }; });
  await page.mouse.click(t.x, t.y);
  await page.waitForFunction(() => window.game.scene.isActive('Upgrade'));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.game.scene.isActive('Upgrade'));
  // 2) 게임 오버 → 결과 창 "명성 강화"
  await game(page, () => window.game.scene.getScene('Game').endGame(false, '테스트'));
  await page.waitForTimeout(400);
  await page.mouse.click(272 - 108, 262 + 416);
  await page.waitForFunction(() => window.game.scene.isActive('Upgrade'));
  expect(await game(page, () => window.game.scene.getScene('Upgrade').fromGame)).toBe(false); // 일반 화면 (게임 시작·타이틀로 버튼)
  // 3) 포인트 사용 후 타이틀로
  const p = await game(page, () => window.game.scene.getScene('Upgrade').nodeScreenPos('origin'));
  await page.mouse.click(p.x, p.y);
  await page.mouse.click(544 - 112, 688 + 140);
  expect(await game(page, () => window.__rtd.meta.level('origin'))).toBe(1);
  await page.mouse.click(272 + 140, 916); // 타이틀로
  await page.waitForFunction(() => window.game.scene.isActive('Title'));
  expect(await game(page, () => window.game.scene.getScenes(true).map((s) => s.scene.key))).toEqual(['Title']);
  expect(errors).toEqual([]);
});

test('PixelLab 이펙트: 시트 8종 로드, 명중·속성 폭발·영웅 기둥 재생', async ({ page }) => {
  const errors = await startGame(page);
  const r = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    const keys = ['hit_star', 'hit_magic', 'hit_snipe', 'slash', 'skill_red', 'skill_blue', 'skill_green', 'ultimate'];
    const missing = keys.filter((k) => !g.anims.exists(`fx_${k}_play`));
    g.tweens.pauseAll();
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
  await page.waitForFunction(() => window.game.scene.getScene('Game').vfx.sheetCount === 0, null, { timeout: 5000 });
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

test('배너·토스트는 필드와 몬스터 길(y 232~728)을 가리지 않는다', async ({ page }) => {
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
  expect(b.banner.bottom).toBeLessThanOrEqual(232);
  expect(b.banner.top).toBeGreaterThanOrEqual(180);
  expect(b.toast.top).toBeGreaterThanOrEqual(728);
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

test('PixelLab 시범 캐릭터: 브리짓(레드 마법사) 3픽셀 사양 대기·공격 모션', async ({ page }) => {
  const errors = await startGame(page);
  const s = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    g.hire();
    const m = g.mercs[0];
    m.cls = 'mage'; m.attr = 'red'; m.level = 1; m.skills = []; m.drawPips();
    window.__rtd.setArt(m.sprite, m.textureKey, 4);
    m.sprite.play('merc_mage_red:idle');
    return { key: m.sprite.texture.key, w: m.sprite.displayWidth, h: m.sprite.displayHeight, frames: m.sprite.texture.frameTotal - 1, anims: ['idle', 'attack'].every((a) => g.anims.exists(`merc_mage_red:${a}`)) };
  });
  expect(s).toEqual({ key: 'merc_mage_red', w: 84, h: 72, frames: 18, anims: true });
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
  expect(r.every((s) => s.playing && s.scale === 3)).toBe(true);
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
        const m = g.monsters.find((x) => x.active);
        if (!m) return setTimeout(tick, 50);
        g.damageMonster(m, 1e9);
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

test('단축키 S: 선택한 용병 판매', async ({ page }) => {
  const errors = await startGame(page);
  await game(page, () => { const g = window.game.scene.getScene('Game'); g.gold = 999; g.hire(); g.select(g.mercs[0]); });
  const g0 = await game(page, () => window.game.scene.getScene('Game').gold);
  await page.keyboard.press('s');
  const r = await game(page, () => { const g = window.game.scene.getScene('Game'); return { n: g.mercs.length, gold: g.gold, sel: !!g.selected }; });
  expect(r).toEqual({ n: 0, gold: g0 + 15, sel: false }); // 고용비 30G × 50%
  await page.keyboard.press('s'); // 선택이 없으면 아무 일도 없다
  expect(errors).toEqual([]);
});

test('스킬 리롤: 스킬 정보 창에서 스킬마다 200/500/1500/3000G 로 같은 레벨의 다른 스킬로 바꾼다', async ({ page }) => {
  const errors = await startGame(page);
  const r = await game(page, () => {
    const g = window.game.scene.getScene('Game');
    g.gold = 99999;
    g.hire();
    const m = g.mercs[0];
    while (m.level < 5) m.levelUp(window.__rtd.skillOptions(m.attr, m.cls, m.level + 1)[0]);
    g.select(m);
    g.hud.showSkillPopup(m);
    return { btns: g.hud.rerollBtns.map((b) => b.label.text), before: m.skills.map((s) => s.def.id) };
  });
  expect(r.btns).toEqual(['리롤 200G', '리롤 500G', '리롤 1500G', '리롤 3000G']);
  await page.screenshot({ path: SHOT('25-skill-reroll') });
  // Lv4 스킬(3번째) 리롤 버튼을 실제로 누른다
  const pos = await game(page, () => { const b = window.game.scene.getScene('Game').hud.rerollBtns[2]; return { x: b.x, y: b.y }; });
  const g0 = await game(page, () => window.game.scene.getScene('Game').gold);
  await page.mouse.click(pos.x, pos.y);
  const after = await game(page, () => { const g = window.game.scene.getScene('Game'); return { gold: g.gold, ids: g.mercs[0].skills.map((s) => s.def.id), open: !!g.hud.popup }; });
  expect(after.gold).toBe(g0 - 1500);
  expect(after.ids[2]).not.toBe(r.before[2]);
  expect(after.ids[2].split('_')[2]).toBe('4'); // 같은 레벨 후보
  expect(after.ids.filter((_, i) => i !== 2)).toEqual(r.before.filter((_, i) => i !== 2));
  expect(after.open).toBe(true); // 창이 다시 그려져 열려 있다
  // 골드가 모자라면 버튼이 꺼진다
  const dis = await game(page, () => { const g = window.game.scene.getScene('Game'); g.gold = 300; g.hud.showSkillPopup(g.mercs[0]); return g.hud.rerollBtns.map((b) => b.enabled); });
  expect(dis).toEqual([true, false, false, false]);
  expect(errors).toEqual([]);
});
