// the "Endless Fall" event (portal; free upgrade levels): it covers its crit,
// whose click freezes the screen while a flat gold ring snaps open under the
// bottom floor in view and its twin over the top one; a wisp bursts out of the
// top ring and falls down past every floor into the bottom ring, out of the
// top one again at once with its speed, over and over, each fall quicker and
// its streak longer, every floor it falls past flashing and taking free levels
// on that hit, a whoosh and a jolt each pass, the rings flaring bigger, until
// the wisp is a blur; then the rings snap shut on it with a bang and it bursts
// out of the bottom one sideways in shards, one onto every floor in view, the
// last levels landing in a huge blast
import meta from "./meta";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import {
  drawPortal,
  drawPortalPass,
  planWarp,
  portalLook,
  type WarpLeg,
} from "../../../../shared/animationStyles/portal";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { COLOR } from "../../../../palette";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { playBarExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { levelsFor } from "../../../../gameState";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "endlessFall";
// the rings EDGE px in from the screen's top and bottom, at least GAP px clear
// of the floors' bars, RING px round, flaring FLARE bigger by the last pass and
// PULSE more for PULSE_MS after each
const EDGE = 120;
const GAP = 50;
const RING = 92;
const FLARE = 0.6;
const PULSE = 0.35;
const PULSE_MS = 140;
const OPEN_MS = 160;
const TOP_LOOK = portalLook(2);
const BOTTOM_LOOK = portalLook(4);
const WISP = WISP_SIZE * 1.3;
// the streak behind the wisp: STREAK_MS of its fall, at most STREAK_MAX of
// the drop, fading in as the passes quicken
const STREAK_MS = 70;
const STREAK_MAX = 0.95;
const STREAK_ALPHA: [number, number] = [0.25, 0.85];
const STREAK_WIDTH = 16;
const PASS_SHAKE: [number, number] = [0.6, 1.7];
const PASS_BANG: [number, number] = [0.7, 1.15];
const PASS_BLAST = 80;
// the snap: the rings flaring and slamming shut in SNAP_MS, the shards fanning
// out SIDE of the screen's width sideways before curving onto their bars
const SNAP_MS = 110;
const SNAP_FLARE = 0.8;
const SNAP_SHAKE = 2.4;
const SNAP_BLAST = 150;
const SIDE = 0.48;
const SHARD = WISP_SIZE * 0.9;

interface Crossing {
  bar: RewardBar;
  at: number;
}

// a straight streak of light from y0 down to y1 at x
function streak(
  ctx: CanvasRenderingContext2D,
  x: number,
  y0: number,
  y1: number,
  alpha: number,
): void {
  if (y1 - y0 < 1 || alpha <= 0) return;
  ctx.globalAlpha = alpha * 0.55;
  ctx.lineWidth = STREAK_WIDTH;
  ctx.strokeStyle = COLOR.heavenlyGold;
  ctx.beginPath();
  ctx.moveTo(x, y0);
  ctx.lineTo(x, y1);
  ctx.stroke();
  ctx.globalAlpha = alpha;
  ctx.lineWidth = STREAK_WIDTH * 0.3;
  ctx.strokeStyle = COLOR.white;
  ctx.stroke();
}

export const forceEndlessFallEvent = registerWispEvent(
  KEY,
  "Endless Fall",
  () => meta.chance,
  (floor, context, area) => {
    const {
      firstMs,
      passes,
      fallMs,
      quicken,
      passShare,
      finalShare,
      burstMs,
      holdMs,
      mergeMs,
    } = meta.values;
    const bars = findRewardBars(floor, context);
    if (bars.length === 0) return;
    const first = bars[0];
    const last = bars[bars.length - 1];
    const x = first.center.x;
    const width = area.right - area.left;
    const top: Point = {
      x,
      y: Math.max(area.top + GAP, Math.min(area.top + EDGE, first.box.y - GAP)),
    };
    const bottom: Point = {
      x,
      y: Math.min(
        area.bottom - GAP,
        Math.max(area.bottom - EDGE, last.box.y + last.box.height + GAP),
      ),
    };
    const span = bottom.y - top.y;

    const legs: WarpLeg[] = [];
    let t: number = firstMs;
    for (let k = 0; k < passes; k++) {
      const ms = fallMs * quicken ** k;
      legs.push({ from: top, to: bottom, startMs: t, endMs: t + ms });
      t += ms;
    }
    const warp = planWarp(legs);
    const snapAt = warp.endMs;
    const landAt = snapAt + burstMs;
    // every dive into the bottom ring (and out of the top), the snap the last
    const dives = [...warp.passes, snapAt];
    const into: Point = { x: 0, y: 0 };
    const wispAt = (ms: number) => warp.at(ms, into);

    // each floor flashing the moment the wisp falls past its bar
    const crossings: Crossing[] = legs.flatMap((leg) =>
      bars.map((bar) => ({
        bar,
        at: lerp(
          [leg.startMs, leg.endMs],
          clamp01((bar.center.y - top.y) / span),
        ),
      })),
    );

    // a shard per bar, fanning out sideways from the shut bottom ring
    const shards = bars.map((bar, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const bend: Point = {
        x: x + side * width * SIDE * (0.6 + (0.4 * (i >> 1)) / bars.length),
        y: bottom.y - GAP,
      };
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < snapAt) return null;
        const u = clamp01((ms - snapAt) / burstMs);
        const a = (1 - u) * (1 - u);
        const b = 2 * u * (1 - u);
        const c = u * u;
        at.x = a * bottom.x + b * bend.x + c * bar.center.x;
        at.y = a * bottom.y + b * bend.y + c * bar.center.y;
        return at;
      };
    });
    const middle = bars[bars.length >> 1].center;

    const passing = createBeats(
      warp.passes,
      (ms) => ms,
      (_, k) => {
        if (!cover?.isLive()) return;
        const f = k / Math.max(1, passes - 2);
        playSwoosh();
        playBarExplosion(lerp(PASS_BANG, f));
        shakeScreen(lerp(PASS_SHAKE, f));
      },
    );
    const crossing = createBeats(
      crossings,
      (c) => c.at,
      (c) => {
        cover!.levels(c.bar, levelsFor(c.bar.floor, passShare, 1), top);
        cover!.burst(c.bar.center, 0.4);
      },
    );
    const climax = createBeats(
      [snapAt, landAt],
      (ms) => ms,
      (_, k) => {
        if (k === 0) {
          cover!.burst(bottom, 1.2);
          if (!cover!.isLive()) return;
          playBarExplosion(1.4);
          shakeScreen(SNAP_SHAKE);
          return;
        }
        for (const bar of bars) {
          cover!.levels(bar, levelsFor(bar.floor, finalShare, 3), bottom);
          cover!.slam(bar);
        }
        cover!.blast(middle);
      },
    );

    const ringSize = (ms: number): number => {
      let done = 0;
      let since = Infinity;
      for (const dive of dives) {
        if (ms < dive) break;
        done++;
        since = ms - dive;
      }
      if (ms >= snapAt)
        return RING * (1 + FLARE + SNAP_FLARE * (1 - clamp01(since / SNAP_MS)));
      return (
        RING *
        (1 +
          (FLARE * done) / passes +
          PULSE * Math.max(0, 1 - since / PULSE_MS))
      );
    };

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: landAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          passing.tick(ms, now);
          crossing.tick(ms, now);
          climax.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0) return;
          if (ms <= snapAt + SNAP_MS) {
            const open =
              clamp01(ms / OPEN_MS) *
              (1 - easeIn(clamp01((ms - snapAt) / SNAP_MS)));
            const size = ringSize(ms);
            drawPortal(ctx, top, size, open, now, 1, TOP_LOOK);
            drawPortal(ctx, bottom, size, open, now, 1, BOTTOM_LOOK);
          }
          drawPortalPass(ctx, top, ms - firstMs, RING);
          for (const dive of dives) {
            if (ms < dive) break;
            drawPortalPass(ctx, top, ms - dive, RING * 1.3);
            drawPortalPass(ctx, bottom, ms - dive, RING * 1.3);
          }
          if (ms >= firstMs && ms <= snapAt) {
            const previous = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = "lighter";
            ctx.lineCap = "round";
            for (let k = 0; k < legs.length; k++) {
              const leg = legs[k];
              if (ms < leg.startMs || ms > leg.endMs) continue;
              const dur = leg.endMs - leg.startMs;
              const headY = top.y + (span * (ms - leg.startMs)) / dur;
              const length = Math.min(
                span * STREAK_MAX,
                (span / dur) * STREAK_MS,
              );
              const alpha = lerp(STREAK_ALPHA, k / Math.max(1, passes - 1));
              streak(ctx, x, Math.max(top.y, headY - length), headY, alpha);
              const wrap = length - (headY - top.y);
              if (k > 0 && wrap > 0)
                streak(ctx, x, bottom.y - wrap, bottom.y, alpha);
              break;
            }
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = previous;
          }
          drawWispBetween(
            ctx,
            wispAt,
            ms,
            now,
            WISP,
            clamp01((ms - firstMs) / (snapAt - firstMs)),
            firstMs,
            snapAt,
          );
          for (let i = 0; i < shards.length; i++)
            drawWispBetween(ctx, shards[i], ms, now, SHARD, 1, snapAt, landAt);
          drawDetonation(ctx, top, ms - snapAt, SNAP_BLAST, now);
          drawDetonation(ctx, bottom, ms - snapAt, SNAP_BLAST, now);
          for (const dive of warp.passes) {
            if (ms < dive) break;
            drawDetonation(ctx, bottom, ms - dive, PASS_BLAST, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
