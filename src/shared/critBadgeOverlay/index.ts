import { createCritBadgeRenderer } from "./overlay";
import { getEffectiveDpr } from "../devicePixelRatio";
import { onTapOrClick } from "../tapEvents";

let overlay: ReturnType<typeof createOverlay> | null = null;

export function getCritBadgeOverlay() {
  return (overlay ??= createOverlay());
}

function createOverlay() {
  const canvas = document.createElement("canvas");
  canvas.hidden = true;
  canvas.tabIndex = 0;
  canvas.setAttribute("role", "button");
  canvas.setAttribute(
    "aria-label",
    "Rewards. Activate for next page or to dismiss.",
  );
  canvas.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;z-index:1000;touch-action:none;";
  document.body.append(canvas);
  const context = canvas.getContext("2d")!;
  let frame: number | null = null;
  let openedAt = 0;
  let previousFocus: HTMLElement | null = null;
  const renderer = createCritBadgeRenderer(
    context,
    () => ({ cssW: window.innerWidth, cssH: window.innerHeight }),
    redraw,
    (visible) => {
      canvas.hidden = !visible;
      if (visible) {
        openedAt = Date.now();
        previousFocus = document.activeElement as HTMLElement | null;
        canvas.focus();
      } else {
        previousFocus?.focus();
      }
    },
  );

  function redraw(): void {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    if (!renderer.visible) return;
    const dpr = getEffectiveDpr();
    const width = Math.round(window.innerWidth * dpr);
    const height = Math.round(window.innerHeight * dpr);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    renderer.draw(Date.now());
    if (renderer.animating) frame = requestAnimationFrame(redraw);
  }

  onTapOrClick(canvas, () => {
    if (Date.now() - openedAt < 300) return;
    renderer.advance();
  });
  canvas.addEventListener("keydown", (event) => {
    if (event.key === "Escape") renderer.close();
    else if (event.key === "Enter" || event.key === " ") renderer.advance();
    else return;
    event.preventDefault();
  });
  window.addEventListener("resize", redraw);
  return renderer;
}
