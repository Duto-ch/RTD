import { describe, it, expect } from 'vitest';
import { ROSTER, GRADES, DECK_POINTS, DEFAULT_DECK, deckPoints, deckValid, rollHire, skillLevels } from '../../src/data/roster.js';

// 2026-11-17 사용자 결정: 캐릭터 96명(속성 3 × 커먼 13·언커먼 9·레어 6·유니크 4), 병과 폐지, 덱 40포인트, 유니크 고용 1%
describe('캐릭터 96명 · 등급 · 덱', () => {
  it('속성마다 커먼 13 · 언커먼 9 · 레어 6 · 유니크 4 = 96명, id·이름 중복 없음, 스킬 4개씩', () => {
    expect(ROSTER).toHaveLength(96);
    for (const a of ['red', 'blue', 'green'])
      expect([1, 2, 3, 4].map((g) => ROSTER.filter((c) => c.attr === a && c.grade === g).length)).toEqual([13, 9, 6, 4]);
    expect(new Set(ROSTER.map((c) => c.id)).size).toBe(96);
    expect(new Set(ROSTER.map((c) => c.name)).size).toBe(96);
    for (const c of ROSTER) expect(c.skills).toHaveLength(4);
  });

  it('등급 포인트 1·2·3·4, 덱 40포인트, 고용 확률 60·28·11·1%', () => {
    expect([1, 2, 3, 4].map((g) => GRADES[g].pt)).toEqual([1, 2, 3, 4]);
    expect(DECK_POINTS).toBe(40);
    expect([1, 2, 3, 4].map((g) => GRADES[g].hire)).toEqual([60, 28, 11, 1]);
    expect(deckValid(DEFAULT_DECK)).toBe(true);
    expect(deckPoints(DEFAULT_DECK)).toBeLessThanOrEqual(40);
    expect(deckValid([...ROSTER.filter((c) => c.grade === 4).map((c) => c.id)])).toBe(false); // 12명 × 4 = 48 > 40
    expect(deckValid([])).toBe(false);
  });

  it('높은 등급일수록 기본 공격력 배율이 크다', () => {
    expect(GRADES[1].mult).toBeLessThan(GRADES[2].mult);
    expect(GRADES[2].mult).toBeLessThan(GRADES[3].mult);
    expect(GRADES[3].mult).toBeLessThan(GRADES[4].mult);
  });

  it('스킬은 레벨마다 하나씩: 커먼~레어 Lv2·3·4·5, 유니크 Lv1·2·3·4', () => {
    expect(skillLevels(ROSTER.find((c) => c.grade === 1))).toEqual([2, 3, 4, 5]);
    expect(skillLevels(ROSTER.find((c) => c.grade === 4))).toEqual([1, 2, 3, 4]);
  });

  it('고용: 등급을 굴려 덱의 그 등급에서 뽑고, 없으면 아래 등급 → 위 등급', () => {
    const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };
    const deck = ['eric', 'bridget', 'elva', 'ragnar'];
    expect(rollHire(deck, {}, seq([0.005, 0])).id).toBe('ragnar'); // 1% 미만 → 유니크
    expect(rollHire(deck, {}, seq([0.05, 0])).id).toBe('elva'); // 1~12% → 레어
    expect(rollHire(deck, {}, seq([0.3, 0])).id).toBe('bridget'); // 12~40% → 언커먼
    expect(rollHire(deck, {}, seq([0.9, 0])).id).toBe('eric'); // 나머지 커먼
    expect(rollHire(['eric'], {}, seq([0.005, 0])).id).toBe('eric'); // 덱에 유니크가 없으면 아래 등급
    expect(rollHire(['ragnar'], {}, seq([0.9, 0])).id).toBe('ragnar'); // 아래 등급도 없으면 위 등급
  });
});
