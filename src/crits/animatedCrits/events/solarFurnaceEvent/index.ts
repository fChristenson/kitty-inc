// the "Solar Furnace" event (beam; a free floor): it covers its crit, whose
// click freezes the screen while mirror wisps light up in a wide ring round
// the next locked floor; one after another a sunbeam slants down out of the
// sky onto a mirror and bounces off it onto the lock, every beam that joins
// a flare and a jolt as the focus on the lock blazes brighter and hotter,
// quicker and quicker; with every mirror trained on it the lock bursts in a
// huge blast and shake, unlocked for free. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "solarFurnace";
const MIRRORS = 8;
const RING: [number, number] = [240, 380];
const MARGIN = 50;
const SKY = 0.55;
const MIRROR = 0.4;
const SHOOT_MS = 120;
const BEAM_W = 12;
const FOCUS: [number, number] = [20, 70];
const BLAZE_MS = 220;
const JOIN_SHAKE: [number, number] = [0.3, 0.9];
const BURST_SHAKE = 2.2;

interface Mirror {
  at: Point;
  sun: Point;
  joins: number;
}

export const forceSolarFurnaceEvent = registerWispEvent(
  KEY,
  "Solar Furnace",
  () => CONFIG.solarFurnaceEvent.chance,
  (floor, context, area) => {
    const { appearMs, mirrorsMs, holdMs, mergeMs } = CONFIG.solarFurnaceEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    let clock = appearMs;
    const mirrors: Mirror[] = Array.from({ length: MIRRORS }, (_, k) => {
      // round the lock, alternating sides, kept on screen
      const a =
        Math.PI * (0.15 + (0.7 * ((k * 5) % MIRRORS)) / (MIRRORS - 1)) +
        (k % 2 ? 0 : Math.PI);
      const r = lerp(RING, Math.random());
      const at: Point = {
        x: Math.min(
          area.right - MARGIN,
          Math.max(area.left + MARGIN, lock.x + Math.cos(a) * r),
        ),
        y: Math.min(
          area.bottom - MARGIN,
          Math.max(area.top + MARGIN, lock.y + Math.sin(a) * r),
        ),
      };
      // the sunlight comes slanting down from the top edge
      const sun: Point = {
        x: at.x + (at.y - area.top) * SKY,
        y: area.top - 20,
      };
      const joins = clock;
      clock += lerp(mirrorsMs, k / (MIRRORS - 1));
      return { at, sun, joins };
    });
    const burstsAt = clock;
    const endAt = burstsAt + BLAZE_MS;
    const mirrorSpots = mirrors.map((m) => () => m.at);
    const tip: Point = { x: 0, y: 0 };

    const joining = createBeats(
      mirrors,
      (m) => m.joins + SHOOT_MS,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(JOIN_SHAKE, k / (MIRRORS - 1)));
      },
    );
    const bursting = createBeats(
      [burstsAt],
      (ms) => ms,
      () => {
        cover!.blast(lock);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(BURST_SHAKE);
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
          joining.tick(ms, now);
          bursting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          const shown = easeOut(clamp01(ms / appearMs));
          const blaze = clamp01((ms - burstsAt) / BLAZE_MS);
          let lit = 0;
          for (let k = 0; k < MIRRORS; k++) {
            const m = mirrors[k];
            drawWisp(
              ctx,
              mirrorSpots[k],
              ms,
              now,
              WISP_SIZE * MIRROR * shown,
              ms >= m.joins ? 1 : 0.3,
            );
            if (ms < m.joins) continue;
            // the sunbeam down onto the mirror, then the bounce onto the lock
            const u = clamp01((ms - m.joins) / SHOOT_MS);
            const down = Math.min(1, u * 2);
            tip.x = lerp([m.sun.x, m.at.x], down);
            tip.y = lerp([m.sun.y, m.at.y], down);
            drawBeam(ctx, m.sun, tip, BEAM_W * 0.7, 0.6 * (1 - blaze));
            if (u > 0.5) {
              const out = (u - 0.5) * 2;
              tip.x = lerp([m.at.x, lock.x], out);
              tip.y = lerp([m.at.y, lock.y], out);
              drawBeam(
                ctx,
                m.at,
                tip,
                BEAM_W * (1 + blaze * 2),
                1 - blaze * 0.5,
              );
              drawBeamFlare(ctx, m.at, 14, 0.8, now);
            }
            if (u >= 1) lit++;
          }
          if (lit > 0)
            drawBeamFlare(
              ctx,
              lock,
              lerp(FOCUS, lit / MIRRORS) * (1 + blaze),
              1,
              now,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
