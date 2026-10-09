// the "Fork Storm" event (lightning; levels + crit tier): it covers its crit,
// whose click freezes the screen while a bolt cracks down out of the sky
// onto the top bar in view and forks in two onto the bar below, each fork
// splitting in two again and again, one, two, four, eight strikes racing
// down the building quicker each time, every strike a crack, a jolt and
// free levels on its bar; then a huge return stroke shoots from the ground
// up through every bar into the sky, blasting each one, and the clicked bar
// climbs a crit tier. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "forkStorm";
const MAX_BARS = 4;
// each generation's first strike (ms in) and the beat between its strikes
const GENS = [150, 450, 680, 860];
const STRIKE_EVERY = 22;
// the first bolt drops in from this far above the screen, off to one side
const SKY = 120;
const SKY_SIDE = 0.1;
const FORKS = [3, 1];
const BOLT_MS = 170;
const BOLT_SCALE: [number, number] = [1.3, 0.85];
const STRIKE_BLAST: [number, number] = [170, 110];
// the return stroke: after the last strike, up through each bar a beat apart
const RETURN_LAG = 180;
const RETURN_EVERY = 30;
const RETURN_MS = 300;
const RETURN_SCALE = 2.6;
const RETURN_FORKS = 6;
const RETURN_BLAST = 240;
const STRIKE_SHAKE: [number, number] = [0.6, 1];
const RETURN_SHAKE = 1.8;
const SOUND_GAP_MS = 55;

interface Strike {
  gen: number;
  bar: RewardBar;
  at: Point;
  ms: number;
  bolt: Bolt;
}

export const forceForkStormEvent = registerWispEvent(
  KEY,
  "Fork Storm",
  () => CONFIG.forkStormEvent.chance,
  (floor, context, area) => {
    const { levelShare, holdMs, mergeMs } = CONFIG.forkStormEvent;
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
    const width = area.right - area.left;
    const sky: Point = {
      x: (area.left + area.right) / 2 + width * SKY_SIDE,
      y: area.top - SKY,
    };

    const strikes: Strike[] = [];
    const share = (gen: number) => gen / Math.max(1, GENS.length - 1);
    route.forEach((bar, gen) => {
      const n = 2 ** gen;
      const parents = strikes.filter((s) => s.gen === gen - 1);
      for (let i = 0; i < n; i++) {
        const at: Point = {
          x: bar.box.x + bar.box.width * ((i + 0.5) / n),
          y: bar.center.y,
        };
        const from = gen === 0 ? sky : parents[i >> 1].at;
        strikes.push({
          gen,
          bar,
          at,
          ms: GENS[gen] + i * STRIKE_EVERY,
          bolt: createBolt(from, at, FORKS[gen === 0 ? 0 : 1]),
        });
      }
    });
    const returnAt = Math.max(...strikes.map((s) => s.ms)) + RETURN_LAG;
    const strokeX = clicked.center.x;
    const stroke = createBolt(
      { x: strokeX, y: area.bottom },
      { x: strokeX - width * SKY_SIDE, y: area.top - SKY },
      RETURN_FORKS,
    );
    // the stroke's blasts, bottom bar first
    const ups = [...bars]
      .sort((a, b) => b.box.y - a.box.y)
      .map((bar, k) => ({
        bar,
        at: { x: strokeX, y: bar.center.y },
        ms: returnAt + k * RETURN_EVERY,
      }));
    const endMs =
      Math.max(returnAt + RETURN_MS, ...ups.map((u) => u.ms)) + DETONATION_MS;
    const levels = new Map(
      bars.map((b) => [b, levelsFor(b.floor, levelShare, 1)]),
    );

    let soundAt = -Infinity;
    const bang = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playExplosion();
    };
    const striking = createBeats(
      strikes,
      (s) => s.ms,
      (s, _, now) => {
        cover!.levels(s.bar, levels.get(s.bar)!, s.at);
        if (!cover!.isLive()) return;
        shakeScreen(lerp(STRIKE_SHAKE, share(s.gen)));
        bang(now);
      },
    );
    const returning = createBeats(
      ups,
      (u) => u.ms,
      (u, k) => {
        cover!.slam(u.bar);
        if (k > 0) return;
        cover!.tierUp(clicked, u.at);
        cover!.blast(clicked.center);
        if (cover!.isLive()) shakeScreen(RETURN_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs: Math.max(...ups.map((u) => u.ms)) + holdMs + mergeMs,
        mergeMs,
      },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          striking.tick(ms, now);
          returning.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          for (const s of strikes) {
            const since = ms - s.ms;
            if (since < 0 || since >= BOLT_MS) continue;
            const a = 1 - since / BOLT_MS;
            drawBolt(ctx, s.bolt, a, lerp(BOLT_SCALE, share(s.gen)));
            drawStrike(ctx, s.at, a, 1, now);
          }
          for (const s of strikes)
            drawDetonation(
              ctx,
              s.at,
              ms - s.ms,
              lerp(STRIKE_BLAST, share(s.gen)),
              now,
            );
          const since = ms - returnAt;
          if (since >= 0 && since < RETURN_MS)
            drawBolt(ctx, stroke, 1 - since / RETURN_MS, RETURN_SCALE);
          for (const u of ups)
            drawDetonation(ctx, u.at, ms - u.ms, RETURN_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
