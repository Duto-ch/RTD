# 동전 드랍 연출 3종 (시안)

pixelfx(patch-gg/pixelfx, MIT)로 코드로 그린 동전 드랍 연출. **2번(흩뿌림)이 게임에 적용됨** (2026-11-15): 동전 5개·흩어짐 절반(`--opts '{"coins":5,"spread":0.5}'`)으로 렌더해 테두리를 잘라낸 시트가 `public/assets/fx/coin_drop.png` (44x50, 46프레임, 24fps). 1·3번은 시안.
필드가 위에서 비스듬히 내려다보는 시점이라, 동전은 바닥 위치(가로·세로) + 높이로 움직이고 바닥에 그림자가 진다.

| 시안 | 미리보기 | 크기·길이 | 쓰임(제안) |
|---|---|---|---|
| 1. 동전 하나 튀어오름 (`rtd-coin-pop`) | `pop.gif` | 40x64, 1.3초 | 일반 몬스터 처치 — 튀어올라 두 번 튀고 반짝인 뒤 위로 빨려 올라감(획득) |
| 2. 동전 흩뿌림 (`rtd-coin-scatter`) | `scatter.gif` | 88x80, 1.9초 | 정예 처치·골드 스킬 — 6개가 사방으로 튀었다가 바닥에 멈춰 반짝이고 하나씩 사라짐 |
| 3. 동전 소나기 (`rtd-coin-shower`) | `shower.gif` | 104x116, 2.3초 | 보스 처치·웨이브 보상 — 금빛 고리 → 동전 14개가 쏟아져 더미 → 반짝이며 사라짐 |

- 각 `rtd-coin-*.png` + `.json` 은 투명 스프라이트 시트(Aseprite 형식, `meta.pixelfx` 에 fps 24·기준점). 기준점 = 바닥(몬스터 발밑)
- 아트 1px 기준이라 게임에 넣을 때는 캐릭터와 같은 3배(`UI_PX`)로 표시
- 공용 동전 그림·튀기기 계산은 `_rtdcoin.js`

## 다시 렌더하기
```bash
git clone https://github.com/patch-gg/pixelfx
cp _rtdcoin.js rtd-coin-*.js pixelfx/src/fx/spawn/
cd pixelfx && node tools/render.mjs "spawn/rtd-coin-*" --gif --sheet
```
색은 `--opts '{"palette":[...8색, 어두운→밝은]}'`, 동전 수는 `{"coins":8}` 로 바꿀 수 있다.
