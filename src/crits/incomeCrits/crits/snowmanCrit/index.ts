// Snowman, an income crit: the green amount drops under the total as a small
// glowing snowball that rolls back and forth in quickening passes, gold
// glitter sticking on as it goes, a jolt and a share of the amount spat up
// onto the readout at each end, growing big; a second, smaller ball rolls up
// the same way and is flung on top, then a third for the head: three thuds,
// each a squash, a flash and a jolt, and two coal eyes blink on. The snowman
// trembles and glows, rumbling harder, then bursts in a blizzard of gold
// that slams the readout: the last share, the big blast and hardest shake
import { COLOR } from "../../../../palette";
import { easeIn } from "../../../../shared/easing";
import { trembleAt } from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import {
  drawSnowball,
  planSnowball,
  rollAt,
  snowballRadius,
  type RollPass,
  type Snowball,
} from "../../../../shared/animationStyles/snowball";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  clamp01,
  lerp,
  drawText,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawNumberShrink, readoutSpot } from "../shared";

// the snowman stands LANE px under the total; the balls roll between walls
// WALL_IN px in from the screen's sides
const LANE = 560;
const WALL_IN = 90;
const DROP_MS = 150;
// each ball: its waypoints (x: -1/1 a wall, else px off the total's x;
// y: px off the lane), its passes' times (quickening), when it starts, its
// radius before any glitter and how many specks lie along each pass
const BALLS = [
  {
    way: [
      [-1, -150],
      [1, -100],
      [-1, -50],
      [1, -25],
      [0, 0],
    ],
    passMs: [320, 250, 190, 140],
    start: DROP_MS,
    base: 28,
    specks: 15,
  },
  {
    way: [
      [1, 100],
      [-1, 70],
      [-230, 40],
    ],
    passMs: [190, 130],
    start: 880,
    base: 22,
    specks: 12,
  },
  {
    way: [
      [1, 100],
      [230, 50],
    ],
    passMs: [150],
    start: 1170,
    base: 18,
    specks: 10,
  },
] as const;
const GROW = 9.5;
const REACH = 30;
const JITTER = 36;
const SPECK = 20;
// the glitter fades in SHOW_MS before its ball rolls out
const SHOW_MS = 200;
const POP_MS = 90;
// the upper balls flung FLING_MS onto their seats, hopping HOP px; the stack
// sinks OVERLAP of two radii into itself
const FLING_MS = [0, 120, 110];
const HOP = 170;
const OVERLAP = 0.86;
// a thud squashes the stack by SQUASH, rebounding, over THUD_MS; a flash at
// the contact over FLASH_MS
const THUD_MS = 260;
const SQUASH = 0.3;
const FLASH_MS = 170;
const THUD_FLASH = 170;
// the eyes blink on EYES_MS after the head lands, then blink once
const EYES_MS = 40;
const EYE_R = 0.13;
const EYE_X = 0.34;
const EYE_Y = -0.14;
// the charge: trembling up to TREMBLE px, swelling SWELL, rumbling quicker
const CHARGE_MS = 1460;
const BURST_MS = 1790;
const TREMBLE = 12;
const SWELL = 0.12;
const RUMBLE_MS: [number, number] = [85, 30];
const RUMBLE: [number, number] = [0.3, 1.2];
// the shares spat up from each pass's end onto the readout
const SPIT_MS = 140;
const SPIT_BOW = 110;
const SPIT_FONT: [number, number] = [0.45, 0.3];
const SPIT_FLASH = 120;
// the blizzard: FLAKES of gold flung off the snowman onto the readout over
// FLY_MS, STAGGER_MS apart overall, bowed out FLING_OUT and up LIFT px
const FLAKES = 130;
const FLY_MS = 170;
const STAGGER_MS = 60;
const FLING_OUT = 1.8;
const LIFT = 160;
const TAIL = 0.14;
const FLAKE = 26;
const FINAL_MS = BURST_MS + FLY_MS + STAGGER_MS / 2;
const BURST_BLAST = 300;
const BURST_FLASH = 360;
const FINALE_BLAST = 480;
const FINALE_FLASH = 420;
const PASS_SHAKE: [number, number] = [0.4, 0.9];
const THUD_SHAKE = [1.1, 1.3, 1.5];
// shakes by step: a share, the finale
const SHAKES = [0.5, 3];

const GOLD = fadeStops(COLOR.heavenlyGold);
const GREEN = fadeStops(COLOR.moneyGreen);
const WHITE = fadeStops(COLOR.white, 0.2);
const BODY = [
  [0, "#ffffff"],
  [0.72, "#eef4ff"],
  [0.87, "#cfe0ff"],
  [1, "#cfe0ff00"],
] as const;
const COAL = "#15141c";

interface Ball {
  snow: Snowball;
  start: number;
  rollEnd: number;
  land: number;
  base: number;
  size: number;
  from: Point;
  seat: Point;
  path: (ms: number) => Point | null;
}
interface State {
  balls: Ball[];
  ground: number;
  ends: Float32Array;
  spitFrom: Point[];
  spitTo: Point[];
  spitAt: Float32Array;
  fx: Float32Array;
  fy: Float32Array;
  bx: Float32Array;
  by: Float32Array;
  tx: Float32Array;
  ty: Float32Array;
  jolts: number;
  thuds: number;
  nextRumble: number;
}
const states = new WeakMap<Running, State>();
const shiver: Point = { x: 0, y: 0 };
const at: Point = { x: 0, y: 0 };
const hit: Point = { x: 0, y: 0 };
const TEXT = { alpha: 1 };
// the stack's centres this frame
const ys = new Float32Array(3);
const rs = new Float32Array(3);

// the ball k along its passes, then flung onto its seat
function planBall(k: number, r: Running, to: Point, seat: Point): Ball {
  const def = BALLS[k];
  const wall = r.viewportWidth / 2 - WALL_IN;
  const ground = to.y + LANE;
  const way: Point[] = def.way.map(([x, y]) => ({
    x: Math.abs(x) === 1 ? x * wall : to.x + x,
    y: ground + y,
  }));
  const passes: RollPass[] = [];
  const specks: Point[] = [];
  let t: number = def.start;
  for (let p = 0; p < def.passMs.length; p++) {
    const a = way[p];
    const b = way[p + 1];
    passes.push({ from: a, to: b, startMs: t, endMs: t + def.passMs[p] });
    t += def.passMs[p];
    for (let i = 0; i < def.specks; i++) {
      const u = lerp(0.1, 0.92, holeHash(i + p * 40, 9400 + k));
      specks.push({
        x: lerp(a.x, b.x, u),
        y: lerp(a.y, b.y, u) + (holeHash(i + p * 40, 9410 + k) - 0.5) * JITTER,
      });
    }
  }
  const snow = planSnowball(passes, specks, REACH);
  const rollEnd = t;
  const land = rollEnd + FLING_MS[k];
  const from = way[way.length - 1];
  const roll: Point = { x: 0, y: 0 };
  const start = k === 0 ? 0 : def.start;
  return {
    snow,
    start: def.start,
    rollEnd,
    land,
    base: def.base,
    size: snowballRadius(snow, rollEnd, def.base, GROW),
    from,
    seat,
    path: (ms) => {
      if (ms < start || ms > land) return null;
      if (ms < DROP_MS && k === 0) {
        const p = easeIn(ms / DROP_MS);
        roll.x = lerp(0, way[0].x, p);
        roll.y = lerp(0, way[0].y, p);
        return roll;
      }
      if (ms <= rollEnd) return rollAt(snow, ms, roll);
      const u = (ms - rollEnd) / FLING_MS[k];
      roll.x = lerp(from.x, seat.x, u);
      roll.y = lerp(from.y, seat.y, u) - HOP * Math.sin(Math.PI * u);
      return roll;
    },
  };
}

registerFloorCrit("snowmanCrit", {
  plan(r, bars, hitAt) {
    const to = bars[0];
    const ground = to.y + LANE;
    const seats: Point[] = [
      { x: to.x, y: ground },
      { x: to.x, y: 0 },
      { x: to.x, y: 0 },
    ];
    const balls: Ball[] = [];
    for (let k = 0; k < BALLS.length; k++) {
      const ball = planBall(k, r, to, seats[k]);
      if (k > 0)
        seats[k].y =
          seats[k - 1].y - (balls[k - 1].size + ball.size) * OVERLAP;
      balls.push(ball);
    }
    const ends: number[] = [];
    const spitFrom: Point[] = [];
    const spitTo: Point[] = [];
    for (const ball of balls)
      for (const p of ball.snow.passes) {
        ends.push(p.endMs);
        spitFrom.push(p.to);
        spitTo.push(readoutSpot(to, spitTo.length, 9420));
        hitAt(0, p.endMs + SPIT_MS, 0);
      }
    hitAt(0, FINAL_MS, 1);
    // the blizzard's flakes: off the stack, bowed out and up, onto the readout
    const fx = new Float32Array(FLAKES);
    const fy = new Float32Array(FLAKES);
    const bx = new Float32Array(FLAKES);
    const by = new Float32Array(FLAKES);
    const tx = new Float32Array(FLAKES);
    const ty = new Float32Array(FLAKES);
    for (let i = 0; i < FLAKES; i++) {
      const k = i % 3;
      const a = holeHash(i, 9430) * Math.PI * 2;
      const d = balls[k].size * Math.sqrt(holeHash(i, 9431));
      fx[i] = seats[k].x + Math.cos(a) * d;
      fy[i] = seats[k].y + Math.sin(a) * d;
      bx[i] = to.x + (fx[i] - to.x) * FLING_OUT;
      by[i] = fy[i] - LIFT;
      const spot = readoutSpot(to, i, 9432);
      tx[i] = spot.x;
      ty[i] = spot.y;
    }
    states.set(r, {
      balls,
      ground: ground + balls[0].size,
      ends: Float32Array.from(ends),
      spitFrom,
      spitTo,
      spitAt: Float32Array.from(ends),
      fx,
      fy,
      bx,
      by,
      tx,
      ty,
      jolts: 0,
      thuds: 0,
      nextRumble: CHARGE_MS,
    });
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    const { balls } = s;
    drawNumberShrink(ctx, r, ms);
    const alpha = ctx.globalAlpha;
    const previous = ctx.globalCompositeOperation;

    // a jolt at each pass's end, a thud as each ball lands, a rising rumble
    while (s.jolts < s.ends.length && ms >= s.ends[s.jolts]) {
      r.shake(lerp(...PASS_SHAKE, s.jolts / (s.ends.length - 1)));
      s.jolts++;
    }
    while (s.thuds < balls.length && ms >= balls[s.thuds].land) {
      r.shake(THUD_SHAKE[s.thuds]);
      s.thuds++;
    }
    const c = clamp01((ms - CHARGE_MS) / (BURST_MS - CHARGE_MS));
    if (ms >= s.nextRumble && ms < BURST_MS) {
      r.shake(lerp(...RUMBLE, c));
      s.nextRumble = ms + lerp(...RUMBLE_MS, c);
    }

    if (ms < BURST_MS) {
      // the stack squashing on the latest thud and rebounding
      let d = 0;
      if (s.thuds > 0) {
        const since = ms - balls[s.thuds - 1].land;
        if (since < THUD_MS)
          d = Math.cos(since * 0.03) * (1 - since / THUD_MS) ** 2;
      }
      const sy = 1 - SQUASH * d;
      const sx = 1 + SQUASH * 0.8 * d;
      const swell = 1 + SWELL * c;
      trembleAt(c, ms, TREMBLE, shiver);
      for (let k = 0; k < balls.length; k++) {
        rs[k] = balls[k].size * swell;
        ys[k] =
          k === 0
            ? s.ground - rs[0] * sy
            : ys[k - 1] - (rs[k - 1] + rs[k]) * OVERLAP * sy;
      }

      for (let k = 0; k < balls.length; k++) {
        const b = balls[k];
        if (ms < b.start - SHOW_MS) continue;
        const landed = ms >= b.land;
        let radius: number;
        if (landed) {
          at.x = b.seat.x + shiver.x;
          at.y = ys[k] + shiver.y;
          radius = rs[k];
        } else {
          const p = b.path(ms);
          at.x = p ? p.x : b.snow.passes[0].from.x;
          at.y = p ? p.y : b.snow.passes[0].from.y;
          radius =
            snowballRadius(b.snow, Math.min(ms, b.rollEnd), b.base, GROW) *
            clamp01((ms - b.start) / POP_MS);
        }
        const rx = landed ? radius * sx : radius;
        const squash = landed ? sy / sx : 1;
        if (radius > 0) {
          // the gold halo, the white ball, and a white-hot glow as it charges
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = alpha * (0.4 + 0.6 * c);
          drawGlow(ctx, GOLD, at.x, at.y, rx * (1.9 + 0.9 * c), squash);
          ctx.globalCompositeOperation = previous;
          ctx.globalAlpha = alpha;
          drawGlow(ctx, BODY, at.x, at.y, rx * 1.12, squash);
          if (c > 0) {
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha =
              alpha * c * (0.6 + 0.4 * Math.sin(now * (0.02 + 0.05 * c)));
            drawGlow(ctx, WHITE, at.x, at.y, rx * 1.35, squash);
            ctx.globalCompositeOperation = previous;
          }
        }
        // its glitter: lying ahead (fading in), or stuck on and turning
        ctx.globalAlpha = alpha * clamp01((ms - b.start + SHOW_MS) / SHOW_MS);
        drawSnowball(ctx, b.snow, ms, at, Math.max(1, radius), SPECK);
        ctx.globalAlpha = alpha;
      }

      // two coal eyes blinking on, then once more
      const head = balls[balls.length - 1];
      const e = ms - head.land - EYES_MS;
      if (e >= 0) {
        const open =
          e < 60 ? e / 60 : e >= 200 && e < 260 ? Math.abs(1 - (e - 200) / 30) : 1;
        const hr = rs[balls.length - 1];
        const hx = head.seat.x + shiver.x;
        const hy = ys[balls.length - 1] + shiver.y + hr * EYE_Y * sy;
        const er = Math.max(0, hr * EYE_R);
        const eh = Math.max(0, er * open * sy);
        ctx.fillStyle = COAL;
        ctx.beginPath();
        ctx.ellipse(hx - hr * EYE_X, hy, er, eh, 0, 0, Math.PI * 2);
        ctx.moveTo(hx + hr * EYE_X + er, hy);
        ctx.ellipse(hx + hr * EYE_X, hy, er, eh, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // the balls' glowing cores while they roll and fly
    for (let k = 0; k < balls.length; k++) {
      const b = balls[k];
      drawWispBetween(
        ctx,
        b.path,
        ms,
        now,
        WISP_SIZE * (k === 0 ? 1.1 : 0.9),
        0.6,
        k === 0 ? 0 : b.start,
        b.land,
      );
    }

    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    // each thud's flash where the ball lands
    for (let k = 0; k < balls.length; k++) {
      const since = ms - balls[k].land;
      if (since < 0 || since >= FLASH_MS || ms >= BURST_MS) continue;
      const f = 1 - since / FLASH_MS;
      const y = k === 0 ? s.ground : balls[k].seat.y + balls[k].size;
      ctx.globalAlpha = alpha * f;
      drawGlow(ctx, GOLD, balls[k].seat.x, y, THUD_FLASH * (1.6 - 0.6 * f), 0.5);
      drawGlow(ctx, WHITE, balls[k].seat.x, y, THUD_FLASH * 0.6 * f);
    }
    // each share landing on the readout in a green flash
    for (let k = 0; k < s.spitAt.length; k++) {
      const since = ms - s.spitAt[k] - SPIT_MS;
      if (since < 0 || since >= FLASH_MS) continue;
      const f = 1 - since / FLASH_MS;
      const spot = s.spitTo[k];
      ctx.globalAlpha = alpha * f;
      drawGlow(ctx, GREEN, spot.x, spot.y, SPIT_FLASH * (1.4 - 0.4 * f), 0.5);
      drawGlow(ctx, WHITE, spot.x, spot.y, SPIT_FLASH * 0.35 * f);
    }
    // the burst: a white flash off the snowman, green over the readout
    const sinceBurst = ms - BURST_MS;
    if (sinceBurst >= 0 && sinceBurst < FLASH_MS * 2) {
      const f = 1 - sinceBurst / (FLASH_MS * 2);
      const mid = balls[1].seat;
      ctx.globalAlpha = alpha * f;
      drawGlow(ctx, WHITE, mid.x, mid.y, BURST_FLASH * (1.2 - 0.4 * f));
      drawGlow(ctx, GOLD, mid.x, mid.y, BURST_FLASH * (1.8 - 0.6 * f));
    }
    const sinceFinal = ms - FINAL_MS;
    if (sinceFinal >= 0 && sinceFinal < FLASH_MS * 2) {
      const f = 1 - sinceFinal / (FLASH_MS * 2);
      ctx.globalAlpha = alpha * f;
      drawGlow(ctx, GREEN, to.x, to.y, FINALE_FLASH * (1.4 - 0.4 * f), 0.45);
      drawGlow(ctx, WHITE, to.x, to.y, FINALE_FLASH * 0.4 * f, 0.6);
    }
    endLightBatch(ctx);
    ctx.globalAlpha = alpha;

    // the blizzard of gold flung onto the readout: streaks, then their heads
    if (sinceBurst >= 0 && sinceBurst < FLY_MS + STAGGER_MS) {
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let i = 0; i < FLAKES; i++) {
        const u = (sinceBurst - (i / FLAKES) * STAGGER_MS) / FLY_MS;
        if (u <= 0 || u >= 1) continue;
        const e = u ** 1.4;
        flakeAt(s, i, Math.max(0, e - TAIL));
        ctx.moveTo(hit.x, hit.y);
        flakeAt(s, i, e);
        ctx.lineTo(hit.x, hit.y);
      }
      ctx.globalAlpha = alpha * 0.8;
      ctx.strokeStyle = COLOR.heavenlyGold;
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = COLOR.white;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      beginLightBatch(ctx);
      for (let i = 0; i < FLAKES; i++) {
        const u = (sinceBurst - (i / FLAKES) * STAGGER_MS) / FLY_MS;
        if (u <= 0 || u >= 1) continue;
        flakeAt(s, i, u ** 1.4);
        stampGlimmer(
          ctx,
          hit.x,
          hit.y,
          FLAKE,
          i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
    }
    ctx.globalCompositeOperation = previous;

    // the shares in flight, each one solid arch up onto the readout
    for (let k = 0; k < s.spitAt.length; k++) {
      const since = ms - s.spitAt[k];
      if (since < 0) break;
      if (since >= SPIT_MS) continue;
      const a = s.spitFrom[k];
      const b = s.spitTo[k];
      const t = easeIn(since / SPIT_MS);
      const mx = (a.x + b.x) / 2 + (a.x < b.x ? -SPIT_BOW : SPIT_BOW);
      const my = (a.y + b.y) / 2;
      const v = 1 - t;
      TEXT.alpha = Math.min(1, since / 30);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        v * v * a.x + 2 * v * t * mx + t * t * b.x,
        v * v * a.y + 2 * v * t * my + t * t * b.y,
        r.flashFont * lerp(SPIT_FONT[0], SPIT_FONT[1], t),
        TEXT,
      );
    }

    drawDetonation(ctx, balls[1].seat, sinceBurst, BURST_BLAST, now);
    drawDetonation(ctx, to, sinceFinal, FINALE_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});

// flake i at e (0..1) of its bowed way onto the readout, into `hit`
function flakeAt(s: State, i: number, e: number): void {
  const v = 1 - e;
  hit.x = v * v * s.fx[i] + 2 * v * e * s.bx[i] + e * e * s.tx[i];
  hit.y = v * v * s.fy[i] + 2 * v * e * s.by[i] + e * e * s.ty[i];
}
