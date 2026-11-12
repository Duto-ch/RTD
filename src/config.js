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
  sellRefund: 0.5, // 투자 골드 대비 판매 환급 비율
  mergeCost: { 2: 20, 3: 100, 4: 240, 5: 600 }, // 해당 레벨로 올릴 때 비용 (Lv3부터 2배, 2026-11-12)
  promoteCost: 1800, // Lv5 + Lv5 → 영웅 승급 비용 (2026-11-12 3배)
  levelDamage: [1, 2.5, 6, 14, 32], // 레벨별 공격력 배율
  elementAdvantage: 1.5,
  elementDisadvantage: 0.6,
  // 몬스터 체력 = hpBase × hpGrowth^(웨이브-1) × 종류 배율
  monster: {
    hpBase: 44, // 체력 2배 (2026-11-12)
    hpGrowth: 1.08,
    eliteHpMult: 10,
    bossHpMult: 110, // 2026-11-12 사용자 결정
    // 이동 속도: 일반·정예 1.3배, 보스 1.5배 (2026-11-12)
    normalSpeed: 91,
    eliteSpeed: 72,
    bossSpeed: 33 // 경로 1바퀴 1760px → 약 53초
  },
  // 보스 디버프: 보스마다 1~2개 능력을 랜덤 보유, 쿨타임마다 용병/영웅 여러 명에게 시전
  boss: {
    abilityCount: [1, 2],
    targetsBase: 2, // 대상 수 = targetsBase + floor(웨이브 / targetsPerWaves)
    targetsPerWaves: 20
  },
  maxAlive: 100, // 필드 위 몬스터가 이 수에 도달하면 게임 오버
  prepTime: 8, // 1웨이브 시작 전 준비 시간(초)
  waveDuration: 30, // 웨이브 간격(초)
  spawnWindow: 20 // 웨이브 몬스터가 나오는 데 걸리는 시간(초)
};
