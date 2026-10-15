// Handoff, a floor crit: momentum handed on like a Newton's cradle. A still
// wisp waits by every bar's readout; the number trembles into a wisp that
// shoots onto the top bar's and smacks into it head on (a flash, a bang, a
// jolt): the first stops dead and the struck one shoots off to the next bar
// down, quicker and harder each time. The last one rebounds off the bottom
// and rips back up the chain, knocking every spent wisp along into one
// swelling ball that dives into its own bar in the biggest blast
import { COLOR } from "../../../../palette";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawGlow } from "../../../../shared/glowSprite";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  drawWisp,
  drawWispTrail,
  WISP_SIZE,
  WISP_TRAIL_MS,
} from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  byHeight,
  clamp01,
  drawText,
  glowStops,
  lerp,
} from "../../critPlayer";
import { groundY } from "../../critPlayer/shared";

// the number trembling and shrinking into the first wisp
const IN_MS = 180;
const TREMBLE = 12;
const SHRINK = 0.3;
// the waiting wisps popping in, hovering HOVER over each readout (READ in
// from the bar's right end)
const POP_MS = 150;
const READ = 120;
const HOVER = 70;
// at most this many bars handed on, each leg quicker; a leg leaves at EASE
// of its average speed and speeds up, bowed out BOW of its length
const MAX_CHAIN = 8;
const LEG_MS: [number, number] = [190, 75];
const EASE = 0.7;
const BOW = 0.12;
const CONTACT = WISP_SIZE * 0.9;
// a waiting wisp quivering and heating as the hit closes in
const ANTICIPATE_MS = 110;
const QUIVER = 7;
const OWN_QUIVER = 16;
// the rebound: a drop BELOW the lowest bar, then ripping up a bar every
// RIP_MS, every spent wisp swirling out ORBIT and into the ball over
// MERGE_MS, then the dive onto its own bar, arcing DIVE_LIFT over
const DROP_MS = 70;
const BELOW = 170;
const RIP_MS = 55;
const ORBIT = 70;
const MERGE_MS = 180;
const DIVE_MS = 170;
const DIVE_LIFT = 160;
// sizes: a wisp grows SIZE_STEP a handoff; the ball BALL, BALL_GROW a merge
const SIZE_STEP = 0.08;
const BALL = 1.3;
const BALL_GROW = 0.22;
const BALL_GLOW = 80;
const BALL_GLOW_GROW = 14;
const SPENT_ALPHA = 0.55;
// a collision's flash and blast, bigger down the chain
const FLASH_MS = 140;
const FLASH_R: [number, number] = [140, 260];
const HIT_BLAST: [number, number] = [90, 200];
const KNOCK_FLASH = 150;
const BOUNCE_BLAST = 120;
const BOUNCE_SHAKE = 0.9;
const BOOM = 440;
const BOOM_FLASH = 420;
const CLUSTER = [-0.6, 0.6, -0.3, 0.3];
const CLUSTER_MS = 45;
const CLUSTER_BLAST = 160;
const KICKED_BOUNCE = 1;
const KICKED_BOOM = 1e6;
// shakes by step: a knock, the slam, then the handoffs (2 + k) rising
const KNOCK_SHAKE = 0.5;
const SLAM_SHAKE = 3.2;
const HANDOFF_SHAKE: [number, number] = [0.5, 1.6];
const HANDOFF_STEP = 2;
const TAIL_MS = 1000;

const WHITE = glowStops(COLOR.white);
const ORIGIN: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

interface Handoff {
  // the bars handed on, top to bottom (not its own)
  chain: number[];
  n: number;
  // mover k reaching its contact by chain[k]'s waiting wisp, the drop's
  // bounce, the ball passing contact k, the dive and the slam
  hitAt: number[];
  bounceAt: number;
  pickAt: number[];
  diveAt: number;
  boomAt: number;
  // this frame: the waiting spots (its own last), the contacts, the bounce
  w: Point[];
  c: Point[];
  b: Point;
  // mover k's spot (the ball is mover n), its own wisp's, the ball's for
  // the swirl
  outs: Point[];
  ownOut: Point;
  ballOut: Point;
  movers: ((ms: number) => Point | null)[];
  own: (ms: number) => Point | null;
}
const handoffs = new WeakMap<Running, Handoff>();

// the spots, from the bars as drawn this frame
function place(s: Handoff, r: Running, bars: Point[]): void {
  const reach = r.play.barHalfWidth - READ;
  for (let k = 0; k <= s.n; k++) {
    const bar = bars[k < s.n ? s.chain[k] : 0];
    s.w[k].x = bar.x + reach;
    s.w[k].y = bar.y - HOVER;
  }
  for (let k = 0; k < s.n; k++) {
    const from = k ? s.w[k - 1] : ORIGIN;
    const dx = s.w[k].x - from.x;
    const dy = s.w[k].y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    s.c[k].x = s.w[k].x - (dx / length) * CONTACT;
    s.c[k].y = s.w[k].y - (dy / length) * CONTACT;
  }
  if (s.n) {
    s.b.x = s.w[s.n - 1].x;
    s.b.y = Math.max(groundY(r, bars, BELOW), s.w[s.n - 1].y + HOVER);
  }
}

// a still wisp at `at`, quivering harder as `until` closes in
function quiver(
  at: Point,
  until: number,
  ms: number,
  amp: number,
  seed: number,
  out: Point,
): Point {
  const a = clamp01(1 - (until - ms) / ANTICIPATE_MS);
  const q = amp * a * a;
  out.x = at.x + Math.sin(ms * 0.9 + seed * 7) * q;
  out.y = at.y + Math.cos(ms * 1.1 + seed * 3) * q;
  return out;
}

// a leg from a onto b at u 0..1: leaving at speed, speeding up, bowed out
function leg(a: Point, b: Point, u: number, bow: number, out: Point): Point {
  const g = u * (EASE + (1 - EASE) * u);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const side = bow * 4 * g * (1 - g);
  out.x = a.x + dx * g - dy * side;
  out.y = a.y + dy * g + dx * side;
  return out;
}

// the last struck wisp: waiting, shot onto the bounce, ripping back up the
// chain, diving into its own bar's wisp
function ballAt(s: Handoff, ms: number, out: Point): Point | null {
  const n = s.n;
  if (ms >= s.boomAt) return null;
  if (ms >= s.diveAt) {
    const u = (ms - s.diveAt) / DIVE_MS;
    const g = 0.5 * u + 0.5 * u * u;
    const from = n ? s.c[0] : ORIGIN;
    const to = s.w[n];
    out.x = lerp(from.x, to.x, g);
    out.y = lerp(from.y, to.y, g) - 4 * g * (1 - g) * DIVE_LIFT;
    return out;
  }
  if (!n) return null;
  if (ms >= s.bounceAt) {
    const t = ms - s.bounceAt;
    const j = Math.min(n - 1, Math.floor(t / RIP_MS));
    const from = j ? s.c[n - j] : s.b;
    const to = s.c[n - 1 - j];
    const u = clamp01((t - j * RIP_MS) / RIP_MS);
    out.x = lerp(from.x, to.x, u);
    out.y = lerp(from.y, to.y, u);
    return out;
  }
  const struck = s.hitAt[n - 1];
  if (ms >= struck)
    return leg(s.w[n - 1], s.b, (ms - struck) / (s.bounceAt - struck), 0, out);
  return quiver(s.w[n - 1], struck, ms, QUIVER, n, out);
}

// mover k < n: waiting by chain[k - 1] (the number, for 0), struck onto
// chain[k]'s wisp, spent there, then knocked along into the ball
function moverAt(s: Handoff, k: number, ms: number): Point | null {
  const out = s.outs[k];
  if (k === s.n) return ballAt(s, ms, out);
  const start = k ? s.hitAt[k - 1] : IN_MS;
  if (ms < start)
    return k ? quiver(s.w[k - 1], start, ms, QUIVER, k, out) : null;
  const hit = s.hitAt[k];
  if (ms < hit) {
    const from = k ? s.w[k - 1] : ORIGIN;
    const bow = k % 2 ? BOW : -BOW;
    return leg(from, s.c[k], (ms - start) / (hit - start), bow, out);
  }
  if (ms < s.pickAt[k]) {
    out.x = s.c[k].x;
    out.y = s.c[k].y;
    return out;
  }
  const f = (ms - s.pickAt[k]) / MERGE_MS;
  if (f >= 1) return null;
  const ball = ballAt(s, ms, s.ballOut);
  if (!ball) return null;
  const angle = k * 2.4 + ms * 0.035;
  const reach = ORBIT * Math.sin(Math.PI * f);
  out.x = ball.x + Math.cos(angle) * reach;
  out.y = ball.y + Math.sin(angle) * reach;
  return out;
}

function planHandoff(r: Running, bars: Point[]): Handoff {
  const chain = byHeight(bars)
    .filter((bar) => bar !== 0)
    .slice(0, MAX_CHAIN);
  const n = chain.length;
  const hitAt: number[] = [];
  let t = IN_MS;
  for (let k = 0; k < n; k++) {
    t += lerp(LEG_MS[0], LEG_MS[1], n > 1 ? k / (n - 1) : 0);
    hitAt.push(t);
  }
  const bounceAt = n ? t + DROP_MS : IN_MS;
  const pickAt: number[] = [];
  for (let k = 0; k < n; k++) pickAt.push(bounceAt + (n - k) * RIP_MS);
  const diveAt = bounceAt + n * RIP_MS;
  const point = (): Point => ({ x: 0, y: 0 });
  const s: Handoff = {
    chain,
    n,
    hitAt,
    bounceAt,
    pickAt,
    diveAt,
    boomAt: diveAt + DIVE_MS,
    w: Array.from({ length: n + 1 }, point),
    c: Array.from({ length: n }, point),
    b: point(),
    outs: Array.from({ length: n + 1 }, point),
    ownOut: point(),
    ballOut: point(),
    movers: [],
    own: () => null,
  };
  for (let k = 0; k <= n; k++) s.movers.push((ms) => moverAt(s, k, ms));
  s.own = (ms) =>
    ms >= s.boomAt
      ? null
      : quiver(s.w[n], s.boomAt, ms, OWN_QUIVER, 99, s.ownOut);
  place(s, r, bars);
  return s;
}

// a wisp on stage from `from` to `to`, its trail fading after
function drawSpan(
  ctx: CanvasRenderingContext2D,
  at: (ms: number) => Point | null,
  ms: number,
  now: number,
  size: number,
  heat: number,
  alpha: number,
  from: number,
  to: number,
): void {
  if (ms < from || ms > to + WISP_TRAIL_MS) return;
  if (ms > to) drawWispTrail(ctx, at, ms, now, size);
  else drawWisp(ctx, at, ms, now, size, heat, alpha);
}

registerFloorCrit("handoffCrit", {
  // each bar is struck once and knocked once
  levels: (count) => Math.ceil(count / 2),
  plan(r, bars, hit) {
    const s = planHandoff(r, bars);
    handoffs.set(r, s);
    for (let k = 0; k < s.n; k++) {
      hit(s.chain[k], s.hitAt[k], HANDOFF_STEP + k);
      hit(s.chain[k], s.pickAt[k], 0);
    }
    hit(0, s.boomAt, 1);
    for (let k = 0; k < CLUSTER.length; k++)
      hit(0, s.boomAt + (k + 1) * CLUSTER_MS, 0);
  },
  draw(ctx, r, ms, bars) {
    const s = handoffs.get(r);
    if (!s) return;
    place(s, r, bars);
    const now = r.startedAt + ms;
    const n = s.n;
    const pop = clamp01(ms / POP_MS);

    // the number trembling harder as it shrinks into the first wisp
    if (ms < IN_MS) {
      const p = ms / IN_MS;
      const shiver = TREMBLE * p;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        Math.sin(ms * 0.11) * shiver,
        Math.cos(ms * 0.13) * shiver,
        r.flashFont * lerp(1, SHRINK, p * p),
        { alpha: 1 - clamp01((p - 0.7) / 0.3) },
      );
    }
    if (n && ms >= s.bounceAt && r.kicked < KICKED_BOUNCE) {
      r.kicked = KICKED_BOUNCE;
      r.shake(BOUNCE_SHAKE);
      playSwoosh();
    }
    if (ms >= s.boomAt && r.kicked < KICKED_BOOM) {
      r.kicked = KICKED_BOOM;
      playExplosion();
    }

    // flashes: each collision, the bounce, the slam; the ball's swelling glow
    let merged = 0;
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    for (let k = 0; k < n; k++) {
      if (ms >= s.pickAt[k] + MERGE_MS) merged++;
      const knocked = ms - s.pickAt[k];
      if (knocked >= 0 && knocked < FLASH_MS) {
        ctx.globalAlpha = 1 - knocked / FLASH_MS;
        drawGlow(ctx, WHITE, s.c[k].x, s.c[k].y, KNOCK_FLASH);
      }
      const age = ms - s.hitAt[k];
      if (age < 0 || age >= FLASH_MS) continue;
      ctx.globalAlpha = 1 - age / FLASH_MS;
      const q = n > 1 ? k / (n - 1) : 0;
      drawGlow(ctx, WHITE, s.c[k].x, s.c[k].y, lerp(FLASH_R[0], FLASH_R[1], q));
    }
    const boomAge = ms - s.boomAt;
    if (boomAge >= 0 && boomAge < FLASH_MS * 2) {
      ctx.globalAlpha = 1 - boomAge / (FLASH_MS * 2);
      drawGlow(ctx, WHITE, s.w[n].x, s.w[n].y, BOOM_FLASH);
    }
    ctx.globalAlpha = 1;
    const ball = ms >= s.bounceAt ? ballAt(s, ms, s.ballOut) : null;
    if (ball)
      stampGlimmer(
        ctx,
        ball.x,
        ball.y,
        BALL_GLOW + BALL_GLOW_GROW * merged,
        ms * 0.004,
        COLOR.heavenlyGold,
      );
    ctx.globalCompositeOperation = previous;

    // its own bar's wisp, quivering harder as the ball dives in
    drawSpan(ctx, s.own, ms, now, WISP_SIZE * pop, 0.4, 1, 0, s.boomAt);
    // the movers: waiting, struck, spent (dim), swirled into the ball
    for (let k = 0; k < n; k++) {
      const start = k ? s.hitAt[k - 1] : IN_MS;
      const moving = ms >= start && ms < s.hitAt[k];
      const spent = ms >= s.hitAt[k] && ms < s.pickAt[k];
      const wait = k ? clamp01(1 - (start - ms) / ANTICIPATE_MS) : 0;
      drawSpan(
        ctx,
        s.movers[k],
        ms,
        now,
        WISP_SIZE * (1 + SIZE_STEP * k) * (k ? pop : 1),
        moving ? 0.8 : wait,
        spent ? SPENT_ALPHA : 1,
        k ? 0 : IN_MS,
        Math.min(s.boomAt, s.pickAt[k] + MERGE_MS),
      );
    }
    // the ball: the last struck wisp, swelling with every wisp it takes
    const rolling = n === 0 || ms >= s.bounceAt;
    const struck = n ? s.hitAt[n - 1] : 0;
    drawSpan(
      ctx,
      s.movers[n],
      ms,
      now,
      rolling
        ? WISP_SIZE * (BALL + BALL_GROW * merged)
        : WISP_SIZE * (1 + SIZE_STEP * n) * pop,
      rolling
        ? Math.min(1, 0.5 + merged / 8)
        : ms >= struck
          ? 0.8
          : clamp01(1 - (struck - ms) / ANTICIPATE_MS),
      1,
      n ? 0 : IN_MS,
      s.boomAt,
    );

    // the blasts: collisions, the bounce, the slam's cluster
    for (let k = 0; k < n; k++) {
      const q = n > 1 ? k / (n - 1) : 0;
      drawDetonation(
        ctx,
        s.c[k],
        ms - s.hitAt[k],
        lerp(HIT_BLAST[0], HIT_BLAST[1], q),
        now,
      );
    }
    if (n) drawDetonation(ctx, s.b, ms - s.bounceAt, BOUNCE_BLAST, now);
    drawDetonation(ctx, s.w[n], boomAge, BOOM, now);
    const reach = r.play.barHalfWidth - READ;
    for (let k = 0; k < CLUSTER.length; k++) {
      spot.x = bars[0].x + CLUSTER[k] * reach;
      spot.y = bars[0].y;
      drawDetonation(
        ctx,
        spot,
        boomAge - (k + 1) * CLUSTER_MS,
        CLUSTER_BLAST,
        now,
      );
    }
  },
  tailMs: TAIL_MS,
  shake: (step) =>
    step === 1
      ? SLAM_SHAKE
      : step === 0
        ? KNOCK_SHAKE
        : lerp(
            HANDOFF_SHAKE[0],
            HANDOFF_SHAKE[1],
            clamp01((step - HANDOFF_STEP) / (MAX_CHAIN - 1)),
          ),
});
