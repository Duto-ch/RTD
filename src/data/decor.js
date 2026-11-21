// 배경 장식 (2026-11-21): 지역마다 필드 바깥 땅에 놓는 움직이는 그림. 몬스터·용병 아래, 배경 위.
// x, y = 게임 좌표의 밑동(그림 manifest pivotX·pivotY) 자리 · phase = 애니메이션 시작 위치(0~1, 나무끼리 박자가 겹치지 않게)
// 세로 화면만 (가로 배치는 꺼 둠). 몬스터 길(필드 바깥 y 250~710)·HUD 를 가리지 않는 곳에.
export const DECOR = {
  grass: [
    // D 배치 + 무작위 7그루, 색 3가지 (docs/drafts/tree-sway/final_d.py 가 쓴다 — 손으로 고치면 다음 실행에 덮인다)
    { key: 'deco_tree_spring', x: 226, y: 237, phase: 0.31, flip: true },
    { key: 'deco_tree_teal', x: 160, y: 242, phase: 0.72 },
    { key: 'deco_tree', x: 352, y: 247, phase: 0.13, flip: true },
    { key: 'deco_tree', x: 28, y: 252, phase: 0.35 },
    { key: 'deco_tree_spring', x: 87, y: 255, phase: 0.51, flip: true },
    { key: 'deco_tree_teal', x: 534, y: 262, phase: 0.11 },
    { key: 'deco_tree_teal', x: 18, y: 357, phase: 0.69 },
    { key: 'deco_tree_spring', x: 12, y: 439, phase: 0.83, flip: true },
    { key: 'deco_tree', x: 8, y: 497, phase: 0.98 },
    { key: 'deco_tree_spring', x: 530, y: 540, phase: 0.78, flip: true },
    { key: 'deco_tree_spring', x: 10, y: 650, phase: 0.76, flip: true },
    { key: 'deco_tree', x: 524, y: 660, phase: 0.21, flip: true },
    { key: 'deco_tree_teal', x: 300, y: 756, phase: 0.21 },
    { key: 'deco_tree_teal', x: 96, y: 760, phase: 0.74, flip: true },
    { key: 'deco_tree_spring', x: 220, y: 762, phase: 0.58, flip: true },
    { key: 'deco_tree_teal', x: 528, y: 762, phase: 0.62 },
    { key: 'deco_tree_spring', x: 402, y: 770, phase: 0.49, flip: true },
    { key: 'deco_tree', x: 168, y: 772, phase: 0.12 }
  ]
};
