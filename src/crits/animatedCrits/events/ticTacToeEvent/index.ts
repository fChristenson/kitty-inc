// the "Tic-Tac-Toe" event (experiment: a game of noughts and crosses;
// crit tiers): it covers its crit, whose click freezes the screen while a
// giant grid of light slashes itself across it and a game plays out:
// crosses of beams slam down with a crack, rings of light answer them,
// and every cross is a jolt that jumps an income bar a crit tier, the
// moves ever faster; the third cross completes the line, a blazing beam
// strikes through it and every bar slams in a huge blast and shake. Then
// the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardBars } from "../../eventRewards";

const KEY = "ticTacToe";
// the moves: cell and whether it's a cross; crosses win on the diagonal
const MOVES: [number, boolean][] = [
  [0, true],
  [2, false],
  [4, true],
  [3, false],
  [8, true],
];
// the board fills BOARD of the screen's smaller side
const BOARD = 0.8;
const GRID = 6;
const MARK = 0.3;
const STROKE = 9;
const RING_SIDES = 14;
const SLAM_MS = 140;
const STRIKE_MS = 220;
const CROSS_SHAKE: [number, number] = [0.8, 1.4];

export const forceTicTacToeEvent = registerWispEvent(
  KEY,
  "Tic-Tac-Toe",
  () => CONFIG.ticTacToeEvent.chance,
  (floor, context, area) => {
    const { gridMs, movesMs, holdMs, mergeMs } = CONFIG.ticTacToeEvent;
    const bars = findRewardBars(floor, context).slice(0, 3);
    if (bars.length === 0) return;
    const side =
      Math.min(area.right - area.left, area.bottom - area.top) * BOARD;
    const cell = side / 3;
    const cx = (area.left + area.right) / 2;
    const cy = (area.top + area.bottom) / 2;
    const cellAt = (i: number): Point => ({
      x: cx + ((i % 3) - 1) * cell,
      y: cy + (Math.floor(i / 3) - 1) * cell,
    });
    const lines: [Point, Point][] = [
      [
        { x: cx - cell / 2, y: cy - side / 2 },
        { x: cx - cell / 2, y: cy + side / 2 },
      ],
      [
        { x: cx + cell / 2, y: cy - side / 2 },
        { x: cx + cell / 2, y: cy + side / 2 },
      ],
      [
        { x: cx - side / 2, y: cy - cell / 2 },
        { x: cx + side / 2, y: cy - cell / 2 },
      ],
      [
        { x: cx - side / 2, y: cy + cell / 2 },
        { x: cx + side / 2, y: cy + cell / 2 },
      ],
    ];
    let clock: number = gridMs;
    let crosses = 0;
    const moves = MOVES.map(([i, cross], k) => {
      const at = clock;
      clock += lerp(movesMs, k / (MOVES.length - 1));
      const bar = cross ? bars[Math.min(crosses++, bars.length - 1)] : null;
      return { center: cellAt(i), cross, at, bar };
    });
    const lastMove = moves[moves.length - 1];
    const strikeAt = lastMove.at + SLAM_MS + 100;
    const endAt = strikeAt + STRIKE_MS;
    const strikeFrom = cellAt(0);
    const strikeTo = cellAt(8);
    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 0, y: 0 };
    const reach = cell * MARK;

    const placing = createBeats(
      moves,
      (m) => m.at + SLAM_MS,
      (m, k) => {
        if (!m.bar) {
          if (cover?.isLive()) playBloop();
          return;
        }
        if (m === lastMove) return;
        cover!.tierUp(m.bar, m.center);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CROSS_SHAKE, k / (MOVES.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        if (lastMove.bar) cover!.tierUp(lastMove.bar, lastMove.center);
        for (const bar of bars) cover!.slam(bar);
        cover!.blast({ x: cx, y: cy });
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
          placing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 500) return;
          const fade = ms > endAt ? 1 - (ms - endAt) / 500 : 1;
          // the grid slashes in line by line
          lines.forEach(([from, to], i) => {
            const u = easeOut(clamp01((ms - (gridMs * i) / 4) / (gridMs / 4)));
            if (u <= 0) return;
            b.x = lerp([from.x, to.x], u);
            b.y = lerp([from.y, to.y], u);
            drawBeam(ctx, from, b, GRID, 0.6 * fade);
          });
          for (const m of moves) {
            if (ms < m.at) continue;
            const s = easeOutBack(clamp01((ms - m.at) / SLAM_MS)) * reach;
            if (m.cross) {
              for (const dir of [1, -1]) {
                a.x = m.center.x - s;
                a.y = m.center.y - s * dir;
                b.x = m.center.x + s;
                b.y = m.center.y + s * dir;
                drawBeam(ctx, a, b, STROKE, fade);
              }
            } else {
              for (let i = 0; i < RING_SIDES; i++) {
                const a0 = (i / RING_SIDES) * Math.PI * 2;
                const a1 = ((i + 1) / RING_SIDES) * Math.PI * 2;
                a.x = m.center.x + Math.cos(a0) * s;
                a.y = m.center.y + Math.sin(a0) * s;
                b.x = m.center.x + Math.cos(a1) * s;
                b.y = m.center.y + Math.sin(a1) * s;
                drawBeam(ctx, a, b, STROKE * 0.7, 0.6 * fade);
              }
            }
          }
          if (ms >= strikeAt) {
            const u = easeOut(clamp01((ms - strikeAt) / STRIKE_MS));
            b.x = lerp([strikeFrom.x, strikeTo.x], u);
            b.y = lerp([strikeFrom.y, strikeTo.y], u);
            drawBeam(ctx, strikeFrom, b, STROKE * 2, fade);
            if (u < 1) drawBeamFlare(ctx, b, 30, 1, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
