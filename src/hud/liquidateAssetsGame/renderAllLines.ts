import { renderJumpLines } from "./renderJumpLines";
import { drawMainLine } from "./mainLine";
import {
  BASE_GAP_PX,
  REST_PLATFORM_WIDTH_PX,
  REST_PLATFORM_JUMP_COUNT,
  type Platform,
} from "./index";

function makeMainLine(x: number, y: number): Platform {
  return {
    x,
    y,
    endY: y,
    width: REST_PLATFORM_WIDTH_PX,
    chainFromX: x + REST_PLATFORM_JUMP_COUNT * BASE_GAP_PX,
    kind: "long",
  };
}

// builds and draws one full cycle: a main line, a run of jump-segment
// lines off it (see renderJumpLines), then a second main line to close it
// out — every platform (main line or jump line alike) is exactly
// BASE_GAP_PX past whatever came before it, with no exceptions across the
// whole combined sequence. x is the previous platform's own chainFromX —
// same convention as renderJumpLines — so chaining repeated calls (this
// call's own returned end main line's chainFromX feeding the next call's x)
// never overlaps; placing the start main line directly AT x (skipping the
// +BASE_GAP_PX every other placement gets) was the bug that let a chained
// call's main line land 40px inside the previous cycle's own end main line
export function renderAllLines(
  ctx: CanvasRenderingContext2D | null,
  x: number,
  y: number,
  survivedMs = 0,
): Platform[] {
  const platforms: Platform[] = [];

  const startMain = makeMainLine(x + BASE_GAP_PX, y);
  platforms.push(startMain);

  const jumpLines = renderJumpLines(ctx, startMain.chainFromX, y, survivedMs);
  platforms.push(...jumpLines);

  const lastJumpLine = jumpLines.at(-1) ?? startMain;
  const endMain = makeMainLine(lastJumpLine.chainFromX + BASE_GAP_PX, y);
  platforms.push(endMain);

  if (ctx) drawMainLine(ctx, [startMain, endMain]);

  return platforms;
}
