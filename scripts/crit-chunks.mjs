// Writes src/crits/chunks/: the crits' code split into chunks by size, every
// kind of crit the same way. Each family (the animated events; the played
// floor, income, button, lock and rate crits together) gets as many chunks as
// its source needs at about CHUNK_BYTES each, its crits dealt out in the order
// of a hash of their folder names, each into the lightest chunk so far: the
// chunks come out the same size, each a mix of old and new crits and of every
// group. Writes the chunk files and manifest.ts (their loaders, which chunk
// each played crit is in). Run by vite (on start and whenever a crit folder
// comes or goes) and by `npm run build`.
// Usage: node scripts/crit-chunks.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CRITS = path.join(ROOT, "src/crits");
const OUT = path.join(CRITS, "chunks");
const EVENTS = path.join(CRITS, "animatedCrits/events");
const STARTER = path.join(CRITS, "animatedCrits/eventLoader/eventsStarter.ts");
const PLAYED_GROUPS = ["floor", "income", "button", "lock", "rate"];
// source bytes per chunk (about a quarter of that once minified): small
// enough that loading and running one at idle never costs a frame
export const CHUNK_BYTES = 512 * 1024;

// FNV-1a: the order crits are dealt in, the same on every run
function hash(name) {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function folderBytes(dir) {
  let bytes = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    bytes += entry.isDirectory()
      ? folderBytes(file)
      : entry.name.endsWith(".ts")
        ? fs.statSync(file).size
        : 0;
  }
  return bytes;
}

// an event's dev test hooks: its force*Event, or start*Event when there's none
function hooksOf(dir) {
  const source = fs.readFileSync(path.join(dir, "index.ts"), "utf8");
  const named = (prefix) =>
    [
      ...source.matchAll(
        new RegExp(
          `^export (?:async )?(?:const|function) (${prefix}\\w*Event)\\b`,
          "gm",
        ),
      ),
    ].map((m) => m[1]);
  const force = named("force");
  return force.length > 0 ? force : named("start");
}

function events() {
  const starter = fs.readFileSync(STARTER, "utf8");
  const inStarter = new Set(
    [...starter.matchAll(/import "\.\.\/events\/(\w+)";/g)].map((m) => m[1]),
  );
  const found = [];
  for (const name of fs.readdirSync(EVENTS).sort()) {
    const dir = path.join(EVENTS, name);
    if (inStarter.has(name) || !fs.existsSync(path.join(dir, "meta.ts")))
      continue;
    if (!fs.existsSync(path.join(dir, "index.ts")))
      throw new Error(`${name}: a meta.ts with no index.ts`);
    found.push({
      name,
      from: `../animatedCrits/events/${name}`,
      bytes: folderBytes(dir),
      hooks: hooksOf(dir),
    });
  }
  return found;
}

function playedCrits() {
  const found = [];
  for (const group of PLAYED_GROUPS) {
    const root = path.join(CRITS, `${group}Crits/crits`);
    for (const name of fs.readdirSync(root).sort()) {
      const dir = path.join(root, name);
      const meta = path.join(dir, "meta.ts");
      if (!fs.existsSync(meta)) continue;
      if (!fs.existsSync(path.join(dir, "index.ts"))) {
        // a twist crit is only its card
        if (/^\s*twist:/m.test(fs.readFileSync(meta, "utf8"))) continue;
        throw new Error(`${name}: a meta.ts with no index.ts`);
      }
      found.push({
        name,
        from: `../${group}Crits/crits/${name}`,
        bytes: folderBytes(dir),
        hooks: [],
      });
    }
  }
  return found;
}

// the family's crits dealt into chunks by size: in hash order (so every chunk
// mixes ages and groups), each into the lightest chunk so far, so no chunk
// strays more than about one crit's size from the rest
function deal(crits) {
  const total = crits.reduce((sum, crit) => sum + crit.bytes, 0);
  const count = Math.max(1, Math.ceil(total / CHUNK_BYTES));
  const chunks = Array.from({ length: count }, () => []);
  const loads = new Array(count).fill(0);
  const order = [...crits].sort(
    (a, b) => hash(a.name) - hash(b.name) || (a.name < b.name ? -1 : 1),
  );
  for (const crit of order) {
    let lightest = 0;
    for (let i = 1; i < count; i++)
      if (loads[i] < loads[lightest]) lightest = i;
    chunks[lightest].push(crit);
    loads[lightest] += crit.bytes;
  }
  for (const chunk of chunks) chunk.sort((a, b) => (a.name < b.name ? -1 : 1));
  return chunks;
}

// each event's hooks as last written, so an edit that leaves them alone
// doesn't deal the chunks again
const lastHooks = new Map();
export function eventHooksChanged(indexFile) {
  const dir = path.dirname(indexFile);
  const name = path.basename(dir);
  if (!lastHooks.has(name)) return false;
  return lastHooks.get(name) !== hooksOf(dir).join(",");
}

const writes = new Map();
function chunkSource(family, i, count, crits) {
  return [
    "// generated by scripts/crit-chunks.mjs from the crit folders: don't edit",
    `// ${family} chunk ${i + 1} of ${count} (${crits.length} crits): each registers`,
    "// itself when it loads",
    ...crits.map((crit) => `import "${crit.from}";`),
    ...(crits.some((crit) => crit.hooks.length > 0)
      ? [
          "",
          "// the dev test bar's hooks",
          ...crits.flatMap((crit) =>
            crit.hooks.map((hook) => `export { ${hook} } from "${crit.from}";`),
          ),
        ]
      : []),
    "",
  ].join("\n");
}

export function writeCritChunks() {
  fs.mkdirSync(OUT, { recursive: true });
  writes.clear();
  const eventList = events();
  lastHooks.clear();
  for (const event of eventList)
    lastHooks.set(event.name, event.hooks.join(","));
  const eventChunks = deal(eventList);
  const playedChunks = deal(playedCrits());
  eventChunks.forEach((crits, i) =>
    writes.set(
      `events${i}.ts`,
      chunkSource("event", i, eventChunks.length, crits),
    ),
  );
  playedChunks.forEach((crits, i) =>
    writes.set(
      `played${i}.ts`,
      chunkSource("played crit", i, playedChunks.length, crits),
    ),
  );
  const loaders = (family, n) =>
    Array.from({ length: n }, (_, i) => `  () => import("./${family}${i}"),`);
  const chunkOf = playedChunks.flatMap((crits, i) =>
    crits.map((crit) => `  ${crit.name}: ${i},`),
  );
  writes.set(
    "manifest.ts",
    [
      "// generated by scripts/crit-chunks.mjs from the crit folders: don't edit",
      "// the crits' chunks (see the script): their loaders, and which chunk each",
      "// played crit is in",
      "export const EVENT_CHUNKS = [",
      ...loaders("events", eventChunks.length),
      "];",
      "",
      "export const PLAYED_CHUNKS = [",
      ...loaders("played", playedChunks.length),
      "];",
      "",
      "export const PLAYED_CHUNK_OF: Record<string, number> = {",
      ...chunkOf.sort(),
      "};",
      "",
      "// every event chunk's dev test hooks",
      "export type EventChunkHooks = " +
        eventChunks
          .map((_, i) => `typeof import("./events${i}")`)
          .join(" &\n  ") +
        ";",
      "",
    ].join("\n"),
  );
  for (const file of fs.readdirSync(OUT))
    if (/^(events|played)\d+\.ts$/.test(file) && !writes.has(file))
      fs.rmSync(path.join(OUT, file));
  for (const [file, source] of writes) {
    const out = path.join(OUT, file);
    const current = fs.existsSync(out) ? fs.readFileSync(out, "utf8") : "";
    if (current !== source) fs.writeFileSync(out, source);
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  writeCritChunks();
