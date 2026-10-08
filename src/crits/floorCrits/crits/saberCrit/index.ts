// the saber floor crit: the number ignites into a blade of light that slashes
// across the whole screen through every bar in view, back across the other
// way, then cuts an X across its own bar, which blows
import { drawBeam } from "../../../../shared/beam";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  byHeight,
  drawText,
  along,
} from "../../critPlayer";

const SABER_IN_MS = 300;
const SABER_CUT_MS = 150;
// the pause before each cut: the sweep back, then the X's two cuts
const SABER_GAPS_MS = [0, 280, 380, 110];
const SABER_BOOM_GAP_MS = 220;
// the long cuts run through the top and bottom bars this far from their
// middles, and on past them (of the viewport's width)
const SABER_SLANT = 0.8;
const SABER_OVERRUN = 0.6;
// a lone bar's cuts slant this steeply
const SABER_LONE_SLOPE = 1.6;
// the X's half width and height
const SABER_X_W = 260;
const SABER_X_H = 200;
const SABER_BLADE = 420;
const SABER_BLADE_W = 50;
const SABER_READY_W = 40;
const SABER_CUT_W = 24;
const SABER_CUT_FADE_MS = 350;
const SABER_X_FADE_MS = 150;
const SABER_BLAST = 110;
const SABER_BOOM = 320;
const SABER_SHAKE = 0.8;
const SABER_BOOM_SHAKE = 2.4;
const SABER_TAIL_MS = 1000;

const startsAt = (k: number) => {
  let t = SABER_IN_MS + k * SABER_CUT_MS;
  for (let i = 0; i <= k; i++) t += SABER_GAPS_MS[i];
  return t;
};
const BOOM_AT = startsAt(3) + SABER_CUT_MS + SABER_BOOM_GAP_MS;

interface Cut {
  a: Point;
  b: Point;
}

// down through every bar one way, back the other, then the X on its own bar
function cuts(r: Running, bars: Point[]): Cut[] {
  const order = byHeight(bars);
  const top = order[0];
  const bottom = order[order.length - 1];
  const long = (side: number): Cut => {
    const p = along(r, bars, top, -side * SABER_SLANT);
    const q =
      top === bottom
        ? { x: p.x + side, y: p.y + SABER_LONE_SLOPE }
        : along(r, bars, bottom, side * SABER_SLANT);
    const run =
      (r.viewportWidth * SABER_OVERRUN) / Math.hypot(q.x - p.x, q.y - p.y);
    return {
      a: { x: p.x - (q.x - p.x) * run, y: p.y - (q.y - p.y) * run },
      b: { x: q.x + (q.x - p.x) * run, y: q.y + (q.y - p.y) * run },
    };
  };
  const m = bars[0];
  return [
    long(1),
    long(-1),
    {
      a: { x: m.x - SABER_X_W, y: m.y - SABER_X_H },
      b: { x: m.x + SABER_X_W, y: m.y + SABER_X_H },
    },
    {
      a: { x: m.x + SABER_X_W, y: m.y - SABER_X_H },
      b: { x: m.x - SABER_X_W, y: m.y + SABER_X_H },
    },
  ];
}

// how far along a cut it crosses a bar, 0..1
const crossing = (c: Cut, bar: Point) =>
  clamp01((bar.y - c.a.y) / (c.b.y - c.a.y));

registerFloorCrit("saberCrit", {
  plan(r, bars, hit) {
    const all = cuts(r, bars);
    for (let k = 0; k < 2; k++)
      bars.forEach((bar, i) =>
        hit(i, startsAt(k) + SABER_CUT_MS * crossing(all[k], bar)),
      );
    hit(0, startsAt(2) + SABER_CUT_MS / 2);
    hit(0, startsAt(3) + SABER_CUT_MS / 2);
    hit(0, BOOM_AT, 1);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    if (ms < SABER_IN_MS) {
      const p = ms / SABER_IN_MS;
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        sx: 1 - 0.7 * p,
        sy: 1 + 2 * p,
        rot: -0.5 * p,
        alpha: 1 - p * p,
      });
    }
    if (ms >= BOOM_AT && r.kicked === 0) {
      r.kicked = 1;
      playExplosion();
    }
    const all = cuts(r, bars);
    for (let k = 0; k < all.length; k++) {
      const { a, b } = all[k];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const dx = (b.x - a.x) / len;
      const dy = (b.y - a.y) / len;
      const since = ms - startsAt(k);
      // the blade held ready at the start of an X cut
      if (k >= 2 && since < 0 && since > -SABER_GAPS_MS[k])
        drawBeam(
          ctx,
          { x: a.x - dx * SABER_BLADE, y: a.y - dy * SABER_BLADE },
          a,
          SABER_READY_W,
          0.6 + 0.3 * Math.sin(now * 0.05),
        );
      if (since < 0) continue;
      const u = clamp01(since / SABER_CUT_MS);
      const tip = { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) };
      if (since < SABER_CUT_MS)
        drawBeam(
          ctx,
          { x: tip.x - dx * SABER_BLADE, y: tip.y - dy * SABER_BLADE },
          tip,
          SABER_BLADE_W,
        );
      // the glowing cut it leaves; the X holds until it blows
      const fade =
        since < SABER_CUT_MS
          ? 1
          : k >= 2
            ? ms < BOOM_AT
              ? 1
              : 1 - (ms - BOOM_AT) / SABER_X_FADE_MS
            : 1 - (since - SABER_CUT_MS) / SABER_CUT_FADE_MS;
      if (fade > 0) drawBeam(ctx, a, tip, SABER_CUT_W * fade, fade);
      if (k < 2)
        for (const bar of bars) {
          const v = crossing(all[k], bar);
          drawDetonation(
            ctx,
            { x: lerp(a.x, b.x, v), y: bar.y },
            since - SABER_CUT_MS * v,
            SABER_BLAST,
            now,
          );
        }
      else
        drawDetonation(
          ctx,
          bars[0],
          since - SABER_CUT_MS / 2,
          SABER_BLAST,
          now,
        );
    }
    drawDetonation(ctx, bars[0], ms - BOOM_AT, SABER_BOOM, now);
  },
  tailMs: SABER_TAIL_MS,
  shake: (step) => (step ? SABER_BOOM_SHAKE : SABER_SHAKE),
});
