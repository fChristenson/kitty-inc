import type { CritMeta } from "../../../critKit/meta";

// a white-hot nozzle wisp hissing jets of gold-tinged steam down each
// button's edge, top to bottom and quicker each, until it gleams; its own
// engulfed in one huge blast of steam: each of their next taps also hires a
// worker on the least upgraded open floor
export default {
  label: "Steam Clean",
  chance: 0.03,
  style: "spray",
  // steam taps on each button, twice as many on its own
  values: { taps: 3 },
} satisfies CritMeta;
