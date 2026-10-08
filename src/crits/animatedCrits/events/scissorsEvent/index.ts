// the "Scissors" event (beam): it covers its crit, whose click freezes the
// screen while two blazing beams swing in from off its sides and clash
// crossed low over the clicked floor's button, and then swing open like the blades of
// giant scissors, the point where they cross racing up the screen spitting
// sparks and cash with every snip, a flash, a bang and a jolt, harder each
// time; it reaches the total-income readout and the beams slam together on
// it in a huge blast and shake, and the coins sweep into the total. Pays
// floor income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { totalSpot } from "../../cashFlow";
import type { Point } from "../../../../shared/wisp";

const KEY = "scissors";
const REWARD = 4;
// the blades pivot far off the screen, OUT of its width beyond its sides and
// DOWN of its height below it, so only the crossing X shows; they cross at
// LOW of its height down at first, opening until they cross on the total;
// each BLADE px across, running OVER past the crossing, off the screen
const OUT = 0.5;
const DOWN = 0.35;
const LOW = 0.88;
const BLADE = 22;
const OVER = 1.2;
const SNIPS = 6;
const SNIP_COINS = 26;
const SNIP_REACH: [number, number] = [40, 130];
const SNIP_SHAKE: [number, number] = [1, 2.1];
const FLARE: [number, number] = [24, 44];
const CLASH_SHAKE = 2.2;

export const forceScissorsEvent = registerWispEvent(
  KEY,
  "Scissors",
  () => CONFIG.scissorsEvent.chance,
  (floor, context, area) => {
    const { swingMs, openMs, holdMs, mergeMs } = CONFIG.scissorsEvent;
    const height = area.bottom - area.top;
    const width = area.right - area.left;
    const fallback = totalSpot(area);
    const pivots: [Point, Point] = [
      { x: area.left - width * OUT, y: area.bottom + height * DOWN },
      { x: area.right + width * OUT, y: area.bottom + height * DOWN },
    ];
    const low = { x: (area.left + area.right) / 2, y: area.top + height * LOW };
    const endAt = swingMs + openMs;
    // the crossing ms in: low over the button, racing up to the total
    const cross = (ms: number, into: Point): Point => {
      const total = cover?.total() ?? fallback;
      const u = easeIn(clamp01((ms - swingMs) / openMs));
      into.x = low.x + (total.x - low.x) * u;
      into.y = low.y + (total.y - low.y) * u;
      return into;
    };
    const snips = Array.from(
      { length: SNIPS },
      (_, k) => swingMs + openMs * Math.sqrt((k + 1) / (SNIPS + 1)),
    );
    const at = { x: 0, y: 0 };
    const tip = { x: 0, y: 0 };

    const snipping = createBeats(
      snips,
      (ms) => ms,
      (ms, k) => {
        const spot = cross(ms, { x: 0, y: 0 });
        const t = k / (SNIPS - 1);
        cover!.burst(spot, 0.5 + 0.5 * t);
        cover!.launchFrom(spot, sprayTargets(spot, SNIP_COINS, SNIP_REACH));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SNIP_SHAKE, t));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );
    // the blades swing in from pointing straight up, off the screen's sides,
    // and clash together low over the button
    const clash = createBeats(
      [swingMs],
      (ms) => ms,
      () => {
        cover!.burst(low, 1.2);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(CLASH_SHAKE);
      },
    );
    const reach = pivots.map(
      (p) => Math.hypot(low.x - p.x, low.y - p.y) * (1 + OVER),
    );
    const aimed = pivots.map((p) => Math.atan2(low.y - p.y, low.x - p.x));

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          clash.tick(ms, now);
          snipping.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms >= endAt + 150) return;
          const fade = 1 - clamp01((ms - endAt) / 150);
          const width = BLADE * (0.9 + 0.1 * Math.random());
          if (ms < swingMs) {
            const u = easeIn(clamp01(ms / swingMs));
            pivots.forEach((p, k) => {
              const a = -Math.PI / 2 + (aimed[k] + Math.PI / 2) * u;
              tip.x = p.x + Math.cos(a) * reach[k];
              tip.y = p.y + Math.sin(a) * reach[k];
              drawBeam(ctx, p, tip, width);
            });
            return;
          }
          cross(Math.min(ms, endAt), at);
          for (const p of pivots) {
            // each blade runs from its pivot through the crossing and on past it
            tip.x = at.x + (at.x - p.x) * OVER;
            tip.y = at.y + (at.y - p.y) * OVER;
            drawBeam(ctx, p, tip, width, fade);
          }
          drawBeamFlare(
            ctx,
            at,
            lerp(FLARE, clamp01((ms - swingMs) / openMs)),
            1,
            now,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
