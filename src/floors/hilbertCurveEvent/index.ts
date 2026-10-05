// the "Hilbert Curve" event (experiment: a space-filling curve; cash): it
// covers its crit, whose click freezes the screen while a Hilbert curve of
// light snaps across the screen and refines itself, each order folding into
// four smaller copies of itself with a whoosh and a jolt, until it winds
// through every corner of the screen; then a wisp leads a river of cash
// along the finest curve, winding through every cell of it from one bottom
// corner to the other, and shoots up into the total-income readout in a
// huge blast as the cash pours in after it. Pays floor income × floor
// number × REWARD (see ../cashFlow)
import { CONFIG } from "../../config";
import { playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { bezier } from "../../shared/curves";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam } from "../../shared/beam";
import {
  pourDurationMs,
  pourLine,
  riverHead,
  totalSpot,
  type Pour,
} from "../cashFlow";

const KEY = "hilbertCurve";
const REWARD = 4;
// the previews' orders, then the river's
const PREVIEWS = [1, 2, 3];
const ORDER = 4;
// px the curve keeps from the screen's sides and bottom, and from its top
const MARGIN = 70;
const TOP = 220;
const LINE_W = 7;
const LINE_ALPHA = 0.55;
const HEAD = WISP_SIZE * 0.8;
const REFINE_SHAKE: [number, number] = [0.35, 0.8];
const POUR_SHAKE = 0.9;

// cell (x, y) of the d-th step along an order-k curve on a side x side grid
function hilbertCell(side: number, d: number): [number, number] {
  let x = 0;
  let y = 0;
  let t = d;
  for (let s = 1; s < side; s *= 2) {
    const rx = 1 & (t / 2);
    const ry = 1 & (t ^ rx);
    if (ry === 0) {
      if (rx === 1) {
        x = s - 1 - x;
        y = s - 1 - y;
      }
      [x, y] = [y, x];
    }
    x += s * rx;
    y += s * ry;
    t = Math.floor(t / 4);
  }
  return [x, y];
}

export const forceHilbertCurveEvent = registerWispEvent(
  KEY,
  "Hilbert Curve",
  () => CONFIG.hilbertCurveEvent.chance,
  (floor, context, area) => {
    const { refineMs, traceMs, streamMs, flyMs, holdMs, mergeMs } =
      CONFIG.hilbertCurveEvent;
    const left = area.left + MARGIN;
    const width = area.right - MARGIN - left;
    const bottom = area.bottom - MARGIN;
    const height = bottom - (area.top + TOP);
    // an order-k curve's points, its first cell bottom left, last bottom right
    const curve = (order: number): Point[] => {
      const side = 2 ** order;
      return Array.from({ length: side * side }, (_, d) => {
        const [x, y] = hilbertCell(side, d);
        return {
          x: left + ((x + 0.5) / side) * width,
          y: bottom - ((y + 0.5) / side) * height,
        };
      });
    };
    const previews = PREVIEWS.map(curve);
    const line = curve(ORDER);
    const pourAt = PREVIEWS.length * refineMs;
    const pour: Pour = {
      coinsAlong: 2_400,
      width: 22,
      streamMs,
      travelMs: traceMs,
    };
    const head = riverHead(line, traceMs, pourAt);
    const outAt = pourAt + traceMs;
    const inAt = outAt + flyMs;
    const end = line[line.length - 1];
    const fallback = totalSpot(area);
    const spot: Point = { x: 0, y: 0 };
    const headAt = (ms: number): Point | null => {
      if (ms > inAt) return null;
      if (ms < outAt) return head(Math.max(pourAt, ms));
      const total = cover?.total() ?? fallback;
      return bezier(
        end,
        { x: end.x, y: total.y },
        total,
        easeIn(clamp01((ms - outAt) / flyMs)),
        spot,
      );
    };
    const durationMs = Math.max(
      pourDurationMs(pourAt, pour),
      inAt + holdMs + mergeMs,
    );

    const refining = createBeats(
      previews,
      (_, k) => k * refineMs,
      (_, k) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(REFINE_SHAKE, k / (previews.length - 1)));
      },
    );
    const pouring = createBeats(
      [pourAt],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        pourLine(cover!, line, pour);
        cover!.burst(line[0], 0.6);
        shakeScreen(POUR_SHAKE);
      },
    );
    const finale = createBeats(
      [inAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          refining.tick(ms, now);
          pouring.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > inAt + 600) return;
          // each order snaps in over the last, which fades; the finest
          // preview fades as the river takes over
          for (let k = 0; k < previews.length; k++) {
            const since = ms - k * refineMs;
            if (since < 0) continue;
            const next = k + 1 < previews.length ? refineMs : traceMs * 0.5;
            const a =
              easeOut(clamp01(since / 80)) *
              (1 - clamp01((since - refineMs) / next));
            if (a <= 0) continue;
            const pts = previews[k];
            for (let i = 1; i < pts.length; i++)
              drawBeam(ctx, pts[i - 1], pts[i], LINE_W, LINE_ALPHA * a);
          }
          drawWispBetween(ctx, headAt, ms, now, HEAD, 0.9, pourAt, inAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
