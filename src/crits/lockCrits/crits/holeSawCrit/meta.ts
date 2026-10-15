import type { CritMeta } from "../../../critKit/meta";

// a ring saw of light boring a disc out round the lock, the hot plug welding
// onto the new floor's button: its next crit sticks there for a few taps
export default {
  label: "Hole Saw",
  chance: 0.03,
  style: "drill",
  values: {
    // the taps the next crit landing on the opened floor's button plays for
    taps: 4,
  },
} satisfies CritMeta;
