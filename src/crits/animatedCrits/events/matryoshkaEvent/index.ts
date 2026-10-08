// the "Matryoshka" event (wisp; free hires): it covers its crit, whose
// click freezes the screen while a big fat wisp drops out of the sky into
// the middle of the screen and, like a set of nesting dolls, pops open with
// a flash and a bloop: a smaller wisp shoots out of it to an empty spot on
// a floor in view and lands as a new worker with a bang and a jolt; again
// and again, each doll smaller and quicker, until the last tiny one flies
// off itself and lands in a huge blast and shake. Then the crit's tier pays
// out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  easeOutBack,
  lerp,
} from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "matryoshka";
const MAX_HIRES = 5;
// the doll starts BIG wisps across, each one inside SHRINK of the last
const BIG = 1.8;
const SHRINK = 0.75;
const POP = 0.25;
const POP_MS = 140;
const SKY = 120;
const LOFT = 120;
const FORM_MS = 280;
const LAND_SHAKE: [number, number] = [0.6, 1.4];

export const forceMatryoshkaEvent = registerWispEvent(
  KEY,
  "Matryoshka",
  () => CONFIG.matryoshkaEvent.chance,
  (floor, context, area) => {
    const { dropMs, opensMs, flyMs, holdMs, mergeMs } = CONFIG.matryoshkaEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const doll: Point = {
      x: (area.left + area.right) / 2,
      y: lerp([area.top, area.bottom], 0.4),
    };
    const sky: Point = { x: doll.x, y: area.top - SKY };
    let clock: number = dropMs;
    const children = hires.map((hire, k) => {
      clock += lerp(opensMs, k / Math.max(1, hires.length - 1));
      const opens = clock;
      const spot: Point = { x: hire.x, y: hire.y - 30 };
      const at: Point = { x: 0, y: 0 };
      const bow: Point = {
        x: (doll.x + spot.x) / 2,
        y: Math.min(doll.y, spot.y) - LOFT,
      };
      return {
        hire,
        spot,
        opens,
        lands: opens + flyMs,
        size: BIG * SHRINK ** (k + 1),
        at: (ms: number): Point | null =>
          ms < opens || ms > opens + flyMs
            ? null
            : bezier(doll, bow, spot, easeIn((ms - opens) / flyMs), at),
      };
    });
    const last = children[children.length - 1];
    const endAt = last.lands;
    const dollAt: Point = { x: 0, y: 0 };
    const dollWisp = (ms: number): Point | null => {
      if (ms < 0 || ms >= last.opens) return null;
      dollAt.x = doll.x;
      dollAt.y = lerp([sky.y, doll.y], easeOutBack(clamp01(ms / dropMs)));
      return dollAt;
    };
    // the doll's size: shrinking a doll at each opening, with a pop
    const dollSize = (ms: number) => {
      let size = BIG;
      for (const c of children) {
        if (ms < c.opens) break;
        size = c.size / SHRINK;
        const t = (ms - c.opens) / POP_MS;
        if (t < 1) size *= 1 + POP * Math.sin(Math.PI * t);
        size *= SHRINK;
      }
      return size;
    };

    const opening = createBeats(
      children,
      (c) => c.opens,
      (c) => {
        cover!.burst(doll, 0.3 + 0.3 * (c.size / BIG));
        if (cover!.isLive()) playBloop();
      },
    );
    const landing = createBeats(
      children,
      (c) => c.lands,
      (c, k) => {
        giveHire(c.hire);
        if (k === children.length - 1) {
          cover!.blast(c.spot);
          return;
        }
        cover!.burst(c.spot, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, children.length - 1)));
      },
    );
    const settling = createBeats(
      [dropMs],
      (ms) => ms,
      () => {
        if (cover?.isLive()) shakeScreen(1);
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
          settling.tick(ms, now);
          opening.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          drawWispBetween(
            ctx,
            dollWisp,
            ms,
            now,
            WISP_SIZE * dollSize(ms),
            easeOut(clamp01(ms / endAt)),
            0,
            last.opens,
          );
          for (const c of children)
            drawWispBetween(
              ctx,
              c.at,
              ms,
              now,
              WISP_SIZE * c.size,
              0.8,
              c.opens,
              c.lands,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
