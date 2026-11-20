import { describe, it, expect } from 'vitest';
import { ringPixels, levelPixels, GRADE_COLORS } from '../../src/ui/gradeMark.js';

// 2026-11-18 사용자 결정: 등급 = 발밑 받침 고리(등급색, 진한 외곽선으로 석판과 분리), 레벨 = 고리 아래쪽 가운데 패 숫자. 속성 표시 없음
describe('등급 받침 고리 + 레벨 방패', () => {
  it('등급색 4종은 서로 다르고, 고리는 뒤쪽 반(위)·앞쪽 반(아래)으로 나뉜다', () => {
    expect(new Set([1, 2, 3, 4].map((g) => GRADE_COLORS[g][1])).size).toBe(4);
    const back = ringPixels(3, 'back'), front = ringPixels(3, 'front');
    expect(back.length).toBeGreaterThan(10);
    expect(front.length).toBeGreaterThan(10);
    expect(Math.max(...back.map((p) => p[1]))).toBeLessThanOrEqual(Math.min(...front.map((p) => p[1])) + 1);
    expect(back.some((p) => p[2] === 0x2b1d2f)).toBe(true); // 진한 외곽선
    expect(back.some((p) => p[2] === GRADE_COLORS[3][1])).toBe(true);
  });
  it('레벨 숫자: 1~4 흰색, 5 금빛, 레벨마다 모양이 다르고, 패는 고리 아래쪽 가운데', () => {
    const digit = (lv) => levelPixels(2, lv).filter((p) => p[2] === 0xffffff || p[2] === 0xffe066);
    expect(new Set([1, 2, 3, 4, 5].map((l) => JSON.stringify(digit(l).map((p) => [p[0], p[1]])))).size).toBe(5);
    expect(digit(4).every((p) => p[2] === 0xffffff)).toBe(true);
    expect(digit(5).every((p) => p[2] === 0xffe066)).toBe(true);
    const xs = levelPixels(4, 1).map((p) => p[0]);
    expect(Math.min(...xs) + Math.max(...xs)).toBe(0); // 가로 가운데
    expect(levelPixels(4, 1).some((p) => p[2] === GRADE_COLORS[4][0])).toBe(true);
  });
});

import { starPixels } from '../../src/ui/gradeMark.js';
describe('별 패 (룰 v2)', () => {
  it('별 수만큼 작은 별, 3성은 금빛', () => {
    const stars = (n) => starPixels(2, n).filter((p) => p[2] === 0xffffff || p[2] === 0x9fe0ff || p[2] === 0xffe066).length;
    expect(stars(1)).toBe(5);
    expect(stars(2)).toBe(10);
    expect(stars(3)).toBe(15);
    expect(starPixels(2, 3).some((p) => p[2] === 0xffe066)).toBe(true);
  });
});
