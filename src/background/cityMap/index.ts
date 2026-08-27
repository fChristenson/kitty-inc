import { loadImage, drawCartoonText, formatTotalIncome } from "../../utils";
import { COLOR } from "../../palette";
import cityMapUrl from "../../assets/city2Bg.png";
import catSpriteUrl from "../../assets/sprites/kitty1Walk.png";

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
// the second building's price is a placeholder — real per-building pricing (see
// buildings/index.ts's getBuildingPrice) comes once more than 2 buildings exist here
const NEXT_BUILDING_PRICE_TEXT = "$1B";

let mapImage: HTMLImageElement | null = null;
let catSprite: HTMLImageElement | null = null;

export async function loadCityMapImage(): Promise<HTMLImageElement> {
  [mapImage, catSprite] = await Promise.all([
    loadImage(cityMapUrl),
    loadImage(catSpriteUrl),
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
  // which marker (0/1/null) the pointer is currently over — an unlocked hovered
  // marker freezes on the jump pose instead of cycling, as a "click me" hint
  let hoveredBuilding: number | null = null;

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    cssW = rect.width;
    cssH = rect.height;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
  }

  // building 0's marker always sits bottom-left; building 1's sits further up —
  // fixed screen positions since this is a flat, non-scrolling static map
  function markerCenter(buildingIndex: number): { cx: number; feetY: number } {
    return buildingIndex === 0
      ? { cx: 70, feetY: cssH - 40 }
      : { cx: cssW * 0.62, feetY: cssH * 0.4 };
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

  // buildings beyond index 1 don't have a marker here yet (see module comment)
  function hitTestAnyMarker(x: number, y: number): number | null {
    if (hitTestMarker(0, x, y)) return 0;
    if (hitTestMarker(1, x, y)) return 1;
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

    // building 0: always unlocked, plays the stand/jump cycle while it's the
    // active building or currently hovered — otherwise it's just parked there
    // standing
    drawCatMarker(
      0,
      activeIndex === 0 || hoveredBuilding === 0 ? pose : CAT_STAND_FRAME,
      false,
    );

    // building 1: grayed out with its price until bought, then behaves exactly
    // like building 0 (stand/jump while active or hovered, otherwise standing)
    const unlocked = deps.getBuildingCount() >= 2;
    if (unlocked) {
      drawCatMarker(
        1,
        activeIndex === 1 || hoveredBuilding === 1 ? pose : CAT_STAND_FRAME,
        false,
      );
    } else {
      drawCatMarker(1, CAT_STAND_FRAME, true);
      const { cx, feetY } = markerCenter(1);
      ctx.font = '900 22px "Fredoka", system-ui, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      drawCartoonText(
        ctx,
        NEXT_BUILDING_PRICE_TEXT,
        cx,
        feetY + 6,
        COLOR.white,
      );
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
    // a locked building-1 marker doesn't get the frozen jump-pose hover treatment
    // — that's reserved for markers you can actually travel to right now
    hoveredBuilding = hit === 1 && deps.getBuildingCount() < 2 ? null : hit;
  }

  // a locked building-1 click just buys it (staying on the map so its color/price
  // change is visible); an unlocked one switches to it and leaves the map entirely
  function onClick(event: MouseEvent): void {
    const p = canvasPoint(event);
    const hit = hitTestAnyMarker(p.x, p.y);
    if (hit === null) return;
    if (hit === 1 && deps.getBuildingCount() < 2) {
      deps.buyBuilding();
      redraw();
      return;
    }
    deps.onSelectBuilding(hit);
  }

  function onPointerLeave(): void {
    hoveredBuilding = null;
    canvas.style.cursor = "default";
  }

  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("click", onClick);

  const resizeObserver = new ResizeObserver(() => {
    resize();
    redraw();
  });
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
    refresh: () => {
      resize();
      redraw();
    },
    destroy,
  };
}
