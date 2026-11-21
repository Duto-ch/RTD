/**
 * 성벽 동서남북 가운데 성문 시안 (2026-11-21)
 * field_wall 텍스처(src/art/textures.js paintWall) 위에 덧그린다. 성벽 두께 안(10도트)에만 그려 몬스터 길·석판을 가리지 않는다.
 * 모양 (위쪽 성문 기준, 가로 36도트): 둥근 탑 11 + 나무 두짝 문 14 + 둥근 탑 11
 *   - 탑: 외곽선 + 성가퀴 고리 10칸(돌출 밝음·틈 어두움) + 낮은 안쪽 바닥 + 깃발(성문마다 색: 북 빨강·동 파랑·남 초록·서 금)
 *   - 문: 문짝(나무 2톤 + 이음선) · 가운데 갈라진 선 · 쇠띠 2줄 + 징 · 금 문고리 2개 · 바깥쪽 아치 아래 어둠
 *   - 빛은 왼쪽 위: 탑 고리는 왼쪽 위 밝게 · 오른쪽 아래 어둡게, 탑 오른쪽·아래 1도트 그림자
 * 실제 적용 시 paintWall 끝에서 paintGates(ctx, S) 를 부르면 된다.
 */
export function paintGates(ctx, S) {
  const SZ = S - 1; // 성벽 바깥 둘레 상자 [0, SZ)
  const c = SZ / 2 + 0.5; // 변 가운데 (t = 0 이 오른쪽 반의 첫 칸)
  const img = ctx.getImageData(0, 0, S, S);
  const d = img.data;
  const get = (x, y) => { const i = (y * S + x) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
  const set = (x, y, v, a = 255) => {
    if (x < 0 || y < 0 || x >= S || y >= S) return;
    const rgb = typeof v === 'string' ? [1, 3, 5].map((k) => parseInt(v.slice(k, k + 2), 16)) : v;
    const i = (y * S + x) * 4;
    [d[i], d[i + 1], d[i + 2], d[i + 3]] = [rgb[0], rgb[1], rgb[2], a];
  };
  const mul = (x, y, k) => { const p = get(x, y); if (p[3]) set(x, y, [p[0] * k, p[1] * k, p[2] * k].map(Math.round), p[3]); };

  const OUT = '#2e3038';
  const TD = 11, DW = 14, W = TD * 2 + DW, DEPTH = 11; // 둥근 탑 지름 · 문 폭 · 성문 전체 폭 · 성벽 두께(외곽선 포함)
  const FLAGS = { top: ['#d8434a', '#ff8a8f'], right: ['#3a6fd8', '#8ab4ff'], bottom: ['#3fae4a', '#9ae68a'], left: ['#e0a020', '#ffe07a'] };
  const SIDES = { // 변마다 (t: 변을 따라 0..W-1, dd: 바깥 0 → 안쪽 10) → 세계 좌표
    top: (t, dd) => [Math.floor(c) - W / 2 + t, dd],
    bottom: (t, dd) => [Math.floor(c) - W / 2 + t, SZ - 1 - dd],
    left: (t, dd) => [dd, Math.floor(c) - W / 2 + t],
    right: (t, dd) => [SZ - 1 - dd, Math.floor(c) - W / 2 + t]
  };
  for (const [side, at] of Object.entries(SIDES)) {
    // ── 문 (가운데 DW 칸): 문짝 이음선 · 가운데 갈라진 선 · 쇠띠 2줄 + 징 · 금 문고리 · 바깥 문턱 그늘 ──
    const towerPx = new Set();
    for (let dd = 0; dd < DEPTH; dd++) {
      for (let t = TD; t < TD + DW; t++) {
        const [x, y] = at(t, dd);
        const u = t - TD; // 0..13
        let col = Math.floor(u / 3.5) % 2 ? '#8a5530' : '#9e6638';
        if (u === 3 || u === 10) col = '#6b3f1f';
        if (u === 6) col = '#4a2a14'; // 두 짝 사이
        if (u === 0 || u === DW - 1) col = '#5a3418'; // 문틀 그늘
        if (dd === 3 || dd === 8) col = u % 3 === 1 ? '#d4dbe6' : '#5a6070'; // 쇠띠 + 징
        if (dd === 5 && (u === 4 || u === 9)) col = '#f5c542'; // 문고리
        if (dd === 1 || dd === 2) col = dd === 1 ? '#2a1a10' : '#3a2414'; // 바깥 아치 아래 어둠
        if (dd === 0) col = OUT;
        set(x, y, col);
      }
    }
    // ── 둥근 탑 2개 (지름 11, 성벽 두께를 꽉 채움): 외곽선 → 성가퀴 고리(돌출·틈) → 안쪽 바닥 + 깃발 ──
    [0, TD + DW].forEach((t0, k) => {
      const [ax, ay] = at(t0, 0), [bx, by] = at(t0 + TD - 1, DEPTH - 1);
      const cx = (ax + bx) / 2, cy = (ay + by) / 2;
      for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) {
        for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) {
          const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
          if (r > 5.6) continue;
          towerPx.add(x + ',' + y);
          const lit = dx + dy < -1.5, dark = dx + dy > 1.5; // 빛은 왼쪽 위
          if (r > 4.6) { set(x, y, OUT); continue; }
          if (r > 3.2) {
            const seg = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI)) * 10) % 2; // 성가퀴 10칸
            set(x, y, seg ? (lit ? '#e6eaf0' : dark ? '#aab0b9' : '#cdd2da') : (dark ? '#44474f' : '#5a5e67'));
            continue;
          }
          // 안쪽 바닥은 성가퀴보다 낮다: 왼쪽 위 가장자리는 그늘
          const rim = Math.hypot(dx + 1, dy + 1) > 3.2;
          set(x, y, rim ? '#6a6e78' : (Math.abs(dx) + Math.abs(dy) < 1.5 ? '#a3a9b3' : '#959ba5'));
        }
      }
      // 깃발: 탑 가운데 깃대 + 오른쪽으로 날리는 천 (성문마다 색이 다름)
      const mx = Math.round(cx), my = Math.round(cy);
      const [f0, f1] = FLAGS[side];
      set(mx, my + 1, '#2a1a10'); set(mx, my, '#4a2a14'); set(mx, my - 1, '#4a2a14'); set(mx, my - 2, '#f5c542');
      set(mx + 1, my - 1, f1); set(mx + 2, my - 1, f1); set(mx + 3, my - 1, f0);
      set(mx + 1, my, f0); set(mx + 2, my, f0);
      void k;
    });
    // 그림자: 탑의 오른쪽·아래로 1도트 (성벽 돌·문 위에만), 문은 탑보다 낮아 탑 쪽 가장자리가 어둡다
    for (const key of towerPx) {
      const [x, y] = key.split(',').map(Number);
      for (const [sx, sy] of [[x + 1, y], [x, y + 1], [x + 1, y + 1]]) {
        if (!towerPx.has(sx + ',' + sy)) mul(sx, sy, 0.74);
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}
