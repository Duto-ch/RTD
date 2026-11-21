// 배경 장식 (2026-11-21): 지역마다 필드 바깥 땅에 놓는 움직이는 그림. 몬스터·용병 아래, 배경 위.
// x, y = 게임 좌표의 밑동(그림 manifest pivotX·pivotY) 자리 · phase = 애니메이션 시작 위치(0~1, 나무끼리 박자가 겹치지 않게)
// 세로 화면만 (가로 배치는 꺼 둠). 필드·몬스터 길만 피해 화면 전체(UI 뒤 포함)에 흩뿌린다.
export const DECOR = {
  grass: [
    // 화면 전체(UI 뒤 땅 포함)에 흩뿌린 나무 — docs/drafts/tree-sway/scatter.py 가 쓴다 (손으로 고치면 다음 실행에 덮인다)
    { key: 'deco_tree', x: 51, y: 81, phase: 0.5, flip: true },
    { key: 'deco_tree_teal', x: 416, y: 86, phase: 0.18, flip: true },
    { key: 'deco_tree', x: 531, y: 125, phase: 0.11 },
    { key: 'deco_tree_spring', x: 59, y: 140, phase: 0.8 },
    { key: 'deco_tree_teal', x: -1, y: 144, phase: 0.59 },
    { key: 'deco_tree_teal', x: 307, y: 149, phase: 0.89, flip: true },
    { key: 'deco_tree_spring', x: 424, y: 151, phase: 0.3, flip: true },
    { key: 'deco_tree_spring', x: 549, y: 186, phase: 0.41 },
    { key: 'deco_tree', x: 403, y: 198, phase: 0.21 },
    { key: 'deco_tree_teal', x: 478, y: 198, phase: 0.48, flip: true },
    { key: 'deco_tree_spring', x: 113, y: 205, phase: 0.06, flip: true },
    { key: 'deco_tree', x: 197, y: 206, phase: 0.1, flip: true },
    { key: 'deco_tree_spring', x: 448, y: 249, phase: 0.95 },
    { key: 'deco_tree_spring', x: 234, y: 260, phase: 0.12, flip: true },
    { key: 'deco_tree_teal', x: 138, y: 265, phase: 0.49, flip: true },
    { key: 'deco_tree', x: 538, y: 274, phase: 0.63 },
    { key: 'deco_tree_teal', x: 548, y: 353, phase: 0.39, flip: true },
    { key: 'deco_tree_teal', x: 16, y: 415, phase: 0.99, flip: true },
    { key: 'deco_tree', x: 14, y: 557, phase: 0.61, flip: true },
    { key: 'deco_tree', x: 506, y: 775, phase: 0.4, flip: true },
    { key: 'deco_tree_spring', x: 165, y: 782, phase: 0.42, flip: true },
    { key: 'deco_tree_teal', x: 66, y: 786, phase: 0.7 },
    { key: 'deco_tree_teal', x: 280, y: 807, phase: 0.1 },
    { key: 'deco_tree_teal', x: 436, y: 838, phase: 0.84, flip: true },
    { key: 'deco_tree', x: 193, y: 852, phase: 0.59 },
    { key: 'deco_tree', x: 53, y: 868, phase: 0.01, flip: true },
    { key: 'deco_tree_spring', x: 516, y: 868, phase: 0.52, flip: true },
    { key: 'deco_tree_spring', x: 327, y: 873, phase: 0.99 },
    { key: 'deco_tree', x: 417, y: 884, phase: 0.06 },
    { key: 'deco_tree_spring', x: 204, y: 902, phase: 0.99 },
    { key: 'deco_tree_teal', x: 86, y: 910, phase: 0.86 },
    { key: 'deco_tree', x: 285, y: 923, phase: 0.85 },
    { key: 'deco_tree_spring', x: 27, y: 929, phase: 0.7 },
    { key: 'deco_tree', x: 160, y: 929, phase: 0.34 },
    { key: 'deco_tree_teal', x: 347, y: 935, phase: 0.45, flip: true },
    { key: 'deco_tree_teal', x: 237, y: 945, phase: 0.43, flip: true },
    { key: 'deco_tree', x: 73, y: 958, phase: 0.95 },
    { key: 'deco_tree_teal', x: 415, y: 976, phase: 0.92, flip: true },
    { key: 'deco_tree_teal', x: 9, y: 980, phase: 0.2, flip: true },
    { key: 'deco_tree', x: 530, y: 981, phase: 0.62, flip: true }
  ]
};
