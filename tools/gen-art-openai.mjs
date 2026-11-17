// 캐릭터 그림 생성 (OpenAI 이미지 API) → art-inbox/raw/<id>.png
// 사용: NODE_USE_ENV_PROXY=1 node tools/gen-art-openai.mjs eric olaf elias isolde   (인자 없으면 전원, 이미 있는 파일은 건너뜀. --force 로 다시)
//   --model gpt-image-2 --quality medium
// API 키는 저장소에 없다 — 클라우드 환경의 네트워크 비밀값이 요청에 자동으로 들어간다 (Authorization 헤더는 자리표시자)
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { ROSTER, artPrompt } from '../src/data/roster.js';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args.splice(i, 2)[1] : d; };
const model = opt('model', 'gpt-image-2');
const quality = opt('quality', 'medium');
const force = args.includes('--force') && args.splice(args.indexOf('--force'), 1);
const ids = args.length ? args : ROSTER.map((c) => c.id);
const OUT = 'art-inbox/raw';
mkdirSync(OUT, { recursive: true });

async function one(id) {
  const c = ROSTER.find((x) => x.id === id);
  if (!c) return console.log(`? ${id} 없음`);
  const file = `${OUT}/${id}.png`;
  if (existsSync(file) && !force) return console.log(`- ${id} 이미 있음`);
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: 'Bearer proxy-injected', 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: artPrompt(c), size: '1024x1024', quality, n: 1 })
  });
  const d = await res.json();
  if (!res.ok) return console.log(`✗ ${id} ${res.status} ${d.error?.message}`);
  writeFileSync(file, Buffer.from(d.data[0].b64_json, 'base64'));
  console.log(`✓ ${id} ${file}`);
}

// 동시에 3개씩
for (let i = 0; i < ids.length; i += 3) await Promise.all(ids.slice(i, i + 3).map(one));
