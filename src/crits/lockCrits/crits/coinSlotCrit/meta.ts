import type { CritMeta } from "../../../critKit/meta";

// a wisp leading a river of coins into a glowing slot on the dark locked
// floor like an arcade machine, each gulp lighting a lamp round it, till
// every lamp lights and it bursts open in a jackpot fountain onto the new
// bar, whose next payouts climb x2, x3, x4...
export default {
  label: "Coin Slot",
  chance: 0.03,
  style: "mix",
  // how many payouts the jackpot ladder climbs, and how much each rung adds
  values: { payouts: 5, step: 1 },
  isNew: true,
} satisfies CritMeta;
