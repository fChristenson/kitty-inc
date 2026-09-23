import fs from "node:fs/promises";
import path from "node:path";
import { processCritIcon } from "./process-crit-icon.mjs";
import { elementCritBatch } from "./element-crit-batch.mjs";

export async function processElementCrit(kind) {
  const entry = elementCritBatch.find((entry) => entry[1] === kind);
  if (!entry) throw new Error(`Unknown element crit: ${kind}`);
  const [source] = entry;
  const root = path.resolve(import.meta.dirname, "../..");
  const options = {
    sourcePath: path.join(root, "src/assets", `${source}.jfif`),
    ...(source === "krypton" ? { backgroundColor: [136, 192, 250], backgroundColorTolerance: 40 } : {}),
    ...(source === "tungsten" ? { sourceRect: { left: 266, top: 50, width: 724, height: 716 } } : {}),
  };
  await processCritIcon(kind, options);
  const references = path.join(root, "src/assets/themes/references/dist");
  await fs.mkdir(references, { recursive: true });
  for (const destination of [path.join(root, "src/assets"), references])
    await fs.copyFile(path.join(root, "public", `${kind}.png`), path.join(destination, `${kind}.png`));
}