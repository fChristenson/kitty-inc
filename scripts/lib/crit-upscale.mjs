import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import { WORK } from "./crit-asset-paths.mjs";
import { MAX_SIZE } from "./crit-cutout.mjs";

// sharp's cache keeps read icons open, which blocks overwriting them on Windows
sharp.cache(false);

// Real-ESRGAN (anime model, keeps alpha) enlarges crit icons whose cut came
// out smaller than MAX_SIZE, since there's no bigger raw to re-cut from
const TOOL_DIR = path.join(WORK, "_esrgan");
const TOOL = path.join(TOOL_DIR, "realesrgan-ncnn-vulkan.exe");
const TOOL_URL =
  "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-windows.zip";
const MODEL = "realesrgan-x4plus-anime";
const UNDERSIZED = MAX_SIZE * 0.9;

export const isUndersized = ({ width, height }) =>
  Math.sqrt(width * height) < UNDERSIZED;

async function ensureTool() {
  if (fs.existsSync(TOOL)) return;
  fs.mkdirSync(TOOL_DIR, { recursive: true });
  const zip = path.join(TOOL_DIR, "esrgan.zip");
  console.log("downloading Real-ESRGAN into tmp/_esrgan ...");
  const response = await fetch(TOOL_URL);
  if (!response.ok) throw new Error(`Real-ESRGAN download: ${response.status}`);
  fs.writeFileSync(zip, Buffer.from(await response.arrayBuffer()));
  execFileSync("tar", ["-xf", zip, "-C", TOOL_DIR]);
  fs.rmSync(zip);
}

// upscales each undersized .webp icon in place to MAX_SIZE area; returns the
// files it replaced
export async function upscaleCritIcons(files) {
  const icons = [];
  for (const file of files) {
    const meta = await sharp(file).metadata();
    if (isUndersized(meta)) icons.push({ file, ...meta });
  }
  if (!icons.length) return [];
  await ensureTool();
  const inDir = path.join(WORK, "_upscale", "in");
  const outDir = path.join(WORK, "_upscale", "out");
  for (const dir of [inDir, outDir]) {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
  }
  icons.forEach((icon, i) => (icon.name = `${i}.png`));
  for (const icon of icons)
    await sharp(icon.file).png().toFile(path.join(inDir, icon.name));
  console.log(`upscaling ${icons.length} icon(s) ...`);
  execFileSync(TOOL, ["-i", inDir, "-o", outDir, "-n", MODEL, "-f", "png"], {
    cwd: TOOL_DIR,
    stdio: "ignore",
  });
  const done = [];
  for (const icon of icons) {
    const scale = MAX_SIZE / Math.sqrt(icon.width * icon.height);
    const up = await sharp(path.join(outDir, icon.name))
      .resize(Math.round(icon.width * scale), Math.round(icon.height * scale), {
        kernel: "lanczos3",
      })
      .png()
      .toBuffer();
    await sharp(up)
      .webp({ quality: 85, alphaQuality: 90, effort: 6 })
      .toFile(icon.file);
    done.push(icon.file);
  }
  for (const dir of [inDir, outDir])
    fs.rmSync(dir, { recursive: true, force: true });
  return done;
}
