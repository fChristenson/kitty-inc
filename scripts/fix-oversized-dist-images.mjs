import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";

// one-off fix: every raw .jfif source in this repo has since been deleted, so
// the normal process-*.mjs scripts for these assets can't be re-run from
// scratch (same situation fix-coin-spin-axis.mjs already dealt with for
// coinSpin.png) — this instead resizes the ALREADY-BUILT dist output directly.
// These are all static UI icons or a small critter sprite that only ever
// render at a tiny fraction of their current resolution (see each entry's own
// comment below), so shipping/decoding/resampling their full AI-generated
// source size on every load (icons) or every animation frame (mouse, coin
// spin/bill flutter sheets) was pure waste. coin.png is deliberately excluded
// here — it's also process-pwa-icons.mjs's own source for up to a 512x512 PWA
// icon, so shrinking it below that would be a real quality regression there;
// see floors/coinFloat/index.ts's own pre-downscale cache for how its much
// smaller on-screen use is handled instead.
const dist = path.resolve(
  import.meta.dirname,
  "..",
  "src",
  "assets",
  "themes",
  "references",
  "dist",
);

async function resizeInPlace(file, resize) {
  const buffer = await fs.readFile(file);
  const out = await resize(sharp(buffer)).toBuffer();
  await fs.writeFile(file, out);
  const meta = await sharp(out).metadata();
  console.log(
    `resized ${path.relative(dist, file)}: ${meta.width}x${meta.height}`,
  );
}

const FLAT_ICONS = [
  // menu icons only ever render at ~28-34px (style.css's .worker-menu__icon)
  "shield.png",
  "graph.png",
  "merge.png",
  "skyscraper.png",
  "cashRegister.png",
  "isometricBox.png",
  "isometricYarn.png",
];
const ICON_MAX_DIMENSION = 160;

for (const name of FLAT_ICONS) {
  await resizeInPlace(path.join(dist, name), (img) =>
    img
      .resize(ICON_MAX_DIMENSION, ICON_MAX_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .png(),
  );
}

// the mouse critter only ever renders at RENDER_W=110 CSS px on a
// DPR-scaled canvas (src/mouse/index.ts)
await resizeInPlace(path.join(dist, "mouse.png"), (img) =>
  img.resize(360, 360, { fit: "inside", withoutEnlargement: true }).png(),
);

// coinBurst/index.ts's own flipbook sheets: only ever drawn at a per-particle
// diameter of at most ~136 CSS px (floors/coins's full-scale burst; every
// other caller scales it down further), so even at 3x devicePixelRatio the
// tallest a frame cell needs to be is well under its current height —
// resizing the WHOLE sheet uniformly keeps every frame's own aspect ratio
// (and drawCoinBurstFrame's naturalWidth/frameCount math) identical, just
// sampled from fewer source pixels
const SHEET_MAX_FRAME_HEIGHT = 460;
for (const rel of ["sprites/coinSpin.png", "sprites/cashBillFlutter.png"]) {
  const file = path.join(dist, rel);
  const before = await sharp(await fs.readFile(file)).metadata();
  const scale = Math.min(1, SHEET_MAX_FRAME_HEIGHT / before.height);
  const targetW = Math.round(before.width * scale);
  const targetH = Math.round(before.height * scale);
  await resizeInPlace(file, (img) => img.resize(targetW, targetH).png());
}
