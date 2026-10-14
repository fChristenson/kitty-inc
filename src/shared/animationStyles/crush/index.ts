// crushing for events and crits: one element pressing down on another,
// harder and harder, until it's crushed flat. The crusher winds up and slams
// in presses that quicken, each driving deeper (the target's crush 0..1),
// the target springing back a little as it lifts; the last winds up highest
// and slams hardest, crushing it flat. Plan once (planCrush), then each frame
// crushAt for the pose, tickCrush for the thuds and the climax, squashScale
// for a crushed prop's scale, and drawCrushStrain, drawCrushContact and
// drawCrushBurst where the two meet. The caller draws both elements itself,
// the crusher `lift` of its wind-up back off the contact.
// Or a press: the crusher pushes against it without letting up, the strain
// building (trembling, a rising rumble, glitter oozing out, cracks), the
// target giving in sudden jolts closer and closer, until it crumbles into
// pieces. planPress once, then each frame pressAt, tickPress, pressWarp for
// each part of the target (squashing, bulging, buckling, tilting),
// drawPressGrind at the contact (trembleAt from the charge style for the
// shaking), and once it crumbles crumbleAt for each of crumbleFrom's pieces
// and drawCrumbleDust
import { COLOR } from "../../../palette";
import { clamp01, lerp, smoothstep, type Range } from "../../easing";
import { drawBeam } from "../beam";
import { drawGlow, fadeStops } from "../../glowSprite";
import { beginLightBatch, endLightBatch } from "../../lightBatch";
import { playExplosion, playSlamExplosion } from "../../explosionBang";
import { shakeScreen } from "../../screenShake";
import { hash01, stampGlimmer } from "../../twinkle";
import { buzz } from "../../vibration";
import type { Point } from "../../wisp";

export interface CrushStyle {
  // the crush each press drives to is its share of the presses to this power
  curve?: number;
  // each slam's ms from the top of its wind-up to the contact
  slamMs?: number;
  // the share of each gap it stays down before winding up again
  hold?: number;
  // how high each wind-up lifts (of the caller's lift), first to last but
  // one; the last lifts 1
  lift?: Range;
  // the target springing back this share of the last press's step as the
  // crusher lifts
  spring?: number;
  // each slam's shake and buzz (ms), first to last but one; the climax's
  // shake, and whether it bangs (off when the caller bangs)
  shake?: Range;
  buzz?: Range;
  climaxShake?: number;
  bang?: boolean;
}

export interface Crush {
  // each slam's contact, the last the crush
  slams: number[];
  // the crush each slam drives to
  depths: number[];
  style: Required<CrushStyle>;
  // slams already ticked
  ticked: number;
}

export interface CrushPose {
  // how crushed the target is, 0 untouched to 1 flat
  crush: number;
  // how far the crusher is wound up off the contact, 0..1
  lift: number;
  // ms since the last slam (Infinity before the first), and its index
  since: number;
  press: number;
}

const DEFAULTS: Required<CrushStyle> = {
  curve: 1.6,
  slamMs: 70,
  hold: 0.3,
  lift: [0.45, 0.75],
  spring: 0.35,
  shake: [0.5, 1.4],
  buzz: [15, 45],
  climaxShake: 3,
  bang: true,
};

// how long a slam's impact drives the target down
const IMPACT_MS = 45;

// `count` slams from firstMs, the gaps between them closing from gaps[0] to
// gaps[1] ms; the last gap stretched by `windUp` for the climax's wind-up
export function planCrush(
  firstMs: number,
  count: number,
  gaps: Range,
  windUp = 1.6,
  style: CrushStyle = {},
): Crush {
  const full = { ...DEFAULTS, ...style };
  const slams: number[] = [];
  let t = firstMs;
  for (let k = 0; k < count; k++) {
    slams.push(t);
    const gap = lerp(gaps, k / Math.max(1, count - 2));
    t += k === count - 2 ? gap * windUp : gap;
  }
  return {
    slams,
    depths: slams.map((_, k) => ((k + 1) / count) ** full.curve),
    style: full,
    ticked: 0,
  };
}

// the pose at ms, written into `into`
export function crushAt(crush: Crush, ms: number, into: CrushPose): CrushPose {
  const { slams, depths, style } = crush;
  let k = -1;
  while (k + 1 < slams.length && ms >= slams[k + 1]) k++;
  const last = slams.length - 1;
  into.press = k;
  into.since = k < 0 ? Infinity : ms - slams[k];
  const before = k > 0 ? depths[k - 1] : 0;
  const landed = k < 0 ? 0 : depths[k];
  const driven =
    k < 0 ? 0 : before + (landed - before) * clamp01(into.since / IMPACT_MS);
  if (k >= last) {
    into.crush = driven;
    into.lift = 0;
    return into;
  }
  // hovering wound up before the first slam, then winding up for the next
  // from `hold` of the way after the last; slamming down faster and faster
  const next = slams[k + 1];
  const top = next - style.slamMs;
  const rise = k < 0 ? -Infinity : slams[k] + (top - slams[k]) * style.hold;
  const height =
    k + 1 === last ? 1 : lerp(style.lift, (k + 1) / Math.max(1, last - 1));
  if (ms < top)
    into.lift =
      k < 0 ? height : height * smoothstep(clamp01((ms - rise) / (top - rise)));
  else into.lift = height * (1 - ((ms - top) / style.slamMs) ** 2);
  into.crush = driven - style.spring * (landed - before) * (into.lift / height);
  return into;
}

// the slams due by ms: a shake and buzz each, harder each, the climax the
// hardest with a bang, through `shake` (a floor crit's own r.shake, else the
// screen's). Returns the index of the slam landing this frame, else -1
export function tickCrush(
  crush: Crush,
  ms: number,
  shake: (intensity: number) => void = shakeScreen,
): number {
  const { slams, style } = crush;
  let landed = -1;
  while (crush.ticked < slams.length && ms >= slams[crush.ticked]) {
    landed = crush.ticked++;
    if (landed === slams.length - 1) {
      shake(style.climaxShake);
      if (style.bang) playSlamExplosion();
      else buzz(style.buzz[1] * 2);
    } else {
      const t = landed / Math.max(1, slams.length - 2);
      shake(lerp(style.shake, t));
      buzz(lerp(style.buzz, t));
    }
  }
  return landed;
}

// the crusher's own squash and stretch at ms, y along the crush and x across
// it, into `into`: stretching as it drives down, squashing flat on the
// contact and wobbling back, harder each slam (text that crushes too)
const DRIVE_STRETCH = 0.3;
const IMPACT_SQUASH: Range = [0.22, 0.42];
const SQUASH_DECAY_MS = 80;
const WOBBLE_MS = 170;
export function crusherScale(crush: Crush, ms: number, into: Point): Point {
  const { slams, style } = crush;
  let k = -1;
  while (k + 1 < slams.length && ms >= slams[k + 1]) k++;
  let along = 1;
  const next = slams[k + 1];
  if (next !== undefined && next - ms < style.slamMs)
    along += DRIVE_STRETCH * (1 - (next - ms) / style.slamMs) ** 2;
  if (k >= 0) {
    const since = ms - slams[k];
    const hard = lerp(IMPACT_SQUASH, k / Math.max(1, slams.length - 1));
    along -=
      hard *
      Math.exp(-since / SQUASH_DECAY_MS) *
      Math.cos((Math.PI * 2 * since) / WOBBLE_MS);
  }
  into.y = along;
  into.x = 1 / Math.sqrt(along);
  return into;
}

// how far a crushed prop squashes: SQUASH flatter at a full crush, widening
// to keep its bulk; scale y along the crush, x across it, into `into`
const SQUASH = 0.8;
const MAX_WIDEN = 2.2;
export function squashScale(crush: number, into: Point): Point {
  into.y = 1 - SQUASH * clamp01(crush);
  into.x = Math.min(MAX_WIDEN, 1 / Math.sqrt(into.y));
  return into;
}

// the contact, its plane across `angle` (the way the crusher presses)
const across: Point = { x: 0, y: 0 };
const from: Point = { x: 0, y: 0 };
const to: Point = { x: 0, y: 0 };
const GOLD = fadeStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white, 0.2);

function acrossOf(angle: number): Point {
  across.x = -Math.sin(angle);
  across.y = Math.cos(angle);
  return across;
}

// a slab of light from a to b, `thick` px: the crusher when nothing on
// screen does it, a gold beam with a white core and glitter along it
const SLAB_GLINTS = 8;
export function drawSlab(
  ctx: CanvasRenderingContext2D,
  a: Point,
  b: Point,
  thick: number,
  alpha: number,
  now: number,
): void {
  if (alpha <= 0) return;
  drawBeam(ctx, a, b, thick * 1.8, 0.5 * alpha);
  drawBeam(ctx, a, b, thick, alpha);
  const previous = ctx.globalCompositeOperation;
  const base = ctx.globalAlpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = base * alpha;
  beginLightBatch(ctx);
  for (let k = 0; k <= SLAB_GLINTS; k++) {
    const u = k / SLAB_GLINTS;
    stampGlimmer(
      ctx,
      a.x + (b.x - a.x) * u,
      a.y + (b.y - a.y) * u,
      thick * 0.6 * (0.7 + 0.3 * Math.sin(now * 0.012 + k)),
      k,
      k % 2 ? COLOR.white : COLOR.heavenlyGold,
    );
  }
  endLightBatch(ctx);
  ctx.globalAlpha = base;
  ctx.globalCompositeOperation = previous;
}

// cracks of light spreading through the target from the contact as it's
// crushed: STRAIN_CRACKS hairlines fanning back from the contact, longer and
// brighter the more it's crushed, `size` px at a full crush
const STRAIN_CRACKS = 10;
const STRAIN_FAN = 1.3;
const STRAIN_WIDTH = 5;
export function drawCrushStrain(
  ctx: CanvasRenderingContext2D,
  at: Point,
  angle: number,
  width: number,
  crush: number,
  size: number,
  now: number,
): void {
  if (crush <= 0) return;
  const flicker = 0.75 + 0.25 * Math.sin(now * 0.05);
  acrossOf(angle);
  for (let i = 0; i < STRAIN_CRACKS; i++) {
    if (hash01(i, 31) > crush * 1.4) continue;
    const a = angle + (hash01(i, 32) * 2 - 1) * STRAIN_FAN;
    const along = (hash01(i, 33) - 0.5) * width;
    const reach = size * crush * (0.4 + 0.6 * hash01(i, 34));
    from.x = at.x + across.x * along;
    from.y = at.y + across.y * along;
    to.x = from.x + Math.cos(a) * reach;
    to.y = from.y + Math.sin(a) * reach;
    drawBeam(ctx, from, to, STRAIN_WIDTH, crush * flicker);
  }
}

// a slam's contact `since` ms after it, `power` 0..1+: a white-hot line
// across the contact `width` px wide, and glitter squeezed out of both ends
// flat and fast
const CONTACT_MS = 260;
const CONTACT_LINE = 26;
const SQUIRTS = 24;
const SQUIRT_REACH = 1.1;
const SQUIRT_FAN = 0.35;
const SQUIRT_SIZE = 26;
export function drawCrushContact(
  ctx: CanvasRenderingContext2D,
  at: Point,
  angle: number,
  width: number,
  since: number,
  power: number,
  now: number,
): void {
  if (since < 0 || since >= CONTACT_MS || power <= 0) return;
  const u = since / CONTACT_MS;
  const fade = 1 - u;
  acrossOf(angle);
  const half = width / 2;
  from.x = at.x - across.x * half;
  from.y = at.y - across.y * half;
  to.x = at.x + across.x * half;
  to.y = at.y + across.y * half;
  drawBeam(ctx, from, to, CONTACT_LINE * (1 + power) * fade, fade);
  const previous = ctx.globalCompositeOperation;
  const alpha = ctx.globalAlpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha =
    alpha * fade * Math.min(1, power) * (0.85 + 0.15 * Math.sin(now * 0.08));
  drawGlow(ctx, GOLD, at.x, at.y, width * 0.45);
  drawGlow(ctx, WHITE, at.x, at.y, width * 0.15 * (1 + power));
  ctx.globalAlpha = alpha;
  beginLightBatch(ctx);
  const out = 1 - (1 - u) ** 3;
  for (let i = 0; i < SQUIRTS; i++) {
    if (hash01(i, 41) > power) continue;
    const side = i % 2 ? 1 : -1;
    const a =
      Math.atan2(across.y * side, across.x * side) +
      (hash01(i, 42) * 2 - 1) * SQUIRT_FAN -
      side * 0.2;
    const reach = width * SQUIRT_REACH * (0.4 + 0.6 * hash01(i, 43)) * out;
    const edgeX = at.x + across.x * half * side;
    const edgeY = at.y + across.y * half * side;
    stampGlimmer(
      ctx,
      edgeX + Math.cos(a) * reach,
      edgeY + Math.sin(a) * reach,
      SQUIRT_SIZE * fade * (0.6 + 0.4 * power),
      i,
      i % 3 ? COLOR.heavenlyGold : COLOR.white,
    );
  }
  endLightBatch(ctx);
  ctx.globalCompositeOperation = previous;
}

// the crush flattening the target `since` ms after the last slam: the
// contact line flaring out wide, jets of glitter blasting flat out of both
// sides across the screen, a white flash
const BURST_MS = 520;
const BURST_WIDEN = 2.4;
const BURST_LINE = 70;
const JETS = 60;
const JET_REACH: Range = [1.2, 3];
const JET_FAN = 0.22;
const JET_SIZE = 40;
export function drawCrushBurst(
  ctx: CanvasRenderingContext2D,
  at: Point,
  angle: number,
  width: number,
  since: number,
  now: number,
): void {
  if (since < 0 || since >= BURST_MS) return;
  const u = since / BURST_MS;
  const fade = 1 - u;
  const out = 1 - (1 - u) ** 3;
  acrossOf(angle);
  const half = (width / 2) * (1 + (BURST_WIDEN - 1) * out);
  from.x = at.x - across.x * half;
  from.y = at.y - across.y * half;
  to.x = at.x + across.x * half;
  to.y = at.y + across.y * half;
  drawBeam(ctx, from, to, BURST_LINE * fade, fade);
  const previous = ctx.globalCompositeOperation;
  const alpha = ctx.globalAlpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha * fade * fade;
  drawGlow(ctx, WHITE, at.x, at.y, width * 0.8);
  ctx.globalAlpha = alpha;
  beginLightBatch(ctx);
  for (let i = 0; i < JETS; i++) {
    const side = i % 2 ? 1 : -1;
    const a =
      Math.atan2(across.y * side, across.x * side) +
      (hash01(i, 51) * 2 - 1) * JET_FAN;
    const reach = width * lerp(JET_REACH, hash01(i, 52)) * out;
    stampGlimmer(
      ctx,
      at.x + Math.cos(a) * reach,
      at.y + Math.sin(a) * reach,
      JET_SIZE * fade * (0.5 + 0.5 * hash01(i, 53)),
      i + now * 0.01,
      i % 3 ? COLOR.heavenlyGold : COLOR.white,
    );
  }
  endLightBatch(ctx);
  ctx.globalCompositeOperation = previous;
}

// ---------- the press ----------

export interface PressStyle {
  // how crushed it is when it crumbles, and the share of that it creeps in
  // (the rest in the gives)
  depth?: number;
  creep?: number;
  // the strain is its time share to this power
  curve?: number;
  // the rumble's shake and buzz (ms) and the ms to the next, from no strain
  // to full; each give's shake; the crumble's shake and whether it bangs
  shake?: Range;
  buzz?: Range;
  everyMs?: Range;
  giveShake?: Range;
  crumbleShake?: number;
  bang?: boolean;
}

export interface Press {
  startMs: number;
  crumbleMs: number;
  // when it gives a little, closer and closer
  gives: number[];
  style: Required<PressStyle>;
  nextRumbleMs: number;
  given: number;
  crumbled: boolean;
}

export interface PressPose {
  // how crushed the target is (up to the style's depth), and the strain 0..1
  crush: number;
  strain: number;
  // ms since the last give (Infinity before the first)
  since: number;
}

const PRESS_DEFAULTS: Required<PressStyle> = {
  depth: 0.4,
  creep: 0.4,
  curve: 1.6,
  shake: [0.06, 0.45],
  buzz: [5, 30],
  everyMs: [180, 50],
  giveShake: [0.6, 1.4],
  crumbleShake: 3,
  bang: true,
};

// how long a give takes to drop
const GIVE_MS = 50;

// a press from startMs that crumbles the target pressMs later, giving
// `gives` times on the way, closer and closer
export function planPress(
  startMs: number,
  pressMs: number,
  gives = 5,
  style: PressStyle = {},
): Press {
  return {
    startMs,
    crumbleMs: startMs + pressMs,
    gives: Array.from(
      { length: gives },
      (_, k) => startMs + pressMs * (1 - (1 - (k + 1) / (gives + 1)) ** 2),
    ),
    style: { ...PRESS_DEFAULTS, ...style },
    nextRumbleMs: startMs,
    given: 0,
    crumbled: false,
  };
}

// the pose at ms, written into `into`
export function pressAt(press: Press, ms: number, into: PressPose): PressPose {
  const { style, gives } = press;
  const t = clamp01((ms - press.startMs) / (press.crumbleMs - press.startMs));
  into.strain = t ** style.curve;
  let stepped = 0;
  let last = -Infinity;
  for (let k = 0; k < gives.length; k++) {
    if (ms < gives[k]) break;
    stepped += clamp01((ms - gives[k]) / GIVE_MS);
    last = gives[k];
  }
  into.since = ms - last;
  into.crush =
    style.depth *
    (style.creep * t * t +
      ((1 - style.creep) * stepped) / Math.max(1, gives.length));
  return into;
}

// the press's rumble, rising and quickening with the strain, a jolt at each
// give and the hardest shake with a bang at the crumble, through `shake` (a
// floor crit's own r.shake, else the screen's); true on the crumble's frame
export function tickPress(
  press: Press,
  ms: number,
  shake: (intensity: number) => void = shakeScreen,
): boolean {
  if (ms < press.startMs || press.crumbled) return false;
  const { style, gives } = press;
  if (ms >= press.crumbleMs) {
    press.crumbled = true;
    shake(style.crumbleShake);
    if (style.bang) playExplosion();
    else buzz(style.buzz[1] * 2);
    return true;
  }
  while (press.given < gives.length && ms >= gives[press.given]) {
    shake(lerp(style.giveShake, press.given / Math.max(1, gives.length - 1)));
    buzz(style.buzz[1]);
    press.given++;
  }
  if (ms < press.nextRumbleMs) return false;
  const t = clamp01((ms - press.startMs) / (press.crumbleMs - press.startMs));
  const strain = t ** style.curve;
  shake(lerp(style.shake, strain));
  buzz(lerp(style.buzz, strain));
  press.nextRumbleMs = ms + lerp(style.everyMs, strain);
  return false;
}

// the contact while it presses, its plane across `angle`, `width` px: a
// white-hot line pulsing harder with the strain and glitter oozing out of
// both ends, more and quicker as it strains, a flare at each give
const OOZE = 18;
const OOZE_MS: Range = [700, 260];
const OOZE_REACH = 0.5;
const OOZE_SIZE = 22;
const GRIND_LINE: Range = [10, 34];
const GIVE_FLARE_MS = 140;
export function drawPressGrind(
  ctx: CanvasRenderingContext2D,
  at: Point,
  angle: number,
  width: number,
  pose: PressPose,
  ms: number,
  now: number,
): void {
  const { strain } = pose;
  const flare = Math.max(0, 1 - pose.since / GIVE_FLARE_MS);
  const flicker = 0.7 + 0.3 * Math.sin(now * (0.03 + 0.07 * strain));
  acrossOf(angle);
  const half = width / 2;
  from.x = at.x - across.x * half;
  from.y = at.y - across.y * half;
  to.x = at.x + across.x * half;
  to.y = at.y + across.y * half;
  drawBeam(
    ctx,
    from,
    to,
    lerp(GRIND_LINE, strain) * (1 + flare),
    Math.min(1, (0.35 + 0.65 * strain) * flicker + flare),
  );
  const previous = ctx.globalCompositeOperation;
  const alpha = ctx.globalAlpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha * Math.min(1, strain + flare);
  drawGlow(ctx, GOLD, at.x, at.y, width * (0.3 + 0.3 * strain + 0.3 * flare));
  ctx.globalAlpha = alpha;
  beginLightBatch(ctx);
  const cycle = lerp(OOZE_MS, strain);
  for (let i = 0; i < OOZE; i++) {
    if (hash01(i, 61) > strain + flare * 0.5) continue;
    const side = i % 2 ? 1 : -1;
    const u = ((ms + hash01(i, 62) * cycle) % cycle) / cycle;
    const a =
      Math.atan2(across.y * side, across.x * side) +
      (hash01(i, 63) * 2 - 1) * SQUIRT_FAN;
    const reach = width * OOZE_REACH * (0.3 + 0.7 * hash01(i, 64)) * u;
    stampGlimmer(
      ctx,
      at.x + across.x * half * side + Math.cos(a) * reach,
      at.y + across.y * half * side + Math.sin(a) * reach,
      OOZE_SIZE * (1 - u) * (0.6 + 0.4 * strain),
      i,
      i % 3 ? COLOR.heavenlyGold : COLOR.white,
    );
  }
  endLightBatch(ctx);
  ctx.globalCompositeOperation = previous;
}

// how a part of the pressed target warps: `a` -1..1 across it and `h` 0..1
// up from its base to the contact, written back as where it's pushed to (in
// the same units), its tilt (rad) and how much wider it's squeezed
export interface PressWarp {
  a: number;
  h: number;
  turn: number;
  widen: number;
}

// how far it squashes at the contact, bulges out in its middle and buckles
// sideways (of its half width), the parts tilting with the buckle, at k 1
const PRESS_SQUASH = 0.55;
const PRESS_BULGE = 0.45;
const PRESS_BUCKLE = 0.4;
const PRESS_TILT = 0.7;
const PRESS_WIDEN = 0.6;

// the part at (a, h) warped by a press k 0..1 of the way to crumbling
// (pose.crush over the style's depth, so it jumps at every give): squashed
// most near the contact, bulging like a barrel, buckling `bend` (-1..1) to
// one side and tilting along the buckle
export function pressWarp(
  k: number,
  a: number,
  h: number,
  bend: number,
  into: PressWarp,
): PressWarp {
  const arch = Math.sin(Math.PI * h);
  const buckle = bend * k ** 1.5;
  into.h = h - PRESS_SQUASH * k * h * (0.5 + 0.5 * h);
  into.a = a * (1 + PRESS_BULGE * k * arch) + PRESS_BUCKLE * buckle * arch;
  into.turn = PRESS_TILT * buckle * Math.cos(Math.PI * h);
  into.widen = 1 + PRESS_WIDEN * k * (0.4 + 0.6 * arch);
  return into;
}

// a piece the crumbling target breaks into: where it sat (from the target's
// base middle) and how it's flung
export interface CrumbleBit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
}

// `count` pieces over a target halfWidth either side and `height` up from its
// base, flung out from its middle and up a little
const BIT_SPREAD = 0.5;
const BIT_UP: Range = [0.15, 0.55];
const BIT_SPIN = 0.012;
export function crumbleBits(
  count: number,
  halfWidth: number,
  height: number,
  salt = 0,
): CrumbleBit[] {
  return crumbleFrom(
    Array.from({ length: count }, (_, i) => ({
      x: (hash01(i, salt + 71) * 2 - 1) * halfWidth,
      y: -hash01(i, salt + 72) * height,
    })),
    halfWidth,
    salt,
  );
}

// the pieces of a target whose parts sit at `spots` (from its base middle),
// halfWidth either side
export function crumbleFrom(
  spots: readonly Point[],
  halfWidth: number,
  salt = 0,
): CrumbleBit[] {
  return spots.map(({ x, y }, i) => {
    const out = x / Math.max(1, halfWidth);
    return {
      x,
      y,
      vx: out * BIT_SPREAD * (0.5 + hash01(i, salt + 73)),
      vy: -lerp(BIT_UP, hash01(i, salt + 74)),
      spin: (hash01(i, salt + 75) * 2 - 1) * BIT_SPIN,
    };
  });
}

// where a piece is `since` ms after the crumble, from the base middle `at`
// (px per ms², down), into `into`; its turn is bit.spin * since
const CRUMBLE_GRAVITY = 0.0035;
export function crumbleAt(
  bit: CrumbleBit,
  at: Point,
  since: number,
  into: Point,
): Point {
  const t = Math.max(0, since);
  into.x = at.x + bit.x + bit.vx * t;
  into.y = at.y + bit.y + bit.vy * t + 0.5 * CRUMBLE_GRAVITY * t * t;
  return into;
}

// the crumble's dust: a white flash, then glitter drifting out from the
// target's base middle `at` over `width` px and settling
const DUST = 36;
const DUST_MS = 800;
const DUST_FLASH_MS = 160;
const DUST_SIZE = 30;
export function drawCrumbleDust(
  ctx: CanvasRenderingContext2D,
  at: Point,
  width: number,
  since: number,
): void {
  if (since < 0 || since >= DUST_MS) return;
  const u = since / DUST_MS;
  const fade = 1 - u;
  const out = 1 - (1 - u) ** 2;
  const previous = ctx.globalCompositeOperation;
  const alpha = ctx.globalAlpha;
  ctx.globalCompositeOperation = "lighter";
  const flash = 1 - since / DUST_FLASH_MS;
  if (flash > 0) {
    ctx.globalAlpha = alpha * flash;
    drawGlow(ctx, WHITE, at.x, at.y - width * 0.2, width * 0.7);
  }
  ctx.globalAlpha = alpha * fade;
  beginLightBatch(ctx);
  for (let i = 0; i < DUST; i++) {
    const a = -Math.PI * hash01(i, 81);
    const reach = width * (0.3 + 0.9 * hash01(i, 82)) * out;
    stampGlimmer(
      ctx,
      at.x + Math.cos(a) * reach,
      at.y + Math.sin(a) * reach * 0.5 + width * 0.3 * u * u,
      DUST_SIZE * (0.5 + 0.5 * hash01(i, 83)),
      i,
      i % 3 ? COLOR.heavenlyGold : COLOR.white,
    );
  }
  endLightBatch(ctx);
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = previous;
}
