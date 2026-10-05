// Bulk review of shipped crits: every icon with its label on labelled sheets,
// to check at a glance that each name fits its art and category theme.
//   node scripts/crit-overview.mjs                    every category
//   node scripts/crit-overview.mjs muscleGirls feet   just these categories
//   node scripts/crit-overview.mjs --per-sheet=64     tiles per sheet (default 48)
// Writes tmp/_sheets/overview-<category>[-<page>].png
import fs from "node:fs";
import path from "node:path";
import { ROOT, WORK } from "./lib/crit-asset-paths.mjs";
import { writeContactSheet } from "./lib/contact-sheet.mjs";

const FEATURED = path.join(ROOT, "src/shared/critData");
const args = process.argv.slice(2);
const perSheet = Number(
  args.find((arg) => arg.startsWith("--per-sheet="))?.split("=")[1] ?? 48,
);
const wanted = args.filter((arg) => !arg.startsWith("--"));
const ENTRY =
  /^ {2}(\w+): \{\s*label:\s*"((?:[^"\\]|\\.)*)",[\s\S]*?image:\s*"(crits\/[^"]+)"/gm;

const categories = fs
  .readdirSync(FEATURED)
  .filter((file) => file.endsWith(".ts") && !/^(index|types)\.ts$/.test(file))
  .map((file) => path.basename(file, ".ts"))
  .filter((category) => wanted.length === 0 || wanted.includes(category));
const unknown = wanted.filter((category) => !categories.includes(category));
if (unknown.length)
  throw new Error(`unknown categories: ${unknown.join(", ")}`);

for (const old of fs.existsSync(path.join(WORK, "_sheets"))
  ? fs.readdirSync(path.join(WORK, "_sheets"))
  : [])
  if (old.startsWith("overview-")) fs.rmSync(path.join(WORK, "_sheets", old));

const written = [];
for (const category of categories) {
  const source = fs.readFileSync(path.join(FEATURED, `${category}.ts`), "utf8");
  const entries = [...source.matchAll(ENTRY)]
    .map(([, , label, image]) => [
      JSON.parse(`"${label}"`),
      path.join(ROOT, "public", image),
    ])
    .filter(([, file]) => fs.existsSync(file));
  const pages = Math.ceil(entries.length / perSheet);
  for (let page = 0; page < pages; page++) {
    const out = path.join(
      WORK,
      "_sheets",
      `overview-${category}${pages > 1 ? `-${page + 1}` : ""}.png`,
    );
    await writeContactSheet(
      entries.slice(page * perSheet, (page + 1) * perSheet),
      out,
      {
        background: "#ff00ff",
        tileWidth: 260,
        firstNumber: page * perSheet + 1,
      },
    );
    written.push(
      `${path.relative(ROOT, out).replaceAll("\\", "/")} (${Math.min(perSheet, entries.length - page * perSheet)})`,
    );
  }
}
console.log(written.join("\n") || "no crits found");
