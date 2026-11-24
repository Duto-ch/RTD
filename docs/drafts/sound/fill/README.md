# 전용 효과음 채우기 시안 (2026-11-24, 사운드 전담)

게임에 들어간 소리(`src/systems/audio.js`)를 오프라인으로 렌더한 미리 듣기. 실제 게임에서는 효과음 볼륨·마스터 압축이 더해진다.

- `horn_boss.mp3`·`horn_milestone.mp3`·`horn_final.mp3` — 보스 등장 전쟁나팔 '우우우우웅~' (한 음 길게, 보스 2.4초 · 강화 보스 2.8초 · 최종 보스 3.4초)
- `sampler.mp3` — 새 효과음을 0.6초 간격으로 이어 붙인 것:

| 시각 | 소리 | 함수 |
|---|---|---|
| 0:00.00 | 웨이브 시작 (일반) | `audio.waveStart('normal')` |
| 0:01.60 | 웨이브 시작 (정예) | `audio.waveStart('elite')` |
| 0:03.40 | 용병 판매 | `audio.sell` |
| 0:04.50 | 성벽 피격 (일반) | `audio.wallHit(false)` |
| 0:05.50 | 성벽 피격 (정예·보스) | `audio.wallHit(true)` |
| 0:06.70 | 성벽 체력 30% 경고 | `audio.wallWarn` (`wallHealth` 가 판단) |
| 0:08.10 | 용병·아이템 들기 | `audio.pick` |
| 0:08.90 | 용병 놓기 | `audio.place` |
| 0:09.70 | 시너지 단계 켜짐 | `audio.synergy` |
| 0:10.90 | 아이템 얻음 | `audio.itemGet` |
| 0:11.90 | 아이템 장착 | `audio.itemEquip` |
| 0:12.70 | 아이템 조합 완성 | `audio.itemCombine` |
| 0:14.10 | 해제 도구 | `audio.itemRemove` |
| 0:15.00 | 상점 잠금 | `audio.lock(true)` |
| 0:15.80 | 상점 잠금 풀기 | `audio.lock(false)` |
| 0:16.60 | 리롤 (전투·술집) | `audio.reroll` |
| 0:17.70 | 마정석 얻음 | `audio.gem` |
| 0:19.30 | 지역 바뀜 | `audio.regionChange` |
| 0:21.90 | 치명타 | `audio.crit` |
| 0:22.70 | 튜토리얼 말풍선 | `audio.tutorial` |
| 0:23.80 | 덱·유물 넣기 | `audio.toggle(true)` |
| 0:24.70 | 덱·유물 빼기 | `audio.toggle(false)` |
