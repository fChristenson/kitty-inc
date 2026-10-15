// Ball Toss, a button crit: the number shrinks into a ball of light tossed
// up in a high arc onto a button's top edge, then on between the buttons out
// of order (top, near the bottom, the middle...), squashing flat on each (a
// pop, a jolt, the button turning over) and springing on, every arc lower
// and quicker, the ball spinning faster and glowing hotter; the last throw
// a big swelling lob onto its own button in the biggest blast: each of
// their next taps also boosts every worker on a random open floor
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import { activateBoosted, type Floor } from "../../../../gameState";
import {
  drawBounceSplash,
  hops,
  SPLASH_MS,
  type Bounce,
  type BouncePath,
} from "../../../../shared/animationStyles/bounce";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { COLOR } from "../../../../palette";
import { playBloop } from "../../../../sound";
import { BTN_H, BTN_W } from "../../../../floors/upgradeButton";
import { clickWorker, getRenderedWorkerCount } from "../../../../floors/worker";
import {
  registerFloorCrit,
  byHeight,
  clamp01,
  drawText,
  lerp,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";

// the number shrinking into the ball as it's tossed
const IN_MS = 130;
// at most TOSSES buttons before the lob; each toss quicker and lower
const TOSSES = 6;
const TOSS_MS: [number, number] = [280, 140];
const TOSS_LIFT: [number, number] = [300, 110];
// it lands OFF_X of a button's width either side of its middle, by turns
const OFF_X = 0.22;
// the lob: LOB_MS, peaking LOB_OVER px over its own button, the ball
// swelling LOB_GROW times and the rumble rising
const LOB_MS = 460;
const LOB_OVER = 260;
const LOB_GROW = 2.1;
const RUMBLE_MS = 55;
const RUMBLE_SHAKE: [number, number] = [0.3, 1.4];
// the ball, its body BODY of it across; squashed to SQUASH within SQUASH_MS
// of a contact, stretched up to STRETCH at FAST px per ms
const BALL = WISP_SIZE * 1.15;
const BODY = 0.9;
const RADIUS = BALL * BODY;
const SQUASH = 0.42;
const SQUASH_MS = 45;
const STRETCH = 0.35;
const FAST = 2.4;
// it turns SPIN_TURNS times over the whole toss, quickening with the square
const SPIN_TURNS = 9;
const HOT_HALO = 2.4;
// a contact's cheap pop: a flash flattened along the top edge for FLASH_MS
const FLASH_MS = 170;
const FLASH = BTN_W * 0.55;
const SPLASH = 120;
const OWN_SPLASH = 330;
const OWN_BLAST = 400;
// shakes by step: unused, a button, its own
const SHAKES = [0.6, 1.3, 3.4];

interface State {
  // the own button where it was planned, to carry everything along a scroll
  home: Point;
  tosses: BouncePath | null;
  lob: BouncePath;
  // every button contact, its own last
  contacts: Bounce[];
  rumbles: Float32Array;
}
const states = new WeakMap<Running, State>();
let current: State | null = null;
const ORIGIN: Point = { x: 0, y: 0 };
const UP = -Math.PI / 2;
const seat: Point = { x: 0, y: 0 };
const BODY_GOLD = fadeStops(COLOR.heavenlyGold, 0.3);
const BODY_CORE = fadeStops(COLOR.white, 0.45);
const HOT = fadeStops(COLOR.orange);
const POP = fadeStops(COLOR.white, 0.2);

// each tap also boosting every worker on a random open floor
const tossTaps = defineTapPerk("Toss", (t) => {
  let open = 0;
  for (const floor of t.floors) if (floor.unlocked) open++;
  if (open === 0) return;
  let pick = Math.floor(Math.random() * open);
  let target: Floor | null = null;
  for (const floor of t.floors)
    if (floor.unlocked && pick-- === 0) {
      target = floor;
      break;
    }
  if (!target) return;
  const now = Date.now();
  const count = getRenderedWorkerCount(target);
  for (let i = 0; i < count; i++) {
    clickWorker(target, i, now);
    activateBoosted(target, i, now);
  }
  if (count > 0) playBloop();
});

// the ball's middle at ms
function ballAt(ms: number): Point {
  const s = current!;
  return s.tosses && ms < s.lob.startMs ? s.tosses.at(ms) : s.lob.at(ms);
}

registerFloorCrit("ballTossCrit", {
  reward(t) {
    tossTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    // top to bottom, then dealt from both ends: top, bottom, second...
    const column = byHeight(bars).filter((bar) => bar !== 0);
    const order: number[] = [];
    for (let i = 0, j = column.length - 1; i <= j; i++, j--) {
      order.push(column[i]);
      if (j > i) order.push(column[j]);
    }
    order.length = Math.min(order.length, TOSSES);
    const points: Point[] = [ORIGIN];
    const contacts: Bounce[] = [];
    order.forEach((bar, k) => {
      const x = bars[bar].x + BTN_W * (k % 2 ? OFF_X : -OFF_X);
      const top = bars[bar].y - BTN_H / 2;
      points.push({ x, y: top - RADIUS });
      contacts.push({ at: { x, y: top }, ms: 0, normal: UP });
    });
    const tosses =
      order.length > 0 ? hops(points, TOSS_MS, TOSS_LIFT, IN_MS) : null;
    const from = points[points.length - 1];
    const ownTop = bars[0].y - BTN_H / 2;
    const own: Point = { x: bars[0].x, y: ownTop - RADIUS };
    const rise = Math.max(0, from.y - own.y);
    const lift = rise / 2 + LOB_OVER;
    const lob = hops(
      [from, own],
      [LOB_MS, LOB_MS],
      [lift, lift],
      tosses ? tosses.endMs : IN_MS,
    );
    for (let k = 0; k < order.length; k++) {
      contacts[k].ms = tosses!.bounces[k].ms;
      hit(order[k], contacts[k].ms, 1);
    }
    contacts.push({ at: { x: own.x, y: ownTop }, ms: lob.endMs, normal: UP });
    hit(0, lob.endMs, 2);
    const rumbles: number[] = [];
    for (let ms = lob.startMs + RUMBLE_MS; ms < lob.endMs; ms += RUMBLE_MS)
      rumbles.push(ms);
    states.set(r, {
      home: { x: bars[0].x, y: bars[0].y },
      tosses,
      lob,
      contacts,
      rumbles: Float32Array.from(rumbles),
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    current = state;
    const now = r.startedAt + ms;
    const { lob, contacts, rumbles } = state;
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
    // the rumble rising through the lob
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
    // a cheap pop on every button it bounces off, the one blast on its own
    const last = contacts.length - 1;
    let near = Infinity;
    for (let k = 0; k < last; k++) {
      const c = contacts[k];
      const since = ms - c.ms;
      const gap = since < 0 ? -since : since;
      if (gap < near) near = gap;
      if (since < 0 || since >= SPLASH_MS) continue;
      drawBounceSplash(ctx, c, since, SPLASH, now);
      if (since < FLASH_MS) {
        const f = since / FLASH_MS;
        const previous = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 1 - f;
        drawGlow(ctx, POP, c.at.x, c.at.y, FLASH * (0.6 + 0.6 * f), 0.3);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = previous;
      }
    }
    const end = contacts[last];
    const since = ms - end.ms;
    if (since >= 0) {
      drawBounceSplash(ctx, end, since, OWN_SPLASH, now);
      drawDetonation(ctx, end.at, since, OWN_BLAST, now);
    }
    const heat = clamp01(ms / lob.endMs);
    const swell =
      ms >= lob.startMs && ms < lob.endMs
        ? clamp01((ms - lob.startMs) / (lob.endMs - lob.startMs)) ** 2
        : 0;
    const size = BALL * (1 + (LOB_GROW - 1) * swell);
    drawWispBetween(ctx, ballAt, ms, now, size, heat, IN_MS * 0.5, lob.endMs);
    if (ms >= lob.endMs) {
      ctx.restore();
      return;
    }
    // the body: stretched flying fast, flattened onto a top edge on contact
    const before = ballAt(ms - 10);
    const x0 = before.x;
    const y0 = before.y;
    const p = ballAt(ms);
    const speed = clamp01(Math.hypot(p.x - x0, p.y - y0) / 10 / FAST);
    const flat = near < SQUASH_MS ? 1 - near / SQUASH_MS : 0;
    const squash = flat > 0 ? 1 - (1 - SQUASH) * flat : 1 + STRETCH * speed;
    const radius = size * BODY * (flat > 0 ? 1 + 0.5 * flat : 1 - 0.1 * speed);
    // sat on its surface, not squashed round its middle
    seat.x = p.x;
    seat.y = p.y + RADIUS - radius * squash;
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.25 + 0.6 * heat;
    drawGlow(
      ctx,
      HOT,
      seat.x,
      seat.y,
      radius * HOT_HALO * (0.7 + heat),
      squash,
    );
    ctx.globalAlpha = 0.85;
    drawGlow(ctx, BODY_GOLD, seat.x, seat.y, radius, squash);
    ctx.globalAlpha = 1;
    drawGlow(
      ctx,
      BODY_CORE,
      seat.x,
      seat.y,
      radius * (0.45 + 0.25 * heat),
      squash,
    );
    // its seam spinning round, quicker with the square of time
    const u = ms / lob.endMs;
    const a = Math.PI * 2 * SPIN_TURNS * u * u;
    const dx = Math.cos(a) * radius * 0.55;
    const dy = Math.sin(a) * radius * 0.55 * squash;
    drawGlow(ctx, BODY_CORE, seat.x + dx, seat.y + dy, radius * 0.3, squash);
    ctx.globalAlpha = 0.6;
    drawGlow(ctx, BODY_CORE, seat.x - dx, seat.y - dy, radius * 0.22, squash);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
