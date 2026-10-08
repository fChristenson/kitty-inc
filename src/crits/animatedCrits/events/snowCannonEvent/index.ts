// the "Snow Cannon" event (spray; a free floor): it covers its crit, whose
// click freezes the screen while a snow-cannon wisp swings up in a bottom
// corner and blasts a towering plume of glittering gold mist high over the
// screen in roaring bursts, recoiling with each; the plume arcs over and
// falls like snow onto the locked floor, settling on its lock thicker and
// brighter with every burst, each a thud and a jolt, until the lock is
// buried and bursts open in a huge blast and shake, the floor unlocked for
// free. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { drawWispHead, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawSpray,
  drawSprayCoat,
  drawSprayMist,
  planSpray,
  type Spray,
} from "../../../../shared/spray";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "snowCannon";
const BURSTS = 3;
const INSET = 90;
const UP = 70;
// how far droplets sag under the spray's gravity, as a share of its reach
const SAG = 0.35;
const FLIGHT_MS = 600;
const SPREAD = 0.16;
const WOBBLE = 0.05;
const RECOIL = 26;
const NOZZLE = 0.6;
const DROPLET = WISP_SIZE * 2.6;
const COAT_W = 300;
const COAT_H = 200;
const FLASH_MS = 220;
const FIRE_SHAKE = 0.4;
const LAND_SHAKE: [number, number] = [0.5, 1.0];

export const forceSnowCannonEvent = registerWispEvent(
  KEY,
  "Snow Cannon",
  () => CONFIG.snowCannonEvent.chance,
  (floor, context, area) => {
    const { burstsMs, gapMs, holdMs, mergeMs } = CONFIG.snowCannonEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const side = Math.random() < 0.5 ? -1 : 1;
    const base: Point = {
      x: side < 0 ? area.left + INSET : area.right - INSET,
      y: area.bottom - UP,
    };
    // lofted so the mist sags down onto the lock: solve for the reach r
    // with lock = base + r(cos a, sin a) + (0, SAG r)
    const dx = lock.x - base.x;
    const dy = lock.y - base.y;
    const k = 1 - SAG * SAG;
    const reach =
      (-2 * SAG * dy +
        Math.sqrt(4 * SAG * SAG * dy * dy + 4 * k * (dx * dx + dy * dy))) /
      (2 * k);
    const aim = Math.atan2(dy - SAG * reach, dx);
    let clock: number = 0;
    const sprays: Spray[] = Array.from({ length: BURSTS }, (_, i) => {
      const startMs = clock;
      const endMs = startMs + lerp(burstsMs, i / Math.max(1, BURSTS - 1));
      clock = endMs + gapMs;
      return planSpray(
        base,
        (ms) => aim + Math.sin((ms - startMs) * 0.012) * WOBBLE,
        { startMs, endMs, reach, spread: SPREAD, flightMs: FLIGHT_MS },
      );
    });
    const lands = sprays.map((s) => s.endMs + FLIGHT_MS * 0.8);
    const lastLand = lands[lands.length - 1];
    const endAt = lastLand + FLASH_MS;
    const nozzle: Point = { x: 0, y: 0 };
    const nozzleAt = (ms: number): Point | null => {
      if (ms < 0 || ms > lastLand) return null;
      const s = sprays.find((sp) => ms >= sp.startMs && ms <= sp.endMs);
      const kick = s
        ? Math.sin(Math.min(1, (ms - s.startMs) / 80) * Math.PI)
        : 0;
      nozzle.x = base.x - Math.cos(aim) * RECOIL * kick;
      nozzle.y = base.y - Math.sin(aim) * RECOIL * kick;
      return nozzle;
    };

    const firing = createBeats(
      sprays,
      (s) => s.startMs,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(FIRE_SHAKE);
      },
    );
    const settling = createBeats(
      lands,
      (ms) => ms,
      (ms, i) => {
        if (ms === lastLand) {
          cover!.blast(lock);
          return;
        }
        cover!.burst(lock, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LAND_SHAKE, i / Math.max(1, BURSTS - 1)));
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
          firing.tick(ms, now);
          settling.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          // how much of each burst has come down on the lock so far
          let settled = 0;
          for (const s of sprays)
            settled += clamp01(
              (ms - s.startMs - FLIGHT_MS * 0.8) / (s.endMs - s.startMs),
            );
          const flash = ms > lastLand ? 1 - (ms - lastLand) / FLASH_MS : 0;
          drawSprayCoat(
            ctx,
            lock,
            COAT_W,
            COAT_H,
            clamp01(settled / BURSTS),
            flash,
          );
          for (const s of sprays) {
            drawSpray(ctx, s, ms, now, DROPLET);
            drawSprayMist(
              ctx,
              lock,
              ms - s.startMs - FLIGHT_MS * 0.8,
              ms < s.endMs + FLIGHT_MS ? 1 : 0,
              DROPLET * 1.6,
              now,
            );
          }
          drawWispHead(ctx, nozzleAt, ms, now, WISP_SIZE * NOZZLE, 0.8);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
