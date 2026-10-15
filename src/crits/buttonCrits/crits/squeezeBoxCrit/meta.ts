import type { CritMeta } from "../../../critKit/meta";

// a ball of glitter beside every button crushed by a slab of light until it
// bursts: each tap of them then also hires on the floor with fewest workers
export default {
  label: "Squeeze Box",
  chance: 0.03,
  style: "crush",
  // squeeze taps on each button, twice as many on its own
  values: { taps: 3 },
} satisfies CritMeta;
