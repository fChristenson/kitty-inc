// the "Shockwave" event (money; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while the clicked floor's button
// blasts out a ring of cash that races outward over the whole screen like a
// ripple on a pond, then another, and another, each faster and bigger with a
// bang and a jolt; every income bar a ring rolls over jolts with free levels;
// the rings break on the screen's edges and all the cash surges back into
// the total in a huge blast and shake. Pays floor income × floor number ×
// REWARD, plus the levels
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";
import { findRewardBars } from "../../eventRewards";
import type { Point } from "../../../../shared/wisp";
import { levelsFor } from "../../../../gameState";

const KEY = "shockwave";
const REWARD = 2;
const RINGS = 4;
const RING_COINS = 320;
const MAX_BARS = 5;
const COIN = 0.65;
// each coin rides up to WOBBLE px off its ring
const WOBBLE = 18;
const RING_SHAKE: [number, number] = [0.8, 1.6];

export const forceShockwaveEvent = registerWispEvent(
  KEY,
  "Shockwave",
  () => CONFIG.shockwaveEvent.chance,
  (floor, context, area) => {
    const { gapsMs, expandMs, flightMs, levelShare, holdMs, mergeMs } =
      CONFIG.shockwaveEvent;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const bars = context.upgradeFloorFree
      ? findRewardBars(floor, context).slice(0, MAX_BARS)
      : [];
    const reach =
      40 +
      Math.max(
        Math.hypot(area.left - button.x, area.top - button.y),
        Math.hypot(area.right - button.x, area.top - button.y),
        Math.hypot(area.left - button.x, area.bottom - button.y),
        Math.hypot(area.right - button.x, area.bottom - button.y),
      );
    const emits: number[] = [0];
    for (let k = 1; k < RINGS; k++)
      emits.push(emits[k - 1] + lerp(gapsMs, (k - 1) / Math.max(1, RINGS - 2)));
    const endAt = emits[RINGS - 1] + expandMs + flightMs;

    const paths: CoinPath[] = [];
    for (let k = 0; k < RINGS; k++)
      for (let i = 0; i < RING_COINS; i++) {
        const angle = ((i + Math.random()) / RING_COINS) * Math.PI * 2;
        const off = 1 + ((Math.random() * 2 - 1) * WOBBLE) / reach;
        const edge: Point = {
          x: button.x + Math.cos(angle) * reach * off,
          y: button.y + Math.sin(angle) * reach * off,
        };
        const lift: Point = { x: edge.x, y: fallback.y };
        const at: Point = { x: 0, y: 0 };
        const flies = emits[k] + expandMs + Math.random() * flightMs * 0.3;
        paths.push((f) => {
          const ms = f * endAt;
          if (ms < emits[k]) return { x: button.x, y: button.y, scale: 0 };
          if (ms < flies) {
            const r = easeOut(clamp01((ms - emits[k]) / expandMs));
            return {
              x: button.x + (edge.x - button.x) * r,
              y: button.y + (edge.y - button.y) * r,
              scale: COIN,
            };
          }
          const total = cover?.total() ?? fallback;
          bezier(
            edge,
            lift,
            total,
            easeIn(clamp01((ms - flies) / flightMs)),
            at,
          );
          return { x: at.x, y: at.y, scale: COIN };
        });
      }
    // when each ring rolls over each bar (easeOut inverted)
    const crossings = bars.flatMap((bar) => {
      const share = Math.min(
        1,
        Math.hypot(bar.center.x - button.x, bar.center.y - button.y) / reach,
      );
      const u = 1 - Math.sqrt(1 - share);
      return emits.map((at) => ({ bar, at: at + expandMs * u }));
    });

    const emitting = createBeats(
      emits,
      (ms) => ms,
      (_, k) => {
        const t = k / (RINGS - 1);
        cover!.burst(button, 0.6 + 0.5 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(RING_SHAKE, t));
      },
    );
    const rolling = createBeats(
      crossings,
      (c) => c.at,
      (c) =>
        cover!.levels(c.bar, levelsFor(c.bar.floor, levelShare, 1), button),
    );
    const surging = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          emitting.tick(ms, now);
          rolling.tick(ms, now);
          surging.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
