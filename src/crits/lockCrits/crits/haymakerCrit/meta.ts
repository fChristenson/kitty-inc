import type { CritMeta } from "../../../critKit/meta";

// the number balls up into a fist of light beside the locked floor and winds
// up, drawing back, trembling and glowing hotter, then lunges and punches the
// lock open, following through into the new floor's bar: each of its next
// taps punches harder, landing one more level than the last
export default {
  label: "Haymaker",
  chance: 0.03,
  style: "charge",
  // punch taps on the opened floor's button
  values: { taps: 6 },
} satisfies CritMeta;
