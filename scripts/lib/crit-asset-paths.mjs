import fs from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "../..");
// gitignored work area for crits in progress: raws in tmp/<category>/, their
// custom processor scripts, the intake and spec lists and review sheets
export const WORK = path.join(ROOT, "tmp");

// a crit's display label as its kind / icon basename
export const camelCase = (label) =>
  label
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((word, index) =>
      index === 0
        ? word.toLowerCase()
        : word[0].toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join("");

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
    registered = [...block[1].matchAll(/"([^"]+\.webp)"/g)].map((m) => m[1]);
    // featured crits carry their own `image` path in their data
    const featuredDir = path.join(ROOT, "src/crits/badgeCrits/critData");
    for (const file of fs.readdirSync(featuredDir)) {
      const text = fs.readFileSync(path.join(featuredDir, file), "utf8");
      for (const m of text.matchAll(/\bimage: "([^"]+\.webp)"/g))
        registered.push(m[1]);
    }
  }
  return registered;
}

// A crit icon's path relative to public/: "crits/<category>/<name>.webp". An
// icon not wired into IMAGE_FILES yet is found by its category folder under
// public/crits, falling back to plain "<name>.webp" only if it has none.
export function critIconFile(name) {
  const file = registeredFiles().find(
    (file) => file === `${name}.webp` || file.endsWith(`/${name}.webp`),
  );
  if (file) return file;
  const crits = path.join(ROOT, "public/crits");
  for (const category of fs.existsSync(crits) ? fs.readdirSync(crits) : []) {
    const dir = path.join(crits, category);
    if (fs.readdirSync(dir).some((f) => f.split(".")[0] === name))
      return `crits/${category}/${name}.webp`;
  }
  return `${name}.webp`;
}

export function critIconDir(name) {
  return path.dirname(critIconFile(name));
}
