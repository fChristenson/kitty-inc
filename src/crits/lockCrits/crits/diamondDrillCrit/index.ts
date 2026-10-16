// Diamond Drill, a lock crit: the number arcs onto the dark locked floor's
// lock and a long drill bit tipped with a big faceted diamond swings in
// sideways and bites into the lock's side; it stalls there rumbling, then
// bores in shove by quickening shove, each a jolt, a flash and a gush of
// sparks and glittering diamond dust out both sides, the lock glowing hotter
// and cracking; on the last it punches clean through, the lock shatters and
// the floor bursts open, and the diamond tip pops free and flies glinting
// onto the new floor's button: its next taps each promote its lowest-tier cat
// a perma tier
import meta from "./meta";
import { CRIT_TIER_ORDER } from "../../../critTypes";
import { defineTapPerk } from "../../../buttonCrits/buttonBonus";
import { drawDrillSpray } from "../../../../shared/animationStyles/drill";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import { drawGlow } from "../../../../shared/glowSprite";
import {
  drawGlitterLight,
  drawWispBetween,
  WISP_SIZE,
} from "../../../../shared/wisp";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { hash01 } from "../../../../shared/twinkle";
import { COLOR } from "../../../../palette";
import { getLockCenter } from "../../../../floors/floorLock";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  celebrateWorkerBoost,
  getRenderedWorkerCount,
  getWorkerPermaTier,
  promoteWorkerPermaTier,
} from "../../../../floors/worker";
import {
  registerFloorCrit,
  type Point,
  clamp01,
  drawText,
  glowStops,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const ARC_MS = 150;
const ARC_RISE = 120;
// the bit swinging in sideways from up-left, snapping onto the lock's side
const SWING_MS = 140;
const SWING_FROM: Point = { x: -880, y: -480 };
const SWING_TURN = 0.9;
const BITE = ARC_MS + SWING_MS;
// stalled on the bite rumbling, then SHOVES quickening shoves through
const STALL_MS = 300;
const GIVES = BITE + STALL_MS;
const RUMBLE_MS = 60;
const RUMBLE_SHAKE = 0.45;
const SHOVES = 8;
const BORE_MS = 1250;
const THROUGH = GIVES + BORE_MS;
const SHOVE_MS = 70;
const KICK_MS = 140;
const SHOVE_AT = new Float64Array(SHOVES);
{
  let sum = 0;
  for (let k = 0; k < SHOVES; k++) sum += lerp(1.35, 0.65, k / (SHOVES - 1));
  let clock = GIVES;
  for (let k = 0; k < SHOVES; k++) {
    SHOVE_AT[k] = clock;
    clock += (BORE_MS * lerp(1.35, 0.65, k / (SHOVES - 1))) / sum;
  }
}
// the lock's side LOCK_R px off its middle, bored BORE_IN px in by the end
const LOCK_R = 110;
const BORE_IN = LOCK_R * 1.1;
const KICK_PUSH = 26;
const JUDDER: [number, number] = [12, 5];
const KICK_JUDDER = 7;
// punching clean through to PUNCH_X, then the bare shaft yanked back out
const PUNCH_MS = 80;
const PUNCH_X = LOCK_R + 90;
const RETRACT_MS = 200;
const RETRACT = 900;
const STREAK_MS = 45;
// the sparks and diamond dust gushing out of the hole
const SPRAY = 100;
const SPRAY_BORING: [number, number] = [0.9, 1.6];
const SPRAY_KICK = 0.5;
const SPRAY_FADE_MS = 300;
const DUST = 90;
const DUST_MS = 700;
const DUST_SPEED: [number, number] = [0.35, 1.1];
const DUST_FALL = 0.0011;
const DUST_TILT: [number, number] = [0.1, 1.4];
const DUST_R: [number, number] = [8, 18];
const GLOW_ALPHA: [number, number] = [0.25, 0.8];
const HEAT_FADE_MS = 200;
// cracks spidering out of the lock, one more each shove after the first
const CRACKS = SHOVES - 1;
const CRACK_POINTS = 5;
const CRACK_MS = 90;
const CRACK_REACH = LOCK_R * 1.45;
// the lock shattering
const THROUGH_BLAST = 360;
const SHARDS = 22;
const SHARD_MS = 480;
const SHARD_SPEED: [number, number] = [0.9, 2];
const SHARD_FALL = 0.0016;
// the diamond tip popping free and flying onto the new floor's button
const POP_AT = THROUGH + PUNCH_MS;
const FLY_MS = 230;
const LAND_AT = POP_AT + FLY_MS;
const FLY_ARC = 170;
const FLY_SPIN = 0.03;
const FLY_POP = 1.45;
const FLY_END = 0.55;
const LAND_BLAST = 170;
const GLINT_MS = 300;
// shakes by step: a bite or shove, the breakthrough, the diamond landing
const SHAKES = [0.9, 3.6, 1.4];

const GOLD = glowStops(COLOR.heavenlyGold);
const WHITE = glowStops(COLOR.white);
const KERF_GOLD = "#ffb02e";

// the bit: a diamond CROWN px from its tip to its table, on a fluted shaft
const CROWN = 110;
const GIRDLE = 70;
const GIRDLE_H = 62;
const TABLE_H = 38;
const SHAFT_LEN = 560;
const SHAFT_H = 40;
const COLLAR = 80;
const COLLAR_H = 76;
const SHAFT_W = COLLAR + SHAFT_LEN;
const FLUTE = 46;
const FRAMES = 4;
// ms a turn of the flutes shows, cruising and grinding
const SPIN_MS: [number, number] = [34, 14];
const DIA_X = CROWN + 6;
const DIA_Y = GIRDLE_H + 6;
const STAR = 70;
const SHARD_HALF = 22;

// sprites, built on first use
let shafts: HTMLCanvasElement[] | null = null;
let diamondCanvas: HTMLCanvasElement | null = null;
let starCanvas: HTMLCanvasElement | null = null;
let shardCanvas: HTMLCanvasElement | null = null;

function shaftSprites(): HTMLCanvasElement[] {
  if (shafts) return shafts;
  const frames: HTMLCanvasElement[] = [];
  for (let f = 0; f < FRAMES; f++) {
    const c = document.createElement("canvas");
    c.width = SHAFT_W;
    c.height = COLLAR_H + 8;
    const g = c.getContext("2d")!;
    const mid = c.height / 2;
    const top = mid - SHAFT_H / 2;
    const collar = g.createLinearGradient(
      0,
      mid - COLLAR_H / 2,
      0,
      mid + COLLAR_H / 2,
    );
    collar.addColorStop(0, "#e9eef6");
    collar.addColorStop(0.4, "#8d99ab");
    collar.addColorStop(1, "#2f3846");
    g.fillStyle = collar;
    g.fillRect(2, mid - COLLAR_H / 2, COLLAR - 2, COLLAR_H);
    g.lineWidth = 4;
    g.strokeStyle = "#1b2230";
    g.strokeRect(2, mid - COLLAR_H / 2, COLLAR - 2, COLLAR_H);
    const steel = g.createLinearGradient(0, top, 0, top + SHAFT_H);
    steel.addColorStop(0, "#f4f8ff");
    steel.addColorStop(0.35, "#b7c4d6");
    steel.addColorStop(1, "#4a5568");
    g.fillStyle = steel;
    g.fillRect(COLLAR, top, SHAFT_LEN, SHAFT_H);
    // the flutes, shifted a quarter step a frame so they run on as it spins
    g.save();
    g.beginPath();
    g.rect(COLLAR, top, SHAFT_LEN, SHAFT_H);
    g.clip();
    g.fillStyle = "#2b3444";
    const slant = SHAFT_H * 0.6;
    for (
      let x = COLLAR - FLUTE + (f * FLUTE) / FRAMES;
      x < SHAFT_W + slant;
      x += FLUTE
    ) {
      g.beginPath();
      g.moveTo(x, top);
      g.lineTo(x + FLUTE * 0.35, top);
      g.lineTo(x + FLUTE * 0.35 - slant, top + SHAFT_H);
      g.lineTo(x - slant, top + SHAFT_H);
      g.closePath();
      g.fill();
    }
    g.restore();
    g.strokeRect(COLLAR, top, SHAFT_LEN, SHAFT_H);
    g.lineWidth = 3;
    g.strokeStyle = COLOR.heavenlyGold;
    g.beginPath();
    g.moveTo(COLLAR, top + 5);
    g.lineTo(SHAFT_W, top + 5);
    g.stroke();
    frames.push(c);
  }
  shafts = frames;
  return frames;
}

// the diamond side on, its tip at the sprite's (DIA_X, DIA_Y) pointing right
function diamondSprite(): HTMLCanvasElement {
  if (diamondCanvas) return diamondCanvas;
  const c = document.createElement("canvas");
  c.width = DIA_X + 8;
  c.height = DIA_Y * 2;
  const g = c.getContext("2d")!;
  g.translate(DIA_X, DIA_Y);
  const ys = [-GIRDLE_H, -GIRDLE_H * 0.5, 0, GIRDLE_H * 0.5, GIRDLE_H];
  const pavilion = ["#e9fbff", "#7fd4f5", "#c4efff", "#4fb6e6"];
  const crown = ["#ffffff", "#a9e6ff", "#dff7ff", "#6cc6ee"];
  const k = TABLE_H / GIRDLE_H;
  for (let i = 0; i < 4; i++) {
    g.fillStyle = pavilion[i];
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(-GIRDLE, ys[i]);
    g.lineTo(-GIRDLE, ys[i + 1]);
    g.closePath();
    g.fill();
    g.fillStyle = crown[i];
    g.beginPath();
    g.moveTo(-GIRDLE, ys[i]);
    g.lineTo(-GIRDLE, ys[i + 1]);
    g.lineTo(-CROWN, ys[i + 1] * k);
    g.lineTo(-CROWN, ys[i] * k);
    g.closePath();
    g.fill();
  }
  g.lineWidth = 2;
  g.strokeStyle = "rgba(255,255,255,0.9)";
  g.beginPath();
  for (let i = 1; i < 4; i++) {
    g.moveTo(0, 0);
    g.lineTo(-GIRDLE, ys[i]);
    g.lineTo(-CROWN, ys[i] * k);
  }
  g.moveTo(-GIRDLE, -GIRDLE_H);
  g.lineTo(-GIRDLE, GIRDLE_H);
  g.stroke();
  g.lineWidth = 5;
  g.lineJoin = "round";
  g.strokeStyle = "#0d3b5e";
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(-GIRDLE, -GIRDLE_H);
  g.lineTo(-CROWN, -TABLE_H);
  g.lineTo(-CROWN, TABLE_H);
  g.lineTo(-GIRDLE, GIRDLE_H);
  g.closePath();
  g.stroke();
  diamondCanvas = c;
  return c;
}

// a four-pointed glint in a soft halo
function starSprite(): HTMLCanvasElement {
  if (starCanvas) return starCanvas;
  const c = document.createElement("canvas");
  c.width = c.height = STAR * 2;
  const g = c.getContext("2d")!;
  g.translate(STAR, STAR);
  const halo = g.createRadialGradient(0, 0, 0, 0, 0, STAR * 0.55);
  halo.addColorStop(0, "rgba(255,255,255,0.9)");
  halo.addColorStop(0.4, "rgba(180,235,255,0.35)");
  halo.addColorStop(1, "rgba(180,235,255,0)");
  g.fillStyle = halo;
  g.fillRect(-STAR, -STAR, STAR * 2, STAR * 2);
  const w = STAR * 0.1;
  g.fillStyle = COLOR.white;
  g.beginPath();
  g.moveTo(0, -STAR);
  g.lineTo(w, -w);
  g.lineTo(STAR, 0);
  g.lineTo(w, w);
  g.lineTo(0, STAR);
  g.lineTo(-w, w);
  g.lineTo(-STAR, 0);
  g.lineTo(-w, -w);
  g.closePath();
  g.fill();
  starCanvas = c;
  return c;
}

// a white-hot chip of the shattered lock
function shardSprite(): HTMLCanvasElement {
  if (shardCanvas) return shardCanvas;
  const c = document.createElement("canvas");
  c.width = c.height = SHARD_HALF * 2;
  const g = c.getContext("2d")!;
  g.translate(SHARD_HALF, SHARD_HALF);
  const fill = g.createLinearGradient(-16, -12, 12, 16);
  fill.addColorStop(0, COLOR.white);
  fill.addColorStop(0.5, COLOR.heavenlyGold);
  fill.addColorStop(1, "#ff7a1a");
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(-16, -12);
  g.lineTo(18, -4);
  g.lineTo(-6, 16);
  g.closePath();
  g.fill();
  g.lineWidth = 3;
  g.lineJoin = "round";
  g.strokeStyle = "#5a2a08";
  g.stroke();
  shardCanvas = c;
  return c;
}

// the cracks, CRACK_POINTS a crack from near the lock's middle outwards
const CRACK_X = new Float64Array(CRACKS * CRACK_POINTS);
const CRACK_Y = new Float64Array(CRACKS * CRACK_POINTS);
for (let k = 0; k < CRACKS; k++) {
  const base = (k + holeHash(k, 3) * 0.6) * ((Math.PI * 2) / CRACKS);
  for (let j = 0; j < CRACK_POINTS; j++) {
    const radius = lerp(LOCK_R * 0.18, CRACK_REACH, j / (CRACK_POINTS - 1));
    const a = base + (holeHash(k * 7 + j, 11) - 0.5) * 0.55;
    CRACK_X[k * CRACK_POINTS + j] = Math.cos(a) * radius;
    CRACK_Y[k * CRACK_POINTS + j] = Math.sin(a) * radius;
  }
}
// the shards: heading, px per ms, spin and size
const SHARD_A = new Float64Array(SHARDS);
const SHARD_V = new Float64Array(SHARDS);
const SHARD_SPIN = new Float64Array(SHARDS);
const SHARD_S = new Float64Array(SHARDS);
for (let k = 0; k < SHARDS; k++) {
  SHARD_A[k] = (k / SHARDS) * Math.PI * 2 + (holeHash(k, 17) - 0.5) * 0.4;
  SHARD_V[k] = lerp(SHARD_SPEED[0], SHARD_SPEED[1], holeHash(k, 19));
  SHARD_SPIN[k] = (holeHash(k, 23) - 0.5) * 0.05;
  SHARD_S[k] = lerp(0.8, 1.7, holeHash(k, 29));
}

// how far it has bored, 0 at the bite to 1 through
function depthAt(ms: number): number {
  let d = 0;
  for (let k = 0; k < SHOVES; k++) {
    const since = ms - SHOVE_AT[k];
    if (since < 0) break;
    d += Math.min(1, since / SHOVE_MS) ** 0.5;
  }
  return d / SHOVES;
}

// 1 on a shove, dying out over KICK_MS
function kickAt(ms: number): number {
  let last = -1;
  for (let k = 0; k < SHOVES; k++) if (SHOVE_AT[k] <= ms) last = k;
  if (last < 0 || ms >= THROUGH) return 0;
  return Math.max(0, 1 - (ms - SHOVE_AT[last]) / KICK_MS);
}

// the bit's tip at ms into out, returning the way it points (NaN off stage)
function tipAt(ms: number, out: Point): number {
  if (ms < ARC_MS) return NaN;
  if (ms < BITE) {
    const u = (ms - ARC_MS) / SWING_MS;
    const p = u * u;
    out.x = lerp(SWING_FROM.x, -LOCK_R, p);
    out.y = lerp(SWING_FROM.y, 0, p);
    return SWING_TURN * (1 - p);
  }
  out.y = 0;
  if (ms < THROUGH) {
    out.x = -LOCK_R + BORE_IN * depthAt(ms) + KICK_PUSH * kickAt(ms);
    return 0;
  }
  if (ms < POP_AT) {
    const u = (ms - THROUGH) / PUNCH_MS;
    out.x = lerp(-LOCK_R + BORE_IN, PUNCH_X, 1 - (1 - u) ** 2);
    return 0;
  }
  const u = (ms - POP_AT) / RETRACT_MS;
  if (u >= 1) return NaN;
  out.x = PUNCH_X - RETRACT * u * u;
  return 0;
}

function drawCracks(
  ctx: CanvasRenderingContext2D,
  ms: number,
  alpha: number,
): void {
  if (alpha <= 0) return;
  ctx.beginPath();
  let any = false;
  for (let k = 0; k < CRACKS; k++) {
    const since = ms - SHOVE_AT[k + 1];
    if (since < 0) break;
    const grow = Math.min(1, since / CRACK_MS) * (CRACK_POINTS - 1);
    const base = k * CRACK_POINTS;
    ctx.moveTo(CRACK_X[base], CRACK_Y[base]);
    for (let j = 1; j < CRACK_POINTS; j++) {
      const part = grow - (j - 1);
      if (part <= 0) break;
      const f = Math.min(1, part);
      ctx.lineTo(
        lerp(CRACK_X[base + j - 1], CRACK_X[base + j], f),
        lerp(CRACK_Y[base + j - 1], CRACK_Y[base + j], f),
      );
    }
    any = true;
  }
  if (!any) return;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 9;
  ctx.strokeStyle = KERF_GOLD;
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = COLOR.white;
  ctx.stroke();
}

// glittering diamond dust flung out of both sides of the hole at FACE
function drawDust(
  ctx: CanvasRenderingContext2D,
  since: number,
  intensity: number,
  now: number,
): void {
  if (since < 0 || intensity <= 0) return;
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  beginLightBatch(ctx);
  for (let side = -1; side <= 1; side += 2)
    for (let i = 0; i < DUST; i++) {
      const seed = i + (side > 0 ? 1300 : 1700);
      const clock = since + hash01(seed, 5) * DUST_MS;
      const life = Math.floor(clock / DUST_MS);
      const t = clock % DUST_MS;
      if (life === 0 && t > since) continue;
      if (hash01(seed, life) > intensity) continue;
      const a =
        side *
        (Math.PI / 2 + lerp(DUST_TILT[0], DUST_TILT[1], hash01(life, seed)));
      const speed =
        lerp(DUST_SPEED[0], DUST_SPEED[1], hash01(seed, life + 9)) *
        (0.7 + 0.3 * Math.min(1.5, intensity));
      const x = FACE.x + Math.cos(a) * speed * t;
      const y = FACE.y + Math.sin(a) * speed * t + 0.5 * DUST_FALL * t * t;
      drawGlitterLight(
        ctx,
        x,
        y,
        lerp(DUST_R[0], DUST_R[1], hash01(seed, 2)),
        seed,
        1 - t / DUST_MS,
        now,
      );
    }
  endLightBatch(ctx);
  ctx.globalCompositeOperation = previous;
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  turn: number,
  alpha: number,
): void {
  if (alpha <= 0 || scale <= 0) return;
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(turn);
  ctx.scale(scale, scale);
  ctx.drawImage(starSprite(), -STAR, -STAR);
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = previous;
}

// the opened floor's button, from the lock's middle
const BUTTON: Point = { x: 0, y: 0 };
const ORIGIN: Point = { x: 0, y: 0 };
const FACE: Point = { x: -LOCK_R + 8, y: 0 };
const TIP: Point = { x: 0, y: 0 };
const TRAIL: Point = { x: 0, y: 0 };
const FLY: Point = { x: 0, y: 0 };
// the diamond from the punch-through onto the button, on one arch
const flyAt = (ms: number): Point | null => {
  if (ms < POP_AT || ms > LAND_AT) return null;
  const u = (ms - POP_AT) / FLY_MS;
  FLY.x = lerp(PUNCH_X, BUTTON.x, u);
  FLY.y = BUTTON.y * u - FLY_ARC * 4 * u * (1 - u);
  return FLY;
};

// each tap promoting the floor's lowest-tier cat that can still climb
const facetTaps = defineTapPerk("Facet", (t) => {
  const count = getRenderedWorkerCount(t.floor);
  let pick = -1;
  let weakest = 0;
  for (let i = 0; i < count; i++) {
    const tier = getWorkerPermaTier(t.floor, i);
    const weak = tier ? CRIT_TIER_ORDER.indexOf(tier) : CRIT_TIER_ORDER.length;
    if (weak > weakest) {
      weakest = weak;
      pick = i;
    }
  }
  if (pick < 0) return;
  promoteWorkerPermaTier(t.floor, pick);
  celebrateWorkerBoost(t.floor, pick, Date.now());
});

registerFloorCrit("diamondDrillCrit", {
  // the diamond set in the opened floor's button: its next taps polish cats
  reward(t) {
    facetTaps.add(t.floor, meta.values.taps);
    t.flipButton();
  },
  plan(_r, _bars, hit) {
    shaftSprites();
    diamondSprite();
    starSprite();
    shardSprite();
    const lock = getLockCenter();
    const btn = getButtonCenter(false);
    BUTTON.x = btn.x - lock.x;
    BUTTON.y = btn.y - lock.y;
    hit(0, BITE, 0);
    for (let k = 0; k < SHOVES; k++) hit(0, SHOVE_AT[k], 0);
    hit(0, THROUGH, 1);
    hit(0, LAND_AT, 2);
  },
  draw(ctx, r, ms, bars) {
    const c = bars[0];
    if (!c) return;
    const now = r.startedAt + ms;
    if (ms < ARC_MS) {
      const u = ms / ARC_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        c.x * p,
        c.y * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont * (1 - 0.5 * p),
      );
    }
    // rumbling all through the stall
    const due =
      ms < BITE
        ? 0
        : Math.min(
            STALL_MS / RUMBLE_MS,
            Math.floor((ms - BITE) / RUMBLE_MS) + 1,
          );
    while (r.kicked < due) {
      r.kicked++;
      r.shake(RUMBLE_SHAKE);
    }

    ctx.save();
    ctx.translate(c.x, c.y);
    const depth = depthAt(ms);
    const kick = kickAt(ms);
    const grinding = ms >= BITE && ms < THROUGH;
    let jx = 0;
    let jy = 0;
    if (grinding) {
      const amp = (ms < GIVES ? JUDDER[0] : JUDDER[1]) + KICK_JUDDER * kick;
      const tick = Math.floor(ms / 16);
      jx = (holeHash(tick, 7) - 0.5) * amp;
      jy = (holeHash(tick, 13) - 0.5) * 2 * amp;
    }

    // the lock glowing hotter as it bores in, flaring each shove, cracking
    if (ms >= BITE && ms < THROUGH + HEAT_FADE_MS) {
      const fade = 1 - clamp01((ms - THROUGH) / HEAT_FADE_MS);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha =
        fade *
        Math.min(1, lerp(GLOW_ALPHA[0], GLOW_ALPHA[1], depth) + 0.3 * kick);
      drawGlow(ctx, GOLD, 0, 0, LOCK_R * (1.4 + 1.2 * depth));
      if (kick > 0) {
        ctx.globalAlpha = fade * kick * 0.85;
        drawGlow(ctx, WHITE, FACE.x + BORE_IN * depth, 0, LOCK_R * 0.9);
      }
      drawCracks(ctx, ms, fade);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }

    // the bit: a streak behind it as it swings in, a hot aura round its tip
    const angle = tipAt(ms, TIP);
    if (!Number.isNaN(angle)) {
      const tx = TIP.x + jx;
      const ty = TIP.y + jy;
      const leaving = ms >= POP_AT;
      if (ms < BITE) {
        if (Number.isNaN(tipAt(ms - STREAK_MS, TRAIL))) {
          TRAIL.x = SWING_FROM.x;
          TRAIL.y = SWING_FROM.y;
        }
        drawBeam(ctx, TRAIL, TIP, 50, 0.8);
      }
      if (!leaving) {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = Math.min(1, 0.55 + 0.45 * kick + 0.3 * depth);
        drawGlow(ctx, GOLD, tx - GIRDLE * 0.5, ty, 120 + 70 * kick);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
      const frames = shaftSprites();
      const shaft =
        frames[Math.floor(ms / (grinding ? SPIN_MS[1] : SPIN_MS[0])) % FRAMES];
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(angle);
      ctx.globalAlpha = leaving ? 1 - clamp01((ms - POP_AT) / RETRACT_MS) : 1;
      ctx.drawImage(shaft, -CROWN - SHAFT_W + 6, -shaft.height / 2);
      if (!leaving) ctx.drawImage(diamondSprite(), -DIA_X, -DIA_Y);
      ctx.restore();
      ctx.globalAlpha = 1;
      // the diamond glinting, flaring with each shove
      if (!leaving)
        drawStar(
          ctx,
          tx - GIRDLE * 0.7,
          ty - GIRDLE_H * 0.35,
          0.55 + 0.75 * kick + 0.15 * Math.sin(now * 0.02),
          now * 0.004,
          1,
        );
    }

    // sparks and diamond dust gushing out both sides, surging each shove
    if (ms >= BITE && ms < THROUGH + SPRAY_FADE_MS) {
      const out = 1 - clamp01((ms - THROUGH) / SPRAY_FADE_MS);
      const hard =
        (ms < GIVES
          ? 1
          : lerp(SPRAY_BORING[0], SPRAY_BORING[1], depth) *
            (1 + SPRAY_KICK * kick)) * out;
      drawDrillSpray(ctx, FACE, 0, ms - BITE, hard, SPRAY, now);
      drawDust(ctx, ms - BITE, hard, now);
    }

    // through: the lock shattering, its chips flung out in the blast
    drawDetonation(ctx, ORIGIN, ms - THROUGH, THROUGH_BLAST, now);
    const shattered = ms - THROUGH;
    if (shattered >= 0 && shattered < SHARD_MS) {
      const chip = shardSprite();
      ctx.globalAlpha = 1 - shattered / SHARD_MS;
      for (let k = 0; k < SHARDS; k++) {
        const d = SHARD_V[k] * shattered;
        ctx.save();
        ctx.translate(
          Math.cos(SHARD_A[k]) * d,
          Math.sin(SHARD_A[k]) * d + 0.5 * SHARD_FALL * shattered * shattered,
        );
        ctx.rotate(k + SHARD_SPIN[k] * shattered);
        ctx.scale(SHARD_S[k], SHARD_S[k]);
        ctx.drawImage(chip, -SHARD_HALF, -SHARD_HALF);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    // the diamond tip popping free and spinning onto the button, glinting
    drawWispBetween(ctx, flyAt, ms, now, WISP_SIZE * 1.3, 1, POP_AT, LAND_AT);
    const at = flyAt(ms);
    if (at) {
      const u = (ms - POP_AT) / FLY_MS;
      const size =
        u < 0.3
          ? lerp(1, FLY_POP, u / 0.3)
          : lerp(FLY_POP, FLY_END, ((u - 0.3) / 0.7) ** 2);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.8;
      drawGlow(ctx, GOLD, at.x, at.y, 120 * size);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.save();
      ctx.translate(at.x, at.y);
      ctx.rotate(ms * FLY_SPIN);
      ctx.scale(size, size);
      ctx.drawImage(diamondSprite(), -DIA_X + CROWN / 2, -DIA_Y);
      ctx.restore();
      drawStar(ctx, at.x, at.y, 1.1 * size, -ms * 0.006, 1);
    }
    drawDetonation(ctx, BUTTON, ms - LAND_AT, LAND_BLAST, now);
    const glint = ms - LAND_AT;
    if (glint >= 0 && glint < GLINT_MS) {
      const g = glint / GLINT_MS;
      drawStar(ctx, BUTTON.x, BUTTON.y, 2.2 * (1 - 0.5 * g), g * 1.2, 1 - g);
    }
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
