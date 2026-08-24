import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";

const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const furnitureFile = process.argv[2] ?? "furniture.jpg";

async function exists(p) {
  return fs.access(p).then(() => true, () => false);
}

// --- crop bg.jpg to remove the plain white letterbox bars on top/bottom, output bg.png ---
async function cropFloor() {
  const src = path.join(assets, "bg.jpg");
  const backup = path.join(assets, "bg-original.jpg");
  const dest = path.join(assets, "bg.png");
  const original = await sharp(backup).toBuffer();
  await sharp(original)
    .extract({ left: 0, top: 57, width: 1248, height: 721 })
    .png()
    .toFile(dest);
  await fs.rm(src, { force: true });
  console.log("bg.png written (1248x721), bg.jpg removed");
}

// --- strip white background pixels from the furniture JPG, output furniture.png ---
async function makeFurnitureTransparent() {
  const src = path.join(assets, furnitureFile);
  const dest = path.join(assets, "furniture.png");
  const { data, info } = await sharp(src)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const out = Buffer.alloc(width * height * 4);
  const LOW = 195; // below this: fully opaque
  const HIGH = 250; // at/above this: fully transparent

  for (let i = 0, p = 0; i < data.length; i += channels, p += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const min = Math.min(r, g, b);
    let alpha;
    if (min <= LOW) alpha = 255;
    else if (min >= HIGH) alpha = 0;
    else alpha = Math.round(255 * (1 - (min - LOW) / (HIGH - LOW)));

    out[p] = r;
    out[p + 1] = g;
    out[p + 2] = b;
    out[p + 3] = alpha;
  }

  await sharp(out, { raw: { width, height, channels: 4 } }).png().toFile(dest);
  console.log("furniture.png written with transparent background");
}

// --- split furniture.png into individual sprite files via connected-component detection ---
async function extractSprites() {
  const src = path.join(assets, "furniture.png");
  const outDir = path.join(assets, "sprites");
  await fs.mkdir(outDir, { recursive: true });
  for (const f of await fs.readdir(outDir)) await fs.rm(path.join(outDir, f));

  const { data, info } = await sharp(src)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const ALPHA_THRESHOLD = 40;
  const MIN_AREA = 1500;
  const PADDING = 4;

  const visited = new Uint8Array(width * height);
  const isOpaque = (x, y) => data[(y * width + x) * channels + 3] > ALPHA_THRESHOLD;

  const boxes = [];
  const stack = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx] || !isOpaque(x, y)) continue;

      let minX = x, maxX = x, minY = y, maxY = y, area = 0;
      visited[idx] = 1;
      stack.push([x, y]);
      while (stack.length) {
        const [cx, cy] = stack.pop();
        area++;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const nIdx = ny * width + nx;
          if (visited[nIdx] || !isOpaque(nx, ny)) continue;
          visited[nIdx] = 1;
          stack.push([nx, ny]);
        }
      }
      if (area >= MIN_AREA) boxes.push({ minX, minY, maxX, maxY });
    }
  }

  // reading order: top-to-bottom row bands, then left-to-right within a band
  const rowBand = (b) => Math.round(b.minY / 150);
  boxes.sort((a, b) => rowBand(a) - rowBand(b) || a.minX - b.minX);

  const manifest = [];
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    const left = Math.max(0, b.minX - PADDING);
    const top = Math.max(0, b.minY - PADDING);
    const w = Math.min(width, b.maxX + PADDING) - left;
    const h = Math.min(height, b.maxY + PADDING) - top;
    const name = `sprite-${String(i + 1).padStart(2, "0")}.png`;
    await sharp(data, { raw: { width, height, channels } })
      .extract({ left, top, width: w, height: h })
      .png()
      .toFile(path.join(outDir, name));
    manifest.push({ file: name, width: w, height: h });
  }

  await fs.writeFile(
    path.join(outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
  console.log(`extracted ${manifest.length} sprites into src/assets/sprites/`);
}

if (await exists(path.join(assets, "bg-original.jpg"))) {
  await cropFloor();
} else {
  console.log("skip cropFloor: bg-original.jpg missing, bg.png left as-is");
}

if (await exists(path.join(assets, furnitureFile))) {
  await makeFurnitureTransparent();
} else {
  console.log(`skip makeFurnitureTransparent: ${furnitureFile} missing, using existing furniture.png`);
}

await extractSprites();
