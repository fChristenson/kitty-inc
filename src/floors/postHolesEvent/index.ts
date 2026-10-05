// the "Post Holes" event (drill; free hires): it covers its crit, whose
// click freezes the screen while drills dive out of the air one after
// another onto the empty spots on the floors in view; each bites into the
// floor and stalls, juddering and rumbling, sparks gushing out both sides,
// then grinds down in heavy shoves until it punches through in a blast, and
// a new worker springs up out of the hole. Then the crit's tier pays out
import { CONFIG } from "../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../sound";
import { shakeScreen } from "../../screenShake";
import { WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { createBeats } from "../../shared/eventBeats";
import {
  drawGrind,
  planDrill,
  planGrind,
  type Grind,
} from "../../shared/drill";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../eventRewards";

const KEY = "postHoles";
const MAX_HOLES = 3;
// each drill dives from this high, angled in from alternate sides
const DIVE = 520;
const SLANT = 140;
const PUSHES = 8;
const REACH = 40;
const DRILL = WISP_SIZE * 1.3;
const SPRAY = WISP_SIZE * 1.3;
const BITE_SHAKE = 0.7;
const RUMBLE_SHAKE = 0.3;
const PUSH_SHAKE = 0.45;
const THROUGH_SHAKE = 1.2;
const SOUND_GAP_MS = 60;

interface Hole {
  hire: RewardHire;
  grind: Grind;
}

export const forcePostHolesEvent = registerWispEvent(
  KEY,
  "Post Holes",
  () => CONFIG.postHolesEvent.chance,
  (floor, context) => {
    const { approachMs, stallMs, boreMs, staggerMs, holdMs, mergeMs } =
      CONFIG.postHolesEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HOLES);
    if (hires.length === 0) return;
    const holes: Hole[] = hires.map((hire, k) => {
      const target: Point = { x: hire.x, y: hire.y };
      const from: Point = {
        x: hire.x + (k % 2 === 0 ? -SLANT : SLANT),
        y: hire.y - DIVE,
      };
      const drill = planDrill(from, target, {
        approachMs,
        boreMs,
        pushes: PUSHES,
        reach: REACH,
        startMs: k * staggerMs,
      });
      return { hire, grind: planGrind(drill, stallMs) };
    });
    const last = holes[holes.length - 1];
    const endMs = Math.max(...holes.map((h) => h.grind.endMs));
    let soundAt = -Infinity;
    const thud = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playBloop();
    };

    const diving = createBeats(
      holes,
      (h) => h.grind.drill.startMs,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const biting = createBeats(
      holes,
      (h) => h.grind.bites,
      (h, _, now) => {
        cover!.burst(h.grind.drill.target, 0.4);
        if (!cover!.isLive()) return;
        shakeScreen(BITE_SHAKE);
        thud(now);
      },
    );
    const rumbling = createBeats(
      holes.flatMap((h) => h.grind.rumbles),
      (ms) => ms,
      () => {
        if (cover!.isLive()) shakeScreen(RUMBLE_SHAKE);
      },
    );
    const shoving = createBeats(
      holes.flatMap((h) => h.grind.pushes),
      (ms) => ms,
      (_, __, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(PUSH_SHAKE);
        thud(now);
      },
    );
    const punching = createBeats(
      holes,
      (h) => h.grind.through,
      (h) => {
        giveHire(h.hire);
        if (h === last) {
          cover!.blast(h.grind.drill.target);
          return;
        }
        cover!.burst(h.grind.drill.target, 1);
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
        tick: (ms, now) => {
          diving.tick(ms, now);
          biting.tick(ms, now);
          rumbling.tick(ms, now);
          shoving.tick(ms, now);
          punching.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now);
          if (ms < 0 || ms > endMs + 600) return;
          for (const h of holes) drawGrind(ctx, h.grind, ms, now, DRILL, SPRAY);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
