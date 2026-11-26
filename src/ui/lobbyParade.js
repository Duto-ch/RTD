// 영지 초원 행진 (2026-11-26 사용자 요청): 출전 덱에서 무작위 8명이 배경 지평선 근처를 뒤뚱뒤뚱 뛰어다닌다.
// 캐릭터 그림에 걷기 동작이 없어 정지 그림(무기 포함 `still`)을 코드로 움직인다 —
//  달릴 때: 좌우로 기우뚱(회전) + 통통 튀기(위아래) · 가끔 멈춰 서서 숨 고르듯 살짝 흔들림 · 방향 바꾸기
// 크기: 발 y 가 위(먼 곳)일수록 작게 — 속도·튀는 높이도 같은 비율, 깊이는 발 y 순서(앞이 위)
import Phaser from 'phaser';
import { GAME_W } from '../config.js';
import { charImage } from '../objects/Mercenary.js';
import { ROSTER_BY_ID } from '../data/roster.js';

export const PARADE = {
  count: 8,
  band: [455, 520], // 발이 닿는 y 범위 (UI 좌표 — 배경 초원 지평선)
  x: [40, GAME_W - 40],
  // 원근 (2026-11-26 사용자 요청: 위로 갈수록 작게): 띠 맨 위(먼 곳) → 맨 아래(가까운 곳) 배율 — UI 1.0(화면 1.5px 도트) ~ 1.6(2.4px)
  scale: [1.0, 1.6],
  speed: [28, 46], // UI px/초
  step: 11, // 뒤뚱 박자 (라디안/초)
  tilt: 0.16, // 기우뚱 각도 (라디안)
  hop: 3, // 통통 높이 (UI px)
  run: [2.5, 6], // 한 번 달리는 시간 (초)
  rest: [0.8, 2] // 멈춰 서는 시간 (초)
};

const rnd = (a, b) => a + Math.random() * (b - a);

/** 덱에서 무작위 n명 (겹치지 않게) */
function pick(deck, n) {
  const ids = Phaser.Utils.Array.Shuffle([...new Set(deck)]).filter((id) => ROSTER_BY_ID[id]);
  return ids.slice(0, n).map((id) => ROSTER_BY_ID[id]);
}

/** 영지 장면에 행진을 만든다. 돌려줌: { list, update(dt) } — 장면 update 에서 부른다 */
export function createParade(scene, deck, depth = 1) {
  const list = pick(deck, PARADE.count).map((c, i) => {
    const y = rnd(...PARADE.band);
    const near = (y - PARADE.band[0]) / (PARADE.band[1] - PARADE.band[0]); // 0 = 먼 곳 · 1 = 가까운 곳
    const k = PARADE.scale[0] + (PARADE.scale[1] - PARADE.scale[0]) * near;
    const img = charImage(scene, rnd(...PARADE.x), y, c).setScale(k).setDepth(depth + y / 1000);
    const a = {
      img,
      c,
      footY: y,
      dir: Math.random() < 0.5 ? -1 : 1,
      speed: rnd(...PARADE.speed) * (k / PARADE.scale[1]), // 멀수록 느리게
      k: k / PARADE.scale[1],
      phase: Math.random() * Math.PI * 2,
      running: Math.random() < 0.7,
      timer: rnd(0.3, 3) + i * 0.1
    };
    face(a);
    return a;
  });
  return {
    list,
    update(dt) {
      for (const a of list) step(a, dt);
    }
  };
}

/** 그림은 왼쪽을 본다 — 오른쪽으로 가면 뒤집기 */
function face(a) {
  a.img.setFlipX(a.dir > 0);
}

function step(a, dt) {
  a.timer -= dt;
  if (a.timer <= 0) {
    a.running = !a.running;
    a.timer = a.running ? rnd(...PARADE.run) : rnd(...PARADE.rest);
    if (a.running && Math.random() < 0.45) {
      a.dir = -a.dir;
      face(a);
    }
  }
  const img = a.img;
  if (a.running) {
    a.phase += dt * PARADE.step;
    img.x += a.dir * a.speed * dt;
    // 화면 끝에 닿으면 돌아선다
    if (img.x < PARADE.x[0] || img.x > PARADE.x[1]) {
      img.x = Phaser.Math.Clamp(img.x, PARADE.x[0], PARADE.x[1]);
      a.dir = -a.dir;
      face(a);
    }
    img.rotation = Math.sin(a.phase) * PARADE.tilt;
    img.y = a.footY - Math.abs(Math.sin(a.phase)) * PARADE.hop * a.k;
  } else {
    // 멈춰 서서 숨 고르기: 아주 작게 흔들리며 똑바로 선다
    a.phase += dt * 3;
    img.rotation *= 0.85;
    img.rotation += Math.sin(a.phase) * 0.01;
    img.y = a.footY - Math.abs(Math.sin(a.phase * 0.5)) * 0.8;
  }
}
