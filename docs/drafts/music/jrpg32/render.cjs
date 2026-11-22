// 시안 렌더: node docs/drafts/music/jrpg32/render.cjs [출력 폴더]
// 헤드리스 Chromium 의 OfflineAudioContext 로 synth.js 두 곡을 렌더 → WAV → (ffmpeg 가 있으면) MP3
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const OUT = path.resolve(process.argv[2] || path.join(__dirname, 'out'));
fs.mkdirSync(OUT, { recursive: true });
const code = fs.readFileSync(path.join(__dirname, 'synth.js'), 'utf8').replace(/^export /gm, '');

function wav(chs, sr) {
  const n = chs[0].length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++)
    for (let c = 0; c < 2; c++) buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(chs[c][i] * 32767))), 44 + i * 4 + c * 2);
  return buf;
}

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setContent('<html><body></body></html>');
  await p.addScriptTag({ content: code + '\nwindow.__m = { SONGS, renderBuffer, songLength };' });
  for (const id of ['title', 'adventure']) {
    const t = Date.now();
    const r = await p.evaluate(async (id) => {
      const buf = await window.__m.renderBuffer(window.__m.SONGS[id]);
      const enc = (f) => {
        const u = new Uint8Array(f.buffer.slice(0));
        let s = '';
        for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
        return btoa(s);
      };
      return { sr: buf.sampleRate, l: enc(buf.getChannelData(0)), r: enc(buf.getChannelData(1)) };
    }, id);
    const ch = [r.l, r.r].map((s) => new Float32Array(new Uint8Array(Buffer.from(s, 'base64')).buffer));
    let peak = 0;
    let sum = 0;
    for (const c of ch) for (const v of c) { peak = Math.max(peak, Math.abs(v)); sum += v * v; }
    const rms = Math.sqrt(sum / (ch[0].length * 2));
    const file = path.join(OUT, `${id}.wav`);
    fs.writeFileSync(file, wav(ch, r.sr));
    console.log(`${id}: ${(ch[0].length / r.sr).toFixed(2)}s peak ${peak.toFixed(3)} rms ${(20 * Math.log10(rms)).toFixed(1)}dBFS (${Date.now() - t}ms)`);
    try {
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', file, '-b:a', '160k', path.join(OUT, `${id}.mp3`)]);
    } catch {
      /* ffmpeg 없음 */
    }
  }
  await b.close();
})();
