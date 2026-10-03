// the "Storm Wings" event (lightning; crit tiers): it covers its crit, whose
// click freezes the screen while a great wisp sweeps in off the screen's
// side on wings of crackling lightning, beating ever faster; over each
// income bar it passes, a downbeat throws a bolt off its wingtip down onto
// the bar in a blinding crack, a bang and a jolt, and the bar jumps a crit
// tier; then it folds its wings and dives into the clicked floor's bar,
// which jumps a crit tier too in a huge blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { alongRoute } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../shared/lightning";
import { findRewardBars } from "../eventRewards";
import { CRIT_TIER_ORDER } from "../../shared/critTypes";

const KEY = "stormWings";
const MAX_BARS = 2;
// it flies HIGH px over each bar; its wings are WING px long, beating
// FLAPS_HZ times a second through FLAP rad either side of level
const HIGH = 150;
const WING = 120;
const FLAPS_HZ: [number, number] = [3, 7];
const FLAP = 0.6;
const WING_SCALE = 0.5;
const BOLT_MS = 200;
const FINAL_MS = 300;
const STRIKE_SHAKE: [number, number] = [1, 1.5];

export const forceStormWingsEvent = registerWispEvent(
  KEY,
  "Storm Wings",
  () => CONFIG.stormWingsEvent.chance,
  (floor, context, area) => {
    const { flyMs, diveMs, holdMs, mergeMs } = CONFIG.stormWingsEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    if (!own) return;
    const fromLeft = Math.random() < 0.5;
    const others = found
      .filter(
        (b) => b !== own && b.floor.critMultiplierTier !== CRIT_TIER_ORDER[0],
      )
      .slice(0, MAX_BARS);
    const width = area.right - area.left;
    const passes: Point[] = others.map((bar, k) => ({
      x:
        area.left +
        width *
          lerp(
            fromLeft ? [0.3, 0.7] : [0.7, 0.3],
            k / Math.max(1, others.length - 1),
          ),
      y: bar.box.y - HIGH,
    }));
    const enter: Point = {
      x: fromLeft ? area.left - 80 : area.right + 80,
      y: area.top + (area.bottom - area.top) * 0.25,
    };
    const over: Point = { x: own.center.x, y: own.center.y - HIGH * 1.6 };
    const route = [enter, ...passes, over];
    const endAt = flyMs + diveMs;
    const body: Point = { x: 0, y: 0 };
    const fly = (ms: number, into: Point): Point => {
      if (ms <= flyMs) return alongRoute(route, clamp01(ms / flyMs), into);
      const u = clamp01((ms - flyMs) / diveMs) ** 2;
      into.x = lerp([over.x, own.center.x], u);
      into.y = lerp([over.y, own.center.y], u);
      return into;
    };
    // the wings' beat angle, quickening
    const beat = (ms: number) => {
      const s = ms / 1000;
      const hz = lerp(FLAPS_HZ, clamp01(ms / flyMs));
      return Math.sin(Math.PI * 2 * hz * s) * FLAP;
    };
    const tipL: Point = { x: 0, y: 0 };
    const tipR: Point = { x: 0, y: 0 };
    const wingL = createBolt(body, tipL, 0);
    const wingR = createBolt(body, tipR, 0);
    const strikes = others.map((bar, k) => {
      const at = (flyMs * (k + 1)) / (route.length - 1);
      return {
        bar,
        at,
        bolt: createBolt(passes[k], bar.center, 2),
      };
    });
    const finalBolt = createBolt(over, own.center, 3);
    const birdAt: Point = { x: 0, y: 0 };
    const bird = (ms: number): Point | null =>
      ms < 0 || ms > endAt ? null : fly(ms, birdAt);

    const striking = createBeats(
      strikes,
      (s) => s.at,
      (s, k) => {
        cover!.tierUp(s.bar, s.bolt.from);
        cover!.burst(s.bar.center, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STRIKE_SHAKE, k / Math.max(1, strikes.length - 1)));
      },
    );
    const diving = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        cover!.tierUp(own, over);
        for (const bar of [own, ...others]) cover!.slam(bar);
        cover!.blast(own.center);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [own, ...others],
        tick: (ms, now) => {
          striking.tick(ms, now);
          diving.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + FINAL_MS) return;
          if (ms < endAt) {
            fly(ms, body);
            // folded back as it dives
            const fold = clamp01((ms - flyMs) / diveMs);
            const a = beat(ms) * (1 - fold) - fold * 1.1;
            const span = WING * (1 - 0.5 * fold);
            tipL.x = body.x - Math.cos(a) * span;
            tipL.y = body.y - Math.sin(a) * span;
            tipR.x = body.x + Math.cos(a) * span;
            tipR.y = body.y - Math.sin(a) * span;
            drawBolt(ctx, wingL, 0.9, WING_SCALE);
            drawBolt(ctx, wingR, 0.9, WING_SCALE);
          }
          for (const s of strikes) {
            const t = (ms - s.at) / BOLT_MS;
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, s.bolt, 1 - t, 1.3);
            drawStrike(ctx, s.bar.center, 1 - t, 1.4, now);
          }
          const t = (ms - endAt) / FINAL_MS;
          if (t >= 0 && t < 1) {
            drawBolt(ctx, finalBolt, 1 - t, 2);
            drawStrike(ctx, own.center, 1 - t, 2.6, now);
          }
          drawWispBetween(ctx, bird, ms, now, WISP_SIZE * 1.1, 1, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    findRewardBars(floor, context).some((b) => b.floor === floor),
);
