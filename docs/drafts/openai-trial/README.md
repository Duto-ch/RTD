# OpenAI 이미지 API 캐릭터 시험 (2026-11-17)

`NODE_USE_ENV_PROXY=1 node tools/gen-art-openai.mjs <id...>` (gpt-image-2, medium, 1024x1024, 흰 배경 — 투명 배경은 이 모델이 지원 안 함) → `art-inbox/raw/<id>.png`

- `v1-raw.png`: 첫 프롬프트("16x16 sprite …"). 그림은 좋지만 실제 도트 격자는 캐릭터 높이 55~90px
- `v1-shrink-compare.png`: 그걸 24px·16px 로 줄이면 뭉개진다
- `v2-raw.png`: "16픽셀 높이, NES·게임보이처럼" 으로 강하게 바꾼 프롬프트 — 여전히 높이 약 45~60px (모델이 16x16 을 따르지 않음)
- `v2-ingame.png`: v2 를 perfectPixel 로 정리해 실제 전투 칸(64px)에 넣어 본 모습 (에릭·올라프·엘리아스·이졸데) — 다른 그림(4px 도트)보다 훨씬 촘촘하다

결론 대기: 촘촘한 그림을 그대로 쓸지(밀도 차이) / PixelLab 등으로 정확한 크기 / 다른 방법 — 사용자 결정
