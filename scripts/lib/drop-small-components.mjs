// zeroes the alpha of every opaque pixel belonging to a 4-connected blob
// smaller than minKeepArea — unlike keep-largest-component.mjs (which keeps
// ONLY the single biggest blob), this is for a scene whose real content is
// legitimately made of several separate/overlapping pieces (e.g. a fanned
// hand of playing cards, each its own outlined shape) that must ALL survive;
// only genuinely tiny leftover noise specks from the chroma-key fade get
// dropped. See process-elevator.mjs for the pattern this was extracted from.
export function dropSmallOpaqueComponents(
  data,
  width,
  height,
  channels,
  minKeepArea,
  alphaCutoff = 20,
) {
  const componentId = new Int32Array(width * height).fill(-1);
  const componentSizes = [];
  const queue = new Int32Array(width * height);
  const alphaAt = (idx) => data[idx * channels + 3];

  for (let start = 0; start < width * height; start++) {
    if (componentId[start] !== -1 || alphaAt(start) <= alphaCutoff) continue;
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
      const neighbors = [
        x > 0 ? idx - 1 : -1,
        x < width - 1 ? idx + 1 : -1,
        y > 0 ? idx - width : -1,
        y < height - 1 ? idx + width : -1,
      ];
      for (const nIdx of neighbors) {
        if (nIdx === -1 || componentId[nIdx] !== -1) continue;
        if (alphaAt(nIdx) <= alphaCutoff) continue;
        componentId[nIdx] = id;
        queue[tail++] = nIdx;
      }
    }
    componentSizes.push(size);
  }

  for (let idx = 0; idx < width * height; idx++) {
    if (componentId[idx] === -1) continue;
    if (componentSizes[componentId[idx]] < minKeepArea) {
      data[idx * channels + 3] = 0;
    }
  }
}
