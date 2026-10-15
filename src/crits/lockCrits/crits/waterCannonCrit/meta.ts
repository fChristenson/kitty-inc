import type { CritMeta } from "../../../critKit/meta";

// a wisp beside the locked floor drinking rivers of coins up from the bars
// below, then hosing the lock with them in harder, quicker pulses until it
// bursts open: each of the new floor's next taps also levels the floor below
export default {
  label: "Water Cannon",
  chance: 0.03,
  style: "mix",
  // cannon taps on the opened floor's button
  values: { taps: 5 },
  isNew: true,
} satisfies CritMeta;
