// the "Creeping Barrage" event (explosion; free upgrade levels): it covers
// its crit, whose click freezes the screen while shells whistle in from the
// sky and burst in a rippling row of big blasts right along the lowest
// income bar, each blast a bang and a jolt, the bar jumping with free
// levels; the barrage creeps up the screen row by row, bar by bar, every row
// quicker, until a last row slams down across the top all at once under a
// colossal blast and the hardest shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "creepingBarrage";
const MAX_BARS = 4;
const SHELLS = 5;
const FINAL_SHELLS = 7;
const MARGIN = 0.1;
const JITTER = 30;
// the shells come in from up and to the side
const FROM: Point = { x: 260, y: -760 };
const TOP = 0.2;
const BLAST = 160;
const FINAL_BLAST = 210;
const COLOSSAL = 520;
const CORE_DELAY_MS = 130;
const SHELL = 0.38;
const FUSE = 12;
const BANG_GAP_MS = 60;
const HIT_SHAKE: [number, number] = [0.4, 1];
const FINAL_SHAKE = 2;

interface Shell {
  to: Point;
  lands: number;
  size: number;
  row: number;
  bar: RewardBar | null;
  at: (ms: number) => Point;
}

export const forceCreepingBarrageEvent = registerWispEvent(
  KEY,
  "Creeping Barrage",
  () => CONFIG.creepingBarrageEvent.chance,
  (floor, context, area) => {
    const { firstMs, rowsMs, rippleMs, fallMs, levelShare, holdMs, mergeMs } =
      CONFIG.creepingBarrageEvent;
    const bars = findRewardBars(floor, context)
      .slice(0, MAX_BARS)
      .sort((a, b) => b.center.y - a.center.y);
    if (bars.length === 0) return;
    const width = area.right - area.left;
    const rowsY = [
      ...bars.map((b) => b.center.y),
      area.top + (area.bottom - area.top) * TOP,
    ];
    const shell = (
      to: Point,
      lands: number,
      size: number,
      row: number,
      bar: RewardBar | null,
    ): Shell => {
      const from: Point = { x: to.x + FROM.x, y: to.y + FROM.y };
      const at: Point = { x: 0, y: 0 };
      return {
        to,
        lands,
        size,
        row,
        bar,
        at: (ms) => {
          const u = easeIn(clamp01((ms - lands + fallMs) / fallMs));
          at.x = lerp([from.x, to.x], u);
          at.y = lerp([from.y, to.y], u);
          return at;
        },
      };
    };
    let clock: number = firstMs;
    const shells: Shell[] = [];
    rowsY.forEach((y, row) => {
      const final = row === rowsY.length - 1;
      const count = final ? FINAL_SHELLS : SHELLS;
      for (let i = 0; i < count; i++) {
        const to: Point = {
          x: area.left + width * lerp([MARGIN, 1 - MARGIN], i / (count - 1)),
          y: y + (Math.random() - 0.5) * 2 * JITTER,
        };
        // a row ripples across; the last lands all at once
        const lands = final ? clock : clock + i * rippleMs;
        shells.push(
          shell(
            to,
            lands,
            final ? FINAL_BLAST : BLAST,
            row,
            final ? null : bars[row],
          ),
        );
      }
      if (!final)
        clock +=
          (count - 1) * rippleMs +
          lerp(rowsMs, row / Math.max(1, bars.length - 1));
    });
    const finalAt = clock;
    const coreAt = finalAt + CORE_DELAY_MS;
    const core: Point = {
      x: area.left + width / 2,
      y: rowsY[rowsY.length - 1],
    };
    let lastBang = -Infinity;

    const landing = createBeats(
      shells,
      (s) => s.lands,
      (s, i) => {
        // each bar's levels land with the middle of its row
        if (s.bar && i % SHELLS === Math.floor(SHELLS / 2))
          cover!.levels(s.bar, levelsFor(s.bar.floor, levelShare, 2), s.to);
        if (!cover!.isLive()) return;
        if (!s.bar) {
          if (i === shells.length - FINAL_SHELLS) {
            playExplosion();
            shakeScreen(FINAL_SHAKE);
          }
          return;
        }
        shakeScreen(lerp(HIT_SHAKE, s.row / Math.max(1, bars.length - 1)));
        if (s.lands - lastBang >= BANG_GAP_MS) {
          lastBang = s.lands;
          playExplosion();
        }
      },
    );
    const finale = createBeats(
      [coreAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(core);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: coreAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          landing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > coreAt + 900) return;
          for (const s of shells) {
            drawDetonation(ctx, s.to, ms - s.lands, s.size, now);
            const since = ms - s.lands + fallMs;
            if (since < 0 || ms >= s.lands) continue;
            drawLitFuse(ctx, s.at(ms), since / fallMs, FUSE, now);
            drawWispBetween(
              ctx,
              s.at,
              ms,
              now,
              WISP_SIZE * SHELL,
              0.5,
              s.lands - fallMs,
              s.lands,
            );
          }
          drawDetonation(ctx, core, ms - coreAt, COLOSSAL, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
