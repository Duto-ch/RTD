// 픽셀아트 스프라이트 정의 (문자 1개 = 픽셀 1개)
// '.' 투명 / k 외곽선 / s 피부 / w 흰색 / g 금속 / b 나무 / y 금 / r 빨간눈
// A 속성 기본색 / a 속성 어두운색 / L 속성 밝은색  ← 레드/블루/그린 팔레트로 치환됨

export const BASE_PALETTE = {
  k: '#1b1b26',
  s: '#f2c9a0',
  w: '#f4f4f4',
  g: '#a7adb8',
  b: '#7a4f2a',
  y: '#f2c14e',
  r: '#ff3b3b'
};

export const ATTR_PALETTES = {
  red: { A: '#d94a3a', a: '#8c2b25', L: '#ff9a7a' },
  blue: { A: '#3a7bd9', a: '#24467f', L: '#8ec8ff' },
  green: { A: '#4caf50', a: '#2e6b31', L: '#a6e88a' }
};

// ── 용병 (16x16) ───────────────────────────────
export const HERO_SPRITES = {
  archer: [
    '................',
    '......kkkk......',
    '.....kAAAAk.....',
    '....kAAAAAAk..b.',
    '....kAkssskk.bk.',
    '....kksksksk.b.k',
    '.....kssssk..b.k',
    '....kkAAAAkk.b.k',
    '...kAAaAAaAAkb.k',
    '...ksAAyyAAskb.k',
    '...kskAAAAkskb.k',
    '....kkaAAakk.bk.',
    '.....kaa.aak.b..',
    '.....kbk.kbk....',
    '.....kkk.kkk....',
    '................'
  ],
  mage: [
    '........k.......',
    '.......kAk......',
    '......kAAAk.....',
    '.....kAAyAAk....',
    '...kkAAAAAAAkk..',
    '..kaaaaaaaaaaak.',
    '..L.kssssssk....',
    '.kLk.ksksksk....',
    '..b..kssssk.....',
    '..b.kAAAAAAk....',
    '..bkAAAyyAAAk...',
    '..bksAAAAAAsk...',
    '..b.kAAAAAAk....',
    '..b.kaaaaaak....',
    '..b..kk..kk.....',
    '................'
  ],
  sniper: [
    '................',
    '.....kkkkkk.....',
    '....kggggggk....',
    '....kgAAAAgk....',
    '....kkssssk.....',
    '....ksksksk.....',
    '.....kssssk.....',
    '...kkAAAAAAkk...',
    '..kAAAaAAaAAAk..',
    'kbbbbbbbbbbbbggk',
    '..kskAAAAAAksk..',
    '....kAAyyAAk....',
    '....kaaaaaak....',
    '....kak..kak....',
    '....kkk..kkk....',
    '................'
  ],
  shaman: [
    '..L..........L..',
    '..Lk........kL..',
    '...kAkkkkkkkAk..',
    '....kAAAAAAAk...',
    '....kwkwwwkwk...',
    '....kwwkwkwwk...',
    '.....kwwwwwk....',
    '...kkAAAAAAAkk..',
    '..kLAAaAAAaAALk.',
    '..ksAALLLLLAAsk.',
    '...kkAAAAAAAkk..',
    '....kAAyyyAAk...',
    '....kaaaaaaak...',
    '.....kak.kak....',
    '.....kkk.kkk....',
    '................'
  ],
  rogue: [
    '................',
    '......kkkk......',
    '.....kaaaak.....',
    '....kAAAAAAk....',
    '....kAAAAAAkAk..',
    '....kkssssk..Ak.',
    '....kskksksk....',
    '.....kssssk.....',
    '...kkaaaaaakk...',
    '..kakaAAAAakak..',
    '..gk.kaAAak.kg..',
    '.gk..kaaaak..kg.',
    '.....kaAAak.....',
    '.....kak.kak....',
    '.....kkk..kk....',
    '................'
  ]
};

// ── 몬스터 ───────────────────────────────────
export const MONSTER_SPRITES = {
  normal: [
    '............',
    '....kkkk....',
    '...kLLAAk...',
    '..kLAAAAAk..',
    '..kAAAAAAk..',
    '.kAkwAAkwAk.',
    '.kAkkAAkkAk.',
    '.kAAAAAAAAk.',
    '.kAAaaaaAAk.',
    '.kaAAAAAAak.',
    '..kaaaaaak..',
    '...kkkkkk...'
  ],
  elite: [
    '.w........w.',
    '.wk.kkkk.kw.',
    '..wkLLAAkw..',
    '..kLAAAAAk..',
    '..kAyyyyAk..',
    '.kAkwAAkwAk.',
    '.kAkrAAkrAk.',
    '.kAAAAAAAAk.',
    '.kAwkwwkwAk.',
    '.kaAAAAAAak.',
    '..kaaaaaak..',
    '...kkkkkk...'
  ],
  boss: [
    '...y...yy...y...',
    '...yy.yyyy.yy...',
    '...yyyyyyyyyy...',
    '..kkkkkkkkkkkk..',
    '.kAAAAAAAAAAAAk.',
    'kAALAAAAAAAALAAk',
    'kAkkwAAAAAAwkkAk',
    'kAkrrkAAAAkrrkAk',
    'kAAkkAAAAAAkkAAk',
    'kAAAAAAAAAAAAAAk',
    'kAAwkwkwkwkwkAAk',
    'kaAkwkwkwkwkwAak',
    'kaAAkkkkkkkkAAak',
    '.kaAAAAAAAAAAak.',
    '..kaaaaaaaaaak..',
    '...kkkkkkkkkk...'
  ]
};

// ── 아이콘 ───────────────────────────────────
export const ICON_SPRITES = {
  coin: [
    '..kkkk..',
    '.kyyyyk.',
    'kyywyyyk',
    'kywyyyyk',
    'kyyyyyak',
    'kyyyyyak',
    '.kyyaak.',
    '..kkkk..'
  ],
  // 유물 아이콘: A 계열이 유물 색으로 치환됨
  relic: [
    '...kkkk...',
    '..kLLAAk..',
    '.kLAAAAAk.',
    'kLAAAAAAak',
    'kAAAAAAAak',
    'kAAAAAAaak',
    '.kAAAAaak.',
    '..kaaaak..',
    '...kkkk...',
    '..........'
  ],
  skull: [
    '.kkkkkk.',
    'kwwwwwwk',
    'kwkkwkkw',
    'kwkkwkkw',
    'kwwwwwwk',
    '.kwkwkk.',
    '.kwwwwk.',
    '..kkkk..'
  ]
};
