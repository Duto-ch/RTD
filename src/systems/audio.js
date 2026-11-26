// 16비트 풍 사운드 — 외부 파일 없이 WebAudio 로 실시간 합성
// 배경음: 펄스파 리드 + 삼각파 베이스 + 아르페지오 + 노이즈 드럼 (타이틀 / 전투 / 보스)
// 효과음: 클래스별 공격음, 스킬, 영웅 궁극기, 처치, 레벨 업, 보스 등장·디버프, 폭죽 등
// 브라우저 정책상 첫 터치/클릭 이후에만 소리가 난다 (audio.init()).
import { storage } from './storage.js';

const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const hz = (n) => {
  const m = /^([A-G][#b]?)(\d)$/.exec(n);
  return 440 * 2 ** ((NOTE[m[1]] + (+m[2] + 1) * 12 - 69) / 12);
};

// 8분음표 단위. '.' 쉼표, '-' 앞 음 지속
const bar = (s) => s.trim().split(/\s+/);
const bassLine = (roots, shape) =>
  roots.flatMap((r) => shape.map((o) => (o === '.' ? '.' : `${r}${o}`)));

const TRACKS = {
  title: {
    bpm: 96,
    lead: [
      ...bar('E5 - - G5 - - C5 -'), ...bar('A4 - - C5 - - E5 -'),
      ...bar('F5 - E5 - D5 - C5 -'), ...bar('D5 - - - G4 - - -')
    ],
    bass: bassLine(['C', 'A', 'F', 'G'], ['2', '.', '3', '.', '2', '.', '3', '.']),
    chords: [['C5', 'E5', 'G5'], ['A4', 'C5', 'E5'], ['F4', 'A4', 'C5'], ['G4', 'B4', 'D5']],
    drums: 'k...s...'
  },
  battle: {
    bpm: 140,
    lead: [
      ...bar('E5 - A4 - C5 D5 E5 -'), ...bar('F5 - E5 D5 C5 - A4 -'),
      ...bar('G4 - C5 - E5 - G5 -'), ...bar('F5 E5 D5 - B4 - G4 -'),
      ...bar('A5 - G5 - E5 - C5 -'), ...bar('D5 - C5 - A4 - C5 D5'),
      ...bar('E5 - D5 - B4 - G4 -'), ...bar('G#4 - B4 - E5 - - -')
    ],
    bass: bassLine(['A', 'F', 'C', 'G', 'A', 'F', 'G', 'E'], ['2', '2', '3', '2', '2', '3', '2', '3']),
    chords: [
      ['A4', 'C5', 'E5'], ['F4', 'A4', 'C5'], ['C5', 'E5', 'G5'], ['G4', 'B4', 'D5'],
      ['A4', 'C5', 'E5'], ['F4', 'A4', 'C5'], ['G4', 'B4', 'D5'], ['E4', 'G#4', 'B4']
    ],
    drums: 'khshkksh'
  },
  boss: {
    bpm: 156,
    lead: [
      ...bar('D5 - F5 - A5 - G5 F5'), ...bar('D5 - F5 - Bb5 - A5 -'),
      ...bar('G5 - F5 - D5 - Bb4 -'), ...bar('C#5 - E5 - A5 - G5 E5'),
      ...bar('F5 - E5 D5 - A4 D5 -'), ...bar('F5 - G5 - A5 - Bb5 -'),
      ...bar('G5 - A5 - Bb5 - D6 -'), ...bar('C#6 - - - A5 - E5 -')
    ],
    bass: bassLine(['D', 'Bb', 'G', 'A', 'D', 'Bb', 'G', 'A'], ['2', '2', '3', '2', '2', '2', '3', '2']),
    chords: [
      ['D5', 'F5', 'A5'], ['Bb4', 'D5', 'F5'], ['G4', 'Bb4', 'D5'], ['A4', 'C#5', 'E5'],
      ['D5', 'F5', 'A5'], ['Bb4', 'D5', 'F5'], ['G4', 'Bb4', 'D5'], ['A4', 'C#5', 'E5']
    ],
    drums: 'kkshkksh'
  },
  // 최종전 (E 단조, 빠르고 웅장하게)
  final: {
    bpm: 168,
    lead: [
      ...bar('E5 - G5 - B5 - A5 G5'), ...bar('E5 - G5 - C6 - B5 -'),
      ...bar('A5 - G5 - F#5 - D5 -'), ...bar('D#5 - F#5 - B5 - A5 F#5'),
      ...bar('G5 - F#5 E5 - B4 E5 -'), ...bar('G5 - A5 - B5 - C6 -'),
      ...bar('A5 - B5 - C6 - D6 -'), ...bar('D#6 - - - B5 - F#5 -')
    ],
    bass: bassLine(['E', 'C', 'D', 'B', 'E', 'C', 'D', 'B'], ['2', '2', '3', '2', '2', '3', '2', '3']),
    chords: [
      ['E4', 'G4', 'B4'], ['C5', 'E5', 'G5'], ['D5', 'F#5', 'A5'], ['B4', 'D#5', 'F#5'],
      ['E4', 'G4', 'B4'], ['C5', 'E5', 'G5'], ['D5', 'F#5', 'A5'], ['B4', 'D#5', 'F#5']
    ],
    drums: 'kkskkksk'
  }
};

const SHOOT_GAP = 0.045; // 같은 종류 공격음 최소 간격(초)
const MUSIC_GAIN = 0.112; // 볼륨 100% 일 때 배경음 음량 (2026-11-22: 0.28 → 0.112 — 50% 가 예전 20% 크기, 사용자 요청)
// 파일 배경음 (2026-11-26 사용자 결정): 스코틀랜드 민요 풍 32비트 3곡 — 60초 이음매 없는 반복 mp3 (시안·악보 docs/drafts/music/scottish/).
// 'battle' 은 게임 진행 곡. 보스·최종 보스는 예전 합성 곡(TRACKS) 그대로. 파일을 못 읽으면 합성 곡으로 대신한다
const FILE_TRACKS = { title: 'assets/audio/title.mp3', lobby: 'assets/audio/lobby.mp3', battle: 'assets/audio/game.mp3' };
const FILE_FALLBACK = { lobby: 'title' };
// 파일 곡 크기 — 같은 배경음 버스에서 예전 합성 곡(보스 곡)보다 1~2dB 작게 맞춤(은은하게, 보스 곡으로 넘어갈 때 크기가 튀지 않게). 볼륨·MUSIC_GAIN 은 그대로 받는다
const FILE_GAIN = { title: 2, lobby: 2.6, battle: 2 };
const SFX_GAIN = 0.48; // 볼륨 100% 일 때 효과음 음량
const ULT_DUCK = 0.35; // 궁극기가 울리는 동안 배경음·다른 효과음 배율

// 설정 저장 — systems/storage.js 한 곳으로 (2026-11-23: 웹 localStorage / 데스크톱 파일)
function load(key, fallback) {
  return storage.get(key) ?? fallback;
}
function save(key, value) {
  storage.set(key, value);
}

class Chiptune {
  constructor() {
    this.ctx = null;
    this.track = null;
    this.wanted = null;
    this.last = {};
    this.loadSettings();
  }

  /** 저장된 볼륨·음소거 읽기 (데스크톱 판은 storage.init() 뒤에 다시 부른다) */
  loadSettings() {
    this.muted = load('rtd-muted', '0') === '1';
    this.musicVol = Number(load('rtd-music-vol', '0.5')); // 0~1 (기본 50%)
    this.sfxVol = Number(load('rtd-sfx-vol', '0.8'));
    this.buffers = {}; // 파일 배경음 디코딩 결과 (이름 → AudioBuffer 약속)
    this.fileSrc = null;
  }

  /** 배경음 볼륨 0~1 (저장됨) */
  setMusicVolume(v) {
    this.musicVol = Math.max(0, Math.min(1, Math.round(v * 10) / 10));
    save('rtd-music-vol', this.musicVol);
    if (this.music) this.music.gain.setTargetAtTime(MUSIC_GAIN * this.musicVol, this.ctx.currentTime, 0.02);
    return this.musicVol;
  }

  /** 효과음 볼륨 0~1 (저장됨) */
  setSfxVolume(v) {
    this.sfxVol = Math.max(0, Math.min(1, Math.round(v * 10) / 10));
    save('rtd-sfx-vol', this.sfxVol);
    if (this.sfx) this.sfx.gain.setTargetAtTime(SFX_GAIN * this.sfxVol, this.ctx.currentTime, 0.02);
    if (this.ultBus) this.ultBus.gain.setTargetAtTime(SFX_GAIN * this.sfxVol, this.ctx.currentTime, 0.02);
    return this.sfxVol;
  }

  /** 사용자 입력 시 호출 — 오디오 컨텍스트 생성/재개 */
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(ctx.destination);
    // 배경음·일반 효과음은 덕(duck) 게인을 거친다 — 궁극기가 울리는 동안 잠깐 낮춰 궁극기가 묻히지 않게 (2026-11-22)
    this.duck = ctx.createGain();
    this.duck.connect(this.master);
    this.music = ctx.createGain();
    this.music.gain.value = MUSIC_GAIN * this.musicVol;
    this.music.connect(this.duck);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = SFX_GAIN * this.sfxVol;
    this.sfx.connect(this.duck);
    // 궁극기 전용 버스: 효과음 볼륨은 따르되 덕을 거치지 않는다
    this.ultBus = ctx.createGain();
    this.ultBus.gain.value = SFX_GAIN * this.sfxVol;
    this.ultBus.connect(this.master);
    // 리드용 에코 (16비트 콘솔 느낌의 잔향)
    this.echo = ctx.createDelay(1);
    this.echo.delayTime.value = 0.19;
    const fb = ctx.createGain();
    fb.gain.value = 0.28;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    this.echo.connect(fb).connect(this.echo);
    this.echo.connect(wet).connect(this.music);

    this.waves = { p25: this.pulse(0.25), p12: this.pulse(0.125) };
    const len = ctx.sampleRate;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // 전쟁나팔용 잔향 (합성 임펄스 2.2초, 넓은 전장 느낌) → 궁극기 버스(덕 안 거침)
    this.verb = ctx.createConvolver();
    this.verb.buffer = this.impulse(2.2, 3);
    const vg = ctx.createGain();
    vg.gain.value = 0.5;
    this.verb.connect(vg).connect(this.ultBus);

    for (const k of Object.keys(FILE_TRACKS)) this.loadTrack(k).catch(() => {}); // 미리 읽어 두기 (장면이 바뀔 때 바로 나오게)

    if (this.wanted) this.playMusic(this.wanted, true);
  }

  get ready() {
    return !!this.ctx && !this.muted;
  }

  pulse(duty) {
    const n = 32;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let i = 1; i < n; i++) real[i] = (2 * Math.sin(i * Math.PI * duty)) / (i * Math.PI);
    return this.ctx.createPeriodicWave(real, imag);
  }

  toggleMute() {
    this.muted = !this.muted;
    save('rtd-muted', this.muted ? '1' : '0');
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.9, this.ctx.currentTime, 0.02);
    return this.muted;
  }

  // ── 합성 기본 단위 ──
  tone(dest, wave, f, t, dur, vol, { to, attack = 0.004 } = {}) {
    const o = this.ctx.createOscillator();
    if (typeof wave === 'string' && this.waves[wave]) o.setPeriodicWave(this.waves[wave]);
    else o.type = wave;
    o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(dest, t, dur, vol, type = 'highpass', freq = 6000, to) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  throttle(key, gap) {
    const now = this.ctx.currentTime;
    if (now - (this.last[key] || 0) < gap) return false;
    this.last[key] = now;
    return true;
  }

  // ── 배경음 시퀀서 ──
  playMusic(name, force = false) {
    this.wanted = name;
    // 데스크톱(Electron) 판은 자동 재생이 허용돼 첫 클릭 전에도 바로 소리를 켠다 — 타이틀 곡이 들리게 (웹은 첫 클릭 때 main.js 가 켠다)
    if (!this.ctx && typeof window !== 'undefined' && window.rtdNative) this.init();
    if (!this.ctx || (!force && this.track === name)) return;
    clearInterval(this.timer);
    this.stopFile();
    this.track = name;
    if (!name) return;
    if (FILE_TRACKS[name]) return this.playFile(name);
    this.playSynth(name);
  }

  /** 예전 합성 곡 (16비트 풍 시퀀서) */
  playSynth(name) {
    const tr = TRACKS[name];
    if (!tr) return;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.05;
    const stepDur = 60 / tr.bpm / 2;
    this.timer = setInterval(() => {
      if (!this.ctx) return;
      while (this.nextTime < this.ctx.currentTime + 0.15) {
        if (!this.muted) this.scheduleStep(tr, this.step, this.nextTime, stepDur);
        this.nextTime += stepDur;
        this.step++;
      }
    }, 30);
  }

  /** 파일 배경음 읽기 (한 번만 받아 디코딩해 둔다) */
  loadTrack(name) {
    if (!this.buffers[name]) {
      this.buffers[name] = fetch(FILE_TRACKS[name])
        .then((r) => {
          if (!r.ok) throw new Error(`배경음 ${name} ${r.status}`);
          return r.arrayBuffer();
        })
        .then((ab) => this.ctx.decodeAudioData(ab));
      this.buffers[name].catch(() => delete this.buffers[name]); // 실패하면 다음에 다시 시도
    }
    return this.buffers[name];
  }

  /** 파일 배경음 반복 재생 — 0.6초에 걸쳐 들어온다 */
  playFile(name) {
    this.loadTrack(name).then(
      (buf) => {
        if (this.track !== name || this.fileSrc) return; // 읽는 사이 다른 곡으로 바뀜
        const t = this.ctx.currentTime;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(FILE_GAIN[name] ?? 1, t + 0.6);
        src.connect(g).connect(this.music);
        src.start(t);
        this.fileSrc = { src, g, name };
      },
      () => {
        if (this.track === name) this.playSynth(FILE_FALLBACK[name] || name);
      }
    );
  }

  /** 파일 배경음 멈춤 — 0.4초에 걸쳐 잦아든다 */
  stopFile() {
    const f = this.fileSrc;
    if (!f) return;
    this.fileSrc = null;
    const t = this.ctx.currentTime;
    f.g.gain.cancelScheduledValues(t);
    f.g.gain.setValueAtTime(f.g.gain.value, t);
    f.g.gain.linearRampToValueAtTime(0, t + 0.4);
    f.src.stop(t + 0.45);
  }


  scheduleStep(tr, i, t, sd) {
    const L = tr.lead.length;
    const n = tr.lead[i % L];
    if (n !== '.' && n !== '-') {
      let len = 1;
      while (tr.lead[(i + len) % L] === '-' && len < 8) len++;
      const dur = len * sd * 0.95;
      this.tone(this.music, 'p25', hz(n), t, dur, 0.5, { attack: 0.01 });
      this.tone(this.echo, 'p25', hz(n), t, dur, 0.2, { attack: 0.01 });
    }
    const b = tr.bass[i % tr.bass.length];
    if (b !== '.') this.tone(this.music, 'triangle', hz(b), t, sd * 0.9, 0.9);
    const chord = tr.chords[Math.floor(i / 8) % tr.chords.length];
    for (let k = 0; k < 2; k++) {
      this.tone(this.music, 'p12', hz(chord[(i * 2 + k) % chord.length]), t + (k * sd) / 2, sd / 2, 0.12);
    }
    const d = tr.drums[i % tr.drums.length];
    if (d === 'k') this.tone(this.music, 'sine', 150, t, 0.14, 1.2, { to: 40 });
    if (d === 's') {
      this.noise(this.music, t, 0.12, 0.5, 'bandpass', 1800);
      this.tone(this.music, 'triangle', 220, t, 0.06, 0.4, { to: 120 });
    }
    if (d === 'h' || d === 'k') this.noise(this.music, t, 0.03, 0.18, 'highpass', 7000);
  }

  // ── 효과음 ──
  shoot(kind) {
    if (!this.ready || !this.throttle(`shoot_${kind}`, SHOOT_GAP)) return;
    const t = this.ctx.currentTime;
    const o = this.sfx;
    switch (kind) {
      case 'archer':
        this.tone(o, 'triangle', 1300, t, 0.06, 0.5, { to: 650 });
        this.noise(o, t, 0.03, 0.12, 'highpass', 5000);
        break;
      case 'ranger':
        this.tone(o, 'triangle', 1500, t, 0.05, 0.5, { to: 800 });
        this.tone(o, 'triangle', 1700, t + 0.04, 0.05, 0.4, { to: 900 });
        break;
      case 'mage':
        this.tone(o, 'p25', 450, t, 0.09, 0.22, { to: 950 });
        break;
      case 'sniper':
        this.noise(o, t, 0.14, 0.5, 'lowpass', 2500, 300);
        this.tone(o, 'square', 180, t, 0.1, 0.25, { to: 60 });
        break;
      case 'shaman':
        this.tone(o, 'sine', 300, t, 0.14, 0.4, { to: 460 });
        break;
      case 'rogue':
        this.noise(o, t, 0.05, 0.25, 'bandpass', 3200, 6000);
        break;
      case 'warlord':
        this.tone(o, 'square', 130, t, 0.16, 0.3, { to: 50 });
        this.noise(o, t, 0.12, 0.35, 'lowpass', 1200);
        break;
      case 'archmage':
        this.tone(o, 'p12', 1600, t, 0.12, 0.2, { to: 300 });
        this.noise(o, t, 0.08, 0.15, 'highpass', 3000);
        break;
    }
  }

  skill(level, attr) {
    if (!this.ready || !this.throttle('skill', 0.06)) return;
    const t = this.ctx.currentTime;
    const base = { red: ['C5', 'E5', 'G5', 'C6'], blue: ['E5', 'G5', 'B5', 'E6'], green: ['G4', 'B4', 'D5', 'G5'] }[attr];
    const notes = base.slice(0, level >= 4 ? 4 : 3);
    notes.forEach((n, i) => this.tone(this.sfx, 'p25', hz(n), t + i * 0.045, 0.09, 0.22));
    if (level >= 5) this.noise(this.sfx, t, 0.25, 0.15, 'bandpass', 2000, 8000);
  }

  /**
   * 유니크 궁극기 (skillDef level 6). 2026-11-22: 0.3초짜리 화음이 전투 소음에 묻혀 안 들리던 것을
   * 약 1초 — 묵직한 타격 + 빠르게 올라가는 아르페지오 + 밝은 화음 + 반짝임 — 로 바꾸고,
   * 울리는 동안 배경음·다른 효과음을 잠깐 낮춘다(ULT_DUCK). 유니크 여럿이 한꺼번에 써도 겹쳐 터지지 않게 0.3초 간격.
   */
  ult() {
    if (!this.ready || !this.throttle('ult', 0.3)) return;
    const t = this.ctx.currentTime;
    const o = this.ultBus;
    // 덕: 배경음·효과음을 0.05초 만에 낮췄다가 0.9초에 걸쳐 되돌린다
    const dg = this.duck.gain;
    dg.cancelScheduledValues(t);
    dg.setValueAtTime(dg.value, t);
    dg.linearRampToValueAtTime(ULT_DUCK, t + 0.05);
    dg.setValueAtTime(ULT_DUCK, t + 0.45);
    dg.linearRampToValueAtTime(1, t + 0.95);
    // 1) 타격: 낮게 떨어지는 톱니 + 저음 잡음
    this.tone(o, 'sawtooth', 220, t, 0.45, 0.5, { to: 50 });
    this.noise(o, t, 0.35, 0.5, 'lowpass', 1200, 120);
    // 2) 올라가는 아르페지오
    ['C5', 'E5', 'G5', 'C6', 'E6', 'G6'].forEach((n, i) => this.tone(o, 'p25', hz(n), t + 0.04 + i * 0.045, 0.14, 0.3));
    // 3) 밝은 화음 (아르페지오 끝에서 펼쳐져 길게 남는다)
    const c = t + 0.3;
    ['C5', 'G5', 'C6', 'E6'].forEach((n) => this.tone(o, 'square', hz(n), c, 0.65, 0.11, { attack: 0.03 }));
    this.tone(o, 'p12', hz('C4'), c, 0.6, 0.25, { attack: 0.02 });
    // 4) 반짝임
    this.noise(o, c, 0.55, 0.12, 'highpass', 5000, 11000);
  }

  /** 스테레오 잔향 임펄스 (지수 감쇠 잡음) */
  impulse(secs, decay) {
    const ctx = this.ctx;
    const n = Math.floor(ctx.sampleRate * secs);
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        lp = lp * 0.5 + (Math.random() * 2 - 1) * 0.5;
        d[i] = lp * Math.pow(1 - i / n, decay);
      }
    }
    return buf;
  }

  /**
   * 금관 한 음 (32비트 샘플 음원 느낌): 톱니 3개 + 한 옥타브 아래 사각.
   * o.attack 부풀어 오르는 시간 · o.scoop 아래에서 올려 잡는 반음 수 · o.fall 끝에서 내려앉는 반음 수
   */
  hornNote(m, t, dur, vol, o = {}) {
    const { attack = 0.09, scoop = 2, scoopTime = 0.11, fall = 0, vibDelay = 0.45, vib = 14, sub = true } = o;
    const ctx = this.ctx;
    const f0 = 440 * Math.pow(2, (m - 69) / 12);
    const end = t + dur;
    const stop = end + 0.6;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 2.5;
    f.frequency.setValueAtTime(200, t);
    f.frequency.linearRampToValueAtTime(1100, t + attack * 0.6);
    f.frequency.linearRampToValueAtTime(2100, t + attack + 0.15);
    f.frequency.setTargetAtTime(1500, t + attack + 0.15, 0.4);
    f.frequency.setTargetAtTime(180, end, 0.14);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * 0.55, t + attack * 0.35);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, end);
    g.gain.setTargetAtTime(0, end, 0.16);
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(4.2, t);
    lfo.frequency.linearRampToValueAtTime(5.6, end);
    const lg = ctx.createGain();
    lg.gain.setValueAtTime(0, t);
    lg.gain.setValueAtTime(0, t + Math.min(vibDelay, dur * 0.5));
    lg.gain.linearRampToValueAtTime(vib, t + Math.min(vibDelay + 0.5, dur * 0.85));
    lfo.connect(lg);
    lfo.start(t);
    lfo.stop(stop);
    const layers = [['sawtooth', 1, -12, 1], ['sawtooth', 1, 0, 1], ['sawtooth', 1, 10, 1]];
    if (sub) layers.push(['square', 0.5, 0, 0.45]); // 한 옥타브 아래 (아주 낮은 음은 들리지 않고 탁해지기만 해서 끈다)
    for (const [type, mul, det, amp] of layers) {
      const osc = ctx.createOscillator();
      osc.type = type;
      const fr = f0 * mul;
      osc.frequency.setValueAtTime(fr * Math.pow(2, -scoop / 12), t);
      osc.frequency.exponentialRampToValueAtTime(fr, t + scoopTime);
      if (fall) {
        osc.frequency.setValueAtTime(fr, end - 0.05);
        osc.frequency.exponentialRampToValueAtTime(fr * Math.pow(2, -fall / 12), end + 0.35);
      }
      osc.detune.value = det;
      lg.connect(osc.detune);
      const og = ctx.createGain();
      og.gain.value = amp / 3;
      osc.connect(og).connect(f);
      osc.start(t);
      osc.stop(stop);
    }
    this.noise(f, t, 0.14, 0.22, 'bandpass', 900); // 숨 들어가는 소리
    f.connect(g);
    g.connect(this.ultBus);
    g.connect(this.verb);
  }

  /**
   * 보스 등장 전쟁나팔 (2026-11-24 사용자 요청: '우우우우우우웅~' 한 음이 길게) — 아래에서 천천히 올려 잡아 부풀어 오르고,
   * 떨림이 점점 커지다 끝에서 살짝 내려앉으며 잔향으로 사라진다. 울리는 동안 배경음·효과음을 낮춘다.
   * level 0 보스 D2 2.4초 · 1 강화 보스 C2(+ 큰북) 2.8초 · 2 최종 보스 A1(+ 5도 위 + 큰북 두 번) 3.4초. 모두 한 옥타브 위를 옅게 겹침
   */
  warHorn(level = 0) {
    // 2026-11-24 사용자 결정: 느낌이 잘 안 살아 게임에서는 쓰지 않음(보류) — 보스 등장은 bossAppear. 다시 다듬을 때 시안 docs/drafts/sound/fill/horn_*.mp3
    if (!this.ready || !this.throttle('horn', 1)) return;
    const t = this.ctx.currentTime + 0.02;
    // 2026-11-24 사용자 요청: 한 옥타브 더 낮게 (무겁게) — D2 → C2 → A1
    const m = 38 + ([0, -2, -5][level] ?? 0);
    const dur = [2.4, 2.8, 3.4][level] ?? 2.4;
    const opt = { attack: 0.7, scoop: 3, scoopTime: 0.45, fall: 1.5, vibDelay: 0.8, vib: 18, sub: false };
    const dg = this.duck.gain;
    dg.cancelScheduledValues(t);
    dg.setValueAtTime(dg.value, t);
    dg.linearRampToValueAtTime(0.4, t + 0.25);
    dg.setValueAtTime(0.4, t + dur);
    dg.linearRampToValueAtTime(1, t + dur + 0.8);
    this.hornNote(m, t, dur, level >= 1 ? 0.46 : 0.42, opt);
    // 한 옥타브 위를 옅게 겹친다 — 작은 스피커에서도 나팔 소리가 또렷하게 (낮은 기본음은 노트북 스피커가 잘 못 낸다)
    this.hornNote(m + 12, t + 0.03, dur, level >= 1 ? 0.1 : 0.14, opt);
    if (level >= 2) this.hornNote(m + 7, t + 0.08, dur - 0.1, 0.12, opt); // 5도 위 — 더 웅장하게
    const drum = (at, v) => {
      this.tone(this.ultBus, 'sine', 70, at, 0.8, v, { to: 32 });
      this.noise(this.ultBus, at, 0.35, v * 0.5, 'lowpass', 500, 80);
    };
    if (level >= 1) drum(t + 0.55, 0.5);
    if (level >= 2) drum(t + dur - 0.2, 0.55);
  }

  /** UI 버튼 클릭 (2026-11-22): 짧고 부드러운 '톡' */
  click() {
    if (!this.ready || !this.throttle('click', 0.04)) return;
    const t = this.ctx.currentTime;
    this.tone(this.sfx, 'triangle', 1500, t, 0.035, 0.22, { to: 900, attack: 0.002 });
    this.tone(this.sfx, 'sine', 3000, t, 0.02, 0.06, { attack: 0.001 });
    this.noise(this.sfx, t, 0.015, 0.06, 'highpass', 5000);
  }

  /** 웨이브가 끝나 상점이 새로 채워질 때 (2026-11-22): 카드 넘기는 '샥샥샥' + 올라가는 두 음 '띠링' */
  shopRefresh() {
    if (!this.ready || !this.throttle('shopRefresh', 0.3)) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) this.noise(this.sfx, t + i * 0.055, 0.05, 0.16, 'bandpass', 3800 + i * 900, 1800);
    this.tone(this.sfx, 'p25', hz('E6'), t + 0.17, 0.09, 0.16);
    this.tone(this.sfx, 'p25', hz('B6'), t + 0.25, 0.22, 0.16);
    this.tone(this.sfx, 'triangle', hz('E5'), t + 0.25, 0.22, 0.12);
  }

  // ───── 전용 효과음 (2026-11-24 사용자 요청: 소리가 없던 곳 채우기) ─────

  /** 웨이브 시작: 북 '둥둥' + 두 음. 정예 웨이브(type 'elite')는 금관 찌르기를 더한다. 2웨이브부터는 명성 반짝임 */
  waveStart(type = 'normal', w = 1) {
    if (!this.ready || !this.throttle('wave', 0.5)) return;
    const t = this.ctx.currentTime;
    for (const [at, f] of [[0, 140], [0.16, 105]]) {
      this.tone(this.sfx, 'sine', f, t + at, 0.22, 0.38, { to: f * 0.55 });
      this.noise(this.sfx, t + at, 0.08, 0.2, 'lowpass', 900);
    }
    this.tone(this.sfx, 'p25', hz('G5'), t + 0.32, 0.1, 0.16);
    this.tone(this.sfx, 'p25', hz('D6'), t + 0.42, 0.2, 0.16);
    if (type === 'elite') this.hornNote(57, t + 0.3, 0.38, 0.22, { attack: 0.05, vibDelay: 1, vib: 0 });
    if (w >= 2) [hz('E7'), hz('B7')].forEach((f, i) => this.tone(this.sfx, 'sine', f, t + 0.6 + i * 0.07, 0.15, 0.05));
  }

  /** 용병 판매: 동전이 쏟아지는 '짤랑짤랑' */
  sell() {
    if (!this.ready || !this.throttle('sell', 0.08)) return;
    const t = this.ctx.currentTime;
    ['E7', 'B6', 'G6', 'E6'].forEach((n, i) => this.tone(this.sfx, 'p12', hz(n), t + i * 0.045, 0.07, 0.11));
    this.noise(this.sfx, t, 0.18, 0.05, 'highpass', 7000);
  }

  /** 성벽 피격: 묵직한 돌 '쿵' (big = 정예·보스 — 더 크고 길게) */
  wallHit(big = false) {
    if (!this.ready || !this.throttle(big ? 'wallBig' : 'wall', big ? 0.1 : 0.15)) return;
    const t = this.ctx.currentTime;
    this.tone(this.sfx, 'sine', big ? 110 : 150, t, big ? 0.35 : 0.14, big ? 0.6 : 0.3, { to: 45 });
    this.noise(this.sfx, t, big ? 0.3 : 0.1, big ? 0.35 : 0.15, 'lowpass', big ? 700 : 1100, 120);
    if (big) this.tone(this.sfx, 'square', 70, t, 0.2, 0.08, { to: 40 });
  }

  /** 성벽 체력 위험 경고: '삐용삐용' 두 번 */
  wallWarn() {
    if (!this.ready || !this.throttle('wallWarn', 2)) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      this.tone(this.sfx, 'square', hz('A5'), t + i * 0.3, 0.13, 0.18);
      this.tone(this.sfx, 'square', hz('E5'), t + i * 0.3 + 0.14, 0.13, 0.18);
    }
  }

  /** 성벽 체력이 30% 아래로 처음 떨어지면 경고음 — 50% 위로 회복하면 다시 울릴 수 있다 */
  wallHealth(hp, max) {
    if (hp <= max * 0.3 && hp > 0) {
      if (!this.wallLow) this.wallWarn();
      this.wallLow = true;
    } else if (hp > max * 0.5) this.wallLow = false;
  }

  /** 용병 들기: 짧게 올라가는 '뿅' */
  pick() {
    if (!this.ready || !this.throttle('pick', 0.05)) return;
    const t = this.ctx.currentTime;
    this.tone(this.sfx, 'triangle', 520, t, 0.07, 0.25, { to: 900 });
  }

  /** 용병 놓기: 나무 받침에 놓는 '톡' */
  place() {
    if (!this.ready || !this.throttle('place', 0.05)) return;
    const t = this.ctx.currentTime;
    this.tone(this.sfx, 'triangle', 420, t, 0.07, 0.3, { to: 240 });
    this.noise(this.sfx, t, 0.04, 0.12, 'bandpass', 1500);
  }

  /** 시너지 단계 켜짐: 밝게 올라가는 세 음 + 반짝임 */
  synergy() {
    if (!this.ready || !this.throttle('synergy', 0.25)) return;
    const t = this.ctx.currentTime;
    ['C6', 'E6', 'G6', 'C7'].forEach((n, i) => this.tone(this.sfx, 'p12', hz(n), t + i * 0.05, 0.12, 0.13));
    this.noise(this.sfx, t + 0.15, 0.25, 0.05, 'highpass', 8000);
  }

  /** 아이템 얻음(드랍·대장장이·웨이브 재료): '띠링' */
  itemGet() {
    if (!this.ready || !this.throttle('itemGet', 0.08)) return;
    const t = this.ctx.currentTime;
    this.tone(this.sfx, 'sine', hz('B6'), t, 0.1, 0.16);
    this.tone(this.sfx, 'sine', hz('E7'), t + 0.07, 0.18, 0.14);
  }

  /** 아이템 장착: 금속 '찰칵' */
  itemEquip() {
    if (!this.ready || !this.throttle('itemEquip', 0.05)) return;
    const t = this.ctx.currentTime;
    this.tone(this.sfx, 'square', 1800, t, 0.03, 0.1);
    this.tone(this.sfx, 'square', 2700, t + 0.035, 0.05, 0.08);
    this.noise(this.sfx, t, 0.03, 0.08, 'highpass', 4000);
  }

  /** 아이템 조합 완성: 모루 '깡!' + 올라가는 화음 */
  itemCombine() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    for (const [f, v] of [[1180, 0.14], [1870, 0.09], [2950, 0.05]]) this.tone(this.sfx, 'sine', f, t, 0.5, v, { attack: 0.002 });
    this.noise(this.sfx, t, 0.08, 0.25, 'bandpass', 2600);
    ['C6', 'E6', 'G6', 'C7'].forEach((n, i) => this.tone(this.sfx, 'p25', hz(n), t + 0.12 + i * 0.06, 0.14, 0.13));
  }

  /** 해제 도구로 아이템 빼기: 내려가는 '뽁' */
  itemRemove() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.tone(this.sfx, 'triangle', 900, t, 0.1, 0.25, { to: 350 });
    this.noise(this.sfx, t + 0.02, 0.06, 0.1, 'bandpass', 2000);
  }

  /** 상점 칸 잠금·풀기: 걸쇠 '철컥'(잠금은 낮→높, 풀기는 높→낮) */
  lock(on) {
    if (!this.ready || !this.throttle('lock', 0.05)) return;
    const t = this.ctx.currentTime;
    const [a, b] = on ? [700, 1100] : [1100, 700];
    this.tone(this.sfx, 'square', a, t, 0.03, 0.1);
    this.tone(this.sfx, 'square', b, t + 0.05, 0.04, 0.1);
    this.noise(this.sfx, t + 0.05, 0.03, 0.08, 'highpass', 3000);
  }

  /** 리롤(전투 상점·술집): 주사위 굴리는 '드르륵' + 뿅 */
  reroll() {
    if (!this.ready || !this.throttle('reroll', 0.08)) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) this.noise(this.sfx, t + i * 0.04, 0.03, 0.14, 'bandpass', 1400 + i * 500);
    this.tone(this.sfx, 'p25', hz('A5'), t + 0.17, 0.06, 0.12);
    this.tone(this.sfx, 'p25', hz('E6'), t + 0.22, 0.1, 0.12);
  }

  /** 마정석 얻음: 수정 종소리 */
  gem() {
    if (!this.ready || !this.throttle('gem', 0.2)) return;
    const t = this.ctx.currentTime;
    ['G6', 'C7', 'E7'].forEach((n, i) => {
      this.tone(this.sfx, 'sine', hz(n), t + i * 0.08, 0.6, 0.12, { attack: 0.002 });
      this.tone(this.sfx, 'sine', hz(n) * 2.76, t + i * 0.08, 0.2, 0.03, { attack: 0.002 });
    });
    this.noise(this.sfx, t + 0.1, 0.4, 0.04, 'highpass', 9000);
  }

  /** 지역이 바뀜: 바람 '휘이잉' + 부드러운 화음 */
  regionChange() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 3;
    f.frequency.setValueAtTime(400, t);
    f.frequency.exponentialRampToValueAtTime(1600, t + 0.7);
    f.frequency.exponentialRampToValueAtTime(500, t + 1.5);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.25, t + 0.5);
    g.gain.linearRampToValueAtTime(0, t + 1.6);
    src.connect(f).connect(g).connect(this.sfx);
    src.start(t);
    src.stop(t + 1.7);
    ['D5', 'A5', 'E6'].forEach((n) => this.tone(this.sfx, 'triangle', hz(n), t + 0.4, 1.1, 0.06, { attack: 0.3 }));
  }

  /** 치명타: 날카로운 '칭' (자주 나니 짧고 작게, 0.1초 간격) */
  crit() {
    if (!this.ready || !this.throttle('crit', 0.1)) return;
    const t = this.ctx.currentTime;
    this.tone(this.sfx, 'square', 2400, t, 0.05, 0.06, { to: 1500 });
    this.noise(this.sfx, t, 0.03, 0.05, 'highpass', 6000);
  }

  /** 튜토리얼 말풍선: '뽀잉 띵' */
  tutorial() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.tone(this.sfx, 'sine', hz('A5'), t, 0.1, 0.16, { to: hz('E6') });
    this.tone(this.sfx, 'sine', hz('A6'), t + 0.1, 0.25, 0.12);
  }

  /** 넣기·빼기 (병영 덱·유물 장착): 넣기는 올라가는 두 음, 빼기는 내려가는 두 음 */
  toggle(on) {
    if (!this.ready || !this.throttle('toggle', 0.05)) return;
    const t = this.ctx.currentTime;
    const [a, b] = on ? ['E5', 'B5'] : ['B5', 'E5'];
    this.tone(this.sfx, 'p25', hz(a), t, 0.06, 0.13);
    this.tone(this.sfx, 'p25', hz(b), t + 0.06, 0.09, 0.13);
  }

  kill() {
    if (!this.ready || !this.throttle('kill', 0.05)) return;
    this.tone(this.sfx, 'triangle', 900, this.ctx.currentTime, 0.04, 0.18, { to: 1500 });
  }

  bossKill() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.noise(this.sfx, t, 0.8, 0.7, 'lowpass', 1500, 80);
    this.tone(this.sfx, 'square', 220, t, 0.7, 0.25, { to: 40 });
  }

  coin() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.tone(this.sfx, 'square', hz('B5'), t, 0.06, 0.15);
    this.tone(this.sfx, 'square', hz('E6'), t + 0.06, 0.12, 0.15);
  }

  levelUp() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => this.tone(this.sfx, 'p25', hz(n), t + i * 0.06, 0.12, 0.3));
  }

  promote() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    [['G4', 0, 0.12], ['C5', 0.12, 0.12], ['E5', 0.24, 0.12], ['G5', 0.36, 0.5]].forEach(([n, d, l]) => {
      this.tone(this.sfx, 'p25', hz(n), t + d, l, 0.3);
      this.tone(this.sfx, 'triangle', hz(n) / 2, t + d, l, 0.4);
    });
    this.noise(this.sfx, t + 0.36, 0.5, 0.15, 'highpass', 6000);
  }

  bossAppear() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.tone(this.sfx, 'sawtooth', 110, t, 1.0, 0.3, { to: 45 });
    this.tone(this.sfx, 'square', 116, t, 1.0, 0.15, { to: 48 });
    this.noise(this.sfx, t, 0.9, 0.25, 'lowpass', 600, 80);
  }

  debuff() {
    if (!this.ready || !this.throttle('debuff', 0.2)) return;
    const t = this.ctx.currentTime;
    this.tone(this.sfx, 'p12', 233, t, 0.3, 0.2);
    this.tone(this.sfx, 'p12', 247, t, 0.3, 0.2);
    this.tone(this.sfx, 'sine', 600, t, 0.3, 0.15, { to: 200 });
  }

  firework() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.noise(this.sfx, t, 0.35, 0.5, 'lowpass', 3000, 200);
    for (let i = 0; i < 4; i++) this.noise(this.sfx, t + 0.15 + i * 0.07, 0.04, 0.15, 'highpass', 6000);
  }

  victory() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const seq = [['C5', 0.12], ['C5', 0.12], ['C5', 0.12], ['C5', 0.36], ['Ab4', 0.36], ['Bb4', 0.36], ['C5', 0.2], ['Bb4', 0.12], ['C5', 0.9]];
    let d = 0;
    for (const [n, l] of seq) {
      this.tone(this.sfx, 'p25', hz(n), t + d, l * 0.95, 0.3);
      this.tone(this.sfx, 'triangle', hz(n) / 2, t + d, l * 0.95, 0.4);
      d += l;
    }
  }

  defeat() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    ['E5', 'D5', 'C5', 'A4'].forEach((n, i) => this.tone(this.sfx, 'p25', hz(n), t + i * 0.25, 0.3, 0.25));
    this.tone(this.sfx, 'triangle', hz('A2'), t + 1, 0.8, 0.5);
  }
}

export const audio = new Chiptune();
