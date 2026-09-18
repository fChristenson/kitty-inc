import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";

// Wraps an already-cut-out crit icon in a smooth white sticker border.
//
// Everything is computed on a supersampled canvas and only downscaled at the
// very end, so the outline lands on the final PNG as a properly antialiased
// curve instead of a stair-stepped mask. The border itself is a Euclidean
// distance field around the silhouette (uniform width everywhere, convex
// corners rounded to the border radius) followed by a morphological closing,
// which rounds off the concave notches a plain dilation would leave sharp.
// Holes fully enclosed by the artwork are filled before any of that, and the
// artwork is composited over opaque white, so the sticker face is solid white
// wherever the art is transparent or translucent.

const SUPERSAMPLE = 4;
const FINAL_MAX = 250;
export const DEFAULT_BORDER = 9; // px of white, measured in final-image pixels
const MASK_THRESHOLD = 128;
const INF = 1e9;

// Felzenszwalb & Huttenlocher exact squared Euclidean distance transform.
// Returns squared distance from every pixel to the nearest seed pixel.
function squaredDistanceField(seeds, width, height) {
  const field = new Float64Array(width * height);
  for (let i = 0; i < field.length; i++) field[i] = seeds[i] ? 0 : INF;
  const span = Math.max(width, height);
  const d = new Float64Array(span);
  const v = new Int32Array(span);
  const z = new Float64Array(span + 1);
  const transform = (offset, stride, length) => {
    let k = 0;
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    for (let q = 1; q < length; q++) {
      const fq = field[offset + q * stride] + q * q;
      let s;
      for (;;) {
        const vk = v[k];
        s = (fq - (field[offset + vk * stride] + vk * vk)) / (2 * (q - vk));
        if (s > z[k]) break;
        k--;
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < length; q++) {
      while (z[k + 1] < q) k++;
      const vk = v[k];
      d[q] = (q - vk) * (q - vk) + field[offset + vk * stride];
    }
    for (let q = 0; q < length; q++) field[offset + q * stride] = d[q];
  };
  for (let x = 0; x < width; x++) transform(x, width, height);
  for (let y = 0; y < height; y++) transform(y * width, 1, width);
  return field;
}

function dilate(mask, width, height, radius) {
  const field = squaredDistanceField(mask, width, height);
  const limit = radius * radius;
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < out.length; i++) out[i] = field[i] <= limit ? 1 : 0;
  return out;
}

function erode(mask, width, height, radius) {
  const inverted = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) inverted[i] = mask[i] ? 0 : 1;
  const field = squaredDistanceField(inverted, width, height);
  const limit = radius * radius;
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < out.length; i++) out[i] = field[i] > limit ? 1 : 0;
  return out;
}

function fillEnclosedHoles(mask, width, height) {
  const outside = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);
  let head = 0;
  let tail = 0;
  const enqueue = (pixel) => {
    if (mask[pixel] || outside[pixel]) return;
    outside[pixel] = 1;
    queue[tail++] = pixel;
  };
  for (let x = 0; x < width; x++) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }
  while (head < tail) {
    const pixel = queue[head++];
    const column = pixel % width;
    if (column > 0) enqueue(pixel - 1);
    if (column + 1 < width) enqueue(pixel + 1);
    if (pixel >= width) enqueue(pixel - width);
    if (pixel + width < mask.length) enqueue(pixel + width);
  }
  const filled = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) filled[i] = outside[i] ? 0 : 1;
  return filled;
}

export async function addStickerBorder(
  sourcePath,
  destinationPath,
  border = DEFAULT_BORDER,
) {
  const artMax = Math.max(1, FINAL_MAX - 2 * border);
  const radius = border * SUPERSAMPLE;
  const pad = radius * 2 + SUPERSAMPLE * 2;
  const art = await sharp(sourcePath)
    .ensureAlpha()
    .resize(artMax * SUPERSAMPLE, artMax * SUPERSAMPLE, {
      fit: "inside",
      kernel: "lanczos3",
    })
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = art.info;
  const data = art.data;

  const silhouette = new Uint8Array(width * height);
  for (let pixel = 0; pixel < silhouette.length; pixel++) {
    silhouette[pixel] = data[pixel * channels + 3] >= MASK_THRESHOLD ? 1 : 0;
  }
  const solid = fillEnclosedHoles(silhouette, width, height);
  const grown = dilate(solid, width, height, radius);
  // Closing at the border radius rounds the concave creases dilation leaves
  // behind, so no part of the outline comes to a point.
  const closed = erode(
    dilate(grown, width, height, radius),
    width,
    height,
    radius,
  );
  const sticker = fillEnclosedHoles(closed, width, height);

  const out = Buffer.alloc(width * height * 4);
  for (let pixel = 0; pixel < sticker.length; pixel++) {
    if (!sticker[pixel]) continue;
    const source = pixel * channels;
    const alpha = data[source + 3] / 255;
    const target = pixel * 4;
    for (let c = 0; c < 3; c++) {
      out[target + c] = Math.round(data[source + c] * alpha + 255 * (1 - alpha));
    }
    out[target + 3] = 255;
  }

  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let pixel = 0; pixel < sticker.length; pixel++) {
    if (!sticker[pixel]) continue;
    const column = pixel % width;
    const row = (pixel - column) / width;
    if (column < left) left = column;
    if (column > right) right = column;
    if (row < top) top = row;
    if (row > bottom) bottom = row;
  }
  if (right < left || bottom < top) {
    throw new Error(`Empty sticker for ${path.basename(sourcePath)}`);
  }

  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  await sharp(out, { raw: { width, height, channels: 4 } })
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize(FINAL_MAX, FINAL_MAX, {
      fit: "inside",
      kernel: "lanczos3",
      withoutEnlargement: true,
    })
    .png({ compressionLevel: 9, palette: true })
    .toFile(destinationPath);
}

// Every crit icon ships from public/stickers/ (see loadAssets' critAssetUrl),
// so each freshly processed public/<name>.png needs its sticker cut too.
export async function writeCritSticker(name) {
  const publicDir = path.resolve(import.meta.dirname, "../../public");
  await addStickerBorder(
    path.join(publicDir, `${name}.png`),
    path.join(publicDir, "stickers", `${name}.png`),
  );
}
