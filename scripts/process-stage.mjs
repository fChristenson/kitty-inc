import sharp from "sharp";
import path from "node:path";

// raw src/assets/stage.jfif (AI-generated: a press-conference stage backdrop
// with curtains, already full-bleed with no padding border to trim) converted
// straight to src/assets/stage.png, same resolution — hud/pressConferenceGame/
// index.ts draws it behind the podium cat and audience crowd

const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const src = path.join(assets, "stage.jfif");
const dest = path.join(assets, "stage.png");

await sharp(src).png().toFile(dest);

console.log(`${path.basename(src)} -> ${path.basename(dest)}`);
