// the "Free Throws" event (bounce; free hires): it covers its crit, whose
// click freezes the screen while a rim of light pops up over each empty spot
// on the floors in view; the clicked floor's button shoots a ball wisp at
// each in a high arc, one after another: some rattle off the rim's front,
// pop up and drop in, some swish straight through, every touch a splash and
// a jolt; each drops through onto its spot and a new worker forms where it
// lands, the last in a big blast. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOutBack } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import {
  drawBounceSplash,
  hops,
  type Bounce,
  type BouncePath,
} from "../../../../shared/bounce";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";

const KEY = "freeThrows";
const MAX_SHOTS = 5;
// the rim hangs this high over the spot, this wide
const RIM_ABOVE = 260;
const RIM = 120;
const RIM_W = 9;
const BALL = WISP_SIZE * 1.1;
// how high a shot arcs over its line, and a rattle's pop off the rim
const ARC = 520;
const RATTLE = 70;
const RIM_SHAKE = 0.5;
const LAND_SHAKE = 0.7;
const SOUND_GAP_MS = 50;

interface Shot {
  hire: RewardHire;
  rim: Point;
  path: BouncePath;
  // when it drops through the rim and lands on the spot
  inMs: number;
  landsMs: number;
}

export const forceFreeThrowsEvent = registerWispEvent(
  KEY,
  "Free Throws",
  () => CONFIG.freeThrowsEvent.chance,
  (floor, context) => {
    const { growMs, shotMs, gapMs, dropMs, holdMs, mergeMs } =
      CONFIG.freeThrowsEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_SHOTS);
    if (hires.length === 0) return;
    const from = getButtonCenter(context.isGroundFloor);
    const shots: Shot[] = hires.map((hire, k) => {
      const rim: Point = { x: hire.x, y: hire.y - RIM_ABOVE };
      const start = growMs + k * gapMs;
      // every other shot rattles off the rim's near side first
      const side = from.x < rim.x ? -1 : 1;
      const points =
        k % 2 === 0
          ? [from, { x: rim.x + side * RIM * 0.45, y: rim.y }, rim]
          : [from, rim];
      const path = hops(
        points,
        k % 2 === 0 ? [shotMs, shotMs * 0.35] : [shotMs, shotMs],
        k % 2 === 0 ? [ARC, RATTLE] : [ARC, ARC],
        start,
      );
      return {
        hire,
        rim,
        path,
        inMs: path.endMs,
        landsMs: path.endMs + dropMs,
      };
    });
    const last = shots[shots.length - 1];
    const endMs = last.landsMs;
    const touches: Bounce[] = shots.flatMap((s) => s.path.bounces);
    let soundAt = -Infinity;
    const thud = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playBloop();
    };

    const shooting = createBeats(
      shots,
      (s) => s.path.startMs,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const touching = createBeats(
      touches,
      (b) => b.ms,
      (b, _, now) => {
        cover!.burst(b.at, 0.3);
        if (!cover!.isLive()) return;
        shakeScreen(RIM_SHAKE);
        thud(now);
      },
    );
    const landing = createBeats(
      shots,
      (s) => s.landsMs,
      (s, _, now) => {
        giveHire(s.hire);
        if (s === last) {
          cover!.blast({ x: s.hire.x, y: s.hire.y });
          return;
        }
        cover!.burst({ x: s.hire.x, y: s.hire.y }, 0.8);
        if (!cover!.isLive()) return;
        shakeScreen(LAND_SHAKE);
        thud(now);
      },
    );

    const balls = shots.map((s) => {
      const spot: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < s.path.startMs || ms > s.landsMs) return null;
        if (ms < s.inMs) return s.path.at(ms);
        spot.x = s.hire.x;
        spot.y =
          s.rim.y +
          (s.hire.y - s.rim.y) * easeIn(clamp01((ms - s.inMs) / dropMs));
        return spot;
      };
    });
    const rimLeft: Point = { x: 0, y: 0 };
    const rimRight: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          shooting.tick(ms, now);
          touching.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now);
          if (ms < 0 || ms > endMs + 400) return;
          const pop = easeOutBack(clamp01(ms / growMs));
          for (const s of shots) {
            rimLeft.x = s.rim.x - (RIM / 2) * pop;
            rimRight.x = s.rim.x + (RIM / 2) * pop;
            rimLeft.y = rimRight.y = s.rim.y;
            const fade = 1 - clamp01((ms - s.landsMs) / 400);
            drawBeam(ctx, rimLeft, rimRight, RIM_W, 0.8 * fade);
          }
          for (const b of touches)
            drawBounceSplash(ctx, b, ms - b.ms, 110, now);
          for (let k = 0; k < shots.length; k++)
            drawWispBetween(
              ctx,
              balls[k],
              ms,
              now,
              BALL,
              0.7,
              shots[k].path.startMs,
              shots[k].landsMs,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
