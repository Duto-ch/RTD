// 악기 하나씩 따로 들어 보기: node docs/drafts/music/scottish/instruments.cjs [출력 폴더]
// synth.js 의 악기를 곡과 같은 믹스(좌우·잔향·압축)로 하나씩 약 2초 렌더 → 악기별 mp3 + 이어 붙인 sampler.mp3
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const OUT = path.resolve(process.argv[2] || path.join(__dirname, 'instruments'));
fs.mkdirSync(OUT, { recursive: true });
const code = fs.readFileSync(path.join(__dirname, 'synth.js'), 'utf8').replace(/^export /gm, '');

// 120BPM 4/4 → 한 마디 2초. [파일 이름, 악기, 마디 수, 악보(한 마디씩), 세기]
const DEMOS = [
  ['1_whistle', 'whistle', 1, ['D5:1 E5:1 F#5:1 A5:1 B5:4'], 0.8],
  ['2_fiddle', 'fiddle', 1, ['D4:1 E4:1 F#4:1 A4:1 B4:4'], 0.8],
  ['3_harp', 'harp', 1, ['D3:1 A3:1 D4:1 F#4:1 A4:1 F#4:1 D4:1 A3:1'], 0.6],
  ['5_drone', 'drone', 1, ['D2+A2:8'], 0.8],
  ['6_bass', 'bass', 1, ['D2:2 A2:2 D2:2 A2:2'], 0.6],
  ['7_bodhran', 'bodhran', 1, ['C4:1 r:0.5 C4:0.5 C4:1 C4:1 r:0.5 C4:0.5 C4:1 C4:2'], 0.5],
  ['8_bell', 'bell', 1, ['D6:2 A5:2 F#6:4'], 0.5]
];
const NAMES = { whistle: '틴 휘슬 (선율)', fiddle: '피들 (선율)', harp: '하프 (펼침화음)', strings: '현악 패드 (받침)', drone: '낮은 패드 (드론 자리)', bass: '베이스', bodhran: '바우런 (틀북)', bell: '글로켄 (반짝임)' };

function wav(chs, sr) {
  const n = chs[0].length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 4, 28);
  buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(chs[c][i] * 32767))), 44 + i * 4 + c * 2);
  return buf;
}

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setContent('<html><body></body></html>');
  await p.addScriptTag({ content: code + '\nwindow.__m = { schedule };' });
  const list = [];
  for (const [file, inst, bars, lines, vel] of DEMOS) {
    const r = await p.evaluate(async ({ inst, bars, lines, vel }) => {
      const song = { id: inst, bpm: 120, bars, E: 8, seed: 5, master: 1.4, revSecs: 3.2, chords: Array(bars).fill('D'), compose: (s) => s.mel(inst, 1, lines, vel) };
      const sr = 44100;
      const len = (inst === 'drone' ? 4.2 : 3.2) * sr; // 소리 2초 + 잔향 꼬리 (드론은 천천히 사라져서 조금 길게)
      const ctx = new OfflineAudioContext(2, len, sr);
      window.__m.schedule(ctx, song, ctx.destination, 0.05);
      const buf = await ctx.startRendering();
      const enc = (f) => { const u = new Uint8Array(f.buffer.slice(0)); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
      return { sr, l: enc(buf.getChannelData(0)), r: enc(buf.getChannelData(1)) };
    }, { inst, bars, lines, vel });
    const ch = [r.l, r.r].map((s) => new Float32Array(new Uint8Array(Buffer.from(s, 'base64')).buffer));
    let peak = 0;
    for (const c of ch) for (const v of c) peak = Math.max(peak, Math.abs(v));
    const gain = Math.min(16, 0.7 / peak); // 악기마다 듣기 좋은 크기로 맞춤 (곡 안에서의 크기와는 다름)
    for (const c of ch) for (let i = 0; i < c.length; i++) c[i] *= gain;
    const w = path.join(OUT, `${file}.wav`);
    fs.writeFileSync(w, wav(ch, r.sr));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', w, '-b:a', '128k', path.join(OUT, `${file}.mp3`)]);
    list.push(w);
    console.log(`${file} ${NAMES[inst]} peak ${peak.toFixed(3)} → x${gain.toFixed(2)}`);
  }
  await b.close();
  // 이어 붙이기 (악기 사이 0.4초 쉼)
  const gap = path.join(OUT, '_gap.wav');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-t', '0.4', '-i', 'anullsrc=r=44100:cl=stereo', gap]);
  const args = [];
  for (const w of list) args.push('-i', w, '-i', gap);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args, '-filter_complex', `concat=n=${list.length * 2}:v=0:a=1`, '-b:a', '128k', path.join(OUT, 'sampler.mp3')]);
  for (const w of [...list, gap]) fs.unlinkSync(w);
})();
