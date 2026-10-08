// the "Triangulate" event (beam; free upgrade levels and a crit tier): it
// covers its crit, whose click freezes the screen while three aim lasers
// flicker in from three corners of the screen and hunt for an income bar,
// each lagging the last, until all three cross on it and lock; then three
// blazing beams fire into it at once in a flash, a bang and a jolt that lands
// free levels; bar after bar, ever faster, the last being the clicked floor's,
// which jumps one crit tier as every bar slams in a huge blast and shake.
// Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardBars, levelsFor } from "../../eventRewards";
import type { Point } from "../../../../shared/wisp";

const KEY = "triangulate";
const MAX_BARS = 5;
// emitter e hunts LAG ms behind the one before, JITTER px off until it locks
const LAG = 50;
const JITTER = 90;
const BLADE = 16;
const FLARE = 30;
const LOCK_SHAKE: [number, number] = [0.8, 1.6];

export const forceTriangulateEvent = registerWispEvent(
  KEY,
  "Triangulate",
  () => CONFIG.triangulateEvent.chance,
  (floor, context, area) => {
    const { huntsMs, fireMs, levelShare, holdMs, mergeMs } =
      CONFIG.triangulateEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    const own = bars.find((b) => b.floor === floor);
    if (!own) return;
    // the clicked floor's bar last
    const order = [
      ...bars.filter((b) => b !== own).sort(() => Math.random() - 0.5),
      own,
    ];
    const emitters: Point[] = [
      { x: area.left + 10, y: area.top + 10 },
      { x: area.right - 10, y: area.top + 10 },
      { x: (area.left + area.right) / 2, y: area.bottom - 10 },
    ];
    const start: Point = {
      x: lerp([area.left, area.right], Math.random()),
      y: (area.top + area.bottom) / 2,
    };
    const hunts: number[] = [];
    const locks: number[] = [];
    let clock = 0;
    order.forEach((_, k) => {
      hunts.push(clock);
      clock += lerp(huntsMs, k / Math.max(1, order.length - 1));
      locks.push(clock);
      clock += fireMs;
    });
    const endAt = clock;
    const aim: Point = { x: 0, y: 0 };
    const aimOf = (e: number, k: number, ms: number): Point => {
      const from = k === 0 ? start : order[k - 1].center;
      const to = order[k].center;
      const span = locks[k] - hunts[k] - 2 * LAG;
      const u = smoothstep(clamp01((ms - hunts[k] - e * LAG) / span));
      const wobble = JITTER * (1 - u);
      aim.x =
        from.x + (to.x - from.x) * u + Math.sin(ms * 0.05 + e * 2) * wobble;
      aim.y = from.y + (to.y - from.y) * u + Math.cos(ms * 0.07 + e) * wobble;
      return aim;
    };

    const locking = createBeats(
      locks,
      (ms) => ms,
      (_, k) => {
        const bar = order[k];
        const t = k / Math.max(1, order.length - 1);
        cover!.levels(bar, levelsFor(bar.floor, levelShare, 2));
        cover!.burst(bar.center, 0.6 + 0.4 * t);
        if (bar === own) {
          cover!.tierUp(own);
          for (const b of bars) cover!.slam(b);
          cover!.blast(own.center);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LOCK_SHAKE, t));
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
        tick: (ms, now) => locking.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms >= endAt) return;
          let k = 0;
          while (k + 1 < order.length && ms >= hunts[k + 1]) k++;
          if (ms >= locks[k]) {
            const fade = 1 - clamp01((ms - locks[k]) / fireMs);
            const width =
              BLADE * (k === order.length - 1 ? 1.8 : 1) * (0.5 + 0.5 * fade);
            for (const emitter of emitters)
              drawBeam(ctx, emitter, order[k].center, width, fade);
            drawBeamFlare(ctx, order[k].center, FLARE * (0.5 + fade), 1, now);
            return;
          }
          for (let e = 0; e < emitters.length; e++)
            drawAimLaser(ctx, emitters[e], aimOf(e, k, ms));
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).some((b) => b.floor === floor),
);
