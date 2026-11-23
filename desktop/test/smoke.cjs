// 데스크톱 판 시험 (2026-11-23): Electron 을 띄워 게임이 뜨는지 · 저장이 파일로 가고 다시 켜면 남는지 · 게임 종료가 앱을 끄는지
// 사용법: cd desktop && npm run build:web && xvfb-run -a -s "-screen 0 1920x1080x24" node test/smoke.cjs   (리눅스 컨테이너는 가상 화면 xvfb 필요)
const { _electron: electron } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rtd-desktop-'));
const exe = require('electron'); // 내려받은 Electron 실행 파일 경로
const launch = () => electron.launch({ executablePath: exe, args: [path.join(__dirname, '..'), '--no-sandbox'], env: { ...process.env, RTD_USER_DATA: dir, RTD_WINDOWED: '1' } });
const ok = (c, m) => { if (!c) throw new Error(`실패: ${m}`); console.log(`ok · ${m}`); };

(async () => {
  let app = await launch();
  let page = await app.firstWindow();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.waitForFunction(() => window.game?.scene?.isActive?.('Title'), null, { timeout: 30000 });
  ok(await page.evaluate(() => location.href) === 'app://rtd/index.html', 'app://rtd/ 로 게임이 뜸');
  ok(await page.evaluate(() => window.__rtd.storage.kind) === 'native', '저장소 = native(파일)');
  ok(await page.evaluate(() => typeof require === 'undefined' && typeof process === 'undefined'), '게임 쪽에서 Node 기능을 못 씀 (보안)');
  // 그림 manifest 를 fetch 로 읽었는지 (file:// 이면 막혔다)
  ok(await page.evaluate(() => window.game.textures.exists('deco_tree_1')), '사용자 그림(manifest) 불러옴');
  await page.evaluate(async () => { const m = window.__rtd.meta; m.reset(); m.addFame(42); m.addStones(3); await window.__rtd.storage.flush(); });
  const file = path.join(dir, 'save', 'rtd_meta_v3.json');
  ok(fs.existsSync(file) && JSON.parse(fs.readFileSync(file, 'utf8')).fame === 42, `저장 파일 생김: ${path.relative(dir, file)}`);
  ok(!fs.readdirSync(path.join(dir, 'save')).some((n) => n.endsWith('.tmp')), '임시 파일 안 남음');
  // 전투까지 들어가 한 장 찍기
  await page.evaluate(() => { window.game.scene.stop('Title'); window.game.scene.start('Game'); });
  await page.waitForFunction(() => window.game.scene.getScene('Game')?.hud, null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(__dirname, 'smoke-battle.png') });
  ok(errs.length === 0, `페이지 오류 없음 ${errs.join(' / ')}`);
  await app.close();

  // 다시 켜기 → 파일에서 그대로
  app = await launch();
  page = await app.firstWindow();
  await page.waitForFunction(() => window.game?.scene?.isActive?.('Title'), null, { timeout: 30000 });
  const r = await page.evaluate(() => ({ fame: window.__rtd.meta.fame, stones: window.__rtd.meta.stones }));
  ok(r.fame === 42 && r.stones === 3, `다시 켜도 명성 42 · 마정석 3 그대로`);
  // 영지 ESC 메뉴 → 게임 종료(두 번) → 앱이 꺼진다
  const closed = new Promise((res) => app.process().once('exit', () => res(true)));
  await page.evaluate(() => { const g = window.game; g.scene.getScenes(true).forEach((s) => s.scene.stop()); g.scene.start('Lobby'); });
  await page.waitForFunction(() => window.game.scene.isActive('Lobby'));
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  // 두 번 눌러야 종료 (버튼은 눌림 → 뗌)
  await page.evaluate(() => { const b = window.game.scene.getScene('Lobby').menu.quitBtn; b.emit('pointerdown'); b.emit('pointerup'); });
  await page.evaluate(() => { const b = window.game.scene.getScene('Lobby').menu?.quitBtn; b?.emit('pointerdown'); b?.emit('pointerup'); }).catch(() => {});
  ok(await Promise.race([closed, new Promise((res) => setTimeout(() => res(false), 8000))]), '영지 ESC 메뉴 → 게임 종료 → 앱이 꺼짐');
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('데스크톱 판 시험 통과');
})().catch((e) => { console.error(e); process.exit(1); });
