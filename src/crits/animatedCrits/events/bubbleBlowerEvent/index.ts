// the "Bubble Blower" event (mix; worker perma tiers and cash): it covers its
// crit, whose click freezes the screen while a wisp flits over to a worker
// and blows: a stream of cash puffs out of it and wraps round the worker as
// a shimmering bubble of coins, which floats up off the floor and pops in a
// spray of coins, a bang and a jolt as the worker climbs a perma tier; the
// wisp flits on to the next, quicker each time, the last pop a huge blast
// and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../../../shared/coinTargets";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "bubbleBlower";
const REWARD = 2;
const MAX_WORKERS = 5;
const BUBBLE = 26;
const RADIUS = 90;
const RISE = 70;
const BLOW_SHARE = 0.55;
const SIDE = 120;
const HOP_MS = 150;
const WISP = 0.45;
const POP_COINS = 16;
const POP_SHAKE: [number, number] = [0.6, 1.3];

export const forceBubbleBlowerEvent = registerWispEvent(
  KEY,
  "Bubble Blower",
  () => CONFIG.bubbleBlowerEvent.chance,
  (floor, context, area) => {
    const { blowsMs, holdMs, mergeMs } = CONFIG.bubbleBlowerEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    let clock = 0;
    let from: Point = getButtonCenter(context.isGroundFloor);
    const blows = workers.map((worker, k) => {
      const span = lerp(blowsMs, k / Math.max(1, workers.length - 1));
      const hops = clock;
      const blowsAt = hops + HOP_MS;
      const pops = blowsAt + span;
      clock = pops;
      const perch: Point = { x: worker.at.x - SIDE, y: worker.at.y - RISE };
      const blow = { worker, from, perch, hops, blowsAt, pops, span };
      from = perch;
      return blow;
    });
    const last = blows[blows.length - 1];
    const endAt = last.pops;
    const wispAt: Point = { x: 0, y: 0 };
    const wisp = (ms: number): Point => {
      const t = Math.max(0, ms);
      let b = blows[0];
      for (const blow of blows) if (t >= blow.hops) b = blow;
      const e = easeOut(clamp01((t - b.hops) / HOP_MS));
      wispAt.x = lerp([b.from.x, b.perch.x], e);
      wispAt.y = lerp([b.from.y, b.perch.y], e) + Math.sin(t / 60) * 6;
      return wispAt;
    };
    // each bubble coin: puffed out of the wisp to its spot round the worker,
    // then floated up with the bubble, gone as it pops
    const bubblePaths = (b: (typeof blows)[number]) =>
      Array.from({ length: BUBBLE }, (_, i) => {
        const a = (i / BUBBLE) * Math.PI * 2;
        const ring = {
          x: b.worker.at.x + Math.cos(a) * RADIUS,
          y: b.worker.at.y + Math.sin(a) * RADIUS,
        };
        return (f: number) => {
          const blown = smoothstep(clamp01(f / BLOW_SHARE));
          const rise = smoothstep(clamp01((f - BLOW_SHARE) / (1 - BLOW_SHARE)));
          return {
            x: lerp([b.perch.x, ring.x], blown),
            y: lerp([b.perch.y, ring.y], blown) - rise * RISE,
            scale: f >= 0.99 ? 0 : 0.7,
          };
        };
      });

    const blowing = createBeats(
      blows,
      (b) => b.blowsAt,
      (b) => cover!.trace(bubblePaths(b), b.span),
    );
    const popping = createBeats(
      blows,
      (b) => b.pops,
      (b, k) => {
        cover!.promote(b.worker);
        const at = { x: b.worker.at.x, y: b.worker.at.y - RISE };
        if (b === last) {
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.6);
        cover!.launchFrom(
          at,
          clampTargetsY(
            ringTargets(at, POP_COINS, [RADIUS, RADIUS * 2.5]),
            area.top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(POP_SHAKE, k / Math.max(1, blows.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        workers,
        tick: (ms, now) => {
          blowing.tick(ms, now);
          popping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(ctx, wisp, ms, now, WISP_SIZE * WISP, 0.6, 0, endAt),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
