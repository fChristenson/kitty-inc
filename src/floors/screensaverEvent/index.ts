// the "Screensaver" event: it covers its crit, whose click freezes the screen
// while the wisp pops up and drifts dead straight at a slant like an old DVD
// screensaver, bouncing off the screen's edges, ever faster, every bounce a
// flash, a boing, a jolt and a coin knocked off the edge; until at last it
// hits a corner dead on and the corner blows in a huge blast and shake, and
// the coins sweep into the total. Pays floor income × floor number × REWARD
// (see ../moneyCover)
import { CONFIG } from "../../config";
import { playBloop } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { between, clamp01, easeOutBack, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";

const KEY = "screensaver";
const REWARD = 4;
// its box: MARGIN of the screen's width in from its edges; it travels LAPS
// times round the box's width plus height, picking up pace by SPEEDUP
const MARGIN = 0.08;
const LAPS = 2.4;
const SPEEDUP = 0.5;
const POP_MS = 160;
// the wisp, as a share of the screen's width, swelling GROW more by the end
const WISP = 0.055;
const GROW = 0.3;
// each bounce: a burst, a boing, a jolt and a coin knocked inward
const BOUNCE_BURST: [number, number] = [0.25, 0.5];
const BOUNCE_SHAKE: [number, number] = [0.4, 1.3];
const KNOCK: [number, number] = [30, 110];
const CORNER_COINS = 32;
// bounces are found by stepping its flight this many ms at a time
const SCAN_MS = 2;

// u folded back and forth into [lo, lo + span], like a bouncing ball
function fold(u: number, lo: number, span: number): number {
  const m = (((u - lo) % (span * 2)) + span * 2) % (span * 2);
  return lo + (m <= span ? m : span * 2 - m);
}

export const forceScreensaverEvent = registerWispEvent(
  KEY,
  "Screensaver",
  () => CONFIG.screensaverEvent.chance,
  (floor, context, area) => {
    const { flightMs, holdMs, mergeMs } = CONFIG.screensaverEvent;
    const width = area.right - area.left;
    const size = Math.max(WISP_SIZE, width * WISP);
    const margin = width * MARGIN;
    const lo = { x: area.left + margin, y: area.top + margin };
    const span = {
      x: area.right - area.left - margin * 2,
      y: area.bottom - area.top - margin * 2,
    };
    // the corner it ends in, and so the way it's heading at the end
    const sx = Math.random() < 0.5 ? 1 : -1;
    const sy = Math.random() < 0.5 ? 1 : -1;
    const corner = {
      x: sx === 1 ? lo.x : lo.x + span.x,
      y: sy === 1 ? lo.y : lo.y + span.y,
    };
    const distance = (span.x + span.y) * LAPS;
    const coveredAt = (ms: number) => {
      const u = clamp01(ms / flightMs);
      return distance * ((1 - SPEEDUP) * u + SPEEDUP * u * u);
    };
    // traced back from the corner, unfolded, then folded into the box
    const spotAt = (ms: number, into: Point): Point => {
      const back = (distance - coveredAt(ms)) / Math.SQRT2;
      into.x = fold(corner.x + sx * back, lo.x, span.x);
      into.y = fold(corner.y + sy * back, lo.y, span.y);
      return into;
    };
    const point = { x: 0, y: 0 };
    const wispAt = (ms: number): Point | null =>
      ms < 0 || ms >= flightMs ? null : spotAt(ms, point);

    // every bounce off an edge before the corner
    const bounces: { at: number; spot: Point; inward: Point }[] = [];
    const cell = (ms: number) => {
      const back = (distance - coveredAt(ms)) / Math.SQRT2;
      return {
        x: Math.floor((corner.x + sx * back - lo.x) / span.x),
        y: Math.floor((corner.y + sy * back - lo.y) / span.y),
      };
    };
    let last = cell(0);
    for (let ms = SCAN_MS; ms < flightMs - SCAN_MS; ms += SCAN_MS) {
      const next = cell(ms);
      if (next.x === last.x && next.y === last.y) continue;
      const spot = spotAt(ms, { x: 0, y: 0 });
      const ahead = spotAt(ms + SCAN_MS, { x: 0, y: 0 });
      bounces.push({
        at: ms,
        spot,
        inward: {
          x: next.x !== last.x ? Math.sign(ahead.x - spot.x) : 0,
          y: next.y !== last.y ? Math.sign(ahead.y - spot.y) : 0,
        },
      });
      last = next;
    }

    const beats = createBeats(
      bounces,
      (b) => b.at,
      (b, k) => bounced(b.spot, b.inward, k),
    );
    const hit = createBeats(
      [flightMs],
      (ms) => ms,
      () => cover!.blast(corner, CORNER_COINS),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: flightMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          beats.tick(ms, now);
          hit.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / flightMs);
          drawWispBetween(
            ctx,
            wispAt,
            ms,
            now,
            size * easeOutBack(clamp01(ms / POP_MS)) * (1 + GROW * heat),
            heat,
            0,
            flightMs,
          );
        },
      },
    );
    if (!cover) return;

    function bounced(spot: Point, inward: Point, k: number): void {
      const t = k / Math.max(1, bounces.length - 1);
      cover!.burst(spot, lerp(BOUNCE_BURST, t));
      const knock = between(KNOCK);
      cover!.launchFrom(spot, [
        { x: spot.x + inward.x * knock, y: spot.y + inward.y * knock },
      ]);
      if (!cover!.isLive()) return;
      playBloop();
      shakeScreen(lerp(BOUNCE_SHAKE, t));
    }
  },
);
