import { smoothstep } from "../../shared/easing";

// real SVG <line> rays, positioned/animated frame-by-frame from JS (not CSS —
// a CSS gradient can't render an actual ray shape, and driving it here keeps
// the sweep tightly in sync with the swoosh played alongside it) — split out
// of cityMap/index.ts since neither sweep needs anything from that module
// beyond the svg element + its current on-screen size, both passed in

const SPEED_LINE_COUNT = 12;
const SPEED_LINE_MS = 180;

function buildRays(
  svg: SVGSVGElement,
  w: number,
  h: number,
  axis: "horizontal" | "vertical",
): SVGLineElement[] {
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.innerHTML = "";
  const lines: SVGLineElement[] = [];
  for (let i = 0; i < SPEED_LINE_COUNT; i++) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    if (axis === "horizontal") {
      const y = (((i * 37) % 100) / 100) * h; // deterministic spread, not evenly gridded
      const length = (0.22 + ((i * 53) % 48) / 100) * w; // varying "range": 22-70% of width
      line.setAttribute("x1", "0");
      line.setAttribute("x2", String(length));
      line.setAttribute("y1", String(y));
      line.setAttribute("y2", String(y));
    } else {
      const x = (((i * 37) % 100) / 100) * w; // deterministic spread, not evenly gridded
      const length = (0.22 + ((i * 53) % 48) / 100) * h; // varying "range": 22-70% of height
      line.setAttribute("x1", String(x));
      line.setAttribute("x2", String(x));
      line.setAttribute("y1", "0");
      line.setAttribute("y2", String(length));
    }
    svg.appendChild(line);
    lines.push(line);
  }
  return lines;
}

function opacityForPhase(t: number): number {
  return t < 0.15 ? t / 0.15 : t > 0.75 ? Math.max(0, (1 - t) / 0.25) : 1;
}

let speedLineAnimId: number | null = null;

// next (delta 1) = the view moving forward/right, so the rays stream the
// opposite way (right-to-left) past it, same parallax as scenery rushing past
// a car window; prev mirrors it
export function playSpeedLines(
  svg: SVGSVGElement,
  w: number,
  h: number,
  delta: -1 | 1,
): void {
  if (speedLineAnimId !== null) cancelAnimationFrame(speedLineAnimId);
  const lines = buildRays(svg, w, h, "horizontal");
  const startX = delta > 0 ? w * 1.2 : -w * 1.3;
  const endX = delta > 0 ? -w * 1.3 : w * 1.2;
  const start = performance.now();
  function frame(now: number): void {
    const t = Math.min(1, (now - start) / SPEED_LINE_MS);
    const x = startX + (endX - startX) * smoothstep(t);
    const opacity = opacityForPhase(t);
    for (const line of lines) {
      line.setAttribute("transform", `translate(${x} 0)`);
      line.style.opacity = String(opacity);
    }
    if (t < 1) {
      speedLineAnimId = requestAnimationFrame(frame);
    } else {
      svg.innerHTML = "";
      speedLineAnimId = null;
    }
  }
  speedLineAnimId = requestAnimationFrame(frame);
}

// for a view's own cleanup/destroy — cancels an in-flight horizontal sweep, if any
export function cancelSpeedLines(): void {
  if (speedLineAnimId !== null) {
    cancelAnimationFrame(speedLineAnimId);
    speedLineAnimId = null;
  }
}

let verticalSpeedLineAnimId: number | null = null;

// same ray sweep as playSpeedLines above, just rotated to run along Y instead
// of X — direction 1 ("down") streams downward; -1 ("up") streams upward
export function playVerticalSpeedLines(
  svg: SVGSVGElement,
  w: number,
  h: number,
  direction: -1 | 1,
): void {
  if (verticalSpeedLineAnimId !== null) {
    cancelAnimationFrame(verticalSpeedLineAnimId);
  }
  const lines = buildRays(svg, w, h, "vertical");
  const startY = direction > 0 ? -h * 1.3 : h * 1.2;
  const endY = direction > 0 ? h * 1.2 : -h * 1.3;
  const start = performance.now();
  function frame(now: number): void {
    const t = Math.min(1, (now - start) / SPEED_LINE_MS);
    const y = startY + (endY - startY) * smoothstep(t);
    const opacity = opacityForPhase(t);
    for (const line of lines) {
      line.setAttribute("transform", `translate(0 ${y})`);
      line.style.opacity = String(opacity);
    }
    if (t < 1) {
      verticalSpeedLineAnimId = requestAnimationFrame(frame);
    } else {
      svg.innerHTML = "";
      verticalSpeedLineAnimId = null;
    }
  }
  verticalSpeedLineAnimId = requestAnimationFrame(frame);
}

// for a view's own cleanup/destroy — cancels an in-flight vertical sweep, if any
export function cancelVerticalSpeedLines(): void {
  if (verticalSpeedLineAnimId !== null) {
    cancelAnimationFrame(verticalSpeedLineAnimId);
    verticalSpeedLineAnimId = null;
  }
}
