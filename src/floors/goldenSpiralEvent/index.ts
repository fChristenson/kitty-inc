// the "Golden Spiral" event (experiment: Fibonacci squares and the golden
// spiral; cash): it covers its crit, whose click freezes the screen while
// squares of light snap in one after another round the screen's middle,
// each as big as the last two together (1, 1, 2, 3, 5, 8, 13, 21), every
// one a pop and a jolt, quicker and harder, tiling a golden rectangle; then
// a wisp traces the golden spiral through them from the smallest square out,
// leading a river of cash round every quarter turn, and shoots off its end
// up into the total, the cash pouring in after it in a huge blast. Pays
// floor income × floor number × 4
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../sound";
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

const KEY = "goldenSpiral";
const REWARD = 4;
const SIZES = [1, 1, 2, 3, 5, 8, 13, 21];
// share of the screen's width the whole rectangle takes
const FIT = 0.9;
const ARC_STEPS = 14;
const LINE_W = 6;
const LINE_ALPHA = 0.45;
const HEAD = WISP_SIZE;
const SQUARE_SHAKE: [number, number] = [0.2, 0.9];
const POUR_SHAKE = 0.6;

interface Square {
  x: number;
  y: number;
  s: number;
  // the quarter arc through it: its centre and from/to angles (math, y up)
  cx: number;
  cy: number;
  a0: number;
}

// the squares laid round each other, in math coords (y up): each attached
// to the right, top, left then bottom of all the ones before it
function layout(): Square[] {
  const squares: Square[] = [];
  let minX = 0;
  let minY = 0;
  let maxX = 0;
  let maxY = 0;
  SIZES.forEach((s, k) => {
    // the first square takes the "down" turn so the second goes right
    const dir = k === 0 ? 3 : (k - 1) % 4;
    let x = 0;
    let y = 0;
    if (k > 0) {
      if (dir === 0) [x, y] = [maxX, minY];
      else if (dir === 1) [x, y] = [minX, maxY];
      else if (dir === 2) [x, y] = [minX - s, minY];
      else [x, y] = [minX, minY - s];
    }
    // each arc's centre is the corner it turns round
    const [cx, cy, a0] =
      dir === 0
        ? [x, y + s, -Math.PI / 2]
        : dir === 1
          ? [x, y, 0]
          : dir === 2
            ? [x + s, y, Math.PI / 2]
            : [x + s, y + s, Math.PI];
    squares.push({ x, y, s, cx, cy, a0 });
    minX = k === 0 ? x : Math.min(minX, x);
    minY = k === 0 ? y : Math.min(minY, y);
    maxX = k === 0 ? x + s : Math.max(maxX, x + s);
    maxY = k === 0 ? y + s : Math.max(maxY, y + s);
  });
  return squares;
}

export const forceGoldenSpiralEvent = registerWispEvent(
  KEY,
  "Golden Spiral",
  () => CONFIG.goldenSpiralEvent.chance,
  (floor, context, area) => {
    const { buildMs, traceMs, streamMs, flyMs, holdMs, mergeMs } =
      CONFIG.goldenSpiralEvent;
    const squares = layout();
    const minX = Math.min(...squares.map((q) => q.x));
    const maxX = Math.max(...squares.map((q) => q.x + q.s));
    const minY = Math.min(...squares.map((q) => q.y));
    const maxY = Math.max(...squares.map((q) => q.y + q.s));
    const unit = ((area.right - area.left) * FIT) / (maxX - minX);
    const midX = (area.left + area.right) / 2;
    const midY = (area.top + area.bottom) / 2;
    // math coords to the screen, centred, y flipped
    const toScreen = (x: number, y: number): Point => ({
      x: midX + (x - (minX + maxX) / 2) * unit,
      y: midY - (y - (minY + maxY) / 2) * unit,
    });
    const corners = squares.map((q) => [
      toScreen(q.x, q.y),
      toScreen(q.x + q.s, q.y),
      toScreen(q.x + q.s, q.y + q.s),
      toScreen(q.x, q.y + q.s),
    ]);
    const line: Point[] = [];
    squares.forEach((q, k) => {
      for (let i = k === 0 ? 0 : 1; i <= ARC_STEPS; i++) {
        const a = q.a0 + ((Math.PI / 2) * i) / ARC_STEPS;
        line.push(toScreen(q.cx + Math.cos(a) * q.s, q.cy + Math.sin(a) * q.s));
      }
    });
    // each square in quicker than the last
    const appears: number[] = [];
    let clock: number = 0;
    squares.forEach((_, k) => {
      appears.push(clock);
      clock += lerp(buildMs, k / (squares.length - 1));
    });
    const pourAt = clock;
    const pour: Pour = {
      coinsAlong: 2_000,
      width: 20,
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

    const building = createBeats(
      appears,
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SQUARE_SHAKE, k / (squares.length - 1)));
      },
    );
    const pouring = createBeats(
      [pourAt],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        pourLine(cover!, line, pour);
        playSwoosh();
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
          building.tick(ms, now);
          pouring.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > inAt + 600) return;
          // the squares fade as the river comes round
          const fade = 1 - clamp01((ms - outAt) / 300);
          for (let k = 0; k < squares.length; k++) {
            const since = ms - appears[k];
            if (since < 0) continue;
            const a = LINE_ALPHA * easeOut(clamp01(since / 90)) * fade;
            if (a <= 0) continue;
            const c = corners[k];
            for (let i = 0; i < 4; i++)
              drawBeam(ctx, c[i], c[(i + 1) % 4], LINE_W, a);
          }
          drawWispBetween(ctx, headAt, ms, now, HEAD, 0.9, pourAt, inAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
