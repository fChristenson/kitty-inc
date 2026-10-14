import type { CritMeta } from "../../../critKit/meta";

// a snowball rolling round the locked floor in a tightening spiral,
// gathering its dust, bursting through the lock into a payout
export default {
  label: "Snail Shell",
  chance: 0.03,
  style: "snowball",
  // payouts the opened floor pays at once, per multiple of the crit
  values: { payouts: 2 },
} satisfies CritMeta;
