import type { CritMeta } from "../../../critKit/meta";

// a swarm swooping from button to button, a wave pouring into each: each of
// their next taps also hires on the top floor
export default {
  label: "Busy Bees",
  chance: 0.03,
  style: "swarm",
  // buzz taps on each button, twice as many on its own
  values: { taps: 3 },
  isNew: true,
} satisfies CritMeta;
