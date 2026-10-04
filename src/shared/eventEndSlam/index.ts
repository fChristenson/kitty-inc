// the "jackpot slam" a coin stream's target plays when its event ends: a quick
// crouch, a hop up, a hard slam down with a sideways jolt and springy squash,
// then a jelly pop over spinning gold rays, a white shine sweep, a sparkle and
// glitter. Every target draws it through drawSlamTarget so they all match.
// Targets are keyed by an owner object (a floor, or GLOBAL_SLAM for one-offs)
// plus a part name
import { COLOR } from "../../palette";
import { drawTwinkle } from "../twinkle";
import { drawGoldShimmer } from "../goldShimmer";
import { glowSprite, type FadeStops } from "../glowSprite";
import {
  createTextGlossyGradient,
  drawCartoonText,
  shadeColor,
} from "../../utils";
import { isDetachedJobRunning } from "../detachedJob";
import { holdExplosions, playSlamExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";

export const GLOBAL_SLAM = {};

export const SLAM_MS = 800;
const CROUCH_END = 0.12;
const APEX_AT = 0.3;
const LAND_AT = 0.42;
const HOP = 0.7; // of the target's height
const CROUCH = 0.22;
const STRETCH = 0.28;
const IMPACT_SQUASH = 0.5;
const JOLT = 0.12; // of the target's height
// the impact's screen shake; slams landing together share one
const IMPACT_SHAKE = 1.3;
const IMPACT_SHARE_MS = 150;
const FLASH_MS = 450;
// text targets: each letter hops as the shine band passes over it
const WAVE_MS = 280; // one letter's hop
const WAVE_HOP = 0.5; // of the text's height
const WAVE_SCALE = 0.15;
// and the whole text pops big and jiggles back, glowing, over spinning rays
const TEXT_FX_MS = 1100;
const TEXT_POP = 0.55;
const TEXT_POP_RISE_MS = 90;
// the same shine sweep as drawSlamShine, then a sparkle twinkles at the end
const SPARKLE_START_MS = FLASH_MS - 80;
const SPARKLE_MS = 1100;
const SPARKLE_IN = 0.12; // of SPARKLE_MS spent growing, and shrinking below
const SPARKLE_OUT = 0.2;
// then small twinkles glitter over the target, ever sparser, before it settles
const GLITTER_START_MS = SPARKLE_START_MS + 250;
const GLITTER_SPAN_MS = 1500;
const GLITTER_TWINKLE_MS = 450;
const GLITTER_COUNT = 26;
const GLITTER_SIZE = 0.5; // of the target's height, at most
const LINGER_MS = Math.max(
  FLASH_MS + WAVE_MS,
  TEXT_FX_MS,
  SPARKLE_START_MS + SPARKLE_MS,
  GLITTER_START_MS + GLITTER_SPAN_MS + GLITTER_TWINKLE_MS,
);

const slams = new WeakMap<object, Map<string, number>>();
let lastImpactAt = -Infinity;
// how long after triggerEventEndSlam the target hits down
export const SLAM_LAND_MS = SLAM_MS * LAND_AT;

// onStart runs as the jump starts (the notification it lands with); any
// explosion it plays is held so the bang comes on the impact instead
export function triggerEventEndSlam(
  owner: object,
  part: string,
  onStart?: () => void,
): void {
  let parts = slams.get(owner);
  if (!parts) slams.set(owner, (parts = new Map()));
  parts.set(part, Date.now());
  if (isDetachedJobRunning()) {
    onStart?.();
    return;
  }
  holdExplosions(SLAM_LAND_MS);
  onStart?.();
  // the stream ends on the impact: an explosion and a screen shake
  setTimeout(() => {
    const now = Date.now();
    if (now - lastImpactAt >= IMPACT_SHARE_MS) {
      lastImpactAt = now;
      playSlamExplosion();
      shakeScreen(IMPACT_SHAKE);
    }
  }, SLAM_LAND_MS);
}

export interface SlamPose {
  dy: number; // of the target's height, negative is up
  joltX: number; // of the target's height
  scaleX: number;
  scaleY: number;
  landedMs: number; // since the slam landed, negative while in the air
  seed: number; // differs per slam, so each one's glitter lands elsewhere
}

const easeOutQuad = (t: number) => 1 - (1 - t) ** 2;
const easeInOutSine = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);

// null once the slam is over (or never started): draw at rest
export function getSlamPose(
  owner: object,
  part: string,
  now: number,
): SlamPose | null {
  const startedAt = slams.get(owner)?.get(part);
  if (startedAt === undefined) return null;
  const elapsed = now - startedAt;
  const landedMs = elapsed - SLAM_MS * LAND_AT;
  if (elapsed < 0) return null;
  if (elapsed >= SLAM_MS && landedMs >= LINGER_MS) {
    slams.get(owner)?.delete(part);
    return null;
  }
  const t = Math.min(1, elapsed / SLAM_MS);
  const seed = startedAt;
  if (t < CROUCH_END) {
    const p = easeInOutSine(t / CROUCH_END);
    return {
      dy: 0,
      joltX: 0,
      scaleX: 1 + CROUCH * 0.7 * p,
      scaleY: 1 - CROUCH * p,
      landedMs,
      seed,
    };
  }
  if (t < LAND_AT) {
    // floats up, then drops faster than it rose
    const rising = t < APEX_AT;
    const p = rising
      ? easeOutQuad((t - CROUCH_END) / (APEX_AT - CROUCH_END))
      : 1 - ((t - APEX_AT) / (LAND_AT - APEX_AT)) ** 2;
    const stretch = STRETCH * (1 - p);
    return {
      dy: -HOP * p,
      joltX: 0,
      scaleX: 1 - stretch * 0.6,
      scaleY: 1 + stretch,
      landedMs,
      seed,
    };
  }
  const q = (t - LAND_AT) / (1 - LAND_AT);
  const decay = (1 - q) ** 2;
  const spring = Math.cos(q * Math.PI * 3) * decay;
  return {
    dy: 0,
    joltX: Math.sin(q * Math.PI * 7) * decay * JOLT,
    scaleX: 1 + IMPACT_SQUASH * 0.8 * spring,
    scaleY: 1 - IMPACT_SQUASH * spring,
    landedMs,
    seed,
  };
}

// hops/squashes whatever is drawn next around its feet at (footX, footY)
function applySlamPose(
  ctx: CanvasRenderingContext2D,
  pose: SlamPose,
  footX: number,
  footY: number,
  height: number,
): void {
  ctx.translate(footX + pose.joltX * height, footY + pose.dy * height);
  ctx.scale(pose.scaleX, pose.scaleY);
  ctx.translate(-footX, -footY);
}

function flashStrength(pose: SlamPose): number {
  if (pose.landedMs < 0 || pose.landedMs >= FLASH_MS) return 0;
  return 1 - pose.landedMs / FLASH_MS;
}

function textFxStrength(pose: SlamPose | null): number {
  if (!pose || pose.landedMs < 0 || pose.landedMs >= TEXT_FX_MS) return 0;
  return 1 - pose.landedMs / TEXT_FX_MS;
}

// jelly pop of a whole target around its center (cx, cy) after landing
function applySlamPop(
  ctx: CanvasRenderingContext2D,
  pose: SlamPose | null,
  cx: number,
  cy: number,
): void {
  const strength = textFxStrength(pose);
  if (strength <= 0) return;
  const p = 1 - strength;
  const rise = Math.min(1, pose!.landedMs / TEXT_POP_RISE_MS);
  const amp = TEXT_POP * rise * strength ** 2;
  const phase = p * Math.PI * 5;
  ctx.translate(cx, cy);
  ctx.scale(1 + amp * Math.cos(phase), 1 + amp * Math.cos(phase + 0.7));
  ctx.translate(-cx, -cy);
}

// gold glow and spinning light rays behind a target of width x height
function drawSlamLights(
  ctx: CanvasRenderingContext2D,
  pose: SlamPose | null,
  cx: number,
  cy: number,
  width: number,
  height: number,
  now: number,
): void {
  const strength = textFxStrength(pose);
  if (strength <= 0) return;
  const reach =
    Math.max(width * 0.75, height * 1.5) * (1 + 0.3 * (1 - strength));
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, Math.min(1, (height * 2.2) / reach));
  ctx.globalAlpha *= strength;
  drawGoldShimmer(ctx, 0, 0, reach, strength, 2.5, now, COLOR.coinSpriteGold);
  ctx.restore();
}

// 0..1..0: a letter's hop, peaking as the shine band (sweeping over FLASH_MS)
// crosses its center, `along` 0..1 of the band's path
function hopAt(pose: SlamPose, along: number): number {
  const t = (pose.landedMs - FLASH_MS * along) / WAVE_MS + 0.5;
  return t <= 0 || t >= 1 ? 0 : Math.sin(Math.PI * t);
}

// widest digit per font, so tabular text gives every digit the same cell
const digitWidths = new Map<string, number>();
function maxDigitWidth(ctx: CanvasRenderingContext2D): number {
  let width = digitWidths.get(ctx.font);
  if (width === undefined) {
    width = 0;
    for (let d = 0; d <= 9; d++)
      width = Math.max(width, measure(ctx, String(d)));
    digitWidths.set(ctx.font, width);
  }
  return width;
}

// measureText per frame for every letter adds up; widths only change with font
const textWidths = new Map<string, Map<string, number>>();
const TEXT_WIDTH_CACHE_LIMIT = 2000;
function measure(ctx: CanvasRenderingContext2D, text: string): number {
  let byText = textWidths.get(ctx.font);
  if (!byText) textWidths.set(ctx.font, (byText = new Map()));
  let width = byText.get(text);
  if (width === undefined) {
    if (byText.size >= TEXT_WIDTH_CACHE_LIMIT) byText.clear();
    width = ctx.measureText(text).width;
    byText.set(text, width);
  }
  return width;
}

const isDigit = (char: string): boolean => char >= "0" && char <= "9";

// tabular text at rest, every frame for counting numbers: laid out and drawn
// letter by letter without building any per-letter objects
function drawTabularText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fillColor: string,
  strokeColor: string,
  strokeWidth: number,
): void {
  const digitCell = maxDigitWidth(ctx);
  let fullWidth = 0;
  for (let i = 0; i < text.length; i++)
    fullWidth += isDigit(text[i]) ? digitCell : measure(ctx, text[i]);
  const align = ctx.textAlign;
  const left =
    align === "center"
      ? x - fullWidth / 2
      : align === "right" || align === "end"
        ? x - fullWidth
        : x;
  const m = ctx.getTransform();
  if (
    m.b === 0 &&
    m.c === 0 &&
    m.a > 0 &&
    m.a === m.d &&
    isFontReady(ctx.font)
  ) {
    const set = getRestGlyphSet(ctx, fillColor, strokeColor, strokeWidth, m.a);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let pass = 0; pass < 2; pass++) {
      let at = left;
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const width = measure(ctx, char);
        const cell = isDigit(char) ? digitCell : width;
        const lx = at + (isDigit(char) ? (cell - width) / 2 : 0);
        at += cell;
        if (char === " ") continue;
        const glyph = getRestGlyph(ctx, set, char);
        ctx.drawImage(
          glyph.canvas,
          pass * glyph.cellW,
          0,
          glyph.cellW,
          glyph.cellH,
          Math.round(m.a * lx + m.e - glyph.left),
          Math.round(m.d * y + m.f - glyph.up),
          glyph.cellW,
          glyph.cellH,
        );
      }
    }
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.textAlign = "left";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = fillColor;
  for (let pass = 0; pass < 2; pass++) {
    let at = left;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const width = measure(ctx, char);
      const cell = isDigit(char) ? digitCell : width;
      const lx = at + (isDigit(char) ? (cell - width) / 2 : 0);
      if (pass === 0) ctx.strokeText(char, lx, y);
      else ctx.fillText(char, lx, y);
      at += cell;
    }
  }
  ctx.restore();
}

// a resting counter's letters, rastered once at the canvas's own scale (an
// outline cell and a fill cell) and stamped 1:1 on whole pixels: the text
// costs a few cheap blits a frame instead of re-rastered glyphs
interface RestGlyph {
  canvas: HTMLCanvasElement;
  cellW: number;
  cellH: number;
  // the letter's origin from its cell's top-left, in canvas px
  left: number;
  up: number;
}
interface RestGlyphSet {
  glyphs: Map<string, RestGlyph>;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  scale: number;
}
const restGlyphSets = new Map<string, RestGlyphSet>();
const MAX_REST_GLYPH_SETS = 8;

function getRestGlyphSet(
  ctx: CanvasRenderingContext2D,
  fillColor: string,
  strokeColor: string,
  strokeWidth: number,
  scale: number,
): RestGlyphSet {
  const key = `${ctx.font}|${ctx.textBaseline}|${fillColor}|${strokeColor}|${strokeWidth}|${scale}`;
  let set = restGlyphSets.get(key);
  if (!set) {
    if (restGlyphSets.size >= MAX_REST_GLYPH_SETS) restGlyphSets.clear();
    set = { glyphs: new Map(), fillColor, strokeColor, strokeWidth, scale };
    restGlyphSets.set(key, set);
  }
  return set;
}

function getRestGlyph(
  ctx: CanvasRenderingContext2D,
  set: RestGlyphSet,
  char: string,
): RestGlyph {
  let glyph = set.glyphs.get(char);
  if (glyph) return glyph;
  const align = ctx.textAlign;
  ctx.textAlign = "left";
  const metrics = ctx.measureText(char);
  ctx.textAlign = align;
  const { scale } = set;
  const pad = set.strokeWidth / 2 + 2;
  const left = (metrics.actualBoundingBoxLeft + pad) * scale;
  const up = (metrics.actualBoundingBoxAscent + pad) * scale;
  const cellW = Math.ceil(
    left + (metrics.actualBoundingBoxRight + pad) * scale,
  );
  const cellH = Math.ceil(
    up + (metrics.actualBoundingBoxDescent + pad) * scale,
  );
  const canvas = document.createElement("canvas");
  canvas.width = cellW * 2;
  canvas.height = cellH;
  const c = canvas.getContext("2d")!;
  c.font = ctx.font;
  c.textBaseline = ctx.textBaseline;
  c.textAlign = "left";
  c.lineJoin = "round";
  c.miterLimit = 2;
  c.lineWidth = set.strokeWidth;
  c.strokeStyle = set.strokeColor;
  c.fillStyle = set.fillColor;
  c.setTransform(scale, 0, 0, scale, left, up);
  c.strokeText(char, 0, 0);
  c.setTransform(scale, 0, 0, scale, cellW + left, up);
  c.fillText(char, 0, 0);
  glyph = { canvas, cellW, cellH, left, up };
  set.glyphs.set(char, glyph);
  return glyph;
}

// drawCartoonText, but once the slam lands the white shine sweeps across the
// glowing letters, each hopping as it passes (the text's own part of
// drawSlamTarget). tabular lays digits out in fixed cells, always, so a
// counting number never shifts sideways. whiteMix 0..1 blends the fill toward
// white; moving says the text is swelling, wiggling or flashing this frame, so
// it's stamped from sprites like a landed slam (see SlamGlyph)
export function drawSlamText(
  ctx: CanvasRenderingContext2D,
  pose: SlamPose | null,
  text: string,
  x: number,
  y: number,
  height: number,
  fillColor: string,
  strokeColor: string = COLOR.black,
  strokeWidth = 5,
  tabular = false,
  whiteMix = 0,
  moving = false,
): void {
  // past TEXT_FX_MS no letter hops, shines or glows: it's the text at rest
  const landed =
    pose && pose.landedMs >= 0 && pose.landedMs < TEXT_FX_MS ? pose : null;
  const ready = isFontReady(ctx.font);
  if (ready && ((pose && pose.landedMs < 0) || (tabular && !moving)))
    warmSlamGlyphs(ctx, text, fillColor, strokeColor, strokeWidth);
  if (!ready || (!landed && !moving)) {
    const fill = whiteMix > 0 ? shadeColor(fillColor, whiteMix) : fillColor;
    if (tabular)
      drawTabularText(ctx, text, x, y, fill, strokeColor, strokeWidth);
    else drawCartoonText(ctx, text, x, y, fill, strokeColor, strokeWidth);
    return;
  }
  const digitCell = tabular ? maxDigitWidth(ctx) : 0;
  let fullWidth = 0;
  if (!tabular) fullWidth = measure(ctx, text);
  else
    for (let i = 0; i < text.length; i++)
      fullWidth += isDigit(text[i]) ? digitCell : measure(ctx, text[i]);
  const align = ctx.textAlign;
  const left =
    align === "center"
      ? x - fullWidth / 2
      : align === "right" || align === "end"
        ? x - fullWidth
        : x;
  const band = height * 1.2;
  const path = fullWidth + band * 2;
  const footY = y + height;
  const sweep = landed ? flashStrength(landed) : 0;
  // where the shine band (its slanted gradient, 0..1 across) has got to
  const x0 = left - band + path * (1 - sweep) - band;
  const glyphs = getSlamGlyphSet(
    ctx,
    text,
    fillColor,
    strokeColor,
    strokeWidth,
  );
  const alpha = ctx.globalAlpha;
  ctx.save();
  ctx.textAlign = "left";
  // pass 0: every outline first, so a letter's stroke never covers its
  // neighbour's fill; pass 1: the fills, and any shine or white over them
  for (let pass = 0; pass < 2; pass++) {
    let start = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const width = measure(ctx, char);
      const digit = tabular && isDigit(char);
      // a kerned letter is measured through itself, so the kern before it is kept
      const end = tabular
        ? start + (digit ? digitCell : width)
        : measure(ctx, text.slice(0, i + 1));
      const cellWidth = end - start;
      // a digit centers in its cell; a kerned letter sits flush right, after the kern
      const lx =
        left + start + (digit ? (cellWidth - width) / 2 : cellWidth - width);
      const centerX = left + start + cellWidth / 2;
      start = end;
      if (char === " ") continue;
      const glyph = getSlamGlyph(ctx, glyphs, char);
      const hop = landed ? hopAt(landed, (centerX - left + band) / path) : 0;
      if (hop !== 0) {
        ctx.save();
        const s = 1 + WAVE_SCALE * hop;
        ctx.translate(centerX, footY - WAVE_HOP * height * hop);
        ctx.scale(s, s);
        ctx.translate(-centerX, -footY);
      }
      if (pass === 0) stampGlyph(ctx, glyph, OUTLINE_CELL, lx, y, 0, 1);
      else if (!landed) {
        stampGlyph(ctx, glyph, FILL_CELL, lx, y, 0, 1);
        if (whiteMix > 0) {
          ctx.globalAlpha = alpha * Math.min(1, whiteMix);
          stampGlyph(ctx, glyph, WHITE_CELL, lx, y, 0, 1);
          ctx.globalAlpha = alpha;
        }
      } else {
        stampGlyph(ctx, glyph, GOLD_CELL, lx, y, 0, 1);
        if (sweep > 0) {
          // the band lights each letter in slices, each as bright as the
          // band is at its middle
          ctx.globalCompositeOperation = "lighter";
          for (let k = 0; k < SHINE_SLICES; k++) {
            const sliceX =
              lx - glyph.left + ((k + 0.5) / SHINE_SLICES) * glyph.w;
            const t = (sliceX - x0) / (band * 2);
            if (t <= 0 || t >= 1) continue;
            ctx.globalAlpha = alpha * 0.9 * (1 - Math.abs(2 * t - 1));
            stampGlyph(
              ctx,
              glyph,
              WHITE_CELL,
              lx,
              y,
              k / SHINE_SLICES,
              1 / SHINE_SLICES,
            );
          }
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = alpha;
        }
      }
      if (hop !== 0) ctx.restore();
    }
  }
  ctx.restore();
}

// a slamming or swelling text's letters are stamped from sprites rastered
// once per font: big text under a fresh transform every frame (each hop, pop,
// squash and wiggle) is re-rastered glyph by glyph, which stalled every slam
// onto the total. Each sprite holds the letter's outline, its gold fill, a
// white copy (the shine, and the fill's blend toward white) and its plain
// fill, side by side, at GLYPH_SCALE so the pop stays crisp
const GLYPH_SCALE = 1.25;
const OUTLINE_CELL = 0;
const GOLD_CELL = 1;
const WHITE_CELL = 2;
const FILL_CELL = 3;
const SHINE_SLICES = 3;
const MAX_GLYPH_SETS = 16;
// warmed a few letters a frame (at rest, or while the target is in the air)
// so the frame a text starts moving doesn't raster them all at once
const WARM_PER_FRAME = 3;
interface SlamGlyph {
  canvas: HTMLCanvasElement;
  cellW: number;
  cellH: number;
  // the letter's origin from its cell's top-left, and the cell's size, in
  // the text's own px
  left: number;
  up: number;
  w: number;
  h: number;
}
interface SlamGlyphSet {
  glyphs: Map<string, SlamGlyph>;
  // the gold gradient spans this whole text's glyphs
  text: string;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
}
const glyphSets = new Map<string, SlamGlyphSet>();
const readyFonts = new Set<string>();

// never bake a fallback font while Fredoka is still loading
function isFontReady(font: string): boolean {
  if (readyFonts.has(font)) return true;
  if (!document.fonts.check(font)) return false;
  readyFonts.add(font);
  return true;
}

function getSlamGlyphSet(
  ctx: CanvasRenderingContext2D,
  text: string,
  fillColor: string,
  strokeColor: string,
  strokeWidth: number,
): SlamGlyphSet {
  const metrics = ctx.measureText(text);
  const ascent = Math.round(metrics.actualBoundingBoxAscent);
  const descent = Math.round(metrics.actualBoundingBoxDescent);
  const key = `${ctx.font}|${ctx.textBaseline}|${fillColor}|${strokeColor}|${strokeWidth}|${ascent}|${descent}`;
  let set = glyphSets.get(key);
  if (!set) {
    if (glyphSets.size >= MAX_GLYPH_SETS) glyphSets.clear();
    set = { glyphs: new Map(), text, fillColor, strokeColor, strokeWidth };
    glyphSets.set(key, set);
  }
  return set;
}

// the text a resting readout last warmed, once all its letters are baked
let warmedFont = "";
let warmedText = "";

function warmSlamGlyphs(
  ctx: CanvasRenderingContext2D,
  text: string,
  fillColor: string,
  strokeColor: string,
  strokeWidth: number,
): void {
  if (text === warmedText && ctx.font === warmedFont) return;
  const set = getSlamGlyphSet(ctx, text, fillColor, strokeColor, strokeWidth);
  let baked = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === " " || set.glyphs.has(char)) continue;
    if (baked === WARM_PER_FRAME) return;
    getSlamGlyph(ctx, set, char);
    baked++;
  }
  warmedText = text;
  warmedFont = ctx.font;
}

function getSlamGlyph(
  ctx: CanvasRenderingContext2D,
  set: SlamGlyphSet,
  char: string,
): SlamGlyph {
  let glyph = set.glyphs.get(char);
  if (glyph) return glyph;
  // measured as it's drawn, left-aligned from its origin
  const align = ctx.textAlign;
  ctx.textAlign = "left";
  const metrics = ctx.measureText(char);
  ctx.textAlign = align;
  const pad = set.strokeWidth / 2 + 2;
  const left = metrics.actualBoundingBoxLeft + pad;
  const up = metrics.actualBoundingBoxAscent + pad;
  const cellW = Math.ceil(
    (left + metrics.actualBoundingBoxRight + pad) * GLYPH_SCALE,
  );
  const cellH = Math.ceil(
    (up + metrics.actualBoundingBoxDescent + pad) * GLYPH_SCALE,
  );
  const w = cellW / GLYPH_SCALE;
  const canvas = document.createElement("canvas");
  canvas.width = cellW * 4;
  canvas.height = cellH;
  const c = canvas.getContext("2d")!;
  c.scale(GLYPH_SCALE, GLYPH_SCALE);
  c.font = ctx.font;
  c.textBaseline = ctx.textBaseline;
  c.textAlign = "left";
  c.lineJoin = "round";
  c.miterLimit = 2;
  c.lineWidth = set.strokeWidth;
  c.strokeStyle = set.strokeColor;
  c.strokeText(char, w * OUTLINE_CELL + left, up);
  // a pure yellow gold, spanning the whole text's glyphs
  c.fillStyle = createTextGlossyGradient(c, set.text, up, COLOR.heavenlyGold);
  c.fillText(char, w * GOLD_CELL + left, up);
  c.fillStyle = COLOR.white;
  c.fillText(char, w * WHITE_CELL + left, up);
  c.fillStyle = set.fillColor;
  c.fillText(char, w * FILL_CELL + left, up);
  glyph = { canvas, cellW, cellH, left, up, w, h: cellH / GLYPH_SCALE };
  set.glyphs.set(char, glyph);
  return glyph;
}

// one cell of a glyph with its origin at (x, y), or the slice of it from
// `from` 0..1 across, `share` of its width
function stampGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: SlamGlyph,
  cell: number,
  x: number,
  y: number,
  from: number,
  share: number,
): void {
  ctx.drawImage(
    glyph.canvas,
    glyph.cellW * (cell + from),
    0,
    glyph.cellW * share,
    glyph.cellH,
    x - glyph.left + glyph.w * from,
    y - glyph.up,
    glyph.w * share,
    glyph.h,
  );
}

export interface SlamBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// how the white shine crosses the target: text shines letter by letter
// itself (drawSlamText), a figure gets a burst of light, a rounded rect a band
export type SlamShine = "text" | "figure" | { radius: number };

// every stream target's end slam, drawn the same way around drawTarget: gold
// rays behind, the hop and slam with a jelly pop, the white shine, then a
// sparkle and glitter over the target's box (in its own drawing space)
export function drawSlamTarget(
  ctx: CanvasRenderingContext2D,
  pose: SlamPose | null,
  box: SlamBox,
  shine: SlamShine,
  drawTarget: () => void,
  now = Date.now(),
): void {
  if (!pose) {
    drawTarget();
    return;
  }
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  drawSlamLights(ctx, pose, cx, cy, box.width, box.height, now);
  ctx.save();
  applySlamPose(ctx, pose, cx, box.y + box.height, box.height);
  applySlamPop(ctx, pose, cx, cy);
  drawTarget();
  if (shine === "figure")
    drawSlamFlash(ctx, pose, cx, cy, Math.max(box.width, box.height));
  else if (shine !== "text") drawSlamShine(ctx, pose, box, shine.radius);
  drawSparkle(
    ctx,
    box.x + box.width - box.height * 0.1,
    box.y + box.height * 0.1,
    box.height,
    (pose.landedMs - SPARKLE_START_MS) / SPARKLE_MS,
  );
  drawGlitter(ctx, pose, box.x, box.y, box.width, box.height);
  ctx.restore();
}

// an old-school lens twinkle: a long thin cross, a smaller diagonal one and a
// soft white core, growing and turning then shrinking away over t 0..1
function drawSparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  t: number,
): void {
  if (t <= 0 || t >= 1) return;
  const envelope =
    t < SPARKLE_IN
      ? Math.sin((Math.PI / 2) * (t / SPARKLE_IN))
      : t > 1 - SPARKLE_OUT
        ? (1 - t) / SPARKLE_OUT
        : 1;
  // a gentle twinkle while it hangs
  const pulse = 0.85 + 0.15 * Math.cos(t * Math.PI * 6);
  drawTwinkle(ctx, x, y, height * 0.9 * envelope * pulse, t * Math.PI * 0.5);
}

// 0..1 in [0, 1): a stable pseudo-random number for (seed, n)
function hash(seed: number, n: number): number {
  const v = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

// the after-glitter: small twinkles popping at random spots over the target's
// box (x, y, width, height), coming ever less often until they're gone
function drawGlitter(
  ctx: CanvasRenderingContext2D,
  pose: SlamPose,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const elapsed = pose.landedMs - GLITTER_START_MS;
  if (elapsed < 0 || elapsed >= GLITTER_SPAN_MS + GLITTER_TWINKLE_MS) return;
  for (let i = 0; i < GLITTER_COUNT; i++) {
    const at = GLITTER_SPAN_MS * (i / GLITTER_COUNT) ** 1.4;
    const t = (elapsed - at) / GLITTER_TWINKLE_MS;
    if (t <= 0 || t >= 1) continue;
    const fade = 1 - (i / GLITTER_COUNT) * 0.5;
    drawTwinkle(
      ctx,
      x + width * hash(pose.seed, i * 3),
      y + height * hash(pose.seed, i * 3 + 1),
      // mostly small specks with the odd big flare
      height *
        GLITTER_SIZE *
        (0.15 + 1.05 * hash(pose.seed, i * 3 + 2) ** 2) *
        Math.sin(Math.PI * t) *
        fade,
      t * Math.PI * 0.4,
    );
  }
}

// a burst of gold light over (cx, cy) as the slam lands
function drawSlamFlash(
  ctx: CanvasRenderingContext2D,
  pose: SlamPose,
  cx: number,
  cy: number,
  radius: number,
): void {
  const strength = flashStrength(pose);
  if (strength <= 0) return;
  const r = radius * (1 + 0.6 * (1 - strength));
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = strength * 0.85;
  ctx.drawImage(slamFlashSprite(), cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
}

// the flash's glow, drawn once and stamped
const FLASH_STOPS: FadeStops = [
  [0, COLOR.white],
  [0.35, COLOR.heavenlyGold],
  [1, `${COLOR.heavenlyGold}00`],
];
const slamFlashSprite = () => glowSprite(FLASH_STOPS);

// a slanted gold shine band sweeping left to right across a rounded rect
function drawSlamShine(
  ctx: CanvasRenderingContext2D,
  pose: SlamPose,
  box: SlamBox,
  radius: number,
): void {
  const strength = flashStrength(pose);
  if (strength > 0) drawShineSweep(ctx, box, radius, 1 - strength);
}

// the slanted shine band t (0..1) of the way across a rounded rect, left to right
export function drawShineSweep(
  ctx: CanvasRenderingContext2D,
  { x, y, width, height }: SlamBox,
  radius: number,
  t: number,
  alpha = 0.9,
): void {
  const band = height * 1.2;
  const bandX = x - band + (width + band * 2) * t;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.clip();
  const gradient = ctx.createLinearGradient(bandX - band, 0, bandX + band, 0);
  gradient.addColorStop(0, `${COLOR.heavenlyGold}00`);
  gradient.addColorStop(0.5, COLOR.white);
  gradient.addColorStop(1, `${COLOR.heavenlyGold}00`);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  const cy = y + height / 2;
  ctx.translate(0, cy);
  ctx.transform(1, 0, -0.4, 1, 0, 0);
  ctx.translate(0, -cy);
  ctx.fillRect(x - band * 2, y, width + band * 4, height);
  ctx.restore();
}
