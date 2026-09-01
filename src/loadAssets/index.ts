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

// picks uniformly among every known theme, regardless of whether that theme has
// actually generated its own dist/ assets yet — any file it hasn't generated just
// falls back to DEFAULT_THEME's own copy (see the getThemeXUrl helpers below), so
// this stays meaningful (and needs no further code change) as more themes get
// their own art over time
export function pickRandomTheme(): ThemeName {
  return THEME_NAMES[Math.floor(Math.random() * THEME_NAMES.length)];
}

const DEFAULT_THEME: ThemeName = "references";

// Vite's import.meta.glob pattern must be a static string literal, so a runtime
// theme value can't be spliced into it — this globs every theme's dist assets up
// front (eager) instead, and the lookup helpers below filter down to whichever
// theme was actually asked for, falling back to DEFAULT_THEME for anything the
// requested theme hasn't generated yet
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
  roof: "roof.png", // rooftop cap
  coin: "coin.png", // flat coin icon (HUD/menus)
  mouse: "mouse.png", // free-boost critter
  officeChairsIcon: "isometricBox.png", // office-chairs upgrade icon
  officeSuppliesIcon: "isometricYarn.png", // office-supplies upgrade icon
  audience: "audience.png", // press conference audience backdrop
} as const;
export type ImageName = keyof typeof IMAGE_FILES;

// every processed floor background belonging to theme, in a stable sorted-filename
// order; falls back to DEFAULT_THEME's own set if theme hasn't generated any yet
export function getThemeBackgroundUrls(theme: ThemeName): string[] {
  const own = Object.keys(backgroundModules)
    .filter((path) => themeOf(path) === theme)
    .sort()
    .map((path) => backgroundModules[path]);
  if (own.length > 0 || theme === DEFAULT_THEME) return own;
  return getThemeBackgroundUrls(DEFAULT_THEME);
}

// theme's own ground/street art; falls back to DEFAULT_THEME's own copy
export function getThemeGroundUrl(theme: ThemeName): string | null {
  const path = Object.keys(groundModules).find((p) => themeOf(p) === theme);
  if (path) return groundModules[path];
  if (theme === DEFAULT_THEME) return null;
  return getThemeGroundUrl(DEFAULT_THEME);
}

// theme's own copy of one named sprite sheet; falls back to DEFAULT_THEME's own copy
export function getThemeSpriteUrl(
  theme: ThemeName,
  name: SpriteName,
): string | null {
  const filename = SPRITE_FILES[name];
  const path = Object.keys(spriteModules).find(
    (p) => themeOf(p) === theme && p.endsWith(`/${filename}`),
  );
  if (path) return spriteModules[path];
  if (theme === DEFAULT_THEME) return null;
  return getThemeSpriteUrl(DEFAULT_THEME, name);
}

export function loadThemeBackgrounds(
  theme: ThemeName,
): Promise<HTMLImageElement[]> {
  return Promise.all(getThemeBackgroundUrls(theme).map(loadImage));
}

export function loadThemeGroundImage(
  theme: ThemeName,
): Promise<HTMLImageElement | null> {
  const url = getThemeGroundUrl(theme);
  return url ? loadImage(url) : Promise.resolve(null);
}

export function loadThemeSprite(
  theme: ThemeName,
  name: SpriteName,
): Promise<HTMLImageElement | null> {
  const url = getThemeSpriteUrl(theme, name);
  return url ? loadImage(url) : Promise.resolve(null);
}

// theme's own copy of one named flat image; falls back to DEFAULT_THEME's own copy
export function getThemeImageUrl(
  theme: ThemeName,
  name: ImageName,
): string | null {
  const filename = IMAGE_FILES[name];
  const path = Object.keys(imageModules).find(
    (p) => themeOf(p) === theme && p.endsWith(`/${filename}`),
  );
  if (path) return imageModules[path];
  if (theme === DEFAULT_THEME) return null;
  return getThemeImageUrl(DEFAULT_THEME, name);
}

export function loadThemeImage(
  theme: ThemeName,
  name: ImageName,
): Promise<HTMLImageElement | null> {
  const url = getThemeImageUrl(theme, name);
  return url ? loadImage(url) : Promise.resolve(null);
}

// every processed cloud shape belonging to theme, in a stable sorted-filename
// order; falls back to DEFAULT_THEME's own set if theme hasn't generated any yet
export function getThemeCloudUrls(theme: ThemeName): string[] {
  const own = Object.keys(cloudModules)
    .filter((path) => themeOf(path) === theme)
    .sort()
    .map((path) => cloudModules[path]);
  if (own.length > 0 || theme === DEFAULT_THEME) return own;
  return getThemeCloudUrls(DEFAULT_THEME);
}

export function loadThemeClouds(theme: ThemeName): Promise<HTMLImageElement[]> {
  return Promise.all(getThemeCloudUrls(theme).map(loadImage));
}
