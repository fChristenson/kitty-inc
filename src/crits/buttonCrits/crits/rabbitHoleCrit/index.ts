// Rabbit Hole, a button crit: the number drops into a hole that opens under
// it, while a flat glowing hole opens on the ground beside every button in
// view, each its own look and distance off its button; a bunny-eared wisp
// pops out of the hole by the top button at once, loops up in a hop and
// dives straight back in, popping out by the next button down, and so on
// down the column, every pop a flash and a jolt on that button, which turns
// over: each of its next taps also hires a worker on the floors either side;
// the hops quicker each, its own hole swelling and trembling, until it pops
// out of that one in a burst of glitter onto its own button, the big blast
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import { isFloorMaxed, type Floor } from "../../../../gameState";
import {
  drawPortal,
  drawPortalPass,
  portalLook,
} from "../../../../shared/animationStyles/portal";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { playSpinTick, playSwoosh } from "../../../../sound";
import { COLOR } from "../../../../palette";
import { BTN_H, BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash, ownLast } from "../../../floorCrits/critPlayer/shared";

// the number dropping into the first hole, START_Y under it
const IN_MS = 200;
const START_Y = 150;
const START_SIZE = 80;
// the holes, in turn: GAPS px left of their button, SIZES across, on its
// lower edge; opening CASCADE_MS apart, closing CLOSE_MS after the last dive
const GAPS = [80, 160, 105, 200, 130];
const SIZES = [54, 68, 46, 74, 60];
const HOLE_DY = BTN_H * 0.3;
const OPEN_MS = 140;
const CASCADE_MS = 30;
const CLOSE_MS = 150;
// the hops: a loop up and out to the left and back down into the same hole,
// HOP_MS each (quicker each, all of them squeezed into HOPS_MS), HOP_H high
const HOP_MS: [number, number] = [300, 110];
const HOPS_MS = 1050;
const MIN_HOP_MS = 80;
const HOP_H: [number, number] = [170, 115];
const HOP_SIDE = 46;
// its own hole swelling OWN_SWELL more and trembling up to TREMBLE px
const OWN_SWELL = 0.7;
const TREMBLE = 7;
// out of its own hole onto its button's left end in LAND_MS, bowed up
const LAND_MS = 120;
const LAND_BOW = 60;
// the burst of glitter out of its own hole onto its button
const GLITTER = 44;
const GLITTER_MS: [number, number] = [80, 170];
const GLITTER_BOW = 90;
const GLITTER_SIZE = 20;
const GLITTER_FADE_MS = 120;
// the wisp and its ears, EAR px long, set EAR_SET apart and splayed EAR_SPLAY
const WISP = WISP_SIZE * 1.1;
const EAR = 30;
const EAR_SET = 7;
const EAR_SPLAY = 7;
const EAR_LOOK_MS = 24;
// cheap flashes on a button's left end, FLASH_MS long
const POP_FLASH = 110;
const FLASH_MS = 200;
const OWN_BLAST = 340;
// shakes by step: -, a button, its own
const SHAKES = [0.4, 1.1, 2.8];
const FLASH_GOLD = fadeStops(COLOR.heavenlyGold);
const FLASH_CORE = fadeStops(COLOR.white, 0.3);

interface State {
  bars: Point[];
  // the buttons in the order it pops by them, their holes (live), each
  // hole's size and gap, when it pops out of each and how long it hops
  order: Int16Array;
  holes: Point[];
  ends: Point[];
  size: Float32Array;
  gap: Float32Array;
  popMs: Float32Array;
  hopMs: Float32Array;
  hopH: Float32Array;
  landMs: number;
  popped: number;
  // each speck of the burst: when it lands, its spot on the button, its bow
  glitterMs: Float32Array;
  gy: Float32Array;
  bow: Float32Array;
  runner: (ms: number) => Point | null;
}
const states = new WeakMap<Running, State>();
const spot: Point = { x: 0, y: 0 };
const head: Point = { x: 0, y: 0 };
const back: Point = { x: 0, y: 0 };
const start: Point = { x: 0, y: START_Y };
const shaken: Point = { x: 0, y: 0 };

const open = (floor: Floor | undefined): floor is Floor =>
  !!floor && floor.unlocked && !isFloorMaxed(floor);

// each tap also hiring a worker on the floor above and the one below
const warrenTaps = defineTapPerk("Warren", (t) => {
  const k = t.floors.indexOf(t.floor);
  const above = t.floors[k + 1];
  const below = t.floors[k - 1];
  if (open(above)) t.hire(above);
  if (open(below)) t.hire(below);
});

// where the wisp is at ms, into `into`: hopping out of hole i and back in,
// or out of its own onto its button; null before it first pops out
function at(state: State, ms: number, into: Point): Point | null {
  const { popMs, hopMs, holes } = state;
  const n = popMs.length;
  if (ms < popMs[0]) return null;
  for (let i = 0; i < n - 1; i++) {
    if (ms >= popMs[i] + hopMs[i]) continue;
    const p = (ms - popMs[i]) / hopMs[i];
    const s = Math.sin(Math.PI * p);
    const hole = holes[i];
    // always left of the hole, never stalling at the top of the loop
    into.x = hole.x - HOP_SIDE * s * (1 + Math.cos(Math.PI * p));
    into.y = hole.y - state.hopH[i] * s;
    return into;
  }
  if (ms > state.landMs) return null;
  const p = clamp01((ms - popMs[n - 1]) / LAND_MS);
  const from = holes[n - 1];
  const to = state.ends[state.order[n - 1]];
  into.x = lerp(from.x, to.x, p);
  into.y = lerp(from.y, to.y, p) - LAND_BOW * 4 * p * (1 - p);
  return into;
}

// a quick flash on a button's end: a gold bloom with a white core
function flash(
  ctx: CanvasRenderingContext2D,
  at: Point,
  ms: number,
  size: number,
  base: number,
): void {
  if (ms < 0 || ms >= FLASH_MS) return;
  const u = ms / FLASH_MS;
  ctx.globalAlpha = base * (1 - u);
  drawGlow(ctx, FLASH_GOLD, at.x, at.y, size * (0.6 + 0.8 * u));
  drawGlow(ctx, FLASH_CORE, at.x, at.y, size * 0.5 * (1 - u));
}

// how open a hole is at ms: opening from openMs, closing from closeMs
const openness = (ms: number, openMs: number, closeMs: number) =>
  Math.min(
    clamp01((ms - openMs) / OPEN_MS),
    1 - clamp01((ms - closeMs) / CLOSE_MS),
  );

// two glowing ears on the head, streaming back from the way it's going
function ears(ctx: CanvasRenderingContext2D, alpha: number): void {
  let vx = head.x - back.x;
  let vy = head.y - back.y;
  const v = Math.hypot(vx, vy);
  if (v > 0.5) {
    vx /= v;
    vy /= v;
  } else {
    vx = 0;
    vy = 1;
  }
  let dx = -vx * 0.6;
  let dy = -vy * 0.6 - 0.5;
  const d = Math.hypot(dx, dy) || 1;
  dx /= d;
  dy /= d;
  const px = -dy;
  const py = dx;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  for (let side = -1; side <= 1; side += 2) {
    const bx = head.x + px * EAR_SET * side;
    const by = head.y + py * EAR_SET * side;
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(
      bx + dx * EAR * 0.6 + px * EAR_SPLAY * side * 1.6,
      by + dy * EAR * 0.6 + py * EAR_SPLAY * side * 1.6,
      bx + dx * EAR + px * EAR_SPLAY * side,
      by + dy * EAR + py * EAR_SPLAY * side,
    );
  }
  ctx.lineCap = "round";
  ctx.lineWidth = 10;
  ctx.strokeStyle = COLOR.heavenlyGold;
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.strokeStyle = COLOR.white;
  ctx.stroke();
  ctx.lineCap = "butt";
}

registerFloorCrit("rabbitHoleCrit", {
  reward(t) {
    warrenTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const n = order.length;
    const popMs = new Float32Array(n);
    const hopMs = new Float32Array(n);
    const hopH = new Float32Array(n);
    const size = new Float32Array(n);
    const gap = new Float32Array(n);
    let total = 0;
    for (let i = 0; i < n - 1; i++) {
      const u = i / Math.max(1, n - 2);
      hopMs[i] = lerp(HOP_MS[0], HOP_MS[1], u);
      hopH[i] = lerp(HOP_H[0], HOP_H[1], u);
      total += hopMs[i];
    }
    const squeeze = Math.min(1, HOPS_MS / (total || 1));
    let t = IN_MS;
    for (let i = 0; i < n; i++) {
      size[i] = SIZES[i % SIZES.length];
      gap[i] = GAPS[i % GAPS.length];
      popMs[i] = t;
      if (i < n - 1) {
        hopMs[i] = Math.max(MIN_HOP_MS, hopMs[i] * squeeze);
        hit(order[i], t, 1);
        t += hopMs[i];
      }
    }
    const landMs = t + LAND_MS;
    hit(0, landMs, 2);
    const glitterMs = new Float32Array(GLITTER);
    const gy = new Float32Array(GLITTER);
    const bow = new Float32Array(GLITTER);
    for (let i = 0; i < GLITTER; i++) {
      glitterMs[i] = lerp(GLITTER_MS[0], GLITTER_MS[1], holeHash(i, 7311));
      gy[i] = (holeHash(i, 7312) * 2 - 1) * BTN_H * 0.4;
      bow[i] = GLITTER_BOW * (0.4 + holeHash(i, 7313));
    }
    const holes: Point[] = [];
    for (let i = 0; i < n; i++) holes.push({ x: 0, y: 0 });
    const ends: Point[] = [];
    for (let b = 0; b < bars.length; b++) ends.push({ x: 0, y: 0 });
    const state: State = {
      bars,
      order: Int16Array.from(order),
      holes,
      ends,
      size,
      gap,
      popMs,
      hopMs,
      hopH,
      landMs,
      popped: 0,
      glitterMs,
      gy,
      bow,
      runner: (ms) => at(state, ms, spot),
    };
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    state.bars = bars;
    const now = r.startedAt + ms;
    const { order, holes, ends, size, gap, popMs, landMs } = state;
    const n = order.length;
    const last = n - 1;
    for (let b = 0; b < Math.min(bars.length, ends.length); b++) {
      ends[b].x = bars[b].x - BTN_W / 2;
      ends[b].y = bars[b].y;
    }
    // its own hole swelling and trembling as the pops close in on it
    const charge = n > 1 ? clamp01((ms - popMs[0]) / (popMs[last] - popMs[0])) : 0;
    for (let i = 0; i < n; i++) {
      const b = bars[order[i]];
      if (!b) continue;
      holes[i].x = b.x - BTN_W / 2 - gap[i];
      holes[i].y = b.y + HOLE_DY;
    }
    // the number dropping into the first hole, shrinking
    if (ms < IN_MS) {
      const u = ms / IN_MS;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        START_Y * u * u,
        r.flashFont * (1 - 0.85 * u),
      );
    }
    // a pop's tick, higher each, and a whoosh out of its own
    while (state.popped < n && ms >= popMs[state.popped]) {
      if (state.popped === last) playSwoosh();
      else playSpinTick(1 + 0.15 * state.popped);
      state.popped++;
    }
    const startOpen = openness(ms, 0, IN_MS + 40);
    if (startOpen > 0) {
      drawPortal(ctx, start, START_SIZE, startOpen, now, 1, portalLook(4));
      drawPortalPass(ctx, start, ms - IN_MS, START_SIZE);
    }
    for (let i = 0; i < n; i++) {
      const closeMs = i < last ? popMs[i + 1] + 40 : landMs + 60;
      const o = openness(ms, IN_MS * 0.3 + i * CASCADE_MS, closeMs);
      if (o <= 0) continue;
      let where = holes[i];
      let s = size[i];
      if (i === last) {
        s *= 1 + OWN_SWELL * charge * charge;
        const shake = TREMBLE * charge * charge;
        shaken.x = where.x + Math.sin(now * 0.091) * shake;
        shaken.y = where.y + Math.cos(now * 0.077) * shake * 0.5;
        where = shaken;
      }
      drawPortal(ctx, where, s, o, now, 1, portalLook(i + 1));
      drawPortalPass(ctx, where, ms - popMs[i], s);
      if (i < last) drawPortalPass(ctx, where, ms - popMs[i + 1], s);
    }
    const base = ctx.globalAlpha;
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    // a flash on each button as it pops out by it
    for (let i = 0; i < last; i++) {
      const end = ends[order[i]];
      if (end) flash(ctx, end, ms - popMs[i], POP_FLASH, base);
    }
    // the burst of glitter out of its own hole onto its button
    const burst = ms - popMs[last];
    const own = ends[0];
    if (burst >= 0 && burst < GLITTER_MS[1] + GLITTER_FADE_MS) {
      const from = holes[last];
      beginLightBatch(ctx);
      for (let i = 0; i < GLITTER; i++) {
        const p = burst / state.glitterMs[i];
        const fade = p > 1 ? 1 - (burst - state.glitterMs[i]) / GLITTER_FADE_MS : 1;
        if (fade <= 0) continue;
        const q = Math.min(1, p);
        ctx.globalAlpha = base * fade;
        stampGlimmer(
          ctx,
          lerp(from.x, own.x, q),
          lerp(from.y, own.y + state.gy[i], q) - state.bow[i] * 4 * q * (1 - q),
          GLITTER_SIZE,
          i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
    }
    // the ears, over the wisp's head while it's out
    if (ms >= popMs[0] && ms <= landMs && at(state, ms, head)) {
      if (!at(state, ms - EAR_LOOK_MS, back)) {
        back.x = head.x;
        back.y = head.y + 1;
      }
      ears(ctx, base);
    }
    ctx.globalAlpha = base;
    ctx.globalCompositeOperation = previous;
    drawWispBetween(
      ctx,
      state.runner,
      ms,
      now,
      WISP,
      clamp01((ms - popMs[0]) / (landMs - popMs[0] || 1)),
      popMs[0],
      landMs,
    );
    drawDetonation(ctx, own, ms - landMs, OWN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
