import type { CritMeta } from "../../../critKit/meta";

// a ball of light hopping down the buttons like a staircase, off the ground
// and in one huge leap back onto its own: each of their next taps also
// levels the floor with the most workers
export default {
  label: "Bunny Hop",
  chance: 0.03,
  style: "bounce",
  // hop taps on each button, twice as many on its own
  values: { taps: 4 },
  isNew: true,
} satisfies CritMeta;
