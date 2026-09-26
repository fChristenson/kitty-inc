// Confirms every crit image on disk belongs to a crit record in code, and that
// every crit record's image (plus its sticker and silhouette cuts) exists.
//
//   node scripts/check-crit-images.mjs
import fs from "node:fs";
import path from "node:path";
import { createServer } from "vite";

const IMAGE_DIRS = [
  "public/crits",
  "public/stickers/crits",
  "public/silhouettes/crits",
  "src/assets/crits",
  "src/assets/processedCrits",
];

function pngsUnder(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { recursive: true })
    .filter((file) => file.endsWith(".png"))
    .map((file) => file.split(path.sep).join("/"));
}

// raw sources can be PNGs too (android.png feeds Android Analyst, and
// <kind>.source.png is read via sourceExtension), so a src/assets/crits PNG
// that a processor script names is a source, not an orphan
const processorText = ["scripts/crits", "scripts/lib"]
  .flatMap((dir) =>
    fs
      .readdirSync(dir, { recursive: true })
      .filter((file) => file.endsWith(".mjs"))
      .map((file) => fs.readFileSync(path.join(dir, file), "utf8")),
  )
  .join("\n");
const isRawSource = (dir, file) => {
  const name = path.basename(file, ".png");
  if (dir !== "src/assets/crits") return false;
  if (name.endsWith(".source")) {
    return processorText.includes(`"${name.slice(0, -".source".length)}"`);
  }
  return (
    !fs.existsSync(path.join("public/crits", file)) &&
    (processorText.includes(`${name}.png`) ||
      processorText.includes(`"${name}"`))
  );
};

const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "silent",
});
let problems = 0;
try {
  const { CRIT_PROC_KINDS, CRIT_PROC_INFO } = await server.ssrLoadModule(
    "/src/shared/critTypes/index.ts",
  );
  const { IMAGE_FILES } = await server.ssrLoadModule(
    "/src/loadAssets/index.ts",
  );
  // "crits/<category>/<name>.png" -> the crit kinds that show it
  const owners = new Map();
  for (const kind of CRIT_PROC_KINDS) {
    const file = IMAGE_FILES[CRIT_PROC_INFO[kind].icon];
    if (!file) {
      console.log(
        `NO IMAGE   ${kind}: icon "${CRIT_PROC_INFO[kind].icon}" is not in IMAGE_FILES`,
      );
      problems++;
      continue;
    }
    owners.set(file, [...(owners.get(file) ?? []), kind]);
  }
  // the few crit procs that reuse a theme image (not under crits/) are
  // records too, but only crits/ files are expected in the crit folders
  const critFiles = [...owners.keys()].filter((file) =>
    file.startsWith("crits/"),
  );

  for (const dir of IMAGE_DIRS) {
    for (const file of pngsUnder(dir)) {
      if (!owners.has(`crits/${file}`) && !isRawSource(dir, file)) {
        console.log(`ORPHAN     ${dir}/${file}: no crit record uses it`);
        problems++;
      }
    }
  }
  for (const file of critFiles) {
    for (const dir of ["public", "public/stickers", "public/silhouettes"]) {
      if (!fs.existsSync(path.join(dir, file))) {
        console.log(
          `MISSING    ${dir}/${file} for ${owners.get(file).join(", ")}`,
        );
        problems++;
      }
    }
  }
  for (const [file, kinds] of owners) {
    if (kinds.length > 1) {
      console.log(`SHARED     ${file} is used by ${kinds.join(", ")}`);
    }
  }
  console.log(
    problems
      ? `FAIL: ${problems} problem(s) across ${CRIT_PROC_KINDS.length} crit records`
      : `PASS: ${CRIT_PROC_KINDS.length} crit records, every crit image accounted for`,
  );
} finally {
  await server.close();
}
process.exitCode = problems ? 1 : 0;
