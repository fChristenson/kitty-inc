import type { CritMeta } from "../../../critKit/meta";

// bolts chaining up the building from readout to readout, a giant bolt into
// its own: every bar speeds up a notch with each payout for a while
export default {
  label: "Power Line",
  chance: 0.03,
  style: "lightning",
  // each payout runs a bar `step` faster again, for `payouts` payouts (its
  // own twice as many)
  values: { step: 0.25, payouts: 6 },
  isNew: true,
} satisfies CritMeta;
