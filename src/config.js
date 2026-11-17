// 화면 / 레이아웃 상수. 모든 배치는 4배 픽셀(아트 1px = 화면 4px) 격자에 맞춘다.
export const PX = 4;
// 화면 방향 (2026-11-15): 창이 가로로 넓으면(16:9 모니터) 가로 배치 1280x720, 아니면 세로 배치 544x960 (모바일).
// 게임을 띄울 때 한 번 정한다. 주소에 ?layout=wide / ?layout=tall 을 붙이면 강제로 고를 수 있다
function pickLayout() {
  if (typeof window === 'undefined') return 'tall';
  const q = new URLSearchParams(window.location?.search || '').get('layout');
  if (q === 'wide' || q === 'tall') return q;
  return window.innerWidth > window.innerHeight * 1.15 ? 'wide' : 'tall';
}
export const LAYOUT = pickLayout();
export const WIDE = LAYOUT === 'wide';
// 포근한 카드형 UI (B-2 시안): 크림색 둥근 카드·세이지 키 컬러 — 2026-11-16 가로·세로 모두
export const COZY = true;
// UI 글꼴 (2026-11-16 글꼴 시안 G): 썬플라워 — 본문 Medium, 굵은 글자(제목·숫자·버튼) Bold.
// 썬플라워에 없는 기호(· — … → 등)는 고운돋움으로 채운다
export const COZY_FONT = 'Sunflower, Gowun Dodum';
export const COZY_HEAD = COZY_FONT;
export const GAME_W = WIDE ? 1280 : 544; // 세로: 136 아트 px
export const GAME_H = WIDE ? 720 : 960; // 세로: 240 아트 px

export const GRID = 5;
export const TOWER_CELL = { col: 2, row: 2 }; // 필드 가운데 성탑 칸 (용병을 놓을 수 없다)
// 배경·UI 를 그리는 픽셀 배율: 아트 1px = 화면 3px (캐릭터 사양 28x24 × 0.75 와 같은 밀도, 2026-11-15)
export const UI_PX = 3;
// 필드 배경(땅·길·성벽·석판) 도트 굵기 — 아트 1px = 화면 2px (2026-11-17 시안). 칸 64px = 32 아트 px 로 나누어떨어진다
export const BG_PX = 2;
// 칸 48px (2026-11-17 사용자 결정, 이전 64) = 캐릭터 캔버스 24 아트 px × 2px. 길·성벽도 같은 비율로 줄이고 길 폭만 1.5배
export const CELL = 48;
// 코드로 그린 임시 유닛·성탑 그림 배율 (16x16 → 칸 크기에 맞춤, 칸 64 일 때 PX 4)
export const UNIT_PX = (PX * CELL) / 64;
export const FIELD_SIZE = GRID * CELL; // 240
export const FIELD_X = (GAME_W - FIELD_SIZE) / 2; // 세로 152 · 가로 520 (가운데)
export const FIELD_Y = WIDE ? (GAME_H - FIELD_SIZE) / 2 : 360; // 세로는 필드 가운데가 y 480 (칸 64 시절과 같은 자리), 가로는 위아래 가운데 (240)
export const WALL = 18; // 성벽 두께 (칸 64 시절 24 × 0.75)
export const PATH_OFF = 56; // 필드 가장자리 → 몬스터 이동 경로 중심선 거리 (성벽 18 + 틈 6 + 길 반폭 32)
export const PATH_WIDTH = 64; // 칸 48 비율(42)의 1.5배 — 몬스터가 더 넓게 퍼져 걷는다 (사용자 결정)

export const FONT = 'Galmuri11';
// 지역 장식을 놓지 않을 HUD 영역 (배경 그림이 가려지는 곳) — 세로: 위·아래 띠, 가로: 양옆 HUD 칸
export const HUD_RECTS = WIDE
  ? [
      // B-2: 위 알약 바 · 아래 독
      { x: 144, y: 10, w: 992, h: 64 },
      { x: 284, y: 638, w: 712, h: 80 }
    ]
  : [
      { x: 0, y: 0, w: 544, h: 180 },
      { x: 0, y: 776, w: 544, h: 184 }
    ];
// 고화질 렌더링: 캔버스 실제 해상도 = 게임 좌표 × RES (카메라 zoom RES). 글자도 RES 배 해상도로 그려 선명하게.
// 게임 좌표(544x960)·레이아웃은 그대로다
export const RES = 2; // 가로 배치도 2배 (1280x720 → 2560x1440). 1.5배면 픽셀 글꼴 크기 격자가 달라져 작은 글자가 커진다
/** Galmuri11 은 11px 격자로 디자인된 픽셀 글꼴 — 화면 크기가 11의 배수(px)일 때 획이 정확히 맞아 깔끔하다.
 *  요청 크기를 가장 가까운 '11 × 정수 / RES' 로 맞춘다 (RES 2: 11, 16.5, 22, 27.5 …) */
export function crispFontSize(size) {
  const step = 11 / RES;
  return Math.max(11, Math.round(size / step) * step);
}

export const DEPTH = {
  bg: 0,
  coin: 9, // 바닥에 떨어진 동전 (몬스터 아래)
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
  // 스킬 리롤 비용 (스킬 정보 창, 습득 레벨별): 같은 레벨 후보 3종 중 지금 것을 뺀 2종에서 랜덤으로 바뀐다. 영웅 고유 스킬은 리롤 불가
  skillReroll: { 2: 200, 3: 500, 4: 1500, 5: 3000 },
  sellRefund: 0.5, // 투자 골드 대비 판매 환급 비율
  mergeCost: { 2: 20, 3: 100, 4: 240, 5: 600 }, // 해당 레벨로 올릴 때 비용 (Lv3부터 2배, 2026-11-12)
  promoteCost: 1800, // Lv5 + Lv5 → 영웅 승급 비용 (2026-11-12 3배)
  // 레벨별 공격력 배율. 2026-11-13 인크리멘탈 도입: Lv3+ 성장폭을 줄임 (이전 [1, 2.5, 6, 14, 32]) — 성장은 명성 강화가 맡는다
  levelDamage: [1, 2.5, 4, 6, 8.5],
  // 용병 기본 전투력 배율 — 명성 강화를 하나도 안 하면 10~15웨이브가 한계가 되도록 (2026-11-13 사용자 결정)
  baseDamageMult: 1,
  bossDamageMult: 0.4, // 보스·정예에게 주는 기본 피해 배율 (명성 강화 '거인 사냥꾼'이 더해진다)
  elementAdvantage: 1.5,
  elementDisadvantage: 0.6,
  // 몬스터 체력 = hpBase × hpGrowth^(웨이브-1) × 종류 배율
  monster: {
    hpBase: 40, // 체력 공식의 기준값 (2웨이브 = 40×1.08 …)
    firstWaveHp: 34, // 1웨이브만 예외 (2026-11-13 사용자 결정, 다른 웨이브는 공식 그대로)
    hpGrowth: 1.08,
    // 전체 난이도 완화 (2026-11-15 사용자 결정: 무한 웨이브 전환과 함께 30% 완화) — 모든 몬스터 체력에 곱한다
    hpScale: 0.7,
    eliteHpMult: 10,
    bossHpMult: 110, // 2026-11-12 사용자 결정
    // 이동 속도: 일반·정예 1.3배, 보스 1.5배 (2026-11-12)
    normalSpeed: 91,
    eliteSpeed: 72,
    bossSpeed: 33, // 경로 1바퀴 1760px → 약 53초
    // 일반·정예 이동 속도는 speedStepWaves 웨이브마다 speedStepMult 배 (보스 제외)
    speedStepWaves: 20,
    speedStepMult: 1.1,
    speedMaxMult: 2, // 무한 웨이브: 이동 속도 배율 상한 (약 150웨이브)
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
  // 강화 보스 웨이브: 30웨이브마다 (100의 배수는 최종 보스)
  milestone: {
    every: 30,
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
  // 최종 보스 (100웨이브마다 — 무한 웨이브라 100·200·300 …에 다시 나온다)
  final: {
    abilityCount: 3, // 디버프 능력 3개
    reviveHp: 0.5, // 첫 사망 시 이 체력 비율로 부활
    reviveExtraAbilities: 1 // 부활 시 추가되는 디버프 능력 수
  },
  // ── 물량 (2026-11-17 사용자 결정: 떼로 밀려오는 대량 물량) ──
  // 일반 몬스터 수 ×mult, 마리당 체력·골드 ÷mult (웨이브 전체 체력·골드 총량은 그대로). 정예·보스는 그대로
  horde: {
    mult: 5,
    normalScale: 2, // 일반 몬스터 그림 배율 (정예 4·보스 5) — 작은 몬스터가 길 폭 전체에 퍼져 걷는다
    laneSpread: 24, // 길 가운데에서 좌우로 퍼지는 최대 거리(px) — 길 폭 64 에 맞춰 넓힘 (이전 18)
    carryRadius: 52, // 관통: 일반 몬스터를 죽이고 남은 피해가 이 거리 안의 다음 일반 몬스터로 넘어간다
    carryHops: 10, // 한 번의 타격이 넘어갈 수 있는 최대 횟수
    maxAlive: 900 // 성능 보호: 필드 위 몬스터가 이 수면 출현을 잠시 멈춘다 (패배 조건 아님)
  },
  // ── 성벽 체력 (2026-11-17 사용자 결정: '100기 쌓이면 패배'·'보스 한 바퀴 즉시 패배' 폐지) ──
  // 몬스터가 길을 한 바퀴 돌 때마다 성벽 체력이 깎이고 0이 되면 게임 오버. 몬스터는 계속 돈다
  wall: {
    hp: 80, // 최초 체력 (사용자 결정). 명성 강화: 성벽 보강(+체력)·방패벽(시작 실드)·성벽 수리(웨이브마다 회복)
    dmg: { normal: 0.2, elite: 3, boss: 30, milestone: 40, final: 80 } // 한 바퀴마다 피해 (일반은 물량 5마리 = 1)
  },
  prepTime: 8, // 1웨이브 시작 전 준비 시간(초)
  waveDuration: 30, // 웨이브 간격(초)
  spawnWindow: 20 // 웨이브 몬스터가 나오는 데 걸리는 시간(초)
};
