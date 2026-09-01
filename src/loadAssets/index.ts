import { loadImage } from "../utils";

// every theme folder that currently exists under src/assets/themes/ — "references"
// is the original/default theme (its own dist/ is the only one with real generated
// assets today); the rest each get their own dist/ once their own art is generated
// (see each theme's own prompts.md)
export type ThemeName =
  | "references"
  | "corporate-tech-hq"
  | "bank-finance"
  | "law-firm"
  | "bakery-cafe"
  | "medical-wellness-clinic"
  | "fitness-gym"
  | "retail-boutique"
  | "restaurant-hospitality"
  | "creative-design-studio"
  | "toy-kids-brand";

export const THEME_NAMES: ThemeName[] = [
  "references",
  "corporate-tech-hq",
  "bank-finance",
  "law-firm",
  "bakery-cafe",
  "medical-wellness-clinic",
  "fitness-gym",
  "retail-boutique",
  "restaurant-hospitality",
  "creative-design-studio",
  "toy-kids-brand",
];

// Vite's import.meta.glob pattern must be a static string literal, so a runtime
// theme value can't be spliced into it — this globs every theme's dist assets up
// front (eager) instead, and the lookup helpers below filter down to whichever
// theme was actually asked for. No fallback to another theme: a theme's assets
// are always used together as one complete set, never mixed file-by-file with
// another theme's copy (see getThemesWithFullAssets/getThemeXUrl below).
const backgroundModules = import.meta.glob<string>(
  "../assets/themes/*/dist/backgrounds/*.png",
  { eager: true, import: "default" },
);
const groundModules = import.meta.glob<string>(
  "../assets/themes/*/dist/ground/street.png",
  { eager: true, import: "default" },
);
const spriteModules = import.meta.glob<string>(
  "../assets/themes/*/dist/sprites/*.png",
  { eager: true, import: "default" },
);
// flat single-file images living directly in a theme's own dist/ root (icons,
// backdrops, textures — anything that isn't a multi-file set like backgrounds/
// sprites/clouds above)
const imageModules = import.meta.glob<string>("../assets/themes/*/dist/*.png", {
  eager: true,
  import: "default",
});
const cloudModules = import.meta.glob<string>(
  "../assets/themes/*/dist/clouds/*.png",
  { eager: true, import: "default" },
);

// pulls the theme folder name back out of a glob key like
// "../assets/themes/bakery-cafe/dist/sprites/workerWalk.png"
function themeOf(path: string): string {
  return path.match(/\/themes\/([^/]+)\/dist\//)?.[1] ?? "";
}

// every sprite this game loads, by logical name -> its filename inside a theme's
// own dist/sprites/ folder — kept here so every theme is expected to supply the
// exact same set instead of each caller hardcoding its own filename
const SPRITE_FILES = {
  worker: "workerWalk.png",
  manager: "managerWalk.png",
  coinSpin: "coinSpin.png",
  cashBill: "cashBillFlutter.png",
  podium: "podiumSpeak.png",
} as const;
export type SpriteName = keyof typeof SPRITE_FILES;

// every flat single-file image this game loads, by logical name -> its filename
// inside a theme's own dist/ root — same reasoning as SPRITE_FILES above
const IMAGE_FILES = {
  city: "city.png", // distant tiled skyline behind buildings
  cityMapBackground: "mapBg.png", // city map screen's own backdrop
  wallMaterial: "wallMaterial.png", // exterior wall/floor-divider tile material
  coin: "coin.png", // flat coin icon (HUD/menus)
  mouse: "mouse.png", // free-boost critter
  officeChairsIcon: "isometricBox.png", // office-chairs upgrade icon
  officeSuppliesIcon: "isometricYarn.png", // office-supplies upgrade icon
  audience: "audience.png", // press conference audience backdrop
} as const;
export type ImageName = keyof typeof IMAGE_FILES;

// every processed floor background belonging to theme — NEVER falls back to
// another theme; a company's entire set of assets (backgrounds, ground, wall
// material, skyline, map backdrop, sprites) must always come from the SAME
// theme, never mixed file-by-file with another theme's copy. Throws if theme
// hasn't generated these yet — callers must only ever pass a theme returned by
// getThemesWithFullAssets() (see company.ts's pickLeastUsedMapTheme), which
// already guarantees this never happens in practice.
export function getThemeBackgroundUrls(theme: ThemeName): string[] {
  const own = Object.keys(backgroundModules)
    .filter((path) => themeOf(path) === theme)
    .sort()
    .map((path) => backgroundModules[path]);
  if (own.length === 0) {
    throw new Error(`Theme "${theme}" has no floor backgrounds generated`);
  }
  return own;
}

// theme's own ground/street art — never falls back, see getThemeBackgroundUrls
export function getThemeGroundUrl(theme: ThemeName): string {
  const path = Object.keys(groundModules).find((p) => themeOf(p) === theme);
  if (!path) {
    throw new Error(`Theme "${theme}" has no ground/street art generated`);
  }
  return groundModules[path];
}

// theme's own copy of one named sprite sheet — never falls back, see
// getThemeBackgroundUrls
export function getThemeSpriteUrl(theme: ThemeName, name: SpriteName): string {
  const filename = SPRITE_FILES[name];
  const path = Object.keys(spriteModules).find(
    (p) => themeOf(p) === theme && p.endsWith(`/${filename}`),
  );
  if (!path) {
    throw new Error(`Theme "${theme}" is missing sprite "${filename}"`);
  }
  return spriteModules[path];
}

export function loadThemeBackgrounds(
  theme: ThemeName,
): Promise<HTMLImageElement[]> {
  return Promise.all(getThemeBackgroundUrls(theme).map(loadImage));
}

export function loadThemeGroundImage(
  theme: ThemeName,
): Promise<HTMLImageElement> {
  return loadImage(getThemeGroundUrl(theme));
}

export function loadThemeSprite(
  theme: ThemeName,
  name: SpriteName,
): Promise<HTMLImageElement> {
  return loadImage(getThemeSpriteUrl(theme, name));
}

// theme's own copy of one named flat image — never falls back, see
// getThemeBackgroundUrls. Callers loading a genuinely shared/non-themed image
// (coin/mouse/audience/isometricBox/isometricYarn — see IMAGE_FILES) always pass
// the literal "references" theme themselves, never a variable, so this never
// throws for those.
export function getThemeImageUrl(theme: ThemeName, name: ImageName): string {
  const filename = IMAGE_FILES[name];
  const path = Object.keys(imageModules).find(
    (p) => themeOf(p) === theme && p.endsWith(`/${filename}`),
  );
  if (!path) {
    throw new Error(`Theme "${theme}" is missing image "${filename}"`);
  }
  return imageModules[path];
}

export function loadThemeImage(
  theme: ThemeName,
  name: ImageName,
): Promise<HTMLImageElement> {
  return loadImage(getThemeImageUrl(theme, name));
}

// true only if theme has generated its OWN copy of EVERY asset that's supposed to
// vary per-theme (skyline, map backdrop, floor backgrounds, ground, wall
// material, worker + manager sprites) — this is the complete set a company's
// buildings + map together need, so a company is never left with some pieces
// from one theme and some from another. Anything that picks a theme for a whole
// company (company.ts's pickLeastUsedMapTheme) must filter through
// getThemesWithFullAssets() instead of picking from all of THEME_NAMES.
function themeHasFullAssets(theme: ThemeName): boolean {
  const hasOwnImage = (name: ImageName) =>
    Object.keys(imageModules).some(
      (p) => themeOf(p) === theme && p.endsWith(`/${IMAGE_FILES[name]}`),
    );
  const hasOwnSprite = (name: SpriteName) =>
    Object.keys(spriteModules).some(
      (p) => themeOf(p) === theme && p.endsWith(`/${SPRITE_FILES[name]}`),
    );
  const hasOwnBackgrounds = Object.keys(backgroundModules).some(
    (p) => themeOf(p) === theme,
  );
  const hasOwnGround = Object.keys(groundModules).some(
    (p) => themeOf(p) === theme,
  );
  return (
    hasOwnImage("city") &&
    hasOwnImage("cityMapBackground") &&
    hasOwnImage("wallMaterial") &&
    hasOwnSprite("worker") &&
    hasOwnSprite("manager") &&
    hasOwnBackgrounds &&
    hasOwnGround
  );
}

// every theme with its own COMPLETE set of per-theme-varying art generated so
// far — grows on its own as more themes get processed, no code change needed
// elsewhere. Always includes "references" (the hand-authored original, which has
// every asset by construction).
export function getThemesWithFullAssets(): ThemeName[] {
  return THEME_NAMES.filter(themeHasFullAssets);
}

// every processed cloud shape belonging to theme — never falls back, see
// getThemeBackgroundUrls. Clouds are NOT themed (every call site passes the
// literal "references" theme itself), so this never throws in practice.
export function getThemeCloudUrls(theme: ThemeName): string[] {
  const own = Object.keys(cloudModules)
    .filter((path) => themeOf(path) === theme)
    .sort()
    .map((path) => cloudModules[path]);
  if (own.length === 0) {
    throw new Error(`Theme "${theme}" has no clouds generated`);
  }
  return own;
}

export function loadThemeClouds(theme: ThemeName): Promise<HTMLImageElement[]> {
  return Promise.all(getThemeCloudUrls(theme).map(loadImage));
}
