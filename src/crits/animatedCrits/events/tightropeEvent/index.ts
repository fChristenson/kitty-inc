// the "Tightrope" event (beam; free upgrade levels): it covers its crit,
// whose click freezes the screen while a taut rope of light snaps across
// the screen just over an income bar and a wisp steps out onto it, tottering
// across, the rope bowing and bouncing under each step; reaching the far
// side it bounces off with a twang and a jolt that lands free levels on the
// bar, and the rope snaps across over the next bar, the walker quicker
// each time; the last crossing ends in a huge blast and shake. Then the
// crit's tier pays out
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
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "tightrope";
const MAX_BARS = 4;
// the rope hangs ABOVE px over a bar, EDGE px in from the sides, sagging
// SAG px under the walker, who bobs BOB px a step, STEPS steps a crossing
const ABOVE = 40;
const EDGE = 20;
const SAG = 26;
const BOB = 8;
const STEPS = 8;
const SEGMENTS = 10;
const SNAP_MS = 120;
const ROPE = 6;
const WALKER = 0.5;
const CROSS_SHAKE: [number, number] = [0.6, 1.3];

export const forceTightropeEvent = registerWispEvent(
  KEY,
  "Tightrope",
  () => CONFIG.tightropeEvent.chance,
  (floor, context, area) => {
    const { crossingsMs, levelShare, holdMs, mergeMs } = CONFIG.tightropeEvent;
    const bars = findRewardBars(floor, context)
      .slice(0, MAX_BARS)
      .sort((a, b) => a.center.y - b.center.y);
    if (bars.length === 0) return;
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    let clock = 0;
    const ropes = bars.map((bar, k) => {
      const ltr = k % 2 === 0;
      const snaps = clock;
      const starts = snaps + SNAP_MS;
      const span = lerp(crossingsMs, k / Math.max(1, bars.length - 1));
      clock = starts + span;
      return {
        bar,
        y: bar.box.y - ABOVE,
        from: ltr ? left : right,
        to: ltr ? right : left,
        snaps,
        starts,
        ends: clock,
        span,
      };
    });
    const last = ropes[ropes.length - 1];
    const endAt = last.ends;
    // where the walker is along the rope, 0..1, stepping
    const along = (r: (typeof ropes)[number], ms: number) => {
      const u = clamp01((ms - r.starts) / r.span) * STEPS;
      const step = Math.floor(u);
      return (step + smoothstep(u - step)) / STEPS;
    };
    const sagAt = (r: (typeof ropes)[number], ms: number, s: number) => {
      // the rope dips under the walker, most in the middle
      const w = along(r, ms);
      const near = Math.max(0, 1 - Math.abs(s - w) * 3);
      return SAG * Math.sin(Math.PI * w) * near;
    };
    const ropeOf = (ms: number) => {
      let r = ropes[0];
      for (const rope of ropes) if (ms >= rope.snaps) r = rope;
      return r;
    };
    const walkerAt: Point = { x: 0, y: 0 };
    const walker = (ms: number): Point | null => {
      if (ms > endAt) return null;
      const r = ropeOf(ms);
      if (ms < r.starts) return null;
      const w = along(r, ms);
      const step = clamp01((ms - r.starts) / r.span) * STEPS;
      walkerAt.x = lerp([r.from, r.to], w);
      walkerAt.y =
        r.y + sagAt(r, ms, w) - 14 - Math.abs(Math.sin(step * Math.PI)) * BOB;
      return walkerAt;
    };
    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 0, y: 0 };

    const snapping = createBeats(
      ropes,
      (r) => r.snaps,
      () => {
        if (cover?.isLive()) playBloop();
      },
    );
    const crossing = createBeats(
      ropes,
      (r) => r.ends,
      (r, k) => {
        cover!.levels(r.bar, levelsFor(r.bar.floor, levelShare, 2), {
          x: r.to,
          y: r.y,
        });
        if (r === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast({ x: r.to, y: r.y });
          return;
        }
        cover!.burst({ x: r.to, y: r.y }, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CROSS_SHAKE, k / Math.max(1, ropes.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          snapping.tick(ms, now);
          crossing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_200) return;
          if (ms <= endAt) {
            const r = ropeOf(ms);
            const reach = clamp01((ms - r.snaps) / SNAP_MS);
            for (let i = 0; i < SEGMENTS; i++) {
              const s0 = i / SEGMENTS;
              const s1 = (i + 1) / SEGMENTS;
              if (s0 > reach) break;
              a.x = lerp([r.from, r.to], s0);
              a.y = r.y + sagAt(r, ms, s0);
              b.x = lerp([r.from, r.to], Math.min(s1, reach));
              b.y = r.y + sagAt(r, ms, Math.min(s1, reach));
              drawBeam(ctx, a, b, ROPE, 0.85);
            }
            if (reach < 1) drawBeamFlare(ctx, b, 16, 1, now);
          }
          drawWispBetween(
            ctx,
            walker,
            ms,
            now,
            WISP_SIZE * WALKER,
            0.8,
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
