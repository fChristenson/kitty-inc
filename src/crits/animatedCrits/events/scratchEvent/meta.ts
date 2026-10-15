import type { EventMeta } from "../../eventMeta";

// the rare "Scratch" event: claw marks rake across the clicked floor's income
// bar, ever faster, then all burst into coins in a huge blast, and the coins
// sweep into the total
export default {
  label: "Scratch",
  chance: 0.01, // per crit whose special-crit gateway hit
  values: {
    firstSwipeMs: 120, // before the first swipe
    gapMs: [150, 45] as [number, number], // between swipes, quickening
    chargeMs: 380, // the tears blazing and trembling before they burst
    holdMs: 450, // after the blast, before the coins sweep in
    mergeMs: 500,
  },
} as const satisfies EventMeta;
