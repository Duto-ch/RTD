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
export const MERC_SPRITES = {
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

// ── 영웅 (16x16) ── 9명 모두 개별 디자인. palette 는 영웅 전용 추가 색 ──
// 공통: A/a/L = 영웅 속성색, y = 금장식
export const HERO_SPRITES = {
  // 레드
  ragnar: { // 바이킹 광전사: 뿔 투구, 붉은 수염, 쌍도끼
    palette: { h: '#d9622b', f: '#8a6a4a' },
    rows: [
      '.w............w.',
      '.wk..kkkkkk..kw.',
      '..wkkggggggkkw..',
      '....kgggyyggk...',
      '....kskssksk....',
      '....kssssssk....',
      '...khhhsshhhk...',
      'g..khhhhhhhhk..g',
      'gg.kAAhhhhAAk.gg',
      'gbkAAAAyyAAAAkbg',
      '.bksAAAAAAAAskb.',
      '.b.kaaayyaaak.b.',
      '...kAAAkAAAk....',
      '...kffk.kffk....',
      '...kkkk.kkkk....',
      '................'
    ]
  },
  isolde: { // 화염 마녀: 불꽃 머리칼, 왕관, 불꽃 지팡이
    palette: { h: '#ff7a3d', o: '#ffd23a' },
    rows: [
      '.o..............',
      'oyo...kkkk......',
      '.o...kyyyyk.....',
      '.b..khhhhhhk....',
      '.b.khhsssshhk...',
      '.b.khsksskshk...',
      '.b.khhssssshhk..',
      '.bkhhkAAAAkhhk..',
      '.bhhkAAyyAAkhh..',
      '.bskAAAAAAAAks..',
      '.b.kAALLLLAAk...',
      '.b.kAAAyyAAAk...',
      '.b.kaAAAAAAak...',
      '.b.kaaaaaaaak...',
      '.b..kkkkkkkk....',
      '................'
    ]
  },
  bjorn: { // 곰 사냥꾼: 곰가죽 두건, 금발 수염, 장궁
    palette: { f: '#7a5233', h: '#e0c98a' },
    rows: [
      '..kk....kk......',
      '.kffk..kffk...b.',
      '.kfffkkfffk..bk.',
      '.kffffffffk..b.k',
      '.kfkssssskf..b.k',
      '..kskssksk...b.k',
      '..kssssssk...b.k',
      '.kfkhhhhhkfk.b.k',
      'kffAAAyyAAAfkb.k',
      'kfsAAAAAAAAskb.k',
      'kf.kAAAAAAk..bk.',
      'kf.kaaaaaak...b.',
      '.k.kaAk.kAak....',
      '...kffk.kffk....',
      '...kkkk.kkkk....',
      '................'
    ]
  },
  // 블루
  arthur: { // 기사왕: 왕관 투구, 판금, 성검과 문장 방패
    palette: {},
    rows: [
      '....y.y.y.......',
      '....yyyyy.......',
      '...kgggggk......',
      '...kgkkkgk...w..',
      '...kgggggk...w..',
      '..akkgggkka..w..',
      '.aakgggggkaa.w..',
      'kkkkgAyAgkaakw..',
      'kyykgAAAgkaayyy.',
      'kyykgAAAgkaa.y..',
      'kyykgggggkaa....',
      '.kk.kAAAAkaa....',
      '....kgk.kgk.....',
      '....kgk.kgk.....',
      '....kkk.kkk.....',
      '................'
    ]
  },
  solveig: { // 얼음 여왕: 눈꽃 티아라, 은발, 얼음 수정 지팡이
    palette: { c: '#bff4ff' },
    rows: [
      '.....c.c.c......',
      '.....ccccc....c.',
      '....kwwwwwk..cLc',
      '...kwwssswwk..c.',
      '...kwsksskwk..b.',
      '...kwwssswwk..b.',
      '..kwwkAAAkwwk.b.',
      '..kwkAALAAkwksb.',
      '..kwkAcccAkwk.b.',
      '..kwkAAAAAkwk.b.',
      '..kwkALLLAkwk.b.',
      '...kkAAAAAkk..b.',
      '...kaAAAAAak..b.',
      '..kaaaaaaaaak.b.',
      '..kkkkkkkkkkk...',
      '................'
    ]
  },
  william: { // 파도의 궁수: 삼각모, 흰 스카프, 석궁
    palette: {},
    rows: [
      '................',
      '...kkkkkkkk.....',
      '..kAAAAAAAAk....',
      '.kAAAyyyyAAAk...',
      '..kkssssssk.....',
      '...kskssksk.....',
      '...ksssssk......',
      '..kwwwwwwwk.....',
      '.kAAkwwwkAAk....',
      'kbbbbbbbbbbbbk..',
      '.ksAAAAAAAsk.b..',
      '..kaAAyAAak.....',
      '..kaaaaaaak.....',
      '..kak...kak.....',
      '..kkk...kkk.....',
      '................'
    ]
  },
  // 그린
  halvard: { // 숲의 수호자: 사슴뿔, 이끼 수염, 잎사귀 망토, 나무 망치
    palette: { f: '#6b4a2b', h: '#7fbf4a', e: '#2f6a22' },
    rows: [
      '.b.b....b.b.....',
      '..bb....bb......',
      '...bkkkkb.......',
      '...kffffk...bbb.',
      '..kfskksfk...b..',
      '..kssssssk...b..',
      '..khhhhhhk...b..',
      '.ekkAAAAkke..b..',
      'eeAAAyyAAAeekb..',
      'eeAAAAAAAAeesb..',
      '.ekAAAAAAke.....',
      '.eekaaaaakee....',
      '...kaAk.kAak....',
      '...kbbk.kbbk....',
      '...kkkk.kkkk....',
      '................'
    ]
  },
  freydis: { // 드루이드: 꽃 화관, 땋은 머리, 덩굴 지팡이
    palette: { r: '#ff6f91', h: '#b5743a', e: '#3f9a3a' },
    rows: [
      '....r.y.r.......',
      '...kerererek....',
      '...khhhhhhhk..e.',
      '..khhsssssshk.ee',
      '..khskssksshk.b.',
      '..khhsssssshk.b.',
      '..khkAAAAAkhk.b.',
      '..khkAeAeAkhksb.',
      '..hkAAAAAAAk.b..',
      '..h.kAAyAAk..b..',
      '..hkAAAAAAAk.b..',
      '..kaAAAAAAAak.b.',
      '..kaaaaaaaaak.b.',
      '...kkkkkkkkk..b.',
      '................',
      '................'
    ]
  },
  richard: { // 황금 사냥꾼: 금깃털 모자, 금장 조끼, 화살통, 장궁
    palette: {},
    rows: [
      '..........yy....',
      '....kkkkkky.....',
      '...kAAAAAAAk....',
      '..kAAAAAAAAAk...',
      '...kkssssk....b.',
      '...kskssks...b.k',
      '....kssssk...b.k',
      '..kkyAAAAykk.b.k',
      '.kbkAAyyAAkskb.k',
      '.kbkAAAAAAk..b.k',
      '.kbkyyyyyyk..bk.',
      '..kkaaaaaak...b.',
      '....kak.kak.....',
      '....kbk.kbk.....',
      '....kkk.kkk.....',
      '................'
    ]
  }
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
