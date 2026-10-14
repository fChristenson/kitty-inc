import type { CritMeta } from "../../../critKit/meta";

// a wisp banking off the screen's sides and down onto every bar's readout,
// faster each bounce: each bar's next payouts grow one after another
export default {
  label: "Carom",
  chance: 0.03,
  style: "bounce",
  // each payout STEP bigger than the last, for PAYOUTS of them (its own
  // ownPayouts)
  values: { step: 0.25, payouts: 6, ownPayouts: 12 },
} satisfies CritMeta;
