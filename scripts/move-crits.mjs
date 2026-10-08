// Moves shipped featured crits to other categories: their data, reward and
// balance entries, icon, sticker and silhouette, and raws in tmp/crits. Creates
// target categories and deletes emptied ones (a deleted category's leftover proc
// icons move to crits/classics).
//   node scripts/move-crits.mjs <kind> <category> [<kind> <category> ...]
//   node scripts/move-crits.mjs --map moves.json   ({ "<kind>": "<category>" })
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/crit-asset-paths.mjs";

const DATA = path.join(ROOT, "src/crits/badgeCrits/critData");
const FEATURED = path.join(ROOT, "src/crits/badgeCrits/featured");
const BALANCE = path.join(ROOT, "src/crits/badgeCrits/balance");
const SRC = path.join(ROOT, "src");
const RAWS = path.join(ROOT, "tmp/crits");
const ASSETS = [
  ["crits", "webp"],
  ["stickers/crits", "webp"],
  ["silhouettes/crits", "png"],
];
const LEGACY_HOME = "classics";
const NOT_CATEGORIES = new Set(["index.ts", "types.ts", "rewardHelpers.ts"]);

const read = (file) => fs.readFileSync(file, "utf8");
const constOf = (category) =>
  category.replace(/([A-Z])/g, "_$1").toUpperCase();

const moves = new Map();
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  if (args[i] === "--map")
    for (const [kind, category] of Object.entries(
      JSON.parse(read(args[i + 1])),
    ))
      moves.set(kind, category);
  else moves.set(args[i], args[i + 1]);
}
if (moves.size === 0 || args.length % 2)
  throw new Error(
    "usage: node scripts/move-crits.mjs <kind> <category> ... | --map moves.json",
  );

// a category file: header (through the `export const X = {` line), its entries
// by kind (each a list of lines, comments above an entry kept with it) and the
// closing lines
function parse(file, kindOfKey) {
  const source = read(file);
  const lines = source.split(/\r?\n/);
  const open = lines.findIndex((line) => /^export const \w+ = \{/.test(line));
  const close = lines.findLastIndex((line) => /^\}/.test(line));
  const entries = new Map();
  let current = null;
  let pending = [];
  for (const line of lines.slice(open + 1, close)) {
    const key = line.match(/^ {2}(\w+):/)?.[1];
    if (key) {
      const kind = kindOfKey(key);
      if (!entries.has(kind)) entries.set(kind, []);
      current = entries.get(kind);
      current.push(...pending, line);
      pending = [];
    } else if (/^ {2}\/\//.test(line) || !current) pending.push(line);
    else current.push(line);
  }
  current?.push(...pending);
  return {
    header: lines.slice(0, open + 1),
    entries,
    closing: lines.slice(close),
    eol: source.includes("\r\n") ? "\r\n" : "\n",
  };
}

const dataKinds = (file) =>
  [...read(file).matchAll(/^ {2}(\w+): \{/gm)].map((match) => match[1]);

// balance keys are `<kind><Field>`: the longest kind of this category they start with
const balanceKindOf = (kinds) => (key) => {
  const kind = kinds
    .filter(
      (candidate) =>
        key.startsWith(candidate) && /[A-Z]/.test(key[candidate.length] ?? ""),
    )
    .sort((a, b) => b.length - a.length)[0];
  if (!kind) throw new Error(`balance key ${key} matches no crit`);
  return kind;
};

const categories = new Map();
const categoryOf = new Map();
function load(category) {
  if (categories.has(category)) return categories.get(category);
  const files = {
    data: path.join(DATA, `${category}.ts`),
    rewards: path.join(FEATURED, `${category}.ts`),
    balance: path.join(BALANCE, `${category}.ts`),
  };
  const constant = constOf(category);
  let entry;
  if (fs.existsSync(files.data)) {
    const kinds = dataKinds(files.data);
    entry = {
      files,
      isNew: false,
      data: parse(files.data, (key) => key),
      rewards: parse(files.rewards, (key) => key),
      balance: parse(files.balance, balanceKindOf(kinds)),
    };
  } else {
    entry = {
      files,
      isNew: true,
      data: {
        header: [
          'import { COLOR } from "../../../palette";',
          'import type { FeaturedCritData } from "./types";',
          "",
          `export const ${constant}_CRITS = {`,
        ],
        entries: new Map(),
        closing: ["} as const satisfies Record<string, FeaturedCritData>;", ""],
      },
      rewards: {
        header: [
          `import type { ${constant}_CRITS } from "../critData/${category}";`,
          'import type { FeaturedRewards } from "./types";',
          "",
          `export const ${constant}_REWARDS = {`,
        ],
        entries: new Map(),
        closing: [`} satisfies FeaturedRewards<typeof ${constant}_CRITS>;`, ""],
      },
      balance: {
        header: [
          `// odds and reward sizes for featured/${category}.ts's crits, spread into CONFIG.crit`,
          `export const ${constant}_BALANCE = {`,
        ],
        entries: new Map(),
        closing: ["} as const;", ""],
      },
    };
  }
  for (const kind of entry.data.entries.keys()) categoryOf.set(kind, category);
  categories.set(category, entry);
  return entry;
}

for (const file of fs.readdirSync(DATA))
  if (file.endsWith(".ts") && !NOT_CATEGORIES.has(file))
    load(path.basename(file, ".ts"));
for (const [kind, category] of moves) {
  if (!categoryOf.has(kind)) throw new Error(`${kind}: no featured crit`);
  if (!/^[a-z][a-zA-Z]*$/.test(category))
    throw new Error(`${category}: not a camelCase category`);
}

const moved = [];
for (const [kind, to] of moves) {
  const from = categoryOf.get(kind);
  if (from === to) continue;
  const source = categories.get(from);
  const target = load(to);
  // the icon's file name, which a few older crits don't share with their kind
  const file =
    source.data.entries
      .get(kind)
      ?.join("\n")
      .match(/crits\/\w+\/(\w+)\./)?.[1] ?? kind;
  for (const part of ["data", "rewards", "balance"]) {
    const lines = source[part].entries.get(kind);
    if (!lines) throw new Error(`${kind}: no ${part} entry in ${from}`);
    source[part].entries.delete(kind);
    target[part].entries.set(
      kind,
      part === "data"
        ? lines.map((line) =>
            line.replace(/crits\/\w+\/(\w+)\./, `crits/${to}/$1.`),
          )
        : lines,
    );
  }
  // reward files only ever import their own crit type and FeaturedRewards
  const extra = source.rewards.header.filter(
    (line) =>
      /^import /.test(line) &&
      !line.includes("_CRITS }") &&
      !line.includes("FeaturedRewards"),
  );
  for (const line of extra)
    if (!target.rewards.header.includes(line))
      target.rewards.header.unshift(line);
  categoryOf.set(kind, to);
  moved.push({ kind, file, from, to });
}

const write = (file, { header, entries, closing, eol = "\n" }) =>
  fs.writeFileSync(
    file,
    [...header, ...[...entries.values()].flat(), ...closing].join(eol),
  );

const removed = [];
const added = [];
for (const [category, entry] of categories) {
  const touched = moved.some(
    (move) => move.from === category || move.to === category,
  );
  if (!touched) continue;
  if (entry.data.entries.size === 0) {
    if (!entry.isNew) {
      for (const file of Object.values(entry.files)) fs.rmSync(file);
      removed.push(category);
    }
    continue;
  }
  write(entry.files.data, entry.data);
  write(entry.files.rewards, entry.rewards);
  write(entry.files.balance, entry.balance);
  if (entry.isNew) added.push(category);
}

for (const [dir, suffix] of [
  [DATA, "_CRITS"],
  [FEATURED, "_REWARDS"],
  [BALANCE, "_BALANCE"],
]) {
  const index = path.join(dir, "index.ts");
  const source = read(index);
  const eol = source.includes("\r\n") ? "\r\n" : "\n";
  let lines = source.split(/\r?\n/);
  const name = (category) => `${constOf(category)}${suffix}`;
  const gone = new Set(removed.map(name));
  lines = lines.filter(
    (line) =>
      ![...gone].some(
        (constant) =>
          line.startsWith(`import { ${constant} }`) ||
          line.trim() === `...${constant},`,
      ),
  );
  const lastImport = lines.findLastIndex((line) => line.startsWith("import "));
  lines.splice(
    lastImport + 1,
    0,
    ...added.map(
      (category) => `import { ${name(category)} } from "./${category}";`,
    ),
  );
  const closing = lines.findLastIndex((line) => /^\} as const;/.test(line));
  lines.splice(closing, 0, ...added.map((category) => `  ...${name(category)},`));
  fs.writeFileSync(index, lines.join(eol));
}

const moveFile = (from, to) => {
  if (!fs.existsSync(from)) return false;
  if (fs.existsSync(to)) throw new Error(`${path.relative(ROOT, to)} exists`);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(from, to);
  return true;
};
const pruneDir = (dir) => {
  if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
};

const srcPaths = new Map();
for (const { kind, file: name, from, to } of moved) {
  for (const [dir, ext] of ASSETS)
    moveFile(
      path.join(ROOT, "public", dir, from, `${name}.${ext}`),
      path.join(ROOT, "public", dir, to, `${name}.${ext}`),
    );
  srcPaths.set(`crits/${from}/${name}.`, `crits/${to}/${name}.`);
  const raws = path.join(RAWS, from);
  if (!fs.existsSync(raws)) continue;
  for (const file of fs.readdirSync(raws))
    if (
      [`process-${kind}.mjs`, `process-${name}.mjs`].includes(file) ||
      [kind, name].includes(path.basename(file, path.extname(file)))
    )
      moveFile(path.join(raws, file), path.join(RAWS, to, file));
}

// a deleted category's other icons (proc flash icons) move to classics
for (const category of removed) {
  for (const [dir] of ASSETS) {
    const folder = path.join(ROOT, "public", dir, category);
    if (!fs.existsSync(folder)) continue;
    for (const file of fs.readdirSync(folder)) {
      moveFile(
        path.join(folder, file),
        path.join(ROOT, "public", dir, LEGACY_HOME, file),
      );
      const base = file.replace(/\.(webp|png)$/, ".");
      srcPaths.set(`crits/${category}/${base}`, `crits/${LEGACY_HOME}/${base}`);
    }
    pruneDir(folder);
  }
  pruneDir(path.join(RAWS, category));
}

// any other source path still pointing at a moved file
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : /\.ts$/.test(entry.name) ? [full] : [];
  });
for (const file of walk(SRC)) {
  const source = read(file);
  const next = source.replace(
    /crits\/\w+\/\w+\./g,
    (match) => srcPaths.get(match) ?? match,
  );
  if (next !== source) fs.writeFileSync(file, next);
}

const counts = new Map();
for (const { from, to } of moved) {
  counts.set(`${from} -> ${to}`, (counts.get(`${from} -> ${to}`) ?? 0) + 1);
}
for (const [route, count] of counts) console.log(`${count}\t${route}`);
if (added.length)
  console.log(
    `created: ${added.join(", ")} (add to src/crits/badgeCrits/critData/groups.ts)`,
  );
if (removed.length)
  console.log(
    `deleted: ${removed.join(", ")} (drop from src/crits/badgeCrits/critData/groups.ts)`,
  );
