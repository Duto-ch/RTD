# AGENTS.md — Project RTD (용병단 디펜스)

> AI 코딩 에이전트(Claude Code, Codex, Cursor 등) 공용 작업 지침. 도구에 상관없이 이 파일을 따른다.
> 게임 기획·결정 사항은 `CLAUDE.md`(개요·확정 결정·진행 로그)와 `docs/GDD.md` 에 있다.

## 기술 스택
- Phaser 3 (`phaser@^3.90`) + Vite 8, JavaScript (ES Modules, top-level await 사용 → build target es2022)
- 물리 엔진 미사용 (이동·충돌 직접 계산)
- 해상도 544x960, `pixelArt: true`, `Scale.FIT`
- **그래픽은 기본적으로 코드로 생성** (`src/art/sprites.js` 문자열 맵 → `textures.js` 가 캔버스 텍스처로 변환)
- **직접 그린 이미지·애니메이션으로 교체 가능**: `public/assets/custom/manifest.json` 에 적힌 PNG(스프라이트 시트)가 같은 키의 코드 그림을 대체 (`src/systems/customArt.js`). 애니메이션 이름: 용병·영웅 `idle`/`attack`, 몬스터 `walk`. 사용법·키 목록은 `docs/CUSTOM_ART.md`
- 폰트: 픽셀 폰트 Galmuri11 (OFL) — UI·게임 월드 공통. `public/assets/fonts/`
- **UI 스타일**: 픽셀아트 RPG 풍 — 양피지 창 + 갈색 나무 테두리 + 초록 제목 탭·버튼 + X 닫기 버튼 + 오목 슬롯. 패널은 아트 해상도로 그려 PX배 확대(게임과 같은 픽셀 격자). `src/ui/theme.js` 의 `panel()`/`panelImage()`/`panelKey()`/`titleTab()`/`closeButton()`/`uiText()`/`drawIcon()`(7x7 픽셀 아이콘) 와 `Button` variant(primary 초록/danger/gold/outline·card 양피지/soft 슬롯)를 쓴다

## 명령어
- `npm run dev` — 개발 서버 (http://localhost:5173)
- `npm run build` — `dist/` 로 빌드
- `npm test` — 단위 테스트 (Vitest, `tests/unit/`): 확정된 게임 규칙·데이터 검사, 1초 이내
- `npm run test:e2e` — 브라우저 테스트 (Playwright, `tests/e2e/`): 빌드를 띄워 실제로 조작, 화면을 `test-results/screens/` 에 저장
- `npm run check` — 위 두 가지 모두 (작업 끝날 때마다 실행)
- `node tools/balance-sim.cjs ['{"hpGrowth":1.08}']` — 밸런스 봇 시뮬레이션. JSON 인자로 BALANCE.monster 덮어쓰기 실험 (먼저 `npm run build && npx vite preview --port 4173` 실행, playwright 필요)
- `node tools/gen-skill-doc.mjs` — 스킬 데이터 변경 후 `docs/SKILLS.md` 재생성
- `node tools/gen-art-doc.mjs` — 영웅·몬스터·유물·지역을 추가/변경하면 `docs/CUSTOM_ART.md` 의 교체 가능 키 목록 재생성
- **배포**: `main` 에 push 하면 GitHub Actions(`.github/workflows/deploy.yml`)가 **테스트 → 통과 시 빌드·배포** → https://duto-ch.github.io/RTD/ (실패하면 배포 안 됨, 테스트 화면은 Actions 실행 결과의 `test-screens` 에서 내려받기)
- Claude Code: `/verify` — 작업 루프(검사 → 실패 시 수정 반복 → 화면 확인)를 한 번에 수행
- 브라우저 콘솔 디버그: `game.scene.getScene('Game')` → `g.gold += 1000`, `g.startWave(10)`, `g.endGame(true)` 등. `window.__rtd` 에 skillOptions·HEROES·audio

## 구조
- `src/config.js` — 레이아웃 상수, **BALANCE** (골드·비용·시간·상성 배율)
- `src/data/` — `waves.js`(웨이브 규칙·출현 순서), `bossAbilities.js`(보스 디버프 5종), `heroes.js`(용병 15·영웅 9·이름), `skills.js`(스킬 템플릿·설명 자동 생성), `relics.js`, `elements.js`
- `src/objects/` — `Monster.js`(감속/기절/취약/지속피해), `Mercenary.js`(용병+영웅 공용 유닛, 버프·유물 반영 `getStats`)
- 스킬 실행 엔진: `GameScene.castSkill` — 스킬은 데이터(area/fx/buff/gold)로만 정의, 새 효과 타입은 여기에 추가
- `src/scenes/` — `BootScene`(텍스처 생성) → `TitleScene` → `GameScene`(게임 로직 + HUD 전부)
- `src/systems/path.js` — 몬스터 경로 / 셀 좌표 변환
- `src/systems/vfx.js` — 이펙트 (클래스별 공격·스킬 연출, 속성 파티클, 영웅 궁극기, 보스 저주, 폭죽)
- `src/systems/audio.js` — 16비트 풍 사운드 합성기 (배경음 4곡: title/battle/boss/final + 효과음, 볼륨 저장). 외부 오디오 파일 없음. 첫 입력 후 `audio.init()`
- `src/art/monsters.js` — 몬스터 디자인 40종 (일반 20·정예 10·보스 10), `src/data/monsters.js` — 웨이브 → 디자인 선택
- `src/ui/theme.js` — 픽셀 UI: 양피지·나무 패널 텍스처, 초록 탭, 닫기 버튼, 픽셀 아이콘, 글자 헬퍼
- `src/ui/Button.js` — 픽셀 버튼 (variant 별 스타일, 아이콘 타일, 누르면 1px 내려앉음)
- `src/data/biomes.js` — 지역 10종 (10웨이브마다 배경 교체), 배경은 `textures.js` paintBackground 가 지역별로 생성
- `tests/unit/` — 단위 테스트 (Vitest), `tests/e2e/` — 브라우저 테스트 (Playwright), `playwright.config.js`

## 작업 규칙
- 이 프로젝트 폴더 밖의 파일(다른 프로젝트)은 수정하지 않는다.
- Phaser **3** API만 사용한다 (Phaser 4 문법 금지).
- 픽셀 격자 유지: 아트 1px = 화면 4px(`PX`). 배치 좌표는 4의 배수로.
- 밸런스 수치는 코드에 흩지 말고 `config.js`의 BALANCE 또는 `data/` 에 둔다.
- GameObject 하위 클래스에 `name`, `type`, `state` 같은 Phaser 예약 속성명 getter 금지 (예: 용병 이름은 `heroName`).
- 유닛·몬스터 그림은 Sprite(애니메이션 가능). 텍스처를 바꾸면 `playBase(sprite, 'idle'|'walk')` 로 기본 애니메이션을 다시 맞춘다. 새 텍스처 키를 만들면 `tools/gen-art-doc.mjs` 에도 반영
- 기능 변경 후 반드시 아래 **작업 루프** 를 따른다.
- 사용자가 정한 규칙(웨이브·비용·상성 등)을 바꾸면 `tests/unit/` 의 해당 테스트도 함께 고친다. 테스트를 지워서 통과시키지 않는다.
- 새 기능에는 `tests/e2e/game.spec.js` 에 실제 조작 테스트를 하나 추가한다.

## 작업 루프 (변경할 때마다)
1. **요구 확인** — 모호하면 `docs/GDD.md`·`CLAUDE.md` 의 확정 결정을 먼저 보고, 그래도 모호하면 가정을 세우고 GDD 의 ⚠️ 표시로 남긴다.
2. **구현** — 수치는 `config.js` BALANCE 나 `src/data/` 에.
3. **검사** — `npm run check` (단위 + 브라우저 테스트). 실패하면 원인을 고치고 3번을 다시 돈다. 통과할 때까지 반복.
4. **눈으로 확인** — `test-results/screens/*.png` 를 열어 UI 겹침·잘림·색을 본다. 새 화면이면 e2e 에 스크린샷을 추가한다.
5. **밸런스에 영향**이 있으면 `node tools/balance-sim.cjs` 를 2~3회 돌려 도달 웨이브를 기록한다 (`docs/GDD.md` 밸런스 메모).
6. **문서** — 결정이 바뀌면 `CLAUDE.md`(확정 결정·진행 로그)와 `docs/GDD.md` 갱신. 데이터가 바뀌면 `node tools/gen-skill-doc.mjs` / `node tools/gen-art-doc.mjs`.
7. **커밋·푸시** — `main` 에 push 하면 GitHub Actions 가 테스트를 통과한 경우에만 배포한다.
