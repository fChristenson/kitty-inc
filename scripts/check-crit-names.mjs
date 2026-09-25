import fs from "node:fs";
import path from "node:path";

const featuredDir = "src/shared/critTypes/featured";
const text = fs
  .readdirSync(featuredDir)
  .filter((file) => file !== "index.ts")
  .map((file) => fs.readFileSync(path.join(featuredDir, file), "utf8"))
  .join("\n");
const labels = [...text.matchAll(/label: "(.*?)"/g)].map((m) => m[1]);
const kinds = [...text.matchAll(/^ {2}([a-zA-Z0-9]+): \{/gm)].map((m) => m[1]);

const words = process.argv.slice(2);
console.log(`${labels.length} labels, ${kinds.length} kinds`);
for (const word of words) {
  const hits = labels.filter((l) =>
    l.toLowerCase().includes(word.toLowerCase()),
  );
  const kindHits = kinds.filter((k) =>
    k.toLowerCase().includes(word.toLowerCase()),
  );
  if (hits.length || kindHits.length) {
    console.log(
      `TAKEN ${word}: labels[${hits.join(" | ")}] kinds[${kindHits.join(" | ")}]`,
    );
  } else {
    console.log(`free  ${word}`);
  }
}
