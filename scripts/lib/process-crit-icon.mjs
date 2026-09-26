import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";
import { dropSmallOpaqueComponents } from "./drop-small-components.mjs";
import { dropEdgeTouchingComponents } from "./drop-edge-components.mjs";
import { writeCritSticker } from "./sticker-border.mjs";
import { critIconDir, critIconFile } from "./crit-asset-paths.mjs";

export async function processCritIcon(
  name,
  {
    backgroundSeeds = [],
    darkBackgroundThreshold = null,
    backgroundColor = null,
    backgroundColorTolerance = 35,
    // (r, g, b) => boolean; overrides the colour/whiteness background test
    backgroundMatch = null,
    protectedRects = [],
    sourceExtension = ".jfif",
    sourcePath = null,
    copyToAssetDirectories = false,
    // {left, top, width, height} of the real artwork when the source arrives
    // letterboxed — the border-seeded fill can't start inside a non-white bar
    sourceRect = null,
    // for sources framed by a rounded "card": pair with a sourceRect that cuts
    // the frame's straight edges, and this clears the corner arcs it leaves
    dropEdgeComponents = false,
    // Remove an enclosed white sticker halo when it borders transparent pixels,
    // while preserving white details enclosed by the illustration.
    dropWhiteHalo = false,
    whiteHaloThreshold = 195,
  } = {},
) {
  const assets = path.resolve(import.meta.dirname, "../../src/assets");
  const critAssets = path.resolve(import.meta.dirname, "../../public");
  const category = critIconDir(name);
  const pipeline = sharp(
    sourcePath ?? path.join(assets, category, `${name}${sourceExtension}`),
  ).ensureAlpha();
  const { data, info } = await (
    sourceRect ? pipeline.extract(sourceRect) : pipeline
  )
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const background = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const whiteness = (pixel) =>
    Math.min(...data.subarray(pixel * channels, pixel * channels + 3));
  const isBackgroundColor = (pixel) =>
    backgroundMatch !== null
      ? backgroundMatch(
          data[pixel * channels],
          data[pixel * channels + 1],
          data[pixel * channels + 2],
        )
      : backgroundColor !== null
      ? Math.hypot(
          ...backgroundColor.map(
            (channel, index) => data[pixel * channels + index] - channel,
          ),
        ) <= backgroundColorTolerance
      : darkBackgroundThreshold === null
        ? whiteness(pixel) >= 195
        : whiteness(pixel) <= darkBackgroundThreshold;
  const isProtected = (pixel) => {
    const column = pixel % width;
    const row = Math.floor(pixel / width);
    return protectedRects.some(
      ({ left, top, right, bottom }) =>
        column >= left && column <= right && row >= top && row <= bottom,
    );
  };
  const enqueue = (pixel) => {
    if (background[pixel] || isProtected(pixel) || !isBackgroundColor(pixel))
      return;
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
    if (column < 0 || column >= width || row < 0 || row >= height) {
      throw new Error(`Invalid background seed for ${name}: ${column},${row}`);
    }
    enqueue(row * width + column);
  }
  while (head < tail) {
    const pixel = queue[head++];
    const column = pixel % width;
    if (column > 0) enqueue(pixel - 1);
    if (column + 1 < width) enqueue(pixel + 1);
    if (pixel >= width) enqueue(pixel - width);
    if (pixel + width < background.length) enqueue(pixel + width);
  }
  for (let pixel = 0; pixel < background.length; pixel++) {
    if (!background[pixel]) continue;
    const column = pixel % width;
    const touchesContent =
      (column > 0 && !background[pixel - 1]) ||
      (column + 1 < width && !background[pixel + 1]) ||
      (pixel >= width && !background[pixel - width]) ||
      (pixel + width < background.length && !background[pixel + width]);
    data[pixel * channels + 3] =
      darkBackgroundThreshold !== null ||
      backgroundColor !== null ||
      backgroundMatch !== null
        ? 0
        : touchesContent
          ? Math.round(
              255 * Math.max(0, Math.min(1, (235 - whiteness(pixel)) / 40)),
            )
          : 0;
  }
  dropSmallOpaqueComponents(data, width, height, channels, 120);
  if (dropEdgeComponents) {
    dropEdgeTouchingComponents(data, width, height, channels);
  }
  if (dropWhiteHalo) {
    let opaqueLeft = width;
    let opaqueTop = height;
    let opaqueRight = -1;
    let opaqueBottom = -1;
    for (let pixel = 0; pixel < background.length; pixel++) {
      if (data[pixel * channels + 3] <= 20) continue;
      const column = pixel % width;
      const row = Math.floor(pixel / width);
      opaqueLeft = Math.min(opaqueLeft, column);
      opaqueTop = Math.min(opaqueTop, row);
      opaqueRight = Math.max(opaqueRight, column);
      opaqueBottom = Math.max(opaqueBottom, row);
    }
    const visited = new Uint8Array(width * height);
    const component = [];
    const queue = new Int32Array(width * height);
    for (let start = 0; start < visited.length; start++) {
      if (
        visited[start] ||
        data[start * channels + 3] <= 20 ||
        whiteness(start) < whiteHaloThreshold
      ) {
        continue;
      }
      let head = 0;
      let tail = 0;
      let touchesTransparent = false;
      let componentLeft = width;
      let componentTop = height;
      let componentRight = -1;
      let componentBottom = -1;
      component.length = 0;
      visited[start] = 1;
      queue[tail++] = start;
      while (head < tail) {
        const pixel = queue[head++];
        component.push(pixel);
        const column = pixel % width;
        const row = Math.floor(pixel / width);
        componentLeft = Math.min(componentLeft, column);
        componentTop = Math.min(componentTop, row);
        componentRight = Math.max(componentRight, column);
        componentBottom = Math.max(componentBottom, row);
        const neighbors = [];
        if (column > 0) neighbors.push(pixel - 1);
        if (column + 1 < width) neighbors.push(pixel + 1);
        if (pixel >= width) neighbors.push(pixel - width);
        if (pixel + width < visited.length) neighbors.push(pixel + width);
        for (const neighbor of neighbors) {
          if (data[neighbor * channels + 3] <= 20) {
            touchesTransparent = true;
            continue;
          }
          if (visited[neighbor] || whiteness(neighbor) < whiteHaloThreshold) {
            continue;
          }
          visited[neighbor] = 1;
          queue[tail++] = neighbor;
        }
      }
      const reachesOpaqueEdge =
        componentLeft <= opaqueLeft + 2 ||
        componentTop <= opaqueTop + 2 ||
        componentRight >= opaqueRight - 2 ||
        componentBottom >= opaqueBottom - 2;
      if (touchesTransparent || reachesOpaqueEdge) {
        for (const pixel of component) data[pixel * channels + 3] = 0;
      }
    }
  }
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let pixel = 0; pixel < background.length; pixel++) {
    if (data[pixel * channels + 3] <= 20) continue;
    const column = pixel % width;
    const row = Math.floor(pixel / width);
    left = Math.min(left, column);
    right = Math.max(right, column);
    top = Math.min(top, row);
    bottom = Math.max(bottom, row);
  }
  if (right < left || bottom < top) throw new Error(`Empty crit icon: ${name}`);
  const destination = path.join(critAssets, critIconFile(name));
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await sharp(data, { raw: { width, height, channels } })
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize(250, 250, { fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true })
    .toFile(destination);
  await writeCritSticker(name);
  if (copyToAssetDirectories) {
    for (const directory of [
      path.join(assets, category),
      path.join(assets, "processedCrits", path.relative("crits", category)),
    ]) {
      await fs.mkdir(directory, { recursive: true });
      await fs.copyFile(destination, path.join(directory, `${name}.png`));
    }
  }
  console.log(`Processed and copied ${name}.png`);
}
