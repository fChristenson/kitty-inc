// the "Gusher" event (money; cash and a free floor): it covers its crit,
// whose click freezes the screen while a roaring jet of cash shoots up out of
// the clicked floor's button through the floors above into the building's
// locked floor, gush after gush, each a thud, a bloop and a jolt; the cash
// fills the locked floor up like a tank as the screen rumbles, then it bursts
// in a huge blast and shake and, as the screen unfreezes, the floor unlocks
// for free while the cash sweeps into the total. Pays floor income × floor
// number × REWARD, plus the floor
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";
import type { Point } from "../../../../shared/wisp";

const KEY = "gusher";
const REWARD = 2;
const COINS = 1_400;
const COIN = 0.7;
// the jet is JET px across; the tank fills from MARGIN of the floor's width
// in from each wall, up to FILL of its height
const JET = 46;
const MARGIN = 0.08;
const FILL = 0.85;
const SETTLE_MS = 160;
const GUSHES = 6;
const RUMBLE_MS = 70;
const RUMBLE: [number, number] = [0.3, 1.2];
const GUSH_SHAKE: [number, number] = [0.6, 1.4];

export const forceGusherEvent = registerWispEvent(
  KEY,
  "Gusher",
  () => CONFIG.gusherEvent.chance,
  (floor, context) => {
    const { streamMs, riseMs, holdMs, mergeMs } = CONFIG.gusherEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const tankTop = locked.offsetY;
    const tankBottom = locked.offsetY + FLOOR_H;
    const mouth: Point = { x: FLOOR_W / 2, y: tankBottom };
    const endAt = streamMs + riseMs + SETTLE_MS;

    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const leaves = (i / COINS) * streamMs;
      const lane = (Math.random() + Math.random() - 1) * JET * 0.5;
      // fills bottom first, a layer per share of the coins
      const level = (i / COINS) * FILL;
      const rest: Point = {
        x: FLOOR_W * (MARGIN + (1 - 2 * MARGIN) * Math.random()),
        y: tankBottom - FLOOR_H * level * (0.85 + 0.3 * Math.random()),
      };
      return (f) => {
        const ms = f * endAt;
        if (ms < leaves) return { x: button.x, y: button.y, scale: 0 };
        const u = (ms - leaves) / riseMs;
        if (u < 0.7) {
          const k = easeOut(u / 0.7);
          return {
            x: button.x + (mouth.x + lane - button.x) * k,
            y: button.y + (mouth.y - button.y) * k,
            scale: COIN,
          };
        }
        const s = easeOut(
          clamp01((ms - leaves - riseMs * 0.7) / (riseMs * 0.3 + SETTLE_MS)),
        );
        return {
          x: mouth.x + lane + (rest.x - mouth.x - lane) * s,
          y: mouth.y + (Math.max(tankTop + 30, rest.y) - mouth.y) * s,
          scale: COIN,
        };
      };
    });
    const gushes = Array.from(
      { length: GUSHES },
      (_, k) => riseMs * 0.7 + ((streamMs - 60) * k) / (GUSHES - 1),
    );
    const tank: Point = { x: FLOOR_W / 2, y: (tankTop + tankBottom) / 2 };

    let lastRumble = -Infinity;
    const gushing = createBeats(
      gushes,
      (ms) => ms,
      (_, k) => {
        const t = k / (GUSHES - 1);
        cover!.burst(mouth, 0.5 + 0.4 * t);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(GUSH_SHAKE, t));
      },
    );
    const bursting = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(tank),
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
          gushing.tick(ms, now);
          bursting.tick(ms, now);
          if (ms < endAt && now - lastRumble >= RUMBLE_MS && cover?.isLive()) {
            lastRumble = now;
            shakeScreen(lerp(RUMBLE, clamp01(ms / endAt)));
          }
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
