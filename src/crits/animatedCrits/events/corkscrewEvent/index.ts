// the "Corkscrew" event (mix; a free floor and cash): it covers its crit,
// whose click freezes the screen while a wisp shoots up off the clicked
// floor's button and corkscrews up the building, side to side, a river of
// cash pouring along behind it; it reaches the locked floor and whirls round
// it, ever tighter and faster, every lap a flash, a bang and a jolt, the
// river winding round after it, then dives into the floor's heart in a huge
// blast of cash and shake, and as the screen unfreezes the floor bursts
// open: unlocked for free. Pays floor income × floor number × REWARD, plus
// the floor
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "corkscrew";
const REWARD = 2;
const TURNS = 3;
const LAPS = 3;
// the climb swings SWING of the floor's width either side
const SWING = 0.32;
const ORBIT_X = 0.46;
const ORBIT_Y = 0.75;
const COINS = 1_000;
// the river trails the wisp by up to TRAIL ms
const TRAIL = 500;
const SPREAD = 12;
const COIN = 0.7;
const LAP_SHAKE: [number, number] = [0.8, 1.5];

export const forceCorkscrewEvent = registerWispEvent(
  KEY,
  "Corkscrew",
  () => CONFIG.corkscrewEvent.chance,
  (floor, context) => {
    const { climbMs, orbitMs, holdMs, mergeMs } = CONFIG.corkscrewEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const heart: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const ry = FLOOR_H * ORBIT_Y;
    const rx = FLOOR_W * ORBIT_X;
    const foot = heart.y + ry;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const endAt = climbMs + orbitMs;
    // a whole number of turns, so the climb meets the orbit at its foot
    const path = (ms: number, into: Point): Point => {
      const t = Math.min(Math.max(ms, 0), endAt);
      if (t < climbMs) {
        const u = t / climbMs;
        const swing = FLOOR_W * SWING * Math.sin(Math.PI * u);
        into.x =
          lerp([button.x, heart.x], u) +
          dir * swing * Math.sin(Math.PI * 2 * TURNS * u);
        into.y = lerp([button.y, foot], u);
        return into;
      }
      const v = (t - climbMs) / orbitMs;
      const a = dir * Math.PI * 2 * LAPS * v * v;
      const shrink = Math.sqrt(1 - v);
      into.x = heart.x + rx * shrink * Math.sin(a);
      into.y = heart.y + ry * shrink * Math.cos(a);
      return into;
    };
    const head: Point = { x: 0, y: 0 };
    const wisp = (ms: number): Point | null =>
      ms < 0 || ms > endAt ? null : path(ms, head);
    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const lag = (i / COINS) * TRAIL;
      const dx = (Math.random() * 2 - 1) * SPREAD;
      const dy = (Math.random() * 2 - 1) * SPREAD;
      const at: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * (endAt + TRAIL) - lag;
        if (ms <= 0) return { x: button.x, y: button.y, scale: 0 };
        if (ms >= endAt) return { x: heart.x, y: heart.y, scale: 0 };
        path(ms, at);
        return { x: at.x + dx, y: at.y + dy, scale: COIN };
      };
    });
    const laps = Array.from(
      { length: LAPS - 1 },
      (_, k) => climbMs + orbitMs * Math.sqrt((k + 1) / LAPS),
    );

    const lapping = createBeats(
      laps,
      (ms) => ms,
      (ms, k) => {
        const t = k / Math.max(1, laps.length - 1);
        cover!.burst(path(ms, { x: 0, y: 0 }), 0.6 + 0.4 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LAP_SHAKE, t));
      },
    );
    const diving = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(heart),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + TRAIL + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        tick: (ms, now) => {
          lapping.tick(ms, now);
          diving.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            wisp,
            ms,
            now,
            WISP_SIZE,
            clamp01(ms / endAt),
            0,
            endAt,
          ),
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt + TRAIL);
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
