// 교체 가능한 이미지 키 목록 → docs/CUSTOM_ART.md 의 목록 부분 생성.  사용법: node tools/gen-art-doc.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { MERC_CLASSES, MERC_NAMES, HEROES, HERO_ARCHETYPES } from '../src/data/heroes.js';
import { NORMAL_DESIGNS, ELITE_DESIGNS, BOSS_DESIGNS } from '../src/art/monsters.js';
import { RELICS } from '../src/data/relics.js';
import { BIOMES } from '../src/data/biomes.js';

const ATTR = { red: '레드', blue: '블루', green: '그린' };
const A = Object.keys(ATTR);
let md = '<!-- 아래 목록은 node tools/gen-art-doc.mjs 로 자동 생성 -->\n\n';
md += '### 용병 (16×16 · 애니메이션 idle / attack)\n\n| 키 | 용병 |\n|---|---|\n';
for (const cls of Object.keys(MERC_CLASSES)) for (const a of A) md += `| \`merc_${cls}_${a}\` | ${MERC_NAMES[a][cls]} (${ATTR[a]} ${MERC_CLASSES[cls].role}) |\n`;
md += '\n### 영웅 (16×16 · 애니메이션 idle / attack)\n\n| 키 | 영웅 |\n|---|---|\n';
for (const a of A) for (const h of HEROES[a]) md += `| \`hero_${h.id}\` | ${h.name} (${ATTR[a]} ${HERO_ARCHETYPES[h.arch].title}) |\n`;
const mon = (title, list, size, waveOf) => {
  md += `\n### ${title} (${size} · 애니메이션 walk) — 속성마다 1장씩 (\`_red\` / \`_blue\` / \`_green\`)\n\n| 키 (레드 예시) | 이름 | 등장 |\n|---|---|---|\n`;
  list.forEach((d, i) => (md += `| \`mon_${d.id}_red\` | ${d.name} | ${waveOf(i, d)} |\n`));
};
mon('일반 몬스터', NORMAL_DESIGNS, '12×12', (i) => `${i * 5 + 1}~${i * 5 + 5} 웨이브`);
mon('정예 몬스터', ELITE_DESIGNS, '12×12', (i) => `${i * 10 + 5} 웨이브`);
mon('보스', BOSS_DESIGNS, '16×16, 최종 보스 20×20', (i) => `${(i + 1) * 10} 웨이브`);
md += '\n### 유물 아이콘 (10×10)\n\n| 키 | 유물 |\n|---|---|\n';
for (const r of RELICS) md += `| \`relic_${r.id}\` | ${r.name} |\n`;
md += '\n### 지역 배경 (136×240, 화면 전체)\n\n| 키 | 지역 |\n|---|---|\n';
for (const b of BIOMES) md += `| \`bg_${b.id}\` | ${b.name} |\n`;
md += '\n### 기타\n\n| 키 | 크기 | 설명 |\n|---|---|---|\n';
md += '| `icon_coin`, `icon_skull` | 8×8 | 동전·해골 아이콘 |\n';
for (const a of A) md += `| \`arrow_${a}\`, \`orb_${a}\`, \`dagger_${a}\`, \`rune_${a}\`, \`proj_${a}\` | 작은 크기 | ${ATTR[a]} 투사체 (화살·마력구·단검·룬·기본) |\n`;

const path = new URL('../docs/CUSTOM_ART.md', import.meta.url);
const doc = readFileSync(path, 'utf8');
const marker = '## 교체 가능한 키 목록';
writeFileSync(path, doc.slice(0, doc.indexOf(marker) + marker.length) + '\n\n' + md);
console.log('docs/CUSTOM_ART.md 목록 갱신');
