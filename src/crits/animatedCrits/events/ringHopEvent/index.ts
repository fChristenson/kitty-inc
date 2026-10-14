// the "Ring Hop" event (portal; a free floor): it covers its crit, whose
// click freezes the screen while pairs of gold rings snap open across it; a
// wisp shoots into the first ring and bursts out of its twin on the far
// side, on into the next pair's ring and out of its twin, zigzagging up the
// screen ring to ring, faster and faster, a pop, a whoosh and a jolt at
// every pass; the last twin opens right under the dark locked floor and the
// wisp shoots up into it, bursting it open, unlocked for free as the screen
// unfreezes
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import {
  drawPortal,
  drawPortalPass,
  planWarp,
  type WarpLeg,
} from "../../../../shared/animationStyles/portal";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { playBarExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";
import { findRewardLocked } from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "ringHop";
const ORIGIN: Point = { x: 0, y: 0 };
// PAIRS pairs of rings RING px round, the entries SIDE in from the screen's
// sides, alternating, the exits on the far side; the wisp starting START of
// the screen's height down, the last exit UNDER of a floor below the lock
const PAIRS = 4;
const RING = 90;
const SIDE = 0.16;
const START = 0.9;
const UNDER = 0.85;
// each ring opening OPEN_MS before the wisp reaches it, closing CLOSE_MS
// after; the legs from LEG_MS[0] down to [1], the last LAST_MS
const OPEN_MS = 260;
const CLOSE_MS = 220;
const LEG_MS: [number, number] = [560, 150];
const LAST_MS = 170;
const WISP = WISP_SIZE * 1.5;
const PASS_SHAKE: [number, number] = [0.6, 1.4];
const PASS_BLAST = 90;
const OPEN_SHAKE = 3;
const OPEN_FADE_MS = 500;

interface Ring {
  at: Point;
  // its turn, its plane square across the way the wisp goes through it
  turn: number;
  opens: number;
  closes: number;
  pass: number;
}

export const forceRingHopEvent = registerWispEvent(
  KEY,
  "Ring Hop",
  () => CONFIG.ringHopEvent.chance,
  (floor, context, area) => {
    const { firstMs, holdMs, mergeMs } = CONFIG.ringHopEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const start: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + height * START,
    };
    const lastExit: Point = { x: lock.x, y: lock.y + FLOOR_H * UNDER };
    // each pair: its entry on one side, its exit on the other, a step higher
    const pairs = Array.from({ length: PAIRS }, (_, k) => {
      const left = k % 2 === 0;
      const sideX = (onLeft: boolean) =>
        area.left + width * (onLeft ? SIDE : 1 - SIDE);
      return {
        entry: {
          x: sideX(left),
          y: lerp([start.y, lastExit.y], (k + 0.3) / PAIRS),
        },
        exit:
          k === PAIRS - 1
            ? lastExit
            : {
                x: sideX(!left),
                y: lerp([start.y, lastExit.y], (k + 0.75) / PAIRS),
              },
      };
    });
    const legs: WarpLeg[] = [];
    let t = firstMs;
    let from = start;
    pairs.forEach((pair, k) => {
      const ms = lerp(LEG_MS, k / Math.max(1, PAIRS - 1));
      legs.push({ from, to: pair.entry, startMs: t, endMs: t + ms });
      t += ms;
      from = pair.exit;
    });
    legs.push({ from, to: lock, startMs: t, endMs: t + LAST_MS });
    const warp = planWarp(legs);
    const openAt = warp.endMs;
    const angleOf = (a: Point, b: Point) =>
      Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
    const rings: Ring[] = pairs.flatMap((pair, k) => {
      const pass = legs[k].endMs;
      const into = angleOf(legs[k].from as Point, pair.entry);
      const out = angleOf(pair.exit, legs[k + 1].to as Point);
      const opens = pass - OPEN_MS - (k === 0 ? 0 : LEG_MS[1]);
      return [
        { at: pair.entry, turn: into, opens, closes: pass + CLOSE_MS, pass },
        { at: pair.exit, turn: out, opens, closes: pass + CLOSE_MS, pass },
      ];
    });
    const into: Point = { x: 0, y: 0 };
    const wispAt = (ms: number) => warp.at(ms, into);

    const passing = createBeats(
      warp.passes,
      (ms) => ms,
      (_, k) => {
        if (!cover?.isLive()) return;
        playSwoosh();
        playBarExplosion(lerp([0.8, 1.2], k / Math.max(1, PAIRS - 1)));
        shakeScreen(lerp(PASS_SHAKE, k / Math.max(1, PAIRS - 1)));
      },
    );
    const opening = createBeats(
      [openAt],
      (ms) => ms,
      () => {
        cover!.blast(lock);
        if (cover!.isLive()) shakeScreen(OPEN_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: openAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          passing.tick(ms, now);
          opening.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > openAt + OPEN_FADE_MS) return;
          for (const ring of rings) {
            const open =
              clamp01((ms - ring.opens) / 120) *
              (1 - clamp01((ms - ring.closes) / 160));
            if (open <= 0 && ms - ring.pass > 300) continue;
            ctx.save();
            ctx.translate(ring.at.x, ring.at.y);
            ctx.rotate(ring.turn);
            drawPortal(ctx, ORIGIN, RING, open, now);
            drawPortalPass(ctx, ORIGIN, ms - ring.pass, RING);
            ctx.restore();
          }
          if (ms >= firstMs && ms <= openAt)
            drawWisp(
              ctx,
              wispAt,
              ms,
              now,
              WISP,
              clamp01((ms - firstMs) / (openAt - firstMs)),
            );
          for (const ring of rings)
            drawDetonation(ctx, ring.at, ms - ring.pass, PASS_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
