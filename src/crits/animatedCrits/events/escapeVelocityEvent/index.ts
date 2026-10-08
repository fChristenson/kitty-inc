// the "Escape Velocity" event (wisp; a free floor): it covers its crit,
// whose click freezes the screen while a probe wisp falls into orbit round
// the clicked floor's button, whipping round it on a tight ellipse; every
// time it skims past the button it fires a burn with a flare, a whoosh and
// a jolt, flinging it out on a wider, faster orbit, until the last burn
// hurls it free and it streaks away into the next locked floor, which
// bursts open in a huge blast and shake, unlocked for free. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playSlamExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import { drawBeamFlare } from "../../../../shared/beam";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "escapeVelocity";
// how close it skims past the button, and how far out each orbit swings
const PERI = 70;
const APOS = [170, 280, 420, 580];
const SWING = 260;
const BURN_MS = 180;
const SIZE: [number, number] = [0.4, 0.75];
const BURN_SHAKE: [number, number] = [0.5, 1.2];
const HIT_SHAKE = 2.4;

interface Orbit {
  starts: number;
  ends: number;
  a: number;
  b: number;
  e: number;
}

export const forceEscapeVelocityEvent = registerWispEvent(
  KEY,
  "Escape Velocity",
  () => CONFIG.escapeVelocityEvent.chance,
  (floor, context) => {
    const { orbitsMs, escapeMs, holdMs, mergeMs } = CONFIG.escapeVelocityEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const sun = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    // each orbit's far end points at the lock
    const reach = Math.hypot(lock.x - sun.x, lock.y - sun.y) || 1;
    const dx = (lock.x - sun.x) / reach;
    const dy = (lock.y - sun.y) / reach;
    const nx = -dy;
    const ny = dx;
    let clock = 0;
    const orbits: Orbit[] = APOS.map((apo, k) => {
      const far = Math.min(apo, reach * 0.8);
      const a = (PERI + far) / 2;
      const e = (far - PERI) / (far + PERI);
      const starts = clock;
      clock += lerp(orbitsMs, k / (APOS.length - 1));
      return { starts, ends: clock, a, b: a * Math.sqrt(1 - e * e), e };
    });
    const escapes = clock;
    const hits = escapes + escapeMs;
    const peri: Point = { x: sun.x - dx * PERI, y: sun.y - dy * PERI };
    const bend: Point = {
      x: peri.x + nx * SWING - dx * SWING * 0.3,
      y: peri.y + ny * SWING - dy * SWING * 0.3,
    };
    const spot: Point = { x: 0, y: 0 };
    // Kepler's equation, so it whips fast past the button and hangs out far
    const probeAt = (ms: number): Point | null => {
      if (ms > hits) return null;
      if (ms >= escapes)
        return bezier(
          peri,
          bend,
          lock,
          easeIn((ms - escapes) / escapeMs),
          spot,
        );
      const t = Math.max(0, ms);
      let o = orbits[0];
      for (const orbit of orbits) {
        o = orbit;
        if (t < orbit.ends) break;
      }
      const m = (Math.PI * 2 * (t - o.starts)) / (o.ends - o.starts);
      let E = m;
      for (let i = 0; i < 5; i++)
        E -= (E - o.e * Math.sin(E) - m) / (1 - o.e * Math.cos(E));
      const along = -o.a * Math.cos(E) + (o.a - PERI);
      const side = o.b * Math.sin(E);
      spot.x = sun.x + dx * along + nx * side;
      spot.y = sun.y + dy * along + ny * side;
      return spot;
    };

    const burning = createBeats(
      orbits,
      (o) => o.ends,
      (_, k) => {
        cover!.burst(peri, 0.4);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(BURN_SHAKE, k / (orbits.length - 1)));
      },
    );
    const smashing = createBeats(
      [hits],
      (ms) => ms,
      () => {
        cover!.blast(lock);
        if (!cover!.isLive()) return;
        playSlamExplosion();
        shakeScreen(HIT_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: hits + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          burning.tick(ms, now);
          smashing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > hits + 400) return;
          for (const o of orbits) {
            const t = (ms - o.ends) / BURN_MS;
            if (t >= 0 && t < 1) drawBeamFlare(ctx, peri, 30, 1 - t, now);
          }
          let k = 0;
          while (k < orbits.length && ms >= orbits[k].ends) k++;
          const grow = k / orbits.length;
          drawWisp(
            ctx,
            probeAt,
            ms,
            now,
            WISP_SIZE * lerp(SIZE, grow),
            clamp01(ms / escapes),
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
