import { fit, hex, mix, scale, sparkle, clamp, lerp, seg, ease, rand, WHITE, TAU } from "../../core/index.js";

// A top-down (overhead) archer that faces right, so a game can rotate the whole sprite to aim.
// Origin (0, 0) is the centre of the body: rotate about it.
export const meta = {
  name: "Top-down archer",
  desc: "An archer seen from above draws from the quiver, raises the bow, pulls to the cheek, holds, looses with a string snap, then lowers it. Faces right; rotate to aim.",
  tags: ["move", "archer", "bow", "arrow", "top-down", "character", "loop"],
  size: [128, 48],
  origin: [32, 24],
  duration: 1.5,
  loop: true,
  fps: 30,
  bg: "dark",
  options: {
    palette: ["#1d2a1e", "#2f4a2c", "#4f7a3e", "#86b05a"], // hood and cloak
    leather: ["#2a1a12", "#5a3820", "#8a5a30", "#b88450"],
    wood: ["#3a2414", "#6e4422", "#a8723c", "#d8a868"],
    steel: ["#2e3648", "#5a6680", "#9aa6ba", "#dfe7f2"],
    skin: ["#6a3e2c", "#b07050", "#e0a47c"],
    fletch: ["#7a1f2c", "#c8404a"],
    string: "#e8e2d6",
    seed: 1,
  },
};

// timeline (seconds)
const REACH = 0.14, NOCK = 0.32, DRAWN = 0.62, LOOSE = 0.8, KICK = 0.92, DOWN = 1.38;
const ARROW = 20, SPEED = 420, AY = -4; // the arrow lies along y = AY, beside the cheek

const P = (x, y) => [x, y];
const L = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

// where the hands, bow and nock are at time t
function pose(t) {
  const REST_DRAW = P(-1, 6), QUIVER = P(-9, -3), REST_BOW = P(9, 5);
  const raise = t < LOOSE ? ease.inOutQuad(seg(t, 0.04, NOCK)) : 1 - ease.inOutQuad(seg(t, KICK + 0.06, DOWN));
  const grip = L(REST_BOW, P(17, AY), raise);
  const restNock = P(grip[0] - 2, grip[1]);
  const full = P(0, AY);
  let hand, nock, held = false, flex = 0;
  if (t < REACH) hand = L(REST_DRAW, QUIVER, ease.inOutQuad(seg(t, 0, REACH)));
  else if (t < NOCK) { hand = L(QUIVER, restNock, ease.inOutQuad(seg(t, REACH, NOCK))); held = true; }
  else if (t < LOOSE) {
    const k = ease.outQuad(seg(t, NOCK, DRAWN));
    hand = L(restNock, full, k); held = true; flex = k;
    if (t > DRAWN) { const tr = Math.sin(t * 90) * 0.35; hand = [hand[0] + tr * 0.4, hand[1] + tr]; }
  } else {
    // the release: the hand flies back past the ear, then drops to rest
    const kick = ease.outExpo(seg(t, LOOSE, LOOSE + 0.06));
    const back = L(full, P(-7, AY - 3), kick);
    hand = L(back, REST_DRAW, ease.inOutQuad(seg(t, KICK, DOWN)));
  }
  if (held && t >= NOCK) nock = hand; else nock = restNock;
  // the string snaps forward and rings for a moment
  let snap = 0;
  if (t >= LOOSE) { const u = t - LOOSE; snap = Math.exp(-u / 0.05) * Math.cos(u * 70) * 3; }
  return { raise, grip, hand, nock, held, flex, snap };
}

export function draw(p, t, o) {
  const C = fit(o.palette, 4), LE = fit(o.leather, 4), W = fit(o.wood, 4), ST = fit(o.steel, 4), SK = fit(o.skin, 3);
  const FL = fit(o.fletch, 2), str = hex(o.string), ink = hex("#0e0c14");
  const s = pose(t);

  // soft shadow under the body
  p.disc(1, 2, 8, hex("#000000"), 0.12);

  // quiver slung across the back, fletchings poking out at its mouth
  const taken = t >= REACH && t < DOWN ? 1 : 0;
  p.beam(-2, -4, -10, -1, 4, ink);
  p.beam(-2, -4, -10, -1, 3, LE[1]);
  p.line(-3, -5, -9, -2.5, LE[2]);
  const FT = [[-11, -2], [-12, 0], [-11, 1]];
  for (let i = taken; i < 3; i++) { p.px(FT[i][0], FT[i][1], FL[1]); p.px(FT[i][0] + 1, FT[i][1], FL[0]); }

  // shoulders, side-on: a leather jerkin with a lit ridge along the shoulders
  p.ellipse(0, 0, 9.5, 5.5, ink);
  p.ellipse(0, 0, 8.5, 4.5, LE[1]);
  p.ellipse(-1, -1, 7, 3, LE[2]);
  p.line(-7, -2, 6, -2, LE[3], (k) => 0.3 + 0.7 * Math.sin(k * Math.PI));
  p.line(-5, 3, 4, 3, LE[0]);

  // bow arm: front shoulder to the grip
  const sh = [6, AY + 2];
  limb(p, sh, s.grip, LE[1], LE[2], ink);
  // draw arm: rear shoulder, elbow out behind, hand
  const rs = [-5, AY + 2];
  const el = elbow(rs, s.hand, s.raise);
  limb(p, rs, el, C[1], C[2], ink);
  limb(p, el, s.hand, LE[1], LE[2], ink);

  // head on top: a green hood with its point trailing behind, a lit crown, nose and brow towards the target
  p.tri(-6, 1, -1, -2, -1, 3, ink);
  p.tri(-5, 1, -1, -1, -1, 2, C[1]);
  p.circle(1, 0, 4.2, ink);
  p.circle(1, 0, 3.4, C[1]);
  p.circle(0.5, -0.6, 2.4, C[2]);
  p.circle(0, -1, 1.2, C[3]);
  p.px(5, 0, SK[2]); p.px(5, 1, SK[1]); p.px(4, -1, SK[1]); p.px(4, 2, SK[0]);
  // the draw hand
  p.circle(s.hand[0], s.hand[1], 1.4, SK[1]); p.px(s.hand[0] - 0.5, s.hand[1] - 0.5, SK[2]);

  // the bow, across the line of fire, bending more as it's drawn
  const H = lerp(5, 10, s.raise), bend = 2 + 2.5 * s.flex;
  const ang = (1 - s.raise) * 0.9; // tilted down to the side when lowered
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const bowPt = (v) => { const bx = -bend * v * v, by = v * H; return [s.grip[0] + bx * ca - by * sa, s.grip[1] + bx * sa + by * ca]; };
  const tipA = bowPt(-1), tipB = bowPt(1);

  // string: tips to the nock (straight at rest, a V when drawn, ringing after the release)
  let nk = s.nock;
  if (t >= LOOSE) { const mid = L(tipA, tipB, 0.5); nk = [mid[0] + s.snap, mid[1]]; }
  p.line(tipA[0], tipA[1], nk[0], nk[1], str);
  p.line(nk[0], nk[1], tipB[0], tipB[1], str);

  // bow limbs: dark outline, wood, a lit edge, white tips
  let prev = bowPt(-1);
  for (let i = 1; i <= 20; i++) {
    const v = -1 + (i / 20) * 2, q = bowPt(v);
    const thick = 1 - Math.abs(v) * 0.5;
    p.line(prev[0] + 1, prev[1], q[0] + 1, q[1], ink);
    p.line(prev[0], prev[1], q[0], q[1], Math.abs(v) < 0.2 ? LE[2] : W[2]);
    if (thick > 0.7) p.px(q[0] - 1, q[1], W[1]);
    prev = q;
  }
  p.px(tipA[0], tipA[1], W[3]); p.px(tipB[0], tipB[1], W[3]);
  // the grip hand over the bow
  p.circle(s.grip[0], s.grip[1], 1.5, SK[1]); p.px(s.grip[0] - 0.5, s.grip[1] - 0.5, SK[2]);

  // the arrow: in the hand, nocked, drawn, then away
  if (t >= REACH && t < LOOSE) {
    let n = s.nock, dir = [1, 0];
    if (t < NOCK) { // carried from the quiver, swinging round to point at the target
      const k = seg(t, REACH, NOCK); const a = lerp(-1.3, 0, ease.outQuad(k)); dir = [Math.cos(a), Math.sin(a)];
      n = [s.hand[0] - dir[0] * 4, s.hand[1] - dir[1] * 4];
    }
    arrow(p, n, dir, 1, W, ST, FL, ink);
    if (t > DRAWN) { const g = seg(t, DRAWN, LOOSE); if (g > 0.3 && g < 0.75) sparkle(p, n[0] + ARROW - 1, n[1] - 1, Math.round(2 * Math.sin(((g - 0.3) / 0.45) * Math.PI)), WHITE, ST[3], 0.35); }
  } else if (t >= LOOSE) {
    const u = t - LOOSE, x = u * SPEED, right = 128 - 32 - 2;
    const fade = (x + ARROW) < right ? 1 : 0;
    if (fade > 0) {
      // air streaks peeling off behind
      for (let i = 0; i < 3; i++) {
        const len = 8 + (i === 1 ? 10 : 4), yy = AY + (i - 1) * 2;
        if (u > 0.01 * i) p.line(x - 3, yy, x - 3 - len, yy, (k) => mix(mix(hex("#b8c8e8"), WHITE, 0.3), hex("#262636"), k * (i === 1 ? 1 : 1.3)));
      }
      arrow(p, [x, AY], [1, 0], 1, W, ST, FL, ink);
    }
    // the release: a white flash on the string and a puff of light at the bow
    if (u < 0.05) { p.glow(s.grip[0], s.grip[1], 6, WHITE, 0.6 * (1 - u / 0.05)); p.px(nk[0], nk[1], WHITE); }
    if (u < 0.12) p.glow(nk[0], nk[1], 4, str, 0.4 * (1 - u / 0.12));
  }
}

function arrow(p, n, d, a, W, ST, FL, ink) {
  const tx = n[0] + d[0] * ARROW, ty = n[1] + d[1] * ARROW;
  p.line(n[0], n[1], tx, ty, W[2], a);
  p.line(n[0] + 2 * d[0] + d[1], n[1] + 2 * d[1] - d[0] * 1, n[0] + 4 * d[0], n[1] + 4 * d[1], FL[1], a);
  p.line(n[0] + 2 * d[0] - d[1], n[1] + 2 * d[1] + d[0] * 1, n[0] + 4 * d[0], n[1] + 4 * d[1], FL[0], a);
  p.dot(tx, ty, ST[3], a);
  p.dot(tx - d[0], ty - d[1], ST[2], a);
  p.dot(tx - d[0] + d[1], ty - d[1] - d[0], ST[1], a);
  p.dot(tx - d[0] - d[1], ty - d[1] + d[0], ST[1], a);
}

function limb(p, a, b, c, lit, ink) {
  p.beam(a[0], a[1], b[0], b[1], 3, ink);
  p.beam(a[0], a[1], b[0], b[1], 2, c);
  p.line(a[0], a[1] - 0.5, b[0], b[1] - 0.5, lit);
}

function elbow(s, h, raise) {
  const mx = (s[0] + h[0]) / 2, my = (s[1] + h[1]) / 2;
  const d = Math.hypot(h[0] - s[0], h[1] - s[1]), out = Math.max(0, 15 - d) * 0.6;
  return [mx - out * 0.5, my - out * (0.6 + 0.4 * raise)];
}
