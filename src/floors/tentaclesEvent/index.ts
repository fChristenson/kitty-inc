// the "Tentacles" event (mix; a free floor and cash): it covers its crit,
// whose click freezes the screen while a big wisp rises up under the
// building's locked floor and lashes out tentacles of flowing cash, one
// after another, ever faster, each latching onto the floor's edge with a
// slap, a bang and a jolt; with every tentacle gripping it, the screen
// rumbles as they heave, and the floor rips open in a huge blast and shake:
// as the screen unfreezes it's unlocked for free. Pays floor income × floor
// number × REWARD, plus the floor
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { pourDurationMs, pourLine, sampleLine, type Pour } from "../cashFlow";
import { findRewardLocked } from "../eventRewards";
import { FLOOR_H, FLOOR_W } from "../constants";

const KEY = "tentacles";
const REWARD = 2;
// the wisp sits BELOW px under the locked floor; tentacles grip INSET px in
const BELOW = 240;
const INSET = 30;
// each tentacle writhes CURL px sideways in WAVES waves
const CURL = 50;
const WAVES = 1.5;
const BODY = 1.6;
const RUMBLE_MS = 70;
const GRIP_SHAKE: [number, number] = [0.8, 1.5];

export const forceTentaclesEvent = registerWispEvent(
  KEY,
  "Tentacles",
  () => CONFIG.tentaclesEvent.chance,
  (floor, context, area) => {
    const { riseMs, gapsMs, reachMs, heaveMs, holdMs, mergeMs } =
      CONFIG.tentaclesEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const y0 = locked.offsetY + INSET;
    const y1 = locked.offsetY + FLOOR_H - INSET;
    const x0 = INSET;
    const x1 = FLOOR_W - INSET;
    const heart: Point = { x: FLOOR_W / 2, y: (y0 + y1) / 2 };
    const body: Point = {
      x: FLOOR_W / 2,
      y: Math.min(area.bottom - 100, locked.offsetY + FLOOR_H + BELOW),
    };
    const grips: Point[] = [
      { x: x0, y: y1 },
      { x: x1, y: y1 },
      { x: x0, y: (y0 + y1) / 2 },
      { x: x1, y: (y0 + y1) / 2 },
      { x: x0 + 40, y: y0 },
      { x: x1 - 40, y: y0 },
    ];
    const tentacles = grips.map((grip, k) => {
      const side = k % 2 === 0 ? 1 : -1;
      const line = sampleLine((u) => {
        const dx = grip.x - body.x;
        const dy = grip.y - body.y;
        const length = Math.hypot(dx, dy) || 1;
        const wave =
          Math.sin(u * Math.PI * 2 * WAVES) *
          CURL *
          side *
          Math.sin(u * Math.PI);
        return {
          x: body.x + dx * u + (-dy / length) * wave,
          y: body.y + dy * u + (dx / length) * wave,
        };
      }, 40);
      return { grip, line };
    });
    const launches: number[] = [];
    let clock: number = riseMs;
    tentacles.forEach((_, k) => {
      launches.push(clock);
      clock += lerp(gapsMs, k / Math.max(1, tentacles.length - 1));
    });
    const grippedAt = launches[launches.length - 1] + reachMs;
    const endAt = grippedAt + heaveMs;
    const pours: Pour[] = launches.map((at) => ({
      coinsAlong: 70,
      width: 14,
      streamMs: Math.max(200, endAt - at - reachMs * 0.5),
      travelMs: reachMs,
    }));
    const rising: Point = { x: 0, y: 0 };
    const kraken = (ms: number): Point | null => {
      if (ms < 0 || ms > endAt) return null;
      const u = easeOut(clamp01(ms / riseMs));
      rising.x = body.x;
      rising.y = lerp([area.bottom + 80, body.y], u);
      return rising;
    };

    let lastRumble = -Infinity;
    const lashing = createBeats(
      tentacles,
      (_, k) => launches[k],
      (t, k) => pourLine(cover!, t.line, pours[k]),
    );
    const gripping = createBeats(
      tentacles,
      (_, k) => launches[k] + reachMs,
      (t, k) => {
        const s = k / Math.max(1, tentacles.length - 1);
        cover!.burst(t.grip, 0.6 + 0.4 * s);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(GRIP_SHAKE, s));
      },
    );
    const ripping = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(heart),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs: Math.max(
          ...pours.map((p, k) => pourDurationMs(launches[k], p)),
          endAt + holdMs + mergeMs,
        ),
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        tick: (ms, now) => {
          lashing.tick(ms, now);
          gripping.tick(ms, now);
          ripping.tick(ms, now);
          if (
            ms > grippedAt &&
            ms < endAt &&
            now - lastRumble >= RUMBLE_MS &&
            cover?.isLive()
          ) {
            lastRumble = now;
            shakeScreen(lerp([0.6, 1.4], (ms - grippedAt) / heaveMs));
          }
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            kraken,
            ms,
            now,
            WISP_SIZE * BODY,
            clamp01(ms / endAt),
            0,
            endAt,
          ),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
