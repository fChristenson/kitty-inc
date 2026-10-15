import type { CritMeta } from "../../../critKit/meta";

// a bolt chaining down the buttons, jump by jump, then a giant one cracking
// down from the sky into its own: each of its next taps also pays out the
// floor above
export default {
  label: "Chain Zap",
  chance: 0.03,
  style: "lightning",
  // zap taps on each button, twice as many on its own
  values: { taps: 3 },
  isNew: true,
} satisfies CritMeta;
