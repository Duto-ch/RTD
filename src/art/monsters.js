// 몬스터 디자인 — 일반 20종(5웨이브마다 교체), 정예 10종(정예 웨이브마다), 보스 10종(보스 웨이브마다)
// 문자 1개 = 픽셀 1개. A/a/L 은 몬스터 속성색으로 치환. k 외곽선 / w 흰색 / r 빨강 / y 금 / g 회색 / b 갈색 / p 보라
// 행 길이가 모자라면 '.' 로 채운다 (textures.js 의 normalize)

// ── 일반 몬스터 (12x12) — normal[i] 는 웨이브 i*5+1 ~ i*5+5 ──
export const NORMAL_DESIGNS = [
  { id: 'slime', name: '슬라임', rows: [
    '............', '....kkkk....', '...kLLAAk...', '..kLAAAAAk..', '..kAAAAAAk..', '.kAkwAAkwAk.',
    '.kAkkAAkkAk.', '.kAAAAAAAAk.', '.kAAaaaaAAk.', '.kaAAAAAAak.', '..kaaaaaak..', '...kkkkkk...'] },
  { id: 'bat', name: '박쥐', rows: [
    '............', 'k..........k', 'kak......kak', 'kaAk.kk.kAak', 'kaAAkAAkAAak', '.kAAAAAAAAk.',
    '..kAwAAwAk..', '..kArAArAk..', '...kAAAAk...', '....kwwk....', '.....kk.....', '............'] },
  { id: 'mushroom', name: '버섯', rows: [
    '....kkkk....', '..kkLLAAkk..', '.kLLwAAwAAk.', 'kAAAAAAAAAAk', 'kAwAAAAAwAAk', '.kkkkkkkkkk.',
    '...kwwwwk...', '...kwkkwk...', '...kwwwwk...', '..kwwwwwwk..', '..kaaaaaak..', '...kk..kk...'] },
  { id: 'goblin', name: '고블린', rows: [
    '............', '.k..kkkk..k.', '.kAkAAAAkAk.', '..kAwAAwAk..', '..kArAArAk..', '..kAAAAAAk..',
    '...kAwwAk...', '..kbbbbbbk..', '.kAkbyybkAk.', '...kbbbbk...', '...kAk.kAk..', '...kk...kk..'] },
  { id: 'skeleton', name: '해골 병사', rows: [
    '....kkkk....', '...kwwwwk...', '..kwAwwAwk..', '..kwwwwwwk..', '...kwkkwk...', '....kwwk....',
    '..kkwkkwkk..', '.kwkwwwwkwk.', '..k.kwwk.k..', '....kAAk....', '...kwk.kwk..', '...kk...kk..'] },
  { id: 'wolf', name: '늑대', rows: [
    '............', '.......k.k..', '......kAkAk.', 'k....kAAAAAk', 'kAk..kAAwrAk', '.kAkkAAAAAkk',
    '.kAAAAAAAAk.', '.kAAAAAAAk..', '.kaAAAAAak..', '.kak.kak.k..', '.kk..kk.....', '............'] },
  { id: 'ghost', name: '유령', rows: [
    '....kkkk....', '...kLLLLk...', '..kLwLLwLk..', '..kLkLLkLk..', '..kLLLLLLk..', '..kLLkkLLk..',
    '..kLLLLLLk..', '..kAAAAAAk..', '..kAAAAAAk..', '..kAkAAkAk..', '..kk.kk.kk..', '............'] },
  { id: 'spider', name: '거미', rows: [
    '............', 'k..k....k..k', '.k..k..k..k.', '..k.kkkk.k..', 'kk.kAAAAk.kk', '..kArAArAk..',
    '.kkAAAAAAkk.', 'k.kAAyyAAk.k', '.k.kAAAAk.k.', 'k...kkkk...k', '............', '............'] },
  { id: 'lizard', name: '도마뱀', rows: [
    '............', '......kkkk..', '.....kAAwrk.', '.....kAAAAkk', '..kkkAAAAk..', '.kAAAAAAAk..',
    'kAAkLLLLAk..', 'kAk.kAAAk...', 'k...kAkAk...', '....kk.kk...', '............', '............'] },
  { id: 'imp', name: '임프', rows: [
    '.k........k.', '.kk.kkkk.kk.', '..kkAAAAkk..', 'kk.kwAAwk.kk', 'kAkkrAArkkAk', 'kAAkAAAAkAAk',
    '.kkkAkkAkkk.', '...kAAAAk...', '...kAAAAk...', '....kAAk.k..', '...kk..kkk..', '............'] },
  { id: 'eye', name: '눈알 마물', rows: [
    '....kkkk....', '..kkAAAAkk..', '.kAAwwwwAAk.', 'kAAwwkkwwAAk', 'kAwwkrrkwwAk', 'kAwwkrrkwwAk',
    'kAAwwkkwwAAk', '.kAAwwwwAAk.', '..kkAAAAkk..', '..k.kkkk.k..', '.k..k..k..k.', '............'] },
  { id: 'beetle', name: '딱정벌레', rows: [
    '...k....k...', '....k..k....', '...kkkkkk...', '..kAAyyAAk..', '.kAALAALAAk.', '.kAAAkkAAAk.',
    'kkAAAkkAAAkk', '.kAALkkLAAk.', 'kkAAAkkAAAkk', '..kAAkkAAk..', '.k.kkkkkk.k.', '............'] },
  { id: 'snake', name: '독사', rows: [
    '............', '.......kkkk.', '......kAwAAk', '......kAAAAr', '..kkk..kAAk.', '.kAAAk..kAk.',
    'kAk.kAkkAAk.', 'kAk..kAAAk..', '.kAk..kkk...', '..kAAk......', '...kk.......', '............'] },
  { id: 'golem', name: '돌 골렘', rows: [
    '...kkkkkk...', '..kggggggk..', '..kgLggLgk..', '..kggggggk..', 'kkkkggggkkkk', 'kggkgAAgkggk',
    'kggkgAAgkggk', '.kkkggggkkk.', '...kggggk...', '..kggkkggk..', '..kggk.kggk.', '..kkk..kkk..'] },
  { id: 'harpy', name: '하피', rows: [
    '............', '.....kkk....', '....kAwAk...', '....kAAAyy..', '.k..kAAAk.k.', 'kAk.kAAAkkAk',
    'kAAkAAAAkAAk', '.kAAALLAAAk.', '..kAAAAAAk..', '...kAAAAk...', '...ky..yk...', '...k....k...'] },
  { id: 'jelly', name: '해파리', rows: [
    '...kkkkkk...', '..kLLLLLLk..', '.kLwLLLLwLk.', '.kLLLLLLLLk.', '.kAAAAAAAAk.', '..kkkkkkkk..',
    '..A.A..A.A..', '.A..A..A..A.', '..A.A..A.A..', '.A...A..A...', '..A.....A...', '............'] },
  { id: 'wraith', name: '망령 기사', rows: [
    '....kkkk....', '...kaaaak...', '..kaakkaak..', '..kakLkLak..', '..kaakkaak..', '.kaAAAAAAak.',
    'kaAAgAAgAAak', 'kakAAAAAAkak', '.kaAAAAAAak.', '..kaAaAaAk..', '..ka.a.a.ak.', '...k.k.k.k..'] },
  { id: 'gargoyle', name: '가고일', rows: [
    'k..........k', 'kk..kkkk..kk', 'kgk.kggk.kgk', 'kggkgrgrkggk', 'kgggggggggk.', '.kgkggggkgk.',
    '..kgAggAgk..', '..kgggggk...', '...kgAAgk...', '..kgk..kgk..', '..kk....kk..', '............'] },
  { id: 'hound', name: '지옥견', rows: [
    '............', '.k.k........', 'kAkAk.......', 'kAAAAk....k.', 'krAwAAkkkkAk', 'kAAAAAAAAAk.',
    '.kkAAAAAAAk.', '..kALLLLAk..', '..kAkAAkAk..', '..kAk..kAk..', '..kk...kk...', '............'] },
  { id: 'void', name: '공허체', rows: [
    '..k..kk..k..', '.kAk.kk.kAk.', 'kAAAkLLkAAAk', '.kAwLLLLwAk.', '.kALLkkLLAk.', 'kAALkrrkLAAk',
    'kAALkrrkLAAk', '.kALLkkLLAk.', '.kAALLLLAAk.', 'kAAAkLLkAAAk', '.kAk.kk.kAk.', '..k..kk..k..'] }
];

// ── 정예 (12x12) — elite[i] 는 정예 웨이브 i*10+5. 강화 보스 웨이브(30·60·90)의 정예는 직전 정예 디자인 ──
export const ELITE_DESIGNS = [
  { id: 'e_slime', name: '뿔 슬라임', rows: [
    '.w........w.', '.wk.kkkk.kw.', '..wkLLAAkw..', '..kLAAAAAk..', '..kAyyyyAk..', '.kAkwAAkwAk.',
    '.kAkrAAkrAk.', '.kAAAAAAAAk.', '.kAwkwwkwAk.', '.kaAAAAAAak.', '..kaaaaaak..', '...kkkkkk...'] },
  { id: 'e_mushroom', name: '버섯 기사', rows: [
    '....kkkk...y', '..kkLLAAkk.g', '.kLLwAAwAAkg', 'kAAAAAAAAAAk', 'kAwAAAAAwAkg', '.kkggggggkkg',
    '..kgkwwkgk.g', '..kgwwwwgk.g', '..kggggggk.g', '..kgAyyAgk..', '..kaaaaaak..', '...kk..kk...'] },
  { id: 'e_skeleton', name: '해골 기사', rows: [
    '....kggk....', '...kgggggk..', '..kwgggwk...', '..kwrwwrwk..', '..kwwwwwwk..', 'kk.kwkkwk...',
    'kAk.kwwk.k..', 'kyAkgwwgkwk.', 'kAkkgwwgk.k.', '.k..kggk.k..', '...kwk.kwk..', '...kk...kk..'] },
  { id: 'e_ghost', name: '유령 군주', rows: [
    '..y.y..y.y..', '..yyyyyyyy..', '..kLLLLLLk..', '.kLwLLLLwLk.', '.kLkrLLrkLk.', '.kLLLLLLLLk.',
    '.kLLLkkLLLk.', '.kAAAAAAAAk.', '.kAAyAAyAAk.', '.kAAAAAAAAk.', '.kAkAkkAkAk.', '.kk.kk.kk.k.'] },
  { id: 'e_lizard', name: '리자드맨 전사', rows: [
    '.....kkkk..w', '....kAAwrk.g', '....kAAAAk.g', '...kkAAkk..g', '..kAAggAAk.g', '.kAkgyygkAkg',
    '.kAkggggk.kg', '...kAAAAk..g', '..kAk..kAk..', '.kAk....kAk.', '.kk......kk.', '............'] },
  { id: 'e_eye', name: '감시자', rows: [
    'k..k.kk.k..k', 'Lk.Lk..kL.kL', '.k..k..k..k.', '..kkAAAAkk..', '.kAAwwwwAAk.', 'kAAwwkkwwAAk',
    'kAwwkrrkwwAk', 'kAAwwkkwwAAk', '.kAAwwwwAAk.', '..kkAyyAkk..', '...kAkkAk...', '....k..k....'] },
  { id: 'e_golem', name: '골렘 대장', rows: [
    '..kkkkkkkk..', '.kggggggggk.', '.kgLgggLggk.', '.kggggggggk.', 'kkkkggggkkkk', 'kggkgyygkggk',
    'kggkyLLykggk', 'kggkgyygkggk', '.kkkggggkkk.', '..kggkkggk..', '.kgggk.kgggk', '.kkkk...kkkk'] },
  { id: 'e_griffin', name: '그리폰', rows: [
    '.......kkk..', '..k...kwAyk.', '.kAk..kAAAyy', 'kAAAk.kAAk..', 'kAAAAkAAAk..', '.kAAAAAAAAk.',
    '..kAALLLLAAk', '..kAAAAAAAk.', '...kbbbbbk..', '..kbk..kbk..', '..ky...ky...', '............'] },
  { id: 'e_deathknight', name: '데스 나이트', rows: [
    '...kkkkkk...', '..kgggggggk.', '..kgkrkrkgk.', '..kgggggggk.', '.kkkaaaaakkk', 'kgkaAAAAAakg',
    'kgkaAyyyAakg', 'kgkaAAAAAakg', '.kkaaaaaaak.', '..kaakkaak..', '..kgk..kgk..', '..kkk..kkk..'] },
  { id: 'e_demon', name: '악마', rows: [
    'yk........ky', '.yk.kkkk.ky.', '..kkAAAAkk..', 'kk.kwAAwk.kk', 'kAkkrAArkkAk', 'kAAkAyyAkAAk',
    'kAAkAAAAkAAk', '.kkkAkkAkkk.', '...kAAAAk...', '...kAyyAk...', '...kAk.kAk..', '...kk...kk..'] }
];

// ── 보스 (16x16, 최종 보스 20x20) — boss[i] 는 웨이브 (i+1)*10 ──
export const BOSS_DESIGNS = [
  { id: 'b_slimeking', name: '슬라임 왕', rows: [
    '...y...yy...y...', '...yy.yyyy.yy...', '...yyyyyyyyyy...', '..kkkkkkkkkkkk..', '.kAAAAAAAAAAAAk.', 'kAALAAAAAAAALAAk',
    'kAkkwAAAAAAwkkAk', 'kAkrrkAAAAkrrkAk', 'kAAkkAAAAAAkkAAk', 'kAAAAAAAAAAAAAAk', 'kAAwkwkwkwkwkAAk', 'kaAkwkwkwkwkwAak',
    'kaAAkkkkkkkkAAak', '.kaAAAAAAAAAAak.', '..kaaaaaaaaaak..', '...kkkkkkkkkk...'] },
  { id: 'b_goblinchief', name: '고블린 족장', rows: [
    '.....y.y.y......', '.....yyyyy......', 'k...kkkkkkk...k.', 'kAk.kAAAAAk..kAk', '.kAkAwAAAwAkkAk.', '..kAArAAArAAk...',
    '..kAAAAAAAAAk.b.', '...kAwwwwwAk..bk', '..kbbbbbbbbbk.b.', '.kAkbbyyybbkAkb.', '.kAkbbbbbbbk.kb.', '..k.kAAkAAk.....',
    '....kAAkAAk.....', '...kAAk.kAAk....', '...kkk...kkk....', '................'] },
  { id: 'b_lich', name: '리치 왕', rows: [
    '.....y.y.y......', '.....yyyyy...L..', '....kkkkkkk.LyL.', '...kwwwwwwwk.L..', '...kwLwwwLwk.b..', '...kwwwwwwwk.b..',
    '....kwkwkwk..b..', '..kkaakkkaakkb..', '.kaaAAAAAAAaakb.', '.kaAAAyyyAAAakb.', '.kaAAAAAAAAAak.b', '.kaAAAyyyAAAak.b',
    '.kaAAAAAAAAAak..', '..kaAaAaAaAak...', '..ka.a.a.a.ak...', '...k.k.k.k.k....'] },
  { id: 'b_spiderqueen', name: '거미 여왕', rows: [
    '......y.y.......', 'k.....yyy.....k.', '.k...kkkkk...k..', '..k.kAAAAAk.k...', 'kk.kArAAArAk.kk.', '..kkAAAAAAAkk...',
    '.k.kAAwwwAAk.k..', 'k.kkAAAAAAAkk.k.', '..kAAAAAAAAAk...', '.kAAAAyyyAAAAk..', '.kAAAyAAAyAAAk..', '.kAAAAyyyAAAAk..',
    'k.kAAAAAAAAAk.k.', '.k.kkAAAAAkk.k..', 'k...kkkkkkk...k.', '................'] },
  { id: 'b_treant', name: '고대 거목', rows: [
    '..L.LL...LL.L...', '.LLLLLLLLLLLLL..', 'LLLaLLLLLLaLLLL.', '.LLLLLLLLLLLLL..', '...kbbbbbbbk....', '..kbbwbbbwbbk...',
    '..kbbrbbbrbbk...', '..kbbbbbbbbbk...', 'kk.kbbkkkbbk.kk.', 'kbkkbbbbbbbkkbk.', '.kbbbbAbbbbbbk..', '..kbbbbbbbbbk...',
    '...kbbbbbbbk....', '..kbbk...kbbk...', '.kbbk.....kbbk..', '.kkk.......kkk..'] },
  { id: 'b_minotaur', name: '미노타우로스', rows: [
    'w..............w', 'ww............ww', '.wwk.kkkkkk.kww.', '..kkAAAAAAAAkk..', '...kAwAAAAwAk...', '...kArAAAArAk...',
    '...kAAAAAAAAk...', '...kAAkyykAAk...', '.kkkkAAAAAAkkkkg', 'kAAAkAAAAAAkAAkg', 'kAAkAAyyyyAAkAkg', 'kAkkAAAAAAAAkkgg',
    '.k.kbbbbbbbbk.g.', '...kAAk..kAAk...', '..kAAk....kAAk..', '..kkk......kkk..'] },
  { id: 'b_kraken', name: '크라켄', rows: [
    '.....kkkkkk.....', '...kkAAAAAAkk...', '..kAALAAAALAAk..', '.kAAAAAAAAAAAAk.', '.kAAwwAAAAwwAAk.', '.kAAwrAAAAwrAAk.',
    '.kAAAAAAAAAAAAk.', '..kAAAkkkkAAAk..', '.kAkAkAkAkAkAk..', 'kAk.kAkAkAk.kAk.', 'kA..kA.kA.kA.Ak.', '.kA.kA..kA.kA.k.',
    '..kA.kA.kA..kA..', '.kA..kA..kA..k..', '..k...k...k.....', '................'] },
  { id: 'b_dragon', name: '고룡', rows: [
    '..........kk....', '.........kAAk...', '..k.....kAwrAk..', '.kAk....kAAAAAyy', 'kAAAk..kAAAk....', 'kAAAAkkAAAk.....',
    'kAAAAAAAAAk..k..', '.kAAAAAAAAAk.kAk', '..kAALLLLAAAkkAk', '..kAALLLLAAAAAk.', '..kAAAAAAAAAAk..', '...kAAAAAAAAk...',
    '...kAk.kAk.kAk..', '...kyk.kyk.kyk..', '...kk..kk..kk...', '................'] },
  { id: 'b_darklord', name: '마왕의 기사', rows: [
    '..w..kkkkkk..w..', '..wwkgggggggkww.', '...kgggggggggk..', '...kgkrkgkrkgk..', '...kgggggggggk..', '....kgkkkkkgk...',
    '.kkkaaaaaaaaakkk', 'kgkaaAAAAAAAaakg', 'kgkaAAyyyyyAAakg', 'kgkaAAAAAAAAAakg', '.kkaaAAAAAAAaakk', '..kaaaaaaaaaaak.',
    '..kaak.ppp.kaak.', '..kgk..ppp..kgk.', '..kgk.......kgk.', '..kkk.......kkk.'] },
  // 최종 보스 (20x20)
  { id: 'b_voidemperor', name: '공허의 황제', rows: [
    '.....y..y..y..y.....', '.....yyyyyyyyyy.....', '.w...kkkkkkkkkk...w.', '.ww.kppppppppppk.ww.', '..wkppLppppppLppkw..', '...kppkrrkkrrkppk...',
    '...kpppkrkkrkpppk...', '...kppppppppppppk...', '....kppwkwkwwppk....', '..kkkkppppppppkkkk..', '.kAAAkaaaaaaaakAAAk.', 'kAAAAkaAAyyAAakAAAAk',
    'kAAAkkaAyLLyAakkAAAk', 'kAAk.kaAAyyAAak.kAAk', '.kk..kaaAAAAaak..kk.', '....kaapppppaak.....', '....kpp.kppk.ppk....', '...kpp..kppk..ppk...',
    '...kkk..kkkk..kkk...', '....................'] }
];

export const BOSS_EXTRA_PALETTE = { p: '#5b2a86' };
