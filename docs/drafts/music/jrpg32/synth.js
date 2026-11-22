// 32비트(PS1·새턴 시절) 풍 JRPG 배경음 합성기 — 시안 (2026-11-22, 사운드 전담)
// 외부 오디오 파일 없이 WebAudio 로 현악 패드·금관·플루트·하프·글로켄·베이스·팀파니·드럼 + 리버브를 합성한다.
// 어떤 BaseAudioContext 에서도 돈다: renderBuffer(song) 는 OfflineAudioContext 로 한 바퀴(60초)를 렌더하고
// 리버브 꼬리를 앞부분에 겹쳐 이음매 없는 반복용 AudioBuffer 를 돌려준다.
// 악보 표기: 'D5:2 F#5:1 r:1 D4+F#4:4' — 음이름+옥타브 : 길이(8분음표 단위), r = 쉼표, + = 화음. 마디마다 8.

const PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
export function midi(n) {
  const m = /^([A-G][#b]?)(-?\d)$/.exec(n);
  if (!m) throw new Error('bad note ' + n);
  return 12 * (+m[2] + 1) + PC[m[1]];
}
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

/** 한 마디 악보 → [{pos, dur, notes}] (8분음표 단위), 길이 합 */
export function parseBar(str) {
  const out = [];
  let pos = 0;
  for (const tok of str.trim().split(/\s+/)) {
    const [p, d] = tok.split(':');
    const dur = +d;
    if (p !== 'r') out.push({ pos, dur, notes: p.split('+').map(midi) });
    pos += dur;
  }
  return { notes: out, len: pos };
}

const QUAL = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], sus: [0, 5, 7], add9: [0, 4, 7, 14] };
export function chord(name) {
  const [main, bass] = name.split('/');
  const m = /^([A-G][#b]?)(.*)$/.exec(main);
  const root = PC[m[1]];
  const iv = QUAL[m[2]];
  if (!iv) throw new Error('bad chord ' + name);
  return { name, root, pcs: iv.map((i) => (root + i) % 12), bass: bass ? PC[bass] : root };
}
/** pc 를 lo 이상에서 가장 낮은 midi 로 */
const place = (pc, lo) => lo + ((pc - lo) % 12 + 12) % 12;

// 결정적 난수 (렌더할 때마다 같은 소리)
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// ───────────── 악기 ─────────────
// 모두 (ctx, out, t, dur, m, vel, nz) — out 은 악기 버스, nz 는 공용 잡음 버퍼
function adsr(g, t, a, peak, d, sus, end, rel) {
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.setTargetAtTime(peak * sus, t + a, d);
  g.gain.setValueAtTime(peak * sus, end);
  g.gain.setTargetAtTime(0, end, rel);
}
function osc(ctx, type, f, t, stop, detune = 0) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  o.detune.setValueAtTime(detune, t);
  o.start(t);
  o.stop(stop);
  return o;
}
function vibrato(ctx, o, t, stop, rate, cents, delay) {
  const l = ctx.createOscillator();
  l.frequency.value = rate;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0, t + delay);
  g.gain.linearRampToValueAtTime(cents, t + delay + 0.25);
  l.connect(g).connect(o.detune);
  l.start(t);
  l.stop(stop);
}
function noiseSrc(ctx, nz, t, stop) {
  const s = ctx.createBufferSource();
  s.buffer = nz;
  s.start(t, (t * 7.31) % 1);
  s.stop(stop);
  return s;
}

const INST = {
  // 현악 합주: 톱니 3개를 살짝 어긋나게(코러스) + 부드러운 저역 통과, 느린 어택
  strings(ctx, out, t, dur, m, vel) {
    const end = t + dur;
    const stop = end + 1.6;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = Math.min(7000, 2400 + hz(m) * 2.6);
    f.Q.value = 0.5;
    const g = ctx.createGain();
    adsr(g, t, Math.min(0.22, dur * 0.4), 0.05 * vel, 0.6, 0.85, end, 0.28);
    for (const dt of [-9, 0, 8]) {
      const o = osc(ctx, 'sawtooth', hz(m), t, stop, dt);
      vibrato(ctx, o, t, stop, 5.2 + dt * 0.02, 7, 0.2);
      o.connect(f);
    }
    f.connect(g).connect(out);
  },
  // 금관: 톱니+사각, 필터가 열렸다 닫히는 '빠-' 어택, 늦은 비브라토
  brass(ctx, out, t, dur, m, vel) {
    const end = t + dur;
    const stop = end + 0.8;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 1.6;
    const top = 1500 + 3800 * vel;
    f.frequency.setValueAtTime(350, t);
    f.frequency.linearRampToValueAtTime(top, t + 0.05);
    f.frequency.setTargetAtTime(top * 0.55, t + 0.05, 0.25);
    f.frequency.setTargetAtTime(300, end, 0.08);
    const g = ctx.createGain();
    adsr(g, t, 0.035, 0.085 * vel, 0.3, 0.78, end, 0.09);
    const a = osc(ctx, 'sawtooth', hz(m), t, stop);
    const b = osc(ctx, 'square', hz(m), t, stop, 6);
    const bg = ctx.createGain();
    bg.gain.value = 0.45;
    vibrato(ctx, a, t, stop, 5.4, 10, 0.28);
    vibrato(ctx, b, t, stop, 5.4, 10, 0.28);
    a.connect(f);
    b.connect(bg).connect(f);
    f.connect(g).connect(out);
  },
  // 플루트: 삼각파 + 옅은 배음 + 숨소리, 비브라토
  flute(ctx, out, t, dur, m, vel, nz) {
    const end = t + dur;
    const stop = end + 0.6;
    const g = ctx.createGain();
    adsr(g, t, 0.07, 0.16 * vel, 0.4, 0.82, end, 0.1);
    const a = osc(ctx, 'triangle', hz(m), t, stop);
    const b = osc(ctx, 'sine', hz(m) * 2, t, stop);
    const bg = ctx.createGain();
    bg.gain.value = 0.18;
    vibrato(ctx, a, t, stop, 5.6, 16, 0.22);
    vibrato(ctx, b, t, stop, 5.6, 16, 0.22);
    a.connect(g);
    b.connect(bg).connect(g);
    const n = noiseSrc(ctx, nz, t, stop);
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = hz(m) * 2;
    nf.Q.value = 1.5;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0, t);
    ng.gain.linearRampToValueAtTime(0.5 * vel, t + 0.03);
    ng.gain.setTargetAtTime(0.12 * vel, t + 0.03, 0.08);
    ng.gain.setTargetAtTime(0, end, 0.06);
    n.connect(nf).connect(ng).connect(g);
    g.connect(out);
  },
  // 하프: 뜯는 소리 (삼각파 + 2배음, 지수 감쇠)
  harp(ctx, out, t, dur, m, vel) {
    const len = 1.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.13 * vel, t + 0.004);
    g.gain.setTargetAtTime(0, t + 0.004, len / 4.5);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(5200, t);
    f.frequency.setTargetAtTime(1600, t, 0.25);
    const a = osc(ctx, 'triangle', hz(m), t, t + len);
    const b = osc(ctx, 'sine', hz(m) * 2, t, t + len);
    const bg = ctx.createGain();
    bg.gain.value = 0.35;
    a.connect(f);
    b.connect(bg).connect(f);
    f.connect(g).connect(out);
  },
  // 글로켄슈필(종): 비조화 배음 사인 3개
  bell(ctx, out, t, dur, m, vel) {
    const len = 2.4;
    for (const [mul, amp, dec] of [[1, 0.12, 0.6], [2.76, 0.045, 0.22], [5.4, 0.02, 0.1]]) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp * vel, t + 0.003);
      g.gain.setTargetAtTime(0, t + 0.003, dec);
      osc(ctx, 'sine', hz(m) * mul, t, t + len).connect(g).connect(out);
    }
  },
  // 베이스: 톱니 저역 통과 + 사인 서브
  bass(ctx, out, t, dur, m, vel) {
    const end = t + Math.max(0.08, dur * 0.92);
    const stop = end + 0.4;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 2;
    f.frequency.setValueAtTime(1600, t);
    f.frequency.setTargetAtTime(600, t, 0.08);
    const g = ctx.createGain();
    adsr(g, t, 0.008, 0.075 * vel, 0.25, 0.6, end, 0.05);
    osc(ctx, 'sawtooth', hz(m), t, stop).connect(f);
    const sub = osc(ctx, 'sine', hz(m), t, stop);
    const sg = ctx.createGain();
    sg.gain.value = 0.55;
    sub.connect(sg).connect(g);
    f.connect(g).connect(out);
  },
  // 팀파니: 살짝 떨어지는 사인 + 막 잡음
  timpani(ctx, out, t, dur, m, vel, nz) {
    const len = 1.6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.3 * vel, t + 0.006);
    g.gain.setTargetAtTime(0, t + 0.006, 0.32);
    const o = osc(ctx, 'sine', hz(m) * 1.04, t, t + len);
    o.frequency.setTargetAtTime(hz(m), t, 0.04);
    const o2 = osc(ctx, 'triangle', hz(m) * 1.5, t, t + len);
    const g2 = ctx.createGain();
    g2.gain.value = 0.25;
    o.connect(g);
    o2.connect(g2).connect(g);
    const n = noiseSrc(ctx, nz, t, t + 0.3);
    const nf = ctx.createBiquadFilter();
    nf.type = 'lowpass';
    nf.frequency.value = 500;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.6 * vel, t);
    ng.gain.setTargetAtTime(0, t, 0.04);
    n.connect(nf).connect(ng).connect(out);
    g.connect(out);
  },
  kick(ctx, out, t, dur, m, vel) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5 * vel, t);
    g.gain.setTargetAtTime(0, t, 0.07);
    const o = osc(ctx, 'sine', 140, t, t + 0.5);
    o.frequency.setTargetAtTime(46, t, 0.035);
    o.connect(g).connect(out);
  },
  snare(ctx, out, t, dur, m, vel, nz) {
    const n = noiseSrc(ctx, nz, t, t + 0.4);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 2400;
    f.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.42 * vel, t);
    g.gain.setTargetAtTime(0, t, 0.05);
    n.connect(f).connect(g).connect(out);
    const o = osc(ctx, 'triangle', 200, t, t + 0.2);
    o.frequency.setTargetAtTime(165, t, 0.03);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.35 * vel, t);
    og.gain.setTargetAtTime(0, t, 0.03);
    o.connect(og).connect(out);
  },
  hat(ctx, out, t, dur, m, vel, nz) {
    const n = noiseSrc(ctx, nz, t, t + 0.15);
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.22 * vel, t);
    g.gain.setTargetAtTime(0, t, 0.02);
    n.connect(f).connect(g).connect(out);
  },
  crash(ctx, out, t, dur, m, vel, nz) {
    const n = noiseSrc(ctx, nz, t, t + 3);
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 4200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.2 * vel, t + 0.005);
    g.gain.setTargetAtTime(0, t + 0.005, 0.55);
    n.connect(f).connect(g).connect(out);
  }
};

// 악기별 버스: 음량·좌우·리버브 보내기
const MIX = {
  strings: { gain: 1, pan: -0.15, rev: 0.45 },
  brass: { gain: 1, pan: 0.12, rev: 0.3 },
  flute: { gain: 1, pan: 0.2, rev: 0.4 },
  harp: { gain: 1, pan: -0.3, rev: 0.4 },
  bell: { gain: 1, pan: 0.32, rev: 0.5 },
  bass: { gain: 1, pan: 0, rev: 0.08 },
  timpani: { gain: 1, pan: -0.05, rev: 0.3 },
  kick: { gain: 1, pan: 0, rev: 0.05 },
  snare: { gain: 1, pan: 0.05, rev: 0.22 },
  hat: { gain: 1, pan: 0.25, rev: 0.12 },
  crash: { gain: 1, pan: -0.2, rev: 0.25 }
};

function impulse(ctx, secs, decay) {
  const len = Math.floor(ctx.sampleRate * secs);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  const r = rng(7);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const x = i / len;
      lp = lp * 0.55 + (r() * 2 - 1) * 0.45; // 살짝 어둡게
      d[i] = lp * Math.pow(1 - x, decay) * (i < ctx.sampleRate * 0.012 ? i / (ctx.sampleRate * 0.012) : 1);
    }
  }
  return buf;
}

// ───────────── 작곡 도구 ─────────────
function composer(song) {
  const ev = [];
  const r = rng(song.seed || 1);
  const chords = song.chords.map(chord);
  const E = 8; // 마디당 8분음표
  const add = (inst, pos, dur, m, vel) => ev.push({ inst, pos, dur, m, vel: vel * (0.93 + r() * 0.1) });
  const api = {
    chord: (bar) => chords[bar - 1],
    /** 마디 bar 부터 악보 줄들을 차례로 (transpose 반음) */
    mel(inst, bar, lines, vel, tr = 0) {
      lines.forEach((line, i) => {
        if (!line) return;
        const { notes, len } = parseBar(line);
        if (len !== E) throw new Error(`${song.id} ${inst} 마디 ${bar + i} 길이 ${len}`);
        for (const n of notes) for (const m of n.notes) add(inst, (bar - 1 + i) * E + n.pos, n.dur, m + tr, vel);
      });
    },
    each(from, to, fn) {
      for (let b = from; b <= to; b++) fn(b, chords[b - 1]);
    },
    /** 화음 펼침: base 이상에서 베이스음 → 화음 음을 위로 쌓은 목록, pattern 은 그 목록의 번호 (8분음표마다, 16분이면 step 0.5) */
    arp(inst, bar, c, pattern, vel, base = 50, step = 1) {
      const tones = [place(c.bass, base)];
      let lo = tones[0] + 1;
      while (tones.length < 9) {
        const cand = c.pcs.map((pc) => place(pc, lo)).sort((a, b) => a - b)[0];
        tones.push(cand);
        lo = cand + 1;
      }
      pattern.forEach((k, i) => add(inst, (bar - 1) * E + i * step, step * 1.5, tones[k], vel));
    },
    /** 화음을 한 마디(또는 len) 길게 */
    pad(inst, bar, c, vel, lo = 57, pos = 0, len = E) {
      const ns = c.pcs.map((pc) => place(pc, lo)).sort((a, b) => a - b);
      for (const m of ns) add(inst, (bar - 1) * E + pos, len, m, vel);
    },
    /** 베이스: rhythm = [[pos, dur, 옥타브 올림?], ...] */
    bass(bar, c, rhythm, vel, lo = 33) {
      const root = place(c.bass, lo);
      for (const [pos, dur, up] of rhythm) add('bass', (bar - 1) * E + pos, dur, root + (up ? 12 : 0), vel);
    },
    /** 드럼 16칸: x 세게, o 약하게 */
    drum(inst, bar, pat, vel, m = 0) {
      [...pat].forEach((ch, i) => {
        if (ch === 'x') add(inst, (bar - 1) * E + i / 2, 0.5, m, vel);
        else if (ch === 'o') add(inst, (bar - 1) * E + i / 2, 0.5, m, vel * 0.5);
      });
    },
    /** 점점 세지는 스네어 연타 */
    roll(bar, beats, from, to, startPos = 0) {
      const n = beats * 4;
      for (let i = 0; i < n; i++) add('snare', (bar - 1) * E + startPos + i / 2, 0.5, 0, from + ((to - from) * i) / n);
    },
    hit(inst, bar, pos, m, vel) {
      add(inst, (bar - 1) * E + pos, 1, m, vel);
    },
    raw: add
  };
  song.compose(api);
  return ev;
}

/** 한 바퀴를 ctx 에 예약 (t0 부터). 마지막 소리가 끝나는 시각을 돌려준다 */
export function schedule(ctx, song, dest, t0 = 0) {
  const sec = 60 / song.bpm / 2; // 8분음표 길이(초)
  const nz = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = nz.getChannelData(0);
  const r = rng(3);
  for (let i = 0; i < nd.length; i++) nd[i] = r() * 2 - 1;

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 3;
  comp.attack.value = 0.01;
  comp.release.value = 0.2;
  const master = ctx.createGain();
  master.gain.value = song.master ?? 0.9;
  const rev = ctx.createConvolver();
  rev.buffer = impulse(ctx, 2.6, 3.2);
  const revGain = ctx.createGain();
  revGain.gain.value = 0.55;
  rev.connect(revGain).connect(comp);
  const hp = ctx.createBiquadFilter(); // 초저역 정리
  hp.type = 'highpass';
  hp.frequency.value = 38;
  const air = ctx.createBiquadFilter(); // 32비트 샘플 음원 같은 또렷함
  air.type = 'highshelf';
  air.frequency.value = 3200;
  air.gain.value = 4;
  comp.connect(hp).connect(air).connect(master).connect(dest);

  const buses = {};
  for (const [k, mx] of Object.entries(MIX)) {
    const g = ctx.createGain();
    g.gain.value = mx.gain * (song.mix?.[k] ?? 1);
    const p = ctx.createStereoPanner();
    p.pan.value = mx.pan;
    const s = ctx.createGain();
    s.gain.value = mx.rev;
    g.connect(p);
    p.connect(comp);
    p.connect(s).connect(rev);
    buses[k] = g;
  }
  for (const e of composer(song)) INST[e.inst](ctx, buses[e.inst], t0 + e.pos * sec, e.dur * sec, e.m, e.vel, nz);
  return t0 + song.bars * 8 * sec;
}

/** 한 바퀴 길이(초) */
export const songLength = (song) => (song.bars * 8 * 60) / song.bpm / 2;

/** OfflineAudioContext 로 한 바퀴 렌더 → 꼬리를 앞에 겹친 반복용 스테레오 버퍼 */
export async function renderBuffer(song, sampleRate = 44100) {
  const L = Math.round(songLength(song) * sampleRate);
  const tail = Math.round(3.5 * sampleRate);
  const ctx = new OfflineAudioContext(2, L + tail, sampleRate);
  schedule(ctx, song, ctx.destination, 0);
  const full = await ctx.startRendering();
  const out = new AudioBuffer({ numberOfChannels: 2, length: L, sampleRate });
  for (let ch = 0; ch < 2; ch++) {
    const src = full.getChannelData(ch);
    const dst = out.getChannelData(ch);
    dst.set(src.subarray(0, L));
    for (let i = 0; i < tail; i++) dst[i] += src[L + i];
  }
  return out;
}

// ───────────── 곡 ─────────────

/** 타이틀: '새벽의 출정' — D장조 96BPM 24마디 = 60초. 하프·글로켄 인트로 → 플루트 주제 → 금관·현악 고조 → 다시 처음으로 */
export const TITLE = {
  id: 'title',
  name: '새벽의 출정',
  bpm: 96,
  bars: 24,
  seed: 11,
  master: 1.25,
  chords: ['D', 'Bm', 'G', 'A', 'D', 'A/C#', 'Bm', 'F#m', 'G', 'D/F#', 'Em', 'A', 'G', 'A', 'F#m', 'Bm', 'G', 'A', 'Bm', 'A', 'G', 'A', 'D', 'Asus'],
  compose(s) {
    // 하프 펼침화음 (B 구간은 16분으로 더 촘촘히)
    s.each(1, 24, (b, c) => {
      if (b >= 13 && b <= 20) s.arp('harp', b, c, [0, 2, 3, 4, 5, 4, 3, 2, 1, 3, 4, 5, 6, 5, 4, 3], 0.42, 50, 0.5);
      else s.arp('harp', b, c, [0, 2, 3, 4, 5, 4, 3, 2], b <= 4 ? 0.6 : 0.5);
    });
    // 인트로 글로켄
    s.mel('bell', 1, ['A5:2 F#5:2 D6:4', 'B5:4 F#5:4', 'G5:2 B5:2 D6:4', 'C#6:4 E6:4'], 0.55);
    // 현악 패드 (인트로 마지막 마디부터 살며시)
    s.each(4, 24, (b, c) => s.pad('strings', b, c, b === 4 ? 0.35 : b >= 13 && b <= 20 ? 0.75 : 0.5));
    // 베이스
    s.each(5, 24, (b, c) => {
      if (b >= 13 && b <= 20) s.bass(b, c, [[0, 2], [2, 2], [4, 2], [6, 1], [7, 1, 1]], 0.7);
      else s.bass(b, c, [[0, 4], [4, 4]], 0.6);
    });
    // A: 플루트 주제
    const A = [
      'A4:3 D5:1 F#5:2 E5:1 D5:1',
      'E5:4 C#5:2 A4:2',
      'B4:3 C#5:1 D5:2 F#5:2',
      'C#5:6 r:2',
      'B4:3 D5:1 G5:2 F#5:1 E5:1',
      'F#5:4 A5:2 F#5:2',
      'G5:3 F#5:1 E5:2 D5:1 B4:1',
      'E5:8'
    ];
    s.mel('flute', 5, A, 0.85);
    // B: 금관 + 현악(한 옥타브 아래)으로 고조
    const B = [
      'D5:2 G5:2 B5:4',
      'A5:3 G5:1 F#5:2 E5:2',
      'F#5:4 C#5:2 A5:2',
      'B5:6 F#5:2',
      'G5:3 A5:1 B5:2 D6:2',
      'C#6:4 B5:2 A5:2',
      'D6:3 C#6:1 B5:2 F#5:2',
      'A5:8'
    ];
    s.mel('brass', 13, B, 0.8, -12);
    s.mel('strings', 13, B, 0.6);
    // 마무리: 플루트가 내려와 쉬고, 다음 바퀴 하프로 이어짐
    s.mel('flute', 21, ['G5:2 F#5:2 E5:2 D5:2', 'E5:4 C#5:2 A4:2', 'D5:8', null], 0.8);
    s.mel('bell', 23, ['r:4 A5:2 D6:2', 'C#6:2 E6:2 r:4'], 0.4);
    // 타악기: A 는 가볍게, B 는 팀파니·크래시
    s.each(5, 12, (b) => s.drum('hat', b, 'o...o...o...o...', 0.6));
    s.roll(12, 1, 0.15, 0.55, 6);
    s.hit('crash', 13, 0, 0, 0.8);
    s.each(13, 20, (b, c) => {
      s.hit('timpani', b, 0, place(c.bass, 38), 0.75);
      s.hit('timpani', b, 4, place(c.root, 38), 0.45);
      s.drum('hat', b, 'o.o.x.o.o.o.x.o.', 0.55);
    });
    s.hit('timpani', 20, 6, place(9, 38), 0.6);
    s.hit('crash', 21, 0, 0, 0.5);
    s.hit('timpani', 23, 0, place(2, 38), 0.7);
  }
};

/** 게임 진행: '바람을 가르는 길' — G장조 128BPM 32마디 = 60초. 행진 북 + 금관 주제 → 현악 단조 다리 → 주제 다시(풀편성) → 되돌이 */
export const ADVENTURE = {
  id: 'adventure',
  name: '바람을 가르는 길',
  bpm: 128,
  bars: 32,
  seed: 23,
  master: 1.2,
  mix: { strings: 0.85, bass: 0.6, kick: 0.75, timpani: 0.8 },
  chords: ['Em', 'C', 'D', 'D', 'G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D', 'Em', 'C', 'G', 'D', 'Em', 'C', 'Am', 'D', 'G', 'D', 'Em', 'C', 'G', 'D/F#', 'C', 'D', 'C', 'D', 'Em', 'D'],
  compose(s) {
    // 인트로: 금관 화음 찌르기 + 팀파니, 스네어 연타로 고조
    s.each(1, 4, (b, c) => {
      const pat = b === 4 ? [0, 2, 4, 6] : [0, 2, 6];
      for (const p of pat) {
        s.pad('brass', b, c, 0.7, 55, p, b === 4 && p === 6 ? 2 : 1);
        s.hit('timpani', b, p, place(c.root, 38), 0.6);
      }
      s.bass(b, c, pat.map((p) => [p, 1]), 0.7);
    });
    s.roll(3, 4, 0.1, 0.4);
    s.roll(4, 4, 0.4, 0.85);
    // A·A': 현악 8분 오스티나토 + 베이스 옥타브 펌프 + 행진 북
    const verse = (from, to, full) =>
      s.each(from, to, (b, c) => {
        s.arp('strings', b, c, [1, 3, 2, 3, 1, 3, 2, 3], full ? 0.5 : 0.42, 55);
        s.bass(b, c, [[0, 1], [1, 1, 1], [2, 1], [3, 1, 1], [4, 1], [5, 1, 1], [6, 1], [7, 1, 1]], 0.62);
        s.drum('kick', b, 'x.......x.x.....', 0.85);
        s.drum('snare', b, '....x.......x.oo', 0.7);
        s.drum('hat', b, 'x.o.x.o.x.o.x.o.', 0.55);
      });
    verse(5, 12, false);
    verse(21, 28, true);
    const A = [
      'D5:2 G5:3 A5:1 B5:2',
      'A5:4 F#5:2 D5:2',
      'E5:2 G5:2 B5:3 A5:1',
      'G5:4 E5:4',
      'D5:2 G5:3 A5:1 B5:2',
      'C6:3 B5:1 A5:2 F#5:2',
      'E5:2 G5:2 C6:2 B5:1 A5:1',
      'A5:6 r:2'
    ];
    s.mel('brass', 5, A, 0.85, -12);
    s.mel('brass', 21, A, 0.85, -12);
    s.mel('flute', 21, A, 0.6); // A' 는 플루트가 한 옥타브 위로 겹침
    // B: 단조 다리 — 현악이 노래하고 플루트가 겹침, 하프 펼침, 팀파니
    const B = [
      'B4:4 E5:2 G5:2',
      'G5:3 F#5:1 E5:4',
      'D5:4 G5:2 B5:2',
      'A5:6 F#5:2',
      'B5:4 G5:2 E5:2',
      'C6:4 G5:2 E5:2',
      'A5:3 B5:1 C6:2 E6:2',
      'D6:6 r:2'
    ];
    s.mel('strings', 13, B, 0.85);
    s.mel('flute', 13, B, 0.45, -12);
    s.each(13, 20, (b, c) => {
      s.arp('harp', b, c, [0, 2, 3, 4, 5, 4, 3, 2], 0.5, 43);
      s.pad('brass', b, c, 0.28, 55);
      s.bass(b, c, [[0, 3], [3, 1], [4, 4]], 0.65);
      s.hit('timpani', b, 0, place(c.root, 38), 0.6);
      s.hit('timpani', b, 4, place(c.root, 38), 0.35);
      s.drum('hat', b, 'o.o.o.o.o.o.o.o.', 0.5);
    });
    s.roll(20, 2, 0.2, 0.8, 4);
    // 되돌이 29~32
    s.mel('brass', 29, ['E5:2 G5:2 C6:4', 'D6:3 C6:1 B5:2 A5:2', 'B5:8', null], 0.85, -12);
    s.mel('flute', 29, ['E5:2 G5:2 C6:4', 'D6:3 C6:1 B5:2 A5:2', 'B5:8', null], 0.55);
    s.each(29, 32, (b, c) => {
      s.pad('strings', b, c, 0.6, 55);
      s.bass(b, c, [[0, 2], [2, 2], [4, 2], [6, 2, 1]], 0.65);
      s.drum('kick', b, 'x.......x.......', 0.8);
      s.drum('hat', b, 'x.o.x.o.x.o.x.o.', 0.5);
      if (b < 32) s.drum('snare', b, '....x.......x...', 0.6);
    });
    s.drum('snare', 32, 'x.x.x.x.xxxxxxxx', 0.55);
    s.hit('timpani', 32, 6, place(4, 38), 0.8);
    for (const b of [5, 13, 21, 29]) s.hit('crash', b, 0, 0, b === 13 ? 0.55 : 0.8);
  }
};

export const SONGS = { title: TITLE, adventure: ADVENTURE };
