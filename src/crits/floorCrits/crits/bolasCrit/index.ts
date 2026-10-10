// the bolas floor crit: the number flies to the top corner and flings bolas,
// two wisps on a short line of light whirling end over end, one after
// another onto the bars in view; each one hits, wraps round its bar, winding
// tighter and tighter, and blows in a pair of blasts; the last, a fat one,
// wraps round its own bar and goes off in a huge blast
import { drawBeam } from "../../../../shared/beam";
import { drawDetonation } from "../../../../shared/explosion";
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
  otherBars,
  quadratic,
  skyY,
} from "../../critPlayer/shared";

const BL_IN_MS = 220;
const BL_BOLAS = 9;
const BL_EVERY_MS = 55;
const BL_LAST_DELAY_MS = 120;
// the throwing hand: across from the middle (of the viewport's width) and
// over the top bar
const BL_HAND_X = -0.4;
const BL_ABOVE = 260;
const BL_FLY_MS = 160;
const BL_LAST_FLY_MS = 220;
const BL_LOB = 220;
// wound round its bar over BL_WRAP_MS, the weights' circle squashed flat
const BL_WRAP_MS = 90;
const BL_LAST_WRAP_MS = 170;
const BL_WRAP_SQUASH = 0.45;
// the weights: BL_R from the middle, whirling faster once they wrap
const BL_R = 60;
const BL_LAST_R = 110;
const BL_SPIN = 0.035;
const BL_WRAP_SPIN = 0.06;
const BL_SIZE = 0.6;
const BL_LAST_SIZE = 1.1;
const BL_LINE = 7;
const BL_LAST_LINE = 12;
const BL_THUNK = 80;
// its pair of blasts either side, BL_PAIR_MS apart
const BL_PAIR = 0.2;
const BL_PAIR_MS = 45;
const BL_BLAST = 170;
const BL_BOOM = 440;
const BL_CLUSTER = [-0.25, 0.25, -0.5, 0.5];
const BL_CLUSTER_MS = 45;
const BL_CLUSTER_BLAST = 170;
const BL_KICKED_BOOM = 1e6;
// shakes by step: a hit, the last one
const BL_SHAKES = [0.6, 3];
const BL_TAIL_MS = 1000;

interface Bola {
  bar: number;
  side: number;
  thrown: number;
  lands: number;
  blows: number;
  last: boolean;
  // where it wraps, kept on its bar as it scrolls
  at: Point;
  weights: [(t: number) => Point, (t: number) => Point];
}
interface Throw {
  bolas: Bola[];
  hand: Point;
}
const throws = new WeakMap<Running, Throw>();

// a weight: whirling round the bola's middle in flight, then winding in round
// its bar, squashed flat
function weightPath(b: Bola, hand: Point, k: number): (t: number) => Point {
  const r = b.last ? BL_LAST_R : BL_R;
  return (t) => {
    const flying = t < b.lands;
    const c = flying
      ? quadratic(
          hand,
          { x: (hand.x + b.at.x) / 2, y: Math.min(hand.y, b.at.y) - BL_LOB },
          b.at,
          clamp01((t - b.thrown) / (b.lands - b.thrown)),
        )
      : b.at;
    const a =
      (flying
        ? (t - b.thrown) * BL_SPIN
        : (b.lands - b.thrown) * BL_SPIN + (t - b.lands) * BL_WRAP_SPIN) +
      k * Math.PI;
    const reach = flying
      ? r
      : r * (1 - clamp01((t - b.lands) / (b.blows - b.lands)));
    return {
      x: c.x + Math.cos(a) * reach,
      y: c.y + Math.sin(a) * reach * (flying ? 1 : BL_WRAP_SQUASH),
    };
  };
}

function planThrow(bars: Point[]): Throw {
  const others = otherBars(bars);
  const hand = { x: 0, y: 0 };
  const bolas = Array.from({ length: BL_BOLAS }, (_, i): Bola => {
    const last = i === BL_BOLAS - 1;
    const thrown =
      BL_IN_MS + 10 + i * BL_EVERY_MS + (last ? BL_LAST_DELAY_MS : 0);
    const lands = thrown + (last ? BL_LAST_FLY_MS : BL_FLY_MS);
    const b: Bola = {
      bar: last ? 0 : others[i % others.length],
      side: last ? 0 : (holeHash(i, 970) * 2 - 1) * 0.7,
      thrown,
      lands,
      blows: lands + (last ? BL_LAST_WRAP_MS : BL_WRAP_MS),
      last,
      at: { x: 0, y: 0 },
      weights: [() => hand, () => hand],
    };
    b.weights = [weightPath(b, hand, 0), weightPath(b, hand, 1)];
    return b;
  });
  return { bolas, hand };
}

registerFloorCrit("bolasCrit", {
  plan(r, bars, hit) {
    const t = planThrow(bars);
    throws.set(r, t);
    for (const b of t.bolas) {
      if (b.last) {
        hit(0, b.blows, 1);
        BL_CLUSTER.forEach((_, k) =>
          hit(0, b.blows + (k + 1) * BL_CLUSTER_MS, 0),
        );
        continue;
      }
      hit(b.bar, b.lands, 0);
      hit(b.bar, b.blows, 0);
      hit(b.bar, b.blows + BL_PAIR_MS, 0);
    }
  },
  draw(ctx, r, ms, bars) {
    const t = throws.get(r);
    if (!t) return;
    const now = r.startedAt + ms;
    t.hand.x = r.viewportWidth * BL_HAND_X;
    t.hand.y = skyY(r, bars, BL_ABOVE);
    for (const b of t.bolas) {
      const at = along(r, bars, b.bar, b.side);
      b.at.x = at.x;
      b.at.y = at.y;
    }
    const fat = t.bolas[BL_BOLAS - 1];
    if (ms < BL_IN_MS) {
      const p = (ms / BL_IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        t.hand.x * p,
        t.hand.y * p,
        lerp(r.flashFont, 0, p),
      );
    }
    if (ms >= fat.blows && r.kicked < BL_KICKED_BOOM) {
      r.kicked = BL_KICKED_BOOM;
      playExplosion();
    }

    for (const b of t.bolas) {
      if (ms >= b.thrown && ms < b.blows) {
        drawBeam(
          ctx,
          b.weights[0](ms),
          b.weights[1](ms),
          b.last ? BL_LAST_LINE : BL_LINE,
          0.8,
        );
        for (let k = 0; k < 2; k++)
          drawWispBetween(
            ctx,
            b.weights[k],
            ms,
            now,
            WISP_SIZE * (b.last ? BL_LAST_SIZE : BL_SIZE),
            ms >= b.lands ? 1 : 0.5,
            b.thrown,
            b.blows,
          );
      }
      if (b.last) continue;
      drawDetonation(
        ctx,
        { x: b.at.x, y: b.at.y - BAR_HALF_H },
        ms - b.lands,
        BL_THUNK,
        now,
      );
      for (let k = 0; k < 2; k++)
        drawDetonation(
          ctx,
          along(r, bars, b.bar, b.side + (k ? BL_PAIR : -BL_PAIR)),
          ms - b.blows - k * BL_PAIR_MS,
          BL_BLAST,
          now,
        );
    }
    drawDetonation(ctx, bars[0], ms - fat.blows, BL_BOOM, now);
    for (let k = 0; k < BL_CLUSTER.length; k++)
      drawDetonation(
        ctx,
        along(r, bars, 0, BL_CLUSTER[k]),
        ms - fat.blows - (k + 1) * BL_CLUSTER_MS,
        BL_CLUSTER_BLAST,
        now,
      );
  },
  tailMs: BL_TAIL_MS,
  shake: (step) => BL_SHAKES[step] ?? BL_SHAKES[0],
});
