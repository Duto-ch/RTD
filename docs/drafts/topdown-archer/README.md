# 탑뷰 궁수 사격 모션 (시안)

pixelfx(patch-gg/pixelfx, MIT)로 코드로 그린 **위에서 내려다본 궁수** 사격 모션. 게임에는 아직 연결하지 않은 시안이다.

| 파일 | 내용 |
|---|---|
| `anim.gif` | 미리보기 (2회 반복) |
| `topdown-archer.png` | 스프라이트 시트 (투명 배경, 128x48 프레임 45장) |
| `topdown-archer.json` | Aseprite 형식 프레임 정보 — `meta.pixelfx` 에 fps(30)·loop·pivot |
| `topdown-archer.js` | 원본 코드 (pixelfx 의 `src/fx/moves/` 에 넣고 렌더) |

## 모션 (1.5초 반복)
화살통에서 화살 꺼내기 → 활 들기 → 볼까지 당기기 → 조준(떨림·화살촉 반짝) → 0.8초 발사(시위 떨림·섬광·공기 자국) → 활 내리고 처음 자세로.

## 쓰는 법
- 오른쪽을 보고 그렸고 회전 중심은 몸 가운데(`pivot`). 적 방향으로 스프라이트를 **회전**하면 모든 방향을 겨눈다.
- 시트 안의 화살은 화면 끝에서 사라진다. 게임에서는 발사 시점(0.8초)부터 실제 투사체로 바꿔 쓴다.
- ⚠️ 현재 게임 유닛은 옆모습(28x24, 좌우 반전) 사양이라 그대로는 맞지 않는다. 탑뷰 연출을 쓸지 결정 후 픽셀 밀도(3px)에 맞춰 다시 렌더한다.

## 다시 렌더하기
```bash
git clone https://github.com/patch-gg/pixelfx
cp topdown-archer.js pixelfx/src/fx/moves/
cd pixelfx && node tools/render.mjs moves/topdown-archer --gif --sheet
```
옵션으로 색을 바꿀 수 있다: `--opts '{"palette":["#1a2340","#2c3f73","#4f6fb8","#8fb0ec"]}'` (두건·망토 색).
