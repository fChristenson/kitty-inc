import type { CritMeta } from "../../../critKit/meta";

// a bunny-eared wisp popping out of holes by the buttons down the column,
// hop by hop, out of its own in a burst: each tap of them then also hires a
// worker on the floors either side
export default {
  label: "Rabbit Hole",
  chance: 0.03,
  style: "portal",
  // warren taps on each button, twice as many on its own
  values: { taps: 3 },
} satisfies CritMeta;
