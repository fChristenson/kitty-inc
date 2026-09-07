import { COLOR } from "../../palette";
import type { LineNode, LineRewardKind } from "./createLines";

export const LINE_REWARD_COLOR: Record<LineRewardKind, string> = {
  upgrade: COLOR.moneyGreen,
  white: COLOR.white,
};

// marks every node in a jump-segment tree (see createLines) upgrade (green)
// or white — every branch is always physically reachable by construction
// (createLines clamps every height to within one base jump of the main
// line), so there's no risk/reachability bookkeeping left to do, just an
// even coin flip per node. A shared node (two branches merging back onto
// the same height/column, see createLines) is only visited once so it
// doesn't get reassigned a second, different color
export function makeJumpPath(nodes: LineNode[]): void {
  const visited = new WeakSet<LineNode>();
  function visit(list: LineNode[]): void {
    for (const node of list) {
      if (visited.has(node)) continue;
      visited.add(node);
      node.reward = Math.random() < 0.5 ? "upgrade" : "white";
      visit(node.next);
    }
  }
  visit(nodes);
}
