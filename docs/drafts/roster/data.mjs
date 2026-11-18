import { writeFileSync } from 'node:fs';
import { ROSTER, GRADES, STYLES, TRAIT_TEXT, skillLevels, STYLE_PROMPT, artPrompt, DECK_POINTS } from '../../../src/data/roster.js';
import { describeSkill } from '../../../src/data/skills.js';
const out = ROSTER.map((c) => {
  const st = STYLES[c.style]; const lv = skillLevels(c);
  return { id: c.id, n: c.name, a: c.attr, g: c.grade, t: c.title, s: st.name, d: +(st.dmg * GRADES[c.grade].mult).toFixed(1), r: st.rate, rg: st.range,
    tr: TRAIT_TEXT(c.trait), sk: c.skills.map((s, i) => ({ l: lv[i], n: s.name, cd: s.cd, d: describeSkill(s) })), p: artPrompt(c) };
});
writeFileSync(process.argv[2], JSON.stringify({ roster: out, grades: GRADES, styles: STYLES, style: STYLE_PROMPT, deck: DECK_POINTS }));
