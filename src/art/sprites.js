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

// ── 용병 (16x16) ── 15명 모두 개별 디자인 (키: 클래스_속성). palette 는 용병 전용 추가 색 ──
// 클래스마다 무기는 같은 계열(궁수 활·마법사 지팡이·저격수 장총·주술사 토템·도적 단검)이라 역할은 한눈에 구분된다
export const MERC_SPRITES = {
  // 레드
  archer_red: { // 에릭: 구릿빛 삐죽머리, 붉은 머리띠, 짧은 활
    palette: { h: '#b85a24', q: '#5a3a1e' },
    rows: [
      '.....k.k.k......',
      '....khkhkhk...b.',
      '...khhhhhhhk.bk.',
      '...kAAAAAAAk.b.k',
      '...khskskshk.b.k',
      '....ksssssk..b.k',
      '.....kkkkk...b.k',
      '....kqAAAAkk.b.k',
      '...kAAqAAaAAkb.k',
      '...ksAAqyAAsskbk',
      '...kskAAqAkk.b.k',
      '....kkaaaaak.bk.',
      '.....kaa.aak.b..',
      '.....kqk.kqk....',
      '.....kkk.kkk....',
      '................'
    ]
  },
  mage_red: { // 브리짓: 긴 주황 머리, 금 서클릿, 불꽃 지팡이
    palette: { h: '#e0702a' },
    rows: [
      '..y.............',
      '.yLy...kkkk.....',
      '.yAy..khhhhk....',
      '..b..khhyyhhk...',
      '..b..khskskhk...',
      '..b..khsssshk...',
      '..b.khhkkkkhhk..',
      '..bkkhkAAAAkhk..',
      '..bskAAAyyAAAk..',
      '..bkkAAAAAAAAk..',
      '..b.kAALLLLAAk..',
      '..b.kAAAAAAAAk..',
      '..bkaAAAAAAAAak.',
      '..bkaaaaaaaaaak.',
      '.....kk..kk.....',
      '................'
    ]
  },
  sniper_red: { // 군나르: 털모자, 덥수룩한 붉은 수염, 장총
    palette: { h: '#c8502a', f: '#d8c8a8' },
    rows: [
      '................',
      '....kkkkkkkk....',
      '...kffffffffk...',
      '...kfkkkkkkfk...',
      '....kskssksk....',
      '....kssssssk....',
      '....khhhhhhk....',
      '...kkhhhhhhkk...',
      '..kAAAhhhhAAAk..',
      'kbbbbbbbbbbbbggk',
      '..kskAAyyAAksk..',
      '...kkAAAAAAkk...',
      '....kaaaaaak....',
      '....kak..kak....',
      '....kkk..kkk....',
      '................'
    ]
  },
  shaman_red: { // 헬가: 늑대 가죽 두건, 땋은 머리, 뼈 목걸이, 해골 토템
    palette: { h: '#d07a3a', f: '#7a6a5a' },
    rows: [
      '....k.....k..ww.',
      '...kfk...kfk.wkw',
      '...kfffffffk.ww.',
      '...kfkkkkkfk..b.',
      '...khskskhk...b.',
      '...khsssshk...b.',
      '...h.kkkk.h...b.',
      '...hkAAAAAAk.sb.',
      '..khAAwwwAAAkkb.',
      '..ksAAAAAAAAk.b.',
      '...kAAyyyAAk..b.',
      '...kaAAAAAak..b.',
      '...kaaaaaaak..b.',
      '....kak.kak...b.',
      '....kkk.kkk.....',
      '................'
    ]
  },
  rogue_red: { // 로완: 검은 머리, 붉은 복면 스카프, 역수 단검
    palette: { h: '#3a2418' },
    rows: [
      '................',
      '.....kkkkk......',
      '....khhhhhk.....',
      '...khhhhhhhhk...',
      '...khhsksksk....',
      '....kAAAAAAk....',
      '...kAAAaaAk.....',
      '..kAAkaaaakk....',
      '.kAkaAaaaaAakg..',
      '.k.kskaAAaksgk..',
      '....kkaaaakk.g..',
      '.....kaaaak.....',
      '.....kaAAak.....',
      '.....kak.kak....',
      '.....kkk..kk....',
      '................'
    ]
  },
  // 블루
  archer_blue: { // 시그리드: 금발 땋은 머리, 밝은 망토, 왼손 활
    palette: { h: '#f0d070' },
    rows: [
      '................',
      '.b....kkkk......',
      'kb...khhhhk.....',
      'k.b.khhhhhhk....',
      'k.b.khskskhk....',
      'k.b.khsssshk....',
      'k.b..kkkkkhk....',
      'k.bkkAAAAAAkhk..',
      'k.bsAAaAAaAAkh..',
      'k.bkAAAyyAAAkh..',
      'k.b.kAAAAAAk.k..',
      '.kb.kLLLLLLk....',
      '..b.kaaaaaak....',
      '....kak..kak....',
      '....kkk..kkk....',
      '................'
    ]
  },
  mage_blue: { // 올라프: 별 고깔모자, 흰 수염, 수정 지팡이
    palette: {},
    rows: [
      '.......k........',
      '......kAk.....L.',
      '.....kAyAk...kLk',
      '....kAAAAAk...b.',
      '..kkaaaaaaakk.b.',
      '....kskssksk..b.',
      '....kwwsswwk..b.',
      '...kkwwwwwwkk.b.',
      '..kAAkwwwwkAAks.',
      '..kAAAkwwkAAAkb.',
      '..kAAAAkkAAAAkb.',
      '..kAAyAAAAyAAkb.',
      '..kAAAAAAAAAAkb.',
      '..kaaaaaaaaaakb.',
      '....kk....kk..b.',
      '................'
    ]
  },
  sniper_blue: { // 에드먼드: 깃털 챙모자, 콧수염, 흰 깃, 머스킷
    palette: { h: '#4a2a18' },
    rows: [
      '..........L.....',
      '......kkkkLL....',
      '.....kAAAAAkL...',
      '..kkkAAAAAAAkkk.',
      '...kkkkkkkkkkk..',
      '....kskssksk....',
      '....kshhhhsk....',
      '.....kssssk.....',
      '...kkwAAAAwkk...',
      'kgggbbbbbbbbbbk.',
      '..kskAAyyAAksk..',
      '....kAAAAAAk....',
      '....kaaaaaak....',
      '....kak..kak....',
      '....kkk..kkk....',
      '................'
    ]
  },
  shaman_blue: { // 잉그리드: 얼음 왕관, 은빛 긴 머리, 서리 구슬
    palette: { h: '#dfe8f0' },
    rows: [
      '......L.L.L.....',
      '.....kLkLkLk....',
      '....khhhhhhhk...',
      '...khhhhhhhhhk..',
      '...khhskskshhk..',
      '...khhssssshhk..',
      '...khhkkkkkhhk..',
      '...khkAAAAAkhk..',
      '..khkAAwAwAAkhk.',
      '.kLk.kAAAAAAk...',
      '.LwLsAAyyyAAs...',
      '.kLk.kAAAAAk....',
      '....kLLLLLLLk...',
      '...kaaaaaaaaak..',
      '....kk.....kk...',
      '................'
    ]
  },
  rogue_blue: { // 핀: 해적 두건, 줄무늬 셔츠, 웃는 얼굴, 투척 단검 둘
    palette: {},
    rows: [
      '................',
      '.....kkkkkk.....',
      '....kAAAAAAkk...',
      '...kAAyAAAAkAk..',
      '...kAAAAAAAk.Ak.',
      '....kskssksk....',
      '....kssswwsk....',
      '.....kssssk.....',
      '...kkLAAAALkk...',
      '.gkskwAwAwAkskg.',
      'g...kAwAwAwk...g',
      '....kaaaaaak....',
      '....kaa..aak....',
      '....kbk..kbk....',
      '....kkk..kkk....',
      '................'
    ]
  },
  // 그린
  archer_green: { // 로빈: 붉은 깃털 고깔 모자, 갈색 머리, 장궁
    palette: { h: '#6a3a1a' },
    rows: [
      '.....r..........',
      '.....rkkkkk.....',
      '...kkAAAAAAk..b.',
      '..kAAAAAAAAAk.bk',
      '....khskskhk.b.k',
      '....khsssshk.b.k',
      '.....kssssk..b.k',
      '....kbAAAAbk.b.k',
      '...kAAbAAbAAkbsk',
      '...ksAAyyAAskb.k',
      '...kskAAAAksk.bk',
      '....kkaAAakk.b..',
      '.....kaa.aak....',
      '.....kbk.kbk....',
      '.....kkk.kkk....',
      '................'
    ]
  },
  mage_green: { // 프레야: 꽃 화관, 금발, 넝쿨 지팡이
    palette: { h: '#e8c050' },
    rows: [
      '..............L.',
      '......kkkk...LAL',
      '....kryrwryk..b.',
      '...khhhhhhhhk.b.',
      '...khskssskhk.b.',
      '...khsssssshk.b.',
      '...khhkkkkkhhkb.',
      '...khkAAAAAkhsb.',
      '...khAAyAyAAk.b.',
      '...khAAAAAAAk.b.',
      '...kAALLLLLAAkb.',
      '..kAAAAAAAAAAkb.',
      '..kaAAAAAAAAakb.',
      '..kaaaaaaaaaak..',
      '....kk....kk....',
      '................'
    ]
  },
  sniper_green: { // 토르발드: 땅딸막한 드워프, 두건, 큰 수염, 석궁
    palette: { h: '#8a5a2a' },
    rows: [
      '................',
      '................',
      '.....kkkkkk.....',
      '....kAAAAAAk....',
      '...kAAAAAAAAk...',
      '...kAskssksAk...',
      '...kAhhsshhAk...',
      '...khhhhhhhhk...',
      '..kkhhhhhhhhkk..',
      'kgbbbbbbbbbbbbgk',
      '.k.kskhhhhksk.k.',
      '..kAAAAyyAAAAk..',
      '..kaaaaaaaaaak..',
      '...kbbk..kbbk...',
      '...kkkk..kkkk...',
      '................'
    ]
  },
  shaman_green: { // 아스트리드: 사슴뿔 관, 적갈색 땋은 머리, 떠다니는 잎사귀
    palette: { h: '#c87a3a' },
    rows: [
      '..b.b......b.b..',
      '...bb......bb...',
      '....bkkkkkkb....',
      '....khhhhhhk....',
      '...khsksskshk...',
      '...khsssssshk...',
      '...hhkkkkkkhh...',
      '..L.hkAAAAkh.L..',
      '.LAL.kALALAk.LAL',
      '..L.kskAAkskL...',
      '....kAAyyAAk....',
      '...kALAAAALAk...',
      '..kALAAAAAALAk..',
      '..kaaaaaaaaaak..',
      '....kk....kk....',
      '................'
    ]
  },
  rogue_green: { // 레이프: 뾰족 귀, 금발, 어두운 망토, 휜 단검 둘
    palette: { h: '#e8c060' },
    rows: [
      '................',
      '.....kkkkkk.....',
      '....khhhhhhk....',
      '...khhhhhhhhk...',
      '..skkhskskhkks..',
      '...kkhsssshkk...',
      '.....kssssk.....',
      '...kkaAAAAakk...',
      '..kaakAyyAkaak..',
      '.gkaksAAAAskakg.',
      'g..ka.kAAk.ak..g',
      '...ka.kaak.ak...',
      '...kk.kaak.kk...',
      '.....kak.kak....',
      '.....kkk.kkk....',
      '................'
    ]
  }
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

// ── 아이콘 ───────────────────────────────────
// ── 건물 ── 필드 가운데 성탑 (16x20): 누르면 명성 강화 트리가 열린다
export const BUILDING_SPRITES = {
  tower: {
    palette: { c: '#36d6c8', L: '#b8fff6', d: '#6b7280', r: '#c0392b' },
    rows: [
      '.......cc.......',
      '......cLLc......',
      '......cLcc......',
      '......kyyk......',
      '..kk.kk..kk.kk..',
      '..kgkkgkkgkkgk..',
      '..kggggggggggk..',
      '...kwgggggggk...',
      '...kwggkkgggk...',
      '...kwgkcckggk...',
      '...kwgkcckggk...',
      '...kwggggdggk...',
      '...kwgkrrkggk...',
      '...kwgkryrkgk...',
      '...kwgkrrkggk...',
      '...kwggkkgdgk...',
      '..kwggkbbkgggk..',
      '..kwggkbbkgggk..',
      '.kddddkbbkddddk.',
      '.kkkkkkkkkkkkkk.'
    ]
  }
};

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
