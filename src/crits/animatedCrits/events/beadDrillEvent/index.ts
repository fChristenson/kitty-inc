// the "Bead Drill" event (drill; a free floor): it covers its crit, whose
// click freezes the screen while a column of glowing beads of light strings
// itself up from the clicked floor's button to the next locked floor; a
// drill head screams up out of the button and bores through bead after
// bead, each biting, shuddering and bursting with sparks and a jolt,
// quicker each time, then bores into the lock and punches through it in a
// huge blast and shake, the floor unlocked for free. Then the crit's tier
// pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { drawWispHead, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDrill, planDrill, type Drill } from "../../../../shared/drill";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "beadDrill";
const BEADS = 5;
const SIZE = WISP_SIZE * 0.9;
const BEAD = 0.5;
const STRING_MS = 260;
const EXIT = 40;
const BITE_SHAKE = 0.3;
const PUSH_SHAKE = 0.2;
const POP_SHAKE: [number, number] = [0.5, 1.0];
const HIT_SHAKE = 2.4;

export const forceBeadDrillEvent = registerWispEvent(
  KEY,
  "Bead Drill",
  () => CONFIG.beadDrillEvent.chance,
  (floor, context) => {
    const { approachMs, boresMs, holdMs, mergeMs } = CONFIG.beadDrillEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const beads: Point[] = Array.from({ length: BEADS }, (_, k) => {
      const u = (k + 1) / (BEADS + 1);
      return {
        x: lerp([button.x, lock.x], u),
        y: lerp([button.y, lock.y], u),
      };
    });
    // one drill per bead, then the lock, each starting where the last came out
    let from: Point = button;
    let clock: number = STRING_MS;
    const targets = [...beads, lock];
    const drills: Drill[] = targets.map((target, k) => {
      const t = k / (targets.length - 1);
      const drill = planDrill(from, target, {
        approachMs: approachMs * lerp([1, 0.6], t),
        boreMs: lerp(boresMs, t),
        pushes: k === targets.length - 1 ? 4 : 2,
        reach: 24,
        exit: k === targets.length - 1 ? 0 : EXIT,
        exitMs: 80,
        startMs: clock,
      });
      const out = drill.at(drill.endMs);
      from = { x: out.x, y: out.y };
      clock = drill.endMs;
      return drill;
    });
    const lockDrill = drills[drills.length - 1];
    const endAt = lockDrill.through;
    const pushes = drills.flatMap((d) => d.pushes.slice(0, -1));
    const beadAts = beads.map((b) => () => b);

    const biting = createBeats(
      drills,
      (d) => d.bites,
      () => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(BITE_SHAKE);
      },
    );
    const shoving = createBeats(
      pushes,
      (ms) => ms,
      () => {
        if (cover!.isLive()) shakeScreen(PUSH_SHAKE);
      },
    );
    const popping = createBeats(
      drills,
      (d) => d.through,
      (d, k) => {
        if (d === lockDrill) {
          cover!.blast(lock);
          if (cover!.isLive()) shakeScreen(HIT_SHAKE);
          return;
        }
        cover!.burst(d.target, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(POP_SHAKE, k / Math.max(1, drills.length - 2)));
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
          biting.tick(ms, now);
          shoving.tick(ms, now);
          popping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 600) return;
          // the beads string up one after another, each gone once it's bored
          for (let k = 0; k < BEADS; k++) {
            if (ms >= drills[k].through) continue;
            const grow = easeOut(clamp01((ms - (k * STRING_MS) / BEADS) / 120));
            if (grow <= 0) continue;
            drawWispHead(
              ctx,
              beadAts[k],
              ms,
              now,
              WISP_SIZE * BEAD * grow,
              0.7,
            );
          }
          for (const d of drills) drawDrill(ctx, d, ms, now, SIZE);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
