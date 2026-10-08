// the "Dandelion" event (wisp): it covers its crit, whose click freezes the
// screen while a puffball of tiny wisps gathers in the middle of it like a
// dandelion clock, swelling and trembling as the screen rumbles; a gust hits
// it with a whoosh, a jolt and a ring of coins, and the seeds tear off one
// after another from the windward side, streaming away across the screen in
// one sweeping, curling plume and swirling into the total-income readout,
// each a flash and the last in a huge blast and shake, and the coins sweep
// into the total. Pays floor income × floor number × REWARD (see
// ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOutBack, lerp } from "../../../../shared/easing";
import { alongRoute } from "../../../../shared/curves";
import { ringTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "dandelion";
const REWARD = 4;
// SEEDS seeds round a head DROP of the screen's height under its middle,
// PUFF of its width (or height, if less) across, swelling to SWELL that
const SEEDS = 14;
const DROP = 0.12;
const PUFF = 0.12;
const SWELL = 1.4;
const SHIVER = 3;
// the plume: blown CARRY of the screen's width downwind, curling up through
// a loop before the total
const CARRY = 0.42;
const SEED = 0.035;
const POP_MS = 200;
const RUMBLE_MS = 70;
const RUMBLE: [number, number] = [0.3, 1.1];
const GUST_COINS = 24;
const GUST_REACH: [number, number] = [30, 90];
const GUST_SHAKE = 1.8;
const HIT_BURST = 0.4;

export const forceDandelionEvent = registerWispEvent(
  KEY,
  "Dandelion",
  () => CONFIG.dandelionEvent.chance,
  (floor, context, area) => {
    const { gatherMs, tearGapMs, flightMs, holdMs, mergeMs } =
      CONFIG.dandelionEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const span = Math.min(width, height);
    const fallback = totalSpot(area);
    const head = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + height * DROP,
    };
    const way = Math.random() < 0.5 ? 1 : -1;
    const r = (span * PUFF) / 2;
    // evenly round a ring, plus a little depth so it reads as a ball
    const seeds = Array.from({ length: SEEDS }, (_, k) => {
      const a = (k / SEEDS) * Math.PI * 2;
      return { a, depth: 0.55 + 0.45 * Math.abs(Math.sin(a * 2.3)) };
    });
    // the windward side tears off first
    const order = seeds
      .map((_, k) => k)
      .sort((i, j) => -way * (Math.cos(seeds[i].a) - Math.cos(seeds[j].a)));
    const leaves: number[] = new Array(SEEDS);
    order.forEach((k, n) => (leaves[k] = gatherMs + n * tearGapMs));
    const arrivals = leaves.map((at) => at + flightMs);
    const lastIn = Math.max(...arrivals);
    const lastSeed = arrivals.indexOf(lastIn);
    const home = (k: number, ms: number, into: Point): Point => {
      const swell = lerp([1, SWELL], clamp01(ms / gatherMs));
      const t = clamp01(ms / gatherMs);
      const d = r * swell * seeds[k].depth;
      into.x =
        head.x + Math.cos(seeds[k].a) * d + Math.sin(ms * 0.9 + k) * SHIVER * t;
      into.y =
        head.y + Math.sin(seeds[k].a) * d + Math.sin(ms * 1.3 + k) * SHIVER * t;
      return into;
    };
    const routes = seeds.map(() => [] as Point[]);
    const seedAt = seeds.map((_, k) => {
      const into = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < 0 || ms >= arrivals[k]) return null;
        if (ms < leaves[k]) return home(k, ms, into);
        const route = routes[k];
        if (route.length === 0) {
          const from = home(k, leaves[k], { x: 0, y: 0 });
          const total = cover?.total() ?? fallback;
          const lift = (k / SEEDS - 0.5) * height * 0.1;
          route.push(
            from,
            {
              x: from.x + way * width * CARRY * 0.6,
              y: from.y - height * 0.04 + lift,
            },
            {
              x: head.x + way * width * CARRY,
              y: head.y - height * 0.22 + lift,
            },
            {
              x: head.x + way * width * CARRY * 0.5,
              y: total.y + height * 0.18,
            },
            total,
          );
        }
        return alongRoute(
          route,
          easeIn(clamp01((ms - leaves[k]) / flightMs)) * 0.6 +
            clamp01((ms - leaves[k]) / flightMs) * 0.4,
          into,
        );
      };
    });

    let lastRumble = -Infinity;
    const gust = createBeats(
      [gatherMs],
      (ms) => ms,
      () => {
        cover!.launchFrom(head, ringTargets(head, GUST_COINS, GUST_REACH));
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(GUST_SHAKE);
      },
    );
    const hits = createBeats(
      arrivals,
      (ms) => ms,
      (_, k) => {
        const at = cover!.total() ?? fallback;
        if (k === lastSeed) cover!.blast(at);
        else cover!.burst(at, HIT_BURST);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: lastIn + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          gust.tick(ms, now);
          hits.tick(ms, now);
          if (
            ms < gatherMs &&
            now - lastRumble >= RUMBLE_MS &&
            cover?.isLive()
          ) {
            lastRumble = now;
            shakeScreen(lerp(RUMBLE, ms / gatherMs));
          }
        },
        drawOver: (ctx, ms, now) => {
          const size =
            Math.max(WISP_SIZE * 0.6, width * SEED) *
            easeOutBack(clamp01(ms / POP_MS));
          seedAt.forEach((at, k) =>
            drawWispBetween(
              ctx,
              at,
              ms,
              now,
              size * seeds[k].depth,
              clamp01(ms / gatherMs),
              0,
              arrivals[k],
            ),
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
