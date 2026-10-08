// the "Gift Wrap" event (mix; perma tiers for workers and cash): it covers
// its crit, whose click freezes the screen while a white-hot wisp races out
// of the clicked floor's button trailing a ribbon of flowing cash and loops
// it round worker after worker like wrapping presents, each loop pulled tight
// with a flash, a bloop and a jolt that lights the worker up a perma tier;
// then the ribbon whips up into the total, which goes off in a huge blast
// and shake. Pays floor income × floor number × REWARD, plus the tiers
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { alongRoute } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  measure,
  pourDurationMs,
  pourLine,
  riverHead,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";
import { findRewardWorkers } from "../../eventRewards";
import { WORKER_HEIGHT } from "../../../../floors/worker";

const KEY = "giftWrap";
const REWARD = 2;
const MAX_WORKERS = 5;
// each loop runs LOOP_X px either side of a worker and LOOP_Y above and below
const LOOP_X = 85;
const LOOP_Y = WORKER_HEIGHT * 0.32;
const LOOP_POINTS = 10;
const NEEDLE = 0.8;
const WRAP_SHAKE: [number, number] = [0.6, 1.4];

export const forceGiftWrapEvent = registerWispEvent(
  KEY,
  "Gift Wrap",
  () => CONFIG.giftWrapEvent.chance,
  (floor, context, area) => {
    const { travelMs, streamMs, holdMs, mergeMs } = CONFIG.giftWrapEvent;
    const fallback = totalSpot(area);
    const workers = findRewardWorkers(floor, context)
      .sort((a, b) => a.at.x - b.at.x)
      .slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    if (
      Math.abs(workers[workers.length - 1].at.x - button.x) <
      Math.abs(workers[0].at.x - button.x)
    )
      workers.reverse();
    // a full loop round each worker's middle, starting and ending at its top
    const route: Point[] = [button];
    const knots: number[] = [];
    workers.forEach((w, k) => {
      const c = { x: w.at.x, y: w.at.y - WORKER_HEIGHT * 0.1 };
      const way = k % 2 === 0 ? 1 : -1;
      for (let j = 0; j <= LOOP_POINTS; j++) {
        const a = -Math.PI / 2 + (way * Math.PI * 2 * j) / LOOP_POINTS;
        route.push({
          x: c.x + Math.cos(a) * LOOP_X,
          y: c.y + Math.sin(a) * LOOP_Y,
        });
      }
      knots.push(route.length - 1);
    });
    route.push(
      { x: (route[route.length - 1].x + fallback.x) / 2, y: fallback.y + 160 },
      fallback,
    );
    const STEPS = 220;
    const line = sampleLine((u) => alongRoute(route, u, { x: 0, y: 0 }), STEPS);
    const along = measure(line);
    const length = along[along.length - 1];
    // alongRoute spends an equal share of u on each route point, so each
    // knot's sample is its route index's share of the steps
    const knotAt = knots.map(
      (r) => line[Math.round((r / (route.length - 1)) * STEPS)],
    );
    const wraps = knots.map(
      (r) =>
        (along[Math.round((r / (route.length - 1)) * STEPS)] / length) *
        travelMs,
    );
    const pour: Pour = { coinsAlong: 240, width: 20, streamMs, travelMs };
    const needle = riverHead(line, travelMs);

    const wrapping = createBeats(
      wraps,
      (ms) => ms,
      (_, k) => {
        const t = k / Math.max(1, workers.length - 1);
        cover!.promote(workers[k]);
        cover!.burst(knotAt[k], 0.6 + 0.3 * t);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(WRAP_SHAKE, t));
      },
    );
    const finale = createBeats(
      [travelMs],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs: Math.max(
          pourDurationMs(0, pour),
          travelMs + holdMs + mergeMs,
        ),
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        workers,
        tick: (ms, now) => {
          wrapping.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            needle,
            ms,
            now,
            WISP_SIZE * NEEDLE,
            clamp01(ms / travelMs),
            0,
            travelMs,
          ),
      },
    );
    if (!cover) return;
    pourLine(cover, line, pour);
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
