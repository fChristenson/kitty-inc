import type { CritMeta } from "../../../critKit/meta";

// a wisp dragging a river of coins into the dark locked floor, racing laps
// round it, smashing the lock and pouring the river into its new bar, which
// then runs fast for its first payouts
export default {
  label: "Spillway",
  chance: 0.03,
  style: "mix",
  // how many times as fast the opened floor's bar runs, for how many payouts
  values: { speed: 2, payouts: 20 },
} satisfies CritMeta;
