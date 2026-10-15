import type { CritMeta } from "../../../critKit/meta";

// a giant gem drawn in glitter over the locked floor, blazing, then crushed
// into the lock: the new floor pays out at once
export default {
  label: "Rough Diamond",
  chance: 0.03,
  style: "drawing",
  // payouts the opened floor pays at once, times the crit's multiple
  values: { payouts: 2 },
} satisfies CritMeta;
