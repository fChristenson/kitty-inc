// the "Galilean Cannon" event (bounce; a free floor): it covers its crit,
// whose click freezes the screen while a stack of four wisps, biggest at the
// bottom and smallest on top, drops onto the bottom of the screen; it
// bounces twice, lower each time, every landing a splash and a thump, and
// on the third the stack's energy all passes up into the top wisp, the
// bigger ones only hopping while the tiny one rockets up the building like
// a shot out of a cannon and smashes into the next locked floor in a huge
// blast and shake, unlocking it for free. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { dropBounce, drawBounceSplash } from "../../shared/bounce";
import { findRewardLocked } from "../eventRewards";
import { FLOOR_H, FLOOR_W } from "../constants";

const KEY = "galileanCannon";
const SIZES = [1.0, 0.75, 0.55, 0.38];
// how far each wisp sits above the one under it
const STACK = 34;
const LOW = 70;
const HIGH = 0.35;
const GRAVITY = 0.004;
const RESTITUTION = 0.55;
// each wisp's leap after the launch, as a share of the way to the lock
const LEAPS = [0.05, 0.2, 0.45, 1];
const SPLASH = 140;
const LAND_SHAKE: [number, number] = [0.6, 1.0];
const LAUNCH_SHAKE = 1.2;

export const forceGalileanCannonEvent = registerWispEvent(
  KEY,
  "Galilean Cannon",
  () => CONFIG.galileanCannonEvent.chance,
  (floor, context, area) => {
    const { launchMs, holdMs, mergeMs } = CONFIG.galileanCannonEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const floorY = area.bottom - LOW;
    const drop = dropBounce(
      { x: lock.x, y: area.top + (area.bottom - area.top) * HIGH },
      floorY,
      {
        gravity: GRAVITY,
        restitution: RESTITUTION,
        bounces: 2,
      },
    );
    const launchesAt = drop.endMs;
    const hitsAt = launchesAt + launchMs;
    const endAt = hitsAt;
    const wisps = SIZES.map((size, i) => {
      const spot: Point = { x: 0, y: 0 };
      const rest = floorY - i * STACK;
      const peak = lerp([rest, lock.y], LEAPS[i]);
      // the small ones leap and fall back; the top one flies to the lock
      const up =
        i === SIZES.length - 1
          ? launchMs
          : lerp([180, launchMs * 0.8], LEAPS[i]);
      return {
        size,
        top: i === SIZES.length - 1,
        at: (ms: number): Point => {
          if (ms < launchesAt) {
            const p = drop.at(ms);
            spot.x = p.x;
            spot.y = p.y - i * STACK;
            return spot;
          }
          const t = ms - launchesAt;
          spot.x = lock.x;
          spot.y =
            t < up
              ? lerp([rest, peak], easeOut(t / up))
              : lerp([peak, rest], easeIn(clamp01((t - up) / up)));
          return spot;
        },
      };
    });
    const landings = drop.bounces.slice(0, -1);

    const landing = createBeats(
      landings,
      (b) => b.ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, landings.length - 1)));
      },
    );
    const launching = createBeats(
      [launchesAt],
      (ms) => ms,
      () => {
        cover!.burst({ x: lock.x, y: floorY }, 0.8);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(LAUNCH_SHAKE);
      },
    );
    const hitting = createBeats(
      [hitsAt],
      (ms) => ms,
      () => {
        cover!.blast(lock);
        if (cover!.isLive()) playExplosion();
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          landing.tick(ms, now);
          launching.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          for (const b of drop.bounces)
            drawBounceSplash(ctx, b, ms - b.ms, SPLASH, now);
          for (const w of wisps)
            drawWispBetween(
              ctx,
              w.at,
              ms,
              now,
              WISP_SIZE * w.size,
              w.top ? 1 : 0.6,
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
