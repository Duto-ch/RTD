// 영지(로비) ESC 메뉴 (2026-11-22 사용자 요청): 전투 메뉴(Hud.openMenu)와 같은 모양 — 볼륨·음소거·튜토리얼 다시 보기 + 계속하기·게임 종료
// 영지에서 '게임 종료'는 게임을 완전히 끝낸다(quitApp): 창을 닫아 보고, 브라우저가 막으면 게임을 멈추고 '창을 닫아 주세요' 화면
import { storage } from '../systems/storage.js';
import { GAME_W, GAME_H } from '../config.js';
import { Button } from './Button.js';
import { panel, uiText, titleTab, closeButton, CSS, C } from './theme.js';
import { audio } from '../systems/audio.js';
import { meta } from '../systems/meta.js';
import { vhs } from '../systems/vhs.js';

/**
 * @param {Phaser.Scene} s
 * @param {{ onClose: () => void, onQuit: () => void, depth?: number }} opt
 * @returns {Phaser.GameObjects.Container}
 */
export function openSettingsMenu(s, { onClose, onQuit, depth = 900 }) {
  const pw = 440;
  const px = (GAME_W - pw) / 2;
  const py = 80;
  const ph = 520;
  const c = s.add.container(0, 0).setDepth(depth);
  const shade = s.add.rectangle(0, 0, GAME_W, GAME_H, 0x1a0f08, 0.55).setOrigin(0).setInteractive();
  shade.on('pointerdown', () => {
    audio.click(); // 바깥 눌러 닫기 클릭음 (2026-11-26)
    onClose();
  });
  const card = panel(s, px, py, pw, ph, 'card');
  card.setInteractive();
  c.add([shade, card, ...titleTab(s, px + pw / 2, py, '메뉴', 180), closeButton(s, px + pw - 6, py + 6, onClose)]);

  const volRow = (y, label, get, set) => {
    c.add(uiText(s, px + 28, y, label, 16, CSS.ink, '700').setOrigin(0, 0.5));
    const bar = s.add.graphics();
    const pct = uiText(s, px + pw - 26, y, '', 15, CSS.primary, '700').setOrigin(1, 0.5);
    const bx = px + 150;
    const bw = 150;
    const draw = () => {
      const v = get();
      bar.clear();
      for (let i = 0; i < 10; i++) {
        const on = i < Math.round(v * 10);
        bar.fillStyle(0x2b1810, 1).fillRect(bx + i * 15, y - 10, 12, 20);
        bar.fillStyle(on ? C.primary : C.soft, 1).fillRect(bx + i * 15 + 2, y - 8, 8, 16);
        if (on) bar.fillStyle(0xf08c3a, 1).fillRect(bx + i * 15 + 2, y - 8, 8, 4);
      }
      pct.setText(`${Math.round(v * 100)}%`);
    };
    const step = (d) => () => {
      set(get() + d);
      draw();
      audio.coin();
    };
    c.add([bar, pct, new Button(s, px + 120, y, 40, 40, '-', step(-0.1), { variant: 'outline', fontSize: 20 }), new Button(s, bx + bw + 30, y, 40, 40, '+', step(0.1), { variant: 'outline', fontSize: 20 })]);
    draw();
  };
  volRow(py + 92, '배경음', () => audio.musicVol, (v) => audio.setMusicVolume(v));
  volRow(py + 148, '효과음', () => audio.sfxVol, (v) => audio.setSfxVolume(v));

  const bw = pw - 56;
  // 음소거 · VHS 효과(2026-11-24 시험판)를 한 줄에 반씩
  const hw = (bw - 8) / 2;
  const mute = new Button(s, GAME_W / 2 - hw / 2 - 4, py + 216, hw, 50, '', () => {
    audio.toggleMute();
    mute.setLabel(`음소거 ${audio.muted ? '켜짐' : '꺼짐'}`);
  }, { variant: 'outline', fontSize: 16 });
  mute.setLabel(`음소거 ${audio.muted ? '켜짐' : '꺼짐'}`);
  const vhsBtn = new Button(s, GAME_W / 2 + hw / 2 + 4, py + 216, hw, 50, '', () => {
    vhs.toggle();
    vhsBtn.setLabel(`VHS 효과 ${vhs.enabled ? '켜짐' : '꺼짐'}`);
  }, { variant: 'outline', fontSize: 16 });
  vhsBtn.setLabel(`VHS 효과 ${vhs.enabled ? '켜짐' : '꺼짐'}`);
  c.vhsBtn = vhsBtn;
  const resume = new Button(s, GAME_W / 2, py + 286, bw, 56, '계속하기', onClose, { variant: 'primary', fontSize: 18 });
  let confirm = false;
  const quit = new Button(s, GAME_W / 2, py + 358, bw, 56, '게임 종료', () => {
    if (!confirm) {
      confirm = true;
      quit.setLabel('한 번 더 → 종료');
      s.time.delayedCall(2500, () => {
        if (quit.active) {
          confirm = false;
          quit.setLabel('게임 종료');
        }
      });
      return;
    }
    onQuit();
  }, { variant: 'danger', fontSize: 16 });
  const tut = new Button(s, GAME_W / 2, py + 422, bw, 44, '튜토리얼 처음부터 다시 보기', () => {
    meta.resetTutorial();
    tut.setLabel('튜토리얼 켜짐');
  }, { variant: 'outline', fontSize: 12 });
  c.add([mute, vhsBtn, resume, quit, tut]);
  c.quitBtn = quit;
  return c;
}

/** 게임 완전히 끝내기: 창 닫기를 해 보고, 막히면(일반 브라우저 탭) 게임을 멈추고 안내 화면 */
export function quitApp(game) {
  try {
    audio.ctx?.suspend(); // 소리 멈춤
  } catch {
    /* 소리를 켠 적 없음 */
  }
  // 데스크톱 판(Electron): 저장을 파일에 다 쓰고 앱을 끈다 (2026-11-23)
  if (window.rtdNative?.quit) {
    storage.flush().finally(() => window.rtdNative.quit());
    return;
  }
  try {
    window.close();
  } catch {
    /* 닫을 수 없는 창 */
  }
  setTimeout(() => {
    if (window.closed) return;
    game.destroy(true);
    const d = document.createElement('div');
    d.id = 'rtd-quit';
    d.textContent = '게임 종료 · 창(탭) 닫기';
    Object.assign(d.style, { position: 'fixed', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fbf7ec', font: '20px sans-serif', zIndex: 9999 });
    document.body.appendChild(d);
  }, 120);
}
