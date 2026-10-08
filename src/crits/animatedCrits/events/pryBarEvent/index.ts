// the "Pry Bar" event (beam; a free floor): it covers its crit, whose click
// freezes the screen while a fulcrum wisp drops in under the building's
// locked floor and an aim laser flickers up across it into the lock; a
// long blazing beam lever slams in along it, its tip wedged in the lock,
// and its far end is heaved down in hard pumps, the tip prying the lock up
// a notch every pump with a crack, a spray of sparks and a jolt, ever
// harder; the last pump wrenches the lock open in a huge blast and shake;
// the floor bursts open, unlocked for free, as the screen unfreezes. Then
// the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "pryBar";
const PUMPS = 4;
const FULCRUM: Point = { x: -150, y: 150 };
const TIP = 40;
const HANDLE = 420;
// the lever turns PRY rad over the pumps, each pump's heave taking a share
// of its span and springing back RECOIL of it after
const PRY = 0.5;
const HEAVE = 0.35;
const RECOIL = 0.35;
const DROP_MS = 180;
const AIM_MS = 220;
const LEVER = 13;
const WISP = 0.7;
const PUMP_SHAKE: [number, number] = [0.6, 1.4];

export const forcePryBarEvent = registerWispEvent(
  KEY,
  "Pry Bar",
  () => CONFIG.pryBarEvent.chance,
  (floor, context) => {
    const { pumpsMs, holdMs, mergeMs } = CONFIG.pryBarEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const fulcrum: Point = { x: lock.x + FULCRUM.x, y: lock.y + FULCRUM.y };
    const rest = Math.atan2(lock.y - fulcrum.y, lock.x - fulcrum.x);
    const reach = Math.hypot(lock.x - fulcrum.x, lock.y - fulcrum.y) + TIP;
    const slams = DROP_MS + AIM_MS;
    let clock = slams;
    const pumps = Array.from({ length: PUMPS }, (_, k) => {
      const starts = clock;
      clock += lerp(pumpsMs, k / (PUMPS - 1));
      return { starts, ends: clock, heaves: starts + (clock - starts) * HEAVE };
    });
    const endAt = pumps[PUMPS - 1].heaves;
    const turnAt = (ms: number) => {
      let turn = 0;
      for (let k = 0; k < PUMPS; k++) {
        const p = pumps[k];
        if (ms < p.starts) break;
        const heave = easeIn(clamp01((ms - p.starts) / (p.heaves - p.starts)));
        const back =
          k === PUMPS - 1
            ? 0
            : easeOut(clamp01((ms - p.heaves) / (p.ends - p.heaves)));
        turn += (PRY / PUMPS) * (heave - RECOIL * back * (1 - k / PUMPS));
      }
      return turn;
    };
    const tip: Point = { x: 0, y: 0 };
    const handle: Point = { x: 0, y: 0 };
    const pivotAt: Point = { x: 0, y: 0 };
    const pivot = (ms: number): Point => {
      pivotAt.x = fulcrum.x;
      pivotAt.y = lerp(
        [fulcrum.y + 300, fulcrum.y],
        easeOut(clamp01(ms / DROP_MS)),
      );
      return pivotAt;
    };
    const lever = (ms: number) => {
      // turning anticlockwise lifts the tip as the handle goes down
      const a = rest - turnAt(ms);
      tip.x = fulcrum.x + Math.cos(a) * reach;
      tip.y = fulcrum.y + Math.sin(a) * reach;
      handle.x = fulcrum.x - Math.cos(a) * HANDLE;
      handle.y = fulcrum.y - Math.sin(a) * HANDLE;
    };

    const slamming = createBeats(
      [slams],
      (ms) => ms,
      () => {
        cover!.burst(lock, 0.4);
        if (cover!.isLive()) playExplosion();
      },
    );
    const prying = createBeats(
      pumps,
      (p) => p.heaves,
      (_, k) => {
        if (k === PUMPS - 1) {
          cover!.blast(lock);
          return;
        }
        cover!.burst(lock, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(PUMP_SHAKE, k / (PUMPS - 2)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          slamming.tick(ms, now);
          prying.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 200) return;
          const fade = 1 - clamp01((ms - endAt) / 200);
          lever(Math.min(ms, endAt));
          if (ms < slams) {
            if (ms > DROP_MS) drawAimLaser(ctx, handle, tip);
          } else {
            const pry = clamp01(turnAt(ms) / PRY);
            drawBeam(ctx, handle, tip, LEVER, 0.9 * fade);
            drawBeamFlare(ctx, tip, 14 + 26 * pry, fade, now);
          }
          drawWispBetween(ctx, pivot, ms, now, WISP_SIZE * WISP, 0.6, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
