import type { CritMeta } from "../../../critKit/meta";

// slashes cutting the locked floor's price to pieces, the floor opening,
// its button's next taps landing double
export default {
  label: "Shred",
  chance: 0.03,
  style: "slice",
  values: {
    // the floor it opens gets this many double taps per the crit's multiple
    taps: 1,
  },
} satisfies CritMeta;
