// 데스크톱 판 preload (2026-11-23): 게임(렌더러)에 window.rtdNative 를 열어 준다 — 파일 접근은 메인 프로세스만
// 규약: docs/SAVE.md (src/systems/storage.js 가 window.rtdNative.storage 를 쓴다)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rtdNative', {
  storage: {
    readAll: () => ipcRenderer.invoke('storage:readAll'),
    write: (key, value) => ipcRenderer.invoke('storage:write', key, value),
    remove: (key) => ipcRenderer.invoke('storage:remove', key)
  },
  quit: () => ipcRenderer.invoke('app:quit'),
  toggleFullscreen: () => ipcRenderer.invoke('app:toggleFullscreen'),
  info: () => ipcRenderer.invoke('app:info')
});
