// 명성 강화 트리 노드 표를 docs/UPGRADES.md 로 생성 (src/data/upgrades.js 를 바꾼 뒤 실행)
// 사용법: node tools/gen-upgrade-doc.mjs
import { writeFileSync } from 'node:fs';
import { UPGRADES, UPGRADE_BRANCHES, UPGRADE_BY_ID, formatEffect, upgradeCost } from '../src/data/upgrades.js';

const total = (u) => {
  let c = 0;
  for (let i = 0; i < u.max; i++) c += upgradeCost(u, i);
  return c;
};

let md = `# 명성 강화 트리 노드 목록\n\n> 자동 생성: \`node tools/gen-upgrade-doc.mjs\` (원본 \`src/data/upgrades.js\`). 직접 고치지 말 것.\n\n`;
md += `가운데 **용병단 결성**(뿌리)에서 공격(위)·경제(오른쪽)·전술(아래)·방어(왼쪽) 4갈래로 뻗는다. 부모 노드를 1레벨 이상 배워야 자식 노드가 열린다. 총 ${UPGRADES.length}개.\n\n`;
for (const b of UPGRADE_BRANCHES) {
  const list = UPGRADES.filter((u) => u.branch === b.id);
  md += `## ${b.name} (${list.length})\n\n| 노드 | 글자 | 효과 (1레벨당) | 최대 | 부모 | 첫 비용 | 최대까지 총 비용 |\n|---|---|---|---|---|---|---|\n`;
  for (const u of list) {
    md += `| ${u.name} | ${u.glyph} | ${u.label} ${formatEffect(u, 1)} | ${u.max} | ${u.parent ? UPGRADE_BY_ID[u.parent].name : '—'} | ${upgradeCost(u, 0)} | ${total(u).toLocaleString()} |\n`;
  }
  md += '\n';
}
writeFileSync(new URL('../docs/UPGRADES.md', import.meta.url), md);
console.log(`docs/UPGRADES.md: ${UPGRADES.length}개 노드`);
