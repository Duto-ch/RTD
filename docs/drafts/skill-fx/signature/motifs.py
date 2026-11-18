# 캐릭터 상징 도트 (레어 21 · 유니크 13). 글자: d 그늘 · b 기본 · l 밝음 · h 하이라이트 · a 유니크 전용 강조색. 외곽선은 그릴 때 계열색으로 붙는다
M = {
 # ── 레어 레드 ──
 'elva':      ["...b...", "..bbl..", ".bbllb.", "bbdbldb", "bdbbbdb", ".bdbdb.", "..bbb.."],          # 용 비늘
 'thorsten':  ["......l", ".....lh", "....lh.", "d..lh..", ".dbh...", "..dd...", ".d..d.."],          # 대검
 'cecilia':   ["....hl.", "...hlb.", "..hlbb.", ".hlbbd.", ".lbbd..", "lbdd...", "b......"],          # 불사조 깃
 'ulf':       ["l..l..l", "bl.bl.b", ".bl.bl.", ".db.db.", "..d..d.", "...d..d", "......."],          # 늑대 발톱 자국
 'aidan':     ["..ddd..", "...l...", "..blb..", ".bhllb.", "bbllbbb", "bbbbbbb", ".bdddb."],          # 플라스크
 'rosalind':  ["...h...", "..hlh..", "...l...", "hllllll", "...l...", "...b...", "...b..."],          # 성화 십자
 'verona':    ["...h...", "..hl...", "..lbl..", ".lbbl..", ".bbbbl.", "bbdbbb.", ".bddb.."],          # 불꽃
 # ── 레어 블루 ──
 'kristin':   ["...h...", "..hl...", "..lbl..", ".lbbd..", ".bbbd..", "..bd...", "...d..."],          # 얼음 조각
 'haakon':    ["l..l..l", "b..b..b", "bbbbbbb", "...b...", "...b...", "...d...", "...d..."],          # 삼지창
 'eleanor':   ["d......", "dllllb.", "dlhhlb.", "dllllb.", "dbbbd..", "d......", "d......"],          # 깃발
 'theodore':  ["..lll..", ".lhhll.", "lhlllll", "bbbbbbb", ".b.b.b.", ".b.d.b.", "..d.d.."],          # 해파리
 'asta':      ["...d...", "..lll..", ".lhllb.", ".llllb.", "lllllbb", "dbbbbbd", "...h..."],          # 별방울
 'winston':   ["...l...", "..lhl..", "...l...", ".bbbbb.", "...b...", "b..b..b", ".bbbbb."],          # 닻
 'adel':      ["...h...", "..hlh..", ".hlllh.", "..lbl..", "...b...", "...b...", "...d..."],          # 창끝
 # ── 레어 그린 ──
 'elias':     ["....hl.", "...hlb.", "..hlbb.", ".hlbbd.", ".lbbd..", ".bdd...", "d......"],          # 잎
 'rowena':    [".l...l.", "lhl.lhl", "lbllblb", ".lllll.", ".bllb..", "..bbd..", "...d..."],          # 부엉이 얼굴
 'atle':      [".l.l.l.", ".b.b.b.", "...h...", ".hlllh.", "hlllllh", "llllllb", ".bbbbd."],          # 곰 발바닥
 'gwen':      ["....hll", "....l.l", "....l..", "....l..", ".lll...", "lhhll..", ".lll..."],          # 음표
 'ivar':      ["...h...", "...l...", "...l...", "...l...", ".ddbdd.", "...d...", "...d..."],          # 단검
 'celeste':   [".llll..", "l....l.", "l.hh..l", "l.h.l.l", ".l..l.l", "..ll..l", ".....l."],          # 소용돌이 바람
 'thorn':     ["..h....", "..lb...", "h.bbl..", "lbbdbbh", "..dbbl.", "..bl...", "..d...."],          # 가시
 # ── 유니크 레드 ──
 'ragnar':    ["..hhh..", ".hllla.", "hlllla.", "hlllddd", ".aal.d.", "....d..", "....d.."],          # 불꽃 도끼
 'isolde':    ["a..a..a", ".a.h.a.", "..hlh..", "ahlllha", "..hlh..", ".a.h.a.", "a..a..a"],          # 태양
 'bjorn':     ["......a", "....aha", "..ahll.", ".ahlbb.", "ahlbb..", "hlbd...", "lbd...."],          # 불새 날개
 'brynhild':  ["h.....h", "lh...hl", "blh.hlb", ".blalb.", "..bab..", "...a...", "...d..."],          # 발키리 날개
 # ── 유니크 블루 ──
 'arthur':    ["...h...", "..hah..", "...h...", "...l...", ".aalaa.", "...b...", "...d..."],          # 성검
 'solveig':   ["...h...", ".h.l.h.", "..lal..", "hlaaalh", "..lal..", ".h.l.h.", "...h..."],          # 눈꽃
 'william':   ["...hh..", "..hlla.", ".hl..la", "hl.....", "lbb....", "bbbbbbb", "ddddddd"],          # 파도
 'vivian':    ["...h...", "..hah..", ".hlllh.", "hlllllh", ".lllll.", "..lll..", "...b..."],          # 물방울 보석
 'serena':    ["a.a.a.a", "lalalal", "lllllll", "lhhhhhl", "bbbbbbb", "......."],                    # 얼음 왕관
 # ── 유니크 그린 ──
 'halvard':   ["..lll..", ".lhlll.", "lllllll", ".lllll.", "...b...", "..abb..", ".bd.db."],          # 세계수
 'freydis':   ["..l.l..", ".lhlhl.", "l.lal.l", ".hlalh.", "l.lal.l", ".lhlhl.", "..l.l.."],          # 꽃
 'richard':   ["a.....a", ".a...a.", "..lhl..", "llhahll", "..lhl..", ".a...a.", "a.....a"],          # 황금 화살촉 + 십자 조준
 'oberon':    ["hl...lh", "lal.lal", "llaball", ".lbbbl.", "lal.lal", "hl...lh", "......."],          # 나비
}
UNIQUE_ACCENT = {   # 유니크 6번째 색 (강조)
 'ragnar': '#ffe066', 'isolde': '#ffffff', 'bjorn': '#ffe066', 'brynhild': '#ffffff',
 'arthur': '#ffe066', 'solveig': '#ffffff', 'william': '#ffffff', 'vivian': '#e0c0ff', 'serena': '#ffffff',
 'halvard': '#ffe066', 'freydis': '#ff9ab0', 'richard': '#ffd23a', 'oberon': '#ffb0f0'}
