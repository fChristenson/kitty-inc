import type { CritMeta } from "../../../critKit/meta";

// swipes slashing every bar in two, welded back gold, each then paying
// more for good; rarer, being for good
export default {
  label: "Clean Cut",
  chance: 0.01,
  style: "slice",
  values: {
    // a bar's payouts this many times as big for good (its own ownPayout)
    payout: 1.25,
    ownPayout: 1.5,
  },
} satisfies CritMeta;
