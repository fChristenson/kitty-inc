import type { CritMeta } from "../../../critKit/meta";

// a tornado touching down under the bottom button and climbing the column,
// ripping glitter off every button it passes, then leaning over and flinging
// it all back down onto them: each of their next taps also levels the open
// floor with the fewest workers
export default {
  label: "Upswirl",
  chance: 0.03,
  style: "tornado",
  // swirl taps on each button, twice as many on its own
  values: { taps: 3 },
} satisfies CritMeta;
