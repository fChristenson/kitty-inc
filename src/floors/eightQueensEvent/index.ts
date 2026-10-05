// the "Eight Queens" event (experiment: the eight queens puzzle solved by
// backtracking; crit tiers): it covers its crit, whose click freezes the
// screen while an 8x8 board of glitter pops in across the middle of the
// screen and solves itself: queen wisps drop in row by row, each flashing
// beams down its row, column and diagonals; whenever a row has no safe
// square left the solver backtracks, queens popping off the board with a
// burst and a bloop, quicker and quicker, until all eight stand safe. The
// board flashes in a bang, then the queens dive one after another onto the
// clicked floor's income bar, every hit a jolt, the fourth and the last
// each a crit tier, the last in a huge blast. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import {
  drawWispBetween,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { bezier } from "../../shared/curves";
import {
  clamp01,
  easeIn,
  easeOut,
  easeOutBack,
  lerp,
} from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam } from "../../shared/beam";
import { stampGlimmer } from "../../shared/twinkle";
import { findRewardBars } from "../eventRewards";

const KEY = "eightQueens";
const N = 8;
// first queen's columns the solver gets through in 30 to 48 steps
const STARTS = [1, 3, 5, 6];
// the board's share of the screen's width (at most HIGH of its height), and
// its middle's share of the way down
const SIDE = 0.62;
const HIGH = 0.45;
const MIDDLE = 0.42;
const DOT = 0.2;
const QUEEN = 0.55;
const POP_MS = 90;
const ATTACK_MS = 180;
const ATTACK_W = 0.14;
const SOLVED_MS = 200;
const FADE_MS = 300;
const LIFT = 90;
// the queens whose landing lifts the bar a crit tier
const TIERS = [3, 7];
const PLACE_SHAKE = 0.15;
const DROP_SHAKE = 0.3;
const SOLVED_SHAKE = 1.4;
const LAND_SHAKE: [number, number] = [0.5, 1.2];

interface Step {
  row: number;
  col: number;
  place: boolean;
}

// every queen placed and lifted by backtracking row by row from `first`,
// till one solution stands
function solve(first: number): Step[] {
  const steps: Step[] = [];
  const cols: number[] = [];
  const safe = (row: number, col: number) =>
    cols.every((c, r) => c !== col && Math.abs(c - col) !== row - r);
  const place = (row: number): boolean => {
    if (row === N) return true;
    for (
      let col = row === 0 ? first : 0;
      col < (row === 0 ? first + 1 : N);
      col++
    ) {
      if (!safe(row, col)) continue;
      cols.push(col);
      steps.push({ row, col, place: true });
      if (place(row + 1)) return true;
      cols.pop();
      steps.push({ row, col, place: false });
    }
    return false;
  };
  place(0);
  return steps;
}

export const forceEightQueensEvent = registerWispEvent(
  KEY,
  "Eight Queens",
  () => CONFIG.eightQueensEvent.chance,
  (floor, context, area) => {
    const { boardMs, stepMs, flyGapMs, flyMs, holdMs, mergeMs } =
      CONFIG.eightQueensEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const side = Math.min(width * SIDE, height * HIGH);
    const cell = side / N;
    const left = (area.left + area.right) / 2 - side / 2;
    const top = area.top + height * MIDDLE - side / 2;
    const middle: Point = { x: left + side / 2, y: top + side / 2 };
    const cellAt = (row: number, col: number, into: Point): Point => {
      into.x = left + (col + 0.5) * cell;
      into.y = top + (row + 0.5) * cell;
      return into;
    };
    const mirror = Math.random() < 0.5;
    const steps = solve(STARTS[Math.floor(Math.random() * STARTS.length)]).map(
      (s) => (mirror ? { ...s, col: N - 1 - s.col } : s),
    );
    const times: number[] = [];
    let clock: number = boardMs;
    steps.forEach((_, k) => {
      times.push(clock);
      clock += lerp(stepMs, k / Math.max(1, steps.length - 1));
    });
    const solvedAt = clock;
    const solution = new Array<number>(N).fill(0);
    for (const s of steps) if (s.place) solution[s.row] = s.col;
    const flyStarts = solution.map(
      (_, r) => solvedAt + SOLVED_MS + r * flyGapMs,
    );
    const arrivals = flyStarts.map((ms) => ms + flyMs);
    const endAt = arrivals[N - 1];
    const homes = solution.map((col, r) => cellAt(r, col, { x: 0, y: 0 }));
    const landings = solution.map((_, r) => ({
      x: bar.box.x + bar.box.width * (0.12 + (0.76 * r) / (N - 1)),
      y: bar.center.y,
    }));
    const lifts = homes.map((h) => ({ x: h.x, y: h.y - LIFT }));
    const flySpots = homes.map(() => ({ x: 0, y: 0 }));
    const flyAts = homes.map(
      (home, r) =>
        (ms: number): Point | null =>
          ms > arrivals[r]
            ? null
            : bezier(
                home,
                lifts[r],
                landings[r],
                easeIn(clamp01((ms - flyStarts[r]) / flyMs)),
                flySpots[r],
              ),
    );
    // the board as it stands, replayed each frame
    const cols = new Int8Array(N);
    const placedAt = new Float64Array(N);
    const queens = homes.map(() => ({ x: 0, y: 0 }));
    const queenAts = queens.map((q) => () => q);
    const from: Point = { x: 0, y: 0 };
    const to: Point = { x: 0, y: 0 };
    const spot: Point = { x: 0, y: 0 };
    const size = Math.max(WISP_SIZE * 0.6, cell * QUEEN);
    const beam = cell * ATTACK_W;
    const line = (
      ctx: CanvasRenderingContext2D,
      r0: number,
      c0: number,
      r1: number,
      c1: number,
      a: number,
    ) => drawBeam(ctx, cellAt(r0, c0, from), cellAt(r1, c1, to), beam, a);

    const stepping = createBeats(
      steps,
      (_, k) => times[k],
      (s) => {
        if (s.place) {
          if (cover!.isLive()) shakeScreen(PLACE_SHAKE);
          return;
        }
        cover!.burst(cellAt(s.row, s.col, spot), 0.3);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(DROP_SHAKE);
      },
    );
    const solving = createBeats(
      [solvedAt],
      (ms) => ms,
      () => {
        cover!.burst(middle, 1.2);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(SOLVED_SHAKE);
      },
    );
    const landing = createBeats(
      arrivals,
      (ms) => ms,
      (_, r) => {
        if (TIERS.includes(r)) cover!.tierUp(bar, lifts[r]);
        if (r === N - 1) {
          cover!.slam(bar);
          cover!.blast(landings[r]);
          return;
        }
        cover!.burst(landings[r], 0.5);
        if (!cover!.isLive()) return;
        if (TIERS.includes(r)) playExplosion();
        else playBloop();
        shakeScreen(lerp(LAND_SHAKE, r / (N - 2)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => {
          stepping.tick(ms, now);
          solving.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 600) return;
          // the board: glitter squares popping in row by row, flaring as it's
          // solved, fading as the queens leave
          const fade = 1 - clamp01((ms - flyStarts[0]) / FADE_MS);
          if (fade > 0) {
            const flare = 1 - clamp01((ms - solvedAt) / SOLVED_MS);
            const solved = ms >= solvedAt ? flare : 0;
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = fade;
            for (let r = 0; r < N; r++) {
              const grow = easeOut(
                clamp01((ms - (r / N) * boardMs * 0.6) / (boardMs * 0.4)),
              );
              if (grow <= 0) continue;
              for (let c = 0; c < N; c++) {
                const dot = cell * DOT * grow * ((r + c) % 2 ? 0.6 : 1);
                cellAt(r, c, spot);
                stampGlimmer(
                  ctx,
                  spot.x,
                  spot.y,
                  dot * (1 + solved),
                  0,
                  COLOR.heavenlyGold,
                );
              }
            }
            ctx.restore();
          }
          // replay the solver up to now
          cols.fill(-1);
          let latest = -1;
          for (let k = 0; k < steps.length && times[k] <= ms; k++) {
            const s = steps[k];
            cols[s.row] = s.place ? s.col : -1;
            placedAt[s.row] = times[k];
            latest = k;
          }
          // the newest queen's lines of attack
          const last = latest >= 0 ? steps[latest] : null;
          if (last?.place && ms < solvedAt) {
            const a = 1 - clamp01((ms - times[latest]) / ATTACK_MS);
            if (a > 0) {
              const { row: r, col: c } = last;
              line(ctx, r, 0, r, N - 1, a);
              line(ctx, 0, c, N - 1, c, a);
              const d1 = Math.min(r, c);
              const d2 = Math.min(N - 1 - r, N - 1 - c);
              line(ctx, r - d1, c - d1, r + d2, c + d2, a);
              const d3 = Math.min(r, N - 1 - c);
              const d4 = Math.min(N - 1 - r, c);
              line(ctx, r - d3, c + d3, r + d4, c - d4, a);
            }
          }
          for (let r = 0; r < N; r++) {
            if (ms >= flyStarts[r]) {
              drawWispBetween(
                ctx,
                flyAts[r],
                ms,
                now,
                size,
                1,
                flyStarts[r],
                arrivals[r],
              );
              continue;
            }
            if (cols[r] < 0) continue;
            cellAt(r, cols[r], queens[r]);
            const pop = easeOutBack(clamp01((ms - placedAt[r]) / POP_MS));
            drawWispHead(
              ctx,
              queenAts[r],
              ms,
              now,
              size * pop,
              ms >= solvedAt ? 1 : 0.4,
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
