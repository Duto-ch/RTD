import { describe, it, expect } from 'vitest';
import { FX_SIG } from '../../src/data/fxSig.js';
import { ROSTER } from '../../src/data/roster.js';

// 2026-11-18 사용자 결정: 레어는 가급적 전용, 유니크는 완전 전용 스킬 이펙트 → 레어·유니크 34명 스킬 136개 모두 자기 시트
describe('레어·유니크 전용 스킬 이펙트', () => {
  const chars = ROSTER.filter((c) => c.grade >= 3);
  it('레어·유니크 캐릭터의 스킬마다 전용 시트가 있다 (136개)', () => {
    expect(chars).toHaveLength(34);
    for (const c of chars) c.skills.forEach((_, i) => expect(FX_SIG[`${c.id}_${i}`]).toBeTruthy());
    expect(Object.keys(FX_SIG)).toHaveLength(136);
  });
  it('재생 위치 종류가 정해져 있고 프레임마다 길이가 있다', () => {
    for (const d of Object.values(FX_SIG)) {
      expect(['target', 'center', 'self_area', 'chain', 'self', 'adj', 'ally']).toContain(d.kind);
      expect(d.ms).toHaveLength(d.n);
    }
  });
});
