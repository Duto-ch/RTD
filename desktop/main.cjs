// 용병단 디펜스 — 데스크톱(Electron) 판 메인 프로세스 (2026-11-23 PC 전환 3단계)
// · 게임(웹 빌드 desktop/app)을 app://rtd/ 로 띄운다 — file:// 은 fetch(그림 manifest 등)가 막혀서 전용 주소를 쓴다
// · 저장: 렌더러의 window.rtdNative.storage(preload) → 여기서 저장 폴더(userData/save/<키>.json)에 쓴다.
//         임시 파일에 쓰고 이름을 바꿔(중간에 꺼져도 원래 파일이 남음) — 규약 docs/SAVE.md. Steam 은 이 폴더를 Auto-Cloud 로
// · 창: 처음엔 전체 화면, F11 · Alt+Enter 로 창 모드와 바꾸기 (마지막 상태를 userData/window.json 에 기억)
const { app, BrowserWindow, protocol, net, ipcMain, Menu, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
]);

const APP_DIR = path.join(__dirname, 'app');
// 테스트: 저장 폴더를 임시 폴더로 (RTD_USER_DATA)
if (process.env.RTD_USER_DATA) app.setPath('userData', process.env.RTD_USER_DATA);
const saveDir = () => path.join(app.getPath('userData'), 'save');
const winFile = () => path.join(app.getPath('userData'), 'window.json');

// 저장 키: src/systems/storage.js 의 SAVE_KEYS 와 그 백업(.bak)만 — 키 이름이 곧 파일 이름이라 그 밖의 것은 거절
const SAVE_KEYS = new Set(['rtd_meta_v3', 'rtd-muted', 'rtd-music-vol', 'rtd-sfx-vol']);
const okKey = (k) => typeof k === 'string' && (SAVE_KEYS.has(k) || (k.endsWith('.bak') && SAVE_KEYS.has(k.slice(0, -4))));
const keyFile = (k) => path.join(saveDir(), `${k}.json`);

ipcMain.handle('storage:readAll', async () => {
  const out = {};
  let names = [];
  try {
    names = await fs.promises.readdir(saveDir());
  } catch {
    return out; // 첫 실행: 저장 폴더 없음
  }
  for (const n of names) {
    if (!n.endsWith('.json')) continue;
    const k = n.slice(0, -5);
    if (!okKey(k)) continue;
    try {
      out[k] = await fs.promises.readFile(path.join(saveDir(), n), 'utf8');
    } catch {
      /* 읽지 못한 파일은 건너뜀 */
    }
  }
  return out;
});

ipcMain.handle('storage:write', async (_e, k, v) => {
  if (!okKey(k) || typeof v !== 'string') throw new Error(`저장할 수 없는 키: ${k}`);
  await fs.promises.mkdir(saveDir(), { recursive: true });
  const f = keyFile(k);
  const tmp = `${f}.tmp`;
  await fs.promises.writeFile(tmp, v, 'utf8');
  await fs.promises.rename(tmp, f);
});

ipcMain.handle('storage:remove', async (_e, k) => {
  if (!okKey(k)) throw new Error(`지울 수 없는 키: ${k}`);
  await fs.promises.rm(keyFile(k), { force: true });
});

ipcMain.handle('app:quit', () => app.quit());
ipcMain.handle('app:toggleFullscreen', (e) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (w) setFullscreen(w, !w.isFullScreen());
  return w?.isFullScreen() ?? false;
});
ipcMain.handle('app:info', () => ({ version: app.getVersion(), saveDir: saveDir(), platform: process.platform }));

function readWinState() {
  try {
    return JSON.parse(fs.readFileSync(winFile(), 'utf8'));
  } catch {
    return { fullscreen: true };
  }
}

function setFullscreen(w, on) {
  w.setFullScreen(on);
  try {
    fs.writeFileSync(winFile(), JSON.stringify({ fullscreen: on }));
  } catch {
    /* 기억 못 해도 게임은 계속 */
  }
}

function createWindow() {
  const st = readWinState();
  // 창 모드 크기: 1920x1080 이 화면 작업 영역에 들어가면 그대로, 아니면 16:9 로 맞춰 줄임
  const wa = screen.getPrimaryDisplay().workAreaSize;
  const k = Math.min(1, wa.width / 1920, wa.height / 1080);
  const win = new BrowserWindow({
    width: Math.round(1920 * k),
    height: Math.round(1080 * k),
    useContentSize: true,
    fullscreen: st.fullscreen !== false && !process.env.RTD_WINDOWED,
    backgroundColor: '#000000',
    title: '용병단 디펜스',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  win.once('ready-to-show', () => win.show());
  // F11 · Alt+Enter = 전체 화면 ↔ 창
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.key === 'Enter' && input.alt)) {
      event.preventDefault();
      setFullscreen(win, !win.isFullScreen());
    }
  });
  // 게임 밖 주소로 이동·새 창 금지
  win.webContents.on('will-navigate', (e, url) => !url.startsWith('app://rtd/') && e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.loadURL('app://rtd/index.html');
  return win;
}

// 배경음이 첫 클릭 전(타이틀)부터 나오게 — 브라우저 자동 재생 제한을 데스크톱 판에서만 끈다 (2026-11-26, 사운드)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  protocol.handle('app', (req) => {
    const u = new URL(req.url);
    let p = decodeURIComponent(u.pathname);
    if (p === '/' || p === '') p = '/index.html';
    const fp = path.normalize(path.join(APP_DIR, p));
    if (!fp.startsWith(APP_DIR)) return new Response('forbidden', { status: 403 });
    return net.fetch(pathToFileURL(fp).toString());
  });
  createWindow();
});

app.on('window-all-closed', () => app.quit());
