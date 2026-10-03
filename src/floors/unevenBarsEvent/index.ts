// the "Uneven Bars" event (wisp; free upgrade levels): it covers its crit,
// whose click freezes the screen while a gymnast wisp vaults off the
// clicked floor's button onto the end of the lowest income bar and swings
// giant circles round it, then releases into a flipping arc up onto the
// end of the next bar, and the next, each release higher and quicker;
// every catch is a flash, a jolt and free levels on that bar; the dismount
// off the top bar sticks the landing on it in a huge blast and shake. Then
// the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { findRewardBars, levelsFor } from "../eventRewards";

const KEY = "unevenBars";
const MAX_BARS = 4;
// giant circles RADIUS px round the bar's end, LOOPS of them, caught below
// the bar and let go above it
const RADIUS = 70;
const LOOPS = 1.5;
// each release flies HOP px higher than its ends, flipping FLIPS times FLIP px round
const HOP: [number, number] = [150, 280];
const FLIPS = 2;
const FLIP = 26;
const LAND_LIFT = 12;
const GYMNAST = 0.45;
const CATCH_SHAKE: [number, number] = [0.5, 1.2];

interface Piece {
  start: number;
  end: number;
  at: (u: number, into: Point) => Point;
}

export const forceUnevenBarsEvent = registerWispEvent(
  KEY,
  "Uneven Bars",
  () => CONFIG.unevenBarsEvent.chance,
  (floor, context) => {
    const { swingsMs, flightsMs, holdMs, mergeMs } = CONFIG.unevenBarsEvent;
    const bars = findRewardBars(floor, context).slice(-MAX_BARS).reverse();
    if (bars.length === 0) return;
    const n = bars.length;
    const button = getButtonCenter(context.isGroundFloor);
    const pieces: Piece[] = [];
    let clock = 0;
    const flight = (a: Point, b: Point, hop: number, ms: number) => {
      const ctrl: Point = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - hop };
      const start = clock;
      clock += ms;
      pieces.push({
        start,
        end: clock,
        at: (u, into) => {
          bezier(a, ctrl, b, u, into);
          // somersaulting round its own arc
          const spin = Math.PI * 2 * FLIPS * u;
          const r = FLIP * Math.sin(Math.PI * u);
          into.x += Math.sin(spin) * r;
          into.y -= (1 - Math.cos(spin)) * r;
          return into;
        },
      });
    };
    let from: Point = button;
    const catches = bars.map((bar, k) => {
      const u = k / Math.max(1, n - 1);
      const grip: Point = {
        x: k % 2 === 0 ? bar.box.x + bar.box.width : bar.box.x,
        y: bar.center.y,
      };
      const caught: Point = { x: grip.x, y: grip.y + RADIUS };
      flight(from, caught, lerp(HOP, u), lerp(flightsMs, u));
      const dir = k % 2 === 0 ? 1 : -1;
      const start = clock;
      clock += lerp(swingsMs, u);
      pieces.push({
        start,
        end: clock,
        at: (v, into) => {
          const a =
            Math.PI / 2 + dir * Math.PI * 2 * LOOPS * (0.4 * v + 0.6 * v * v);
          into.x = grip.x + Math.cos(a) * RADIUS;
          into.y = grip.y + Math.sin(a) * RADIUS;
          return into;
        },
      });
      from = { x: grip.x, y: grip.y - RADIUS };
      return { bar, grip, at: start };
    });
    const top = bars[n - 1];
    const landing: Point = { x: top.center.x, y: top.box.y - LAND_LIFT };
    flight(from, landing, HOP[1], flightsMs[1]);
    const endAt = clock;
    const into: Point = { x: 0, y: 0 };
    const gymnast = (ms: number): Point => {
      const t = Math.max(0, ms);
      let piece = pieces[0];
      for (const p of pieces) if (t >= p.start) piece = p;
      return piece.at(
        clamp01((t - piece.start) / (piece.end - piece.start)),
        into,
      );
    };

    const catching = createBeats(
      catches,
      (c) => c.at,
      (c, k) => {
        cover!.levels(c.bar, levelsFor(c.bar.floor), c.grip);
        cover!.burst(c.grip, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(CATCH_SHAKE, k / Math.max(1, n - 1)));
      },
    );
    const dismount = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        cover!.slam(top);
        cover!.blast(landing);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          catching.tick(ms, now);
          dismount.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms <= endAt)
            drawWispBetween(
              ctx,
              gymnast,
              ms,
              now,
              WISP_SIZE * GYMNAST,
              0.7,
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
