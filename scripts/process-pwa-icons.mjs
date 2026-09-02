import sharp from "sharp";
import path from "node:path";

// generates the icon set referenced by public/manifest.webmanifest from the same
// coin art favicon.png was derived from (see process-favicon.mjs) — re-run this
// any time that source art changes
const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const publicDir = path.resolve(import.meta.dirname, "..", "public");
const src = path.join(assets, "themes", "references", "dist", "coin.png");

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
// how much of each icon's canvas the coin fills — the rest is breathing-room padding
// so it never sits flush against the icon's edge (or, for the maskable icon,
// Android's own safe-zone edge) once a mobile OS renders/masks it
const CONTENT_FRACTION = 0.65;

// resizes the coin to fit within size*CONTENT_FRACTION, then composites it centered
// onto a full size x size canvas of `background` — real padding, not just aspect-fit
// slack from the coin art's own non-square (697x702) dimensions
async function renderPaddedIcon(size, background) {
  const contentSize = Math.round(size * CONTENT_FRACTION);
  const content = await sharp(src)
    .resize(contentSize, contentSize, {
      fit: "contain",
      background: TRANSPARENT,
    })
    .png()
    .toBuffer();

  return sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: content, gravity: "center" }])
    .png()
    .toBuffer();
}

await sharp(await renderPaddedIcon(192, TRANSPARENT)).toFile(
  path.join(publicDir, "icon-192.png"),
);
await sharp(await renderPaddedIcon(512, TRANSPARENT)).toFile(
  path.join(publicDir, "icon-512.png"),
);
await sharp(await renderPaddedIcon(512, "#FFFFFF")).toFile(
  path.join(publicDir, "icon-512-maskable.png"),
);
