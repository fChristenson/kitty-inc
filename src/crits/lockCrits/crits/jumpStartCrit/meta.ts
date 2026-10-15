import type { CritMeta } from "../../../critKit/meta";

// a wisp charging in the locked floor, its dust sucked in, until it
// bursts open and its new bar pays out at once
export default {
  label: "Jump Start",
  chance: 0.03,
  style: "charge",
  values: {
    // its payout from the floor it opens, in full payouts per the crit's
    // multiple
    payouts: 1,
  },
} satisfies CritMeta;
