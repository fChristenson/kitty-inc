// the "Magic Trick" event (mix; cash): it covers its crit, whose click
// freezes the screen while a magician wisp reaches into the clicked floor's
// button like a top hat and pulls out a river of cash that just keeps
// coming, curling in loop after loop like knotted scarves as it climbs the
// screen, every loop a pop, a "ta-da" and a jolt; at the top the magician
// whips the last of it free in a huge blast and shake, and all the cash
// sweeps into the total. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
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
import {
  pointAlong,
  measure,
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../../cashFlow";

const KEY = "magicTrick";
const REWARD = 4;
const LOOPS = 6;
const LOOP = 50;
const SWAY = 150;
const TOP = 220;
const STEPS = 160;
const MAGICIAN = 0.6;
const LOOP_SHAKE: [number, number] = [0.4, 1];

export const forceMagicTrickEvent = registerWispEvent(
  KEY,
  "Magic Trick",
  () => CONFIG.magicTrickEvent.chance,
  (floor, context, area) => {
    const { pullMs, holdMs, mergeMs } = CONFIG.magicTrickEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const top: Point = {
      x: (button.x + (area.left + area.right) / 2) / 2,
      y: area.top + TOP,
    };
    // a rising, swaying ribbon curling round LOOPS loops
    const scarf = sampleLine((u) => {
      const a = u * Math.PI * 2 * LOOPS;
      const grow = Math.sin(u * Math.PI);
      return {
        x:
          lerp([button.x, top.x], u) +
          Math.sin(u * Math.PI * 3) * SWAY * grow +
          Math.sin(a) * LOOP * grow,
        y: lerp([button.y, top.y], u) - (1 - Math.cos(a)) * LOOP * 0.6 * grow,
      };
    }, STEPS);
    const along = measure(scarf);
    const pull: Pour = {
      coinsAlong: 1400,
      width: 26,
      streamMs: pullMs * 0.8,
      travelMs: pullMs,
    };
    const loops = Array.from({ length: LOOPS }, (_, i) => {
      const u = (i + 1) / LOOPS;
      return {
        at: { ...pointAlong(scarf, along, u, { x: 0, y: 0 }) },
        ms: pullMs * u,
        i,
      };
    });
    const endAt = pullMs;
    const durationMs = Math.max(
      pourDurationMs(0, pull),
      endAt + holdMs + mergeMs,
    );
    const handAt: Point = { x: 0, y: 0 };
    const hand = (ms: number): Point =>
      pointAlong(scarf, along, ms / pullMs, handAt);

    const pulling = createBeats(
      [0],
      (ms) => ms,
      () => pourLine(cover!, scarf, pull),
    );
    const looping = createBeats(
      loops,
      (l) => l.ms,
      (l) => {
        if (l.i === LOOPS - 1) {
          cover!.blast(l.at);
          return;
        }
        cover!.burst(l.at, 0.4);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LOOP_SHAKE, l.i / (LOOPS - 2)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          pulling.tick(ms, now);
          looping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms <= endAt)
            drawWispBetween(
              ctx,
              hand,
              ms,
              now,
              WISP_SIZE * MAGICIAN,
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
);
