import type { CritMeta } from "../../../critKit/meta";

// an icy funnel of whirling snowflakes spinning up beside the bottom button
// and climbing the column, frosting each button it passes and catching its
// sparkle, whipping round at the top and diving back down to fling a
// blizzard onto its own: each of their next taps also levels the top open
// floor
export default {
  label: "Snow Devil",
  chance: 0.03,
  style: "tornado",
  // frost taps on each button, twice as many on its own
  values: { taps: 3 },
} satisfies CritMeta;
