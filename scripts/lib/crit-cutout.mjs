import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";
import { squaredDistanceField } from "./sticker-border.mjs";

// Cuts a raw crit image (a subject on a plain backdrop) out into a
// transparent, tightly cropped WebP with the pixel area of at most 640x640, and returns the
// lossless PNG buffer of the same cut so derived images skip a lossy step.
//
// The backdrop is flood-filled from the image border, so light details the
// artwork's outline encloses stay opaque. Per-crit options (a spec entry's
// "process" in scripts/new-crits.mjs):
//   backgroundColor [r, g, b] + backgroundColorTolerance  flat non-white backdrop
//   darkBackgroundThreshold   backdrop darker than this whiteness (0-255)
//   backgroundSeeds [[x, y]]  enclosed backdrop pockets the border fill can't reach
//   protectedRects [{ left, top, right, bottom }]  never treated as backdrop, e.g.
//                             an edge the art runs off (pair with dropWhiteHalo: false)
//   sourceRect { left, top, width, height }  crop letterboxed/framed art first
//   dropEdgeComponents        drop pieces left touching the edge (card corners)
//   dropWhiteHalo + whiteHaloThreshold  erase a white sticker ring around the art
//   fillGapsRadius            fill gaps narrower than this radius with white
//   keepLargestComponent      keep only the biggest connected piece
// Coordinates are source pixels (after sourceRect).

const ALPHA_CUTOFF = 20;
// the flash draws icons at ~70% of the game's width, so 250 pixelated badly
export const MAX_SIZE = 640;
const MIN_PIECE_AREA = 120;

function opaqueComponents(data, width, height, channels) {
  const size = width * height;
  const labels = new Int32Array(size).fill(-1);
  const sizes = [];
  const queue = new Int32Array(size);
  for (let start = 0; start < size; start++) {
    if (labels[start] !== -1 || data[start * channels + 3] <= ALPHA_CUTOFF)
      continue;
    const label = sizes.length;
    let head = 0;
    let tail = 0;
    labels[start] = label;
    queue[tail++] = start;
    while (head < tail) {
      const pixel = queue[head++];
      const column = pixel % width;
      for (const next of [
        column > 0 ? pixel - 1 : -1,
        column + 1 < width ? pixel + 1 : -1,
        pixel - width,
        pixel + width,
      ]) {
        if (next < 0 || next >= size || labels[next] !== -1) continue;
        if (data[next * channels + 3] <= ALPHA_CUTOFF) continue;
        labels[next] = label;
        queue[tail++] = next;
      }
    }
    sizes.push(tail);
  }
  return { labels, sizes };
}

function clearComponents(data, channels, labels, shouldClear) {
  for (let pixel = 0; pixel < labels.length; pixel++)
    if (labels[pixel] !== -1 && shouldClear(labels[pixel]))
      data[pixel * channels + 3] = 0;
}

function opaqueBounds(data, width, height, channels) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let pixel = 0; pixel < width * height; pixel++) {
    if (data[pixel * channels + 3] <= ALPHA_CUTOFF) continue;
    const column = pixel % width;
    const row = Math.floor(pixel / width);
    left = Math.min(left, column);
    right = Math.max(right, column);
    top = Math.min(top, row);
    bottom = Math.max(bottom, row);
  }
  return { left, top, right, bottom };
}

// white regions that touch transparency or the art's outer bounds are a
// sticker ring, not white detail enclosed by the illustration
function dropWhiteHalo(data, width, height, channels, whiteness, threshold) {
  const bounds = opaqueBounds(data, width, height, channels);
  const size = width * height;
  const visited = new Uint8Array(size);
  const queue = new Int32Array(size);
  const isWhite = (pixel) =>
    data[pixel * channels + 3] > ALPHA_CUTOFF && whiteness(pixel) >= threshold;
  for (let start = 0; start < size; start++) {
    if (visited[start] || !isWhite(start)) continue;
    let head = 0;
    let tail = 0;
    let halo = false;
    visited[start] = 1;
    queue[tail++] = start;
    while (head < tail) {
      const pixel = queue[head++];
      const column = pixel % width;
      const row = Math.floor(pixel / width);
      if (
        column <= bounds.left + 2 ||
        row <= bounds.top + 2 ||
        column >= bounds.right - 2 ||
        row >= bounds.bottom - 2
      )
        halo = true;
      for (const next of [
        column > 0 ? pixel - 1 : -1,
        column + 1 < width ? pixel + 1 : -1,
        pixel - width,
        pixel + width,
      ]) {
        if (next < 0 || next >= size) continue;
        if (data[next * channels + 3] <= ALPHA_CUTOFF) {
          halo = true;
          continue;
        }
        if (visited[next] || !isWhite(next)) continue;
        visited[next] = 1;
        queue[tail++] = next;
      }
    }
    if (halo)
      for (let index = 0; index < tail; index++)
        data[queue[index] * channels + 3] = 0;
  }
}

// morphological closing plus hole fill: transparent pixels a disc of `radius`
// can't reach from outside the art become opaque white
function fillEnclosedGaps(data, width, height, channels, radius) {
  const size = width * height;
  const opaque = new Uint8Array(size);
  for (let pixel = 0; pixel < size; pixel++)
    opaque[pixel] = data[pixel * channels + 3] > ALPHA_CUTOFF ? 1 : 0;
  const limit = radius * radius;
  const toOpaque = squaredDistanceField(opaque, width, height);
  const outside = new Uint8Array(size);
  const queue = new Int32Array(size);
  let head = 0;
  let tail = 0;
  const enqueue = (pixel) => {
    if (outside[pixel] || toOpaque[pixel] <= limit) return;
    outside[pixel] = 1;
    queue[tail++] = pixel;
  };
  for (let column = 0; column < width; column++) {
    enqueue(column);
    enqueue((height - 1) * width + column);
  }
  for (let row = 0; row < height; row++) {
    enqueue(row * width);
    enqueue(row * width + width - 1);
  }
  while (head < tail) {
    const pixel = queue[head++];
    const column = pixel % width;
    if (column > 0) enqueue(pixel - 1);
    if (column + 1 < width) enqueue(pixel + 1);
    if (pixel >= width) enqueue(pixel - width);
    if (pixel + width < size) enqueue(pixel + width);
  }
  const toOutside = squaredDistanceField(outside, width, height);
  for (let pixel = 0; pixel < size; pixel++) {
    if (toOutside[pixel] <= limit) continue;
    const offset = pixel * channels;
    const alpha = data[offset + 3] / 255;
    for (let channel = 0; channel < 3; channel++)
      data[offset + channel] = Math.round(
        data[offset + channel] * alpha + 255 * (1 - alpha),
      );
    data[offset + 3] = 255;
  }
}

export async function cutOutCritIcon(
  sourcePath,
  destinationPath,
  {
    backgroundSeeds = [],
    darkBackgroundThreshold = null,
    backgroundColor = null,
    backgroundColorTolerance = 35,
    protectedRects = [],
    sourceRect = null,
    dropEdgeComponents = false,
    dropWhiteHalo: dropHalo = false,
    whiteHaloThreshold = 195,
    fillGapsRadius = 0,
    keepLargestComponent = false,
  } = {},
) {
  const pipeline = sharp(sourcePath).ensureAlpha();
  const { data, info } = await (
    sourceRect ? pipeline.extract(sourceRect) : pipeline
  )
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const size = width * height;
  const whiteness = (pixel) =>
    Math.min(
      data[pixel * channels],
      data[pixel * channels + 1],
      data[pixel * channels + 2],
    );
  const isBackdrop = (pixel) =>
    backgroundColor !== null
      ? Math.hypot(
          ...backgroundColor.map(
            (channel, index) => data[pixel * channels + index] - channel,
          ),
        ) <= backgroundColorTolerance
      : darkBackgroundThreshold !== null
        ? whiteness(pixel) <= darkBackgroundThreshold
        : whiteness(pixel) >= 195;
  const isProtected = (pixel) => {
    const column = pixel % width;
    const row = Math.floor(pixel / width);
    return protectedRects.some(
      ({ left, top, right, bottom }) =>
        column >= left && column <= right && row >= top && row <= bottom,
    );
  };

  const background = new Uint8Array(size);
  const queue = new Int32Array(size);
  let head = 0;
  let tail = 0;
  const enqueue = (pixel) => {
    if (background[pixel] || isProtected(pixel) || !isBackdrop(pixel)) return;
    background[pixel] = 1;
    queue[tail++] = pixel;
  };
  for (let column = 0; column < width; column++) {
    enqueue(column);
    enqueue((height - 1) * width + column);
  }
  for (let row = 0; row < height; row++) {
    enqueue(row * width);
    enqueue(row * width + width - 1);
  }
  for (const [column, row] of backgroundSeeds) {
    if (column < 0 || column >= width || row < 0 || row >= height)
      throw new Error(`background seed ${column},${row} is outside the image`);
    enqueue(row * width + column);
  }
  while (head < tail) {
    const pixel = queue[head++];
    const column = pixel % width;
    if (column > 0) enqueue(pixel - 1);
    if (column + 1 < width) enqueue(pixel + 1);
    if (pixel >= width) enqueue(pixel - width);
    if (pixel + width < size) enqueue(pixel + width);
  }

  // a white backdrop feathers into the outline; coloured/dark ones cut hard
  const feather = backgroundColor === null && darkBackgroundThreshold === null;
  for (let pixel = 0; pixel < size; pixel++) {
    if (!background[pixel]) continue;
    const column = pixel % width;
    const touchesContent =
      (column > 0 && !background[pixel - 1]) ||
      (column + 1 < width && !background[pixel + 1]) ||
      (pixel >= width && !background[pixel - width]) ||
      (pixel + width < size && !background[pixel + width]);
    data[pixel * channels + 3] =
      feather && touchesContent
        ? Math.round(
            255 * Math.max(0, Math.min(1, (235 - whiteness(pixel)) / 40)),
          )
        : 0;
  }

  let { labels, sizes } = opaqueComponents(data, width, height, channels);
  clearComponents(
    data,
    channels,
    labels,
    (label) => sizes[label] < MIN_PIECE_AREA,
  );
  if (keepLargestComponent || dropEdgeComponents) {
    ({ labels, sizes } = opaqueComponents(data, width, height, channels));
    const largest = sizes.indexOf(Math.max(...sizes));
    const onEdge = new Set();
    if (dropEdgeComponents)
      for (let pixel = 0; pixel < size; pixel++) {
        const column = pixel % width;
        const row = Math.floor(pixel / width);
        if (
          labels[pixel] !== -1 &&
          (column === 0 ||
            row === 0 ||
            column === width - 1 ||
            row === height - 1)
        )
          onEdge.add(labels[pixel]);
      }
    clearComponents(
      data,
      channels,
      labels,
      (label) =>
        (keepLargestComponent && label !== largest) || onEdge.has(label),
    );
  }
  if (dropHalo)
    dropWhiteHalo(data, width, height, channels, whiteness, whiteHaloThreshold);
  if (fillGapsRadius > 0)
    fillEnclosedGaps(data, width, height, channels, fillGapsRadius);

  const { left, top, right, bottom } = opaqueBounds(
    data,
    width,
    height,
    channels,
  );
  if (right < left || bottom < top)
    throw new Error(
      `nothing left after cutting out ${path.basename(sourcePath)}`,
    );
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  const cropWidth = right - left + 1;
  const cropHeight = bottom - top + 1;
  // capped by area, not longest side: the game shows every icon at the same
  // area, so a narrow one would otherwise be upscaled more and pixelate
  const scale = Math.min(1, MAX_SIZE / Math.sqrt(cropWidth * cropHeight));
  const lossless = await sharp(data, { raw: { width, height, channels } })
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .resize(
      Math.max(1, Math.round(cropWidth * scale)),
      Math.max(1, Math.round(cropHeight * scale)),
    )
    .png()
    .toBuffer();
  await sharp(lossless)
    .webp({ quality: 85, alphaQuality: 90, effort: 6 })
    .toFile(destinationPath);
  return lossless;
}
