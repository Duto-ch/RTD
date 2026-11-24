// VHS 홈비디오 효과 (2026-11-24 시험판, 사용자 요청) — 주사선·색 번짐(색수차)·잡음 알갱이·가끔 지나가는 노이즈 띠·트래킹 떨림·바랜 색·옅은 비네트
// 전투 장면은 카메라가 4개라 카메라마다 후처리를 걸면 효과가 겹친다 → 게임 캔버스를 매 프레임 한 장으로 받아
// 그 위에 덮은 WebGL 캔버스에서 셰이더를 한 번만 돌린다(화면 전환·창까지 모두 같은 효과). 포인터는 아래 게임 캔버스로 그대로 간다.
// 켜기: ESC 메뉴 'VHS 효과' 또는 주소 ?vhs=1 (저장 키 rtd-vhs)
import { storage } from './storage.js';

const KEY = 'rtd-vhs';

const VERT = `
attribute vec2 a;
varying vec2 uv;
void main() { uv = a * 0.5 + 0.5; gl_Position = vec4(a, 0.0, 1.0); }`;

// 세기는 '은은하게' — 비네트는 가장자리도 최대 12%만 어둡게 (사용자 요청: 너무 어둡지 않게)
const FRAG = `
precision mediump float;
varying vec2 uv;
uniform sampler2D tex;
uniform float time;
uniform vec2 res;
float rand(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float noise1(float x) { float i = floor(x); float f = fract(x); return mix(rand(vec2(i, 0.0)), rand(vec2(i + 1.0, 0.0)), f * f * (3.0 - 2.0 * f)); }
void main() {
  vec2 p = uv;
  float line = floor(p.y * 540.0); // 1080p 기준 2px 한 줄
  // 트래킹 떨림: 줄마다 아주 작게 + 가끔 화면 전체가 살짝 흔들림
  float wob = (rand(vec2(line, floor(time * 24.0))) - 0.5) * 0.0003;
  wob += (noise1(time * 1.3) - 0.5) * 0.0005;
  // 노이즈 띠: 아래로 천천히 내려가는 가로 띠 (몇 초에 한 번 진하게)
  float bandY = fract(time * 0.07);
  float band = smoothstep(0.035, 0.0, abs(p.y - bandY)) * smoothstep(0.55, 0.9, noise1(time * 0.35));
  wob += band * (rand(vec2(line, time)) - 0.5) * 0.012;
  p.x += wob;
  // 색 번짐: 빨강·파랑을 좌우로 어긋나게 + 가로로 살짝 흐리게
  // 1080p 기준 1px 어긋남 + 2px 쪽은 옅게 — 글자가 읽히는 정도로 (처음 3px 는 글자가 번져 읽기 힘들었다)
  float ca = 1.0 / 1920.0;
  vec3 c;
  c.r = texture2D(tex, p + vec2(ca, 0.0)).r * 0.75 + texture2D(tex, p + vec2(ca * 2.0, 0.0)).r * 0.25;
  c.g = texture2D(tex, p).g * 0.85 + texture2D(tex, p - vec2(ca * 0.5, 0.0)).g * 0.15;
  c.b = texture2D(tex, p - vec2(ca, 0.0)).b * 0.75 + texture2D(tex, p - vec2(ca * 2.0, 0.0)).b * 0.25;
  // 바랜 색: 채도 조금 낮추고 검정을 살짝 띄우고 따뜻하게
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(c, vec3(l), 0.14);
  c = c * 0.94 + vec3(0.035, 0.028, 0.02);
  // 주사선
  c *= 0.93 + 0.07 * cos(p.y * 540.0 * 6.2831853);
  // 잡음 알갱이 + 노이즈 띠 밝기
  c += (rand(uv * res + fract(time) * 91.7) - 0.5) * 0.035;
  c += band * (rand(vec2(uv.x * 300.0, line + time)) * 0.18);
  // 옅은 비네트 (가장자리 최대 12%)
  vec2 d = uv - 0.5;
  float v = smoothstep(0.85, 0.35, length(d * vec2(1.0, 1.25)));
  c *= mix(0.88, 1.0, v);
  // 아주 약한 밝기 깜빡임
  c *= 0.985 + 0.015 * rand(vec2(floor(time * 30.0), 3.0));
  gl_FragColor = vec4(c, 1.0);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
  return sh;
}

export const vhs = {
  enabled: false,
  ready: false,

  /** 게임이 만들어진 뒤 한 번 */
  init(game) {
    this.game = game;
    const q = new URLSearchParams(window.location.search).get('vhs');
    this.enabled = q != null ? q !== '0' : storage.get(KEY) === '1';
    game.events.on('postrender', () => this.draw());
  },

  set(on) {
    this.enabled = !!on;
    storage.set(KEY, this.enabled ? '1' : '0');
    if (!this.enabled && this.cv) this.cv.style.display = 'none';
  },

  toggle() {
    this.set(!this.enabled);
    return this.enabled;
  },

  setup() {
    const cv = document.createElement('canvas');
    cv.id = 'rtd-vhs';
    Object.assign(cv.style, { position: 'fixed', pointerEvents: 'none', zIndex: 5, imageRendering: 'auto' });
    document.body.appendChild(cv);
    const gl = cv.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false });
    if (!gl) {
      cv.remove();
      this.failed = true;
      return;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    this.cv = cv;
    this.gl = gl;
    this.u = { time: gl.getUniformLocation(prog, 'time'), res: gl.getUniformLocation(prog, 'res') };
    this.ready = true;
  },

  /** 게임이 한 프레임을 그린 직후(그림 버퍼가 아직 살아 있을 때) 그 화면을 받아 효과를 입힌다 */
  draw() {
    if (!this.enabled || this.failed) return;
    if (!this.ready) this.setup();
    if (!this.ready) return;
    const src = this.game.canvas;
    const cv = this.cv;
    const gl = this.gl;
    // 게임 캔버스와 같은 자리·같은 크기로 덮는다
    const r = src.getBoundingClientRect();
    cv.style.display = 'block';
    cv.style.left = `${r.left}px`;
    cv.style.top = `${r.top}px`;
    cv.style.width = `${r.width}px`;
    cv.style.height = `${r.height}px`;
    if (cv.width !== src.width || cv.height !== src.height) {
      cv.width = src.width;
      cv.height = src.height;
    }
    gl.viewport(0, 0, cv.width, cv.height);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.uniform1f(this.u.time, (performance.now() / 1000) % 1000);
    gl.uniform2f(this.u.res, cv.width, cv.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
};
