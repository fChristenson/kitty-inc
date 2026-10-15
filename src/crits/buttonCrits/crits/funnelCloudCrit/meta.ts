import type { CritMeta } from "../../../critKit/meta";

// a tornado touching down beside the top button and tearing down the
// column, ripping glitter off every button it passes, then flinging it all
// back onto them: each of their next taps also hires on a random floor
export default {
  label: "Funnel Cloud",
  chance: 0.03,
  style: "tornado",
  // whirl taps on each button, twice as many on its own
  values: { taps: 3 },
  isNew: true,
} satisfies CritMeta;
