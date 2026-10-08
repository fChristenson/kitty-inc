// the "Heliograph" event (beam; worker perma tiers): it covers its crit,
// whose click freezes the screen while a mirror wisp flies out of the
// clicked floor's button and catches a shaft of sunlight blazing in from
// the corner of the screen; it tilts and throws the reflection, a beam that
// swings from worker to worker, flashing on each with a flare, a pop and a
// jolt as they climb a perma tier, the mirror flicking faster and faster,
// the last flash blazing in a huge blast and shake. Then the crit's tier
// pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp, smoothstep } from "../../../../shared/easing";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardWorkers } from "../../eventRewards";

const KEY = "heliograph";
const MAX_WORKERS = 6;
const TOP = 200;
const SETUP_MS = 260;
const SUN_WIDTH = 30;
const RAY_WIDTH = 18;
const FLASH_MS = 120;
const FLARE = 44;
const MIRROR = 0.5;
const FLASH_SHAKE: [number, number] = [0.5, 1.2];

export const forceHeliographEvent = registerWispEvent(
  KEY,
  "Heliograph",
  () => CONFIG.heliographEvent.chance,
  (floor, context, area) => {
    const { swingsMs, holdMs, mergeMs } = CONFIG.heliographEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const mirror: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + TOP,
    };
    const sun: Point = {
      x: button.x < mirror.x ? area.right : area.left,
      y: area.top,
    };
    let clock: number = SETUP_MS;
    let aim: Point = { x: mirror.x, y: mirror.y + 200 };
    const flashes = workers.map((worker, k) => {
      const from = aim;
      const swings = clock;
      const lands =
        swings + lerp(swingsMs, k / Math.max(1, workers.length - 1));
      clock = lands + FLASH_MS;
      aim = worker.at;
      return { worker, from, swings, lands };
    });
    const last = flashes[flashes.length - 1];
    const endAt = last.lands + FLASH_MS;
    const mirrorAt: Point = { x: 0, y: 0 };
    const mirrorPath = (ms: number): Point => {
      const u = easeOut(clamp01(ms / SETUP_MS));
      mirrorAt.x = lerp([button.x, mirror.x], u);
      mirrorAt.y = lerp([button.y, mirror.y], u);
      return mirrorAt;
    };
    const spot: Point = { x: 0, y: 0 };

    const flashing = createBeats(
      flashes,
      (f) => f.lands,
      (f, k) => {
        cover!.promote(f.worker);
        if (f === last) {
          cover!.blast(f.worker.at);
          return;
        }
        cover!.burst(f.worker.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(FLASH_SHAKE, k / Math.max(1, flashes.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => flashing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          const m = mirrorPath(ms);
          const on = clamp01(ms / SETUP_MS);
          drawBeam(ctx, sun, m, SUN_WIDTH, on * 0.8);
          if (ms >= SETUP_MS) {
            let f = flashes[0];
            for (const flash of flashes) if (ms >= flash.swings) f = flash;
            const u = smoothstep(
              clamp01((ms - f.swings) / (f.lands - f.swings)),
            );
            spot.x = lerp([f.from.x, f.worker.at.x], u);
            spot.y = lerp([f.from.y, f.worker.at.y], u);
            const t = (ms - f.lands) / FLASH_MS;
            const flash = t >= 0 && t < 1 ? 1 - t : 0;
            drawBeam(ctx, m, spot, RAY_WIDTH * (1 + flash), 0.7 + 0.3 * flash);
            drawBeamFlare(ctx, spot, FLARE * (0.5 + flash), 1, now);
          }
          drawWispBetween(
            ctx,
            mirrorPath,
            ms,
            now,
            WISP_SIZE * MIRROR,
            1,
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
