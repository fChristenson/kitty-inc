import { FLOOR_W } from "../../floors";
import { drawCartoonText } from "../../utils";
import { loadThemeImage, type ThemeName } from "../../loadAssets";

// native size of the processed roof.png (see scripts/process-roof.mjs) — width
// already matches FLOOR_W exactly, so it's drawn 1:1, never rescaled horizontally
const IMAGE_H = 297;
export const ROOF_H = IMAGE_H;

// pulls the roof's own bottom edge up into the top floor's own wall strip by this
// much, same fix as gameCanvas's FLOOR_OVERLAP, so no hairline gap shows at the seam
const ROOF_OVERLAP = 4;

let roofImage: HTMLImageElement | null = null;
const roofByTheme = new Map<ThemeName, HTMLImageElement>();

// loads (or reuses an already-cached) theme's roof cap and makes it the active
// one drawRoof reads from — call whenever the active building's own theme
// changes, not just once
export async function loadRoofImage(
  theme: ThemeName = "references",
): Promise<HTMLImageElement> {
  const cached = roofByTheme.get(theme);
  if (cached) {
    roofImage = cached;
    return cached;
  }
  const loaded = await loadThemeImage(theme, "roof");
  if (loaded) roofByTheme.set(theme, loaded);
  roofImage = loaded;
  return loaded!;
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
