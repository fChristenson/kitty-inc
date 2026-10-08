// the "Cupid" event (wisp; worker perma tiers): it covers its crit, whose
// click freezes the screen while a cupid wisp flutters up out of the clicked
// floor's button to the top of the screen and looses arrow after arrow, each
// a little wisp arcing high through the air and plunging onto a worker with
// a flash, a twang and a jolt as they climb a perma tier; it shoots ever
// faster, the last arrow landing in a huge blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "cupid";
const MAX_WORKERS = 6;
const TOP = 170;
const RISE_MS = 250;
const LOFT = 160;
const CUPID = 0.55;
const ARROW = 0.3;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

export const forceCupidEvent = registerWispEvent(
  KEY,
  "Cupid",
  () => CONFIG.cupidEvent.chance,
  (floor, context, area) => {
    const { shotsMs, flightMs, holdMs, mergeMs } = CONFIG.cupidEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const perch: Point = { x: (area.left + area.right) / 2, y: area.top + TOP };
    let clock: number = RISE_MS;
    const arrows = workers.map((worker, k) => {
      const ctrl: Point = {
        x: (perch.x + worker.at.x) / 2,
        y: Math.min(perch.y, worker.at.y) - LOFT,
      };
      const looses = clock;
      clock += lerp(shotsMs, k / Math.max(1, workers.length - 1));
      const at: Point = { x: 0, y: 0 };
      return {
        worker,
        looses,
        hits: looses + flightMs,
        at: (ms: number): Point =>
          bezier(perch, ctrl, worker.at, clamp01((ms - looses) / flightMs), at),
      };
    });
    const last = arrows[arrows.length - 1];
    const endAt = last.hits;
    const cupidAt: Point = { x: 0, y: 0 };
    const cupid = (ms: number): Point => {
      const u = easeOut(Math.min(1, ms / RISE_MS));
      cupidAt.x = lerp([button.x, perch.x], u) + Math.sin(ms / 90) * 8;
      cupidAt.y = lerp([button.y, perch.y], u) + Math.cos(ms / 70) * 5;
      return cupidAt;
    };

    const loosing = createBeats(
      arrows,
      (a) => a.looses,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const hitting = createBeats(
      arrows,
      (a) => a.hits,
      (a, k) => {
        cover!.promote(a.worker);
        if (a === last) {
          cover!.blast(a.worker.at);
          return;
        }
        cover!.burst(a.worker.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, arrows.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          loosing.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawWispBetween(
            ctx,
            cupid,
            ms,
            now,
            WISP_SIZE * CUPID,
            0.6,
            0,
            endAt,
          );
          for (const a of arrows)
            drawWispBetween(
              ctx,
              a.at,
              ms,
              now,
              WISP_SIZE * ARROW,
              1,
              a.looses,
              a.hits,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
