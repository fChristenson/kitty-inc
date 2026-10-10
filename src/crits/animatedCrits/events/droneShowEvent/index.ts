// the "Drone Show" event (drawing; a free floor): it covers its crit, whose
// click freezes the screen while a swarm of glitter drones lifts off the
// bottom of the screen, wave after wave, each climbing on a swerve into its
// place in a giant lightning bolt, the mosaic filling in from the top
// faster and faster, every wave a click and a jolt; the finished bolt
// blazes and crackles, then hurls itself down the strike it fires into the
// locked floor's lock, which bursts open: the floor unlocked for free. Then
// the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { drawDots, shapeFill, SHAPES } from "../../../../shared/drawing";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";

const KEY = "droneShow";
const DOTS = 200;
const DOT = 13;
// the bolt's size as a share of the screen's width (at most SIZE px), and
// how far from the lock it hangs (in sizes)
const WIDTH = 0.3;
const SIZE = 250;
const OFF = 1.9;
// its tip, in the shape's unit box
const TIP: Point = SHAPES.bolt[0][3];
// the drones lift off this far under the screen, swerving up to SWERVE px
const LIFTOFF = 80;
const SWERVE = 220;
const CLICK_EVERY = 16;
// how small it shrinks hurling itself into the lock
const SHRINK = 0.35;
const CLICK_SHAKE: [number, number] = [0.15, 0.5];
const CRACKLE_SHAKE = 0.9;
const SOUND_GAP_MS = 60;

export const forceDroneShowEvent = registerWispEvent(
  KEY,
  "Drone Show",
  () => CONFIG.droneShowEvent.chance,
  (floor, context, area) => {
    const { flyMs, climbMs, blazeMs, strikeMs, holdMs, mergeMs } =
      CONFIG.droneShowEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const size = Math.min(SIZE, (area.right - area.left) * WIDTH);
    // over the lock if there's room, else under it
    const above = lock.y - size * OFF;
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: above - size >= area.top + 30 ? above : lock.y + size * OFF,
    };
    const tip: Point = {
      x: centre.x + TIP.x * size,
      y: centre.y + TIP.y * size,
    };
    // the mosaic fills from the top: the first drones climb the farthest
    const dots = shapeFill(SHAPES.bolt, DOTS, centre, size);
    const n = dots.length;
    const launches = dots.map((_, i) => flyMs * Math.sqrt(i / n));
    const lands = launches.map((ms) => ms + climbMs);
    const done = lands[n - 1];
    const struck = done + blazeMs;
    const hits = struck + strikeMs;
    const w = area.right - area.left;
    const drones = dots.map((to, i) => {
      const from: Point = {
        x: area.left + w * hash01(i, 3),
        y: area.bottom + LIFTOFF,
      };
      return {
        from,
        bow: {
          x: to.x + (hash01(i, 7) * 2 - 1) * SWERVE,
          y: lerp([from.y, to.y], 0.55),
        },
        to,
      };
    });
    // its from is moved along with the bolt as it's hurled
    const strike = createBolt({ x: tip.x, y: tip.y }, lock, 2);

    let soundAt = -Infinity;
    const sound = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playBloop();
    };
    const waves = lands.filter((_, i) => i % CLICK_EVERY === CLICK_EVERY - 1);
    const lifting = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const filling = createBeats(
      waves,
      (ms) => ms,
      (_, k, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(lerp(CLICK_SHAKE, k / Math.max(1, waves.length - 1)));
        sound(now);
      },
    );
    const crackling = createBeats(
      [done, done + blazeMs * 0.5],
      (ms) => ms,
      () => {
        cover!.burst(centre, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(CRACKLE_SHAKE);
      },
    );
    const striking = createBeats(
      [struck, hits],
      (ms) => ms,
      (ms) => {
        if (ms === hits) {
          cover!.blast(lock);
          return;
        }
        if (cover!.isLive()) playSwoosh();
      },
    );

    const drone: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: hits + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          lifting.tick(ms, now);
          filling.tick(ms, now);
          crackling.tick(ms, now);
          striking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > hits + 200) return;
          if (ms >= hits) {
            drawStrike(ctx, lock, 1 - (ms - hits) / 200, 2.5, now);
            return;
          }
          let landed = 0;
          while (landed < n && lands[landed] <= ms) landed++;
          // the finished bolt hurls itself tip first into the lock
          const u = easeIn(clamp01((ms - struck) / strikeMs));
          const scale = 1 - (1 - SHRINK) * u;
          ctx.save();
          ctx.translate(lerp([tip.x, lock.x], u), lerp([tip.y, lock.y], u));
          ctx.scale(scale, scale);
          ctx.translate(-tip.x, -tip.y);
          drawDots(ctx, dots, landed, DOT, ms, clamp01((ms - done) / 120));
          ctx.restore();
          if (ms >= struck) {
            strike.from.x = lerp([tip.x, lock.x], u);
            strike.from.y = lerp([tip.y, lock.y], u);
            drawBolt(ctx, strike, 0.6 + 0.4 * u, 0.8);
          }
          if (landed >= n) return;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          beginLightBatch(ctx);
          for (let i = landed; i < n && launches[i] <= ms; i++) {
            const d = drones[i];
            bezier(
              d.from,
              d.bow,
              d.to,
              easeOut(clamp01((ms - launches[i]) / climbMs)),
              drone,
            );
            stampGlimmer(
              ctx,
              drone.x,
              drone.y,
              DOT,
              i + ms * 0.004,
              i % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
            );
          }
          endLightBatch(ctx);
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
