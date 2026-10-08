// the "Static Shock" event (lightning; worker perma tiers): it covers its
// crit, whose click freezes the screen while a wisp scuffs back and forth
// across the bottom of it like socks on a carpet, building up static,
// little sparks crackling off it ever more; charged, it darts at the
// workers in view and just before it touches each one a snapping bolt
// leaps across the gap in a flash, a crack and a jolt that shocks the
// worker up a perma tier, ever faster; the last zap goes off in a huge
// blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "staticShock";
const MAX_WORKERS = 6;
const SCUFFS = 4;
const CRACKLES = 6;
// it scuffs SCUFF of the screen's width, LOW px up off the bottom; it
// darts to GAP px short of a worker before the bolt jumps
const SCUFF = 0.6;
const LOW = 60;
const GAP = 34;
const CRACKLE = 30;
const ZAP_MS = 160;
const SHOCKER = 0.55;
const ZAP_SHAKE: [number, number] = [0.6, 1.3];

export const forceStaticShockEvent = registerWispEvent(
  KEY,
  "Static Shock",
  () => CONFIG.staticShockEvent.chance,
  (floor, context, area) => {
    const { scuffMs, dartsMs, holdMs, mergeMs } = CONFIG.staticShockEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const cx = (area.left + area.right) / 2;
    const half = ((area.right - area.left) * SCUFF) / 2;
    const lowY = area.bottom - LOW;
    let clock: number = scuffMs;
    let from: Point = { x: cx, y: lowY };
    const zaps = workers.map((worker, k) => {
      const side = worker.at.x > cx ? -1 : 1;
      const stop: Point = { x: worker.at.x + side * GAP, y: worker.at.y };
      const leaves = clock;
      const span = lerp(dartsMs, k / Math.max(1, workers.length - 1));
      clock += span;
      const z = {
        worker,
        from,
        stop,
        leaves,
        zaps: clock,
        bolt: createBolt(stop, worker.at, 1),
      };
      from = stop;
      return z;
    });
    const last = zaps[zaps.length - 1];
    const endAt = last.zaps;
    const shockerAt: Point = { x: 0, y: 0 };
    const shockerPos = (ms: number, into: Point): Point => {
      if (ms < scuffMs) {
        // into position, then back and forth, ever faster
        const u = ms / scuffMs;
        const swing = Math.sin(u * u * SCUFFS * Math.PI * 2);
        const settle = clamp01(ms / 200);
        into.x = lerp([button.x, cx + swing * half], settle);
        into.y = lerp([button.y, lowY], settle);
        return into;
      }
      let z = zaps[0];
      for (const zap of zaps) if (ms >= zap.leaves) z = zap;
      const u = smoothstep(clamp01((ms - z.leaves) / (z.zaps - z.leaves)));
      into.x = lerp([z.from.x, z.stop.x], u);
      into.y = lerp([z.from.y, z.stop.y], u) - Math.sin(Math.PI * u) * 40;
      return into;
    };
    const shocker = (ms: number) =>
      ms > endAt ? null : shockerPos(ms, shockerAt);
    // crackles off it while it charges
    const crackleTo: Point = { x: 0, y: 0 };
    const crackleFrom: Point = { x: 0, y: 0 };
    const crackle = createBolt(crackleFrom, crackleTo, 0);

    const scuffing = createBeats(
      Array.from(
        { length: SCUFFS },
        (_, k) => scuffMs * Math.sqrt((k + 0.5) / SCUFFS),
      ),
      (ms) => ms,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const zapping = createBeats(
      zaps,
      (z) => z.zaps,
      (z, k) => {
        cover!.promote(z.worker);
        if (z === last) {
          cover!.blast(z.worker.at);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(ZAP_SHAKE, k / Math.max(1, zaps.length - 1)));
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
        tick: (ms, now) => {
          scuffing.tick(ms, now);
          zapping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_200) return;
          if (ms <= endAt) {
            shockerPos(ms, crackleFrom);
            const charge = clamp01(ms / scuffMs);
            const count = Math.round(CRACKLES * charge);
            for (let i = 0; i < count; i++) {
              if (Math.random() < 0.5) continue;
              const a = Math.random() * Math.PI * 2;
              crackleTo.x = crackleFrom.x + Math.cos(a) * CRACKLE;
              crackleTo.y = crackleFrom.y + Math.sin(a) * CRACKLE;
              drawBolt(ctx, crackle, 0.8, 0.25);
            }
          }
          for (const z of zaps) {
            const t = (ms - z.zaps) / ZAP_MS;
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, z.bolt, 1 - t, 0.6);
            drawStrike(ctx, z.worker.at, 1 - t, 0.8, now);
          }
          drawWispBetween(
            ctx,
            shocker,
            ms,
            now,
            WISP_SIZE * SHOCKER,
            clamp01(ms / scuffMs),
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
