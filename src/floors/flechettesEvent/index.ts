// the "Flechettes" event (gunfire; a free floor): it covers its crit,
// whose click freezes the screen while the clicked floor's button fires a
// fat shell wisp up toward the building's locked floor; short of it the
// shell bursts with a crack into a hail of wisp darts that riddle the
// floor in a storm of flashes and pops with a big jolt; shell after shell,
// ever faster, the hail ever thicker; the last tears the floor open in a
// huge blast and shake, unlocked for free as the screen unfreezes. Then
// the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { aimBullet, drawBullets, type Bullet } from "../../shared/bullets";
import { drawDetonation, DETONATION_MS } from "../../shared/explosion";
import { findRewardLocked } from "../eventRewards";
import { FLOOR_H, FLOOR_W } from "../constants";

const KEY = "flechettes";
const SHELLS = 3;
// a shell bursts BURST of the way up; each throws DARTS darts, DARTS_STEP
// more each time
const BURST = 0.6;
const DARTS = 16;
const DARTS_STEP = 8;
const DART_SPEED: [number, number] = [1.6, 2.4];
const INSET = 30;
const SHELL = 0.55;
const DART = WISP_SIZE * 0.2;
const POP = 110;
const SHELL_SHAKE: [number, number] = [0.8, 1.4];

export const forceFlechettesEvent = registerWispEvent(
  KEY,
  "Flechettes",
  () => CONFIG.flechettesEvent.chance,
  (floor, context) => {
    const { gapsMs, climbMs, holdMs, mergeMs } = CONFIG.flechettesEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const middle: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    let clock = 0;
    const darts: Bullet[] = [];
    const shells = Array.from({ length: SHELLS }, (_, k) => {
      const fired = clock;
      clock += lerp(gapsMs, k / (SHELLS - 1));
      const aimX = middle.x + (Math.random() - 0.5) * FLOOR_W * 0.3;
      const burst: Point = {
        x: lerp([button.x, aimX], BURST),
        y: lerp([button.y, middle.y], BURST),
      };
      const bursts = fired + climbMs;
      let lands = 0;
      for (let i = 0; i < DARTS + DARTS_STEP * k; i++) {
        const target: Point = {
          x: INSET + Math.random() * (FLOOR_W - INSET * 2),
          y: locked.offsetY + INSET + Math.random() * (FLOOR_H - INSET * 2),
        };
        const d = aimBullet(
          burst,
          target,
          bursts,
          lerp(DART_SPEED, Math.random()),
        );
        darts.push(d);
        lands = Math.max(lands, d.hitAt);
      }
      const at: Point = { x: 0, y: 0 };
      return {
        fired,
        bursts,
        burst,
        lands,
        at: (ms: number): Point | null => {
          if (ms < fired || ms >= bursts) return null;
          const u = (ms - fired) / climbMs;
          at.x = lerp([button.x, burst.x], u);
          at.y = lerp([button.y, burst.y], u);
          return at;
        },
      };
    });
    const last = shells[SHELLS - 1];
    const endAt = last.lands;

    const firing = createBeats(
      shells,
      (s) => s.fired,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const bursting = createBeats(
      shells,
      (s) => s.bursts,
      () => {
        if (cover?.isLive()) playExplosion();
      },
    );
    const pinging = createBeats(
      darts,
      (d) => d.hitAt,
      (d) => cover!.burst(d.to, 0.1),
    );
    const landing = createBeats(
      shells,
      (s) => s.lands,
      (s, k) => {
        if (s === last) {
          cover!.blast(middle);
          return;
        }
        if (cover!.isLive()) shakeScreen(lerp(SHELL_SHAKE, k / (SHELLS - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          firing.tick(ms, now);
          bursting.tick(ms, now);
          pinging.tick(ms, now);
          landing.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + DETONATION_MS) return;
          drawBullets(ctx, darts, ms, now, DART);
          for (const s of shells) {
            drawWispBetween(
              ctx,
              s.at,
              ms,
              now,
              WISP_SIZE * SHELL,
              0.7,
              s.fired,
              s.bursts,
            );
            drawDetonation(ctx, s.burst, ms - s.bursts, POP, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
