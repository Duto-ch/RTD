import { BALANCE } from '../config.js';

export const ATTRS = ['red', 'blue', 'green'];

export const ATTR_INFO = {
  red: { name: '레드', color: 0xff6a55, css: '#ff6a55' },
  blue: { name: '블루', color: 0x5aa2ff, css: '#5aa2ff' },
  green: { name: '그린', color: 0x6fd36a, css: '#6fd36a' }
};

// 키 속성이 값 속성에게 강하다.
// 블루 > 레드, 그린 > 블루, 레드 > 그린
export const BEATS = { blue: 'red', green: 'blue', red: 'green' };

export function strongAgainst(attr) {
  return BEATS[attr];
}
export function weakAgainst(attr) {
  return Object.keys(BEATS).find((k) => BEATS[k] === attr);
}

/** 공격 속성 → 방어 속성 피해 배율 */
export function elementMultiplier(attacker, defender, { ignoreDisadvantage = false, advantage } = {}) {
  if (BEATS[attacker] === defender) return advantage ?? BALANCE.elementAdvantage;
  if (BEATS[defender] === attacker) return ignoreDisadvantage ? 1 : BALANCE.elementDisadvantage;
  return 1;
}
