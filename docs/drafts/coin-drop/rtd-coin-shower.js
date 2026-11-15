// RTD coin drop 3: a ring of gold light on the floor, then a shower of coins rains down onto a pile, glints and winks out.
import { Particles, P, Rng, clamp, ease, band, TAU, WHITE } from "../../core/index.js";
import { GOLD, coinKit, stepCoin } from "./_rtdcoin.js";

export const meta = {
  name: "RTD coin shower",
  desc: "A boss-sized reward: a ring of gold light flashes across the floor, then a dozen coins rain down from above, bounce and pile up in a glinting heap that winks out coin by coin.",
  tags: ["spawn", "loot", "coins", "gold", "reward", "boss", "rain", "one-shot"],
  size: [104, 116],
  origin: [52, 94],
  duration: 2.3,
  loop: false,
  fps: 24,
  bg: "ground",
  options: { palette: GOLD, coins: 14, seed: 11 },
};

export function create(o) {
  const K = coinKit(o.palette), C = K.C, R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[3]] });
  const coins = [];
  for (let i = 0; i < o.coins; i++) {
    const a = R.range(0, TAU), r = Math.sqrt(R.range(0, 1)) * 26;
    coins.push({ gx: Math.cos(a) * r, gy: Math.sin(a) * r * 0.5, z: R.range(62, 74), vx: 0, vy: 0, vz: -R.range(20, 60), ph: R.range(0, TAU), w: R.range(10, 16) * R.sign(), born: 0.12 + (i / o.coins) * 0.55 + R.range(0, 0.06), out: 1.65 + R.range(0, 0.35), gl: R.range(0, 0.7) });
  }
  let t = 0;
  return {
    update(dt) {
      t += dt;
      for (const c of coins) {
        if (t < c.born) continue;
        if (t >= c.out && !c.gone) {
          c.gone = true;
          ps.spawn(P.STAR, c.gx, c.gy - 3, 0, -14, 0.25, WHITE, 1.2);
        }
        if (!c.gone)
          stepCoin(c, dt, 650, (q) => {
            if (q.hits === 1) {
              ps.spawn(P.STAR, q.gx, q.gy - 3, 0, -6, 0.22, WHITE, 1.8);
              q.vx = R.range(-14, 14);
              q.vy = R.range(-5, 5);
            }
          });
      }
      ps.update(dt);
    },
    drawBack(p) {
      // the ring of gold light racing out over the floor
      const k = clamp(t / 0.35);
      if (k < 1) band(p, 0, 0, 6 + 34 * ease.outCubic(k), 0.5, 2, 1 - k, [C[3], C[5], C[6]]);
      for (const c of coins) if (t >= c.born && !c.gone) K.shadow(p, c.gx, c.gy, c.z);
    },
    draw(p) {
      if (t < 0.1) p.circle(0, -2, 3 * (1 - t / 0.1) + 1, WHITE);
      for (const c of [...coins].sort((a, b) => a.gy - b.gy)) {
        if (t < c.born) continue;
        if (c.gone) {
          const k = clamp((t - c.out) / 0.12);
          if (k < 1) K.glint(p, c.gx, c.gy - 2, Math.round(3 * (1 - k)));
          continue;
        }
        if (c.rest) {
          K.flat(p, c.gx, c.gy);
          const g = ((t + c.gl) % 0.8) / 0.8;
          if (g < 0.18) K.glint(p, c.gx - 1, c.gy - 2, Math.round(2 * Math.sin((g / 0.18) * Math.PI)));
        } else K.spin(p, c.gx, c.gy - c.z - 4, c.ph);
      }
      ps.draw(p, "front");
    },
  };
}
