// 배경 장식 (2026-11-21): 지역마다 필드 바깥 땅에 놓는 움직이는 그림. 몬스터·용병 아래, 배경 위.
// x, y = 게임 좌표의 밑동(그림 manifest pivotX·pivotY) 자리 · phase = 애니메이션 시작 위치(0~1, 나무끼리 박자가 겹치지 않게)
// 세로 화면만 (가로 배치는 꺼 둠). 몬스터 길(필드 바깥 y 250~710)·HUD 를 가리지 않는 곳에.
export const DECOR = {
  grass: [
    // 위: HUD 카드 아래 ~ 몬스터 길 위
    { key: 'deco_tree', x: 26, y: 262, phase: 0 },
    { key: 'deco_tree', x: 520, y: 258, phase: 0.45 },
    // 아래: 밑동은 아이템 띠 뒤 — 나무 위쪽 절반이 띠 위로 보인다 (몬스터 길 바깥 가장자리를 조금 덮지만 몬스터보다 아래 층)
    { key: 'deco_tree', x: 30, y: 756, phase: 0.7 },
    { key: 'deco_tree', x: 150, y: 762, phase: 0.2 },
    { key: 'deco_tree', x: 272, y: 766, phase: 0.55 },
    { key: 'deco_tree', x: 394, y: 760, phase: 0.85 },
    { key: 'deco_tree', x: 514, y: 754, phase: 0.33 }
  ]
};
