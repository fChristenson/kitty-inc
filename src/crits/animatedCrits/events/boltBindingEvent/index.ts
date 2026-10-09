// the "Bolt Binding" event (lightning; levels): it covers its crit, whose
// click freezes the screen while a spark wisp races along each bar winding a
// crackling coil of lightning round it, loop after loop, top bar to bottom,
// quicker each time, each bar jolting as its coil closes; then every coil
// discharges at once, the coils flaring out and a rattle of strikes running
// along each bar, every strike free levels, into a huge blast on the
// clicked bar that slams every bar. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "boltBinding";
const MAX_BARS = 4;
// loops of coil round each bar, as tall as the bar times RADIUS, running
// OVERHANG past its ends
const LOOPS = 4;
const RADIUS = 1;
const OVERHANG = 20;
const QUICKEN = 0.85;
const SPARK = WISP_SIZE * 0.8;
const HOP_LIFT = 60;
const FRONT_ALPHA = 0.9;
const BACK_ALPHA = 0.3;
const BACK_SCALE = 0.7;
const FLICKER = 0.4;
const FLARE_MS = 120;
// strikes along each bar at the discharge, STRIKE_GAP_MS apart, each bar
// BAR_GAP_MS after the last
const STRIKES = 6;
const STRIKE_GAP_MS = 35;
const BAR_GAP_MS = 30;
const STRIKE_MS = 160;
const STRIKE_BLAST = 130;
const FINALE_LAG = 100;
const FINALE_BLAST = 850;
const WOUND_SHAKE = 0.6;
const STRIKE_SHAKE: [number, number] = [0.4, 0.8];
const FINALE_SHAKE = 1.8;
const SOUND_GAP_MS = 55;

interface Coil {
  bar: RewardBar;
  rightward: boolean;
  starts: number;
  ends: number;
  // each half loop one bolt, laid as the spark passes, front and back in turn
  turns: { bolt: Bolt; at: number; front: boolean }[];
}

interface Strike {
  bar: RewardBar;
  at: Point;
  ms: number;
}

export const forceBoltBindingEvent = registerWispEvent(
  KEY,
  "Bolt Binding",
  () => CONFIG.boltBindingEvent.chance,
  (floor, context) => {
    const { windMs, hopMs, fireLagMs, levelShare, holdMs, mergeMs } =
      CONFIG.boltBindingEvent;
    const bars = findRewardBars(floor, context);
    const clicked = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!clicked) return;
    // up to four bars top to bottom, ending on the clicked one when it can
    const sorted = [...bars].sort((a, b) => a.box.y - b.box.y);
    const last = Math.max(
      sorted.indexOf(clicked),
      Math.min(MAX_BARS, sorted.length) - 1,
    );
    const route = sorted.slice(Math.max(0, last - MAX_BARS + 1), last + 1);

    const coilPoint = (c: Coil, u: number, into: Point): Point => {
      const { box, center } = c.bar;
      const left = box.x - OVERHANG;
      const right = box.x + box.width + OVERHANG;
      into.x = c.rightward ? lerp([left, right], u) : lerp([right, left], u);
      into.y =
        center.y - box.height * RADIUS * Math.cos(Math.PI * 2 * LOOPS * u);
      return into;
    };
    let clock = 0;
    const coils: Coil[] = route.map((bar, k) => {
      const starts = clock;
      const ends = starts + windMs * QUICKEN ** k;
      clock = ends + hopMs;
      const coil: Coil = {
        bar,
        rightward: k % 2 === 0,
        starts,
        ends,
        turns: [],
      };
      const halves = LOOPS * 2;
      for (let j = 0; j < halves; j++) {
        coil.turns.push({
          bolt: createBolt(
            coilPoint(coil, j / halves, { x: 0, y: 0 }),
            coilPoint(coil, (j + 1) / halves, { x: 0, y: 0 }),
            0,
          ),
          at: lerp([starts, ends], (j + 1) / halves),
          front: j % 2 === 0,
        });
      }
      return coil;
    });
    const lastCoil = coils[coils.length - 1];
    const fireAt = lastCoil.ends + fireLagMs;

    const strikes: Strike[] = coils.flatMap((c, k) =>
      Array.from({ length: STRIKES }, (_, i) => {
        const { box, center } = c.bar;
        return {
          bar: c.bar,
          at: { x: box.x + box.width * ((i + 0.5) / STRIKES), y: center.y },
          ms: fireAt + k * BAR_GAP_MS + i * STRIKE_GAP_MS,
        };
      }),
    );
    const finaleAt = Math.max(...strikes.map((s) => s.ms)) + FINALE_LAG;
    const endMs = finaleAt + DETONATION_MS;
    const levels = new Map(
      bars.map((b) => [b, levelsFor(b.floor, levelShare, 1)]),
    );

    const spark: Point = { x: 0, y: 0 };
    const from: Point = { x: 0, y: 0 };
    const to: Point = { x: 0, y: 0 };
    const sparkAt = (ms: number): Point => {
      for (let k = 0; k < coils.length; k++) {
        const c = coils[k];
        if (ms > c.ends) continue;
        if (ms >= c.starts || k === 0)
          return coilPoint(
            c,
            clamp01((ms - c.starts) / (c.ends - c.starts)),
            spark,
          );
        const p = coils[k - 1];
        coilPoint(p, 1, from);
        coilPoint(c, 0, to);
        const u = (ms - p.ends) / (c.starts - p.ends);
        spark.x = lerp([from.x, to.x], u);
        spark.y = lerp([from.y, to.y], u) - 4 * HOP_LIFT * u * (1 - u);
        return spark;
      }
      return coilPoint(lastCoil, 1, spark);
    };

    let soundAt = -Infinity;
    const bang = (now: number, loud = false) => {
      if (!loud && now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playExplosion();
    };
    const winding = createBeats(
      coils,
      (c) => c.starts,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const wound = createBeats(
      coils,
      (c) => c.ends,
      (c) => {
        cover!.burst(coilPoint(c, 1, { x: 0, y: 0 }), 0.5);
        if (cover!.isLive()) shakeScreen(WOUND_SHAKE);
      },
    );
    const striking = createBeats(
      strikes,
      (s) => s.ms,
      (s, k, now) => {
        cover!.levels(s.bar, levels.get(s.bar)!, s.at);
        if (!cover!.isLive()) return;
        shakeScreen(lerp(STRIKE_SHAKE, k / Math.max(1, strikes.length - 1)));
        bang(now);
      },
    );
    const finale = createBeats(
      [finaleAt],
      (ms) => ms,
      (_, __, now) => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(clicked.center);
        if (!cover!.isLive()) return;
        shakeScreen(FINALE_SHAKE);
        bang(now, true);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: finaleAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          winding.tick(ms, now);
          wound.tick(ms, now);
          striking.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          if (ms < fireAt + FLARE_MS) {
            // the coils flare up as they discharge, then go out
            const fade = ms < fireAt ? 1 : 1 + (ms - fireAt) / FLARE_MS;
            const out = ms < fireAt ? 1 : 1 - (ms - fireAt) / FLARE_MS;
            for (const c of coils)
              for (const t of c.turns) {
                if (ms < t.at) break;
                const flicker =
                  1 - FLICKER + FLICKER * Math.sin(now * 0.05 + t.at);
                drawBolt(
                  ctx,
                  t.bolt,
                  (t.front ? FRONT_ALPHA : BACK_ALPHA) * flicker * out,
                  (t.front ? 1 : BACK_SCALE) * fade,
                );
              }
          }
          drawWispBetween(ctx, sparkAt, ms, now, SPARK, 1, 0, lastCoil.ends);
          for (const s of strikes) {
            const since = ms - s.ms;
            if (since >= 0 && since < STRIKE_MS)
              drawStrike(ctx, s.at, 1 - since / STRIKE_MS, 1, now);
            drawDetonation(ctx, s.at, since, STRIKE_BLAST, now);
          }
          drawDetonation(ctx, clicked.center, ms - finaleAt, FINALE_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
