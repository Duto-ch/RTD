// 기능별 최초 1회 튜토리얼 — 기능을 처음 만나는 순간 전투를 멈추고, 해당 위치를 밝게 비추며 말풍선으로 설명한다.
// 본 단계는 meta(localStorage)에 저장되어 다시 뜨지 않는다. "튜토리얼 끄기"로 전부 끄고, ESC 메뉴에서 다시 켤 수 있다.
// 자동화 브라우저(테스트·밸런스 봇)에서는 꺼져 있다 — 테스트는 localStorage 'rtd_tutorial_test' 로 켠다.
import { GAME_W, GAME_H, WIDE, DEPTH, CELL, FIELD_X, FIELD_Y } from '../config.js';
import { HUD } from './Hud.js';
import { meta } from '../systems/meta.js';
import { panel, uiText, CSS } from './theme.js';
import { Button } from './Button.js';

/** 단계: 제목 · 본문 · 비출 영역(게임 좌표 사각형, 없으면 가운데 말풍선만) */
export const TUTORIAL_STEPS = {
  hire: {
    title: '용병 고용',
    text: '골드로 용병을 고용하면 빈 칸에 랜덤 용병이 배치됩니다.\n몬스터를 처치하면 골드를 얻어요.',
    rect: (s) => btnRect(s.hud.hireBtn)
  },
  wave: {
    title: '웨이브 시작',
    text: '몬스터는 성벽 바깥 길을 따라 돕니다.\n몬스터가 한 바퀴 돌 때마다 성벽 체력이 깎이고, 0이 되면 패배!\n상성: 블루 > 레드 > 그린 > 블루',
    rect: () => (WIDE ? { x: HUD.top.x - 4, y: HUD.top.y - 4, w: HUD.top.w + 8, h: HUD.top.h + 8 } : { x: HUD.top.x - 4, y: HUD.top.y - 20, w: HUD.top.w + 8, h: HUD.top.h + 30 })
  },
  select: {
    title: '용병 정보',
    text: '선택한 용병의 능력치가 여기에 나옵니다.\n「스킬 정보」로 스킬을 보고, 판매는 S 키로도 할 수 있어요.',
    rect: (s) => (s.hud.infoBox ? { x: s.hud.infoBox.px, y: s.hud.infoBox.py, w: s.hud.infoBox.pw, h: s.hud.infoBox.ph } : null)
  },
  merge: {
    title: '머지로 레벨 업',
    text: '같은 속성·같은 등급·같은 레벨 용병을 드래그해서 겹치면\n놓여 있던 쪽이 레벨 업! 레벨마다 정해진 스킬이 열립니다.',
    rect: (s) => {
      const pair = s.mergePair?.();
      return pair ? cellsRect(pair) : null;
    }
  },
  skill: {
    title: '스킬',
    text: '스킬은 쿨타임마다 자동으로 시전됩니다.\n캐릭터마다 레벨별 스킬이 정해져 있어, 레벨을 올리면 하나씩 열려요.',
    rect: () => null
  },
  next: {
    title: '바로 시작',
    text: '필드의 몬스터를 모두 처치하면\n다음 웨이브를 바로 부를 수 있어요. (Space 키)',
    rect: (s) => btnRect(s.hud.nextWaveBtn, 6)
  },
  boss: {
    title: '보스 등장',
    text: '보스는 용병에게 디버프를 걸어요.\n한 바퀴를 돌 때마다 성벽 체력이 크게 깎입니다!',
    rect: (s) => {
      const b = s.monsters?.find((m) => m.isBoss && m.active);
      return b ? { x: b.x - 44, y: b.y - 52, w: 88, h: 88 } : null;
    }
  },
  relic: {
    title: '유물',
    text: '보스를 처치하면 유물을 얻어요. 최대 4개까지 효과가 켜지고,\n아이콘을 눌러 언제든 바꿀 수 있습니다.',
    rect: () => (WIDE ? { x: HUD.relic.x - 4, y: HUD.relic.y - 4, w: HUD.relic.w + 8, h: 44 } : { x: HUD.relic.x - 4, y: HUD.relic.y, w: HUD.relic.w + 8, h: 40 })
  },
  hero: {
    title: '유니크 등장',
    text: '유니크는 고용할 때 1% 확률로만 나오는 최상위 등급이에요.\n대표 스킬을 처음부터 쓰고, 같은 유니크끼리 합치면 더 강해집니다.',
    rect: (s) => {
      const u = s.mercs?.find((m) => m.isHero);
      return u ? cellsRect([u]) : null;
    }
  },
  tower: {
    title: '성탑 · 명성 강화',
    text: '웨이브를 버틸 때마다 명성이 쌓입니다.\n성탑을 누르면 판 도중에도 영구 강화를 찍을 수 있어요.',
    rect: (s) => (s.tower ? { x: s.tower.x - CELL / 2, y: s.tower.y - CELL, w: CELL, h: CELL } : null)
  }
};

function btnRect(b, pad = 4) {
  if (!b) return null;
  return { x: b.x - b.w / 2 - pad, y: b.y - b.h / 2 - pad, w: b.w + pad * 2, h: b.h + pad * 2 };
}

function cellsRect(mercs) {
  const xs = mercs.map((m) => FIELD_X + m.col * CELL);
  const ys = mercs.map((m) => FIELD_Y + m.row * CELL);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x + CELL, h: Math.max(...ys) - y + CELL };
}

/** 자동화 브라우저에서는 끈다 (테스트가 켤 때만 예외) */
function allowed() {
  try {
    if (navigator.webdriver && !localStorage.getItem('rtd_tutorial_test')) return false;
  } catch {
    /* 저장소 없음 */
  }
  return true;
}

export class Tutorial {
  constructor(scene) {
    this.s = scene;
    this.open = null; // 지금 떠 있는 단계 id
    this.queue = [];
    this.layer = null;
    this.enabled = allowed();
  }

  /** 아직 안 본 단계면 띄운다 (다른 단계가 떠 있으면 줄을 세운다) */
  show(id) {
    if (!this.enabled || meta.tutorialOff || meta.tutorialSeen(id) || !TUTORIAL_STEPS[id]) return false;
    if (this.open === id || this.queue.includes(id)) return false;
    if (this.open) {
      this.queue.push(id);
      return true;
    }
    this.render(id);
    return true;
  }

  render(id) {
    const s = this.s;
    const step = TUTORIAL_STEPS[id];
    const r = typeof step.rect === 'function' ? step.rect(s) : step.rect;
    this.open = id;
    s.hud.hideRelicTip?.();
    const depth = DEPTH.overlay + 20;
    const c = s.add.container(0, 0).setDepth(depth);
    this.layer = c;
    // 어둡게 덮고, 비출 영역만 구멍 (4장의 사각형)
    const dim = (x, y, w, h) => w > 0 && h > 0 && c.add(s.add.rectangle(x, y, w, h, 0x120a04, 0.62).setOrigin(0));
    if (r) {
      dim(0, 0, GAME_W, r.y);
      dim(0, r.y + r.h, GAME_W, GAME_H - r.y - r.h);
      dim(0, r.y, r.x, r.h);
      dim(r.x + r.w, r.y, GAME_W - r.x - r.w, r.h);
      const ring = s.add.graphics();
      ring.lineStyle(4, 0xffc84d, 1).strokeRect(r.x, r.y, r.w, r.h);
      c.add(ring);
      s.tweens.add({ targets: ring, alpha: 0.35, duration: 500, yoyo: true, repeat: -1 });
    } else dim(0, 0, GAME_W, GAME_H);
    // 아래 화면을 누르지 못하게 막는 투명 판
    c.add(s.add.zone(0, 0, GAME_W, GAME_H).setOrigin(0).setInteractive());

    // 말풍선: 세로 화면은 비춘 영역의 위·아래 중 넓은 쪽, 가로 화면은 양옆 HUD 를 비추면 그 옆(가운데 쪽)
    const w = WIDE ? 480 : GAME_W - 48;
    const title = uiText(s, 0, 0, step.title, 22, CSS.primary, 'bold');
    const body = uiText(s, 0, 0, step.text, 16.5, CSS.ink, '600', { wordWrap: { width: w - 40 }, lineSpacing: 6 });
    const h = 24 + title.height + 10 + body.height + 24 + 44 + 18;
    let y = GAME_H / 2 - h / 2;
    let x = (GAME_W - w) / 2;
    const cx = r ? r.x + r.w / 2 : GAME_W / 2;
    if (r && WIDE && (cx < GAME_W / 3 || cx > (GAME_W * 2) / 3)) {
      x = cx < GAME_W / 3 ? r.x + r.w + 16 : r.x - w - 16;
      y = Math.max(12, Math.min(GAME_H - h - 12, r.y + r.h / 2 - h / 2));
    } else if (r) y = r.y + r.h / 2 > GAME_H / 2 ? Math.max(12, r.y - h - 14) : Math.min(GAME_H - h - 12, r.y + r.h + 14);
    c.add(panel(s, x, y, w, h, 'card'));
    title.setPosition(x + 20, y + 22);
    body.setPosition(x + 20, y + 22 + title.height + 10);
    c.add([title, body]);
    const by = y + h - 18 - 22;
    const ok = new Button(s, x + w - 84, by, 132, 40, '확인', () => this.close(), { variant: 'primary', fontSize: 16.5 });
    const off = new Button(s, x + 96, by, 160, 36, '튜토리얼 끄기', () => this.turnOff(), { variant: 'outline', fontSize: 11 });
    c.add([off, ok]);
    this.okBtn = ok;
    this.offBtn = off;
  }

  close() {
    if (!this.open) return;
    meta.markTutorial(this.open);
    this.layer?.destroy();
    this.layer = null;
    this.open = null;
    const next = this.queue.shift();
    if (next) this.render(next);
  }

  turnOff() {
    meta.setTutorialOff(true);
    this.queue = [];
    this.close();
  }
}
