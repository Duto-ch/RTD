# 에릭 (레드 궁수, `merc_archer_red`) — Pixelorama 시범

시그리드(블루 궁수) 시트를 레드 팔레트로 바꾼 **초안**. Pixelorama 에서 사람이 다듬은 뒤 게임에 넣는다.

| 파일 | 내용 |
|---|---|
| `eric_draft.png` | 초안 시트 504x24 — 28x24 프레임 18장 한 줄 (0~8 대기, 9~17 공격) |
| `eric_draft.gif` | 미리보기 (대기 2번 + 공격 1번) |
| `rtd_red.gpl` | 레드 속성 고정 12색 팔레트 (Pixelorama·Aseprite·GIMP 에서 불러오기) |

## 바뀐 색
옷 파랑 → 빨강 3단, 머리 → 갈색(같은 팔레트의 가죽 색, 빨간 옷과 대비), 금속 → 금빛 강조. 피부·외곽선·가죽은 그대로. 사용 색 11개, 모두 `rtd_red.gpl` 안.

## Pixelorama 에서 다듬기
1. **열기**: File → Import → `eric_draft.png` → 가져오기 방식 **Spritesheet (new tab)**, 가로 프레임 **18**, 세로 **1**.
2. **팔레트**: 팔레트 패널에서 `rtd_red.gpl` 불러오기. 이 12색만 쓴다 (게임 사양).
3. **다듬을 곳 (제안)**: 시그리드와 다른 사람으로 보이게 — 머리 모양(짧은 머리·수염 등), 망토·옷 무늬, 화살통 위치. 동작(포즈)은 그대로 두면 공격 타이밍이 맞는다.
4. **내보내기**: File → Export → Spritesheet, **한 줄(1행 18열)**, PNG, 배율 1x. 프레임 크기 28x24·순서는 바꾸지 않는다.

메뉴 이름은 Pixelorama 버전에 따라 조금 다를 수 있다.

## 게임에 넣기
다듬은 PNG 를 `public/assets/custom/mercs/eric.png` 로 두고 `manifest.json` 에 `merc_archer_red` 항목(시그리드와 같은 형식, `pivotX` 12)을 추가한다.
