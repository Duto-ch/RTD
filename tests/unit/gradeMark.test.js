import { describe, it, expect } from 'vitest';
import { ringPixels, shieldPixels, GRADE_COLORS } from '../../src/ui/gradeMark.js';

// 2026-11-18 사용자 결정: 등급 = 발밑 받침 고리(등급색, 시안 A), 레벨 = 등급색 방패 안 숫자(시안 C). 속성 표시 없음
describe('등급 받침 고리 + 레벨 방패', () => {
  it('등급색 4종은 서로 다르고, 고리는 뒤쪽 반(위)·앞쪽 반(아래)으로 나뉜다', () => {
    expect(new Set([1, 2, 3, 4].map((g) => GRADE_COLORS[g][1])).size).toBe(4);
    const back = ringPixels(3, 'back'), front = ringPixels(3, 'front');
    expect(back.length).toBeGreaterThan(10);
    expect(front.length).toBeGreaterThan(10);
    expect(Math.max(...back.map((p) => p[1]))).toBeLessThanOrEqual(Math.min(...front.map((p) => p[1])) + 1);
    expect(back.every((p) => p[2] === GRADE_COLORS[3][1])).toBe(true);
  });
  it('레벨 숫자: 1~4 흰색, 5 금빛, 레벨마다 모양이 다르고 방패 테두리는 등급색', () => {
    const digit = (lv) => shieldPixels(2, lv).filter((p) => p[2] === 0xffffff || p[2] === 0xffe066);
    expect(new Set([1, 2, 3, 4, 5].map((l) => JSON.stringify(digit(l).map((p) => [p[0], p[1]])))).size).toBe(5);
    expect(digit(4).every((p) => p[2] === 0xffffff)).toBe(true);
    expect(digit(5).every((p) => p[2] === 0xffe066)).toBe(true);
    expect(shieldPixels(4, 1).some((p) => p[2] === GRADE_COLORS[4][2])).toBe(true);
  });
});
