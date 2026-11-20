// 캐릭터 설계표 생성 (룰 v2 70명): node tools/gen-roster-doc.mjs → docs/ROSTER.md (+ ChatGPT 프롬프트 목록 docs/ROSTER_PROMPTS.md)
import { writeFileSync } from 'node:fs';
import { ROSTER, GRADES, STYLES, TRAIT_TEXT, STYLE_PROMPT, artPrompt, DECK_RULES, DEFAULT_DECK } from '../src/data/roster.js';
import { describeSkill } from '../src/data/skills.js';
import { starSkill } from '../src/data/stars.js';
import { TRAITS, CLASS_IDS, ORIGIN_IDS } from '../src/data/synergy.js';
import { SHOP } from '../src/data/shop.js';

const ATTR = { red: '레드', blue: '블루', green: '그린' };
const lines = [];
const P = (s = '') => lines.push(s);
P(`# 캐릭터 ${ROSTER.length}명 설계표 (룰 v2)`);
P();
P('> 자동 생성 파일 — `src/data/roster.js` 를 고친 뒤 `node tools/gen-roster-doc.mjs` 로 다시 만든다.');
P();
P('## 규칙 요약');
P();
P(`- ${ROSTER.length}명 = ${[1, 2, 3, 4].map((g) => `${GRADES[g].name} ${ROSTER.filter((c) => c.grade === g).length}`).join(' · ')}. 캐릭터마다 계열 1개 + 출신 1개(시너지), 기본 공격 스타일 + 고유 특성 + 스킬 1개(마나가 차면 시전, 별마다 강해짐)`);
P(`- 상점 값: ${[1, 2, 3, 4].map((g) => `${GRADES[g].name} ${GRADES[g].price * SHOP.unit}G`).join(' · ')} · 기본 능력치 배율: ${[1, 2, 3, 4].map((g) => `${GRADES[g].name} ×${GRADES[g].mult}`).join(' · ')}`);
P(`- 같은 캐릭터 3장 → 별 승급 (1성 → 2성 → 3성). 속성(레드·블루·그린)은 그림 색으로만 남음 (상성 없음)`);
P(`- 덱: 가진 캐릭터(술집 고용) 중 최대 ${DECK_RULES.max}명 · 레어 ${DECK_RULES.rare} · 유니크 ${DECK_RULES.unique}. 처음 가진 캐릭터 = 기본 덱 ${DEFAULT_DECK.length}명`);
P();
P('### 기본 공격 스타일 (1성 · 등급 배율 전)');
P();
P('| 스타일 | 공격력 | 공속 | 사거리 | 비고 |');
P('|---|---|---|---|---|');
for (const s of Object.values(STYLES)) P(`| ${s.name} | ${s.dmg} | ${s.rate} | ${s.range} | ${s.splash ? `범위 ${s.splash}` : ''} |`);
P();
P('### 계열 × 출신 인원');
P();
P(`| 계열＼출신 | ${ORIGIN_IDS.map((o) => TRAITS[o].name).join(' | ')} | 합계 |`);
P(`|---|${ORIGIN_IDS.map(() => '---').join('|')}|---|`);
for (const k of CLASS_IDS) P(`| ${TRAITS[k].name} | ${ORIGIN_IDS.map((o) => ROSTER.filter((c) => c.cls === k && c.origin === o).length || '').join(' | ')} | ${ROSTER.filter((c) => c.cls === k).length} |`);
for (const g of [4, 3, 2, 1]) {
  P();
  P(`## ${GRADES[g].name} (${ROSTER.filter((c) => c.grade === g).length}명)`);
  for (const c of ROSTER.filter((x) => x.grade === g)) {
    const st = STYLES[c.style];
    P();
    P(`#### ${c.name} — ${c.title}${DEFAULT_DECK.includes(c.id) ? ' · 기본 덱' : ''}`);
    P();
    P(`- **${TRAITS[c.cls].name} · ${TRAITS[c.origin].name}** (그림 색 ${ATTR[c.attr] || c.attr})`);
    P(`- **기본 공격**: ${st.name} (공격력 ${+(st.dmg * GRADES[g].mult).toFixed(1)} · 공속 ${st.rate} · 사거리 ${st.range}) — ${TRAIT_TEXT(c.trait)}`);
    P(`- **스킬 「${c.skill.name}」**`);
    for (const n of [1, 2, 3]) P(`  - ${'★'.repeat(n)} ${describeSkill(starSkill(c.skill, n))}`);
  }
}
writeFileSync('docs/ROSTER.md', lines.join('\n') + '\n');

const pr = ['# 캐릭터 그림 프롬프트 (ChatGPT)', '', '> 자동 생성 — `node tools/gen-roster-doc.mjs`', '', '## 공통 스타일 (모든 프롬프트 앞에 붙는다)', '', '```', STYLE_PROMPT, '```', '',
  '## 사용 방법', '', '1. 아래 프롬프트를 ChatGPT 에 한 명씩 넣는다 (한 번에 여러 명을 넣으면 크기·스타일이 섞인다)',
  '2. 결과 PNG 를 저장소 `art-inbox/` 폴더에 `캐릭터id.png` 이름으로 올린다 (예: `eric.png`)',
  '3. Claude 가 `tools/import-art.py` 로 16x16 격자 정리·배경 제거·색 줄이기를 하고 게임에 넣는다', ''];
for (const g of [4, 3, 2, 1]) {
  pr.push(`## ${GRADES[g].name}`, '');
  for (const c of ROSTER.filter((x) => x.grade === g)) pr.push(`### ${c.id} · ${c.name}`, '', '```', artPrompt(c), '```', '');
}
writeFileSync('docs/ROSTER_PROMPTS.md', pr.join('\n'));
console.log(`docs/ROSTER.md: ${ROSTER.length}명 · docs/ROSTER_PROMPTS.md`);
