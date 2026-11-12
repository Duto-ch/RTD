// 용병 클래스 5종 (속성마다 같은 5개 클래스, 이름만 다름)
// dmg: 1레벨 기본 공격력 / rate: 초당 공격 / range: 사거리(px)
export const HERO_CLASSES = {
  archer: { role: '궁수', desc: '빠른 단일 공격', dmg: 8, rate: 1.4, range: 220 },
  mage: { role: '마법사', desc: '범위 공격', dmg: 9, rate: 0.8, range: 200, splash: 44 },
  sniper: { role: '저격수', desc: '강력한 원거리 단일 공격', dmg: 30, rate: 0.45, range: 320 },
  shaman: { role: '주술사', desc: '적을 느리게 함', dmg: 5, rate: 1.0, range: 210, slow: 0.3, slowDur: 1.5 },
  rogue: { role: '도적', desc: '매우 빠른 연속 공격, 치명타', dmg: 6, rate: 2.2, range: 180, crit: 0.25 }
};

export const HERO_CLASS_IDS = Object.keys(HERO_CLASSES);

// 속성별 영웅 이름 (임시 이름 — 기획 확정 시 교체)
export const HERO_NAMES = {
  red: { archer: '화염 궁수', mage: '불꽃 마법사', sniper: '작열 저격수', shaman: '재의 주술사', rogue: '붉은 도적' },
  blue: { archer: '물결 궁수', mage: '서리 마법사', sniper: '심해 저격수', shaman: '파도 주술사', rogue: '푸른 도적' },
  green: { archer: '숲의 궁수', mage: '대지 마법사', sniper: '덩굴 저격수', shaman: '바람 주술사', rogue: '초록 도적' }
};
