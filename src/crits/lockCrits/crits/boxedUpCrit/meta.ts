import type { CritMeta } from "../../../critKit/meta";

// glitter blown all over the locked floor pulled in row by row into a big
// cube over the lock, which slams down and bursts it open, the bits pouring
// into the new floor's bar: each of its next payouts also levels it by one
export default {
  label: "Boxed Up",
  chance: 0.03,
  style: "clutter",
  // how many of the opened floor's next payouts each level it by one
  values: { payouts: 8 },
  isNew: true,
} satisfies CritMeta;
