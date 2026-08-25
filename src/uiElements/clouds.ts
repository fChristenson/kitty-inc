// decorative clouds drifting slowly left-to-right across the sky band visible in
// the side gutters (see style.css's .game__clouds). Purely time-based: no particle
// arrays or rAF loop of its own — main.ts's existing perpetual redraw loop just
// calls drawClouds(now) every frame, same way worker.ts positions itself off `now`.

interface CloudDef {
  y: number; // fraction of canvas height
  size: number; // fraction of canvas height, the cloud's rough radius unit
  speed: number; // px/ms
  phase: number; // 0..1, staggers clouds along the loop so they don't clump together
}

const CLOUDS: CloudDef[] = [
  { y: 0.3, size: 0.32, speed: 0.01, phase: 0 },
  { y: 0.65, size: 0.22, speed: 0.007, phase: 0.4 },
  { y: 0.18, size: 0.18, speed: 0.015, phase: 0.65 },
  { y: 0.8, size: 0.26, speed: 0.009, phase: 0.85 },
];

function drawCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
): void {
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.beginPath();
  // a cluster of overlapping circles reads as a puffy cloud silhouette
  ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
  ctx.arc(x - r * 0.7, y + r * 0.15, r * 0.45, 0, Math.PI * 2);
  ctx.arc(x + r * 0.7, y + r * 0.15, r * 0.5, 0, Math.PI * 2);
  ctx.arc(x - r * 0.25, y - r * 0.3, r * 0.45, 0, Math.PI * 2);
  ctx.arc(x + r * 0.3, y - r * 0.25, r * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

// draws every cloud at its current drift position, looping each one back to the
// right edge once it's fully exited on the left so the sky never runs out of clouds
export function drawClouds(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  now: number,
): void {
  ctx.clearRect(0, 0, width, height);
  for (const cloud of CLOUDS) {
    const r = cloud.size * height;
    const loopWidth = width + r * 2;
    // drift right-to-left: x counts down from width+r (off-screen right) to -r (off-screen left)
    const x =
      width + r - ((now * cloud.speed + cloud.phase * loopWidth) % loopWidth);
    drawCloud(ctx, x, cloud.y * height, r);
  }
}
