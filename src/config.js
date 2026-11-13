// 화면 / 레이아웃 상수. 모든 배치는 4배 픽셀(아트 1px = 화면 4px) 격자에 맞춘다.
export const PX = 4;
export const GAME_W = 544; // 136 아트 px
export const GAME_H = 960; // 240 아트 px

export const GRID = 5;
export const CELL = 64; // 16 아트 px
export const FIELD_SIZE = GRID * CELL; // 320
export const FIELD_X = (GAME_W - FIELD_SIZE) / 2; // 112
export const FIELD_Y = 320;
export const WALL = 24; // 성벽 두께
export const PATH_OFF = 60; // 필드 가장자리 → 몬스터 이동 경로 중심선 거리
export const PATH_WIDTH = 56;

export const FONT = 'Galmuri11';

export const DEPTH = {
  bg: 0,
  monster: 10,
  merc: 20,
  projectile: 30,
  hpbar: 35,
  fx: 40,
  drag: 100,
  ui: 200,
  overlay: 1000
};

// ── 밸런스 (플레이테스트하며 조정) ────────────────
export const BALANCE = {
  startGold: 120,
  hireCost: 30,
  hireLv2Chance: 0.05, // 고용 시 2레벨 용병이 나올 확률
  maxActiveRelics: 4, // 동시에 활성화할 수 있는 유물 수
  sellRefund: 0.5, // 투자 골드 대비 판매 환급 비율
  mergeCost: { 2: 20, 3: 100, 4: 240, 5: 600 }, // 해당 레벨로 올릴 때 비용 (Lv3부터 2배, 2026-11-12)
  promoteCost: 1800, // Lv5 + Lv5 → 영웅 승급 비용 (2026-11-12 3배)
  levelDamage: [1, 2.5, 6, 14, 32], // 레벨별 공격력 배율
  elementAdvantage: 1.5,
  elementDisadvantage: 0.6,
  // 몬스터 체력 = hpBase × hpGrowth^(웨이브-1) × 종류 배율
  monster: {
    hpBase: 40, // 체력 공식의 기준값 (2웨이브 = 40×1.08 …)
    firstWaveHp: 34, // 1웨이브만 예외 (2026-11-13 사용자 결정, 다른 웨이브는 공식 그대로)
    hpGrowth: 1.08,
    eliteHpMult: 10,
    bossHpMult: 110, // 2026-11-12 사용자 결정
    // 이동 속도: 일반·정예 1.3배, 보스 1.5배 (2026-11-12)
    normalSpeed: 91,
    eliteSpeed: 72,
    bossSpeed: 33, // 경로 1바퀴 1760px → 약 53초
    // 일반·정예 이동 속도는 speedStepWaves 웨이브마다 speedStepMult 배 (보스 제외)
    speedStepWaves: 20,
    speedStepMult: 1.1,
    firstWaveCount: 50, // 1웨이브 일반 몬스터 수 (70웨이브 maxCount 까지 선형 증가)
    maxCount: 200,
    maxCountWave: 70,
    attrsPerWave: 2 // 한 웨이브에 나오는 몬스터 속성 종류 최대 수
  },
  // 보스 디버프: 보스마다 1~2개 능력을 랜덤 보유, 쿨타임마다 용병/영웅 여러 명에게 시전
  boss: {
    abilityCount: [1, 2],
    targetsBase: 2, // 대상 수 = targetsBase + floor(웨이브 / targetsPerWaves)
    targetsPerWaves: 20
  },
  // 강화 보스 웨이브 (30·60·90)
  milestone: {
    waves: [30, 60, 90],
    hpMult: 1.5, // 보스 체력 추가 배율
    abilityCount: 2, // 디버프 능력 개수 고정
    extraTargets: 2, // 디버프 대상 추가 인원
    extraElites: 10, // 함께 나오는 정예 수
    enrageAt: 0.5, // 체력 비율 이하에서 분노
    enrageSpeed: 1.3, // 분노 시 이동 속도 배율
    enrageCdMult: 0.5, // 분노 시 디버프 쿨타임 배율
    shiftEvery: 8, // 속성 변환 주기(초)
    relicChoices: 3 // 처치 시 유물 선택지 수
  },
  // 최종 보스 (100웨이브)
  final: {
    abilityCount: 3, // 디버프 능력 3개
    reviveHp: 0.5, // 첫 사망 시 이 체력 비율로 부활
    reviveExtraAbilities: 1 // 부활 시 추가되는 디버프 능력 수
  },
  maxAlive: 100, // 필드 위 몬스터가 이 수에 도달하면 게임 오버
  prepTime: 8, // 1웨이브 시작 전 준비 시간(초)
  waveDuration: 30, // 웨이브 간격(초)
  spawnWindow: 20 // 웨이브 몬스터가 나오는 데 걸리는 시간(초)
};
