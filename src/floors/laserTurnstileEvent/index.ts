// the "Laser Turnstile" event (beam; free upgrade levels): it covers its
// crit, whose click freezes the screen while a hub wisp lights up among the
// income bars, flickering aim lines out four ways; then four blazing beams
// fire in a cross and spin like a turnstile, faster and faster, and every
// time a beam sweeps across a bar it flashes with a crack, a jolt and free
// levels; at full spin the beams flare wide and the hub blows in a huge
// blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../shared/beam";
import { createBeats } from "../../shared/eventBeats";
import { findRewardBars, levelsFor, type RewardBar } from "../eventRewards";

const KEY = "laserTurnstile";
const MAX_BARS = 5;
const ARMS = 4;
const TURNS = 2.5;
const AIM_MS = 260;
const FLARE_MS = 200;
const LENGTH = 1100;
const WIDTH = 16;
const PASS_FLASH_MS = 120;
const SAMPLE_MS = 4;
const HUB = 0.6;
const PASS_SHAKE: [number, number] = [0.3, 0.9];
const POP_GAP_MS = 50;

export const forceLaserTurnstileEvent = registerWispEvent(
  KEY,
  "Laser Turnstile",
  () => CONFIG.laserTurnstileEvent.chance,
  (floor, context, area) => {
    const { spinMs, levelShare, holdMs, mergeMs } = CONFIG.laserTurnstileEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const hub: Point = {
      x: (area.left + area.right) / 2,
      y: (bars[0].center.y + bars[bars.length - 1].center.y) / 2 + 60,
    };
    const angleAt = (ms: number): number => {
      const u = clamp01((ms - AIM_MS) / spinMs);
      return Math.PI * 2 * TURNS * (0.4 * u + 0.6 * u * u);
    };
    const quarter = (Math.PI * 2) / ARMS;
    const passes: { bar: RewardBar; at: number }[] = [];
    for (const bar of bars) {
      const target = Math.atan2(bar.center.y - hub.y, bar.center.x - hub.x);
      const gap = (ms: number) =>
        (((target - angleAt(ms)) % quarter) + quarter) % quarter;
      for (let ms = AIM_MS; ms < AIM_MS + spinMs; ms += SAMPLE_MS)
        if (gap(ms + SAMPLE_MS) > gap(ms)) passes.push({ bar, at: ms });
    }
    passes.sort((a, b) => a.at - b.at);
    const spinEnd = AIM_MS + spinMs;
    const endAt = spinEnd + FLARE_MS;
    const ends: Point[] = Array.from({ length: ARMS }, () => ({ x: 0, y: 0 }));
    let lastPop = -Infinity;

    const passing = createBeats(
      passes,
      (p) => p.at,
      (p, k) => {
        cover!.levels(p.bar, levelsFor(p.bar.floor, levelShare, 1), hub);
        cover!.burst(p.bar.center, 0.35);
        if (!cover!.isLive() || p.at - lastPop < POP_GAP_MS) return;
        lastPop = p.at;
        playBloop();
        shakeScreen(lerp(PASS_SHAKE, k / Math.max(1, passes.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(hub);
        if (cover!.isLive()) playExplosion();
      },
    );

    const at = (): Point => hub;
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          passing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          const turn = angleAt(ms);
          for (let i = 0; i < ARMS; i++) {
            const a = turn + i * quarter;
            ends[i].x = hub.x + Math.cos(a) * LENGTH;
            ends[i].y = hub.y + Math.sin(a) * LENGTH;
          }
          if (ms < AIM_MS) {
            for (const end of ends) drawAimLaser(ctx, hub, end);
          } else {
            let flash = 0;
            for (const p of passes) {
              const t = (ms - p.at) / PASS_FLASH_MS;
              if (t >= 0 && t < 1) flash = Math.max(flash, 1 - t);
            }
            const flare = clamp01((ms - spinEnd) / FLARE_MS);
            const width = WIDTH * (1 + 0.6 * flash + 3 * flare);
            for (const end of ends) drawBeam(ctx, hub, end, width, 1);
            drawBeamFlare(ctx, hub, 40 + 80 * flare, 1, now);
          }
          drawWispBetween(ctx, at, ms, now, WISP_SIZE * HUB, 1, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
