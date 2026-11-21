// 성문 시안 미리보기: 빌드한 게임을 띄워 전투 화면의 field_wall 텍스처에 gates.js 를 덧그리고 찍는다
// 먼저: npm run build && npx vite preview --port 4173
// 실행: node docs/drafts/wall-gates/preview.cjs  →  docs/drafts/wall-gates/before.png · after.png (세로 필드 부분, 화면 2배)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const HERE = __dirname;
const src = fs.readFileSync(path.join(HERE, 'gates.js'), 'utf8').replace('export function', 'function');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 544, height: 960 }, deviceScaleFactor: 2 });
  await page.goto('http://localhost:4173/');
  await page.waitForFunction(() => window.game?.scene.isActive('Title'));
  await page.waitForTimeout(300);
  await page.mouse.click(272, 652);
  await page.waitForFunction(() => window.game.scene.isActive('Lobby'));
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.game.scene.isActive('Game'));
  await page.waitForTimeout(600);
  // 필드 + 몬스터 길 부분 (게임 좌표), 화면 2배(deviceScaleFactor 2 → RES 2)
  const canvasClip = (name) => page.screenshot({ path: path.join(HERE, name), clip: { x: 40, y: 236, width: 464, height: 488 } });
  await canvasClip('before.png');
  await page.addScriptTag({ content: src + '\nwindow.__paintGates = paintGates;' });
  await page.evaluate(() => {
    const tex = window.game.textures.get('field_wall');
    const cv = tex.getSourceImage();
    window.__paintGates(cv.getContext('2d'), cv.width);
    tex.refresh();
  });
  await page.waitForTimeout(300);
  await canvasClip('after.png');
  // 텍스처 자체(아트 px)도 저장
  const raw = await page.evaluate(() => window.game.textures.get('field_wall').getSourceImage().toDataURL('image/png'));
  fs.writeFileSync(path.join(HERE, 'field_wall_gates.png'), Buffer.from(raw.split(',')[1], 'base64'));
  await browser.close();
})();
