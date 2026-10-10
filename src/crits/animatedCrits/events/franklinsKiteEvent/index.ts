// the "Franklin's Kite" event (lightning; levels): it covers its crit,
// whose click freezes the screen while a kite wisp soars up off the clicked
// floor's button on a glowing string, a key wisp hanging low on it, and
// swoops high over the screen; lightning cracks down onto the kite again
// and again, ever quicker, every strike a blinding flash and a jolt, the
// charge racing down the string to the key, which sparks a bolt onto an
// income bar for free levels; the last strike is the biggest, the key
// lashing bolts onto every bar at once and the clicked floor's bar slamming
// in a huge blast. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "franklinsKite";
const MAX_STRIKES = 5;
const MIN_STRIKES = 3;
// the kite's hover under the screen's top, and its swoops
const HOVER = 260;
const SWAY_X = 220;
const SWAY_Y = 60;
// the string's sag, its look, and where the key hangs along it (from the
// button)
const SAG = 180;
const SEGMENTS = 10;
const STRING_W = 4;
const STRING_ALPHA = 0.55;
const KEY_AT = 0.3;
const KITE = WISP_SIZE * 1.1;
const KEY_SIZE = WISP_SIZE * 0.55;
// how far off to one side of the kite a strike comes down from
const SKY_SPREAD = 260;
const BOLT_MS = 160;
const CURRENT_MS = 120;
const STRIKE_SHAKE: [number, number] = [0.6, 1.2];
const SPARK_SHAKE = 0.7;

interface Strike {
  ms: number;
  // the charge reaches the key, and the key's bolts land
  sparks: number;
  last: boolean;
  sky: Bolt;
  arcs: { bar: RewardBar; bolt: Bolt }[];
}

export const forceFranklinsKiteEvent = registerWispEvent(
  KEY,
  "Franklin's Kite",
  () => CONFIG.franklinsKiteEvent.chance,
  (floor, context, area) => {
    const { riseMs, gapMs, levelShare, holdMs, mergeMs } =
      CONFIG.franklinsKiteEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const anchor = getButtonCenter(context.isGroundFloor);
    const hover: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + HOVER,
    };
    const kiteSpot: Point = { x: 0, y: 0 };
    const kiteAt = (ms: number): Point => {
      const t = Math.max(0, ms);
      const rise = easeOut(clamp01(t / riseMs));
      kiteSpot.x = lerp([anchor.x, hover.x + SWAY_X * Math.sin(t / 420)], rise);
      kiteSpot.y = lerp([anchor.y, hover.y + SWAY_Y * Math.sin(t / 310)], rise);
      return kiteSpot;
    };
    const bend: Point = { x: 0, y: 0 };
    const stringAt = (u: number, ms: number, into: Point): Point => {
      const kite = kiteAt(ms);
      bend.x = (anchor.x + kite.x) / 2;
      bend.y = (anchor.y + kite.y) / 2 + SAG * clamp01(ms / riseMs);
      return bezier(anchor, bend, kite, u, into);
    };
    const keySpot: Point = { x: 0, y: 0 };
    const keyAt = (ms: number): Point => stringAt(KEY_AT, ms, keySpot);

    const count = Math.max(MIN_STRIKES, Math.min(MAX_STRIKES, bars.length));
    let clock: number = riseMs;
    const strikes: Strike[] = Array.from({ length: count }, (_, k) => {
      const last = k === count - 1;
      const ms = clock;
      clock += lerp(gapMs, k / Math.max(1, count - 2));
      const targets = last ? bars : [bars[k % bars.length]];
      const kite = kiteAt(ms);
      const side = k % 2 ? 1 : -1;
      return {
        ms,
        sparks: ms + CURRENT_MS,
        last,
        sky: createBolt(
          { x: kite.x + side * SKY_SPREAD, y: area.top - 120 },
          { x: kite.x, y: kite.y },
          last ? 3 : 2,
        ),
        arcs: targets.map((b) => ({
          bar: b,
          bolt: createBolt({ x: 0, y: 0 }, { ...b.center }, 1),
        })),
      };
    });
    const endAt = strikes[count - 1].sparks + BOLT_MS;
    const current: Point = { x: 0, y: 0 };
    const runFrom: Point = { x: 0, y: 0 };
    const runTo: Point = { x: 0, y: 0 };

    const rising = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const striking = createBeats(
      strikes,
      (s) => s.ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STRIKE_SHAKE, k / Math.max(1, count - 1)));
      },
    );
    const sparking = createBeats(
      strikes,
      (s) => s.sparks,
      (s) => {
        const key = keyAt(s.sparks);
        for (const arc of s.arcs)
          cover!.levels(arc.bar, levelsFor(arc.bar.floor, levelShare, 1), key);
        if (s.last) {
          cover!.levels(bar, levelsFor(bar.floor, levelShare * 2, 2), key);
          cover!.slam(bar);
          cover!.blast(bar.center);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(SPARK_SHAKE);
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
        tick: (ms, now) => {
          rising.tick(ms, now);
          striking.tick(ms, now);
          sparking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 600) return;
          // the string, in short straight runs along its sag
          const fade = 1 - clamp01((ms - endAt) / 400);
          runFrom.x = anchor.x;
          runFrom.y = anchor.y;
          for (let i = 1; i <= SEGMENTS; i++) {
            stringAt(i / SEGMENTS, ms, runTo);
            drawBeam(ctx, runFrom, runTo, STRING_W, STRING_ALPHA * fade);
            runFrom.x = runTo.x;
            runFrom.y = runTo.y;
          }
          for (const s of strikes) {
            const since = ms - s.ms;
            if (since < 0 || since > CURRENT_MS + BOLT_MS) continue;
            const kite = kiteAt(ms);
            const scale = s.last ? 1.6 : 1;
            if (since < BOLT_MS) {
              s.sky.to.x = kite.x;
              s.sky.to.y = kite.y;
              const alpha = 1 - since / BOLT_MS;
              drawBolt(ctx, s.sky, alpha, scale);
              drawStrike(ctx, kite, alpha, scale, now);
            }
            // the charge running down the string to the key
            if (since < CURRENT_MS) {
              stringAt(lerp([1, KEY_AT], since / CURRENT_MS), ms, current);
              drawStrike(ctx, current, 1, 0.6 * scale, now);
              continue;
            }
            const key = keyAt(ms);
            const alpha = 1 - (since - CURRENT_MS) / BOLT_MS;
            for (const arc of s.arcs) {
              arc.bolt.from.x = key.x;
              arc.bolt.from.y = key.y;
              drawBolt(ctx, arc.bolt, alpha, scale);
              drawStrike(ctx, arc.bolt.to, alpha, scale, now);
            }
          }
          if (fade <= 0) return;
          drawWisp(ctx, keyAt, ms, now, KEY_SIZE * fade, 0.5);
          drawWisp(ctx, kiteAt, ms, now, KITE * fade, 0.6);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
