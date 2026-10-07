import path from "node:path";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  addStickerBorder,
  writeSilhouette,
  DEFAULT_BORDER,
} from "./lib/sticker-border.mjs";
import { critIconFile } from "./lib/crit-asset-paths.mjs";

// Regenerates the white-bordered sticker cut (public/stickers/) and the
// undiscovered silhouette (public/silhouettes/) of every crit icon in public/.
//
//   node scripts/add-sticker-borders.mjs                # every crit icon
//   node scripts/add-sticker-borders.mjs ninja cowboy   # just these
//   node scripts/add-sticker-borders.mjs --stale        # only icons changed since
//                                                       # their sticker (npm run build)
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
    [...imageBlock[1].matchAll(/(\w+):\s*"([^"]+\.webp)"/g)].map((match) => [
      match[1],
      match[2],
    ]),
  );
  const files = new Set();
  const critSourceFiles = [
    ...(await fs.readdir(critTypesDir)).map((entry) =>
      path.join(critTypesDir, entry),
    ),
    ...(await fs.readdir(path.join(critTypesDir, "../critData"))).map((entry) =>
      path.join(critTypesDir, "../critData", entry),
    ),
  ];
  for (const file of critSourceFiles) {
    if (!file.endsWith(".ts")) continue;
    const critSource = await fs.readFile(file, "utf8");
    for (const match of critSource.matchAll(/\bimage:\s*"([^"]+\.webp)"/g)) {
      files.add(match[1]);
    }
    for (const match of critSource.matchAll(/\bicon:\s*"(\w+)"/g)) {
      const filename = filenameByName.get(match[1]);
      if (!filename) throw new Error(`Unregistered crit icon: ${match[1]}`);
      files.add(filename);
    }
  }
  return [...files].sort();
}

const args = process.argv.slice(2);
const stale = args.includes("--stale");
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
const silhouetteDir = path.resolve(
  import.meta.dirname,
  "..",
  "public/silhouettes",
);
const requested = args.filter((arg) => !arg.startsWith("--"));
const names = requested.length ? requested : await critIconFiles();

// each icon's content hash when its sticker was last built: file times don't
// survive git, hashes do
const sourcesFile = path.join(import.meta.dirname, "sticker-sources.json");
const sources = JSON.parse(
  await fs.readFile(sourcesFile, "utf8").catch(() => "null"),
);
const hashes = sources ?? {};
// null for a missing icon; read in parallel, so the check before every build
// stays quick
const iconHashes = await Promise.all(
  names.map((name) => {
    const file = name.endsWith(".webp") ? name : critIconFile(name);
    return fs.readFile(path.join(publicDir, file)).then(
      (data) => createHash("sha1").update(data).digest("hex"),
      () => null,
    );
  }),
);

let done = 0;
const missing = [];
for (const [index, name] of names.entries()) {
  const file = name.endsWith(".webp") ? name : critIconFile(name);
  const source = path.join(publicDir, file);
  const hash = iconHashes[index];
  if (hash === null) {
    missing.push(file);
    continue;
  }
  // first run: the shipped stickers are taken as built from today's icons
  if (stale && (!sources || hashes[file] === hash)) {
    hashes[file] = hash;
    continue;
  }
  const sticker = await addStickerBorder(
    source,
    path.join(outDir, file),
    border,
  );
  if (!outArg)
    await writeSilhouette(
      sticker,
      path.join(silhouetteDir, file.replace(/\.webp$/, ".png")),
    );
  if (!outArg) hashes[file] = hash;
  done++;
}
if (!outArg) {
  const sorted = Object.fromEntries(Object.entries(hashes).sort());
  await fs.writeFile(sourcesFile, `${JSON.stringify(sorted, null, 2)}\n`);
}
if (!stale || done > 0)
  console.log(
    `Added a ${border}px white sticker border to ${done} icon(s) -> ${path.relative(process.cwd(), outDir)}`,
  );
if (missing.length) {
  console.warn(
    `Skipped ${missing.length} missing icon(s): ${missing.join(", ")}`,
  );
}
