// 지역(배경) — 10웨이브마다 바뀐다. 1~10 초원, 11~20 사막, 21~30 가을숲 …
// ground: [기본, 어두운, 밝은] / path: [기본, 어두운, 밝은, 가장자리] / deco: 장식 종류 / decoColors: 장식 색
export const BIOMES = [
  { id: 'grass', name: '초원', ground: ['#3d7a3a', '#356b33', '#4a8a44'], path: ['#8d6c48', '#7a5c3c', '#a3825a', '#5e4630'], deco: 'flowers', decoColors: ['#e8d86a', '#ffffff', '#ff9ab0'] },
  { id: 'desert', name: '사막', ground: ['#d9b46c', '#c79f58', '#e8c98a'], path: ['#b98a52', '#a07444', '#cfa266', '#8a6238'], deco: 'cactus', decoColors: ['#3f8a3f', '#2f6a2f', '#9a8a70'] },
  { id: 'autumn', name: '가을 숲', ground: ['#b5652c', '#8f4a22', '#d6893a'], path: ['#6e5038', '#5a402c', '#82604a', '#3e2c20'], deco: 'leaves', decoColors: ['#ffcc33', '#e0422a', '#ff8a2a'] },
  { id: 'volcano', name: '화산 지대', ground: ['#3a2a2a', '#2a1d1d', '#4a3434'], path: ['#4d4040', '#3a3030', '#5e5050', '#201818'], deco: 'lava', decoColors: ['#ff6a2a', '#ffb03a', '#c8301a'] },
  { id: 'snow', name: '설원', ground: ['#e8eef5', '#cfdbe8', '#ffffff'], path: ['#b9c6d6', '#a2b2c6', '#d4dee9', '#8494a8'], deco: 'pines', decoColors: ['#2f5a46', '#1f4434', '#ffffff'] },
  { id: 'swamp', name: '늪지대', ground: ['#3f5a3a', '#30472c', '#4f6a44'], path: ['#5a4a32', '#4a3c28', '#6a5a3e', '#30281c'], deco: 'puddles', decoColors: ['#2f4f5f', '#4f7f8f', '#9acd5a'] },
  { id: 'crystal', name: '수정 동굴', ground: ['#2e2a4a', '#221f38', '#3b3660'], path: ['#4a4466', '#3a3554', '#5a5478', '#1a1830'], deco: 'crystals', decoColors: ['#8ad8ff', '#c48aff', '#ffffff'] },
  { id: 'graveyard', name: '망자의 묘지', ground: ['#4a4f45', '#3c4038', '#5a6054'], path: ['#6a6658', '#58554a', '#7c7868', '#3a382f'], deco: 'tombs', decoColors: ['#9a9a94', '#6a6a64', '#c9f0a0'] },
  { id: 'sky', name: '천공의 섬', ground: ['#8fc8ff', '#7ab8f5', '#b0dcff'], path: ['#e8e2d0', '#d4ccb6', '#f6f2e6', '#a89e84'], deco: 'clouds', decoColors: ['#ffffff', '#e6f3ff', '#f2c14e'] },
  { id: 'void', name: '공허의 끝', ground: ['#1a1030', '#120a24', '#24183e'], path: ['#3a2a5a', '#2c2046', '#4a3a6e', '#0c0618'], deco: 'stars', decoColors: ['#c48aff', '#ffffff', '#ff4dd2'] }
];

/** 웨이브 → 지역 (1~10: 0번, 11~20: 1번 …) */
export function biomeForWave(w) {
  return BIOMES[Math.max(0, Math.min(BIOMES.length - 1, Math.floor((Math.max(1, w) - 1) / 10)))];
}
