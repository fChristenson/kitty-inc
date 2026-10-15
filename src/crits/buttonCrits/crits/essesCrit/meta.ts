import type { CritMeta } from "../../../critKit/meta";

// a racer and its chaser flat out down the buttons, flicking through a
// hairpin beside each one, then a dash for its own: each of their next taps
// also levels the most upgraded floor
export default {
  label: "Esses",
  chance: 0.03,
  style: "race",
  // lap taps on each button, twice as many on its own, and the levels each
  // lands on the most upgraded floor
  values: { taps: 3, levels: 2 },
} satisfies CritMeta;
