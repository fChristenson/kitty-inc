import { loadThemeImage, type ThemeName } from "../../loadAssets";
import { COLOR } from "../../palette";

// a rich, pre-illustrated city skyline (dusk gradient baked into the art itself),
// tiled horizontally across whatever world-x range is currently visible. The art
// isn't perfectly seamless edge-to-edge, but at this render size/distance and with
// the camera constantly panning, occasional tile seams aren't noticeable — far
// simpler than trying to chroma-key/blend the image's own smooth sky gradient.

// native size of city.png
const IMAGE_W = 1248;
const IMAGE_H = 832;

// how tall one tile renders, in world units — everything above this altitude is
// the plain programmatic sky gradient (see gameCanvas's sky fill, which starts at
// getCitySkyGroundColor() so the seam between the two is as close to invisible as
// possible)
export const CITY_MAX_HEIGHT = 1800;
const TILE_W = CITY_MAX_HEIGHT * (IMAGE_W / IMAGE_H);

// each theme's own city.png bakes in a different dusk-gradient top-edge color —
// the programmatic sky gradient behind it must start at that SAME color per theme
// (see getCitySkyGroundColor below), or the seam between the art and the plain
// gradient shows as a visible band once a non-references theme is active. Sampled
// by averaging each theme's own city.png top pixel row; COLOR.skyGround (palette.ts)
// is references' own value and doubles as the fallback for any theme that hasn't
// been sampled yet. Re-sample and add an entry here whenever a new theme's own
// city.png is generated.
const THEME_SKY_GROUND_COLOR: Partial<Record<ThemeName, string>> = {
  "corporate-tech-hq": "#3A6899",
};

let cityImage: HTMLImageElement | null = null;
let activeTheme: ThemeName = "references";

// loads the skyline art for the given company's own map theme (see
// company.ts's getMapTheme/setMapTheme — picked once per company, unlike
// buildings' own independently random themes); main.ts awaits this alongside
// loadFloorBackgrounds before the first frame ever needs to draw it
export async function loadCityImage(
  theme: ThemeName = "references",
): Promise<HTMLImageElement> {
  cityImage = await loadThemeImage(theme, "city");
  activeTheme = theme;
  return cityImage!;
}

// the sky gradient's own ground-band color (see gameCanvas.ts) must match whichever
// theme's city.png is currently active — falls back to COLOR.skyGround (references'
// own value) for any theme without its own sampled override in the table above
export function getCitySkyGroundColor(): string {
  return THEME_SKY_GROUND_COLOR[activeTheme] ?? COLOR.skyGround;
}

// draws every tile of the skyline whose slot overlaps [visibleLeft, visibleRight]
// (world units), each sitting with its bottom edge at groundY
export function drawCity(
  ctx: CanvasRenderingContext2D,
  groundY: number,
  visibleLeft: number,
  visibleRight: number,
): void {
  if (!cityImage) return;
  const tileMin = Math.floor(visibleLeft / TILE_W) - 1;
  const tileMax = Math.ceil(visibleRight / TILE_W) + 1;

  for (let tile = tileMin; tile <= tileMax; tile++) {
    const x = tile * TILE_W;
    if (x + TILE_W < visibleLeft || x > visibleRight) continue;
    ctx.drawImage(
      cityImage,
      x,
      groundY - CITY_MAX_HEIGHT,
      TILE_W,
      CITY_MAX_HEIGHT,
    );
  }
}
