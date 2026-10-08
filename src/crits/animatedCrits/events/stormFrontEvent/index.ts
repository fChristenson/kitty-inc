// the "Storm Front" event (lightning; worker perma tiers and free upgrade
// levels): it covers its crit, whose click freezes the screen while a wall
// of lightning marches across the screen from one side, bolts hammering down
// all along its front; every worker and income bar it passes takes a bolt
// of its own in a blinding strike, a bang and a jolt: a perma tier for a
// worker, free levels for a bar, ever faster; at the far edge a colossal
// bolt cracks down and every bar slams in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import {
  findRewardBars,
  findRewardWorkers,
  levelsFor,
  type RewardBar,
  type RewardWorker,
} from "../../eventRewards";
import type { Point } from "../../../../shared/wisp";

const KEY = "stormFront";
const MAX_WORKERS = 6;
const MAX_BARS = 4;
// a bolt along the front every AMBIENT_MS, up to SCATTER px off it
const AMBIENT_MS = 70;
const SCATTER = 50;
const BOLT_MS = 160;
const FINAL_MS = 260;
const FINAL_SCALE = 2.2;
const STRIKE_SHAKE: [number, number] = [0.7, 1.5];

export const forceStormFrontEvent = registerWispEvent(
  KEY,
  "Storm Front",
  () => CONFIG.stormFrontEvent.chance,
  (floor, context, area) => {
    const { sweepMs, levelShare, holdMs, mergeMs } = CONFIG.stormFrontEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    const bars = context.upgradeFloorFree
      ? findRewardBars(floor, context).slice(0, MAX_BARS)
      : [];
    if (workers.length === 0 && bars.length === 0) return;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const from = dir > 0 ? area.left : area.right;
    const width = area.right - area.left;
    const sky = area.top - 60;
    // the front speeds up as it crosses
    const frontAt = (x: number) =>
      sweepMs * Math.sqrt(Math.min(1, Math.abs(x - from) / width));
    const frontX = (ms: number) => from + dir * width * (ms / sweepMs) ** 2;
    const strike = (to: Point): Bolt =>
      createBolt({ x: to.x + dir * -80, y: sky }, to, 2);
    type Target =
      | { at: number; bolt: Bolt; worker: RewardWorker; bar?: undefined }
      | { at: number; bolt: Bolt; bar: RewardBar; worker?: undefined };
    const targets: Target[] = [
      ...workers.map((worker) => ({
        at: frontAt(worker.at.x),
        bolt: strike(worker.at),
        worker,
      })),
      ...bars.map((bar) => {
        const end: Point = {
          x: dir > 0 ? bar.box.x + 30 : bar.box.x + bar.box.width - 30,
          y: bar.center.y,
        };
        return { at: frontAt(end.x), bolt: strike(end), bar };
      }),
    ].sort((a, b) => a.at - b.at);
    const ambient = Array.from(
      { length: Math.floor(sweepMs / AMBIENT_MS) },
      (_, i) => {
        const at = i * AMBIENT_MS;
        const x = frontX(at) + (Math.random() * 2 - 1) * SCATTER;
        const y =
          area.top + (area.bottom - area.top) * (0.3 + 0.7 * Math.random());
        return {
          at,
          bolt: createBolt({ x: x - dir * 60, y: sky }, { x, y }, 1),
        };
      },
    );
    const lastBar = bars.length ? bars[bars.length - 1] : null;
    const finalTo: Point = lastBar
      ? lastBar.center
      : {
          x: dir > 0 ? area.right - 80 : area.left + 80,
          y: (area.top + area.bottom) / 2,
        };
    const finalBolt = createBolt({ x: finalTo.x, y: sky }, finalTo, 4);
    const endAt = sweepMs;

    const striking = createBeats(
      targets,
      (t) => t.at,
      (t, k) => {
        const s = k / Math.max(1, targets.length - 1);
        if (t.worker) cover!.promote(t.worker);
        else
          cover!.levels(
            t.bar,
            levelsFor(t.bar.floor, levelShare, 2),
            t.bolt.from,
          );
        cover!.burst(t.bolt.to, 0.6 + 0.4 * s);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STRIKE_SHAKE, s));
      },
    );
    const finishing = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(finalTo);
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
        workers,
        tick: (ms, now) => {
          striking.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + FINAL_MS) return;
          for (const a of ambient) {
            const t = (ms - a.at) / BOLT_MS;
            if (t >= 0 && t < 1) drawBolt(ctx, a.bolt, (1 - t) * 0.8, 0.7);
          }
          for (const target of targets) {
            const t = (ms - target.at) / BOLT_MS;
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, target.bolt, 1 - t, 1.2);
            drawStrike(ctx, target.bolt.to, 1 - t, 1.3, now);
          }
          const t = (ms - endAt) / FINAL_MS;
          if (t >= 0 && t < 1) {
            drawBolt(ctx, finalBolt, 1 - t, FINAL_SCALE);
            drawStrike(ctx, finalTo, 1 - t, FINAL_SCALE * 1.4, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    findRewardWorkers(floor, context).length > 0 ||
    (context.upgradeFloorFree !== undefined &&
      findRewardBars(floor, context).length > 0),
);
