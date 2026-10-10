// the "Holding Pattern" event (wisp; free upgrade levels): it covers its
// crit, whose click freezes the screen while plane wisps circle in a stacked
// holding pattern high over the screen, each on its own racetrack oval; one
// by one the lowest peels off, swoops down onto an income bar, touches down
// at its end with a flash and a jolt of free levels and skids along it in a
// spray of glitter, while the stack above steps down an oval; the last
// touchdown lands in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import { drawBeamFlare } from "../../../../shared/beam";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "holdingPattern";
const PLANES = 4;
const MAX_BARS = 4;
// the stack: the lowest oval's height, the gap between ovals, their size
const STACK_Y = 0.32;
const LEVEL = 55;
const OVAL_W = 0.3;
const OVAL_H = 24;
const LAP_MS = 640;
const STEP_MS = 260;
const PLANE = 0.55;
const SKID = 0.55;
const FLARE = 34;
const LAND_SHAKE: [number, number] = [0.6, 1.2];

interface Landing {
  bar: RewardBar;
  leaves: number;
  touches: number;
  stops: number;
  from: Point;
  bend: Point;
  touch: Point;
  rest: Point;
}

export const forceHoldingPatternEvent = registerWispEvent(
  KEY,
  "Holding Pattern",
  () => CONFIG.holdingPatternEvent.chance,
  (floor, context, area) => {
    const {
      circleMs,
      landGapMs,
      approachMs,
      skidMs,
      levelShare,
      holdMs,
      mergeMs,
    } = CONFIG.holdingPatternEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const centre = (area.left + area.right) / 2;
    const lowest = area.top + height * STACK_Y;
    const rx = width * OVAL_W;
    const leaves = Array.from(
      { length: PLANES },
      (_, k) => circleMs + k * landGapMs,
    );
    // how many ovals plane k has stepped down by ms
    const level = (k: number, ms: number) => {
      let l = k;
      for (let j = 0; j < k; j++)
        l -= smoothstep(clamp01((ms - leaves[j]) / STEP_MS));
      return l;
    };
    const oval = (k: number, ms: number, into: Point) => {
      const a = ((ms + (k * LAP_MS) / PLANES) / LAP_MS) * Math.PI * 2;
      into.x = centre + Math.cos(a) * rx;
      into.y = lowest - level(k, ms) * LEVEL + Math.sin(a) * OVAL_H;
      return into;
    };
    const landings: Landing[] = leaves.map((ms, k) => {
      const bar = bars[k % bars.length];
      const from = oval(k, ms, { x: 0, y: 0 });
      const fromLeft = from.x < bar.center.x;
      const touch: Point = {
        x: bar.box.x + bar.box.width * (fromLeft ? 0.12 : 0.88),
        y: bar.box.y,
      };
      return {
        bar,
        leaves: ms,
        touches: ms + approachMs,
        stops: ms + approachMs + skidMs,
        from,
        bend: { x: lerp([from.x, touch.x], 0.2), y: touch.y - 60 },
        touch,
        rest: {
          x: touch.x + (fromLeft ? 1 : -1) * bar.box.width * SKID,
          y: bar.box.y,
        },
      };
    });
    const last = landings[landings.length - 1];
    const endAt = last.stops + 300;

    const planes = landings.map((l, k) => {
      const p: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < 0 || ms > l.stops) return null;
        if (ms < l.leaves) return oval(k, ms, p);
        if (ms < l.touches)
          return bezier(
            l.from,
            l.bend,
            l.touch,
            (ms - l.leaves) / approachMs,
            p,
          );
        const u = easeOut((ms - l.touches) / skidMs);
        p.x = lerp([l.touch.x, l.rest.x], u);
        p.y = l.touch.y;
        return p;
      };
    });
    const skid: Point = { x: 0, y: 0 };

    const peeling = createBeats(
      landings,
      (l) => l.leaves,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const touching = createBeats(
      landings,
      (l) => l.touches,
      (l, k) => {
        cover!.levels(l.bar, levelsFor(l.bar.floor, levelShare, 2), l.from);
        if (l === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(l.touch);
          return;
        }
        cover!.burst(l.touch, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, landings.length - 1)));
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
          peeling.tick(ms, now);
          touching.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          for (let k = 0; k < landings.length; k++) {
            const t = (ms - landings[k].touches) / skidMs;
            if (t < 0 || t >= 1) continue;
            const at = planes[k](ms);
            if (!at) continue;
            skid.x = at.x;
            skid.y = at.y;
            drawBeamFlare(ctx, skid, FLARE * (1 - t), 1 - t, now);
          }
          for (let k = 0; k < planes.length; k++)
            drawWispBetween(
              ctx,
              planes[k],
              ms,
              now,
              WISP_SIZE * PLANE,
              0.6,
              0,
              landings[k].stops,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
