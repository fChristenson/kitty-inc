// the "Ring Taw" event (bounce; free hires): it covers its crit, whose
// click freezes the screen while a ring of glitter opens in the middle of
// the screen with a cluster of marble wisps inside it; a shooter wisp is
// flicked in from the rim and cracks into a marble with a click and a
// splash, knocking it clean out of the ring; it ricochets off the side of
// the screen and rolls onto an empty spot, where a new worker forms with a
// pop and a jolt; flick after flick, quicker each time, the last in a huge
// blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawGlitterLight,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawBounceSplash,
  ricochetThrough,
  SPLASH_MS,
  type Bounce,
  type BouncePath,
} from "../../../../shared/bounce";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";

const KEY = "ringTaw";
const MAX_HIRES = 6;
const FORM_MS = 300;
const LIFT = 20;
const HEIGHT = 0.55;
const RING = 200;
const CLUSTER = 70;
const SPARKLES = 28;
const WALL = 40;
// the shooter starts this far outside the rim and rebounds this far back
const RUN_UP = 60;
const REBOUND = 90;
const OPEN_MS = 200;
const MARBLE = 0.45;
const SHOOTER = 0.55;
const SPLASH = 100;
const LAND_SHAKE: [number, number] = [0.6, 1.3];

interface Flick {
  hire: RewardHire;
  spot: Point;
  shooter: BouncePath;
  marble: BouncePath;
  hits: number;
}

export const forceRingTawEvent = registerWispEvent(
  KEY,
  "Ring Taw",
  () => CONFIG.ringTawEvent.chance,
  (floor, context, area) => {
    const { firstMs, flicksMs, shotMs, rollMs, holdMs, mergeMs } =
      CONFIG.ringTawEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const width = area.right - area.left;
    const mid: Point = {
      x: area.left + width / 2,
      y: area.top + (area.bottom - area.top) * HEIGHT,
    };
    let clock: number = firstMs;
    const flicks: Flick[] = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      const a = (k / hires.length) * Math.PI * 2;
      const marble: Point = {
        x: mid.x + Math.cos(a) * CLUSTER * Math.random(),
        y: mid.y + Math.sin(a) * CLUSTER * Math.random(),
      };
      // knocked off the near side wall onto its spot
      const wall: Point = {
        x: spot.x < mid.x ? area.left + WALL : area.right - WALL,
        y: lerp([marble.y, spot.y], 0.5),
      };
      // flicked in from the far side of the ring, straight at the marble
      const away = Math.atan2(wall.y - marble.y, wall.x - marble.x) + Math.PI;
      const start: Point = {
        x: mid.x + Math.cos(away) * (RING + RUN_UP),
        y: mid.y + Math.sin(away) * (RING + RUN_UP),
      };
      const rebound: Point = {
        x: marble.x + Math.cos(away + 0.6) * REBOUND,
        y: marble.y + Math.sin(away + 0.6) * REBOUND,
      };
      const hits = clock + shotMs;
      const flick: Flick = {
        hire,
        spot,
        shooter: ricochetThrough(
          [start, marble, rebound],
          [shotMs, shotMs],
          clock,
        ),
        marble: ricochetThrough([marble, wall, spot], [rollMs, rollMs], hits),
        hits,
      };
      clock += lerp(flicksMs, k / Math.max(1, hires.length - 1));
      return flick;
    });
    const last = flicks[flicks.length - 1];
    const endAt = last.marble.endMs;
    const splashes: Bounce[] = flicks.flatMap((f) => [
      f.shooter.bounces[0],
      f.marble.bounces[0],
    ]);

    const clicking = createBeats(
      splashes,
      (b) => b.ms,
      (_, i) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(i % 2 === 0 ? 0.4 : 0.25);
      },
    );
    const landing = createBeats(
      flicks,
      (f) => f.marble.endMs,
      (f, k) => {
        giveHire(f.hire);
        if (f === last) {
          cover!.blast(f.spot);
          return;
        }
        cover!.burst(f.spot, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, flicks.length - 1)));
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
          clicking.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms < 0 || ms > endAt + SPLASH_MS) return;
          const ring =
            clamp01(ms / OPEN_MS) * (1 - clamp01((ms - last.hits) / OPEN_MS));
          if (ring > 0)
            for (let i = 0; i < SPARKLES; i++) {
              const a = (i / SPARKLES) * Math.PI * 2;
              drawGlitterLight(
                ctx,
                mid.x + Math.cos(a) * RING,
                mid.y + Math.sin(a) * RING,
                10,
                i,
                ring,
                now,
              );
            }
          for (const b of splashes)
            drawBounceSplash(ctx, b, ms - b.ms, SPLASH, now);
          for (const f of flicks) {
            drawWispBetween(
              ctx,
              f.marble.at,
              ms,
              now,
              WISP_SIZE * MARBLE,
              0.6,
              0,
              f.marble.endMs,
            );
            drawWispBetween(
              ctx,
              f.shooter.at,
              ms,
              now,
              WISP_SIZE * SHOOTER,
              1,
              f.shooter.startMs,
              f.shooter.endMs,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
