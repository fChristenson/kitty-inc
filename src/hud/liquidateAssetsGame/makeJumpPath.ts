import { COLOR } from "../../palette";
import { PLATFORM_STEP_MAX_DELTA_PX } from "./index";
import type { LineNode, LineRewardKind } from "./createLines";

export const LINE_REWARD_COLOR: Record<LineRewardKind, string> = {
  x125: COLOR.red,
  upgrade: COLOR.moneyGreen,
  white: COLOR.white,
};

// a coin flip's own starting red (x125) odds — the other 2/3 splits evenly
// between the two safe colors. Grows the longer the round is survived (same
// growth-over-time convention createLines.ts already uses for segment
// length), capped well short of 1 so a coin flip is never ALL red — a
// guaranteed-safe node (mustBeSafe below) is untouched by this regardless,
// so reachability itself never breaks, only how risky the non-guaranteed
// rolls get
const RED_LINE_CHANCE_BASE = 1 / 3;
const RED_LINE_CHANCE_GROWTH_PER_SEC = 0.02;
const RED_LINE_CHANCE_CAP = 0.75;

// a drop (toY >= fromY) always lands eventually — the fixed base jump has
// no ceiling on how far down it can fall. A climb only ever reaches up to
// one base jump's own apex height above fromY
function canReach(fromY: number, toY: number): boolean {
  return toY >= fromY || fromY - toY <= PLATFORM_STEP_MAX_DELTA_PX;
}

// bottom-up (depth-first): does SOME descendant of this node (including a
// leaf reaching mainLineY directly) form an unbroken, ACTUALLY REACHABLE
// chain back to the main line? A child being feasible on its own isn't
// enough — this node must also be able to physically jump to that specific
// child (canReach(node.y, child.y)); a fork's own top branch in particular
// is only reachable from a parent that didn't already need a near-max
// climb just to reach this fork's center, so skipping that check let a
// feasible-looking child turn out to be unreachable from here, leaving red
// as the only branch that actually connected onward. Pure feasibility
// check, no marking yet — markGuaranteed below needs to know which
// branch(es) are even worth guaranteeing before it picks one
function computeFeasible(
  nodes: LineNode[],
  mainLineY: number,
  feasible: WeakSet<LineNode>,
): void {
  for (const node of nodes) {
    computeFeasible(node.next, mainLineY, feasible);
    const ok =
      node.next.length === 0
        ? canReach(node.y, mainLineY)
        : node.next.some(
            (child) => canReach(node.y, child.y) && feasible.has(child),
          );
    if (ok) feasible.add(node);
  }
}

// two independent lineages can now converge on the exact same node (see
// createLines' per-level merging) — meaning a node can have MORE THAN ONE
// parent. Deciding colors purely top-down, per-parent, in isolation (the
// previous approach) can't see that a child it left as an unguaranteed
// coin flip is another parent's ONLY viable option — so this walks every
// distinct node once, collects every parent->children edge's own
// requirement (its one viable child if it only has one, or a same-column
// pair if it has two — including the very first column's own requirement,
// where mainLineY itself is the "parent"), and only THEN resolves every
// requirement globally before any color is actually assigned, so no
// parent's guarantee can be broken by a different parent's independent
// coin flip
function markTree(
  roots: LineNode[],
  mainLineY: number,
  feasible: WeakSet<LineNode>,
  survivedMs: number,
): void {
  const allNodes: LineNode[] = [];
  const orRequirements: [LineNode, LineNode][] = [];
  const mustBeSafe = new WeakSet<LineNode>();
  const visited = new WeakSet<LineNode>();

  function requireFrom(fromY: number, nodes: LineNode[]): void {
    const viable = nodes.filter(
      (node) => canReach(fromY, node.y) && feasible.has(node),
    );
    if (viable.length === 1) mustBeSafe.add(viable[0]);
    else if (viable.length >= 2) orRequirements.push([viable[0], viable[1]]);
  }

  function collect(nodes: LineNode[]): void {
    for (const node of nodes) {
      if (visited.has(node)) continue;
      visited.add(node);
      allNodes.push(node);
      requireFrom(node.y, node.next);
      collect(node.next);
    }
  }
  requireFrom(mainLineY, roots);
  collect(roots);

  // an "either of these two" requirement is already satisfied if some
  // OTHER parent already forced one of them safe (upgrade or white); only
  // pick a fresh one at random when neither side is already guaranteed
  for (const [a, b] of orRequirements) {
    if (!mustBeSafe.has(a) && !mustBeSafe.has(b)) {
      mustBeSafe.add(Math.random() < 0.5 ? a : b);
    }
  }

  // upgrade and white are interchangeable "safe" colors — the guaranteed
  // slot picks either at random; a merely-viable-but-not-forced node can
  // also land on x125, since only the guaranteed slot needs to stay safe
  const redChance = Math.min(
    RED_LINE_CHANCE_CAP,
    RED_LINE_CHANCE_BASE + (survivedMs / 1000) * RED_LINE_CHANCE_GROWTH_PER_SEC,
  );
  const safeShare = (1 - redChance) / 2;
  for (const node of allNodes) {
    if (!feasible.has(node)) {
      node.reward = "x125";
    } else if (mustBeSafe.has(node)) {
      node.reward = Math.random() < 0.5 ? "upgrade" : "white";
    } else {
      const roll = Math.random();
      node.reward =
        roll < safeShare ? "upgrade" : roll < safeShare * 2 ? "white" : "x125";
    }
  }
}

// marks every node in a jump-segment tree (see createLines) x125 (red) or
// upgrade (green), mutating each node's own `reward` in place
export function makeJumpPath(
  nodes: LineNode[],
  mainLineY: number,
  survivedMs: number,
): void {
  const feasible = new WeakSet<LineNode>();
  computeFeasible(nodes, mainLineY, feasible);
  markTree(nodes, mainLineY, feasible, survivedMs);
}
