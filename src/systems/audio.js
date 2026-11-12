// 16비트 풍 사운드 — 외부 파일 없이 WebAudio 로 실시간 합성
// 배경음: 펄스파 리드 + 삼각파 베이스 + 아르페지오 + 노이즈 드럼 (타이틀 / 전투 / 보스)
// 효과음: 클래스별 공격음, 스킬, 영웅 궁극기, 처치, 레벨 업, 보스 등장·디버프, 폭죽 등
// 브라우저 정책상 첫 터치/클릭 이후에만 소리가 난다 (audio.init()).

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
const MUSIC_GAIN = 0.28; // 볼륨 100% 일 때 배경음 음량
const SFX_GAIN = 0.48; // 볼륨 100% 일 때 효과음 음량

// 설정 저장 (저장이 막힌 환경에서도 동작하도록)
function load(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* 무시 */
  }
}

class Chiptune {
  constructor() {
    this.ctx = null;
    this.track = null;
    this.wanted = null;
    this.last = {};
    this.muted = load('rtd-muted', '0') === '1';
    this.musicVol = Number(load('rtd-music-vol', '0.7')); // 0~1
    this.sfxVol = Number(load('rtd-sfx-vol', '0.8'));
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
    this.music = ctx.createGain();
    this.music.gain.value = MUSIC_GAIN * this.musicVol;
    this.music.connect(this.master);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = SFX_GAIN * this.sfxVol;
    this.sfx.connect(this.master);
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
    if (!this.ctx || (!force && this.track === name)) return;
    clearInterval(this.timer);
    this.track = name;
    if (!name) return;
    const tr = TRACKS[name];
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

  ult() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    ['C5', 'E5', 'G5', 'C6'].forEach((n) => this.tone(this.sfx, 'square', hz(n), t, 0.5, 0.12, { attack: 0.02 }));
    this.tone(this.sfx, 'sawtooth', 110, t, 0.5, 0.25, { to: 440 });
    this.noise(this.sfx, t, 0.6, 0.3, 'lowpass', 400, 6000);
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
