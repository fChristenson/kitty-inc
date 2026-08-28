import {
  loadImage,
  drawCartoonText,
  formatTotalIncome,
  formatPrice,
} from "../../utils";
import { COLOR } from "../../palette";
import { playSold } from "../../sound";
import { getBuildingPrice } from "../../buildings";
import cityMapUrl from "../../assets/city2Bg.png";
import catSpriteUrl from "../../assets/sprites/kitty1Walk.png";
import starUrl from "../../assets/star.png";

// a static overview map (see docs/prompts.md's "City map tile" prompt), drawn
// zoomed out to fill the view, with a cat marker per building standing in for the
// eventual "pick a building to unlock" map screen: whichever building is currently
// active plays the stand/jump cycle, any other unlocked building just stands, and
// the next building to unlock shows grayed out with its price until bought

// reuses floors/worker's own sprite sheet (scripts/process-cat-sprites.mjs) rather
// than the recolor/walk-cycle machinery in floors/worker/index.ts — markers here
// are static poses, not walking figures, so that machinery would be unused weight
const CAT_FRAME_COUNT = 5;
const CAT_STAND_FRAME = 0;
const CAT_JUMP_FRAME = 4; // the sheet's "arms-up happy pose", reused as a little hop
const CAT_POSE_SWAP_MS = 550; // how long each pose in the stand/jump cycle holds
const MARKER_H = 100;
const MARKER_HIT_PADDING = 16; // generous click/hover target beyond the sprite's own bounds
// 5 buildings total on the map: building 0 is the always-free starting building,
// buildings 1-4 unlock in order, each priced via buildings.ts's getBuildingPrice
// (scales BUILDING_COST_MULTIPLIER per step, same as each building's own economy)
const MARKER_COUNT = 5;
// fixed screen fractions (of the canvas's own CSS size) for each building's marker —
// this is a flat, non-scrolling static map, so these never move/recompute per building
// zigzags up the map as tier/star count increases, so higher-tier buildings read
// as literally "higher up": bottom-left, far right, middle-left, far left, far right.
// centerShiftPx pulls a marker that many pixels toward the horizontal center
const MARKER_POSITIONS: {
  cxFrac: number;
  feetYFrac: number;
  cxFixed?: number;
  centerShiftPx?: number;
  cxNudgePx?: number; // extra fine-tune offset, positive = right
  feetYNudgePx?: number; // extra fine-tune offset, positive = down
}[] = [
  { cxFrac: 0, feetYFrac: 1, cxFixed: 70 }, // building 0 (1 star): fixed bottom-left dock
  { cxFrac: 0.88, feetYFrac: 0.78, centerShiftPx: 100 }, // building 1 (2 stars): far right
  {
    cxFrac: 0.28,
    feetYFrac: 0.58,
    centerShiftPx: 100,
    cxNudgePx: 50,
    feetYNudgePx: -50,
  }, // building 2 (3 stars): middle left
  { cxFrac: 0.06, feetYFrac: 0.36, centerShiftPx: 100 }, // building 3 (4 stars): far left
  {
    cxFrac: 0.88,
    feetYFrac: 0.16,
    centerShiftPx: 100,
    cxNudgePx: 80,
    feetYNudgePx: 50,
  }, // building 4 (5 stars): far right
];
// tier star row drawn under each marker: building index 0 shows 1 filled star (of
// 5), the last building (index MARKER_COUNT-1) shows all 5 filled
const STAR_ROW_Y_OFFSET = 12; // below the marker's feetY
const STAR_SIZE = 18; // rendered square size (star.png is roughly square already)
const STAR_SPACING = 20;

let mapImage: HTMLImageElement | null = null;
let catSprite: HTMLImageElement | null = null;
let starImage: HTMLImageElement | null = null;

export async function loadCityMapImage(): Promise<HTMLImageElement> {
  [mapImage, catSprite, starImage] = await Promise.all([
    loadImage(cityMapUrl),
    loadImage(catSpriteUrl),
    loadImage(starUrl),
  ]);
  return mapImage;
}

export interface CityMapDeps {
  getTotalIncome: () => number;
  getBuildingCount: () => number; // buildings unlocked so far; building 1 exists once this is >= 2
  getActiveBuildingIndex: () => number; // whichever building's floors are on screen right now
  buyBuilding: () => boolean; // unlocks building 1 if affordable
  onSelectBuilding: (index: number) => void; // switch to that building and leave the map view
}

export interface CityMapView {
  // re-measures the canvas's own CSS size and redraws; call after un-hiding it,
  // since a display:none canvas can't be measured while hidden
  refresh: () => void;
  destroy: () => void;
}

interface MarkerBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function createCityMapView(
  canvas: HTMLCanvasElement,
  deps: CityMapDeps,
): CityMapView {
  const ctx = canvas.getContext("2d")!;
  let cssW = 0;
  let cssH = 0;

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    cssW = rect.width;
    cssH = rect.height;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
  }

  // building 0's marker always sits bottom-left (fixed); every other building's
  // marker sits at its own fixed screen fraction, pulled toward center by its own
  // centerShiftPx — see MARKER_POSITIONS above
  function markerCenter(buildingIndex: number): { cx: number; feetY: number } {
    const pos = MARKER_POSITIONS[buildingIndex];
    let cx = pos.cxFixed ?? cssW * pos.cxFrac;
    if (pos.centerShiftPx) {
      const center = cssW / 2;
      cx += cx > center ? -pos.centerShiftPx : pos.centerShiftPx;
    }
    cx += pos.cxNudgePx ?? 0;
    return {
      cx,
      feetY:
        (buildingIndex === 0 ? cssH - 40 : cssH * pos.feetYFrac) +
        (pos.feetYNudgePx ?? 0),
    };
  }

  function markerBounds(buildingIndex: number): MarkerBounds {
    const { cx, feetY } = markerCenter(buildingIndex);
    if (!catSprite) {
      return { left: cx, right: cx, top: feetY, bottom: feetY };
    }
    const frameW = catSprite.naturalWidth / CAT_FRAME_COUNT;
    const frameH = catSprite.naturalHeight;
    const renderW = (MARKER_H * frameW) / frameH;
    return {
      left: cx - renderW / 2 - MARKER_HIT_PADDING,
      right: cx + renderW / 2 + MARKER_HIT_PADDING,
      top: feetY - MARKER_H - MARKER_HIT_PADDING,
      bottom: feetY + MARKER_HIT_PADDING,
    };
  }

  function hitTestMarker(buildingIndex: number, x: number, y: number): boolean {
    const b = markerBounds(buildingIndex);
    return x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;
  }

  // single star.png icon; empty (unfilled) ones get a flat gray tint via canvas
  // filter, same technique drawCatMarker uses for a locked building's marker
  function drawStarIcon(cx: number, cy: number, filled: boolean): void {
    if (!starImage) return;
    ctx.save();
    if (!filled) {
      ctx.filter = "grayscale(1) brightness(0.75)";
      ctx.globalAlpha = 0.6;
    }
    ctx.drawImage(
      starImage,
      cx - STAR_SIZE / 2,
      cy - STAR_SIZE / 2,
      STAR_SIZE,
      STAR_SIZE,
    );
    ctx.restore();
  }

  // 5 stars centered under the marker; `filledCount` (buildingIndex + 1) of them
  // solid gold, the rest gray-tinted — shows this building's tier at a glance
  function drawStarRow(buildingIndex: number, filledCount: number): void {
    const { cx, feetY } = markerCenter(buildingIndex);
    const rowY = feetY + STAR_ROW_Y_OFFSET;
    const startX = cx - (STAR_SPACING * 4) / 2;
    for (let i = 0; i < 5; i++) {
      drawStarIcon(startX + i * STAR_SPACING, rowY, i < filledCount);
    }
  }

  // any building beyond MARKER_COUNT has no marker here yet
  function hitTestAnyMarker(x: number, y: number): number | null {
    for (let i = 0; i < MARKER_COUNT; i++) {
      if (hitTestMarker(i, x, y)) return i;
    }
    return null;
  }

  function drawCatMarker(
    buildingIndex: number,
    frame: number,
    grayedOut: boolean,
  ): void {
    if (!catSprite) return;
    const { cx, feetY } = markerCenter(buildingIndex);
    const frameW = catSprite.naturalWidth / CAT_FRAME_COUNT;
    const frameH = catSprite.naturalHeight;
    const renderW = (MARKER_H * frameW) / frameH;
    ctx.save();
    if (grayedOut) {
      ctx.filter = "grayscale(1) brightness(0.85)";
      ctx.globalAlpha = 0.75;
    }
    ctx.drawImage(
      catSprite,
      frame * frameW,
      0,
      frameW,
      frameH,
      cx - renderW / 2,
      feetY - MARKER_H,
      renderW,
      MARKER_H,
    );
    ctx.restore();
  }

  function redraw(): void {
    // re-measure every call instead of trusting whatever resize() last cached —
    // otherwise a redraw sandwiched between the canvas becoming visible and its
    // next resize() call draws against a stale size, stretching the map image
    // for one frame until the following resize() corrects it
    resize();
    if (cssW <= 0 || cssH <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    if (mapImage) {
      // "cover" fit: scale up to whichever axis needs it more, so the image
      // always fills the whole canvas (cropping whatever overflows on the other
      // axis, clipped automatically by the canvas's own bounds) instead of
      // leaving empty space around it
      const fitScale = Math.max(
        cssW / mapImage.naturalWidth,
        cssH / mapImage.naturalHeight,
      );
      const drawW = mapImage.naturalWidth * fitScale;
      const drawH = mapImage.naturalHeight * fitScale;
      ctx.drawImage(
        mapImage,
        (cssW - drawW) / 2,
        (cssH - drawH) / 2,
        drawW,
        drawH,
      );
    }

    const activeIndex = deps.getActiveBuildingIndex();
    const pose =
      Math.floor(Date.now() / CAT_POSE_SWAP_MS) % 2 === 0
        ? CAT_STAND_FRAME
        : CAT_JUMP_FRAME;
    const buildingCount = deps.getBuildingCount();

    // building 0: always unlocked, plays the stand/jump cycle while it's the
    // active building — otherwise it just faces the camera, standing still.
    // every building from 1 up to MARKER_COUNT-1 is grayed out with its own
    // scaled unlock price until bought, then behaves exactly like building 0
    for (let i = 0; i < MARKER_COUNT; i++) {
      if (i < buildingCount) {
        drawCatMarker(i, activeIndex === i ? pose : CAT_STAND_FRAME, false);
        drawStarRow(i, i + 1);
        continue;
      }
      drawCatMarker(i, CAT_STAND_FRAME, true);
      const { cx, feetY } = markerCenter(i);
      ctx.font = '900 22px "Fredoka", system-ui, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      drawCartoonText(
        ctx,
        formatPrice(getBuildingPrice(i)),
        cx,
        feetY + 6,
        COLOR.white,
      );
      drawStarRow(i, i + 1);
    }

    // total income, top of the map — same green-fill/white-stroke money text look
    // used everywhere else, sized for this canvas's own CSS pixel space (unlike
    // hud/index.ts's drawHud, which is calibrated for the much larger world canvas)
    ctx.font = '900 32px "Fredoka", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    drawCartoonText(
      ctx,
      formatTotalIncome(deps.getTotalIncome()),
      cssW / 2,
      20,
      COLOR.moneyGreen,
      COLOR.white,
      6,
    );

    ctx.restore();
  }

  function canvasPoint(event: MouseEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onPointerMove(event: PointerEvent): void {
    const p = canvasPoint(event);
    const hit = hitTestAnyMarker(p.x, p.y);
    canvas.style.cursor = hit !== null ? "pointer" : "default";
  }

  // clicking the next locked building (buildings unlock strictly in order) buys it
  // (staying on the map so its color/price change is visible); clicking a further,
  // not-yet-reachable locked marker does nothing; an unlocked one switches to it
  // and leaves the map entirely
  function onClick(event: MouseEvent): void {
    const p = canvasPoint(event);
    const hit = hitTestAnyMarker(p.x, p.y);
    if (hit === null) return;
    const buildingCount = deps.getBuildingCount();
    if (hit === buildingCount) {
      if (deps.buyBuilding()) playSold();
      redraw();
      return;
    }
    // a marker further out than the next unlock isn't reachable yet — ignore it
    if (hit > buildingCount) return;
    deps.onSelectBuilding(hit);
  }

  function onPointerLeave(): void {
    canvas.style.cursor = "default";
  }

  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("click", onClick);

  const resizeObserver = new ResizeObserver(() => redraw());
  resizeObserver.observe(canvas);

  // keeps the current-building marker's stand/jump cycle animating even though
  // nothing else on this static map ever changes; cheap to leave running while the
  // view is hidden too (redraw() no-ops on the then-0x0 canvas)
  let animationFrameId: number | null = null;
  function tick(): void {
    redraw();
    animationFrameId = requestAnimationFrame(tick);
  }
  animationFrameId = requestAnimationFrame(tick);

  function destroy(): void {
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerleave", onPointerLeave);
    canvas.removeEventListener("click", onClick);
    resizeObserver.disconnect();
    if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
  }

  return {
    refresh: () => redraw(),
    destroy,
  };
}
