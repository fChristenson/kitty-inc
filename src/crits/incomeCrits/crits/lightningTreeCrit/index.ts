// the lightning tree income crit: round after round, forking leaders crawl in
// on the total from all round it in quick jerky steps, crackling; the first
// to touch fires the return stroke, the whole tree flashing white-hot with a
// crack on the total. More leaders, quicker steps each round; in the last
// they touch from every side at once for the biggest stroke and the finale
import { COLOR } from "../../../../palette";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawStrike } from "../../../../shared/animationStyles/lightning";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  registerFloorCrit,
  lerp,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, drawNumberShrink, readoutSpot } from "../shared";

const SALT = 911;
// by round: leaders, ms a step, the steps the first one takes to touch, and
// the wait after its stroke before the next round's leaders set off
const LEADERS = [3, 5, 7, 9, 12];
const STEP_MS = [34, 31, 29, 27, 25];
const REACH = [11, 10, 9, 8, 8];
const GAP_MS = [90, 60, 40, 20];
const FIRST_MS = 60;
const ROUNDS = LEADERS.length;
// the others take 1..SHORT more steps, so they're cut off short of the total
const SHORT = 4;
const MAX_STEPS = REACH[0] + SHORT;
// where leaders set off: this far from their spot (squashed above and below
// the total), each step turned up to JAG radians off straight at it
const FAR: [number, number] = [350, 450];
const ABOVE = 0.45;
const BELOW = 0.8;
const JAG = 0.6;
const STRETCH: [number, number] = [0.8, 1.25];
// branches: sprouting off a step at FORK_CHANCE, up to BRANCHES a leader, of
// 2..TWIG_SEGS segments, growing a segment a step
const FORK_CHANCE = 0.45;
const BRANCHES = 5;
const TWIG_SEGS = 4;
const TWIG_TURN: [number, number] = [0.45, 1.05];
const TWIG_LEN: [number, number] = [0.55, 0.85];
const TWIG_JAG = 0.5;
const TWIG_SHRINK = 0.8;
// the leaders' look, flickering every FLICKER_MS
const FLICKER_MS = 30;
const LEADER_GLOW = COLOR.winterSaleIceBlue;
const LEADER = [14, 4];
const TWIG = [8, 2.5];
const LEADER_HALO_ALPHA = 0.35;
const TIP = 26;
const CHARGE = 70;
// the return stroke: a blink, a dip, a re-strike, then a fast fade
const BLINK_MS = 30;
const DIP_MS = 55;
const RESTRIKE_MS = 80;
const DIP = 0.35;
const RESTRIKE = 0.95;
const RETURN_MS = 180;
const FINAL_RETURN_MS = 260;
// stroke widths: halo, glow, core; the touching channel's halo and core
const STROKE = [36, 14, 6];
const STROKE_TWIG = [18, 7, 3];
const CHANNEL = [64, 22];
const STROKE_ALPHA = [0.4, 0.85, 1];
const FINAL_SCALE = 1.4;
const STRIKE = 1.6;
const FINAL_STRIKE = 1.3;
const FINAL_STRIKE_EVERY = 3;
const BLAST = 190;
// shakes by step: a return stroke, the last one
const SHAKES = [1, 2.6];

interface Round {
  count: number;
  start: number;
  stepMs: number;
  strikeAt: number;
  // the touching leader, or -1 when they all touch
  winner: number;
  // each leader's steps, its points (x, y; MAX_STEPS + 1 a leader) and spot
  steps: Uint8Array;
  main: Float32Array;
  spots: Point[];
  // each branch slot's sprouting step (-1 for none), segments and points
  sprout: Int8Array;
  twig: Uint8Array;
  branch: Float32Array;
}
interface Tree {
  rounds: Round[];
  endAt: number;
}
const trees = new WeakMap<Running, Tree>();

const LEADER_STRIDE = (MAX_STEPS + 1) * 2;
const TWIG_STRIDE = (TWIG_SEGS + 1) * 2;

function planRound(to: Point, k: number, start: number): Round {
  const count = LEADERS[k];
  const reach = REACH[k];
  const last = k === ROUNDS - 1;
  const winner = last ? -1 : Math.floor(holeHash(k, SALT) * count);
  const steps = new Uint8Array(count);
  const main = new Float32Array(count * LEADER_STRIDE);
  const spots: Point[] = [];
  const sprout = new Int8Array(count * BRANCHES).fill(-1);
  const twig = new Uint8Array(count * BRANCHES);
  const branch = new Float32Array(count * BRANCHES * TWIG_STRIDE);
  for (let l = 0; l < count; l++) {
    const key = k * 100 + l;
    const spot = readoutSpot(to, key, SALT + 1);
    spots.push(spot);
    const angle =
      ((l + 0.6 * holeHash(key, SALT + 3)) / count + k * 0.13) * Math.PI * 2;
    const far = lerp(FAR[0], FAR[1], holeHash(key, SALT + 4));
    const sin = Math.sin(angle);
    let x = spot.x + Math.cos(angle) * far;
    let y = spot.y + sin * far * (sin < 0 ? ABOVE : BELOW);
    const own =
      last || l === winner
        ? reach
        : reach + 1 + Math.floor(holeHash(key, SALT + 5) * SHORT);
    steps[l] = own;
    const m = l * LEADER_STRIDE;
    main[m] = x;
    main[m + 1] = y;
    for (let i = 1; i <= own; i++) {
      const left = own - i + 1;
      if (left === 1) {
        x = spot.x;
        y = spot.y;
      } else {
        const dx = (spot.x - x) / left;
        const dy = (spot.y - y) / left;
        const h = key * 16 + i;
        const turn = (holeHash(h, SALT + 6) * 2 - 1) * JAG;
        const stretch = lerp(STRETCH[0], STRETCH[1], holeHash(h, SALT + 7));
        const c = Math.cos(turn) * stretch;
        const s = Math.sin(turn) * stretch;
        x += dx * c - dy * s;
        y += dx * s + dy * c;
      }
      main[m + i * 2] = x;
      main[m + i * 2 + 1] = y;
    }
    let b = 0;
    for (let i = 1; i < own - 1 && b < BRANCHES; i++) {
      const h = key * 16 + i;
      if (holeHash(h, SALT + 8) > FORK_CHANCE) continue;
      const slot = l * BRANCHES + b++;
      const segs = 2 + Math.floor(holeHash(h, SALT + 9) * (TWIG_SEGS - 1));
      sprout[slot] = i;
      twig[slot] = segs;
      const hx = main[m + i * 2] - main[m + i * 2 - 2];
      const hy = main[m + i * 2 + 1] - main[m + i * 2 - 1];
      let a =
        Math.atan2(hy, hx) +
        (holeHash(h, SALT + 10) < 0.5 ? -1 : 1) *
          lerp(TWIG_TURN[0], TWIG_TURN[1], holeHash(h, SALT + 11));
      let len =
        Math.hypot(hx, hy) *
        lerp(TWIG_LEN[0], TWIG_LEN[1], holeHash(h, SALT + 12));
      let bx = main[m + i * 2];
      let by = main[m + i * 2 + 1];
      const o = slot * TWIG_STRIDE;
      branch[o] = bx;
      branch[o + 1] = by;
      for (let j = 1; j <= segs; j++) {
        a += (holeHash(h * 8 + j, SALT + 13) * 2 - 1) * TWIG_JAG;
        bx += Math.cos(a) * len;
        by += Math.sin(a) * len;
        len *= TWIG_SHRINK;
        branch[o + j * 2] = bx;
        branch[o + j * 2 + 1] = by;
      }
    }
  }
  return {
    count,
    start,
    stepMs: STEP_MS[k],
    strikeAt: start + (reach - 1) * STEP_MS[k],
    winner,
    steps,
    main,
    spots,
    sprout,
    twig,
    branch,
  };
}

function planTree(to: Point): Tree {
  const rounds: Round[] = [];
  let start = FIRST_MS;
  for (let k = 0; k < ROUNDS; k++) {
    const round = planRound(to, k, start);
    rounds.push(round);
    start = round.strikeAt + (GAP_MS[k] ?? 0);
  }
  return { rounds, endAt: rounds[ROUNDS - 1].strikeAt };
}

// every leader's channel up to `step` (each capped at its own), or only one's
function traceLeaders(
  ctx: CanvasRenderingContext2D,
  round: Round,
  step: number,
  only = -1,
): void {
  ctx.beginPath();
  for (let l = 0; l < round.count; l++) {
    if (only >= 0 && l !== only) continue;
    const shown = step < round.steps[l] ? step : round.steps[l];
    if (shown < 1) continue;
    const m = l * LEADER_STRIDE;
    ctx.moveTo(round.main[m], round.main[m + 1]);
    for (let i = 1; i <= shown; i++)
      ctx.lineTo(round.main[m + i * 2], round.main[m + i * 2 + 1]);
  }
}

// every branch grown by `step`, a segment a step since it sprouted
function traceBranches(
  ctx: CanvasRenderingContext2D,
  round: Round,
  step: number,
): void {
  ctx.beginPath();
  for (let slot = 0; slot < round.count * BRANCHES; slot++) {
    const at = round.sprout[slot];
    if (at < 0) continue;
    const l = (slot / BRANCHES) | 0;
    const own = step < round.steps[l] ? step : round.steps[l];
    const grown = own - at;
    if (grown < 1) continue;
    const shown = grown < round.twig[slot] ? grown : round.twig[slot];
    const o = slot * TWIG_STRIDE;
    ctx.moveTo(round.branch[o], round.branch[o + 1]);
    for (let j = 1; j <= shown; j++)
      ctx.lineTo(round.branch[o + j * 2], round.branch[o + j * 2 + 1]);
  }
}

function stroke(
  ctx: CanvasRenderingContext2D,
  base: number,
  color: string,
  width: number,
  alpha: number,
): void {
  ctx.globalAlpha = base * alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

// the leaders crawling in, flickering, their tips crackling
function drawLeaders(
  ctx: CanvasRenderingContext2D,
  round: Round,
  k: number,
  ms: number,
  base: number,
): void {
  const step = Math.floor((ms - round.start) / round.stepMs) + 1;
  const tick = Math.floor(ms / FLICKER_MS);
  const flicker = 0.55 + 0.45 * holeHash(tick, SALT + 20 + k);
  traceBranches(ctx, round, step);
  stroke(ctx, base, LEADER_GLOW, TWIG[0], LEADER_HALO_ALPHA * flicker);
  stroke(ctx, base, COLOR.white, TWIG[1], flicker);
  traceLeaders(ctx, round, step);
  stroke(ctx, base, LEADER_GLOW, LEADER[0], LEADER_HALO_ALPHA * flicker);
  stroke(ctx, base, COLOR.white, LEADER[1], flicker);
  ctx.globalAlpha = base;
  const near = (ms - round.start) / (round.strikeAt - round.start);
  for (let l = 0; l < round.count; l++) {
    const shown = step < round.steps[l] ? step : round.steps[l];
    const m = l * LEADER_STRIDE + shown * 2;
    const spark = holeHash(tick * 13 + l, SALT + 21);
    stampGlimmer(
      ctx,
      round.main[m],
      round.main[m + 1],
      TIP * (0.5 + spark),
      spark * 6,
      spark < 0.5 ? COLOR.white : LEADER_GLOW,
    );
    if (round.winner < 0 || l === round.winner)
      stampGlimmer(
        ctx,
        round.spots[l].x,
        round.spots[l].y,
        CHARGE * near * near * (0.6 + 0.4 * spark),
        spark * 6,
        COLOR.heavenlyGold,
      );
  }
}

// the return stroke's brightness dt after it fired
function returnAlpha(dt: number, ms: number): number {
  if (dt < 0 || dt >= ms) return 0;
  if (dt < BLINK_MS) return 1;
  if (dt < DIP_MS) return DIP;
  if (dt < RESTRIKE_MS) return RESTRIKE;
  return RESTRIKE * (1 - (dt - RESTRIKE_MS) / (ms - RESTRIKE_MS)) ** 2;
}

// the whole tree as it stood at the touch, white-hot
function drawReturn(
  ctx: CanvasRenderingContext2D,
  round: Round,
  alpha: number,
  base: number,
): void {
  const final = round.winner < 0;
  const scale = final ? FINAL_SCALE : 1;
  const step = round.steps[final ? 0 : round.winner];
  traceBranches(ctx, round, step);
  stroke(
    ctx,
    base,
    COLOR.heavenlyGold,
    STROKE_TWIG[0] * scale,
    STROKE_ALPHA[0] * alpha,
  );
  stroke(
    ctx,
    base,
    COLOR.white,
    STROKE_TWIG[1] * scale,
    STROKE_ALPHA[1] * alpha,
  );
  stroke(
    ctx,
    base,
    COLOR.white,
    STROKE_TWIG[2] * scale,
    STROKE_ALPHA[2] * alpha,
  );
  traceLeaders(ctx, round, step);
  stroke(
    ctx,
    base,
    COLOR.heavenlyGold,
    STROKE[0] * scale,
    STROKE_ALPHA[0] * alpha,
  );
  stroke(ctx, base, COLOR.white, STROKE[1] * scale, STROKE_ALPHA[1] * alpha);
  stroke(ctx, base, COLOR.white, STROKE[2] * scale, STROKE_ALPHA[2] * alpha);
  if (!final) {
    traceLeaders(ctx, round, step, round.winner);
    stroke(ctx, base, COLOR.heavenlyGold, CHANNEL[0], STROKE_ALPHA[0] * alpha);
    stroke(ctx, base, COLOR.white, CHANNEL[1], alpha);
  }
}

registerFloorCrit("lightningTreeCrit", {
  plan(r, bars, hit) {
    const tree = planTree(bars[0]);
    trees.set(r, tree);
    for (let k = 0; k < ROUNDS - 1; k++) hit(0, tree.rounds[k].strikeAt, 0);
    hit(0, tree.endAt, 1);
  },
  draw(ctx, r, ms, bars) {
    const tree = trees.get(r);
    if (!tree) return;
    const now = r.startedAt + ms;
    drawNumberShrink(ctx, r, ms);
    const { rounds } = tree;
    ctx.save();
    const base = ctx.globalAlpha;
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let k = 0; k < ROUNDS; k++) {
      const round = rounds[k];
      if (ms < round.start) break;
      if (ms < round.strikeAt) {
        drawLeaders(ctx, round, k, ms, base);
        continue;
      }
      const alpha = returnAlpha(
        ms - round.strikeAt,
        round.winner < 0 ? FINAL_RETURN_MS : RETURN_MS,
      );
      if (alpha > 0) drawReturn(ctx, round, alpha, base);
    }
    ctx.restore();
    for (let k = 0; k < ROUNDS; k++) {
      const round = rounds[k];
      const dt = ms - round.strikeAt;
      if (dt < 0) break;
      if (round.winner >= 0) {
        const spot = round.spots[round.winner];
        drawStrike(ctx, spot, returnAlpha(dt, RETURN_MS), STRIKE, now);
        drawDetonation(ctx, spot, dt, BLAST, now);
        continue;
      }
      const alpha = returnAlpha(dt, FINAL_RETURN_MS);
      if (alpha > 0)
        for (let l = 0; l < round.count; l += FINAL_STRIKE_EVERY)
          drawStrike(ctx, round.spots[l], alpha, FINAL_STRIKE, now);
    }
    drawFinale(ctx, bars[0], ms - tree.endAt, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
