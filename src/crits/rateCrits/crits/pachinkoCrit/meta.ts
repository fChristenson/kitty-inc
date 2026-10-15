import type { CritMeta } from "../../../critKit/meta";

// balls of light drop-bouncing pin to pin down a column beside the readouts
// into each bar's pocket, then a jackpot flood into its own: each of a bar's
// next payouts pays a random whole x2 to xmax
export default {
  label: "Pachinko",
  chance: 0.03,
  style: "bounce",
  // each payout x2..MAX (rolled ahead, a MAX paying a free one more), for
  // PAYOUTS of them (its own ownPayouts)
  values: { max: 5, payouts: 5, ownPayouts: 10 },
} satisfies CritMeta;
