// the "Pilot Hole" event (drill; levels): it covers its crit, whose click
// freezes the screen while three drills come down one after another onto
// the same spot on the clicked floor's bar, each bigger than the last like
// a machinist stepping up bits: a little one bites, stalls and bores a pilot
// hole, punching through for free levels; a bigger one drops into the same
// hole, stalls longer, juddering, and bores it wider for more; then a huge
// bit grinds in, stalling hard in a roaring gush of sparks, and bores through
// in heavy shoves for a big batch, the bar slamming. Then the crit's tier
// pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawGrind,
  planDrill,
  planGrind,
  type Grind,
} from "../../../../shared/drill";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "pilotHole";
// each bit: its size, its shoves, how far it sinks, its stall and bore (as
// shares of the config's), and its share of the levels
const BITS = [
  { size: 0.8, pushes: 4, reach: 26, stall: 0.2, bore: 0.35, levels: 1 },
  { size: 1.25, pushes: 6, reach: 38, stall: 0.45, bore: 0.55, levels: 2 },
  { size: 1.8, pushes: 8, reach: 52, stall: 1, bore: 1, levels: 4 },
];
// each drops from this high, the next arriving this long after the last is through
const DROP = 480;
const SLANT = 60;
const NEXT_GAP = 90;
const EXIT = 40;
const EXIT_MS = 140;
const BITE_SHAKE: [number, number] = [0.5, 1];
const RUMBLE_SHAKE: [number, number] = [0.15, 0.4];
const PUSH_SHAKE: [number, number] = [0.25, 0.55];
const THROUGH_SHAKE = 1.1;
const SOUND_GAP_MS = 60;

interface Bit {
  grind: Grind;
  size: number;
  levels: number;
  k: number;
}

export const forcePilotHoleEvent = registerWispEvent(
  KEY,
  "Pilot Hole",
  () => CONFIG.pilotHoleEvent.chance,
  (floor, context) => {
    const { approachMs, stallMs, boreMs, levelShare, holdMs, mergeMs } =
      CONFIG.pilotHoleEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const target: Point = { x: bar.center.x, y: bar.center.y };
    const levels = levelsFor(bar.floor, levelShare, 1);

    let startMs = 0;
    const bits: Bit[] = BITS.map((b, k) => {
      const from: Point = {
        x: target.x + (k % 2 === 0 ? -SLANT : SLANT),
        y: target.y - DROP,
      };
      const drill = planDrill(from, target, {
        approachMs,
        boreMs: boreMs * b.bore,
        pushes: b.pushes,
        reach: b.reach,
        exit: EXIT,
        exitMs: EXIT_MS,
        startMs,
      });
      const grind = planGrind(drill, stallMs * b.stall);
      startMs = grind.through + NEXT_GAP - approachMs;
      return { grind, size: WISP_SIZE * b.size, levels: levels * b.levels, k };
    });
    const last = bits[bits.length - 1];
    const endMs = last.grind.endMs;
    const step = (b: Bit) => b.k / (bits.length - 1);
    const lerpOf = ([a, z]: [number, number], b: Bit) => a + (z - a) * step(b);
    let soundAt = -Infinity;
    const thud = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playBloop();
    };

    const dropping = createBeats(
      bits,
      (b) => b.grind.drill.startMs,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const biting = createBeats(
      bits,
      (b) => b.grind.bites,
      (b, _, now) => {
        cover!.burst(target, 0.3 + 0.2 * b.k);
        if (!cover!.isLive()) return;
        shakeScreen(lerpOf(BITE_SHAKE, b));
        thud(now);
      },
    );
    const rumbles = bits.flatMap((b) =>
      b.grind.rumbles.map((ms) => ({ ms, b })),
    );
    const rumbling = createBeats(
      rumbles,
      (r) => r.ms,
      (r) => {
        if (cover!.isLive()) shakeScreen(lerpOf(RUMBLE_SHAKE, r.b));
      },
    );
    const pushes = bits.flatMap((b) => b.grind.pushes.map((ms) => ({ ms, b })));
    const shoving = createBeats(
      pushes,
      (p) => p.ms,
      (p, _, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(lerpOf(PUSH_SHAKE, p.b));
        thud(now);
      },
    );
    const punching = createBeats(
      bits,
      (b) => b.grind.through,
      (b) => {
        cover!.levels(bar, b.levels, target);
        if (b === last) {
          cover!.slam(bar);
          cover!.blast(target);
          return;
        }
        cover!.burst(target, 0.8);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(THROUGH_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => {
          dropping.tick(ms, now);
          biting.tick(ms, now);
          rumbling.tick(ms, now);
          shoving.tick(ms, now);
          punching.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs + 600) return;
          for (const b of bits)
            drawGrind(ctx, b.grind, ms, now, b.size, b.size);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
