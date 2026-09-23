import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { elementCritBatch } from "./lib/element-crit-batch.mjs";

const processed = process.argv.includes("--processed");
const destination = path.join(os.tmpdir(), "kitty-element-crits");
await fs.mkdir(destination, { recursive: true });
for (let offset = 0; offset < elementCritBatch.length; offset += 20) {
  const entries = elementCritBatch.slice(offset, offset + 20);
  const layers = [];
  for (const [index, [source, kind, label]] of entries.entries()) {
    const input = processed ? `public/${kind}.png` : `src/assets/${source}.jfif`;
    const image = await sharp(input).resize(210, 190, { fit: "inside" }).png().toBuffer();
    const metadata = await sharp(image).metadata();
    const left = (index % 5) * 220;
    const top = Math.floor(index / 5) * 225;
    layers.push({ input: image, left: left + Math.floor((220 - metadata.width) / 2), top: top + Math.floor((190 - metadata.height) / 2) });
    const text = `<svg width="220" height="30"><text x="110" y="20" text-anchor="middle" font-size="12" font-family="sans-serif" fill="black">${offset + index + 1}. ${label}</text></svg>`;
    layers.push({ input: Buffer.from(text), left, top: top + 192 });
  }
  const output = path.join(destination, `${processed ? "processed" : "source"}-${offset / 20 + 1}.png`);
  await sharp({ create: { width: 1100, height: Math.ceil(entries.length / 5) * 225, channels: 4, background: processed ? "#e85de7" : "#dde4e7" } })
    .composite(layers).png().toFile(output);
  console.log(output);
}