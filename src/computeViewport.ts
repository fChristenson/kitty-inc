import { FLOOR_H, FLOOR_W } from "./uiElements/floors";

export const VIEWPORT_BUFFER_ROWS = 2; // extra rows drawn above/below what's strictly visible

export interface Viewport {
  firstRow: number; // topmost floor row (0 = newest) to start drawing from
  rows: number; // how many consecutive rows the canvas needs to cover
  offsetY: number; // canvas-internal px to shift drawing up by (0..FLOOR_H)
  spacerHeightCss: number; // CSS height the scroll spacer should be set to
}

// canvas stays a small, fixed-size "viewport window" no matter how tall the building
// gets: a spacer div provides the real scrollbar height, and we only ever draw the
// handful of floor rows currently scrolled into view, redrawing them into the canvas
// each time. This is what makes "endless" floors possible without blowing up canvas
// memory/size limits or redraw cost.

export function computeViewport(
  scrollEl: HTMLElement,
  spacerWidthCss: number,
  floorCount: number,
): Viewport {
  const floorCssHeight = spacerWidthCss * (FLOOR_H / FLOOR_W);
  const spacerHeightCss = Math.max(floorCount, 1) * floorCssHeight;

  if (floorCssHeight <= 0 || floorCount === 0) {
    return { firstRow: 0, rows: 1, offsetY: 0, spacerHeightCss };
  }

  const visibleRows = Math.ceil(scrollEl.clientHeight / floorCssHeight);
  // never draw more rows than actually exist, or the canvas ends up taller than the
  // building and shows blank space past the ground floor once you scroll to the bottom
  const rows = Math.min(
    Math.max(1, visibleRows + VIEWPORT_BUFFER_ROWS),
    floorCount,
  );

  // clamp the continuous scroll position (in row units) BEFORE splitting it into
  // firstRow/offsetY, so offsetY always stays within a single row's fraction (0..FLOOR_H).
  // clamping firstRow and offsetY separately let them disagree near the bottom, which
  // left several rows of the canvas undrawn (rendering as a big blank/black gap)
  const rowFloat = scrollEl.scrollTop / floorCssHeight;
  const maxRowFloat = Math.max(0, floorCount - rows);
  const clampedRowFloat = Math.min(maxRowFloat, Math.max(0, rowFloat));
  const firstRow = Math.floor(clampedRowFloat);
  const offsetY = (clampedRowFloat - firstRow) * FLOOR_H;

  return { firstRow, rows, offsetY, spacerHeightCss };
}
