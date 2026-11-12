// ── 스킬 시스템 ──────────────────────────────
// 모든 스킬은 액티브: 쿨타임(cd, 초)이 지나면 자동 시전.
// 레벨 업(2~5) 때마다 그 레벨의 3종 중 1개 랜덤 습득.
// 용병(속성×클래스 15명)마다 고유 스킬 세트: 클래스별 템플릿 12종 × 속성별 이름·추가 효과.
//
// 스킬 정의 형식
//   cd     쿨타임(초)
//   pick   'nearest'(기본) | 'strongest'(체력 최대)
//   area   { type: 'single' | 'multi', n | 'circle', r | 'range'(사거리 내 전부) | 'chain', n }
//   fx     dmg: 공격력 배율 / stun: 초 / slow: [비율, 초] / dot: [초당 배율, 초]
//          vuln: [받는 피해 증가, 초] / push: 뒤로 밀기(px) / execute: [체력 비율, 보스 피해 배율]
//          bossMult: 보스 피해 배율
//   buff   { scope: 'self'|'adjacent'|'all', dmg, rate, range, dur }   (비율)
//   gold   즉시 골드 / goldPerWave: 웨이브당 추가 골드

// 속성별 이름 수식어와 추가 효과 (피해를 주는 스킬에만 적용)
export const ELEMENT_FLAVOR = {
  red: { word: '불꽃', desc: '불꽃: 피해 +25%' },
  blue: { word: '서리', desc: '서리: 20% 감속 1.2초' },
  green: { word: '가시', desc: '가시: 2초간 초당 40% 피해' }
};

const single = { type: 'single' };
const all = { type: 'range' };
const multi = (n) => ({ type: 'multi', n });
const circle = (r) => ({ type: 'circle', r });
const chain = (n) => ({ type: 'chain', n });

// {e} 자리에 속성 수식어가 들어간다
const TEMPLATES = {
  archer: {
    2: [
      { name: '{e} 연발', cd: 6, area: multi(3), fx: { dmg: 1.5 } },
      { name: '{e} 관통 화살', cd: 5, area: single, fx: { dmg: 3 } },
      { name: '{e} 집중', cd: 10, buff: { scope: 'self', rate: 0.5, dur: 4 } }
    ],
    3: [
      { name: '{e} 화살비', cd: 8, area: circle(60), fx: { dmg: 2 } },
      { name: '{e} 속박 화살', cd: 8, area: single, fx: { dmg: 1.5, stun: 1 } },
      { name: '{e} 매의 시선', cd: 14, buff: { scope: 'self', dmg: 0.3, range: 0.3, dur: 6 } }
    ],
    4: [
      { name: '{e} 폭풍 사격', cd: 10, area: multi(6), fx: { dmg: 2 } },
      { name: '{e} 약점 표시', cd: 8, area: single, fx: { dmg: 1.5, vuln: [0.3, 5] } },
      { name: '{e} 전우의 함성', cd: 15, buff: { scope: 'adjacent', rate: 0.25, dur: 5 } }
    ],
    5: [
      { name: '{e} 천공의 화살', cd: 12, area: single, fx: { dmg: 10 } },
      { name: '{e} 화살 폭풍', cd: 15, area: all, fx: { dmg: 2.5 } },
      { name: '{e} 사냥꾼의 결의', cd: 6, area: single, fx: { execute: [0.25, 5] } }
    ]
  },
  mage: {
    2: [
      { name: '{e} 구체', cd: 6, area: circle(50), fx: { dmg: 2 } },
      { name: '{e} 장벽', cd: 8, area: circle(80), fx: { slow: [0.35, 2] } },
      { name: '{e} 마나 순환', cd: 12, buff: { scope: 'self', rate: 0.6, dur: 4 } }
    ],
    3: [
      { name: '{e} 폭발', cd: 10, area: circle(80), fx: { dmg: 3 } },
      { name: '{e} 연쇄 번개', cd: 8, area: chain(5), fx: { dmg: 2 } },
      { name: '{e} 마력 공명', cd: 15, buff: { scope: 'adjacent', dmg: 0.2, dur: 6 } }
    ],
    4: [
      { name: '{e} 운석', cd: 14, area: circle(100), fx: { dmg: 5 } },
      { name: '{e} 시간 왜곡', cd: 14, area: circle(70), fx: { stun: 1.2 } },
      { name: '{e} 약화의 저주', cd: 12, area: circle(80), fx: { vuln: [0.25, 5] } }
    ],
    5: [
      { name: '{e} 대폭발', cd: 18, area: all, fx: { dmg: 4 } },
      { name: '{e} 소용돌이', cd: 20, area: circle(90), fx: { dmg: 2, push: 80 } },
      { name: '{e} 원소 폭주', cd: 20, buff: { scope: 'self', dmg: 1, dur: 6 } }
    ]
  },
  sniper: {
    2: [
      { name: '{e} 헤드샷', cd: 6, area: single, fx: { dmg: 4 } },
      { name: '{e} 철갑탄', cd: 7, area: single, fx: { dmg: 2.5, vuln: [0.2, 4] } },
      { name: '{e} 호흡 고르기', cd: 12, buff: { scope: 'self', dmg: 0.5, dur: 5 } }
    ],
    3: [
      { name: '{e} 저지 사격', cd: 9, area: single, fx: { dmg: 2, stun: 1.5 } },
      { name: '{e} 관통탄', cd: 9, area: multi(3), fx: { dmg: 3 } },
      { name: '{e} 충격탄', cd: 10, area: single, fx: { dmg: 2, push: 100 } }
    ],
    4: [
      { name: '{e} 암살 표적', cd: 8, area: single, fx: { execute: [0.2, 6] } },
      { name: '{e} 정밀 사격', cd: 12, area: single, fx: { dmg: 8 } },
      { name: '{e} 고지대 점령', cd: 18, buff: { scope: 'self', range: 0.4, rate: 0.3, dur: 8 } }
    ],
    5: [
      { name: '{e} 결전의 일격', cd: 20, area: single, fx: { dmg: 18 } },
      { name: '{e} 연속 저격', cd: 16, area: multi(4), fx: { dmg: 5 } },
      { name: '{e} 거인 사냥', cd: 15, pick: 'strongest', area: single, fx: { dmg: 12, bossMult: 2 } }
    ]
  },
  shaman: {
    2: [
      { name: '{e} 저주', cd: 6, area: single, fx: { dot: [1, 4] } },
      { name: '{e} 수렁', cd: 8, area: circle(70), fx: { slow: [0.4, 2.5] } },
      { name: '{e} 축복', cd: 12, buff: { scope: 'adjacent', rate: 0.2, dur: 5 } }
    ],
    3: [
      { name: '{e} 역병', cd: 9, area: circle(70), fx: { dot: [0.8, 4] } },
      { name: '{e} 속박의 토템', cd: 12, area: circle(60), fx: { stun: 1 } },
      { name: '{e} 황금 의식', cd: 15, gold: 5, goldPerWave: 0.5 }
    ],
    4: [
      { name: '{e} 영혼 흡수', cd: 10, area: single, fx: { dmg: 4 }, gold: 3 },
      { name: '{e} 약화의 춤', cd: 12, area: circle(80), fx: { vuln: [0.3, 5] } },
      { name: '{e} 전쟁의 북소리', cd: 15, buff: { scope: 'adjacent', dmg: 0.3, dur: 6 } }
    ],
    5: [
      { name: '{e} 대재앙', cd: 18, area: all, fx: { dot: [1.5, 5] } },
      { name: '{e} 시간 정지', cd: 22, area: all, fx: { stun: 2 } },
      { name: '{e} 조상의 가호', cd: 25, buff: { scope: 'adjacent', dmg: 0.5, rate: 0.3, dur: 8 } }
    ]
  },
  rogue: {
    2: [
      { name: '{e} 연속 베기', cd: 4, area: single, fx: { dmg: 2.5 } },
      { name: '{e} 독 바르기', cd: 6, area: single, fx: { dot: [1.5, 3] } },
      { name: '{e} 그림자 걸음', cd: 10, buff: { scope: 'self', rate: 0.8, dur: 3 } }
    ],
    3: [
      { name: '{e} 급소 찌르기', cd: 8, area: single, fx: { dmg: 5 } },
      { name: '{e} 연막탄', cd: 10, area: circle(60), fx: { slow: [0.5, 2] } },
      { name: '{e} 소매치기', cd: 10, gold: 5, goldPerWave: 0.3 }
    ],
    4: [
      { name: '{e} 칼날 폭풍', cd: 12, area: all, fx: { dmg: 2.5 } },
      { name: '{e} 암살', cd: 8, area: single, fx: { execute: [0.25, 4] } },
      { name: '{e} 약점 간파', cd: 10, area: single, fx: { dmg: 1, vuln: [0.4, 6] } }
    ],
    5: [
      { name: '{e} 천 개의 칼날', cd: 15, area: multi(8), fx: { dmg: 3 } },
      { name: '{e} 죽음의 표식', cd: 14, area: single, fx: { execute: [0.35, 10] } },
      { name: '{e} 도둑 길드', cd: 25, gold: 20, goldPerWave: 1 }
    ]
  }
};

/** 용병(속성·클래스)의 해당 레벨 스킬 후보 3종 */
export function skillOptions(attr, cls, level) {
  const word = ELEMENT_FLAVOR[attr].word;
  return TEMPLATES[cls][level].map((t, i) => ({
    ...t,
    id: `${attr}_${cls}_${level}_${i}`,
    level,
    attr,
    name: t.name.replace('{e}', word)
  }));
}

export function isDamaging(s) {
  return !!(s.fx && (s.fx.dmg || s.fx.execute || s.fx.dot));
}

const pct = (v) => `${Math.round(v * 100)}%`;

/** 스킬 설명 자동 생성 */
export function describeSkill(s) {
  const out = [];
  const a = s.area;
  const fx = s.fx || {};
  if (a) {
    const who =
      a.type === 'single' ? (s.pick === 'strongest' ? '체력이 가장 많은 적' : '대상') :
      a.type === 'multi' ? `적 최대 ${a.n}명` :
      a.type === 'circle' ? `대상 주변(반경 ${a.r})` :
      a.type === 'chain' ? `적 ${a.n}명에게 연쇄로` : '사거리 내 모든 적';
    const parts = [];
    if (fx.dmg) parts.push(`${pct(fx.dmg)} 피해`);
    if (fx.execute) parts.push(`체력 ${pct(fx.execute[0])} 이하면 즉사, 아니면 100% 피해 (보스는 ${pct(fx.execute[1])} 피해)`);
    if (fx.dot) parts.push(`${fx.dot[1]}초간 초당 ${pct(fx.dot[0])} 피해`);
    if (fx.stun) parts.push(`${fx.stun}초 기절 (보스 절반)`);
    if (fx.slow) parts.push(`${pct(fx.slow[0])} 감속 ${fx.slow[1]}초`);
    if (fx.vuln) parts.push(`받는 피해 +${pct(fx.vuln[0])} ${fx.vuln[1]}초`);
    if (fx.push) parts.push(`${fx.push}만큼 뒤로 밀침 (보스 1/3)`);
    if (fx.bossMult) parts.push(`보스에게 ${fx.bossMult}배`);
    out.push(`${who}에게 ${parts.join(', ')}`);
  }
  if (s.buff) {
    const b = s.buff;
    const who = b.scope === 'self' ? '자신' : b.scope === 'adjacent' ? '자신과 주변 8칸 아군' : '모든 아군';
    const parts = [];
    if (b.dmg) parts.push(`공격력 +${pct(b.dmg)}`);
    if (b.rate) parts.push(`공격 속도 +${pct(b.rate)}`);
    if (b.range) parts.push(`사거리 +${pct(b.range)}`);
    out.push(`${who} ${parts.join(', ')} (${b.dur}초)`);
  }
  if (s.gold) out.push(`골드 +${s.gold}${s.goldPerWave ? ` (+웨이브×${s.goldPerWave})` : ''}`);
  return out.join(' / ');
}
