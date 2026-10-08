// the "Drinking Straw" event (mix; worker perma tiers and cash): it covers
// its crit, whose click freezes the screen while a river of cash pours out
// of the clicked floor's button into a glowing pool at the bottom of the
// screen; then straw after straw of cash is sucked up out of the pool, each
// a river climbing up to a worker, who gulps it down with a flash, a pop
// and a jolt and climbs a perma tier, the pool shrinking as they drink;
// the last sip lands in a huge blast and shake as the cash sweeps into the
// total. Pays floor income × floor number × REWARD
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

const KEY = "drinkingStraw";
const REWARD = 2;
const MAX_WORKERS = 6;
const BOTTOM = 110;
const ABOVE = 20;
const STEPS = 30;
const POOL = 1.1;
const SIP_SHAKE: [number, number] = [0.5, 1.2];

export const forceDrinkingStrawEvent = registerWispEvent(
  KEY,
  "Drinking Straw",
  () => CONFIG.drinkingStrawEvent.chance,
  (floor, context, area) => {
    const { fillMs, sipsMs, sipMs, holdMs, mergeMs } =
      CONFIG.drinkingStrawEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const pool: Point = {
      x: (area.left + area.right) / 2,
      y: area.bottom - BOTTOM,
    };
    const into: Point = { x: 0, y: 0 };
    const ctrl: Point = {
      x: (button.x + pool.x) / 2,
      y: Math.min(button.y, pool.y) - 160,
    };
    const fillLine = sampleLine(
      (u) => ({ ...bezier(button, ctrl, pool, u, into) }),
      STEPS,
    );
    const fill: Pour = {
      coinsAlong: 520,
      width: 34,
      streamMs: fillMs * 0.7,
      travelMs: fillMs,
    };
    const sip: Pour = {
      coinsAlong: 300,
      width: 18,
      streamMs: sipMs * 0.6,
      travelMs: sipMs,
    };
    let clock: number = fillMs;
    const sips = workers.map((worker, k) => {
      const lip: Point = { x: worker.at.x, y: worker.at.y + ABOVE };
      // a straw bending a little on its way up
      const bend: Point = {
        x: lerp([pool.x, lip.x], 0.5) + (k % 2 === 0 ? 50 : -50),
        y: lerp([pool.y, lip.y], 0.5),
      };
      const line = sampleLine(
        (u) => ({ ...bezier(pool, bend, lip, u, into) }),
        STEPS,
      );
      const starts = clock;
      clock += lerp(sipsMs, k / Math.max(1, workers.length - 1));
      return { worker, line, starts, drinks: starts + sipMs };
    });
    const last = sips[sips.length - 1];
    const endAt = last.drinks;
    const durationMs = Math.max(
      pourDurationMs(last.starts, sip),
      endAt + holdMs + mergeMs,
    );
    const poolAt = (): Point => pool;

    const filling = createBeats(
      [0],
      (ms) => ms,
      () => pourLine(cover!, fillLine, fill),
    );
    const sucking = createBeats(
      sips,
      (s) => s.starts,
      (s) => pourLine(cover!, s.line, sip),
    );
    const drinking = createBeats(
      sips,
      (s) => s.drinks,
      (s, k) => {
        cover!.promote(s.worker);
        if (s === last) {
          cover!.blast(s.worker.at);
          return;
        }
        cover!.burst(s.worker.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SIP_SHAKE, k / Math.max(1, sips.length - 1)));
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
          filling.tick(ms, now);
          sucking.tick(ms, now);
          drinking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          // the pool swells as it fills and drains as they drink
          const full =
            clamp01(ms / fillMs) *
            (1 - 0.7 * clamp01((ms - fillMs) / (endAt - fillMs)));
          drawWispBetween(
            ctx,
            poolAt,
            ms,
            now,
            WISP_SIZE * POOL * (0.3 + 0.7 * full),
            full,
            fillMs * 0.5,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
