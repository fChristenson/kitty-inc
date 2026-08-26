import { FLOOR_W } from "../../floors";
import { loadImage } from "../../utils";
import roofImageUrl from "../../assets/roof.png";

// native size of the processed roof.png (see scripts/process-roof.mjs) — width
// already matches FLOOR_W exactly, so it's drawn 1:1, never rescaled horizontally
const IMAGE_H = 297;
export const ROOF_H = IMAGE_H;

// pulls the roof's own bottom edge up into the top floor's own wall strip by this
// much, same fix as gameCanvas's FLOOR_OVERLAP, so no hairline gap shows at the seam
const ROOF_OVERLAP = 4;

let roofImage: HTMLImageElement | null = null;

// loads the roof cap once; main.ts awaits this alongside the other image loads
// before the first redraw ever needs it
export async function loadRoofImage(): Promise<HTMLImageElement> {
  roofImage = await loadImage(roofImageUrl);
  return roofImage;
}

// draws the roof cap directly above the topmost floor's own top edge; call from
// inside the same translated block gameCanvas.ts already draws that floor's own
// content in, so (0, 0) here is already that floor's own top-left corner
export function drawRoof(ctx: CanvasRenderingContext2D): void {
  if (!roofImage) return;
  ctx.drawImage(roofImage, 0, -ROOF_H + ROOF_OVERLAP, FLOOR_W, ROOF_H);
}
