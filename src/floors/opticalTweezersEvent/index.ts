// the "Optical Tweezers" event (beam; worker perma tiers): it covers its
// crit, whose click freezes the screen while the clicked floor's button
// spits a cluster of glowing beads up over itself; three beams of light
// blaze in from off the screen and cross in a point, an optical trap: it
// darts to a bead and locks on with a flare and a jolt, hauls it through the
// air onto a worker and presses it in, the worker climbing a perma tier;
// then back for the next, ever faster; on the last worker all three beams
// blaze wide in a huge blast. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWisp, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { bezier } from "../../shared/curves";
import {
  clamp01,
  easeOut,
  easeOutBack,
  lerp,
  smoothstep,
} from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../shared/beam";
import { findRewardWorkers, type RewardWorker } from "../eventRewards";

const KEY = "opticalTweezers";
const MAX_BEADS = 6;
const BEAD = WISP_SIZE * 0.9;
// the beads hang this high over the button, this far apart
const CLUSTER_ABOVE = 210;
const CLUSTER_GAP = 70;
const BOB = 8;
// the three beams come in at these angles from their crossing, from this far
const BEAM_ANGLES = [-Math.PI / 2, Math.PI * 0.85, Math.PI * 0.15];
const BEAM_REACH = 2200;
const BEAM_W: [number, number] = [6, 16];
const FLARE: [number, number] = [26, 60];
// each dart and haul's length, slowest first; a haul bows this far up
const PACE: [number, number] = [1.3, 0.7];
const DART_SHARE = 0.35;
const BOW = 160;
const LOCK_SHAKE = 0.3;
const PRESS_SHAKE: [number, number] = [0.5, 0.9];

interface Leg {
  bead: Point;
  worker: RewardWorker;
  startMs: number;
  lockAt: number;
  pressAt: number;
  from: Point;
  bow: Point;
}

export const forceOpticalTweezersEvent = registerWispEvent(
  KEY,
  "Optical Tweezers",
  () => CONFIG.opticalTweezersEvent.chance,
  (floor, context) => {
    const { growMs, carryMs, holdMs, mergeMs } = CONFIG.opticalTweezersEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_BEADS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const n = workers.length;
    const beads: Point[] = workers.map((_, k) => ({
      x: button.x + (k - (n - 1) / 2) * CLUSTER_GAP,
      y: button.y - CLUSTER_ABOVE - (k % 2) * CLUSTER_GAP * 0.6,
    }));

    const paces = workers.map((_, k) => lerp(PACE, k / Math.max(1, n - 1)));
    const sum = paces.reduce((a, b) => a + b, 0);
    let clock = growMs;
    let at: Point = button;
    const legs: Leg[] = workers.map((worker, k) => {
      const length = (carryMs * paces[k]) / sum;
      const bead = beads[k];
      const leg: Leg = {
        bead,
        worker,
        startMs: clock,
        lockAt: clock + length * DART_SHARE,
        pressAt: clock + length,
        from: at,
        bow: {
          x: (bead.x + worker.at.x) / 2,
          y: Math.min(bead.y, worker.at.y) - BOW,
        },
      };
      clock += length;
      at = worker.at;
      return leg;
    });
    const endMs = clock;
    const lastLeg = legs[legs.length - 1];

    // the trap's spot at ms, and whether it's holding a bead
    const trap: Point = { x: 0, y: 0 };
    const trapAt = (ms: number): Leg | null => {
      if (ms < growMs) {
        trap.x = button.x;
        trap.y = lerp([button.y, beads[0].y], easeOut(clamp01(ms / growMs)));
        return null;
      }
      for (const leg of legs) {
        if (ms > leg.pressAt) continue;
        if (ms < leg.lockAt) {
          const u = smoothstep((ms - leg.startMs) / (leg.lockAt - leg.startMs));
          trap.x = lerp([leg.from.x, leg.bead.x], u);
          trap.y = lerp([leg.from.y, leg.bead.y], u);
          return null;
        }
        bezier(
          leg.bead,
          leg.bow,
          leg.worker.at,
          smoothstep((ms - leg.lockAt) / (leg.pressAt - leg.lockAt)),
          trap,
        );
        return leg;
      }
      trap.x = lastLeg.worker.at.x;
      trap.y = lastLeg.worker.at.y;
      return null;
    };

    const opening = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const locking = createBeats(
      legs,
      (leg) => leg.lockAt,
      (leg) => {
        cover!.burst(leg.bead, 0.3);
        if (!cover!.isLive()) return;
        shakeScreen(LOCK_SHAKE);
        playBloop();
      },
    );
    const pressing = createBeats(
      legs,
      (leg) => leg.pressAt,
      (leg, k) => {
        cover!.promote(leg.worker);
        if (leg === lastLeg) {
          cover!.blast(leg.worker.at);
          return;
        }
        cover!.burst(leg.worker.at, 0.6);
        if (!cover!.isLive()) return;
        shakeScreen(lerp(PRESS_SHAKE, k / Math.max(1, n - 1)));
        playSwoosh();
      },
    );

    const beadAt = legs.map((leg, k) => {
      const spot: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms >= leg.pressAt) return null;
        if (ms >= leg.lockAt) return trapAt(ms) && trap;
        const pop = easeOutBack(clamp01(ms / growMs));
        spot.x = lerp([button.x, leg.bead.x], pop);
        spot.y =
          lerp([button.y, leg.bead.y], pop) + Math.sin(ms / 140 + k) * BOB;
        return spot;
      };
    });
    const far: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          opening.tick(ms, now);
          locking.tick(ms, now);
          pressing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs + 300) return;
          for (let k = 0; k < legs.length; k++)
            drawWisp(ctx, beadAt[k], ms, now, BEAD, 0.6);
          const holding = trapAt(ms) !== null;
          const fadeIn = clamp01(ms / growMs);
          const fadeOut = 1 - clamp01((ms - endMs) / 300);
          const blaze = ms >= endMs ? 1 : holding ? 0.75 : 0.35;
          const width = lerp(BEAM_W, ms >= endMs ? 1 : holding ? 0.5 : 0);
          for (const a of BEAM_ANGLES) {
            far.x = trap.x + Math.cos(a) * BEAM_REACH;
            far.y = trap.y + Math.sin(a) * BEAM_REACH;
            drawBeam(ctx, far, trap, width, blaze * fadeIn * fadeOut);
          }
          drawBeamFlare(
            ctx,
            trap,
            lerp(FLARE, holding || ms >= endMs ? 1 : 0),
            fadeIn * fadeOut,
            now,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
