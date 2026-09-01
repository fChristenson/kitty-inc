import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";

// raw floor background art (e.g. src/assets/bg.png, bg2.png, bg3.png, ...) dropped
// straight into src/assets/ — usually straight out of an AI image generator, often
// with a plain-color padding border around the actual artwork and not exactly the
// game's floor size. This trims that border and resizes/crops each one to the fixed
// floor size (must match FLOOR_W/FLOOR_H in src/floors/constants.ts), writing the
// result into src/assets/themes/references/dist/backgrounds/ — the "references"
// theme's own dist folder loadAssets.ts actually loads every background from. Safe
// to re-run any time new bgN.png files are added; only ever reads the raw
// src/assets/bgN.* files, never overwrites them.

const FLOOR_W = 1248;
const FLOOR_H = 721;

const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const outDir = path.join(assets, "themes", "references", "dist", "backgrounds");

async function processBackgroundImage(file) {
  const src = path.join(assets, file);
  const dest = path.join(outDir, file.replace(/\.(jpe?g)$/i, ".png"));

  // trim() finds the tightest rectangular bounding box around non-background content,
  // but AI-generated art often has a soft vignette / rounded-corner fade to white —
  // the box's own corners can still contain a sliver of that fade, which trim (a
  // single rectangular crop) can never fully remove on its own
  const trimmed = await sharp(src).trim().toBuffer({ resolveWithObject: true });

  // so shave a further small fixed percentage off every edge of the trimmed result,
  // guaranteeing a fully clean edge regardless of exactly how much fade trim left behind
  const insetFrac = 0.02;
  const insetX = Math.round(trimmed.info.width * insetFrac);
  const insetY = Math.round(trimmed.info.height * insetFrac);

  await sharp(trimmed.data)
    .extract({
      left: insetX,
      top: insetY,
      width: trimmed.info.width - insetX * 2,
      height: trimmed.info.height - insetY * 2,
    })
    .resize(FLOOR_W, FLOOR_H, { fit: "cover", position: "attention" })
    .png()
    .toFile(dest);

  console.log(
    `${file} -> backgrounds/${path.basename(dest)} (${FLOOR_W}x${FLOOR_H})`,
  );
}

const files = (await fs.readdir(assets)).filter((f) =>
  /^bg\d*\.(png|jpe?g)$/i.test(f),
);

if (files.length === 0) {
  console.log(
    "no bgN.png/.jpg source images found directly in src/assets/ — nothing to do",
  );
} else {
  await fs.mkdir(outDir, { recursive: true });
  for (const file of files) await processBackgroundImage(file);
}
