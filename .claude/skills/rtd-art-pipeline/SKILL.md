---
name: rtd-art-pipeline
description: 용병단 디펜스(RTD) 그림·이펙트 작업 절차 — 캐릭터 104명 시트, 스킬 이펙트(커먼·언커먼 공용 세트, 레어·유니크 전용 136개), 필드 배경 스킨, AI 이미지 정리(perfectPixel)·PixelLab 를 만들거나 다시 만들어 게임에 넣을 때 쓴다.
---

# RTD 그림·이펙트 파이프라인

규칙 문서: 캐릭터 `docs/CHARACTER_ART.md` · 스킬 이펙트 `docs/VFX_STYLE.md` · 교체 가능한 키 `docs/CUSTOM_ART.md`.
만든 뒤에는 늘 `npm run check` 와 `test-results/screens/` 눈 확인.

## 캐릭터 104명
- 다시 만들기: `python3 docs/drafts/roster-art/roster_art.py && python3 tools/import-roster-art.py`
  → `public/assets/custom/chars/<id>.png` + manifest `char_<id>` (프레임 56x40, 대기 8 + 공격 28, 프레임별 길이 `ms`, `facing: "left"`, 몸 중심 27,23)
- 예외 3명(2026-11-20): 아서·이졸데·오베론은 몸 그림을 `docs/drafts/pixellab-rule-test/` 의 새 비율 그림으로 바꿔 넣는다 (`CUSTOM_BODY`, 머리/몸 나누는 줄 19·눈 (9,15)(13,15)) + 전용 무기 `UNIQUE_WPN` + 무기 바깥으로 `WPN_DX`
- `roster_art.py`: 캐릭터 설명(look) 키워드로 머리 모양·장식·수염·망토·날개·무기(31종 변형 `weapons_v2.py`)·방패를 정한다. 몸 색 수 `BODY_COLORS`(등급별 10·12·14·15)
- 시안 출신 8명(카이라·베로나 등)은 `docs/drafts/char-13/anim.py` 그림을 그대로 쓴다(사용자 그림 `edit/`). 열람 https://claude.ai/artifact/KM2FJB4RDdDhGkQYhpEGBN
- 도감(104명, 게임 크기 2px) https://claude.ai/artifact/WgsXZqDagZNaDmox6BUBAz

## 스킬 이펙트
- 커먼·언커먼 공용 세트: `python3 docs/drafts/skill-fx/sets/fxset.py && python3 tools/import-fx-sets.py` → `public/assets/fx/sets/` + `src/data/fxSets.js` (재생 `vfx.setSkill`/`vfx.playSet`, `_back` 시트는 캐릭터 뒤 바닥 레이어)
- 레어·유니크 전용 136개: `python3 docs/drafts/skill-fx/signature/sig.py && python3 tools/import-fx-sig.py` → `public/assets/fx/sig/` + `src/data/fxSig.js` (재생 `vfx.sigSkill`, 키 = 스킬 def.id). 캐릭터 상징은 `docs/drafts/skill-fx/signature/motifs.py`
- 예전 PixelLab 시트 이펙트(`src/data/fx.js`, `public/assets/fx/*.png`): 원본 수정은 `mcp__pixellab__vfx_workbench start --effect <id>` → export → PNG 교체

## 유물 아이콘
- 30종 전용 그림 12x12 (2026-11-20 룰 v2: 10종 → 30종) 아트 px(게임에서 2px): `python3 docs/drafts/relic-icons/relics.py` → `public/assets/custom/relics/<id>.png` + manifest `relic_<id>` (미리보기 `preview.png`). 새 유물을 추가하면 이 스크립트에 모양을 더한다

## 공격 모션 28프레임 (2026-11-21 전체 적용)
- 캐릭터 104명(시안 출신 8명 포함)의 공격은 28프레임 — `roster_art.py` 가 실행될 때 `anim28.install()` 로 공격 함수를 바꿔 끼운다(검·도끼·망치 휘두르기 · 창 찌르기 · 단검 두 번 찌르기 · 지팡이 시전 · 활 · 총·석궁). 대기 8프레임은 그대로
- 타격·발사 프레임 `anim28.HIT28` → roster-art.json `attack.hit` → manifest. 동작을 고치면 이 번호도 맞출 것
- 무기 6종 비교 열람(예전 시안): `python3 docs/drafts/anim28/anim28.py && python3 docs/drafts/anim28/build_view.py`, https://claude.ai/artifact/TZu9ERnEZPFF2mJpixyfzT

## 필드 배경
- 코드 생성(`src/art/textures.js`): 지역 배경 `bg_<지역>` · 석판 `field_tile_*` · 성벽 `field_wall` (`WALL_RADIUS`·`FLOOR_RADIUS`·`PATH_JITTER`). manifest 스킨으로 교체 가능, 예시 `docs/drafts/field-skin/`

## 배경 장식 (움직이는 나무, 2026-11-21 · 2026-11-22 새 나무 3종)
- 초원 나무 3종: 사용자 그림 `docs/drafts/tree-sway/tree_1~3.png`(50x50) → `python3 docs/drafts/tree-sway/sway.py` 가 그림마다 28프레임 흔들림(밑동 고정·위로 갈수록 최대 ±2px, 녹색 잎 안쪽만 1px 바스락, 원본 색·반투명 그대로, 밑동 pivot 자동) 시트를 만들고 `public/assets/custom/deco/tree_sway_<n>.png` + manifest `deco_tree_<n>` 에 넣는다. 새 나무는 `TREES` 에 한 줄
- 초원 배치는 `python3 docs/drafts/tree-sway/scatter.py [그루 수] [씨앗]` 이 `src/data/decor.js` 에 쓴다(필드·길만 피해 화면 전체에 포아송 흩뿌리기, 종류 섞기)
- 그리기 `src/art/decor.js`(`addBiomeDecor`·`swapBiomeDecor`, 몬스터 아래 층, `flip` 지원). 새 지역 장식도 같은 방식으로 키를 더한다

## 외부 그림 도구
- **perfectPixel** (`.claude/skills/perfectpixel/`): AI "픽셀 풍" 이미지를 진짜 격자로 정리 — `python3 .claude/skills/perfectpixel/pp.py in.png out.png --preview 8 --key-white --colors 12` (`pip install "perfect-pixel[opencv]" pillow`)
- **PixelLab MCP** (`.mcp.json`): 토큰은 저장소에 넣지 않는다 — `Bearer proxy-injected` 자리에 클라우드 환경 비밀값이 들어간다
- OpenAI 이미지 API: `tools/gen-art-openai.mjs`

## 확정 그림 규칙 (CLAUDE.md 에서 옮김, 2026-11-20 — 결정이 바뀌면 여기를 고친다)
- **필드 레이어 (2026-11-17)**: 지역 배경 `bg_<지역>`(땅·장식·흙길) → 석판 25칸 `field_tile_light`/`field_tile_dark`(24×24, 변형 `_b`·`_c`) → 성벽 링 `field_wall` 을 따로 쌓는다(`GameScene.createFieldLayers`). 성벽 바깥 모서리·바닥(석판) 네 모서리 둥글게(반지름 20·8도트 `WALL_RADIUS`·`FLOOR_RADIUS`, 벽돌 줄·성가퀴가 곡선을 따라 돌고 돌 색 한 단계 밝게), 몬스터 길 바깥 가장자리는 저주파 노이즈로 들쭉날쭉(±2.5도트 `PATH_JITTER`), 길 안쪽은 성벽 바로 밑까지 흙으로 덮음(2026-11-18). 각 레이어는 manifest 로 **스킨**을 씌워 바꿀 수 있다 (`docs/CUSTOM_ART.md`)
- **성문 (2026-11-21)**: 성벽 동서남북 가운데에 성문 — 둥근 탑 2개(성가퀴 고리·깃발) + 나무 두짝 문(쇠띠·금 문고리), 가로 36 × 성벽 두께 11 아트 px 안에만(길·석판 안 가림). 깃발 색 북 빨강·동 파랑·남 초록·서 금. `textures.js` `paintGates`(`paintWall` 끝에서), 시안 `docs/drafts/wall-gates/`
- **캐릭터 그림 (진행 중)** — 규칙은 **`docs/CHARACTER_ART.md`**(확정·현재 값·결정 대기 구분). 요약: 캔버스 24x24, 2등신·두상 크기 동일, **본체 13x13(확정)** + 위쪽 장식 공간, 월드 플리퍼 풍, 키 컬러 RGB, **팔 없음 + 둥근 손 4x4·무기 레이어 = 모든 캐릭터 공통 기준(확정)**(손은 몸통과 겹쳐도 됨), **무기는 별도 레이어·캐릭터 왼쪽·데포르메·대기 때 대각선**, 비스듬한 무기는 각도마다 새로 찍기, 방패는 오른쪽·쥔 손 숨김, **눈은 세로 1×2**(베로나처럼), **발밑은 검은 줄 대신 신발 그늘색**(로브는 옷 그늘색), 대기 숨쉬기·깜빡임 + 공격 예비·잔상·타격 멈춤, 마지막 프레임 = 대기 자세. **게임에 적용(2026-11-18)**: 104명 모두 시안 그림, 도트 1px = 화면 2px, 그림은 왼쪽을 보고 오른쪽 대상이면 반전
  - **몸 색 수는 등급별 (2026-11-18)**: 무기·손 제외 몸만 커먼 10 · 언커먼 12 · 레어 14 · 유니크 15색 이하(`BODY_COLORS`). 나머지 색 설정(외곽선 `#2b1d2f` 등)은 그대로. 시안 출신 8명은 아직 미적용
  - **마녀 고깔모자**는 모두 베로나(사용자 그림 v2)의 모자 모양 그대로, 색만 옷 색으로 (사용자 결정)
- **로비·UI 화풍**: 동화풍 플랫 일러스트를 도트로 정리한 방향 — 2026-11-21 부터 게임 안 모든 도트는 2px (로비 272x480·640x360 그림을 2배) (`docs/drafts/lobby-style/battle-3-pixel.png`)
- **스킬 이펙트 새 규칙 (2026-11-18, `docs/VFX_STYLE.md`)**: 탑뷰 · 셀 카툰풍 · 16비트 기본 5색(필요하면 +1, 최대 6) · 그라데이션·반투명 금지 · 외곽선은 계열 진한 색(검은 선 금지). **등급별 겹침**: 커먼끼리·언커먼끼리는 공용 세트로 겹쳐도 됨, 레어는 가급적 전용, 유니크는 완전 전용. **게임 적용(2026-11-18)**: 커먼 11종·언커먼 13종 공용 세트 × 속성 3색(`vfx.setSkill` 이 스킬 데이터로 고름 — 버프 범위·원형+감속/지속피해/밀치기/기절/약화·사거리 전체·연쇄·골드). **레어·유니크 전용(2026-11-18)**: 34명 스킬 136개 — 캐릭터 상징 × 스킬 모양별 연출, 같은 캐릭터 안 같은 모양은 변형으로 갈림 (`vfx.sigSkill` 이 스킬 def.id 로 고름)
- 그 밖의 이펙트: 명중·사망·화살·처치 동전·버프/디버프 상태(효과가 남아 있는 동안 반복)·레벨 업(0.44초)은 예전 PixelLab 플랫 시트(3~4색) 그대로. 스킬 연출은 위 새 규칙
