// the "Hatchlings" event (wisp; free hires): it covers its crit, whose click
// freezes the screen while big egg wisps drop onto every empty spot and
// bounce to rest; they start to rock, harder and harder, and crack open one
// after another in a flash, a pop and a jolt, a new worker hatching out of
// each, quicker every time, the last in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  dropBounce,
  drawBounceSplash,
  type BouncePath,
} from "../../../../shared/bounce";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";

const KEY = "hatchlings";
const MAX_HIRES = 6;
const FORM_MS = 300;
const LIFT = 24;
const DROP = 380;
const GRAVITY = 0.012;
const RESTITUTION = 0.3;
const ROCK = 26;
// rocks a second at the start of the rocking and just before it hatches
const ROCKS: [number, number] = [3, 12];
const EGG = 0.75;
const SPLASH = 80;
const HATCH_SHAKE: [number, number] = [0.6, 1.3];

interface Egg {
  hire: RewardHire;
  drop: BouncePath;
  rests: number;
  hatches: number;
  at: (ms: number) => Point;
}

export const forceHatchlingsEvent = registerWispEvent(
  KEY,
  "Hatchlings",
  () => CONFIG.hatchlingsEvent.chance,
  (floor, context) => {
    const { dropGapMs, rockMs, hatchesMs, holdMs, mergeMs } =
      CONFIG.hatchlingsEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const eggs: Egg[] = hires.map((hire, k) => {
      const nest: Point = { x: hire.x, y: hire.y - LIFT };
      const drop = dropBounce({ x: nest.x, y: nest.y - DROP }, nest.y, {
        gravity: GRAVITY,
        restitution: RESTITUTION,
        bounces: 2,
        startMs: k * dropGapMs,
      });
      const rests = drop.endMs;
      return { hire, drop, rests, hatches: 0, at: drop.at };
    });
    let clock = Math.max(...eggs.map((e) => e.rests)) + rockMs;
    eggs.forEach((egg, k) => {
      egg.hatches = clock;
      clock += lerp(hatchesMs, k / Math.max(1, eggs.length - 1));
    });
    const last = eggs[eggs.length - 1];
    const endAt = last.hatches;
    // rocking side to side, faster and wider as it comes to hatch
    for (const egg of eggs) {
      const base = egg.at;
      const at: Point = { x: 0, y: 0 };
      egg.at = (ms) => {
        const p = base(ms);
        at.y = p.y;
        if (ms < egg.rests) {
          at.x = p.x;
          return at;
        }
        const u = clamp01((ms - egg.rests) / (egg.hatches - egg.rests));
        const rate = lerp(ROCKS, u * u);
        at.x =
          p.x +
          Math.sin(((ms - egg.rests) / 1000) * Math.PI * 2 * rate) * ROCK * u;
        return at;
      };
    }
    const landings = eggs.flatMap((e) => e.drop.bounces);

    const bouncing = createBeats(
      landings,
      (b) => b.ms,
      () => {
        if (cover!.isLive()) playBloop();
      },
    );
    const hatching = createBeats(
      eggs,
      (e) => e.hatches,
      (e, k) => {
        giveHire(e.hire);
        const at = e.drop.bounces[e.drop.bounces.length - 1].at;
        if (e === last) {
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HATCH_SHAKE, k / Math.max(1, eggs.length - 1)));
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
          bouncing.tick(ms, now);
          hatching.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms < 0 || ms > endAt + 400) return;
          for (const b of landings)
            drawBounceSplash(ctx, b, ms - b.ms, SPLASH, now);
          for (const e of eggs)
            drawWispBetween(
              ctx,
              e.at,
              ms,
              now,
              WISP_SIZE * EGG,
              lerp(
                [0.4, 1],
                clamp01((ms - e.rests) / Math.max(1, e.hatches - e.rests)),
              ),
              e.drop.startMs,
              e.hatches,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
