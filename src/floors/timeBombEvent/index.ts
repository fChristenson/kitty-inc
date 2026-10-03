// the "Time Bomb" event (explosion; free upgrade levels): it covers its
// crit, whose click freezes the screen while a big bomb wisp flies up out
// of the clicked floor's button and hangs in the middle of the screen, its
// fuse fizzing; it ticks down, ever faster, every tick a beep, a pulse as
// it swells and a shockwave that jolts the next income bar in view with
// free levels; at zero it goes off in a huge blast and shake that slams
// every bar. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { bezier } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../shared/explosion";
import { findRewardBars, levelsFor } from "../eventRewards";

const KEY = "timeBomb";
const MAX_BARS = 4;
// the bomb grows from BOMB of a wisp to SWELL times that by zero, pulsing
// PULSE bigger on every tick
const BOMB = 1.1;
const SWELL = 1.6;
const PULSE = 0.25;
const PULSE_MS = 120;
const LOFT = 160;
const FUSE = 60;
const BLAST = 320;
const TICK_SHAKE: [number, number] = [0.3, 1.2];

export const forceTimeBombEvent = registerWispEvent(
  KEY,
  "Time Bomb",
  () => CONFIG.timeBombEvent.chance,
  (floor, context, area) => {
    const { flyMs, ticksMs, levelShare, holdMs, mergeMs } =
      CONFIG.timeBombEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const spot: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const bow: Point = {
      x: (button.x + spot.x) / 2,
      y: Math.min(button.y, spot.y) - LOFT,
    };
    // the ticks, each gap shorter than the last
    const ticks: number[] = [];
    let clock: number = flyMs;
    for (const gap of ticksMs) {
      clock += gap;
      ticks.push(clock);
    }
    const boomAt = ticks[ticks.length - 1];
    const endAt = boomAt;
    const bombAt: Point = { x: 0, y: 0 };
    const bomb = (ms: number): Point | null => {
      if (ms < 0 || ms >= boomAt) return null;
      return ms < flyMs
        ? bezier(button, bow, spot, easeOut(ms / flyMs), bombAt)
        : spot;
    };
    const size = (ms: number) => {
      const burn = clamp01((ms - flyMs) / (boomAt - flyMs));
      let pulse = 0;
      for (const t of ticks) {
        const u = (ms - t) / PULSE_MS;
        if (u >= 0 && u < 1) pulse = Math.max(pulse, Math.sin(Math.PI * u));
      }
      return BOMB * lerp([1, SWELL], burn) * (1 + PULSE * pulse);
    };

    const ticking = createBeats(
      ticks.slice(0, -1),
      (ms) => ms,
      (_, k) => {
        const bar = bars[k % bars.length];
        cover!.levels(bar, levelsFor(bar.floor, levelShare, 1), spot);
        cover!.burst(spot, 0.3 + 0.05 * k);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(TICK_SHAKE, k / Math.max(1, ticks.length - 2)));
      },
    );
    const booming = createBeats(
      [boomAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(spot);
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
          ticking.tick(ms, now);
          booming.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > boomAt + DETONATION_MS) return;
          if (ms >= flyMs && ms < boomAt)
            drawLitFuse(ctx, spot, (ms - flyMs) / (boomAt - flyMs), FUSE, now);
          drawWispBetween(
            ctx,
            bomb,
            ms,
            now,
            WISP_SIZE * size(ms),
            clamp01(ms / boomAt),
            0,
            boomAt,
          );
          drawDetonation(ctx, spot, ms - boomAt, BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
