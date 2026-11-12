# Project RTD — 용병단 디펜스

> 이 프로젝트 전용 Claude 컨텍스트. **기획 상세·가정·밸런스 메모는 `docs/GDD.md`** — 기획 관련 작업 전 반드시 읽을 것.
> 결정이 바뀌면 GDD.md 와 아래 "진행 상황"을 함께 갱신한다.

## 게임 개요
- 장르: 랜덤 타워 디펜스 (RTD), 2D 픽셀아트, 세로 화면 모바일 우선
- 핵심 플레이: 5x5 성벽 위에 골드로 랜덤 용병 고용 → 같은 속성·레벨끼리 드래그 머지로 레벨 업(랜덤 스킬) → 성벽 주위를 도는 몬스터 처치. 100기 쌓이면 패배, 100웨이브 생존 시 승리
- 속성 상성: 블루 > 레드 > 그린 > 블루

## 기술 스택
- Phaser 3 (`phaser@^3.90`) + Vite 8, JavaScript (ES Modules, top-level await 사용 → build target es2022)
- 물리 엔진 미사용 (이동·충돌 직접 계산)
- 해상도 544x960, `pixelArt: true`, `Scale.FIT`
- **모든 그래픽은 코드로 생성** (`src/art/sprites.js` 문자열 맵 → `textures.js` 가 캔버스 텍스처로 변환). 외부 이미지 없음
- 폰트: Galmuri11 (OFL, `public/assets/fonts/`)

## 명령어
- `npm run dev` — 개발 서버 (http://localhost:5173)
- `npm run build` — `dist/` 로 빌드
- `node tools/balance-sim.cjs` — 밸런스 봇 시뮬레이션 (먼저 `npm run build && npx vite preview --port 4173` 실행, playwright 필요)
- 브라우저 콘솔 디버그: `game.scene.getScene('Game')` → `g.gold += 1000`, `g.startWave(10)` 등

## 구조
- `src/config.js` — 레이아웃 상수, **BALANCE** (골드·비용·시간·상성 배율)
- `src/data/` — `waves.js`(웨이브 규칙·몬스터 능력치), `heroes.js`, `skills.js`, `relics.js`, `elements.js`
- `src/objects/` — `Monster.js`, `Mercenary.js`(스킬/유물 반영 능력치 `getStats`)
- `src/scenes/` — `BootScene`(텍스처 생성) → `TitleScene` → `GameScene`(게임 로직 + HUD 전부)
- `src/systems/path.js` — 몬스터 경로 / 셀 좌표 변환
- `src/ui/Button.js` — 픽셀 버튼

## 작업 규칙
- 이 프로젝트 폴더 밖의 파일(다른 프로젝트)은 수정하지 않는다.
- Phaser **3** API만 사용한다 (Phaser 4 문법 금지).
- 픽셀 격자 유지: 아트 1px = 화면 4px(`PX`). 배치 좌표는 4의 배수로.
- 밸런스 수치는 코드에 흩지 말고 `config.js`의 BALANCE 또는 `data/` 에 둔다.
- GameObject 하위 클래스에 `name`, `type`, `state` 같은 Phaser 예약 속성명 getter 금지 (예: 용병 이름은 `heroName`).
- 기능 변경 후: 빌드 → 브라우저(Playwright)로 실제 실행 확인.

## 확인 필요 (사용자에게 물어볼 것)
- 정예/보스 웨이브에 일반 몬스터도 함께 나오는지 (현재: 정예 10기만 / 보스 1기만)
- 스킬이 영웅별 고유인지 (현재: 레벨별 공용 3종)
- 후반 골드 소비처 (현재 없음 → 밸런스 벽의 원인)
- 보스 제한시간/미처치 페널티 여부 (현재: 없음, 계속 돈다)

## 진행 상황 / 결정 로그
- 2026-11-12 프로젝트 생성
- 2026-11-12 1차 플레이어블 프로토타입: 타이틀, 고용/머지/이동/판매, 15종 영웅·12종 스킬·10종 유물, 100웨이브, 게임오버/승리, 배속·일시정지. 플레이 테스트 및 봇 시뮬 (W91 도달) 완료
