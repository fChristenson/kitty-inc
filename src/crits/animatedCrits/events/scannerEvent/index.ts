// the "Scanner" event (beam): it covers its crit, whose click freezes the
// screen while a blazing scan line sweeps down it from top to bottom, cash
// popping into sight everywhere it passes as if it had been hiding in it; it hits
// the bottom with a jolt and sweeps straight back up, scooping every coin
// up with it into one line that it rams into the total-income readout in a
// huge blast and shake, and the coins sweep into the total. Pays floor
// income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { totalSpot } from "../../cashFlow";

const KEY = "scanner";
const REWARD = 4;
// COINS hidden over the screen below TOP of its height, popping in over
// POP_MS as the line passes
const COINS = 950;
const TOP = 0.16;
const POP_MS = 90;
const COIN = 0.85;
// riding the line, coins hang up to RIDE px off it
const RIDE = 10;
// the line: BAND px tall
const BAND = 46;
const RUMBLE_MS = 80;
const RUMBLE = 0.6;
const TURN_SHAKE = 1.8;

export const forceScannerEvent = registerWispEvent(
  KEY,
  "Scanner",
  () => CONFIG.scannerEvent.chance,
  (floor, context, area) => {
    const { scanMs, pauseMs, sweepMs, holdMs, mergeMs } = CONFIG.scannerEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const fallback = totalSpot(area);
    const top = area.top + height * TOP;
    const bottom = area.bottom;
    const upFrom = scanMs + pauseMs;
    const travelMs = upFrom + sweepMs;
    // the line's height ms in: down, a beat at the bottom, then back up to
    // the total
    const lineY = (ms: number) => {
      if (ms < scanMs)
        return area.top + (bottom - area.top) * clamp01(ms / scanMs);
      if (ms < upFrom) return bottom;
      const total = cover?.total() ?? fallback;
      return (
        bottom + (total.y - bottom) * easeIn(clamp01((ms - upFrom) / sweepMs))
      );
    };

    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const x = area.left + Math.random() * width;
      const y = top + Math.random() * (bottom - top - 10);
      const shownAt = (scanMs * (y - area.top)) / (bottom - area.top);
      // caught as the line comes back up past it (easeIn: solve for when)
      const caughtUp = Math.min(
        0.98,
        Math.sqrt(Math.max(0, bottom - y) / (bottom - fallback.y)),
      );
      const caughtAt = upFrom + sweepMs * caughtUp;
      const lag = (Math.random() - 0.5) * RIDE * 2;
      return (f) => {
        const ms = f * travelMs;
        if (ms < shownAt) return { x, y, scale: 0 };
        if (ms < caughtAt)
          return { x, y, scale: COIN * Math.min(1, (ms - shownAt) / POP_MS) };
        const total = cover?.total() ?? fallback;
        // from where it was caught, gathering in onto the total
        const s = clamp01(
          (clamp01((ms - upFrom) / sweepMs) - caughtUp) / (1 - caughtUp || 1),
        );
        return {
          x: x + (total.x - x) * s * s,
          y: lineY(ms) + lag * Math.sin(Math.PI * s),
          scale: COIN,
        };
      };
    });

    let lastRumble = -Infinity;
    const turn = createBeats(
      [scanMs],
      (ms) => ms,
      () => {
        if (!cover?.isLive()) return;
        playSwoosh();
        shakeScreen(TURN_SHAKE);
      },
    );
    const finale = createBeats(
      [travelMs],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travelMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          turn.tick(ms, now);
          finale.tick(ms, now);
          if (
            ms < travelMs &&
            now - lastRumble >= RUMBLE_MS &&
            cover?.isLive()
          ) {
            lastRumble = now;
            shakeScreen(RUMBLE);
          }
        },
        drawOver: (ctx, ms, now) => {
          if (ms >= travelMs) return;
          const total = cover?.total() ?? fallback;
          // narrowing onto the total on the way up
          const up = ms < upFrom ? 0 : clamp01((ms - upFrom) / sweepMs);
          const half = lerp([width / 2, 20], up * up);
          const cx = lerp([(area.left + area.right) / 2, total.x], up);
          const y = lineY(ms);
          drawBeam(ctx, { x: cx - half, y }, { x: cx + half, y }, BAND);
          drawBeamFlare(ctx, { x: cx - half, y }, BAND * 0.5, 1, now);
          drawBeamFlare(ctx, { x: cx + half, y }, BAND * 0.5, 1, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travelMs);
    playBoostEventStream();
  },
);
