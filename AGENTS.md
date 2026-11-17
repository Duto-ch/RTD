# AGENTS.md — Project RTD (용병단 디펜스)

> AI 코딩 에이전트(Claude Code, Codex, Cursor 등) 공용 작업 지침. 도구에 상관없이 이 파일을 따른다.
> 게임 기획·결정 사항은 `CLAUDE.md`(개요·확정 결정·진행 로그)와 `docs/GDD.md` 에 있다.

## 기술 스택
- Phaser 3 (`phaser@^3.90`) + Vite 8, JavaScript (ES Modules, top-level await 사용 → build target es2022)
- 물리 엔진 미사용 (이동·충돌 직접 계산)
- 해상도 544x960(게임 좌표), `pixelArt: true`, `Scale.FIT`. **실제 캔버스는 ×`RES`(2) — 각 장면 `create()` 첫 줄 `hiRes(this)` 가 카메라를 zoom 2 로 맞춘다.** 포인터는 화면 좌표 `p.x` 가 아니라 `p.worldX/worldY` 를 쓴다. 모든 `add.text` 는 `main.js` 가 해상도 RES·글자 크기 `crispFontSize()`(Galmuri11 격자) 로 맞춘다
- **그래픽은 기본적으로 코드로 생성** (`src/art/sprites.js` 문자열 맵 → `textures.js` 가 캔버스 텍스처로 변환)
- **직접 그린 이미지·애니메이션으로 교체 가능**: `public/assets/custom/manifest.json` 에 적힌 PNG(스프라이트 시트)가 같은 키의 코드 그림을 대체 (`src/systems/customArt.js`). 애니메이션 이름: 용병·영웅 `idle`/`attack`, 몬스터 `walk`. 촘촘하게 그린 그림은 manifest `scale`(예: 32×32 → 0.5)로 크기를 맞추고, 유닛 그림을 바꿀 때는 `setArt(obj, key, 기본배율)` 을 쓴다. manifest `faceTarget`+`pivotX` 가 있는 그림은 `setFacing(sprite, left)` 로 공격 방향을 바라본다. 사용법·키 목록은 `docs/CUSTOM_ART.md`
- 폰트: UI 는 썬플라워(`COZY`, 아래 참고), 픽셀 폰트 Galmuri11 은 `COZY=false` 때 UI 와 글자 크기 격자(`crispFontSize`) 기준. `public/assets/fonts/`
- **가로 배치·B-2 UI**: `config.WIDE`(창 비율, `?layout=`)면 1280x720. `COZY`(2026-11-16 가로·세로 모두 true) 일 때 `theme.js` 가 둥근 카드형(`cozyKey`, 캔버스 해상도로 그려 `panelScale()` = 1/RES)·세이지 색·썬플라워 글꼴(`COZY_FONT`, `public/assets/fonts/Sunflower-Medium/Bold.woff2` + 기호용 `GowunDodum-Regular.woff2`, 게임에 쓰는 글자만 서브셋 — 새 한글 문구를 넣으면 `src` 글자를 모아 `pyftsubset` 으로 다시 만들 것)로 바뀐다. Hud 가로 배치는 `createTopWide`/`createBottomWide`/`refreshInfoWide`
- **UI 스타일**: 기본은 B-2 카드형(`COZY`). `COZY=false` 면 예전 픽셀 RPG 풍(크림 창·금빛 테두리·주황 탭, UI_PX 배 확대)으로 돌아간다. `src/ui/theme.js` 의 `panel()`/`panelImage()`/`panelKey()`/`titleTab()`/`closeButton()`/`uiText()`/`drawIcon()` 와 `Button` variant(primary/danger/gold/outline/card/soft)를 쓴다

## 명령어
- `npm run dev` — 개발 서버 (http://localhost:5173)
- `npm run build` — `dist/` 로 빌드
- `npm test` — 단위 테스트 (Vitest, `tests/unit/`): 확정된 게임 규칙·데이터 검사, 1초 이내
- `npm run test:e2e` — 브라우저 테스트 (Playwright, `tests/e2e/`): 빌드를 띄워 실제로 조작, 화면을 `test-results/screens/` 에 저장
- `npm run check` — 위 두 가지 모두 (작업 끝날 때마다 실행)
- `node tools/balance-sim.cjs ['{"hpGrowth":1.08}'] ['{"atk":10}']` — 밸런스 봇 시뮬레이션. 1번째 JSON: BALANCE 덮어쓰기(monster 키는 monster 에), 2번째 JSON: 명성 강화 레벨 (없으면 강화 0 = 기준 W10~15) (먼저 `npm run build && npx vite preview --port 4173` 실행, playwright 필요)
- `node tools/gen-skill-doc.mjs` — 스킬 데이터 변경 후 `docs/SKILLS.md` 재생성
- `node tools/gen-upgrade-doc.mjs` — 강화 트리 노드 변경 후 `docs/UPGRADES.md` 재생성
- `node tools/gen-art-doc.mjs` — 영웅·몬스터·유물·지역을 추가/변경하면 `docs/CUSTOM_ART.md` 의 교체 가능 키 목록 재생성
- **배포**: `main` 에 push 하면 GitHub Actions(`.github/workflows/deploy.yml`)가 **테스트 → 통과 시 빌드·배포** → https://duto-ch.github.io/RTD/ (실패하면 배포 안 됨, 테스트 화면은 Actions 실행 결과의 `test-screens` 에서 내려받기)
- Claude Code: `/graphify .` — 코드베이스 지식 그래프 생성(`graphify-out/`, 커밋 안 함). 스킬은 `.claude/skills/graphify/` (없으면 스킬이 `pip install graphifyy` 를 스스로 실행)
- **perfectPixel** (`.claude/skills/perfectpixel/`): ChatGPT·Gemini 등이 만든 "픽셀 풍" 이미지를 진짜 픽셀 격자로 정리 — `python3 .claude/skills/perfectpixel/pp.py in.png out.png --preview 8 --key-white --colors 12` (`pip install "perfect-pixel[opencv]" pillow` 필요). PixelLab 횟수를 아끼는 대체 경로. 결과는 게임 사양(28x24·12색)에 맞는지 눈으로 확인
- **PixelLab MCP** (`.mcp.json`, 픽셀아트 생성): 토큰은 저장소에 넣지 않는다 — `Bearer proxy-injected` 자리에 클라우드 환경의 네트워크 비밀값이 자동으로 들어간다. 새 세션부터 도구가 보인다
- Claude Code: `/verify` — 작업 루프(검사 → 실패 시 수정 반복 → 화면 확인)를 한 번에 수행
- 단축키: Space 바로 시작, S 선택 용병 판매, ESC 메뉴
- 브라우저 콘솔 디버그: `game.scene.getScene('Game')` → `g.gold += 1000`, `g.startWave(10)`, `g.endGame(true)` 등. `window.__rtd` 에 skillOptions·HEROES·audio·setArt·meta (`__rtd.meta.addFame(100)`, `__rtd.meta.reset()`)

## 구조
- `src/config.js` — 레이아웃 상수, **BALANCE** (골드·비용·시간·상성 배율)
- `src/data/` — `waves.js`(웨이브 규칙·출현 순서), `bossAbilities.js`(보스 디버프 5종), `heroes.js`(용병 15·영웅 9·이름), `skills.js`(스킬 템플릿·설명 자동 생성), `relics.js`, `elements.js`
- `src/objects/` — `Monster.js`(감속/기절/취약/지속피해), `Mercenary.js`(용병+영웅 공용 유닛, 버프·유물 반영 `getStats`)
- 스킬 실행 엔진: `GameScene.castSkill` — 스킬은 데이터(area/fx/buff/gold)로만 정의, 새 효과 타입은 여기에 추가
- `src/scenes/` — `BootScene`(텍스처 생성·타이틀 일러스트 `title_bg` 로드 — `public/assets/title/title.png`, perfectPixel 로 격자 정리한 그림. AI 픽셀풍 그림을 새로 넣으면 `.claude/skills/perfectpixel` 로 먼저 정리) → `TitleScene`(일러스트 + TAP TO START, 빈 곳 탭 = 시작) → `GameScene`(게임 진행·전투·유물·명성. 화면 UI 는 `src/ui/Hud.js`)
- `src/systems/path.js` — 몬스터 경로 / 셀 좌표 변환
- `src/systems/vfx.js` — 이펙트 (클래스별 공격·스킬 연출, 속성 파티클, 영웅 궁극기, 보스 저주, 폭죽)
- `src/data/fx.js` + `public/assets/fx/` — PixelLab 스프라이트 시트 이펙트 13종 + 화살 4종(`vfx.arrow`) + 처치 동전(`vfx.coinDrop`, pixelfx 원본 `docs/drafts/coin-drop/`). 모두 `px: 4` 플랫 스타일(3~4색, 질감·디더링 없음) — 새 이펙트도 같은 규칙(vfx_workbench `detail: 0`, `tones: 3~4`). `vfx.play(key, x, y, {tint, scale})` 는 끝나면 스스로 지우고, 흰 시트(`tint: true`)는 속성 색을 입힌다. 용병에 붙는 이펙트는 `vfx.attach(merc, key)`, 버프·디버프 상태는 `vfx.setStatus(merc, 'buff'|'debuff', on)`(`updateMercs` 가 매 프레임). 동시 48개 상한(넘으면 명중 이펙트부터 생략), 동전 12개 상한. 시트가 없으면 코드 이펙트만. 원본 수정: `mcp__pixellab__vfx_workbench start --effect <id>` → export → PNG 교체
- `src/systems/audio.js` — 16비트 풍 사운드 합성기 (배경음 4곡: title/battle/boss/final + 효과음, 볼륨 저장). 외부 오디오 파일 없음. 첫 입력 후 `audio.init()`
- `src/art/monsters.js` — 몬스터 디자인 40종 (일반 20·정예 10·보스 10), `src/data/monsters.js` — 웨이브 → 디자인 선택
- `src/ui/theme.js` — 픽셀 UI: 양피지·나무 패널 텍스처, 초록 탭, 닫기 버튼, 픽셀 아이콘, 글자 헬퍼
- `src/ui/Hud.js` — 전투 화면 UI(상단 상태 창·유물 줄·툴팁, 하단 버튼·정보 창, 토스트·배너, 스킬 정보 팝업, ESC 메뉴). GameScene 이 `this.hud` 로 들고 있고, 게임 상태는 읽기만 한다. GameScene 의 `toast`/`showBanner`/`refreshHud`/`refreshRelics`/`refreshInfo` 는 hud 로 넘기는 짧은 통로. 새 HUD 요소는 GameScene 이 아니라 여기에 추가. 배너·토스트는 필드·몬스터 길(y 232~728)을 가리지 않는 띠(`BANNER_Y`/`TOAST_Y`)에만 띄운다
- `src/ui/Tutorial.js` — 기능별 최초 1회 튜토리얼. 단계는 `TUTORIAL_STEPS`(제목·본문·비출 영역), GameScene 이 `this.tut.show(id)` 로 띄운다(본 단계·끄기는 `meta.tutorial`). 떠 있는 동안 `tut.open` 이라 전투 dt 0·키 입력 무시. 자동화 브라우저에서는 꺼짐 — e2e 는 localStorage `rtd_tutorial_test` 로 켠다. 새 기능을 넣으면 단계도 하나 추가
- `src/ui/Button.js` — 픽셀 버튼 (variant 별 스타일, 아이콘 타일, 누르면 1px 내려앉음)
- `src/data/upgrades.js` — 명성 강화 트리 45노드(부모·갈래·글자·비용·효과), 효과 키는 `metaBonus()` 가 합산 → GameScene `this.bonus`·Mercenary `getStats` 에서 사용, 명성 획득 규칙 `FAME`. `src/systems/meta.js` — 판을 넘어 유지되는 저장(명성·강화 레벨·최고 기록, localStorage). `src/scenes/UpgradeScene.js` — 방사형 강화 트리 화면(`layoutTree()` 배치, 드래그·확대). GameScene 은 `this.bonus`(강화 효과, 성탑 창을 닫으면 `applyBonus()` 로 다시 읽음)·`this.bestWave`(지난 최고 기록)를 쓴다. 웨이브는 무한(`waves.js` `isFinalWave`·`CYCLE_WAVES` 100마다 최종 보스, 지역·디자인 순환). 필드 가운데 성탑 칸(`TOWER_CELL`)은 용병 금지 — 빈 칸 검사는 `isTowerCell()`, 용병 칸 수는 `fieldSlots`(24)
- `src/data/biomes.js` — 지역 10종 (10웨이브마다 배경 교체), 배경은 `textures.js` paintBackground 가 지역별로 생성 — 플랫 스타일: 땅·길은 저주파 노이즈(`valueNoise`) 2~3톤 덩어리(한 픽셀씩 흩뿌린 잡티 금지), 장식은 그림자 있는 작은 픽셀 그림으로 보이는 땅(길 바깥·HUD 사이)에만 놓는다
- `tests/unit/` — 단위 테스트 (Vitest), `tests/e2e/` — 브라우저 테스트 (Playwright), `playwright.config.js`

## 작업 규칙
- 이 프로젝트 폴더 밖의 파일(다른 프로젝트)은 수정하지 않는다.
- Phaser **3** API만 사용한다 (Phaser 4 문법 금지).
- 픽셀 격자: **배경·UI 는 아트 1px = 화면 3px(`UI_PX`)**, 직접 그린 캐릭터도 3px(28x24 × manifest scale 0.75). 아직 코드로 그린 유닛·몬스터·성탑·유물 아이콘·이펙트는 4px(`PX`) — 캐릭터 교체가 끝나면 함께 3px 로 옮길 예정. 화면 칸(64px)은 3으로 나누어떨어지지 않으므로 배경은 `toArt()` 로 가장 가까운 픽셀 경계에 맞춘다
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
6. **문서** — 결정이 바뀌면 `CLAUDE.md`(확정 결정·진행 로그)와 `docs/GDD.md` 갱신. 데이터가 바뀌면 `node tools/gen-skill-doc.mjs` / `node tools/gen-art-doc.mjs` / `node tools/gen-upgrade-doc.mjs`.
7. **커밋·푸시** — `main` 에 push 하면 GitHub Actions 가 테스트를 통과한 경우에만 배포한다.
