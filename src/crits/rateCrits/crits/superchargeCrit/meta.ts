import type { CritMeta } from "../../../critKit/meta";

// a core charging by the bars until a shockwave races over them, each
// bar's next payouts three times as big
export default {
  label: "Supercharge",
  chance: 0.03,
  style: "charge",
  values: {
    // a bar's next payouts this many times as big, how many (its own
    // ownPayouts)
    payout: 3,
    payouts: 3,
    ownPayouts: 6,
  },
} satisfies CritMeta;
