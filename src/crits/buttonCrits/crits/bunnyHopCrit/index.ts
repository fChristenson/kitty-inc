// Bunny Hop, a button crit: the number drops as a ball of light onto the top
// button's top edge and hops down the column like a staircase, squashing
// flat on every button's top (a pop, a jolt, the button turning over), each
// hop quicker and lower; past the last it hits the ground under the
// building, squashes flat trembling, and rebounds in one huge swelling leap
// back up, slamming down onto its own button in the biggest blast: each of
// their next taps also levels the floor with the most workers
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import { isFloorMaxed, type Floor } from "../../../../gameState";
import {
  drawBounceSplash,
  hops,
  type Bounce,
  type BouncePath,
} from "../../../../shared/animationStyles/bounce";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import {
  drawChargeGlow,
  trembleAt,
} from "../../../../shared/animationStyles/charge";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { COLOR } from "../../../../palette";
import { BTN_H, BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  byHeight,
  clamp01,
  drawText,
  lerp,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { groundY } from "../../../floorCrits/critPlayer/shared";

// the number shrinking into the ball as it drops
const IN_MS = 130;
// the drop and the hops down the stairs to the ground, quickening and lower
const HOP_MS: [number, number] = [240, 110];
const HOP_LIFT: [number, number] = [160, 70];
// it lands from STAIR_X of a button's width right of its middle on the top
// one to as far left on the last
const STAIR_X = 0.3;
// the ground GROUND_BELOW under the lowest button, GROUND_X left of the last
// landing; squashed flat there HOLD_MS before the leap
const GROUND_BELOW = BTN_H * 1.7;
const GROUND_X = BTN_W * 0.45;
const HOLD_MS = 150;
// the leap: LEAP_MS, peaking LEAP_OVER px over its own button
const LEAP_MS = 440;
const LEAP_OVER = 240;
const RUMBLE_MS = 50;
const RUMBLE_SHAKE: [number, number] = [0.3, 1.3];
// the ball, its body BODY of it across, swelling LEAP_GROW times over the
// leap; squashed to SQUASH within SQUASH_MS of a contact, to HOLD_SQUASH on
// the ground, stretched up to STRETCH at FAST px per ms
const BALL = WISP_SIZE * 1.2;
const BODY = 0.9;
const RADIUS = BALL * BODY;
const LEAP_GROW = 2;
const SQUASH = 0.45;
const SQUASH_MS = 45;
const HOLD_SQUASH: [number, number] = [0.55, 0.3];
const STRETCH = 0.35;
const FAST = 2.4;
const TREMBLE = 12;
const CHARGE_GLOW = 240;
const SWELL = 280;
const SPLASH = 110;
const BLAST = 140;
const GROUND_SPLASH = 240;
const GROUND_BLAST = 120;
const OWN_SPLASH = 320;
const OWN_BLAST = 400;
// shakes by step: the ground, a button, its own
const SHAKES = [1, 1.2, 3.4];

// contact kinds
const STAIR = 0;
const GROUND = 1;
const OWN = 2;

interface State {
  // the own button where it was planned, to carry everything along a scroll
  home: Point;
  steps: BouncePath;
  leap: BouncePath;
  groundMs: number;
  // every contact on its surface, and its kind
  contacts: Bounce[];
  kinds: Uint8Array;
  rumbles: Float32Array;
}
const states = new WeakMap<Running, State>();
let current: State | null = null;
const ORIGIN: Point = { x: 0, y: 0 };
const UP = -Math.PI / 2;
const shiver: Point = { x: 0, y: 0 };
const seat: Point = { x: 0, y: 0 };
const BODY_GOLD = fadeStops(COLOR.heavenlyGold, 0.3);
const BODY_CORE = fadeStops(COLOR.white, 0.45);
const SWELL_GLOW = fadeStops(COLOR.heavenlyGold);

// each tap also levelling the open, not maxed floor with the most workers
const hopTaps = defineTapPerk("Hop", (t) => {
  let most: Floor | null = null;
  for (const floor of t.floors)
    if (
      floor.unlocked &&
      !isFloorMaxed(floor) &&
      (!most || floor.workerCount > most.workerCount)
    )
      most = floor;
  if (most) t.levelUp(most, 1);
});

// the ball's middle at ms
function ballAt(ms: number): Point {
  const s = current!;
  return ms < s.leap.startMs ? s.steps.at(ms) : s.leap.at(ms);
}

registerFloorCrit("bunnyHopCrit", {
  reward(t) {
    hopTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const stairs = byHeight(bars).filter((bar) => bar !== 0);
    // ball middles, RADIUS over each surface
    const points: Point[] = [ORIGIN];
    const contacts: Bounce[] = [];
    const kinds: number[] = [];
    stairs.forEach((bar, k) => {
      const u = k / Math.max(1, stairs.length - 1);
      const x = bars[bar].x + BTN_W * lerp(STAIR_X, -STAIR_X, u);
      const top = bars[bar].y - BTN_H / 2;
      points.push({ x, y: top - RADIUS });
      contacts.push({ at: { x, y: top }, ms: 0, normal: UP });
      kinds.push(STAIR);
    });
    const last = points[points.length - 1];
    const floorY = groundY(r, bars, GROUND_BELOW);
    const ground: Point = {
      x: (stairs.length ? last.x : bars[0].x) - GROUND_X,
      y: floorY - RADIUS,
    };
    points.push(ground);
    contacts.push({ at: { x: ground.x, y: floorY }, ms: 0, normal: UP });
    kinds.push(GROUND);
    const steps = hops(points, HOP_MS, HOP_LIFT);
    const groundMs = steps.endMs;
    const ownTop = bars[0].y - BTN_H / 2;
    const own: Point = { x: bars[0].x, y: ownTop - RADIUS };
    const rise = Math.max(0, ground.y - own.y);
    const leap = hops(
      [ground, own],
      [LEAP_MS, LEAP_MS],
      [rise / 2 + LEAP_OVER, rise / 2 + LEAP_OVER],
      groundMs + HOLD_MS,
    );
    contacts.push({ at: { x: own.x, y: ownTop }, ms: leap.endMs, normal: UP });
    kinds.push(OWN);
    for (let k = 0; k < stairs.length; k++) {
      contacts[k].ms = steps.bounces[k].ms;
      hit(stairs[k], contacts[k].ms, 1);
    }
    contacts[stairs.length].ms = groundMs;
    hit(stairs.length ? stairs[stairs.length - 1] : 0, groundMs, 0);
    hit(0, leap.endMs, 2);
    const rumbles: number[] = [];
    for (let ms = groundMs + RUMBLE_MS; ms < leap.endMs; ms += RUMBLE_MS)
      rumbles.push(ms);
    states.set(r, {
      home: { x: bars[0].x, y: bars[0].y },
      steps,
      leap,
      groundMs,
      contacts,
      kinds: Uint8Array.from(kinds),
      rumbles: Float32Array.from(rumbles),
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    current = state;
    const now = r.startedAt + ms;
    const { leap, groundMs, contacts, kinds, rumbles } = state;
    if (ms < IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 - (0.7 * ms) / IN_MS),
        { alpha: 1 - ms / IN_MS },
      );
    // the rumble rising from the ground squash through the leap
    while (r.kicked < rumbles.length && ms >= rumbles[r.kicked]) {
      r.shake(
        lerp(
          RUMBLE_SHAKE[0],
          RUMBLE_SHAKE[1],
          r.kicked / Math.max(1, rumbles.length - 1),
        ),
      );
      r.kicked++;
    }
    ctx.save();
    ctx.translate(bars[0].x - state.home.x, bars[0].y - state.home.y);
    // a pop on every contact, a splash flattened along its surface
    let near = Infinity;
    for (let k = 0; k < contacts.length; k++) {
      const c = contacts[k];
      const since = ms - c.ms;
      const gap = since < 0 ? -since : since;
      if (kinds[k] !== GROUND && gap < near) near = gap;
      if (since < 0 || since >= DETONATION_MS) continue;
      const kind = kinds[k];
      drawBounceSplash(
        ctx,
        c,
        since,
        kind === OWN ? OWN_SPLASH : kind === GROUND ? GROUND_SPLASH : SPLASH,
        now,
      );
      drawDetonation(
        ctx,
        c.at,
        since,
        kind === OWN ? OWN_BLAST : kind === GROUND ? GROUND_BLAST : BLAST,
        now,
      );
    }
    const swell =
      ms >= leap.startMs && ms < leap.endMs
        ? clamp01((ms - leap.startMs) / (leap.endMs - leap.startMs)) ** 2
        : 0;
    const size = BALL * (1 + (LEAP_GROW - 1) * swell);
    drawWispBetween(ctx, ballAt, ms, now, size, swell, 0, leap.endMs);
    if (ms >= leap.endMs) {
      ctx.restore();
      return;
    }
    // the body: stretched flying fast, flattened on contact and on the ground
    const before = ballAt(ms - 10);
    const x0 = before.x;
    const y0 = before.y;
    const p = ballAt(ms);
    let squash: number;
    let radius = size * BODY;
    seat.x = p.x;
    seat.y = p.y + RADIUS;
    const hold = ms >= groundMs && ms < leap.startMs;
    if (hold) {
      const c = clamp01((ms - groundMs) / HOLD_MS);
      squash = lerp(HOLD_SQUASH[0], HOLD_SQUASH[1], c);
      radius *= 1 + 0.6 * (1 - squash);
      trembleAt(0.5 + 0.5 * c, ms, TREMBLE, shiver);
      seat.x += shiver.x;
      drawChargeGlow(ctx, seat, c, CHARGE_GLOW, now);
    } else {
      const speed = clamp01(Math.hypot(p.x - x0, p.y - y0) / 10 / FAST);
      const flat = near < SQUASH_MS ? 1 - near / SQUASH_MS : 0;
      squash = flat > 0 ? 1 - (1 - SQUASH) * flat : 1 + STRETCH * speed;
      radius *= flat > 0 ? 1 + 0.5 * flat : 1 - 0.12 * speed;
    }
    // sat on its surface, not squashed round its middle
    const y = seat.y - radius * squash;
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    if (swell > 0) {
      ctx.globalAlpha = 0.5 * swell;
      drawGlow(ctx, SWELL_GLOW, seat.x, y, SWELL * swell, 1);
    }
    ctx.globalAlpha = 0.85;
    drawGlow(ctx, BODY_GOLD, seat.x, y, radius, squash);
    ctx.globalAlpha = 1;
    drawGlow(ctx, BODY_CORE, seat.x, y, radius * 0.5, squash);
    ctx.globalCompositeOperation = previous;
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
