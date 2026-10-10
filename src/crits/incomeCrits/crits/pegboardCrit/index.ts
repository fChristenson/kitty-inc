// the pegboard income crit: a fan of glitter pegs opens between the number
// and the total, and a dozen wisp balls fire up through it, quicker each
// time, pinging off pegs that flash and landing across the readout in
// blasts; the last brings the huge blast
import { COLOR } from "../../../../palette";
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, drawNumberShrink } from "../shared";

const ROWS = 7;
// pegs' spacing, kept on screen; the board from just over the number to
// just under the total
const SPACING = 120;
const EDGE = 60;
const BOARD_LOW = 170;
const BOARD_HIGH = 170;
const BALLS = 12;
const FIRST_MS = 60;
const LAUNCH_GAP_MS: [number, number] = [90, 40];
const INTO_MS = 70;
const LEG_MS = 28;
const SLOT_MS = 60;
// how far under a peg a ball glances off it
const GLANCE = 26;
const SHOW_MS = 60;
const GROW_MS = 120;
const FADE_MS = 300;
const PEG = 30;
const PING = 1.4;
const PING_MS = 90;
const PING_WHITE = 0.3;
const TWINKLE = 0.003;
const BALL = WISP_SIZE;
const BALL_HEAT = 0.8;
const LAND_BLAST = 170;
// shakes by step: a ball landing, the last
const SHAKES = [0.7, 2.4];

interface Ball {
  launch: number;
  land: number;
  to: Point;
  path: (ms: number) => Point;
}
interface Peg {
  at: Point;
  hits: number[];
}
interface Board {
  balls: Ball[];
  pegs: Peg[];
  endAt: number;
}
const boards = new WeakMap<Running, Board>();

// a ball's route: points and the times it reaches them, as straight legs
function routePath(points: Point[], times: number[]): (ms: number) => Point {
  const spot: Point = { x: 0, y: 0 };
  return (ms) => {
    let k = 1;
    while (k < times.length - 1 && ms > times[k]) k++;
    const u = clamp01((ms - times[k - 1]) / (times[k] - times[k - 1]));
    spot.x = lerp(points[k - 1].x, points[k].x, u);
    spot.y = lerp(points[k - 1].y, points[k].y, u);
    return spot;
  };
}

function planBoard(to: Point, viewportWidth: number): Board {
  const sp = Math.min(SPACING, (viewportWidth - 2 * EDGE) / (ROWS + 1));
  const rowY = (row: number) =>
    lerp(-BOARD_LOW, to.y + BOARD_HIGH, row / (ROWS - 1));
  // row r has r + 3 pegs; its gaps sit right under the next row's pegs
  const pegX = (row: number, i: number) => to.x + (i - (row + 2) / 2) * sp;
  const gapX = (row: number, g: number) => to.x + (g - (row + 1) / 2) * sp;
  const pegs: Peg[][] = [];
  for (let row = 0; row < ROWS; row++) {
    const line: Peg[] = [];
    for (let i = 0; i < row + 3; i++)
      line.push({ at: { x: pegX(row, i), y: rowY(row) }, hits: [] });
    pegs.push(line);
  }
  const balls: Ball[] = [];
  let launch = FIRST_MS;
  for (let b = 0; b < BALLS; b++) {
    const points: Point[] = [{ x: 0, y: 0 }];
    const times = [launch];
    let g = holeHash(b, 121) < 0.5 ? 0 : 1;
    let t = launch + INTO_MS;
    points.push({ x: gapX(0, g), y: rowY(0) });
    times.push(t);
    for (let row = 0; row < ROWS - 1; row++) {
      // up into the peg over its gap, then off it to one side
      const peg = pegs[row + 1][g + 1];
      t += LEG_MS;
      points.push({ x: peg.at.x, y: peg.at.y + GLANCE });
      times.push(t);
      peg.hits.push(t);
      if (holeHash(b * 31 + row, 122) >= 0.5) g++;
      t += LEG_MS;
      points.push({ x: gapX(row + 1, g), y: rowY(row + 1) });
      times.push(t);
    }
    t += SLOT_MS;
    const slot = { x: gapX(ROWS - 1, g), y: to.y };
    points.push(slot);
    times.push(t);
    balls.push({ launch, land: t, to: slot, path: routePath(points, times) });
    launch += lerp(LAUNCH_GAP_MS[0], LAUNCH_GAP_MS[1], b / (BALLS - 1));
  }
  return {
    balls,
    pegs: pegs.flat(),
    endAt: balls[BALLS - 1].land,
  };
}

registerFloorCrit("pegboardCrit", {
  plan(r, bars, hit) {
    const board = planBoard(bars[0], r.viewportWidth);
    boards.set(r, board);
    const { balls } = board;
    for (let b = 0; b < balls.length; b++)
      hit(0, balls[b].land, b === balls.length - 1 ? 1 : 0);
  },
  draw(ctx, r, ms, bars) {
    const board = boards.get(r);
    if (!board) return;
    const now = r.startedAt + ms;
    const { balls, pegs, endAt } = board;
    drawNumberShrink(ctx, r, ms);
    if (ms >= SHOW_MS && ms < endAt + FADE_MS) {
      const grow = clamp01((ms - SHOW_MS) / GROW_MS);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 1 - clamp01((ms - endAt) / FADE_MS);
      for (let k = 0; k < pegs.length; k++) {
        const { at, hits } = pegs[k];
        let ping = 0;
        for (let j = hits.length - 1; j >= 0; j--)
          if (ms >= hits[j]) {
            ping = Math.exp(-(ms - hits[j]) / PING_MS);
            break;
          }
        stampGlimmer(
          ctx,
          at.x,
          at.y,
          PEG * grow * (1 + PING * ping),
          k + ms * TWINKLE,
          ping > PING_WHITE ? COLOR.white : COLOR.heavenlyGold,
        );
      }
      ctx.restore();
    }
    const last = balls.length - 1;
    for (let b = 0; b <= last; b++) {
      const ball = balls[b];
      drawWispBetween(
        ctx,
        ball.path,
        ms,
        now,
        BALL,
        BALL_HEAT,
        ball.launch,
        ball.land,
      );
      if (b < last)
        drawDetonation(ctx, ball.to, ms - ball.land, LAND_BLAST, now);
    }
    drawFinale(ctx, bars[0], ms - endAt, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
