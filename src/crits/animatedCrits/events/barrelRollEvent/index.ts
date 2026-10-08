// the "Barrel Roll" event (explosion; free upgrade levels): it covers its
// crit, whose click freezes the screen while lit bomb wisps come rolling in
// along the top of the screen one after another like barrels, fuses
// fizzing, and tumble down from row to row of the income bars, zigzagging
// back and forth down the screen; each one rolls to a stop on its own bar
// and blows in a white blast, a bang and a big jolt that lands free levels;
// the last goes off in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { measure, pointAlong } from "../../cashFlow";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "barrelRoll";
const MAX_BARS = 4;
const EDGE = 40;
const TOP = 150;
// barrels ride RIDE px above each row, rolling SPEED px a ms
const RIDE = 26;
const SPEED = 1.3;
const BARREL = 0.42;
const FUSE = 18;
const BLAST = 170;
const BLOW_SHAKE: [number, number] = [0.8, 1.5];

export const forceBarrelRollEvent = registerWispEvent(
  KEY,
  "Barrel Roll",
  () => CONFIG.barrelRollEvent.chance,
  (floor, context, area) => {
    const { gapsMs, holdMs, mergeMs } = CONFIG.barrelRollEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const ltr = Math.random() < 0.5;
    // one zigzag down the rows; each barrel rides it to its own bar
    const rows = [area.top + TOP, ...bars.map((b) => b.center.y - RIDE)];
    let clock = 0;
    const barrels = bars.map((bar, k) => {
      const route: Point[] = [];
      for (let r = 0; r <= k + 1; r++) {
        const goesRight = (r % 2 === 0) === ltr;
        const from = goesRight ? left : right;
        const to = goesRight ? right : left;
        if (r === k + 1) {
          route.push({ x: from, y: rows[r] }, { x: bar.center.x, y: rows[r] });
          break;
        }
        route.push({
          x: r === 0 ? (goesRight ? area.left - 30 : area.right + 30) : from,
          y: rows[r],
        });
        route.push({ x: to, y: rows[r] });
      }
      const along = measure(route);
      const length = along[along.length - 1];
      const starts = clock;
      clock += lerp(gapsMs, k / Math.max(1, bars.length - 1));
      const blows = starts + length / SPEED;
      const at: Point = { x: 0, y: 0 };
      return {
        bar,
        starts,
        blows,
        at: (ms: number): Point =>
          pointAlong(
            route,
            along,
            clamp01((ms - starts) / (blows - starts)),
            at,
          ),
      };
    });
    const lastBlow = Math.max(...barrels.map((b) => b.blows));
    const last = barrels.find((b) => b.blows === lastBlow)!;
    const endAt = lastBlow;

    const blowing = createBeats(
      barrels,
      (b) => b.blows,
      (b, k) => {
        cover!.levels(b.bar, levelsFor(b.bar.floor), b.bar.center);
        if (b === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(b.bar.center);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BLOW_SHAKE, k / Math.max(1, barrels.length - 1)));
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
        tick: (ms, now) => blowing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_000) return;
          for (const b of barrels) {
            if (b !== last)
              drawDetonation(ctx, b.bar.center, ms - b.blows, BLAST, now);
            if (ms < b.starts || ms >= b.blows) continue;
            drawLitFuse(
              ctx,
              b.at(ms),
              clamp01((ms - b.starts) / (b.blows - b.starts)),
              FUSE,
              now,
            );
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BARREL,
              0.5,
              b.starts,
              b.blows,
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
