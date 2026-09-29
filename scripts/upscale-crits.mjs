// Upscales shipped crit icons that are smaller than the cut-out size (cut
// from a small raw, or from before the size limit went up), keeping their cut.
//   node scripts/upscale-crits.mjs [kind ...]
// Originals go to tmp/_upscale/backup; the results to tmp/_sheets/upscaled.png
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { ROOT, WORK } from "./lib/crit-asset-paths.mjs";
import { isUndersized, upscaleCritIcons } from "./lib/crit-upscale.mjs";
import { writeContactSheet } from "./lib/contact-sheet.mjs";

const only = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const crits = path.join(ROOT, "public/crits");
// proc icons outside public/crits (cashRegister, clock, ...): each proc's
// `icon` name in critTypes, resolved through loadAssets' IMAGE_FILES
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const imageFiles = Object.fromEntries(
  [...read("src/loadAssets/index.ts").matchAll(/^\s+(\w+): "([^"/]+\.webp)"/gm)].map(
    (m) => [m[1], m[2]],
  ),
);
const procIcons = [
  ...new Set(
    [...read("src/shared/critTypes/index.ts").matchAll(/icon: "(\w+)"/g)]
      .map((m) => imageFiles[m[1]])
      .filter(Boolean),
  ),
].map((file) => path.join(ROOT, "public", file));
const files = [
  ...fs
    .readdirSync(crits, { recursive: true })
    .filter((file) => file.endsWith(".webp"))
    .map((file) => path.join(crits, file)),
  ...procIcons,
].filter((file) => !only.length || only.includes(path.basename(file, ".webp")));

const backupDir = path.join(WORK, "_upscale", "backup");
fs.mkdirSync(backupDir, { recursive: true });
const backup = (file) => {
  const target = path.join(
    backupDir,
    path.relative(path.join(ROOT, "public"), file).replaceAll(path.sep, "__"),
  );
  if (!fs.existsSync(target)) fs.copyFileSync(file, target);
};

for (const file of files) if (isUndersized(await sharp(file).metadata())) backup(file);

const done = await upscaleCritIcons(files);
const sheet = await writeContactSheet(
  done.map((file) => [path.basename(file, ".webp"), file]),
  path.join(WORK, "_sheets", "upscaled.png"),
);
console.log(`upscaled ${done.length} icon(s)${sheet ? `; ${path.relative(ROOT, sheet)}` : ""}`);
