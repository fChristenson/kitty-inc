// the "Radar" event (experiment: the screen as a radar display; worker
// perma tiers): it covers its crit, whose click freezes the screen while it
// dims down into a radar scope round the clicked floor's button, a blazing
// sweep arm wheeling round it trailing a fading wake; every worker in view
// the sweep passes over lights up as a glowing blip with a ping and a jolt
// and climbs a perma tier; the sweep spins ever faster, and on its last
// lap the whole scope flares white in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "radar";
const MAX_WORKERS = 8;
// the sweep laps LAPS times, ever faster, trailing WAKE beams spread over
// WAKE_ARC rad; the scope dims to DIM
const LAPS = 2;
const WAKE = 6;
const WAKE_ARC = 0.5;
const DIM = 0.45;
const ARM = 10;
const BLIP = 26;
const BLIP_MS = 700;
const SAMPLE_MS = 4;
const BLIP_GLOW = fadeStops(COLOR.heavenlyGold);
const CORE_GLOW = fadeStops(COLOR.white);
const PING_SHAKE: [number, number] = [0.4, 1];

export const forceRadarEvent = registerWispEvent(
  KEY,
  "Radar",
  () => CONFIG.radarEvent.chance,
  (floor, context, area) => {
    const { dimMs, sweepMs, holdMs, mergeMs } = CONFIG.radarEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const hub: Point = getButtonCenter(context.isGroundFloor);
    const reach = Math.max(
      ...[
        [area.left, area.top],
        [area.right, area.top],
        [area.left, area.bottom],
        [area.right, area.bottom],
      ].map(([x, y]) => Math.hypot(x - hub.x, y - hub.y)),
    );
    const endAt = dimMs + sweepMs;
    const sweep = (ms: number) =>
      -Math.PI / 2 +
      Math.PI * 2 * LAPS * clamp01((ms - dimMs) / sweepMs) ** 1.4;
    // when the sweep first passes each worker
    const blips: { worker: (typeof workers)[number]; at: number }[] = [];
    const angles = workers.map((w) =>
      Math.atan2(w.at.y - hub.y, w.at.x - hub.x),
    );
    const wrap = (a: number) =>
      ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    let last = sweep(dimMs);
    for (let ms = dimMs + SAMPLE_MS; ms <= endAt; ms += SAMPLE_MS) {
      const now = sweep(ms);
      workers.forEach((worker, i) => {
        if (blips.some((b) => b.worker === worker)) return;
        if (wrap(angles[i] - last) <= now - last)
          blips.push({ worker, at: ms });
      });
      last = now;
    }
    const tip: Point = { x: 0, y: 0 };

    const pinging = createBeats(
      blips,
      (b) => b.at,
      (b, k) => {
        cover!.promote(b.worker);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(PING_SHAKE, k / Math.max(1, blips.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(hub),
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
          pinging.tick(ms, now);
          finale.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          const fade =
            ms < dimMs ? ms / dimMs : ms > endAt ? 1 - (ms - endAt) / 300 : 1;
          if (fade <= 0) return;
          ctx.globalAlpha = DIM * fade;
          ctx.fillStyle = "#000000";
          ctx.fillRect(
            area.left,
            area.top,
            area.right - area.left,
            area.bottom - area.top,
          );
          ctx.globalAlpha = 1;
        },
        drawOver: (ctx, ms) => {
          if (ms > endAt + BLIP_MS) return;
          if (ms >= dimMs && ms <= endAt) {
            const a = sweep(ms);
            for (let i = WAKE; i >= 0; i--) {
              const back = a - (WAKE_ARC * i) / WAKE;
              tip.x = hub.x + Math.cos(back) * reach;
              tip.y = hub.y + Math.sin(back) * reach;
              drawBeam(
                ctx,
                hub,
                tip,
                i === 0 ? ARM : ARM * 2,
                i === 0 ? 0.95 : 0.25 * (1 - i / WAKE),
              );
            }
            ctx.globalCompositeOperation = "lighter";
            drawGlow(ctx, CORE_GLOW, hub.x, hub.y, 30);
            ctx.globalCompositeOperation = "source-over";
          }
          ctx.globalCompositeOperation = "lighter";
          for (const b of blips) {
            const age = (ms - b.at) / BLIP_MS;
            if (age < 0 || age >= 1) continue;
            ctx.globalAlpha = 1 - age;
            drawGlow(
              ctx,
              BLIP_GLOW,
              b.worker.at.x,
              b.worker.at.y,
              BLIP * (1 + 1.5 * age),
            );
          }
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
