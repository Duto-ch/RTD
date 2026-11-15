// RTD coin drop 1: one coin pops out of a fallen enemy, spins, bounces twice, then flies up into the purse.
import { Particles, P, Rng, clamp, ease, WHITE } from "../../core/index.js";
import { GOLD, coinKit, stepCoin } from "./_rtdcoin.js";

export const meta = {
  name: "RTD coin pop",
  desc: "A single gold coin pops up spinning, bounces twice on the floor with a tink of light, glints, then zips upward into the purse and winks out.",
  tags: ["spawn", "loot", "coin", "gold", "drop", "pickup", "one-shot"],
  size: [40, 64],
  origin: [20, 52],
  duration: 1.3,
  loop: false,
  fps: 24,
  bg: "ground",
  options: { palette: GOLD, seed: 3 },
};

const UP = 0.82; // the coin leaves for the purse

export function create(o) {
  const K = coinKit(o.palette), C = K.C, R = new Rng(o.seed);
  const ps = new Particles({ rng: R, ground: () => 0, sparks: [WHITE, C[6], C[5], C[3]] });
  const c = { gx: 0, gy: 0, z: 4, vx: R.range(10, 16) * R.sign(), vy: R.range(2, 5), vz: 165, ph: 0, w: 16 };
  for (let i = 0; i < 4; i++) ps.spawn(P.STAR, 0, -4, R.range(-30, 30), R.range(-40, -10), R.range(0.2, 0.35), R.pick([WHITE, C[6]]), R.range(0.8, 1.4));
  let t = 0, upAt = null;
  return {
    update(dt) {
      t += dt;
      if (t < UP) {
        stepCoin(c, dt, 700, (q) => ps.spawn(P.STAR, q.gx, q.gy - 3, 0, -6, 0.2, WHITE, q.hits === 1 ? 2 : 1.3));
      } else if (upAt === null) {
        upAt = { x: c.gx, y: c.gy };
      }
      ps.update(dt);
    },
    drawBack(p) {
      if (upAt === null) K.shadow(p, c.gx, c.gy, c.z);
    },
    draw(p) {
      if (t < 0.06) {
        p.circle(0, -4, 3 + 3 * (t / 0.06), C[6]);
        p.circle(0, -4, 2, WHITE);
      }
      if (upAt === null) {
        if (c.rest) {
          K.flat(p, c.gx, c.gy);
          if (t > 0.62 && t < 0.78) K.glint(p, c.gx - 1, c.gy - 2, Math.round(3 * Math.sin(((t - 0.62) / 0.16) * Math.PI)));
        } else K.spin(p, c.gx, c.gy - c.z - 4, c.ph);
      } else {
        // zip up: fast in, a spin, a short streak below it, then a wink at the top
        const k = clamp((t - UP) / 0.3), y = upAt.y - 4 - 34 * ease.inCubic(k);
        if (k < 1) {
          K.spin(p, upAt.x, y, (t - UP) * 40);
          if (k > 0.2) p.line(upAt.x, y + 5, upAt.x, y + 5 + 8 * k, C[5], 0.6);
        } else {
          const w = clamp((t - UP - 0.3) / 0.16);
          if (w < 1) K.glint(p, upAt.x, upAt.y - 38, Math.round(4 * (1 - w)));
        }
      }
      ps.draw(p, "front");
    },
  };
}
