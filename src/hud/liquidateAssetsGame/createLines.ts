// "upgrade" (green) and "white" work interchangeably as far as reaching
// the main line goes — both count as a "safe" continuation; only "x125"
// (red) is the off-path, no-guarantee option
export type LineRewardKind = "x125" | "upgrade" | "white";

// a jump segment is a genuine TREE, not a flat run — a fork's own two
// branches each get their OWN independent continuation (which can itself
// fork again into 2 more, and so on), instead of both merging back into
// one shared next column. `next` is empty only at a leaf, wherever that
// specific branch finally reconnects to the main line. `reward` starts
// unset; makeJumpPath fills it in afterward
export interface LineNode {
  y: number;
  next: LineNode[];
  reward?: LineRewardKind;
}

// same tunables as index.ts's own segment-length/fork-chance constants —
// kept local since this is a standalone descriptor generator, not wired
// into the live spawn queue
const MIN_SEGMENT_LENGTH = 3;
const MAX_SEGMENT_LENGTH = 7;
const FORK_CHANCE = 0.5;
// how far a fork's own branches sit above/below whatever height it spawns
// at — matches PLATFORM_STEP_MAX_DELTA_PX (one base jump), kept local so
// this file has no dependency on index.ts
const BRANCH_OFFSET_PX = 40;
// segments get longer the longer the round has been survived — this many
// extra max jumps per second played, capped so it can't grow forever
const SEGMENT_GROWTH_PER_SEC = 0.15;
const MAX_SEGMENT_LENGTH_CAP = 20;
// hard ceiling on total nodes across the WHOLE tree — forks chaining into
// more forks branches exponentially, so without a shared budget a long,
// heavily-forking segment could blow up into an unplayable wall of
// platforms. Once exhausted, every further branch just stops growing
// (reconnects to the main line early) instead of forking again
const MAX_TOTAL_NODES = 40;

// builds one node's worth of a branch, recursively, level by level (breadth
// first across ALL active branches at once, not one branch at a time) so
// that whenever two completely independent branches would otherwise land
// on the exact same height in the exact same column, they share ONE node
// instead of stacking two separate lines on top of each other. Every
// height in this whole tree is always a multiple of BRANCH_OFFSET_PX away
// from the original y (a fork's own branches are exactly ±BRANCH_OFFSET_PX
// from their center, and a center is always clamped to one of only 3
// possible values) — so merging exact matches this way is also what
// guarantees any two DISTINCT lines in the same column are never closer
// than one full base jump gap apart, only ever exactly that gap or a
// multiple of it
interface Frontier {
  // null only for the very first level, whose children become the
  // returned roots instead of some real node's `next`
  parent: LineNode | null;
  fromY: number;
  remaining: number;
  justForked: boolean;
}

function clampToOriginal(originalY: number, value: number): number {
  return Math.min(
    originalY + BRANCH_OFFSET_PX,
    Math.max(originalY - BRANCH_OFFSET_PX, value),
  );
}

// builds one random jump-segment tree anchored at y (the main line's own
// height, and where the very first column continues from). survivedMs
// raises the max segment length over time, so segments get longer the
// longer the round has gone on
export function createLines(y: number, survivedMs: number): LineNode[] {
  const maxLength = Math.min(
    MAX_SEGMENT_LENGTH_CAP,
    MAX_SEGMENT_LENGTH + (survivedMs / 1000) * SEGMENT_GROWTH_PER_SEC,
  );
  const span = maxLength - MIN_SEGMENT_LENGTH;
  const count = MIN_SEGMENT_LENGTH + Math.floor(Math.random() * (span + 1));
  const budget = { nodesLeft: MAX_TOTAL_NODES };
  const roots: LineNode[] = [];

  let frontier: Frontier[] = [
    { parent: null, fromY: y, remaining: count, justForked: false },
  ];
  while (frontier.length > 0) {
    // shared across every branch active at THIS level, so a duplicate
    // height from a different lineage reuses the same node
    const byY = new Map<number, LineNode>();
    const nextFrontier: Frontier[] = [];
    for (const f of frontier) {
      if (f.remaining <= 0 || budget.nodesLeft <= 0) continue;
      const centerY = clampToOriginal(y, f.fromY);
      const canFork =
        !f.justForked && budget.nodesLeft >= 2 && Math.random() < FORK_CHANCE;
      const childYs = canFork
        ? [centerY - BRANCH_OFFSET_PX, centerY + BRANCH_OFFSET_PX]
        : [centerY];
      budget.nodesLeft -= childYs.length;
      for (const childY of childYs) {
        let child = byY.get(childY);
        if (!child) {
          child = { y: childY, next: [] };
          byY.set(childY, child);
          nextFrontier.push({
            parent: child,
            fromY: childY,
            remaining: f.remaining - 1,
            justForked: canFork,
          });
        }
        if (f.parent === null) roots.push(child);
        else f.parent.next.push(child);
      }
    }
    frontier = nextFrontier;
  }
  return roots;
}
