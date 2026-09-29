// Step 1 of the crit pipeline (see scripts/new-crits.mjs's header):
//   node scripts/crit-intake.mjs         sheet every raw image loose in the
//                                        project root or tmp/ onto
//                                        tmp/_sheets/intake.png and list them
//                                        in tmp/_intake.json
//   node scripts/crit-intake.mjs --move  move each raw given a "category" and
//                                        "name" to tmp/<category>/<kind>.<ext>
import fs from "node:fs";
import path from "node:path";
import { ROOT, WORK, camelCase } from "./lib/crit-asset-paths.mjs";
import { writeContactSheet } from "./lib/contact-sheet.mjs";

const RAW_EXTENSIONS = [".jfif", ".jpg", ".jpeg", ".webp", ".png"];
const LIST = path.join(WORK, "_intake.json");
const SHEET = path.join(WORK, "_sheets/intake.png");
const rel = (file) => path.relative(ROOT, file).replaceAll("\\", "/");

const looseRaws = () =>
  [ROOT, WORK]
    .filter((dir) => fs.existsSync(dir))
    .flatMap((dir) =>
      fs
        .readdirSync(dir, { withFileTypes: true })
        .filter(
          (entry) =>
            entry.isFile() &&
            RAW_EXTENSIONS.includes(path.extname(entry.name).toLowerCase()),
        )
        .map((entry) => rel(path.join(dir, entry.name))),
    )
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

const readList = () =>
  fs.existsSync(LIST) ? JSON.parse(fs.readFileSync(LIST, "utf8")) : [];
const writeList = (entries) => {
  fs.mkdirSync(WORK, { recursive: true });
  if (entries.length)
    fs.writeFileSync(LIST, `${JSON.stringify(entries, null, 2)}\n`);
  else fs.rmSync(LIST, { force: true });
};

if (process.argv.includes("--move")) {
  const remaining = [];
  const taken = new Set();
  for (const entry of readList()) {
    const kind = camelCase(entry.name ?? "");
    if (!entry.category || !kind) {
      remaining.push(entry);
      continue;
    }
    const from = path.join(ROOT, entry.file);
    const to = path.join(
      WORK,
      entry.category,
      `${kind}${path.extname(entry.file)}`,
    );
    if (!fs.existsSync(from)) throw new Error(`${entry.file} not found`);
    if (fs.existsSync(to) || taken.has(to))
      throw new Error(
        `${entry.file}: ${path.relative(ROOT, to)} already exists`,
      );
    if (/\d/.test(kind))
      throw new Error(
        `${entry.file}: "${entry.name}" needs a name without numbers`,
      );
    taken.add(to);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.renameSync(from, to);
    console.log(`${entry.file} -> ${rel(to)}`);
  }
  writeList(remaining);
  console.log(
    `${taken.size} moved${remaining.length ? `, ${remaining.length} still need a category and name` : ""}; next: node scripts/new-crits.mjs --scan`,
  );
} else {
  const files = looseRaws();
  const known = new Map(readList().map((entry) => [entry.file, entry]));
  const entries = files.map(
    (file) => known.get(file) ?? { file, category: "", name: "" },
  );
  writeList(entries);
  await writeContactSheet(
    files.map((file) => [file, path.join(ROOT, file)]),
    SHEET,
    { background: "#ffffff" },
  );
  console.log(
    `${files.length} raw image(s) on ${rel(SHEET)}; fill "category" and "name" in ${rel(LIST)}, then run --move`,
  );
}
