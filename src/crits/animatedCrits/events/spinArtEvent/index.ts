// the "Spin Art" event (mix; worker perma tiers and cash): it covers its
// crit, whose click freezes the screen while two wisps whirl round each
// other in the middle of the screen like a spin-art turntable and a river
// of cash pours into them out of the clicked floor's button; the whirl
// flings it back out in curling streaks that splat onto worker after
// worker with a bang and a jolt, each climbing a perma tier, quicker each
// time, the last splat a huge blast and shake as the cash pours into the
// total. Pays floor income × floor number × REWARD, plus the tiers
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "spinArt";
const REWARD = 2;
const MAX_WORKERS = 6;
const ORBIT = 34;
// turns a second the spinner whirls, and how far (rad) a streak curls
const SPIN: [number, number] = [2, 5];
const CURL = 1.6;
const SPLAT = 10;
const WISP = 0.5;
const SPLAT_SHAKE: [number, number] = [0.6, 1.4];

export const forceSpinArtEvent = registerWispEvent(
  KEY,
  "Spin Art",
  () => CONFIG.spinArtEvent.chance,
  (floor, context, area) => {
    const { feedMs, flingsMs, flightMs, holdMs, mergeMs } = CONFIG.spinArtEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const mid: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    let clock = feedMs;
    const flings = workers.map((worker, k) => {
      const flies = clock;
      clock += lerp(flingsMs, k / Math.max(1, workers.length - 1));
      const dx = worker.at.x - mid.x;
      const dy = worker.at.y - mid.y;
      const reach = Math.hypot(dx, dy);
      const aim = Math.atan2(dy, dx);
      const line = sampleLine((u) => {
        // trailing the whirl, straightening out onto the worker
        const a = aim + CURL * (1 - u) ** 2;
        return {
          x: mid.x + Math.cos(a) * reach * u,
          y: mid.y + Math.sin(a) * reach * u,
        };
      }, 40);
      return { worker, flies, splats: flies + flightMs, line };
    });
    const last = flings[flings.length - 1];
    const endAt = last.splats;
    const feed: Pour = {
      coinsAlong: 160,
      width: 30,
      streamMs: last.flies,
      travelMs: feedMs,
    };
    const fling: Pour = {
      coinsAlong: 200,
      width: 26,
      streamMs: 140,
      travelMs: flightMs,
    };
    const feedLine = sampleLine(
      (u) => ({
        x: lerp([button.x, mid.x], u),
        y: lerp([button.y, mid.y], u) - Math.sin(Math.PI * u) * 120,
      }),
      30,
    );
    const durationMs = Math.max(
      pourDurationMs(last.flies, fling),
      endAt + holdMs + mergeMs,
    );
    // the whirl's angle, spinning up from SPIN[0] to SPIN[1] turns a second
    const turn = (ms: number) => {
      const t = Math.max(0, ms) / 1000;
      const span = endAt / 1000;
      return (
        Math.PI * 2 * (SPIN[0] * t + ((SPIN[1] - SPIN[0]) * t * t) / (2 * span))
      );
    };
    const spinners = [0, Math.PI].map((offset) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        const a = turn(ms) + offset;
        at.x = mid.x + Math.cos(a) * ORBIT;
        at.y = mid.y + Math.sin(a) * ORBIT;
        return at;
      };
    });

    const pouring = createBeats(
      [0, ...flings.map((f) => f.flies)],
      (ms) => ms,
      (_, k) => {
        if (k === 0) pourLine(cover!, feedLine, feed);
        else pourLine(cover!, flings[k - 1].line, fling);
      },
    );
    const splatting = createBeats(
      flings,
      (f) => f.splats,
      (f, k) => {
        cover!.promote(f.worker);
        if (f === last) {
          cover!.blast(f.worker.at);
          return;
        }
        cover!.burst(f.worker.at, 0.6);
        cover!.launchFrom(
          f.worker.at,
          clampTargetsY(
            sprayTargets(f.worker.at, SPLAT, [50, 160]),
            area.top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SPLAT_SHAKE, k / Math.max(1, flings.length - 1)));
      },
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
          pouring.tick(ms, now);
          splatting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          for (const spinner of spinners)
            drawWispBetween(
              ctx,
              spinner,
              ms,
              now,
              WISP_SIZE * WISP,
              0.7,
              0,
              last.flies,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
