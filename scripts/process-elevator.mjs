import sharp from "sharp";
import path from "node:path";

// raw src/assets/elevator.jfif (AI-generated: metal elevator doors/frame set
// into a hallway scene — blue-gray wall + a beige lobby floor with a white
// baseboard, plus a ceiling light fixture mounted on the wall above the
// doors) — per explicit request, only the metal elevator itself (frame,
// doors, and the interior visible through them) should remain; the
// surrounding wall/floor/light are cropped away to transparency.
//
// Unlike chain.jfif/shield.jfif (a plain near-white background, removable by
// a single whiteness threshold), this source's background is TWO different,
// non-white colors (a bluish wall, a warm beige floor) that together span
// almost the whole image border — so instead of comparing each pixel to one
// fixed target color, this does a "paint bucket"-style flood fill from every
// border pixel: a candidate neighbor only joins the background if it's
// within CHAIN_TOLERANCE of the SPECIFIC pixel that's expanding into it, not
// of some fixed reference. That lets it trail across the wall/floor's own
// smooth lighting gradients arbitrarily far while still stopping dead at any
// genuinely sharp edge (verified via pixel sampling: wall->frame/frame->
// interior/floor->door-sill jumps all measure 65-160 in Euclidean RGB
// distance, versus <20 for a normal in-region shading step).
const CHAIN_TOLERANCE = 40;

// the cab's own interior (cream back wall, wood floor, handrail, button panel)
// is close enough in color to the hallway wall/floor that CHAIN_TOLERANCE's
// per-step comparison can still trail across the open doorway and wipe the
// interior out too (confirmed happened here) — measured directly on the raw
// 1248x832 source (several columns scanned top-to-bottom) and hardcoded as a
// rectangle the flood fill is never allowed to step INTO, regardless of color
// similarity, so the interior can never be misclassified as background no
// matter how smooth that particular gradient is
const PROTECTED_RECT = { minX: 465, maxX: 785, minY: 155, maxY: 750 };
function isProtected(x, y) {
  return (
    x >= PROTECTED_RECT.minX &&
    x <= PROTECTED_RECT.maxX &&
    y >= PROTECTED_RECT.minY &&
    y <= PROTECTED_RECT.maxY
  );
}

const assets = path.resolve(import.meta.dirname, "..", "src", "assets");
const src = path.join(assets, "elevator.jfif");
const dest = path.join(assets, "elevator.png");

const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

function colorAt(idx) {
  const i = idx * channels;
  return [data[i], data[i + 1], data[i + 2]];
}

function colorDist(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

const isBackground = new Uint8Array(width * height);
const queue = new Int32Array(width * height);
let qHead = 0;
let qTail = 0;

function seed(idx) {
  if (isBackground[idx]) return;
  isBackground[idx] = 1;
  queue[qTail++] = idx;
}
// every border pixel is guaranteed wall/floor/baseboard in this specific
// source (confirmed by sampling all 4 edges) — no need to color-test them,
// just seed the whole border directly and let the chain fill do the rest
for (let x = 0; x < width; x++) {
  seed(x);
  seed((height - 1) * width + x);
}
for (let y = 0; y < height; y++) {
  seed(y * width);
  seed(y * width + width - 1);
}
while (qHead < qTail) {
  const idx = queue[qHead++];
  const color = colorAt(idx);
  const x = idx % width;
  const y = (idx / width) | 0;
  const neighbors = [];
  if (x > 0) neighbors.push(idx - 1);
  if (x < width - 1) neighbors.push(idx + 1);
  if (y > 0) neighbors.push(idx - width);
  if (y < height - 1) neighbors.push(idx + width);
  for (const nIdx of neighbors) {
    if (isBackground[nIdx]) continue;
    const nx = nIdx % width;
    const ny = (nIdx / width) | 0;
    if (isProtected(nx, ny)) continue;
    if (colorDist(color, colorAt(nIdx)) <= CHAIN_TOLERANCE) seed(nIdx);
  }
}

for (let idx = 0; idx < width * height; idx++) {
  if (isBackground[idx]) data[idx * channels + 3] = 0;
}

// the ceiling light fixture mounted on the wall (its own bright/dark rings)
// mostly chain-connects to the wall's own smooth gradient and is removed by
// the fill above already — what can survive is a handful of tiny
// anti-aliased-edge specks along its rim, cleaned up below by area, not by
// picking one single "biggest" component (the frame/doors are legitimately
// made of several disconnected pieces, split by their own dark seam lines)
const ALPHA_CUTOFF = 20;
const componentId = new Int32Array(width * height).fill(-1);
const componentSizes = [];
for (let start = 0; start < width * height; start++) {
  if (componentId[start] !== -1 || data[start * channels + 3] <= ALPHA_CUTOFF)
    continue;
  const id = componentSizes.length;
  let size = 0;
  let head = 0;
  let tail = 0;
  queue[tail++] = start;
  componentId[start] = id;
  while (head < tail) {
    const idx = queue[head++];
    size++;
    const x = idx % width;
    const y = (idx / width) | 0;
    const neighbors = [];
    if (x > 0) neighbors.push(idx - 1);
    if (x < width - 1) neighbors.push(idx + 1);
    if (y > 0) neighbors.push(idx - width);
    if (y < height - 1) neighbors.push(idx + width);
    for (const nIdx of neighbors) {
      if (componentId[nIdx] !== -1 || data[nIdx * channels + 3] <= ALPHA_CUTOFF)
        continue;
      componentId[nIdx] = id;
      queue[tail++] = nIdx;
    }
  }
  componentSizes.push(size);
}
// the ceiling light fixture mounted on the wall chain-connects to the wall's
// own smooth gradient just fine and is removed by the fill above already —
// what it leaves behind is a handful of tiny anti-aliased-edge specks (a few
// dozen px at most, verified by dumping every component's size + a
// false-color debug render) that never got swept up with it. Every
// genuinely elevator-owned piece (each door panel, the frame trim, the
// handrail, ...) measures at least several hundred px, so a single small
// area cutoff cleanly separates "real elevator part" from "leftover
// speck" without needing to single out one "the biggest piece" component
// (the frame/doors are legitimately made of several disconnected pieces,
// split by their own dark seam lines)
const MIN_KEEP_AREA = 150;
for (let idx = 0; idx < width * height; idx++) {
  if (componentId[idx] === -1) continue;
  if (componentSizes[componentId[idx]] < MIN_KEEP_AREA) {
    data[idx * channels + 3] = 0;
  }
}

const alphaAt = (y, x) => data[(y * width + x) * channels + 3];
function firstOpaqueRow(rows, cols, get) {
  for (let a = 0; a < rows; a++) {
    for (let b = 0; b < cols; b++) {
      if (get(a, b) > ALPHA_CUTOFF) return a;
    }
  }
  return rows;
}
const minY = firstOpaqueRow(height, width, (y, x) => alphaAt(y, x));
const maxY =
  height -
  1 -
  firstOpaqueRow(height, width, (y, x) => alphaAt(height - 1 - y, x));
const minX = firstOpaqueRow(width, height, (x, y) => alphaAt(y, x));
const maxX =
  width -
  1 -
  firstOpaqueRow(width, height, (x, y) => alphaAt(y, width - 1 - x));

await sharp(data, { raw: { width, height, channels } })
  .extract({
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  })
  .resize(400, 400, { fit: "inside", withoutEnlargement: true })
  .png({ compressionLevel: 9 })
  .toFile(dest);

const finalMeta = await sharp(dest).metadata();
console.log(
  `${path.basename(src)} -> ${path.basename(dest)}: ${finalMeta.width}x${finalMeta.height}`,
);
