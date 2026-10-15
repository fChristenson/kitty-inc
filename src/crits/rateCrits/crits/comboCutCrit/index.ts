// Combo Cut, a rate crit: balls of glitter are tossed up over every bar, a
// few each, and swift slashes cut them mid-air in quick fire, combo-style,
// rippling down the building, quicker bar by bar; each ball splits, its
// halves sliding apart and tumbling down spilling glitter, each bar's last
// cut its hit, its combo slamming down over it as its readout turns over.
// The finale: a wave of balls tossed up at once, one long cut tearing down
// through all of them, then a cross through its own bar's big trembling
// ball, bursting it: each bar's next payout pays its combo, its own the most
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import { COLOR } from "../../../../palette";
import {
  drawSlash,
  drawSliceSpill,
  planSlash,
  sliceOffset,
  type Slash,
} from "../../../../shared/animationStyles/slice";
import { drawBeamFlare } from "../../../../shared/animationStyles/beam";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawPays,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import {
  BAR_HALF_H,
  bottomBarY,
  ownLast,
  topBarY,
} from "../../../floorCrits/critPlayer/shared";

const IN_MS = 160;
// balls R round (its own OWN_R) at SPOTS of the bar's half width, tossed up
// from LAUNCH of its half height over TOSS_MS to LIFTS px over its top edge
const R = 40;
const OWN_R = 84;
const SPOTS = [-0.5, 0.02, 0.52];
const LIFTS = [24, 52, 36];
const LAUNCH = 0.5;
const TOSS_MS = 200;
const OWN_TOSS_MS = 240;
// each bar's three cuts CUT_GAP_MS apart, each swiping SWIPE_MS, both
// closing down the building; the bars BAR_GAP_MS apart (closing), squeezed
// into COMBO_MS between them all
const CUTS = 3;
const CUT_GAP_MS: [number, number] = [85, 45];
const SWIPE_MS: [number, number] = [70, 56];
const BAR_GAP_MS: [number, number] = [190, 90];
const COMBO_MS = 1050;
// a cut REACH of the radius either side of the ball's middle
const REACH = 1.8;
const SLASH = 24;
const SPILL = 20;
const SPILL_N = 12;
// the pieces sliding GAP px apart, then drifting DRIFT more and dropping
// FALL px over FALL_MS, fading
const GAP = 16;
const DRIFT = 40;
const FALL = 170;
const FALL_MS = 460;
// the finale FINALE_GAP_MS after the combo: a ball over every bar FIN_LIFT
// px over its top, its own's hovering HOVER_MS first; the long cut swiping
// LONG_MS from LONG_X of the half width right, PAST px over the top ball,
// down to LONG_X left, PAST under the lowest bar
const FINALE_GAP_MS = 150;
const FIN_LIFT = 44;
const OWN_LIFT = 40;
const HOVER_MS = 320;
const LONG_MS = 130;
const LONG_X = 0.7;
const PAST = 200;
const LONG_SLASH = 40;
const FIN_SPILL = 18;
const FIN_SPILL_N = 10;
// the cross CROSS_IN_MS after the long cut, each swipe CROSS_MS, the second
// CROSS_GAP_MS after the first; its pieces OWN_GAP apart, flung OWN_DRIFT
const CROSS_IN_MS = 70;
const CROSS_MS = 75;
const CROSS_GAP_MS = 45;
const CROSS_SLASH = 46;
const OWN_SPILL = 36;
const OWN_SPILL_N = 26;
const OWN_GAP = 22;
const OWN_DRIFT = 260;
// its own ball trembling up to TREMBLE px, a flare FLARE across behind it
const TREMBLE = 10;
const FLARE = 210;
// glints on each whole ball
const GLINTS = 3;
const GLINT = 0.75;
const BLAST = 90;
const OWN_BLAST = 300;
const PAYS_FONT = 120;
const OWN_PAYS_FONT = 180;
const PAYS_MS = 650;
// shakes by step: a cut, a bar's last cut, its own's cross
const SHAKES = [0.45, 1.1, 3];

interface Ball {
  bar: number;
  own: boolean;
  radius: number;
  // its middle at the top of its toss, from its bar's middle
  x: number;
  apexY: number;
  launchY: number;
  tossAt: number;
  apexAt: number;
  // the cuts through it from its bar's middle, streaks drawn from `drawn` on
  cuts: Slash[];
  drawn: number;
  // the last cut's through
  doneAt: number;
  // its pieces: wedges between bounds (radians, one past the last wrapping
  // round), each's middle from its bar's and the way out of it
  bounds: Float32Array;
  mids: Point[];
  outX: Float32Array;
  outY: Float32Array;
  spill: number;
  spillN: number;
}
interface Blast {
  ball: Ball;
  at: number;
  size: number;
}
interface Pays {
  bar: number;
  at: number;
  label: string;
  font: number;
}
interface State {
  balls: Ball[];
  own: Ball;
  blasts: Blast[];
  pays: Pays[];
  swooshes: Float32Array;
  longAt: number;
  // the long cut's top below the top bar's, its line's dip
  topPast: number;
}
const states = new WeakMap<Running, State>();
const COMBO_LABELS: string[] = [];
for (let i = 0; i <= meta.values.maxCombo; i++) COMBO_LABELS.push(`x${i}`);

const apart: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };
const longTop: Point = { x: 0, y: 0 };
const longBottom: Point = { x: 0, y: 0 };
const longSlash: Slash = planSlash(longTop, longBottom, 0);
let ballFill: CanvasGradient | null = null;

// reward hits landed this run, in hit order: each's combo
let landed = 0;

// a combo: how many times as big the bar's next payout pays
const combos = defineBarEffect<number>({
  payout: (times) => times,
  onPayout: () => undefined,
});

// a ball tossed from launchY at tossAt, cut through at apexAt's top
function makeBall(
  bar: number,
  own: boolean,
  radius: number,
  x: number,
  apexY: number,
  launchY: number,
  apexAt: number,
  tossMs: number,
): Ball {
  return {
    bar,
    own,
    radius,
    x,
    apexY,
    launchY,
    tossAt: apexAt - tossMs,
    apexAt,
    cuts: [],
    drawn: 0,
    doneAt: 0,
    bounds: new Float32Array(1),
    mids: [],
    outX: new Float32Array(0),
    outY: new Float32Array(0),
    spill: SPILL,
    spillN: SPILL_N,
  };
}

// its pieces, once all its cuts (each through its middle) are planned
function cutUp(ball: Ball): void {
  const angles: number[] = [];
  for (const cut of ball.cuts) {
    let a = Math.atan2(cut.to.y - cut.from.y, cut.to.x - cut.from.x);
    a = ((a % Math.PI) + Math.PI) % Math.PI;
    angles.push(a, a + Math.PI);
  }
  angles.sort((a, b) => a - b);
  const n = angles.length;
  ball.bounds = new Float32Array(n + 1);
  ball.outX = new Float32Array(n);
  ball.outY = new Float32Array(n);
  for (let i = 0; i < n; i++) ball.bounds[i] = angles[i];
  ball.bounds[n] = angles[0] + Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const m = (ball.bounds[i] + ball.bounds[i + 1]) / 2;
    ball.outX[i] = Math.cos(m);
    ball.outY[i] = Math.sin(m);
    ball.mids.push({
      x: ball.x + ball.outX[i] * ball.radius * 0.5,
      y: ball.apexY + ball.outY[i] * ball.radius * 0.5,
    });
  }
  ball.doneAt = ball.cuts[ball.cuts.length - 1].endMs;
}

// a cut through the ball's middle along angle a, from startMs over swipeMs
function cutAcross(
  ball: Ball,
  a: number,
  reach: number,
  startMs: number,
  swipeMs: number,
): Slash {
  const dx = Math.cos(a) * reach;
  const dy = Math.sin(a) * reach;
  const slash = planSlash(
    { x: ball.x - dx, y: ball.apexY - dy },
    { x: ball.x + dx, y: ball.apexY + dy },
    startMs,
    swipeMs,
  );
  ball.cuts.push(slash);
  return slash;
}

// the long cut's line at bars: written into longTop and longBottom
function longLine(r: Running, bars: Point[], topPast: number): void {
  const half = r.play.barHalfWidth;
  longTop.x = bars[0].x + half * LONG_X;
  longTop.y = topBarY(bars) - topPast;
  longBottom.x = bars[0].x - half * LONG_X;
  longBottom.y = bottomBarY(bars) + PAST;
}

registerFloorCrit("comboCutCrit", {
  // the next payout pays its combo, growing down the building, its own the most
  reward(t) {
    t.flipRate();
    const { first, maxCombo } = meta.values;
    const times = t.own ? maxCombo : Math.min(first + landed++, maxCombo - 1);
    combos.set(t.floor, Math.max(combos.get(t.floor) ?? 1, times));
  },
  plan(r, bars, hit) {
    landed = 0;
    const half = r.play.barHalfWidth;
    const { first, maxCombo } = meta.values;
    const order = ownLast(bars);
    const others = order.length - 1;
    const balls: Ball[] = [];
    const blasts: Blast[] = [];
    const pays: Pays[] = [];
    const swooshes: number[] = [];
    // the gaps between the bars, squeezed into COMBO_MS
    let total = 0;
    for (let k = 0; k < others - 1; k++)
      total += lerp(BAR_GAP_MS[0], BAR_GAP_MS[1], k / Math.max(1, others - 1));
    const squeeze = total > COMBO_MS ? COMBO_MS / total : 1;
    let t = IN_MS + TOSS_MS - 40;
    let comboEnd = IN_MS;
    for (let k = 0; k < others; k++) {
      const bar = order[k];
      const u = k / Math.max(1, others - 1);
      const gap = lerp(CUT_GAP_MS[0], CUT_GAP_MS[1], u);
      const swipe = lerp(SWIPE_MS[0], SWIPE_MS[1], u);
      for (let j = 0; j < CUTS; j++) {
        const start = t + j * gap;
        const ball = makeBall(
          bar,
          false,
          R,
          half * SPOTS[j],
          -(BAR_HALF_H + R + LIFTS[j]),
          -BAR_HALF_H * LAUNCH,
          start + swipe / 2,
          TOSS_MS,
        );
        // forehand and backhand by turns, all swiping down
        const tilt = 0.35 + 0.45 * hash01(k * 7 + j, 4411);
        const slash = cutAcross(
          ball,
          (j + k) % 2 ? tilt : Math.PI - tilt,
          R * REACH,
          start,
          swipe,
        );
        cutUp(ball);
        balls.push(ball);
        swooshes.push(start);
        const last = j === CUTS - 1;
        hit(bar, slash.endMs, last ? 1 : 0);
        if (last) {
          blasts.push({ ball, at: slash.endMs, size: BLAST });
          pays.push({
            bar,
            at: slash.endMs,
            label: COMBO_LABELS[Math.min(first + k, maxCombo - 1)],
            font: PAYS_FONT,
          });
          comboEnd = slash.endMs;
        }
      }
      t += lerp(BAR_GAP_MS[0], BAR_GAP_MS[1], u) * squeeze;
    }
    // the finale: the long cut down through a wave of balls, then the cross
    const longAt = Math.max(
      comboEnd + FINALE_GAP_MS,
      IN_MS + OWN_TOSS_MS + HOVER_MS,
    );
    const topPast = BAR_HALF_H + OWN_R * 2 + OWN_LIFT + PAST;
    longLine(r, bars, topPast);
    const dx = longBottom.x - longTop.x;
    const dy = longBottom.y - longTop.y;
    const along = Math.atan2(dy, dx);
    let own: Ball | null = null;
    for (const bar of order) {
      const isOwn = bar === 0;
      const radius = isOwn ? OWN_R : R;
      const apexY = -(BAR_HALF_H + radius + (isOwn ? OWN_LIFT : FIN_LIFT));
      const v = clamp01((bars[bar].y + apexY - longTop.y) / (dy || 1));
      const crossing = longAt + LONG_MS * v;
      const ball = makeBall(
        bar,
        isOwn,
        radius,
        longTop.x + dx * v - bars[bar].x,
        apexY,
        -BAR_HALF_H * LAUNCH,
        isOwn ? longAt - HOVER_MS : crossing,
        isOwn ? OWN_TOSS_MS : TOSS_MS,
      );
      const slash = cutAcross(ball, along, radius * REACH, crossing - 15, 30);
      if (isOwn) {
        own = ball;
        ball.drawn = 1;
        ball.spill = OWN_SPILL;
        ball.spillN = OWN_SPILL_N;
        const reach = radius * REACH;
        const firstAt = longAt + LONG_MS + CROSS_IN_MS;
        const secondAt = firstAt + CROSS_MS + CROSS_GAP_MS;
        const a = cutAcross(ball, Math.PI / 4, reach, firstAt, CROSS_MS);
        const b = cutAcross(ball, (Math.PI * 3) / 4, reach, secondAt, CROSS_MS);
        swooshes.push(firstAt, secondAt);
        hit(bar, slash.endMs, 0);
        hit(bar, a.endMs, 0);
        hit(bar, b.endMs, 2);
        blasts.push({ ball, at: b.endMs, size: OWN_BLAST });
        pays.push({
          bar,
          at: b.endMs,
          label: COMBO_LABELS[maxCombo],
          font: OWN_PAYS_FONT,
        });
      } else {
        // the long cut's own streak through it
        ball.drawn = 1;
        ball.spill = FIN_SPILL;
        ball.spillN = FIN_SPILL_N;
        hit(bar, slash.endMs, 0);
      }
      cutUp(ball);
      balls.push(ball);
    }
    swooshes.push(longAt);
    swooshes.sort((a, b) => a - b);
    states.set(r, {
      balls,
      own: own!,
      blasts,
      pays,
      swooshes: Float32Array.from(swooshes),
      longAt,
      topPast,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    while (r.kicked < state.swooshes.length && ms >= state.swooshes[r.kicked]) {
      r.kicked++;
      playSwoosh();
    }
    const { balls, own } = state;
    // its own ball charging: trembling harder, a flare swelling behind it
    const crossEnd = own.doneAt;
    const charge = clamp01((ms - own.apexAt) / (crossEnd - own.apexAt));
    const shake = ms < crossEnd ? TREMBLE * charge * charge : 0;
    const shiverX = Math.sin(ms * 0.11) * shake;
    const shiverY = Math.cos(ms * 0.137) * shake;
    if (ms >= own.tossAt && ms < crossEnd) {
      spot.x = bars[own.bar].x + own.x + shiverX;
      spot.y = bars[own.bar].y + ballY(own, ms) + shiverY;
      drawBeamFlare(ctx, spot, FLARE * (0.4 + charge), 0.4 + 0.6 * charge, now);
    }
    if (!ballFill) {
      ballFill = ctx.createRadialGradient(-0.35, -0.4, 0.05, 0, 0, 1);
      ballFill.addColorStop(0, COLOR.white);
      ballFill.addColorStop(0.3, COLOR.heavenlyGold);
      ballFill.addColorStop(0.8, COLOR.amber);
      ballFill.addColorStop(1, COLOR.amberShadow);
    }
    // the balls, whole or in pieces
    for (const ball of balls) {
      if (ms < ball.tossAt) continue;
      const fall = (ms - ball.doneAt) / FALL_MS;
      if (fall >= 1) continue;
      const at = bars[ball.bar];
      const cx = at.x + ball.x + (ball.own ? shiverX : 0);
      const cy = at.y + ballY(ball, ms) + (ball.own ? shiverY : 0);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(ball.radius, ball.radius);
      ctx.fillStyle = ballFill;
      ctx.beginPath();
      if (ms < ball.cuts[0].endMs) {
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
      } else {
        const f = fall > 0 ? fall : 0;
        if (f > 0) ctx.globalAlpha *= 1 - f;
        const gap = ball.own ? OWN_GAP : GAP;
        const drift = (ball.own ? OWN_DRIFT : DRIFT) * f;
        const drop = FALL * f * f;
        const n = ball.outX.length;
        for (let i = 0; i < n; i++) {
          sliceOffset(ball.cuts, ball.mids[i], ms, gap, apart);
          const ox = (apart.x + ball.outX[i] * drift) / ball.radius;
          const oy = (apart.y + ball.outY[i] * drift + drop) / ball.radius;
          ctx.moveTo(ox, oy);
          ctx.arc(ox, oy, 1, ball.bounds[i], ball.bounds[i + 1]);
          ctx.closePath();
        }
      }
      ctx.fill();
      ctx.restore();
    }
    // glints on the whole balls
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let b = 0; b < balls.length; b++) {
      const ball = balls[b];
      if (ms < ball.tossAt || ms >= ball.cuts[0].endMs) continue;
      const at = bars[ball.bar];
      const cx = at.x + ball.x + (ball.own ? shiverX : 0);
      const cy = at.y + ballY(ball, ms) + (ball.own ? shiverY : 0);
      for (let i = 0; i < GLINTS; i++) {
        const a = ms * 0.012 + i * 2.1 + b;
        stampGlimmer(
          ctx,
          cx + Math.cos(a) * ball.radius * 0.6,
          cy + Math.sin(a) * ball.radius * 0.6,
          ball.radius * GLINT,
          a,
          i ? COLOR.heavenlyGold : COLOR.white,
        );
      }
    }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    // the cuts' streaks and the glitter spilling out of them
    for (const ball of balls) {
      if (ms < ball.cuts[0].startMs || ms > ball.doneAt + FALL_MS) continue;
      const at = bars[ball.bar];
      ctx.save();
      ctx.translate(at.x, at.y);
      for (let k = 0; k < ball.cuts.length; k++) {
        const cut = ball.cuts[k];
        if (k >= ball.drawn)
          drawSlash(ctx, cut, ms, ball.own ? CROSS_SLASH : SLASH, now);
        drawSliceSpill(ctx, cut, ms, ball.spill, ball.spillN);
      }
      ctx.restore();
    }
    // the long cut, tearing down through every bar at once
    if (ms >= state.longAt) {
      longLine(r, bars, state.topPast);
      longSlash.startMs = state.longAt;
      longSlash.endMs = state.longAt + LONG_MS;
      drawSlash(ctx, longSlash, ms, LONG_SLASH, now);
    }
    for (const blast of state.blasts) {
      const at = bars[blast.ball.bar];
      spot.x = at.x + blast.ball.x;
      spot.y = at.y + blast.ball.apexY;
      drawDetonation(ctx, spot, ms - blast.at, blast.size, now);
    }
    for (const pays of state.pays)
      drawPays(
        ctx,
        r,
        pays.label,
        bars[pays.bar],
        ms - pays.at,
        pays.font,
        PAYS_MS,
      );
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});

// the ball's middle's height from its bar's at ms: rising fast, easing into
// the top of its toss and holding there till it's cut
function ballY(ball: Ball, ms: number): number {
  const p = clamp01((ms - ball.tossAt) / (ball.apexAt - ball.tossAt));
  return ball.launchY + (ball.apexY - ball.launchY) * (1 - (1 - p) * (1 - p));
}
