// 32비트 풍 스코틀랜드 민요 배경음 합성기 — 시안 (2026-11-25, 사운드 전담)
// jrpg32/synth.js 엔진을 바탕으로 틴 휘슬·피들·은은한 드론(따뜻한 낮은 패드)·바우런을 더하고, 3/4·6/8 박자(song.E = 마디당 8분음표 수)를 받는다.
// 외부 오디오 파일 없이 WebAudio 로 현악 패드·금관·플루트·하프·글로켄·베이스·팀파니·드럼 + 리버브를 합성한다.
// 어떤 BaseAudioContext 에서도 돈다: renderBuffer(song) 는 OfflineAudioContext 로 한 바퀴(60초)를 렌더하고
// 리버브 꼬리를 앞부분에 겹쳐 이음매 없는 반복용 AudioBuffer 를 돌려준다.
// 악보 표기: 'D5:2 F#5:1 r:1 D4+F#4:4' — 음이름+옥타브 : 길이(8분음표 단위, 0.5 = 16분), r = 쉼표, + = 화음. 마디마다 song.E(4/4 = 8, 3/4·6/8 = 6).

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
  // 틴 휘슬: 맑은 사인 + 옅은 삼각, 가벼운 숨, 긴 음에만 늦은 비브라토 — 부드럽게
  whistle(ctx, out, t, dur, m, vel, nz) {
    const end = t + dur;
    const stop = end + 0.5;
    const g = ctx.createGain();
    adsr(g, t, Math.min(0.035, dur * 0.3), 0.105 * vel, 0.5, 0.85, end, 0.07);
    const a = osc(ctx, 'sine', hz(m), t, stop);
    const b = osc(ctx, 'triangle', hz(m), t, stop);
    const bg = ctx.createGain();
    bg.gain.value = 0.35;
    if (dur > 0.45) {
      vibrato(ctx, a, t, stop, 5.4, 11, 0.28);
      vibrato(ctx, b, t, stop, 5.4, 11, 0.28);
    }
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 4200;
    a.connect(lp);
    b.connect(bg).connect(lp);
    lp.connect(g);
    const n = noiseSrc(ctx, nz, t, stop);
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = hz(m) * 2;
    nf.Q.value = 2;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0, t);
    ng.gain.linearRampToValueAtTime(0.22 * vel, t + 0.015);
    ng.gain.setTargetAtTime(0.05 * vel, t + 0.02, 0.05);
    ng.gain.setTargetAtTime(0, end, 0.05);
    n.connect(nf).connect(ng).connect(g);
    g.connect(out);
  },
  // 피들: 톱니 둘(살짝 어긋남)을 부드럽게 깎고, 활 긋는 느린 어택·비브라토·옅은 활 잡음
  fiddle(ctx, out, t, dur, m, vel, nz) {
    const end = t + dur;
    const stop = end + 0.6;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = Math.min(4200, 1500 + hz(m) * 1.3);
    f.Q.value = 0.7;
    const g = ctx.createGain();
    adsr(g, t, Math.min(0.09, dur * 0.35), 0.055 * vel, 0.5, 0.9, end, 0.14);
    for (const dt of [-4, 5]) {
      const o = osc(ctx, 'sawtooth', hz(m), t, stop, dt);
      if (dur > 0.35) vibrato(ctx, o, t, stop, 5.8, 13, 0.16);
      o.connect(f);
    }
    const n = noiseSrc(ctx, nz, t, stop);
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = 3000;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.04 * vel, t);
    ng.gain.setTargetAtTime(0.012 * vel, t, 0.06);
    ng.gain.setTargetAtTime(0, end, 0.08);
    n.connect(nf).connect(ng).connect(g);
    f.connect(g).connect(out);
  },
  // 드론 (2026-11-25 사용자 요청: 백파이프가 귀에 거슬려 교체) — 배음이 거의 없는 따뜻한 낮은 패드.
  // 사인 + 옅은 삼각(살짝 어긋나 은은히 일렁임) + 한 옥타브 위 사인 아주 옅게, 천천히 숨 쉬듯 부풀었다 가라앉는다
  drone(ctx, out, t, dur, m, vel) {
    const end = t + dur;
    const stop = end + 2.5;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 420;
    f.Q.value = 0.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.03 * vel, t + 2);
    g.gain.setValueAtTime(0.03 * vel, end);
    g.gain.linearRampToValueAtTime(0, end + 2);
    const breath = ctx.createGain(); // 숨: 0.13Hz 로 ±18% 천천히 일렁임
    breath.gain.value = 1;
    const l = osc(ctx, 'sine', 0.13, t, stop);
    const lg = ctx.createGain();
    lg.gain.value = 0.18;
    l.connect(lg).connect(breath.gain);
    for (const [type, mul, det, amp] of [['sine', 1, 0, 1], ['triangle', 1, 5, 0.35], ['triangle', 1, -5, 0.35], ['sine', 2, 3, 0.12]]) {
      const o = osc(ctx, type, hz(m) * mul, t, stop, det);
      const og = ctx.createGain();
      og.gain.value = amp;
      o.connect(og).connect(f);
    }
    f.connect(breath).connect(g).connect(out);
  },
  // 바우런(틀북): 부드럽게 '둥' — 낮게 떨어지는 사인 + 가죽 잡음
  bodhran(ctx, out, t, dur, m, vel, nz) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.32 * vel, t);
    g.gain.setTargetAtTime(0, t, 0.09);
    const o = osc(ctx, 'sine', 120, t, t + 0.5);
    o.frequency.setTargetAtTime(68, t, 0.05);
    o.connect(g).connect(out);
    const n = noiseSrc(ctx, nz, t, t + 0.2);
    const nf = ctx.createBiquadFilter();
    nf.type = 'lowpass';
    nf.frequency.value = 700;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.12 * vel, t);
    ng.gain.setTargetAtTime(0, t, 0.03);
    n.connect(nf).connect(ng).connect(out);
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
  crash: { gain: 1, pan: -0.2, rev: 0.25 },
  whistle: { gain: 1, pan: 0.18, rev: 0.5 },
  fiddle: { gain: 1, pan: -0.18, rev: 0.5 },
  drone: { gain: 1, pan: 0, rev: 0.35 },
  bodhran: { gain: 1, pan: 0.05, rev: 0.22 }
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
  const E = song.E || 8; // 마디당 8분음표 (4/4 = 8, 3/4·6/8 = 6)
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
  rev.buffer = impulse(ctx, song.revSecs || 3.2, 3);
  const revGain = ctx.createGain();
  revGain.gain.value = song.revGain ?? 0.6;
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
  return t0 + song.bars * (song.E || 8) * sec;
}

/** 한 바퀴 길이(초) */
export const songLength = (song) => (song.bars * (song.E || 8) * 60) / song.bpm / 2;

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

// ───────────── 곡 (스코틀랜드 민요 풍, 은은하고 부드럽게) ─────────────
// 민요 맛: 5음계에 가까운 선율, 스카치 스냅(짧은-긴 '0.5 + 1.5'), 으뜸음·5도 드론, 하프 펼침화음

/** 드론을 마디 from~to 동안 길게 (으뜸음 + 5도, 낮게) */
function droneSpan(s, from, to, root, E, vel) {
  const pos = (from - 1) * E;
  const dur = (to - from + 1) * E;
  s.raw('drone', pos, dur, root, vel);
  s.raw('drone', pos, dur, root + 7, vel * 0.8);
}

/** 타이틀: '안개 낀 고원의 새벽' — D장조 느린 노래(에어) 4/4, 64BPM 16마디 = 60초. 하프·드론으로 열고 틴 휘슬이 노래, 뒤는 피들이 받는다 */
export const TITLE = {
  id: 'title',
  name: '안개 낀 고원의 새벽',
  bpm: 64,
  bars: 16,
  E: 8,
  seed: 31,
  master: 1.5,
  revSecs: 3.6,
  chords: ['D', 'G', 'D', 'G', 'D', 'A', 'Bm', 'A', 'D', 'G', 'D', 'A', 'Bm', 'G', 'A', 'D'],
  compose(s) {
    // 하프: 느린 8분 펼침 (처음 두 마디는 조금 또렷하게)
    s.each(1, 16, (b, c) => s.arp('harp', b, c, [0, 2, 3, 4, 5, 4, 3, 2], b <= 2 ? 0.5 : 0.4, 50));
    droneSpan(s, 1, 16, 38, 8, 0.8); // D2·A2
    s.mel('bell', 1, ['r:4 A5:2 D6:2', 'B5:4 r:4'], 0.3);
    // 현악 패드: 아주 옅게 받침
    s.each(3, 16, (b, c) => s.pad('strings', b, c, 0.28, 57));
    s.each(3, 16, (b, c) => s.bass(b, c, [[0, 8]], 0.35, 38));
    // 틴 휘슬 (스카치 스냅이 들어간 느린 노래)
    s.mel('whistle', 3, [
      'A4:2 D5:0.5 E5:1.5 F#5:3 E5:1',
      'D5:1.5 E5:0.5 D5:2 B4:4',
      'A4:2 F#5:0.5 A5:1.5 B5:2 A5:2',
      'F#5:2 E5:2 C#5:4',
      'D5:2 F#5:0.5 E5:1.5 D5:2 B4:2',
      'C#5:1.5 B4:0.5 A4:6',
      'A4:2 D5:0.5 E5:1.5 F#5:2 A5:2',
      'B5:3 A5:1 G5:2 F#5:2'
    ], 0.8);
    // 피들이 이어받아 마무리 (휘슬은 한 옥타브 위에서 옅게 겹침)
    const B = [
      'F#5:2 A5:0.5 B5:1.5 A5:2 F#5:2',
      'E5:4 C#5:2 E5:2',
      'D5:2 B4:0.5 D5:1.5 F#5:2 E5:2',
      'D5:3 B4:1 G4:4',
      'A4:2 B4:0.5 C#5:1.5 E5:2 C#5:2',
      'D5:6 r:2'
    ];
    s.mel('fiddle', 11, B, 0.75);
    s.mel('whistle', 11, B, 0.25, 12);
  }
};

/** 영지: '호숫가 마을의 왈츠' — G장조 3/4, 96BPM 32마디 = 60초. 하프가 쿵-짝-짝, 피들 → 휘슬 → 둘이 함께 → 휘슬로 마무리 */
export const LOBBY = {
  id: 'lobby',
  name: '호숫가 마을의 왈츠',
  bpm: 96,
  bars: 32,
  E: 6,
  seed: 47,
  master: 1.5,
  revSecs: 3.2,
  chords: [
    'G', 'C', 'G', 'D', 'G', 'C', 'D', 'G',
    'G', 'C', 'G', 'D', 'G', 'C', 'D', 'G',
    'Em', 'C', 'G', 'D', 'Em', 'C', 'Am', 'D',
    'G', 'C', 'G', 'D', 'G', 'C', 'D', 'G'
  ],
  compose(s) {
    // 왈츠 반주: 1박 베이스(하프 낮은 음) + 2·3박 화음
    s.each(1, 32, (b, c) => {
      s.bass(b, c, [[0, 2]], 0.3, 40);
      s.raw('harp', (b - 1) * 6, 2, place(c.bass, 43), 0.5);
      s.pad('harp', b, c, 0.32, 59, 2, 1.5);
      s.pad('harp', b, c, 0.28, 59, 4, 1.5);
    });
    const A = ['D5:4 G5:2', 'E5:3 D5:1 C5:2', 'B4:2 D5:2 G5:2', 'F#5:4 E5:1 D5:1', 'D5:2 G5:1.5 A5:0.5 B5:2', 'C6:3 B5:1 A5:2', 'A5:2 F#5:2 D5:2'];
    s.mel('fiddle', 1, [...A, 'G5:6'], 0.7);
    s.mel('whistle', 9, [...A, 'G5:4 r:2'], 0.7);
    const B = ['B5:3 A5:1 G5:2', 'E5:4 G5:2', 'D5:2 B4:2 D5:2', 'A5:4 F#5:2', 'G5:2 B5:2 E6:2', 'E6:3 D6:1 C6:2', 'A5:2 C6:2 E5:2', 'F#5:4 A5:2'];
    s.mel('whistle', 17, B, 0.65);
    s.mel('fiddle', 17, B, 0.55, -12);
    s.each(17, 24, (b, c) => s.pad('strings', b, c, 0.3, 55));
    s.mel('whistle', 25, [...A, 'G5:6'], 0.7);
    s.mel('fiddle', 25, [...A, 'G5:6'], 0.4, -12);
    s.mel('bell', 31, ['r:2 B5:2 D6:2', 'G6:4 r:2'], 0.3);
    // 바우런: 1박만 부드럽게, B 에서는 2·3박 살짝
    s.each(9, 32, (b) => s.drum('bodhran', b, b >= 17 && b <= 24 ? 'x...o...o...' : 'x...........', 0.45));
    droneSpan(s, 17, 24, 40, 6, 0.6); // B 에서만 E2·B2 드론 살짝
  }
};

/** 게임 진행: '바람 부는 언덕의 지그' — D장조 6/8 지그(점4분 = 80), 40마디 = 60초. 부드러운 바우런 + 하프 펼침 + 드론, 휘슬·피들이 번갈아 */
export const GAME = {
  id: 'game',
  name: '바람 부는 언덕의 지그',
  bpm: 120,
  bars: 40,
  E: 6,
  seed: 59,
  master: 1.45,
  revSecs: 2.8,
  revGain: 0.5,
  chords: [
    'D', 'G', 'A', 'D',
    'D', 'G', 'D', 'A', 'D', 'G', 'A', 'D',
    'D', 'G', 'D', 'A', 'D', 'G', 'A', 'D',
    'Bm', 'G', 'D', 'A', 'Bm', 'G', 'A', 'D',
    'D', 'G', 'D', 'A', 'D', 'G', 'A', 'D',
    'G', 'A', 'G', 'D'
  ],
  compose(s) {
    // 하프: 지그 펼침 (8분 여섯 개), 베이스는 점4분 두 번
    s.each(1, 40, (b, c) => {
      s.arp('harp', b, c, [0, 2, 3, 1, 2, 3], b <= 4 || b >= 37 ? 0.45 : 0.36, 50);
      if (b > 2) s.bass(b, c, [[0, 3], [3, 3]], 0.32, 38);
    });
    droneSpan(s, 1, 20, 38, 6, 0.7);
    droneSpan(s, 29, 40, 38, 6, 0.7);
    const A = [
      'A4:1 D5:1 F#5:1 A5:2 F#5:1',
      'G5:1 B5:1 G5:1 D5:2 B4:1',
      'A4:1 D5:1 F#5:1 A5:1 B5:1 A5:1',
      'G5:1 E5:1 C#5:1 E5:3',
      'F#5:1 A5:1 D6:1 A5:2 F#5:1',
      'G5:1 B5:1 D6:1 B5:1 A5:1 G5:1',
      'E5:1 F#5:1 G5:1 A5:1 G5:1 E5:1',
      'D5:4 r:2'
    ];
    const B = [
      'B5:1 A5:1 B5:1 D6:2 B5:1',
      'A5:1 G5:1 F#5:1 G5:2 D5:1',
      'F#5:1 A5:1 D6:1 F#6:2 E6:1',
      'E6:2 C#6:1 A5:3',
      'B5:1 D6:1 F#6:1 E6:1 D6:1 B5:1',
      'D6:1 B5:1 G5:1 B5:2 A5:1',
      'G5:1 E5:1 C#5:1 E5:1 F#5:1 G5:1',
      'F#5:3 D5:3'
    ];
    s.mel('whistle', 5, A, 0.7);
    s.mel('fiddle', 13, A, 0.7);
    s.mel('whistle', 13, A.map((l, i) => (i % 2 ? l : null)), 0.22, 12); // 휘슬이 한 마디 걸러 옅게 메아리
    s.mel('whistle', 21, B, 0.65);
    s.mel('fiddle', 21, B, 0.5, -12);
    s.mel('whistle', 29, A, 0.65);
    s.mel('fiddle', 29, A, 0.45, -12);
    s.mel('whistle', 37, ['B4:1 D5:1 G5:1 B5:3', 'C#6:2 A5:1 E5:3', 'D5:1 G5:1 B5:1 D6:3', 'r:6'], 0.5);
    s.each(37, 40, (b, c) => s.pad('strings', b, c, 0.3, 57));
    // 바우런: 지그 박 (1·4번째 8분 강조) — 처음과 끝은 조용히
    s.each(3, 36, (b) => s.drum('bodhran', b, b >= 21 && b <= 28 ? 'x.o.o.x.o.o.' : 'x...o.x...o.', b <= 4 ? 0.3 : 0.42));
  }
};

export const SONGS = { title: TITLE, lobby: LOBBY, game: GAME };
