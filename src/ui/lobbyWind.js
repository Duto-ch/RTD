// 영지 배경 바람 (2026-11-25 시안, 사용자 요청: 뒤 구름 덩어리·초원 꽃·성 깃발이 살짝씩 움직이게 — 코드로)
// 배경 그림(lobby_key) 하나에 후처리 셰이더를 건다. 움직일 곳은 마스크 그림 lobby_wind.png (docs/drafts/lobby-wind/mask.py)
//  R = 하늘(구름): 느린 가로 흔들림 몇 px (높이마다 박자 다름 → 구름이 천천히 밀렸다 돌아옴)
//  G = 초원 꽃: 1~2px 바람 떨림 (자리마다 박자 다름)
//  B = 깃발: 깃대 0 → 끝 1 — 끝으로 갈수록 크게 펄럭이는 세로 물결. 상자 안 G = 깃발 픽셀(이것만 옮기고 빈 자리는 위 하늘로)
// 배경은 화면을 가득 채우므로(16:9 그대로) 화면 좌표 = 그림 좌표. 렌더 타깃은 아래가 0 이라 y 를 뒤집어 읽는다
import Phaser from 'phaser';

const FRAG = `
#define SHADER_NAME RTD_LOBBY_WIND
precision mediump float;
uniform sampler2D uMainSampler;
uniform sampler2D uMask;
uniform float uTime;
uniform vec2 uRes;
varying vec2 outTexCoord;
void main() {
  vec2 uv = outTexCoord;
  vec4 m = texture2D(uMask, vec2(uv.x, 1.0 - uv.y));
  float ix = uv.x * 1920.0;
  float iy = (1.0 - uv.y) * 1080.0;
  float t = uTime;
  vec2 k = (uRes.y / 1080.0) / uRes; // 그림 px → uv
  // 깃발 상자 (B > 0): 깃발 픽셀(G)만 물결로 옮기고, 깃발이 비운 자리는 12px 위 하늘로 채운다 — 뒤 구름은 그대로
  if (m.b > 0.004) {
    vec2 fo = vec2(sin(t * 5.0 - ix * 0.3) * 0.5, sin(t * 7.5 - ix * 0.55) * 1.8) * m.b;
    vec2 suv = uv - vec2(fo.x, -fo.y) * k;
    float isFlag = texture2D(uMask, vec2(suv.x, 1.0 - suv.y)).g;
    vec4 bg = m.g > 0.5 ? texture2D(uMainSampler, uv + vec2(0.0, 12.0) * k) : texture2D(uMainSampler, uv);
    gl_FragColor = mix(bg, texture2D(uMainSampler, suv), smoothstep(0.35, 0.65, isFlag));
    return;
  }
  vec2 off = vec2(0.0); // 그림 px (아래가 +y)
  // 구름: 느린 가로 흔들림 (최대 약 8px)
  off.x += m.r * (sin(t * 0.21 + iy * 0.011) * 4.5 + sin(t * 0.083 + iy * 0.004 + 1.3) * 3.5);
  // 꽃: 작은 떨림
  off.x += m.g * sin(t * 2.3 + ix * 0.047 + iy * 0.13) * 1.6;
  gl_FragColor = texture2D(uMainSampler, uv - vec2(off.x, -off.y) * k);
}`;

export class LobbyWindFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({ game, name: 'LobbyWindFX', fragShader: FRAG });
    this.maskTex = null;
  }

  onPreRender() {
    this.set1f('uTime', (performance.now() / 1000) % 3600);
    this.set2f('uRes', this.renderer.width, this.renderer.height);
    this.set1i('uMask', 1);
  }

  onDraw(target) {
    if (this.maskTex) this.bindTexture(this.maskTex, 1);
    this.bindAndDraw(target);
  }
}

/** 배경 그림에 바람을 건다 (WebGL · 마스크가 있을 때만). 걸었으면 true */
export function addLobbyWind(scene, img) {
  const r = scene.game.renderer;
  if (!r?.pipelines || !scene.textures.exists('lobby_wind')) return false;
  r.pipelines.addPostPipeline('LobbyWindFX', LobbyWindFX); // 이미 있으면 그대로
  img.setPostPipeline('LobbyWindFX');
  const fx = img.getPostPipeline('LobbyWindFX');
  const p = Array.isArray(fx) ? fx[0] : fx;
  if (!p) return false;
  p.maskTex = scene.textures.get('lobby_wind').source[0].glTexture;
  return true;
}
