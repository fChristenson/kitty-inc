// the "Fully Charged" event (charge; a free floor): it covers its crit, whose
// click freezes the screen while a spark lights up just under the dark
// locked floor and starts drawing the light out of every bar in view, specks
// of glitter streaming up off them into it, a trickle quickening to a flood;
// it swells, glows white-hot and trembles harder and harder, streaks racing
// into it, the rumble rising, until it's full: it punches straight up into
// the lock and the floor bursts open in the biggest blast, unlocked for free
// as the screen unfreezes. Then the crit's tier pays out
import meta from "./meta";
import { COLOR } from "../../../../palette";
import { playBoostEventStream } from "../../../../sound";
import {
  chargeAt,
  drawChargeGlow,
  drawChargeStreaks,
  planCharge,
  tickCharge,
  trembleAt,
} from "../../../../shared/animationStyles/charge";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { clamp01 } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { shakeScreen } from "../../../../shared/screenShake";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";
import { findRewardBars, findRewardLocked } from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "fullyCharged";
// the spark UNDER of a floor's height below the lock; its glow GLOW and its
// streaks REACH of the screen's width across, trembling TREMBLE px
const UNDER = 0.8;
const GLOW = 0.2;
const REACH = 0.3;
const TREMBLE = 22;
const CORE: [number, number] = [WISP_SIZE * 0.8, WISP_SIZE * 2.4];
// the streams: STREAM specks off each bar, each trip CYCLE_MS at the start,
// ACCEL times as many trips by the climax
const STREAM = 10;
const CYCLE_MS = 700;
const ACCEL = 4;
const SPECK = 26;
const LOCK_GLOW = 0.5;
const OPEN_BLAST = 280;
const OPEN_SHAKE = 3.2;
const MAX_BARS = 6;

export const forceFullyChargedEvent = registerWispEvent(
  KEY,
  "Fully Charged",
  () => meta.chance,
  (floor, context, area) => {
    const { firstMs, chargeMs, punchMs, holdMs, mergeMs } = meta.values;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const width = area.right - area.left;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const home: Point = { x: lock.x, y: lock.y + FLOOR_H * UNDER };
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    // the light drawn up off every bar (or the bottom of the screen)
    const sources: Point[] = bars.length
      ? bars.map((b) => b.center)
      : [{ x: lock.x, y: area.bottom - FLOOR_H * 0.5 }];
    const spread = bars[0]?.box.width ?? width * 0.6;
    const charge = planCharge(firstMs, chargeMs, { climaxShake: 2.2 });
    const climaxMs = firstMs + chargeMs;
    const openAt = climaxMs + punchMs;

    // the spark: trembling as it charges, then punched up into the lock
    const shiver: Point = { x: 0, y: 0 };
    const core: Point = { x: 0, y: 0 };
    const coreAt = (ms: number): Point => {
      trembleAt(chargeAt(charge, Math.min(ms, climaxMs)), ms, TREMBLE, shiver);
      const u = clamp01((ms - climaxMs) / punchMs);
      const e = u * u;
      core.x = home.x + shiver.x * (1 - e);
      core.y = home.y + (lock.y - home.y) * e + shiver.y * (1 - e);
      return core;
    };
    // warped time: the streams' trips come quicker and quicker
    const trips = (ms: number) => {
      const t = Math.max(0, ms - firstMs);
      return (t + ((ACCEL - 1) * t * t) / (2 * chargeMs)) / CYCLE_MS;
    };

    const opening = createBeats(
      [openAt],
      (ms) => ms,
      () => {
        cover!.blast(lock);
        if (cover!.isLive()) shakeScreen(OPEN_SHAKE);
      },
    );

    const spot: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: openAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          if (cover?.isLive()) tickCharge(charge, ms);
          opening.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms < firstMs || ms > openAt + 900) return;
          const c = chargeAt(charge, Math.min(ms, climaxMs));
          if (ms < openAt) {
            coreAt(ms);
            // the lock warming as the charge nears it
            spot.x = lock.x;
            spot.y = lock.y;
            drawChargeGlow(ctx, spot, c * c, width * GLOW * LOCK_GLOW, now);
            drawChargeGlow(ctx, core, c, width * GLOW, now);
            if (ms < climaxMs)
              drawChargeStreaks(ctx, core, c, width * REACH, ms);
            // the streams of light up off the bars into it
            if (ms < climaxMs) {
              const trip = trips(ms);
              const previous = ctx.globalCompositeOperation;
              ctx.globalCompositeOperation = "lighter";
              beginLightBatch(ctx);
              for (let b = 0; b < sources.length; b++)
                for (let i = 0; i < STREAM; i++) {
                  const seed = hash01(i, b + 3610);
                  // not set off yet: its first trip would have begun before the start
                  if (trip + seed < 1) continue;
                  const u = (trip + seed) % 1;
                  const fromX =
                    sources[b].x + (hash01(i, b + 3611) - 0.5) * spread * 0.8;
                  const e = u * u;
                  stampGlimmer(
                    ctx,
                    fromX + (core.x - fromX) * e,
                    sources[b].y + (core.y - sources[b].y) * e,
                    SPECK * (1 - 0.5 * e),
                    i + b * STREAM,
                    i % 3 ? COLOR.heavenlyGold : COLOR.white,
                  );
                }
              endLightBatch(ctx);
              ctx.globalCompositeOperation = previous;
            }
            drawWisp(
              ctx,
              coreAt,
              ms,
              now,
              CORE[0] + (CORE[1] - CORE[0]) * c,
              c,
            );
          }
          drawDetonation(ctx, lock, ms - openAt, OPEN_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
