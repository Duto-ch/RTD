# AGENTS.md — Project RTD (용병단 디펜스)

> AI 코딩 에이전트(Claude Code, Codex, Cursor 등) 공용 작업 지침. 도구에 상관없이 이 파일을 따른다.
> 게임 기획·결정 사항은 `CLAUDE.md`(개요·확정 결정)와 `docs/GDD.md` 에 있다. 버전·스크립트는 `package.json`, 파일 구성은 저장소 자체를 본다.
> 그림·이펙트를 만들거나 다시 만들 때는 스킬 `rtd-art-pipeline`(`.claude/skills/rtd-art-pipeline/SKILL.md`)을 따른다.

## 함정 (코드만 보면 놓치기 쉬운 것)
- Phaser **3** API만 쓴다 (Phaser 4 문법 금지). 물리 엔진 없이 이동·충돌을 직접 계산한다
- **PC 1920x1080 한 벌 (2026-11-22)** — 좌표가 두 가지다: **월드 좌표**(`WORLD_W`x`WORLD_H` 1920x1080: 배경·필드·몬스터·용병·이펙트, 도트 2px)와 **UI 좌표**(`GAME_W`x`GAME_H` 1280x720: HUD·창·로비 등 — `UI_SCALE` 1.5배로 그려 UI 도트는 3px). 월드 = UI × 1.5 (`toWorld`·`toUi`). 캔버스는 1920x1080 × `RES`(정수, 1080p 1·4K 2). UI 장면은 `create()` 첫 줄 `hiRes(this)`(zoom RES×1.5), 전투 장면은 `splitCams(this)` — 카메라 4개가 **깊이로** 나눠 그린다: 100 미만 = 월드, 이상 = UI(`DEPTH.overlay-1` 이상은 창 카메라). 용병처럼 깊이가 높아도 월드 좌표인 물체는 `worldLayer = true`(`src/systems/hires.js`). **전투 장면 포인터는 `p.worldX` 를 쓰지 말고 `worldPoint(scene, p)`(전장)·`uiPoint(scene, p)`(HUD)·`pointerFor(scene, obj, p)`** — `p.worldX` 는 마지막에 맞은 카메라 좌표라 섞인다. 모든 `add.text` 는 `main.js` 가 `TEXT_RES`·`crispFontSize()` 로 맞춘다
- UI 글꼴 썬플라워·고운돋움은 **게임에 쓰는 글자만 서브셋** — 새 한글 문구를 넣으면 `src` 글자를 모아 `pyftsubset` 으로 `public/assets/fonts/` 를 다시 만들 것 (안 하면 글자가 빠져 보인다)
- UI 는 `COZY`(B-2 카드형, 기본 true) — `src/ui/theme.js` 의 `panel()`·`uiText()`·`drawIcon()` 등과 `Button` variant 를 쓴다. **원·알약·고리는 `add.graphics().fillCircle` 대신 `discImage`·`pillImage`·`ringImage`**(화면 해상도로 거리 계산해 칠한 텍스처 — 도형 명령 원은 곡선이 고르지 않다, e2e 가 대칭 검사). HUD 배치는 `Hud.js` 의 `HUD` (UI 좌표)
- 그림은 기본이 코드 생성(`src/art/`), `public/assets/custom/manifest.json` 에 적힌 PNG 가 같은 키를 대체한다(`src/systems/customArt.js`, 키 목록 `docs/CUSTOM_ART.md`). 유닛 그림을 바꿀 때는 `setArt(obj, key, 기본배율)`, 텍스처를 바꾸면 `playBase(sprite, 'idle'|'walk')`. 새 텍스처 키를 만들면 `tools/gen-art-doc.mjs` 에도 반영
- 픽셀 격자: **모든 도트 그림은 아트 1px = 화면 2px (`DOT`, 2026-11-21)**. 코드로 그린 작은 텍스처를 크게 쓸 때는 `dotKey(scene, key, n)`/`dotImage()`(`src/art/textures.js`, Scale2x·3x 로 n배 해상도)로 만들어 배율 2 로 놓는다 — `setScale(PX)` 같은 4px·소수 배율 금지. `PX`(4)는 배치 단위로만 쓴다. 배경 좌표는 `toArt()` 로 픽셀 경계에 맞춘다. 필드는 레이어(`bg_<지역>` → `field_tile_*` → `field_wall`)를 `BattlefieldView.createFieldLayers()` 가 쌓는다
- **무기 분리 (2026-11-24)**: manifest `char_<id>.rig` 가 있는 캐릭터(게임 70명 전부 — 무기 원본은 PSD 로 고친 그림, 없으면 대기 각도 코드 그림)는 시트에 무기·앞손이 없고, `setArt` 가 `src/art/weaponRig.js` 로 원본 무기 그림(`rig_<id>_wpn`)·손(`rig_<id>_hand`)을 스프라이트 옆에 붙여 프레임마다 돌려 그린다(위치·배율·반전·투명도·색조를 따라감). 로비·병영 그림은 시트 끝 정지 프레임(`still`, 무기 포함) — 캐릭터 그림을 바꿀 때 `setArt` 를 거치지 않으면 무기가 안 나온다
- 유닛은 몸 중심이 칸 가운데 — 직접 그린 그림은 manifest `pivotX`·`pivotY` 로 몸 중심을 적는다. 캐릭터 그림은 왼쪽을 보고(`facing: "left"`) 오른쪽 대상이면 반전된다
- GameObject 하위 클래스에 `name`·`type`·`state` 같은 Phaser 예약 속성명 getter 금지 (용병 이름은 `heroName`)
- **전투 장면 = 판 상태 + 시스템 조립 (2026-11-26 객체지향 분리)**: `GameScene` 은 한 판의 상태(골드·웨이브·몬스터·필드 `grid`·대기석 등)를 들고 `update()` 에서 시스템을 차례로 부르기만 한다. 규칙은 `src/scenes/game/` 의 클래스에 — 웨이브 `WaveDirector`(waves.js) · 전투·피해·처치 `Combat`(combat.js) · 스킬 `SkillCaster`(skills.js) · 정예·기절·보스 능력 `MonsterAbilities`(monsterAbilities.js) · 필드·대기석·끌어 놓기 `Formation`(formation.js) · 상점·영지·별 승급 `ShopSystem`(shop.js) · 아이템 `ItemSystem`(items.js) · 시너지 `SynergySystem`(synergy.js) · 성벽 `Wall`(wall.js) · 명성·유물·마정석 `RunProgress`(progress.js) · 배속·정지 `TimeControl`(timeControl.js) · 단축키·마우스 `BattleInput`(input.js) · 전장 연출 `BattleFx`(fx.js) · 배경·석판 `BattlefieldView`(field.js) · 결과 창 `ResultScreen`(result.js). 시스템은 `this.scene` 으로 판 상태를 읽고, **다른 시스템은 장면을 거쳐 부른다**(`this.scene.floatText(…)` — 테스트가 `g.toast = …` 처럼 바꿔 끼울 수 있게). 시스템 메서드는 `GameScene.js` 끝 `delegate(...)` 로 장면에서도 그대로 불린다(`g.buy(0)`·`g.mercs`) — 새 메서드를 밖(Hud·테스트·봇)에서 부르면 거기 이름을 더한다. 새 규칙은 GameScene 이 아니라 해당 시스템(없으면 새 클래스)에
- 새 HUD 요소는 GameScene 이 아니라 `src/ui/Hud.js` 에 넣는다(GameScene 은 `toast`·`showBanner`·`refreshHud` 등으로 넘기기만). **배너·토스트는 필드·몬스터 길(UI y 207~513)을 가리지 않는 띠(`BANNER_Y` 위 · `TOAST_Y` 아래)에만**
- 튜토리얼(`src/ui/Tutorial.js`)은 자동화 브라우저에서 꺼진다 — e2e 는 localStorage `rtd_tutorial_test` 로 켠다. 새 기능을 넣으면 `TUTORIAL_STEPS` 에 단계도 하나 추가. 떠 있는 동안 `tut.open` 이라 전투 dt 0·키 입력 무시
- 스킬은 데이터(area/fx/buff/gold)로만 정의하고 `SkillCaster.castSkill`(`src/scenes/game/skills.js`)이 실행한다 — 새 효과 타입은 거기에 추가. 스킬 연출은 `vfx.sigSkill`(레어·유니크 전용, 키 = 스킬 def.id) → `vfx.setSkill`(커먼·언커먼 공용) → 예전 `vfx.skill` 순으로 고른다. 이펙트 동시 48개·동전 12개 상한
- 예전 `src/data/heroes.js`·`skillOptions` 는 그림·문서용으로만 남은 것 — 게임 규칙은 `src/data/roster.js`(104명)
- **저장은 `src/systems/storage.js` 만** (`storage.get/set/getJSON/setJSON`) — `localStorage` 직접 금지. 새 저장 키는 `SAVE_KEYS` 에 넣는다(데스크톱 파일·내보내기 대상). 규약·Steam 클라우드 `docs/SAVE.md`
- 명성 강화 효과 키는 `metaBonus()` 가 합산 → GameScene `this.bonus`(강화 창을 닫으면 `applyBonus()` 로 다시 읽음)·Mercenary `getStats` 에서 쓴다. 판 시작 때만 쓰는 효과는 다음 판부터

## 명령어 (package.json 에 없는 것·꼭 지킬 것)
- **테스트 (2026-11-26 사용자 결정: 브라우저 테스트는 요청할 때만)**: 평소엔 `npm test`(단위, 몇 초) + `npm run build` 만. `npm run check`(단위 + 브라우저 Playwright, 15~20분 — 빌드를 띄워 조작하고 화면을 `test-results/screens/` 에 저장)는 **사용자가 따로 요청할 때만** 돌린다. GitHub Actions 도 PR·main 에서는 단위 테스트·빌드만(`test` 잡), 브라우저 테스트는 Actions 'Run workflow' 에서 e2e 를 켤 때만(4대에 나눠 동시에 — `--shard`, 테스트 화면은 `test-screens-1~4`)
- `node tools/balance-sim.cjs ['{"hpGrowth":1.08}'] ['{"atk":10}']` — 밸런스 봇. 1번째 JSON: BALANCE 덮어쓰기(monster 키는 monster 에), 2번째: 명성 강화 레벨(없으면 강화 0). 기본은 대기석을 쓰는 봇, `RESERVE=0` 이면 안 씀. 먼저 `npm run build && npx vite preview --port 4173`
- 데이터를 고친 뒤 문서 다시 만들기: `node tools/gen-roster-doc.mjs`(로스터 → `docs/ROSTER.md`) · `node tools/gen-skill-doc.mjs` · `node tools/gen-upgrade-doc.mjs` · `node tools/gen-art-doc.mjs`
- **배포**: `main` 에 push 하면 GitHub Actions 가 테스트 통과 시에만 빌드·배포 → https://duto-ch.github.io/RTD/ (브라우저 테스트를 돌렸으면 화면은 Actions 결과의 `test-screens-1~4`)
- 브라우저 콘솔 디버그: `game.scene.getScene('Game')` → `g.gold += 1000`, `g.startWave(10)`, `g.endGame(true)`. `window.__rtd` 에 ROSTER·audio·setArt·setFacing·meta (`__rtd.meta.addFame(100)`, `__rtd.meta.reset()`)
- 작업을 끝낼 때 Stop 훅(`.claude/hooks/missed-changes.py`)이 빠뜨린 후속 작업을 알린다 — 수동 확인 `python3 .claude/hooks/missed-changes.py --print`
- `node tools/ui-audit.cjs` — UI 글자 정렬 점검 (1920x1080 한 화면, UI 좌표로 봄) (장면별 표 + `ui-audit/` 화면, 문제 글자에 빨간 상자) + **곡선 UI 8배 확대 그림** `ui-audit/pc-game-round.png`·`pc-lobby-round.png` (원·알약을 눈으로 확인)
- `node tools/export-psd.cjs [폴더]` — 지금 전투 화면을 레이어로 나눈 PSD(1920x1080, 약 200장 — UI 는 글자·판·칸·아이콘·도형 낱개마다, 버튼·카드·배지는 그룹, 전장은 땅·나무·필드·몬스터·이펙트 한 장씩 + 용병 한 명씩) + 레이어 PNG. 레이어 이름은 HUD 속성명·`drawIcon` 이름·`layerName` 으로 붙는다. 먼저 빌드 + preview, `pip install psd-tools`. 게임을 `?transparent=1` 로 띄워 바탕을 투명하게 찍는다
- 데스크톱(Electron) 판: `cd desktop && npm ci && npm run build:web` → `npm start`(실행) · `npm run pack:win`(Windows .exe) · `xvfb-run -a -s "-screen 0 1920x1080x24" node test/smoke.cjs`(시험). Windows 판은 GitHub Actions 'Desktop Build' 로도. 세부 `docs/DESKTOP.md`
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
3. **검사** — `npm test` + `npm run build` (브라우저 테스트 `npm run check` 는 사용자가 요청할 때만, 2026-11-26). 실패하면 원인을 고치고 3번을 다시 돈다. 통과할 때까지 반복. 새 기능의 e2e 테스트는 여전히 써 두되 돌리는 건 요청 때
4. **눈으로 확인** — (브라우저 테스트를 돌렸을 때) `test-results/screens/*.png` 를 열어 UI 겹침·잘림·색을 본다. 새 화면이면 e2e 에 스크린샷을 추가한다.
   **UI 를 바꿨으면 글자 정렬 점검 (2026-11-21 사용자 요청, 항상)**: `node tools/ui-audit.cjs` (빌드 + `npx vite preview --port 4173` 먼저) — 화면 밖·겹침·패널 여백 한쪽 쏠림·버튼 글자 가운데·아이콘과 글자 겹침·**요소 사이 여백 4px 미만(`gap`, 필수 규칙)**이 0 이어야 하고, `ui-audit/*.png` 를 열어 좌우·상하 간격을 눈으로도 맞춘다. 스크롤 목록(마스크)은 컨테이너에 `maskRect`, 일부러 비낀 글자·버튼은 `auditOk = true`
5. **밸런스에 영향**이 있으면 `node tools/balance-sim.cjs` 를 2~3회 돌려 도달 웨이브를 기록한다 (`docs/GDD.md` 밸런스 메모).
6. **문서** — 결정이 바뀌면 `CLAUDE.md`(해당 줄 고치기)·`docs/GDD.md` 갱신, 진행 기록은 `docs/HISTORY.md` 맨 아래 한 줄. 데이터가 바뀌면 위 문서 생성 명령.
7. **커밋·푸시** — 작업 브랜치에서. `main` 에 push 하면 GitHub Actions 가 테스트를 통과한 경우에만 배포한다.
8. **main 에 합치기 (2026-11-26 사용자 결정 — 여러 세션이 동시에 합쳐도 검사 안 된 조합이 들어가지 않게)** — 사용자가 "합쳐" 할 때만. ① main 다시 받아 합치기 + `npm test`·`npm run build` ② PR 만들기 ③ **PR 을 합치기 직전에 main 이 그사이 바뀌었는지 다시 본다**(`gh api repos/<owner>/<repo>/compare/main...<브랜치> --jq .behind_by` 가 0 이어야 함) — 바뀌었으면 main 을 다시 받아 합치고 push, **PR 의 GitHub 테스트(`test`)가 통과한 뒤** 합친다(로컬 전체 검사를 또 돌리지 않아도 됨) ④ 합친 뒤 main 배포 결과 확인. main 보호 규칙('테스트 통과 + 최신 상태여야 합치기', 관리자 포함)이 켜져 있으면 GitHub 이 ③을 강제한다 — 합치기가 거절되면(최신 아님·테스트 미통과) ③부터 다시
