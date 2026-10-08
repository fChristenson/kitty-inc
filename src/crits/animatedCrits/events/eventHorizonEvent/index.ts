// the "Event Horizon" event (shatter; free upgrade levels and a crit tier):
// it covers its crit, whose click freezes the screen while the clicked
// floor's income bar turns into a blazing singularity: knock after knock,
// each a flash, a bang and a jolt landing free levels, cracks race out of it
// across the screen as it swells; then the whole screen shatters and every
// shard is sucked into the bar, faster and faster, which jumps one crit tier
// in a huge blast and shake as the last goes in. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeamFlare } from "../../../../shared/beam";
import {
  copyPane,
  createPane,
  drawCracks,
  drawShards,
  PANE_COPY_EARLY_MS,
  releasePane,
  type Shard,
} from "../../../../shared/shatter";
import { findRewardBars, levelsFor } from "../../eventRewards";
import type { Point } from "../../../../shared/wisp";

const KEY = "eventHorizon";
const CRACKS = 11;
// the singularity's glow swells from CORE[0] to CORE[1] px
const CORE: [number, number] = [18, 70];
// shards kick outward KICK of the way before the pull wins
const KICK = 0.12;
const KNOCK_SHAKE: [number, number] = [0.8, 1.6];

export const forceEventHorizonEvent = registerWispEvent(
  KEY,
  "Event Horizon",
  () => CONFIG.eventHorizonEvent.chance,
  (floor, context, area) => {
    const { knocksMs, pullMs, levelShare, holdMs, mergeMs } =
      CONFIG.eventHorizonEvent;
    const bar = findRewardBars(floor, context).find((b) => b.floor === floor);
    if (!bar) return;
    const impact = bar.center;
    const pane = createPane(impact, area, {
      cracks: CRACKS,
      rings: [120, 300, 520],
    });
    const knocks = knocksMs;
    const shatterAt = knocks[knocks.length - 1];
    const endAt = shatterAt + pullMs;
    const opened = (i: number) =>
      knocks[Math.floor((i * (knocks.length - 1)) / CRACKS)];
    // every shard flung out a touch, then sucked into the bar
    const pull = (shard: Shard, t: number, into: Point) => {
      const u = clamp01(t / pullMs);
      const kick =
        Math.sin(Math.PI * Math.min(1, u / KICK)) * (u < KICK ? 1 : 0);
      const suck = easeIn(clamp01((u - KICK * 0.5) / (1 - KICK * 0.5)));
      into.x = (impact.x - shard.centre.x) * suck + shard.vx * 120 * kick;
      into.y = (impact.y - shard.centre.y) * suck + shard.vy * 120 * kick;
    };

    const knocking = createBeats(
      knocks.slice(0, -1),
      (ms) => ms,
      (_, k) => {
        const t = k / Math.max(1, knocks.length - 2);
        cover!.levels(bar, levelsFor(bar.floor, levelShare, 2));
        cover!.burst(impact, 0.6 + 0.3 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(KNOCK_SHAKE, t));
      },
    );
    const breaking = createBeats(
      [shatterAt],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(2);
      },
    );
    const swallow = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        cover!.tierUp(bar);
        cover!.slam(bar);
        cover!.blast(impact);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => {
          knocking.tick(ms, now);
          breaking.tick(ms, now);
          swallow.tick(ms, now);
        },
        drawUnder: (ctx, ms, now) => {
          if (ms >= endAt) {
            releasePane(pane);
            return;
          }
          if (ms >= shatterAt - PANE_COPY_EARLY_MS) copyPane(ctx, pane);
          const swell = clamp01(ms / endAt);
          if (ms < shatterAt) drawCracks(ctx, pane, ms, opened);
          else {
            const t = ms - shatterAt;
            // the screen behind the shards blacked out by the pull
            ctx.save();
            ctx.globalAlpha = 0.85 * clamp01(t / 120);
            ctx.fillStyle = "#05030A";
            ctx.fillRect(
              area.left,
              area.top,
              area.right - area.left,
              area.bottom - area.top,
            );
            ctx.restore();
            drawShards(
              ctx,
              pane,
              t,
              1 - easeIn(clamp01(t / pullMs)) * 0.6,
              pull,
            );
          }
          drawBeamFlare(ctx, impact, lerp(CORE, swell), 1, now);
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
