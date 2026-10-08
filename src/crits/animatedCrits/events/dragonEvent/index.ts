// the "Dragon" event (mix): it covers its crit, whose click freezes the
// screen while a blazing wisp head swoops in from off its side leading the
// long body of a dragon made of flowing cash, the body rippling in waves as
// it snakes after the head through great S-bends across the screen, every
// bend a roar: a flash, a bloop, a jolt and a spray of coins; then the
// dragon rears up and dives into the total-income readout in a huge blast
// and shake, its whole body pouring in after it. Pays floor income × floor
// number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import type { CoinPath } from "../../../../floors/coins";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { alongRoute } from "../../../../shared/curves";
import { sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "dragon";
const REWARD = 4;
// the head's route, as shares of the screen across (from the side it comes
// in on) and down; then into the total
const ROUTE: Point[] = [
  { x: -0.12, y: 0.74 },
  { x: 0.3, y: 0.62 },
  { x: 0.56, y: 0.84 },
  { x: 0.86, y: 0.6 },
  { x: 0.6, y: 0.42 },
  { x: 0.28, y: 0.56 },
  { x: 0.14, y: 0.34 },
  { x: 0.46, y: 0.24 },
];
// the route points it roars on
const ROARS = [2, 3, 5, 6];
const BODY = 1_000;
const COIN = 0.75;
const THICK = 26;
const RIPPLE = 16;
const HEAD = 0.07;
const ROAR_COINS = 30;
const ROAR_REACH: [number, number] = [40, 130];
const ROAR_BURST: [number, number] = [0.6, 1.1];
const ROAR_SHAKE: [number, number] = [1, 2];

export const forceDragonEvent = registerWispEvent(
  KEY,
  "Dragon",
  () => CONFIG.dragonEvent.chance,
  (floor, context, area) => {
    const { flightMs, bodyMs, holdMs, mergeMs } = CONFIG.dragonEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const fallback = totalSpot(area);
    const flip = Math.random() < 0.5;
    const route: Point[] = [
      ...ROUTE.map((p) => ({
        x: area.left + width * (flip ? 1 - p.x : p.x),
        y: area.top + height * p.y,
      })),
      { ...fallback },
    ];
    const last = route.length - 1;
    const travelMs = flightMs + bodyMs;
    // where the head is t ms in (it waits at the total once it's there)
    const headAt = (t: number, into: Point): Point => {
      const total = cover?.total() ?? fallback;
      route[last].x = total.x;
      route[last].y = total.y;
      return alongRoute(route, clamp01(t / flightMs), into);
    };
    const head = { x: 0, y: 0 };
    const headWisp = (ms: number): Point | null =>
      ms < 0 || ms >= flightMs ? null : headAt(ms, head);

    const paths: CoinPath[] = Array.from({ length: BODY }, () => {
      const lag = bodyMs * (0.03 + 0.97 * Math.random());
      const taper = (1 - lag / bodyMs) ** 0.7;
      const offset = (Math.random() * 2 - 1) * (THICK * taper + 2);
      const at = { x: 0, y: 0 };
      const behind = { x: 0, y: 0 };
      return (f) => {
        const ms = f * travelMs;
        const t = ms - lag;
        if (t < 0) return { x: route[0].x, y: route[0].y, scale: 0 };
        headAt(t, at);
        if (t >= flightMs) return { x: at.x, y: at.y, scale: COIN };
        // sideways to the way the body's heading
        headAt(t - 12, behind);
        const dx = at.x - behind.x;
        const dy = at.y - behind.y;
        const len = Math.hypot(dx, dy) || 1;
        const fade = 1 - clamp01((t - flightMs * 0.9) / (flightMs * 0.1));
        const side =
          (offset + Math.sin(lag * 0.02 - ms * 0.015) * RIPPLE * taper) * fade;
        return {
          x: at.x - (dy / len) * side,
          y: at.y + (dx / len) * side,
          scale: COIN,
        };
      };
    });

    const roaring = createBeats(
      ROARS,
      (k) => (flightMs * k) / last,
      (k, n) => {
        const t = n / (ROARS.length - 1);
        const at = { ...route[k] };
        cover!.burst(at, lerp(ROAR_BURST, t));
        cover!.launchFrom(at, sprayTargets(at, ROAR_COINS, ROAR_REACH));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(ROAR_SHAKE, t));
      },
    );
    const finale = createBeats(
      [flightMs],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travelMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          roaring.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            headWisp,
            ms,
            now,
            Math.max(WISP_SIZE, width * HEAD),
            clamp01(ms / flightMs),
            0,
            flightMs,
          ),
      },
    );
    if (!cover) return;
    cover.trace(paths, travelMs);
    playBoostEventStream();
  },
);
