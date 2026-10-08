// the "Stacker" event (an experiment beyond the seven looks: the arcade
// stacker game; crit tiers): it covers its crit, whose click freezes the
// screen while a row of wisps slides back and forth along the bottom of the
// screen and stops dead in the middle with a clunk and a jolt; the next row
// starts sliding above it, faster, and stops dead on top, and so on up the
// screen, row after row ever quicker; every few rows a bar jumps a crit tier
// with a bang, and the top row lands the prize in a huge blast and shake.
// Then the crit's tier pays out
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
import { createBeats } from "../../../../shared/eventBeats";
import { lerp } from "../../../../shared/easing";
import { findRewardBars } from "../../eventRewards";

const KEY = "stacker";
const MAX_BARS = 3;
const ROWS = 6;
const CELLS = 2;
const CELL = 64;
const ROW_H = 72;
const BOTTOM = 130;
// each row slides SLIDE px each side of the middle, back and forth once
const SLIDE = 150;
const STACK = 0.45;
const STOP_SHAKE: [number, number] = [0.4, 1.1];

export const forceStackerEvent = registerWispEvent(
  KEY,
  "Stacker",
  () => CONFIG.stackerEvent.chance,
  (floor, context, area) => {
    const { rowsMs, holdMs, mergeMs } = CONFIG.stackerEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const cx = (area.left + area.right) / 2;
    const base = area.bottom - BOTTOM;
    let clock = 0;
    const rows = Array.from({ length: ROWS }, (_, r) => {
      const starts = clock;
      clock += lerp(rowsMs, r / (ROWS - 1));
      const stops = clock;
      const dir = r % 2 === 0 ? 1 : -1;
      const y = base - r * ROW_H;
      const cells = Array.from({ length: CELLS }, (_, c) => {
        const offset = (c - (CELLS - 1) / 2) * CELL;
        const at: Point = { x: 0, y };
        return (ms: number): Point => {
          const u = Math.min(1, (ms - starts) / (stops - starts));
          at.x = cx + offset + dir * Math.sin(u * Math.PI * 2) * SLIDE;
          return at;
        };
      });
      return { starts, stops, cells, center: { x: cx, y } as Point };
    });
    const endAt = clock;
    // which rows land a bar its tier: spread up the stack, the top row last
    const prizes = bars.map((bar, k) => ({
      bar,
      row: rows[Math.round(((k + 1) * (ROWS - 1)) / bars.length)],
    }));
    const lastPrize = prizes[prizes.length - 1];

    const stopping = createBeats(
      rows,
      (r) => r.stops,
      (r, k) => {
        cover!.burst(r.center, 0.3);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(STOP_SHAKE, k / (ROWS - 1)));
      },
    );
    const winning = createBeats(
      prizes,
      (p) => p.row.stops,
      (p) => {
        cover!.tierUp(p.bar, p.row.center);
        if (p === lastPrize) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(p.row.center);
          return;
        }
        if (cover!.isLive()) playExplosion();
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
          stopping.tick(ms, now);
          winning.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const r of rows)
            for (const cell of r.cells)
              drawWispBetween(
                ctx,
                cell,
                ms,
                now,
                WISP_SIZE * STACK,
                ms >= r.stops ? 1 : 0.4,
                r.starts,
                endAt,
              );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
