# 전투 HUD — AI 워크플로 시험

1. **구조 잡기** — `01-ia.md` (Claude, 지금 코드 기준 정보 구조·필수 요소·우선순위·제약) ✅
2. **와이어프레임** — `02-wireframe.md`: Stitch(옛 Galileo AI)·Relume 에 붙여넣을 프롬프트 + Claude 회색 와이어프레임 `wireframe-tall.png` ✅ (외부 도구 결과는 사용자 작업)
3. **디테일 수정** — `03-figma.md`: Figma 에 입힐 색·글꼴·오토 레이아웃 기준(게임 코드와 같은 값) — 사용자 작업
4. **코드 반영** — Figma 에서 확정한 숫자를 Claude 가 `src/ui/Hud.js` 배치 값으로 옮기고 테스트·캡처

게임 코드는 건드리지 않았다 (시험 문서만).
