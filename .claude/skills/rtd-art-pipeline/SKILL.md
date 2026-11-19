---
name: rtd-art-pipeline
description: 용병단 디펜스(RTD) 그림·이펙트 작업 절차 — 캐릭터 104명 시트, 스킬 이펙트(커먼·언커먼 공용 세트, 레어·유니크 전용 136개), 필드 배경 스킨, AI 이미지 정리(perfectPixel)·PixelLab 를 만들거나 다시 만들어 게임에 넣을 때 쓴다.
---

# RTD 그림·이펙트 파이프라인

규칙 문서: 캐릭터 `docs/CHARACTER_ART.md` · 스킬 이펙트 `docs/VFX_STYLE.md` · 교체 가능한 키 `docs/CUSTOM_ART.md`.
만든 뒤에는 늘 `npm run check` 와 `test-results/screens/` 눈 확인.

## 캐릭터 104명
- 다시 만들기: `python3 docs/drafts/roster-art/roster_art.py && python3 tools/import-roster-art.py`
  → `public/assets/custom/chars/<id>.png` + manifest `char_<id>` (프레임 56x40, 대기 8 + 공격, 프레임별 길이 `ms`, `facing: "left"`, 몸 중심 27,23)
- `roster_art.py`: 캐릭터 설명(look) 키워드로 머리 모양·장식·수염·망토·날개·무기(31종 변형 `weapons_v2.py`)·방패를 정한다. 몸 색 수 `BODY_COLORS`(등급별 10·12·14·15)
- 시안 출신 8명(카이라·베로나 등)은 `docs/drafts/char-13/anim.py` 그림을 그대로 쓴다(사용자 그림 `edit/`). 열람 https://claude.ai/artifact/KM2FJB4RDdDhGkQYhpEGBN
- 도감(104명, 게임 크기 2px) https://claude.ai/artifact/WgsXZqDagZNaDmox6BUBAz

## 스킬 이펙트
- 커먼·언커먼 공용 세트: `python3 docs/drafts/skill-fx/sets/fxset.py && python3 tools/import-fx-sets.py` → `public/assets/fx/sets/` + `src/data/fxSets.js` (재생 `vfx.setSkill`/`vfx.playSet`, `_back` 시트는 캐릭터 뒤 바닥 레이어)
- 레어·유니크 전용 136개: `python3 docs/drafts/skill-fx/signature/sig.py && python3 tools/import-fx-sig.py` → `public/assets/fx/sig/` + `src/data/fxSig.js` (재생 `vfx.sigSkill`, 키 = 스킬 def.id). 캐릭터 상징은 `docs/drafts/skill-fx/signature/motifs.py`
- 예전 PixelLab 시트 이펙트(`src/data/fx.js`, `public/assets/fx/*.png`): 원본 수정은 `mcp__pixellab__vfx_workbench start --effect <id>` → export → PNG 교체

## 유물 아이콘
- 10종 전용 그림 12x12 아트 px(게임에서 2px): `python3 docs/drafts/relic-icons/relics.py` → `public/assets/custom/relics/<id>.png` + manifest `relic_<id>` (미리보기 `preview.png`). 새 유물을 추가하면 이 스크립트에 모양을 더한다

## 공격 모션 28프레임 (시안)
- `python3 docs/drafts/anim28/anim28.py && python3 docs/drafts/anim28/build_view.py` — 무기 6종 한 명씩, `roster_art.py` 의 공격 함수를 28프레임 버전으로 바꿔 끼워 그린다. 열람 https://claude.ai/artifact/TZu9ERnEZPFF2mJpixyfzT

## 필드 배경
- 코드 생성(`src/art/textures.js`): 지역 배경 `bg_<지역>` · 석판 `field_tile_*` · 성벽 `field_wall` (`WALL_RADIUS`·`FLOOR_RADIUS`·`PATH_JITTER`). manifest 스킨으로 교체 가능, 예시 `docs/drafts/field-skin/`

## 외부 그림 도구
- **perfectPixel** (`.claude/skills/perfectpixel/`): AI "픽셀 풍" 이미지를 진짜 격자로 정리 — `python3 .claude/skills/perfectpixel/pp.py in.png out.png --preview 8 --key-white --colors 12` (`pip install "perfect-pixel[opencv]" pillow`)
- **PixelLab MCP** (`.mcp.json`): 토큰은 저장소에 넣지 않는다 — `Bearer proxy-injected` 자리에 클라우드 환경 비밀값이 들어간다
- OpenAI 이미지 API: `tools/gen-art-openai.mjs`
