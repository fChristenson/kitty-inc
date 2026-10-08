// the "Plugholes" event (clutter; free hires): it covers its crit, whose
// click freezes the screen while a whirl of glitter flung out of the
// clicked floor's button lands in spiral arms all over the screen; then a
// plughole tears open over each empty spot, one after another, and they
// drain the screen gulp by gulp, the glitter swirling down into whichever
// is nearest; each, full, drops its heap into the spot below as a new
// worker, the last in a huge blast. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  drawGravityHole,
  scatterSpiral,
  simulateClean,
  type Cleaner,
} from "../../../../shared/clutter";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "plugholes";
const MAX_HOLES = 4;
const BITS = 360;
const BIT = 10;
const MARGIN = 40;
const ARMS = 3;
const ARM_GAP = 110;
// the whirl's bend off a straight throw (rad)
const WHIRL = 0.7;
// each hole sits this far over its spot
const ABOVE = 80;
const HOLE = 120;
const CORE = 34;
const OPEN_MS = 180;
const SWIRL = 0.8;
// gulps while draining, how far they swell the holes, and the last surge
const GULPS = 3;
const GULP_SWELL = 0.35;
const SURGE = 1.8;
// a loose bit under a steady pull a settles at about TERMINAL * a px/ms;
// pull hard enough to bring the farthest in within this share of the drain
const TERMINAL = 72;
const REACH_SHARE = 0.35;
const GATHER_MS = 160;
const HEAP = 0.6;
const SPILL_SHAKE = 0.7;
const OPEN_SHAKE = 0.5;
const GULP_SHAKE: [number, number] = [0.4, 0.9];
const POP_SHAKE = 0.8;

export const forcePlugholesEvent = registerWispEvent(
  KEY,
  "Plugholes",
  () => CONFIG.plugholesEvent.chance,
  (floor, context, area) => {
    const { spillMs, openGapMs, drainMs, popMs, popGapMs, holdMs, mergeMs } =
      CONFIG.plugholesEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HOLES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const holes = hires.map((hire, k) => ({
      hire,
      at: { x: hire.x, y: hire.y - ABOVE } as Point,
      opens: spillMs + k * openGapMs,
    }));
    const spots = scatterSpiral(
      {
        left: area.left + MARGIN,
        top: area.top + MARGIN,
        right: area.right - MARGIN,
        bottom: area.bottom - MARGIN,
      },
      BITS,
      ARMS,
      ARM_GAP,
    );
    const nearest = (p: Point) => {
      let best = 0;
      let bestD = Infinity;
      holes.forEach((h, k) => {
        const d = Math.hypot(p.x - h.at.x, p.y - h.at.y);
        if (d < bestD) {
          bestD = d;
          best = k;
        }
      });
      return { k: best, d: bestD };
    };
    const far = Math.max(...spots.map((s) => nearest(s).d));
    const fromButton = Math.max(
      ...spots.map((s) => Math.hypot(s.x - button.x, s.y - button.y)),
    );
    // each bit whirls out of the button as the spill's front reaches it
    const throws = spots.map((s) => {
      const dx = s.x - button.x;
      const dy = s.y - button.y;
      const c = Math.cos(WHIRL);
      const n = Math.sin(WHIRL);
      return {
        leaves: spillMs * 0.3 * (Math.hypot(dx, dy) / fromButton),
        bow: {
          x: button.x + (dx * c - dy * n) * 0.6,
          y: button.y + (dx * n + dy * c) * 0.6,
        },
      };
    });
    const flyMs = spillMs * 0.7;

    const drainStarts = spillMs;
    const drained = holes[holes.length - 1].opens + drainMs;
    const pull = (far * far) / (2 * TERMINAL * 100 * REACH_SHARE * drainMs);
    // gulp by gulp, surging at the end
    const pullAt = (ms: number) => {
      const t = clamp01((ms - drainStarts) / (drained - drainStarts));
      const gulp = 0.35 + 0.65 * Math.sin(Math.PI * GULPS * t) ** 2;
      return pull * gulp * (t > 0.75 ? SURGE : 1);
    };
    const gulps = Array.from(
      { length: GULPS },
      (_, j) => drainStarts + ((j + 0.5) / GULPS) * (drained - drainStarts),
    );
    const cleaners: Cleaner[] = holes.map((h) => ({
      kind: "hole",
      at: (ms, into) => {
        if (ms < h.opens) return null;
        into.x = h.at.x;
        into.y = h.at.y;
        return into;
      },
      pull: pullAt,
      core: CORE,
      swirl: SWIRL,
    }));
    const swept = simulateClean(spots, cleaners, drainStarts, drained);
    // what each bit settles into: its nearest hole's heap
    const settled = spots.map((_, i) => {
      const end = swept.end(i);
      const { k } = nearest(end);
      const dx = end.x - holes[k].at.x;
      const dy = end.y - holes[k].at.y;
      const f = Math.min(1, (CORE * HEAP) / (Math.hypot(dx, dy) || 1));
      return { k, dx, dy, x: dx * f, y: dy * f };
    });
    const pops = holes.map((_, k) => drained + GATHER_MS + k * popGapMs);
    const lands = pops.map((ms) => ms + popMs);
    const endMs = lands[lands.length - 1];

    const spilling = createBeats(
      [0],
      (ms) => ms,
      () => {
        cover!.burst(button, 0.8);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(SPILL_SHAKE);
      },
    );
    const opening = createBeats(
      holes,
      (h) => h.opens,
      (h) => {
        cover!.burst(h.at, 0.4);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(OPEN_SHAKE);
      },
    );
    const gulping = createBeats(
      gulps,
      (ms) => ms,
      (_, j) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(GULP_SHAKE, j / (GULPS - 1)));
      },
    );
    const landing = createBeats(
      holes,
      (_, k) => lands[k],
      (h, k) => {
        giveHire(h.hire);
        const at: Point = { x: h.hire.x, y: h.hire.y };
        if (k === holes.length - 1) {
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.7);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(POP_SHAKE);
      },
    );

    const bit: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          spilling.tick(ms, now);
          opening.tick(ms, now);
          gulping.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now);
          if (ms < 0 || ms > endMs) return;
          const swell = 1 + GULP_SWELL * (pullAt(ms) / (pull * SURGE));
          holes.forEach((h, k) => {
            if (ms < h.opens) return;
            const open = easeOut(clamp01((ms - h.opens) / OPEN_MS));
            const close = 1 - clamp01((ms - pops[k]) / popMs);
            drawGravityHole(ctx, h.at, HOLE * open * swell, close, ms, now);
          });
          const gather = easeOut(clamp01((ms - drained) / GATHER_MS));
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (let i = 0; i < spots.length; i++) {
            const t = throws[i];
            if (ms < t.leaves) continue;
            let size = BIT;
            if (ms < drainStarts) {
              bezier(
                button,
                t.bow,
                spots[i],
                easeOut(clamp01((ms - t.leaves) / flyMs)),
                bit,
              );
            } else if (ms < drained) {
              swept.at(i, ms, bit);
            } else {
              // settled into its hole's heap, then dropped into the spot
              const s = settled[i];
              const h = holes[s.k];
              if (ms >= lands[s.k]) continue;
              const drop = easeIn(clamp01((ms - pops[s.k]) / popMs));
              bit.x = h.at.x + lerp([s.dx, s.x], gather) * (1 - drop);
              bit.y =
                h.at.y + lerp([s.dy, s.y], gather) * (1 - drop) + ABOVE * drop;
              size = BIT * (1 - 0.5 * drop);
            }
            stampGlimmer(
              ctx,
              bit.x,
              bit.y,
              size,
              i * 1.3 + ms * 0.004,
              i % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
            );
          }
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
