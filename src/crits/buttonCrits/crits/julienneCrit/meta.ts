import type { CritMeta } from "../../../critKit/meta";

// a ball of glitter beside every button diced by swift slashes, then one
// long cut down them all, the pieces zipping into the buttons: each of their
// next taps also levels the building's middle floor
export default {
  label: "Julienne",
  chance: 0.03,
  style: "slice",
  // sliced taps on each button, twice as many on its own, and the levels
  // each lands on the middle floor
  values: { taps: 3, levels: 2 },
  isNew: true,
} satisfies CritMeta;
