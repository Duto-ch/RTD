// 기능별 최초 1회 튜토리얼 — 기능을 처음 만나는 순간 전투를 멈추고, 해당 위치를 밝게 비추며 말풍선으로 설명한다.
// 본 단계는 meta(localStorage)에 저장되어 다시 뜨지 않는다. "튜토리얼 끄기"로 전부 끄고, ESC 메뉴에서 다시 켤 수 있다.
// 자동화 브라우저(테스트·밸런스 봇)에서는 꺼져 있다 — 테스트는 localStorage 'rtd_tutorial_test' 로 켠다.
import { audio } from '../systems/audio.js';
import { GAME_W, GAME_H, DEPTH, CELL, FIELD_X, FIELD_Y } from '../config.js';
import { HUD } from './Hud.js';
import { toUi } from '../systems/hires.js';
import { meta } from '../systems/meta.js';
import { panel, uiText, CSS } from './theme.js';
import { Button } from './Button.js';

/** 단계: 제목 · 본문 · 비출 영역(게임 좌표 사각형, 없으면 가운데 말풍선만) */
export const TUTORIAL_STEPS = {
  shop: {
    title: '상점',
    text: '· 누르기 → 구매 · 빈 칸 배치\n· 웨이브 끝 → 새로 채움\n· 리롤 → 즉시 교체',
    rect: () => ({ x: HUD.shop.x - 4, y: HUD.shop.y - 4, w: HUD.shop.w + 8, h: HUD.shop.h + 8 })
  },
  star: {
    title: '별 승급',
    text: '· 같은 용병 3명 → 자동 합체 · 별 +1 (최대 3성)\n· 별 +1 → 능력치·스킬 강화',
    rect: (s) => {
      const u = s.mercs?.find((m) => m.star >= 2);
      return u ? cellsRect([u]) : null;
    }
  },
  estate: {
    title: '영지 레벨',
    text: '· 레벨 업 → 배치 인원 +1 (최대 12명)\n· 레벨 업 → 높은 등급 확률 증가',
    rect: (s) => btnRect(s.hud.estateBtn)
  },
  lock: {
    title: '잠금',
    text: '· 잠근 칸 → 리롤·웨이브 갱신에도 유지\n· 잠근 등급·수만큼 리롤 값 증가',
    rect: () => ({ x: HUD.shop.x - 4, y: HUD.shop.y - 4, w: HUD.shop.w + 8, h: HUD.shop.h + 8 })
  },
  item: {
    title: '아이템 조합',
    text: '· 획득: 정예·보스 처치 · 대장장이 구매\n· 캐릭터에 끌어 놓기 → 장착\n· 같은 캐릭터 재료 2개 → 자동 조합\n· 빼기: 해제 도구',
    rect: () => ({ x: HUD.bench.x - 4, y: HUD.bench.y - 4, w: HUD.bench.w + 8, h: HUD.bench.h + 8 })
  },
  reserve: {
    title: '대기석',
    text: '· 필드 가득 → 대기석으로\n· 대기석 = 전투 안 함 · 필드로 끌어 놓기\n· 별 승급에는 포함',
    rect: () => ({ x: HUD.reserve.x - 4, y: HUD.reserve.y - 4, w: HUD.reserve.w + 8, h: HUD.reserve.h + 8 })
  },
  synergy: {
    title: '시너지',
    text: '· 용병마다 계열 1 · 출신 1\n· 서로 다른 용병 수 → 단계\n· 계열 2·5·8 / 출신 3·6·9',
    rect: () => ({ x: HUD.syn.x - 4, y: HUD.syn.y - 4, w: HUD.syn.w + 8, h: HUD.syn.h + 8 })
  },
  wave: {
    title: '웨이브 시작',
    text: '· 몬스터 = 성벽 바깥 길 순환\n· 한 바퀴마다 성벽 체력 감소\n· 체력 0 → 패배',
    rect: () => ({ x: HUD.top.x - 4, y: HUD.top.y - 4, w: HUD.top.w + 8, h: HUD.top.h + 8 })
  },
  select: {
    title: '용병 정보',
    text: '· 선택 → 상점 자리에 능력치\n· 판매: 버튼 · S\n· 드래그 → 자리 교체 (바깥 = 전열 · 가운데 = 후열)',
    rect: () => ({ x: HUD.shop.x - 4, y: HUD.shop.y - 4, w: HUD.shop.w + 8, h: HUD.shop.h + 8 })
  },
  skill: {
    title: '스킬',
    text: '· 용병마다 스킬 1\n· 공격 → 마나 충전 · 가득 → 스킬\n· 별 +1 → 스킬 강화',
    rect: () => null
  },
  next: {
    title: '바로 시작',
    text: '· 정비 시간 → 남은 시간 건너뛰고 다음 웨이브\n· F 바로 시작 · Space 정지 · R 리롤 · E 레벨 업',
    rect: (s) => btnRect(s.hud.nextWaveBtn, 6)
  },
  boss: {
    title: '보스 등장',
    text: '· 용병에게 디버프\n· 한 바퀴마다 성벽 체력 크게 감소',
    rect: (s) => {
      const b = s.monsters?.find((m) => m.isBoss && m.active);
      return b ? { x: toUi(b.x) - 30, y: toUi(b.y) - 36, w: 60, h: 60 } : null; // 보스는 월드 좌표
    }
  },
  prep: {
    title: '정비 시간',
    text: '· 웨이브 중: 용병 구매·배치·아이템 장착 불가\n· 몬스터 전멸 → 정비 시간 15초 (F 바로 시작)',
    rect: () => ({ x: HUD.shop.x - 4, y: HUD.shop.y - 4, w: HUD.shop.w + 8, h: HUD.shop.h + 8 })
  },
  special: {
    title: '특수 몬스터',
    text: '· 늑대 빠름 · 딱정벌레 방어력 · 눈알 기절(가까운 용병 1명)\n· 유령 물리 저항 · 임프 마법 저항 (그 공격 피해 35%)\n· 방어력 ← 센 한 방·지속 피해 · 폭발 = 저항 무시',
    rect: (s) => {
      const m = s.monsters?.find((o) => o.variant && o.active);
      return m ? { x: toUi(m.x) - 22, y: toUi(m.y) - 22, w: 44, h: 44 } : null; // 몬스터는 월드 좌표
    }
  },
  eliteSkill: {
    title: '스킬 정예',
    text: '· 정예 10마리 중 1마리 = 스킬 정예\n· 보라 고리: 용병 2명 저주 (공격력·공속·스킬 봉쇄)\n· 색 원: 주변 몬스터 수호·가속·재생 → 먼저 처치',
    rect: (s) => {
      const m = s.monsters?.find((o) => o.eliteSkill && o.active);
      return m ? { x: toUi(m.x) - 30, y: toUi(m.y) - 30, w: 60, h: 60 } : null; // 몬스터는 월드 좌표
    }
  },
  stones: {
    title: '마정석',
    text: '· 보스 처치 → 마정석\n· 사용: 술집(고용) · 유물 공방(생산)',
    rect: () => null
  },
  relic: {
    title: '유물',
    text: '· 유물 공방에서 장착\n· 매 판 팀 전체 적용\n· 아이콘 오버 → 효과',
    rect: () => ({ x: HUD.relic.x - 4, y: HUD.relic.y - 4, w: HUD.relic.w + 8, h: 44 })
  },
  hero: {
    title: '유니크 등장',
    text: '· 최상위 등급\n· 영지 레벨 업 → 확률 증가 (Lv10 25%)',
    rect: (s) => {
      const u = s.mercs?.find((m) => m.isHero);
      return u ? cellsRect([u]) : null;
    }
  },
  tower: {
    title: '명성 강화',
    text: '· 웨이브 버팀 → 명성\n· 강화 버튼 → 영구 강화 (판 도중 가능)',
    rect: (s) => {
      const b = s.hud?.upgradeBtn;
      return b ? { x: b.x - b.w / 2, y: b.y - b.h / 2, w: b.w, h: b.h } : null;
    }
  }
};

function btnRect(b, pad = 4) {
  if (!b) return null;
  return { x: b.x - b.w / 2 - pad, y: b.y - b.h / 2 - pad, w: b.w + pad * 2, h: b.h + pad * 2 };
}

/** 필드 칸 상자 (월드 좌표) → 튜토리얼은 UI 좌표 (2026-11-22 PC 전환) */
function cellsRect(mercs) {
  const xs = mercs.map((m) => FIELD_X + m.col * CELL);
  const ys = mercs.map((m) => FIELD_Y + m.row * CELL);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x: toUi(x), y: toUi(y), w: toUi(Math.max(...xs) - x + CELL), h: toUi(Math.max(...ys) - y + CELL) };
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
    audio.tutorial();
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
    const w = 480;
    const title = uiText(s, 0, 0, step.title, 22, CSS.primary, 'bold');
    const body = uiText(s, 0, 0, step.text, 16.5, CSS.ink, '600', { wordWrap: { width: w - 40 }, lineSpacing: 6 });
    const h = 24 + title.height + 10 + body.height + 24 + 44 + 18;
    let y = GAME_H / 2 - h / 2;
    let x = (GAME_W - w) / 2;
    const cx = r ? r.x + r.w / 2 : GAME_W / 2;
    if (r && (cx < GAME_W / 3 || cx > (GAME_W * 2) / 3)) {
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
