// the "Hoberman" event (beam; a free floor): it covers its crit, whose click
// freezes the screen while a ring of scissoring beams like a Hoberman toy
// unfolds round the building's locked floor, turning; it breathes in and
// out, each breath wider and quicker, every swell a flash, a crack and a
// jolt; then it springs wide open across the screen and snaps shut on the
// lock, crushing it in a colossal blast and shake, and the floor bursts
// open, unlocked for free. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { drawGlitterLight, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "hoberman";
const LINKS = 10;
// each breath swells to its peak, then sinks to its trough
const PEAKS = [220, 300, 380];
const TROUGHS = [110, 140, 170];
const START = 40;
const WIDE = 600;
// the inner joints' radius as a share of the outer, flattening as it opens
const RATIO: [number, number] = [0.45, 0.85];
const TURN = 0.0015;
const BEAM = 9;
const JOINT = 14;
const SWELL_SHAKE: [number, number] = [0.6, 1.2];

export const forceHobermanEvent = registerWispEvent(
  KEY,
  "Hoberman",
  () => CONFIG.hobermanEvent.chance,
  (floor, context) => {
    const { breathsMs, openMs, crushMs, holdMs, mergeMs } =
      CONFIG.hobermanEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    // the ring's radius over time, eased between each key
    const keys: { ms: number; r: number }[] = [{ ms: 0, r: START }];
    const swells: number[] = [];
    let clock = 0;
    PEAKS.forEach((peak, k) => {
      const breath = lerp(breathsMs, k / (PEAKS.length - 1));
      clock += breath * 0.55;
      keys.push({ ms: clock, r: peak });
      swells.push(clock);
      clock += breath * 0.45;
      keys.push({ ms: clock, r: TROUGHS[k] });
    });
    clock += openMs;
    keys.push({ ms: clock, r: WIDE });
    const crushAt = clock + crushMs;
    keys.push({ ms: crushAt, r: 0 });
    const radiusAt = (ms: number) => {
      let k = 1;
      while (k < keys.length - 1 && ms > keys[k].ms) k++;
      const a = keys[k - 1];
      const b = keys[k];
      return lerp([a.r, b.r], smoothstep(clamp01((ms - a.ms) / (b.ms - a.ms))));
    };
    const outer = Array.from({ length: LINKS * 2 }, () => ({ x: 0, y: 0 }));
    const inner = Array.from({ length: LINKS * 2 }, () => ({ x: 0, y: 0 }));

    const swelling = createBeats(
      swells,
      (ms) => ms,
      (_, k) => {
        cover!.burst(lock, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SWELL_SHAKE, k / (swells.length - 1)));
      },
    );
    const crushing = createBeats(
      [crushAt],
      (ms) => ms,
      () => {
        cover!.blast(lock);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(2.6);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: crushAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          swelling.tick(ms, now);
          crushing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms >= crushAt) return;
          const r = radiusAt(ms);
          const ratio = lerp(RATIO, clamp01(r / WIDE));
          const spin = ms * TURN;
          // two zigzags of links, crossing in scissor pairs
          for (let i = 0; i < LINKS * 2; i++) {
            const a = spin + (i / (LINKS * 2)) * Math.PI * 2;
            const far = i % 2 === 0 ? r : r * ratio;
            const near = i % 2 === 0 ? r * ratio : r;
            outer[i].x = lock.x + Math.cos(a) * far;
            outer[i].y = lock.y + Math.sin(a) * far;
            inner[i].x = lock.x + Math.cos(a) * near;
            inner[i].y = lock.y + Math.sin(a) * near;
          }
          for (let i = 0; i < LINKS * 2; i++) {
            const next = (i + 1) % (LINKS * 2);
            drawBeam(ctx, outer[i], outer[next], BEAM, 0.9);
            drawBeam(ctx, inner[i], inner[next], BEAM, 0.9);
          }
          for (let i = 0; i < LINKS * 2; i += 2)
            drawGlitterLight(ctx, outer[i].x, outer[i].y, JOINT, i, 1, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
