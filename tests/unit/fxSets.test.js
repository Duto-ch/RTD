import { describe, it, expect } from 'vitest';
import { FX_SETS } from '../../src/data/fxSets.js';

// 2026-11-18 사용자 결정: 스킬 이펙트 등급별 겹침 — 커먼끼리·언커먼끼리 공용 세트 (서로는 공유 안 함), 속성 3색
describe('커먼·언커먼 공용 스킬 이펙트 세트', () => {
  const COMMON = ['hit', 'blast', 'slow', 'stun', 'push', 'dot', 'vuln', 'pulse', 'buff_adj', 'buff_self', 'gold'];
  const UNCOMMON = [...COMMON, 'chain', 'buff_all'];
  it('커먼 11종 · 언커먼 13종이 속성 3색 모두 있다', () => {
    for (const a of ['red', 'blue', 'green']) {
      for (const k of COMMON) expect(FX_SETS[`c_${k}_${a}`]).toBeTruthy();
      for (const k of UNCOMMON) expect(FX_SETS[`u_${k}_${a}`]).toBeTruthy();
    }
    expect(Object.keys(FX_SETS)).toHaveLength((COMMON.length + UNCOMMON.length) * 3);
  });
  it('프레임마다 길이가 있고, 버프의 바닥 고리·칸 테두리는 캐릭터 뒤 레이어(back)', () => {
    for (const d of Object.values(FX_SETS)) expect(d.ms).toHaveLength(d.n);
    for (const k of ['buff_self', 'buff_adj']) expect(FX_SETS[`c_${k}_red`].back).toBe(true);
    expect(FX_SETS.u_buff_all_red.back).toBe(true);
  });
});
