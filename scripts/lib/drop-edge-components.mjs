// zeroes the alpha of every opaque blob that reaches the image border. After a
// border-seeded chroma-key the real subject is always fenced off from the edge
// by cleared background, so anything still touching it is framing left behind
// by the source — typically the rounded corner arcs of a sticker "card" whose
// straight edges a rectangular pre-crop already removed.
export function dropEdgeTouchingComponents(
  data,
  width,
  height,
  channels,
  alphaCutoff = 20,
) {
  const seen = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const alphaAt = (idx) => data[idx * channels + 3];
  let head = 0;
  let tail = 0;

  const enqueue = (idx) => {
    if (seen[idx] || alphaAt(idx) <= alphaCutoff) return;
    seen[idx] = 1;
    queue[tail++] = idx;
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
    const idx = queue[head++];
    const x = idx % width;
    if (x > 0) enqueue(idx - 1);
    if (x < width - 1) enqueue(idx + 1);
    if (idx >= width) enqueue(idx - width);
    if (idx + width < seen.length) enqueue(idx + width);
  }
  for (let idx = 0; idx < seen.length; idx++) {
    if (seen[idx]) data[idx * channels + 3] = 0;
  }
}
