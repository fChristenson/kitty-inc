import path from "node:path";
import fs from "node:fs/promises";
import { addStickerBorder, DEFAULT_BORDER } from "./lib/sticker-border.mjs";

// Regenerates the white-bordered sticker cut of every crit icon into
// public/stickers/, which is where the Special Crits dialog reads them from.
//
//   node scripts/add-sticker-borders.mjs                # every crit icon
//   node scripts/add-sticker-borders.mjs ninja cowboy   # just these
//   node scripts/add-sticker-borders.mjs --border=14    # thicker white
//   node scripts/add-sticker-borders.mjs --out=tmp      # somewhere else

const publicDir = path.resolve(import.meta.dirname, "../public");
const loadAssetsFile = path.resolve(
  import.meta.dirname,
  "../src/loadAssets/index.ts",
);
const critTypesDir = path.resolve(
  import.meta.dirname,
  "../src/shared/critTypes",
);

// Driven by the canonical CRIT_PROC_INFO icons rather than by "everything in
// IMAGE_FILES that isn't a theme image" — a few procs (Tick Tock, the boost
// menu's own crits) point at icons the theme also uses, and those still need a
// sticker cut for the dialog.
async function critIconFiles() {
  const source = await fs.readFile(loadAssetsFile, "utf8");
  const imageBlock = source.match(
    /export const IMAGE_FILES = \{([\s\S]*?)\n\} as const;/,
  );
  if (!imageBlock) {
    throw new Error("Could not parse IMAGE_FILES from src/loadAssets/index.ts");
  }
  const filenameByName = new Map(
    [...imageBlock[1].matchAll(/(\w+):\s*"([^"]+\.png)"/g)].map((match) => [
      match[1],
      match[2],
    ]),
  );
  const files = new Set();
  for (const entry of await fs.readdir(critTypesDir)) {
    if (!entry.endsWith(".ts")) continue;
    const critSource = await fs.readFile(
      path.join(critTypesDir, entry),
      "utf8",
    );
    for (const match of critSource.matchAll(/\bicon:\s*"(\w+)"/g)) {
      const filename = filenameByName.get(match[1]);
      if (!filename) throw new Error(`Unregistered crit icon: ${match[1]}`);
      files.add(filename);
    }
  }
  return [...files].sort();
}

const args = process.argv.slice(2);
const borderArg = args.find((arg) => arg.startsWith("--border="));
const outArg = args.find((arg) => arg.startsWith("--out="));
const border = borderArg ? Number(borderArg.slice(9)) : DEFAULT_BORDER;
if (!Number.isFinite(border) || border <= 0) {
  throw new Error(`Invalid --border value: ${borderArg}`);
}
const outDir = path.resolve(
  import.meta.dirname,
  "..",
  outArg ? outArg.slice(6) : "public/stickers",
);
const requested = args.filter((arg) => !arg.startsWith("--"));
const names = requested.length ? requested : await critIconFiles();

let done = 0;
const missing = [];
for (const name of names) {
  const file = `${name.replace(/\.png$/, "")}.png`;
  const source = path.join(publicDir, file);
  try {
    await fs.access(source);
  } catch {
    missing.push(file);
    continue;
  }
  await addStickerBorder(source, path.join(outDir, file), border);
  done++;
}
console.log(
  `Added a ${border}px white sticker border to ${done} icon(s) -> ${path.relative(process.cwd(), outDir)}`,
);
if (missing.length) {
  console.warn(
    `Skipped ${missing.length} missing icon(s): ${missing.join(", ")}`,
  );
}
