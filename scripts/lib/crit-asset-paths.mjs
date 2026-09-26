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
    // featured crits carry their own `image` path in their definition
    const featuredDir = path.join(ROOT, "src/shared/critTypes/featured");
    for (const file of fs.readdirSync(featuredDir)) {
      const text = fs.readFileSync(path.join(featuredDir, file), "utf8");
      for (const m of text.matchAll(/\bimage: "([^"]+\.png)"/g))
        registered.push(m[1]);
    }
  }
  return registered;
}

// A crit icon's path relative to public/ (and to src/assets/ and the
// references dist folder): "crits/<category>/<name>.png". An icon not wired
// into IMAGE_FILES yet is found by its raw source's category folder, falling
// back to plain "<name>.png" only if it has none.
export function critIconFile(name) {
  const file = registeredFiles().find(
    (file) => file === `${name}.png` || file.endsWith(`/${name}.png`),
  );
  if (file) return file;
  const crits = path.join(ROOT, "src/assets/crits");
  for (const category of fs.existsSync(crits) ? fs.readdirSync(crits) : []) {
    const dir = path.join(crits, category);
    if (fs.readdirSync(dir).some((f) => f.split(".")[0] === name))
      return `crits/${category}/${name}.png`;
  }
  return `${name}.png`;
}

export function critIconDir(name) {
  return path.dirname(critIconFile(name));
}
