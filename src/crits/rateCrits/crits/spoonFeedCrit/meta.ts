import type { CritMeta } from "../../../critKit/meta";

// a wisp leading a river of coins down the building, spoon-feeding every
// readout a gulp of it, its own the whole lot: each bar runs faster and pays
// more for a while
export default {
  label: "Spoon Feed",
  chance: 0.03,
  style: "mix",
  values: {
    // for ms (ownMs on its own bar) the bar runs speed times as fast and its
    // payouts are payout times as big
    speed: 1.5,
    payout: 1.5,
    ms: 15_000,
    ownMs: 30_000,
  },
  isNew: true,
} satisfies CritMeta;
