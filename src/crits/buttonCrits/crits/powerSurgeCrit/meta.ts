import type { CritMeta } from "../../../critKit/meta";

// one orb beside the buttons charging up, drawing light out of them, then
// lashing a beam into each: each of their next taps also pays out the top
// and bottom floors
export default {
  label: "Power Surge",
  chance: 0.03,
  style: "charge",
  // surge taps on each button, twice as many on its own
  values: { taps: 3 },
} satisfies CritMeta;
