// the "Laser Lasso" event (beam; worker perma tiers): it covers its crit,
// whose click freezes the screen while a wisp rises off the clicked
// floor's button twirling a loop of blazing light over its head like a
// lasso; it lets fly, the loop sails out on its beam of a rope and drops
// over a worker in view, then cinches tight round it with a crack, a
// flash and a jolt that lights it up a perma tier, and is yanked back for
// the next throw, ever faster; the last cinch goes off in a huge blast and
// shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { easeIn, easeOut, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "laserLasso";
const MAX_WORKERS = 5;
const SIDES = 14;
// the loop is LOOP px round, cinching to KNOT px; it twirls TWIRL px over
// the roper, seen FLAT; the roper hovers UP px over the button
const LOOP = 46;
const KNOT = 10;
const TWIRL = 60;
const FLAT = 0.35;
const UP = 70;
const BEAM = 7;
const ROPE = 4;
const ROPER = 0.6;
// shares of a throw: twirling, flying out, cinching, then yanked back
const TWIRL_SHARE = 0.3;
const FLY_SHARE = 0.3;
const CINCH_SHARE = 0.15;
const CINCH_SHAKE: [number, number] = [0.7, 1.4];

export const forceLaserLassoEvent = registerWispEvent(
  KEY,
  "Laser Lasso",
  () => CONFIG.laserLassoEvent.chance,
  (floor, context) => {
    const { riseMs, throwsMs, holdMs, mergeMs } = CONFIG.laserLassoEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const roper: Point = { x: button.x, y: button.y - UP };
    let clock: number = riseMs;
    const throws = workers.map((worker, k) => {
      const starts = clock;
      const span = lerp(throwsMs, k / Math.max(1, workers.length - 1));
      clock += span;
      return {
        worker,
        starts,
        span,
        cinched: starts + span * (TWIRL_SHARE + FLY_SHARE + CINCH_SHARE),
        flies: starts + span * TWIRL_SHARE,
      };
    });
    const last = throws[throws.length - 1];
    const endAt = last.cinched;
    // the loop's middle and size at ms, or null while it isn't out
    const loop = { x: 0, y: 0, r: 0, flat: 1 };
    const twirl: Point = { x: roper.x, y: roper.y - TWIRL };
    const loopAt = (ms: number): boolean => {
      if (ms > endAt) return false;
      let t: (typeof throws)[number] | undefined;
      for (const th of throws)
        if (ms >= th.starts && ms < th.starts + th.span) t = th;
      if (!t) return false;
      const u = (ms - t.starts) / t.span;
      if (u < TWIRL_SHARE) {
        loop.x = twirl.x;
        loop.y = twirl.y;
        loop.r = LOOP * easeOut(u / TWIRL_SHARE);
        loop.flat = FLAT;
        return true;
      }
      if (u < TWIRL_SHARE + FLY_SHARE) {
        const v = smoothstep((u - TWIRL_SHARE) / FLY_SHARE);
        loop.x = lerp([twirl.x, t.worker.at.x], v);
        loop.y = lerp([twirl.y, t.worker.at.y], v) - Math.sin(Math.PI * v) * 60;
        loop.r = LOOP;
        loop.flat = lerp([FLAT, 0.5], v);
        return true;
      }
      if (u < TWIRL_SHARE + FLY_SHARE + CINCH_SHARE) {
        const v = easeIn((u - TWIRL_SHARE - FLY_SHARE) / CINCH_SHARE);
        loop.x = t.worker.at.x;
        loop.y = t.worker.at.y;
        loop.r = lerp([LOOP, KNOT], v);
        loop.flat = 0.5;
        return true;
      }
      const v = easeIn(
        (u - TWIRL_SHARE - FLY_SHARE - CINCH_SHARE) /
          (1 - TWIRL_SHARE - FLY_SHARE - CINCH_SHARE),
      );
      loop.x = lerp([t.worker.at.x, twirl.x], v);
      loop.y = lerp([t.worker.at.y, twirl.y], v);
      loop.r = KNOT;
      loop.flat = 0.5;
      return true;
    };
    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 0, y: 0 };
    const roperAt: Point = { x: 0, y: 0 };
    const roperWisp = (ms: number): Point => {
      const u = easeOut(Math.min(1, ms / riseMs));
      roperAt.x = lerp([button.x, roper.x], u) + Math.sin(ms / 90) * 4;
      roperAt.y = lerp([button.y, roper.y], u);
      return roperAt;
    };

    const throwing = createBeats(
      throws,
      (t) => t.flies,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const cinching = createBeats(
      throws,
      (t) => t.cinched,
      (t, k) => {
        cover!.promote(t.worker);
        if (t === last) {
          cover!.blast(t.worker.at);
          return;
        }
        cover!.burst(t.worker.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CINCH_SHAKE, k / Math.max(1, throws.length - 1)));
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
          throwing.tick(ms, now);
          cinching.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          if (loopAt(ms) && loop.r > 0) {
            const spin = ms / 60;
            for (let i = 0; i < SIDES; i++) {
              const a0 = spin + (i / SIDES) * Math.PI * 2;
              const a1 = spin + ((i + 1) / SIDES) * Math.PI * 2;
              a.x = loop.x + Math.cos(a0) * loop.r;
              a.y = loop.y + Math.sin(a0) * loop.r * loop.flat;
              b.x = loop.x + Math.cos(a1) * loop.r;
              b.y = loop.y + Math.sin(a1) * loop.r * loop.flat;
              drawBeam(ctx, a, b, BEAM, 0.9);
            }
            a.x = loop.x;
            a.y = loop.y + loop.r * loop.flat;
            drawBeam(ctx, roperWisp(ms), a, ROPE, 0.7);
          }
          drawWispBetween(
            ctx,
            roperWisp,
            ms,
            now,
            WISP_SIZE * ROPER,
            0.8,
            0,
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
