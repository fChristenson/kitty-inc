// the "Shishi-odoshi" event (mix; cash): it covers its crit, whose click
// freezes the screen while a rocker arm of light rises over the clicked
// floor's bar like a Japanese bamboo fountain, its open end tipped up under a
// spout wisp; the wisp pours a stream of cash into it until it grows heavy,
// tips, gushes its load out onto a heap on the bar and swings back, its
// other end clacking down on a glowing stone with a jolt; again and again,
// faster each time, the heap growing; then the whole heap surges into the
// total in a huge blast. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { COLOR } from "../../../../palette";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import {
  clamp01,
  easeIn,
  easeOut,
  easeOutBack,
  lerp,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { stampGlimmer } from "../../../../shared/twinkle";
import { heapSpots } from "../../../../shared/clutter";
import type { CoinPath } from "../../../../floors/coins";
import { totalSpot } from "../../cashFlow";
import { findRewardBars } from "../../eventRewards";

const KEY = "shishiOdoshi";
const REWARD = 4;
const CYCLES = 4;
const COINS_PER_CYCLE = 70;
// the arm: pivot this high over the bar, each half ARM long, resting with
// its open end tilted up REST rad, sagging SAG as it fills, tipped to TIP
const PIVOT_ABOVE = 260;
const ARM = 200;
const ARM_W = 22;
const REST = 0.42;
const SAG = 0.12;
const TIP = -0.75;
// the spout over the open end, and how long a coin falls into it
const SPOUT_ABOVE = 300;
const FALL_MS = 220;
const SPOUT = WISP_SIZE * 0.9;
const STONE = 34;
// each cycle's share of the pouring, slowest first, and its tip, gush and
// swing back as shares of a cycle
const PACE: [number, number] = [1.4, 0.7];
const TIP_SHARE = 0.15;
const GUSH_SHARE = 0.15;
const BACK_SHARE = 0.15;
const SPILL_MS = 260;
const HEAP_W = 260;
const HEAP_H = 120;
const CLACK_SHAKE: [number, number] = [0.5, 1];
const SURGE_LAG = 160;

export const forceShishiOdoshiEvent = registerWispEvent(
  KEY,
  "Shishi-odoshi",
  () => CONFIG.shishiOdoshiEvent.chance,
  (floor, context, area) => {
    const { growMs, pourMs, surgeMs, liftMs, holdMs, mergeMs } =
      CONFIG.shishiOdoshiEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const fallback = totalSpot(area);
    const total = () => cover?.total() ?? fallback;
    const pivot: Point = { x: bar.center.x, y: bar.box.y - PIVOT_ABOVE };
    const end = (tilt: number, into: Point): Point => {
      into.x = pivot.x - Math.cos(tilt) * ARM;
      into.y = pivot.y - Math.sin(tilt) * ARM;
      return into;
    };
    const mouth = end(REST, { x: 0, y: 0 });
    const spout: Point = { x: mouth.x, y: mouth.y - SPOUT_ABOVE };
    const lip = end(TIP, { x: 0, y: 0 });
    const stone: Point = {
      x: pivot.x + Math.cos(REST) * ARM,
      y: pivot.y + Math.sin(REST) * ARM + STONE * 0.4,
    };
    const heapFoot: Point = { x: lip.x - 40, y: bar.box.y };

    // each cycle: fill, tip, gush, swing back and clack
    const paces = Array.from({ length: CYCLES }, (_, k) =>
      lerp(PACE, k / (CYCLES - 1)),
    );
    const sum = paces.reduce((a, b) => a + b, 0);
    let clock = growMs;
    const cycles = paces.map((p) => {
      const length = (pourMs * p) / sum;
      const fill = length * (1 - TIP_SHARE - GUSH_SHARE - BACK_SHARE);
      const c = {
        start: clock,
        tipAt: clock + fill,
        gushAt: clock + fill + length * TIP_SHARE,
        backAt: clock + fill + length * (TIP_SHARE + GUSH_SHARE),
        clackAt: clock + length,
      };
      clock += length;
      return c;
    });
    const lastClack = cycles[cycles.length - 1].clackAt;
    const surgeAt = lastClack + 150;
    const inAt = surgeAt + surgeMs + liftMs;
    const travelMs = inAt;
    const tiltAt = (ms: number): number => {
      if (ms < growMs) return REST;
      for (const c of cycles) {
        if (ms >= c.clackAt) continue;
        if (ms < c.tipAt)
          return REST - SAG * clamp01((ms - c.start) / (c.tipAt - c.start));
        if (ms < c.gushAt)
          return lerp(
            [REST - SAG, TIP],
            easeIn((ms - c.tipAt) / (c.gushAt - c.tipAt)),
          );
        if (ms < c.backAt) return TIP;
        return lerp(
          [TIP, REST],
          easeOutBack((ms - c.backAt) / (c.clackAt - c.backAt)),
        );
      }
      return REST;
    };

    const heap = heapSpots(heapFoot, CYCLES * COINS_PER_CYCLE, HEAP_W, HEAP_H);
    const paths: CoinPath[] = heap.map((slot, i) => {
      const c = cycles[Math.floor(i / COINS_PER_CYCLE)];
      const j = i % COINS_PER_CYCLE;
      const falls =
        c.start + ((c.tipAt - c.start - FALL_MS) * j) / COINS_PER_CYCLE;
      const spills = c.gushAt + ((c.backAt - c.gushAt) * j) / COINS_PER_CYCLE;
      const lifts = surgeAt + (surgeMs * (heap.length - 1 - i)) / heap.length;
      const arc: Point = { x: (lip.x + slot.x) / 2 - 60, y: lip.y - 40 };
      return (f: number) => {
        const ms = f * travelMs;
        if (ms < falls) return { x: spout.x, y: spout.y, scale: 0 };
        if (ms < falls + FALL_MS) {
          const u = easeIn((ms - falls) / FALL_MS);
          return { x: spout.x, y: lerp([spout.y, mouth.y], u) };
        }
        if (ms < spills) return { x: mouth.x, y: mouth.y, scale: 0 };
        if (ms < spills + SPILL_MS)
          return bezier(lip, arc, slot, easeIn((ms - spills) / SPILL_MS), {
            x: 0,
            y: 0,
          });
        if (ms < lifts) return { x: slot.x, y: slot.y };
        const to = total();
        const p = bezier(
          slot,
          { x: slot.x, y: to.y },
          to,
          easeIn(clamp01((ms - lifts) / liftMs)),
          { x: 0, y: 0 },
        );
        return { x: p.x, y: p.y, scale: ms >= lifts + liftMs ? 0 : 1 };
      };
    });

    const tipping = createBeats(
      cycles,
      (c) => c.tipAt,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const clacking = createBeats(
      cycles,
      (c) => c.clackAt,
      (_, k) => {
        cover!.burst(stone, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(CLACK_SHAKE, k / (CYCLES - 1)));
      },
    );
    const surging = createBeats(
      [surgeAt, inAt - SURGE_LAG],
      (ms) => ms,
      (ms) => {
        if (ms >= inAt - SURGE_LAG) cover!.blast(total());
        else if (cover!.isLive()) playSwoosh();
      },
    );

    const tip = { x: 0, y: 0 };
    const back = { x: 0, y: 0 };
    const spoutAt = () => spout;
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: inAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          tipping.tick(ms, now);
          clacking.tick(ms, now);
          surging.tick(ms, now);
        },
        drawUnder: (ctx, ms, now) => {
          if (ms < 0 || ms > surgeAt) return;
          const grow = easeOut(clamp01(ms / growMs));
          const tilt = tiltAt(ms);
          end(tilt, tip);
          back.x = pivot.x + (pivot.x - tip.x);
          back.y = pivot.y + (pivot.y - tip.y);
          tip.x = lerp([pivot.x, tip.x], grow);
          tip.y = lerp([pivot.y, tip.y], grow);
          back.x = lerp([pivot.x, back.x], grow);
          back.y = lerp([pivot.y, back.y], grow);
          drawBeam(ctx, back, tip, ARM_W, 0.85);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          stampGlimmer(
            ctx,
            pivot.x,
            pivot.y,
            26 * grow,
            now / 400,
            COLOR.white,
          );
          stampGlimmer(
            ctx,
            stone.x,
            stone.y,
            STONE * grow,
            now / 900,
            COLOR.heavenlyGold,
          );
          ctx.restore();
          drawWisp(ctx, spoutAt, ms, now, SPOUT * grow, 0.5);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travelMs);
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
