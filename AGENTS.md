# AGENTS.md — Project RTD (용병단 디펜스)

> AI 코딩 에이전트(Claude Code, Codex, Cursor 등) 공용 작업 지침. 도구에 상관없이 이 파일을 따른다.
> 게임 기획·결정 사항은 `CLAUDE.md`(개요·확정 결정)와 `docs/GDD.md` 에 있다. 버전·스크립트는 `package.json`, 파일 구성은 저장소 자체를 본다.
> 그림·이펙트를 만들거나 다시 만들 때는 스킬 `rtd-art-pipeline`(`.claude/skills/rtd-art-pipeline/SKILL.md`)을 따른다.

## 함정 (코드만 보면 놓치기 쉬운 것)
- Phaser **3** API만 쓴다 (Phaser 4 문법 금지). 물리 엔진 없이 이동·충돌을 직접 계산한다
- 게임 좌표 544x960(가로 배치 `config.WIDE` 면 1280x720, `?layout=`). **실제 캔버스는 ×`RES`(화면에 맞춘 정수 2~3, 테스트 뷰포트는 2) — 각 장면 `create()` 첫 줄 `hiRes(this)` 가 카메라를 zoom RES 로 맞춘다. RES 를 2 로 가정한 숫자를 쓰지 말 것.** 포인터는 `p.x` 가 아니라 `p.worldX/worldY`. 모든 `add.text` 는 `main.js` 가 RES·`crispFontSize()` 로 맞춘다
- UI 글꼴 썬플라워·고운돋움은 **게임에 쓰는 글자만 서브셋** — 새 한글 문구를 넣으면 `src` 글자를 모아 `pyftsubset` 으로 `public/assets/fonts/` 를 다시 만들 것 (안 하면 글자가 빠져 보인다)
- UI 는 `COZY`(B-2 카드형, 기본 true) — `src/ui/theme.js` 의 `panel()`·`uiText()`·`drawIcon()` 등과 `Button` variant 를 쓴다. 가로 HUD 는 `createTopWide`/`createBottomWide`/`refreshInfoWide` 가 따로 있다
- 그림은 기본이 코드 생성(`src/art/`), `public/assets/custom/manifest.json` 에 적힌 PNG 가 같은 키를 대체한다(`src/systems/customArt.js`, 키 목록 `docs/CUSTOM_ART.md`). 유닛 그림을 바꿀 때는 `setArt(obj, key, 기본배율)`, 텍스처를 바꾸면 `playBase(sprite, 'idle'|'walk')`. 새 텍스처 키를 만들면 `tools/gen-art-doc.mjs` 에도 반영
- 픽셀 격자: **모든 도트 그림은 아트 1px = 화면 2px (`DOT`, 2026-11-21)**. 코드로 그린 작은 텍스처를 크게 쓸 때는 `dotKey(scene, key, n)`/`dotImage()`(`src/art/textures.js`, Scale2x·3x 로 n배 해상도)로 만들어 배율 2 로 놓는다 — `setScale(PX)` 같은 4px·소수 배율 금지. `PX`(4)는 배치 단위로만 쓴다. 배경 좌표는 `toArt()` 로 픽셀 경계에 맞춘다. 필드는 레이어(`bg_<지역>` → `field_tile_*` → `field_wall`)를 `GameScene.createFieldLayers()` 가 쌓는다
- 유닛은 몸 중심이 칸 가운데 — 직접 그린 그림은 manifest `pivotX`·`pivotY` 로 몸 중심을 적는다. 캐릭터 그림은 왼쪽을 보고(`facing: "left"`) 오른쪽 대상이면 반전된다
- GameObject 하위 클래스에 `name`·`type`·`state` 같은 Phaser 예약 속성명 getter 금지 (용병 이름은 `heroName`)
- 새 HUD 요소는 GameScene 이 아니라 `src/ui/Hud.js` 에 넣는다(GameScene 은 `toast`·`showBanner`·`refreshHud` 등으로 넘기기만). **배너·토스트는 필드·몬스터 길(세로 y 272~688)을 가리지 않는 띠(`BANNER_Y`/`TOAST_Y`)에만**
- 튜토리얼(`src/ui/Tutorial.js`)은 자동화 브라우저에서 꺼진다 — e2e 는 localStorage `rtd_tutorial_test` 로 켠다. 새 기능을 넣으면 `TUTORIAL_STEPS` 에 단계도 하나 추가. 떠 있는 동안 `tut.open` 이라 전투 dt 0·키 입력 무시
- 스킬은 데이터(area/fx/buff/gold)로만 정의하고 `GameScene.castSkill` 이 실행한다 — 새 효과 타입은 거기에 추가. 스킬 연출은 `vfx.sigSkill`(레어·유니크 전용, 키 = 스킬 def.id) → `vfx.setSkill`(커먼·언커먼 공용) → 예전 `vfx.skill` 순으로 고른다. 이펙트 동시 48개·동전 12개 상한
- 예전 `src/data/heroes.js`·`skillOptions` 는 그림·문서용으로만 남은 것 — 게임 규칙은 `src/data/roster.js`(104명)
- 명성 강화 효과 키는 `metaBonus()` 가 합산 → GameScene `this.bonus`(강화 창을 닫으면 `applyBonus()` 로 다시 읽음)·Mercenary `getStats` 에서 쓴다. 판 시작 때만 쓰는 효과는 다음 판부터

## 명령어 (package.json 에 없는 것·꼭 지킬 것)
- `npm run check` — 단위(Vitest) + 브라우저(Playwright) 테스트. **작업이 끝날 때마다 실행.** 브라우저 테스트는 빌드를 띄워 조작하고 화면을 `test-results/screens/` 에 저장
- `node tools/balance-sim.cjs ['{"hpGrowth":1.08}'] ['{"atk":10}']` — 밸런스 봇. 1번째 JSON: BALANCE 덮어쓰기(monster 키는 monster 에), 2번째: 명성 강화 레벨(없으면 강화 0 = 기준 W10~15). 먼저 `npm run build && npx vite preview --port 4173`
- 데이터를 고친 뒤 문서 다시 만들기: `node tools/gen-roster-doc.mjs`(로스터 → `docs/ROSTER.md`) · `node tools/gen-skill-doc.mjs` · `node tools/gen-upgrade-doc.mjs` · `node tools/gen-art-doc.mjs`
- **배포**: `main` 에 push 하면 GitHub Actions 가 테스트 통과 시에만 빌드·배포 → https://duto-ch.github.io/RTD/ (테스트 화면은 Actions 결과의 `test-screens`)
- 브라우저 콘솔 디버그: `game.scene.getScene('Game')` → `g.gold += 1000`, `g.startWave(10)`, `g.endGame(true)`. `window.__rtd` 에 ROSTER·audio·setArt·setFacing·meta (`__rtd.meta.addFame(100)`, `__rtd.meta.reset()`)
- 작업을 끝낼 때 Stop 훅(`.claude/hooks/missed-changes.py`)이 빠뜨린 후속 작업을 알린다 — 수동 확인 `python3 .claude/hooks/missed-changes.py --print`
- `node tools/ui-audit.cjs [tall|wide|all]` — UI 글자 정렬 점검 (장면별 표 + `ui-audit/` 화면, 문제 글자에 빨간 상자)
- `/graphify .` — 코드베이스 지식 그래프(`graphify-out/`, 커밋 안 함) · `/verify` — 작업 루프 한 번에
- 음악 생성: 스킬 `acestep`(`.claude/skills/acestep/`) — 사용자 컴퓨터에서 `uv run acestep-api`(포트 8001)로 띄운 ACE-Step 1.5 를 부른다. 그 컴퓨터의 Claude Code 세션에서만 동작(클라우드 세션은 그 localhost 에 닿지 않음). 시안은 `docs/drafts/music/`

## 작업 규칙
- 이 프로젝트 폴더 밖의 파일(다른 프로젝트)은 수정하지 않는다.
- 밸런스 수치는 코드에 흩지 말고 `config.js` 의 BALANCE 또는 `src/data/` 에 둔다.
- 사용자가 정한 규칙(웨이브·비용·상성 등)을 바꾸면 `tests/unit/` 의 해당 테스트도 함께 고친다. 테스트를 지워서 통과시키지 않는다.
- 새 기능에는 `tests/e2e/game.spec.js` 에 실제 조작 테스트를 하나 추가한다.
- PixelLab·OpenAI 토큰은 저장소에 넣지 않는다 (`.mcp.json` 의 `Bearer proxy-injected` 자리에 환경 비밀값이 들어간다).

## 작업 루프 (변경할 때마다)
1. **요구 확인** — 모호하면 `docs/GDD.md`·`CLAUDE.md` 의 확정 결정을 먼저 보고, 그래도 모호하면 가정을 세우고 GDD 의 ⚠️ 표시로 남긴다.
2. **구현** — 수치는 `config.js` BALANCE 나 `src/data/` 에.
3. **검사** — `npm run check`. 실패하면 원인을 고치고 3번을 다시 돈다. 통과할 때까지 반복.
4. **눈으로 확인** — `test-results/screens/*.png` 를 열어 UI 겹침·잘림·색을 본다. 새 화면이면 e2e 에 스크린샷을 추가한다.
   **UI 를 바꿨으면 글자 정렬 점검 (2026-11-21 사용자 요청, 항상)**: `node tools/ui-audit.cjs` (빌드 + `npx vite preview --port 4173` 먼저) — 화면 밖·겹침·패널 여백 한쪽 쏠림·버튼 글자 가운데·아이콘과 글자 겹침·**요소 사이 여백 4px 미만(`gap`, 필수 규칙)**이 0 이어야 하고, `ui-audit/*.png` 를 열어 좌우·상하 간격을 눈으로도 맞춘다. 스크롤 목록(마스크)은 컨테이너에 `maskRect`, 일부러 비낀 글자·버튼은 `auditOk = true`
5. **밸런스에 영향**이 있으면 `node tools/balance-sim.cjs` 를 2~3회 돌려 도달 웨이브를 기록한다 (`docs/GDD.md` 밸런스 메모).
6. **문서** — 결정이 바뀌면 `CLAUDE.md`(해당 줄 고치기)·`docs/GDD.md` 갱신, 진행 기록은 `docs/HISTORY.md` 맨 아래 한 줄. 데이터가 바뀌면 위 문서 생성 명령.
7. **커밋·푸시** — 작업 브랜치에서. `main` 에 push 하면 GitHub Actions 가 테스트를 통과한 경우에만 배포한다.
