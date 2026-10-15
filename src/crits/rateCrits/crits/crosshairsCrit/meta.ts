import type { CritMeta } from "../../../critKit/meta";

// a turret scanning an aim laser over the bars, locking each, then firing
// every beam: each bar's next payout five times as big, its own ten
export default {
  label: "Crosshairs",
  chance: 0.03,
  style: "beam",
  values: {
    // a bar's next payout this many times as big (its own ownPayout)
    payout: 5,
    ownPayout: 10,
  },
} satisfies CritMeta;
