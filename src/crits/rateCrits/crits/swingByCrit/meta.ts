import type { CritMeta } from "../../../critKit/meta";

// a wisp whipping round every readout in a tight loop and slung on to the
// next, faster each: each bar's next payouts come quicker and bigger
export default {
  label: "Swing By",
  chance: 0.03,
  style: "wisp",
  // payouts boosted, how many times as fast and as big (its own twice as many)
  values: { payouts: 4, speed: 2, payout: 1.5 },
} satisfies CritMeta;
