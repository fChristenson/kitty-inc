// the "Storm Kite" event (lightning; cash): it covers its crit, whose click
// freezes the screen while a kite wisp is let fly off the clicked floor's
// button on a string of light, climbing and darting high over the screen;
// then the storm finds it: lightning cracks down onto the kite with a
// blinding flash, and a spark races down the string and bursts out of the
// button in a bang, a jolt and a spray of coins; strike after strike, ever
// quicker, the last a monster bolt whose spark bursts in a huge blast and
// shake. Pays floor income × floor number × REWARD
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
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { drawBeam } from "../../../../shared/beam";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "stormKite";
const REWARD = 4;
const STRIKES = 5;
const TOP = 220;
const SKY = 40;
const DART = 120;
const STRING = 4;
const BOLT_MS = 150;
const KITE = 0.6;
const SPARK = 0.35;
const COINS = 24;
const COIN_REACH: [number, number] = [40, 160];
const HIT_SHAKE: [number, number] = [0.6, 1.3];

export const forceStormKiteEvent = registerWispEvent(
  KEY,
  "Storm Kite",
  () => CONFIG.stormKiteEvent.chance,
  (floor, context, area) => {
    const { climbMs, strikesMs, runMs, holdMs, mergeMs } =
      CONFIG.stormKiteEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const high: Point = {
      x: (button.x + (area.left + area.right) / 2) / 2,
      y: area.top + TOP,
    };
    const kiteAt: Point = { x: 0, y: 0 };
    const kite = (ms: number): Point => {
      const u = easeOut(clamp01(ms / climbMs));
      kiteAt.x = lerp([button.x, high.x], u) + Math.sin(ms / 260) * DART * u;
      kiteAt.y =
        lerp([button.y, high.y], u) + Math.sin(ms / 170) * DART * 0.3 * u;
      return kiteAt;
    };
    let clock: number = climbMs;
    const strikes = Array.from({ length: STRIKES }, (_, k) => {
      const hits = clock;
      clock += lerp(strikesMs, k / (STRIKES - 1));
      // fixed where the kite will be when it's struck
      const at: Point = { ...kite(hits) };
      const sky: Point = {
        x: at.x + (Math.random() - 0.5) * 200,
        y: area.top + SKY,
      };
      const spark: Point = { x: 0, y: 0 };
      return {
        at,
        hits,
        bursts: hits + runMs,
        final: k === STRIKES - 1,
        bolt: createBolt(sky, at, k === STRIKES - 1 ? 4 : 2),
        // down the string, which bows like the kite's does in the wind
        spark: (ms: number): Point => {
          const u = clamp01((ms - hits) / runMs);
          spark.x = lerp([at.x, button.x], u) + Math.sin(u * Math.PI) * 30;
          spark.y = lerp([at.y, button.y], u);
          return spark;
        },
      };
    });
    const last = strikes[STRIKES - 1];
    const endAt = last.bursts;
    const kiteOut = last.hits + BOLT_MS;

    const striking = createBeats(
      strikes,
      (s) => s.hits,
      (s) => {
        cover!.burst(s.at, s.final ? 1 : 0.4);
        if (cover!.isLive()) shakeScreen(s.final ? 1.4 : 0.5);
      },
    );
    const bursting = createBeats(
      strikes,
      (s) => s.bursts,
      (s, k) => {
        cover!.launchFrom(
          button,
          ringTargets(button, s.final ? COINS * 2 : COINS, COIN_REACH),
        );
        if (s.final) {
          cover!.blast(button);
          return;
        }
        cover!.burst(button, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / (STRIKES - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          striking.tick(ms, now);
          bursting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          if (ms < kiteOut) {
            drawBeam(ctx, button, kite(ms), STRING, 0.6);
            drawWispBetween(
              ctx,
              kite,
              ms,
              now,
              WISP_SIZE * KITE,
              0.5,
              0,
              kiteOut,
            );
          }
          for (const s of strikes) {
            const t = (ms - s.hits) / BOLT_MS;
            if (t >= 0 && t < 1) {
              drawBolt(ctx, s.bolt, 1 - t, s.final ? 1.8 : 1);
              drawStrike(ctx, s.at, 1 - t, s.final ? 2 : 1, now);
            }
            drawWispBetween(
              ctx,
              s.spark,
              ms,
              now,
              WISP_SIZE * SPARK,
              1,
              s.hits,
              s.bursts,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
