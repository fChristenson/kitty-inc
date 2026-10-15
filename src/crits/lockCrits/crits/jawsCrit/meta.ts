import type { CritMeta } from "../../../critKit/meta";

// two slabs of light closing on a ball of glitter on the lock, pressing until
// it crumbles: the opened bar's first payout is a huge one
export default {
  label: "Jaws",
  chance: 0.03,
  style: "crush",
  // how many payouts the opened bar's first payout pays at once
  values: { payout: 8 },
} satisfies CritMeta;
