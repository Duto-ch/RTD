// 스킬 데이터 → docs/SKILLS.md 생성.  사용법: node tools/gen-skill-doc.mjs
import { writeFileSync } from 'node:fs';
import { MERC_CLASSES, MERC_CLASS_IDS, MERC_NAMES, HEROES, HERO_ARCHETYPES } from '../src/data/heroes.js';
import { skillOptions, describeSkill, ELEMENT_FLAVOR } from '../src/data/skills.js';

const ATTR = { red: '레드', blue: '블루', green: '그린' };
let md = '# 스킬 목록 (자동 생성 — `node tools/gen-skill-doc.mjs`)\n\n';
md += '모든 스킬은 쿨타임이 끝나면 자동 시전. 레벨 업(2~5) 때마다 해당 레벨 3종 중 1개 랜덤 습득.\n\n';
md += '속성 추가 효과 (피해를 주는 스킬): ' + Object.entries(ELEMENT_FLAVOR).map(([a, f]) => `${ATTR[a]} — ${f.desc}`).join(' / ') + '\n\n';
for (const attr of Object.keys(ATTR)) {
  md += `## ${ATTR[attr]}\n\n`;
  for (const cls of MERC_CLASS_IDS) {
    md += `### ${MERC_NAMES[attr][cls]} (${MERC_CLASSES[cls].role})\n\n| Lv | 스킬 | 쿨 | 효과 |\n|---|---|---|---|\n`;
    for (const lv of [2, 3, 4, 5]) for (const s of skillOptions(attr, cls, lv)) md += `| ${lv} | ${s.name} | ${s.cd}s | ${describeSkill(s)} |\n`;
    md += '\n';
  }
  md += `### 영웅 (${ATTR[attr]})\n\n| 영웅 | 원형 | 고유 스킬 | 쿨 | 효과 |\n|---|---|---|---|---|\n`;
  for (const h of HEROES[attr]) md += `| ${h.name} | ${HERO_ARCHETYPES[h.arch].title} | ${h.unique.name} | ${h.unique.cd}s | ${describeSkill(h.unique)} |\n`;
  md += '\n';
}
writeFileSync(new URL('../docs/SKILLS.md', import.meta.url), md);
console.log('docs/SKILLS.md written');
