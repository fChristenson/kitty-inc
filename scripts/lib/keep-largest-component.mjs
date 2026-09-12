// zeroes the alpha of every opaque pixel EXCEPT the single largest 4-connected
// blob — used after a whiteness-threshold chroma-key to clean up small stray
// "opaque noise" specks the JPEG/JFIF source's own compression artifacts can
// leave scattered in what should be fully-cleared background (a lone
// low-whiteness fleck a few pixels wide, disconnected from the real icon,
// survives a per-pixel threshold same as real content would). Safe for icons
// whose real content (fill + outline + any enclosed detail) is always one
// single connected shape — do NOT use this on multi-part scenes where
// legitimately separate pieces must all survive.
export function keepLargestOpaqueComponent(
  data,
  width,
  height,
  channels,
  alphaCutoff = 20,
) {
  const labels = new Int32Array(width * height).fill(-1);
  const queue = new Int32Array(width * height);
  const sizes = [];
  const alphaAt = (idx) => data[idx * channels + 3];

  for (let start = 0; start < width * height; start++) {
    if (labels[start] !== -1 || alphaAt(start) <= alphaCutoff) continue;
    const label = sizes.length;
    let qHead = 0;
    let qTail = 0;
    queue[qTail++] = start;
    labels[start] = label;
    let size = 0;
    while (qHead < qTail) {
      const idx = queue[qHead++];
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
        if (nIdx === -1 || labels[nIdx] !== -1) continue;
        if (alphaAt(nIdx) <= alphaCutoff) continue;
        labels[nIdx] = label;
        queue[qTail++] = nIdx;
      }
    }
    sizes.push(size);
  }

  if (sizes.length === 0) return;
  let largestLabel = 0;
  for (let i = 1; i < sizes.length; i++) {
    if (sizes[i] > sizes[largestLabel]) largestLabel = i;
  }
  for (let idx = 0; idx < width * height; idx++) {
    if (labels[idx] !== -1 && labels[idx] !== largestLabel) {
      data[idx * channels + 3] = 0;
    }
  }
}
