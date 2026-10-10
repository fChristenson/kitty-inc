// the grenades floor crit: the number flies to the top corner and lobs
// grenades, fuses fizzing, one after another onto the bars in view; each
// lands, skips twice along its bar with a pop on every touch and blows on the
// third; the last, a fat one, skips along its own bar and goes off in a huge
// blast and a cluster
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  drawText,
  along,
} from "../../critPlayer";
import {
  BAR_HALF_H,
  holeHash,
  ownLast,
  quadratic,
  skyY,
} from "../../critPlayer/shared";

const GR_IN_MS = 220;
const GR_NADES = 9;
const GR_EVERY_MS = 70;
const GR_LAST_DELAY_MS = 140;
// the throwing hand: across from the middle (of the viewport's width) and
// over the top bar
const GR_HAND_X = -0.4;
const GR_ABOVE = 280;
const GR_FLY_MS = 200;
const GR_LOB = 260;
// three touches a grenade, a skip apart along its bar (of its half width)
const GR_TOUCHES = 3;
const GR_SKIP_MS = 80;
const GR_SKIP = 0.22;
const GR_LAST_SKIP = 0.3;
const GR_HOP = 60;
const GR_SIZE = 0.9;
const GR_LAST_SIZE = 1.6;
const GR_FUSE = 70;
const GR_LAST_FUSE = 120;
const GR_POP = 70;
const GR_BLAST = 170;
const GR_BOOM = 440;
// the fat one's cluster out along its bar
const GR_CLUSTER = [-0.25, 0.25, -0.5, 0.5];
const GR_CLUSTER_MS = 45;
const GR_CLUSTER_BLAST = 170;
const GR_KICKED_BOOM = 1e6;
// shakes by step: a touch, the fat one
const GR_SHAKES = [0.5, 3];
const GR_TAIL_MS = 1000;

interface Nade {
  bar: number;
  // its touches' places along its bar, and when it lands on each
  sides: number[];
  touches: number[];
  thrown: number;
  last: boolean;
  // where its touches are and the hand it's thrown from this frame, and its
  // path through them, built once
  spots: Point[];
  hand: Point;
  path: (t: number) => Point;
  trail: (t: number) => Point;
}
const throws = new WeakMap<Running, Nade[]>();

function nadePath(n: Nade): (t: number) => Point {
  const { spots, hand } = n;
  return (t) => {
    if (t < n.touches[0])
      return quadratic(
        hand,
        {
          x: (hand.x + spots[0].x) / 2,
          y: Math.min(hand.y, spots[0].y) - GR_LOB,
        },
        spots[0],
        clamp01((t - n.thrown) / GR_FLY_MS),
      );
    const k = Math.min(
      GR_TOUCHES - 2,
      Math.floor((t - n.touches[0]) / GR_SKIP_MS),
    );
    const a = spots[k];
    const b = spots[k + 1];
    return quadratic(
      a,
      { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - GR_HOP },
      b,
      clamp01((t - n.touches[k]) / GR_SKIP_MS),
    );
  };
}

function planNades(bars: Point[]): Nade[] {
  const order = ownLast(bars);
  const others = order.length > 1 ? order.slice(0, -1) : order;
  return Array.from({ length: GR_NADES }, (_, i) => {
    const last = i === GR_NADES - 1;
    const skip = last ? GR_LAST_SKIP : GR_SKIP;
    const first = last ? -0.6 : lerp(-0.85, 0.85 - 2 * skip, holeHash(i, 940));
    const thrown =
      GR_IN_MS + 20 + i * GR_EVERY_MS + (last ? GR_LAST_DELAY_MS : 0);
    const n: Nade = {
      bar: last ? 0 : others[i % others.length],
      sides: Array.from({ length: GR_TOUCHES }, (_, k) => first + k * skip),
      touches: Array.from(
        { length: GR_TOUCHES },
        (_, k) => thrown + GR_FLY_MS + k * GR_SKIP_MS,
      ),
      thrown,
      last,
      spots: Array.from({ length: GR_TOUCHES }, () => ({ x: 0, y: 0 })),
      hand: { x: 0, y: 0 },
      path: () => n.hand,
      trail: () => n.hand,
    };
    const path = nadePath(n);
    n.path = path;
    n.trail = (t) => path(Math.max(thrown, t));
    return n;
  });
}

registerFloorCrit("grenadesCrit", {
  plan(r, bars, hit) {
    const nades = planNades(bars);
    throws.set(r, nades);
    for (const n of nades) {
      n.touches.forEach((at, k) =>
        hit(n.bar, at, n.last && k === GR_TOUCHES - 1 ? 1 : 0),
      );
      if (n.last)
        GR_CLUSTER.forEach((_, k) =>
          hit(n.bar, n.touches[GR_TOUCHES - 1] + (k + 1) * GR_CLUSTER_MS, 0),
        );
    }
  },
  draw(ctx, r, ms, bars) {
    const nades = throws.get(r);
    if (!nades) return;
    const now = r.startedAt + ms;
    const hand = { x: r.viewportWidth * GR_HAND_X, y: skyY(r, bars, GR_ABOVE) };
    const fat = nades[GR_NADES - 1];
    const boom = fat.touches[GR_TOUCHES - 1];
    if (ms < GR_IN_MS) {
      const p = (ms / GR_IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        hand.x * p,
        hand.y * p,
        lerp(r.flashFont, 0, p),
      );
    }
    if (ms >= boom && r.kicked < GR_KICKED_BOOM) {
      r.kicked = GR_KICKED_BOOM;
      playExplosion();
    }

    for (const n of nades) {
      n.hand.x = hand.x;
      n.hand.y = hand.y;
      // its touches on top of its bar, kept there as the bar scrolls
      for (let k = 0; k < GR_TOUCHES; k++) {
        const at = along(r, bars, n.bar, n.sides[k]);
        n.spots[k].x = at.x;
        n.spots[k].y = at.y - BAR_HALF_H;
      }
      const end = n.touches[GR_TOUCHES - 1];
      if (ms >= n.thrown && ms < end)
        drawLitFuse(
          ctx,
          n.path(ms),
          (ms - n.thrown) / (end - n.thrown),
          n.last ? GR_LAST_FUSE : GR_FUSE,
          now,
        );
      drawWispBetween(
        ctx,
        n.trail,
        ms,
        now,
        WISP_SIZE * (n.last ? GR_LAST_SIZE : GR_SIZE),
        0.6,
        n.thrown,
        end,
      );
      for (let k = 0; k < GR_TOUCHES; k++) {
        const third = k === GR_TOUCHES - 1;
        drawDetonation(
          ctx,
          along(r, bars, n.bar, n.sides[k]),
          ms - n.touches[k],
          third ? (n.last ? GR_BOOM : GR_BLAST) : GR_POP,
          now,
        );
      }
    }
    const blew = fat.sides[GR_TOUCHES - 1];
    for (let k = 0; k < GR_CLUSTER.length; k++)
      drawDetonation(
        ctx,
        along(
          r,
          bars,
          fat.bar,
          Math.max(-1, Math.min(1, blew + GR_CLUSTER[k])),
        ),
        ms - boom - (k + 1) * GR_CLUSTER_MS,
        GR_CLUSTER_BLAST,
        now,
      );
  },
  tailMs: GR_TAIL_MS,
  shake: (step) => GR_SHAKES[step] ?? GR_SHAKES[0],
});
