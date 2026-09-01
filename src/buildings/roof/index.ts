import { FLOOR_W } from "../../floors";
import { drawCartoonText, loadImage } from "../../utils";
import roofUrl from "../../assets/themes/references/dist/roof.png";

// native size of roof.png — width already matches FLOOR_W exactly, so it's drawn
// 1:1, never rescaled horizontally
const IMAGE_H = 297;
export const ROOF_H = IMAGE_H;

// pulls the roof's own bottom edge up into the top floor's own wall strip by this
// much, same fix as gameCanvas's FLOOR_OVERLAP, so no hairline gap shows at the seam
const ROOF_OVERLAP = 4;

// roof cap is the same for every theme — no per-theme art, just the reference image
let roofImage: HTMLImageElement | null = null;
let roofPromise: Promise<HTMLImageElement> | null = null;

// loads (once, cached forever) the single shared roof cap and makes it the one
// drawRoof reads from
export function loadRoofImage(): Promise<HTMLImageElement> {
  if (!roofPromise) {
    roofPromise = loadImage(roofUrl).then((loaded) => {
      roofImage = loaded;
      return loaded;
    });
  }
  return roofPromise;
}

// draws the roof cap (+ the building's total floor count, centered on it) directly
// above the topmost floor's own top edge; call from inside the same translated
// block gameCanvas.ts already draws that floor's own content in, so (0, 0) here is
// already that floor's own top-left corner
export function drawRoof(
  ctx: CanvasRenderingContext2D,
  totalFloors: number,
): void {
  if (!roofImage) return;
  const topY = -ROOF_H + ROOF_OVERLAP;
  ctx.drawImage(roofImage, 0, topY, FLOOR_W, ROOF_H);

  // sits on the thin ledge band near the bottom of the roof cap, just above the wall
  ctx.font = '900 100px "Fredoka", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  drawCartoonText(
    ctx,
    `${totalFloors} floors`,
    FLOOR_W / 2,
    topY + ROOF_H - 465,
  );
}
