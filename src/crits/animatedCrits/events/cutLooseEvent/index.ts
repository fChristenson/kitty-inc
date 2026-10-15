// the "Cut Loose" event (slice; a free floor): it covers its crit, whose
// click freezes the screen while swift slashes cut across the dark locked
// floor in quick fire, each a flash, a whoosh and a jolt, glitter spilling
// out of every cut; then a cross of two long cuts tears through it with the
// hardest shake and the floor bursts open, unlocked for free as the screen
// unfreezes. Then the crit's tier pays out
import meta from "./meta";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import {
  drawSlash,
  drawSliceSpill,
  planSlash,
  type Slash,
} from "../../../../shared/animationStyles/slice";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";
import { findRewardLocked } from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "cutLoose";
// the cuts across the floor, as fractions of its width and height
const CUTS: [number, number, number, number][] = [
  [0.07, 0.06, 0.55, 0.94],
  [0.93, 0.08, 0.4, 0.96],
  [0.1, 0.62, 0.9, 0.3],
  [0.3, 0.03, 0.7, 0.97],
];
const CUT_W = 36;
const CUT_SPILL = 30;
const CUT_SPILL_N = 20;
const CUT_BLAST = 90;
const CUT_SHAKE: [number, number] = [0.8, 1.4];
// the cross: two long cuts OVER past the floor's corners, CROSS_LAG apart
const OVER = 0.05;
const CROSS_LAG = 60;
const CROSS_MS = 110;
const CROSS_W = 56;
const CROSS_SPILL = 40;
const CROSS_SPILL_N = 30;
const CROSS_SHAKE = 2;
const OPEN_GAP_MS = 60;
const OPEN_BLAST = 260;
const OPEN_SHAKE = 3;

export const forceCutLooseEvent = registerWispEvent(
  KEY,
  "Cut Loose",
  () => meta.chance,
  (floor, context) => {
    const { firstMs, gapsMs, crossGapMs, holdMs, mergeMs } =
      meta.values;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const top = locked.offsetY;
    const lock: Point = { x: FLOOR_W / 2, y: top + FLOOR_H / 2 };
    const spot = (fx: number, fy: number): Point => ({
      x: fx * FLOOR_W,
      y: top + fy * FLOOR_H,
    });
    let t = firstMs;
    const cuts = CUTS.map(([ax, ay, bx, by], k) => {
      const slash = planSlash(spot(ax, ay), spot(bx, by), t);
      t += lerp(gapsMs, k / (CUTS.length - 1));
      return slash;
    });
    const crossAt = cuts[cuts.length - 1].endMs + crossGapMs;
    const cross = [
      planSlash(spot(OVER, -OVER), spot(1 - OVER, 1 + OVER), crossAt, CROSS_MS),
      planSlash(
        spot(1 - OVER, -OVER),
        spot(OVER, 1 + OVER),
        crossAt + CROSS_LAG,
        CROSS_MS,
      ),
    ];
    const openAt = cross[1].endMs + OPEN_GAP_MS;
    const all: Slash[] = [...cuts, ...cross];
    const mid = (s: Slash): Point => ({
      x: (s.from.x + s.to.x) / 2,
      y: (s.from.y + s.to.y) / 2,
    });
    const mids = all.map(mid);

    const swiping = createBeats(
      all,
      (s) => s.startMs,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const cutting = createBeats(
      all,
      (s) => s.endMs,
      (_, k) => {
        if (!cover?.isLive()) return;
        playExplosion();
        shakeScreen(
          k < cuts.length
            ? lerp(CUT_SHAKE, k / (cuts.length - 1))
            : CROSS_SHAKE,
        );
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
          swiping.tick(ms, now);
          cutting.tick(ms, now);
          opening.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > openAt + 900) return;
          for (let k = 0; k < all.length; k++) {
            const s = all[k];
            const crossing = k >= cuts.length;
            drawSlash(ctx, s, ms, crossing ? CROSS_W : CUT_W, now);
            drawSliceSpill(
              ctx,
              s,
              ms,
              crossing ? CROSS_SPILL : CUT_SPILL,
              crossing ? CROSS_SPILL_N : CUT_SPILL_N,
            );
            if (!crossing)
              drawDetonation(ctx, mids[k], ms - s.endMs, CUT_BLAST, now);
          }
          drawDetonation(ctx, lock, ms - openAt, OPEN_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
