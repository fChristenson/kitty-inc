import { createLines } from "./createLines";
import { drawShortLineSegment } from "./shortLine";
import { makeJumpPath } from "./makeJumpPath";
import type { LineNode, LineRewardKind } from "./createLines";
import {
  getScrollSpeed,
  getBaseGapPx,
  getPlatformWidth,
  type Platform,
} from "./index";

function makePlatform(
  x: number,
  y: number,
  width: number,
  reward: LineRewardKind,
): Platform {
  return {
    x,
    y,
    endY: y,
    width,
    chainFromX: x,
    kind: "small",
    reward,
  };
}

// gets a jump-segment TREE from createLines (anchored at y, its length
// growing with survivedMs; a fork's two branches each lead into their own
// independent sub-tree, which can fork again and so on), marks every node
// upgrade/white via makeJumpPath, then walks it breadth-first so every node
// at the same DEPTH — regardless of which branch it's actually on — lands
// in the same column, exactly one current gap past the previous one. The
// gap and each platform's own width are both derived from survivedMs (see
// index.ts's getScrollSpeed/getBaseGapPx/getPlatformWidth) so a jump
// segment spawned later in the round is spaced for the round's CURRENT
// scroll speed and sized for its CURRENT (shrunk) platform width, not
// whatever they were at the start. Draws every platform (skipped if ctx is
// null, e.g. when called outside a render pass) and returns them all so
// the caller can add them to its own collision queue
export function renderJumpLines(
  ctx: CanvasRenderingContext2D | null,
  x: number,
  y: number,
  survivedMs: number,
): Platform[] {
  const baseGapPx = getBaseGapPx(getScrollSpeed(survivedMs));
  const platformWidth = getPlatformWidth(survivedMs);
  const roots = createLines(y, survivedMs);
  makeJumpPath(roots);
  const platforms: Platform[] = [];
  let columnX = x;
  let level: LineNode[] = roots;
  while (level.length > 0) {
    // advance BEFORE placing — the first column must land a full jump past
    // the previous platform's own chain reference, not right on top of it
    columnX += baseGapPx;
    // a node can now be shared by more than one parent (see createLines'
    // per-level merging) — de-dupe by identity so a merged node becomes
    // exactly one platform, not one per parent pointing to it
    const nextLevel: LineNode[] = [];
    const seen = new Set<LineNode>();
    for (const node of level) {
      platforms.push(
        makePlatform(columnX, node.y, platformWidth, node.reward!),
      );
      for (const child of node.next) {
        if (seen.has(child)) continue;
        seen.add(child);
        nextLevel.push(child);
      }
    }
    level = nextLevel;
  }
  if (ctx) {
    for (const platform of platforms) drawShortLineSegment(ctx, platform);
  }
  return platforms;
}
