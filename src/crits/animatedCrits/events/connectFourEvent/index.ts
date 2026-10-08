// the "Connect Four" event (an experiment beyond the seven looks: a game of
// Connect Four plays itself; crit tiers): it covers its crit, whose click
// freezes the screen while wisp tokens rain down into an invisible
// seven-column board in the middle of the screen, each dropping and
// stacking with a tick, ever faster; every time four hot gold tokens line up
// (along the bottom, up a column, then on the diagonal), a beam blazes
// through them with a bang and a jolt and an income bar jumps a crit tier;
// the last four-in-a-row goes off in a huge blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardBars } from "../../eventRewards";

const KEY = "connectFour";
const COLS = 7;
const CELL = 54;
const BELOW = 160;
// the four-in-a-rows, as [column, row] from the bottom left
const LINES: [number, number][][] = [
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
  ],
  [
    [6, 0],
    [6, 1],
    [6, 2],
    [6, 3],
  ],
  [
    [2, 1],
    [3, 2],
    [4, 3],
    [5, 4],
  ],
];
const FALL_MS_PER_ROW = 35;
const GOLD = 0.5;
const PLAIN = 0.3;
const BEAM_MS = 500;
const BEAM_W = 26;
const WIN_SHAKE: [number, number] = [0.9, 1.5];

export const forceConnectFourEvent = registerWispEvent(
  KEY,
  "Connect Four",
  () => CONFIG.connectFourEvent.chance,
  (floor, context, area) => {
    const { dropsMs, holdMs, mergeMs } = CONFIG.connectFourEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, LINES.length);
    if (bars.length === 0) return;
    const lines = LINES.slice(0, bars.length);
    const cx = (area.left + area.right) / 2;
    const bottom = (area.top + area.bottom) / 2 + BELOW;
    const top = bottom - CELL * 7;
    const cellAt = (c: number, r: number): Point => ({
      x: cx + (c - (COLS - 1) / 2) * CELL,
      y: bottom - r * CELL,
    });

    // the drops in order: each gold token after the plain ones under it
    const filled = new Set<string>();
    const order: { c: number; r: number; gold: boolean }[] = [];
    const wins: { line: number; after: number }[] = [];
    lines.forEach((line, k) => {
      for (const [c, r] of line) {
        for (let below = 0; below < r; below++) {
          if (filled.has(`${c},${below}`)) continue;
          filled.add(`${c},${below}`);
          order.push({ c, r: below, gold: false });
        }
        filled.add(`${c},${r}`);
        order.push({ c, r, gold: true });
      }
      wins.push({ line: k, after: order.length - 1 });
    });
    let clock = 0;
    const tokens = order.map((o, i) => {
      const spot = cellAt(o.c, o.r);
      const fall = FALL_MS_PER_ROW * (7 - o.r);
      const drops = clock;
      clock += lerp(dropsMs, i / Math.max(1, order.length - 1));
      const at: Point = { x: spot.x, y: 0 };
      return {
        ...o,
        spot,
        drops,
        lands: drops + fall,
        at: (ms: number): Point => {
          at.y = lerp([top, spot.y], easeIn(clamp01((ms - drops) / fall)));
          return at;
        },
      };
    });
    const winBeats = wins.map((w, k) => {
      const cells = lines[w.line];
      return {
        bar: bars[k],
        from: cellAt(cells[0][0], cells[0][1]),
        to: cellAt(cells[3][0], cells[3][1]),
        mid: cellAt(
          (cells[1][0] + cells[2][0]) / 2,
          (cells[1][1] + cells[2][1]) / 2,
        ),
        at: tokens[w.after].lands,
      };
    });
    const last = winBeats[winBeats.length - 1];
    const endAt = last.at + BEAM_MS;

    const landing = createBeats(
      tokens,
      (t) => t.lands,
      (_, k) => {
        if (cover?.isLive() && k % 2 === 0) playBloop();
      },
    );
    const winning = createBeats(
      winBeats,
      (w) => w.at,
      (w, k) => {
        cover!.tierUp(w.bar, w.mid);
        if (w === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(w.mid);
          return;
        }
        cover!.burst(w.mid, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(WIN_SHAKE, k / Math.max(1, winBeats.length - 1)));
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
          landing.tick(ms, now);
          winning.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const t of tokens)
            drawWispBetween(
              ctx,
              t.at,
              ms,
              now,
              WISP_SIZE * (t.gold ? GOLD : PLAIN),
              t.gold ? 1 : 0.2,
              t.drops,
              endAt,
            );
          for (const w of winBeats) {
            const t = (ms - w.at) / BEAM_MS;
            if (t < 0 || t >= 1) continue;
            const alpha = 1 - t;
            drawBeam(ctx, w.from, w.to, BEAM_W * (1 + t), alpha);
            drawBeamFlare(ctx, w.from, 30, alpha, now);
            drawBeamFlare(ctx, w.to, 30, alpha, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
