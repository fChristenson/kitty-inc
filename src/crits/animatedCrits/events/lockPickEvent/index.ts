// the "Lock Pick" event (beam; a free floor): it covers its crit, whose click
// freezes the screen while a row of pin beams lights up over the next
// locked floor and a pick beam slides in from the screen's side under
// them; it feels along, pushing each pin up in turn with a click, a flare
// and a jolt, quicker pin by pin, until the tension beam under the lock
// wrenches round and the floor bursts open in a huge blast and shake,
// unlocked for free, as the screen unfreezes. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  easeOutBack,
  lerp,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "lockPick";
const PINS = 5;
const GAP = 46;
const PIN_H = 56;
const RAISE = 34;
const PIN_W = 12;
const PICK_W = 8;
// the pick runs this far under the pins, its hook this tall
const UNDER = 18;
const HOOK = 14;
const WRENCH = 80;
const WRENCH_W = 12;
const APPEAR_MS = 200;
const INSERT_MS = 280;
const TURN_MS = 160;
const FLARE_MS = 220;
const PIN_SHAKE: [number, number] = [0.35, 0.9];

export const forceLockPickEvent = registerWispEvent(
  KEY,
  "Lock Pick",
  () => CONFIG.lockPickEvent.chance,
  (floor, context, area) => {
    const { pinsMs, holdMs, mergeMs } = CONFIG.lockPickEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const base = lock.y + 10;
    const xs = Array.from(
      { length: PINS },
      (_, k) => lock.x + (k - (PINS - 1) / 2) * GAP,
    );
    // the pick comes in from the far side and works pin by pin towards it
    const fromLeft = lock.x > (area.left + area.right) / 2;
    const order = fromLeft ? xs.slice().reverse() : xs.slice();
    const handle: Point = {
      x: fromLeft ? area.left - 20 : area.right + 20,
      y: base + UNDER,
    };
    let clock = APPEAR_MS + INSERT_MS;
    const pins = order.map((x, k) => {
      const reaches = clock;
      const span = lerp(pinsMs, k / (PINS - 1));
      clock += span;
      return { x, reaches, starts: reaches + span * 0.4, sets: clock };
    });
    const turnsAt = clock + 80;
    const endAt = turnsAt + TURN_MS;
    const pivot: Point = { x: lock.x, y: base + UNDER + 30 };
    const enter = order[0] + (fromLeft ? 80 : -80);

    const tip: Point = { x: 0, y: 0 };
    const hook: Point = { x: 0, y: 0 };
    const pinTop: Point = { x: 0, y: 0 };
    const pinFoot: Point = { x: 0, y: 0 };
    const wrenchTo: Point = { x: 0, y: 0 };
    const tipAt = (ms: number) => {
      tip.y = base + UNDER;
      if (ms < APPEAR_MS + INSERT_MS) {
        tip.x = lerp(
          [handle.x, enter],
          easeOut(clamp01((ms - APPEAR_MS) / INSERT_MS)),
        );
        return tip;
      }
      let prev = enter;
      for (const pin of pins) {
        if (ms < pin.starts) {
          tip.x = lerp(
            [prev, pin.x],
            easeOut(clamp01((ms - pin.reaches) / (pin.starts - pin.reaches))),
          );
          return tip;
        }
        if (ms < pin.sets) {
          const u = (ms - pin.starts) / (pin.sets - pin.starts);
          tip.x = pin.x;
          tip.y -=
            RAISE *
            Math.sin(Math.PI * Math.min(1, u * 1.4)) *
            (u < 0.7 ? 1 : 0.6);
          return tip;
        }
        prev = pin.x;
      }
      tip.x = prev;
      return tip;
    };
    const liftOf = (pin: (typeof pins)[number], ms: number) =>
      ms < pin.starts
        ? 0
        : ms >= pin.sets
          ? RAISE
          : RAISE *
            easeOutBack(
              clamp01(((ms - pin.starts) / (pin.sets - pin.starts)) * 1.4),
            );

    const setting = createBeats(
      pins,
      (p) => p.sets,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(PIN_SHAKE, k / (PINS - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        cover!.blast(lock);
        if (cover!.isLive()) playExplosion();
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          setting.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          const shown = easeOut(clamp01(ms / APPEAR_MS));
          for (const pin of pins) {
            const lift = liftOf(pin, ms);
            pinFoot.x = pinTop.x = pin.x;
            pinFoot.y = base - lift;
            pinTop.y = base - lift - PIN_H * shown;
            drawBeam(
              ctx,
              pinTop,
              pinFoot,
              PIN_W,
              0.6 + (ms >= pin.sets ? 0.4 : 0),
            );
            const t = (ms - pin.sets) / FLARE_MS;
            if (t >= 0 && t < 1) drawBeamFlare(ctx, pinFoot, 26, 1 - t, now);
          }
          const at = tipAt(ms);
          drawBeam(ctx, handle, at, PICK_W, 0.9);
          hook.x = at.x + (fromLeft ? 6 : -6);
          hook.y = at.y - HOOK;
          drawBeam(ctx, at, hook, PICK_W, 0.9);
          drawBeamFlare(ctx, at, 10, 0.7, now);
          // the tension beam, wrenched round a quarter turn at the end
          const turn = easeIn(clamp01((ms - turnsAt) / TURN_MS));
          const a = Math.PI / 2 + (fromLeft ? -1 : 1) * turn * (Math.PI / 2);
          wrenchTo.x = pivot.x + Math.cos(a) * WRENCH;
          wrenchTo.y = pivot.y + Math.sin(a) * WRENCH;
          drawBeam(ctx, pivot, wrenchTo, WRENCH_W, 0.5 * shown + 0.5 * turn);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
