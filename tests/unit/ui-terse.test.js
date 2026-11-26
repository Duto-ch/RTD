// UI 문구 = 개조식 (2026-11-25 사용자 결정: "UI 는 기획서가 아니다 — 서술형 문구 금지, 레이아웃으로 의도 전달")
// 화면에 나오는 문자열(따옴표 안)이 '~요·~니다·~세요' 같은 서술형 어미로 끝나면 실패. 주석 줄은 보지 않는다
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIRS = ['src/ui', 'src/scenes'];
// 따옴표 문자열 안에서 서술형 어미 + (문장부호) + 문자열 끝 또는 줄바꿈
const SENTENCE = /(요|니다|세요|어라|십시오)[.!?]?(\\n|['"`])/;

describe('UI 문구는 개조식', () => {
  for (const dir of DIRS) {
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.js'))) {
      it(`${dir}/${f}`, () => {
        const bad = [];
        readFileSync(join(dir, f), 'utf8').split('\n').forEach((line, i) => {
          const code = line.replace(/\/\/.*$/, ''); // 줄 끝 주석 제거
          if (/^\s*(\*|\/\*)/.test(line)) return; // 블록 주석
          const strs = code.match(/(['"`])(?:\\.|(?!\1).)*\1/g) || [];
          for (const s of strs) if (SENTENCE.test(s) && /[가-힣]/.test(s)) bad.push(`${i + 1}: ${s}`);
        });
        expect(bad).toEqual([]);
      });
    }
  }
});
