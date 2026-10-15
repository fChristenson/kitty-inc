import type { CritMeta } from "../../../critKit/meta";

// a drill boring down through the building, bar by bar, grinding through
// every readout: each bar's next payouts double up, x2, x4, x8
export default {
  label: "Pay Dirt",
  chance: 0.03,
  style: "drill",
  // the doubling payouts, on each bar and on its own
  values: { payouts: 3, ownPayouts: 4 },
  isNew: true,
} satisfies CritMeta;
