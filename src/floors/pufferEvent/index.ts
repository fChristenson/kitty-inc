// the "Puffer" event (mix; cash): it covers its crit, whose click freezes the
// screen while a puffer wisp swims out of the clicked floor's button to the
// middle of the screen and gulps: rivers of cash rush into it from every
// edge as it swells and swells, trembling, the screen rumbling; then it
// puffs up all at once in a bang and a big jolt, firing spikes of cash out
// every way, and pops in a huge blast and shake as the coins sweep into the
// total. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { fireBullet } from "../../shared/bullets";
import { pourDurationMs, pourLine, sampleLine, type Pour } from "../cashFlow";

const KEY = "puffer";
const REWARD = 4;
const GULPS = 6;
const SPIKES = 10;
const EDGE = 20;
const SWIM_MS = 250;
const PUFFER: [number, number] = [0.6, 1.5];
const RUMBLE_MS = 90;

export const forcePufferEvent = registerWispEvent(
  KEY,
  "Puffer",
  () => CONFIG.pufferEvent.chance,
  (floor, context, area) => {
    const { gulpMs, spikeMs, holdMs, mergeMs } = CONFIG.pufferEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const box = {
      left: area.left + EDGE,
      right: area.right - EDGE,
      top: area.top + EDGE + 100,
      bottom: area.bottom - EDGE,
    };
    const straight = (from: Point, to: Point) =>
      sampleLine(
        (u) => ({ x: lerp([from.x, to.x], u), y: lerp([from.y, to.y], u) }),
        24,
      );
    const turn = Math.random() * Math.PI;
    const gulps = Array.from({ length: GULPS }, (_, i) =>
      straight(
        fireBullet(center, turn + (i / GULPS) * Math.PI * 2, 0, 1, box).to,
        center,
      ),
    );
    const spikes = Array.from({ length: SPIKES }, (_, i) =>
      straight(
        center,
        fireBullet(center, turn + ((i + 0.5) / SPIKES) * Math.PI * 2, 0, 1, box)
          .to,
      ),
    );
    const gulp: Pour = {
      coinsAlong: 600,
      width: 30,
      streamMs: gulpMs * 0.8,
      travelMs: gulpMs * 0.5,
    };
    const spike: Pour = {
      coinsAlong: 700,
      width: 26,
      streamMs: 250,
      travelMs: spikeMs,
    };
    const puffAt = SWIM_MS + gulpMs;
    const endAt = puffAt + spikeMs;
    const durationMs = Math.max(
      pourDurationMs(puffAt, spike),
      endAt + holdMs + mergeMs,
    );
    const pufferAt: Point = { x: 0, y: 0 };
    const puffer = (ms: number): Point => {
      const u = easeOut(Math.min(1, ms / SWIM_MS));
      const shiver =
        ms > SWIM_MS && ms < puffAt ? 4 * ((ms - SWIM_MS) / gulpMs) : 0;
      pufferAt.x = lerp([button.x, center.x], u) + Math.sin(ms * 0.9) * shiver;
      pufferAt.y = lerp([button.y, center.y], u) + Math.cos(ms * 1.2) * shiver;
      return pufferAt;
    };
    let lastRumble = -Infinity;

    const gulping = createBeats(
      [SWIM_MS],
      (ms) => ms,
      () => {
        for (const line of gulps) pourLine(cover!, line, gulp);
      },
    );
    const puffing = createBeats(
      [puffAt],
      (ms) => ms,
      () => {
        for (const line of spikes) pourLine(cover!, line, spike);
        cover!.burst(center, 1.1);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(1.3);
      },
    );
    const popping = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(center),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          gulping.tick(ms, now);
          puffing.tick(ms, now);
          popping.tick(ms, now);
          if (
            ms > SWIM_MS &&
            ms < puffAt &&
            now - lastRumble > RUMBLE_MS &&
            cover?.isLive()
          ) {
            lastRumble = now;
            shakeScreen(0.2 + 0.5 * ((ms - SWIM_MS) / gulpMs));
          }
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          const swell = lerp(PUFFER, clamp01((ms - SWIM_MS) / gulpMs));
          drawWispBetween(
            ctx,
            puffer,
            ms,
            now,
            WISP_SIZE * swell,
            swell / 1.5,
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
