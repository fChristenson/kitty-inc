import type { CritMeta } from "../../../critKit/meta";

// a storm cloud boiling up over the buttons, cracking bolts down onto each,
// then one massive bolt into its own: each of its next taps also pays out
// the next open floors below it
export default {
  label: "Storm Cloud",
  chance: 0.03,
  style: "lightning",
  // strike taps on each button, twice as many on its own; open floors below
  // each strike pays out
  values: { taps: 3, floors: 4 },
  isNew: true,
} satisfies CritMeta;
