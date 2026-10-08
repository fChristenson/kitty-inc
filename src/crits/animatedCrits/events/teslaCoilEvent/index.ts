// the "Tesla Coil" event (lightning; free upgrade levels and worker perma
// tiers): it covers its crit, whose click freezes the screen while a big
// crackling wisp charges up over the clicked floor's button like a Tesla
// coil; it throws arc after arc of lightning, every pulse reaching further
// and coming quicker, stray bolts lashing the air round it, each arc that
// lands a crack, a bang and a big jolt giving an income bar free levels or a
// worker a perma tier; then it overloads, arcing to everything at once, and
// blows in a huge blast and shake as every bar slams. Then the crit's tier
// pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import {
  findRewardBars,
  findRewardWorkers,
  levelsFor,
  type RewardBar,
  type RewardWorker,
} from "../../eventRewards";
import { WORKER_HEIGHT } from "../../../../floors/worker";

const KEY = "teslaCoil";
const MAX_BARS = 3;
const MAX_WORKERS = 4;
const MIN_PULSES = 6;
// the coil hangs LIFT px over the button, COIL wisps big, swelling to SWELL
const LIFT = 90;
const COIL = 1.8;
const SWELL = 2.8;
// stray bolts per pulse, lashing STRAY px out
const STRAYS = 2;
const STRAY: [number, number] = [70, 160];
const PULSE_SHAKE: [number, number] = [1, 2];
const PULSE_BURST: [number, number] = [0.6, 1];

type Target = { at: Point; bar?: RewardBar; worker?: RewardWorker };

export const forceTeslaCoilEvent = registerWispEvent(
  KEY,
  "Tesla Coil",
  () => CONFIG.teslaCoilEvent.chance,
  (floor, context, area) => {
    const { pulseGapsMs, arcMs, overloadMs, levelShare, holdMs, mergeMs } =
      CONFIG.teslaCoilEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const coil = {
      x: button.x,
      y: Math.max(area.top + 60, button.y - LIFT),
    };
    const bars = context.upgradeFloorFree
      ? findRewardBars(floor, context).slice(0, MAX_BARS)
      : [];
    const workers = findRewardWorkers(floor, context)
      .sort(() => Math.random() - 0.5)
      .slice(0, MAX_WORKERS);
    const distance = (p: Point) => Math.hypot(p.x - coil.x, p.y - coil.y);
    // nearest first, so every arc reaches further
    const targets: Target[] = [
      ...bars.map((bar) => ({
        at: {
          x: bar.box.x + bar.box.width * lerp([0.2, 0.8], Math.random()),
          y: bar.center.y,
        },
        bar,
      })),
      ...workers.map((worker) => ({
        at: { x: worker.at.x, y: worker.at.y - WORKER_HEIGHT * 0.3 },
        worker,
      })),
    ].sort((a, b) => distance(a.at) - distance(b.at));
    if (targets.length === 0) return;
    const pulses = Math.max(MIN_PULSES, targets.length);
    const route = Array.from(
      { length: pulses },
      (_, k) => targets[k % targets.length],
    );
    const hits = new Map<Target, number>();
    for (const t of route) hits.set(t, (hits.get(t) ?? 0) + 1);
    const times: number[] = [];
    let clock = pulseGapsMs[0];
    route.forEach((_, k) => {
      times.push(clock);
      clock += lerp(pulseGapsMs, k / (pulses - 1));
    });
    const overloadAt = times[pulses - 1] + arcMs;
    const blastAt = overloadAt + overloadMs;
    const stray = (k: number): Bolt => {
      const angle = Math.random() * Math.PI * 2;
      const reach = lerp(STRAY, k / (pulses - 1)) * (0.7 + 0.6 * Math.random());
      return createBolt(
        coil,
        {
          x: coil.x + Math.cos(angle) * reach,
          y: coil.y + Math.sin(angle) * reach,
        },
        1,
      );
    };
    const arcs = route.map((t, k) => [
      createBolt(coil, t.at, 2),
      ...Array.from({ length: STRAYS }, () => stray(k)),
    ]);
    const overload = [
      ...targets.map((t) => createBolt(coil, t.at, 2)),
      ...Array.from({ length: 4 }, () => stray(pulses - 1)),
    ];

    const pulsing = createBeats(
      route,
      (_, k) => times[k],
      (t, k) => {
        if (t.bar)
          cover!.levels(
            t.bar,
            Math.max(
              1,
              Math.ceil(levelsFor(t.bar.floor, levelShare) / hits.get(t)!),
            ),
            coil,
          );
        if (t.worker) cover!.promote(t.worker);
        const u = k / (pulses - 1);
        cover!.burst(t.at, lerp(PULSE_BURST, u));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(PULSE_SHAKE, u));
      },
    );
    const finale = createBeats(
      [blastAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(coil);
      },
    );
    // the coil throbs up on every pulse and swells as it charges
    const coilAt = () => coil;
    const size = (ms: number): number => {
      const charge = clamp01(ms / blastAt);
      let throb = 0;
      for (const at of times) {
        const since = ms - at;
        if (since >= 0 && since < arcMs)
          throb = Math.max(throb, 1 - since / arcMs);
      }
      return WISP_SIZE * (COIL + (SWELL - COIL) * charge) * (1 + 0.35 * throb);
    };

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: blastAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        workers,
        tick: (ms, now) => {
          pulsing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < blastAt) {
            if (ms >= overloadAt) {
              const swell = 0.7 + 0.5 * clamp01((ms - overloadAt) / overloadMs);
              for (const bolt of overload) drawBolt(ctx, bolt, 1, swell);
              for (const t of targets) drawStrike(ctx, t.at, 1, swell, now);
            } else
              arcs.forEach((bolts, k) => {
                const since = ms - times[k];
                if (since < 0 || since >= arcMs) return;
                const fade = 1 - since / arcMs;
                for (const bolt of bolts) drawBolt(ctx, bolt, fade, 0.8);
                drawStrike(ctx, route[k].at, fade, fade, now);
              });
          }
          drawWispBetween(
            ctx,
            coilAt,
            ms,
            now,
            size(ms),
            clamp01(ms / blastAt),
            0,
            blastAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    (context.upgradeFloorFree !== undefined &&
      findRewardBars(floor, context).length > 0) ||
    findRewardWorkers(floor, context).length > 0,
);
