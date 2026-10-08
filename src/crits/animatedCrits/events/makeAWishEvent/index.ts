// the "Make a Wish" event (mix; worker perma tiers and cash): it covers its
// crit, whose click freezes the screen while a river of cash arcs out of the
// clicked floor's button and pours down into a wishing-well wisp glowing at
// the bottom of the screen, which swells hotter as it drinks; then wishes
// leap out of the well one after another, each a wisp arcing high onto a
// worker, who climbs a perma tier with a flash, a pop and a jolt; the last
// wish lands in a huge blast and shake as the cash sweeps into the total.
// Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "makeAWish";
const REWARD = 2;
const MAX_WORKERS = 6;
const BOTTOM = 110;
const LOFT = 200;
const ARC = 260;
const WELL = 0.9;
const WISH = 0.35;
const LAND_SHAKE: [number, number] = [0.5, 1.2];

export const forceMakeAWishEvent = registerWispEvent(
  KEY,
  "Make a Wish",
  () => CONFIG.makeAWishEvent.chance,
  (floor, context, area) => {
    const { pourMs, travelMs, wishesMs, flightMs, holdMs, mergeMs } =
      CONFIG.makeAWishEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const well: Point = {
      x: (area.left + area.right) / 2,
      y: area.bottom - BOTTOM,
    };
    const ctrl: Point = {
      x: (button.x + well.x) / 2 + (button.x < well.x ? -ARC : ARC) * 0.3,
      y: Math.min(button.y, well.y) - ARC,
    };
    const into: Point = { x: 0, y: 0 };
    const line = sampleLine(
      (u) => ({ ...bezier(button, ctrl, well, u, into) }),
      60,
    );
    const pour: Pour = {
      coinsAlong: 520,
      width: 30,
      streamMs: pourMs,
      travelMs,
    };
    let clock: number = travelMs + pourMs * 0.5;
    const wishes = workers.map((worker, k) => {
      const leaps = clock;
      clock += lerp(wishesMs, k / Math.max(1, workers.length - 1));
      const top: Point = {
        x: (well.x + worker.at.x) / 2,
        y: Math.min(well.y, worker.at.y) - LOFT,
      };
      const at: Point = { x: 0, y: 0 };
      return {
        worker,
        leaps,
        lands: leaps + flightMs,
        at: (ms: number): Point =>
          bezier(well, top, worker.at, clamp01((ms - leaps) / flightMs), at),
      };
    });
    const last = wishes[wishes.length - 1];
    const endAt = last.lands;
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      endAt + holdMs + mergeMs,
    );
    const wellAt = (): Point => well;

    const pouring = createBeats(
      [0],
      (ms) => ms,
      () => pourLine(cover!, line, pour),
    );
    const leaping = createBeats(
      wishes,
      (w) => w.leaps,
      () => {
        if (cover?.isLive()) playBloop();
      },
    );
    const landing = createBeats(
      wishes,
      (w) => w.lands,
      (w, k) => {
        cover!.promote(w.worker);
        if (w === last) {
          cover!.blast(w.worker.at);
          return;
        }
        cover!.burst(w.worker.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, wishes.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        workers,
        tick: (ms, now) => {
          pouring.tick(ms, now);
          leaping.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          const heat = clamp01((ms - travelMs) / pourMs);
          drawWispBetween(
            ctx,
            wellAt,
            ms,
            now,
            WISP_SIZE * WELL * (0.6 + 0.4 * heat),
            heat,
            travelMs * 0.8,
            last.leaps,
          );
          for (const w of wishes)
            drawWispBetween(
              ctx,
              w.at,
              ms,
              now,
              WISP_SIZE * WISH,
              1,
              w.leaps,
              w.lands,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
