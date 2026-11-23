# 저장 (2026-11-23, PC 전환 2단계)

게임의 모든 저장은 `src/systems/storage.js` 한 곳을 거친다. **다른 코드에서 `localStorage` 를 직접 쓰지 않는다.**

## 저장하는 것 (`SAVE_KEYS`)

| 키 | 내용 | 쓰는 곳 |
|---|---|---|
| `rtd_meta_v3` | 진행 상황 JSON — 명성·강화 노드·최고 기록·덱·보유 캐릭터·마정석·유물·술집·튜토리얼 | `src/systems/meta.js` |
| `rtd_meta_v3.bak` | 직전 진행 상황 (본 저장이 깨지면 이것으로 되살림) | `storage.setJSON` 이 자동으로 |
| `rtd-muted` · `rtd-music-vol` · `rtd-sfx-vol` | 소리 설정 | `src/systems/audio.js` |

테스트용 `rtd_tutorial_test` 는 자동화 브라우저 전용이라 저장 대상이 아니다.

## 저장소 세 가지

| 종류 | 언제 | 어디에 |
|---|---|---|
| `web` | 웹 버전 (GitHub Pages) | 브라우저 `localStorage` |
| `native` | 데스크톱 판 (Electron · Steam) — `window.rtdNative.storage` 가 있을 때 | 저장 폴더의 파일 (키 하나 = 파일 하나) |
| `memory` | 둘 다 못 쓸 때 (사생활 보호 모드 등) | 이번 실행 동안만 |

- 읽기는 동기(`storage.get`) — `main.js` 가 시작할 때 `await storage.init()` 으로 파일을 모두 읽어 메모리에 둔다.
- 쓰기는 메모리에 바로 반영하고, 파일은 키마다 0.25초 묶어서 쓴다. 창을 닫거나(`pagehide`·`beforeunload`) 숨길 때 `storage.flush()`.
- 파일 쓰기가 실패하면 다음 flush 에 다시 쓴다.
- 데스크톱 판 첫 실행 때, 파일에 없는 키가 `localStorage` 에 있으면 한 번 옮겨 온다.
- `storage.exportAll()` / `storage.importAll(obj)` — 저장 내보내기·가져오기 (웹 → 데스크톱 옮기기 등, 아직 화면 버튼은 없음).

## 3단계(Electron) — `window.rtdNative.storage` 규약 (구현: `desktop/main.cjs`·`preload.cjs`)

preload 에서 `contextBridge.exposeInMainWorld('rtdNative', { storage: { readAll, write, remove } })`:

| 함수 | 하는 일 |
|---|---|
| `readAll(): Promise<{ [key]: string }>` | 저장 폴더의 `*.json` 을 모두 읽어 `{ 키: 내용 }` 으로 |
| `write(key, value): Promise<void>` | `<키>.json` 에 쓰기 — **임시 파일에 쓴 뒤 이름 바꾸기**(쓰는 중 꺼져도 원래 파일이 남음) |
| `remove(key): Promise<void>` | `<키>.json` 지우기 |

- 저장 폴더: Electron `app.getPath('userData')/save/` (Windows: `%APPDATA%/<앱 이름>/save/`).
- 키 이름은 파일 이름으로 쓰므로 `SAVE_KEYS` 와 `.bak` 만 허용한다(그 밖의 키는 main 프로세스에서 거절).
- preload 는 `ipcRenderer.invoke` 로 main 프로세스에 맡기고, 파일 접근은 main 에서만.

## 4단계(Steam)에서 할 일 — 클라우드 저장

Steamworks 의 **Auto-Cloud** 로 위 저장 폴더를 동기화한다 (게임 코드 변경 없음). Steamworks 앱 설정 → Steam Cloud:

- 바이트·파일 수 한도: 진행 저장은 수 KB 라 1MB · 20개면 충분
- Root Override 경로: Windows `WinAppDataRoaming` + `<앱 이름>/save`, 패턴 `*.json`

(Steamworks 개발자 계정·앱 등록은 사용자가 직접)
