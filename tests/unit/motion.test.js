import { describe, it, expect } from 'vitest';
import { badgePop } from '../../src/ui/motion.js';

// 강화 버튼 느낌표 스케일 팝 (2026-11-19): 1 → 1.35 → 0.92 → 1 후 쉼
// 브라우저 테스트는 '정지 중에도 실제 시간으로 커진다'만 보고, 곡선 모양은 여기서 본다 (2026-11-26: 느린 CI 에서 0.1초 남짓한 작아지는 순간을 놓쳤다)
describe('badgePop', () => {
  const samples = Array.from({ length: 1301 }, (_, i) => badgePop(i / 1300));
  it('처음·쉬는 구간은 1', () => {
    expect(badgePop(0)).toBe(1);
    expect(badgePop(0.3)).toBe(1);
    expect(badgePop(0.99)).toBe(1);
  });
  it('최대 1.35 까지 커지고 0.92 까지 작아졌다 1 로 돌아온다', () => {
    expect(Math.max(...samples)).toBeCloseTo(1.35, 2);
    expect(Math.min(...samples)).toBeCloseTo(0.92, 2);
    expect(badgePop(0.2999)).toBeCloseTo(1, 2);
  });
  it('커지는 → 작아지는 순서', () => {
    const iMax = samples.indexOf(Math.max(...samples));
    const iMin = samples.indexOf(Math.min(...samples));
    expect(iMax).toBeLessThan(iMin);
  });
  it('끊김 없이 이어진다 (이웃 표본 차이가 작다)', () => {
    for (let i = 1; i < samples.length; i++) expect(Math.abs(samples[i] - samples[i - 1])).toBeLessThan(0.05);
  });
});
