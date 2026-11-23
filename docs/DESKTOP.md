# 데스크톱(Electron) 판 (2026-11-23, PC 전환 3단계)

웹 게임(`src/`) 하나로 웹(GitHub Pages)과 데스크톱(Windows · Steam) 둘 다 만든다. 데스크톱 판은 `desktop/` 폴더에 따로 있어 웹 배포(CI)에는 영향이 없다.

## 폴더

| 파일 | 하는 일 |
|---|---|
| `desktop/main.cjs` | Electron 메인 프로세스 — 창(전체 화면 ↔ 창: F11 · Alt+Enter, 마지막 상태 기억), 게임을 `app://rtd/` 로 띄움(`file://` 은 fetch 가 막힘), 저장 파일 읽기·쓰기 |
| `desktop/preload.cjs` | 게임에 `window.rtdNative` 열어 줌 — `storage`(readAll·write·remove) · `quit` · `toggleFullscreen` · `info` |
| `desktop/app/` | 웹 빌드 결과 (`npm run build:web`, 커밋 안 함) |
| `desktop/test/smoke.cjs` | 데스크톱 판 시험 |
| `.github/workflows/desktop.yml` | GitHub Actions 에서 Windows 판 만들기 |

게임 쪽은 `window.rtdNative` 가 있으면 저장을 파일로(`src/systems/storage.js`), '게임 종료'는 저장을 다 쓰고 앱을 끈다(`src/ui/settingsMenu.js` `quitApp`). 저장 규약은 `docs/SAVE.md`.

## 명령어 (`cd desktop`)

```bash
npm ci                 # Electron 설치 (처음 한 번)
npm run build:web      # 게임을 desktop/app 으로 빌드
npm start              # 데스크톱 판 실행 (개발용)
npm run pack:win       # Windows 판 → out/MercenaryCorpsSiege-win32-x64/MercenaryCorpsSiege.exe (리눅스·맥에서도 됨)
xvfb-run -a -s "-screen 0 1920x1080x24" node test/smoke.cjs   # 시험 (리눅스 컨테이너는 가상 화면 필요)
```

시험 내용: `app://rtd/` 로 뜸 · 저장소가 파일(native) · 게임 쪽에서 Node 기능 못 씀 · 사용자 그림(manifest) 불러옴 · 저장 파일 생김(임시 파일 안 남음) · 다시 켜도 그대로 · 영지 ESC 메뉴 '게임 종료'로 앱이 꺼짐.

## Windows 판 받기

GitHub → Actions → **Desktop Build** → Run workflow (또는 `v*` 태그 push) → 끝나면 Artifacts 의 `MercenaryCorpsSiege-win32-x64` 를 내려받아 압축을 풀고 `MercenaryCorpsSiege.exe` 실행. 크기는 약 360MB(압축 160MB) — 대부분 Electron(Chromium) 본체.

- 저장 폴더: `%APPDATA%\rtd-desktop\save\` (`rtd_meta_v3.json` 등)
- 창 상태: `%APPDATA%\rtd-desktop\window.json`
- 서명 안 된 실행 파일이라 Windows SmartScreen 이 경고할 수 있다 → '추가 정보' → '실행'

## 아직 안 한 것

- 아이콘·설치 프로그램(현재는 압축 파일 + exe) — Steam 은 설치 프로그램 없이 폴더째 올리므로 필수 아님
- 4단계 Steamworks(steamworks.js: 업적·오버레이, 클라우드는 Auto-Cloud) — Steamworks 개발자 계정·앱 ID 필요
