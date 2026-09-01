import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";
import { resolveThemeDirs } from "./lib/theme-dirs.mjs";

// raw floor background art (e.g. bg.png, bg2.jfif, bg3.jfif, ...) dropped straight
// into a theme's own src/assets/themes/<theme>/ folder — usually straight out of
// an AI image generator, often with a plain-color padding border around the
// actual artwork and not exactly the game's floor size. This trims that border
// and resizes/crops each one to the fixed floor size (must match FLOOR_W/FLOOR_H
// in src/floors/constants.ts), writing the result into that same theme's own
// dist/backgrounds/ — the folder loadAssets.ts actually loads every background
// from. Pass --theme=<name> to process a theme other than the default
// "references" (e.g. --theme=corporate-tech-hq). Safe to re-run any time new bgN
// files are added; only ever reads the raw bgN.* files, never overwrites them.

const FLOOR_W = 1248;
const FLOOR_H = 721;

const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const { theme, themeDir, distDir } = resolveThemeDirs(assets);
const outDir = path.join(distDir, "backgrounds");

async function processBackgroundImage(file) {
  const src = path.join(themeDir, file);
  const dest = path.join(outDir, file.replace(/\.(jpe?g|jfif)$/i, ".png"));

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
    `${file} -> ${theme}/dist/backgrounds/${path.basename(dest)} (${FLOOR_W}x${FLOOR_H})`,
  );
}

const files = (await fs.readdir(themeDir, { withFileTypes: true }))
  .filter((e) => e.isFile())
  .map((e) => e.name)
  .filter((f) => /^bg\d*\.(png|jpe?g|jfif)$/i.test(f));

if (files.length === 0) {
  console.log(
    `no bgN.png/.jpg/.jfif source images found directly in ${path.relative(assets, themeDir)}/ — nothing to do`,
  );
} else {
  await fs.mkdir(outDir, { recursive: true });
  for (const file of files) await processBackgroundImage(file);
}

