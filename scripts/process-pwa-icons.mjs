import sharp from "sharp";
import path from "node:path";

// generates the icon set referenced by public/manifest.webmanifest from the same
// coin art favicon.png was derived from (see process-favicon.mjs) — re-run this
// any time that source art changes
const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const publicDir = path.resolve(import.meta.dirname, "..", "public");
const src = path.join(assets, "themes", "references", "dist", "coin.png");

const MASKABLE_SIZE = 512;
// Android's maskable-icon spec only guarantees the center ~80% (safe zone)
// survives whatever mask shape (circle, squircle, etc.) is applied
const MASKABLE_SAFE_ZONE = Math.round(MASKABLE_SIZE * 0.8);
const MASKABLE_BG = "#FFFFFF";

await sharp(src)
  .resize(192, 192, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toFile(path.join(publicDir, "icon-192.png"));

await sharp(src)
  .resize(512, 512, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toFile(path.join(publicDir, "icon-512.png"));

const safeZoneCoin = await sharp(src)
  .resize(MASKABLE_SAFE_ZONE, MASKABLE_SAFE_ZONE, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

await sharp({
  create: {
    width: MASKABLE_SIZE,
    height: MASKABLE_SIZE,
    channels: 4,
    background: MASKABLE_BG,
  },
})
  .composite([{ input: safeZoneCoin, gravity: "center" }])
  .png()
  .toFile(path.join(publicDir, "icon-512-maskable.png"));
