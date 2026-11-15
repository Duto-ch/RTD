// RTD coin drop 2: a handful of coins burst out across the floor, bounce, settle, glint and wink out one by one.
import { Particles, P, Rng, clamp, TAU, WHITE } from "../../core/index.js";
import { GOLD, coinKit, stepCoin } from "./_rtdcoin.js";

export const meta = {
  name: "RTD coin scatter",
  desc: "A gold pop, then six coins fly out in every direction across a top-down floor, bounce with tinks of light, lie glinting and wink out one by one.",
  tags: ["spawn", "loot", "coins", "gold", "drop", "scatter", "one-shot"],
  size: [88, 80],
  origin: [44, 56],
  duration: 1.9,
  loop: false,
  fps: 24,
  bg: "ground",
  options: { palette: GOLD, coins: 6, seed: 7 },
};

export function create(o) {
  const K = coinKit(o.palette), C = K.C, R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[3]] });
  const coins = [];
  for (let i = 0; i < o.coins; i++) {
    const a = (i / o.coins) * TAU + R.range(-0.3, 0.3), sp = R.range(42, 62);
    coins.push({ gx: 0, gy: 0, z: 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.55, vz: R.range(130, 175), ph: R.range(0, TAU), w: R.range(12, 18) * R.sign(), out: 1.3 + i * 0.07, gl: R.range(0, 0.5) });
  }
  for (let i = 0; i < 7; i++) {
    const a = R.range(0, TAU), sp = R.range(30, 60);
    ps.spawn(P.STAR, 0, -5, Math.cos(a) * sp, Math.sin(a) * sp * 0.6 - 15, R.range(0.25, 0.45), R.pick([WHITE, C[6], C[5]]), R.range(0.8, 1.6));
  }
  let t = 0;
  return {
    update(dt) {
      t += dt;
      for (const c of coins) {
        if (t >= c.out && !c.gone) {
          c.gone = true;
          for (let j = 0; j < 3; j++) ps.spawn(P.STAR, c.gx, c.gy - 3, R.range(-20, 20), R.range(-30, -8), R.range(0.2, 0.35), R.pick([WHITE, C[6]]), R.range(0.6, 1.1));
        }
        if (!c.gone)
          stepCoin(c, dt, 720, (q) => {
            ps.spawn(P.STAR, q.gx, q.gy - 3, 0, -6, 0.2, WHITE, q.hits === 1 ? 1.8 : 1.2);
            ps.spawn(P.DUST, q.gx, q.gy, R.sign() * R.range(6, 14), -R.range(1, 4), 0.3, C[2], 1.2);
          });
      }
      ps.update(dt);
    },
    drawBack(p) {
      for (const c of coins) if (!c.gone) K.shadow(p, c.gx, c.gy, c.z);
      ps.draw(p, "back");
    },
    draw(p) {
      if (t < 0.08) {
        const k = t / 0.08;
        p.ellipse(0, -4, 3 + 3 * k, 2 + 2 * k, C[6], 1 - k);
        p.circle(0, -4, 3 * (1 - k) + 1, WHITE);
      }
      // back to front so near coins cover far ones
      for (const c of [...coins].sort((a, b) => a.gy - b.gy)) {
        if (c.gone) {
          const k = clamp((t - c.out) / 0.12);
          if (k < 1) K.glint(p, c.gx, c.gy - 2, Math.round(4 * (1 - k)));
          continue;
        }
        if (c.rest) {
          K.flat(p, c.gx, c.gy);
          const g = ((t + c.gl) % 0.6) / 0.6;
          if (g < 0.22) K.glint(p, c.gx - 1, c.gy - 2, Math.round(2 * Math.sin((g / 0.22) * Math.PI)));
        } else K.spin(p, c.gx, c.gy - c.z - 4, c.ph);
      }
      ps.draw(p, "front");
    },
  };
}
