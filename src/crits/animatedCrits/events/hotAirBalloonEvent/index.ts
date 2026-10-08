// the "Hot Air Balloon" event (mix; a free floor and cash): it covers its
// crit, whose click freezes the screen while a burner wisp rises off the
// clicked floor's button and roars, blast after blast, each a whoosh and a
// jolt, inflating a great balloon of cash above it bigger and rounder;
// fully blown, it lifts off and sails up to the building's locked floor,
// bumps into it and the floor bursts open in a huge blast and shake,
// unlocked for free as the screen unfreezes. Pays floor income × floor
// number × REWARD, plus the floor
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeOut,
  easeOutBack,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "hotAirBalloon";
const REWARD = 2;
const COINS = 800;
const COIN = 0.42;
// the balloon swells to RADIUS px round, TALL times as tall, hanging GAP
// px over its burner, which floats UP px over the button
const RADIUS = 90;
const TALL = 1.2;
const GAP = 24;
const UP = 70;
const BLAST_MS = 160;
const BURNER = 0.55;
const BLAST_SHAKE: [number, number] = [0.4, 1];

export const forceHotAirBalloonEvent = registerWispEvent(
  KEY,
  "Hot Air Balloon",
  () => CONFIG.hotAirBalloonEvent.chance,
  (floor, context) => {
    const { blastsMs, liftMs, holdMs, mergeMs } = CONFIG.hotAirBalloonEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const target: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const ground: Point = { x: button.x, y: button.y - UP };
    const blasts: number[] = [];
    let clock = 200;
    for (const gap of blastsMs) {
      clock += gap;
      blasts.push(clock);
    }
    const liftAt = clock + BLAST_MS;
    const endAt = liftAt + liftMs;
    // how blown up it is, a step per blast
    const fullness = (ms: number) => {
      let s = 0.15;
      for (let k = 0; k < blasts.length; k++) {
        const u = clamp01((ms - blasts[k]) / BLAST_MS);
        if (u > 0) s = lerp([0.15, 1], (k + easeOutBack(u)) / blasts.length);
      }
      return s;
    };
    // the burner: rising off the button, then lifting with the balloon
    const burnerPos = (ms: number, into: Point): Point => {
      const rise = easeOut(clamp01(ms / 200));
      const lift = smoothstep(clamp01((ms - liftAt) / liftMs));
      const top = target.y + RADIUS * TALL + GAP;
      into.x = lerp([button.x, ground.x], rise) + (target.x - ground.x) * lift;
      into.y = lerp([button.y, ground.y], rise) + (top - ground.y) * lift;
      return into;
    };

    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random());
      const burner: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * endAt;
        const s = fullness(ms);
        burnerPos(ms, burner);
        const rx = RADIUS * s;
        const ry = RADIUS * TALL * s;
        // a teardrop: narrowing toward the burner
        const dy = Math.sin(angle) * r;
        const pinch = dy > 0 ? 1 - 0.55 * dy : 1;
        return {
          x: burner.x + Math.cos(angle) * r * rx * pinch,
          y: burner.y - GAP - ry + dy * ry,
          scale: COIN * clamp01(ms / 250),
        };
      };
    });
    const burnerAt: Point = { x: 0, y: 0 };
    const burner = (ms: number) =>
      ms > endAt ? null : burnerPos(ms, burnerAt);
    const heat = (ms: number) => {
      let h = 0.3;
      for (const at of blasts) {
        const u = (ms - at) / BLAST_MS;
        if (u >= 0 && u < 1) h = Math.max(h, 1 - u);
      }
      return h;
    };

    const roaring = createBeats(
      blasts,
      (ms) => ms,
      (_, k) => {
        cover!.burst(burnerPos(blasts[k], { x: 0, y: 0 }), 0.3);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(BLAST_SHAKE, k / Math.max(1, blasts.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(target),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        tick: (ms, now) => {
          roaring.tick(ms, now);
          finale.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            burner,
            ms,
            now,
            WISP_SIZE * BURNER * (1 + 0.5 * heat(ms)),
            heat(ms),
            0,
            endAt,
          ),
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
