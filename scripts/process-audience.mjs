import sharp from "sharp";
import path from "node:path";

// raw src/assets/audience.jfif (AI-generated: a crowd of cats seen from behind,
// already full-bleed with its own room/seating background, no padding border or
// plain-color background to trim/chroma-key) converted straight to
// src/assets/audience.png, same resolution — hud/pressConferenceGame/index.ts
// draws it stretched edge-to-edge across the bottom of its own canvas

const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const src = path.join(assets, "audience.jfif");
const dest = path.join(assets, "audience.png");

await sharp(src).png().toFile(dest);

console.log(`${path.basename(src)} -> ${path.basename(dest)}`);
