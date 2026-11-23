// 지금 전투 화면을 레이어별 투명 PNG 로 뽑고 PSD 로 묶는다 (2026-11-22 사용자 요청: UI 작업물을 레이어로 나눈 PSD)
// 사용법: npm run build && npx vite preview --port 4173 &  →  node tools/export-psd.cjs [출력 폴더]
//   → <폴더>/layers/*.png + <폴더>/rtd-battle.psd (tools/make-psd.py, pip install psd-tools)
// 화면은 1920x1080 (PC). 게임을 ?transparent=1 로 띄워 캔버스 바탕을 투명하게 하고, 물체를 하나씩 보이게 해서 찍는다.
//  · UI: 낱개(글자·판·칸·아이콘·도형 하나하나)마다 레이어 — 영역(위 바·시너지·아이템·대기석·아래 독 …) 그룹 안에,
//        버튼·상점 카드·배지처럼 묶인 것은 그 안에 다시 그룹
//  · 전장: 땅 · 나무·꽃 · 필드 · 몬스터 · 이펙트는 한 장씩, 용병은 한 명씩
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const OUT = path.resolve(process.argv[2] || 'psd-export');
fs.rmSync(path.join(OUT, 'layers'), { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'layers'), { recursive: true });

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:4173/?transparent=1');
  await p.addStyleTag({ content: 'html,body,#game{background:transparent !important}' });
  await p.waitForFunction(() => window.game?.scene.isActive('Title'));
  await p.evaluate(() => { window.game.scene.stop('Title'); window.game.scene.start('Game'); }); // 타이틀이 뒤에 남지 않게
  await p.waitForFunction(() => window.game.scene.getScene('Game')?.hud);
  // 보기 좋은 판 상태: 영지 Lv7 · 용병 9 + 대기석 · 아이템 · 3웨이브 몬스터
  await p.evaluate(() => {
    const g = window.game.scene.getScene('Game');
    g.gold = 9999;
    for (let i = 0; i < 6; i++) g.levelUpEstate();
    for (let k = 0; k < 3; k++) { for (let i = 0; i < 6; i++) g.buy(i); g.reroll(); }
    g.giveItem('whet'); g.giveItem('feath');
    g.startWave(3);
  });
  await p.waitForTimeout(3500); // 몬스터가 길에 퍼져 있을 때
  await p.evaluate(() => window.game.scene.pause('Game')); // 멈춘 장면도 그려진다 (움직임만 멈춤)
  await p.waitForTimeout(300);

  const count = await p.evaluate(() => {
    const g = window.game.scene.getScene('Game');
    const mons = new Set(g.monsters);
    // 도형(Graphics)은 getBounds 가 없다 → 그리기 명령에서 상자를 구한다 (Phaser graphics/Commands.js)
    const ARGS = { 0: 7, 1: 0, 2: 0, 3: 4, 4: 2, 5: 2, 6: 3, 7: 2, 8: 0, 9: 0, 10: 6, 11: 6, 14: 0, 15: 0, 16: 2, 17: 2, 18: 1, 21: 8, 22: 9 };
    const gfxBounds = (o) => {
      const c = o.commandBuffer;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      const add = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
      for (let i = 0; i < c.length;) {
        const n = ARGS[c[i]];
        if (n === undefined) break;
        const a = c.slice(i + 1, i + 1 + n);
        if (c[i] === 3) { add(a[0], a[1]); add(a[0] + a[2], a[1] + a[3]); }
        else if (c[i] === 4 || c[i] === 5) add(a[0], a[1]);
        else if (c[i] === 0) { add(a[0] - a[2], a[1] - a[2]); add(a[0] + a[2], a[1] + a[2]); }
        else if (c[i] === 10 || c[i] === 11) { add(a[0], a[1]); add(a[2], a[3]); add(a[4], a[5]); }
        i += 1 + n;
      }
      return x0 === Infinity ? null : { left: o.x + x0, top: o.y + y0, right: o.x + x1, bottom: o.y + y1 };
    };
    // 컨테이너는 원점(0,0)까지 상자에 들어가 위치가 틀어진다 → 보이는 자식 상자를 합친다
    const boundsOf = (o, dx = 0, dy = 0) => {
      let r = null;
      if (o.type === 'Container') {
        for (const c of o.list) {
          if (!c.visible) continue;
          const k = c.type === 'Container' || c.commandBuffer ? boundsOf(c, dx + o.x, dy + o.y) : c.getBounds?.();
          if (!k || !(k.right - k.left)) continue;
          r = r ? { left: Math.min(r.left, k.left), top: Math.min(r.top, k.top), right: Math.max(r.right, k.right), bottom: Math.max(r.bottom, k.bottom) } : { left: k.left, top: k.top, right: k.right, bottom: k.bottom };
        }
      } else if (o.commandBuffer) {
        const k = gfxBounds(o);
        r = k && { left: k.left + dx, top: k.top + dy, right: k.right + dx, bottom: k.bottom + dy };
      } else r = o.getBounds?.();
      return r && { ...r, cx: (r.left + r.right) / 2, cy: (r.top + r.bottom) / 2 };
    };
    const isWorld = (o) => !!(o.worldLayer || (o.depth < 100 && !o.uiLayer));
    const area = (o) => {
      if (o.char && o.synMarks) return o.reserved ? ['UI', 'UI · 대기석'] : ['전장', '용병'];
      if (mons.has(o)) return ['전장', '몬스터'];
      if (isWorld(o)) {
        const key = o.texture?.key || '';
        if (key.startsWith('bg_')) return ['전장', '땅'];
        if (key.startsWith('deco_')) return ['전장', '나무·꽃'];
        if (key.startsWith('field') || key.startsWith('gate') || o.depth < 10) return ['전장', '필드(석판·성벽·성문)'];
        return ['전장', '이펙트·표시'];
      }
      const bb = boundsOf(o);
      if (!bb) return ['UI', 'UI · 기타'];
      if (bb.bottom <= 84) return ['UI', 'UI · 위 바'];
      if (bb.top >= 600 || bb.cy >= 610) return ['UI', 'UI · 아래 독(상점·버튼)'];
      if (bb.cx < 360 && bb.cy < 460) return ['UI', 'UI · 시너지'];
      if (bb.cx < 360) return ['UI', 'UI · 아이템'];
      if (bb.cx > 1040 && bb.cy < 300) return ['UI', 'UI · 대기석'];
      return ['UI', 'UI · 알림'];
    };
    // 레이어 이름: HUD·용병이 들고 있는 이름(속성명)을 한글로
    const PROP = {
      ringBack: '받침 고리(뒤)', pips: '받침 고리(앞)·별·아이템', hpBg: '체력 막대 바탕', hpFill: '체력 막대 채움', hpTrail: '체력 막대 피해 자국', hpHeart: '하트',
      rangeGfx: '사거리', hpGfx: '몬스터 체력 막대', upgradeBadge: '느낌표 배지', manaBar: '마나 막대'
    };
    const owner = new Map();
    const scan = (obj) => { for (const [k, v] of Object.entries(obj || {})) if (v && typeof v === 'object' && v.type && PROP[k]) owner.set(v, PROP[k]); };
    scan(g); scan(g.hud);
    for (const m of [...g.mercs, ...g.reserve.filter(Boolean)]) scan(m);
    const short = (t) => (t.length > 18 ? `${t.slice(0, 18)}…` : t).replace(/\n/g, ' ');
    const leafName = (o) => {
      if (o.type === 'Text') return `글자 "${short(o.text)}"`;
      const key = o.texture?.key || '';
      const m = key.match(/^cozy_(\w+?)_(\d+)x(\d+)$/);
      if (m) return `${{ card: '카드 판', strip: '알약 판', soft: '칸', outline: '버튼 판(흰)', primary: '버튼 판(초록)', gold: '버튼 판(금)', danger: '버튼 판(빨강)', ghost: '칸(옅음)', menu: '메뉴 버튼 판', dark: '판', header: '판' }[m[1]] || m[1]} ${m[2]}x${m[3]}`;
      if (key.startsWith('item_')) return `아이템 그림 ${key.slice(5)}`;
      if (key.startsWith('relic_')) return `유물 그림 ${key.slice(6)}`;
      if (key.startsWith('char_') || key.startsWith('merc_')) return `캐릭터 그림 ${key.replace(/^(char|merc)_/, '')}`;
      if (o.layerName) return o.layerName;
      if (owner.has(o)) return owner.get(o);
      if (o.type === 'Graphics') {
        if (o.parentContainer?.tipKey || o.iconName?.startsWith('trait_')) return '배지 원·상징';
        if (o.iconName) return `아이콘 ${o.iconName}`;
        if (o.parentContainer && o.parentContainer.list[0] === o) return '판(바탕)';
        const k = boundsOf(o);
        return k ? `도형 ${Math.round(k.right - k.left)}x${Math.round(k.bottom - k.top)}` : '도형';
      }
      return key || o.type;
    };
    const groupName = (o) => {
      if (o.label && o.bg) return `버튼 "${short(o.label.text || '')}"`;
      const tIcon = o.tipKey || o.list.find((c) => c.iconName?.startsWith('trait_'))?.iconName.slice(6);
      if (tIcon) return `시너지 배지 ${tIcon}`;
      if (o.char) return `용병 ${o.char.name}`;
      const t = o.list.find((c) => c.type === 'Text' && c.text?.trim());
      return t ? `묶음 "${short(t.text)}"` : '묶음';
    };
    // 그리는 순서대로 (카메라: 전장 → UI → 대기석·끄는 용병 → 창, 같은 카메라 안에서는 깊이·목록 순)
    const camRank = (o) => (isWorld(o) ? (o.depth >= 100 ? 2 : 0) : o.depth >= 999 ? 3 : 1);
    const tops = g.children.list.map((o, i) => ({ o, i })).filter(({ o }) => o.visible && o.alpha > 0)
      .sort((a, b) => camRank(a.o) - camRank(b.o) || a.o.depth - b.o.depth || a.i - b.i).map(({ o }) => o);
    // 레이어 목록: { nodes(조상 → 낱개), path(그룹 이름들), name }
    const layers = [];
    const ids = new Map();
    const uid = (o) => { if (!ids.has(o)) ids.set(o, ids.size); return ids.get(o); };
    const visibleLeaf = (o) => o.visible && o.alpha > 0 && !(o.type === 'Text' && !o.text.trim());
    const walk = (o, chain, gpath) => {
      if (o.type === 'Container') {
        const kids = o.list.filter(visibleLeaf);
        if (!kids.length) return;
        const gp = [...gpath, `${groupName(o)}§${uid(o)}`]; // 이름이 같은 묶음(같은 캐릭터 카드 두 장)도 따로
        for (const c of kids) walk(c, [...chain, o], gp);
        return;
      }
      layers.push({ nodes: [...chain, o], path: gpath, name: leafName(o) });
    };
    const whole = {}; // 전장의 '한 장' 레이어: 같은 갈래끼리 한 레이어
    for (const o of tops) {
      const [top, sub] = area(o);
      if (top === '전장' && sub !== '용병') {
        if (!whole[sub]) layers.push((whole[sub] = { nodes: [], path: ['전장'], name: sub, many: true }));
        whole[sub].nodes.push(o);
      } else if (top === '전장') walk(o, [], ['전장', '용병']);
      else walk(o, [], ['UI', sub]);
    }
    // 원래 보이던 상태를 모두 기억해 둔다
    const all = [];
    const remember = (o) => { all.push([o, o.visible]); if (o.type === 'Container') o.list.forEach(remember); };
    g.children.list.forEach(remember);
    window.__psd = { layers, all, g };
    return layers.length;
  });
  console.log('layers', count);

  const shots = [];
  for (let i = 0; i < count; i++) {
    const info = await p.evaluate((i) => {
      const { layers, all, g } = window.__psd;
      const L = layers[i];
      for (const o of g.children.list) o.setVisible(false);
      if (L.many) for (const o of L.nodes) o.setVisible(true);
      else {
        // 조상 → 낱개: 조상은 보이게, 조상의 다른 자식은 숨김
        L.nodes.forEach((o, k) => {
          o.setVisible(true);
          if (o.type === 'Container') { const next = L.nodes[k + 1]; for (const c of o.list) c.setVisible(c === next); }
        });
      }
      return { name: L.name, path: L.path, _restore: all.length };
    }, i);
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const file = path.join(OUT, 'layers', `${String(i).padStart(4, '0')}.png`);
    await p.screenshot({ path: file, omitBackground: true });
    shots.push({ name: info.name, path: info.path, file });
    // 다음 레이어 전에 원래 보이던 상태로 (컨테이너 안 형제를 숨겼던 것 되돌림)
    await p.evaluate(() => { for (const [o, v] of window.__psd.all) o.setVisible(v); });
  }
  await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await p.screenshot({ path: path.join(OUT, 'preview.png') });
  await b.close();
  fs.writeFileSync(path.join(OUT, 'layers.json'), JSON.stringify(shots, null, 1));
  if (errs.length) console.log('page errors', errs);
  execFileSync('python3', [path.join(__dirname, 'make-psd.py'), OUT], { stdio: 'inherit' });
})();
