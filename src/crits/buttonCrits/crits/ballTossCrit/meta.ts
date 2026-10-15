import type { CritMeta } from "../../../critKit/meta";

// a ball of light tossed between the buttons in high arcs, out of order,
// bouncing off each one's top lower, quicker, spinning faster and hotter,
// then lobbed into its own: each of their next taps also boosts every worker
// on a random open floor
export default {
  label: "Ball Toss",
  chance: 0.03,
  style: "bounce",
  // toss taps on each button, twice as many on its own
  values: { taps: 4 },
} satisfies CritMeta;
