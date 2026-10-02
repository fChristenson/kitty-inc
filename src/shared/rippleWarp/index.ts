// water rippling across an already-drawn image: rings round a center where
// the picture shows refracted outward or inward by offset(r), each ring of it
// drawn again scaled round the center so its pixels come from a little
// nearer or farther out, then lit on its rising slopes and shaded on its
// falling ones like light on wave crests
type Box = { x: number; y: number; w: number; h: number };

// the slices each band is cut into, px across, widened so a frame never
// redraws the image more than MAX_RINGS times
const STEP = 6;
const MAX_RINGS = 24;
// leaves the middle alone, where a ring's scale would blow up
const MIN_RADIUS = 24;
// light/shade per px of offset change per px of radius, and their cap
const SHADE = 0.1;
const MAX_SHADE = 0.12;

// image drawn at `box` (all in ctx's untransformed px), rippled within
// `bands` ([from, to] radii round (cx, cy)), offset(r) px outward at radius r
export function drawRippleWarp(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  box: Box,
  cx: number,
  cy: number,
  bands: [number, number][],
  offset: (r: number) => number,
): void {
  const merged = mergeBands(bands);
  const span = merged.reduce(
    (sum, [from, to]) => sum + Math.max(0, to - Math.max(MIN_RADIUS, from)),
    0,
  );
  const step = Math.max(STEP, span / MAX_RINGS);
  for (const [from, to] of merged) {
    for (let r0 = Math.max(MIN_RADIUS, from); r0 < to; r0 += step) {
      const r1 = Math.min(to, r0 + step);
      const r = (r0 + r1) / 2;
      const d = offset(r);
      const slope = (offset(r + 1) - offset(r - 1)) / 2;
      if (Math.abs(d) < 0.3 && Math.abs(slope) < 0.01) continue;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r1, 0, Math.PI * 2);
      ctx.arc(cx, cy, r0, 0, Math.PI * 2, true);
      ctx.clip("evenodd");
      // its pixels come from radius r - d
      const k = r / Math.max(1, r - d);
      ctx.translate(cx, cy);
      ctx.scale(k, k);
      ctx.translate(-cx, -cy);
      ctx.drawImage(image, box.x, box.y, box.w, box.h);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const shade = Math.min(MAX_SHADE, Math.abs(slope) * SHADE);
      if (shade > 0.01) {
        ctx.globalAlpha = shade;
        ctx.fillStyle = slope > 0 ? "#FFFFFF" : "#000000";
        ctx.fillRect(cx - r1, cy - r1, r1 * 2, r1 * 2);
      }
      ctx.restore();
    }
  }
}

function mergeBands(bands: [number, number][]): [number, number][] {
  const sorted = [...bands].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [from, to] of sorted) {
    const last = merged[merged.length - 1];
    if (last && from <= last[1]) last[1] = Math.max(last[1], to);
    else merged.push([from, to]);
  }
  return merged;
}
