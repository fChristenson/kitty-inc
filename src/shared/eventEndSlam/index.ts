// the "jackpot slam" a coin stream's target plays when its event ends: a quick
// crouch, a hop up, a hard slam down with a sideways jolt and springy squash,
// then a jelly pop over spinning gold rays, a white shine sweep, a sparkle and
// glitter. Every target draws it through drawSlamTarget so they all match.
// Targets are keyed by an owner object (a floor, or GLOBAL_SLAM for one-offs)
// plus a part name
import { COLOR } from "../../palette";
import { drawTwinkle } from "../twinkle";
import { drawGoldShimmer } from "../goldShimmer";
import { createTextGlossyGradient, drawCartoonText } from "../../utils";
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
const SHINE_SKEW = 0.4;
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
const textWidths = new Map<string, number>();
const TEXT_WIDTH_CACHE_LIMIT = 2000;
function measure(ctx: CanvasRenderingContext2D, text: string): number {
  const key = `${ctx.font}|${text}`;
  let width = textWidths.get(key);
  if (width === undefined) {
    if (textWidths.size >= TEXT_WIDTH_CACHE_LIMIT) textWidths.clear();
    width = ctx.measureText(text).width;
    textWidths.set(key, width);
  }
  return width;
}

// drawCartoonText, but once the slam lands the white shine sweeps across the
// glowing letters, each hopping as it passes (the text's own part of
// drawSlamTarget). tabular lays digits out in fixed cells, always, so a
// counting number never shifts sideways
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
): void {
  const landed = pose && pose.landedMs >= 0 ? pose : null;
  if (!landed && !tabular) {
    drawCartoonText(ctx, text, x, y, fillColor, strokeColor, strokeWidth);
    return;
  }
  const chars = [...text];
  const digitCell = tabular ? maxDigitWidth(ctx) : 0;
  let fullWidth = 0;
  let prefix = "";
  const cells = chars.map((char) => {
    const width = measure(ctx, char);
    const isDigit = tabular && char >= "0" && char <= "9";
    const start = fullWidth;
    if (tabular) {
      fullWidth += isDigit ? digitCell : width;
    } else {
      // measured through this letter so the kerning before it is kept
      prefix += char;
      fullWidth = measure(ctx, prefix);
    }
    const cellWidth = fullWidth - start;
    // a digit centers in its cell; a kerned letter sits flush right, after the kern
    const inset = isDigit ? (cellWidth - width) / 2 : cellWidth - width;
    return { char, start, cellWidth, inset };
  });
  const align = ctx.textAlign;
  const left =
    align === "center"
      ? x - fullWidth / 2
      : align === "right" || align === "end"
        ? x - fullWidth
        : x;
  const band = height * 1.2;
  const path = fullWidth + band * 2;
  const letters = cells.map(({ char, start, cellWidth, inset }) => {
    const centerX = left + start + cellWidth / 2;
    return {
      char,
      x: left + start + inset,
      centerX,
      hop: landed ? hopAt(landed, (centerX - left + band) / path) : 0,
    };
  });
  const footY = y + height;
  const place = (centerX: number, hop: number) => {
    const s = 1 + WAVE_SCALE * hop;
    ctx.translate(centerX, footY - WAVE_HOP * height * hop);
    ctx.scale(s, s);
    ctx.translate(-centerX, -footY);
  };
  ctx.save();
  ctx.textAlign = "left";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = strokeColor;
  // every outline first, so a letter's stroke never covers its neighbour's fill
  for (const l of letters) {
    if (l.hop === 0) {
      ctx.strokeText(l.char, l.x, y);
      continue;
    }
    ctx.save();
    place(l.centerX, l.hop);
    ctx.strokeText(l.char, l.x, y);
    ctx.restore();
  }
  const strength = textFxStrength(landed);
  // a pure yellow gold, spanning the glyphs themselves
  const goldFill =
    strength > 0
      ? createTextGlossyGradient(ctx, text, y, COLOR.heavenlyGold)
      : null;
  const sweep = landed ? flashStrength(landed) : 0;
  let shine: CanvasGradient | null = null;
  if (sweep > 0) {
    const bandX = left - band + path * (1 - sweep);
    // along the normal of the slanted band, so it matches drawSlamShine's skew
    const cy = y + height / 2;
    const norm = 1 + SHINE_SKEW ** 2;
    const x0 = bandX - band;
    shine = ctx.createLinearGradient(
      x0,
      cy,
      x0 + (band * 2) / norm,
      cy + (band * 2 * SHINE_SKEW) / norm,
    );
    shine.addColorStop(0, `${COLOR.heavenlyGold}00`);
    shine.addColorStop(0.5, COLOR.white);
    shine.addColorStop(1, `${COLOR.heavenlyGold}00`);
  }
  for (const l of letters) {
    const hopping = l.hop !== 0;
    if (hopping) {
      ctx.save();
      place(l.centerX, l.hop);
    }
    ctx.fillStyle = goldFill ?? fillColor;
    ctx.fillText(l.char, l.x, y);
    if (shine) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = shine;
      ctx.fillText(l.char, l.x, y);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }
    if (hopping) ctx.restore();
  }
  ctx.restore();
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
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  gradient.addColorStop(0, COLOR.white);
  gradient.addColorStop(0.35, COLOR.heavenlyGold);
  gradient.addColorStop(1, `${COLOR.heavenlyGold}00`);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = strength * 0.85;
  ctx.fillStyle = gradient;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
}

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
