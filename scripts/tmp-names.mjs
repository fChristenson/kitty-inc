import fs from "node:fs";

const source = fs.readFileSync("src/shared/critTypes/featuredProcs.ts", "utf8");
const camel = (label) => {
  const words = label
    .replace(/['’]/g, "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      return index === 0
        ? lower
        : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
};

const entries = [...source.matchAll(/^ {2}(\w+): \{([\s\S]*?)^ {2}\},$/gm)].map(
  (m) => ({
    key: m[1],
    label: /label: "([^"]+)"/.exec(m[2])?.[1] ?? "",
    icon: /icon: "(\w+)"/.exec(m[2])?.[1] ?? "",
  }),
);

console.log("featured crits parsed:", entries.length);
const mismatched = entries.filter((e) => camel(e.label) !== e.key);
console.log("key !== camelCase(label):", mismatched.length);
for (const e of mismatched) {
  console.log(`  ${e.key.padEnd(24)} label="${e.label}" -> ${camel(e.label)}`);
}
const iconMismatch = entries.filter((e) => e.icon !== e.key);
console.log("\nicon !== key:", iconMismatch.length);
for (const e of iconMismatch) console.log(`  ${e.key} icon=${e.icon}`);
const collisions = new Map();
for (const e of entries) {
  const target = camel(e.label);
  collisions.set(target, (collisions.get(target) ?? 0) + 1);
}
const dupes = [...collisions].filter(([, n]) => n > 1);
console.log("\ncamelCase collisions:", dupes.length);
for (const [name, n] of dupes) console.log(`  ${name} x${n}`);
