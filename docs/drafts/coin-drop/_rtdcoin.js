// Shared bits for the RTD coin drops: a gold coin seen from a top-down 3/4 view.
// Ground position (gx, gy) plus height z: drawn at (gx, gy - z) with a shadow on the floor at (gx, gy).
// The spinning face follows the coin in coin-drop.js. Not an effect (the file name starts with _).
import { fit, sparkle, WHITE } from "../../core/index.js";

export const GOLD = ["#2a1606", "#5c3208", "#9a5a0c", "#d48c14", "#f5b82a", "#ffe066", "#fff6c4", "#ffffff"];
const COIN = ["..oooo..", ".ohhlmo.", "ohlmmmdo", "ohmdhmdo", "olmdhmdo", "olmmmmdo", ".oddddo.", "..oooo.."];
// lying on the floor, seen from above at a slant
const FLAT = ["..oooo..", ".ohllmo.", "olmmmmdo", ".oddddo.", "..oooo.."];

export function coinKit(palette) {
  const C = fit(palette, 8);
  const PAL = { o: C[1], h: C[6], l: C[5], m: C[4], d: C[3] };
  return {
    C,
    /** a spinning coin in the air, centred on (x, y) */
    spin(p, x, y, ph) {
      const c = Math.cos(ph), sx = Math.abs(c);
      if (sx < 0.28) {
        for (let dy = -3; dy <= 3; dy++) p.px(x, y + dy, Math.abs(dy) === 3 ? C[1] : dy < 0 ? C[6] : C[5]);
        if (sx > 0.12) for (let dy = -2; dy <= 2; dy++) p.px(x + (c > 0 ? 1 : -1), y + dy, C[3]);
        return;
      }
      const half = 4 * sx;
      for (let px = Math.floor(x - half); px < Math.ceil(x + half); px++) {
        let col = Math.floor((px + 0.5 - x) / sx + 4);
        if (col < 0 || col > 7) continue;
        if (c < 0) col = 7 - col;
        for (let row = 0; row < 8; row++) {
          const ch = COIN[row][col];
          if (ch !== ".") p.px(px, Math.round(y - 4 + row), PAL[ch]);
        }
      }
      if (sx > 0.96) p.px(x - 1, y - 2, WHITE);
    },
    /** lying flat, centred on the floor point (x, y) */
    flat(p, x, y) {
      p.sprite(FLAT, PAL, Math.round(x) - 4, Math.round(y) - 3);
    },
    /** a soft shadow on the floor, smaller the higher the coin flies */
    shadow(p, x, y, z) {
      const k = Math.max(0.35, 1 - z / 60);
      p.ellipse(x, y + 1, 3.5 * k, 1.4 * k, C[0]);
    },
    glint(p, x, y, n) {
      sparkle(p, x, y, n, WHITE, C[5], 0.35);
    },
  };
}

/** step one coin: gravity on z, bounce on the floor (z = 0) */
export function stepCoin(c, dt, g = 700, onHit) {
  if (c.rest) return;
  c.vz -= g * dt;
  c.gx += c.vx * dt;
  c.gy += c.vy * dt;
  c.z += c.vz * dt;
  c.ph += c.w * dt;
  if (c.z <= 0 && c.vz < 0) {
    c.z = 0;
    c.hits = (c.hits || 0) + 1;
    if (onHit) onHit(c);
    if (c.vz < -70) {
      c.vz *= -0.42;
      c.vx *= 0.55;
      c.vy *= 0.55;
      c.w *= 0.7;
    } else {
      c.rest = true;
      c.vx = c.vy = c.vz = 0;
    }
  }
}
