// the "Ski Tow" event (mix; worker perma tiers and cash): it covers its
// crit, whose click freezes the screen while a tow wisp hauls a long cable
// of flowing cash out of the clicked floor's button and up the screen,
// threading through every worker in turn from the lowest up, faster and
// faster; each worker the cable snags is yanked up a perma tier with a bang
// and a jolt, and at the top the tow drags the whole cable into the total in
// a huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { alongRoute } from "../../../../shared/curves";
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

const KEY = "skiTow";
const REWARD = 2;
const MAX_WORKERS = 5;
const SEGMENT = 20;
const TOW = 0.55;
const SNAG_SHAKE: [number, number] = [0.6, 1.3];

export const forceSkiTowEvent = registerWispEvent(
  KEY,
  "Ski Tow",
  () => CONFIG.skiTowEvent.chance,
  (floor, context, area) => {
    const { towMs, holdMs, mergeMs } = CONFIG.skiTowEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => b.at.y - a.at.y || a.at.x - b.at.x);
    if (workers.length === 0) return;
    const total = totalSpot(area);
    const route: Point[] = [
      getButtonCenter(context.isGroundFloor),
      ...workers.map((w) => w.at),
      total,
    ];
    const steps = (route.length - 1) * SEGMENT;
    const point: Point = { x: 0, y: 0 };
    const line = sampleLine((u) => {
      alongRoute(route, u, point);
      return { x: point.x, y: point.y };
    }, steps);
    const along = measure(line);
    const snags = workers.map((worker, j) => ({
      worker,
      ms: (towMs * along[(j + 1) * SEGMENT]) / along[steps],
      final: j === workers.length - 1,
    }));
    const pour: Pour = {
      coinsAlong: 280,
      width: 32,
      streamMs: towMs * 0.6,
      travelMs: towMs,
    };
    const head = riverHead(line, towMs);
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      towMs + holdMs + mergeMs,
    );

    const towing = createBeats(
      [0],
      (ms) => ms,
      () => pourLine(cover!, line, pour),
    );
    const snagging = createBeats(
      snags,
      (s) => s.ms,
      (s, k) => {
        cover!.promote(s.worker);
        cover!.burst(s.worker.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SNAG_SHAKE, k / Math.max(1, snags.length - 1)));
      },
    );
    const finale = createBeats(
      [towMs],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        workers,
        tick: (ms, now) => {
          towing.tick(ms, now);
          snagging.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(ctx, head, ms, now, WISP_SIZE * TOW, 0.6, 0, towMs),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
