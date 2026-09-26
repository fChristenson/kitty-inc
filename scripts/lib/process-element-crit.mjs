import fs from "node:fs/promises";
import path from "node:path";
import { processCritIcon } from "./process-crit-icon.mjs";
import { elementCritBatch } from "./element-crit-batch.mjs";
import { critIconDir, critIconFile } from "./crit-asset-paths.mjs";

export async function processElementCrit(kind) {
  const entry = elementCritBatch.find((entry) => entry[1] === kind);
  if (!entry) throw new Error(`Unknown element crit: ${kind}`);
  const [source, , , , sourceExtension = ".jfif"] = entry;
  const root = path.resolve(import.meta.dirname, "../..");
  const category = critIconDir(kind);
  const options = {
    sourcePath: path.join(
      root,
      "src/assets",
      category,
      `${source}${sourceExtension}`,
    ),
    ...(source === "krypton"
      ? { backgroundColor: [136, 192, 250], backgroundColorTolerance: 40 }
      : {}),
    ...(source === "tungsten"
      ? { sourceRect: { left: 266, top: 50, width: 724, height: 716 } }
      : {}),
  };
  await processCritIcon(kind, options);
  for (const destination of [
    path.join(root, "src/assets", category),
    path.join(
      root,
      "src/assets/processedCrits",
      path.relative("crits", category),
    ),
  ]) {
    await fs.mkdir(destination, { recursive: true });
    await fs.copyFile(
      path.join(root, "public", critIconFile(kind)),
      path.join(destination, `${kind}.png`),
    );
  }
}
