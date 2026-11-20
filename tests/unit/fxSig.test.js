import { describe, it, expect } from 'vitest';
import { FX_SIG } from '../../src/data/fxSig.js';
import { ROSTER } from '../../src/data/roster.js';

// 2026-11-18 사용자 결정: 레어는 가급적 전용, 유니크는 완전 전용 스킬 이펙트 (예전 레어·유니크 34명 스킬 136개 시트)
// 룰 v2 (2026-11-20): 스킬 1개 — 새 등급의 레어·유니크 28명 모두 대표 스킬에 전용 시트가 있다 (남는 시트는 재활용 대기, FX_REUSE.md)
describe('레어·유니크 전용 스킬 이펙트', () => {
  const chars = ROSTER.filter((c) => c.grade >= 3);
  it('레어·유니크 캐릭터의 대표 스킬마다 전용 시트가 있다', () => {
    expect(chars).toHaveLength(28);
    for (const c of chars) expect(FX_SIG[c.skill.id]).toBeTruthy();
    expect(Object.keys(FX_SIG)).toHaveLength(136);
  });
  it('재생 위치 종류가 정해져 있고 프레임마다 길이가 있다', () => {
    for (const d of Object.values(FX_SIG)) {
      expect(['target', 'center', 'self_area', 'chain', 'self', 'adj', 'ally']).toContain(d.kind);
      expect(d.ms).toHaveLength(d.n);
    }
  });
});
