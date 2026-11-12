# 직접 그린 이미지·애니메이션 넣기

게임의 그림은 기본적으로 코드로 그려지지만, **`public/assets/custom/` 에 PNG 를 넣고 `manifest.json` 에 적으면** 그 그림으로 바뀝니다.
적지 않은 그림은 원래 그림 그대로 나오므로, 하나씩 천천히 바꿔도 됩니다.

## 1. 그림 규격

- **투명 배경 PNG**
- 게임 화면에서 **4배로 확대**되므로 아래 크기 그대로 그립니다 (더 크게 그리면 다른 그림보다 촘촘해 보입니다)

| 종류 | 한 프레임 크기 |
|---|---|
| 용병·영웅 | 16×16 |
| 일반·정예 몬스터 | 12×12 |
| 보스 | 16×16 (최종 보스 20×20) |
| 유물 아이콘 | 10×10 |
| 지역 배경 | 136×240 |

## 2. 애니메이션 (스프라이트 시트)

여러 프레임은 **가로 한 줄로 이어 붙인 한 장의 PNG** 로 만듭니다. 예: 16×16 프레임 5개 → 80×16 PNG (왼쪽부터 0, 1, 2, 3, 4번 프레임)

| 대상 | 애니메이션 이름 | 언제 재생되나 |
|---|---|---|
| 용병·영웅 | `idle` | 평소 (반복) |
| 용병·영웅 | `attack` | 기본 공격할 때 한 번 → 끝나면 `idle` 로 |
| 몬스터 | `walk` | 이동 중 (반복) |

- 애니메이션을 안 적으면 0번 프레임이 정지 그림으로 쓰입니다.
- `attack` 이 없으면 원래처럼 살짝 튀어 오르는 동작, `walk` 가 있으면 원래의 깡충 동작은 꺼집니다.

## 3. manifest.json 쓰는 법

`public/assets/custom/manifest.json`

```json
{
  "sprites": {
    "hero_isolde": {
      "file": "heroes/isolde.png",
      "frameWidth": 16,
      "frameHeight": 16,
      "animations": {
        "idle":   { "frames": [0, 1], "fps": 3, "loop": true },
        "attack": { "frames": [2, 3, 4], "fps": 12 }
      }
    },
    "mon_slime_red": {
      "file": "monsters/slime_red.png",
      "frameWidth": 12,
      "frameHeight": 12,
      "animations": { "walk": { "frames": [0, 1], "fps": 6, "loop": true } }
    },
    "relic_war_drum": { "file": "relics/war_drum.png" }
  }
}
```

- 키(`hero_isolde` 등)는 아래 **교체 가능한 키 목록** 에서 고릅니다.
- `file` 은 `public/assets/custom/` 기준 경로입니다.
- 애니메이션이 없는 한 장짜리 그림은 `frameWidth`·`frameHeight` 없이 `file` 만 적어도 됩니다.
- `fps` 는 초당 프레임 수, `loop: true` 는 반복입니다.
- 이름이 `_` 로 시작하는 항목은 무시됩니다 (메모용).

## 4. 올리는 방법

**GitHub 웹사이트에서 (프로그램 설치 필요 없음)**
1. 저장소에서 `public/assets/custom/` 폴더로 이동 → **Add file → Upload files** → PNG 를 끌어다 놓고 **Commit changes**
2. 같은 폴더의 `manifest.json` 을 열고 연필(편집) 아이콘 → 항목 추가 → **Commit changes**
3. 1~2분 뒤 https://duto-ch.github.io/RTD/ 에 자동 반영 (새로고침)

또는 채팅으로 PNG 를 보내면 Claude 가 크기 확인·이름 맞추기·실제 화면 캡처까지 해서 넣습니다.

**확인 방법**: 브라우저 개발자 도구 콘솔에 `[custom art] 2/2개 이미지 교체` 처럼 나옵니다. 파일을 못 찾으면 `[custom art] 이미지를 불러오지 못함: …` 경고가 나오고 그 그림만 원래대로 나옵니다.

## 교체 가능한 키 목록

<!-- 아래 목록은 node tools/gen-art-doc.mjs 로 자동 생성 -->

### 용병 (16×16 · 애니메이션 idle / attack)

| 키 | 용병 |
|---|---|
| `merc_archer_red` | 에릭 (레드 궁수) |
| `merc_archer_blue` | 시그리드 (블루 궁수) |
| `merc_archer_green` | 로빈 (그린 궁수) |
| `merc_mage_red` | 브리짓 (레드 마법사) |
| `merc_mage_blue` | 올라프 (블루 마법사) |
| `merc_mage_green` | 프레야 (그린 마법사) |
| `merc_sniper_red` | 군나르 (레드 저격수) |
| `merc_sniper_blue` | 에드먼드 (블루 저격수) |
| `merc_sniper_green` | 토르발드 (그린 저격수) |
| `merc_shaman_red` | 헬가 (레드 주술사) |
| `merc_shaman_blue` | 잉그리드 (블루 주술사) |
| `merc_shaman_green` | 아스트리드 (그린 주술사) |
| `merc_rogue_red` | 로완 (레드 도적) |
| `merc_rogue_blue` | 핀 (블루 도적) |
| `merc_rogue_green` | 레이프 (그린 도적) |

### 영웅 (16×16 · 애니메이션 idle / attack)

| 키 | 영웅 |
|---|---|
| `hero_ragnar` | 라그나르 (레드 전쟁군주) |
| `hero_isolde` | 이졸데 (레드 대마법사) |
| `hero_bjorn` | 비요른 (레드 전설의 사냥꾼) |
| `hero_arthur` | 아서 (블루 전쟁군주) |
| `hero_solveig` | 솔베이그 (블루 대마법사) |
| `hero_william` | 윌리엄 (블루 전설의 사냥꾼) |
| `hero_halvard` | 할바르드 (그린 전쟁군주) |
| `hero_freydis` | 프레이디스 (그린 대마법사) |
| `hero_richard` | 리처드 (그린 전설의 사냥꾼) |

### 일반 몬스터 (12×12 · 애니메이션 walk) — 속성마다 1장씩 (`_red` / `_blue` / `_green`)

| 키 (레드 예시) | 이름 | 등장 |
|---|---|---|
| `mon_slime_red` | 슬라임 | 1~5 웨이브 |
| `mon_bat_red` | 박쥐 | 6~10 웨이브 |
| `mon_mushroom_red` | 버섯 | 11~15 웨이브 |
| `mon_goblin_red` | 고블린 | 16~20 웨이브 |
| `mon_skeleton_red` | 해골 병사 | 21~25 웨이브 |
| `mon_wolf_red` | 늑대 | 26~30 웨이브 |
| `mon_ghost_red` | 유령 | 31~35 웨이브 |
| `mon_spider_red` | 거미 | 36~40 웨이브 |
| `mon_lizard_red` | 도마뱀 | 41~45 웨이브 |
| `mon_imp_red` | 임프 | 46~50 웨이브 |
| `mon_eye_red` | 눈알 마물 | 51~55 웨이브 |
| `mon_beetle_red` | 딱정벌레 | 56~60 웨이브 |
| `mon_snake_red` | 독사 | 61~65 웨이브 |
| `mon_golem_red` | 돌 골렘 | 66~70 웨이브 |
| `mon_harpy_red` | 하피 | 71~75 웨이브 |
| `mon_jelly_red` | 해파리 | 76~80 웨이브 |
| `mon_wraith_red` | 망령 기사 | 81~85 웨이브 |
| `mon_gargoyle_red` | 가고일 | 86~90 웨이브 |
| `mon_hound_red` | 지옥견 | 91~95 웨이브 |
| `mon_void_red` | 공허체 | 96~100 웨이브 |

### 정예 몬스터 (12×12 · 애니메이션 walk) — 속성마다 1장씩 (`_red` / `_blue` / `_green`)

| 키 (레드 예시) | 이름 | 등장 |
|---|---|---|
| `mon_e_slime_red` | 뿔 슬라임 | 5 웨이브 |
| `mon_e_mushroom_red` | 버섯 기사 | 15 웨이브 |
| `mon_e_skeleton_red` | 해골 기사 | 25 웨이브 |
| `mon_e_ghost_red` | 유령 군주 | 35 웨이브 |
| `mon_e_lizard_red` | 리자드맨 전사 | 45 웨이브 |
| `mon_e_eye_red` | 감시자 | 55 웨이브 |
| `mon_e_golem_red` | 골렘 대장 | 65 웨이브 |
| `mon_e_griffin_red` | 그리폰 | 75 웨이브 |
| `mon_e_deathknight_red` | 데스 나이트 | 85 웨이브 |
| `mon_e_demon_red` | 악마 | 95 웨이브 |

### 보스 (16×16, 최종 보스 20×20 · 애니메이션 walk) — 속성마다 1장씩 (`_red` / `_blue` / `_green`)

| 키 (레드 예시) | 이름 | 등장 |
|---|---|---|
| `mon_b_slimeking_red` | 슬라임 왕 | 10 웨이브 |
| `mon_b_goblinchief_red` | 고블린 족장 | 20 웨이브 |
| `mon_b_lich_red` | 리치 왕 | 30 웨이브 |
| `mon_b_spiderqueen_red` | 거미 여왕 | 40 웨이브 |
| `mon_b_treant_red` | 고대 거목 | 50 웨이브 |
| `mon_b_minotaur_red` | 미노타우로스 | 60 웨이브 |
| `mon_b_kraken_red` | 크라켄 | 70 웨이브 |
| `mon_b_dragon_red` | 고룡 | 80 웨이브 |
| `mon_b_darklord_red` | 마왕의 기사 | 90 웨이브 |
| `mon_b_voidemperor_red` | 공허의 황제 | 100 웨이브 |

### 유물 아이콘 (10×10)

| 키 | 유물 |
|---|---|
| `relic_war_drum` | 전쟁의 북 |
| `relic_hero_sword` | 용사의 검 |
| `relic_hawk_eye` | 매의 눈 |
| `relic_golden_grail` | 황금 성배 |
| `relic_red_orb` | 홍염의 보주 |
| `relic_blue_orb` | 창해의 보주 |
| `relic_green_orb` | 녹림의 보주 |
| `relic_frost_crown` | 서리 왕관 |
| `relic_contract` | 용병 계약서 |
| `relic_lucky_coin` | 행운의 동전 |

### 지역 배경 (136×240, 화면 전체)

| 키 | 지역 |
|---|---|
| `bg_grass` | 초원 |
| `bg_desert` | 사막 |
| `bg_autumn` | 가을 숲 |
| `bg_volcano` | 화산 지대 |
| `bg_snow` | 설원 |
| `bg_swamp` | 늪지대 |
| `bg_crystal` | 수정 동굴 |
| `bg_graveyard` | 망자의 묘지 |
| `bg_sky` | 천공의 섬 |
| `bg_void` | 공허의 끝 |

### 기타

| 키 | 크기 | 설명 |
|---|---|---|
| `icon_coin`, `icon_skull` | 8×8 | 동전·해골 아이콘 |
| `arrow_red`, `orb_red`, `dagger_red`, `rune_red`, `proj_red` | 작은 크기 | 레드 투사체 (화살·마력구·단검·룬·기본) |
| `arrow_blue`, `orb_blue`, `dagger_blue`, `rune_blue`, `proj_blue` | 작은 크기 | 블루 투사체 (화살·마력구·단검·룬·기본) |
| `arrow_green`, `orb_green`, `dagger_green`, `rune_green`, `proj_green` | 작은 크기 | 그린 투사체 (화살·마력구·단검·룬·기본) |
