// ── 캐릭터 96명 (2026-11-17 사용자 결정: 병과 폐지·속성만 유지·등급 4단계) ──────────
// 속성 3 × (커먼 13 · 언커먼 9 · 레어 6 · 유니크 4) = 96명.
// 캐릭터 = 기본 공격(스타일 + 고유 특성) + 레벨마다 하나씩 열리는 확정 스킬 4개.
//   커먼·언커먼·레어: Lv2·3·4·5 에 하나씩 / 유니크: 고용으로만 나와 합성이 드물어 Lv1·2·3·4 (Lv1 = 대표 스킬)
// 스킬 형식은 data/skills.js 와 같다 (area·fx·buff·gold). 새 효과(특성)는 아래 TRAITS 설명 참고.
// look: ChatGPT 그림 프롬프트에 들어갈 외형 (영어). STYLE_PROMPT 와 합쳐 쓴다.

/** 등급: 포인트(덱 40포인트 안에서 편성) · 기본 능력치 배율 · 고용 확률(%) */
export const GRADES = {
  1: { id: 'common', name: '커먼', pt: 1, mult: 1, hire: 60, color: '#9aa7a4' },
  2: { id: 'uncommon', name: '언커먼', pt: 2, mult: 1.6, hire: 28, color: '#4fb06a' },
  3: { id: 'rare', name: '레어', pt: 3, mult: 2.5, hire: 11, color: '#3f8fe0' },
  4: { id: 'unique', name: '유니크', pt: 4, mult: 4, hire: 1, color: '#f2b530' }
};
export const DECK_POINTS = 40;

/** 기본 공격 스타일 — 1레벨 기본 능력치 (등급 배율 전) */
export const STYLES = {
  bow: { name: '연사', dmg: 8, rate: 1.4, range: 220 },
  rapid: { name: '속공', dmg: 6, rate: 2.2, range: 180 },
  heavy: { name: '저격', dmg: 28, rate: 0.45, range: 320 },
  blast: { name: '폭발', dmg: 9, rate: 0.8, range: 200, splash: 44 },
  hex: { name: '주술', dmg: 6, rate: 1.0, range: 210 },
  brawl: { name: '근접', dmg: 13, rate: 1.1, range: 150, splash: 30 },
  aid: { name: '지원', dmg: 5, rate: 1.0, range: 200 }
};

/**
 * 고유 특성 (기본 공격에 붙는다)
 *  targets n · splash r · chain n · crit p · slow [비율,초] · dot [초당 배율,초] · vuln [받는 피해+,초]
 *  bossMult x(보스·정예에게 x배) · push px · stun [확률,초] · aura {dmg,rate,range}(주변 8칸 아군 상시)
 *  bounty 비율(처치 골드 +) · execute 비율(그 이하 일반 몬스터 즉사) · rangeMul · rateMul · dmgMul
 */
export const TRAIT_TEXT = (t) => {
  const p = (v) => `${Math.round(v * 100)}%`;
  const o = [];
  if (t.targets) o.push(`동시에 ${t.targets}명 공격`);
  if (t.splash) o.push(`주변 반경 ${t.splash} 범위 피해`);
  if (t.chain) o.push(`${t.chain}명에게 튀는 연쇄`);
  if (t.crit) o.push(`치명타 ${p(t.crit)}`);
  if (t.slow) o.push(`${p(t.slow[0])} 감속 ${t.slow[1]}초`);
  if (t.dot) o.push(`${t.dot[1]}초간 초당 ${p(t.dot[0])} 지속 피해`);
  if (t.vuln) o.push(`받는 피해 +${p(t.vuln[0])} ${t.vuln[1]}초`);
  if (t.bossMult) o.push(`보스·정예에게 ${t.bossMult}배`);
  if (t.push) o.push(`${t.push}만큼 밀침`);
  if (t.stun) o.push(`${p(t.stun[0])} 확률 ${t.stun[1]}초 기절`);
  if (t.aura) o.push(`주변 8칸 아군 ${[t.aura.dmg && `공격력 +${p(t.aura.dmg)}`, t.aura.rate && `공속 +${p(t.aura.rate)}`, t.aura.range && `사거리 +${p(t.aura.range)}`].filter(Boolean).join(' · ')} (상시)`);
  if (t.bounty) o.push(`처치 골드 +${p(t.bounty)}`);
  if (t.execute) o.push(`체력 ${p(t.execute)} 이하 일반 몬스터 즉사`);
  if (t.rangeMul) o.push(`사거리 ${t.rangeMul > 1 ? '+' : ''}${p(t.rangeMul - 1)}`);
  if (t.rateMul) o.push(`공격 속도 ${t.rateMul > 1 ? '+' : ''}${p(t.rateMul - 1)}`);
  if (t.dmgMul) o.push(`공격력 ${t.dmgMul > 1 ? '+' : ''}${p(t.dmgMul - 1)}`);
  return o.join(' · ');
};

// 스킬 도우미
const one = { type: 'single' };
const all = { type: 'range' };
const many = (n) => ({ type: 'multi', n });
const ring = (r) => ({ type: 'circle', r });
const bolt = (n) => ({ type: 'chain', n });
const S = (name, cd, o) => ({ name, cd, ...o });
const hit = (dmg, extra = {}) => ({ fx: { dmg, ...extra } });

/** 캐릭터 정의 */
const C = (attr, grade, id, name, style, title, look, trait, skills) => ({ attr, grade, id, name, style, title, look, trait, skills });

// ══════════════════════════════ 레드 — 불·전쟁·대장간·사막 ══════════════════════════════
const RED = [
  // ── 커먼 13 ──
  C('red', 1, 'eric', '에릭', 'bow', '불화살 견습 궁수', 'red-haired teen archer with a short bow and leather vest', { dot: [0.3, 2] }, [
    S('불화살 연발', 6, { area: many(3), ...hit(1.5) }), S('불꽃 화살비', 9, { area: ring(60), ...hit(2) }),
    S('타오르는 집중', 12, { buff: { scope: 'self', rate: 0.5, dur: 5 } }), S('화염 일제 사격', 14, { area: many(8), ...hit(2.5) })]),
  C('red', 1, 'rowan', '로완', 'rapid', '골목 소매치기', 'sly street thief boy with red bandana and twin daggers', { crit: 0.2, bounty: 0.1 }, [
    S('빠른 손', 10, { gold: 4, goldPerWave: 0.2 }), S('뒷골목 찌르기', 6, { area: one, ...hit(4) }),
    S('연기 폭탄', 10, { area: ring(60), fx: { slow: [0.4, 2] } }), S('한탕', 20, { area: one, fx: { dmg: 6 }, gold: 15 })]),
  C('red', 1, 'helga', '헬가', 'hex', '불씨 주술사', 'old fire witch with ember lantern and patched red shawl', { dot: [0.6, 3] }, [
    S('불씨 저주', 6, { area: one, fx: { dot: [1, 4] } }), S('잿불 장판', 9, { area: ring(70), fx: { dot: [0.8, 4] } }),
    S('화로의 축복', 14, { buff: { scope: 'adjacent', dmg: 0.15, dur: 6 } }), S('대화재', 18, { area: all, fx: { dot: [1.2, 5] } })]),
  C('red', 1, 'gunnar', '군나르', 'heavy', '화승총 사냥꾼', 'bearded hunter with a long matchlock rifle and fur cap', { bossMult: 1.4 }, [
    S('화약 장전', 7, { area: one, ...hit(4) }), S('철갑탄', 8, { area: one, fx: { dmg: 2.5, vuln: [0.2, 4] } }),
    S('표적 사냥', 12, { pick: 'strongest', area: one, ...hit(6) }), S('대구경 한 발', 18, { pick: 'strongest', area: one, fx: { dmg: 14, bossMult: 1.5 } })]),
  C('red', 1, 'toby', '토비', 'blast', '불장난 꼬마 마법사', 'small apprentice mage kid with oversized red hat and smoking wand', { splash: 10 }, [
    S('불꽃 구슬', 6, { area: ring(50), ...hit(2) }), S('어설픈 폭발', 9, { area: ring(70), ...hit(2.5) }),
    S('주문 연습', 12, { buff: { scope: 'self', rate: 0.6, dur: 4 } }), S('대폭발(실수)', 16, { area: ring(110), ...hit(3.5) })]),
  C('red', 1, 'bran', '브랜', 'brawl', '대장간 견습생', 'stocky blacksmith apprentice with a big hammer and soot-stained apron', { stun: [0.1, 0.6] }, [
    S('망치 내려찍기', 6, { area: ring(50), fx: { dmg: 2, stun: 0.5 } }), S('달군 쇠', 8, { area: one, fx: { dmg: 3, dot: [0.5, 3] } }),
    S('풀무질', 14, { buff: { scope: 'adjacent', rate: 0.15, dur: 6 } }), S('모루 던지기', 16, { area: ring(70), fx: { dmg: 4, stun: 1 } })]),
  C('red', 1, 'miles', '마일스', 'bow', '성벽 석궁병', 'young crossbowman in a red tabard with a steel helmet', { targets: 2 }, [
    S('2연발 볼트', 6, { area: many(2), ...hit(2) }), S('관통 볼트', 8, { area: many(4), ...hit(1.8) }),
    S('성벽 수비', 14, { buff: { scope: 'self', range: 0.3, dur: 8 } }), S('일제 사격', 14, { area: many(10), ...hit(2) })]),
  C('red', 1, 'kale', '케일', 'blast', '투석병', 'freckled slinger girl with a leather sling and pouch of rocks', { push: 12 }, [
    S('돌팔매', 5, { area: ring(40), fx: { dmg: 2, push: 30 } }), S('불붙은 돌', 8, { area: ring(60), fx: { dmg: 2, dot: [0.6, 3] } }),
    S('연속 투석', 10, { area: many(5), ...hit(1.8) }), S('바위 굴리기', 18, { area: all, fx: { dmg: 1.5, push: 60 } })]),
  C('red', 1, 'yvonne', '이본', 'aid', '횃불 파수꾼', 'night watch woman holding a tall torch and a horn', { aura: { range: 0.1 } }, [
    S('경계 나팔', 12, { buff: { scope: 'adjacent', rate: 0.2, dur: 5 } }), S('횃불 휘두르기', 7, { area: ring(60), ...hit(2) }),
    S('밤샘 경계', 16, { buff: { scope: 'adjacent', range: 0.25, dur: 8 } }), S('봉화', 20, { buff: { scope: 'all', dmg: 0.15, dur: 6 } })]),
  C('red', 1, 'derek', '데릭', 'brawl', '도끼 나무꾼', 'burly lumberjack with a double-bit axe and plaid shirt', { dmgMul: 1.15 }, [
    S('장작 패기', 6, { area: one, ...hit(4) }), S('휘두르기', 8, { area: ring(60), ...hit(2.5) }),
    S('나무꾼의 끈기', 14, { buff: { scope: 'self', dmg: 0.4, dur: 6 } }), S('벌목', 15, { pick: 'strongest', area: one, ...hit(10) })]),
  C('red', 1, 'molly', '몰리', 'aid', '야전 요리사', 'cheerful plump cook with a frying pan and steaming pot', { aura: { rate: 0.06 } }, [
    S('따끈한 스튜', 14, { buff: { scope: 'adjacent', dmg: 0.15, dur: 6 } }), S('프라이팬 일격', 7, { area: one, fx: { dmg: 3, stun: 0.6 } }),
    S('매운 고추', 12, { area: ring(60), fx: { dot: [0.8, 3] } }), S('잔치', 25, { buff: { scope: 'all', rate: 0.2, dur: 6 } })]),
  C('red', 1, 'sven', '스벤', 'brawl', '술통 바이킹', 'jolly viking with horned helmet carrying a beer barrel', { splash: 10, push: 10 }, [
    S('술통 굴리기', 7, { area: ring(60), fx: { dmg: 2, push: 40 } }), S('불붙은 술', 9, { area: ring(70), fx: { dot: [0.8, 4] } }),
    S('건배', 15, { buff: { scope: 'adjacent', dmg: 0.2, dur: 5 } }), S('폭발 술통', 16, { area: ring(100), ...hit(4) })]),
  C('red', 1, 'harald', '하랄드', 'heavy', '노병 창던지기', 'grey-bearded veteran spear thrower with a round shield', { bossMult: 1.3, rangeMul: 0.85 }, [
    S('투창', 6, { area: one, ...hit(3.5) }), S('창 꿰기', 9, { area: many(3), ...hit(2.5) }),
    S('노련함', 14, { buff: { scope: 'self', dmg: 0.3, rate: 0.2, dur: 6 } }), S('마지막 투창', 18, { pick: 'strongest', area: one, ...hit(12) })]),

  // ── 언커먼 9 ──
  C('red', 2, 'bridget', '브리짓', 'blast', '화염 마법사', 'red-haired fire mage woman with a flame staff and crimson robe', { splash: 15 }, [
    S('화염구', 6, { area: ring(60), ...hit(2.5) }), S('불기둥', 10, { area: ring(80), fx: { dmg: 3, dot: [0.6, 3] } }),
    S('마나 과열', 14, { buff: { scope: 'self', dmg: 0.5, dur: 5 } }), S('메테오', 16, { area: ring(120), ...hit(5) })]),
  C('red', 2, 'karsten', '카르스텐', 'brawl', '용광로 대장장이', 'muscular master smith with glowing tongs and leather apron', { aura: { dmg: 0.08 } }, [
    S('담금질', 14, { buff: { scope: 'adjacent', dmg: 0.25, dur: 6 } }), S('불꽃 망치', 7, { area: ring(60), fx: { dmg: 3, stun: 0.6 } }),
    S('쇳물 붓기', 12, { area: ring(80), fx: { dot: [1.2, 4] } }), S('명검 단조', 22, { buff: { scope: 'all', dmg: 0.25, dur: 8 } })]),
  C('red', 2, 'siri', '시리', 'rapid', '화염 무희', 'dancer with fire fans and flowing red silk dress', { crit: 0.15, targets: 2 }, [
    S('불꽃 회전', 6, { area: ring(60), ...hit(2) }), S('부채춤', 8, { area: many(5), ...hit(2) }),
    S('열정', 12, { buff: { scope: 'adjacent', rate: 0.25, dur: 5 } }), S('불새의 춤', 16, { area: all, ...hit(2.5) })]),
  C('red', 2, 'oscar', '오스카', 'heavy', '대포 공병', 'goggled engineer with a small hand cannon and backpack of shells', { splash: 30, bossMult: 1.2 }, [
    S('포탄', 7, { area: ring(60), ...hit(3) }), S('확산탄', 9, { area: many(6), ...hit(2) }),
    S('조준경 보정', 14, { buff: { scope: 'self', range: 0.3, dmg: 0.3, dur: 8 } }), S('대포 일제사격', 18, { area: ring(130), ...hit(5) })]),
  C('red', 2, 'greta', '그레타', 'hex', '재의 마녀', 'pale witch in ash grey robes with glowing red eyes and a bone wand', { dot: [0.8, 3], vuln: [0.1, 3] }, [
    S('재의 저주', 6, { area: one, fx: { dot: [1.5, 4], vuln: [0.15, 4] } }), S('잿빛 안개', 10, { area: ring(80), fx: { slow: [0.3, 3], dot: [0.6, 3] } }),
    S('타락', 12, { area: ring(70), fx: { vuln: [0.3, 5] } }), S('불타는 묘지', 18, { area: all, fx: { dot: [1.5, 5] } })]),
  C('red', 2, 'leo', '레오', 'brawl', '사자 갈기 검투사', 'gladiator with lion mane helmet, gladius and round shield', { crit: 0.2, dmgMul: 1.1 }, [
    S('검투', 5, { area: one, ...hit(3.5) }), S('사자후', 10, { area: ring(80), fx: { dmg: 1.5, stun: 0.8 } }),
    S('관중의 환호', 15, { buff: { scope: 'self', dmg: 0.6, rate: 0.3, dur: 6 } }), S('투기장의 왕', 16, { pick: 'strongest', area: one, ...hit(12) })]),
  C('red', 2, 'bern', '베른', 'bow', '사막 낙타 기병', 'desert rider in sand scarf with a recurve bow', { targets: 2, rangeMul: 1.1 }, [
    S('기마 사격', 6, { area: many(3), ...hit(2) }), S('모래 화살', 8, { area: ring(70), fx: { dmg: 2, slow: [0.3, 2] } }),
    S('질주', 12, { buff: { scope: 'self', rate: 0.8, dur: 4 } }), S('사막 폭풍', 18, { area: all, fx: { dmg: 2, slow: [0.3, 3] } })]),
  C('red', 2, 'claire', '클레어', 'aid', '전장 성기사 견습', 'young paladin squire with a sun emblem shield and short sword', { aura: { dmg: 0.06, rate: 0.06 } }, [
    S('태양의 축복', 14, { buff: { scope: 'adjacent', dmg: 0.25, dur: 6 } }), S('정화의 빛', 8, { area: ring(70), ...hit(2.5) }),
    S('수호 맹세', 16, { buff: { scope: 'adjacent', rate: 0.25, dur: 8 } }), S('일출', 24, { buff: { scope: 'all', dmg: 0.25, rate: 0.15, dur: 6 } })]),
  C('red', 2, 'einar', '에이나르', 'brawl', '광전사', 'wild berserker with war paint, bear pelt and two axes', { rateMul: 1.25, splash: 15 }, [
    S('광폭화', 12, { buff: { scope: 'self', rate: 0.8, dur: 5 } }), S('쌍도끼 회전', 7, { area: ring(70), ...hit(2.5) }),
    S('피의 함성', 14, { buff: { scope: 'adjacent', dmg: 0.2, dur: 6 } }), S('끝없는 분노', 18, { area: all, ...hit(3) })]),

  // ── 레어 6 ──
  C('red', 3, 'elva', '엘바', 'blast', '용의 피 마도사', 'sorceress with dragon scale cloak, horn tiara and burning orb', { splash: 20, dot: [0.5, 3] }, [
    S('용의 숨결', 7, { area: ring(90), fx: { dmg: 3, dot: [0.8, 3] } }), S('비늘 방패', 16, { buff: { scope: 'adjacent', dmg: 0.3, dur: 6 } }),
    S('용암 분출', 12, { area: ring(110), ...hit(5) }), S('용염 강림', 22, { area: all, fx: { dmg: 5, dot: [1, 4] } })]),
  C('red', 3, 'thorsten', '토르스텐', 'brawl', '용병단 부단장', 'scarred veteran mercenary captain with greatsword and red cape', { aura: { dmg: 0.1 }, crit: 0.15 }, [
    S('대검 베기', 6, { area: ring(70), ...hit(3.5) }), S('돌격 명령', 14, { buff: { scope: 'all', rate: 0.2, dur: 6 } }),
    S('갑옷 파쇄', 10, { area: ring(70), fx: { dmg: 2, vuln: [0.3, 5] } }), S('부단장의 일갈', 20, { area: all, fx: { dmg: 4, stun: 1 } })]),
  C('red', 3, 'cecilia', '세실리아', 'heavy', '불사조 사수', 'elegant archer with phoenix feather bow and golden-red hair', { bossMult: 1.5, dot: [0.6, 3] }, [
    S('불사조 깃', 7, { area: one, fx: { dmg: 6, dot: [1, 3] } }), S('타오르는 궤적', 10, { area: many(4), ...hit(4) }),
    S('재생의 불꽃', 16, { buff: { scope: 'adjacent', rate: 0.3, dur: 6 } }), S('불사조 강하', 20, { pick: 'strongest', area: ring(100), fx: { dmg: 14, bossMult: 1.5 } })]),
  C('red', 3, 'ulf', '울프', 'rapid', '늑대 기사', 'feral knight in wolf skull helm with clawed gauntlets', { crit: 0.25, execute: 0.12 }, [
    S('물어뜯기', 5, { area: one, fx: { dmg: 4, dot: [1, 3] } }), S('무리 사냥', 9, { area: many(6), ...hit(3) }),
    S('늑대의 울부짖음', 14, { buff: { scope: 'adjacent', rate: 0.3, dur: 6 } }), S('달빛 사냥', 16, { area: one, fx: { execute: [0.35, 8] } })]),
  C('red', 3, 'aidan', '아이단', 'hex', '연금술사', 'goggled alchemist with bubbling flasks on a bandolier', { vuln: [0.15, 4], bounty: 0.15 }, [
    S('산성 플라스크', 6, { area: ring(70), fx: { dot: [1.2, 4], vuln: [0.2, 4] } }), S('금 변환', 15, { gold: 10, goldPerWave: 0.6 }),
    S('폭발 물약', 10, { area: ring(90), ...hit(4) }), S('현자의 돌', 26, { buff: { scope: 'all', dmg: 0.3, dur: 8 }, gold: 20 })]),
  C('red', 3, 'rosalind', '로잘린', 'aid', '홍염 성녀', 'saint priestess with crimson veil and burning censer', { aura: { dmg: 0.1, rate: 0.08 } }, [
    S('성화 봉헌', 14, { buff: { scope: 'adjacent', dmg: 0.35, dur: 6 } }), S('정화의 불', 9, { area: ring(90), fx: { dmg: 3, dot: [0.8, 3] } }),
    S('기도', 18, { buff: { scope: 'all', rate: 0.25, dur: 6 } }), S('성스러운 불길', 22, { area: all, fx: { dmg: 4, vuln: [0.25, 5] } })]),

  // ── 유니크 4 (Lv1 대표 스킬) ──
  C('red', 4, 'ragnar', '라그나르', 'brawl', '전쟁군주', 'legendary viking warlord with flaming greataxe and battle-scarred armor', { splash: 30, dmgMul: 1.1 }, [
    S('라그나로크', 15, { area: all, fx: { dmg: 8, dot: [1, 3] } }), S('전쟁의 함성', 16, { buff: { scope: 'all', dmg: 0.3, dur: 6 } }),
    S('대지 분쇄', 10, { area: ring(110), fx: { dmg: 5, stun: 1 } }), S('왕의 처형', 14, { pick: 'strongest', area: one, fx: { dmg: 20, bossMult: 1.5 } })]),
  C('red', 4, 'isolde', '이졸데', 'blast', '태양의 대마법사', 'archmage queen with sun crown, golden staff and flowing fire robes', { splash: 25, chain: 2 }, [
    S('태양 낙하', 18, { area: ring(140), ...hit(12) }), S('홍염 연쇄', 8, { area: bolt(8), ...hit(4) }),
    S('태양의 가호', 18, { buff: { scope: 'all', rate: 0.25, dur: 8 } }), S('초신성', 26, { area: all, fx: { dmg: 10, dot: [1.5, 4] } })]),
  C('red', 4, 'bjorn', '비요른', 'bow', '불새의 사냥꾼', 'legendary hunter with firebird feather cloak and great longbow', { targets: 2, crit: 0.2 }, [
    S('불새의 깃', 12, { area: many(10), ...hit(5) }), S('관통하는 불길', 8, { area: many(5), fx: { dmg: 4, dot: [1, 3] } }),
    S('사냥꾼의 눈', 16, { buff: { scope: 'adjacent', range: 0.3, crit: 0.1, dmg: 0.2, dur: 8 } }), S('불새 강림', 22, { area: all, ...hit(6) })]),
  C('red', 4, 'brynhild', '브륀힐드', 'rapid', '전장의 발키리', 'valkyrie warrior maiden with winged helm, spear and flaming wings', { crit: 0.25, targets: 3 }, [
    S('발키리의 창', 10, { area: many(6), fx: { dmg: 6, vuln: [0.2, 5] } }), S('전사자의 인도', 18, { buff: { scope: 'all', dmg: 0.2, rate: 0.2, dur: 8 } }),
    S('불꽃 날개', 12, { area: ring(120), fx: { dmg: 5, dot: [1, 4] } }), S('신들의 황혼', 24, { area: all, fx: { dmg: 9, stun: 1.5 } })])
];

// ══════════════════════════════ 블루 — 물·얼음·바다·기사·학자 ══════════════════════════════
const BLUE = [
  // ── 커먼 13 ──
  C('blue', 1, 'finn', '핀', 'rapid', '부두 도둑', 'scrappy dockside thief with blue cap and curved knife', { crit: 0.2, slow: [0.1, 1] }, [
    S('물결 베기', 5, { area: one, ...hit(3) }), S('그물 던지기', 9, { area: ring(60), fx: { slow: [0.5, 2] } }),
    S('그림자 걸음', 12, { buff: { scope: 'self', rate: 0.8, dur: 4 } }), S('난도질', 14, { area: many(6), ...hit(3) })]),
  C('blue', 1, 'ingrid', '잉그리드', 'hex', '서리 주술사', 'young frost shaman with snowflake totem and white fur hood', { slow: [0.25, 1.5] }, [
    S('서리 저주', 6, { area: one, fx: { dmg: 1.5, slow: [0.5, 3] } }), S('얼음 수렁', 9, { area: ring(80), fx: { slow: [0.45, 3] } }),
    S('겨울 축복', 14, { buff: { scope: 'adjacent', rate: 0.15, dur: 6 } }), S('혹한', 18, { area: all, fx: { slow: [0.4, 4], dmg: 1 } })]),
  C('blue', 1, 'edmund', '에드먼드', 'heavy', '해안 저격수', 'calm marksman in navy coat with a long musket and spyglass', { bossMult: 1.3, vuln: [0.1, 3] }, [
    S('조준 사격', 7, { area: one, ...hit(4) }), S('약점 관측', 9, { area: one, fx: { dmg: 2, vuln: [0.3, 5] } }),
    S('망원경', 14, { buff: { scope: 'self', range: 0.4, dur: 8 } }), S('수평선 너머', 18, { pick: 'strongest', area: one, ...hit(13) })]),
  C('blue', 1, 'nils', '닐스', 'bow', '어부 작살꾼', 'young fisherman with a harpoon gun and yellow raincoat', { push: 15 }, [
    S('작살', 6, { area: one, fx: { dmg: 3, push: 40 } }), S('그물 작살', 9, { area: ring(60), fx: { dmg: 1.5, slow: [0.4, 2] } }),
    S('만선의 꿈', 16, { gold: 5, goldPerWave: 0.3 }), S('고래잡이', 16, { pick: 'strongest', area: one, fx: { dmg: 9, push: 80 } })]),
  C('blue', 1, 'harry', '해리', 'blast', '물방울 견습생', 'nerdy apprentice water mage with round glasses and a bubble wand', { slow: [0.15, 1] }, [
    S('물방울 폭탄', 6, { area: ring(60), fx: { dmg: 1.8, slow: [0.25, 1.5] } }), S('물대포', 8, { area: many(3), fx: { dmg: 2, push: 30 } }),
    S('복습', 12, { buff: { scope: 'self', dmg: 0.4, dur: 5 } }), S('해일 주문', 18, { area: all, fx: { dmg: 2, push: 50 } })]),
  C('blue', 1, 'emma', '엠마', 'aid', '얼음 약사', 'gentle herbalist girl with ice blue apron and potion basket', { aura: { rate: 0.06 } }, [
    S('청량 물약', 12, { buff: { scope: 'adjacent', rate: 0.2, dur: 5 } }), S('냉기 병', 8, { area: ring(60), fx: { dmg: 1.5, slow: [0.4, 2] } }),
    S('집중 차', 16, { buff: { scope: 'adjacent', range: 0.2, dur: 8 } }), S('만능 해독제', 22, { buff: { scope: 'all', rate: 0.15, dur: 8 } })]),
  C('blue', 1, 'percy', '퍼시', 'bow', '수습 기사 궁수', 'squire archer with blue plume helmet and kite shield on back', { targets: 2 }, [
    S('이중 사격', 6, { area: many(2), ...hit(2.2) }), S('정렬 사격', 9, { area: many(4), ...hit(2) }),
    S('기사도', 14, { buff: { scope: 'adjacent', dmg: 0.15, dur: 6 } }), S('창공 사격', 16, { area: many(8), ...hit(2.2) })]),
  C('blue', 1, 'aud', '오드', 'hex', '안개 점술사', 'mysterious fortune teller with crystal ball and starry blue shawl', { vuln: [0.15, 3] }, [
    S('불길한 예언', 7, { area: one, fx: { vuln: [0.35, 5] } }), S('안개', 10, { area: ring(80), fx: { slow: [0.35, 3] } }),
    S('운명 엿보기', 14, { buff: { scope: 'adjacent', dmg: 0.2, dur: 6 } }), S('정해진 파멸', 18, { area: ring(100), fx: { vuln: [0.4, 6], dmg: 1.5 } })]),
  C('blue', 1, 'lucy', '루시', 'rapid', '스케이트 전령', 'speedy messenger girl on ice skates with a satchel and short sword', { rateMul: 1.15 }, [
    S('미끄러지며 베기', 5, { area: many(2), ...hit(2) }), S('빙판 만들기', 10, { area: ring(70), fx: { slow: [0.45, 2.5] } }),
    S('급보', 14, { buff: { scope: 'all', rate: 0.1, dur: 6 } }), S('질풍 연격', 14, { area: many(7), ...hit(2.5) })]),
  C('blue', 1, 'karl', '칼', 'brawl', '방패 수비병', 'stout shield guard with a tower shield and short spear', { push: 20, stun: [0.08, 0.5] }, [
    S('방패 밀치기', 6, { area: ring(50), fx: { dmg: 1.5, push: 50 } }), S('방패 강타', 8, { area: one, fx: { dmg: 2.5, stun: 1 } }),
    S('철벽', 14, { buff: { scope: 'adjacent', range: 0.15, dur: 8 } }), S('밀어내기 진형', 18, { area: all, fx: { push: 70, dmg: 1 } })]),
  C('blue', 1, 'dag', '다그', 'heavy', '빙하 투석기 기사', 'engineer with a mini ice catapult and woolen scarf', { splash: 25, slow: [0.2, 1.5] }, [
    S('얼음덩이', 7, { area: ring(70), fx: { dmg: 2.5, slow: [0.3, 2] } }), S('빙산 조각', 10, { area: many(4), ...hit(3) }),
    S('장력 조절', 14, { buff: { scope: 'self', range: 0.3, dmg: 0.2, dur: 8 } }), S('빙하 낙하', 18, { area: ring(120), fx: { dmg: 4, stun: 0.8 } })]),
  C('blue', 1, 'alan', '앨런', 'aid', '왕립 서기관', 'scholarly scribe with quill, scroll and blue spectacles', { aura: { range: 0.12 } }, [
    S('전술 기록', 14, { buff: { scope: 'adjacent', dmg: 0.2, dur: 6 } }), S('잉크 뿌리기', 8, { area: ring(60), fx: { slow: [0.35, 2], vuln: [0.1, 3] } }),
    S('작전 회의', 18, { buff: { scope: 'adjacent', rate: 0.25, dur: 6 } }), S('왕의 칙령', 24, { buff: { scope: 'all', range: 0.15, dmg: 0.15, dur: 8 } })]),
  C('blue', 1, 'sophie', '소피', 'blast', '눈송이 요정술사', 'tiny girl with fairy wings and a snowflake wand', { slow: [0.2, 1.5], splash: 10 }, [
    S('눈송이 폭죽', 6, { area: ring(60), fx: { dmg: 1.8, slow: [0.3, 2] } }), S('눈사람 소환', 12, { area: ring(70), fx: { stun: 0.8 } }),
    S('반짝이 가루', 14, { buff: { scope: 'adjacent', rate: 0.2, dur: 5 } }), S('함박눈', 18, { area: all, fx: { dmg: 1.5, slow: [0.4, 3] } })]),

  // ── 언커먼 9 ──
  C('blue', 2, 'sigrid', '시그리드', 'bow', '빙설 궁수', 'silver-haired archer woman with ice-crystal bow and blue cloak', { slow: [0.2, 1.5], targets: 2 }, [
    S('얼음 화살', 6, { area: many(3), fx: { dmg: 2, slow: [0.3, 2] } }), S('빙결 화살', 9, { area: one, fx: { dmg: 3, stun: 1 } }),
    S('설원의 시선', 14, { buff: { scope: 'self', range: 0.3, dmg: 0.3, dur: 6 } }), S('눈보라 화살비', 16, { area: all, fx: { dmg: 2, slow: [0.35, 3] } })]),
  C('blue', 2, 'olaf', '올라프', 'blast', '눈보라 마법사', 'old bearded snow wizard with tall blue hat and frosty staff', { splash: 15, slow: [0.2, 1.5] }, [
    S('냉기 폭발', 7, { area: ring(80), fx: { dmg: 2.5, slow: [0.35, 2] } }), S('얼음 감옥', 12, { area: ring(70), fx: { stun: 1.5 } }),
    S('마나 순환', 14, { buff: { scope: 'self', rate: 0.6, dur: 5 } }), S('블리자드', 20, { area: all, fx: { dmg: 3, slow: [0.4, 4] } })]),
  C('blue', 2, 'henrik', '헨릭', 'brawl', '창기병 교관', 'tall lancer in blue plate with a long lance and pennant', { push: 25, dmgMul: 1.1 }, [
    S('돌진', 7, { area: many(4), fx: { dmg: 2.5, push: 60 } }), S('창술 시범', 14, { buff: { scope: 'adjacent', dmg: 0.2, dur: 6 } }),
    S('꿰뚫기', 9, { area: many(5), ...hit(3) }), S('기병 돌격', 18, { area: all, fx: { dmg: 2.5, push: 90 } })]),
  C('blue', 2, 'liv', '리브', 'hex', '조류 마녀', 'sea witch with seaweed hair, shell necklace and coral staff', { slow: [0.2, 2], vuln: [0.1, 3] }, [
    S('밀물', 8, { area: ring(80), fx: { push: 50, slow: [0.3, 2] } }), S('해초 휘감기', 9, { area: ring(70), fx: { stun: 1 } }),
    S('바다의 노래', 15, { buff: { scope: 'adjacent', rate: 0.25, dur: 6 } }), S('대조류', 20, { area: all, fx: { push: 80, vuln: [0.25, 5] } })]),
  C('blue', 2, 'jonathan', '조너선', 'heavy', '왕실 총사', 'musketeer with feathered hat, blue doublet and rapier at hip', { crit: 0.2, bossMult: 1.3 }, [
    S('명예의 한 발', 7, { area: one, ...hit(5) }), S('결투 신청', 10, { pick: 'strongest', area: one, fx: { dmg: 4, vuln: [0.3, 5] } }),
    S('총사의 맹세', 16, { buff: { scope: 'adjacent', crit: 0.1, dmg: 0.2, dur: 6 } }), S('왕을 위하여', 18, { pick: 'strongest', area: one, ...hit(15) })]),
  C('blue', 2, 'agnes', '아그네스', 'aid', '수도원 치유사', 'nun healer with blue habit and glowing water chalice', { aura: { rate: 0.08 } }, [
    S('성수 뿌리기', 12, { buff: { scope: 'adjacent', rate: 0.25, dur: 6 } }), S('정화의 물결', 9, { area: ring(80), fx: { dmg: 2, slow: [0.3, 2] } }),
    S('침묵 기도', 16, { buff: { scope: 'adjacent', dmg: 0.25, dur: 6 } }), S('기적', 26, { buff: { scope: 'all', dmg: 0.2, rate: 0.2, dur: 8 } })]),
  C('blue', 2, 'stein', '스테인', 'brawl', '빙벽 수호자', 'giant guard with ice-encrusted shield and frost hammer', { stun: [0.12, 0.8], slow: [0.15, 1] }, [
    S('빙벽', 10, { area: ring(80), fx: { slow: [0.5, 3] } }), S('서리 망치', 8, { area: ring(60), fx: { dmg: 3, stun: 1 } }),
    S('굳건함', 14, { buff: { scope: 'adjacent', range: 0.15, dmg: 0.15, dur: 8 } }), S('빙하 붕괴', 20, { area: all, fx: { dmg: 2.5, stun: 1.2 } })]),
  C('blue', 2, 'nora', '노라', 'rapid', '얼음 쌍검사', 'agile duelist with twin ice blades and short blue cape', { crit: 0.25 }, [
    S('빙결 연참', 5, { area: one, fx: { dmg: 3.5, slow: [0.3, 2] } }), S('서리 회전', 8, { area: ring(70), ...hit(2.5) }),
    S('냉정', 12, { buff: { scope: 'self', rate: 0.7, dur: 5 } }), S('결빙 난무', 15, { area: many(8), fx: { dmg: 3, slow: [0.3, 2] } })]),
  C('blue', 2, 'gilbert', '길버트', 'blast', '시계탑 학자', 'eccentric professor with brass clockwork staff and tweed coat', { stun: [0.1, 0.6] }, [
    S('시간 지연', 9, { area: ring(80), fx: { slow: [0.5, 3] } }), S('태엽 폭발', 7, { area: ring(70), ...hit(2.5) }),
    S('가속 장치', 14, { buff: { scope: 'adjacent', rate: 0.3, dur: 5 } }), S('시간 정지', 22, { area: all, fx: { stun: 2 } })]),

  // ── 레어 6 ──
  C('blue', 3, 'kristin', '크리스틴', 'heavy', '빙하 저격 기사', 'elite knight sniper with frost visor and crystalline rifle', { bossMult: 1.5, slow: [0.3, 2] }, [
    S('빙결탄', 7, { area: one, fx: { dmg: 6, stun: 1 } }), S('결정 관통', 10, { area: many(5), ...hit(4) }),
    S('얼어붙은 호흡', 16, { buff: { scope: 'self', dmg: 0.5, range: 0.3, dur: 8 } }), S('절대 영도 저격', 20, { pick: 'strongest', area: one, fx: { dmg: 16, stun: 2 } })]),
  C('blue', 3, 'haakon', '하콘', 'brawl', '바다의 왕자', 'young sea prince with trident, coral crown and blue scale armor', { push: 25, splash: 25 }, [
    S('삼지창 찌르기', 6, { area: many(3), fx: { dmg: 3.5, push: 40 } }), S('파도 타기', 10, { area: ring(100), fx: { dmg: 2.5, push: 70 } }),
    S('왕자의 위엄', 16, { buff: { scope: 'all', dmg: 0.15, dur: 8 } }), S('해신의 분노', 22, { area: all, fx: { dmg: 4, push: 100, slow: [0.3, 3] } })]),
  C('blue', 3, 'eleanor', '엘리너', 'aid', '푸른 기사단장', 'noble lady knight commander with blue banner and silver armor', { aura: { dmg: 0.1, range: 0.08 } }, [
    S('진형 정비', 14, { buff: { scope: 'adjacent', dmg: 0.35, dur: 6 } }), S('돌격 나팔', 18, { buff: { scope: 'all', rate: 0.25, dur: 6 } }),
    S('기사단의 검', 8, { area: ring(90), fx: { dmg: 3, vuln: [0.2, 4] } }), S('불굴의 깃발', 26, { buff: { scope: 'all', dmg: 0.3, range: 0.15, dur: 8 } })]),
  C('blue', 3, 'theodore', '테오도르', 'blast', '심해 소환사', 'pale summoner with jellyfish familiars and deep sea robes', { chain: 3, slow: [0.2, 1.5] }, [
    S('해파리 소환', 7, { area: bolt(6), fx: { dmg: 2.5, stun: 0.5 } }), S('심연의 손', 10, { area: ring(90), fx: { dmg: 3, slow: [0.5, 3] } }),
    S('수압', 12, { area: ring(80), fx: { vuln: [0.35, 5] } }), S('크라켄의 촉수', 22, { area: all, fx: { dmg: 5, stun: 1.5 } })]),
  C('blue', 3, 'asta', '아스타', 'hex', '오로라 무녀', 'shrine maiden with aurora ribbons and starlight bell', { slow: [0.25, 2], vuln: [0.15, 3] }, [
    S('오로라 장막', 9, { area: ring(100), fx: { slow: [0.45, 3], vuln: [0.2, 4] } }), S('별방울', 14, { buff: { scope: 'adjacent', rate: 0.3, dur: 6 } }),
    S('극광 낙인', 10, { area: many(6), fx: { dmg: 3, vuln: [0.3, 5] } }), S('하늘의 커튼', 22, { area: all, fx: { dmg: 3, stun: 1.2 } })]),
  C('blue', 3, 'winston', '윈스턴', 'bow', '폭풍 함대 제독', 'stern admiral with storm-grey coat, tricorn and harpoon crossbow', { targets: 3, push: 15 }, [
    S('함포 사격', 7, { area: many(5), fx: { dmg: 3, push: 30 } }), S('작살 견인', 10, { pick: 'strongest', area: one, fx: { dmg: 6, push: 120 } }),
    S('제독의 명령', 16, { buff: { scope: 'all', rate: 0.2, dur: 8 } }), S('폭풍 함대', 22, { area: all, fx: { dmg: 4, push: 60 } })]),

  // ── 유니크 4 ──
  C('blue', 4, 'arthur', '아서', 'brawl', '호수의 기사왕', 'legendary knight king with glowing holy sword and blue royal cape', { splash: 30, stun: [0.15, 1] }, [
    S('호수의 검', 18, { area: all, fx: { dmg: 6, stun: 1.5 } }), S('원탁의 맹세', 16, { buff: { scope: 'all', dmg: 0.3, dur: 8 } }),
    S('성검 일섬', 10, { area: many(6), ...hit(7) }), S('아발론', 26, { buff: { scope: 'all', dmg: 0.3, rate: 0.3, range: 0.15, dur: 8 } })]),
  C('blue', 4, 'solveig', '솔베이그', 'blast', '절대영도의 마녀', 'ice queen archmage with crystal crown and long white hair', { splash: 25, slow: [0.35, 2] }, [
    S('절대영도', 25, { area: all, fx: { dmg: 4, stun: 3 } }), S('얼음꽃', 9, { area: ring(120), fx: { dmg: 5, slow: [0.5, 3] } }),
    S('빙결 왕관', 18, { buff: { scope: 'adjacent', dmg: 0.4, rate: 0.2, dur: 8 } }), S('영원한 겨울', 26, { area: all, fx: { dmg: 8, vuln: [0.3, 6] } })]),
  C('blue', 4, 'william', '윌리엄', 'bow', '조류의 명궁', 'legendary archer with tide-blue longbow and seafoam cloak', { targets: 3, push: 20 }, [
    S('조류의 화살', 22, { area: all, fx: { dmg: 3, push: 120 } }), S('파도 연사', 8, { area: many(8), ...hit(4) }),
    S('바다의 눈', 16, { buff: { scope: 'adjacent', range: 0.3, dmg: 0.3, dur: 8 } }), S('해일 관통', 18, { area: many(15), fx: { dmg: 6, slow: [0.4, 3] } })]),
  C('blue', 4, 'vivian', '비비안', 'aid', '호수의 여인', 'ethereal lady of the lake with water gown and floating sword', { aura: { dmg: 0.15, rate: 0.1 } }, [
    S('호수의 축복', 16, { buff: { scope: 'all', dmg: 0.35, dur: 8 } }), S('물의 감옥', 12, { area: ring(120), fx: { stun: 2, dmg: 3 } }),
    S('시간의 샘', 20, { buff: { scope: 'all', rate: 0.35, dur: 8 } }), S('성검 하사', 30, { buff: { scope: 'all', dmg: 0.5, rate: 0.2, range: 0.2, dur: 10 } })])
];

// ══════════════════════════════ 그린 — 숲·바람·사냥·드루이드·상인 ══════════════════════════════
const GREEN = [
  // ── 커먼 13 ──
  C('green', 1, 'robin', '로빈', 'bow', '숲의 의적', 'cheerful forest outlaw with green feathered cap and longbow', { targets: 2, bounty: 0.1 }, [
    S('의적의 화살', 6, { area: many(3), ...hit(1.8) }), S('부자 털기', 12, { area: one, fx: { dmg: 2 }, gold: 5 }),
    S('셔우드의 함성', 14, { buff: { scope: 'adjacent', rate: 0.2, dur: 5 } }), S('화살비', 15, { area: all, ...hit(2) })]),
  C('green', 1, 'leif', '레이프', 'rapid', '독침 사냥꾼', 'wiry tracker with green hood and poison-tipped knives', { dot: [0.4, 3], crit: 0.15 }, [
    S('독 바르기', 6, { area: one, fx: { dot: [1.5, 3] } }), S('던지는 칼', 7, { area: many(3), fx: { dmg: 2, dot: [0.5, 3] } }),
    S('잠복', 12, { buff: { scope: 'self', dmg: 0.5, dur: 5 } }), S('맹독 연격', 15, { area: many(6), fx: { dmg: 2, dot: [1, 4] } })]),
  C('green', 1, 'astrid', '아스트리드', 'hex', '사슴뿔 드루이드', 'druid girl with antler headdress and leafy robes', { dot: [0.5, 3] }, [
    S('가시 덩굴', 7, { area: ring(70), fx: { dot: [1, 4], slow: [0.2, 2] } }), S('숲의 축복', 13, { buff: { scope: 'adjacent', rate: 0.2, dur: 6 } }),
    S('뿌리 속박', 10, { area: ring(70), fx: { stun: 1 } }), S('숲의 분노', 18, { area: all, fx: { dot: [1.2, 5] } })]),
  C('green', 1, 'torvald', '토르발드', 'heavy', '산악 장궁수', 'rugged mountain archer with a huge longbow and moss cloak', { bossMult: 1.3, rangeMul: 1.1 }, [
    S('산바람 사격', 7, { area: one, ...hit(4) }), S('바람 실은 화살', 9, { area: many(3), ...hit(3) }),
    S('고지대', 15, { buff: { scope: 'self', range: 0.4, rate: 0.2, dur: 8 } }), S('거인 사냥', 17, { pick: 'strongest', area: one, fx: { dmg: 12, bossMult: 1.5 } })]),
  C('green', 1, 'emmett', '에밋', 'brawl', '양치기 소년', 'shepherd boy with a crook staff and a fluffy sheep companion', { push: 15 }, [
    S('지팡이 휘두르기', 6, { area: ring(50), fx: { dmg: 2, push: 40 } }), S('양 떼 돌진', 10, { area: many(5), fx: { dmg: 1.5, push: 50 } }),
    S('피리 소리', 14, { buff: { scope: 'adjacent', rate: 0.15, dur: 6 } }), S('대이동', 18, { area: all, fx: { push: 70, dmg: 1 } })]),
  C('green', 1, 'kit', '키트', 'rapid', '여우 수인 정찰병', 'fox-eared scout girl with a short sword and green scarf', { crit: 0.2, rateMul: 1.1 }, [
    S('여우 발톱', 5, { area: one, ...hit(3) }), S('홀리기', 10, { area: ring(70), fx: { slow: [0.4, 2], vuln: [0.15, 3] } }),
    S('날쌘 발', 12, { buff: { scope: 'self', rate: 0.8, dur: 4 } }), S('여우불', 15, { area: many(6), fx: { dmg: 2.5, dot: [0.6, 3] } })]),
  C('green', 1, 'holly', '홀리', 'aid', '약초꾼', 'smiling herb gatherer with a wicker basket of flowers', { aura: { rate: 0.06 } }, [
    S('허브 차', 12, { buff: { scope: 'adjacent', rate: 0.2, dur: 5 } }), S('쐐기풀 가루', 8, { area: ring(60), fx: { dot: [0.8, 3] } }),
    S('향기 주머니', 16, { buff: { scope: 'adjacent', dmg: 0.15, dur: 6 } }), S('꽃밭', 22, { buff: { scope: 'all', rate: 0.15, dur: 6 } })]),
  C('green', 1, 'bart', '바트', 'heavy', '덫 사냥꾼', 'grizzled trapper with bear trap and crossbow, fur vest', { stun: [0.12, 0.8] }, [
    S('곰덫', 8, { area: one, fx: { dmg: 3, stun: 1.5 } }), S('올가미', 10, { area: ring(60), fx: { slow: [0.5, 3] } }),
    S('사냥 본능', 14, { buff: { scope: 'self', dmg: 0.4, dur: 6 } }), S('함정 지대', 18, { area: ring(110), fx: { dmg: 2, stun: 1.2 } })]),
  C('green', 1, 'inga', '잉가', 'hex', '벌꿀 양봉가', 'beekeeper with veil hat and a buzzing hive staff', { dot: [0.4, 3], slow: [0.1, 1] }, [
    S('벌 떼', 6, { area: many(4), fx: { dot: [0.8, 3] } }), S('끈적한 꿀', 9, { area: ring(70), fx: { slow: [0.45, 3] } }),
    S('로열 젤리', 14, { buff: { scope: 'adjacent', dmg: 0.15, dur: 6 } }), S('성난 벌집', 18, { area: all, fx: { dot: [1, 4] } })]),
  C('green', 1, 'owen', '오언', 'bow', '바람개비 소년', 'boy with a pinwheel hat and slingshot, windswept hair', { targets: 2, rateMul: 1.1 }, [
    S('바람 새총', 5, { area: many(2), ...hit(2) }), S('회오리 구슬', 9, { area: ring(60), fx: { dmg: 2, push: 30 } }),
    S('순풍', 14, { buff: { scope: 'adjacent', rate: 0.2, dur: 5 } }), S('돌풍', 16, { area: all, fx: { dmg: 1.5, push: 50 } })]),
  C('green', 1, 'mae', '메이', 'aid', '떠돌이 상인', 'cheery traveling merchant with a huge backpack of goods', { bounty: 0.2 }, [
    S('흥정', 12, { gold: 4, goldPerWave: 0.3 }), S('수상한 물약', 10, { buff: { scope: 'adjacent', dmg: 0.2, dur: 5 } }),
    S('물건 던지기', 7, { area: many(3), ...hit(2) }), S('대박 거래', 22, { gold: 15, goldPerWave: 1 })]),
  C('green', 1, 'britt', '브리트', 'brawl', '버섯 채집꾼', 'mushroom forager with a mushroom cap hat and wooden club', { dot: [0.3, 3], splash: 10 }, [
    S('곤봉', 6, { area: ring(50), ...hit(2.2) }), S('포자 뿌리기', 9, { area: ring(70), fx: { dot: [0.8, 3], slow: [0.2, 2] } }),
    S('수상한 버섯', 14, { buff: { scope: 'self', dmg: 0.5, rate: 0.2, dur: 5 } }), S('독버섯 밭', 18, { area: all, fx: { dot: [1, 4] } })]),
  C('green', 1, 'hailey', '헤일리', 'blast', '풀피리 음유시인', 'bard girl with a leaf flute and patchwork green cloak', { chain: 2 }, [
    S('풀피리', 6, { area: bolt(3), ...hit(2) }), S('잠의 노래', 12, { area: ring(80), fx: { stun: 1 } }),
    S('행진곡', 14, { buff: { scope: 'adjacent', rate: 0.25, dur: 5 } }), S('숲의 합창', 18, { area: bolt(10), ...hit(2.5) })]),

  // ── 언커먼 9 ──
  C('green', 2, 'freya', '프레야', 'blast', '꽃의 마법사', 'flower mage with petal dress and blooming staff', { splash: 15, dot: [0.4, 3] }, [
    S('꽃잎 폭풍', 7, { area: ring(80), fx: { dmg: 2.5, dot: [0.6, 3] } }), S('넝쿨 감옥', 11, { area: ring(70), fx: { stun: 1.2 } }),
    S('만개', 14, { buff: { scope: 'adjacent', dmg: 0.25, dur: 6 } }), S('대지의 정원', 20, { area: all, fx: { dmg: 3, dot: [0.8, 4] } })]),
  C('green', 2, 'sigurd', '시구르드', 'brawl', '용 사냥 전사', 'young dragon slayer with a broad sword and green dragon scale shield', { bossMult: 1.4, dmgMul: 1.1 }, [
    S('용살 베기', 6, { area: one, ...hit(4) }), S('비늘 쪼개기', 9, { area: ring(60), fx: { dmg: 2.5, vuln: [0.25, 4] } }),
    S('용의 피', 14, { buff: { scope: 'self', dmg: 0.6, dur: 6 } }), S('용살자의 일격', 18, { pick: 'strongest', area: one, fx: { dmg: 14, bossMult: 1.5 } })]),
  C('green', 2, 'edda', '에다', 'hex', '룬 새김꾼', 'rune carver woman with glowing green runestones and chisel', { vuln: [0.15, 3], dot: [0.3, 3] }, [
    S('약화의 룬', 8, { area: ring(80), fx: { vuln: [0.3, 5] } }), S('속박의 룬', 11, { area: ring(70), fx: { stun: 1.2 } }),
    S('힘의 룬', 14, { buff: { scope: 'adjacent', dmg: 0.25, dur: 6 } }), S('룬 폭발', 18, { area: all, fx: { dmg: 3, vuln: [0.2, 5] } })]),
  C('green', 2, 'colin', '콜린', 'bow', '연사 석궁 장인', 'tinkerer with a repeating crossbow and gear-filled backpack', { targets: 3, rateMul: 1.1 }, [
    S('연사 장치', 6, { area: many(5), ...hit(1.8) }), S('독 볼트', 8, { area: many(3), fx: { dmg: 2, dot: [0.8, 3] } }),
    S('기어 조정', 14, { buff: { scope: 'self', rate: 0.6, dur: 5 } }), S('탄창 비우기', 16, { area: many(12), ...hit(2.5) })]),
  C('green', 2, 'thea', '테아', 'aid', '숲의 정령 소환사', 'girl with a glowing forest spirit owl on her shoulder', { aura: { dmg: 0.08 }, chain: 2 }, [
    S('정령의 속삭임', 13, { buff: { scope: 'adjacent', dmg: 0.25, dur: 6 } }), S('반딧불 무리', 8, { area: bolt(5), ...hit(2.5) }),
    S('올빼미의 눈', 16, { buff: { scope: 'adjacent', range: 0.25, dur: 8 } }), S('정령왕 강림', 24, { buff: { scope: 'all', dmg: 0.25, dur: 8 } })]),
  C('green', 2, 'gareth', '가레스', 'brawl', '떡갈나무 수호기사', 'knight in bark-like armor with an oak shield and mace', { stun: [0.12, 0.8], push: 15 }, [
    S('나무 방패 강타', 7, { area: ring(60), fx: { dmg: 2.5, stun: 0.8 } }), S('뿌리 내리기', 14, { buff: { scope: 'adjacent', range: 0.15, dmg: 0.15, dur: 8 } }),
    S('가지 휘두르기', 9, { area: ring(80), fx: { dmg: 2.5, push: 50 } }), S('천년 떡갈나무', 20, { area: all, fx: { dmg: 2, stun: 1.2 } })]),
  C('green', 2, 'marit', '마리트', 'rapid', '바람 칼날 무희', 'wind dancer with fluttering green scarves and curved blades', { crit: 0.2, targets: 2 }, [
    S('바람 칼날', 5, { area: many(3), ...hit(2.5) }), S('회오리 춤', 9, { area: ring(80), fx: { dmg: 2.5, push: 30 } }),
    S('산들바람', 12, { buff: { scope: 'adjacent', rate: 0.25, dur: 5 } }), S('폭풍의 춤', 16, { area: all, ...hit(3) })]),
  C('green', 2, 'fergus', '퍼거스', 'heavy', '켈트 투창 사냥꾼', 'red-bearded celtic hunter with javelins and green tartan', { bossMult: 1.3, crit: 0.15 }, [
    S('사냥 창', 7, { area: one, ...hit(5) }), S('세 갈래 창', 9, { area: many(3), ...hit(3.5) }),
    S('사냥꾼의 직감', 14, { buff: { scope: 'self', dmg: 0.4, rate: 0.3, dur: 6 } }), S('멧돼지 사냥', 17, { pick: 'strongest', area: one, ...hit(14) })]),
  C('green', 2, 'ylva', '일바', 'hex', '늑대 무녀', 'wolf priestess with white wolf pelt and moon pendant', { slow: [0.2, 1.5], vuln: [0.1, 3] }, [
    S('울음 소리', 9, { area: ring(80), fx: { slow: [0.4, 2], vuln: [0.2, 4] } }), S('늑대 소환', 8, { area: many(4), fx: { dmg: 3, dot: [0.6, 3] } }),
    S('달의 가호', 15, { buff: { scope: 'adjacent', rate: 0.25, dur: 6 } }), S('늑대 무리', 18, { area: all, fx: { dmg: 2.5, dot: [0.6, 4] } })]),

  // ── 레어 6 ──
  C('green', 3, 'elias', '엘리아스', 'bow', '엘프 명사수', 'elven archer with leaf-blade bow and long silver hair', { targets: 3, crit: 0.2 }, [
    S('엘프의 연사', 6, { area: many(6), ...hit(3) }), S('달빛 화살', 9, { area: many(3), fx: { dmg: 5, vuln: [0.2, 4] } }),
    S('숲의 고요', 16, { buff: { scope: 'adjacent', range: 0.25, dmg: 0.25, dur: 8 } }), S('천 개의 잎', 20, { area: all, ...hit(4) })]),
  C('green', 3, 'rowena', '로웨나', 'hex', '고목의 대드루이드', 'elder druid woman with staff of living wood and owl', { dot: [0.6, 4], slow: [0.2, 2] }, [
    S('고목의 저주', 7, { area: ring(90), fx: { dot: [1.5, 4], slow: [0.3, 2] } }), S('숲의 맹약', 16, { buff: { scope: 'all', dmg: 0.2, dur: 8 } }),
    S('대지의 손아귀', 12, { area: ring(100), fx: { stun: 1.5, dmg: 2 } }), S('세계수의 숨결', 24, { area: all, fx: { dot: [2, 5], vuln: [0.2, 5] } })]),
  C('green', 3, 'atle', '아틀레', 'brawl', '곰 변신 전사', 'shapeshifter warrior half-transformed into a great bear', { splash: 30, stun: [0.12, 0.8] }, [
    S('곰 발톱', 6, { area: ring(70), fx: { dmg: 3.5, dot: [0.6, 3] } }), S('포효', 11, { area: ring(100), fx: { stun: 1.2 } }),
    S('야성 해방', 16, { buff: { scope: 'self', dmg: 0.8, rate: 0.3, dur: 6 } }), S('대지 강타', 20, { area: all, fx: { dmg: 4, stun: 1 } })]),
  C('green', 3, 'gwen', '그웬', 'aid', '바람의 노래꾼', 'renowned bard with a harp made of branches and green cloak', { aura: { rate: 0.12 } }, [
    S('영웅의 노래', 14, { buff: { scope: 'adjacent', dmg: 0.35, dur: 6 } }), S('질풍가', 18, { buff: { scope: 'all', rate: 0.3, dur: 6 } }),
    S('불협화음', 10, { area: ring(100), fx: { dmg: 2.5, stun: 0.8 } }), S('전설의 서사시', 26, { buff: { scope: 'all', dmg: 0.3, rate: 0.2, dur: 8 } })]),
  C('green', 3, 'ivar', '이바르', 'rapid', '그림자 도적왕', 'charismatic thief king with emerald mask and many daggers', { crit: 0.3, bounty: 0.25 }, [
    S('그림자 단검', 5, { area: many(4), ...hit(3) }), S('왕의 몫', 14, { gold: 10, goldPerWave: 0.8 }),
    S('급소 간파', 10, { area: one, fx: { dmg: 3, vuln: [0.4, 6] } }), S('천 개의 칼날', 16, { area: many(12), fx: { execute: [0.3, 4] } })]),
  C('green', 3, 'celeste', '셀레스트', 'blast', '바람의 정령술사', 'wind elementalist floating on a gust with swirling leaves', { chain: 3, push: 15 }, [
    S('돌개바람', 7, { area: ring(90), fx: { dmg: 3, push: 50 } }), S('번개 바람', 9, { area: bolt(7), ...hit(3) }),
    S('바람의 가호', 16, { buff: { scope: 'adjacent', rate: 0.35, dur: 6 } }), S('대폭풍', 22, { area: all, fx: { dmg: 4, push: 80 } })]),

  // ── 유니크 4 ──
  C('green', 4, 'halvard', '할바르드', 'brawl', '세계수의 수호자', 'giant guardian warlord with tree-bark armor and living wood greataxe', { splash: 30, dot: [0.6, 3] }, [
    S('세계수의 분노', 18, { area: all, fx: { dot: [3, 5] } }), S('뿌리 감옥', 12, { area: ring(130), fx: { stun: 2, dmg: 3 } }),
    S('대지의 맹세', 18, { buff: { scope: 'all', dmg: 0.3, dur: 8 } }), S('라그나 숲', 24, { area: all, fx: { dmg: 8, vuln: [0.3, 6] } })]),
  C('green', 4, 'freydis', '프레이디스', 'aid', '대지의 여신 사제', 'goddess-blessed high priestess with flower crown and golden sickle', { aura: { dmg: 0.15, rate: 0.1 } }, [
    S('대지의 축복', 25, { buff: { scope: 'all', dmg: 0.5, dur: 8 } }), S('풍요', 18, { gold: 20, goldPerWave: 1.5 }),
    S('꽃의 심판', 12, { area: ring(130), fx: { dmg: 5, dot: [1, 4] } }), S('봄의 귀환', 28, { buff: { scope: 'all', rate: 0.4, range: 0.2, dur: 10 } })]),
  C('green', 4, 'richard', '리처드', 'heavy', '황금 사냥의 왕', 'legendary hunter king with golden crossbow and lion pelt cloak', { bossMult: 1.6, bounty: 0.3 }, [
    S('황금 사냥', 20, { pick: 'strongest', area: one, fx: { dmg: 30 }, gold: 50 }), S('왕실 사냥단', 10, { area: many(8), ...hit(5) }),
    S('사자의 심장', 18, { buff: { scope: 'adjacent', dmg: 0.4, crit: 0.15, dur: 8 } }), S('최후의 사냥', 22, { area: many(20), fx: { execute: [0.4, 12] } })]),
  C('green', 4, 'oberon', '오베론', 'blast', '요정왕', 'fairy king with butterfly wings, vine crown and glowing scepter', { chain: 4, slow: [0.25, 2] }, [
    S('요정의 장난', 12, { area: all, fx: { stun: 1.5, vuln: [0.3, 5] } }), S('꿈의 연쇄', 8, { area: bolt(12), ...hit(5) }),
    S('한여름 밤의 꿈', 18, { buff: { scope: 'all', rate: 0.3, dmg: 0.2, dur: 8 } }), S('요정 왕국', 26, { area: all, fx: { dmg: 9, dot: [1.5, 4] } })])
];

export const ROSTER = [...RED, ...BLUE, ...GREEN];
export const ROSTER_BY_ID = Object.fromEntries(ROSTER.map((c) => [c.id, c]));

/** 이 캐릭터의 스킬이 열리는 레벨 (유니크는 1레벨부터) */
export function skillLevels(c) {
  return c.grade === 4 ? [1, 2, 3, 4] : [2, 3, 4, 5];
}

/** ChatGPT 그림 프롬프트 — 모든 캐릭터에 공통으로 붙는 스타일 */
export const STYLE_PROMPT =
  '16x16 pixel art sprite, chibi proportions (big head, small body), JRPG fantasy style, 3/4 front view facing right, ' +
  'clean 1px dark outline, flat shading with max 12 colors, no anti-aliasing, no gradients, transparent background, single character centered';
const ATTR_COLOR = { red: 'crimson red and warm orange', blue: 'ice blue and navy', green: 'leaf green and earthy brown' };
const GRADE_DETAIL = { 1: 'simple outfit', 2: 'slightly detailed outfit', 3: 'ornate outfit with a glowing accent', 4: 'legendary ornate outfit with golden trim and a magical glow' };

export function artPrompt(c) {
  return `${STYLE_PROMPT}. Character: ${c.look}. Main colors: ${ATTR_COLOR[c.attr]}. ${GRADE_DETAIL[c.grade]}.`;
}

/** 처음 주어지는 덱 (37포인트): 속성마다 커먼 4 · 언커먼 2 · 레어 1 + 유니크 1 */
export const DEFAULT_DECK = [
  'eric', 'rowan', 'helga', 'gunnar', 'bridget', 'karsten', 'elva',
  'finn', 'ingrid', 'edmund', 'percy', 'sigrid', 'olaf', 'kristin',
  'robin', 'leif', 'astrid', 'torvald', 'freya', 'sigurd', 'elias',
  'ragnar'
];

/** 덱 포인트 합계 */
export function deckPoints(ids) {
  return ids.reduce((s, id) => s + (ROSTER_BY_ID[id] ? GRADES[ROSTER_BY_ID[id].grade].pt : 0), 0);
}

/** 쓸 수 있는 덱인가: 1명 이상, 중복 없음, 포인트 DECK_POINTS 이하 */
export function deckValid(ids) {
  return Array.isArray(ids) && ids.length > 0 && new Set(ids).size === ids.length && ids.every((id) => ROSTER_BY_ID[id]) && deckPoints(ids) <= DECK_POINTS;
}

/**
 * 고용 등급 굴리기: 등급 확률(유니크 1% 등) + 명성 강화 보정 → 덱에 있는 그 등급 캐릭터 중 무작위.
 * 덱에 그 등급이 없으면 한 단계 아래 등급, 그래도 없으면 위 등급. rand: 0~1 난수 함수 (테스트용)
 */
export function rollHire(deckIds, bonus = {}, rand = Math.random) {
  const chars = deckIds.map((id) => ROSTER_BY_ID[id]).filter(Boolean);
  if (!chars.length) return null;
  const p = { 4: GRADES[4].hire / 100 + (bonus.uniqueChance || 0), 3: GRADES[3].hire / 100 + (bonus.rareChance || 0), 2: GRADES[2].hire / 100 };
  const r = rand();
  const grade = r < p[4] ? 4 : r < p[4] + p[3] ? 3 : r < p[4] + p[3] + p[2] ? 2 : 1;
  const order = [grade, ...[3, 2, 1].filter((g) => g < grade), ...[2, 3, 4].filter((g) => g > grade)];
  for (const g of order) {
    const pool = chars.filter((c) => c.grade === g);
    if (pool.length) return pool[Math.floor(rand() * pool.length)];
  }
  return null;
}
