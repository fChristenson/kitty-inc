// the "Bell Ringers" event (wisp; crit tiers): it covers its crit, whose
// click freezes the screen while a big bell wisp drops in to hang on a rope
// of light over each income bar and they ring a peal, one after another
// down the row, each swing higher and every clang a flash, a bong and a
// jolt; round after round, ever quicker, until each bell swings right over
// the top and comes crashing down onto its bar, which jumps a crit tier,
// the last in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "bellRingers";
const MAX_BARS = 4;
const ROUNDS = 3;
// each round the bells swing higher, in radians either side of hanging
const SWINGS = [0.5, 1, 1.6];
const ROPE = 120;
const ABOVE = 260;
const DROP_MS = 220;
const BELL = 0.85;
const CLANG_SHAKE: [number, number] = [0.25, 0.7];
const CRASH_SHAKE: [number, number] = [0.7, 1.4];

interface Bell {
  bar: RewardBar;
  pivot: Point;
  // every clang it rings, then when it goes over the top and crashes down
  clangs: number[];
  over: number;
  lands: number;
  at: (ms: number) => Point;
}

export const forceBellRingersEvent = registerWispEvent(
  KEY,
  "Bell Ringers",
  () => CONFIG.bellRingersEvent.chance,
  (floor, context, area) => {
    const { firstMs, changesMs, overMs, holdMs, mergeMs } =
      CONFIG.bellRingersEvent;
    const bars = findRewardBars(floor, context)
      .slice(0, MAX_BARS)
      .sort((a, b) => a.center.x - b.center.x || a.center.y - b.center.y);
    if (bars.length === 0) return;
    const count = bars.length;
    // the peal: every bell in turn, round after round, each change quicker
    const clangs: number[][] = bars.map(() => []);
    let clock: number = firstMs;
    for (let r = 0; r < ROUNDS; r++)
      for (let k = 0; k < count; k++) {
        clangs[k].push(clock);
        clock += lerp(changesMs, (r * count + k) / (ROUNDS * count - 1));
      }
    const bells: Bell[] = bars.map((bar, k) => {
      const pivot: Point = {
        x: bar.center.x,
        y: Math.max(area.top + 60, bar.center.y - ABOVE),
      };
      const mine = clangs[k];
      const over = clock + k * overMs;
      const lands = over + DROP_MS;
      const spot: Point = { x: 0, y: 0 };
      return {
        bar,
        pivot,
        clangs: mine,
        over,
        lands,
        at: (ms) => {
          let theta = 0;
          if (ms >= over) {
            // over the top, then down onto the bar
            const u = easeIn(clamp01((ms - over) / DROP_MS));
            spot.x = lerp([pivot.x, bar.center.x], u);
            spot.y = lerp([pivot.y - ROPE, bar.center.y], u);
            return spot;
          }
          const first = mine[0];
          if (ms < first) {
            const u = easeOut(clamp01(ms / first));
            spot.x = pivot.x + Math.sin(SWINGS[0]) * ROPE;
            spot.y = lerp(
              [area.top - 80, pivot.y + Math.cos(SWINGS[0]) * ROPE],
              u,
            );
            return spot;
          }
          // swinging side to side, peaking at each clang
          let i = 0;
          while (i < mine.length - 1 && ms >= mine[i + 1]) i++;
          const from = mine[i];
          const to = i < mine.length - 1 ? mine[i + 1] : over;
          const side = i % 2 === 0 ? 1 : -1;
          const swing = SWINGS[Math.min(ROUNDS - 1, i)];
          const next =
            i < mine.length - 1 ? SWINGS[Math.min(ROUNDS - 1, i + 1)] : Math.PI;
          const u = clamp01((ms - from) / (to - from));
          theta = side * lerp([swing, -next], (1 - Math.cos(Math.PI * u)) / 2);
          spot.x = pivot.x + Math.sin(theta) * ROPE;
          spot.y = pivot.y + Math.cos(theta) * ROPE;
          return spot;
        },
      };
    });
    const lastBell = bells[count - 1];
    const endAt = lastBell.lands;
    const peal = bells.flatMap((b) => b.clangs.map((ms) => ({ bell: b, ms })));

    const ringing = createBeats(
      peal,
      (c) => c.ms,
      (c, i) => {
        const at = c.bell.at(c.ms);
        cover!.burst({ x: at.x, y: at.y }, 0.35);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(CLANG_SHAKE, i / Math.max(1, peal.length - 1)));
      },
    );
    const crashing = createBeats(
      bells,
      (b) => b.lands,
      (b, k) => {
        cover!.tierUp(b.bar, b.bar.center);
        if (b === lastBell) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(b.bar.center);
          return;
        }
        cover!.burst(b.bar.center, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CRASH_SHAKE, k / Math.max(1, count - 1)));
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
          ringing.tick(ms, now);
          crashing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 300) return;
          for (const b of bells) {
            if (ms < b.over) drawBeam(ctx, b.pivot, b.at(ms), 4, 0.5);
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BELL,
              0.8,
              0,
              b.lands,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
