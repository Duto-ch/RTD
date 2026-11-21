# 2단계 — 와이어프레임 (색 없이 뼈대만)

두 가지로 시험한다: **A. 외부 AI 도구**(사용자 계정) / **B. Claude 가 직접 그린 회색 와이어프레임**(`wireframe-tall.png`). 둘을 나란히 놓고 3단계로 가져갈 쪽을 고른다.

## A-1. Google Stitch (옛 Galileo AI) — 모바일 앱 화면에 맞음

모드: Mobile, 화면 크기 직접 지정이 되면 544x960(또는 비슷한 세로 9:16). 아래를 그대로 붙여넣는다.

```
Grayscale low-fidelity wireframe of a mobile tower-defense game battle HUD, portrait 544x960.
No colors, no images, no illustrations: gray boxes, placeholder text and simple icons only.

Keep the middle of the screen EMPTY (y 272–688): that is the battlefield, label it "Battlefield (no UI)".

Top, a rounded status card (y 16–136):
- row 1: large "WAVE 12" on the left; on the right a small timer pill "Next 18s" and a small button "Start now"
- row 2: coin icon + "1,250 G" on the left; on the right a wide wall-HP bar with "62 / 80" centered
- row 3: one small gray info line "Grassland · Field 34 · Next 167 +Boss · Best W30"

Below it, a thin strip (y 142–182): synergy chips on the left (3 small pills), 4 square relic slots on the right.

Bottom area:
- a thin item strip (y 732–772): button "Craft 30G" on the left, 10 small square item slots, "Tools 0" on the right
- a rounded bottom sheet (y 776–952):
  - a row of 6 equal shop cards (portrait box, name, "10G" price, two tiny trait circles, small lock icon)
  - below: three small square icon buttons "x1", "Menu", "Upgrade"; a wide button "Estate Lv.1 · 0/3 · Level up 20G"; a button "Reroll 20G"

Touch targets at least 44px. Thumb-reachable actions at the bottom.
```

## A-2. Relume — 웹사이트용이라 맞지 않을 가능성이 큼 (시험 항목)

Relume 은 사이트맵 → 섹션(헤더·히어로·카드 목록) 단위로 만든다. 게임 HUD 를 "한 페이지"로 속여 넣는다:

```
Site: "Mercenary Corps Siege — battle screen" (single page, mobile first).
Sections in order:
1. Status header: wave number, countdown timer with "Start now" button, gold amount, wall HP progress bar, one info line
2. Strip: synergy tags (left) and 4 relic slots (right)
3. Empty placeholder section "Battlefield" (tall, no content)
4. Item strip: craft button, 10 item slots, tool counter
5. Shop: 6 product cards in one row (image, name, price, 2 tags, lock)
6. Action bar: 3 small icon buttons (speed, menu, upgrade) + 2 large buttons (Estate level up, Reroll)
```

확인할 것: 섹션이 세로로만 쌓이고 카드 6장이 한 줄에 들어가는지, 가운데를 비워 두는지.

## B. Claude 회색 와이어프레임

`wireframe-tall.html`(원본) → `wireframe-tall.png`. 1단계 표의 요소·자리를 그대로 옮겼고 색은 회색 단계만.

## 비교 기준 (2단계 끝에 체크)
- [ ] 전장(가운데)을 비워 두었나
- [ ] P1 요소(웨이브·시간·골드·체력·상점·영지·리롤·배속)가 다 있나
- [ ] 상점 6칸이 한 줄인가
- [ ] 자주 누르는 버튼이 아래쪽인가
- [ ] Figma 로 가져왔을 때 프레임·오토 레이아웃으로 바로 쓸 수 있나 (그림 한 장이면 다시 그려야 함)
