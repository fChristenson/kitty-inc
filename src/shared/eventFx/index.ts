// shared "power-up" effects around a freeze event's coin-stream target: a glow
// with spinning light rays that builds with the stream's progress, a ring +
// sparkles per landing beat, a size bump on each beat, and a white burst as
// the stream finishes. Each run owns one EventFx, calls hit() as its coins
// land, and draws it (after its coins, so they sink into the target) each frame
import { COLOR } from "../../palette";
import { createAbsorbPulse } from "../mergeFlash";
import { LONG_PRESS_TICK_MS } from "../pressAndHold";
import { drawLightRays } from "../lightRays";
import { fadeStops, glowSprite } from "../glowSprite";
import { hash01, stampGlimmer } from "../twinkle";
import { beginLightBatch, endLightBatch } from "../lightBatch";
import { processWhenIdle } from "../idle";

const BEAT_MS = LONG_PRESS_TICK_MS * 4;
const RING_MS = 420;
const RING_RADIUS: [number, number] = [20, 150];
const SPARKLE_MS = 520;
const SPARKLES_PER_BEAT = 4;
const GLOW_RADIUS: [number, number] = [90, 320];
const FINALE_START = 0.9; // stream progress the climax starts at
// a gap between landings longer than this counts as the player having let go
const PRESS_CREDIT_MS = 250;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

// the target's suspense: a wiggle that speeds up and widens, a white pulse
// that brightens, a swell and a rising shake, all spiking at the climax
const WIGGLE_HZ: [number, number] = [4, 18];
const WIGGLE_DEG: [number, number] = [2, 14];
const WHITE_PEAK = 0.6;
const SWELL = 0.18;
const SHAKE_PX = 7;
const CLIMAX_SCALE = 0.35;

export interface StreamTension {
  white: number; // 0..1 white wash for the target
  rotation: number;
  scale: number;
  shakeX: number;
  shakeY: number;
}

const REST: StreamTension = {
  white: 0,
  rotation: 0,
  scale: 1,
  shakeX: 0,
  shakeY: 0,
};

const wiggleHz = (p: number) =>
  WIGGLE_HZ[0] + (WIGGLE_HZ[1] - WIGGLE_HZ[0]) * p;

// the suspense at build-up p (0..1) with the wiggle at `phase`, s seconds in
function tensionAt(p: number, phase: number, s: number): StreamTension {
  const k = p * p;
  const degrees = WIGGLE_DEG[0] + (WIGGLE_DEG[1] - WIGGLE_DEG[0]) * k;
  const climax =
    p > FINALE_START
      ? Math.sin((Math.PI * (p - FINALE_START)) / (1 - FINALE_START))
      : 0;
  const wave = 0.5 + 0.5 * Math.sin(phase * 1.5);
  const shake = SHAKE_PX * k;
  return {
    white: Math.min(
      0.95,
      (0.25 + 0.75 * k) * WHITE_PEAK * (0.45 + 0.55 * wave) + climax * 0.5,
    ),
    rotation: ((Math.sin(phase) * degrees) / 180) * Math.PI,
    scale: 1 + SWELL * k + CLIMAX_SCALE * climax,
    shakeX: Math.sin(s * 83 + 1.3) * shake,
    shakeY: Math.cos(s * 67) * shake,
  };
}

function getStreamTension(
  elapsedMs: number,
  durationMs: number,
): StreamTension {
  if (elapsedMs >= durationMs) return REST;
  const p = Math.min(1, Math.max(0, elapsedMs / durationMs));
  const s = Math.max(0, elapsedMs) / 1000;
  // integrated so the rising frequency never jumps the wiggle's phase
  const phase = 2 * Math.PI * s * ((WIGGLE_HZ[0] + wiggleHz(p)) / 2);
  return tensionAt(p, phase, s);
}

interface Sparkle {
  at: number;
  angle: number;
  distance: number;
  size: number;
}

export interface EventFx {
  // a coin landing in the target; landings within one beat share its ring
  hit(now: number): void;
  // the target's suspense right now (see getStreamTension)
  tension(now: number): StreamTension;
  // 0..1 through the stream
  progress(now: number): number;
  // everything around (x, y) for stream progress 0..1, with drawTarget (if
  // any) painted between the glow and the sparkles with the current tension,
  // swelling and shaking with it and bumped on each beat
  draw(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    drawTarget?: (tension: StreamTension) => void,
  ): void;
}

// streams flying into a target the target draws itself (the total-income
// readout, a floor's income bar), keyed by owner + part, latest last. The
// target reads the latest one's tension, and draws its glow unless an overlay does
const targetStreams: {
  owner: object;
  part: string;
  fx: EventFx;
  drawnByTarget: boolean;
}[] = [];

export function addTargetStream(
  owner: object,
  part: string,
  fx: EventFx,
  drawnByTarget: boolean,
): void {
  targetStreams.push({ owner, part, fx, drawnByTarget });
}

export function removeTargetStream(fx: EventFx): void {
  const at = targetStreams.findIndex((stream) => stream.fx === fx);
  if (at !== -1) targetStreams.splice(at, 1);
}

function latestStream(owner: object, part: string) {
  for (let i = targetStreams.length - 1; i >= 0; i--) {
    const stream = targetStreams[i];
    if (stream.owner === owner && stream.part === part) return stream;
  }
  return null;
}

export function getTargetTension(
  owner: object,
  part: string,
): StreamTension | null {
  return latestStream(owner, part)?.fx.tension(performance.now()) ?? null;
}

// a coin landing in the target
export function hitTargetStream(owner: object, part: string): void {
  latestStream(owner, part)?.fx.hit(performance.now());
}

// the latest stream's effects around the target at (x, y), with drawTarget
// painted in between like every other stream target; false without a stream
export function drawTargetStream(
  ctx: CanvasRenderingContext2D,
  owner: object,
  part: string,
  x: number,
  y: number,
  drawTarget: () => void,
): boolean {
  const stream = latestStream(owner, part);
  if (!stream?.drawnByTarget) return false;
  stream.fx.draw(ctx, x, y, drawTarget);
  return true;
}

// durationMs is the stream's, timed from this call. A pressed stream (a manual
// event's) builds only while its coins keep landing, reaching the same peak as
// a timed one after durationMs of pressing, and holds its level in between
export function createEventFx(
  durationMs: number,
  pressed = false,
  // a pressed event that ends on a goal rather than a clock builds with it (0..1)
  buildUp?: () => number,
): EventFx {
  const startedAt = performance.now();
  const pulse = createAbsorbPulse();
  const rings: number[] = [];
  const sparkles: Sparkle[] = [];
  let beatAt = -Infinity;
  let pressedMs = 0;
  let lastHitAt = -Infinity;
  // once pressed far enough the climax plays out on its own
  let finaleAt: number | null = null;
  let phase = 0;
  let lastTensionAt = startedAt;

  function drawBehind(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    progress: number,
    now: number,
  ): void {
    const glowRadius =
      GLOW_RADIUS[0] + (GLOW_RADIUS[1] - GLOW_RADIUS[0]) * progress;
    drawLightRays(ctx, x, y, glowRadius, progress, now);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    while (rings.length > 0 && now - rings[0] >= RING_MS) rings.shift();
    for (const at of rings) {
      const t = (now - at) / RING_MS;
      const eased = 1 - (1 - t) ** 3;
      const radius = RING_RADIUS[0] + (RING_RADIUS[1] - RING_RADIUS[0]) * eased;
      const width = 6 * (1 - t) + 1;
      stampLight(
        ctx,
        ringSprite(width / radius, COLOR.coinGold),
        x,
        y,
        radius + width / 2,
        (1 - t) * 0.9,
      );
    }
    ctx.restore();
  }

  function drawFront(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    progress: number,
    now: number,
  ): void {
    ctx.save();
    while (sparkles.length > 0 && now - sparkles[0].at >= SPARKLE_MS)
      sparkles.shift();
    ctx.fillStyle = COLOR.white;
    for (const s of sparkles) {
      const t = (now - s.at) / SPARKLE_MS;
      const out = 1 - (1 - t) ** 2;
      drawStar(
        ctx,
        x + Math.cos(s.angle) * s.distance * out,
        y + Math.sin(s.angle) * s.distance * out,
        s.size * Math.sin(Math.PI * t),
        s.angle + t * 3,
      );
    }

    if (progress > FINALE_START)
      drawWhiteBurst(
        ctx,
        x,
        y,
        Math.min(1, (progress - FINALE_START) / (1 - FINALE_START)),
      );
    ctx.restore();
  }

  return {
    hit(now) {
      if (pressed && finaleAt === null) {
        pressedMs += clamp(now - lastHitAt, 0, PRESS_CREDIT_MS);
        lastHitAt = now;
        if (pressedMs >= durationMs * FINALE_START) finaleAt = now;
      }
      pulse.hit(now);
      if (now - beatAt < BEAT_MS) return;
      beatAt = now;
      rings.push(now);
      for (let i = 0; i < SPARKLES_PER_BEAT; i++)
        sparkles.push({
          at: now,
          angle: Math.random() * Math.PI * 2,
          distance: 40 + Math.random() * 60,
          size: 4 + Math.random() * 5,
        });
    },

    tension(now) {
      if (!pressed) return getStreamTension(now - startedAt, durationMs);
      const p = Math.min(1, this.progress(now));
      // integrated so a changing build-up never jumps the wiggle's phase
      phase +=
        (2 * Math.PI * wiggleHz(p) * clamp(now - lastTensionAt, 0, 100)) / 1000;
      lastTensionAt = now;
      return tensionAt(p, phase, (now - startedAt) / 1000);
    },

    progress(now) {
      if (!pressed) return (now - startedAt) / durationMs;
      if (buildUp) return clamp(buildUp(), 0, 1);
      return finaleAt === null
        ? pressedMs / durationMs
        : FINALE_START + (now - finaleAt) / durationMs;
    },

    draw(ctx, x, y, drawTarget) {
      const now = performance.now();
      const p = Math.min(1, Math.max(0, this.progress(now)));
      drawBehind(ctx, x, y, p, now);
      if (drawTarget) {
        const t = this.tension(now);
        const s = pulse.scale(now) * t.scale;
        ctx.save();
        ctx.translate(x + t.shakeX, y + t.shakeY);
        ctx.scale(s, s);
        ctx.translate(-x, -y);
        drawTarget(t);
        ctx.restore();
      }
      drawFront(ctx, x, y, p, now);
    },
  };
}

// a white glow fading out to its edge, stamped instead of a gradient per burst
const FLASH_STOPS = fadeStops(COLOR.white);
const flashSprite = () => glowSprite(FLASH_STOPS);

// the shockwave ring baked at a few thicknesses (line width over radius), so
// a burst stamps the nearest instead of stroking an arc every frame
const RING_SPRITE = 512;
const RING_RATIOS = [0.008, 0.015, 0.03, 0.06, 0.12, 0.25, 0.5];
const ringSprites = new Map<string, HTMLCanvasElement[]>();
function ringSprite(
  ratio: number,
  color: string = COLOR.white,
): HTMLCanvasElement {
  let k = 0;
  while (
    k < RING_RATIOS.length - 1 &&
    ratio > Math.sqrt(RING_RATIOS[k] * RING_RATIOS[k + 1])
  )
    k++;
  let byRatio = ringSprites.get(color);
  if (!byRatio) ringSprites.set(color, (byRatio = []));
  let sprite = byRatio[k];
  if (sprite) return sprite;
  sprite = document.createElement("canvas");
  sprite.width = sprite.height = RING_SPRITE;
  const c = sprite.getContext("2d")!;
  const half = RING_SPRITE / 2;
  // outer edge at the sprite's edge: radius + width / 2 = half
  const r = half / (1 + RING_RATIOS[k] / 2);
  c.strokeStyle = color;
  c.lineWidth = r * RING_RATIOS[k];
  c.beginPath();
  c.arc(half, half, r, 0, Math.PI * 2);
  c.stroke();
  byRatio[k] = sprite;
  return sprite;
}
processWhenIdle(RING_RATIOS, (ratio) => ringSprite(ratio));

// a big soft stamp: drawn straight, never queued, since a light batch's cost
// grows with the area it covers
function stampLight(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  half: number,
  alpha: number,
): void {
  ctx.globalAlpha = alpha;
  ctx.drawImage(sprite, x - half, y - half, half * 2, half * 2);
}

// a white flash and shockwave ring bursting out of (x, y), t 0..1 through it;
// the stream's climax, and scaled down for smaller impacts
export function drawWhiteBurst(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  t: number,
  scale = 1,
): void {
  if (t <= 0 || t >= 1) return;
  const previous = ctx.globalCompositeOperation;
  const alpha = ctx.globalAlpha;
  ctx.globalCompositeOperation = "lighter";
  const radius = (60 + 440 * t) * scale;
  stampLight(ctx, flashSprite(), x, y, radius, Math.sin(Math.PI * t) * 0.95);
  const ring = (30 + 520 * (1 - (1 - t) ** 3)) * scale;
  const width = (18 * (1 - t) + 2) * Math.sqrt(scale);
  stampLight(ctx, ringSprite(width / ring), x, y, ring + width / 2, 1 - t);
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = previous;
}

const EXPLOSION_BURST_MS = 500;
const EXPLOSION_SPARK_MS = 800;
const EXPLOSION_SPARKS = 28;
// a barrage stacks dozens of blasts at once; past these in one frame their
// white flashes and sparks (all additive, so long since saturated) thin out.
// Blasts of at least BIG_SCALE, a barrage's climax, always draw in full
const FRAME_FLASHES = 10;
const FRAME_SPARKS = 300;
const THINNED_SPARKS = 7;
const BIG_SCALE = 2.5;
let budgetFrame = NaN;
let flashesLeft = FRAME_FLASHES;
let sparksLeft = FRAME_SPARKS;

// an impact ms ago at (x, y): a white burst of `scale`, and glimmer sparks of
// up to sparkSize flung out to `reach`, slowing and fading
export function drawExplosion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ms: number,
  now: number,
  scale: number,
  reach: number,
  sparkSize: number,
): void {
  // every blast of one frame shares its `now`
  if (now !== budgetFrame) {
    budgetFrame = now;
    flashesLeft = FRAME_FLASHES;
    sparksLeft = FRAME_SPARKS;
  }
  const big = scale >= BIG_SCALE;
  const burst = ms / EXPLOSION_BURST_MS;
  if (burst > 0 && burst < 1 && (big || flashesLeft > 0)) {
    flashesLeft--;
    drawWhiteBurst(ctx, x, y, burst, scale);
  }
  const t = ms / EXPLOSION_SPARK_MS;
  if (t < 0 || t >= 1) return;
  // spread round the whole ring, however few are left
  const sparks =
    big || sparksLeft >= EXPLOSION_SPARKS ? EXPLOSION_SPARKS : THINNED_SPARKS;
  const stride = EXPLOSION_SPARKS / sparks;
  sparksLeft -= sparks;
  const out = 1 - (1 - t) ** 3;
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  beginLightBatch(ctx);
  for (let i = 0; i < EXPLOSION_SPARKS; i += stride) {
    const angle = ((i + hash01(i, 4) * 0.5) / EXPLOSION_SPARKS) * Math.PI * 2;
    const r = reach * (0.45 + 0.55 * hash01(i, 5)) * out;
    stampGlimmer(
      ctx,
      x + Math.cos(angle) * r,
      y + Math.sin(angle) * r,
      sparkSize * (0.5 + 0.5 * hash01(i, 6)) * (1 - t),
      now / 150 + i,
      COLOR.heavenlyGold,
    );
  }
  endLightBatch(ctx);
  ctx.globalCompositeOperation = previous;
}

// a four-point twinkle
function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number,
): void {
  if (size <= 0) return;
  const inner = size * 0.3;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? size : inner;
    const a = rotation + (i * Math.PI) / 4;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
}
