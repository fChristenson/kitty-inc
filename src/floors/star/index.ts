import { isFloorMaxed, type Floor } from "../../gameState";
import { COLOR } from "../../palette";
import { createTextGlossyGradient, drawCartoonText } from "../../utils";
import {
  SLAM_GOLD,
  drawSlamTarget,
  drawSlamText,
  getSlamPose,
} from "../../shared/eventEndSlam";

// mirrors buildings/outerWall's own SIDE_WALL_WIDTH (WALL_WIDTH*2) — duplicated
// locally instead of imported to avoid a floors<->buildings circular import
const LEFT_WALL_WIDTH = 56;
// inside the room, top-left corner: 40px right of the left outer wall's inner edge
const MARGIN_X = LEFT_WALL_WIDTH + 40;
const MARGIN_Y = 44 + 20;
export const STAR_Y = MARGIN_Y;
export const STAR_X = MARGIN_X;
const FONT_SIZE = 54;
export const STAR_BOTTOM_Y = STAR_Y + FONT_SIZE;
const FONT = `900 ${FONT_SIZE}px "Fredoka", system-ui, sans-serif`;

function labelText(floor: Floor): string {
  return `Lvl ${floor.upgradeCount}`;
}

// throwaway canvas just for measureText — floorInteractions.ts needs the label's
// real width to aim a coin burst at its center, but has no live ctx of its own.
// Asked every frame per floor (see floors/upgradeArrow), so cached per count
let measureCtx: CanvasRenderingContext2D | null = null;
const widths = new Map<number, number>();
function labelWidth(floor: Floor): number {
  const count = floor.upgradeCount;
  let width = widths.get(count);
  if (width === undefined) {
    measureCtx ??= document.createElement("canvas").getContext("2d")!;
    measureCtx.font = FONT;
    width = measureCtx.measureText(labelText(floor)).width;
    if (widths.size > 500) widths.clear();
    widths.set(count, width);
  }
  return width;
}

// floor-local center of the indicator (accounting for the label's own text width),
// for aiming a coin-burst celebration at it
export function getUpgradeIndicatorCenter(floor: Floor): {
  x: number;
  y: number;
} {
  return { x: MARGIN_X + labelWidth(floor) / 2, y: STAR_Y };
}

// the label's own right edge, floor-local — grows/shrinks as floor.upgradeCount
// gains digits, so anything anchored past it (see floors/upgradeArrow) tracks
// the text's real width instead of a fixed guess
export function getStarRightX(floor: Floor): number {
  return MARGIN_X + labelWidth(floor);
}

// where something parked after the label sits: past the widest 3-digit "Lvl N",
// so it holds still while the number counts up and pops
let widestThreeDigits = 0;
export function getStarAnchorX(floor: Floor): number {
  if (widestThreeDigits === 0) {
    measureCtx ??= document.createElement("canvas").getContext("2d")!;
    measureCtx.font = FONT;
    let widest = 0;
    for (let d = 0; d <= 9; d++)
      widest = Math.max(
        widest,
        measureCtx.measureText(`Lvl ${d}${d}${d}`).width,
      );
    if (!document.fonts.check(FONT)) return MARGIN_X + widest;
    widestThreeDigits = widest;
  }
  return MARGIN_X + Math.max(widestThreeDigits, labelWidth(floor));
}

// shows a "Lvl N" label for how many upgrades this floor has bought, drawn at the
// room's inside top-left corner
export function drawUpgradeStar(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
): void {
  if (hiddenFloors.has(floor)) return;
  drawUpgradeStarSpotlight(ctx, floor);
}

// the live label, slam and all, for an event overlay that hid it
export function drawUpgradeStarSpotlight(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
): void {
  const slam = getSlamPose(floor, "star", Date.now());
  const box = {
    x: MARGIN_X,
    y: STAR_Y,
    width: slam ? labelWidth(floor) : 0,
    height: FONT_SIZE,
  };
  const now = performance.now();
  let popMs = now - (pops.get(floor) ?? -Infinity);
  if (popMs >= POP_MS) {
    pops.delete(floor);
    popMs = Infinity;
  }
  const popping = popMs < POP_MS;
  if (!slam && !popping && drawRestingLabel(ctx, floor)) return;
  drawSlamTarget(ctx, slam, box, "text", () => {
    ctx.save();
    ctx.font = FONT;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    // blown out big, then wobbling back like jelly, never smaller than at rest
    const pop = popping
      ? POP * Math.exp(-popMs / POP_DECAY_MS) * Math.min(1, popMs / POP_RISE_MS)
      : 0;
    if (pop > 0) {
      const phase = (popMs / POP_WOBBLE_MS) * Math.PI * 2;
      const cx = MARGIN_X + labelWidth(floor) / 2;
      const cy = STAR_Y + FONT_SIZE / 2;
      ctx.translate(cx, cy);
      ctx.scale(
        1 + pop * (0.5 + 0.5 * Math.cos(phase)),
        1 + pop * (0.5 + 0.5 * Math.cos(phase + 0.9)),
      );
      ctx.translate(-cx, -cy);
    }
    drawSlamText(
      ctx,
      slam,
      labelText(floor),
      MARGIN_X,
      STAR_Y,
      FONT_SIZE,
      isFloorMaxed(floor) ? SLAM_GOLD : COLOR.white,
      COLOR.black,
      5,
      false,
      0,
      // stamped from sprites while it warps
      popping || undefined,
    );
    ctx.restore();
  });
}

// the resting label, kept as one bitmap per floor at the canvas's own scale:
// stamping it glyph by glyph every frame for every floor in view added up
const LABEL_PAD = 6;
interface RestingLabel {
  canvas: HTMLCanvasElement;
  text: string;
  fill: string;
  scale: number;
}
const restingLabels = new WeakMap<Floor, RestingLabel>();
let fontReady = false;

// false when ctx is rotated or skewed: the caller draws it the slow way then
function drawRestingLabel(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
): boolean {
  const m = ctx.getTransform();
  if (m.b !== 0 || m.c !== 0 || m.a <= 0 || m.a !== m.d) return false;
  // never bake a fallback font while Fredoka is still loading
  fontReady ||= document.fonts.check(FONT);
  if (!fontReady) return false;
  const text = labelText(floor);
  const fill = isFloorMaxed(floor) ? SLAM_GOLD : COLOR.white;
  let label = restingLabels.get(floor);
  if (
    !label ||
    label.text !== text ||
    label.fill !== fill ||
    label.scale !== m.a
  ) {
    const canvas = label?.canvas ?? document.createElement("canvas");
    canvas.width = Math.ceil((labelWidth(floor) + LABEL_PAD * 2) * m.a);
    canvas.height = Math.ceil((FONT_SIZE + LABEL_PAD * 2) * m.a);
    const c = canvas.getContext("2d")!;
    c.setTransform(m.a, 0, 0, m.a, LABEL_PAD * m.a, LABEL_PAD * m.a);
    c.font = FONT;
    c.textAlign = "left";
    c.textBaseline = "top";
    drawSlamText(c, null, text, 0, 0, FONT_SIZE, fill);
    label = { canvas, text, fill, scale: m.a };
    restingLabels.set(floor, label);
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(
    label.canvas,
    Math.round(m.a * (MARGIN_X - LABEL_PAD) + m.e),
    Math.round(m.d * (STAR_Y - LABEL_PAD) + m.f),
  );
  ctx.restore();
  return true;
}

// the label's pop on every 10th level
const POP = 0.6;
const POP_MS = 700;
const POP_RISE_MS = 40;
const POP_DECAY_MS = 170;
const POP_WOBBLE_MS = 230;
const pops = new WeakMap<Floor, number>();
export function triggerLevelPop(floor: Floor): void {
  pops.set(floor, performance.now());
}

// an event overlay draws these floors' labels itself instead
let hiddenFloors: ReadonlySet<Floor> = new Set();
export function setUpgradeStarHidden(floor: Floor | null): void {
  setUpgradeStarsHidden(floor ? [floor] : []);
}
export function setUpgradeStarsHidden(floors: Floor[]): void {
  hiddenFloors = new Set(floors);
}

// the label washed toward white and rotated around its own center
export function drawUpgradeStarStill(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  whiteAlpha: number,
  rotation: number,
): void {
  const text = labelText(floor);
  const centerX = MARGIN_X + labelWidth(floor) / 2;
  const centerY = (STAR_Y + STAR_BOTTOM_Y) / 2;
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);
  ctx.translate(-centerX, -centerY);
  ctx.font = FONT;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  drawCartoonText(
    ctx,
    text,
    MARGIN_X,
    STAR_Y,
    isFloorMaxed(floor)
      ? createTextGlossyGradient(ctx, text, STAR_Y, COLOR.heavenlyGold)
      : COLOR.white,
  );
  if (whiteAlpha > 0) {
    ctx.globalAlpha = whiteAlpha;
    drawCartoonText(ctx, text, MARGIN_X, STAR_Y, COLOR.white, COLOR.white);
  }
  ctx.restore();
}
