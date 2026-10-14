import type { CritMeta } from "../../../critKit/meta";

// glitter strewn over the floors gusted into heaps beside the buttons,
// which hop in: each of their next taps also pays out the floors round them
export default {
  label: "Dust Up",
  chance: 0.03,
  style: "clutter",
  // dustpan taps on each button, twice as many on its own
  values: { taps: 3 },
} satisfies CritMeta;
