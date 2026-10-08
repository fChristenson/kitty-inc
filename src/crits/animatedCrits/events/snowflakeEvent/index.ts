// the "Snowflake" event (lightning; cash): it covers its crit, whose click
// freezes the screen while a bolt cracks down into the middle of the screen
// and lightning grows out of the strike like a frost crystal: six arms
// crackle out with a bang, then every arm forks into two, a burst of coins
// at every tip and a jolt at every stage, until the whole six-pointed
// flake of lightning blazes and shatters in a huge blast and shake. Pays
// floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01 } from "../../../../shared/easing";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "snowflake";
const REWARD = 4;
const ARMS = 6;
// arm and branch lengths as shares of REACH; branches split SPLIT rad
const REACH = 0.32;
const ARM = 0.55;
const BRANCH = 0.45;
const SPLIT = 1;
const TOP = 60;
const STRIKE_MS = 140;
const COINS = 40;
const COIN_REACH: [number, number] = [20, 100];

interface Limb {
  bolt: Bolt;
  tip: Point;
  grows: number;
}

export const forceSnowflakeEvent = registerWispEvent(
  KEY,
  "Snowflake",
  () => CONFIG.snowflakeEvent.chance,
  (floor, context, area) => {
    const { stageMs, blazeMs, holdMs, mergeMs } = CONFIG.snowflakeEvent;
    const hub: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + 30,
    };
    const reach =
      Math.min(area.right - area.left, area.bottom - area.top) * REACH;
    const strike = createBolt({ x: hub.x, y: area.top + TOP }, hub, 2);
    const turn = Math.random() * Math.PI;
    const arms: Limb[] = [];
    const branches: Limb[] = [];
    for (let i = 0; i < ARMS; i++) {
      const a = turn + (i / ARMS) * Math.PI * 2;
      const tip: Point = {
        x: hub.x + Math.cos(a) * reach * ARM,
        y: hub.y + Math.sin(a) * reach * ARM,
      };
      arms.push({
        bolt: createBolt(hub, tip, 1),
        tip,
        grows: STRIKE_MS + stageMs,
      });
      for (const side of [-1, 1]) {
        const b = a + side * SPLIT * 0.5;
        const end: Point = {
          x: tip.x + Math.cos(b) * reach * BRANCH,
          y: tip.y + Math.sin(b) * reach * BRANCH,
        };
        branches.push({
          bolt: createBolt(tip, end, 0),
          tip: end,
          grows: STRIKE_MS + stageMs * 2,
        });
      }
    }
    const blazes = STRIKE_MS + stageMs * 2;
    const endAt = blazes + blazeMs;
    const stages = [
      { ms: STRIKE_MS, tips: [hub], shake: 0.7 },
      { ms: STRIKE_MS + stageMs, tips: arms.map((l) => l.tip), shake: 1 },
      { ms: blazes, tips: branches.map((l) => l.tip), shake: 1.2 },
    ];
    const limbs = [...arms, ...branches];

    const growing = createBeats(
      stages,
      (s) => s.ms,
      (s) => {
        for (const tip of s.tips)
          cover!.launchFrom(tip, ringTargets(tip, COINS, COIN_REACH));
        cover!.burst(hub, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(s.shake);
      },
    );
    const shattering = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(hub),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          growing.tick(ms, now);
          shattering.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          const s = 1 - clamp01(ms / STRIKE_MS);
          if (s > 0) drawBolt(ctx, strike, s, 1.6);
          const blaze = clamp01((ms - blazes) / blazeMs);
          for (const limb of limbs) {
            const t = (ms - (limb.grows - stageMs)) / stageMs;
            if (t < 0) continue;
            // flickering in as it grows, then blazing brighter to the end
            drawBolt(
              ctx,
              limb.bolt,
              Math.min(1, t) * (0.7 + 0.3 * blaze),
              0.6 + 0.6 * blaze,
            );
          }
          drawStrike(ctx, hub, 0.6 + 0.4 * blaze, 1 + blaze, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
