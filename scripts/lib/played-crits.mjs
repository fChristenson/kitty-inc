// every played crit (floor, income, button, lock and rate crits) read from
// its folder, src/crits/<group>Crits/crits/<kind>/meta.ts, for the scripts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const CRITS = path.join(ROOT, "src/crits");
export const CRIT_GROUPS = ["floor", "income", "button", "lock", "rate"];

// the card's object literal, on one line, comments dropped
function readMeta(file) {
  const text = fs.readFileSync(file, "utf8");
  const card = /export default (\{[\s\S]*?\}) satisfies CritMeta/.exec(text);
  if (!card)
    throw new Error(
      `${path.relative(ROOT, file)}: no "export default { ... } satisfies CritMeta"`,
    );
  return card[1].replace(/^\s*\/\/.*$/gm, "").replace(/\s+/g, " ");
}

// every played crit by group: [{ kind, meta, file }] in kind order, meta the
// card's text
export function readCrits() {
  const groups = {};
  for (const group of CRIT_GROUPS) {
    const dir = path.join(CRITS, `${group}Crits/crits`);
    groups[group] = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
      .map((kind) => {
        const folder = path.join(dir, kind);
        const meta = path.join(folder, "meta.ts");
        if (!fs.existsSync(meta))
          throw new Error(`${path.relative(ROOT, folder)}: no meta.ts`);
        return { kind, meta: readMeta(meta), file: meta };
      });
  }
  return groups;
}
