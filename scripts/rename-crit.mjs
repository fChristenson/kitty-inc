// Renames shipped featured crits: registry entry, balance keys and icon,
// sticker and silhouette files (moved with git mv).
//   node scripts/rename-crit.mjs <kind> "<New Label>" [<kind> "<New Label>" ...]
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ROOT, camelCase } from "./lib/crit-asset-paths.mjs";

const FEATURED = path.join(ROOT, "src/shared/critTypes/featured");
const BALANCE = path.join(ROOT, "src/critBalance");
const args = process.argv.slice(2);
if (args.length === 0 || args.length % 2)
  throw new Error(
    'usage: node scripts/rename-crit.mjs <kind> "<New Label>" ...',
  );

const featuredFiles = fs
  .readdirSync(FEATURED)
  .filter((file) => file.endsWith(".ts"))
  .map((file) => path.join(FEATURED, file));
const read = (file) => fs.readFileSync(file, "utf8");
const labelTaken = (label) =>
  featuredFiles.some((file) =>
    read(file)
      .toLowerCase()
      .includes(`label: ${JSON.stringify(label).toLowerCase()},`),
  );
const kindTaken = (kind) =>
  featuredFiles.some((file) =>
    new RegExp(`^ {2}${kind}: \\{`, "m").test(read(file)),
  );

for (let index = 0; index < args.length; index += 2) {
  const kind = args[index];
  const label = args[index + 1];
  const newKind = camelCase(label);
  const file = featuredFiles.find((candidate) =>
    new RegExp(`^ {2}${kind}: \\{`, "m").test(read(candidate)),
  );
  if (!file) throw new Error(`${kind}: no featured entry`);
  if (newKind !== kind && kindTaken(newKind))
    throw new Error(`${label}: kind ${newKind} already used`);
  if (labelTaken(label)) throw new Error(`${label}: label already used`);
  const category = path.basename(file, ".ts");

  let source = read(file);
  const start = source.search(new RegExp(`^ {2}${kind}: \\{`, "m"));
  const end = source.indexOf("\n  },", start);
  const entry = source
    .slice(start, end)
    .replace(`  ${kind}: {`, `  ${newKind}: {`)
    .replace(/label: "(?:[^"\\]|\\.)*",/, `label: ${JSON.stringify(label)},`)
    .replace(
      `crits/${category}/${kind}.webp`,
      `crits/${category}/${newKind}.webp`,
    )
    .replace(
      new RegExp(`\\bbalance\\.${kind}(?=[A-Z])`, "g"),
      `balance.${newKind}`,
    );
  source = source.slice(0, start) + entry + source.slice(end);
  fs.writeFileSync(file, source);

  const balanceFile = path.join(BALANCE, `${category}.ts`);
  fs.writeFileSync(
    balanceFile,
    read(balanceFile).replace(
      new RegExp(`^( {2})${kind}(?=[A-Z]\\w*:)`, "gm"),
      `$1${newKind}`,
    ),
  );

  for (const [dir, ext] of [
    ["crits", "webp"],
    ["stickers/crits", "webp"],
    ["silhouettes/crits", "png"],
  ]) {
    const from = `public/${dir}/${category}/${kind}.${ext}`;
    if (!fs.existsSync(path.join(ROOT, from)) || newKind === kind) continue;
    const to = `public/${dir}/${category}/${newKind}.${ext}`;
    try {
      execFileSync("git", ["mv", from, to], { cwd: ROOT, stdio: "ignore" });
    } catch {
      fs.renameSync(path.join(ROOT, from), path.join(ROOT, to));
    }
  }
  console.log(`${category}: ${kind} -> ${newKind} ("${label}")`);
}
