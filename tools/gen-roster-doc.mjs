// 캐릭터 96명 설계표 생성: node tools/gen-roster-doc.mjs → docs/ROSTER.md (+ ChatGPT 프롬프트 목록 docs/ROSTER_PROMPTS.md)
import { writeFileSync } from 'node:fs';
import { ROSTER, GRADES, STYLES, TRAIT_TEXT, skillLevels, STYLE_PROMPT, artPrompt, DECK_POINTS } from '../src/data/roster.js';
import { describeSkill } from '../src/data/skills.js';

const ATTR = { red: '레드', blue: '블루', green: '그린' };
const lines = [];
const P = (s = '') => lines.push(s);
P('# 캐릭터 96명 설계표');
P();
P('> 자동 생성 파일 — `src/data/roster.js` 를 고친 뒤 `node tools/gen-roster-doc.mjs` 로 다시 만든다.');
P();
P('## 규칙 요약');
P();
P(`- 속성 3 × (커먼 13 · 언커먼 9 · 레어 6 · 유니크 4) = ${ROSTER.length}명. 병과 없음 — 캐릭터마다 기본 공격 스타일 + 고유 특성 + 확정 스킬 4개`);
P(`- 덱: 등급 포인트 합 ${DECK_POINTS} 이하 (${Object.values(GRADES).map((g) => `${g.name} ${g.pt}`).join(' · ')})`);
P(`- 고용 확률: ${Object.values(GRADES).map((g) => `${g.name} ${g.hire}%`).join(' · ')} — 등급을 먼저 정하고, 덱에 있는 그 등급 캐릭터 중 무작위 (덱에 그 등급이 없으면 한 단계 아래)`);
P(`- 기본 능력치 배율: ${Object.values(GRADES).map((g) => `${g.name} ×${g.mult}`).join(' · ')} (높은 등급일수록 공격력·스킬이 강함)`);
P('- 합성: 같은 속성 + 같은 등급 + 같은 레벨끼리, 놓여 있는 쪽이 레벨 업. 유니크는 고용으로만 나온다');
P('- 스킬: 커먼·언커먼·레어는 Lv2·3·4·5 에 하나씩, 유니크는 Lv1·2·3·4 (Lv1 = 대표 스킬. 고용 1%라 합성이 드물어서)');
P('- 속성 추가 효과(피해 스킬): 레드 피해 +25% · 블루 20% 감속 1.2초 · 그린 2초간 초당 40% 지속 피해 — 지금과 같다');
P();
P('### 기본 공격 스타일 (1레벨 · 등급 배율 전)');
P();
P('| 스타일 | 공격력 | 공속 | 사거리 | 비고 |');
P('|---|---|---|---|---|');
for (const s of Object.values(STYLES)) P(`| ${s.name} | ${s.dmg} | ${s.rate} | ${s.range} | ${s.splash ? `범위 ${s.splash}` : ''} |`);
P();
P('### 인원');
P();
P('| 속성 | 커먼 | 언커먼 | 레어 | 유니크 | 합계 |');
P('|---|---|---|---|---|---|');
for (const a of Object.keys(ATTR)) {
  const n = (g) => ROSTER.filter((c) => c.attr === a && c.grade === g).length;
  P(`| ${ATTR[a]} | ${n(1)} | ${n(2)} | ${n(3)} | ${n(4)} | ${ROSTER.filter((c) => c.attr === a).length} |`);
}
for (const a of Object.keys(ATTR)) {
  P();
  P(`## ${ATTR[a]}`);
  for (const g of [1, 2, 3, 4]) {
    P();
    P(`### ${GRADES[g].name}`);
    for (const c of ROSTER.filter((x) => x.attr === a && x.grade === g)) {
      const st = STYLES[c.style];
      P();
      P(`#### ${c.name} — ${c.title}`);
      P();
      P(`- **기본 공격**: ${st.name} (공격력 ${+(st.dmg * GRADES[g].mult).toFixed(1)} · 공속 ${st.rate} · 사거리 ${st.range}) — ${TRAIT_TEXT(c.trait)}`);
      const lv = skillLevels(c);
      c.skills.forEach((s, i) => P(`- **Lv${lv[i]} ${s.name}** (${s.cd}초): ${describeSkill(s)}`));
    }
  }
}
writeFileSync('docs/ROSTER.md', lines.join('\n') + '\n');

const pr = ['# 캐릭터 그림 프롬프트 (ChatGPT)', '', '> 자동 생성 — `node tools/gen-roster-doc.mjs`', '', '## 공통 스타일 (모든 프롬프트 앞에 붙는다)', '', '```', STYLE_PROMPT, '```', '',
  '## 사용 방법', '', '1. 아래 프롬프트를 ChatGPT 에 한 명씩 넣는다 (한 번에 여러 명을 넣으면 크기·스타일이 섞인다)',
  '2. 결과 PNG 를 저장소 `art-inbox/` 폴더에 `캐릭터id.png` 이름으로 올린다 (예: `eric.png`)',
  '3. Claude 가 `tools/import-art.py` 로 16x16 격자 정리·배경 제거·색 줄이기를 하고 게임에 넣는다', ''];
for (const a of Object.keys(ATTR)) {
  pr.push(`## ${ATTR[a]}`, '');
  for (const c of ROSTER.filter((x) => x.attr === a)) pr.push(`### ${c.id} · ${c.name} (${GRADES[c.grade].name})`, '', '```', artPrompt(c), '```', '');
}
writeFileSync('docs/ROSTER_PROMPTS.md', pr.join('\n'));
console.log(`docs/ROSTER.md: ${ROSTER.length}명 · docs/ROSTER_PROMPTS.md`);
