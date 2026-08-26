import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";

// AI image generators/downloads routinely hand us a JPEG saved with a ".png"
// extension (real JPEG bytes, e.g. FF D8 FF ... under the hood) — any tool that
// actually parses PNG structure (sharp, this repo's own processing scripts, browser
// devtools image analysis, etc.) then fails or misbehaves on it. This scans every
// *.png under src/assets (recursing into subfolders) and re-encodes any file whose
// real bytes aren't a PNG back into a genuine PNG, in place, preserving the
// filename. Safe to re-run any time; files already real PNGs are left untouched.

const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // "\x89PNG"

async function findPngFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return findPngFiles(full);
      return entry.name.toLowerCase().endsWith(".png") ? [full] : [];
    }),
  );
  return files.flat();
}

async function isRealPng(file) {
  const handle = await fs.open(file, "r");
  try {
    const buf = Buffer.alloc(4);
    await handle.read(buf, 0, 4, 0);
    return buf.equals(PNG_SIGNATURE);
  } finally {
    await handle.close();
  }
}

const files = await findPngFiles(assets);
let fixedCount = 0;
for (const file of files) {
  if (await isRealPng(file)) continue;
  const tmp = file + ".tmp";
  await sharp(file).png().toFile(tmp);
  await fs.rename(tmp, file);
  fixedCount++;
  console.log(`fixed ${path.relative(assets, file)} (was not a real PNG)`);
}

console.log(
  fixedCount === 0
    ? `checked ${files.length} file(s), all were already real PNGs`
    : `checked ${files.length} file(s), fixed ${fixedCount}`,
);
