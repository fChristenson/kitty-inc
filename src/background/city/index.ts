import { loadThemeImage, type ThemeName } from "../../loadAssets";

// a rich, pre-illustrated city skyline (dusk gradient baked into the art itself),
// tiled horizontally across whatever world-x range is currently visible. The art
// isn't perfectly seamless edge-to-edge, but at this render size/distance and with
// the camera constantly panning, occasional tile seams aren't noticeable — far
// simpler than trying to chroma-key/blend the image's own smooth sky gradient.

// native size of city.png
const IMAGE_W = 1248;
const IMAGE_H = 832;

// how tall one tile renders, in world units — everything above this altitude is
// the plain programmatic sky gradient (see gameCanvas's SKY_COLOR_GROUND, which is
// matched to this image's own top-edge color so the seam between the two is as
// close to invisible as possible)
export const CITY_MAX_HEIGHT = 1800;
const TILE_W = CITY_MAX_HEIGHT * (IMAGE_W / IMAGE_H);

let cityImage: HTMLImageElement | null = null;

// loads the skyline art for the given company's own map theme (see
// company.ts's getMapTheme/setMapTheme — picked once per company, unlike
// buildings' own independently random themes); main.ts awaits this alongside
// loadFloorBackgrounds before the first frame ever needs to draw it
export async function loadCityImage(
  theme: ThemeName = "references",
): Promise<HTMLImageElement> {
  cityImage = await loadThemeImage(theme, "city");
  return cityImage!;
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
