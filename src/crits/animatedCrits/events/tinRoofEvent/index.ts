// the "Tin Roof" event (bounce; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while a hailstorm of cash pelts down
// out of the sky onto the income bars, one bar after another, every coin
// bouncing off the bar's top in shrinking hops with a splash, drumming like
// hail on a tin roof; each bar it hammers rings with free levels, a bang and
// a jolt, and when the last one's been pelted all the cash pours into the
// total in a huge blast and shake. Pays floor income × floor number ×
// REWARD, plus the levels
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { between, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  dropBounce,
  drawBounceSplash,
  SPLASH_MS,
  type Bounce,
} from "../../../../shared/bounce";
import { totalSpot } from "../../cashFlow";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "tinRoof";
const REWARD = 2;
const MAX_BARS = 4;
const COINS = 120;
const COIN = 0.5;
const SKY: [number, number] = [60, 360];
const GRAVITY = 0.014;
const RESTITUTION = 0.22;
const DRIFT = 0.08;
const HOPS = 3;
// a splash on every few coins' first bounce
const SPLASH_EVERY = 6;
const SPLASH = 50;
const RATTLE_GAP_MS = 70;
const DRUM_SHAKE: [number, number] = [0.7, 1.4];

export const forceTinRoofEvent = registerWispEvent(
  KEY,
  "Tin Roof",
  () => CONFIG.tinRoofEvent.chance,
  (floor, context, area) => {
    const { barGapMs, rainMs, levelShare, holdMs, mergeMs } =
      CONFIG.tinRoofEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const total = totalSpot(area);
    const storms = bars.map((bar, k) => {
      const starts = k * barGapMs;
      const paths = Array.from({ length: COINS }, () =>
        dropBounce(
          {
            x: bar.box.x + Math.random() * bar.box.width,
            y: area.top - between(SKY),
          },
          bar.box.y,
          {
            gravity: GRAVITY,
            restitution: RESTITUTION,
            drift: (Math.random() - 0.5) * 2 * DRIFT,
            bounces: HOPS,
            startMs: starts + Math.random() * rainMs,
          },
        ),
      );
      const firsts = paths.map((p) => p.bounces[0]).sort((a, b) => a.ms - b.ms);
      return {
        bar,
        paths,
        // it rings once the hail is really drumming on it
        rings: firsts[Math.floor(firsts.length / 3)].ms,
        firsts,
      };
    });
    const travel =
      Math.max(...storms.flatMap((s) => s.paths.map((p) => p.endMs))) + 80;
    const coins: CoinPath[] = storms.flatMap((s) =>
      s.paths.map((p) => (f: number) => {
        const ms = f * travel;
        const at = p.at(ms);
        return { x: at.x, y: at.y, scale: ms < p.startMs ? 0 : COIN };
      }),
    );
    const splashes: Bounce[] = storms.flatMap((s) =>
      s.firsts.filter((_, i) => i % SPLASH_EVERY === 0),
    );
    const last = storms[storms.length - 1];
    let lastRattle = -Infinity;

    const rattling = createBeats(
      splashes,
      (b) => b.ms,
      (b) => {
        if (!cover!.isLive() || b.ms - lastRattle < RATTLE_GAP_MS) return;
        lastRattle = b.ms;
        playBloop();
      },
    );
    const ringing = createBeats(
      storms,
      (s) => s.rings,
      (s, k) => {
        cover!.levels(
          s.bar,
          levelsFor(s.bar.floor, levelShare, 2),
          s.bar.center,
        );
        if (s === last) for (const bar of bars) cover!.slam(bar);
        cover!.burst(s.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(DRUM_SHAKE, k / Math.max(1, storms.length - 1)));
      },
    );
    const finale = createBeats(
      [travel],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travel + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          rattling.tick(ms, now);
          ringing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > travel + SPLASH_MS) return;
          for (const b of splashes)
            drawBounceSplash(ctx, b, ms - b.ms, SPLASH, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(coins, travel);
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
