// 관성 스크롤 (2026-11-21 사용자 결정): 손을 떼면 바로 멈추지 않고 미끄러지다 서서히 멈춘다.
// 끝을 넘겨 끌면 고무줄처럼 덜 따라오고(저항), 놓으면 끝으로 부드럽게 돌아온다.
// 한 축(값 하나)을 맡는다 — 2축 이동(강화 트리)은 두 개를 쓴다. 시간은 실제 시간(scene update 의 delta).

const FRICTION = 0.0032; // 속도 감쇠 (1ms 당 비율) — 클수록 빨리 멈춤
const STOP_V = 0.015; // px/ms 이하면 멈춤
const OVER = 0.35; // 끝을 넘겨 끌 때 따라오는 비율
const SPRING = 0.018; // 끝으로 돌아오는 세기 (1ms 당)
const MAX_V = 4; // px/ms 상한

export class Kinetic {
  /**
   * @param {Phaser.Scene} scene
   * @param {{ min?: number | (() => number), max?: number | (() => number), value?: number, onChange: (v: number) => void }} opts
   */
  constructor(scene, { min = 0, max = 0, value = 0, onChange }) {
    this.scene = scene;
    this.minOf = typeof min === 'function' ? min : () => min;
    this.maxOf = typeof max === 'function' ? max : () => max;
    this.value = value;
    this.onChange = onChange;
    this.v = 0;
    this.dragging = false;
    this.samples = [];
    // 실제 시간대로 (프레임이 느리면 16ms 씩 나눠 계산 — 느린 기기에서도 같은 거리·시간)
    // Phaser 의 delta 는 느린 프레임에서 부드럽게 다듬어져 실제보다 작다 → 직접 잰 실제 시간을 쓴다
    this.last = performance.now();
    this.tick = () => {
      const now = performance.now();
      let left = Math.min(now - this.last, 500);
      this.last = now;
      while (left > 0) {
        const step = Math.min(16, left);
        this.update(step);
        left -= step;
      }
    };
    scene.events.on('update', this.tick);
    scene.events.once('shutdown', () => scene.events.off('update', this.tick));
  }

  get min() {
    return this.minOf();
  }

  get max() {
    return Math.max(this.min, this.maxOf());
  }

  /** 바깥에서 위치를 바꿨을 때 값만 맞춘다 (onChange 없이) */
  sync(v) {
    this.value = v;
    if (!this.dragging) this.v = 0;
  }

  // t: 포인터 이벤트 시각(Phaser pointer.downTime·moveTime·upTime) — 프레임이 느려 움직임이 몰려 와도 실제 손 속도로 계산한다

  /** 끌기 시작: 미끄러지던 것을 멈추고 지금 값을 기준으로 */
  down(t = performance.now()) {
    this.dragging = true;
    this.v = 0;
    this.base = this.value;
    this.samples = [{ t, v: this.value }];
  }

  /** 끄는 중: 시작점에서 delta 만큼 (끝을 넘으면 저항) */
  drag(delta, t = performance.now()) {
    if (!this.dragging) return;
    let v = this.base + delta;
    if (v < this.min) v = this.min - (this.min - v) * OVER;
    else if (v > this.max) v = this.max + (v - this.max) * OVER;
    this.set(v);
    this.samples.push({ t, v });
    while (this.samples.length > 2 && t - this.samples[0].t > 100) this.samples.shift();
  }

  /** 놓기: 최근 0.1초 움직임으로 속도를 구해 미끄러진다 */
  up(t = performance.now()) {
    if (!this.dragging) return;
    this.dragging = false;
    const a = this.samples[0];
    const b = this.samples[this.samples.length - 1];
    const dt = b.t - a.t;
    this.v = dt > 8 && t - b.t < 80 ? Math.max(-MAX_V, Math.min(MAX_V, (b.v - a.v) / dt)) : 0;
  }

  /** 휠·코드로 바로 옮기기 (끝 안으로 자른다) */
  scrollBy(d) {
    this.v = 0;
    this.set(Math.max(this.min, Math.min(this.max, this.value + d)));
  }

  /** 미끄러지는 중인가 (손을 뗀 뒤 아직 움직임) */
  get moving() {
    return !this.dragging && (Math.abs(this.v) > STOP_V || this.value < this.min - 0.5 || this.value > this.max + 0.5);
  }

  update(dt) {
    if (this.dragging || !dt) return;
    const min = this.min;
    const max = this.max;
    let v = this.value;
    if (Math.abs(this.v) > STOP_V) {
      v += this.v * dt;
      this.v *= Math.pow(1 - FRICTION, dt);
      // 끝을 넘으면 더 빨리 감속
      if (v < min || v > max) this.v *= Math.pow(0.9, dt / 16.7);
    } else this.v = 0;
    // 끝 밖이면 스프링으로 돌아온다
    if (this.v === 0 || Math.abs(this.v) < STOP_V * 4) {
      if (v < min) v = min + (v - min) * Math.pow(1 - SPRING, dt);
      else if (v > max) v = max + (v - max) * Math.pow(1 - SPRING, dt);
      if (Math.abs(v - min) < 0.5 && v < min) v = min;
      if (Math.abs(v - max) < 0.5 && v > max) v = max;
    }
    if (v !== this.value) this.set(v);
  }

  set(v) {
    this.value = v;
    this.onChange(v);
  }
}
