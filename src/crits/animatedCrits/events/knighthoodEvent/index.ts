// the "Knighthood" event (beam; worker perma tiers): it covers its crit,
// whose click freezes the screen while a wisp flies out of the clicked
// floor's button and draws a long blade of blazing light; it hovers over a
// worker and dubs them, the blade swinging down to tap one shoulder, then
// the other, each tap a flare and a ring, and on the second the worker
// climbs a perma tier with a bang and a jolt; it moves down the line,
// worker after worker, ever quicker, the last dubbing ending in a huge blast
// and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "knighthood";
const MAX_WORKERS = 6;
// the blade is BLADE px long; the hilt hangs over the worker so its tip
// reaches the shoulders SHOULDER px either side
const BLADE = 130;
const SHOULDER = 28;
const HEAD = 20;
const MOVE_MS = 140;
// the taps land at these shares of a dubbing
const TAPS = [0.35, 0.75];
const BLADE_W = 12;
const HILT = 0.5;
const FLARE = 26;
const FLARE_MS = 180;
const DUB_SHAKE: [number, number] = [0.6, 1.3];

export const forceKnighthoodEvent = registerWispEvent(
  KEY,
  "Knighthood",
  () => CONFIG.knighthoodEvent.chance,
  (floor, context) => {
    const { knightsMs, holdMs, mergeMs } = CONFIG.knighthoodEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.y - b.at.y || a.at.x - b.at.x);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const tilt = Math.asin(SHOULDER / BLADE);
    let clock = MOVE_MS;
    let from: Point = button;
    const dubs = workers.map((worker, k) => {
      const hilt: Point = {
        x: worker.at.x,
        y: worker.at.y - HEAD - Math.cos(tilt) * BLADE,
      };
      const starts = clock;
      const span = lerp(knightsMs, k / Math.max(1, workers.length - 1));
      clock += span + MOVE_MS;
      const dub = {
        worker,
        from,
        hilt,
        starts,
        span,
        taps: TAPS.map((t) => starts + span * t),
        shoulders: [1, -1].map((side) => ({
          x: worker.at.x + side * SHOULDER,
          y: worker.at.y - HEAD,
        })),
      };
      from = hilt;
      return dub;
    });
    const last = dubs[dubs.length - 1];
    const endAt = last.taps[1];
    const taps = dubs.flatMap((d) =>
      d.taps.map((at, i) => ({
        dub: d,
        at,
        shoulder: d.shoulders[i],
        second: i === 1,
      })),
    );
    const hiltAt: Point = { x: 0, y: 0 };
    const hilt = (ms: number): Point => {
      let d = dubs[0];
      for (const dub of dubs) if (ms >= dub.starts - MOVE_MS) d = dub;
      const u = smoothstep(clamp01((ms - (d.starts - MOVE_MS)) / MOVE_MS));
      hiltAt.x = lerp([d.from.x, d.hilt.x], u);
      hiltAt.y = lerp([d.from.y, d.hilt.y], u);
      return hiltAt;
    };
    // the blade's angle off straight down: raised, onto one shoulder, up,
    // onto the other
    const swing = (ms: number): number => {
      let d = dubs[0];
      for (const dub of dubs) if (ms >= dub.starts) d = dub;
      const u = clamp01((ms - d.starts) / d.span);
      const raised = Math.PI * 0.6;
      if (u < TAPS[0]) return lerp([raised, tilt], smoothstep(u / TAPS[0]));
      if (u < TAPS[1])
        return (
          -tilt +
          2 * tilt * Math.cos(Math.PI * ((u - TAPS[0]) / (TAPS[1] - TAPS[0])))
        );
      return lerp([-tilt, -raised], smoothstep((u - TAPS[1]) / (1 - TAPS[1])));
    };
    const tip: Point = { x: 0, y: 0 };

    const tapping = createBeats(
      taps,
      (t) => t.at,
      (t, k) => {
        if (!t.second) {
          cover!.burst(t.shoulder, 0.2);
          if (cover!.isLive()) playBloop();
          return;
        }
        cover!.promote(t.dub.worker);
        if (t.dub === last) {
          cover!.blast(t.dub.worker.at);
          return;
        }
        cover!.burst(t.dub.worker.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(DUB_SHAKE, k / Math.max(1, taps.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => tapping.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + FLARE_MS) return;
          const at = hilt(ms);
          const a = swing(ms);
          tip.x = at.x + Math.sin(a) * BLADE;
          tip.y = at.y + Math.cos(a) * BLADE;
          if (ms > MOVE_MS * 0.5 && ms <= endAt)
            drawBeam(ctx, at, tip, BLADE_W, 0.95);
          for (const t of taps) {
            const f = (ms - t.at) / FLARE_MS;
            if (f >= 0 && f < 1)
              drawBeamFlare(ctx, t.shoulder, FLARE, 1 - f, now);
          }
          drawWispBetween(ctx, hilt, ms, now, WISP_SIZE * HILT, 0.8, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
