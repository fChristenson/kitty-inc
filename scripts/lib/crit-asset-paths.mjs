import fs from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "../..");

let registered = null;

function registeredFiles() {
  if (!registered) {
    const source = fs.readFileSync(
      path.join(ROOT, "src/loadAssets/index.ts"),
      "utf8",
    );
    const block = source.match(
      /export const IMAGE_FILES = \{([\s\S]*?)\n\} as const;/,
    );
    if (!block) throw new Error("Could not parse IMAGE_FILES");
    registered = [...block[1].matchAll(/"([^"]+\.png)"/g)].map((m) => m[1]);
  }
  return registered;
}

// A crit icon's path relative to public/ (and to src/assets/ and the
// references dist folder): "crits/<category>/<name>.png" once the crit is
// registered in a category, plain "<name>.png" while it isn't wired up yet.
export function critIconFile(name) {
  return (
    registeredFiles().find(
      (file) => file === `${name}.png` || file.endsWith(`/${name}.png`),
    ) ?? `${name}.png`
  );
}

export function critIconDir(name) {
  return path.dirname(critIconFile(name));
}
