import type { CritMeta } from "../../../critKit/meta";

// a giant cat paw print drawn in glitter beside the buttons, its toe beans
// stamped into them one by one and its pad slammed into its own: each of its
// next taps also boosts every worker on the floor with the most workers
export default {
  label: "Paw Print",
  chance: 0.03,
  style: "drawing",
  // paw taps on each button, twice as many on its own
  values: { taps: 3 },
} satisfies CritMeta;
