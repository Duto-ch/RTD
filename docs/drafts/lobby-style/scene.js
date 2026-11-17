// 동화풍 플랫 일러스트 영지 장면 — SVG 문자열 생성기 (시안용, 전부 코드로 그림)
(function () {
  const C = {
    bg: '#0a3336',
    forest: ['#0d4144', '#11504f', '#16625b', '#1c7566', '#258a71'],
    forestHi: ['#2b9a7c', '#3fae88', '#58c096'],
    pine: ['#0b3c46', '#0f4d55', '#156064', '#1c7470'],
    meadow: '#7cc77f', meadow2: '#9ad88d', meadow3: '#5fb072', meadowEdge: '#3f9468',
    path: '#f0e3b6', pathEdge: '#d2bd84',
    water: '#22b4b2', waterHi: '#6fdcd4', waterDeep: '#128e98', foam: '#e3fdf6',
    wheat: '#f2c552', wheat2: '#dfa838', purple: '#8f6dd2', purple2: '#b796ee', crop: '#5db56c', crop2: '#3f9a5c', soil: '#9b7248',
    wood: '#8c5b3a', woodD: '#6b4229', woodL: '#b98250', thatch: '#ecc76a', thatchD: '#cfa246', thatchDD: '#a97d2f',
    wall: '#f4e8cb', wallD: '#d8c59c', stone: '#d3dada', stoneD: '#a7b3b6', stoneDD: '#7e8c92',
    glow: '#ffd98a', red: '#d9603f', redD: '#b0442b', blue: '#3f7fd0', teal: '#35c9bf'
  };
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const f = (n) => Math.round(n * 10) / 10;
  const poly = (pts, fill, extra = '') => `<polygon points="${pts.map((p) => f(p[0]) + ',' + f(p[1])).join(' ')}" fill="${fill}" ${extra}/>`;
  const circ = (x, y, r, fill, extra = '') => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}" ${extra}/>`;
  const ell = (x, y, rx, ry, fill, extra = '') => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}" ${extra}/>`;

  // 부드러운 닫힌 곡선 (Catmull-Rom → 베지어)
  function smooth(pts, closed = true) {
    const n = pts.length; let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
    const get = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
    }
    return d + (closed ? 'Z' : '');
  }
  const stroke = (d, color, w, extra = '') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;

  // ── 나무 ──
  function roundTree(x, y, s, r) {
    const i = Math.floor(r() * 3); const base = C.forest[1 + i], mid = C.forest[2 + i], hi = C.forestHi[i];
    return ell(x, y + s * 0.1, s * 0.95, s * 0.34, 'rgba(3,26,30,.38)') +
      `<rect x="${f(x - s * 0.1)}" y="${f(y - s * 0.5)}" width="${f(s * 0.2)}" height="${f(s * 0.6)}" fill="${C.woodD}"/>` +
      circ(x - s * 0.5, y - s * 0.85, s * 0.6, base) + circ(x + s * 0.5, y - s * 0.9, s * 0.62, base) +
      circ(x, y - s * 1.3, s * 0.8, mid) + circ(x - s * 0.22, y - s * 1.55, s * 0.46, hi, 'opacity=".75"') +
      circ(x - s * 0.34, y - s * 1.7, s * 0.2, C.forestHi[2], 'opacity=".55"');
  }
  function pine(x, y, s, r, dark) {
    const i = dark ? 0 : Math.floor(r() * 2); const a = C.pine[i], b = C.pine[i + 1], c = C.pine[Math.min(3, i + 2)];
    let o = ell(x, y + s * 0.08, s * 0.7, s * 0.26, 'rgba(3,26,30,.38)') + `<rect x="${f(x - s * 0.08)}" y="${f(y - s * 0.4)}" width="${f(s * 0.16)}" height="${f(s * 0.45)}" fill="${C.woodD}"/>`;
    const tiers = [[0.78, 0.3, 1.25], [0.62, 0.95, 1.95], [0.44, 1.6, 2.6]];
    tiers.forEach(([w, y0, y1], k) => {
      const col = [a, b, c][k];
      o += poly([[x - s * w, y - s * y0], [x + s * w, y - s * y0], [x, y - s * y1]], col, `stroke="${col}" stroke-width="${f(s * 0.14)}" stroke-linejoin="round"`);
      o += poly([[x, y - s * y0], [x + s * w, y - s * y0], [x, y - s * y1]], 'rgba(255,255,255,.07)');
    });
    return o;
  }
  function bush(x, y, s) { return ell(x, y + s * 0.2, s, s * 0.3, 'rgba(3,26,30,.3)') + circ(x - s * 0.4, y - s * 0.1, s * 0.5, C.forest[3]) + circ(x + s * 0.4, y - s * 0.15, s * 0.55, C.forest[3]) + circ(x, y - s * 0.4, s * 0.6, C.forest[4]) + circ(x - s * 0.15, y - s * 0.55, s * 0.28, C.forestHi[1], 'opacity=".7"'); }
  function rock(x, y, s) { return ell(x, y + s * 0.15, s * 1.1, s * 0.3, 'rgba(3,26,30,.3)') + poly([[x - s, y], [x - s * 0.6, y - s * 0.8], [x + s * 0.2, y - s], [x + s, y - s * 0.3], [x + s * 0.8, y]], C.stoneD) + poly([[x - s * 0.6, y - s * 0.8], [x + s * 0.2, y - s], [x + s * 0.1, y - s * 0.35], [x - s * 0.5, y - s * 0.3]], C.stone); }
  function flowers(x, y, r, col) { let o = ''; for (let i = 0; i < 5; i++) o += circ(x + (r() - 0.5) * 26, y + (r() - 0.5) * 14, 2.2, col); return o; }

  // ── 아이소메트릭 ──
  function iso(ox, oy, u) { return (X, Y, Z = 0) => [ox + (X - Y) * 0.866 * u, oy + (X + Y) * 0.5 * u - Z * u]; }
  function box(P, x, y, z, w, d, h, cl, cr, ct) { // 보이는 3면
    return poly([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], cl) +
      poly([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], cr) +
      (ct ? poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], ct) : '');
  }
  function shadow(P, w, d, a = 0.3) { return poly([P(-0.3, d * 0.2), P(w + 0.2, -0.2), P(w + 0.9, d + 0.3), P(0.3, d + 0.9)], `rgba(3,26,30,${a})`); }
  /** 박공지붕 집. opt: wall, wallD, roof, roofD, door, win, chimney, glowDoor */
  function house(x, y, u, w, d, h, r, opt = {}) {
    const P = iso(x, y, u); const o = 0.28; const slope = r / (d / 2); const ez = h - o * slope;
    const wall = opt.wall || C.wall, wallD = opt.wallD || C.wallD, roof = opt.roof || C.thatch, roofD = opt.roofD || C.thatchD;
    let s = shadow(P, w, d);
    s += poly([P(-o, -o, ez), P(w + o, -o, ez), P(w + o, d / 2, h + r), P(-o, d / 2, h + r)], opt.roofDD || C.thatchDD);
    s += poly([P(0, d, 0), P(w, d, 0), P(w, d, h), P(0, d, h)], wall);
    s += poly([P(w, 0, 0), P(w, d, 0), P(w, d, h), P(w, d / 2, h + r), P(w, 0, h)], wallD);
    // 나무 뼈대
    s += poly([P(0, d, 0), P(0.12, d, 0), P(0.12, d, h), P(0, d, h)], C.wood) + poly([P(w - 0.12, d, 0), P(w, d, 0), P(w, d, h), P(w - 0.12, d, h)], C.wood);
    if (opt.door !== false) {
      const a = opt.doorAt ?? w * 0.3; const dw = 0.55, dh = h * 0.72;
      s += poly([P(a, d, 0), P(a + dw, d, 0), P(a + dw, d, dh), P(a, d, dh)], opt.glowDoor ? '#ff9d3c' : C.woodD);
      if (opt.glowDoor) s += poly([P(a + 0.1, d, 0), P(a + dw - 0.1, d, 0), P(a + dw - 0.1, d, dh - 0.12), P(a + 0.1, d, dh - 0.12)], '#ffd070');
    }
    if (opt.win !== false) {
      const b = d * 0.3; s += poly([P(w, b, h * 0.35), P(w, b + 0.5, h * 0.35), P(w, b + 0.5, h * 0.8), P(w, b, h * 0.8)], C.glow, `stroke="${C.wood}" stroke-width="${f(u * 0.06)}"`);
      const a2 = (opt.doorAt ?? w * 0.3) + 1.0; if (a2 + 0.45 < w) s += poly([P(a2, d, h * 0.38), P(a2 + 0.45, d, h * 0.38), P(a2 + 0.45, d, h * 0.8), P(a2, d, h * 0.8)], C.glow, `stroke="${C.wood}" stroke-width="${f(u * 0.06)}"`);
    }
    if (opt.chimney) {
      const cx = w * 0.7, cy = d * 0.22, cz = h + r * 0.35;
      s += box(P, cx, cy, cz, 0.36, 0.36, r * 0.95, C.stone, C.stoneD, C.stoneDD);
      const top = P(cx + 0.18, cy + 0.18, cz + r * 0.95);
      for (let i = 0; i < 4; i++) s += circ(top[0] + i * u * 0.12 + Math.sin(i) * 2, top[1] - u * (0.3 + i * 0.42), u * (0.2 + i * 0.07), '#eaf6f2', `opacity="${f(0.55 - i * 0.12)}"`);
    }
    // 앞 지붕면 + 줄무늬 + 처마
    s += poly([P(-o, d + o, ez), P(w + o, d + o, ez), P(w + o, d / 2, h + r), P(-o, d / 2, h + r)], roof);
    for (const t of [0.34, 0.67]) {
      const yy = d + o - (d / 2 + o) * t, zz = ez + (h + r - ez) * t;
      s += `<line x1="${f(P(-o, yy, zz)[0])}" y1="${f(P(-o, yy, zz)[1])}" x2="${f(P(w + o, yy, zz)[0])}" y2="${f(P(w + o, yy, zz)[1])}" stroke="${roofD}" stroke-width="${f(u * 0.07)}" opacity=".8"/>`;
    }
    s += `<line x1="${f(P(-o, d + o, ez)[0])}" y1="${f(P(-o, d + o, ez)[1])}" x2="${f(P(w + o, d + o, ez)[0])}" y2="${f(P(w + o, d + o, ez)[1])}" stroke="${roofD}" stroke-width="${f(u * 0.16)}" stroke-linecap="round"/>`;
    s += poly([P(w + o, d + o, ez), P(w + o, d / 2, h + r), P(w + o - 0.14, d / 2, h + r), P(w + o - 0.14, d + o, ez)], roofD);
    return s;
  }
  function pyramid(P, x, y, z, w, d, r, cl, cr) { const ap = P(x + w / 2, y + d / 2, z + r); return poly([P(x, y + d, z), P(x + w, y + d, z), ap], cl) + poly([P(x + w, y, z), P(x + w, y + d, z), ap], cr); }
  function flag(px, py, u, col, flip) { const k = flip ? -1 : 1; return `<line x1="${f(px)}" y1="${f(py)}" x2="${f(px)}" y2="${f(py - u * 1.3)}" stroke="${C.woodD}" stroke-width="${f(u * 0.08)}"/>` + poly([[px, py - u * 1.3], [px + k * u * 0.7, py - u * 1.1], [px, py - u * 0.85]], col); }

  /** 성탑 — 스킬 노드 */
  function tower(x, y, u) {
    const P = iso(x, y, u); let s = shadow(P, 1.8, 1.8, 0.34);
    s += box(P, -0.2, -0.2, 0, 2.2, 2.2, 0.5, C.stoneD, C.stoneDD, C.stone);
    s += box(P, 0, 0, 0.5, 1.8, 1.8, 3.2, C.stone, C.stoneD, null);
    s += poly([P(0.6, 1.8, 0.5), P(1.2, 1.8, 0.5), P(1.2, 1.8, 1.5), P(0.9, 1.8, 1.75), P(0.6, 1.8, 1.5)], C.woodD);
    s += poly([P(1.8, 0.65, 2.2), P(1.8, 1.15, 2.2), P(1.8, 1.15, 2.9), P(1.8, 0.65, 2.9)], C.glow);
    s += poly([P(0.65, 1.8, 2.3), P(1.15, 1.8, 2.3), P(1.15, 1.8, 3.0), P(0.65, 1.8, 3.0)], C.glow);
    s += box(P, -0.2, -0.2, 3.7, 2.2, 2.2, 0.4, C.stoneD, C.stoneDD, C.stone);
    s += pyramid(P, -0.1, -0.1, 4.1, 2.0, 2.0, 1.7, '#3f8fb0', '#2c6f90');
    const top = P(0.9, 0.9, 6.9);
    s += circ(top[0], top[1], u * 1.5, 'url(#gGlow)') + poly([[top[0], top[1] - u * 0.75], [top[0] + u * 0.42, top[1]], [top[0], top[1] + u * 0.75], [top[0] - u * 0.42, top[1]]], C.teal) + poly([[top[0], top[1] - u * 0.75], [top[0] + u * 0.42, top[1]], [top[0], top[1]]], '#9af3ea');
    return s;
  }
  /** 모집 천막 — 가챠 */
  function tent(x, y, u) {
    const P = iso(x, y, u); let s = shadow(P, 2.6, 2.6, 0.32);
    s += box(P, 0, 0, 0, 2.6, 2.6, 1.0, '#f6ead0', '#dcc9a0', null);
    s += poly([P(0.9, 2.6, 0), P(1.7, 2.6, 0), P(1.7, 2.6, 0.85), P(1.3, 2.6, 1.0), P(0.9, 2.6, 0.85)], '#5a2f6e');
    // 줄무늬 지붕
    const ap = P(1.3, 1.3, 3.1); const n = 6;
    for (let i = 0; i < n; i++) { const a = P(-0.25 + (3.1 * i) / n, 2.85, 1.0), b = P(-0.25 + (3.1 * (i + 1)) / n, 2.85, 1.0); s += poly([a, b, ap], i % 2 ? '#f6ead0' : C.red); }
    for (let i = 0; i < n; i++) { const a = P(2.85, 2.85 - (3.1 * i) / n, 1.0), b = P(2.85, 2.85 - (3.1 * (i + 1)) / n, 1.0); s += poly([a, b, ap], i % 2 ? '#dcc9a0' : C.redD); }
    s += flag(ap[0], ap[1] + 2, u, '#ffd34d');
    // 모집 게시판
    const B = iso(x + u * 2.9, y + u * 2.3, u);
    s += box(B, 0, 0, 0, 0.1, 0.1, 1.1, C.wood, C.woodD) + box(B, 0.9, 0, 0, 0.1, 0.1, 1.1, C.wood, C.woodD) + poly([B(0, 0.1, 0.45), B(1.0, 0.1, 0.45), B(1.0, 0.1, 1.2), B(0, 0.1, 1.2)], C.woodL) + poly([B(0.12, 0.1, 0.6), B(0.45, 0.1, 0.6), B(0.45, 0.1, 1.05), B(0.12, 0.1, 1.05)], '#fff6dc') + poly([B(0.55, 0.1, 0.65), B(0.88, 0.1, 0.65), B(0.88, 0.1, 1.1), B(0.55, 0.1, 1.1)], '#fff6dc');
    return s;
  }
  /** 병영 — 덱 편성 */
  function barracks(x, y, u) {
    let s = house(x, y, u, 3.6, 2.0, 1.25, 1.15, { roof: '#6fa8c9', roofD: '#4f86a8', roofDD: '#3a6a8a', doorAt: 1.4 });
    const P = iso(x, y, u); const a = P(0.2, 2.0, 1.25), b = P(3.4, 2.0, 1.25);
    s += flag(a[0], a[1], u, C.red) + flag(b[0], b[1], u, C.blue, true);
    // 훈련 허수아비·무기 걸이
    const D = iso(x - u * 1.5, y + u * 2.4, u);
    s += box(D, 0, 0, 0, 0.12, 0.12, 1.2, C.wood, C.woodD) + `<line x1="${f(D(-0.35, 0.06, 0.85)[0])}" y1="${f(D(-0.35, 0.06, 0.85)[1])}" x2="${f(D(0.5, 0.06, 0.85)[0])}" y2="${f(D(0.5, 0.06, 0.85)[1])}" stroke="${C.wood}" stroke-width="${f(u * 0.12)}" stroke-linecap="round"/>` + circ(D(0.06, 0.06, 1.35)[0], D(0.06, 0.06, 1.35)[1], u * 0.24, C.thatch);
    return s;
  }
  /** 대장간 — 장비 */
  function forge(x, y, u) {
    let s = house(x, y, u, 2.6, 2.2, 1.2, 1.0, { wall: C.stone, wallD: C.stoneD, roof: '#b9764a', roofD: '#935532', roofDD: '#6f3d22', chimney: true, glowDoor: true, doorAt: 0.5 });
    const A = iso(x - u * 0.9, y + u * 2.6, u);
    s += box(A, 0, 0, 0, 0.5, 0.35, 0.3, C.woodD, '#4f2f1c', C.wood) + box(A, -0.12, -0.05, 0.3, 0.74, 0.45, 0.22, '#7e8c92', '#5f6d73', '#a7b3b6');
    return s;
  }
  /** 성문 — 출전 */
  function gate(x, y, u) {
    const P = iso(x, y, u); let s = shadow(P, 4.2, 1.2, 0.34);
    s += box(P, 0, 0, 0, 1.1, 1.1, 2.6, C.stone, C.stoneD, C.stoneDD) + pyramid(P, -0.12, -0.12, 2.6, 1.34, 1.34, 1.0, C.red, C.redD);
    s += box(P, 1.1, 0.2, 1.7, 2.0, 0.7, 0.7, C.stone, C.stoneD, '#e6ecec');
    s += poly([P(1.1, 0.9, 0), P(3.1, 0.9, 0), P(3.1, 0.9, 1.7), P(1.1, 0.9, 1.7)], '#123f43') + poly([P(1.3, 0.9, 0), P(2.9, 0.9, 0), P(2.9, 0.9, 1.25), P(2.1, 0.9, 1.6), P(1.3, 0.9, 1.25)], '#f0e3b6', 'opacity=".9"');
    s += box(P, 3.1, 0, 0, 1.1, 1.1, 2.6, C.stone, C.stoneD, C.stoneDD) + pyramid(P, 2.98, -0.12, 2.6, 1.34, 1.34, 1.0, C.red, C.redD);
    const a = P(0.55, 0.55, 3.6), b = P(3.65, 0.55, 3.6); s += flag(a[0], a[1] + 2, u, '#ffd34d') + flag(b[0], b[1] + 2, u, '#ffd34d');
    return s;
  }
  function field(x, y, u, w, d, c1, c2, kind) {
    const P = iso(x, y, u); let s = poly([P(-0.15, -0.15), P(w + 0.15, -0.15), P(w + 0.15, d + 0.15), P(-0.15, d + 0.15)], C.soil) + poly([P(0, 0), P(w, 0), P(w, d), P(0, d)], c1);
    const n = Math.round(d / 0.45);
    for (let i = 1; i < n; i++) { const yy = (d * i) / n; const a = P(0, yy), b = P(w, yy); s += `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="${c2}" stroke-width="${f(u * (kind === 'dots' ? 0.2 : 0.09))}" ${kind === 'dots' ? `stroke-dasharray="${f(u * 0.05)} ${f(u * 0.42)}" stroke-linecap="round"` : ''}/>`; }
    return s;
  }
  function haystack(x, y, s) { return ell(x, y + s * 0.2, s * 1.1, s * 0.32, 'rgba(3,26,30,.3)') + `<path d="M${f(x - s)},${f(y)} Q${f(x - s)},${f(y - s * 1.5)} ${f(x)},${f(y - s * 1.6)} Q${f(x + s)},${f(y - s * 1.5)} ${f(x + s)},${f(y)} Z" fill="${C.wheat}"/>` + `<path d="M${f(x)},${f(y - s * 1.6)} Q${f(x + s)},${f(y - s * 1.5)} ${f(x + s)},${f(y)} L${f(x)},${f(y)} Z" fill="${C.wheat2}"/>`; }
  function campfire(x, y, s) { return ell(x, y, s * 1.3, s * 0.5, '#6b5a48') + circ(x, y - s * 0.6, s * 2.6, 'url(#gFire)') + `<path d="M${f(x - s * 0.5)},${f(y)} Q${f(x - s * 0.7)},${f(y - s)} ${f(x)},${f(y - s * 1.9)} Q${f(x + s * 0.7)},${f(y - s)} ${f(x + s * 0.5)},${f(y)} Z" fill="#ff9d3c"/>` + `<path d="M${f(x - s * 0.25)},${f(y)} Q${f(x - s * 0.35)},${f(y - s * 0.6)} ${f(x)},${f(y - s * 1.1)} Q${f(x + s * 0.35)},${f(y - s * 0.6)} ${f(x + s * 0.25)},${f(y)} Z" fill="#ffe08a"/>`; }

  /**
   * 장면 만들기
   * cfg: { W, H, seed, meadow:{cx,cy,rx,ry}, river:[[x,y]...], riverW, paths:[[[x,y]...]], items:[{t,x,y,u,...}], fg:true, treeGap }
   */
  function scene(cfg) {
    const { W, H } = cfg; const r = rng(cfg.seed || 7); const m = cfg.meadow;
    const mr = (th) => 1 + 0.1 * Math.sin(3 * th + 1.3) + 0.07 * Math.sin(5 * th + 0.4) + 0.04 * Math.sin(8 * th);
    const mpts = []; for (let i = 0; i < 28; i++) { const th = (i / 28) * Math.PI * 2; mpts.push([m.cx + Math.cos(th) * m.rx * mr(th), m.cy + Math.sin(th) * m.ry * mr(th)]); }
    const inMeadow = (x, y, pad = 0) => { const dx = (x - m.cx) / (m.rx + pad), dy = (y - m.cy) / (m.ry + pad); const th = Math.atan2(dy, dx); return Math.hypot(dx, dy) < mr(th); };
    const riv = cfg.river || []; const rw = cfg.riverW || 80;
    const nearRiver = (x, y, pad) => { for (let i = 0; i < riv.length - 1; i++) { const [ax, ay] = riv[i], [bx, by] = riv[i + 1]; const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2))); if (Math.hypot(x - ax - t * (bx - ax), y - ay - t * (by - ay)) < rw / 2 + pad) return true; } return false; };
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice">`;
    s += `<defs><radialGradient id="gBg" cx="50%" cy="42%" r="75%"><stop offset="0" stop-color="#14605a"/><stop offset="1" stop-color="${C.bg}"/></radialGradient>` +
      `<radialGradient id="gGlow"><stop offset="0" stop-color="#b9fff6" stop-opacity=".85"/><stop offset="1" stop-color="#35c9bf" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="gFire"><stop offset="0" stop-color="#ffcf6a" stop-opacity=".7"/><stop offset="1" stop-color="#ff9d3c" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="gVig" cx="50%" cy="46%" r="72%"><stop offset=".55" stop-color="#04191c" stop-opacity="0"/><stop offset="1" stop-color="#04191c" stop-opacity=".6"/></radialGradient>` +
      `<linearGradient id="gSun" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff7c9" stop-opacity=".22"/><stop offset=".6" stop-color="#fff7c9" stop-opacity="0"/></linearGradient></defs>`;
    s += `<rect width="${W}" height="${H}" fill="url(#gBg)"/>`;
    // 초원
    const md = smooth(mpts);
    s += `<path d="${md}" fill="${C.meadowEdge}" transform="translate(0,10)"/><path d="${md}" fill="${C.meadow}"/>`;
    for (let i = 0; i < 9; i++) { const th = r() * 6.28, q = Math.sqrt(r()) * 0.7; const x = m.cx + Math.cos(th) * m.rx * q, y = m.cy + Math.sin(th) * m.ry * q; s += ell(x, y, 40 + r() * 70, 16 + r() * 22, i % 2 ? C.meadow2 : C.meadow3, 'opacity=".55"'); }
    // 강
    if (riv.length) {
      const d = smooth(riv, false);
      s += stroke(d, C.meadowEdge, rw + 22) + stroke(d, C.waterDeep, rw + 6) + stroke(d, C.water, rw - 6) + stroke(d, C.waterHi, rw * 0.3, `opacity=".5" stroke-dasharray="60 46"`) + stroke(d, C.foam, 3, `opacity=".7" stroke-dasharray="18 70" transform="translate(${f(rw * 0.24)},4)"`);
    }
    if (cfg.fall) { const [fx, fy, fw, fh] = cfg.fall; s += poly([[fx - fw, fy - 20], [fx + fw * 2, fy - 30], [fx + fw * 2.2, fy + fh * 0.7], [fx - fw * 1.2, fy + fh * 0.8]], C.stoneDD) + poly([[fx - fw * 0.9, fy - 10], [fx + fw * 0.2, fy - 24], [fx + fw * 0.1, fy + fh * 0.6], [fx - fw, fy + fh * 0.7]], C.stoneD) + `<rect x="${f(fx)}" y="${f(fy - 30)}" width="${f(fw)}" height="${f(fh + 30)}" fill="${C.water}"/>`; for (let i = 0; i < 5; i++) s += `<rect x="${f(fx + (fw * (i + 0.3)) / 5)}" y="${f(fy - 30 + r() * 20)}" width="${f(fw / 14)}" height="${f(fh * (0.6 + r() * 0.4))}" rx="2" fill="${C.foam}" opacity=".75"/>`; s += ell(fx + fw / 2, fy + fh, fw * 0.9, 14, C.foam, 'opacity=".85"'); }
    // 길
    for (const p of cfg.paths || []) { const d = smooth(p, false); s += stroke(d, C.pathEdge, 34, 'transform="translate(0,4)"') + stroke(d, C.path, 30); }
    // 물체 (y 순서)
    const objs = [];
    const gap = cfg.treeGap || 46;
    for (let gy = -20; gy < H + 60; gy += gap * 0.8) for (let gx = -20; gx < W + 40; gx += gap) {
      const x = gx + (r() - 0.5) * gap * 0.9, y = gy + (r() - 0.5) * gap * 0.7;
      if (inMeadow(x, y, 6) || nearRiver(x, y, 14)) continue;
      if ((cfg.clear || []).some(([cx, cy, cr]) => Math.hypot(x - cx, y - cy) < cr)) continue;
      const edge = inMeadow(x, y, 70); const sz = (edge ? 15 : 19) + r() * 9;
      objs.push({ y, s: r() < (edge ? 0.35 : 0.55) ? pine(x, y, sz, r) : roundTree(x, y, sz, r) });
    }
    for (const it of cfg.items || []) {
      const { t, x, y, u = 22 } = it; let g = '';
      if (t === 'house') g = house(x, y, u, it.w || 2.6, it.d || 2.0, it.h || 1.2, it.r || 1.1, it.opt || {});
      else if (t === 'tower') g = tower(x, y, u); else if (t === 'tent') g = tent(x, y, u); else if (t === 'barracks') g = barracks(x, y, u);
      else if (t === 'forge') g = forge(x, y, u); else if (t === 'gate') g = gate(x, y, u);
      else if (t === 'wheat') g = field(x, y, u, it.w, it.d, C.wheat, C.wheat2); else if (t === 'purple') g = field(x, y, u, it.w, it.d, C.crop2, C.purple2, 'dots'); else if (t === 'crop') g = field(x, y, u, it.w, it.d, C.crop, C.crop2);
      else if (t === 'hay') g = haystack(x, y, it.s || 12); else if (t === 'bush') g = bush(x, y, it.s || 12); else if (t === 'rock') g = rock(x, y, it.s || 12);
      else if (t === 'tree') g = roundTree(x, y, it.s || 18, r); else if (t === 'pine') g = pine(x, y, it.s || 18, r); else if (t === 'fire') g = campfire(x, y, it.s || 9);
      else if (t === 'flowers') g = flowers(x, y, r, it.c || '#fff3c4');
      objs.push({ y: it.sortY ?? (['wheat', 'purple', 'crop', 'flowers'].includes(t) ? y - 40 : y + (it.dy ?? u * 1.2)), s: g });
    }
    objs.sort((a, b) => a.y - b.y);
    s += objs.map((o) => o.s).join('');
    s += `<rect width="${W}" height="${H}" fill="url(#gSun)"/><rect width="${W}" height="${H}" fill="url(#gVig)"/>`;
    // 앞쪽 어두운 나무 실루엣
    if (cfg.fg !== false) {
      const fgr = rng(99); const dk = (x, y, sz) => { const k = sz; let o = ''; for (const [w, y0, y1] of [[0.78, 0.3, 1.25], [0.62, 0.95, 1.95], [0.44, 1.6, 2.6]]) o += poly([[x - k * w, y - k * y0], [x + k * w, y - k * y0], [x, y - k * y1]], '#062a2e', 'stroke="#062a2e" stroke-width="8" stroke-linejoin="round"'); return o; };
      const list = cfg.fgTrees || [[-10, H + 40, 90], [110, H + 70, 70], [W - 120, H + 60, 80], [W + 10, H + 30, 100], [W - 230, H + 90, 60], [230, H + 100, 55]];
      for (const [x, y, sz] of list) s += dk(x + (fgr() - 0.5) * 10, y, sz);
    }
    return s + '</svg>';
  }
  window.LobbyScene = { scene, C, tower, tent, barracks, forge, gate, house, iso };
})();
