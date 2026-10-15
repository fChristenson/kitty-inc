import type { CritMeta } from "../../../critKit/meta";

// a pair of shears snipping zigzag cuts beside the buttons, quicker down the
// column, then one long zigzag cut down them all, the glitter bursting onto
// the buttons: each of their next taps also levels the floor above, then the
// floor below, in turn
export default {
  label: "Pinking Shears",
  chance: 0.03,
  style: "slice",
  // zigzag taps on each button, twice as many on its own
  values: { taps: 4 },
} satisfies CritMeta;
