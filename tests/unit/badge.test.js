import { describe, it, expect } from 'vitest';
import { badgePixels } from '../../src/ui/badge.js';

// 2026-11-18 사용자 결정: 레벨 별(★) 대신 시안 E — 속성 아이콘 + 레벨 숫자 이름표, 테두리 = 등급색, Lv5 금색 숫자
describe('레벨·속성 이름표 (시안 E)', () => {
  const at = (px, x, y) => px.find((p) => p[0] === x && p[1] === y)?.[2];
  it('17x10 안에 그려지고, 테두리는 등급색', () => {
    const px = badgePixels('red', 3, 2);
    expect(Math.max(...px.map((p) => p[0]))).toBe(16);
    expect(Math.max(...px.map((p) => p[1]))).toBe(9);
    expect(at(px, 8, 1)).toBe(0x7ad0e8); // 레어 = 하늘색 테두리
    expect(at(badgePixels('red', 4, 2), 8, 1)).toBe(0xf5c542); // 유니크 = 금
  });
  it('속성마다 아이콘·바탕색이 다르다', () => {
    const k = (a) => JSON.stringify(badgePixels(a, 1, 1).filter((p) => p[0] < 9));
    expect(new Set(['red', 'blue', 'green'].map(k)).size).toBe(3);
  });
  it('레벨 숫자: 1~4 흰색, 5 금색, 레벨마다 모양이 다르다', () => {
    const digit = (lv) => badgePixels('blue', 2, lv).filter((p) => p[0] >= 10 && p[0] <= 12 && p[1] >= 2 && p[1] <= 6 && (p[2] === 0xffffff || p[2] === 0xf5c542));
    expect(new Set([1, 2, 3, 4, 5].map((l) => JSON.stringify(digit(l).map((p) => [p[0], p[1]])))).size).toBe(5);
    expect(digit(3).every((p) => p[2] === 0xffffff)).toBe(true);
    expect(digit(5).every((p) => p[2] === 0xf5c542)).toBe(true);
  });
});
