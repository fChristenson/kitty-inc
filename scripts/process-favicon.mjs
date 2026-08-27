import sharp from "sharp";
import path from "node:path";

// downsizes the already-transparent src/assets/coin.png (see process-coin.mjs) into
// a square favicon, written straight to public/ so Vite serves it unprocessed
const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const publicDir = path.resolve(import.meta.dirname, "..", "public");
const src = path.join(assets, "coin.png");
const dest = path.join(publicDir, "favicon.png");

await sharp(src).resize(256, 256).png().toFile(dest);
