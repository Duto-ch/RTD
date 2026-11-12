// ── 용병 (1~5레벨) ─────────────────────────────
// 속성마다 같은 5개 클래스. dmg: 1레벨 기본 공격력 / rate: 초당 공격 / range: 사거리(px)
export const MERC_CLASSES = {
  archer: { role: '궁수', desc: '빠른 단일 공격', dmg: 8, rate: 1.4, range: 220 },
  mage: { role: '마법사', desc: '범위 공격', dmg: 9, rate: 0.8, range: 200, splash: 44 },
  sniper: { role: '저격수', desc: '강력한 원거리 단일 공격', dmg: 30, rate: 0.45, range: 320 },
  shaman: { role: '주술사', desc: '적을 느리게 함', dmg: 5, rate: 1.0, range: 210, slow: 0.3, slowDur: 1.5 },
  rogue: { role: '도적', desc: '매우 빠른 공격, 치명타', dmg: 6, rate: 2.2, range: 180, crit: 0.25 }
};
export const MERC_CLASS_IDS = Object.keys(MERC_CLASSES);

// 영미권·북유럽권 이름
export const MERC_NAMES = {
  red: { archer: '에릭', mage: '브리짓', sniper: '군나르', shaman: '헬가', rogue: '로완' },
  blue: { archer: '시그리드', mage: '올라프', sniper: '에드먼드', shaman: '잉그리드', rogue: '핀' },
  green: { archer: '로빈', mage: '프레야', sniper: '토르발드', shaman: '아스트리드', rogue: '레이프' }
};

// ── 영웅 (Lv5 + Lv5 승급) ──────────────────────
// 원형 3종 × 속성 3 = 9명. 승급 시 대상 용병의 속성 기준으로 3명 중 랜덤.
export const HERO_ARCHETYPES = {
  warlord: { title: '전쟁군주', desc: '광역 강타', dmg: 42, rate: 1.0, range: 240, splash: 64 },
  archmage: { title: '대마법사', desc: '연쇄 번개', dmg: 40, rate: 0.8, range: 260, chain: 3 },
  ranger: { title: '전설의 사냥꾼', desc: '초고속 2연 사격', dmg: 14, rate: 2.6, range: 300, targets: 2 }
};

// unique: 영웅 전용 고유 스킬 (형식은 data/skills.js 참고)
export const HEROES = {
  red: [
    { id: 'ragnar', name: '라그나르', arch: 'warlord', unique: { name: '라그나로크', cd: 15, area: { type: 'range' }, fx: { dmg: 8, dot: [1, 3] } } },
    { id: 'isolde', name: '이졸데', arch: 'archmage', unique: { name: '태양 낙하', cd: 18, area: { type: 'circle', r: 140 }, fx: { dmg: 12 } } },
    { id: 'bjorn', name: '비요른', arch: 'ranger', unique: { name: '불새의 깃', cd: 12, area: { type: 'multi', n: 10 }, fx: { dmg: 5 } } }
  ],
  blue: [
    { id: 'arthur', name: '아서', arch: 'warlord', unique: { name: '호수의 검', cd: 18, area: { type: 'range' }, fx: { dmg: 6, stun: 1.5 } } },
    { id: 'solveig', name: '솔베이그', arch: 'archmage', unique: { name: '절대영도', cd: 25, area: { type: 'range' }, fx: { dmg: 4, stun: 3 } } },
    { id: 'william', name: '윌리엄', arch: 'ranger', unique: { name: '조류의 화살', cd: 22, area: { type: 'range' }, fx: { dmg: 3, push: 120 } } }
  ],
  green: [
    { id: 'halvard', name: '할바르드', arch: 'warlord', unique: { name: '세계수의 분노', cd: 18, area: { type: 'range' }, fx: { dot: [3, 5] } } },
    { id: 'freydis', name: '프레이디스', arch: 'archmage', unique: { name: '대지의 축복', cd: 25, buff: { scope: 'all', dmg: 0.5, dur: 8 } } },
    { id: 'richard', name: '리처드', arch: 'ranger', unique: { name: '황금 사냥', cd: 20, pick: 'strongest', area: { type: 'single' }, fx: { dmg: 30 }, gold: 50 } }
  ]
};
