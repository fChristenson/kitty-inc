// the "Clear!" event (lightning; free upgrade levels and a crit tier): it
// covers its crit, whose click freezes the screen while two wisp paddles
// swoop in either side of the clicked floor's income bar and charge up,
// crackling; CLEAR! a bolt of lightning cracks between them straight
// through the bar with a blinding flash, a bang and a huge jolt that lands
// free levels; they charge again, quicker, and shock it again, harder; the
// third shock forks out to every bar in view, each jolting with free levels,
// and the clicked bar jumps a crit tier as every bar slams in a huge blast
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { findRewardBars } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "clear";
const SHOCKS = 3;
const MAX_BARS = 5;
// the paddles sit GAP px off the bar's ends
const GAP = 34;
const SPARKS = 3;
const SPARK_REACH = 60;
const ZAP_MS = 200;
const SHOCK_SHAKE: [number, number] = [1.2, 1.8];

export const forceClearEvent = registerWispEvent(
  KEY,
  "Clear!",
  () => CONFIG.clearEvent.chance,
  (floor, context, area) => {
    const { swoopMs, chargesMs, levelShare, holdMs, mergeMs } =
      CONFIG.clearEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    if (!own) return;
    const others = found.filter((b) => b !== own).slice(0, MAX_BARS - 1);
    const bars = [own, ...others];
    const y = own.center.y;
    const paddles: Point[] = [
      { x: own.box.x - GAP, y },
      { x: own.box.x + own.box.width + GAP, y },
    ];
    const entries: Point[] = [
      { x: area.left - 60, y: y - 200 },
      { x: area.right + 60, y: y - 200 },
    ];
    const shocks: number[] = [];
    let clock = swoopMs;
    for (let k = 0; k < SHOCKS; k++) {
      clock += lerp(chargesMs, k / (SHOCKS - 1));
      shocks.push(clock);
    }
    const lastShock = shocks[SHOCKS - 1];
    const endAt = lastShock + ZAP_MS;
    const zaps: Bolt[] = shocks.map(() =>
      createBolt(paddles[0], paddles[1], 2),
    );
    const forks: Bolt[] = others.map((bar) =>
      createBolt(own.center, bar.center, 1),
    );
    const sparks: Bolt[][] = paddles.map(() =>
      Array.from({ length: SPARKS }, () =>
        createBolt({ x: 0, y: 0 }, { x: 0, y: 0 }, 0),
      ),
    );
    const heads: Point[] = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ];
    const paddle =
      (p: number) =>
      (ms: number): Point | null => {
        if (ms < 0 || ms > endAt) return null;
        const u = easeOut(clamp01(ms / swoopMs));
        heads[p].x = entries[p].x + (paddles[p].x - entries[p].x) * u;
        heads[p].y = entries[p].y + (paddles[p].y - entries[p].y) * u;
        return heads[p];
      };
    const paddlePaths = [paddle(0), paddle(1)];

    const shocking = createBeats(
      shocks,
      (ms) => ms,
      (_, k) => {
        const t = k / (SHOCKS - 1);
        cover!.levels(own, levelsFor(own.floor, levelShare, 2), paddles[k % 2]);
        if (k === SHOCKS - 1) {
          for (const bar of others)
            cover!.levels(bar, levelsFor(bar.floor, levelShare, 2), own.center);
          cover!.tierUp(own);
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(own.center);
          return;
        }
        cover!.burst(own.center, 0.8 + 0.4 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SHOCK_SHAKE, t));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => shocking.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + ZAP_MS) return;
          // charging: sparks crackle off both paddles, reaching further
          const next = shocks.findIndex((at) => ms < at);
          if (next >= 0 && ms >= swoopMs) {
            const from = next === 0 ? swoopMs : shocks[next - 1];
            const charge = clamp01((ms - from) / (shocks[next] - from));
            paddles.forEach((at, p) =>
              sparks[p].forEach((spark, j) => {
                const a = now * 0.03 + j * 2.1 + p * 1.3;
                spark.from.x = at.x;
                spark.from.y = at.y;
                spark.to.x = at.x + Math.cos(a) * SPARK_REACH * charge;
                spark.to.y = at.y + Math.sin(a) * SPARK_REACH * charge;
                drawBolt(ctx, spark, 0.4 + 0.5 * charge, 0.45);
              }),
            );
          }
          shocks.forEach((at, k) => {
            const since = ms - at;
            if (since < 0 || since >= ZAP_MS) return;
            const fade = 1 - since / ZAP_MS;
            drawBolt(ctx, zaps[k], fade, 1 + 0.3 * k);
            drawStrike(ctx, paddles[0], fade, 1.2, now);
            drawStrike(ctx, paddles[1], fade, 1.2, now);
            if (k === SHOCKS - 1)
              for (const fork of forks) {
                drawBolt(ctx, fork, fade, 0.9);
                drawStrike(ctx, fork.to, fade, 1.2, now);
              }
          });
          const grow = clamp01(ms / lastShock);
          for (const path of paddlePaths)
            drawWispBetween(
              ctx,
              path,
              ms,
              now,
              WISP_SIZE * 0.9,
              grow,
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).some((b) => b.floor === floor),
);
