// the "Ignition" event (lightning; free upgrade levels and a crit tier): it
// covers its crit, whose click freezes the screen while the income bars in
// view turn into the cylinders of an engine: a spark of lightning cracks
// across a gap at the end of each in firing order, the bar kicking like a
// piston with a bang, a jolt and free levels, round and round, revving ever
// faster as the screen rumbles; then every plug fires at once and the
// clicked floor's bar jumps a crit tier in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "ignition";
const MAX_BARS = 4;
const CYCLES = 3;
// each plug's spark gap sits GAP px off its bar's end, SPAN px tall
const GAP = 26;
const SPAN = 70;
const SPARK_MS = 110;
const FINAL_MS = 300;
const SPARK_SCALE = 0.6;
const FIRE_SHAKE: [number, number] = [0.3, 1.1];

export const forceIgnitionEvent = registerWispEvent(
  KEY,
  "Ignition",
  () => CONFIG.ignitionEvent.chance,
  (floor, context) => {
    const { firesMs, finalGapMs, levelShare, holdMs, mergeMs } =
      CONFIG.ignitionEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    if (!own) return;
    const bars = [
      ...found.filter((b) => b !== own).slice(0, MAX_BARS - 1),
      own,
    ];
    const plugs = bars.map((bar, k) => {
      const x = k % 2 === 0 ? bar.box.x - GAP : bar.box.x + bar.box.width + GAP;
      const bolt: Bolt = createBolt(
        { x, y: bar.center.y - SPAN / 2 },
        { x, y: bar.center.y + SPAN / 2 },
        1,
      );
      return { bar, bolt, at: { x, y: bar.center.y } };
    });
    // the classic firing order, round and round, quickening
    const order = plugs.length === 4 ? [0, 2, 3, 1] : plugs.map((_, k) => k);
    const total = CYCLES * order.length;
    const fires: { plug: (typeof plugs)[number]; at: number }[] = [];
    let clock = 0;
    for (let n = 0; n < total; n++) {
      clock += lerp(firesMs, n / Math.max(1, total - 1));
      fires.push({ plug: plugs[order[n % order.length]], at: clock });
    }
    const finalAt = clock + finalGapMs;
    const endAt = finalAt;

    const firing = createBeats(
      fires,
      (f) => f.at,
      (f, k) => {
        const t = k / Math.max(1, fires.length - 1);
        cover!.levels(
          f.plug.bar,
          levelsFor(f.plug.bar.floor, levelShare, 1),
          f.plug.at,
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(FIRE_SHAKE, t));
      },
    );
    const roaring = createBeats(
      [finalAt],
      (ms) => ms,
      () => {
        cover!.tierUp(own, plugs[plugs.length - 1].at);
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(own.center);
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
          firing.tick(ms, now);
          roaring.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > finalAt + FINAL_MS) return;
          for (const f of fires) {
            const t = (ms - f.at) / SPARK_MS;
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, f.plug.bolt, 1 - t, SPARK_SCALE);
            drawStrike(ctx, f.plug.at, 1 - t, 0.7, now);
          }
          const t = (ms - finalAt) / FINAL_MS;
          if (t >= 0 && t < 1)
            for (const p of plugs) {
              drawBolt(ctx, p.bolt, 1 - t, SPARK_SCALE * 2);
              drawStrike(ctx, p.at, 1 - t, 1.4, now);
            }
          // the plugs idle with a faint crackle while it revs
          if (ms < finalAt) {
            const idle = 0.15 + 0.15 * clamp01(ms / finalAt);
            for (const p of plugs)
              drawBolt(ctx, p.bolt, idle * Math.random(), SPARK_SCALE * 0.6);
          }
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
