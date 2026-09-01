import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";

// raw base2.jfif..base11.jfif dropped straight into src/assets/ (one AI-generated
// room shell per themed variant in docs/prompts.md's "Base interior wall shells"
// section, in the exact same order those variants are listed there). Converts each
// to png and MOVES it (not a copy — the raw .jfif is deleted once its png lands) into
// its own src/assets/themes/<theme-name>/base.png, mirroring the existing
// src/assets/themes/references/ tidy-up. Safe to re-run: any baseN.jfif already
// moved is simply skipped.
const NUMBER_TO_THEME = {
  2: "corporate-tech-hq",
  3: "bank-finance",
  4: "law-firm",
  5: "bakery-cafe",
  6: "medical-wellness-clinic",
  7: "fitness-gym",
  8: "retail-boutique",
  9: "restaurant-hospitality",
  10: "creative-design-studio",
  11: "toy-kids-brand",
};

const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const themesDir = path.join(assets, "themes");

for (const [num, theme] of Object.entries(NUMBER_TO_THEME)) {
  const src = path.join(assets, `base${num}.jfif`);
  const destDir = path.join(themesDir, theme);
  const dest = path.join(destDir, "base.png");

  try {
    await fs.access(src);
  } catch {
    console.log(`base${num}.jfif not found — already moved, skipping`);
    continue;
  }

  await fs.mkdir(destDir, { recursive: true });
  await sharp(src).png().toFile(dest);
  await fs.unlink(src);
  console.log(`base${num}.jfif -> themes/${theme}/base.png`);
}
