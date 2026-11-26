// 화면 / 레이아웃 상수. 모든 배치는 4배 픽셀(아트 1px = 화면 4px) 격자에 맞춘다.
export const PX = 4;
// PC 전환 (2026-11-22 사용자 결정): 모바일·세로 배치 폐지 → 1920x1080 한 벌.
//  전장(배경·필드·몬스터·용병·이펙트) = 월드 좌표 WORLD_W x WORLD_H(1920x1080), 도트 아트 1px = 2px (DOT).
//  UI(HUD·창·로비·병영 …) = UI 좌표 GAME_W x GAME_H(1280x720) 를 UI_SCALE(1.5)배로 그린다 → UI 도트는 3px, 글자는 1.5배.
//  GameScene 은 카메라를 나눠(전장 zoom RES, UI zoom RES×1.5) 깊이로 나눠 그린다 (src/systems/hires.js)
export const WIDE = true; // 예전 가로 배치 분기 이름 — 이제 늘 가로
export const LAYOUT = 'wide';
export const UI_SCALE = 1.5;
export const WORLD_W = 1920;
export const WORLD_H = 1080;
// 포근한 카드형 UI (B-2 시안): 크림색 둥근 카드·세이지 키 컬러 — 2026-11-16 가로·세로 모두
export const COZY = true;
// UI 글꼴 (2026-11-16 글꼴 시안 G): 썬플라워 — 본문 Medium, 굵은 글자(제목·숫자·버튼) Bold.
// 썬플라워에 없는 기호(· — … → 등)는 고운돋움으로 채운다
export const COZY_FONT = 'Sunflower, Gowun Dodum';
export const COZY_HEAD = COZY_FONT;
export const GAME_W = WORLD_W / UI_SCALE; // UI 좌표 폭 1280
export const GAME_H = WORLD_H / UI_SCALE; // UI 좌표 높이 720

export const GRID = 5;
// 배경·UI 를 그리는 픽셀 배율: 아트 1px = 화면 3px (캐릭터 사양 28x24 × 0.75 와 같은 밀도, 2026-11-15)
// 도트 2px 통일 (2026-11-21 사용자 결정): 게임 안 모든 도트 그림의 아트 1px = 화면 2px (캐릭터·필드와 같게). 이전 UI·로비 3px, 코드 그림 4px
export const DOT = 2;
export const UI_PX = DOT;
// 필드 배경(땅·길·성벽·석판) 도트 굵기 — 아트 1px = 화면 2px (2026-11-17 시안). 칸 64px = 32 아트 px 로 나누어떨어진다
export const BG_PX = 2;
// 칸 56px (2026-11-19 사용자 결정 — 캐릭터 사이를 조금 넓게, 이전 48·64). 캐릭터 그림(48px)은 그대로라 칸 사이가 8px 벌어진다.
// 석판 28 아트 px. 성벽 두께도 함께 늘리고 길 폭은 그대로
export const CELL = 56;
// 코드로 그린 임시 유닛·성탑 그림 배율 (16x16 → 칸 크기에 맞춤, 칸 64 일 때 PX 4)
export const UNIT_PX = (PX * 48) / 64; // 칸 48 때 배율 3 그대로 (정수 배율이어야 도트가 번지지 않는다)
export const FIELD_SIZE = GRID * CELL; // 280
export const FIELD_X = (WORLD_W - FIELD_SIZE) / 2; // 월드 좌표 820 (가운데)
export const FIELD_Y = (WORLD_H - FIELD_SIZE) / 2; // 월드 좌표 400
export const WALL = 20; // 성벽 두께 (칸 48 때 18, 칸 56 에 맞춰 10 아트 px)
export const PATH_OFF = 58; // 필드 가장자리 → 몬스터 이동 경로 중심선 거리 (성벽 20 + 틈 6 + 길 반폭 32)
export const PATH_WIDTH = 64; // 칸 48 비율(42)의 1.5배 — 몬스터가 더 넓게 퍼져 걷는다 (사용자 결정)

export const FONT = 'Galmuri11';
// 지역 장식을 놓지 않을 HUD 영역 (월드 좌표) — 위 알약 바 · 아래 독 (UI 좌표 × UI_SCALE)
export const HUD_RECTS = [
  { x: 0, y: 0, w: 1280, h: 76 }, // 위 바 (화면 좌우 끝까지, 2026-11-22)
  { x: 0, y: 606, w: 1280, h: 114 } // 아래 독
].map((r) => ({ x: r.x * UI_SCALE, y: r.y * UI_SCALE, w: r.w * UI_SCALE, h: r.h * UI_SCALE }));
// 화면 맞춤 (2026-11-22 사용자 결정 '정수 배율 + 검은 테두리'): 1920x1080 을 창에 들어가는 가장 큰 정수 배(1·2·3 …)로 —
// 남는 곳은 검정. 창이 1080p 보다 작으면 어쩔 수 없이 부드럽게 줄인다. RES = 캔버스 실제 픽셀 / 월드 px (정수, 화면 배율 × devicePixelRatio)
export function displayScale(w = window.innerWidth, h = window.innerHeight) {
  const fit = Math.min(w / WORLD_W, h / WORLD_H);
  return fit >= 1 ? Math.floor(fit) : fit;
}
function pickRes() {
  if (typeof window === 'undefined') return 1;
  const q = Number(new URLSearchParams(window.location?.search || '').get('res'));
  if (q) return Math.max(1, Math.min(4, Math.round(q)));
  return Math.max(1, Math.min(4, Math.ceil(displayScale() * (window.devicePixelRatio || 1) - 0.05)));
}
export const RES = pickRes();
/** 글자 해상도: UI 글자는 RES × UI_SCALE 로 확대되어 그려지므로 그만큼 촘촘히 그린다 */
export const TEXT_RES = RES * UI_SCALE;
/** Galmuri11 은 11px 격자로 디자인된 픽셀 글꼴 — 화면 크기가 11의 배수(px)일 때 획이 정확히 맞아 깔끔하다.
 *  요청 크기를 가장 가까운 '11 × 정수 / 2' 로 맞춘다 (11, 16.5, 22, 27.5 …) */
export function crispFontSize(size) {
  const step = 11 / 2; // 글자 크기 격자는 RES 2 기준으로 고정 (RES 가 화면마다 달라도 배치가 같게)
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
  drag: 900, // 끌고 가는 용병·아이템은 UI(200) 위, 창(overlay) 아래 (2026-11-21: UI 아래로 숨던 문제)
  ui: 200,
  overlay: 1000
};

// ── 밸런스 (플레이테스트하며 조정) ────────────────
/** 물량 배수 — 일반 몬스터 수 ×HORDE_MULT, 마리당 체력·골드 ÷HORDE_MULT (2026-11-24 사용자 결정: 5 → 1.8, 1웨이브 167 → 60기 · 웨이브 체력·골드 총량은 그대로) */
const HORDE_MULT = 1.8;

export const BALANCE = {
  // 공격 모션: 공격 간격 중 이 비율 동안 한 번 휘두른다 (공속에 맞춤, 2026-11-19)
  attackAnim: { share: 0.85 },
  startGold: 120,
  // 룰 v2 (2026-11-20): 고용·합성·레벨·속성 상성 폐지 → 상점·별 승급(data/shop.js·stars.js)·시너지(data/synergy.js)
  // 용병 기본 전투력 배율 — 출전 인원이 25 → 최대 12명, 성장이 레벨 ×8.5 → 별 ×3.2 로 줄어서 올림 (가안, 밸런스 봇으로 맞춤)
  baseDamageMult: 3,
  bossDamageMult: 0.4, // 보스·정예에게 주는 기본 피해 배율 (명성 강화 '거인 사냥꾼'이 더해진다)
  // 몬스터 체력 = hpBase × hpGrowth^(웨이브-1) × 종류 배율
  monster: {
    hpBase: 40, // 체력 공식의 기준값 (2웨이브 = 40×1.08 …)
    firstWaveHp: 34, // 1웨이브만 예외 (2026-11-13 사용자 결정, 다른 웨이브는 공식 그대로)
    hpGrowth: 1.08, // hpCurve 가 없을 때만 (예전 곡선)
    // 체력 곡선 두 구간 (2026-11-25 사용자 결정 A안: 판 안 성장에 맞춘 곡선) — 1~knee 웨이브는 웨이브당 ×early(판 안 화력이 빨리 크는 구간),
    // 그 뒤는 ×late(화력이 멈춘 뒤 — 천천히 늘어 '조금씩 깎이는 구간'이 넓어진다). 수치는 봇 비교로 정한 가안 ⚠️
    hpCurve: { knee: 25, early: 1.15, late: 1.05 },
    // 전체 난이도 완화 (2026-11-15 사용자 결정: 무한 웨이브 전환과 함께 30% 완화) — 모든 몬스터 체력에 곱한다
    hpScale: 1.0, // 2026-11-24 중반 긴장감 시험(봇 비교 B안): 0.7 → 1.0 (전체 체력 ×1.43 — 성벽이 판 내내 조금씩 깎인다)
    // 초반 내구성 (2026-11-24 사용자 결정: 1웨이브부터 한 방에 터져 긴장감이 없다 → 초반만 단단하게).
    // 일반 몬스터 체력 ×mult(1웨이브) → 점점 줄어 untilWave 에서 ×1 (후반 곡선은 그대로). 수치는 가안 ⚠️
    earlyHp: { mult: 4, untilWave: 25 }, // 일반 몬스터만 1웨이브 ×4 → 25웨이브 ×1 (2026-11-25 A안: 곡선 구간에 맞춤, 이전 60)
    // 11웨이브부터 난이도 상향 (2026-11-24 사용자 결정): 이 웨이브부터 모든 몬스터(일반·정예·보스) 체력 ×mult. 수치는 가안 ⚠️
    midHp: { from: 11, mult: 1 }, // (2026-11-25 A안 곡선에 흡수 — ×1 = 끔, 이전 ×1.5) // 봇 비교: ×1.3 은 W50·W60(한 판은 60웨이브까지 성벽 피해 0), ×1.5 는 W60·W60(중간에 성벽 47·30·6까지) → 1.5
    eliteHpMult: 15, // 2026-11-24 사용자 요청: 정예 스펙 ×1.5 (이전 10)
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
    extraElites: 10, // (사용 안 함 — 2026-11-24 부터 정예 수는 eliteCount 가 웨이브로 정한다)
    enrageAt: 0.5, // 체력 비율 이하에서 분노
    enrageSpeed: 1.3, // 분노 시 이동 속도 배율
    enrageCdMult: 0.5 // 분노 시 디버프 쿨타임 배율
  },
  // 최종 보스 (100웨이브마다 — 무한 웨이브라 100·200·300 …에 다시 나온다)
  final: {
    abilityCount: 3, // 디버프 능력 3개
    reviveHp: 0.5, // 첫 사망 시 이 체력 비율로 부활
    reviveExtraAbilities: 1 // 부활 시 추가되는 디버프 능력 수
  },
  // ── 물량 (2026-11-17 사용자 결정: 떼로 밀려오는 대량 물량) ──
  // 일반 몬스터 수 ×mult, 마리당 체력·골드 ÷mult (웨이브 전체 체력·골드 총량은 그대로). 정예·보스는 그대로
  // 특수 몬스터 (2026-11-24 사용자 결정: 웨이브 안에 섞기 · 저항은 그 공격 피해 35%만). 수치는 가안 ⚠️
  // 일반 몬스터 중 일부가 특수 몬스터 — 종류마다 정해진 외형(design: 웨이브 기본 외형과 같으면 다음 것)
  special: {
    hpMult: 1.5, // 2026-11-24 사용자 요청: 특수 몬스터 스펙 ×1.5 (종류별 체력 배율에 더 곱한다)
    share: [0.15, 0.4], // 일반 몬스터 중 특수 비율: 처음 나오는 웨이브 → fullWave 부터 (2026-11-24 중반 긴장감: 10·25% → 15·40%)
    fullWave: 33,
    typesPerWave: 2, // 한 웨이브에 섞이는 종류 수 (열린 종류 중)
    resist: 0.35, // 저항: 그 종류 공격 피해를 35%만 받는다
    minDmg: 0.25, // 방어력: 한 대 피해는 방어력만큼 줄지만 최소 25%는 들어간다 (지속 피해는 방어력 무시)
    types: {
      swift: { name: '빠름', from: 2, speed: 1.6, hp: 0.7, design: ['wolf', 'hound'] },
      armored: { name: '방어력', from: 5, hp: 1.3, armor: 0.12, design: ['beetle', 'golem'] }, // armor: 그 웨이브 일반 몬스터 체력의 12%
      physResist: { name: '물리 저항', from: 8, resist: 'phys', design: ['ghost', 'wraith'] }, // 연사·속공·저격·근접
      magicResist: { name: '마법 저항', from: 11, resist: 'magic', design: ['imp', 'gargoyle'] }, // 주술·지원 (폭발은 어느 저항에도 안 막힘)
      // 기절 (2026-11-24 사용자 요청: 캐릭터 하나에 스턴): cd 초마다 range 안 가장 가까운(기절 안 한) 용병 1명을 dur 초 행동 불가
      stunner: { name: '기절', from: 11, stun: { cd: 10, dur: 1.2, range: 220 }, design: ['eye', 'jelly'] }
    }
  },
  // 정예 수 (2026-11-24 사용자 요청): 정예가 나올 때마다 늘어 maxWave 에서 max 마리, 그 뒤 고정 · 정예 perCaster 마리마다 1마리는 스킬 정예(data/eliteSkills.js)
  eliteCount: { start: 10, startWave: 5, max: 30, maxWave: 75, perCaster: 10 },
  horde: {
    mult: HORDE_MULT,
    countScale: 2 / 3, // 출현 수 배율 (2026-11-20 사용자 결정: 1/3 줄임 → 그때 1웨이브 167기, 2026-11-24 물량 배수 1.8 로 60기). 마리당 체력·골드는 그대로 — 봇 W61·W62 로 도달 웨이브는 같고 후반 골드가 덜 쌓인다
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
    dmg: { normal: 1, elite: 3, boss: 30, milestone: 40, final: 80 } // 한 바퀴마다 피해 (2026-11-24 사용자 결정: 일반 1)
  },
  // 정비 시간 (2026-11-24 사용자 결정): 웨이브마다 시작 전 15초 — 용병 구매·배치·아이템 장착은 정비 시간에만.
  // 웨이브는 그 웨이브 몬스터를 모두 잡으면 끝난다(이전: 30초마다 다음 웨이브가 겹쳐 시작 — waveDuration 폐지)
  prepTime: 15,
  spawnWindow: 20 // 웨이브 몬스터가 나오는 데 걸리는 시간(초)
};
